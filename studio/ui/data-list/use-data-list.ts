'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { errorMessage } from '@/studio/api/client';

import { notify } from '../primitives/Toast';
import { applyClientQuery, computeFilterCounts } from './client-filtering';
import { readListQuery, writeListQuery } from './url-query';
import { useRowSelection, type RowSelection } from './use-row-selection';
import type { DataRow, EmptyKind, FilterCounts, FilterDef, FilterValues, ServerPage, ServerQuery } from './types';

interface BaseOptions<T extends DataRow> {
  searchKeys?: ReadonlyArray<keyof T>;
  filters?: FilterDef<T>[];
  pageSize?: number;
  /** Sinkron `?q=&<filter>=&page=` ke URL (default true). */
  syncUrl?: boolean;
  /** Nilai filter awal; filter yang sudah ada di URL selalu lebih diprioritaskan. */
  initialFilterValues?: FilterValues;
}

export interface ClientListOptions<T extends DataRow> extends BaseOptions<T> {
  mode: 'client';
  /** Data kecil: dimuat sekali, cari/filter/paginasi di browser. */
  load: () => Promise<T[]>;
}

export interface ServerListOptions<T extends DataRow> extends BaseOptions<T> {
  mode: 'server';
  /** Data besar: API menerima page/size/search/filter. */
  load: (query: ServerQuery) => Promise<ServerPage<T>>;
}

export type UseDataListOptions<T extends DataRow> = ClientListOptions<T> | ServerListOptions<T>;

export interface DataListState<T extends DataRow> {
  mode: 'client' | 'server';
  filters: FilterDef<T>[];
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  /** Baris di halaman yang tampil. */
  rows: T[];
  /** Semua baris yang dimuat (client: seluruh data; server: halaman ini) — dipakai mode urutkan. */
  allRows: T[];
  /** Jumlah total tanpa filter (client) / total server. */
  totalCount: number;
  /** Jumlah yang cocok dengan cari + filter. */
  matchCount: number;
  filterCounts: FilterCounts;
  search: string;
  setSearch: (value: string) => void;
  filterValues: FilterValues;
  setFilter: (key: string, value: string) => void;
  resetQuery: () => void;
  hasActiveQuery: boolean;
  page: number;
  pageCount: number;
  setPage: (page: number) => void;
  selection: RowSelection;
  selectedRows: T[];
  pendingIds: ReadonlySet<string>;
  emptyKind: EmptyKind;
  reload: () => Promise<void>;
  patchRow: (id: string, patch: Partial<T>) => void;
  removeRows: (ids: readonly string[]) => void;
  replaceRows: (rows: T[]) => void;
  /** Ubah baris langsung, jalankan request; gagal → kembalikan nilai lama + toast galat. */
  optimisticUpdate: (id: string, patch: Partial<T>, request: () => Promise<unknown>, errorTitle?: string) => Promise<boolean>;
}

const EMPTY_FILTERS: FilterDef<never>[] = [];

export function useDataList<T extends DataRow>(options: UseDataListOptions<T>): DataListState<T> {
  const { mode, pageSize = 20, syncUrl = true } = options;
  const initialFilterValues = options.initialFilterValues ?? {};
  const filters = (options.filters ?? EMPTY_FILTERS) as FilterDef<T>[];
  const searchKeys = useMemo(() => options.searchKeys ?? [], [options.searchKeys]);
  const filterKeys = useMemo(() => filters.map((f) => f.key), [filters]);
  const emptyValues = useMemo(() => Object.fromEntries(filterKeys.map((k) => [k, ''])) as FilterValues, [filterKeys]);

  const loadRef = useRef(options.load);
  loadRef.current = options.load;

  const [urlReady, setUrlReady] = useState(!syncUrl);
  const [search, setSearchState] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>(() => ({ ...emptyValues, ...initialFilterValues }));
  const [page, setPageState] = useState(1);
  const [items, setItems] = useState<T[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverCounts, setServerCounts] = useState<FilterCounts>({});
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set());
  const selection = useRowSelection();
  const seqRef = useRef(0);

  // URL → state (sekali, setelah mount; aman untuk hidrasi).
  useEffect(() => {
    if (!syncUrl) return;
    const initial = readListQuery(filterKeys);
    setSearchState(initial.search);
    setDebouncedSearch(initial.search);
    setFilterValues({ ...emptyValues, ...initialFilterValues, ...initial.filters });
    setPageState(initial.page);
    setUrlReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya saat mount
  }, []);

  useEffect(() => {
    if (!urlReady || !syncUrl) return;
    writeListQuery({ search, filters: filterValues, page }, filterKeys);
  }, [filterKeys, filterValues, page, search, syncUrl, urlReady]);

  useEffect(() => {
    if (mode === 'client') {
      setDebouncedSearch(search);
      return;
    }
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [mode, search]);

  const queryRef = useRef<ServerQuery>({ page, pageSize, search: '', filters: filterValues });
  queryRef.current = { page, pageSize, search: debouncedSearch.trim(), filters: filterValues };
  /** Mode server memuat ulang saat query berubah; mode client hanya sekali. */
  const serverQueryKey = mode === 'server' ? JSON.stringify(queryRef.current) : 'client';

  const reload = useCallback(async () => {
    const seq = ++seqRef.current;
    setStatus('loading');
    setError(null);
    try {
      if (mode === 'client') {
        const rows = await (loadRef.current as ClientListOptions<T>['load'])();
        if (seq !== seqRef.current) return;
        setItems(rows);
      } else {
        const res = await (loadRef.current as ServerListOptions<T>['load'])(queryRef.current);
        if (seq !== seqRef.current) return;
        setItems(res.items);
        setServerTotal(res.total);
        setServerCounts(res.counts ?? {});
      }
      setStatus('ready');
    } catch (err) {
      if (seq !== seqRef.current) return;
      setError(errorMessage(err, 'Gagal memuat data.'));
      setStatus('error');
    }
    // serverQueryKey sengaja jadi dependensi pemicu muat ulang (nilai dibaca dari queryRef).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, serverQueryKey]);

  useEffect(() => {
    if (urlReady) void reload();
  }, [reload, urlReady]);

  const matched = useMemo(
    () => (mode === 'client' ? applyClientQuery(items, debouncedSearch, searchKeys, filters, filterValues) : items),
    [debouncedSearch, filterValues, filters, items, mode, searchKeys],
  );
  const filterCounts = useMemo(
    () => (mode === 'client' ? computeFilterCounts(items, debouncedSearch, searchKeys, filters, filterValues) : serverCounts),
    [debouncedSearch, filterValues, filters, items, mode, searchKeys, serverCounts],
  );

  const matchCount = mode === 'client' ? matched.length : serverTotal;
  const totalCount = mode === 'client' ? items.length : serverTotal;
  const pageCount = Math.max(1, Math.ceil(matchCount / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = useMemo(
    () => (mode === 'client' ? matched.slice((safePage - 1) * pageSize, safePage * pageSize) : matched),
    [matched, mode, pageSize, safePage],
  );

  useEffect(() => {
    selection.retain(items.map((r) => r.id));
  }, [items, selection]);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setPageState(1);
  }, []);
  const setFilter = useCallback((key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setPageState(1);
  }, []);
  const resetQuery = useCallback(() => {
    setSearchState('');
    setDebouncedSearch('');
    setFilterValues(emptyValues);
    setPageState(1);
  }, [emptyValues]);
  const setPage = useCallback((next: number) => setPageState(Math.max(1, next)), []);

  const patchRow = useCallback((id: string, patch: Partial<T>) => {
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);
  const removeRows = useCallback((ids: readonly string[]) => {
    const drop = new Set(ids);
    setItems((prev) => prev.filter((row) => !drop.has(row.id)));
    if (mode === 'server') setServerTotal((t) => Math.max(0, t - drop.size));
  }, [mode]);
  const replaceRows = useCallback((next: T[]) => setItems(next), []);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const optimisticUpdate = useCallback(
    async (id: string, patch: Partial<T>, request: () => Promise<unknown>, errorTitle = 'Perubahan gagal disimpan') => {
      const before = itemsRef.current.find((row) => row.id === id);
      if (!before) return false;
      const previous = Object.fromEntries(Object.keys(patch).map((k) => [k, before[k as keyof T]])) as Partial<T>;
      patchRow(id, patch);
      setPendingIds((prev) => new Set(prev).add(id));
      try {
        await request();
        return true;
      } catch (err) {
        patchRow(id, previous);
        notify.error(errorTitle, errorMessage(err));
        return false;
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [patchRow],
  );

  const hasActiveQuery = search.trim() !== '' || Object.values(filterValues).some(Boolean);
  const emptyKind: EmptyKind =
    status !== 'ready' || rows.length > 0 ? 'none' : hasActiveQuery ? 'no-match' : 'no-data';
  const selectedRows = useMemo(() => items.filter((r) => selection.selectedIds.has(r.id)), [items, selection.selectedIds]);

  return {
    mode,
    filters,
    status,
    error,
    rows,
    allRows: items,
    totalCount,
    matchCount,
    filterCounts,
    search,
    setSearch,
    filterValues,
    setFilter,
    resetQuery,
    hasActiveQuery,
    page: safePage,
    pageCount,
    setPage,
    selection,
    selectedRows,
    pendingIds,
    emptyKind,
    reload,
    patchRow,
    removeRows,
    replaceRows,
    optimisticUpdate,
  };
}
