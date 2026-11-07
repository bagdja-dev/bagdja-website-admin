'use client';

import { useCallback, useMemo, useState } from 'react';

import { errorMessage } from '@/studio/api/client';
import {
  createLocation,
  deleteLocation,
  fetchLocations,
  setPrimaryLocation,
  updateLocation,
  type LocationDraft,
  type WebsiteLocationRow,
} from '@/studio/api/locations';
import { useActiveWebsiteId } from '@/studio/stores/website-store';
import {
  actionsColumn,
  DataListPage,
  Pill,
  useDataList,
  type DataColumn,
  type PrimaryAction,
  type RowAction,
} from '@/studio/ui/data-list';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import { notify } from '@/studio/ui/primitives/Toast';

import { EditLocationDrawer } from './EditLocationDrawer';

const TYPE_LABELS: Record<string, string> = {
  branch: 'Cabang',
  warehouse: 'Gudang',
  pickup: 'Pickup',
  office: 'Kantor',
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));
const STATUS_OPTIONS = [
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
];

function locationAddress(location: WebsiteLocationRow): string {
  return [location.address_line, location.city, location.province].filter(Boolean).join(', ') || 'Alamat belum diisi';
}

function createColumns(
  onEdit: (row: WebsiteLocationRow) => void,
  onSetPrimary: (row: WebsiteLocationRow) => void,
  onDelete: (row: WebsiteLocationRow) => void,
): DataColumn<WebsiteLocationRow>[] {
  const actions: RowAction<WebsiteLocationRow>[] = [
    { key: 'edit', label: 'Edit', minRole: 'editor', onAction: onEdit },
    {
      key: 'set-primary',
      label: 'Jadikan lokasi utama',
      minRole: 'editor',
      isHidden: (row) => row.type !== 'branch' || row.is_primary,
      onAction: onSetPrimary,
    },
    { key: 'delete', label: 'Hapus', icon: 'trash', danger: true, minRole: 'admin', onAction: onDelete },
  ];

  return [
    {
      key: 'location',
      header: 'Lokasi',
      mobile: 'title',
      render: (row, ctx) => {
        const title = ctx.canAct('editor') ? (
          <button type="button" onClick={() => onEdit(row)} className="block max-w-full truncate text-left text-sm font-bold text-foreground hover:text-primary">
            {row.name}
          </button>
        ) : (
          <span className="block max-w-full truncate text-sm font-bold text-foreground">{row.name}</span>
        );
        return (
          <div className="min-w-0 md:max-w-[26rem]">
            {title}
            <p className={`mt-0.5 text-[13px] text-default-600 ${ctx.variant === 'card' ? 'line-clamp-2' : 'truncate'}`}>
              {locationAddress(row)}
            </p>
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'Tipe',
      mobile: 'meta',
      render: (row) => <Pill>{TYPE_LABELS[row.type] ?? row.type}</Pill>,
    },
    {
      key: 'primary',
      header: 'Utama',
      mobile: 'meta',
      render: (row) => row.is_primary ? <Pill tone="warning">Lokasi utama</Pill> : <span className="text-sm text-default-400">—</span>,
    },
    {
      key: 'shipping',
      header: 'Area pengiriman',
      mobile: 'meta',
      render: (row) => <span className="text-sm text-default-600">{row.shipping_area_name || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      mobile: 'meta',
      render: (row) => <Pill tone={row.is_active ? 'success' : 'default'}>{row.is_active ? 'Aktif' : 'Nonaktif'}</Pill>,
    },
    {
      key: 'public',
      header: 'Tampilan website',
      mobile: 'meta',
      render: (row) => <span className="text-sm text-default-600">{row.is_public ? 'Publik' : 'Privat'}</span>,
    },
    actionsColumn({ actions, getRowLabel: (row) => row.name }),
  ];
}

export function LocationsPage() {
  const websiteId = useActiveWebsiteId();
  const { confirm, dialog } = useConfirm();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteLocationRow | null>(null);

  const list = useDataList<WebsiteLocationRow>({
    mode: 'client',
    searchKeys: ['name', 'address_line', 'city', 'province', 'postal_code', 'shipping_area_name'],
    filters: [
      { key: 'type', label: 'Tipe', allLabel: 'Semua tipe', options: TYPE_OPTIONS, getValue: (row) => row.type, kind: 'chip' },
      { key: 'status', label: 'Status', allLabel: 'Semua status', options: STATUS_OPTIONS, getValue: (row) => row.is_active ? 'active' : 'inactive', kind: 'chip' },
    ],
    load: async () => websiteId ? fetchLocations(websiteId) : [],
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    setDrawerOpen(true);
  }, []);

  const openEdit = useCallback((row: WebsiteLocationRow) => {
    setEditing(row);
    setDrawerOpen(true);
  }, []);

  const handleDelete = useCallback(async (row: WebsiteLocationRow) => {
    if (!websiteId) return;
    const confirmed = await confirm({
      title: `Hapus lokasi "${row.name}"?`,
      description: 'Lokasi ini akan dihapus permanen dan tidak dapat dipulihkan.',
      confirmLabel: 'Hapus lokasi',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteLocation(websiteId, row.id);
      list.removeRows([row.id]);
      notify.success('Lokasi dihapus.');
    } catch (err) {
      notify.error(errorMessage(err, 'Gagal menghapus lokasi.'));
    }
  }, [confirm, list, websiteId]);

  const handleSetPrimary = useCallback(async (row: WebsiteLocationRow) => {
    if (!websiteId) return;
    try {
      const saved = await setPrimaryLocation(websiteId, row.id);
      list.replaceRows(list.allRows.map((item) => ({
        ...item,
        is_primary: item.id === saved.id,
      })));
      notify.success(`${row.name} menjadi lokasi utama.`);
    } catch (err) {
      notify.error(errorMessage(err, 'Gagal mengatur lokasi utama.'));
    }
  }, [list, websiteId]);

  const columns = useMemo(
    () => createColumns(openEdit, (row) => void handleSetPrimary(row), (row) => void handleDelete(row)),
    [handleDelete, handleSetPrimary, openEdit],
  );

  const handleSave = useCallback(async (draft: LocationDraft) => {
    if (!websiteId) throw new Error('Website aktif tidak ditemukan.');
    if (editing) {
      const saved = await updateLocation(websiteId, editing.id, draft);
      list.patchRow(saved.id, saved);
      notify.success('Lokasi diperbarui.');
    } else {
      const saved = await createLocation(websiteId, draft);
      list.replaceRows([saved, ...list.allRows]);
      notify.success('Lokasi ditambahkan.');
    }
    setDrawerOpen(false);
    setEditing(null);
  }, [editing, list, websiteId]);

  const primaryAction: PrimaryAction = {
    label: 'Tambah lokasi',
    icon: 'plus',
    minRole: 'editor',
    onPress: openCreate,
  };

  return (
    <div className="flex flex-col gap-6">
      <DataListPage
        title="Lokasi"
        description="Kelola cabang, gudang, titik pickup, dan lokasi layanan."
        list={list}
        columns={columns}
        getRowLabel={(row) => row.name}
        itemNoun="lokasi"
        primaryAction={primaryAction}
        searchPlaceholder="Cari nama, alamat, atau area pengiriman..."
        emptyState={{ title: 'Belum ada lokasi', description: 'Tambahkan lokasi pertama untuk mengatur cabang dan titik layanan.' }}
      />
      <EditLocationDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        location={editing}
        onSave={handleSave}
      />
      {dialog}
    </div>
  );
}
