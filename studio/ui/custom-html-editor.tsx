'use client';

import { html as htmlLanguage } from '@codemirror/lang-html';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import {
  analyzeCustomHtml,
  byteLength,
  CUSTOM_HTML_AI_PROMPT,
  CUSTOM_HTML_MAX_BYTES,
  CUSTOM_HTML_MESSAGE,
  CUSTOM_HTML_SANDBOX_FLAGS,
  formatHtml,
  getCustomHtmlSandboxUrl,
  uploadDataImages,
  type HtmlIssue,
} from '@/studio/lib/custom-html';
import { uploadAsset } from '@/studio/lib/upload-asset';

interface CustomHtmlEditorProps {
  label: string;
  description?: string;
  value: string;
  onChange: (html: string) => void;
  websiteId?: string;
  uploadFolder?: string;
}

type Device = 'desktop' | 'tablet' | 'mobile';
type MobileTab = 'code' | 'preview';

const DEVICES: { key: Device; label: string; width: string }[] = [
  { key: 'desktop', label: 'Desktop', width: '100%' },
  { key: 'tablet', label: 'Tablet', width: '768px' },
  { key: 'mobile', label: 'Mobile', width: '375px' },
];

const PREVIEW_DEBOUNCE_MS = 500;
// Tanpa lineWrapping: baris panjang tetap utuh dan editor scroll horizontal.
const CODE_EXTENSIONS = [htmlLanguage({ autoCloseTags: true })];

/** Lebar panel kode (persen) di layar besar; bisa digeser lewat pembatas. */
const SPLIT_DEFAULT = 50;
const SPLIT_MIN = 20;
const SPLIT_MAX = 80;
const SPLIT_STORAGE_KEY = 'studio.customHtmlEditor.split';

function clampSplit(value: number): number {
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, Math.round(value * 10) / 10));
}

function readStoredSplit(): number {
  try {
    const stored = Number(window.localStorage.getItem(SPLIT_STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0 ? clampSplit(stored) : SPLIT_DEFAULT;
  } catch {
    return SPLIT_DEFAULT;
  }
}

function storeSplit(value: number): void {
  try {
    window.localStorage.setItem(SPLIT_STORAGE_KEY, String(value));
  } catch {
    // Penyimpanan browser tidak tersedia — pembagian kembali ke default saat dibuka lagi.
  }
}

const ISSUE_STYLE: Record<HtmlIssue['level'], string> = {
  error: 'border-danger-200 bg-danger-50 text-danger-700',
  warning: 'border-warning-200 bg-warning-50 text-warning-800',
  info: 'border-default-200 bg-default-50 text-default-600',
};

/** Preview memakai dokumen sandbox yang sama dengan website publik. */
function SandboxPreview({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(0);
  const sandboxUrl = useMemo(() => getCustomHtmlSandboxUrl(), []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return undefined;
    const send = () => iframe.contentWindow?.postMessage(
      { type: CUSTOM_HTML_MESSAGE.render, html, baseUrl: window.location.href },
      '*',
    );
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      const data = event.data as { type?: unknown; height?: unknown } | null;
      if (!data || typeof data !== 'object') return;
      if (data.type === CUSTOM_HTML_MESSAGE.ready) send();
      if (data.type === CUSTOM_HTML_MESSAGE.height && typeof data.height === 'number' && Number.isFinite(data.height)) {
        setHeight(Math.max(0, Math.ceil(data.height)));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [html]);

  if (!html.trim()) {
    return <p className="p-6 text-center text-sm text-default-500">Preview muncul di sini setelah kode diisi.</p>;
  }
  return (
    <iframe
      ref={iframeRef}
      src={sandboxUrl}
      sandbox={CUSTOM_HTML_SANDBOX_FLAGS}
      referrerPolicy="no-referrer"
      title="Preview HTML kustom"
      className="block w-full border-0 bg-white"
      style={{ height: Math.max(height, 160) }}
    />
  );
}

export function CustomHtmlEditor({
  label,
  description,
  value,
  onChange,
  websiteId,
  uploadFolder = 'sections',
}: CustomHtmlEditorProps) {
  const codeRef = useRef<ReactCodeMirrorRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [previewHtml, setPreviewHtml] = useState(value);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [device, setDevice] = useState<Device>('desktop');
  const [mobileTab, setMobileTab] = useState<MobileTab>('code');
  const [busy, setBusy] = useState<'' | 'format' | 'upload' | 'save'>('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [showIssues, setShowIssues] = useState(true);
  const [split, setSplit] = useState(SPLIT_DEFAULT);
  const [isResizing, setIsResizing] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const isDirty = draft !== value;
  const issues = useMemo(() => (isOpen ? analyzeCustomHtml(draft) : []), [draft, isOpen]);
  const hasBlockingIssue = issues.some((issue) => issue.level === 'error');
  const valueBytes = byteLength(value);
  const valueHasScript = /<script\b/i.test(value);

  // Preview diperbarui setelah user berhenti mengetik; iframe di-remount supaya script lama berhenti.
  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = setTimeout(() => {
      setPreviewHtml(draft);
      setPreviewVersion((version) => version + 1);
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  const open = () => {
    setDraft(value);
    setPreviewHtml(value);
    setPreviewVersion((version) => version + 1);
    setError('');
    setNotice('');
    setConfirmDiscard(false);
    setMobileTab('code');
    setSplit(readStoredSplit());
    setIsOpen(true);
  };

  const splitFromPointer = (clientX: number): number | null => {
    const rect = splitContainerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    return clampSplit(((clientX - rect.left) / rect.width) * 100);
  };

  const onSplitPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizing(true);
  };

  const onSplitPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isResizing) return;
    const next = splitFromPointer(event.clientX);
    if (next !== null) setSplit(next);
  };

  const onSplitPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isResizing) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsResizing(false);
    storeSplit(split);
  };

  const onSplitKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2;
    let next: number | null = null;
    if (event.key === 'ArrowLeft') next = split - step;
    else if (event.key === 'ArrowRight') next = split + step;
    else if (event.key === 'Home') next = SPLIT_MIN;
    else if (event.key === 'End') next = SPLIT_MAX;
    if (next === null) return;
    event.preventDefault();
    const clamped = clampSplit(next);
    setSplit(clamped);
    storeSplit(clamped);
  };

  const resetSplit = () => {
    setSplit(SPLIT_DEFAULT);
    storeSplit(SPLIT_DEFAULT);
  };

  const close = () => {
    if (isDirty && !confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    setIsOpen(false);
    setConfirmDiscard(false);
  };

  const runFormat = async () => {
    setBusy('format');
    setError('');
    try {
      setDraft(await formatHtml(draft));
    } catch (formatError) {
      const message = formatError instanceof Error ? formatError.message.split('\n')[0] : '';
      setError(`Kode belum bisa dirapikan — periksa tag yang belum ditutup. ${message}`.trim());
    } finally {
      setBusy('');
    }
  };

  const insertAtCursor = (snippet: string) => {
    const view = codeRef.current?.view;
    if (!view) {
      setDraft((current) => `${current}\n${snippet}`);
      return;
    }
    view.dispatch(view.state.replaceSelection(snippet));
    view.focus();
  };

  const onPickImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy('upload');
    setError('');
    try {
      const { url } = await uploadAsset(file, websiteId, uploadFolder);
      insertAtCursor(`<img src="${url}" alt="" style="display:block;max-width:100%;height:auto">`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Gagal mengunggah gambar.');
    } finally {
      setBusy('');
    }
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(CUSTOM_HTML_AI_PROMPT);
      setNotice('Prompt AI disalin. Tempel ke AI, tambahkan isi section yang diinginkan.');
    } catch {
      setError('Gagal menyalin prompt. Izinkan akses clipboard di browser.');
    }
  };

  const save = async () => {
    setBusy('save');
    setError('');
    setNotice('');
    try {
      const result = await uploadDataImages(draft, websiteId, uploadFolder);
      if (byteLength(result.html) > CUSTOM_HTML_MAX_BYTES) {
        setDraft(result.html);
        setError(`Kode masih terlalu besar setelah gambar diunggah. Maksimal ${CUSTOM_HTML_MAX_BYTES / 1024} KB.`);
        return;
      }
      onChange(result.html);
      if (result.invalid > 0) {
        setDraft(result.html);
        setNotice(`${result.invalid} gambar base64 rusak dikosongkan. Sisipkan ulang gambarnya lewat tombol "Sisipkan gambar", lalu simpan lagi.`);
        return;
      }
      setIsOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Gagal menyimpan.');
    } finally {
      setBusy('');
    }
  };

  const deviceWidth = DEVICES.find((entry) => entry.key === device)?.width ?? '100%';
  const buttonClass = 'rounded-md border border-default-200 bg-white px-2.5 py-1.5 text-xs font-medium hover:bg-default-100 disabled:opacity-40';

  return (
    <>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground">{label}</label>
        <button
          type="button"
          onClick={open}
          className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-default-200 bg-white px-3 py-2 text-left text-sm hover:border-primary hover:bg-default-50"
        >
          <span className="flex flex-col">
            <span className="font-medium">{value.trim() ? 'Edit HTML' : 'Tulis / tempel HTML'}</span>
            {value.trim() ? (
              <span className="text-xs text-default-500">
                {Math.ceil(valueBytes / 1024)} KB{valueHasScript ? ' · berisi JS' : ''}
              </span>
            ) : null}
          </span>
          <span aria-hidden="true" className="text-default-500">Buka editor ↗</span>
        </button>
        {description ? <p className="text-xs text-default-500">{description}</p> : null}
      </div>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="custom-html-editor-title"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-0 sm:p-4"
        >
          <div className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[94vh] sm:max-w-[1600px] sm:rounded-xl">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-default-200 bg-default-50 px-3 py-2">
              <div className="min-w-0">
                <h2 id="custom-html-editor-title" className="truncate text-sm font-semibold text-foreground">
                  Editor HTML — {label}
                </h2>
                <p className="text-[11px] text-default-500">
                  {Math.ceil(byteLength(draft) / 1024)} KB · JS jalan terisolasi, tanpa akses jaringan
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" className={buttonClass} disabled={busy !== '' || !draft.trim()} onClick={runFormat}>
                  {busy === 'format' ? 'Merapikan…' : 'Format'}
                </button>
                <button type="button" className={buttonClass} disabled={busy !== ''} onClick={() => fileInputRef.current?.click()}>
                  {busy === 'upload' ? 'Mengunggah…' : 'Sisipkan gambar'}
                </button>
                <button type="button" className={buttonClass} onClick={copyPrompt}>
                  Salin prompt AI
                </button>
                <span className="mx-1 hidden h-5 w-px bg-default-200 sm:block" aria-hidden="true" />
                <button type="button" className={buttonClass} disabled={busy === 'save'} onClick={close}>
                  Batal
                </button>
                <button
                  type="button"
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
                  disabled={busy !== '' || hasBlockingIssue || !isDirty}
                  onClick={save}
                >
                  {busy === 'save' ? 'Menyimpan…' : 'Simpan'}
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
            </header>

            {confirmDiscard ? (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-b border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-800">
                <span>Perubahan belum disimpan. Buang perubahan dan tutup editor?</span>
                <span className="flex gap-1.5">
                  <button type="button" className={buttonClass} onClick={() => setConfirmDiscard(false)}>Lanjut edit</button>
                  <button type="button" className="rounded-md bg-danger px-2.5 py-1.5 text-xs font-semibold text-white" onClick={close}>
                    Buang
                  </button>
                </span>
              </div>
            ) : null}

            <div className="flex border-b border-default-200 lg:hidden" role="tablist">
              {(['code', 'preview'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={mobileTab === tab}
                  onClick={() => setMobileTab(tab)}
                  className={`flex-1 py-2 text-xs font-semibold ${mobileTab === tab ? 'border-b-2 border-primary text-primary' : 'text-default-500'}`}
                >
                  {tab === 'code' ? 'Kode' : 'Preview'}
                </button>
              ))}
            </div>

            <div
              ref={splitContainerRef}
              className={`flex min-h-0 flex-1 ${isResizing ? 'cursor-col-resize select-none' : ''}`}
              style={{ '--code-split': `${split}%` } as CSSProperties}
            >
              <section
                aria-label="Kode HTML"
                className={`min-h-0 w-full min-w-0 shrink-0 overflow-hidden bg-[#282c34] lg:w-[var(--code-split)] ${mobileTab === 'code' ? 'block' : 'hidden'} lg:block`}
              >
                <CodeMirror
                  ref={codeRef}
                  value={draft}
                  onChange={setDraft}
                  extensions={CODE_EXTENSIONS}
                  theme="dark"
                  height="100%"
                  className="h-full text-[13px]"
                  placeholder="Tempel HTML dari AI/designer, atau tulis sendiri…"
                  autoFocus
                />
              </section>

              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Geser untuk mengatur lebar kode dan preview"
                aria-valuemin={SPLIT_MIN}
                aria-valuemax={SPLIT_MAX}
                aria-valuenow={Math.round(split)}
                tabIndex={0}
                title="Geser untuk mengatur lebar · klik dua kali untuk 50:50"
                onPointerDown={onSplitPointerDown}
                onPointerMove={onSplitPointerMove}
                onPointerUp={onSplitPointerUp}
                onPointerCancel={onSplitPointerUp}
                onDoubleClick={resetSplit}
                onKeyDown={onSplitKeyDown}
                className={`group relative hidden w-1.5 shrink-0 cursor-col-resize touch-none items-center justify-center outline-none lg:flex ${isResizing ? 'bg-primary' : 'bg-default-200 hover:bg-primary/60 focus-visible:bg-primary/60'}`}
              >
                <span aria-hidden="true" className={`h-10 w-0.5 rounded-full ${isResizing ? 'bg-white' : 'bg-default-400 group-hover:bg-white'}`} />
              </div>

              <section
                aria-label="Preview"
                className={`relative min-h-0 min-w-0 flex-1 flex-col bg-default-100 ${mobileTab === 'preview' ? 'flex' : 'hidden'} lg:flex`}
              >
                {/* Iframe menelan event pointer saat digeser — tutup selama resize. */}
                {isResizing ? <div aria-hidden="true" className="absolute inset-0 z-10" /> : null}
                <div className="flex items-center justify-between gap-2 border-b border-default-200 bg-white px-3 py-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-default-500">Preview</span>
                  <div className="flex gap-1">
                    {DEVICES.map((entry) => (
                      <button
                        key={entry.key}
                        type="button"
                        aria-pressed={device === entry.key}
                        onClick={() => setDevice(entry.key)}
                        className={`rounded-md border px-2 py-1 text-[11px] ${device === entry.key ? 'border-primary bg-primary text-white' : 'border-default-200 bg-white hover:bg-default-100'}`}
                      >
                        {entry.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-auto p-2 sm:p-4">
                  <div className="mx-auto max-w-full overflow-hidden rounded-md bg-white shadow-sm" style={{ width: deviceWidth }}>
                    <SandboxPreview key={previewVersion} html={previewHtml} />
                  </div>
                </div>
              </section>
            </div>

            {error || notice || issues.length > 0 ? (
              <footer className="max-h-[30vh] overflow-y-auto border-t border-default-200 bg-white px-3 py-2">
                {error ? <p role="alert" className="mb-1.5 text-xs text-danger">{error}</p> : null}
                {notice ? <p role="status" className="mb-1.5 text-xs text-success-700">{notice}</p> : null}
                {issues.length > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowIssues((shown) => !shown)}
                      className="text-xs font-semibold text-default-600 hover:text-foreground"
                      aria-expanded={showIssues}
                    >
                      {showIssues ? '▾' : '▸'} {issues.length} catatan sebelum disimpan
                    </button>
                    {showIssues ? (
                      <ul className="mt-1.5 flex flex-col gap-1">
                        {issues.map((issue) => (
                          <li key={issue.message} className={`rounded-md border px-2 py-1 text-xs ${ISSUE_STYLE[issue.level]}`}>
                            {issue.message}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                ) : null}
              </footer>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
