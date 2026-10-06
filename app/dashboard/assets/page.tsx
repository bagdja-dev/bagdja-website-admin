'use client';

import { Button, Card, CardBody, Chip } from '@heroui/react';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AppModal } from '../../components/app-modal';
import { LoadingSpinner } from '../../components/loading-spinner';
import { NoWebsiteState } from '../../components/no-website-state';
import { useWebsiteContext } from '../../context/website-context';
import { apiClient } from '../../lib/api-client';
import { hasMinRole, type WebsiteAsset } from '../../lib/types';

interface AssetTab {
  value: string;
  label: string;
  actionLabel: string;
  addAction: 'upload' | 'studio';
  href?: string;
}

const ASSET_TABS: AssetTab[] = [
  { value: 'downloadable', label: 'Downloadable', actionLabel: '+ Tambah asset', addAction: 'upload' },
];

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Tanggal tidak tersedia';
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function getFileTypeLabel(asset: WebsiteAsset): string {
  const extension = asset.filename.split('.').pop();
  if (extension && extension !== asset.filename) return extension.slice(0, 5).toUpperCase();
  return asset.mime_type.split('/').pop()?.slice(0, 5).toUpperCase() ?? 'FILE';
}

export default function AssetsPage() {
  const router = useRouter();
  const { websiteId, role: websiteRole, loading: websiteLoading } = useWebsiteContext();
  const canEdit = hasMinRole(websiteRole ?? '', 'editor');
  const [assets, setAssets] = useState<WebsiteAsset[]>([]);
  const [activeTab, setActiveTab] = useState(ASSET_TABS[0].value);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<WebsiteAsset | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [assetName, setAssetName] = useState('');
  const [assetDescription, setAssetDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!websiteId) return;
    setError('');
    try {
      const assetRows = await apiClient<WebsiteAsset[]>(`/api/websites/${websiteId}/assets`);
      setAssets(assetRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat asset');
    }
  }, [websiteId]);

  const activeAssetTab = ASSET_TABS.find((tab) => tab.value === activeTab) ?? ASSET_TABS[0];
  const filteredAssets = assets.filter((asset) => asset.asset_type === activeAssetTab.value);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingAsset(null);
    setFile(null);
    setAssetName('');
    setAssetDescription('');
    setError('');
    setModalOpen(true);
  };

  const openEdit = (asset: WebsiteAsset) => {
    setEditingAsset(asset);
    setFile(null);
    setAssetName(asset.name);
    setAssetDescription(asset.description ?? '');
    setError('');
    setModalOpen(true);
  };

  const handleAddAsset = () => {
    if (activeAssetTab.addAction === 'studio') {
      if (activeAssetTab.href) router.push(activeAssetTab.href);
      return;
    }
    openCreate();
  };

  const saveAsset = async () => {
    if (!websiteId) return;
    if (!assetName.trim()) {
      setError('Judul asset wajib diisi.');
      return;
    }
    if (!editingAsset && !file) {
      setError('Pilih file yang akan diunggah.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (editingAsset) {
        await apiClient(`/api/websites/${websiteId}/assets/${editingAsset.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: assetName.trim(),
            description: assetDescription.trim(),
          }),
        });
        setNotice('Asset berhasil diperbarui.');
      } else {
        const form = new FormData();
        form.append('website_id', websiteId);
        form.append('file', file!);
        form.append('name', assetName.trim());
        form.append('description', assetDescription.trim());
        form.append('asset_type', activeAssetTab.value);
        form.append('is_public', 'false');
        const response = await fetch('/api/uploads/website-assets', { method: 'POST', body: form });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message ?? body.error ?? 'Upload asset gagal');
        setNotice('Asset berhasil diunggah.');
      }
      setModalOpen(false);
      setFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan asset');
    } finally {
      setBusy(false);
    }
  };

  const replaceFile = async (asset: WebsiteAsset, replacement: File | undefined) => {
    if (!websiteId || !replacement) return;
    setBusy(true);
    setError('');
    setNotice('');
    const form = new FormData();
    form.append('website_id', websiteId);
    form.append('asset_id', asset.id);
    form.append('file', replacement);
    try {
      const response = await fetch('/api/uploads/website-assets', { method: 'PATCH', body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message ?? body.error ?? 'Gagal mengganti file asset');
      setNotice('File asset berhasil diganti. Transaksi lama sekarang mengakses file terbaru.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengganti file asset');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (asset: WebsiteAsset) => {
    if (!websiteId || !window.confirm(`Hapus asset "${asset.name}"?`)) return;
    setBusy(true);
    setError('');
    try {
      await apiClient(`/api/websites/${websiteId}/assets/${asset.id}`, { method: 'DELETE' });
      setNotice('Asset berhasil dihapus.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus asset');
    } finally {
      setBusy(false);
    }
  };

  if (websiteLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Digital Asset</h1>
          <p className="mt-1 text-default-500">Kelola file digital untuk konten dan produk Anda.</p>
        </div>
        {canEdit && <Button color="primary" onPress={handleAddAsset} className="font-semibold">{activeAssetTab.actionLabel}</Button>}
      </header>

      {!canEdit && (
        <p className="rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
          Anda memiliki akses lihat saja.
        </p>
      )}
      {error && <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">{notice}</p>}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        {ASSET_TABS.map((tab) => {
          const active = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${active
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25'
                : 'bg-white text-default-600 ring-1 ring-default-200 hover:bg-default-50'}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {assets.length > 0 && (
        <Chip variant="flat" color="primary" className="font-medium">{filteredAssets.length} asset</Chip>
      )}

      {filteredAssets.length === 0 ? (
        <Card className="overflow-hidden border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 text-xs font-bold text-primary ring-4 ring-cyan-50">FILE</div>
            <div>
              <p className="text-lg font-semibold">Belum ada asset {activeAssetTab.label.toLowerCase()}</p>
              <p className="mt-1 max-w-sm text-sm text-default-500">Asset {activeAssetTab.label.toLowerCase()} akan muncul di sini.</p>
            </div>
            {canEdit && <Button color="primary" onPress={handleAddAsset}>{activeAssetTab.actionLabel}</Button>}
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="group border-0 shadow-md ring-1 ring-default-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <CardBody className="gap-4 p-4 sm:p-5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100 text-[10px] font-bold uppercase text-primary ring-2 ring-cyan-50" aria-label={`File ${getFileTypeLabel(asset)}`}>
                    {getFileTypeLabel(asset)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="line-clamp-2 text-base font-semibold leading-snug text-foreground" title={asset.name}>{asset.name}</h2>
                      <Chip size="sm" variant="flat" color="primary" className="shrink-0">{activeAssetTab.label}</Chip>
                    </div>
                    <p className="mt-2 line-clamp-2 min-h-10 text-sm text-default-500">{asset.description || 'Belum ada deskripsi.'}</p>
                    <p className="mt-3 text-xs text-default-400">Diperbarui {formatUpdatedAt(asset.updated_at)}</p>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-2 border-t border-default-100 pt-3">
                    <Button size="sm" color="primary" variant="flat" className="flex-1 font-medium" onPress={() => openEdit(asset)}>Edit</Button>
                    <label className="inline-flex min-h-8 flex-1 cursor-pointer items-center justify-center rounded-medium bg-default-100 px-3 text-sm font-medium text-default-700 transition-colors hover:bg-default-200">
                      Ganti file
                      <input type="file" className="sr-only" disabled={busy} onChange={(event) => { void replaceFile(asset, event.target.files?.[0]); event.currentTarget.value = ''; }} />
                    </label>
                    <Button size="sm" color="danger" variant="light" isDisabled={busy} onPress={() => void remove(asset)}>Hapus</Button>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <AppModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAsset ? 'Edit asset' : 'Tambah asset'}
        footer={(
          <>
            <Button variant="light" onPress={() => setModalOpen(false)}>Batal</Button>
            <Button color="primary" isLoading={busy} onPress={() => void saveAsset()}>
              {editingAsset ? 'Simpan perubahan' : 'Tambah asset'}
            </Button>
          </>
        )}
      >
        <div className="flex flex-col gap-5">
          {!editingAsset && (
            <label className="grid gap-2 text-sm font-medium">
              File
              <input
                type="file"
                required
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0] ?? null;
                  setFile(selectedFile);
                  if (selectedFile && !assetName) setAssetName(selectedFile.name);
                }}
                className="block min-h-11 w-full rounded-lg border border-default-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-default-100 file:px-3 file:py-1.5 file:text-sm"
              />
            </label>
          )}
          <label className="grid gap-2 text-sm font-medium">
            Judul
            <input
              value={assetName}
              onChange={(event) => setAssetName(event.target.value)}
              maxLength={255}
              className="w-full rounded-xl border border-default-300 bg-white px-3.5 py-2.5 text-sm text-foreground shadow-sm transition-all placeholder:text-default-400 hover:border-default-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Deskripsi
            <textarea
              value={assetDescription}
              onChange={(event) => setAssetDescription(event.target.value)}
              maxLength={2000}
              rows={4}
              className="w-full resize-y rounded-xl border border-default-300 bg-white px-3.5 py-2.5 text-sm text-foreground shadow-sm transition-all placeholder:text-default-400 hover:border-default-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          {error && <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>}
        </div>
      </AppModal>
    </div>
  );
}