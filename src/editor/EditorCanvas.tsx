import { useCallback, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { flushSync } from 'react-dom';
import Moveable from 'react-moveable';
import type { Editor } from '@tiptap/react';
import { useEditor } from '../document/store';
import { expandedSelection } from '../document/operations';
import type { SlideElement } from '../document/model';
import { SlideViewport } from '../renderer/SlideRenderer';
import { RichTextEditor } from './RichTextEditor';

export function EditorCanvas({ onTextEditor }: { onTextEditor: (editor: Editor | null) => void }) {
  const state = useEditor(),
    deck = state.history.present,
    slide = deck.slides.find((s) => s.id === state.slideId) || deck.slides[0];
  const holder = useRef<HTMLDivElement>(null),
    moveable = useRef<Moveable>(null);
  const gesture = useRef(false);
  const beginGesture = () => {
    gesture.current = true;
    useEditor.getState().begin();
  };
  const endGesture = () => {
    gesture.current = false;
    useEditor.getState().finish();
    requestAnimationFrame(() => moveable.current?.updateRect());
  };
  const [targets, setTargets] = useState<HTMLElement[]>([]),
    [scale, setScale] = useState(0.5);
  const [marquee, setMarquee] = useState<{
    x: number;
    y: number;
    x2: number;
    y2: number;
    add: boolean;
  } | null>(null);
  const selectionKey = state.selectedIds.join(',');
  const identityKey = slide.elements.map((n) => `${n.id}:${n.locked}`).join(',');
  useLayoutEffect(() => {
    const nodes =
      holder.current?.querySelectorAll<HTMLElement>('.slide-artboard > [data-element-id]') || [];
    setTargets(
      Array.from(nodes).filter(
        (node) =>
          state.selectedIds.includes(node.dataset.elementId!) &&
          !slide.elements.find((n) => n.id === node.dataset.elementId)?.locked,
      ),
    );
    // Selection and identity strings are stable across pointer-move geometry updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey, identityKey, slide.id, state.editingText]);
  useLayoutEffect(() => {
    if (!gesture.current) moveable.current?.updateRect();
  }, [slide.elements, scale]);
  const update = useCallback((changes: Map<string, Partial<SlideElement>>) => {
    flushSync(() =>
      useEditor.getState().changeSlide((s) => ({
        ...s,
        elements: s.elements.map((n) =>
          changes.has(n.id) ? ({ ...n, ...changes.get(n.id) } as SlideElement) : n,
        ),
      })),
    );
  }, []);
  const down = (node: SlideElement, event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.button !== 0 || state.editingText === node.id) return;
    if (node.locked) {
      state.select([node.id]);
      return;
    }
    const chosen = event.altKey ? [node.id] : expandedSelection(slide, [node.id]);
    const next = event.shiftKey
      ? state.selectedIds.includes(node.id)
        ? state.selectedIds.filter((id) => !chosen.includes(id))
        : [...new Set([...state.selectedIds, ...chosen])]
      : state.selectedIds.includes(node.id)
        ? state.selectedIds
        : chosen;
    if (next.join(',') !== selectionKey) flushSync(() => state.select(next));
  };
  const coordinates = (event: PointerEvent) => {
    const rect = holder.current!.querySelector('.slide-artboard')!.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
  };
  const blankDown = (event: PointerEvent<HTMLDivElement>) => {
    if (
      event.button !== 0 ||
      (event.target as Element).closest('[data-element-id],.moveable-control-box')
    )
      return;
    const p = coordinates(event);
    if (p.x < 0 || p.y < 0 || p.x > deck.width || p.y > deck.height) {
      state.select([]);
      return;
    }
    if (!event.shiftKey) state.select([]);
    const next = { ...p, x2: p.x, y2: p.y, add: event.shiftKey };
    setMarquee(next);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const marqueeEnd = () => {
    if (marquee && Math.abs(marquee.x2 - marquee.x) > 3 && Math.abs(marquee.y2 - marquee.y) > 3) {
      const x = Math.min(marquee.x, marquee.x2),
        y = Math.min(marquee.y, marquee.y2),
        right = Math.max(marquee.x, marquee.x2),
        bottom = Math.max(marquee.y, marquee.y2);
      const ids = slide.elements
        .filter(
          (n) =>
            !n.locked && n.x + n.width > x && n.x < right && n.y + n.height > y && n.y < bottom,
        )
        .map((n) => n.id);
      state.select(
        expandedSelection(slide, [...new Set([...(marquee.add ? state.selectedIds : []), ...ids])]),
      );
    }
    setMarquee(null);
  };
  return (
    <div
      className="canvas-area editor-canvas"
      ref={holder}
      onPointerDown={blankDown}
      onPointerMove={(event) => {
        if (marquee) {
          const p = coordinates(event);
          setMarquee({ ...marquee, x2: p.x, y2: p.y });
        }
      }}
      onPointerUp={marqueeEnd}
      onPointerCancel={() => setMarquee(null)}
    >
      <SlideViewport
        deck={deck}
        slide={slide}
        selectedIds={state.selectedIds}
        onScale={setScale}
        scaleOverride={state.zoom}
        onElementPointerDown={down}
        onElementDoubleClick={(node) => {
          if (node.kind === 'text' && !node.locked) {
            state.select([node.id]);
            state.editText(node.id);
          }
        }}
        renderElement={(node, content) =>
          node.kind === 'text' && state.editingText === node.id ? (
            <RichTextEditor node={node} onReady={onTextEditor} />
          ) : (
            content
          )
        }
      >
        {marquee && (
          <div
            className="selection-marquee"
            style={{
              left: Math.min(marquee.x, marquee.x2),
              top: Math.min(marquee.y, marquee.y2),
              width: Math.abs(marquee.x2 - marquee.x),
              height: Math.abs(marquee.y2 - marquee.y),
            }}
          />
        )}
        <Moveable
          ref={moveable}
          flushSync={flushSync}
          target={targets}
          draggable={!state.editingText}
          resizable={!state.editingText}
          rotatable={
            !state.editingText &&
            !slide.elements.some((n) => state.selectedIds.includes(n.id) && n.kind === 'demo')
          }
          origin={false}
          zoom={1 / scale}
          throttleDrag={0}
          throttleResize={0}
          throttleRotate={1}
          snappable
          snapThreshold={7}
          snapDirections={{
            left: true,
            right: true,
            top: true,
            bottom: true,
            center: true,
            middle: true,
          }}
          elementSnapDirections={{
            left: true,
            right: true,
            top: true,
            bottom: true,
            center: true,
            middle: true,
          }}
          verticalGuidelines={[0, deck.width / 2, deck.width]}
          horizontalGuidelines={[0, deck.height / 2, deck.height]}
          elementGuidelines={Array.from(
            holder.current?.querySelectorAll<HTMLElement>('.slide-artboard > [data-element-id]') ||
              [],
          ).filter((el) => !state.selectedIds.includes(el.dataset.elementId!))}
          keepRatio={false}
          checkInput
          onDragStart={(event) => {
            beginGesture();
            const n = slide.elements.find(
              (n) => n.id === event.target.getAttribute('data-element-id'),
            )!;
            event.set([n.x, n.y]);
          }}
          onDrag={(event) =>
            update(
              new Map([
                [
                  event.target.getAttribute('data-element-id')!,
                  { x: event.beforeTranslate[0], y: event.beforeTranslate[1] },
                ],
              ]),
            )
          }
          onDragEnd={endGesture}
          onResizeStart={(event) => {
            beginGesture();
            event.setMin([12, 12]);
            const n = slide.elements.find(
              (n) => n.id === event.target.getAttribute('data-element-id'),
            )!;
            if (event.dragStart) event.dragStart.set([n.x, n.y]);
          }}
          onResize={(event) =>
            update(
              new Map([
                [
                  event.target.getAttribute('data-element-id')!,
                  {
                    width: Math.max(12, event.width),
                    height: Math.max(12, event.height),
                    x: event.drag.beforeTranslate[0],
                    y: event.drag.beforeTranslate[1],
                  },
                ],
              ]),
            )
          }
          onResizeEnd={endGesture}
          onRotateStart={(event) => {
            beginGesture();
            const n = slide.elements.find(
              (n) => n.id === event.target.getAttribute('data-element-id'),
            )!;
            event.set(n.rotation);
          }}
          onRotate={(event) =>
            update(
              new Map([
                [event.target.getAttribute('data-element-id')!, { rotation: event.beforeRotate }],
              ]),
            )
          }
          onRotateEnd={endGesture}
          onDragGroupStart={(event) => {
            beginGesture();
            event.events.forEach((e) => {
              const n = slide.elements.find(
                (n) => n.id === e.target.getAttribute('data-element-id'),
              )!;
              e.set([n.x, n.y]);
            });
          }}
          onDragGroup={(event) =>
            update(
              new Map(
                event.events.map((e) => [
                  e.target.getAttribute('data-element-id')!,
                  { x: e.beforeTranslate[0], y: e.beforeTranslate[1] },
                ]),
              ),
            )
          }
          onDragGroupEnd={endGesture}
          onResizeGroupStart={(event) => {
            beginGesture();
            event.events.forEach((e) => {
              e.setMin([12, 12]);
              const n = slide.elements.find(
                (n) => n.id === e.target.getAttribute('data-element-id'),
              )!;
              if (e.dragStart) e.dragStart.set([n.x, n.y]);
            });
          }}
          onResizeGroup={(event) =>
            update(
              new Map(
                event.events.map((e) => [
                  e.target.getAttribute('data-element-id')!,
                  {
                    width: Math.max(12, e.width),
                    height: Math.max(12, e.height),
                    x: e.drag.beforeTranslate[0],
                    y: e.drag.beforeTranslate[1],
                  },
                ]),
              ),
            )
          }
          onResizeGroupEnd={endGesture}
          onRotateGroupStart={(event) => {
            beginGesture();
            event.events.forEach((e) => {
              const n = slide.elements.find(
                (n) => n.id === e.target.getAttribute('data-element-id'),
              )!;
              e.set(n.rotation);
              if (e.dragStart) e.dragStart.set([n.x, n.y]);
            });
          }}
          onRotateGroup={(event) =>
            update(
              new Map(
                event.events.map((e) => [
                  e.target.getAttribute('data-element-id')!,
                  {
                    rotation: e.beforeRotate,
                    x: e.drag.beforeTranslate[0],
                    y: e.drag.beforeTranslate[1],
                  },
                ]),
              ),
            )
          }
          onRotateGroupEnd={endGesture}
        />
      </SlideViewport>
    </div>
  );
}
