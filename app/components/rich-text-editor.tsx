'use client';

import { useCallback, useEffect, useRef } from 'react';

const TOOLBAR: Array<
  | { cmd: 'separator' }
  | { cmd: string; label: string; title: string; arg?: string }
> = [
  { cmd: 'bold', label: 'B', title: 'Bold' },
  { cmd: 'italic', label: 'I', title: 'Italic' },
  { cmd: 'underline', label: 'U', title: 'Underline' },
  { cmd: 'separator' },
  { cmd: 'formatBlock', arg: 'h2', label: 'H2', title: 'Heading 2' },
  { cmd: 'formatBlock', arg: 'h3', label: 'H3', title: 'Heading 3' },
  { cmd: 'separator' },
  { cmd: 'insertUnorderedList', label: '•', title: 'Bullet list' },
  { cmd: 'insertOrderedList', label: '1.', title: 'Numbered list' },
  { cmd: 'separator' },
  { cmd: 'createLink', label: '🔗', title: 'Insert link' },
  { cmd: 'removeFormat', label: '✕', title: 'Clear formatting' },
];

interface RichTextEditorProps {
  label: string;
  description?: string;
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}

export function RichTextEditor({ label, description, value, onChange, disabled }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || isInternalChange.current) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || '';
    }
  }, [value]);

  const emitChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    isInternalChange.current = true;
    onChange(el.innerHTML);
    requestAnimationFrame(() => {
      isInternalChange.current = false;
    });
  }, [onChange]);

  const exec = (command: string, arg?: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    if (command === 'createLink') {
      const url = window.prompt('URL link:', 'https://');
      if (url) document.execCommand('createLink', false, url);
    } else if (command === 'formatBlock' && arg) {
      document.execCommand('formatBlock', false, arg);
    } else {
      document.execCommand(command, false, arg);
    }
    emitChange();
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>

      <div className="overflow-hidden rounded-xl border border-default-300 bg-white shadow-sm">
        <div className="flex flex-wrap gap-1 border-b border-default-200 bg-default-50 px-2 py-1.5">
          {TOOLBAR.map((item, i) => {
            if (!('label' in item)) {
              return <span key={`sep-${i}`} className="mx-0.5 w-px self-stretch bg-default-200" />;
            }
            return (
              <button
                key={item.cmd + (item.arg ?? '')}
                type="button"
                title={item.title}
                disabled={disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => exec(item.cmd, item.arg)}
                className="min-w-[2rem] rounded-lg px-2 py-1 text-xs font-semibold text-default-600 transition-colors hover:bg-white hover:text-foreground disabled:opacity-40"
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={emitChange}
          onBlur={emitChange}
          data-placeholder="Tulis konten di sini..."
          className="rich-text-editor min-h-[160px] px-4 py-3 text-sm leading-relaxed text-gray-800 outline-none [&:empty]:before:pointer-events-none [&:empty]:before:text-default-400 [&:empty]:before:content-[attr(data-placeholder)] [&_a]:text-blue-600 [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-base [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:list-disc"
          style={{
            background: '#ffffff',
            color: '#1f2937',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        />
      </div>

      {description && <p className="text-xs leading-relaxed text-default-500">{description}</p>}
      <p className="text-xs text-default-400">
        Konten rich text ditampilkan dengan gaya independen — tidak mengikuti tema template.
      </p>
    </div>
  );
}
