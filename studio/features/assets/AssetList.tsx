'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  actionsColumn,
  dateColumn,
  Pill,
  useDataList,
  DataListPage,
  type DataColumn,
  type PrimaryAction,
  type RowAction,
} from '@/studio/ui/data-list';
import { errorMessage } from '@/studio/api/client';
import { deleteDigitalAsset, fetchDigitalAssets, type WebsiteAsset } from '@/studio/api/digital-assets';
import { useActiveWebsiteId } from '@/studio/stores/website-store';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import { notify } from '@/studio/ui/primitives/Toast';

import { AssetDrawer } from './AssetDrawer';
import { KIND_OPTIONS, assetKind, extensionBadge, formatBytes } from './asset-utils';

const KIND_LABEL = Object.fromEntries(KIND_OPTIONS.map((o) => [o.value, o.label]));

export function AssetListContent() {
  const websiteId = useActiveWebsiteId();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteAsset | null>(null);

  const list = useDataList<WebsiteAsset>({
    mode: 'client',
    searchKeys: ['name', 'filename', 'description'],
    filters: [
      { key: 'kind', label: 'Jenis file', allLabel: 'Semua jenis', kind: 'chip', options: [...KIND_OPTIONS], getValue: (a) => assetKind(a) },
    ],
    load: async () => {
      if (!websiteId) return [];
      const rows = await fetchDigitalAssets(websiteId);
      return rows.filter((a) => a.asset_type === 'downloadable');
    },
  });

  const handleEdit = useCallback((row: WebsiteAsset) => {
    setEditing(row);
    setDrawerOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (row: WebsiteAsset) => {
      if (!websiteId) return;
      const ok = await confirm({
        title: `Hapus asset "${row.name}"?`,
        description: 'File akan dihapus permanen. Asset yang masih terpasang di produk atau sudah dikirim ke pembeli tidak bisa dihapus.',
        confirmLabel: 'Hapus asset',
        tone: 'danger',
      });
      if (!ok) return;
      try {
        await deleteDigitalAsset(websiteId, row.id);
        list.removeRows([row.id]);
        notify.success('Asset dihapus.');
      } catch (err) {
        notify.error(errorMessage(err, 'Gagal menghapus asset. Lepas dulu dari produk yang memakainya.'));
      }
    },
    [confirm, websiteId, list],
  );

  const columns = useMemo<DataColumn<WebsiteAsset>[]>(() => {
    const actions: RowAction<WebsiteAsset>[] = [
      { key: 'edit', label: 'Edit', minRole: 'editor', onAction: handleEdit },
      { key: 'delete', label: 'Hapus', icon: 'trash', danger: true, minRole: 'editor', onAction: (r) => void handleDelete(r) },
    ];
    return [
      {
        key: 'badge',
        header: 'Tipe',
        mobile: 'media',
        hideHeader: true,
        render: (r) => (
          <span aria-label={`File ${extensionBadge(r)}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-medium bg-primary-50 text-[10px] font-extrabold text-primary">
            {extensionBadge(r)}
          </span>
        ),
      },
      {
        key: 'name',
        header: 'Nama',
        mobile: 'title',
        render: (r) => (
          <div className="min-w-0 md:max-w-[26rem]">
            <button type="button" onClick={() => handleEdit(r)} title={r.name} className="block w-full truncate text-left text-sm font-bold text-foreground hover:text-primary">
              {r.name}
            </button>
            <p className="mt-0.5 truncate text-[13px] text-default-600">{r.description || r.filename}</p>
          </div>
        ),
      },
      {
        key: 'kind',
        header: 'Jenis',
        mobile: 'meta',
        render: (r) => <Pill>{KIND_LABEL[assetKind(r)]}</Pill>,
      },
      {
        key: 'size',
        header: 'Ukuran',
        align: 'end',
        mobile: 'meta',
        render: (r) => <span className="whitespace-nowrap text-sm tabular-nums text-default-600">{formatBytes(r.size_bytes)}</span>,
      },
      dateColumn<WebsiteAsset>({ key: 'updated', header: 'Diperbarui', getValue: (r) => r.updated_at }),
      actionsColumn<WebsiteAsset>({ actions, getRowLabel: (r) => r.name }),
    ];
  }, [handleEdit, handleDelete]);

  const handleSaved = useCallback(
    (saved: WebsiteAsset, mode: 'create' | 'update') => {
      if (mode === 'create') list.replaceRows([saved, ...list.allRows]);
      else list.patchRow(saved.id, saved);
      if (mode === 'create') {
        setDrawerOpen(false);
        setEditing(null);
      } else {
        setEditing(saved);
        setDrawerOpen(false);
      }
    },
    [list],
  );

  const primaryAction: PrimaryAction = {
    label: 'Unggah asset',
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
        title="Digital Asset"
        description="File digital privat untuk produk yang diunduh pembeli."
        list={list}
        columns={columns}
        getRowLabel={(r) => r.name}
        itemNoun="asset"
        primaryAction={primaryAction}
        searchPlaceholder="Cari nama atau file…"
        emptyState={{ title: 'Belum ada asset', description: 'Unggah file pertama, lalu pasang di produk digital.' }}
      />
      <AssetDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        asset={editing}
        onSaved={handleSaved}
      />
      {confirmDialog}
    </div>
  );
}
