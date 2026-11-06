'use client';

import { StatusSwitch } from '@/studio/ui/primitives/StatusSwitch';
import { Icon } from '@/studio/ui/icons';

import { typeMeta } from '../catalog-types';
import { moneyValue } from '../money';
import { formatPriceRange, formatRupiah } from '../product-utils';
import type { CompletenessCheck } from './completeness';
import type { ProductForm } from './form-state';

const CAPTION = 'text-xs font-bold uppercase tracking-[0.06em] text-default-600';

function previewMeta(form: ProductForm, byVariant: boolean): string {
  if (form.type === 'product') return byVariant ? `${form.variants.length} pilihan varian` : form.stock ? `Stok ${form.stock}` : 'Produk fisik';
  if (form.type === 'service') return form.durationMinutes ? `${form.durationMinutes} menit` : 'Layanan';
  if (form.type === 'gathering') return form.maxAttendees ? `Maks ${form.maxAttendees} peserta` : 'Acara';
  if (form.type === 'digital') return 'Dikirim otomatis setelah bayar';
  return typeMeta(form.type).label;
}

/** Panel kanan: pratinjau kartu website + toggle tampil + daftar kelengkapan. */
export function PreviewPanel({ form, byVariant, checks, onToggleActive, canEdit }: { form: ProductForm; byVariant: boolean; checks: CompletenessCheck[]; onToggleActive: (v: boolean) => void; canEdit: boolean }) {
  const cover = form.images[0]?.url;
  const price = byVariant ? formatPriceRange(form.variants.map((v) => moneyValue(v.price) ?? 0)) : formatRupiah(moneyValue(form.price) ?? 0);
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-3 rounded-2xl border border-default-200 bg-white p-4">
        <span className={CAPTION}>Tampil di website</span>
        <div className="overflow-hidden rounded-xl border border-default-200 bg-white">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL storage tenant
            <img src={cover} alt="" className="h-[150px] w-full object-cover" />
          ) : (
            <span className="flex h-[150px] items-center justify-center bg-default-100 text-default-500">
              <Icon name="image" size={28} />
            </span>
          )}
          <div className="flex flex-col gap-1 p-3">
            <span className="truncate text-sm font-bold">{form.name || 'Item baru'}</span>
            <span className="text-[13px] font-bold text-primary">{form.quotable && !byVariant ? `Mulai ${price}` : price}</span>
            <span className="text-[11px] text-default-600">{previewMeta(form, byVariant)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2.5">
          <span className="text-sm font-bold">Tampilkan di website</span>
          <StatusSwitch isSelected={form.isActive} onChange={onToggleActive} ariaLabel="Tampilkan di website" isDisabled={!canEdit} />
        </div>
      </div>
      <div className="flex flex-col gap-2 rounded-2xl border border-default-200 bg-white p-4">
        <span className={CAPTION}>Kelengkapan</span>
        <ul className="flex flex-col gap-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-[13px]">
              <span
                aria-hidden="true"
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                  c.ok ? 'bg-[#DCFCE7] text-[#15803D]' : c.optional ? 'bg-default-100 text-default-500' : 'bg-[#FEF3C7] text-[#92400E]'
                }`}
              >
                {c.ok ? '✓' : c.optional ? '–' : '!'}
              </span>
              <span>
                {c.label}
                {c.optional ? ' (opsional)' : ''}
                <span className="sr-only">{c.ok ? ': sudah' : ': belum'}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
