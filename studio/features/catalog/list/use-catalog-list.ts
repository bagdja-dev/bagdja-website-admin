'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { errorMessage } from '@/studio/api/client';
import { fetchCategoryOptions, type CatalogCategoryOption } from '@/studio/api/catalog-lookups';
import { deleteProduct, fetchCatalogProducts, updateProduct, type CatalogProduct, type ProductWriteRequest } from '@/studio/api/products';
import { useModulesStore } from '@/studio/stores/modules-store';
import { useActiveWebsiteId } from '@/studio/stores/website-store';
import { chipFilter, selectFilter, useDataList, type BulkAction, type FilterDef, type ServerQuery } from '@/studio/ui/data-list';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import { notify } from '@/studio/ui/primitives/Toast';

import { ITEM_TYPES, editorHref, filterableTypes } from '../catalog-types';
import { buildCatalogPage, NO_CATEGORY, type CatalogRow } from './catalog-query';

const CACHE_TTL_MS = 20_000;

/** Jalankan request berurutan; kembalikan id yang gagal. */
async function runEach<T>(items: T[], fn: (item: T) => Promise<unknown>): Promise<{ failed: T[]; firstError: unknown }> {
  const failed: T[] = [];
  let firstError: unknown = null;
  for (const item of items) {
    try {
      await fn(item);
    } catch (err) {
      failed.push(item);
      firstError ??= err;
    }
  }
  return { failed, firstError };
}

export function useCatalogList() {
  const websiteId = useActiveWebsiteId();
  const router = useRouter();
  const hasModule = useModulesStore((s) => s.hasModule);
  const enabledModules = useModulesStore((s) => s.enabledModules);
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [categories, setCategories] = useState<CatalogCategoryOption[]>([]);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const cacheRef = useRef<{ websiteId: string; at: number; items: CatalogProduct[] } | null>(null);

  useEffect(() => {
    if (!websiteId) return;
    fetchCategoryOptions(websiteId)
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [websiteId]);

  const typeKeys = useMemo(() => filterableTypes(hasModule), [hasModule, enabledModules]); // eslint-disable-line react-hooks/exhaustive-deps
  const filters = useMemo<FilterDef<CatalogRow>[]>(
    () => [
      chipFilter<CatalogRow>({
        key: 'type',
        label: 'Filter tipe',
        options: typeKeys.map((t) => ({ value: t, label: ITEM_TYPES[t].label })),
        getValue: (r) => r.product.type,
      }),
      selectFilter<CatalogRow>({
        key: 'category',
        label: 'Kategori',
        allLabel: 'Semua kategori',
        options: [...categories.map((c) => ({ value: c.id, label: c.label })), { value: NO_CATEGORY, label: 'Tanpa kategori' }],
        getValue: (r) => r.product.category_id ?? NO_CATEGORY,
      }),
    ],
    [categories, typeKeys],
  );

  const load = useCallback(
    async (query: ServerQuery) => {
      if (!websiteId) return { items: [], total: 0 };
      const cache = cacheRef.current;
      let all: CatalogProduct[];
      if (cache && cache.websiteId === websiteId && Date.now() - cache.at < CACHE_TTL_MS) {
        all = cache.items;
      } else {
        all = await fetchCatalogProducts(websiteId);
        cacheRef.current = { websiteId, at: Date.now(), items: all };
      }
      return buildCatalogPage(all, query);
    },
    [websiteId],
  );

  const list = useDataList<CatalogRow>({ mode: 'server', load, filters, pageSize: 20 });
  const invalidate = useCallback(() => {
    cacheRef.current = null;
  }, []);
  const reload = useCallback(async () => {
    invalidate();
    await list.reload();
  }, [invalidate, list]);

  const rowsById = useMemo(() => new Map(list.allRows.map((r) => [r.id, r])), [list.allRows]);
  const categoryLabel = useCallback((id: string) => categories.find((c) => c.id === id)?.label ?? null, [categories]);

  /** Ubah produk + varian lokal (tanpa memuat ulang). */
  const patchProducts = useCallback(
    (ids: readonly string[], patch: Partial<CatalogProduct>) => {
      for (const id of ids) {
        const row = rowsById.get(id);
        if (row) list.patchRow(id, { product: { ...row.product, ...patch } });
      }
      invalidate();
    },
    [invalidate, list, rowsById],
  );

  /** Item induk → ikut sertakan semua variannya (tampil/sembunyi & kategori konsisten satu keluarga). */
  const withVariants = useCallback(
    (rows: CatalogRow[]): CatalogRow[] => {
      const out = new Map<string, CatalogRow>();
      for (const row of rows) {
        out.set(row.id, row);
        for (const v of row.variants) {
          const vr = rowsById.get(v.id);
          if (vr) out.set(vr.id, vr);
        }
      }
      return [...out.values()];
    },
    [rowsById],
  );

  const bulkPatch = useCallback(
    async (rows: CatalogRow[], body: ProductWriteRequest, patch: Partial<CatalogProduct>, label: string) => {
      if (!websiteId) return;
      const targets = withVariants(rows);
      const { failed, firstError } = await runEach(targets, (r) => updateProduct(websiteId, r.id, body));
      const ok = targets.filter((r) => !failed.includes(r)).map((r) => r.id);
      patchProducts(ok, patch);
      list.selection.clear();
      if (failed.length) notify.error(`${failed.length} item gagal ${label}`, errorMessage(firstError));
      else notify.success(`${ok.length} item ${label}.`);
    },
    [list.selection, patchProducts, websiteId, withVariants],
  );

  const toggleVisible = useCallback(
    (row: CatalogRow, next: boolean) => {
      if (!websiteId) return;
      const children = row.variants.map((v) => v.id).filter((id) => rowsById.has(id));
      void list
        .optimisticUpdate(row.id, { product: { ...row.product, is_active: next } }, async () => {
          await updateProduct(websiteId, row.id, { is_active: next });
          const { failed } = await runEach(children, (id) => updateProduct(websiteId, id, { is_active: next }));
          patchProducts(children.filter((id) => !failed.includes(id)), { is_active: next });
          if (failed.length) notify.warning(`${failed.length} varian belum ikut ${next ? 'ditampilkan' : 'disembunyikan'}`);
        })
        .then((ok) => ok && invalidate());
    },
    [invalidate, list, patchProducts, rowsById, websiteId],
  );

  const deleteRows = useCallback(
    async (rows: CatalogRow[]) => {
      if (!websiteId) return;
      const { failed, firstError } = await runEach(rows, (r) => deleteProduct(websiteId, r.id));
      list.selection.clear();
      invalidate();
      await list.reload();
      if (failed.length) notify.error(`${failed.length} item gagal dihapus`, errorMessage(firstError));
      else notify.success(`${rows.length} item dihapus.`);
    },
    [invalidate, list, websiteId],
  );

  const deleteOne = useCallback(
    async (row: CatalogRow) => {
      const extra = row.variants.length ? ` beserta ${row.variants.length} variannya` : '';
      const ok = await confirm({
        title: 'Hapus item ini?',
        description: `"${row.product.name}"${extra} akan dihapus dari website dan tidak bisa dikembalikan.`,
        confirmLabel: 'Hapus',
        tone: 'danger',
      });
      if (ok) await deleteRows([row]);
    },
    [confirm, deleteRows],
  );

  const [categoryDialogRows, setCategoryDialogRows] = useState<CatalogRow[] | null>(null);

  const bulkActions = useMemo<BulkAction<CatalogRow>[]>(
    () => [
      { key: 'show', label: 'Tampilkan', minRole: 'editor', onRun: (rows) => bulkPatch(rows, { is_active: true }, { is_active: true }, 'ditampilkan') },
      { key: 'hide', label: 'Sembunyikan', minRole: 'editor', onRun: (rows) => bulkPatch(rows, { is_active: false }, { is_active: false }, 'disembunyikan') },
      { key: 'category', label: 'Ubah kategori', minRole: 'editor', onRun: (rows) => setCategoryDialogRows(rows) },
      {
        key: 'delete',
        label: 'Hapus',
        danger: true,
        minRole: 'admin',
        confirm: {
          title: 'Hapus item terpilih?',
          description: 'Item beserta variannya akan dihapus dari website dan tidak bisa dikembalikan.',
          confirmLabel: 'Hapus',
        },
        onRun: (rows) => deleteRows(rows),
      },
    ],
    [bulkPatch, deleteRows],
  );

  const applyCategory = useCallback(
    async (categoryId: string | null) => {
      const rows = categoryDialogRows ?? [];
      setCategoryDialogRows(null);
      await bulkPatch(rows, { category_id: categoryId }, { category_id: categoryId }, 'dipindah kategori');
    },
    [bulkPatch, categoryDialogRows],
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** Baris tampil: item induk + varian bila dibuka. */
  const displayRows = useMemo(
    () => list.rows.filter((r) => r.kind === 'item' || (r.parentId !== null && expanded.has(r.parentId))),
    [expanded, list.rows],
  );

  return {
    list,
    displayRows,
    categories,
    categoryLabel,
    expanded,
    toggleExpanded,
    toggleVisible,
    deleteOne,
    bulkActions,
    categoryDialogRows,
    closeCategoryDialog: () => setCategoryDialogRows(null),
    applyCategory,
    openEditor: (row: CatalogRow) => router.push(editorHref(row.product)),
    reload,
    confirmDialog,
  };
}
