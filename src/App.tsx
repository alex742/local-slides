import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  ArrowDownToLine,
  BookOpen,
  ChevronDown,
  FilePlus2,
  FileUp,
  Maximize2,
  PanelsTopLeft,
  Play,
  Sparkles,
} from 'lucide-react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { useEditor } from './document/store';
import { newSlide, uid, type Deck } from './document/model';
import { createSampleDeck } from './document/sample';
import { HelpDialog } from './help/HelpDialog';
import { PlayerApp } from './player/PlayerApp';
import { downloadFile, encodeDeck, readDeck, readImage, safeFilename } from './files/native';
import { exportPdf } from './files/pdf';
import { standaloneHtml } from './files/standalone';
import { EditorCanvas } from './editor/EditorCanvas';
import { EditorToolbar } from './editor/EditorToolbar';
import { Inspector } from './editor/Inspector';
import { SlideRail } from './editor/SlideRail';
import { commands, currentEditor } from './editor/commands';
import './editor/editor.css';

const DemoEditor = lazy(() =>
  import('./demos/DemoEditor').then((module) => ({ default: module.DemoEditor })),
);

export default function App() {
  const state = useEditor(),
    deck = state.history.present,
    slide = deck.slides.find((s) => s.id === state.slideId) || deck.slides[0];
  const [help, setHelp] = useState(false),
    [presenting, setPresenting] = useState(false),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const [textEditor, setTextEditor] = useState<Editor | null>(null);
  const [demoId, setDemoId] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null),
    imageInput = useRef<HTMLInputElement>(null);
  const posterInput = useRef<HTMLInputElement>(null),
    posterTarget = useRef<string | null>(null);
  const editingDemo = slide.elements.find((node) => node.id === demoId && node.kind === 'demo');
  const exportFile = useCallback(
    async (format: 'native' | 'pdf' | 'html') => {
      setBusy(true);
      setNotice('Preparing your presentation…');
      const snapshot = deck;
      const name = safeFilename(deck.title);
      try {
        if (format === 'native') {
          const bytes = await encodeDeck(snapshot);
          downloadFile(
            new Blob([bytes as BlobPart], { type: 'application/zip' }),
            `${name}.slides`,
          );
          useEditor.getState().saved(snapshot);
        }
        if (format === 'pdf')
          downloadFile(
            await exportPdf(snapshot, (n, total) => setNotice(`Rendering slide ${n} of ${total}…`)),
            `${name}.pdf`,
          );
        if (format === 'html')
          downloadFile(
            new Blob([await standaloneHtml(snapshot)], { type: 'text/html;charset=utf-8' }),
            `${name}.html`,
          );
        setNotice('Your export is ready.');
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'Export failed. Please try again.');
      } finally {
        setBusy(false);
      }
    },
    [deck],
  );
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (presenting || help || demoId) return;
      const target = event.target as HTMLElement;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void exportFile('native');
        return;
      }
      if (target.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]')) return;
      const { state, slide } = currentEditor();
      const mod = event.metaKey || event.ctrlKey;
      if (event.key === 'Escape') {
        state.editText(null);
        state.select([]);
      }
      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) state.redo();
        else state.undo();
      }
      if (mod && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        state.select(slide.elements.map((n) => n.id));
      }
      if (mod && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        commands.duplicate();
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        commands.delete();
      }
      if (
        state.selectedIds.length &&
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
      ) {
        event.preventDefault();
        state.begin();
        const step = event.shiftKey ? 10 : 1;
        commands.nudge(
          event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0,
          event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0,
        );
      }
    };
    const keyup = (event: KeyboardEvent) => {
      if (event.key.startsWith('Arrow')) useEditor.getState().finish();
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      const s = useEditor.getState();
      if (s.history.present !== s.savedDeck) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [presenting, help, demoId, exportFile]);
  function replaceDeck(next: Deck) {
    const s = useEditor.getState();
    if (
      s.history.present !== s.savedDeck &&
      !window.confirm(
        'Replace this presentation? Export first if you want to keep your unsaved changes.',
      )
    )
      return;
    state.load(next);
    setNotice('A fresh start. Make it yours.');
  }
  const blankDeck = () =>
    replaceDeck({
      ...createSampleDeck(),
      id: uid(),
      title: 'Untitled presentation',
      slides: [newSlide(deck.theme, 'title')],
      theme: deck.theme,
      assets: {},
    });
  const addDemo = () => {
    try {
      const node = slide.elements.find((n) => n.kind === 'demo') || commands.addDemo();
      state.select([node.id]);
      setDemoId(node.id);
    } catch (error) {
      setNotice((error as Error).message);
    }
  };
  if (presenting)
    return (
      <PlayerApp
        deck={deck}
        initialIndex={deck.slides.indexOf(slide)}
        initialMode="speaker"
        onExit={() => setPresenting(false)}
        onPoster={(demoId, data) => {
          const asset = { id: uid(), name: 'Demo poster.png', mime: 'image/png' as const, data };
          state.change((d) => ({
            ...d,
            assets: { ...d.assets, [asset.id]: asset },
            slides: d.slides.map((s) => ({
              ...s,
              elements: s.elements.map((node) =>
                node.id === demoId && node.kind === 'demo'
                  ? { ...node, posterAssetId: asset.id }
                  : node,
              ),
            })),
          }));
        }}
      />
    );
  return (
    <div className="app-shell">
      <header className="app-header">
        <Dropdown.Root>
          <Dropdown.Trigger className="app-mark" aria-label="File menu">
            <PanelsTopLeft size={25} />
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content className="dropdown-menu" sideOffset={10}>
              <Dropdown.Item className="dropdown-item" onSelect={blankDeck}>
                <FilePlus2 size={15} /> New presentation
              </Dropdown.Item>
              <Dropdown.Item className="dropdown-item" onSelect={() => input.current?.click()}>
                <FileUp size={15} /> Open presentation
              </Dropdown.Item>
              <Dropdown.Separator className="dropdown-separator" />
              <Dropdown.Item
                className="dropdown-item"
                onSelect={() => replaceDeck(createSampleDeck())}
              >
                <Sparkles size={15} /> Open example deck
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
        <div className="deck-heading">
          <input
            aria-label="Presentation title"
            maxLength={500}
            placeholder="Untitled presentation"
            value={deck.title}
            onFocus={state.begin}
            onBlur={() => {
              if (!deck.title.trim())
                state.change((d) => ({ ...d, title: 'Untitled presentation' }));
              state.finish();
            }}
            onChange={(event) => state.change((d) => ({ ...d, title: event.target.value }))}
          />
          <span>
            Local Slides <span className="heading-dot">·</span>{' '}
            {deck === state.savedDeck ? 'Local session · export to keep' : 'Unsaved changes'}
          </span>
        </div>
        <div className="header-actions">
          <button className="button subtle" onClick={() => setHelp(true)}>
            <BookOpen size={17} /> Help
          </button>
          <button className="button subtle" onClick={() => input.current?.click()}>
            <FileUp size={17} /> Open
          </button>
          <Dropdown.Root>
            <Dropdown.Trigger className="button secondary" disabled={busy}>
              <ArrowDownToLine size={17} /> Export <ChevronDown size={12} />
            </Dropdown.Trigger>
            <Dropdown.Portal>
              <Dropdown.Content className="dropdown-menu" sideOffset={8}>
                <Dropdown.Item className="dropdown-item" onSelect={() => exportFile('native')}>
                  Editable deck <span>.slides</span>
                </Dropdown.Item>
                <Dropdown.Item className="dropdown-item" onSelect={() => exportFile('pdf')}>
                  PDF document <span>.pdf</span>
                </Dropdown.Item>
                <Dropdown.Item className="dropdown-item" onSelect={() => exportFile('html')}>
                  Interactive player <span>.html</span>
                </Dropdown.Item>
              </Dropdown.Content>
            </Dropdown.Portal>
          </Dropdown.Root>
          <button
            className="button primary"
            onClick={() => {
              state.finish();
              state.editText(null);
              setPresenting(true);
            }}
          >
            <Play size={15} fill="currentColor" /> Present
          </button>
        </div>
      </header>
      <EditorToolbar
        editor={textEditor}
        onImage={() => imageInput.current?.click()}
        onDemo={addDemo}
      />
      <div className="editor-body">
        <SlideRail />
        <main className="workspace">
          <div className="canvas-heading">
            <span>
              SLIDE {String(deck.slides.indexOf(slide) + 1).padStart(2, '0')}{' '}
              <span className="heading-dot">/</span> {slide.name}
            </span>
            <div className="zoom-controls">
              <button
                className={`icon-button ${!state.zoom ? 'active' : ''}`}
                title="Fit to canvas"
                aria-label="Fit slide to canvas"
                onClick={() => state.setZoom(0)}
              >
                <Maximize2 size={13} />
              </button>
              <select
                aria-label="Canvas zoom"
                value={state.zoom}
                onChange={(event) => state.setZoom(Number(event.target.value))}
              >
                <option value={0}>Fit</option>
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((zoom) => (
                  <option value={zoom} key={zoom}>
                    {Math.round(zoom * 100)}%
                  </option>
                ))}
              </select>
            </div>
          </div>
          <EditorCanvas onTextEditor={setTextEditor} />
          <div className="speaker-notes">
            <label htmlFor="notes">
              SPEAKER NOTES <span>JUST FOR YOU</span>
            </label>
            <textarea
              id="notes"
              maxLength={50000}
              placeholder="A few words, just for you…"
              value={slide.notes}
              onFocus={state.begin}
              onBlur={state.finish}
              onChange={(event) => state.changeSlide((s) => ({ ...s, notes: event.target.value }))}
            />
          </div>
        </main>
        <Inspector
          onEditDemo={(node) => setDemoId(node.id)}
          onPoster={(node) => {
            posterTarget.current = node.id;
            posterInput.current?.click();
          }}
        />
      </div>
      <footer className="app-status">
        <span className="status-dot" />
        <span role="status">
          {notice || 'Your ideas stay in this browser. Export a deck to keep them.'}
        </span>
        <span className="status-right">A little more live.</span>
      </footer>
      <input
        ref={input}
        type="file"
        accept=".slides"
        aria-label="Open presentation file"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          try {
            const next = await readDeck(file);
            replaceDeck(next);
          } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Could not open this file.');
          }
        }}
      />
      <input
        ref={imageInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        aria-label="Upload image"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          try {
            commands.addImage(await readImage(file));
          } catch (error) {
            setNotice((error as Error).message);
          }
        }}
      />
      <input
        ref={posterInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        aria-label="Upload demo poster"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0],
            target = posterTarget.current;
          event.target.value = '';
          if (!file || !target) return;
          try {
            const asset = await readImage(file);
            state.change((d) => ({
              ...d,
              assets: { ...d.assets, [asset.id]: asset },
              slides: d.slides.map((s) => ({
                ...s,
                elements: s.elements.map((node) =>
                  node.id === target && node.kind === 'demo'
                    ? { ...node, posterAssetId: asset.id }
                    : node,
                ),
              })),
            }));
            setNotice('Demo poster updated.');
          } catch (error) {
            setNotice((error as Error).message);
          }
        }}
      />
      <HelpDialog open={help} onClose={() => setHelp(false)} />
      {editingDemo?.kind === 'demo' && (
        <Suspense
          fallback={
            <div className="studio-loading" role="status">
              Opening the demo studio…
            </div>
          }
        >
          <DemoEditor
            key={editingDemo.id}
            node={editingDemo}
            onClose={() => setDemoId(null)}
            onApply={(node) => state.updateElements([node.id], node)}
          />
        </Suspense>
      )}
    </div>
  );
}
