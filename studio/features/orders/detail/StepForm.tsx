'use client';

import { Button } from '@heroui/react';
import { useState } from 'react';

import type { StepFormField } from '@/studio/api/order-detail';

import { StepFieldInput } from './StepFieldInput';
import { buildFormData, initialFormValues, validateForm } from './step-form';

interface StepFormProps {
  schema: StepFormField[] | null;
  saved: Record<string, unknown> | null;
  websiteId: string;
  submitLabel: string;
  /** Hanya satu tombol burgundi penuh per layar; form lain memakai varian garis. */
  solid: boolean;
  hint?: string;
  submitting: boolean;
  savingDraft: boolean;
  onSubmit: (formData: Record<string, unknown> | undefined) => Promise<boolean>;
  onSaveDraft: (values: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
}

/** Form langkah dari `form_schema`: validasi wajib, simpan draft, kirim. */
export function StepForm({ schema, saved, websiteId, submitLabel, solid, hint, submitting, savingDraft, onSubmit, onSaveDraft, onCancel }: StepFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => initialFormValues(schema, saved));
  const [error, setError] = useState<string | null>(null);
  const fields = schema ?? [];
  const busy = submitting || savingDraft;

  const submit = async (): Promise<void> => {
    const message = validateForm(schema, values);
    setError(message);
    if (message) return;
    const ok = await onSubmit(buildFormData(schema, values));
    if (ok) setValues(initialFormValues(schema, null));
  };

  return (
    <div className="flex flex-col gap-3.5">
      {fields.map((field) => (
        <StepFieldInput
          key={field.key}
          field={field}
          value={values[field.key]}
          websiteId={websiteId}
          disabled={busy}
          onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
        />
      ))}
      {error && <p role="alert" className="text-sm font-medium text-[#B91C1C]">{error}</p>}
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          color="primary"
          variant={solid ? 'solid' : 'bordered'}
          className={`min-h-12 rounded-xl px-5 text-[15px] font-bold ${solid ? '' : 'border-primary-200 bg-white text-primary'}`}
          isLoading={submitting}
          isDisabled={savingDraft}
          onPress={() => void submit()}
        >
          {submitLabel}
        </Button>
        {fields.length > 0 && (
          <Button variant="bordered" className="min-h-12 rounded-xl font-semibold" isLoading={savingDraft} isDisabled={submitting} onPress={() => void onSaveDraft(values)}>
            Simpan draft
          </Button>
        )}
        {onCancel && (
          <Button variant="light" className="min-h-12 font-semibold" isDisabled={busy} onPress={onCancel}>
            Batal
          </Button>
        )}
        {hint && <span className="basis-full text-xs text-default-500 sm:basis-auto">{hint}</span>}
      </div>
    </div>
  );
}
