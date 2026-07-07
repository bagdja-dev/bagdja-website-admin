'use client';

import { useRef, useState } from 'react';

import { uploadAsset } from '../lib/upload-asset';
import type { GalleryImage } from '../lib/section-types';

interface GalleryEditorProps {
  label: string;
  description?: string;
  value: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
  websiteId?: string;
  uploadFolder?: string;
  disabled?: boolean;
}

export function GalleryEditor({
  label,
  description,
  value,
  onChange,
  websiteId,
  uploadFolder = 'gallery',
  disabled = false,
}: GalleryEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length || disabled) return;
    setError('');
    setUploading(true);

    try {
      const added: GalleryImage[] = [];
      for (const file of Array.from(files)) {
        const result = await uploadAsset(file, websiteId, uploadFolder);
        added.push({ url: result.url, alt: '', caption: '' });
      }
      onChange([...value, ...added]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah gambar');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const updateImage = (index: number, patch: Partial<GalleryImage>) => {
    onChange(value.map((img, i) => (i === index ? { ...img, ...patch } : img)));
  };

  const removeImage = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const swap = direction === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= value.length) return;
    const next = [...value];
    [next[index], next[swap]] = [next[swap], next[index]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => void handleFiles(e.target.files)}
      />

      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-default-300 bg-default-50/50 py-6 text-sm font-medium text-default-600 transition-colors hover:border-primary hover:bg-primary-50/30 hover:text-primary disabled:opacity-50"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        {uploading ? 'Mengunggah…' : 'Tambah Gambar'}
      </button>

      {description && !error && (
        <p className="text-xs text-default-500">{description}</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}

      {value.length > 0 && (
        <div className="space-y-3">
          {value.map((img, index) => (
            <div
              key={`${img.url}-${index}`}
              className="flex gap-3 rounded-xl border border-default-200 bg-white p-3 shadow-sm"
            >
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  disabled={index === 0 || disabled}
                  onClick={() => moveImage(index, 'up')}
                  className="rounded p-1 text-default-400 hover:text-primary disabled:opacity-30"
                  aria-label="Naik"
                >
                  ↑
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.alt || `Gambar ${index + 1}`}
                  className="h-20 w-20 rounded-lg object-cover ring-1 ring-default-200"
                />
                <button
                  type="button"
                  disabled={index === value.length - 1 || disabled}
                  onClick={() => moveImage(index, 'down')}
                  className="rounded p-1 text-default-400 hover:text-primary disabled:opacity-30"
                  aria-label="Turun"
                >
                  ↓
                </button>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {index === 0 && (
                  <span className="inline-flex w-fit rounded-md bg-primary-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Cover
                  </span>
                )}
                <input
                  type="text"
                  placeholder="Alt text (aksesibilitas)"
                  value={img.alt ?? ''}
                  disabled={disabled}
                  onChange={(e) => updateImage(index, { alt: e.target.value })}
                  className="w-full rounded-lg border border-default-300 px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="text"
                  placeholder="Caption (opsional)"
                  value={img.caption ?? ''}
                  disabled={disabled}
                  onChange={(e) => updateImage(index, { caption: e.target.value })}
                  className="w-full rounded-lg border border-default-300 px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeImage(index)}
                  className="self-start text-xs font-medium text-danger hover:underline"
                >
                  Hapus gambar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
