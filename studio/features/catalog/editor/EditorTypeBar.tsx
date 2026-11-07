'use client';

import { useModulesStore } from '@/studio/stores/modules-store';

import { ITEM_TYPE_ORDER, ITEM_TYPES, isTypeModuleEnabled, typeMeta } from '../catalog-types';

export interface EditorTypeBarProps {
  isNew: boolean;
  area: 'catalog' | 'events';
  type: string;
  onChange: (type: string) => void;
}

/**
 * Tipe dipilih saat membuat item dan terkunci setelah disimpan (plan §3.12).
 * Acara punya halaman sendiri (D12), jadi tidak ada di tab ini; Paket disembunyikan sementara.
 */
export function EditorTypeBar({ isNew, area, type, onChange }: EditorTypeBarProps) {
  const hasModule = useModulesStore((s) => s.hasModule);
  const meta = typeMeta(type);

  if (!isNew || area === 'events') {
    return (
      <p className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-default-600">
        <span className={`rounded-full px-2.5 py-[3px] text-xs font-bold ${meta.badgeClass}`}>{meta.pickerLabel}</span>
        {isNew ? 'Item acara baru.' : 'Tipe item tidak bisa diubah setelah disimpan.'}
      </p>
    );
  }

  const tabs = ITEM_TYPE_ORDER.filter((t) => t !== 'gathering' && ITEM_TYPES[t].creatable && isTypeModuleEnabled(t, hasModule));
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div role="group" aria-label="Tipe item" className="flex gap-1 rounded-xl bg-default-200/60 p-1">
        {tabs.map((t) => {
          const on = t === type;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(t)}
              className={`min-h-9 rounded-[9px] px-3.5 text-[13px] ${on ? 'bg-white font-bold text-foreground shadow-sm' : 'font-medium text-default-600'}`}
            >
              {ITEM_TYPES[t].pickerLabel}
            </button>
          );
        })}
      </div>
      <span className="text-xs text-default-600">Tipe tidak bisa diubah setelah item disimpan.</span>
    </div>
  );
}
