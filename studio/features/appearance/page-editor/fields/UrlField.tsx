'use client';

import { useState } from 'react';

import { Input } from '@heroui/react';

import type { TemplateManifestField } from '@/studio/api/templates';

/** https://… (tanpa skema pun boleh) atau path internal diawali "/". */
function isValidUrl(raw: string): boolean {
  const value = raw.trim();
  if (!value || /\s/.test(value)) return false;
  if (value.startsWith('/')) return !value.startsWith('//');
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) return false;
  return /^(https?:\/\/)?[^\s/.]+(\.[^\s/.]+)+(:\d+)?([/?#].*)?$/i.test(value);
}

interface UrlFieldProps {
  field: TemplateManifestField;
  value: unknown;
  onChange: (value: string) => void;
}

export function UrlField({ field, value, onChange }: UrlFieldProps) {
  const text = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(false);
  const showError = touched && text.trim() !== '' && !isValidUrl(text);
  return (
    <div className="flex flex-col gap-1">
      <Input
        type="text"
        inputMode="url"
        autoCapitalize="none"
        value={text}
        placeholder={field.placeholder}
        isInvalid={showError}
        onBlur={() => {
          setTouched(true);
          if (text !== text.trim()) onChange(text.trim());
        }}
        onValueChange={onChange}
      />
      {showError ? (
        <p role="alert" className="text-[11px] text-danger">Tautan belum benar, mis. https://contoh.com atau /produk.</p>
      ) : field.description ? (
        <p className="text-[11px] text-default-500">{field.description}</p>
      ) : null}
    </div>
  );
}
