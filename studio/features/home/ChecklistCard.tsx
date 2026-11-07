'use client';

import { Spinner } from '@heroui/react';
import Link from 'next/link';
import { useRef } from 'react';

import type { ChecklistStep } from './checklist-steps';

export interface ChecklistCardProps {
  steps: ChecklistStep[];
  loading: boolean;
  uploadingLogo: boolean;
  onUploadLogo: (file: File) => void;
  onCopyLink: () => void;
  onHide: () => void;
}

const CTA = 'inline-flex min-h-10 shrink-0 items-center rounded-[10px] bg-primary-50 px-3.5 text-[13px] font-bold text-primary no-underline hover:bg-primary-100 disabled:opacity-60';
const CHECK = 'm4.5 12.75 6 6 9-13.5';

/** "Siapkan website kamu" (artboard Beranda): progres hijau, langkah dengan CTA tint burgundi. */
export function ChecklistCard({ steps, loading, uploadingLogo, onUploadLogo, onCopyLink, onHide }: ChecklistCardProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const done = steps.filter((s) => s.done).length;
  const remaining = steps.length - done;
  const pct = Math.round((done / Math.max(steps.length, 1)) * 100);

  return (
    <section aria-labelledby="checklist-title" className="flex w-full min-w-0 flex-col gap-[18px] rounded-2xl border border-default-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="checklist-title" className="text-xl font-extrabold tracking-[-0.01em]">Siapkan website kamu</h2>
          <p className="text-sm text-default-600">
            {done} dari {steps.length} langkah selesai{remaining > 0 ? ` · sekitar ${remaining * 2} menit lagi` : ''}
          </p>
        </div>
        <button type="button" onClick={onHide} className="p-2 text-[13px] font-semibold text-default-600 hover:text-foreground">
          Sembunyikan panduan
        </button>
      </div>
      <div
        role="progressbar"
        aria-label="Progres persiapan"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={done}
        className="h-2 overflow-hidden rounded bg-default-100"
      >
        <div className="h-full rounded bg-[#16A34A] transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <ul className="flex flex-col" aria-busy={loading || undefined}>
        {steps.map((step) => (
          <li key={step.id} className="flex items-center gap-3.5 border-t border-default-100 py-[13px]">
            {step.done ? (
              <span className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={CHECK} />
                </svg>
              </span>
            ) : (
              <span aria-hidden="true" className="h-[26px] w-[26px] shrink-0 rounded-full border-2 border-default-300" />
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className={`text-[15px] ${step.done ? 'font-medium text-default-500 line-through' : 'font-bold text-foreground'}`}>
                {step.title}
                {step.done && <span className="sr-only"> (selesai)</span>}
              </span>
              {!step.done && step.hint && <span className="text-[13px] text-default-600">{step.hint}</span>}
            </span>
            {!step.done && step.action?.kind === 'link' && (
              <Link href={step.action.href} className={CTA}>
                {step.action.label}
              </Link>
            )}
            {!step.done && step.action?.kind === 'upload-logo' && (
              <button type="button" className={CTA} disabled={uploadingLogo} onClick={() => fileRef.current?.click()}>
                {uploadingLogo && <Spinner size="sm" color="current" className="mr-1.5" aria-label="Mengunggah" />}
                {step.action.label}
              </button>
            )}
            {!step.done && step.action?.kind === 'copy-link' && (
              <button type="button" className={CTA} onClick={onCopyLink}>
                {step.action.label}
              </button>
            )}
          </li>
        ))}
      </ul>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUploadLogo(file);
          e.target.value = '';
        }}
      />
    </section>
  );
}
