'use client';

import { useCallback, useMemo, useState } from 'react';

export interface RowSelection {
  selectedIds: ReadonlySet<string>;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  /** Pilih/lepas semua id yang diberikan (baris di halaman yang tampil). */
  setMany: (ids: readonly string[], selected: boolean) => void;
  clear: () => void;
  /** Buang id yang tidak lagi ada (setelah reload/hapus). */
  retain: (ids: readonly string[]) => void;
}

export function useRowSelection(): RowSelection {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setMany = useCallback((ids: readonly string[], value: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (value ? next.add(id) : next.delete(id)));
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const retain = useCallback((ids: readonly string[]) => {
    const keep = new Set(ids);
    setSelected((prev) => {
      const next = new Set(Array.from(prev).filter((id) => keep.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  return useMemo(
    () => ({ selectedIds: selected, isSelected, toggle, setMany, clear, retain }),
    [selected, isSelected, toggle, setMany, clear, retain],
  );
}
