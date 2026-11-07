'use client';

import { useCallback, useMemo } from 'react';

import { useRouter } from 'next/navigation';

import { useDataList, DataListPage, type BulkAction, type DataColumn, type PrimaryAction } from '@/studio/ui/data-list';
import { useActiveWebsiteId } from '@/studio/stores/website-store';
import { fetchBlogPosts, updateBlogPost, deleteBlogPost, type WebsiteBlogPost } from '@/studio/api/blog-posts';
import { Icon } from '@/studio/ui/icons';
import { notify } from '@/studio/ui/primitives/Toast';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';

const STATUS_OPTIONS = [
  { value: 'published', label: 'Terbit' },
  { value: 'draft', label: 'Draft' },
] as const;

export interface BlogRow extends WebsiteBlogPost {}

export function useBlogList() {
  const websiteId = useActiveWebsiteId();
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const list = useDataList<BlogRow>({
    mode: 'client',
    searchKeys: ['title', 'excerpt'],
    filters: [
      {
        key: 'status',
        label: 'Status',
        allLabel: 'Semua',
        options: [...STATUS_OPTIONS],
        getValue: (row) => (row.is_published ? 'published' : 'draft'),
        kind: 'chip',
      },
    ],
    load: async () => {
      if (!websiteId) return [];
      const posts = await fetchBlogPosts(websiteId);
      return posts as BlogRow[];
    },
  });

  const handleDeleteRow = useCallback(
    async (row: BlogRow) => {
      if (!websiteId) return;
      const confirmed = await confirm({
        title: 'Hapus artikel?',
        description: `Artikel "${row.title}" akan dihapus dan tidak dapat dipulihkan.`,
        confirmLabel: 'Hapus artikel',
        tone: 'danger',
      });
      if (!confirmed) return;
      try {
        await deleteBlogPost(websiteId, row.id);
        list.removeRows([row.id]);
        notify.success('Artikel dihapus.');
      } catch {
        notify.error('Gagal menghapus artikel.');
      }
    },
    [confirm, websiteId, list],
  );

  const bulkActions: BulkAction<BlogRow>[] = useMemo(() => [
    {
      key: 'publish',
      label: 'Terbitkan',
      minRole: 'editor',
      onRun: (rows) => {
        if (!websiteId) return;
        rows.forEach((row) => {
          void updateBlogPost(websiteId, row.id, { is_published: true }).then(() => list.patchRow(row.id, { is_published: true }));
        });
      },
    },
    {
      key: 'unpublish',
      label: 'Jadikan draft',
      minRole: 'editor',
      onRun: (rows) => {
        if (!websiteId) return;
        rows.forEach((row) => {
          void updateBlogPost(websiteId, row.id, { is_published: false }).then(() => list.patchRow(row.id, { is_published: false }));
        });
      },
    },
    {
      key: 'delete',
      label: 'Hapus',
      danger: true,
      minRole: 'admin',
      confirm: { title: 'Hapus artikel terpilih', description: 'Data yang dihapus tidak dapat dikembalikan.', confirmLabel: 'Hapus' },
      onRun: (rows) => {
        if (!websiteId) return;
        rows.forEach((row) => {
          void deleteBlogPost(websiteId, row.id).then(() => list.removeRows([row.id]));
        });
      },
    },
  ], [websiteId, list]);

  const primaryAction: PrimaryAction = {
    label: 'Tulis artikel baru',
    icon: 'plus',
    minRole: 'editor',
    onPress: () => void router.push('/studio/blog/new'),
  };

  const columns: DataColumn<BlogRow>[] = useMemo(() => [
    {
      key: 'title',
      header: 'Judul',
      render: (row) => (
        <div className="text-foreground">
          <div className="font-medium truncate md:max-w-[260px]">{row.title}</div>
          {row.excerpt && (
            <div className="text-[12px] text-default-600 truncate mt-0.5 md:max-w-[320px]">{row.excerpt}</div>
          )}
        </div>
      ),
      mobile: 'title',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold border-default-200 ${
          row.is_published ? 'bg-success-50 text-success border-success-100' : 'bg-default-50 text-default-500 border-default-200'
        }`}>
          {row.is_published ? 'Terbit' : 'Draft'}
        </span>
      ),
      mobile: 'meta',
    },
    {
      key: 'related',
      header: 'Produk terkait',
      render: (row) => {
        const n = (row.related_product_ids?.length ?? 0);
        return n ? (
          <span className="text-[12px] text-default-600">{n} produk</span>
        ) : (
          <span className="text-[12px] text-default-500">—</span>
        );
      },
      mobile: 'hidden',
    },
    {
      key: 'publishedAt',
      header: 'Tanggal terbit',
      render: (row) => (
        <span className="text-[12px] text-default-600">
          {row.published_at ? new Date(row.published_at).toLocaleDateString('id-ID') : '—'}
        </span>
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
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={!ctx.canAct('editor')}
            onClick={() => void router.push(`/studio/blog/${row.id}`)}
            className="min-h-8 min-w-8 rounded-[8px] border border-default-300 bg-white px-2 text-[11px] text-default-600 disabled:opacity-50 disabled:pointer-events-none"
            title="Edit"
          >
            <Icon name="edit" size={13} strokeWidth={1.5} />
          </button>
        </div>
      ),
    },
  ], [router]);

  return {
    list,
    columns,
    bulkActions,
    primaryAction,
    handleDeleteRow,
    router,
    confirmDialog,
  };
}

export function BlogListContent() {
  const { list, columns, bulkActions, primaryAction, handleDeleteRow, router, confirmDialog } = useBlogList();

  return (
    <div className="flex flex-col gap-6">
      <DataListPage
        title="Blog"
        description="Tulis artikel untuk menarik pengunjung."
        list={list}
        columns={columns}
        getRowLabel={(row) => row.title}
        itemNoun="artikel"
        primaryAction={primaryAction}
        secondaryActions={[]}
        bulkActions={bulkActions}
        searchPlaceholder="Cari judul atau ringkasan…"
        emptyState={{
          title: 'Belum ada artikel',
          description: 'Tulis artikel pertama untuk blog website kamu.',
        }}
      />
      {confirmDialog}
    </div>
  );
}
