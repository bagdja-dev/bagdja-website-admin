'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Button, Spinner } from '@heroui/react';

import { errorMessage } from '@/studio/api/client';
import { fetchWebsiteTemplates } from '@/studio/api/templates';
import type { WebsiteTemplateDto } from '@/studio/api/types';
import { updateWebsiteTemplate } from '@/studio/api/websites';
import { hasMinRole } from '@/studio/lib/roles';
import { isPaidTemplate } from '@/studio/features/onboarding/use-template-catalog';
import { TemplateDetail } from '@/studio/features/onboarding/TemplateDetail';
import { TemplatePreviewFrame, type PreviewDevice } from '@/studio/features/onboarding/TemplatePreviewFrame';
import { TemplateThumb } from '@/studio/features/onboarding/TemplateThumb';
import { templatePriceLabel } from '@/studio/features/onboarding/template-meta';
import { useActiveRole, useActiveWebsite, useWebsiteStore } from '@/studio/stores/website-store';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import { notify } from '@/studio/ui/primitives/Toast';
import { Icon } from '@/studio/ui/icons';

const STORE_URL = '/studio/appearance/templates';

function DeviceSwitcher({ device, onChange }: { device: PreviewDevice; onChange: (device: PreviewDevice) => void }) {
  return (
    <div className="flex rounded-lg bg-default-100 p-1" role="group" aria-label="Ukuran pratinjau">
      {(['desktop', 'mobile'] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={device === value}
          onClick={() => onChange(value)}
          className={`min-h-8 rounded-md px-3 text-xs font-medium ${
            device === value ? 'bg-white text-foreground shadow-sm' : 'text-default-600'
          }`}
        >
          {value === 'desktop' ? 'Desktop' : 'HP'}
        </button>
      ))}
    </div>
  );
}

export function TemplateEditor({ view = 'active' }: { view?: 'active' | 'store' }) {
  const entry = useActiveWebsite();
  const website = entry?.website;
  const role = useActiveRole();
  const patchWebsite = useWebsiteStore((state) => state.patchWebsite);
  const { confirm, dialog } = useConfirm();
  const [templates, setTemplates] = useState<WebsiteTemplateDto[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const canChange = hasMinRole(role, 'admin');
  const businessProfile = website?.business_profile;

  const loadTemplates = async () => {
    setStatus('loading');
    setError(null);
    try {
      setTemplates(await fetchWebsiteTemplates());
      setStatus('ready');
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Daftar template gagal dimuat.'));
      setStatus('error');
    }
  };

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    fetchWebsiteTemplates()
      .then((items) => {
        if (cancelled) return;
        setTemplates(items);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(errorMessage(cause, 'Daftar template gagal dimuat.'));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [website?.id]);

  const recommendedIds = useMemo(() => new Set(
    templates
      .filter((template) => businessProfile && template.business_profiles.includes(businessProfile))
      .map((template) => template.id),
  ), [businessProfile, templates]);
  const hasRecommendations = recommendedIds.size > 0;
  const visibleTemplates = useMemo(
    () => {
      const query = search.trim().toLocaleLowerCase();
      return templates.filter((template) => {
        const matchesProfile = showAll || !hasRecommendations
          || recommendedIds.has(template.id)
          || template.id === website?.template_id;
        const matchesSearch = !query || [
          template.name,
          template.description,
          template.slug,
          template.author_name,
        ].some((value) => value?.toLocaleLowerCase().includes(query));
        return matchesProfile && matchesSearch;
      });
    },
    [hasRecommendations, recommendedIds, search, showAll, templates, website?.template_id],
  );
  const activeTemplate = templates.find((template) => template.id === website?.template_id) ?? null;
  const detailTemplate = templates.find((template) => template.id === detailId) ?? null;

  const applyTemplate = async (template: WebsiteTemplateDto) => {
    if (!website || !canChange || isPaidTemplate(template) || template.id === website.template_id || saving) return;
    const accepted = await confirm({
      title: 'Ganti template website?',
      description: (
        <span>
          Tampilan website akan menggunakan <strong>{template.name}</strong>. Data halaman dan konten yang sudah
          tersimpan tidak dihapus; section yang tidak didukung template baru mungkin tidak ditampilkan.
        </span>
      ),
      confirmLabel: 'Ganti template',
    });
    if (!accepted) return;

    setSaving(true);
    try {
      const saved = await updateWebsiteTemplate(website.id, template.id);
      patchWebsite(website.id, { template_id: saved.template_id ?? template.id });
      notify.success('Template website berhasil diganti.');
    } catch (cause: unknown) {
      notify.error('Gagal mengganti template.', errorMessage(cause, 'Perubahan belum disimpan.'));
    } finally {
      setSaving(false);
    }
  };

  if (!website) {
    return <div className="rounded-[14px] border border-default-200 bg-white p-6 text-sm text-default-600">Pilih website untuk mengatur template.</div>;
  }

  return (
    <div className="flex flex-col gap-5">
      {dialog}
      {view === 'active' ? (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-foreground">Template website</h2>
              <p className="max-w-2xl text-sm text-default-600">Template yang sedang digunakan beserta pratinjau langsung website Anda.</p>
            </div>
            <Button as={Link} href={STORE_URL} color="primary">Ganti template</Button>
          </header>

          {status === 'loading' && (
            <div className="flex min-h-36 items-center justify-center rounded-[14px] border border-default-200 bg-white">
              <Spinner label="Memuat preview template..." />
            </div>
          )}
          {status === 'error' && (
            <div role="alert" className="flex flex-col items-start gap-3 rounded-[14px] border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
              <p>{error}</p>
              <Button size="sm" variant="bordered" onPress={() => void loadTemplates()}>Coba lagi</Button>
            </div>
          )}
          {status === 'ready' && !activeTemplate && (
            <div className="flex flex-col items-start gap-4 rounded-[14px] border border-default-200 bg-white p-6">
              <p className="text-sm text-default-600">Template aktif tidak ditemukan di katalog yang tersedia.</p>
              <Button as={Link} href={STORE_URL} color="primary">Buka toko template</Button>
            </div>
          )}
          {status === 'ready' && activeTemplate && (
            <section className="grid min-w-0 grid-cols-1 gap-5 rounded-2xl border border-default-200 bg-white p-4 md:p-5 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold text-foreground">Pratinjau langsung</h3>
                  <DeviceSwitcher device={device} onChange={setDevice} />
                </div>
                <div className="flex min-w-0 justify-center overflow-hidden rounded-xl bg-default-100 p-2 sm:p-4">
                  <TemplatePreviewFrame
                    template={activeTemplate}
                    profile={{
                      name: website.name,
                      tagline: website.tagline,
                      logoUrl: website.logo_url,
                      whatsapp: website.whatsapp ?? undefined,
                      phone: website.phone,
                      email: website.email,
                      footerSettings: website.footer_settings,
                      theme: website.theme,
                    }}
                    slug={website.slug}
                    device={device}
                    size="compact"
                    height={520}
                  />
                </div>
              </div>
              <aside className="flex flex-col items-start gap-3">
                <span className="rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-700">Sedang digunakan</span>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">{activeTemplate.name}</h3>
                  <p className="mt-1 text-sm text-default-600">{activeTemplate.description || 'Template bawaan Bagdja'}</p>
                </div>
                <p className="text-xs leading-relaxed text-default-500">
                  Untuk memilih desain lain atau mencari template premium, buka toko template.
                </p>
                <Button as={Link} href={STORE_URL} color="primary" className="mt-auto">Ganti template</Button>
              </aside>
            </section>
          )}
        </>
      ) : (
        <>
          {detailTemplate ? (
            <TemplateDetail
              template={detailTemplate}
              fitLabel={null}
              profile={{
                name: website.name,
                tagline: website.tagline,
                logoUrl: website.logo_url,
                whatsapp: website.whatsapp ?? undefined,
                phone: website.phone,
                email: website.email,
                footerSettings: website.footer_settings,
                theme: website.theme,
              }}
              slug={website.slug}
              isCurrent={detailTemplate.id === website.template_id}
              canUse={canChange && !saving && !isPaidTemplate(detailTemplate)}
              applyLabel="Terapkan template"
              onBack={() => setDetailId(null)}
              onUse={() => void applyTemplate(detailTemplate)}
            />
          ) : (
            <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-foreground">Toko template</h2>
              <p className="max-w-2xl text-sm text-default-600">Jelajahi template dan lihat pratinjau sebelum mengganti tampilan website.</p>
            </div>
            <Button as={Link} href="/studio/appearance" variant="bordered">Kembali ke template aktif</Button>
          </header>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block w-full sm:max-w-[380px]">
              <Icon name="search" size={16} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-default-500" />
              <span className="sr-only">Cari template</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari template..."
                aria-label="Cari template"
                className="min-h-10 w-full rounded-[10px] border border-default-300 bg-white py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-100"
              />
            </label>

            {hasRecommendations && (
              <div className="flex self-start rounded-xl bg-default-100 p-1 sm:self-auto" role="group" aria-label="Filter template">
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  aria-pressed={!showAll}
                  className={`min-h-9 rounded-lg px-3 text-sm font-medium ${!showAll ? 'bg-white text-foreground shadow-sm' : 'text-default-600'}`}
                >
                  Cocok untuk bisnis
                </button>
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  aria-pressed={showAll}
                  className={`min-h-9 rounded-lg px-3 text-sm font-medium ${showAll ? 'bg-white text-foreground shadow-sm' : 'text-default-600'}`}
                >
                  Semua template
                </button>
              </div>
            )}
          </div>

          {status === 'loading' && (
            <div className="flex min-h-36 items-center justify-center rounded-[14px] border border-default-200 bg-white">
              <Spinner label="Memuat toko template..." />
            </div>
          )}
          {status === 'error' && (
            <div role="alert" className="flex flex-col items-start gap-3 rounded-[14px] border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
              <p>{error}</p>
              <Button size="sm" variant="bordered" onPress={() => void loadTemplates()}>Coba lagi</Button>
            </div>
          )}
          {status === 'ready' && templates.length === 0 && (
            <div className="rounded-[14px] border border-default-200 bg-white p-6 text-sm text-default-600">Belum ada template yang tersedia.</div>
          )}
          {status === 'ready' && templates.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleTemplates.map((template) => {
                  const active = template.id === website.template_id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      aria-label={`${template.name}, lihat detail template`}
                      onClick={() => setDetailId(template.id)}
                      className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-default-200 bg-white text-left transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <TemplateThumb template={template} height={150} />
                      <span className="flex w-full flex-col gap-2 p-4">
                        <span className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-foreground">{template.name}</span>
                          <span className="flex shrink-0 flex-wrap justify-end gap-1">
                            {active && <span className="rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700">Aktif</span>}
                            {isPaidTemplate(template) && <span className="rounded-full bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-700">Premium</span>}
                          </span>
                        </span>
                        <span className="text-xs text-default-500">{template.description || templatePriceLabel(template)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {visibleTemplates.length === 0 && (
                <p className="rounded-xl border border-default-200 bg-white p-5 text-sm text-default-600">
                  {search.trim()
                    ? `Tidak ada template yang cocok dengan “${search.trim()}”. Coba kata kunci lain.`
                    : 'Belum ada template yang cocok untuk profil bisnis ini. Pilih “Semua template” untuk melihat pilihan lain.'}
                </p>
              )}

            </>
          )}
            </>
          )}
        </>
      )}
    </div>
  );
}
