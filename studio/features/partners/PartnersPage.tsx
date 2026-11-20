'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  fetchLanguages,
  fetchPartnerCategories,
  fetchPartners,
  removePartner,
  type PartnerCategoryDto,
  type WebsiteLanguageDto,
  type WebsitePartnerDto,
} from '@/studio/api/company-profile';
import { errorMessage } from '@/studio/api/client';
import { fetchLocations, type WebsiteLocationRow } from '@/studio/api/locations';
import { useActiveWebsiteId } from '@/studio/stores/website-store';
import {
  actionsColumn,
  DataListPage,
  Pill,
  selectFilter,
  useDataList,
  type BulkAction,
  type DataColumn,
} from '@/studio/ui/data-list';
import { notify } from '@/studio/ui/primitives/Toast';

import { PartnerEditorDrawer } from './PartnerEditorDrawer';
import { PartnerCategoriesPage } from './PartnerCategoriesPage';

function createColumns(onEdit: (partner: WebsitePartnerDto) => void): DataColumn<WebsitePartnerDto>[] {
  return [
    {
      key: 'name',
      header: 'Partner',
      mobile: 'title',
      render: (partner) => (
        <div className="flex items-center gap-3">
          {partner.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL gambar dari storage tenant
            <img src={partner.logo_url} alt="" className="h-10 w-10 rounded-lg border border-default-200 object-contain p-1" />
          ) : <span className="h-10 w-10 rounded-lg border border-default-200 bg-default-50" />}
          <div className="min-w-0">
            <button type="button" onClick={() => onEdit(partner)} className="block max-w-full truncate text-left text-sm font-bold text-foreground hover:text-primary">{partner.name}</button>
            <p className="truncate text-xs text-default-500">{partner.contact_whatsapp || partner.website_url || 'Kontak belum ditambahkan'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Peran',
      mobile: 'meta',
      render: (partner) => <div className="flex flex-wrap gap-1">{partner.is_client && <Pill tone="primary">Klien</Pill>}{partner.is_provider && <Pill>Penyedia</Pill>}</div>,
    },
    {
      key: 'categories',
      header: 'Kategori',
      mobile: 'subtitle',
      render: (partner) => partner.categories.length
        ? <div className="flex flex-wrap gap-1">{partner.categories.map((category) => <Pill key={category.id}>{category.name}</Pill>)}</div>
        : <span className="text-xs text-default-500">Belum dikategorikan</span>,
    },
    {
      key: 'status',
      header: 'Status',
      mobile: 'meta',
      render: (partner) => <div className="flex flex-wrap gap-1"><Pill tone={partner.is_active ? 'success' : 'default'}>{partner.is_active ? 'Aktif' : 'Nonaktif'}</Pill>{partner.is_public && <Pill tone="primary">Publik</Pill>}</div>,
    },
    actionsColumn({
      actions: [{ key: 'edit', label: 'Edit', minRole: 'editor', onAction: onEdit }],
      getRowLabel: (partner) => partner.name,
    }),
  ];
}

export function PartnersPage() {
  const websiteId = useActiveWebsiteId();
  const [categories, setCategories] = useState<PartnerCategoryDto[]>([]);
  const [languages, setLanguages] = useState<WebsiteLanguageDto[]>([]);
  const [locations, setLocations] = useState<WebsiteLocationRow[]>([]);
  const [partnerMetadataLoading, setPartnerMetadataLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<WebsitePartnerDto | null>(null);
  const [view, setView] = useState<'partners' | 'categories'>('partners');

  useEffect(() => {
    let active = true;
    if (!websiteId) {
      setPartnerMetadataLoading(false);
      return;
    }

    setPartnerMetadataLoading(true);
    Promise.all([
      fetchPartnerCategories(websiteId),
      fetchLocations(websiteId),
      fetchLanguages(websiteId),
    ])
      .then(([nextCategories, nextLocations, nextLanguages]) => {
        if (!active) return;
        setCategories(nextCategories);
        setLocations(nextLocations);
        setLanguages(nextLanguages.filter((language) => language.is_active || language.is_default));
      })
      .catch((error: unknown) => {
        if (active) notify.error('Gagal memuat kategori, bahasa, atau lokasi partner.', errorMessage(error));
      })
      .finally(() => {
        if (active) setPartnerMetadataLoading(false);
      });

    return () => {
      active = false;
    };
  }, [websiteId]);

  const list = useDataList<WebsitePartnerDto>({
    mode: 'client',
    searchKeys: ['name', 'contact_whatsapp', 'notes'],
    filters: [
      {
        key: 'role',
        label: 'Peran',
        allLabel: 'Semua peran',
        kind: 'chip',
        options: [{ value: 'client', label: 'Klien' }, { value: 'provider', label: 'Penyedia' }, { value: 'both', label: 'Keduanya' }],
        getValue: (partner) => partner.is_client && partner.is_provider ? 'both' : partner.is_client ? 'client' : 'provider',
      },
      {
        key: 'status',
        label: 'Status',
        allLabel: 'Semua status',
        kind: 'chip',
        options: [{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }],
        getValue: (partner) => partner.is_active ? 'active' : 'inactive',
      },
      selectFilter<WebsitePartnerDto>({
        key: 'category',
        label: 'Kategori',
        options: categories.map((category) => ({ value: category.id, label: category.name })),
        getValue: (partner) => partner.categories.map((category) => category.id),
      }),
    ],
    load: async () => {
      if (!websiteId) return [];
      return fetchPartners(websiteId);
    },
  });

  const bulkActions: BulkAction<WebsitePartnerDto>[] = useMemo(() => [{
    key: 'deactivate',
    label: 'Nonaktifkan',
    danger: true,
    minRole: 'admin',
    confirm: { title: 'Nonaktifkan partner terpilih?', confirmLabel: 'Nonaktifkan' },
    onRun: async (rows) => {
      if (!websiteId) return;
      try {
        for (const row of rows) await removePartner(websiteId, row.id);
        await list.reload();
        notify.success('Partner terpilih dinonaktifkan.');
      } catch (error) {
        notify.error('Gagal menonaktifkan partner.', errorMessage(error));
      }
    },
  }], [websiteId, list]);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };
  const openEdit = (partner: WebsitePartnerDto) => {
    setEditing(partner);
    setDrawerOpen(true);
  };
  const handleSaved = (partner: WebsitePartnerDto, created: boolean) => {
    if (created) list.replaceRows([partner, ...list.allRows]);
    else list.patchRow(partner.id, partner);
    void list.reload();
    notify.success(created ? 'Partner ditambahkan.' : 'Partner diperbarui.');
  };

  const columns = useMemo(() => createColumns(openEdit), []);

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Kelola partner" className="flex gap-1 border-b border-default-200">
        {([
          { key: 'partners', label: 'Daftar partner' },
          { key: 'categories', label: 'Kategori' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={view === tab.key}
            onClick={() => setView(tab.key)}
            className={`min-h-[40px] border-b-2 px-4 text-sm font-medium transition-colors ${
              view === tab.key ? 'border-primary text-primary' : 'border-transparent text-default-500 hover:bg-default-50 hover:text-default-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {view === 'partners' ? (
        <>
          <DataListPage
            title="Partner"
            description="Kelola satu identitas untuk klien dan penyedia; kategori publik dapat dipakai untuk memfilter widget renderer."
            list={list}
            columns={columns}
            getRowLabel={(partner) => partner.name}
            itemNoun="partner"
            primaryAction={{ label: 'Tambah partner', icon: 'plus', minRole: 'editor', onPress: openCreate }}
            bulkActions={bulkActions}
            searchPlaceholder="Cari nama, WhatsApp, atau catatan..."
            emptyState={{ title: 'Belum ada partner', description: 'Tambahkan klien, penyedia, atau partner yang berperan ganda.' }}
          />
          <PartnerEditorDrawer
            websiteId={websiteId ?? ''}
            isOpen={drawerOpen}
            partner={editing}
            languages={languages}
            categories={categories}
            categoriesLoading={partnerMetadataLoading}
            locations={locations}
            onClose={() => { setDrawerOpen(false); setEditing(null); }}
            onSaved={handleSaved}
          />
        </>
      ) : (
        <PartnerCategoriesPage onCategoriesChange={setCategories} />
      )}
    </div>
  );
}
