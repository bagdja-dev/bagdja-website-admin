'use client';

import type { FormEvent } from 'react';

import type { WebsiteTemplateDto } from '@/studio/api/types';

import { LogoField } from './LogoField';
import { SlugField } from './SlugField';
import { TemplatePreviewFrame } from './TemplatePreviewFrame';
import { normalizeWhatsapp, type IdentityFormState } from './use-identity-form';
import { ARROW_LEFT, Arrow, StepActions, StepIntro, WizardButton } from './wizard-ui';

export interface IdentityStepProps {
  form: IdentityFormState;
  template: WebsiteTemplateDto;
  submitting: boolean;
  submitError: string | null;
  onBack: () => void;
  onSubmit: () => void;
}

const FORM_ID = 'studio-onboarding-identity';
const INPUT =
  'w-full rounded-xl border border-default-300 bg-white px-3.5 py-3 text-[15px] text-foreground outline-none focus:border-[1.5px] focus:border-primary focus:ring-4 focus:ring-primary-100';

/** Langkah 3 (artboard Wizard-Identitas): form kiri, pratinjau langsung kanan. */
export function IdentityStep({ form, template, submitting, submitError, onBack, onSubmit }: IdentityStepProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    form.touch();
    if (form.isValid && !submitting) onSubmit();
  };

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-4 pb-32 pt-5 md:px-6 md:pb-8 md:pt-8 lg:flex-row lg:items-start">
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate className="flex min-w-0 flex-col gap-[22px] lg:flex-[1_1_380px]">
        <StepIntro step={3} title="Kenalkan bisnismu" description="Cukup nama dulu. Sisanya bisa dilengkapi belakangan." compact />

        <div className="flex flex-col gap-2">
          <label htmlFor="business-name" className="text-sm font-bold text-foreground">
            Nama bisnis <span className="text-[#B91C1C]" aria-hidden="true">*</span>
          </label>
          <input
            id="business-name"
            value={form.name}
            onChange={(e) => form.setName(e.target.value)}
            onBlur={form.touch}
            placeholder="mis. Barbershop Pak Kumis"
            autoComplete="organization"
            required
            maxLength={255}
            aria-invalid={form.nameError ? true : undefined}
            aria-describedby={form.nameError ? 'business-name-error' : undefined}
            className={`${INPUT} py-[13px] text-base`}
          />
          {form.nameError && (
            <p id="business-name-error" role="alert" className="text-xs font-medium text-[#B91C1C]">
              {form.nameError}
            </p>
          )}
        </div>

        <SlugField slug={form.slug} status={form.slugStatus} onChange={form.setSlug} />

        <LogoField
          logoUrl={form.logoUrl}
          uploading={form.logoUploading}
          error={form.logoError}
          onPick={(file) => void form.pickLogo(file)}
          onRemove={form.removeLogo}
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="business-whatsapp" className="text-sm font-bold text-foreground">
            Nomor WhatsApp <span className="font-medium text-default-500">(opsional)</span>
          </label>
          <input
            id="business-whatsapp"
            type="tel"
            value={form.whatsapp}
            onChange={(e) => form.setWhatsapp(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="0812 3456 7890"
            aria-invalid={form.whatsappError ? true : undefined}
            aria-describedby="business-whatsapp-hint"
            className={INPUT}
          />
          <p id="business-whatsapp-hint" className={`text-xs ${form.whatsappError ? 'font-medium text-[#B91C1C]' : 'text-default-500'}`}>
            {form.whatsappError ?? 'Dipakai untuk tombol "Chat via WhatsApp" di website.'}
          </p>
        </div>

        {submitError && (
          <p role="alert" className="rounded-[10px] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">
            {submitError}
          </p>
        )}

        <div className="md:pt-1.5">
          <StepActions>
            <WizardButton variant="secondary" onClick={onBack} disabled={submitting}>
              <Arrow d={ARROW_LEFT} /> Kembali
            </WizardButton>
            <WizardButton type="submit" form={FORM_ID} loading={submitting} disabled={!form.isValid}>
              Buat website
            </WizardButton>
          </StepActions>
        </div>
      </form>

      <section aria-label="Pratinjau langsung" className="hidden min-w-0 flex-col gap-2.5 lg:flex lg:flex-[999_1_520px]">
        <p className="text-[13px] font-bold text-default-600">Pratinjau langsung · {template.name}</p>
        <TemplatePreviewFrame
          template={template}
          slug={form.slug}
          profile={{ name: form.name, logoUrl: form.logoUrl, whatsapp: normalizeWhatsapp(form.whatsapp) }}
          height={560}
        />
        <p className="text-xs text-default-500">
          Layanan &amp; harga di atas adalah contoh dari template — bisa diedit atau dihapus setelah website jadi.
        </p>
      </section>
    </div>
  );
}
