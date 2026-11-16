import { useEffect } from 'react';
import { EditorContent, useEditor as useTiptap, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import { useEditor } from '../document/store';
import type { TextElement } from '../document/model';
import { cleanRichText } from '../renderer/rich-text';

export function RichTextEditor({
  node,
  onReady,
}: {
  node: TextElement;
  onReady: (editor: Editor | null) => void;
}) {
  const editor = useTiptap(
    {
      extensions: [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          blockquote: false,
          horizontalRule: false,
        }),
        TextStyleKit,
        TextAlign.configure({ types: ['paragraph'] }),
      ],
      content: cleanRichText(node.html),
      autofocus: 'end',
      editorProps: { attributes: { class: 'rich-text-input', 'aria-label': 'Edit slide text' } },
      onFocus: () => useEditor.getState().begin(),
      onUpdate: ({ editor }) =>
        useEditor.getState().updateElements([node.id], { html: editor.getHTML() }),
    },
    [node.id],
  );
  useEffect(() => {
    onReady(editor);
    editor?.commands.focus('end');
    return () => {
      onReady(null);
      useEditor.getState().finish();
    };
  }, [editor, onReady]);
  return (
    <div className="rich-text-host" onPointerDown={(event) => event.stopPropagation()}>
      <EditorContent editor={editor} />
    </div>
  );
}
