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

export function GalleryUploadField({ value, websiteId, onChange }: GalleryUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const images = galleryImagesFrom(value);

  const upload = async (files: FileList) => {
    const nextImages = [...images];
    setError(null);
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          setError(`"${file.name}" bukan file gambar; file gambar lain tetap diunggah.`);
          continue;
        }
        if (file.size > MAX_IMAGE_SIZE) {
          setError(`"${file.name}" melebihi batas ukuran 5 MB; file gambar lain tetap diunggah.`);
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

  return (
    <div className="flex flex-col gap-3">
      {images.length > 0 && (
        <div className="space-y-3">
          {images.map((image, index) => (
            <div key={`${image.url}-${index}`} className="rounded-xl border border-default-200 p-3">
              <div className="relative mb-3 overflow-hidden rounded-lg bg-default-50">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL gambar dari storage service */}
                <img src={image.url} alt={image.alt ?? ''} className="max-h-44 w-full object-contain" />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => onChange(images.filter((_, imageIndex) => imageIndex !== index))}
                  className="absolute right-2 top-2 rounded-full bg-white p-2 text-default-600 shadow hover:text-danger disabled:opacity-50"
                  aria-label={`Hapus gambar cadangan ${index + 1}`}
                  title={`Hapus gambar cadangan ${index + 1}`}
                >
                  <Icon name="trash" size={14} strokeWidth={1.5} />
                </button>
              </div>
              <Input
                size="sm"
                label="Teks alternatif"
                placeholder="Deskripsi singkat gambar"
                value={image.alt ?? ''}
                isDisabled={uploading}
                onValueChange={(alt) =>
                  onChange(images.map((item, imageIndex) => (imageIndex === index ? { ...item, alt } : item)))
                }
              />
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="bordered"
          radius="sm"
          size="sm"
          isDisabled={uploading || !websiteId}
          onPress={() => inputRef.current?.click()}
        >
          {uploading ? <Spinner size="sm" /> : images.length > 0 ? 'Tambah gambar cadangan' : 'Unggah gambar cadangan'}
        </Button>
        <span className="text-xs text-default-500">JPG, PNG, WebP, atau GIF · maks. 5 MB per gambar</span>
      </div>
      {!websiteId && <p className="text-xs text-danger">Website aktif tidak ditemukan; gambar tidak dapat diunggah.</p>}
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
    </div>
  );
}
