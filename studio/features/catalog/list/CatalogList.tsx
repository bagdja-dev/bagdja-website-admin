'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';

import { hasMinRole } from '@/studio/lib/roles';
import { useActiveRole } from '@/studio/stores/website-store';
import {
  BulkActionBar,
  DataCardList,
  DataTable,
  DataToolbar,
  ListPager,
  ListSkeleton,
  type ColumnContext,
  type DataListState,
} from '@/studio/ui/data-list';
import { Icon } from '@/studio/ui/icons';
import { EmptyState } from '@/studio/ui/primitives/EmptyState';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';

import { CATEGORIES_PATH } from '../catalog-types';
import { catalogColumns } from './catalog-columns';
import type { CatalogRow } from './catalog-query';
import { ChangeCategoryDialog } from './ChangeCategoryDialog';
import { TypePickerDialog } from './TypePickerDialog';
import { useCatalogList } from './use-catalog-list';

const PRIMARY_BTN =
  'inline-flex min-h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-bold text-white hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const OUTLINE_BTN =
  'inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-default-300 bg-white px-3.5 text-sm font-semibold text-foreground no-underline hover:bg-default-50';
const FAB =
  'fixed bottom-5 right-4 z-30 inline-flex min-h-[52px] items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(122,30,72,0.35)] md:hidden';
const SMALL_BTN = 'min-h-10 rounded-[10px] border border-default-300 bg-white px-3.5 text-[13px] font-semibold';

/** `/studio/catalog` — artboard "16 · Produk & Layanan — daftar" (plan §3.12). */
export function CatalogList() {
  const c = useCatalogList();
  const role = useActiveRole();
  const canEdit = hasMinRole(role, 'editor');
  const [pickerOpen, setPickerOpen] = useState(false);
  const { list } = c;

  const columns = useMemo(
    () =>
      catalogColumns({
        categoryLabel: c.categoryLabel,
        isExpanded: (id) => c.expanded.has(id),
        toggleExpanded: c.toggleExpanded,
        onToggleVisible: c.toggleVisible,
        onDelete: (row) => void c.deleteOne(row),
        onEdit: c.openEditor,
      }),
    [c],
  );
  const ctx = useMemo<ColumnContext>(
    () => ({ variant: 'table', canAct: (min) => !min || hasMinRole(role, min), isPending: (id) => list.pendingIds.has(id) }),
    [list.pendingIds, role],
  );
  const visibleBulk = c.bulkActions.filter((a) => !a.minRole || hasMinRole(role, a.minRole));
  const selectable = visibleBulk.length > 0;
  const tableProps = {
    ariaLabel: 'Produk & Layanan',
    rows: c.displayRows,
    columns,
    ctx,
    selectable,
    selection: list.selection,
    getRowLabel: (row: CatalogRow) => row.product.name,
    isRowMuted: (row: CatalogRow) => row.kind === 'variant' || !row.product.is_active,
    isRowSelectable: (row: CatalogRow) => row.kind === 'item',
  };
  const pagerList: DataListState<CatalogRow> = { ...list, rows: list.rows.filter((r) => r.kind === 'item') };

  const addButton = (className: string) => (
    <button type="button" onClick={() => setPickerOpen(true)} className={className}>
      <Icon name="plus" size={16} strokeWidth={2.4} />
      Tambah item
    </button>
  );

  let body: ReactNode;
  if (list.status === 'loading' && list.allRows.length === 0) {
    body = <ListSkeleton />;
  } else if (list.status === 'error') {
    body = (
      <EmptyState compact icon="warning" title="Data gagal dimuat" description={list.error ?? undefined}
        action={<button type="button" onClick={() => void c.reload()} className={SMALL_BTN}>Coba lagi</button>} />
    );
  } else if (list.emptyKind === 'no-match') {
    body = (
      <EmptyState compact icon="search" title="Tidak ada item yang cocok" description="Coba kata kunci lain atau hapus filter."
        action={<button type="button" onClick={list.resetQuery} className={SMALL_BTN}>Reset filter</button>} />
    );
  } else if (list.emptyKind === 'no-data') {
    body = (
      <EmptyState compact title="Belum ada item" description="Tambahkan layanan atau produk pertama yang kamu jual."
        action={canEdit ? addButton(PRIMARY_BTN) : undefined} />
    );
  }

  return (
    <>
      <PageHeader
        title="Produk & Layanan"
        description="Semua yang kamu jual. Tampil di website dan bisa dipesan pelanggan."
        count={list.status === 'ready' ? list.totalCount : undefined}
        actions={
          <>
            <Link href={CATEGORIES_PATH} className={OUTLINE_BTN}>
              <Icon name="folder" size={16} />
              Kategori
            </Link>
            {canEdit && addButton(`hidden md:inline-flex ${PRIMARY_BTN}`)}
          </>
        }
      />
      <div className="flex flex-col gap-3.5 pb-20 md:pb-0">
        {(list.totalCount > 0 || list.hasActiveQuery) && (
          <DataToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Cari nama atau SKU"
            filters={list.filters}
            filterValues={list.filterValues}
            filterCounts={list.filterCounts}
            onFilterChange={list.setFilter}
          />
        )}
        {selectable && <BulkActionBar selectedRows={list.selectedRows} actions={visibleBulk} onClear={list.selection.clear} />}
        {body ? (
          <div className="rounded-[14px] border border-default-200 bg-white">{body}</div>
        ) : (
          <>
            <section className="hidden overflow-hidden rounded-[14px] border border-default-200 bg-white md:block">
              <DataTable {...tableProps} />
              <ListPager list={pagerList} />
            </section>
            <div className="flex flex-col gap-2 md:hidden">
              <DataCardList {...tableProps} />
              <ListPager list={pagerList} />
            </div>
          </>
        )}
      </div>
      {canEdit && addButton(FAB)}
      <TypePickerDialog isOpen={pickerOpen} onClose={() => setPickerOpen(false)} />
      <ChangeCategoryDialog
        count={c.categoryDialogRows ? c.categoryDialogRows.length : null}
        categories={c.categories}
        onCancel={c.closeCategoryDialog}
        onApply={(id) => void c.applyCategory(id)}
      />
      {c.confirmDialog}
    </>
  );
}
