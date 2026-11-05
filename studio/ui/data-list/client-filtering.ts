import type { DataRow, FilterCounts, FilterDef, FilterValues } from './types';

export function matchesSearch<T extends DataRow>(row: T, search: string, keys: ReadonlyArray<keyof T>): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return keys.some((key) => {
    const value = row[key];
    return value !== null && value !== undefined && String(value).toLowerCase().includes(needle);
  });
}

function matchesFilters<T extends DataRow>(
  row: T,
  filters: readonly FilterDef<T>[],
  values: FilterValues,
  skipKey?: string,
): boolean {
  return filters.every((f) => {
    if (f.key === skipKey) return true;
    const selected = values[f.key] ?? '';
    return !selected || (f.getValue(row) ?? '') === selected;
  });
}

export function applyClientQuery<T extends DataRow>(
  rows: readonly T[],
  search: string,
  searchKeys: ReadonlyArray<keyof T>,
  filters: readonly FilterDef<T>[],
  values: FilterValues,
): T[] {
  return rows.filter((row) => matchesSearch(row, search, searchKeys) && matchesFilters(row, filters, values));
}

/** Hitungan facet: tiap filter dihitung dengan pencarian + filter LAIN yang aktif. */
export function computeFilterCounts<T extends DataRow>(
  rows: readonly T[],
  search: string,
  searchKeys: ReadonlyArray<keyof T>,
  filters: readonly FilterDef<T>[],
  values: FilterValues,
): FilterCounts {
  const counts: FilterCounts = {};
  for (const filter of filters) {
    const bucket: Record<string, number> = { '': 0 };
    for (const row of rows) {
      if (!matchesSearch(row, search, searchKeys) || !matchesFilters(row, filters, values, filter.key)) continue;
      bucket[''] += 1;
      const value = filter.getValue(row) ?? '';
      bucket[value] = (bucket[value] ?? 0) + 1;
    }
    counts[filter.key] = bucket;
  }
  return counts;
}
