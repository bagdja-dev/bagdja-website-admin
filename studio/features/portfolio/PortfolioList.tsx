'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { useActiveWebsiteId } from '@/studio/stores/website-store';
import { useDataList, DataListPage, type BulkAction, type DataColumn } from '@/studio/ui/data-list';
import { fetchPortfolioProjects, removePortfolioProject, type PortfolioProjectDto } from '@/studio/api/company-profile';
import { notify } from '@/studio/ui/primitives/Toast';

export function PortfolioList() {
  const websiteId = useActiveWebsiteId();
  const router = useRouter();
  const list = useDataList<PortfolioProjectDto>({
    mode: 'client', searchKeys: ['name', 'slug', 'project_type'],
    filters: [{ key: 'status', label: 'Status', allLabel: 'Semua status', kind: 'chip', options: [{ value: 'published', label: 'Terbit' }, { value: 'draft', label: 'Draft' }], getValue: (row) => row.is_published ? 'published' : 'draft' }],
    load: async () => websiteId ? await fetchPortfolioProjects(websiteId) : [],
  });
  const bulkActions: BulkAction<PortfolioProjectDto>[] = useMemo(() => [{ key: 'delete', label: 'Hapus', danger: true, minRole: 'admin', confirm: { title: 'Hapus proyek terpilih?', confirmLabel: 'Hapus' }, onRun: async (rows) => {
    if (!websiteId) return;
    for (const row of rows) await removePortfolioProject(websiteId, row.id);
    await list.reload(); notify.success('Proyek terpilih dihapus.');
  } }], [websiteId, list]);
  const columns: DataColumn<PortfolioProjectDto>[] = useMemo(() => [
    { key: 'name', header: 'Proyek', mobile: 'title', render: (row) => <div><div className="font-medium text-foreground">{row.name}</div><div className="mt-0.5 text-xs text-default-500">{row.translations?.find((t) => t.locale === 'id')?.title ?? row.slug} · /{row.slug}</div></div> },
    { key: 'status', header: 'Status', mobile: 'meta', render: (row) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.is_published ? 'bg-success-50 text-success-700' : 'bg-default-100 text-default-600'}`}>{row.is_published ? 'Terbit' : 'Draft'}</span> },
    { key: 'url', header: 'URL eksternal', mobile: 'hidden', render: (row) => <span className="max-w-64 truncate text-xs text-default-600">{row.project_url ?? '—'}</span> },
    { key: 'actions', header: '', hideHeader: true, mobile: 'actions', minRole: 'editor', render: (row) => <button type="button" onClick={() => router.push(`/studio/portfolio/${row.id}`)} className="min-h-8 rounded-[8px] border border-default-300 px-3 text-xs font-semibold text-default-700">Edit</button> },
  ], [router]);

  return <DataListPage title="Portofolio" description="Kelola proyek yang ditampilkan website." list={list} columns={columns} getRowLabel={(row) => row.name} itemNoun="proyek" searchPlaceholder="Cari proyek" primaryAction={{ label: 'Tambah proyek', href: '/studio/portfolio/new', minRole: 'editor' }} bulkActions={bulkActions} emptyState={{ title: 'Belum ada proyek', description: 'Tambahkan proyek portofolio pertama.' }} />;
}
