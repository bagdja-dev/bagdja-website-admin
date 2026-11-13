'use client';

import { useRef, useState } from 'react';

import { Button, Input, Spinner } from '@heroui/react';

import { uploadAsset } from '@/studio/lib/upload-asset';
import { Icon } from '@/studio/ui/icons';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif';

interface SectionImage {
  url: string;
  alt?: string;
  caption?: string;
}

interface ImageUploadFieldProps {
  value: string;
  websiteId: string;
  label: string;
  onChange: (url: string) => void;
}

export function ImageUploadField({ value, websiteId, label, onChange }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Pilih file gambar.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError('Ukuran gambar maksimal 5 MB.');
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const result = await uploadAsset(file, websiteId, 'content');
      onChange(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal mengunggah gambar.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-default-200 bg-default-50">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL gambar dari storage service */}
          <img src={value} alt={label} className="max-h-56 w-full object-contain" />
          <button
            type="button"
            onClick={() => {
              onChange('');
              setError(null);
            }}
            disabled={uploading}
            className="absolute right-2 top-2 rounded-full bg-white p-2 text-default-600 shadow hover:text-danger disabled:opacity-50"
            aria-label={`Hapus ${label.toLocaleLowerCase()}`}
            title={`Hapus ${label.toLocaleLowerCase()}`}
          >
            <Icon name="trash" size={14} strokeWidth={1.5} />
          </button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="bordered"
          radius="sm"
          size="sm"
          isDisabled={uploading || !websiteId}
          onPress={() => inputRef.current?.click()}
        >
          {uploading ? <Spinner size="sm" /> : value ? 'Ganti gambar' : 'Unggah gambar'}
        </Button>
        <span className="text-xs text-default-500">JPG, PNG, WebP, atau GIF · maks. 5 MB</span>
      </div>
      {!websiteId && <p className="text-xs text-danger">Website aktif tidak ditemukan; gambar tidak dapat diunggah.</p>}
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        disabled={uploading || !websiteId}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void upload(file);
          event.currentTarget.value = '';
        }}
      />
    </div>
  );
}

interface GalleryUploadFieldProps {
  value: unknown;
  websiteId: string;
  onChange: (images: SectionImage[]) => void;
}

function galleryImagesFrom(value: unknown): SectionImage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || !('url' in item) || typeof item.url !== 'string') return [];
    const image: SectionImage = { url: item.url };
    if ('alt' in item && typeof item.alt === 'string') image.alt = item.alt;
    if ('caption' in item && typeof item.caption === 'string') image.caption = item.caption;
    return [image];
  });
}

/** Thumbnail foto galeri: kotak tetap (object-cover) + fallback bila URL gagal dimuat. */
function GalleryThumb({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-default-200 bg-default-100 sm:h-24 sm:w-24">
      {failed ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-center text-default-400">
          <Icon name="image" size={18} strokeWidth={1.5} />
          <span className="text-[10px] leading-tight">Gagal dimuat</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- URL gambar dari storage service
        <img src={url} alt={alt} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      )}
    </div>
  );
}

const iconButtonClass =
  'flex h-8 w-8 items-center justify-center rounded-lg border border-default-200 bg-white text-default-600 transition-colors hover:border-default-400 hover:text-default-900 disabled:cursor-not-allowed disabled:opacity-40';

/**
 * Editor galeri foto: daftar foto (thumbnail | teks alternatif + keterangan | urutkan/ganti/hapus),
 * unggah beberapa foto sekaligus. Urutan daftar = urutan tampil di website.
 */
export function GalleryUploadField({ value, websiteId, onChange }: GalleryUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceIndexRef = useRef<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const images = galleryImagesFrom(value);

  const validate = (file: File): string | null => {
    if (!file.type.startsWith('image/')) return `"${file.name}" bukan file gambar.`;
    if (file.size > MAX_IMAGE_SIZE) return `"${file.name}" melebihi batas ukuran 5 MB.`;
    return null;
  };

  const upload = async (files: FileList) => {
    const nextImages = [...images];
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const invalid = validate(file);
        if (invalid) {
          setError(`${invalid} Foto lain tetap diunggah.`);
          continue;
        }
        try {
          const result = await uploadAsset(file, websiteId, 'content');
          nextImages.push({ url: result.url, alt: '' });
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : `Gagal mengunggah "${file.name}".`);
          break;
        }
      }
      onChange(nextImages);
    } finally {
      setUploading(false);
    }
  };

  const replace = async (index: number, file: File) => {
    const invalid = validate(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const result = await uploadAsset(file, websiteId, 'content');
      onChange(images.map((item, imageIndex) => (imageIndex === index ? { ...item, url: result.url } : item)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Gagal mengunggah "${file.name}".`);
    } finally {
      setUploading(false);
    }
  };

  const update = (index: number, patch: Partial<SectionImage>) =>
    onChange(images.map((item, imageIndex) => (imageIndex === index ? { ...item, ...patch } : item)));

  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {images.length > 0 ? (
        <ol className="flex flex-col gap-2">
          {images.map((image, index) => {
            const label = image.alt?.trim() || image.caption?.trim() || `Foto ${index + 1}`;
            return (
              <li
                key={`${image.url}-${index}`}
                className="flex flex-col gap-2.5 rounded-xl border border-default-200 bg-white p-2.5"
              >
                <div className="flex gap-3">
                  <GalleryThumb key={image.url} url={image.url} alt={image.alt ?? ''} />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Input
                      size="sm"
                      label="Teks alternatif"
                      placeholder="Deskripsi singkat foto"
                      value={image.alt ?? ''}
                      isDisabled={uploading}
                      onValueChange={(alt) => update(index, { alt })}
                    />
                    <Input
                      size="sm"
                      label="Keterangan"
                      placeholder="Opsional, tampil di atas foto"
                      value={image.caption ?? ''}
                      isDisabled={uploading}
                      onValueChange={(caption) => update(index, caption ? { caption } : { caption: undefined })}
                    />
                  </div>
                </div>
                {/* Aksi dalam satu baris di bawah: urutkan di kiri, ganti & hapus di kanan. */}
                <div className="flex items-center gap-1 border-t border-default-100 pt-2">
                  <button
                    type="button"
                    className={iconButtonClass}
                    disabled={uploading || index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`Naikkan ${label}`}
                    title="Naikkan"
                  >
                    <Icon name="arrowUp" size={14} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    className={iconButtonClass}
                    disabled={uploading || index === images.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Turunkan ${label}`}
                    title="Turunkan"
                  >
                    <Icon name="arrowDown" size={14} strokeWidth={1.5} />
                  </button>
                  <span className="ml-1 text-xs text-default-400">#{index + 1}</span>
                  <button
                    type="button"
                    className={`${iconButtonClass} ml-auto`}
                    disabled={uploading || !websiteId}
                    onClick={() => {
                      replaceIndexRef.current = index;
                      replaceInputRef.current?.click();
                    }}
                    aria-label={`Ganti ${label}`}
                    title="Ganti foto"
                  >
                    <Icon name="refresh" size={14} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    className={`${iconButtonClass} hover:border-danger hover:text-danger`}
                    disabled={uploading}
                    onClick={() => onChange(images.filter((_, imageIndex) => imageIndex !== index))}
                    aria-label={`Hapus ${label}`}
                    title="Hapus foto"
                  >
                    <Icon name="trash" size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="rounded-xl border border-dashed border-default-300 px-3 py-4 text-center text-xs text-default-500">
          Belum ada foto. Unggah satu atau beberapa foto sekaligus.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="bordered"
          radius="sm"
          size="sm"
          startContent={uploading ? undefined : <Icon name="plus" size={14} strokeWidth={1.5} />}
          isDisabled={uploading || !websiteId}
          onPress={() => inputRef.current?.click()}
        >
          {uploading ? <Spinner size="sm" /> : 'Tambah foto'}
        </Button>
        <span className="text-xs text-default-500">
          {images.length ? `${images.length} foto · ` : ''}JPG, PNG, WebP, atau GIF · maks. 5 MB per foto
        </span>
      </div>
      {!websiteId && <p className="text-xs text-danger">Website aktif tidak ditemukan; foto tidak dapat diunggah.</p>}
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        disabled={uploading || !websiteId}
        onChange={(event) => {
          const files = event.currentTarget.files;
          if (files?.length) void upload(files);
          event.currentTarget.value = '';
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        disabled={uploading || !websiteId}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          const index = replaceIndexRef.current;
          replaceIndexRef.current = null;
          if (file && index !== null) void replace(index, file);
          event.currentTarget.value = '';
        }}
      />
    </div>
  );
}
