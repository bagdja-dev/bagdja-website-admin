'use client';

import { useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem } from '@heroui/react';

import { useDataList, DataListPage, type BulkAction, type DataColumn, type PrimaryAction } from '@/studio/ui/data-list';
import { useActiveWebsiteId } from '@/studio/stores/website-store';
import { fetchPages, createPage, updatePage, deletePage, reorderPages, type WebsitePage } from '@/studio/api/pages';
import { slugify } from '@/studio/lib/slug';
import { Icon } from '@/studio/ui/icons';
import { notify } from '@/studio/ui/primitives/Toast';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';

export interface PageRow extends WebsitePage {}

const PAGE_PLACEMENT_OPTIONS: Array<{ value: WebsitePage['placement']; label: string }> = [
  { value: 'regular', label: 'Navigasi utama' },
  { value: 'header', label: 'Navigasi header' },
  { value: 'footer', label: 'Navigasi footer' },
];

export function usePageList() {
  const websiteId = useActiveWebsiteId();
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [addPageOpen, setAddPageOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [creatingPage, setCreatingPage] = useState(false);
  const [addPageError, setAddPageError] = useState<string | null>(null);
  const [updatingPageId, setUpdatingPageId] = useState<string | null>(null);

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
      setNewPageTitle('');
      setAddPageError(null);
      setAddPageOpen(true);
    },
  };

  const handleCreatePage = useCallback(async () => {
    const title = newPageTitle.trim();
    if (!title) {
      setAddPageError('Judul halaman wajib diisi.');
      return;
    }
    const slug = slugify(title);
    if (!slug) {
      setAddPageError('Judul halaman harus memiliki huruf atau angka agar bisa dibuat menjadi alamat halaman.');
      return;
    }
    if (!websiteId) {
      setAddPageError('Pilih website aktif sebelum menambahkan halaman.');
      return;
    }

    setCreatingPage(true);
    setAddPageError(null);
    try {
      const created = await createPage(websiteId, { title, slug });
      list.replaceRows([created, ...list.rows]);
      setAddPageOpen(false);
      notify.success('Halaman dibuat.');
    } catch {
      setAddPageError('Gagal membuat halaman. Coba lagi.');
      notify.error('Gagal membuat halaman.');
    } finally {
      setCreatingPage(false);
    }
  }, [list, newPageTitle, websiteId]);

  const changePagePlacement = useCallback(async (page: PageRow, placement: WebsitePage['placement']) => {
    if (!websiteId || page.placement === placement || updatingPageId) return;
    setUpdatingPageId(page.id);
    try {
      const updated = await updatePage(websiteId, page.id, { placement });
      list.replaceRows(list.rows.map((row) => row.id === page.id ? { ...row, placement: updated.placement } : row));
      notify.success('Posisi halaman di navigasi diperbarui.');
    } catch {
      notify.error(`Gagal memperbarui navigasi "${page.title}".`);
    } finally {
      setUpdatingPageId(null);
    }
  }, [list, updatingPageId, websiteId]);

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
      key: 'placement',
      header: 'Posisi navigasi',
      mobile: 'trailing',
      render: (row, ctx) => (
        <Select
          aria-label={`Posisi navigasi ${row.title}`}
          selectedKeys={[row.placement]}
          onChange={(event) => {
            const option = PAGE_PLACEMENT_OPTIONS.find((item) => item.value === event.target.value);
            if (option) void changePagePlacement(row, option.value);
          }}
          isDisabled={!ctx.canAct('editor') || updatingPageId !== null}
          isLoading={updatingPageId === row.id}
          className="w-full sm:max-w-[200px]"
          size="sm"
          variant="bordered"
        >
          {PAGE_PLACEMENT_OPTIONS.map((option) => (
            <SelectItem key={option.value}>{option.label}</SelectItem>
          ))}
        </Select>
      ),
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
  ], [router, handleDeleteRow, websiteId, changePagePlacement, updatingPageId]);

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
    addPageDialog: (
      <Modal
        isOpen={addPageOpen}
        onOpenChange={(open) => {
          if (!open && !creatingPage) setAddPageOpen(false);
        }}
        placement="center"
        isDismissable={!creatingPage}
        hideCloseButton
        classNames={{
          base: 'max-w-[460px] rounded-[18px] shadow-[0_24px_60px_rgba(24,24,27,0.25)]',
          backdrop: 'bg-[rgba(24,24,27,0.45)]',
        }}
      >
        <ModalContent>
          <ModalHeader className="px-6 pb-0 pt-6 text-xl font-extrabold">Tambah halaman</ModalHeader>
          <ModalBody className="gap-3 px-6 py-4">
            <p className="text-sm text-default-600">Beri judul untuk halaman baru website kamu.</p>
            <Input
              autoFocus
              label="Judul halaman"
              placeholder="Contoh: Tentang Kami"
              value={newPageTitle}
              onValueChange={(value) => {
                setNewPageTitle(value);
                if (addPageError) setAddPageError(null);
              }}
              isInvalid={Boolean(addPageError)}
              errorMessage={addPageError}
              isDisabled={creatingPage}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleCreatePage();
                }
              }}
            />
          </ModalBody>
          <ModalFooter className="flex flex-wrap justify-end gap-2.5 px-6 pb-6 pt-0">
            <Button
              variant="bordered"
              radius="sm"
              isDisabled={creatingPage}
              onPress={() => setAddPageOpen(false)}
            >
              Batal
            </Button>
            <Button
              color="primary"
              radius="sm"
              isLoading={creatingPage}
              onPress={() => void handleCreatePage()}
            >
              Buat halaman
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    ),
  };
}

export function PageList() {
  const { list, columns, bulkActions, primaryAction, handleReorderSave, confirmDialog, addPageDialog } = usePageList();

  return (
    <div className="flex flex-col gap-6">
      <DataListPage
        title="Halaman Website"
        description="Atur halaman, posisi di navigasi website, dan susunan section. Hero selalu tampil paling atas."
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
      {addPageDialog}
    </div>
  );
}
