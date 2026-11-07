'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import {
  actionsColumn,
  imageColumn,
  Pill,
  switchColumn,
  titleColumn,
  useDataList,
  DataListPage,
  type DataColumn,
  type PrimaryAction,
  type RowAction,
} from '@/studio/ui/data-list';
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  fetchCategoryProductCounts,
  reorderCategories,
  updateCategory,
  type CreateCategoryRequest,
  type WebsiteCategory,
} from '@/studio/api/categories';
import { errorMessage } from '@/studio/api/client';
import { useActiveWebsiteId } from '@/studio/stores/website-store';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import { notify } from '@/studio/ui/primitives/Toast';

import { EditCategoryDrawer } from './EditCategoryDrawer';

/** `product_count` null = jumlah produk gagal dimuat (tampil "—"). */
export interface CategoryRow extends WebsiteCategory {
  product_count: number | null;
}

const STATUS_OPTIONS = [
  { value: '1', label: 'Aktif' },
  { value: '0', label: 'Nonaktif' },
];

const PRODUCTS_PATH = '/studio/catalog';

export function CategoryListContent() {
  const websiteId = useActiveWebsiteId();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  /** sort_order tersimpan per id — dasar diff saat simpan urutan. */
  const sortRef = useRef<Map<string, number>>(new Map());

  const list = useDataList<CategoryRow>({
    mode: 'client',
    searchKeys: ['label', 'description'],
    filters: [
      { key: 'status', label: 'Status', allLabel: 'Semua status', kind: 'chip', options: STATUS_OPTIONS, getValue: (r) => (r.is_active ? '1' : '0') },
    ],
    load: async () => {
      if (!websiteId) return [];
      const [categories, counts] = await Promise.all([
        fetchCategories(websiteId),
        fetchCategoryProductCounts(websiteId).catch(() => null),
      ]);
      sortRef.current = new Map(categories.map((c) => [c.id, c.sort_order]));
      return categories.map((c) => ({ ...c, product_count: counts ? counts[c.id] ?? 0 : null }));
    },
  });

  const handleEdit = useCallback((row: CategoryRow) => {
    setEditing(row);
    setDrawerOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (row: CategoryRow) => {
      if (!websiteId) return;
      const used = row.product_count ?? 0;
      const ok = await confirm({
        title: `Hapus kategori "${row.label}"?`,
        description:
          used > 0
            ? `${used} produk memakai kategori ini. Produk tidak ikut terhapus, tetapi menjadi tanpa kategori.`
            : 'Kategori akan dihapus dan tidak dapat dipulihkan.',
        confirmLabel: 'Hapus kategori',
        tone: 'danger',
      });
      if (!ok) return;
      try {
        await deleteCategory(websiteId, row.id);
        list.removeRows([row.id]);
        notify.success('Kategori dihapus.');
      } catch (err) {
        notify.error(errorMessage(err, 'Gagal menghapus kategori.'));
      }
    },
    [confirm, websiteId, list],
  );

  const columns = useMemo<DataColumn<CategoryRow>[]>(() => {
    const actions: RowAction<CategoryRow>[] = [
      { key: 'edit', label: 'Edit', minRole: 'editor', onAction: handleEdit },
      { key: 'delete', label: 'Hapus', icon: 'trash', danger: true, minRole: 'admin', onAction: (r) => void handleDelete(r) },
    ];
    return [
      imageColumn<CategoryRow>({ key: 'image', header: 'Foto', getSrc: (r) => r.images[0], getAlt: (r) => `Foto ${r.label}` }),
      titleColumn<CategoryRow>({ header: 'Nama', getTitle: (r) => r.label, getSubtitle: (r) => r.description, onOpen: handleEdit }),
      {
        key: 'products',
        header: 'Produk',
        mobile: 'meta',
        render: (r) => <Pill tone={r.product_count ? 'primary' : 'default'}>{r.product_count === null ? '—' : `${r.product_count} produk`}</Pill>,
      },
      switchColumn<CategoryRow>({
        key: 'active',
        header: 'Aktif',
        getValue: (r) => r.is_active,
        ariaLabel: (r) => `Tampilkan di website: ${r.label}`,
        minRole: 'editor',
        onToggle: (r, next) => {
          if (!websiteId) return;
          void list.optimisticUpdate(r.id, { is_active: next }, () => updateCategory(websiteId, r.id, { is_active: next }), 'Gagal mengubah status kategori');
        },
      }),
      actionsColumn<CategoryRow>({ actions, getRowLabel: (r) => r.label }),
    ];
  }, [handleEdit, handleDelete, list, websiteId]);

  const handleReorderSave = useCallback(
    async (ordered: CategoryRow[]) => {
      if (!websiteId) return;
      sortRef.current = await reorderCategories(websiteId, ordered.map((r) => r.id), sortRef.current);
    },
    [websiteId],
  );

  const handleSave = useCallback(
    async (draft: CreateCategoryRequest) => {
      if (!websiteId) return;
      if (editing) {
        const saved = await updateCategory(websiteId, editing.id, draft);
        list.patchRow(saved.id, saved);
        notify.success('Kategori disimpan.');
      } else {
        const sortOrder = list.allRows.reduce((max, r) => Math.max(max, r.sort_order), -1) + 1;
        const saved = await createCategory(websiteId, { ...draft, sort_order: sortOrder });
        sortRef.current.set(saved.id, saved.sort_order);
        list.replaceRows([...list.allRows, { ...saved, product_count: 0 }]);
        notify.success('Kategori dibuat.');
      }
      setDrawerOpen(false);
      setEditing(null);
    },
    [websiteId, editing, list],
  );

  const primaryAction: PrimaryAction = {
    label: 'Tambah kategori',
    icon: 'plus',
    minRole: 'editor',
    onPress: () => {
      setEditing(null);
      setDrawerOpen(true);
    },
  };

  return (
    <div className="flex flex-col gap-6">
      <DataListPage
        title="Kategori"
        back={{ href: PRODUCTS_PATH, label: 'Produk dan Jasa' }}
        description="Kelompokkan produk dan jasa agar mudah ditemukan pembeli."
        list={list}
        columns={columns}
        getRowLabel={(r) => r.label}
        itemNoun="kategori"
        primaryAction={primaryAction}
        reorder={{ minRole: 'editor', onSave: handleReorderSave }}
        isRowMuted={(r) => !r.is_active}
        searchPlaceholder="Cari kategori…"
        emptyState={{ title: 'Belum ada kategori', description: 'Buat kategori pertama untuk mengelompokkan produk Anda.' }}
      />
      <EditCategoryDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        category={editing}
        onSave={handleSave}
      />
      {confirmDialog}
    </div>
  );
}
