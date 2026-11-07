import type { StepFormField } from '@/studio/api/order-detail';

import { normalizeMedia } from './step-form';

/** Isian langkah yang sudah dikirim (foto/video/PDF/lokasi/teks), dipakai di timeline. */
export function StepFieldValues({ schema, data }: { schema: StepFormField[] | null; data: Record<string, unknown> | null }) {
  if (!data) return null;
  const fields = (schema ?? []).filter((f) => data[f.key] != null && data[f.key] !== '');
  if (fields.length === 0) return null;
  return (
    <dl className="flex flex-col gap-2 text-[13px] text-default-600">
      {fields.map((field) => (
        <div key={field.key} className="flex flex-col gap-1">
          <dt className="text-xs font-semibold text-default-500">{field.label}</dt>
          <dd className="m-0">
            <StepFieldValue field={field} value={data[field.key]} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function StepFieldValue({ field, value }: { field: StepFormField; value: unknown }) {
  const items = normalizeMedia(value);
  if (field.type === 'foto') {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <a key={`${item.url}-${i}`} href={item.url} target="_blank" rel="noreferrer" title={item.description || undefined} className="block h-14 w-14 overflow-hidden rounded-lg border border-default-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt={item.description || `${field.label} ${i + 1}`} className="h-full w-full object-cover" />
          </a>
        ))}
      </div>
    );
  }
  if (field.type === 'video') {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <video key={`${item.url}-${i}`} src={item.url} controls className="h-24 max-w-full rounded-lg border border-default-200 bg-black" />
        ))}
      </div>
    );
  }
  if (field.type === 'pdf') {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <a key={`${item.url}-${i}`} href={item.url} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center rounded-lg border border-default-200 px-2.5 text-xs font-semibold">
            PDF {i + 1}{item.description ? ` · ${item.description}` : ''}
          </a>
        ))}
      </div>
    );
  }
  const text = typeof value === 'string' || typeof value === 'number' ? String(value) : items[0]?.url ?? '';
  if (field.type === 'lokasi') {
    return (
      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
        {text} · Buka peta
      </a>
    );
  }
  return <span className="whitespace-pre-wrap text-foreground">{text}</span>;
}
