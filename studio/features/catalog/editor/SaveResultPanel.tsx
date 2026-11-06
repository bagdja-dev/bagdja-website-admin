'use client';

import { Spinner } from '@heroui/react';

import { Icon } from '@/studio/ui/icons';

import { STEP_LABELS, type StepResult, type StepStatus } from './save-runner';

const STATUS_TEXT: Record<StepStatus, string> = {
  pending: 'Menunggu',
  running: 'Menyimpan…',
  done: 'Berhasil',
  failed: 'Gagal',
  skipped: 'Dilewati',
};

const DOT: Record<StepStatus, string> = {
  pending: 'bg-default-100 text-default-500',
  running: 'bg-primary-50 text-primary',
  done: 'bg-[#DCFCE7] text-[#15803D]',
  failed: 'bg-[#FEE2E2] text-[#B91C1C]',
  skipped: 'bg-default-100 text-default-500',
};

/** Hasil simpan per langkah (parity: simpan bertahap & kegagalan parsial ditampilkan, data form tidak hilang). */
export function SaveResultPanel({ results, onDismiss }: { results: StepResult[]; onDismiss: () => void }) {
  const busy = results.some((r) => r.status === 'running' || r.status === 'pending');
  const failed = results.some((r) => r.status === 'failed');
  if (!busy && !failed) return null;
  return (
    <section
      aria-live="polite"
      aria-label="Hasil simpan"
      className={`flex flex-col gap-2 rounded-2xl border p-4 ${failed ? 'border-[#FECACA] bg-[#FEF2F2]' : 'border-default-200 bg-white'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold">{busy ? 'Menyimpan…' : 'Sebagian belum tersimpan'}</span>
        {!busy && (
          <button type="button" onClick={onDismiss} aria-label="Tutup hasil simpan" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-default-600 hover:bg-white">
            <Icon name="close" size={14} />
          </button>
        )}
      </div>
      <ol className="flex flex-col gap-1.5">
        {results.map((r) => (
          <li key={r.key} className="flex items-start gap-2 text-[13px]">
            <span className={`mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${DOT[r.status]}`} aria-hidden="true">
              {r.status === 'running' ? <Spinner size="sm" classNames={{ wrapper: 'h-3 w-3' }} /> : r.status === 'done' ? '✓' : r.status === 'failed' ? '!' : '·'}
            </span>
            <span className="min-w-0">
              <span className="font-semibold">{STEP_LABELS[r.key]}</span> — {STATUS_TEXT[r.status]}
              {r.message && <span className="block text-default-700">{r.message}</span>}
            </span>
          </li>
        ))}
      </ol>
      {failed && !busy && <p className="text-xs text-default-700">Isian kamu tetap tersimpan di halaman ini. Perbaiki lalu tekan Simpan lagi — langkah yang sudah berhasil aman diulang.</p>}
    </section>
  );
}
