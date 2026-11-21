'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { useActiveWebsiteId } from '@/studio/stores/website-store';
import { useDataList, DataListPage, type BulkAction, type DataColumn } from '@/studio/ui/data-list';
import { fetchClients, removeClient, type WebsiteClientDto } from '@/studio/api/company-profile';
import { notify } from '@/studio/ui/primitives/Toast';

export function ClientList() {
  const websiteId = useActiveWebsiteId();
  const router = useRouter();
  const list = useDataList<WebsiteClientDto>({ mode: 'client', searchKeys: ['website_url'], filters: [{ key: 'status', label: 'Status', allLabel: 'Semua status', kind: 'chip', options: [{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Tidak aktif' }], getValue: (row) => row.is_active ? 'active' : 'inactive' }], load: async () => websiteId ? await fetchClients(websiteId) : [] });
  const bulkActions: BulkAction<WebsiteClientDto>[] = useMemo(() => [{ key: 'delete', label: 'Hapus', danger: true, minRole: 'admin', confirm: { title: 'Hapus klien terpilih?', confirmLabel: 'Hapus' }, onRun: async (rows) => { if (!websiteId) return; for (const row of rows) await removeClient(websiteId, row.id); await list.reload(); notify.success('Klien terpilih dihapus.'); } }], [websiteId, list]);
  const columns: DataColumn<WebsiteClientDto>[] = useMemo(() => [
    { key: 'name', header: 'Klien', mobile: 'title', render: (row) => <div><div className="font-medium text-foreground">{row.translations?.find((t) => t.locale === 'id')?.name ?? 'Klien'}</div><div className="mt-0.5 text-xs text-default-500">{row.translations?.find((t) => t.locale === 'id')?.description ?? '—'}</div></div> },
    { key: 'status', header: 'Status', mobile: 'meta', render: (row) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.is_active ? 'bg-success-50 text-success-700' : 'bg-default-100 text-default-600'}`}>{row.is_active ? 'Aktif' : 'Tidak aktif'}</span> },
    { key: 'url', header: 'Website', mobile: 'hidden', render: (row) => <span className="max-w-64 truncate text-xs text-default-600">{row.website_url ?? '—'}</span> },
    { key: 'actions', header: '', hideHeader: true, mobile: 'actions', minRole: 'editor', render: (row) => <button type="button" onClick={() => router.push(`/studio/clients/${row.id}`)} className="min-h-8 rounded-[8px] border border-default-300 px-3 text-xs font-semibold text-default-700">Edit</button> },
  ], [router]);
  return <DataListPage title="Klien" description="Kelola daftar klien yang ditampilkan website." list={list} columns={columns} getRowLabel={(row) => row.translations?.[0]?.name ?? 'Klien'} itemNoun="klien" searchPlaceholder="Cari klien" primaryAction={{ label: 'Tambah klien', href: '/studio/clients/new', minRole: 'editor' }} bulkActions={bulkActions} emptyState={{ title: 'Belum ada klien', description: 'Tambahkan klien pertama.' }} />;
}
