import { useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AppWindow,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Group,
  Image as ImageIcon,
  Layers,
  LockKeyhole,
  LockKeyholeOpen,
  Palette,
  RectangleHorizontal,
  Trash2,
  Type,
  Ungroup,
} from 'lucide-react';
import { useEditor } from '../document/store';
import { themes, type DemoElement, type SlideElement } from '../document/model';
import { expandedSelection } from '../document/operations';
import { commands, currentEditor } from './commands';

function NumberField({
  label,
  value,
  onChange,
  min = -10000,
  max = 20000,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  const state = useEditor();
  return (
    <label className="number-field">
      <span>{label}</span>
      <input
        aria-label={label}
        type="number"
        value={Math.round(value * 10) / 10}
        min={min}
        max={max}
        disabled={disabled}
        onFocus={state.begin}
        onBlur={state.finish}
        onChange={(event) => {
          const number = event.currentTarget.valueAsNumber;
          if (Number.isFinite(number)) onChange(Math.min(max, Math.max(min, number)));
        }}
      />
    </label>
  );
}
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="color-field">
      <input
        type="color"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span>{label}</span>
      <span className="hex-value">{value.toUpperCase()}</span>
      <ChevronDown size={12} />
    </label>
  );
}
function LayerIcon({ node }: { node: SlideElement }) {
  const Icon =
    node.kind === 'text'
      ? Type
      : node.kind === 'image'
        ? ImageIcon
        : node.kind === 'demo'
          ? AppWindow
          : RectangleHorizontal;
  return <Icon size={14} />;
}
export function Inspector({
  onEditDemo,
  onPoster,
}: {
  onEditDemo?: (node: DemoElement) => void;
  onPoster?: (node: DemoElement) => void;
}) {
  const state = useEditor();
  const { deck, slide, selected } = currentEditor();
  const [tab, setTab] = useState('design');
  const node = selected.length === 1 ? selected[0] : null;
  return (
    <aside className="inspector">
      <div className="inspector-tabs">
        <button className={tab === 'design' ? 'active' : ''} onClick={() => setTab('design')}>
          <Palette size={14} /> Design
        </button>
        <button className={tab === 'layers' ? 'active' : ''} onClick={() => setTab('layers')}>
          <Layers size={14} /> Layers
        </button>
      </div>
      <div className="inspector-scroll">
        {tab === 'layers' ? (
          <>
            <div className="inspector-section-title">
              SLIDE LAYERS <span>{slide.elements.length}</span>
            </div>
            <p className="inspector-description">Select a layer. Shift-click to select more.</p>
            <div className="layers-list">
              {[...slide.elements].reverse().map((element) => (
                <button
                  key={element.id}
                  className={`layer-row ${state.selectedIds.includes(element.id) ? 'active' : ''}`}
                  onClick={(event) => {
                    const ids = event.altKey
                      ? [element.id]
                      : expandedSelection(slide, [element.id]);
                    state.select(
                      event.shiftKey ? [...new Set([...state.selectedIds, ...ids])] : ids,
                    );
                  }}
                >
                  <LayerIcon node={element} />
                  <span>
                    {element.kind === 'text'
                      ? element.html
                          .replace(/<[^>]+>/g, ' ')
                          .trim()
                          .slice(0, 45) || 'Text'
                      : element.kind === 'demo'
                        ? element.title
                        : element.kind === 'image'
                          ? element.alt
                          : 'Shape'}
                  </span>
                  {element.groupId && <Group size={11} />}
                  {element.locked && <LockKeyhole size={11} />}
                </button>
              ))}
            </div>
            {selected.length > 0 && (
              <div className="layer-actions">
                <button className="button secondary" onClick={() => commands.layer('forward')}>
                  <ArrowUp size={14} /> Forward
                </button>
                <button className="button secondary" onClick={() => commands.layer('backward')}>
                  <ArrowDown size={14} /> Back
                </button>
                <button
                  className="icon-button"
                  aria-label="Lock or unlock selected layers"
                  onClick={commands.lock}
                >
                  {selected.some((n) => n.locked) ? (
                    <LockKeyholeOpen size={15} />
                  ) : (
                    <LockKeyhole size={15} />
                  )}
                </button>
              </div>
            )}
          </>
        ) : selected.length ? (
          <>
            <div className="inspector-section-title">
              {node ? `${node.kind.toUpperCase()} PROPERTIES` : `${selected.length} OBJECTS`}
              <button
                className="icon-button"
                aria-label="Lock or unlock selected objects"
                onClick={commands.lock}
              >
                {selected.some((n) => n.locked) ? (
                  <LockKeyhole size={14} />
                ) : (
                  <LockKeyholeOpen size={14} />
                )}
              </button>
            </div>
            {node && (
              <>
                <div className="geometry-fields">
                  <NumberField
                    label="X position"
                    value={node.x}
                    disabled={node.locked}
                    onChange={(x) => state.updateElements([node.id], { x })}
                  />
                  <NumberField
                    label="Y position"
                    value={node.y}
                    disabled={node.locked}
                    onChange={(y) => state.updateElements([node.id], { y })}
                  />
                  <NumberField
                    label="Width"
                    min={12}
                    max={10000}
                    value={node.width}
                    disabled={node.locked}
                    onChange={(width) => state.updateElements([node.id], { width })}
                  />
                  <NumberField
                    label="Height"
                    min={12}
                    max={10000}
                    value={node.height}
                    disabled={node.locked}
                    onChange={(height) => state.updateElements([node.id], { height })}
                  />
                  {node.kind !== 'demo' && (
                    <NumberField
                      label="Rotation"
                      min={-360}
                      max={360}
                      value={node.rotation}
                      disabled={node.locked}
                      onChange={(rotation) => state.updateElements([node.id], { rotation })}
                    />
                  )}
                  <NumberField
                    label="Opacity %"
                    min={0}
                    max={100}
                    value={node.opacity * 100}
                    disabled={node.locked}
                    onChange={(value) => state.updateElements([node.id], { opacity: value / 100 })}
                  />
                </div>
                <hr />
              </>
            )}
            <div className="inspector-section-title">ALIGN & ARRANGE</div>
            <div className="alignment-controls">
              {(
                [
                  [AlignLeft, 'left', 'Align objects left'],
                  [AlignCenter, 'center', 'Center objects horizontally'],
                  [AlignRight, 'right', 'Align objects right'],
                  [ArrowUp, 'top', 'Align objects top'],
                  [AlignCenter, 'middle', 'Center objects vertically'],
                  [ArrowDown, 'bottom', 'Align objects bottom'],
                ] as const
              ).map(([Icon, value, label]) => (
                <button
                  className="icon-button"
                  aria-label={label}
                  title={label}
                  key={value}
                  onClick={() => commands.align(value)}
                >
                  <Icon size={16} className={value === 'middle' ? 'rotate-icon' : ''} />
                </button>
              ))}
            </div>
            {selected.length >= 3 && (
              <div className="distribute-buttons">
                <button onClick={() => commands.distribute('x')}>Distribute horizontally</button>
                <button onClick={() => commands.distribute('y')}>Distribute vertically</button>
              </div>
            )}
            {node?.kind === 'text' && (
              <>
                <hr />
                <div className="inspector-section-title">TYPOGRAPHY</div>
                <ColorField
                  label="Color"
                  value={node.color || deck.theme.foreground}
                  onChange={(color) => state.updateElements([node.id], { color })}
                />
                <NumberField
                  label="Line spacing"
                  min={0.7}
                  max={3}
                  value={node.lineHeight}
                  onChange={(lineHeight) => state.updateElements([node.id], { lineHeight })}
                />
                <p className="inspector-tip">
                  Double-click text to edit. Use the toolbar to format a selection.
                </p>
              </>
            )}
            {node?.kind === 'shape' && (
              <>
                <hr />
                <div className="inspector-section-title">APPEARANCE</div>
                <ColorField
                  label="Fill"
                  value={node.fill}
                  onChange={(fill) => state.updateElements([node.id], { fill })}
                />
                <ColorField
                  label="Stroke"
                  value={node.stroke}
                  onChange={(stroke) => state.updateElements([node.id], { stroke })}
                />
                <div className="geometry-fields">
                  <NumberField
                    label="Stroke width"
                    min={0}
                    max={50}
                    value={node.strokeWidth}
                    onChange={(strokeWidth) => state.updateElements([node.id], { strokeWidth })}
                  />
                  {node.shape === 'rectangle' && (
                    <NumberField
                      label="Corners"
                      min={0}
                      max={500}
                      value={node.radius}
                      onChange={(radius) => state.updateElements([node.id], { radius })}
                    />
                  )}
                </div>
              </>
            )}
            {node?.kind === 'image' && (
              <>
                <hr />
                <div className="inspector-section-title">IMAGE</div>
                <label className="stacked-label">
                  Fit
                  <select
                    aria-label="Image fit"
                    value={node.fit}
                    onChange={(event) =>
                      state.updateElements([node.id], {
                        fit: event.target.value as 'cover' | 'contain',
                      })
                    }
                  >
                    <option value="contain">Fit inside</option>
                    <option value="cover">Fill frame</option>
                  </select>
                </label>
                <label className="stacked-label">
                  Description
                  <input
                    aria-label="Image description"
                    value={node.alt}
                    onChange={(event) =>
                      state.updateElements([node.id], { alt: event.target.value })
                    }
                  />
                </label>
              </>
            )}
            {node?.kind === 'demo' && (
              <>
                <hr />
                <div className="inspector-section-title">A LIVE MOMENT</div>
                <p className="inspector-description">{node.title}</p>
                {onEditDemo && (
                  <button
                    className="button primary full-width"
                    disabled={node.locked}
                    onClick={() => onEditDemo(node)}
                  >
                    <AppWindow size={15} /> Edit & preview demo
                  </button>
                )}
                {onPoster && (
                  <button
                    className="button secondary full-width"
                    disabled={node.locked}
                    onClick={() => onPoster(node)}
                  >
                    <ImageIcon size={15} /> Upload poster
                  </button>
                )}
                <p className="inspector-tip">
                  Posters appear in PDF exports. In speaker view, the audience sees your live demo.
                </p>
              </>
            )}
            <hr />
            <div className="object-actions">
              {selected.length > 1 && (
                <button className="button secondary" onClick={commands.group}>
                  <Group size={14} /> Group
                </button>
              )}
              {selected.some((n) => n.groupId) && (
                <button className="button secondary" onClick={commands.ungroup}>
                  <Ungroup size={14} /> Ungroup
                </button>
              )}
              <button
                className="button secondary"
                disabled={selected.some((element) => element.kind === 'demo')}
                title={
                  selected.some((element) => element.kind === 'demo')
                    ? 'Duplicate the slide to reuse a demo'
                    : 'Duplicate objects'
                }
                onClick={commands.duplicate}
              >
                <Copy size={14} /> Duplicate
              </button>
              <button
                className="icon-button danger"
                aria-label="Delete selected objects"
                onClick={commands.delete}
                disabled={!selected.some((n) => !n.locked)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="inspector-section-title">
              SLIDE DESIGN <span className="section-symbol">✦</span>
            </div>
            <label className="stacked-label">
              Slide name
              <input
                aria-label="Slide name"
                value={slide.name}
                onFocus={state.begin}
                onBlur={state.finish}
                onChange={(event) => state.changeSlide((s) => ({ ...s, name: event.target.value }))}
              />
            </label>
            <ColorField
              label="Background"
              value={slide.background}
              onChange={(background) => state.changeSlide((s) => ({ ...s, background }))}
            />
            <hr />
            <div className="inspector-section-title">A DIFFERENT MOOD</div>
            <p className="inspector-description">A little color goes a long way.</p>
            <div className="theme-grid">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  className={`theme-tile ${deck.theme.id === theme.id ? 'active' : ''}`}
                  onClick={() => commands.theme(theme)}
                  aria-label={`Apply ${theme.name} theme`}
                >
                  <div
                    className="theme-preview"
                    style={{ background: theme.background, color: theme.foreground }}
                  >
                    <strong>Aa</strong>
                    <span style={{ background: theme.accent }} />
                    {deck.theme.id === theme.id && (
                      <span className="theme-check">
                        <Check size={10} />
                      </span>
                    )}
                  </div>
                  <span>{theme.name}</span>
                </button>
              ))}
            </div>
            <hr />
            <div className="inspector-section-title">START WITH A LAYOUT</div>
            <div className="layout-options">
              {[
                ['blank', 'Blank'],
                ['title', 'Title'],
                ['split', 'Split'],
              ].map(([layout, label]) => (
                <button
                  key={layout}
                  title={`Add ${label.toLowerCase()} slide`}
                  aria-label={`Add ${label.toLowerCase()} layout slide`}
                  onClick={() => commands.addSlide(layout)}
                >
                  <span className={`layout-mini ${layout}`}>
                    <i />
                    <i />
                  </span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <div className="inspector-note">
              <span>✦</span>
              <p>
                Made to feel like your story.
                <br />
                Select anything to make it yours.
              </p>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
