'use client';

import { useRef, useState } from 'react';

import { uploadAsset } from '../lib/upload-asset';
import { ModelViewerElement } from './model-viewer-element';

interface Model3DUploadProps {
  value: string;
  onChange: (url: string) => void;
  websiteId?: string;
  uploadFolder?: string;
  disabled?: boolean;
  label?: string;
  description?: string;
}

const MAX_MODEL_BYTES = 50 * 1024 * 1024;

export function Model3DUpload({
  value,
  onChange,
  websiteId,
  uploadFolder = 'assets',
  disabled = false,
  label = 'Model 3D',
  description = 'glTF/GLB — maks. 50 MB. Bisa di-zoom & diputar oleh pembeli.',
}: Model3DUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const displayUrl = preview || value || null;

  const handleFile = async (file: File | null) => {
    if (!file || disabled) return;
    setError('');

    if (!file.name.toLowerCase().match(/\.(glb|gltf)$/)) {
      setError('Format harus .glb atau .gltf');
      return;
    }
    if (file.size > MAX_MODEL_BYTES) {
      setError('Ukuran model maksimal 50 MB');
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
      setError(err instanceof Error ? err.message : 'Gagal mengunggah model 3D');
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
          onClick={() => displayUrl && setIsViewerOpen(true)}
          onKeyDown={(e) => {
            if (displayUrl && (e.key === 'Enter' || e.key === ' ')) setIsViewerOpen(true);
          }}
          className={`relative flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-default-300 bg-default-50 ${
            displayUrl ? 'cursor-pointer border-solid border-default-200' : ''
          }`}
        >
          {displayUrl ? (
            <ModelViewerElement src={displayUrl} className="h-full w-full" cameraControls={false} />
          ) : (
            <svg className="h-8 w-8 text-default-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 7.5V6a2.25 2.25 0 0 0-2.25-2.25H15M3 16.5V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18v-1.5m-18-9v9m18-9v9M6.75 3.75h1.5v1.5h-1.5v-1.5ZM3 7.5l9-4.5 9 4.5-9 4.5-9-4.5Zm9 4.5v9"
              />
            </svg>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
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
              {uploading ? 'Mengunggah…' : value ? 'Ganti Model' : 'Pilih File'}
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

      {isViewerOpen && displayUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsViewerOpen(false)}
        >
          <div className="relative h-[70vh] w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsViewerOpen(false)}
              className="absolute -top-10 right-0 rounded-full p-2 text-white transition-colors hover:bg-white/10"
              aria-label="Tutup"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
            <ModelViewerElement
              src={displayUrl}
              className="h-full w-full rounded-xl bg-black"
              cameraControls
              autoRotate
            />
          </div>
        </div>
      )}
    </div>
  );
}
