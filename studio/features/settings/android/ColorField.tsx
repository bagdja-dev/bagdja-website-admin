'use client';

import { Input } from '@heroui/react';

import { FIELD_CLASSES } from '../parts';
import { toSixDigitHex } from './android-utils';

/** Pemilih warna: swatch native + isian hex (#RRGGBB). */
export function ColorField({ label, value, description, onChange }: { label: string; value: string; description?: string; onChange: (value: string) => void }) {
  const swatch = /^#[0-9A-F]{6}$/.test(toSixDigitHex(value)) ? toSixDigitHex(value) : '#000000';
  return (
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
          aria-label={`${label} (pilih warna)`}
          value={swatch}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-6 w-6 shrink-0 cursor-pointer rounded border border-default-300 bg-transparent p-0"
        />
      }
    />
  );
}
