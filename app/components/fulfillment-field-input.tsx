'use client';

import { useRef, useState } from 'react';

import type { FulfillmentStepFormField } from '../lib/types';
import { FormInput, FormTextarea } from './form-field';
import { uploadAsset } from '../lib/upload-asset';

interface FulfillmentFieldInputProps {
  field: FulfillmentStepFormField;
  value: unknown;
  onChange: (value: unknown) => void;
  websiteId?: string;
}

interface MediaValue {
  url: string;
  description: string;
}

function normalizeMediaValues(value: unknown): MediaValue[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === 'string' && item) return [{ url: item, description: '' }];
      if (item && typeof item === 'object' && 'url' in item && typeof item.url === 'string') {
        return [{ url: item.url, description: typeof item.description === 'string' ? item.description : '' }];
      }
      return [];
    });
  }
  return typeof value === 'string' && value ? [{ url: value, description: '' }] : [];
}

export function FulfillmentFieldInput({ field, value, onChange, websiteId }: FulfillmentFieldInputProps) {
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaValues = normalizeMediaValues(value);
  const maxFiles = Math.max(1, field.max_files ?? 5);
  const textValue = typeof value === 'string' ? value : '';

  const mediaConfig = {
    pdf: { accept: 'application/pdf', maxBytes: 20 * 1024 * 1024, label: 'PDF', folder: 'fulfillment' },
    foto: { accept: 'image/jpeg,image/png,image/webp', maxBytes: 10 * 1024 * 1024, label: 'foto', folder: 'fulfillment' },
    video: { accept: 'video/mp4,video/webm,video/quicktime', maxBytes: 100 * 1024 * 1024, label: 'video', folder: 'fulfillment' },
  } as const;

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Browser tidak mendukung lokasi perangkat.');
      return;
    }
    setLocationBusy(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange(`${position.coords.latitude}, ${position.coords.longitude}`);
        setLocationBusy(false);
      },
      () => {
        setLocationError('Lokasi tidak dapat diambil. Izinkan akses lokasi lalu coba lagi.');
        setLocationBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const media = field.type === 'pdf' || field.type === 'foto' || field.type === 'video'
    ? mediaConfig[field.type]
    : null;

  const uploadMedia = async (files: FileList | null) => {
    if (!files || !media || !websiteId) return;
    const selectedFiles = Array.from(files).slice(0, maxFiles - mediaValues.length);
    if (selectedFiles.length === 0) return;
    setUploadError('');
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of selectedFiles) {
        if (file.size > media.maxBytes) throw new Error(`Ukuran ${media.label} terlalu besar.`);
        const result = await uploadAsset(file, websiteId, media.folder);
        uploaded.push(result.url);
      }
      onChange([...mediaValues, ...uploaded.map((url) => ({ url, description: '' }))]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : `Gagal mengunggah ${media.label}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  if (field.type === 'textarea') {
    return <FormTextarea label={field.label} required={field.required} value={textValue} onChange={onChange} rows={3} />;
  }

  if (field.type === 'lokasi') {
    return (
      <div className="flex flex-col gap-1.5">
        <FormInput label={field.label} required={field.required} value={textValue} onChange={onChange} placeholder="Latitude, longitude" />
        <button
          type="button"
          onClick={captureLocation}
          disabled={locationBusy}
          className="self-start rounded-lg border border-default-300 px-3 py-1.5 text-xs font-medium text-default-600 hover:bg-default-50 disabled:opacity-60"
        >
          {locationBusy ? 'Mengambil lokasi...' : 'Gunakan lokasi saya'}
        </button>
        {locationError && <p className="text-xs text-danger">{locationError}</p>}
      </div>
    );
  }

  if (field.type === 'pdf' || field.type === 'foto' || field.type === 'video') {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">{field.label}{field.required && <span className="ml-0.5 text-danger">*</span>}</span>
        <input ref={inputRef} type="file" accept={media?.accept} multiple className="hidden" disabled={uploading || !websiteId || mediaValues.length >= maxFiles} onChange={(event) => void uploadMedia(event.target.files)} />
        {mediaValues.length > 0 && <div className="flex flex-col gap-2">{mediaValues.map((item, index) => <div key={`${item.url}-${index}`} className="flex items-center gap-3 rounded-lg border border-default-200 bg-default-50 p-2">
          {field.type === 'foto' ? <img src={item.url} alt={`${field.label} ${index + 1}`} className="h-16 w-16 shrink-0 rounded-md object-cover" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-default-200 text-xs font-semibold uppercase">{media?.label}</div>}
          <div className="min-w-0 flex-1">
            <a href={item.url} target="_blank" rel="noreferrer" className="block truncate text-xs font-medium text-primary underline">Buka {media?.label} {index + 1}</a>
            <input type="text" value={item.description} placeholder="Deskripsi file" onChange={(event) => onChange(mediaValues.map((current, itemIndex) => itemIndex === index ? { ...current, description: event.target.value } : current))} className="mt-1 w-full rounded-md border border-default-300 px-2 py-1 text-xs" />
            <p className="mt-1 text-xs text-default-500">File {index + 1} dari {maxFiles}</p>
          </div>
          <button type="button" onClick={() => onChange(mediaValues.filter((_, itemIndex) => itemIndex !== index))} className="shrink-0 rounded-lg px-2 py-1 text-xs text-danger hover:bg-danger-50">Hapus</button>
        </div>)}</div>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={uploading || !websiteId} onClick={() => inputRef.current?.click()} className="rounded-lg border border-default-300 px-3 py-2 text-xs font-medium hover:bg-default-50 disabled:opacity-60">
            {uploading ? 'Mengunggah...' : mediaValues.length >= maxFiles ? 'Batas file tercapai' : `Pilih ${media?.label}`}
          </button>
          <span className="text-xs text-default-500">{mediaValues.length}/{maxFiles} file</span>
        </div>
        {uploadError && <p className="text-xs text-danger">{uploadError}</p>}
      </div>
    );
  }

  if (field.type === 'number') {
    return <FormInput label={field.label} required={field.required} value={textValue} onChange={onChange} inputMode="decimal" />;
  }

  if (field.type === 'select') {
    return (
      <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
        {field.label}{field.required && <span className="ml-0.5 text-danger">*</span>}
        <select value={textValue} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-default-300 bg-white px-3.5 py-2.5 text-sm">
          <option value="">Pilih...</option>
          {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    );
  }

  return <FormInput label={field.label} required={field.required} value={textValue} onChange={onChange} />;
}