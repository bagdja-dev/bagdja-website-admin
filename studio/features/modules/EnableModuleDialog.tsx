'use client';

import { Spinner } from '@heroui/react';

import type { ModuleInfoDto } from '@/studio/api/types';

import { DIALOG_PRIMARY, DIALOG_SECONDARY, StudioDialog } from './dialog-ui';
import type { DependencyRow } from './use-features-page';

export interface EnableModuleDialogProps {
  info: ModuleInfoDto | null;
  deps: DependencyRow[];
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Modal "Aktifkan X?" + daftar dependensi (Sudah aktif / Ikut diaktifkan) — artboard Fitur. */
export function EnableModuleDialog({ info, deps, busy, onCancel, onConfirm }: EnableModuleDialogProps) {
  return (
    <StudioDialog
      isOpen={info !== null}
      onClose={onCancel}
      isBusy={busy}
      title={info ? `Aktifkan ${info.label}?` : ''}
      footer={
        <>
          <button type="button" onClick={onCancel} disabled={busy} className={DIALOG_SECONDARY}>
            Batal
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className={DIALOG_PRIMARY}>
            {busy && <Spinner size="sm" color="current" aria-label="Mengaktifkan" />}
            Aktifkan
          </button>
        </>
      }
    >
      {info && (
        <>
          <p className="text-sm leading-normal text-default-600">
            {info.description} Menu <strong className="text-foreground">{info.label}</strong> akan muncul di sidebar.
          </p>
          {deps.length > 0 && (
            <div className="flex flex-col gap-2 rounded-xl border border-default-200 bg-default-50 p-3.5">
              <span className="text-[13px] font-bold">Fitur ini membutuhkan:</span>
              <ul className="flex flex-col gap-2">
                {deps.map((d) => (
                  <li key={d.key} className="flex items-center justify-between gap-2 text-sm">
                    <span>{d.label}</span>
                    <span
                      className={`rounded-full px-2.5 py-[3px] text-xs font-bold ${
                        d.alreadyEnabled ? 'bg-[#F0FDF4] text-success' : 'bg-[#FFFBEB] text-[#92400E]'
                      }`}
                    >
                      {d.alreadyEnabled ? 'Sudah aktif' : 'Ikut diaktifkan'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </StudioDialog>
  );
}
