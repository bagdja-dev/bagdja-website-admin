'use client';

import { useRef, useState } from 'react';

import type { FulfillmentStepFormField } from '../lib/types';
import { FormInput, FormTextarea } from './form-field';
import { uploadAsset } from '../lib/upload-asset';

interface FulfillmentFieldInputProps {
  field: FulfillmentStepFormField;
  value: string;
  onChange: (value: string) => void;
  websiteId?: string;
}

export function FulfillmentFieldInput({ field, value, onChange, websiteId }: FulfillmentFieldInputProps) {
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  const uploadMedia = async (file: File | null) => {
    if (!file || !media || !websiteId) return;
    setUploadError('');
    if (file.size > media.maxBytes) {
      setUploadError(`Ukuran ${media.label} terlalu besar.`);
      return;
    }
    setUploading(true);
    try {
      const result = await uploadAsset(file, websiteId, media.folder);
      onChange(result.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : `Gagal mengunggah ${media.label}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  if (field.type === 'textarea') {
    return <FormTextarea label={field.label} required={field.required} value={value} onChange={onChange} rows={3} />;
  }

  if (field.type === 'lokasi') {
    return (
      <div className="flex flex-col gap-1.5">
        <FormInput label={field.label} required={field.required} value={value} onChange={onChange} placeholder="Latitude, longitude" />
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
        <input ref={inputRef} type="file" accept={media?.accept} className="hidden" disabled={uploading || !websiteId} onChange={(event) => void uploadMedia(event.target.files?.[0] ?? null)} />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={uploading || !websiteId} onClick={() => inputRef.current?.click()} className="rounded-lg border border-default-300 px-3 py-2 text-xs font-medium hover:bg-default-50 disabled:opacity-60">
            {uploading ? 'Mengunggah...' : value ? 'Ganti file' : `Pilih ${media?.label}`}
          </button>
          {value && !uploading && <button type="button" onClick={() => onChange('')} className="rounded-lg px-3 py-2 text-xs font-medium text-danger hover:bg-danger-50">Hapus</button>}
        </div>
        {value && <a href={value} target="_blank" rel="noreferrer" className="truncate text-xs text-primary underline">Buka file tersimpan</a>}
        {uploadError && <p className="text-xs text-danger">{uploadError}</p>}
      </div>
    );
  }

  if (field.type === 'number') {
    return <FormInput label={field.label} required={field.required} value={value} onChange={onChange} inputMode="decimal" />;
  }

  if (field.type === 'select') {
    return (
      <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
        {field.label}{field.required && <span className="ml-0.5 text-danger">*</span>}
        <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-default-300 bg-white px-3.5 py-2.5 text-sm">
          <option value="">Pilih...</option>
          {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    );
  }

  return <FormInput label={field.label} required={field.required} value={value} onChange={onChange} />;
}