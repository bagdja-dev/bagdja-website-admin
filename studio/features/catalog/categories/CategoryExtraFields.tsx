'use client';

import { Input } from '@heroui/react';

import { Icon } from '@/studio/ui/icons';

export interface KeyValueRow {
  key: string;
  value: string;
}

interface RepeaterProps {
  label: string;
  hint: string;
  keyLabel: string;
  valueLabel: string;
  valueType?: 'text' | 'number';
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
}

/** Repeater dua kolom (Spesifikasi: nama/nilai, Estimasi harga: label/harga). */
export function KeyValueRepeater({ label, hint, keyLabel, valueLabel, valueType = 'text', rows, onChange }: RepeaterProps) {
  const update = (index: number, patch: Partial<KeyValueRow>): void =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-[12px] font-semibold text-default-600">{label}</legend>
      <p className="text-[12px] text-default-500">{hint}</p>
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            aria-label={`${keyLabel} ${index + 1}`}
            placeholder={keyLabel}
            value={row.key}
            onValueChange={(v) => update(index, { key: v })}
            variant="bordered"
            size="sm"
          />
          <Input
            aria-label={`${valueLabel} ${index + 1}`}
            placeholder={valueLabel}
            type={valueType}
            min={valueType === 'number' ? 0 : undefined}
            value={row.value}
            onValueChange={(v) => update(index, { value: v })}
            variant="bordered"
            size="sm"
          />
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
            aria-label={`Hapus baris ${index + 1}`}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-default-300 bg-white text-default-600"
          >
            <Icon name="trash" size={14} strokeWidth={1.5} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, { key: '', value: '' }])}
        className="inline-flex min-h-9 w-fit items-center gap-1.5 rounded-[8px] border border-default-300 bg-white px-3 text-[13px] font-semibold text-foreground"
      >
        <Icon name="plus" size={14} strokeWidth={2} /> Tambah baris
      </button>
    </fieldset>
  );
}
