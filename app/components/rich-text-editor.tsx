'use client';

import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { Underline } from '@tiptap/extension-underline';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { uploadAsset } from '../lib/upload-asset';

const EDITOR_CONTENT_CLASS =
  'rich-text-editor min-h-[200px] px-4 py-3 text-sm leading-relaxed text-gray-800 outline-none ' +
  '[&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left ' +
  '[&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-default-400 ' +
  '[&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] ' +
  '[&_a]:text-blue-600 [&_a]:underline ' +
  '[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-base [&_h3]:font-semibold ' +
  '[&_li]:ml-4 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:list-disc ' +
  '[&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg ' +
  '[&_table]:my-2 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse ' +
  '[&_td]:relative [&_td]:border [&_td]:border-default-300 [&_td]:p-2 [&_th]:relative [&_th]:border [&_th]:border-default-300 [&_th]:bg-default-100 [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold';

interface RichTextEditorProps {
  label: string;
  description?: string;
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  websiteId?: string;
  uploadFolder?: string;
}

function ToolbarSeparator() {
  return <span className="mx-0.5 w-px self-stretch bg-default-200" />;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`min-w-[2rem] rounded-lg px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-40 ${
        active ? 'bg-primary text-white' : 'text-default-600 hover:bg-white hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarButtons({
  editor,
  disabled,
  uploading,
  onInsertImage,
}: {
  editor: Editor;
  disabled: boolean;
  uploading: boolean;
  onInsertImage: () => void;
}) {
  const setLink = () => {
    const previousUrl = (editor.getAttributes('link').href as string | undefined) ?? '';
    const url = window.prompt('URL link:', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const inTable = editor.isActive('table');

  return (
    <>
      <ToolbarButton title="Bold" disabled={disabled} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        B
      </ToolbarButton>
      <ToolbarButton title="Italic" disabled={disabled} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        I
      </ToolbarButton>
      <ToolbarButton title="Underline" disabled={disabled} active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        U
      </ToolbarButton>
      <ToolbarButton title="Strikethrough" disabled={disabled} active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        S
      </ToolbarButton>

      <ToolbarSeparator />

      <ToolbarButton
        title="Heading 2"
        disabled={disabled}
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        title="Heading 3"
        disabled={disabled}
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>

      <ToolbarSeparator />

      <ToolbarButton
        title="Bullet list"
        disabled={disabled}
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •
      </ToolbarButton>
      <ToolbarButton
        title="Numbered list"
        disabled={disabled}
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </ToolbarButton>

      <ToolbarSeparator />

      <ToolbarButton title="Insert link" disabled={disabled} active={editor.isActive('link')} onClick={setLink}>
        🔗
      </ToolbarButton>
      <ToolbarButton title="Insert image" disabled={disabled || uploading} onClick={onInsertImage}>
        {uploading ? '…' : '🖼️'}
      </ToolbarButton>

      <ToolbarSeparator />

      <ToolbarButton
        title="Sisipkan tabel 3×3"
        disabled={disabled}
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        ⊞
      </ToolbarButton>
      {inTable && (
        <>
          <ToolbarButton title="Tambah kolom" disabled={disabled} onClick={() => editor.chain().focus().addColumnAfter().run()}>
            +Kol
          </ToolbarButton>
          <ToolbarButton title="Hapus kolom" disabled={disabled} onClick={() => editor.chain().focus().deleteColumn().run()}>
            −Kol
          </ToolbarButton>
          <ToolbarButton title="Tambah baris" disabled={disabled} onClick={() => editor.chain().focus().addRowAfter().run()}>
            +Baris
          </ToolbarButton>
          <ToolbarButton title="Hapus baris" disabled={disabled} onClick={() => editor.chain().focus().deleteRow().run()}>
            −Baris
          </ToolbarButton>
          <ToolbarButton title="Hapus tabel" disabled={disabled} onClick={() => editor.chain().focus().deleteTable().run()}>
            ✕Tbl
          </ToolbarButton>
        </>
      )}

      <ToolbarSeparator />

      <ToolbarButton
        title="Clear formatting"
        disabled={disabled}
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
      >
        ✕
      </ToolbarButton>
      <ToolbarButton title="Undo" disabled={disabled} onClick={() => editor.chain().focus().undo().run()}>
        ↶
      </ToolbarButton>
      <ToolbarButton title="Redo" disabled={disabled} onClick={() => editor.chain().focus().redo().run()}>
        ↷
      </ToolbarButton>
    </>
  );
}

export function RichTextEditor({
  label,
  description,
  value,
  onChange,
  disabled = false,
  websiteId,
  uploadFolder = 'content',
}: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [codeMode, setCodeMode] = useState(false);
  const [codeValue, setCodeValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      Placeholder.configure({ placeholder: 'Tulis konten di sini...' }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || '',
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: updated }) => onChange(updated.getHTML()),
    editorProps: {
      attributes: { class: EDITOR_CONTENT_CLASS },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  const toggleCodeMode = () => {
    if (!editor) return;
    if (codeMode) {
      editor.commands.setContent(codeValue || '', { emitUpdate: true });
      setCodeMode(false);
    } else {
      setCodeValue(editor.getHTML());
      setCodeMode(true);
    }
  };

  const handleInsertImage = async (file: File) => {
    if (!editor) return;
    setError('');
    setUploading(true);
    try {
      const result = await uploadAsset(file, websiteId, uploadFolder);
      editor.chain().focus().setImage({ src: result.url }).run();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah gambar');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>

      <div className="overflow-hidden rounded-xl border border-default-300 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-1 border-b border-default-200 bg-default-50 px-2 py-1.5">
          {!codeMode && editor && (
            <>
              <ToolbarButtons
                editor={editor}
                disabled={disabled}
                uploading={uploading}
                onInsertImage={() => fileInputRef.current?.click()}
              />
              <ToolbarSeparator />
            </>
          )}
          <ToolbarButton
            title={codeMode ? 'Kembali ke tampilan visual' : 'Edit kode HTML'}
            active={codeMode}
            disabled={disabled || !editor}
            onClick={toggleCodeMode}
          >
            {'</>'}
          </ToolbarButton>
        </div>

        {codeMode ? (
          <textarea
            value={codeValue}
            onChange={(e) => setCodeValue(e.target.value)}
            disabled={disabled}
            spellCheck={false}
            placeholder="<p>Tulis HTML di sini...</p>"
            className="min-h-[200px] w-full bg-white px-4 py-3 font-mono text-xs leading-relaxed text-gray-800 outline-none"
          />
        ) : (
          <EditorContent editor={editor} />
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleInsertImage(file);
          }}
        />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
      {description && <p className="text-xs leading-relaxed text-default-500">{description}</p>}
      <p className="text-xs text-default-400">
        Konten rich text ditampilkan dengan gaya independen — tidak mengikuti tema template.
      </p>
    </div>
  );
}
