'use client';

import { useCallback, useState } from 'react';

import { errorMessage } from '@/studio/api/client';

import { notify } from '../primitives/Toast';
import type { DataListState } from './use-data-list';
import type { DataRow, ReorderConfig } from './types';

export interface ReorderMode<T extends DataRow> {
  active: boolean;
  draft: T[];
  saving: boolean;
  dirty: boolean;
  start: () => void;
  cancel: () => void;
  setDraft: (rows: T[]) => void;
  save: () => Promise<void>;
}

/**
 * Mode urutkan bekerja pada SELURUH data (bukan hasil filter — bug lama FAQ
 * memakai index global saat difilter). Gagal simpan → urutan lama dipertahankan + toast.
 */
export function useReorderMode<T extends DataRow>(
  list: DataListState<T>,
  config: ReorderConfig<T> | undefined,
): ReorderMode<T> {
  const [active, setActive] = useState(false);
  const [draft, setDraft] = useState<T[]>([]);
  const [saving, setSaving] = useState(false);

  const start = useCallback(() => {
    list.resetQuery();
    list.selection.clear();
    setDraft(list.allRows);
    setActive(true);
  }, [list]);

  const cancel = useCallback(() => {
    setActive(false);
    setDraft([]);
  }, []);

  const dirty = active && draft.some((row, i) => row.id !== list.allRows[i]?.id);

  const save = useCallback(async () => {
    if (!config) return;
    if (!dirty) {
      cancel();
      return;
    }
    setSaving(true);
    try {
      await config.onSave(draft);
      list.replaceRows(draft);
      notify.success('Urutan disimpan');
      cancel();
    } catch (err) {
      notify.error('Urutan gagal disimpan', errorMessage(err));
      setDraft(list.allRows);
    } finally {
      setSaving(false);
    }
  }, [cancel, config, dirty, draft, list]);

  return { active, draft, saving, dirty, start, cancel, setDraft, save };
}
