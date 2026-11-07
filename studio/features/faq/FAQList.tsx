'use client';

import { useCallback, useMemo, useState } from 'react';

import { useDataList, DataListPage, type BulkAction, type DataColumn, type DataListState, type PrimaryAction } from '@/studio/ui/data-list';
import { useActiveWebsiteId } from '@/studio/stores/website-store';
import { fetchFaqs, createFaq, updateFaq, deleteFaq, reorderFaqs, type WebsiteFaq } from '@/studio/api/faqs';
import { EditFaqDrawer } from './EditFaqDrawer';
import { Icon } from '@/studio/ui/icons';
import { notify } from '@/studio/ui/primitives/Toast';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import type { RowSelection } from '@/studio/ui/data-list/use-row-selection';

import { CATEGORY_OPTIONS, STATUS_OPTIONS } from './constants';

export interface FAQRow extends WebsiteFaq {}

function createColumns(onEdit: (row: FAQRow) => void, onDelete: (row: FAQRow) => void): DataColumn<FAQRow>[] {
  return [
  {
    key: 'question',
    header: 'Pertanyaan',
    render: (row) => (
      <div className="text-foreground">
        <div className="font-medium truncate md:max-w-[220px]">{row.question}</div>
        {row.answer && (
          <div className="text-[12px] text-default-600 truncate mt-0.5 md:max-w-[280px]">{row.answer}</div>
        )}
      </div>
    ),
    mobile: 'title',
  },
  {
    key: 'category',
    header: 'Kategori',
    render: (row) => {
      const cat = CATEGORY_OPTIONS.find((c) => c.value === row.category);
      return (
        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold border-default-200 text-primary">
          {cat ? cat.label : row.category ?? '—'}
        </span>
      );
    },
    mobile: 'subtitle',
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold border-default-200 ${
        row.is_active ? 'bg-success-50 text-success border-success-100' : 'bg-default-50 text-default-500 border-default-200'
      }`}>
        {row.is_active ? 'Aktif' : 'Tidak aktif'}
      </span>
    ),
    mobile: 'meta',
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
          onClick={() => onEdit(row)}
          aria-label={`Edit FAQ: ${row.question}`}
          className="min-h-8 min-w-8 rounded-[8px] border border-default-300 bg-white px-2 text-[11px] text-default-600 disabled:opacity-50 disabled:pointer-events-none"
          title="Edit"
        >
          <Icon name="edit" size={13} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          disabled={!ctx.canAct('admin')}
          onClick={() => onDelete(row)}
          aria-label={`Hapus FAQ: ${row.question}`}
          className="min-h-8 min-w-8 rounded-[8px] border border-default-300 bg-white px-2 text-[11px] text-default-600 disabled:opacity-50 disabled:pointer-events-none"
          title="Hapus"
        >
          <Icon name="trash" size={13} strokeWidth={1.5} />
        </button>
      </div>
    ),
  },
  ];
}

export function useFAQList() {
  const websiteId = useActiveWebsiteId();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<FAQRow | null>(null);

  const list = useDataList<FAQRow>({
    mode: 'client',
    searchKeys: ['question', 'answer'],
    filters: [
      {
        key: 'category',
        label: 'Kategori',
        allLabel: 'Semua kategori',
        options: [...CATEGORY_OPTIONS],
        getValue: (row) => row.category ?? '',
        kind: 'chip',
      },
      {
        key: 'status',
        label: 'Status',
        allLabel: 'Semua status',
        options: [...STATUS_OPTIONS],
        getValue: (row) => (row.is_active ? '1' : '0'),
        kind: 'chip',
      },
    ],
    load: async () => {
      if (!websiteId) return [];
      const faqs = await fetchFaqs(websiteId);
      return faqs.map((f) => ({ ...f, category: f.category ?? null } as FAQRow));
    },
  });

  const handleDeleteRow = useCallback(
    async (row: FAQRow) => {
      if (!websiteId) return;
      const confirmed = await confirm({
        title: 'Hapus FAQ?',
        description: `FAQ "${row.question}" akan dihapus dan tidak dapat dipulihkan.`,
        confirmLabel: 'Hapus FAQ',
        tone: 'danger',
      });
      if (!confirmed) return;
      try {
        await deleteFaq(websiteId, row.id);
        list.removeRows([row.id]);
        notify.success('FAQ dihapus.');
      } catch {
        notify.error('Gagal menghapus FAQ.');
      }
    },
    [confirm, websiteId, list],
  );

  const handleEditRow = useCallback((row: FAQRow) => {
    setEditingRow(row);
    setDrawerOpen(true);
  }, []);

  const columns = useMemo(() => createColumns(handleEditRow, handleDeleteRow), [handleDeleteRow, handleEditRow]);

  const bulkActions: BulkAction<FAQRow>[] = useMemo(() => [
    {
      key: 'publish',
      label: 'Terbitkan',
      minRole: 'editor',
      onRun: (rows) => {
        if (!websiteId) return;
        rows.forEach((row) => {
          void updateFaq(websiteId, row.id, { is_active: true }).then(() => list.patchRow(row.id, { is_active: true }));
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
          void updateFaq(websiteId, row.id, { is_active: false }).then(() => list.patchRow(row.id, { is_active: false }));
        });
      },
    },
    {
      key: 'delete',
      label: 'Hapus',
      danger: true,
      minRole: 'admin',
      confirm: { title: 'Hapus FAQ terpilih', description: 'Data yang dihapus tidak dapat dikembalikan.', confirmLabel: 'Hapus' },
      onRun: (rows) => {
        if (!websiteId) return;
        rows.forEach((row) => {
          void deleteFaq(websiteId, row.id).then(() => list.removeRows([row.id]));
        });
      },
    },
  ], [websiteId, list]);

  const primaryAction: PrimaryAction = {
    label: 'Tambah FAQ',
    icon: 'plus',
    minRole: 'editor',
    onPress: () => {
      setEditingRow(null);
      setDrawerOpen(true);
    },
  };

  const handleReorderSave = useCallback(
    async (ordered: FAQRow[]) => {
      if (!websiteId) return;
      await reorderFaqs(websiteId, ordered.map((r) => r.id));
      list.replaceRows(ordered);
    },
    [websiteId, list],
  );

  const onSaveDraft = useCallback(
    async (draft: Partial<FAQRow>) => {
      if (!websiteId) return;
      let saved: WebsiteFaq;
      if (editingRow) {
        saved = await updateFaq(websiteId, editingRow.id, draft);
        list.patchRow(saved.id, saved);
      } else {
        saved = await createFaq(websiteId, {
          question: draft.question ?? '',
          answer: draft.answer ?? '',
          category: draft.category ?? null,
          sort_order: draft.sort_order ?? 0,
          is_active: draft.is_active ?? true,
          metadata: draft.metadata ?? {},
        });
        list.replaceRows([saved, ...list.rows]);
      }
      setDrawerOpen(false);
      setEditingRow(null);
    },
    [websiteId, editingRow, list],
  );

  return {
    list,
    columns,
    bulkActions,
    primaryAction,
    handleDeleteRow,
    confirmDialog,
    handleReorderSave,
    onSaveDraft,
    drawerOpen,
    editingRow,
    setDrawerOpen,
    setEditingRow,
  };
}

export function FAQPageContent() {
  const { list, columns, bulkActions, primaryAction, handleReorderSave, onSaveDraft, drawerOpen, editingRow, setDrawerOpen, setEditingRow, confirmDialog } =
    useFAQList();

  const canReorder = list.totalCount > 1;

  return (
    <div className="flex flex-col gap-6">
      <DataListPage
        title="FAQ"
        description="Pertanyaan yang sering ditanyakan pembeli."
        list={list}
        columns={columns}
        getRowLabel={(row) => row.question}
        itemNoun="FAQ"
        primaryAction={primaryAction}
        secondaryActions={[]}
        bulkActions={bulkActions}
        reorder={canReorder ? { minRole: 'editor', onSave: handleReorderSave } : undefined}
        searchPlaceholder="Cari pertanyaan atau jawaban…"
        emptyState={{
          title: 'Belum ada FAQ',
          description: 'Tambahkan FAQ pertama untuk menjawab pertanyaan pembeli.',
        }}
      />
      <EditFaqDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingRow(null);
        }}
        title={editingRow ? 'Edit FAQ' : 'Tambah FAQ'}
        onSave={onSaveDraft}
        row={editingRow}
      />
      {confirmDialog}
    </div>
  );
}
