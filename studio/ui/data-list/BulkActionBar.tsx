'use client';

import { Spinner } from '@heroui/react';
import { useState } from 'react';

import { errorMessage } from '@/studio/api/client';

import { Icon } from '../icons';
import { useConfirm } from '../primitives/ConfirmDialog';
import { notify } from '../primitives/Toast';
import type { BulkAction, DataRow } from './types';

export interface BulkActionBarProps<T extends DataRow> {
  selectedRows: T[];
  actions: BulkAction<T>[];
  onClear: () => void;
}

/** Bar berlatar primary (aturan §3.13 #2); aksi bahaya selalu dikonfirmasi. */
export function BulkActionBar<T extends DataRow>({ selectedRows, actions, onClear }: BulkActionBarProps<T>) {
  const { confirm, dialog } = useConfirm();
  const [running, setRunning] = useState<string | null>(null);

  if (selectedRows.length === 0) return dialog;

  const run = async (action: BulkAction<T>): Promise<void> => {
    if (action.danger || action.confirm) {
      const ok = await confirm({
        title: action.confirm?.title ?? `${action.label} ${selectedRows.length} data?`,
        description: action.confirm?.description ?? (action.danger ? 'Tindakan ini tidak bisa dibatalkan.' : undefined),
        confirmLabel: action.confirm?.confirmLabel ?? action.label,
        tone: action.danger ? 'danger' : 'default',
      });
      if (!ok) return;
    }
    setRunning(action.key);
    try {
      await action.onRun(selectedRows);
    } catch (err) {
      notify.error(`${action.label} gagal`, errorMessage(err));
    } finally {
      setRunning(null);
    }
  };

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-2.5 rounded-xl bg-primary px-3.5 py-2.5 text-white"
        role="region"
        aria-label="Aksi untuk data terpilih"
      >
        <span className="mr-auto text-sm font-bold" aria-live="polite">
          {selectedRows.length} dipilih
        </span>
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            disabled={running !== null}
            onClick={() => void run(action)}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] disabled:opacity-60 ${
              action.danger
                ? 'bg-white font-bold text-[#B91C1C] hover:bg-[#FEF2F2]'
                : 'border border-white/45 font-semibold text-white hover:bg-white/10'
            }`}
          >
            {running === action.key && <Spinner size="sm" color="current" aria-label="Memproses" />}
            {action.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onClear}
          aria-label="Batalkan pilihan"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-default-300 hover:bg-white/10 hover:text-white"
        >
          <Icon name="close" size={16} strokeWidth={2.2} />
        </button>
      </div>
      {dialog}
    </>
  );
}
