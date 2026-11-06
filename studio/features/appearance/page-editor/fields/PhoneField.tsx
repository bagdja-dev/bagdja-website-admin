'use client';

import { useEffect, useState } from 'react';

import { Input } from '@heroui/react';

import type { TemplateManifestField } from '@/studio/api/templates';
import { useWebsiteStore } from '@/studio/stores/website-store';

const MIN_DIGITS = 9;
const MAX_DIGITS = 15;

/** 08…/62…/+62…/8… → 62… (hanya digit); kosong tetap kosong. Sama dengan aturan renderer. */
export function toStoredPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) {
    if (digits.startsWith('620')) digits = `62${digits.slice(3)}`;
  } else if (digits.startsWith('0')) {
    digits = `62${digits.slice(1)}`;
  } else {
    digits = `62${digits}`;
  }
  return digits;
}

/** Bagian setelah "+62" yang ditampilkan di input. */
function toDisplayPhone(stored: string): string {
  const digits = stored.replace(/\D/g, '');
  return digits.startsWith('62') ? digits.slice(2) : digits;
}

function isValidPhone(stored: string): boolean {
  return stored.length >= MIN_DIGITS && stored.length <= MAX_DIGITS;
}

interface PhoneFieldProps {
  field: TemplateManifestField;
  value: unknown;
  websiteId: string;
  onChange: (value: string) => void;
}

/** Nomor telepon Indonesia: awalan "+62" tetap, hanya digit, disimpan sebagai 62…. */
export function PhoneField({ field, value, websiteId, onChange }: PhoneFieldProps) {
  const stored = typeof value === 'string' ? value : '';
  const websiteWhatsapp = useWebsiteStore((s) => s.websites.find((w) => w.website.id === websiteId)?.website.whatsapp ?? '');
  const [text, setText] = useState(() => toDisplayPhone(stored));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(toDisplayPhone(stored));
  }, [stored, focused]);

  const showError = !focused && stored !== '' && !isValidPhone(stored);
  const websiteNumber = toStoredPhone(websiteWhatsapp);
  const isWhatsappField = field.key === 'button_whatsapp';
  const hint = isWhatsappField && stored === ''
    ? `Kosongkan untuk memakai nomor WhatsApp website (${websiteNumber ? `+${websiteNumber}` : '+62…'}).`
    : field.description;

  return (
    <div className="flex flex-col gap-1">
      <Input
        type="tel"
        inputMode="numeric"
        value={text}
        placeholder={field.placeholder ?? '812xxxxxxx'}
        startContent={<span className="text-[13px] font-medium text-default-500">+62</span>}
        isInvalid={showError}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          const normalized = toStoredPhone(text);
          setText(toDisplayPhone(normalized));
          if (normalized !== stored) onChange(normalized);
        }}
        onValueChange={(next) => {
          const digits = next.replace(/\D/g, '');
          setText(digits);
          onChange(toStoredPhone(digits));
        }}
      />
      {showError ? (
        <p role="alert" className="text-[11px] text-danger">Nomor harus 9–15 digit, mis. 0812 3456 7890.</p>
      ) : hint ? (
        <p className="text-[11px] text-default-500">{hint}</p>
      ) : null}
    </div>
  );
}
