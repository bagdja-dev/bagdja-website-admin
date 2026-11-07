'use client';

import { Input } from '@heroui/react';

import { FIELD_CLASSES } from '../parts';
import { toSixDigitHex } from './android-utils';

const COLOR_PALETTE: { name: string; shades: string[] }[] = [
  { name: 'Netral', shades: ['#FFFFFF', '#F4F4F5', '#A1A1AA', '#52525B', '#18181B'] },
  { name: 'Merah', shades: ['#FEE2E2', '#FCA5A5', '#EF4444', '#B91C1C', '#7F1D1D'] },
  { name: 'Jingga', shades: ['#FFEDD5', '#FDBA74', '#F97316', '#C2410C', '#7C2D12'] },
  { name: 'Amber', shades: ['#FEF3C7', '#FCD34D', '#F59E0B', '#B45309', '#78350F'] },
  { name: 'Kuning', shades: ['#FEF9C3', '#FDE047', '#EAB308', '#A16207', '#713F12'] },
  { name: 'Lime', shades: ['#ECFCCB', '#BEF264', '#84CC16', '#4D7C0F', '#365314'] },
  { name: 'Hijau', shades: ['#DCFCE7', '#86EFAC', '#22C55E', '#15803D', '#14532D'] },
  { name: 'Emerald', shades: ['#D1FAE5', '#6EE7B7', '#10B981', '#047857', '#064E3B'] },
  { name: 'Teal', shades: ['#CCFBF1', '#5EEAD4', '#14B8A6', '#0F766E', '#134E4A'] },
  { name: 'Cyan', shades: ['#CFFAFE', '#67E8F9', '#06B6D4', '#0E7490', '#164E63'] },
  { name: 'Biru langit', shades: ['#E0F2FE', '#7DD3FC', '#0EA5E9', '#0369A1', '#0C4A6E'] },
  { name: 'Biru', shades: ['#DBEAFE', '#93C5FD', '#3B82F6', '#1D4ED8', '#1E3A8A'] },
  { name: 'Indigo', shades: ['#E0E7FF', '#A5B4FC', '#6366F1', '#4338CA', '#312E81'] },
  { name: 'Violet', shades: ['#EDE9FE', '#C4B5FD', '#8B5CF6', '#6D28D9', '#4C1D95'] },
  { name: 'Ungu', shades: ['#F3E8FF', '#D8B4FE', '#A855F7', '#7E22CE', '#581C87'] },
  { name: 'Fuchsia', shades: ['#FAE8FF', '#F0ABFC', '#D946EF', '#A21CAF', '#701A75'] },
  { name: 'Pink', shades: ['#FCE7F3', '#F9A8D4', '#EC4899', '#BE185D', '#831843'] },
  { name: 'Rose', shades: ['#FFE4E6', '#FDA4AF', '#F43F5E', '#BE123C', '#881337'] },
];

/** Pemilih warna: swatch native + isian hex (#RRGGBB). */
export function ColorField({ label, value, description, onChange }: { label: string; value: string; description?: string; onChange: (value: string) => void }) {
  const swatch = /^#[0-9A-F]{6}$/.test(toSixDigitHex(value)) ? toSixDigitHex(value) : '#000000';
  return (
    <div className="flex flex-col gap-3">
      <Input
        label={label}
        labelPlacement="outside"
        classNames={FIELD_CLASSES}
        description={description}
        value={value}
        maxLength={7}
        onValueChange={(v) => onChange(v.toUpperCase())}
        placeholder="#0F172A"
        isInvalid={Boolean(value) && !/^#[0-9A-F]{6}$/.test(toSixDigitHex(value))}
        startContent={
          <input
            type="color"
            aria-label={`${label} (pilih warna bebas)`}
            value={swatch}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="h-6 w-6 shrink-0 cursor-pointer rounded border border-default-300 bg-transparent p-0"
          />
        }
      />
      <details className="group">
        <summary className="w-fit cursor-pointer list-none text-xs font-semibold text-primary hover:underline [&::-webkit-details-marker]:hidden">
          Pilih dari palet warna
        </summary>
        <div className="mt-3 flex flex-col gap-3 rounded-[10px] border border-default-200 bg-default-50 p-3">
          {COLOR_PALETTE.map((family) => (
            <div key={family.name} className="flex flex-wrap items-center gap-2">
              <span className="w-20 shrink-0 text-xs font-medium text-default-600">{family.name}</span>
              <div className="flex flex-wrap gap-1.5">
                {family.shades.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`${label}: ${family.name} ${color}`}
                    aria-pressed={swatch === color}
                    title={`${family.name} ${color}`}
                    onClick={() => onChange(color)}
                    className={`h-7 w-7 rounded-full border border-black/10 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${swatch === color ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
