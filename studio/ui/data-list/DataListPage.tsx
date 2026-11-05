'use client';

import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';

import type { TenantRole } from '@/studio/api/types';
import { hasMinRole } from '@/studio/lib/roles';
import { useActiveRole } from '@/studio/stores/website-store';

import { Icon } from '../icons';
import { EmptyState } from '../primitives/EmptyState';
import { PageHeader } from '../primitives/PageHeader';
import { BulkActionBar } from './BulkActionBar';
import { DataCardList } from './DataCardList';
import { DataTable } from './DataTable';
import { DataToolbar } from './DataToolbar';
import { ListPager } from './ListPager';
import { ListSkeleton } from './ListSkeleton';
import { ReorderList } from './ReorderList';
import { useReorderMode } from './use-reorder-mode';
import type { DataListState } from './use-data-list';
import type { BulkAction, ColumnContext, DataColumn, DataRow, PrimaryAction, ReorderConfig, ToolbarAction } from './types';

export interface DataListPageProps<T extends DataRow> {
  title: string;
  description?: ReactNode;
  list: DataListState<T>;
  columns: DataColumn<T>[];
  getRowLabel: (row: T) => string;
  /** Kata benda untuk pesan kosong: "Tidak ada {noun} yang cocok". */
  itemNoun?: string;
  primaryAction?: PrimaryAction;
  secondaryActions?: ToolbarAction[];
  bulkActions?: BulkAction<T>[];
  reorder?: ReorderConfig<T>;
  /** Baris redup (mis. disembunyikan) → latar #FAFAFA. */
  isRowMuted?: (row: T) => boolean;
  searchPlaceholder?: string;
  /** Keadaan "belum ada data" (berbeda dari "tidak ada yang cocok"). */
  emptyState: { title: string; description?: string };
  /** Untuk showcase/uji: paksa role tertentu. Default: role website aktif. */
  roleOverride?: TenantRole | null;
  /** `true` = judul & aksi dirender di konten (bukan topbar), mis. beberapa daftar dalam satu halaman. */
  embedded?: boolean;
}

const PRIMARY_BTN =
  'inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-bold text-white no-underline hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const FAB =
  'fixed bottom-5 right-4 z-30 inline-flex min-h-[52px] items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-bold text-white no-underline shadow-[0_10px_24px_rgba(122,30,72,0.35)] md:hidden';

function PrimaryButton({ action, className }: { action: PrimaryAction; className: string }) {
  const content = (
    <>
      <Icon name={action.icon ?? 'plus'} size={16} strokeWidth={2.4} />
      {action.label}
    </>
  );
  return action.href ? (
    <Link href={action.href} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={action.onPress} className={className}>
      {content}
    </button>
  );
}

/** Halaman daftar standar (artboard FAQ-List + FAQ-HP, spesifikasi Komponen-DataList). */
export function DataListPage<T extends DataRow>(props: DataListPageProps<T>) {
  const { list, columns, getRowLabel, primaryAction, secondaryActions = [], bulkActions = [], reorder } = props;
  const activeRole = useActiveRole();
  const role = props.roleOverride !== undefined ? props.roleOverride : activeRole;
  const canAct = (minRole?: TenantRole): boolean => !minRole || hasMinRole(role, minRole);
  const reorderMode = useReorderMode(list, reorder);

  const ctx = useMemo<ColumnContext>(
    () => ({ variant: 'table', canAct: (min) => !min || hasMinRole(role, min), isPending: (id) => list.pendingIds.has(id) }),
    [list.pendingIds, role],
  );
  const visibleColumns = columns.filter((c) => canAct(c.minRole));
  const visibleBulk = bulkActions.filter((a) => canAct(a.minRole));
  const selectable = visibleBulk.length > 0;
  const canReorder = reorder !== undefined && canAct(reorder.minRole) && list.mode === 'client' && list.totalCount > 1;
  const primary = primaryAction && canAct(primaryAction.minRole) ? primaryAction : null;

  const toolbarActions: ToolbarAction[] = [
    ...secondaryActions.filter((a) => canAct(a.minRole)),
    ...(canReorder ? [{ key: '__reorder', label: 'Atur urutan', icon: 'reorder' as const, onPress: reorderMode.start }] : []),
  ];
  const tableProps = {
    ariaLabel: props.title,
    rows: list.rows,
    columns: visibleColumns,
    ctx,
    selectable,
    selection: list.selection,
    getRowLabel,
    isRowMuted: props.isRowMuted,
  };
  const noun = props.itemNoun ?? 'data';

  let body: ReactNode;
  if (reorderMode.active) {
    body = (
      <div className="rounded-[14px] border border-default-200 bg-white">
        <ReorderList rows={reorderMode.draft} onChange={reorderMode.setDraft} getRowLabel={getRowLabel} />
      </div>
    );
  } else if (list.status === 'loading' && list.allRows.length === 0) {
    body = <div className="rounded-[14px] border border-default-200 bg-white"><ListSkeleton /></div>;
  } else if (list.status === 'error' || list.emptyKind !== 'none') {
    const reset = (
      <button type="button" onClick={list.resetQuery} className="min-h-10 rounded-[10px] border border-default-300 bg-white px-3.5 text-[13px] font-semibold">
        Reset filter
      </button>
    );
    const retry = (
      <button type="button" onClick={() => void list.reload()} className="min-h-10 rounded-[10px] border border-default-300 bg-white px-3.5 text-[13px] font-semibold">
        Coba lagi
      </button>
    );
    body = (
      <div className="rounded-[14px] border border-default-200 bg-white">
        {list.status === 'error' ? (
          <EmptyState compact icon="warning" title="Data gagal dimuat" description={list.error ?? undefined} action={retry} />
        ) : list.emptyKind === 'no-match' ? (
          <EmptyState compact icon="search" title={`Tidak ada ${noun} yang cocok`} description="Coba kata kunci lain atau hapus filter." action={reset} />
        ) : (
          <EmptyState compact title={props.emptyState.title} description={props.emptyState.description} action={primary ? <PrimaryButton action={primary} className={PRIMARY_BTN} /> : undefined} />
        )}
      </div>
    );
  } else {
    body = (
      <>
        <section className="hidden overflow-hidden rounded-[14px] border border-default-200 bg-white md:block">
          <DataTable {...tableProps} />
          <ListPager list={list} />
        </section>
        <div className="flex flex-col gap-2 md:hidden">
          <DataCardList {...tableProps} />
          <ListPager list={list} />
        </div>
      </>
    );
  }

  const countLabel = list.status === 'ready' ? list.totalCount : undefined;

  return (
    <>
      {props.embedded ? (
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground">
              {props.title}
              {countLabel !== undefined && <span className="text-sm font-semibold text-default-500"> · {countLabel}</span>}
            </h2>
            {props.description && <p className="text-[13px] text-default-600">{props.description}</p>}
          </div>
          {primary && <PrimaryButton action={primary} className={`hidden md:inline-flex ${PRIMARY_BTN}`} />}
        </div>
      ) : (
        <PageHeader
          title={props.title}
          description={props.description}
          count={countLabel}
          actions={primary ? <PrimaryButton action={primary} className={`hidden md:inline-flex ${PRIMARY_BTN}`} /> : undefined}
        />
      )}
      <div className="flex flex-col gap-3.5 pb-20 md:pb-0">
        {(list.totalCount > 0 || list.hasActiveQuery) && (
          <DataToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder={props.searchPlaceholder}
            filters={list.filters}
            filterValues={list.filterValues}
            filterCounts={list.filterCounts}
            onFilterChange={list.setFilter}
            secondaryActions={reorderMode.active ? [] : toolbarActions}
            isDisabled={reorderMode.active}
          />
        )}
        {reorderMode.active && (
          <div role="status" className="flex flex-wrap items-center gap-2 rounded-[10px] border border-primary-200 bg-primary-50 px-3.5 py-2.5 text-[13px] text-primary-700">
            <p className="min-w-0 flex-1">
              Mode atur urutan: seret baris atau pakai panah. Urutan ini yang tampil di website. Pencarian &amp; filter dimatikan sementara.
            </p>
            <button type="button" onClick={reorderMode.cancel} disabled={reorderMode.saving} className="min-h-9 rounded-lg border border-default-300 bg-white px-3 font-semibold text-foreground">
              Batal
            </button>
            <button type="button" onClick={() => void reorderMode.save()} disabled={reorderMode.saving} className="min-h-9 rounded-lg bg-primary px-3 font-bold text-white disabled:opacity-60">
              {reorderMode.saving ? 'Menyimpan…' : 'Simpan urutan'}
            </button>
          </div>
        )}
        {selectable && !reorderMode.active && (
          <BulkActionBar selectedRows={list.selectedRows} actions={visibleBulk} onClear={list.selection.clear} />
        )}
        {body}
      </div>
      {primary && !reorderMode.active && <PrimaryButton action={primary} className={FAB} />}
    </>
  );
}
