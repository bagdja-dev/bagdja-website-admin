'use client';

import { useState } from 'react';

import { Input } from '@heroui/react';

import type { TemplateManifestField } from '@/studio/api/templates';

const EMAIL_PATTERN = /^[^\s@,;?&]+@[^\s@,;?&]+\.[^\s@,;?&]+$/;

interface EmailFieldProps {
  field: TemplateManifestField;
  value: unknown;
  onChange: (value: string) => void;
}

export function EmailField({ field, value, onChange }: EmailFieldProps) {
  const text = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(false);
  const showError = touched && text.trim() !== '' && !EMAIL_PATTERN.test(text.trim());
  return (
    <div className="flex flex-col gap-1">
      <Input
        type="email"
        inputMode="email"
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
        <p role="alert" className="text-[11px] text-danger">Format email belum benar, mis. nama@usaha.com.</p>
      ) : field.description ? (
        <p className="text-[11px] text-default-500">{field.description}</p>
      ) : null}
    </div>
  );
}
