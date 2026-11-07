'use client';

import { slugAddressParts } from '@/studio/lib/template-preview';

import type { SlugStatus } from './use-identity-form';

const STATUS: Record<SlugStatus, { text: string; cls: string } | null> = {
  idle: null,
  invalid: { text: 'Hanya huruf kecil, angka, dan tanda hubung.', cls: 'text-[#B91C1C]' },
  checking: { text: 'Mengecek ketersediaan…', cls: 'text-default-500' },
  available: { text: 'Tersedia — dibuat otomatis dari nama, bisa diubah. Domain sendiri bisa dipasang nanti.', cls: 'text-success' },
  taken: { text: 'Sudah dipakai website lain. Coba alamat lain.', cls: 'text-[#B91C1C]' },
  error: { text: 'Gagal mengecek alamat. Ubah sedikit lalu coba lagi.', cls: 'text-warning' },
};

const CHECK = 'm4.5 12.75 6 6 9-13.5';

/** Alamat website (artboard Wizard-Identitas): input + akhiran domain berlatar abu, status di bawah. */
export function SlugField({ slug, status, onChange }: { slug: string; status: SlugStatus; onChange: (value: string) => void }) {
  const info = STATUS[status];
  const { prefix, suffix } = slugAddressParts();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="business-slug" className="text-sm font-bold text-foreground">
        Alamat website
      </label>
      <div className="flex items-stretch overflow-hidden rounded-xl border border-default-300 bg-white focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-100">
        {prefix && <span className="flex items-center border-r border-default-200 bg-default-100 px-3.5 text-sm text-default-600">{prefix}</span>}
        <input
          id="business-slug"
          value={slug}
          onChange={(e) => onChange(e.target.value)}
          placeholder="nama-bisnis"
          autoComplete="off"
          spellCheck={false}
          aria-describedby="business-slug-status"
          aria-invalid={status === 'invalid' || status === 'taken' ? true : undefined}
          className="min-w-0 flex-1 bg-transparent py-3 pl-3.5 pr-1 text-[15px] text-foreground outline-none"
        />
        {suffix && <span className="flex items-center border-l border-default-200 bg-default-100 px-3.5 text-sm text-default-600">{suffix}</span>}
      </div>
      <p id="business-slug-status" aria-live="polite" className={`inline-flex min-h-5 items-center gap-1.5 text-[13px] font-semibold ${info?.cls ?? ''}`}>
        {status === 'available' && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={CHECK} />
          </svg>
        )}
        {info?.text ?? ''}
      </p>
    </div>
  );
}
