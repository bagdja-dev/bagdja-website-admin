'use client';

import Link from 'next/link';
import { useId } from 'react';

import type { SectionProps } from '../editor-context';
import { Field, INPUT, IntField } from '../fields';

/** Bagian "Setelah dipesan": fulfillment_flow_id, final_release_guaranty_days, location_ids. */
export function FulfilSection({ form, set, errors, lookups, hasModule }: SectionProps) {
  const flowId = useId();
  const flows = lookups.flows.filter((f) => f.is_active || f.id === form.flowId);
  const toggleLocation = (id: string) =>
    set({ locationIds: form.locationIds.includes(id) ? form.locationIds.filter((x) => x !== id) : [...form.locationIds, id] });
  const showLocations = lookups.locations.length > 0 || form.locationIds.length > 0;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Alur pengerjaan"
          htmlFor={flowId}
          hint={
            <>
              Langkah yang bisa dipantau pelanggan setelah memesan.
              {hasModule('fulfillment') && (
                <>
                  {' '}<Link href="/studio/flows">Kelola di Master Flow</Link>
                </>
              )}
            </>
          }
        >
          <select id={flowId} value={form.flowId} onChange={(e) => set({ flowId: e.target.value })} className={INPUT}>
            <option value="">Tanpa alur</option>
            {flows.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
                {f.is_active ? '' : ' (nonaktif)'}
              </option>
            ))}
          </select>
        </Field>
        <IntField
          label="Batas konfirmasi pelanggan"
          suffix="hari"
          value={form.guarantyDays}
          onChange={(guarantyDays) => set({ guarantyDays })}
          error={errors.guarantyDays}
          hint="Jika pelanggan tidak mengonfirmasi pesanan diterima dalam batas ini, kamu boleh menyelesaikan pesanan dan dana cair ke saldo. Kosongkan bila tidak ingin memakai opsi ini — pesanan berisi item ini lalu tidak bisa diselesaikan sepihak."
        />
      </div>
      {showLocations && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-bold">Tersedia di lokasi</span>
          <div className="flex flex-wrap gap-2">
            {lookups.locations.map((loc) => {
              const on = form.locationIds.includes(loc.id);
              return (
                <button
                  key={loc.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleLocation(loc.id)}
                  className={`min-h-10 rounded-full border px-3.5 text-[13px] ${on ? 'border-primary-200 bg-primary-50 font-bold text-primary' : 'border-default-200 bg-white text-default-700'}`}
                >
                  {on ? '✓ ' : ''}
                  {loc.name}
                </button>
              );
            })}
          </div>
          <span className="text-xs text-default-600">Kosongkan semua bila item tersedia di seluruh lokasi.</span>
        </div>
      )}
    </>
  );
}
