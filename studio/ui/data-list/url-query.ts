import type { FilterValues } from './types';

export interface ListQueryState {
  search: string;
  filters: FilterValues;
  page: number;
}

/** Baca `?q=&<filter>=&page=` dari URL saat ini (hanya di browser, setelah mount). */
export function readListQuery(filterKeys: readonly string[]): ListQueryState {
  const params = new URLSearchParams(window.location.search);
  const filters: FilterValues = {};
  for (const key of filterKeys) filters[key] = params.get(key) ?? '';
  const page = Number.parseInt(params.get('page') ?? '1', 10);
  return { search: params.get('q') ?? '', filters, page: Number.isFinite(page) && page > 0 ? page : 1 };
}

/**
 * Tulis state ke URL tanpa navigasi (history.replaceState — terintegrasi dengan
 * router Next ≥14.1). Parameter lain di URL dipertahankan.
 */
export function writeListQuery(state: ListQueryState, filterKeys: readonly string[]): void {
  const params = new URLSearchParams(window.location.search);
  const setOrDelete = (key: string, value: string): void => {
    if (value) params.set(key, value);
    else params.delete(key);
  };
  setOrDelete('q', state.search.trim());
  for (const key of filterKeys) setOrDelete(key, state.filters[key] ?? '');
  setOrDelete('page', state.page > 1 ? String(state.page) : '');
  const query = params.toString();
  const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(window.history.state, '', next);
  }
}
