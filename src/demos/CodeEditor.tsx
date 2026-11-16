import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';

export function CodeEditor({
  value,
  language,
  onChange,
}: {
  value: string;
  language: 'html' | 'css' | 'js';
  onChange: (source: string) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const initial = useRef(value);
  const change = useRef(onChange);
  change.current = onChange;
  useEffect(() => {
    const view = new EditorView({
      parent: holder.current!,
      doc: initial.current,
      extensions: [
        basicSetup,
        language === 'html' ? html() : language === 'css' ? css() : javascript(),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ 'aria-label': `${language.toUpperCase()} source` }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) change.current(update.state.doc.toString());
        }),
        EditorView.theme({
          '&': { height: '100%', fontSize: '12px' },
          '.cm-scroller': { fontFamily: 'ui-monospace,SFMono-Regular,monospace' },
          '.cm-content': { padding: '18px 0' },
          '.cm-gutters': {
            backgroundColor: '#f8f6fc',
            borderRight: '1px solid #eee7f5',
            color: '#b3a4c1',
          },
          '.cm-activeLine': { backgroundColor: '#f6f0ff' },
          '.cm-activeLineGutter': { backgroundColor: '#eee5fa' },
          '&.cm-focused': { outline: 'none' },
        }),
      ],
    });
    return () => view.destroy();
  }, [language]);
  return <div className="code-editor" ref={holder} />;
}
