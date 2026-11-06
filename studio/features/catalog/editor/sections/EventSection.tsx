'use client';

import { Icon } from '@/studio/ui/icons';

import type { SectionProps } from '../editor-context';
import { ADD_BTN, ICON_BTN, INPUT, IntField, MoneyField, Notice, TextAreaField, TextField } from '../fields';
import { emptyOption, type GatheringOptionDraft, type PenaltyType } from '../form-state';

const PENALTY_LABEL: Record<PenaltyType, string> = { NONE: 'Tanpa penalti', FIXED: 'Nominal tetap', PERCENTAGE: 'Persentase' };

function OptionCard({ option, index, onChange, onRemove }: { option: GatheringOptionDraft; index: number; onChange: (patch: Partial<GatheringOptionDraft>) => void; onRemove: () => void }) {
  return (
    <li className="flex flex-col gap-2.5 rounded-xl border border-default-200 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold">Pilihan {index + 1}</span>
        <button type="button" className={ICON_BTN} aria-label={`Hapus pilihan ${option.label || index + 1}`} onClick={onRemove}>
          <Icon name="trash" size={14} />
        </button>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <TextField label="Kelompok" placeholder="Mis. Resto" value={option.group} onChange={(group) => onChange({ group })} maxLength={64} />
        <TextField label="Nama pilihan" placeholder="Mis. Sate Padang" value={option.label} onChange={(label) => onChange({ label })} maxLength={255} />
      </div>
      <TextField label="Keterangan" value={option.description} onChange={(description) => onChange({ description })} />
      <div className="grid gap-2.5 sm:grid-cols-2">
        <TextField label="Lokasi pilihan" value={option.venueLocation} onChange={(venueLocation) => onChange({ venueLocation })} />
        <TextField label="Catatan ketersediaan" value={option.availabilityNote} onChange={(availabilityNote) => onChange({ availabilityNote })} />
      </div>
      <TextAreaField label="Benefit (satu per baris)" rows={2} value={option.benefits} onChange={(benefits) => onChange({ benefits })} />
    </li>
  );
}

/** Bagian "Peserta & pilihan acara": opsi gathering (kuota, DP, pilihan, pembatalan) — disimpan lewat PUT replace. */
export function EventSection({ form, set, errors }: SectionProps) {
  const options = form.gatheringOptions;
  const patchOption = (key: string, patch: Partial<GatheringOptionDraft>) =>
    set({ gatheringOptions: options.map((o) => (o.key === key ? { ...o, ...patch } : o)) });

  return (
    <>
      <Notice>Jadwal final acara ditentukan dari pemesanan (occurrence) di kalender Gathering, bukan di sini.</Notice>
      {errors.gathering && <Notice tone="danger">{errors.gathering}</Notice>}
      <div className="grid gap-3 sm:grid-cols-3">
        <IntField label="Minimum peserta" value={form.minAttendees} onChange={(minAttendees) => set({ minAttendees })} error={errors.minAttendees} />
        <IntField label="Kapasitas maksimum" value={form.maxAttendees} onChange={(maxAttendees) => set({ maxAttendees })} error={errors.maxAttendees} />
        <MoneyField label="DP per peserta" value={form.deposit} onChange={(deposit) => set({ deposit })} error={errors.deposit} />
      </div>
      <span className="text-xs text-default-600">DP per peserta bisa dicairkan lebih dulu untuk biaya venue. Isi 0 bila tidak ada DP.</span>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-bold">Kelompok & pilihan</span>
        <span className="text-xs text-default-600">Contoh kelompok: Resto, dengan pilihan Sate Padang atau Nasi Campur. Harga & batas peserta sama untuk semua pilihan.</span>
        {errors.options && <span role="alert" className="text-xs font-semibold text-danger">{errors.options}</span>}
        <ul className="flex flex-col gap-2.5">
          {options.map((o, i) => (
            <OptionCard key={o.key} option={o} index={i} onChange={(p) => patchOption(o.key, p)} onRemove={() => set({ gatheringOptions: options.filter((x) => x.key !== o.key) })} />
          ))}
        </ul>
        <button type="button" className={ADD_BTN} onClick={() => set({ gatheringOptions: [...options, emptyOption()] })}>
          + Tambah pilihan
        </button>
      </div>

      <div className="flex flex-col gap-2.5 rounded-xl border border-default-200 p-3">
        <span className="text-[13px] font-bold">Aturan bila penyelenggara membatalkan acara</span>
        <TextAreaField label="Ringkasan aturan" rows={2} value={form.policySummary} onChange={(policySummary) => set({ policySummary })} hint="Pembatalan per peserta mengikuti alur refund kursi." />
        <div className="grid gap-2.5 sm:grid-cols-2">
          <IntField label="Persiapan dimulai" suffix="hari sebelum" value={form.prepareDays} onChange={(prepareDays) => set({ prepareDays })} error={errors.prepareDays} hint="Awal jendela penalti & persiapan acara." />
          <IntField label="Batas akhir pembatalan" suffix="hari sebelum" value={form.cutoffDays} onChange={(cutoffDays) => set({ cutoffDays })} error={errors.cutoffDays} hint="Setelah ini acara tidak bisa dibatalkan." />
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold">Penalti per peserta</span>
            <select className={INPUT} value={form.penaltyType} onChange={(e) => { const penaltyType = e.target.value as PenaltyType; set({ penaltyType, penaltyValue: penaltyType === 'NONE' ? '0' : form.penaltyValue }); }}>
              {(Object.keys(PENALTY_LABEL) as PenaltyType[]).map((k) => (
                <option key={k} value={k}>{PENALTY_LABEL[k]}</option>
              ))}
            </select>
          </label>
          {form.penaltyType !== 'NONE' && (
            <IntField
              label={form.penaltyType === 'PERCENTAGE' ? 'Besar penalti (%)' : 'Besar penalti (Rp)'}
              value={form.penaltyValue}
              onChange={(penaltyValue) => set({ penaltyValue })}
              error={errors.penaltyValue}
              hint="Per kursi berbayar, bila dibatalkan antara masa persiapan dan batas akhir."
            />
          )}
        </div>
      </div>
    </>
  );
}
