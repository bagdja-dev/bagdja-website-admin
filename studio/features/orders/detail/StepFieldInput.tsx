'use client';

import { Input, Textarea } from '@heroui/react';
import { useRef, useState } from 'react';

import type { StepFormField } from '@/studio/api/order-detail';
import { uploadAsset } from '@/studio/lib/upload-asset';

import { MEDIA_CONFIG, normalizeMedia, type MediaValue } from './step-form';

interface StepFieldInputProps {
  field: StepFormField;
  value: unknown;
  onChange: (value: unknown) => void;
  websiteId: string;
  disabled?: boolean;
}

const LABEL = 'text-[13px] font-bold text-foreground';
const SMALL_BTN =
  'inline-flex min-h-9 items-center rounded-[10px] border border-default-300 bg-white px-3 text-xs font-semibold text-foreground hover:bg-default-50 disabled:opacity-60';

function FieldLabel({ field, htmlFor }: { field: StepFormField; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className={LABEL}>
      {field.label}
      {field.required ? <span className="ml-0.5 text-[#B91C1C]">*</span> : <span className="ml-1 font-medium text-default-500">(opsional)</span>}
    </label>
  );
}

/** Field `form_schema` langkah (salinan rapi `FulfillmentFieldInput` lama, tanpa impor kode lama). */
export function StepFieldInput({ field, value, onChange, websiteId, disabled }: StepFieldInputProps) {
  const text = typeof value === 'string' ? value : '';
  const id = `step-field-${field.key}`;

  if (field.type === 'foto' || field.type === 'video' || field.type === 'pdf') {
    return <MediaField field={field} value={value} onChange={onChange} websiteId={websiteId} disabled={disabled} />;
  }
  if (field.type === 'lokasi') {
    return <LocationField field={field} value={text} onChange={onChange} disabled={disabled} />;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel field={field} htmlFor={id} />
      {field.type === 'textarea' ? (
        <Textarea id={id} minRows={2} value={text} onValueChange={onChange} isDisabled={disabled} />
      ) : field.type === 'select' ? (
        <select
          id={id}
          value={text}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-10 w-full rounded-[10px] border border-default-300 bg-white px-3 text-sm"
        >
          <option value="">Pilih…</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <Input id={id} value={text} onValueChange={onChange} isDisabled={disabled} inputMode={field.type === 'number' ? 'decimal' : undefined} />
      )}
    </div>
  );
}

function LocationField({ field, value, onChange, disabled }: { field: StepFormField; value: string; onChange: (v: unknown) => void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const capture = (): void => {
    if (!navigator.geolocation) {
      setError('Browser tidak mendukung lokasi perangkat.');
      return;
    }
    setBusy(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(`${pos.coords.latitude}, ${pos.coords.longitude}`);
        setBusy(false);
      },
      () => {
        setError('Lokasi tidak dapat diambil. Izinkan akses lokasi lalu coba lagi.');
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel field={field} htmlFor={`step-field-${field.key}`} />
      <Input id={`step-field-${field.key}`} value={value} onValueChange={onChange} placeholder="Latitude, longitude" isDisabled={disabled} />
      <button type="button" onClick={capture} disabled={busy || disabled} className={`${SMALL_BTN} self-start`}>
        {busy ? 'Mengambil lokasi…' : 'Gunakan lokasi saya'}
      </button>
      {error && <p role="alert" className="text-xs text-[#B91C1C]">{error}</p>}
    </div>
  );
}

function MediaField({ field, value, onChange, websiteId, disabled }: StepFieldInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const media = MEDIA_CONFIG[field.type as keyof typeof MEDIA_CONFIG];
  const items = normalizeMedia(value);
  const maxFiles = Math.max(1, field.max_files ?? 5);
  const full = items.length >= maxFiles;

  const upload = async (files: FileList | null): Promise<void> => {
    if (!files) return;
    const picked = Array.from(files).slice(0, maxFiles - items.length);
    if (picked.length === 0) return;
    setError('');
    setUploading(true);
    try {
      const uploaded: MediaValue[] = [];
      for (const file of picked) {
        if (file.size > media.maxBytes) throw new Error(`Ukuran ${media.label} maksimal ${media.maxBytes / 1024 / 1024} MB.`);
        const result = await uploadAsset(file, websiteId, 'fulfillment');
        uploaded.push({ url: result.url, description: '' });
      }
      onChange([...items, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Gagal mengunggah ${media.label}.`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const update = (index: number, patch: Partial<MediaValue> | null): void => {
    onChange(patch === null ? items.filter((_, i) => i !== index) : items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel field={field} />
      <input ref={inputRef} type="file" accept={media.accept} multiple className="hidden" onChange={(e) => void upload(e.target.files)} />
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <div key={`${item.url}-${index}`} className="flex w-full flex-col gap-1.5 rounded-[10px] border border-default-200 p-2 sm:w-[220px]">
            <div className="flex items-center gap-2">
              {field.type === 'foto' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={`${field.label} ${index + 1}`} className="h-[72px] w-[72px] shrink-0 rounded-[10px] object-cover" />
              ) : (
                <a href={item.url} target="_blank" rel="noreferrer" className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[10px] bg-default-100 text-xs font-bold uppercase text-default-700 no-underline">
                  {media.label}
                </a>
              )}
              <button type="button" disabled={disabled} onClick={() => update(index, null)} className="ml-auto rounded-lg px-2 py-1 text-xs font-semibold text-[#B91C1C] hover:bg-danger-50">
                Hapus
              </button>
            </div>
            <input
              type="text"
              value={item.description}
              placeholder="Keterangan (opsional)"
              disabled={disabled}
              onChange={(e) => update(index, { description: e.target.value })}
              className="w-full rounded-lg border border-default-300 px-2 py-1.5 text-xs"
            />
          </div>
        ))}
        {!full && (
          <button
            type="button"
            aria-label={`Tambah ${media.label}`}
            disabled={uploading || disabled}
            onClick={() => inputRef.current?.click()}
            className="flex h-[72px] w-[72px] items-center justify-center rounded-[10px] border-[1.5px] border-dashed border-default-400 bg-default-50 text-[22px] text-default-500 hover:bg-default-100 disabled:opacity-60"
          >
            {uploading ? '…' : '+'}
          </button>
        )}
      </div>
      <p className="text-xs text-default-500">
        {full ? 'Batas file tercapai' : `${items.length}/${maxFiles} file`} · {media.hint}
      </p>
      {error && <p role="alert" className="text-xs text-[#B91C1C]">{error}</p>}
    </div>
  );
}
