'use client';

import { useState } from 'react';

import type { WebsiteTemplateDto } from '@/studio/api/types';
import { buildTenantWebUrl, displayHost } from '@/studio/lib/template-preview';

import { templateSeedSummary } from './template-meta';
import { WizardButton } from './wizard-ui';

export interface DoneStepProps {
  name: string;
  slug: string;
  template: WebsiteTemplateDto | null;
  /** Label modul yang aktif (tanpa modul inti). */
  modules: string[];
  candidateTrial?: boolean;
}

const CHECK = 'm4.5 12.75 6 6 9-13.5';

/** Layar selesai (artboard Wizard-Selesai): URL + Salin, ringkasan isi & menu, Lihat / Mulai atur website. */
export function DoneStep({ name, slug, template, modules, candidateTrial = false }: DoneStepProps) {
  const url = buildTenantWebUrl(slug);
  const [copied, setCopied] = useState(false);
  const seeds = template ? templateSeedSummary(template) : [];

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <section className="flex w-full max-w-[640px] flex-col items-center gap-6 rounded-[20px] border border-default-200 bg-white px-5 py-8 text-center shadow-[0_16px_40px_rgba(24,24,27,0.06)] sm:px-9 sm:py-10">
        <span className="inline-flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#DCFCE7] text-success">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={CHECK} />
          </svg>
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-foreground sm:text-[30px]">Website kamu sudah jadi!</h1>
          <p className="text-base text-default-600">{name} sudah online dan bisa dibagikan.</p>
        </div>
        {candidateTrial ? (
          <p className="w-full rounded-xl border border-warning-200 bg-warning-50 p-3 text-left text-sm text-warning-800">
            Mode uji versi kandidat aktif. Versi ini hanya terlihat saat Anda login; pengunjung tetap melihat versi terbit.
          </p>
        ) : null}

        <div className="flex w-full items-center gap-2.5 rounded-xl bg-default-100 py-2.5 pl-[18px] pr-2.5">
          <a href={url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-left text-[15px] font-semibold text-foreground no-underline">
            {displayHost(slug)}
          </a>
          <button
            type="button"
            onClick={() => void copy()}
            aria-live="polite"
            className="min-h-10 shrink-0 rounded-[9px] border border-default-300 bg-white px-3.5 text-sm font-semibold text-foreground hover:bg-default-50"
          >
            {copied ? 'Tersalin' : 'Salin'}
          </button>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-[14px] border border-default-200 p-4">
            <span className="text-[13px] font-bold text-default-600">Sudah kami siapkan</span>
            <ul className="text-sm leading-[1.7]">
              {seeds.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2 rounded-[14px] border border-default-200 p-4">
            <span className="text-[13px] font-bold text-default-600">Menu yang aktif</span>
            <p className="text-sm leading-[1.7]">{modules.length > 0 ? modules.join(' · ') : 'Tampilan Website, Tim, Pengaturan'}</p>
          </div>
        </div>

        <div className="flex w-full flex-col-reverse justify-center gap-3 sm:flex-row">
          <WizardButton variant="secondary" href={url} external>
            Lihat website
          </WizardButton>
          <WizardButton href="/studio?welcome=1">Mulai atur website</WizardButton>
        </div>
      </section>
    </div>
  );
}
