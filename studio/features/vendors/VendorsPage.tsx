'use client';

import { useCallback, useMemo, useState } from 'react';

import { fetchLocations, type WebsiteLocationRow } from '@/studio/api/locations';
import {
  createVendor,
  deactivateVendor,
  fetchVendors,
  updateVendor,
  type VendorDraft,
  type WebsiteVendor,
} from '@/studio/api/vendors';
import { errorMessage } from '@/studio/api/client';
import { useActiveWebsiteId } from '@/studio/stores/website-store';
import {
  actionsColumn,
  DataListPage,
  Pill,
  selectFilter,
  useDataList,
  type DataColumn,
  type PrimaryAction,
  type RowAction,
} from '@/studio/ui/data-list';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import { notify } from '@/studio/ui/primitives/Toast';

import { EditVendorDrawer } from './EditVendorDrawer';

function coverageNames(vendor: WebsiteVendor): string[] {
  return vendor.vendor_locations.map((coverage) => coverage.location?.name ?? coverage.location_id);
}

function createColumns(
  onEdit: (vendor: WebsiteVendor) => void,
  onDeactivate: (vendor: WebsiteVendor) => void,
  onActivate: (vendor: WebsiteVendor) => void,
): DataColumn<WebsiteVendor>[] {
  const actions: RowAction<WebsiteVendor>[] = [
    { key: 'edit', label: 'Edit', minRole: 'editor', onAction: onEdit },
    {
      key: 'activate',
      label: 'Aktifkan kembali',
      minRole: 'editor',
      isHidden: (vendor) => vendor.status !== 'inactive',
      onAction: onActivate,
    },
    {
      key: 'deactivate',
      label: 'Nonaktifkan',
      icon: 'trash',
      danger: true,
      minRole: 'admin',
      isHidden: (vendor) => vendor.status !== 'active',
      onAction: onDeactivate,
    },
  ];

  return [
    {
      key: 'name',
      header: 'Vendor',
      mobile: 'title',
      render: (vendor, ctx) => (
        <div className="min-w-0 md:max-w-[22rem]">
          {ctx.canAct('editor') ? (
            <button type="button" onClick={() => onEdit(vendor)} className="block max-w-full truncate text-left text-sm font-bold text-foreground hover:text-primary">
              {vendor.name}
            </button>
          ) : (
            <span className="block max-w-full truncate text-sm font-bold text-foreground">{vendor.name}</span>
          )}
          <p className="mt-0.5 truncate text-[13px] text-default-600">{vendor.contact_whatsapp || 'Kontak belum ditambahkan'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      mobile: 'meta',
      render: (vendor) => <Pill tone={vendor.status === 'active' ? 'success' : 'default'}>{vendor.status === 'active' ? 'Aktif' : 'Nonaktif'}</Pill>,
    },
    {
      key: 'coverage',
      header: 'Lokasi layanan',
      mobile: 'subtitle',
      render: (vendor) => {
        const names = coverageNames(vendor);
        return names.length ? (
          <div className="flex max-w-[25rem] flex-wrap gap-1.5">
            {names.slice(0, 3).map((name, index) => <Pill key={`${vendor.id}-${index}`}>{name}</Pill>)}
            {names.length > 3 && <Pill tone="primary">+{names.length - 3}</Pill>}
          </div>
        ) : <span className="text-[13px] text-default-500">Belum ada lokasi layanan</span>;
      },
    },
    {
      key: 'notes',
      header: 'Catatan',
      mobile: 'meta',
      render: (vendor) => <span className="block max-w-[18rem] truncate text-[13px] text-default-600">{vendor.notes || '—'}</span>,
    },
    actionsColumn({ actions, getRowLabel: (vendor) => vendor.name }),
  ];
}

export function VendorsPage() {
  const websiteId = useActiveWebsiteId();
  const { confirm, dialog } = useConfirm();
  const [locations, setLocations] = useState<WebsiteLocationRow[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteVendor | null>(null);

  const filters = useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      allLabel: 'Semua status',
      options: [{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }],
      getValue: (vendor: WebsiteVendor) => vendor.status,
      kind: 'chip' as const,
    },
    selectFilter<WebsiteVendor>({
      key: 'location',
      label: 'Lokasi',
      options: locations.map((location) => ({ value: location.id, label: location.name })),
      getValue: (vendor) => vendor.vendor_locations.map((coverage) => coverage.location_id),
    }),
  ], [locations]);

  const list = useDataList<WebsiteVendor>({
    mode: 'client',
    searchKeys: ['name', 'contact_whatsapp', 'notes'],
    filters,
    load: async () => {
      if (!websiteId) return [];
      const [vendors, locationOptions] = await Promise.all([
        fetchVendors(websiteId),
        fetchLocations(websiteId),
      ]);
      setLocations(locationOptions);
      return vendors;
    },
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    setDrawerOpen(true);
  }, []);

  const openEdit = useCallback((vendor: WebsiteVendor) => {
    setEditing(vendor);
    setDrawerOpen(true);
  }, []);

  const handleSave = useCallback(async (draft: VendorDraft) => {
    if (!websiteId) throw new Error('Website aktif tidak ditemukan.');
    if (editing) {
      const saved = await updateVendor(websiteId, editing.id, draft);
      list.patchRow(saved.id, saved);
      notify.success('Vendor diperbarui.');
    } else {
      const saved = await createVendor(websiteId, draft);
      list.replaceRows([saved, ...list.allRows]);
      notify.success('Vendor ditambahkan.');
    }
    setDrawerOpen(false);
    setEditing(null);
  }, [editing, list, websiteId]);

  const handleDeactivate = useCallback(async (vendor: WebsiteVendor) => {
    if (!websiteId) return;
    const confirmed = await confirm({
      title: `Nonaktifkan vendor "${vendor.name}"?`,
      description: 'Vendor tidak akan dihapus permanen. Anda dapat mengaktifkannya kembali nanti.',
      confirmLabel: 'Nonaktifkan',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await deactivateVendor(websiteId, vendor.id);
      list.patchRow(vendor.id, { status: 'inactive' });
      notify.success('Vendor dinonaktifkan.');
    } catch (err) {
      notify.error(errorMessage(err, 'Gagal menonaktifkan vendor.'));
    }
  }, [confirm, list, websiteId]);

  const handleActivate = useCallback(async (vendor: WebsiteVendor) => {
    if (!websiteId) return;
    try {
      const saved = await updateVendor(websiteId, vendor.id, { status: 'active' });
      list.patchRow(saved.id, saved);
      notify.success('Vendor diaktifkan kembali.');
    } catch (err) {
      notify.error(errorMessage(err, 'Gagal mengaktifkan vendor.'));
    }
  }, [list, websiteId]);

  const columns = useMemo(
    () => createColumns(openEdit, (vendor) => void handleDeactivate(vendor), (vendor) => void handleActivate(vendor)),
    [handleActivate, handleDeactivate, openEdit],
  );

  const primaryAction: PrimaryAction = {
    label: 'Tambah vendor',
    icon: 'plus',
    minRole: 'editor',
    onPress: openCreate,
  };

  return (
    <div className="flex flex-col gap-6">
      <DataListPage
        title="Vendor"
        description="Kelola mitra pelaksana dan lokasi layanan mereka. Penugasan pesanan tetap manual."
        list={list}
        columns={columns}
        getRowLabel={(vendor) => vendor.name}
        itemNoun="vendor"
        primaryAction={primaryAction}
        searchPlaceholder="Cari nama, WhatsApp, atau catatan..."
        emptyState={{ title: 'Belum ada vendor', description: 'Tambahkan vendor untuk mengelola mitra pelaksana.' }}
      />
      <EditVendorDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        vendor={editing}
        locations={locations}
        onSave={handleSave}
      />
      {dialog}
    </div>
  );
}
