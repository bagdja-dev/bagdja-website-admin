'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Icon } from '@/studio/ui/icons';

import type { SectionProps } from '../editor-context';
import { ADD_BTN, ICON_BTN, IntField, Notice } from '../fields';
import { AssetPickerDialog } from './AssetPickerDialog';

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot + 1, dot + 5).toUpperCase() : 'FILE';
}

/** Bagian "File yang dikirim": relasi aset digital (role download) + download_link_ttl_minutes. */
export function DigitalSection({ form, set, errors, lookups, canEdit }: SectionProps) {
  const [open, setOpen] = useState(false);
  const byId = new Map(lookups.assets.map((a) => [a.id, a]));
  const selected = form.assetIds;

  return (
    <>
      {errors.assets && <Notice tone="danger">{errors.assets}</Notice>}
      {selected.length === 0 ? (
        <p className="rounded-xl border border-dashed border-default-300 px-3 py-4 text-center text-[13px] text-default-600">Belum ada file yang dipilih.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-default-100 rounded-xl border border-default-200">
          {selected.map((id) => {
            const asset = byId.get(id);
            return (
              <li key={id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="rounded-md bg-default-100 px-1.5 py-1 text-[10px] font-bold text-default-700">{asset ? extensionOf(asset.filename) : '?'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{asset?.name ?? 'File tidak ditemukan'}</span>
                  {asset && <span className="block truncate text-xs text-default-600">{asset.filename}</span>}
                </span>
                {canEdit && (
                  <button type="button" className={ICON_BTN} aria-label={`Lepas ${asset?.name ?? 'file'}`} onClick={() => set({ assetIds: selected.filter((x) => x !== id) })}>
                    <Icon name="close" size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {canEdit && (
        <button type="button" className={ADD_BTN} onClick={() => setOpen(true)}>
          + Pilih file
        </button>
      )}
      <span className="text-xs text-default-600">
        File diunggah & dikelola di <Link href="/studio/assets">Digital Asset</Link>.
      </span>
      <IntField
        label="Masa berlaku link unduhan"
        suffix="menit"
        value={form.downloadTtl}
        onChange={(downloadTtl) => set({ downloadTtl })}
        error={errors.downloadTtl}
        hint="1–10.080 menit. Standar 4.320 menit (3 hari) sejak link dikirim."
      />
      <AssetPickerDialog isOpen={open} assets={lookups.assets} selectedIds={selected} onChange={(assetIds) => set({ assetIds })} onClose={() => setOpen(false)} />
    </>
  );
}
