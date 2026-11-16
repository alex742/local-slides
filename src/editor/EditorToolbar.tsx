import type { Editor } from '@tiptap/react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AppWindow,
  Bold,
  ChevronDown,
  Circle,
  Copy,
  Group,
  ImagePlus,
  Italic,
  Layers,
  LockKeyhole,
  Minus,
  MousePointer2,
  RectangleHorizontal,
  Redo2,
  Trash2,
  Type,
  Underline,
  Undo2,
  Ungroup,
} from 'lucide-react';
import { useEditor } from '../document/store';
import { commands, currentEditor } from './commands';

export function EditorToolbar({
  editor,
  onImage,
  onDemo,
}: {
  editor: Editor | null;
  onImage: () => void;
  onDemo: () => void;
}) {
  const state = useEditor();
  const { selected } = currentEditor();
  const text =
    selected.length === 1 && selected[0].kind === 'text' && !selected[0].locked
      ? selected[0]
      : null;
  const format = (mark: 'bold' | 'italic' | 'underline') => {
    if (editor) {
      const chain = editor.chain().focus();
      if (mark === 'bold') chain.toggleBold().run();
      if (mark === 'italic') chain.toggleItalic().run();
      if (mark === 'underline') chain.toggleUnderline().run();
    } else if (text) {
      if (mark === 'bold')
        state.updateElements([text.id], { fontWeight: text.fontWeight >= 600 ? 400 : 700 });
      else {
        const tag = mark === 'italic' ? 'em' : 'u';
        const pattern = new RegExp(`</?${tag}>`, 'g');
        state.updateElements([text.id], {
          html: pattern.test(text.html)
            ? text.html.replace(pattern, '')
            : `<${tag}>${text.html}</${tag}>`,
        });
      }
    }
  };
  return (
    <div className="editor-toolbar" aria-label="Editing tools">
      <div className="toolbar-group history-buttons">
        <button
          className="icon-button"
          aria-label="Undo"
          title="Undo · ⌘Z"
          disabled={!state.history.past.length && !state.history.transaction}
          onClick={state.undo}
        >
          <Undo2 size={17} />
        </button>
        <button
          className="icon-button"
          aria-label="Redo"
          title="Redo · ⇧⌘Z"
          disabled={!state.history.future.length}
          onClick={state.redo}
        >
          <Redo2 size={17} />
        </button>
      </div>
      <span className="toolbar-divider" />
      <div className="toolbar-group">
        <button
          className={`icon-button ${!state.editingText ? 'active' : ''}`}
          aria-label="Select objects"
          title="Select objects"
          onClick={() => state.editText(null)}
        >
          <MousePointer2 size={18} />
        </button>
        <button className="tool-button" onClick={commands.addText} title="Insert text">
          <Type size={18} />
          <span>Text</span>
        </button>
        <button className="tool-button" onClick={onImage} title="Insert image">
          <ImagePlus size={18} />
          <span>Image</span>
        </button>
        <Dropdown.Root>
          <Dropdown.Trigger className="tool-button" aria-label="Insert shape">
            <RectangleHorizontal size={18} />
            <span>Shape</span>
            <ChevronDown size={12} />
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content className="dropdown-menu" sideOffset={7}>
              {(
                [
                  ['rectangle', RectangleHorizontal, 'Rectangle'],
                  ['ellipse', Circle, 'Ellipse'],
                  ['line', Minus, 'Line'],
                ] as const
              ).map(([kind, Icon, label]) => (
                <Dropdown.Item
                  key={kind}
                  className="dropdown-item"
                  onSelect={() => commands.addShape(kind)}
                >
                  <Icon size={15} />
                  {label}
                </Dropdown.Item>
              ))}
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
        <button className="tool-button demo-tool" onClick={onDemo}>
          <AppWindow size={17} />
          <span>Live demo</span>
          <span className="new-label">NEW</span>
        </button>
      </div>
      <span className="toolbar-divider" />
      {text ? (
        <div className="toolbar-group text-tools">
          <select
            aria-label="Font family"
            value={text.fontFamily}
            onChange={(event) =>
              state.updateElements([text.id], {
                fontFamily: event.target.value as 'Inter' | 'Manrope',
              })
            }
          >
            <option>Manrope</option>
            <option>Inter</option>
          </select>
          <select
            aria-label="Font size"
            value={text.fontSize}
            onChange={(event) =>
              state.updateElements([text.id], { fontSize: Number(event.target.value) })
            }
          >
            {[...new Set([12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80, 94, 96, text.fontSize])]
              .sort((a, b) => a - b)
              .map((n) => (
                <option key={n}>{n}</option>
              ))}
          </select>
          {(
            [
              [Bold, 'bold'],
              [Italic, 'italic'],
              [Underline, 'underline'],
            ] as const
          ).map(([Icon, mark]) => (
            <button
              key={mark}
              className={`icon-button ${mark === 'bold' && text.fontWeight >= 600 ? 'active' : ''}`}
              title={mark}
              aria-label={mark[0].toUpperCase() + mark.slice(1)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => format(mark)}
            >
              <Icon size={16} />
            </button>
          ))}
          <label className="toolbar-color" title="Text color">
            <input
              type="color"
              aria-label="Text color"
              value={text.color || state.history.present.theme.foreground}
              onChange={(event) => state.updateElements([text.id], { color: event.target.value })}
            />
            <span>A</span>
          </label>
          {(
            [
              [AlignLeft, 'left'],
              [AlignCenter, 'center'],
              [AlignRight, 'right'],
            ] as const
          ).map(([Icon, align]) => (
            <button
              className={`icon-button ${text.align === align ? 'active' : ''}`}
              key={align}
              aria-label={`Align text ${align}`}
              title={`Align text ${align}`}
              onClick={() => state.updateElements([text.id], { align })}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
      ) : (
        <div className="toolbar-group">
          <Dropdown.Root>
            <Dropdown.Trigger className="tool-button" disabled={!selected.length}>
              <Layers size={16} /> Arrange <ChevronDown size={12} />
            </Dropdown.Trigger>
            <Dropdown.Portal>
              <Dropdown.Content className="dropdown-menu" sideOffset={7}>
                <Dropdown.Item className="dropdown-item" onSelect={() => commands.layer('front')}>
                  Bring to front
                </Dropdown.Item>
                <Dropdown.Item className="dropdown-item" onSelect={() => commands.layer('back')}>
                  Send to back
                </Dropdown.Item>
                <Dropdown.Separator className="dropdown-separator" />
                <Dropdown.Item
                  className="dropdown-item"
                  onSelect={commands.group}
                  disabled={selected.length < 2}
                >
                  <Group size={14} /> Group
                </Dropdown.Item>
                <Dropdown.Item className="dropdown-item" onSelect={commands.ungroup}>
                  <Ungroup size={14} /> Ungroup
                </Dropdown.Item>
                <Dropdown.Item className="dropdown-item" onSelect={commands.lock}>
                  <LockKeyhole size={14} /> Lock / unlock
                </Dropdown.Item>
              </Dropdown.Content>
            </Dropdown.Portal>
          </Dropdown.Root>
          <button
            className="icon-button"
            aria-label="Duplicate selected objects"
            disabled={!selected.length || selected.some((node) => node.kind === 'demo')}
            onClick={commands.duplicate}
            title={
              selected.some((node) => node.kind === 'demo')
                ? 'Duplicate the slide to reuse a demo'
                : 'Duplicate · ⌘D'
            }
          >
            <Copy size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Delete selected objects"
            disabled={!selected.some((n) => !n.locked)}
            onClick={commands.delete}
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
      <span className="toolbar-right">
        {selected.length
          ? `${selected.length} object${selected.length === 1 ? '' : 's'} selected`
          : 'A blank canvas. A live possibility.'}
      </span>
    </div>
  );
}
