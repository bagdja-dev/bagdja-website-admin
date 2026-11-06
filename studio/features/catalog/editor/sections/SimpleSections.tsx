'use client';

import { StatusSwitch } from '@/studio/ui/primitives/StatusSwitch';

import type { SectionProps } from '../editor-context';
import { HINT, IntField, TextAreaField } from '../fields';

/** Switch "Perlu dikirim kurir" di kepala bagian Pengiriman. */
export function ShippingAside({ form, set, canEdit }: SectionProps) {
  return (
    <StatusSwitch isSelected={form.requiresShipping} onChange={(requiresShipping) => set({ requiresShipping })} ariaLabel="Perlu dikirim kurir" isDisabled={!canEdit} />
  );
}

/** Bagian "Pengiriman": requires_shipping, weight_grams, dimensi. */
export function ShippingSection({ form, set, errors }: SectionProps) {
  if (!form.requiresShipping) {
    return <span className={HINT}>Tidak dikirim kurir — pelanggan tidak dikenai ongkir untuk item ini.</span>;
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <IntField label="Berat (gram)" placeholder="250" value={form.weightGrams} onChange={(weightGrams) => set({ weightGrams })} error={errors.weightGrams} />
        <IntField label="Panjang (cm)" placeholder="30" value={form.lengthCm} onChange={(lengthCm) => set({ lengthCm })} error={errors.lengthCm} />
        <IntField label="Lebar (cm)" placeholder="30" value={form.widthCm} onChange={(widthCm) => set({ widthCm })} error={errors.widthCm} />
        <IntField label="Tinggi (cm)" placeholder="5" value={form.heightCm} onChange={(heightCm) => set({ heightCm })} error={errors.heightCm} />
      </div>
      <span className={HINT}>Untuk menghitung ongkir. Kosongkan untuk memakai ukuran standar (250 gram, 30×30×5 cm).</span>
    </>
  );
}

const QUICK_DURATIONS = ['15', '30', '45', '60'];

/** Bagian "Durasi": metadata.duration_minutes (pilihan cepat 15/30/45/60). */
export function DurationSection({ form, set, errors }: SectionProps) {
  const custom = form.durationMinutes !== '' && !QUICK_DURATIONS.includes(form.durationMinutes);
  const chip = (on: boolean) =>
    `min-h-10 rounded-full border px-3.5 text-[13px] ${on ? 'border-primary-200 bg-primary-50 font-bold text-primary' : 'border-default-200 bg-white font-medium text-default-700'}`;
  return (
    <>
      <div role="group" aria-label="Durasi cepat" className="flex flex-wrap gap-2">
        {QUICK_DURATIONS.map((m) => (
          <button key={m} type="button" aria-pressed={form.durationMinutes === m} onClick={() => set({ durationMinutes: m })} className={chip(form.durationMinutes === m)}>
            {m} menit
          </button>
        ))}
        <button type="button" aria-pressed={custom} onClick={() => set({ durationMinutes: custom ? form.durationMinutes : '90' })} className={chip(custom)}>
          Lainnya…
        </button>
      </div>
      {custom && <IntField label="Durasi (menit)" value={form.durationMinutes} onChange={(durationMinutes) => set({ durationMinutes })} error={errors.durationMinutes} suffix="menit" />}
      <span className={HINT}>Ditampilkan ke pelanggan sebagai perkiraan lama pengerjaan.</span>
    </>
  );
}

/** Bagian "Isi paket": metadata.items_included (teks bebas, D11). */
export function PackageSection({ form, set }: SectionProps) {
  return (
    <TextAreaField
      label="Item yang termasuk"
      rows={4}
      value={form.itemsIncluded}
      onChange={(itemsIncluded) => set({ itemsIncluded })}
      hint="Satu baris per isi, mis. Haircut Klasik, Cukur Jenggot, Hair Spa."
    />
  );
}
