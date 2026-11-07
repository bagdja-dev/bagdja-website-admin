'use client';

import { Spinner } from '@heroui/react';
import { useRef } from 'react';

export interface LogoFieldProps {
  logoUrl: string | null;
  uploading: boolean;
  error: string | null;
  onPick: (file: File) => void;
  onRemove: () => void;
  /** Pengaturan Studio: tanpa label "(opsional)"/ajakan melewati, dan bisa dikunci. */
  variant?: 'onboarding' | 'settings';
  disabled?: boolean;
}

/** Logo opsional (artboard Wizard-Identitas): kotak 72px garis putus, tombol 44px, keterangan. */
export function LogoField({ logoUrl, uploading, error, onPick, onRemove, variant = 'onboarding', disabled = false }: LogoFieldProps) {
  const settings = variant === 'settings';
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <span id="logo-label" className="text-sm font-bold text-foreground">
        Logo{!settings && <span className="font-medium text-default-500"> (opsional)</span>}
      </span>
      <div className="flex flex-wrap items-center gap-4">
        <span
          className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl ${
            logoUrl ? 'border border-default-200 bg-white' : 'border-[1.5px] border-dashed border-default-400 text-default-500'
          }`}
        >
          {uploading ? (
            <Spinner size="sm" aria-label="Mengunggah logo" />
          ) : logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL hasil unggah (storage eksternal)
            <img src={logoUrl} alt="Logo terpilih" className="h-full w-full object-contain" />
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 19.5h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z" />
            </svg>
          )}
        </span>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-describedby="logo-label logo-hint"
              onClick={() => inputRef.current?.click()}
              disabled={uploading || disabled}
              className="min-h-11 self-start rounded-[10px] border border-default-300 bg-white px-4 text-sm font-semibold text-foreground hover:bg-default-50 disabled:opacity-60"
            >
              {logoUrl ? 'Ganti logo' : 'Unggah logo'}
            </button>
            {logoUrl && !disabled && (
              <button type="button" onClick={onRemove} className="min-h-11 px-2 text-sm font-semibold text-default-600 hover:text-[#B91C1C]">
                Hapus
              </button>
            )}
          </div>
          <span id="logo-hint" className="text-xs text-default-500">
            PNG/JPG, persegi, maks. 2 MB.{!settings && ' Belum punya? Lewati saja.'}
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onPick(file);
            event.target.value = '';
          }}
        />
      </div>
      {error && <p role="alert" className="text-xs font-medium text-[#B91C1C]">{error}</p>}
    </div>
  );
}
