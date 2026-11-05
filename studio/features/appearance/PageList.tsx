'use client';

import { useCallback, useMemo } from 'react';

import { useRouter } from 'next/navigation';

import { useDataList, DataListPage, type BulkAction, type DataColumn, type PrimaryAction } from '@/studio/ui/data-list';
import { useActiveWebsiteId } from '@/studio/stores/website-store';
import { fetchPages, createPage, updatePage, deletePage, reorderPages, type WebsitePage } from '@/studio/api/pages';
import { Icon } from '@/studio/ui/icons';
import { notify } from '@/studio/ui/primitives/Toast';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';

export interface PageRow extends WebsitePage {}

export function usePageList() {
  const websiteId = useActiveWebsiteId();
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const list = useDataList<PageRow>({
    mode: 'client',
    searchKeys: ['title', 'slug'],
    filters: [],
    load: async () => {
      if (!websiteId) return [];
      const pages = await fetchPages(websiteId);
      return pages as PageRow[];
    },
  });

  const handleDeleteRow = useCallback(
    async (row: PageRow) => {
      if (!websiteId) return;
      if (row.is_home) {
        notify.error('Halaman utama tidak dapat dihapus. Ganti halaman utama terlebih dahulu.');
        return;
      }
      const confirmed = await confirm({
        title: 'Hapus halaman?',
        description: `Halaman "${row.title}" akan dihapus dan tidak dapat dipulihkan.`,
        confirmLabel: 'Hapus halaman',
        tone: 'danger',
      });
      if (!confirmed) return;
      try {
        await deletePage(websiteId, row.id);
        list.removeRows([row.id]);
        notify.success('Halaman dihapus.');
      } catch {
        notify.error('Gagal menghapus halaman.');
      }
    },
    [confirm, websiteId, list],
  );

  const bulkActions: BulkAction<PageRow>[] = useMemo(() => [
    {
      key: 'delete',
      label: 'Hapus',
      danger: true,
      minRole: 'admin',
      confirm: { title: 'Hapus halaman terpilih', description: 'Data yang dihapus tidak dapat dikembalikan.', confirmLabel: 'Hapus' },
      onRun: (rows) => {
        if (!websiteId) return;
        rows.forEach((row) => {
          if (row.is_home) return;
          void deletePage(websiteId, row.id).then(() => list.removeRows([row.id]));
        });
      },
    },
  ], [websiteId, list]);

  const primaryAction: PrimaryAction = {
    label: 'Tambah halaman',
    icon: 'plus',
    minRole: 'editor',
    onPress: () => {
      const title = window.prompt('Judul halaman baru:', '');
      if (!title?.trim()) return;
      (async () => {
        try {
          const created = await createPage(websiteId!, { title: title.trim() });
          list.replaceRows([created, ...list.rows]);
          notify.success('Halaman dibuat.');
        } catch {
          notify.error('Gagal membuat halaman.');
        }
      })();
    },
  };

  const columns: DataColumn<PageRow>[] = useMemo(() => [
    {
      key: 'title',
      header: 'Judul',
      render: (row) => (
        <div className="text-foreground">
          <div className="font-medium truncate md:max-w-[260px]">{row.title}</div>
          <div className="text-[12px] text-default-600 truncate md:max-w-[320px]">{row.slug}</div>
        </div>
      ),
      mobile: 'title',
    },
    {
      key: 'isHome',
      header: 'Utama',
      render: (row) => (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold border-default-200 ${
          row.is_home ? 'bg-success-50 text-success border-success-100' : 'bg-default-50 text-default-500 border-default-200'
        }`}>
          {row.is_home ? 'Utama' : '—'}
        </span>
      ),
      mobile: 'meta',
    },
    {
      key: 'sortOrder',
      header: 'Urutan',
      render: (row) => (
        <span className="text-[12px] text-default-600 font-mono">{row.sort_order}</span>
      ),
      mobile: 'hidden',
    },
    {
      key: 'actions',
      header: '',
      hideHeader: true,
      minRole: 'editor',
      mobile: 'actions',
      render: (row, ctx) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            disabled={!ctx.canAct('editor')}
            onClick={() => void router.push(`/studio/appearance/pages/${row.id}?websiteId=${encodeURIComponent(websiteId!)}`)}
            aria-label={`Edit halaman: ${row.title}`}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-default-300 bg-white p-0 text-default-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 disabled:pointer-events-none disabled:opacity-50"
            title="Edit"
          >
            <Icon name="edit" size={14} strokeWidth={1.7} />
          </button>
          {row.is_home ? (
            <span
              aria-label="Halaman utama"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-success-100 bg-success-50 p-0 text-success"
              title="Halaman utama"
            >
              <Icon name="home" size={14} strokeWidth={1.7} />
            </span>
          ) : (
            <button
              type="button"
              disabled={!ctx.canAct('admin')}
              onClick={() => void handleDeleteRow(row)}
              aria-label={`Hapus halaman: ${row.title}`}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-default-300 bg-white p-0 text-default-600 transition-colors hover:border-danger-200 hover:bg-danger-50 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-300 disabled:pointer-events-none disabled:opacity-50"
              title="Hapus"
            >
              <Icon name="trash" size={14} strokeWidth={1.7} />
            </button>
          )}
        </div>
      ),
    },
  ], [router, handleDeleteRow, websiteId]);

  const handleReorderSave = useCallback(
    async (ordered: PageRow[]) => {
      if (!websiteId) return;
      await reorderPages(websiteId, ordered.map((r) => r.id));
      list.replaceRows(ordered);
    },
    [websiteId, list],
  );

  return {
    list,
    columns,
    bulkActions,
    primaryAction,
    handleDeleteRow,
    handleReorderSave,
    confirmDialog,
  };
}

export function PageList() {
  const { list, columns, bulkActions, primaryAction, handleReorderSave, confirmDialog } = usePageList();

  return (
    <div className="flex flex-col gap-6">
      <DataListPage
        title="Halaman Website"
        description="Susunan section halaman website. Hero selalu tampil paling atas."
        list={list}
        columns={columns}
        getRowLabel={(row) => row.title}
        itemNoun="halaman"
        primaryAction={primaryAction}
        secondaryActions={[]}
        bulkActions={bulkActions}
        reorder={list.totalCount > 1 ? { minRole: 'editor', onSave: handleReorderSave } : undefined}
        searchPlaceholder="Cari judul atau slug halaman…"
        emptyState={{
          title: 'Belum ada halaman',
          description: 'Tambahkan halaman pertama untuk website kamu.',
        }}
      />
      {confirmDialog}
    </div>
  );
}
