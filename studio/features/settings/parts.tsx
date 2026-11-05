'use client';

import { useState, type ReactNode } from 'react';

import { notify } from '@/studio/ui/primitives/Toast';

export const FIELD_CLASSES = { label: 'font-semibold text-default-700' } as const;

/** Kartu bagian Pengaturan (radius 14, border default-200). */
export function SettingsCard({
  title,
  description,
  action,
  tone = 'default',
  children,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  tone?: 'default' | 'danger';
  children: ReactNode;
}) {
  return (
    <section className={`rounded-[14px] border bg-white p-5 sm:p-6 ${tone === 'danger' ? 'border-danger-200' : 'border-default-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={`text-base font-bold ${tone === 'danger' ? 'text-danger' : 'text-foreground'}`}>{title}</h2>
          {description && <p className="mt-1 text-sm text-default-600">{description}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const PILL_TONES = {
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  danger: 'bg-danger-50 text-danger-700',
  neutral: 'bg-default-100 text-default-700',
} as const;

export function StatusPill({ tone, children }: { tone: keyof typeof PILL_TONES; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${PILL_TONES[tone]}`}>{children}</span>;
}

/** Tombol salin teks ke clipboard; gagal → toast (bukan diam). */
export function CopyButton({ value, label = 'Salin' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      notify.warning('Tidak bisa menyalin otomatis.', 'Pilih teksnya lalu salin manual.');
    }
  };
  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="min-h-8 shrink-0 rounded-[8px] border border-default-300 bg-white px-2.5 text-xs font-semibold text-foreground hover:bg-default-50"
    >
      {copied ? 'Tersalin' : label}
    </button>
  );
}
