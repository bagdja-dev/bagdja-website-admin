'use client';

import { useState } from 'react';

import type { WebsiteTemplateDto } from '@/studio/api/types';
import { buildTemplatePreviewUrl } from '@/studio/lib/template-preview';

import { OfficialBadge } from './TemplateCard';
import { isPaidTemplate } from './use-template-catalog';
import { templateAuthor, templateFeatures, templatePages, templatePriceLabel } from './template-meta';
import { TemplatePreviewFrame, type PreviewDevice } from './TemplatePreviewFrame';
import { ARROW_LEFT, Arrow, StepActions, WizardButton } from './wizard-ui';

export interface TemplateDetailProps {
  template: WebsiteTemplateDto;
  /** "Cocok untuk" di daftar detail (label profil), atau null. */
  fitLabel: string | null;
  onBack: () => void;
  onUse: () => void;
}

const SEG = (on: boolean): string =>
  `min-h-[34px] rounded-[9px] px-3 text-[13px] ${on ? 'bg-white font-bold text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)]' : 'font-medium text-default-600'}`;

/** Detail template (artboard Wizard-Template, tampilan detail): panggung pratinjau abu + panel kanan 2 kartu. */
export function TemplateDetail({ template, fitLabel, onBack, onUse }: TemplateDetailProps) {
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const author = templateAuthor(template);
  const pages = templatePages(template);
  const features = templateFeatures(template);
  const paid = isPaidTemplate(template);
  const price = templatePriceLabel(template);
  const demoUrl = buildTemplatePreviewUrl(template);

  const cta = paid ? (
    <WizardButton disabled className="min-h-[50px] w-full">Beli · {price}</WizardButton>
  ) : (
    <WizardButton onClick={onUse} className="min-h-[50px] w-full">Pakai template ini</WizardButton>
  );

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-3.5 px-4 pb-28 pt-5 md:px-6 md:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-default-300 bg-white px-3.5 text-sm font-semibold text-default-700 hover:bg-default-50"
        >
          <Arrow d={ARROW_LEFT} /> Semua template
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {/* Renderer pratinjau baru merender beranda → hanya tab Beranda. */}
          <div role="tablist" aria-label="Halaman pratinjau" className="flex gap-1 rounded-xl bg-default-100 p-1">
            <button type="button" role="tab" aria-selected="true" className={SEG(true)}>
              {pages[0]}
            </button>
          </div>
          <div role="group" aria-label="Ukuran pratinjau" className="flex gap-1 rounded-xl bg-default-100 p-1">
            <button type="button" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')} className={SEG(device === 'desktop')}>
              Desktop
            </button>
            <button type="button" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')} className={SEG(device === 'mobile')}>
              HP
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <section aria-label="Pratinjau template" className="flex min-w-0 flex-[999_1_560px] justify-center rounded-2xl bg-default-200 p-3 sm:p-[18px]">
          <TemplatePreviewFrame template={template} device={device} size="compact" height={520} />
        </section>

        <aside aria-label="Detail template" className="flex w-full flex-col gap-3.5 lg:max-w-[360px] lg:flex-[1_1_300px]">
          <div className="flex flex-col gap-3.5 rounded-2xl border border-default-200 bg-white p-5">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-foreground">{template.name}</h1>
              <span className="flex items-center gap-1.5 text-[13px] text-default-600">
                oleh {author.name}
                {author.official && <OfficialBadge />}
              </span>
            </div>
            <span className={`text-[26px] font-extrabold ${paid ? 'text-foreground' : 'text-success'}`}>{price}</span>
            <div className="hidden md:block">{cta}</div>
            {paid && <p className="text-xs text-default-500">Pembelian template lewat Bagdja Pay segera tersedia.</p>}
            {demoUrl && (
              <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="text-center text-[13px] font-semibold text-primary">
                Buka demo di tab baru
              </a>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-default-200 bg-white px-5 py-[18px] text-[13px]">
            {template.description && <p className="leading-relaxed text-default-700">{template.description}</p>}
            <dl className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-2">
              {fitLabel && (
                <>
                  <dt className="text-default-600">Cocok untuk</dt>
                  <dd className="font-semibold">{fitLabel}</dd>
                </>
              )}
              <dt className="text-default-600">Halaman</dt>
              <dd className="font-semibold">{pages.join(', ')}</dd>
              {features.length > 0 && (
                <>
                  <dt className="text-default-600">Mendukung</dt>
                  <dd className="font-semibold">{features.join(', ')}</dd>
                </>
              )}
              {template.manifest?.version && (
                <>
                  <dt className="text-default-600">Versi</dt>
                  <dd className="font-semibold">{template.manifest.version}</dd>
                </>
              )}
            </dl>
            <span className="text-default-500">
              Konten contoh ikut terisi dan bisa diganti. Template bisa diganti lagi kapan saja di Tampilan Website.
            </span>
          </div>
        </aside>
      </div>

      <div className="md:hidden">
        <StepActions>{cta}</StepActions>
      </div>
    </div>
  );
}
