import type { StepFormField } from '@/studio/api/order-detail';

export interface MediaValue {
  url: string;
  description: string;
}

export const MEDIA_CONFIG = {
  foto: { accept: 'image/jpeg,image/png,image/webp', maxBytes: 10 * 1024 * 1024, label: 'foto', hint: 'JPG/PNG/WebP ≤ 10 MB' },
  video: { accept: 'video/mp4,video/webm,video/quicktime', maxBytes: 100 * 1024 * 1024, label: 'video', hint: 'MP4/WebM/MOV ≤ 100 MB' },
  pdf: { accept: 'application/pdf', maxBytes: 20 * 1024 * 1024, label: 'PDF', hint: 'PDF ≤ 20 MB' },
} as const;

export function normalizeMedia(value: unknown): MediaValue[] {
  if (Array.isArray(value)) {
    return value.flatMap((item): MediaValue[] => {
      if (typeof item === 'string' && item) return [{ url: item, description: '' }];
      if (item && typeof item === 'object' && 'url' in item && typeof item.url === 'string') {
        const description = 'description' in item && typeof item.description === 'string' ? item.description : '';
        return [{ url: item.url, description }];
      }
      return [];
    });
  }
  return typeof value === 'string' && value ? [{ url: value, description: '' }] : [];
}

function isFilled(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim() !== '';
  return value != null;
}

/** Nilai awal form: draft/isian tersimpan (`formData`) bila ada. */
export function initialFormValues(schema: StepFormField[] | null, saved: Record<string, unknown> | null): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of schema ?? []) values[field.key] = saved?.[field.key] ?? '';
  return values;
}

/** Pesan error pertama (field wajib kosong / angka tidak valid), atau null. */
export function validateForm(schema: StepFormField[] | null, values: Record<string, unknown>): string | null {
  for (const field of schema ?? []) {
    const value = values[field.key];
    if (field.required && !isFilled(value)) return `"${field.label}" wajib diisi.`;
    if (field.type === 'number' && typeof value === 'string' && value.trim() && !Number.isFinite(Number(value.replace(',', '.')))) {
      return `"${field.label}" harus berupa angka.`;
    }
  }
  return null;
}

/** Payload `form_data`: buang yang kosong, trim teks. `undefined` bila tidak ada isi. */
export function buildFormData(schema: StepFormField[] | null, values: Record<string, unknown>): Record<string, unknown> | undefined {
  const data: Record<string, unknown> = {};
  for (const field of schema ?? []) {
    const value = values[field.key];
    if (!isFilled(value)) continue;
    data[field.key] = typeof value === 'string' ? value.trim() : value;
  }
  return Object.keys(data).length > 0 ? data : undefined;
}
