'use client';

import type { FulfillmentStepFormField } from '../lib/types';

export function FulfillmentFieldValue({
  field,
  value,
}: {
  field: FulfillmentStepFormField;
  value: unknown;
}) {
  const text = String(value);
  if (!text) return null;

  if (field.type === 'foto') {
    return (
      <a href={text} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-default-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={text} alt={field.label} className="max-h-48 w-full object-cover" />
      </a>
    );
  }

  if (field.type === 'video') {
    return <video src={text} controls className="max-h-56 w-full rounded-lg border border-default-200 bg-black" />;
  }

  if (field.type === 'pdf') {
    return (
      <a href={text} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 font-medium text-danger-700 hover:bg-danger-100">
        <span aria-hidden="true">PDF</span>
        <span className="max-w-xs truncate">Buka dokumen</span>
      </a>
    );
  }

  if (field.type === 'lokasi') {
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
    return <a href={mapUrl} target="_blank" rel="noreferrer" className="text-primary underline">{text} · Buka peta</a>;
  }

  return <span className="whitespace-pre-wrap">{text}</span>;
}
