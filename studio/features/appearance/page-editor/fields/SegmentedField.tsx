'use client';

import type { TemplateManifestField } from '@/studio/api/templates';
import { Icon, type IconName } from '@/studio/ui/icons';

/** Ikon per nilai opsi yang umum dipakai (aksi tombol); opsi lain tampil tanpa ikon. */
const OPTION_ICONS: Record<string, IconName> = {
  whatsapp: 'chat',
  phone: 'phone',
  email: 'mail',
  link: 'link',
};

interface SegmentedFieldProps {
  field: TemplateManifestField;
  value: unknown;
  onChange: (value: string) => void;
}

/** `select` dengan `display: 'segmented'`: pilihan satu klik berupa chip, bukan dropdown. */
export function SegmentedField({ field, value, onChange }: SegmentedFieldProps) {
  const current = typeof value === 'string' && value ? value : typeof field.default === 'string' ? field.default : '';
  return (
    <div role="radiogroup" aria-label={field.label} className="grid grid-cols-2 gap-2">
      {(field.options ?? []).map((option) => {
        const selected = option.value === current;
        const icon = OPTION_ICONS[option.value];
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`flex min-h-10 items-center justify-center gap-2 rounded-[10px] border px-3 text-[13px] transition-colors ${
              selected
                ? 'border-primary-200 bg-primary-50 font-bold text-primary'
                : 'border-default-200 bg-white font-medium text-default-700 hover:bg-default-50'
            }`}
          >
            {icon ? <Icon name={icon} size={16} /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
