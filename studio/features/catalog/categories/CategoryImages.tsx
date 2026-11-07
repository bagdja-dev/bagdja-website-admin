'use client';

import { useRef, useState } from 'react';

import { errorMessage } from '@/studio/api/client';
import { uploadAsset } from '@/studio/lib/upload-asset';
import { Icon } from '@/studio/ui/icons';

interface CategoryImagesProps {
  websiteId: string | null;
  images: string[];
  onChange: (images: string[]) => void;
}

const MAX_BYTES = 5 * 1024 * 1024;

/** Foto kategori: unggah lewat `api/uploads/asset` (folder `categories`), maks 5 MB per berkas. */
export function CategoryImages({ websiteId, images, onChange }: CategoryImagesProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0 || !websiteId) return;
    setError(null);
    setUploading(true);
    const added: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) throw new Error(`"${file.name}" bukan gambar.`);
        if (file.size > MAX_BYTES) throw new Error(`"${file.name}" lebih dari 5 MB.`);
        const result = await uploadAsset(file, websiteId, 'categories');
        added.push(result.url);
      }
    } catch (err) {
      setError(errorMessage(err, 'Gagal mengunggah foto.'));
    } finally {
      if (added.length > 0) onChange([...images, ...added]);
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12px] font-semibold text-default-600">Foto kategori</span>
      <div className="flex flex-wrap gap-2">
        {images.map((url, index) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded-[10px] border border-default-200 bg-default-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- URL aset tenant dari banyak host */}
            <img src={url} alt={`Foto kategori ${index + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, i) => i !== index))}
              aria-label={`Hapus foto ${index + 1}`}
              className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-foreground shadow"
            >
              <Icon name="close" size={12} strokeWidth={2.4} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || !websiteId}
          className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-default-300 bg-white text-[11px] font-semibold text-default-600 disabled:opacity-60"
        >
          <Icon name="image" size={18} />
          {uploading ? 'Mengunggah…' : 'Tambah'}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void handleFiles(e.target.files)} />
      {error && <p role="alert" className="text-[12px] text-[#B91C1C]">{error}</p>}
    </div>
  );
}
