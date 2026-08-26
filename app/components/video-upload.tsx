'use client';

import { useRef, useState } from 'react';

import { uploadAsset } from '../lib/upload-asset';

interface VideoUploadProps {
  value: string;
  onChange: (url: string) => void;
  websiteId?: string;
  uploadFolder?: string;
  disabled?: boolean;
  label?: string;
  description?: string;
}

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export function VideoUpload({
  value,
  onChange,
  websiteId,
  uploadFolder = 'assets',
  disabled = false,
  label = 'Video',
  description = 'MP4, WebM, MOV — maks. 100 MB',
}: VideoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const displayUrl = preview || value || null;

  const handleFile = async (file: File | null) => {
    if (!file || disabled) return;
    setError('');

    if (file.size > MAX_VIDEO_BYTES) {
      setError('Ukuran video maksimal 100 MB');
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    setUploading(true);
    try {
      const result = await uploadAsset(file, websiteId, uploadFolder);
      onChange(result.url);
      setPreview(null);
      URL.revokeObjectURL(localPreview);
    } catch (err) {
      setPreview(null);
      URL.revokeObjectURL(localPreview);
      setError(err instanceof Error ? err.message : 'Gagal mengunggah video');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onChange('');
    setPreview(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          role={displayUrl ? 'button' : undefined}
          tabIndex={displayUrl ? 0 : undefined}
          onClick={() => displayUrl && setIsPlayerOpen(true)}
          onKeyDown={(e) => {
            if (displayUrl && (e.key === 'Enter' || e.key === ' ')) setIsPlayerOpen(true);
          }}
          className={`relative flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-default-300 bg-default-50 ${
            displayUrl ? 'cursor-pointer border-solid border-default-200' : ''
          }`}
        >
          {displayUrl ? (
            <>
              <video src={displayUrl} className="h-full w-full object-cover" muted loop autoPlay playsInline />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/40">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow">
                  <svg className="h-4 w-4 text-foreground" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </div>
            </>
          ) : (
            <svg className="h-8 w-8 text-default-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
              className="rounded-xl border border-default-300 bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-default-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? 'Mengunggah…' : value ? 'Ganti Video' : 'Pilih File'}
            </button>
            {(value || preview) && !uploading && (
              <button
                type="button"
                disabled={disabled}
                onClick={handleRemove}
                className="rounded-xl px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger-50 disabled:opacity-50"
              >
                Hapus
              </button>
            )}
          </div>

          {description && !error && <p className="text-xs text-default-500">{description}</p>}
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </div>

      {isPlayerOpen && displayUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsPlayerOpen(false)}
        >
          <div className="relative w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsPlayerOpen(false)}
              className="absolute -top-10 right-0 rounded-full p-2 text-white transition-colors hover:bg-white/10"
              aria-label="Tutup"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
            <video
              src={displayUrl}
              className="max-h-[80vh] w-full rounded-xl bg-black"
              controls
              autoPlay
              loop
              playsInline
            />
          </div>
        </div>
      )}
    </div>
  );
}
