import type { ChipFilterDef, DataRow, SelectFilterDef } from './types';

type FilterInput<D> = Omit<D, 'kind' | 'allLabel'> & { allLabel?: string };

/** Filter chip (dengan jumlah) — cocok untuk ≤5 opsi. */
export function chipFilter<T extends DataRow>(def: FilterInput<ChipFilterDef<T>>): ChipFilterDef<T> {
  return { allLabel: 'Semua', ...def, kind: 'chip' };
}

/** Filter select — untuk opsi banyak (kategori, lokasi). */
export function selectFilter<T extends DataRow>(def: FilterInput<SelectFilterDef<T>>): SelectFilterDef<T> {
  return { allLabel: `Semua ${def.label.toLowerCase()}`, ...def, kind: 'select' };
}
