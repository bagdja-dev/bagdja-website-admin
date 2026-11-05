'use client';

import { Spinner } from '@heroui/react';
import Link from 'next/link';
import type { ReactNode } from 'react';

const BASE =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-[15px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60';
const PRIMARY = `${BASE} bg-primary font-bold text-white hover:bg-primary-700`;
const SECONDARY = `${BASE} border border-default-300 bg-white font-semibold text-default-700 hover:bg-default-50`;

export const ARROW_RIGHT = 'M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3';
export const ARROW_LEFT = 'M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18';

export function Arrow({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

interface WizardButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
  href?: string;
  external?: boolean;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
  form?: string;
  className?: string;
}

/** Tombol wizard sesuai artboard (tinggi 48, radius 12, satu tombol burgundi per layar). */
export function WizardButton({
  children,
  variant = 'primary',
  onClick,
  href,
  external = false,
  disabled = false,
  loading = false,
  type = 'button',
  form,
  className = '',
}: WizardButtonProps) {
  const cls = `${variant === 'primary' ? PRIMARY : SECONDARY} ${className}`;
  if (href && !disabled) {
    return external ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    ) : (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} form={form} onClick={onClick} disabled={disabled || loading} className={cls}>
      {loading && <Spinner size="sm" color="current" aria-label="Memproses" />}
      {children}
    </button>
  );
}

/** Aksi langkah: bar bawah menempel di HP (artboard HP), sejajar konten di ≥768px. */
export function StepActions({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex flex-col gap-2 border-t border-default-200 bg-white px-4 pb-5 pt-3 md:static md:z-auto md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3 md:border-0 md:bg-transparent md:p-0">
      {note && <div className="hidden min-w-0 flex-1 md:block">{note}</div>}
      <div className="flex w-full gap-2 md:w-auto md:gap-3 [&>*]:flex-1 md:[&>*]:flex-none">{children}</div>
    </div>
  );
}

/** `compact` = judul 28px/deskripsi 15px (langkah 2–3); default 32px/16px (langkah 1). */
export function StepIntro({
  step,
  title,
  description,
  compact = false,
}: {
  step: number;
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col ${compact ? 'gap-1.5' : 'gap-1.5 md:gap-2'}`}>
      <p className="hidden text-[13px] font-bold uppercase tracking-[0.08em] text-primary md:block">Langkah {step} dari 3</p>
      <h1 className={`text-2xl font-extrabold leading-tight tracking-[-0.02em] text-foreground ${compact ? 'md:text-[28px]' : 'md:text-[32px]'}`}>
        {title}
      </h1>
      <p className={`max-w-[620px] text-sm text-default-600 ${compact ? 'md:text-[15px]' : 'md:text-base'}`}>{description}</p>
    </div>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-[14px] border border-danger/30 bg-white p-5">
      <p className="text-sm text-default-700">{message}</p>
      <WizardButton variant="secondary" onClick={onRetry}>
        Coba lagi
      </WizardButton>
    </div>
  );
}
