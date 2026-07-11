'use client';

import { useRef, useState } from 'react';

import { uploadAsset } from '../lib/upload-asset';

interface CoverImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  websiteId?: string;
  uploadFolder?: string;
  disabled?: boolean;
  label?: string;
  description?: string;
}

export function CoverImageUpload({
  value,
  onChange,
  websiteId,
  uploadFolder = 'assets',
  disabled = false,
  label = 'Gambar Sampul',
  description = 'PNG, JPG, WebP, GIF — maks. 5 MB',
}: CoverImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  const displayUrl = preview || value || null;

  const handleFile = async (file: File | null) => {
    if (!file || disabled) return;
    setError('');

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
      setError(err instanceof Error ? err.message : 'Gagal mengunggah gambar');
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
          className={`flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-default-300 bg-default-50 ${
            displayUrl ? 'border-solid border-default-200' : ''
          }`}
        >
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt="Preview sampul" className="h-full w-full object-cover" />
          ) : (
            <svg className="h-8 w-8 text-default-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
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
              {uploading ? 'Mengunggah…' : value ? 'Ganti Gambar' : 'Pilih File'}
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
    </div>
  );
}
