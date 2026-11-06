'use client';

import { StatusSwitch } from '@/studio/ui/primitives/StatusSwitch';

import type { SectionProps } from '../editor-context';
import type { DurationUnit } from '../form-state';
import { Field, HINT, INPUT, IntField, TextAreaField } from '../fields';

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

/** Bagian "Durasi": nilai numerik dan satuan; disimpan sebagai menit di metadata. */
export function DurationSection({ form, set, errors }: SectionProps) {
  const durationUnitOptions: { value: DurationUnit; label: string }[] = [
    { value: 'minutes', label: 'Menit' },
    { value: 'hours', label: 'Jam' },
    { value: 'days', label: 'Hari' },
  ];
  return (
    <>
      <Field label="Durasi" error={errors.durationValue}>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
          <input
            type="text"
            inputMode="numeric"
            aria-label="Jumlah durasi"
            placeholder="10"
            value={form.durationValue}
            onChange={(event) => set({ durationValue: event.target.value.replace(/[^\d]/g, '') })}
            aria-invalid={Boolean(errors.durationValue) || undefined}
            className={INPUT}
          />
          <select
            aria-label="Satuan durasi"
            value={form.durationUnit}
            onChange={(event) => set({ durationUnit: event.target.value as DurationUnit })}
            className={INPUT}
          >
            {durationUnitOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </Field>
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
