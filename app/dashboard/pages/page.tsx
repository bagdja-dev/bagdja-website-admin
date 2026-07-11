'use client';

import { Button, Card, CardBody, Chip } from '@heroui/react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { desktopAddButtonClass, MobileFloatingActionBar, mobileFabPagePadding } from '../../components/mobile-floating-action';
import { AppModal } from '../../components/app-modal';
import { useConfirmDialog } from '../../components/confirm-dialog';
import { FormInput, FormSelect, FormSwitch } from '../../components/form-field';
import { LoadingSpinner } from '../../components/loading-spinner';
import { NoWebsiteState } from '../../components/no-website-state';
import { apiClient, slugify } from '../../lib/api-client';
import { hasMinRole, type PagePlacement, type WebsitePage } from '../../lib/types';
import { useWebsiteContext } from '../../context/website-context';

const CARD_THEMES = [
  {
    gradient: 'from-indigo-500 via-violet-500 to-purple-600',
    glow: 'bg-violet-300/20',
    iconBg: 'bg-white/20 text-white',
    accent: 'text-violet-600',
    ring: 'ring-violet-100',
  },
  {
    gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    glow: 'bg-teal-300/20',
    iconBg: 'bg-white/20 text-white',
    accent: 'text-teal-600',
    ring: 'ring-teal-100',
  },
  {
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
    glow: 'bg-orange-300/20',
    iconBg: 'bg-white/20 text-white',
    accent: 'text-orange-600',
    ring: 'ring-orange-100',
  },
  {
    gradient: 'from-rose-500 via-pink-500 to-fuchsia-600',
    glow: 'bg-pink-300/20',
    iconBg: 'bg-white/20 text-white',
    accent: 'text-pink-600',
    ring: 'ring-pink-100',
  },
] as const;

const HOME_THEME = {
  gradient: 'from-blue-600 via-blue-700 to-cyan-600',
  glow: 'bg-cyan-300/20',
  iconBg: 'bg-white/20 text-white',
  accent: 'text-blue-600',
  ring: 'ring-blue-100',
} as const;

const PLACEMENT_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: 'regular', label: 'Regular', description: 'Tidak tampil di navigasi header/footer' },
  { value: 'header', label: 'Header', description: 'Tampil sebagai menu di header website' },
  { value: 'footer', label: 'Footer', description: 'Tampil sebagai link di footer website' },
];

const PLACEMENT_LABELS: Record<string, string> = {
  regular: 'Regular',
  header: 'Header',
  footer: 'Footer',
};

function PageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface PageCardProps {
  page: WebsitePage;
  index: number;
  total: number;
  webBaseUrl: string;
  canEdit: boolean;
  canDelete: boolean;
  reordering: boolean;
  onEdit: (page: WebsitePage) => void;
  onDelete: (pageId: string) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
}

function PageCard({
  page,
  index,
  total,
  webBaseUrl,
  canEdit,
  canDelete,
  reordering,
  onEdit,
  onDelete,
  onMove,
}: PageCardProps) {
  const theme = page.is_home ? HOME_THEME : CARD_THEMES[index % CARD_THEMES.length];
  const initial = page.title.trim().charAt(0).toUpperCase() || 'P';
  const previewUrl = `${webBaseUrl}/${page.slug}`;

  return (
    <Card className="group overflow-hidden border-0 shadow-md ring-1 ring-default-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="flex gap-0">
        {canEdit && (
          <div className="flex flex-col items-center justify-center gap-1 border-r border-default-100 bg-default-50/80 px-2 py-3">
            <button
              type="button"
              disabled={index === 0 || reordering}
              onClick={() => onMove(index, 'up')}
              className="rounded-lg p-1.5 text-default-400 transition-colors hover:bg-white hover:text-primary disabled:opacity-30"
              aria-label="Naik"
            >
              ↑
            </button>
            <span className="text-xs font-bold text-default-400">{index + 1}</span>
            <button
              type="button"
              disabled={index === total - 1 || reordering}
              onClick={() => onMove(index, 'down')}
              className="rounded-lg p-1.5 text-default-400 transition-colors hover:bg-white hover:text-primary disabled:opacity-30"
              aria-label="Turun"
            >
              ↓
            </button>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className={`relative bg-gradient-to-br ${theme.gradient} px-4 pb-8 pt-4 sm:px-5 sm:pt-5`}>
            <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full ${theme.glow} blur-2xl`} />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold shadow-lg ring-2 ring-white/30 backdrop-blur-sm ${theme.iconBg}`}
                >
                  {initial}
                </div>
                <div className="min-w-0">
                  {(page.is_home || page.placement !== 'regular') && (
                    <div className="mb-1 flex flex-wrap gap-1">
                      {page.is_home && (
                        <Chip
                          size="sm"
                          variant="flat"
                          className="border border-white/25 bg-white/15 backdrop-blur-sm"
                          classNames={{ content: 'font-semibold text-white text-[10px] uppercase tracking-wide' }}
                        >
                          ★ Halaman Utama
                        </Chip>
                      )}
                      {page.placement !== 'regular' && (
                        <Chip
                          size="sm"
                          variant="flat"
                          className="border border-white/25 bg-white/15 backdrop-blur-sm"
                          classNames={{ content: 'font-semibold text-white text-[10px] uppercase tracking-wide' }}
                        >
                          {PLACEMENT_LABELS[page.placement] ?? page.placement}
                        </Chip>
                      )}
                    </div>
                  )}
                  <h3 className="truncate text-lg font-bold text-white">{page.title}</h3>
                </div>
              </div>
              <div className={`hidden rounded-xl bg-white/15 p-2 backdrop-blur-sm sm:block ${theme.iconBg}`}>
                <PageIcon className="h-5 w-5" />
              </div>
            </div>
          </div>

          <CardBody className="relative -mt-4 space-y-4 rounded-t-2xl bg-white px-4 pb-4 pt-5 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg bg-default-100 px-2.5 py-1 text-xs font-medium text-default-600 ring-1 ${theme.ring}`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
                  />
                </svg>
                /{page.slug}
              </span>
              <span className="text-xs text-default-400">Diperbarui {formatDate(page.updated_at)}</span>
            </div>

            <div className="flex flex-row gap-2 sm:flex-row justify-end">
              <Button
                as={Link}
                href={`/dashboard/pages/${page.id}`}
                className="flex-1 font-semibold shadow-sm"
                startContent={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
                    />
                  </svg>
                }
              >
              </Button>
              <Button
                as={Link}
                href={previewUrl}
                target="_blank"
                variant="flat"
                className="font-medium"
                startContent={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 6H5.25A2.25 2.25 0 0 0 3 6.75v10.5A2.25 2.25 0 0 0 5.25 19.5h13.5A2.25 2.25 0 0 0 21 17.25V8.625M12 12.75l-3-3m0 0 3-3m-3 3h12.75"
                    />
                  </svg>
                }
              >
              </Button>
              {canEdit && (
                <Button
                  size="sm"
                  variant="light"
                  className="flex-1"
                  onPress={() => onEdit(page)}
                  startContent={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 3.487a2.088 2.088 0 1 1 2.953 2.953L7.636 18.62a2.25 2.25 0 0 1-.956.558l-4.017 1.147 1.147-4.017a2.25 2.25 0 0 1 .558-.956L16.862 3.487z"
                      />
                    </svg>
                  }
                >
                </Button>
              )}
              {canDelete && (
                <Button
                  size="sm"
                  color="danger"
                  variant="light"
                  className="flex-1"
                  onPress={() => onDelete(page.id)}
                  startContent={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 7.5V19a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 19V7.5M10.5 11.25v4.5m3-4.5v4.5M4.5 7.5h15M9.75 4.5h4.5a.75.75 0 0 1 .75.75V6h-6V5.25a.75.75 0 0 1 .75-.75Z"
                      />
                    </svg>
                  }
                >
                </Button>
              )}
            </div>
          </CardBody>
        </div>
      </div>
    </Card>
  );
}

export default function PagesManagement() {
  const { activeWebsite, websiteId, role, loading: ctxLoading } = useWebsiteContext();
  const { confirm, dialog } = useConfirmDialog();
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editPage, setEditPage] = useState<WebsitePage | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isHome, setIsHome] = useState(false);
  const [placement, setPlacement] = useState<PagePlacement>('regular');
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState('');

  const canEdit = role ? hasMinRole(role, 'editor') : false;
  const canDelete = role ? hasMinRole(role, 'admin') : false;

  const webBaseUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:5005';
    const siteSlug = activeWebsite?.website.slug;
    return siteSlug ? `${base}/${siteSlug}` : base;
  }, [activeWebsite?.website.slug]);

  const loadPages = useCallback(async () => {
    if (!websiteId) return;
    setLoading(true);
    try {
      const data = await apiClient<WebsitePage[]>(`/api/websites/${websiteId}/pages`);
      setPages(data);
    } catch {
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  const openCreate = () => {
    setEditPage(null);
    setTitle('');
    setSlug('');
    setIsHome(false);
    setPlacement('regular');
    setError('');
    setModalOpen(true);
  };

  const openEdit = (page: WebsitePage) => {
    setEditPage(page);
    setTitle(page.title);
    setSlug(page.slug);
    setIsHome(page.is_home);
    setPlacement(page.placement ?? 'regular');
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!websiteId || !title.trim() || !slug.trim()) {
      setError('Judul dan slug wajib diisi');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editPage) {
        await apiClient(`/api/websites/${websiteId}/pages/${editPage.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ title: title.trim(), slug: slug.trim(), is_home: isHome, placement }),
        });
      } else {
        await apiClient(`/api/websites/${websiteId}/pages`, {
          method: 'POST',
          body: JSON.stringify({ title: title.trim(), slug: slug.trim(), is_home: isHome, placement }),
        });
      }
      setModalOpen(false);
      await loadPages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pageId: string) => {
    if (!websiteId) return;
    const ok = await confirm({
      title: 'Hapus Halaman Ini?',
      message: 'Semua section di dalam halaman ini akan ikut terhapus.',
    });
    if (!ok) return;
    try {
      await apiClient(`/api/websites/${websiteId}/pages/${pageId}`, { method: 'DELETE' });
      await loadPages();
    } catch {
      alert('Gagal menghapus halaman');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (!websiteId || reordering) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    const reordered = [...pages];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    setReordering(true);
    setPages(reordered);
    try {
      await apiClient(`/api/websites/${websiteId}/pages/reorder`, {
        method: 'POST',
        body: JSON.stringify({ page_ids: reordered.map((p) => p.id) }),
      });
    } catch {
      await loadPages();
      alert('Gagal mengubah urutan');
    } finally {
      setReordering(false);
    }
  };

  if (ctxLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;

  const homeCount = pages.filter((p) => p.is_home).length;

  return (
    <div className={`space-y-6 ${canEdit ? mobileFabPagePadding : ''}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Halaman</h1>
          <p className="mt-1 text-default-500">Kelola halaman website Anda.</p>
        </div>
        {canEdit && (
          <Button color="primary" onPress={openCreate} className={desktopAddButtonClass}>
            + Halaman Baru
          </Button>
        )}
      </div>

      {!loading && pages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Chip variant="flat" color="primary" className="font-medium">
            {pages.length} halaman
          </Chip>
          {homeCount > 0 && (
            <Chip variant="flat" color="success" className="font-medium">
              {homeCount} beranda
            </Chip>
          )}
        </div>
      )}

      {loading ? (
        <LoadingSpinner className="h-48" />
      ) : pages.length === 0 ? (
        <Card className="overflow-hidden border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-600 ring-4 ring-blue-50">
              <PageIcon className="h-8 w-8" />
            </div>
            <div>
              <p className="text-lg font-semibold">Belum ada halaman</p>
              <p className="mt-1 max-w-sm text-sm text-default-500">
                Buat halaman pertama untuk mulai menyusun konten website Anda.
              </p>
            </div>
            {canEdit && (
              <Button color="primary" onPress={openCreate} className="hidden sm:inline-flex font-semibold">
                + Halaman Baru
              </Button>
            )}
          </CardBody>
        </Card>
      ) : (
        <>
          {canEdit && pages.length > 1 && (
            <p className="text-xs font-medium uppercase tracking-wide text-default-400">
              Urutan tampil di navigasi header/footer website — gunakan ↑↓ di setiap kartu
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pages.map((page, index) => (
              <PageCard
                key={page.id}
                page={page}
                index={index}
                total={pages.length}
                webBaseUrl={webBaseUrl}
                canEdit={canEdit}
                canDelete={canDelete}
                reordering={reordering}
                onEdit={openEdit}
                onDelete={handleDelete}
                onMove={handleMove}
              />
            ))}
          </div>
        </>
      )}

      <AppModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editPage ? 'Edit Halaman' : 'Halaman Baru'}
        footer={
          <>
            <Button variant="light" onPress={() => setModalOpen(false)}>Batal</Button>
            <Button color="primary" isLoading={saving} onPress={handleSave}>Simpan</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <FormInput
            label="Judul"
            value={title}
            onChange={(v) => {
              setTitle(v);
              if (!editPage) setSlug(slugify(v));
            }}
            required
          />
          <FormInput label="Slug" value={slug} onChange={setSlug} required />
          <FormSelect
            label="Penempatan Navigasi"
            value={placement}
            onChange={(v) => setPlacement(v as PagePlacement)}
            options={PLACEMENT_OPTIONS}
          />
          <FormSwitch
            label="Jadikan halaman utama (home)"
            checked={isHome}
            onChange={setIsHome}
          />
          {error && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
        </div>
      </AppModal>

      {canEdit && <MobileFloatingActionBar label="Halaman Baru" onClick={openCreate} />}
      {dialog}
    </div>
  );
}
