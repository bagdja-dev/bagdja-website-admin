'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useSearchParams, useRouter } from 'next/navigation';

import { Button, Input, Select, SelectItem, Switch, Textarea } from '@heroui/react';

import {
  fetchPageAndSections,
  type WebsitePage,
  type WebsiteSection,
} from '@/studio/api/pages';
import { isNotFound } from '@/studio/api/client';
import { createSection, updateSection, deleteSection, reorderSections } from '@/studio/api/sections';
import { fetchSectionSchemas } from '@/studio/api/templates';
import type { TemplateManifestField, TemplateManifestSection } from '@/studio/api/templates';
import { buildPagePreviewUrl, type PagePreviewDevice } from '@/studio/lib/template-preview';
import { useWebsiteStore } from '@/studio/stores/website-store';
import type { IconName } from '@/studio/ui/icons';
import { Icon } from '@/studio/ui/icons';
import { StatusScreen } from '@/studio/ui/primitives/StatusScreen';
import { notify } from '@/studio/ui/primitives/Toast';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import { RichTextEditor } from '@/studio/ui/rich-text-editor';
import { IconPickerField } from '@/app/components/icon-picker-field';

import { AddSectionDialog } from './AddSectionDialog';
import { PagePreviewPanel } from './PagePreviewPanel';
import { SortableSections } from './SortableSections';
import { ArticlePickerField } from './ArticlePickerField';
import { ProductPickerField } from './ProductPickerField';
import { FaqCategoryPickerField } from './FaqCategoryPickerField';
import { GalleryUploadField, ImageUploadField } from './SectionImageFields';
import { normalizeLegacyCta } from './fields/cta-legacy';
import { EmailField } from './fields/EmailField';
import { isFieldVisible } from './fields/field-visibility';
import { PhoneField } from './fields/PhoneField';
import { SegmentedField } from './fields/SegmentedField';
import { UrlField } from './fields/UrlField';
import { usePreviewChannel } from './use-preview-channel';

/** Nama `icon` di skema section API → ikon Studio terdekat (nama tak dikenal jatuh ke `more` di komponen Icon). */
const SECTION_ICON: Record<string, IconName> = {
  hero: 'appearance', about: 'team', text: 'edit', richtext: 'edit', gallery: 'image', testimonial: 'inbox',
  features: 'features', logos: 'image', services: 'catalog', products: 'catalog', categories: 'folder',
  spotlight: 'catalog', cta: 'external', contact: 'inbox', locations: 'location', faq: 'faq', blog: 'blog',
  search: 'search', collection: 'blog', flow: 'flow',
};

interface PageEditorProps {
  pageId: string;
}

export function PageEditor({ pageId }: PageEditorProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const websiteId = searchParams.get('websiteId') ?? '';
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [page, setPage] = useState<WebsitePage | null>(null);
  /** Draft (belum disimpan) — dikirim ke pratinjau lewat protokol preview v1. */
  const [sections, setSections] = useState<WebsiteSection[]>([]);
  /** Versi tersimpan di API — pembanding untuk dirty & simpan. */
  const [savedSections, setSavedSections] = useState<WebsiteSection[]>([]);
  const [schemas, setSchemas] = useState<TemplateManifestSection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** `not_found` = API 404 untuk halaman ini; `error` = galat lain (jaringan/server) → bisa dicoba lagi. */
  const [loadError, setLoadError] = useState<'not_found' | 'error' | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [device, setDevice] = useState<PagePreviewDevice>('desktop');
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [isMediumViewport, setIsMediumViewport] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'closed' | 'list' | 'properties'>('closed');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sectionListRef = useRef<HTMLDivElement>(null);
  const mobileSectionListRef = useRef<HTMLDivElement>(null);
  const website = useWebsiteStore((s) => s.websites.find((w) => w.website.id === websiteId)?.website ?? null);

  useEffect(() => {
    const compactMedia = window.matchMedia('(max-width: 1440px)');
    const mediumMedia = window.matchMedia('(min-width: 768px) and (max-width: 1440px)');
    const updateViewport = () => {
      setIsCompactViewport(compactMedia.matches);
      setIsMediumViewport(mediumMedia.matches);
      if (!compactMedia.matches || mediumMedia.matches) setMobilePanel('closed');
    };
    updateViewport();
    compactMedia.addEventListener('change', updateViewport);
    mediumMedia.addEventListener('change', updateViewport);
    return () => {
      compactMedia.removeEventListener('change', updateViewport);
      mediumMedia.removeEventListener('change', updateViewport);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const updatePreviewDevice = () => {
      if (media.matches) setDevice('mobile');
    };
    updatePreviewDevice();
    media.addEventListener('change', updatePreviewDevice);
    return () => media.removeEventListener('change', updatePreviewDevice);
  }, []);

  useEffect(() => {
    if (!websiteId) {
      setLoading(false);
      notify.error('Website ID tidak ditemukan.');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      // Halaman wajib; skema section opsional — editor tetap terbuka (mis. untuk halaman kosong) walau skema gagal dimuat.
      const [schemaRes, pageRes] = await Promise.allSettled([
        fetchSectionSchemas(),
        fetchPageAndSections(websiteId, pageId),
      ]);
      if (cancelled) return;
      if (schemaRes.status === 'fulfilled') {
        setSchemas(schemaRes.value.sections.map(normalizeSectionSchema));
      } else {
        notify.error('Daftar jenis section gagal dimuat. Properti section belum bisa diedit.');
      }
      if (pageRes.status === 'fulfilled') {
        setPage(pageRes.value.page);
        const sections = pageRes.value.sections.map((section) => normalizeLegacyCta(normalizeLegacyFeatures(section)));
        setSections(sections);
        setSavedSections(sections);
        setSelectedId(pageRes.value.sections[0]?.id ?? null);
      } else {
        setLoadError(isNotFound(pageRes.reason) ? 'not_found' : 'error');
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [websiteId, pageId, reloadKey]);

  const schemaMap = useMemo(() => {
    const map = new Map<string, TemplateManifestSection>();
    for (const s of schemas) map.set(s.type, s);
    return map;
  }, [schemas]);

  const schemaFor = useCallback((type: string) => schemaMap.get(type), [schemaMap]);

  const selected = useMemo(() => sections.find((s) => s.id === selectedId) ?? null, [sections, selectedId]);
  const selectedSchema = selected ? schemaFor(selected.type) : null;

  /** Section yang kontennya berbeda dari versi tersimpan. */
  const changedIds = useMemo(() => {
    const saved = new Map(savedSections.map((s) => [s.id, JSON.stringify(s.content ?? {})]));
    return new Set(sections.filter((s) => saved.get(s.id) !== JSON.stringify(s.content ?? {})).map((s) => s.id));
  }, [sections, savedSections]);
  const dirty = changedIds.size > 0;

  const previewUrl = useMemo(
    () => (website && page ? buildPagePreviewUrl(website, page, device) : null),
    [website, page, device],
  );

  const handlePreviewSelect = useCallback((sectionId: string) => {
    setSelectedId(sectionId);
    const listRef = isCompactViewport && !isMediumViewport ? mobileSectionListRef : sectionListRef;
    const item = listRef.current?.querySelector(`[data-section-id="${CSS.escape(sectionId)}"]`);
    item?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [isCompactViewport, isMediumViewport]);

  const preview = usePreviewChannel({
    iframeRef,
    previewUrl,
    pageSlug: page?.slug ?? '',
    sections,
    selectedId,
    onSelect: handlePreviewSelect,
  });
  const reloadPreview = preview.reload;

  // Peringatan perubahan belum tersimpan saat meninggalkan/menutup tab.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const updateDraftContent = useCallback((sectionId: string, content: Record<string, unknown>) => {
    setSections((current) => current.map((s) => (s.id === sectionId ? { ...s, content } : s)));
  }, []);

  const [addOpen, setAddOpen] = useState(false);
  const openAddSection = () => setAddOpen(true);

  /** Tambah section dari popup: disisipkan setelah section terpilih (hero selalu paling atas), lalu urutan disimpan. */
  const handleAddSection = async (type: string) => {
    const schema = schemaFor(type);
    if (!schema) {
      notify.error(`Tipe section "${type}" tidak diketahui.`);
      return;
    }
    setSaving(true);
    try {
      const created = await createSection(websiteId, pageId, { type, content: { ...schema.defaults } });
      const base = savedSections.filter((s) => s.id !== created.id);
      const afterIndex = selectedId ? base.findIndex((s) => s.id === selectedId) : -1;
      const insertAt = schema.pinned === 'top' ? 0 : afterIndex >= 0 ? afterIndex + 1 : base.length;
      const orderedSaved = [...base.slice(0, insertAt), created, ...base.slice(insertAt)];
      if (insertAt !== base.length) {
        await reorderSections(websiteId, pageId, orderedSaved.map((s) => s.id));
      }
      const insertInto = (list: WebsiteSection[]) => {
        const rest = list.filter((s) => s.id !== created.id);
        const at = schema.pinned === 'top' ? 0 : selectedId ? rest.findIndex((s) => s.id === selectedId) + 1 || rest.length : rest.length;
        return [...rest.slice(0, at), created, ...rest.slice(at)];
      };
      setSections(insertInto);
      setSavedSections(orderedSaved);
      setSelectedId(created.id);
      setAddOpen(false);
      if (isCompactViewport) setMobilePanel('properties');
      reloadPreview();
      notify.success(`${schema.label} ditambahkan.`);
    } catch {
      notify.error('Gagal menambahkan section.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async () => {
    if (!selected) return;
    const confirmed = await confirm({
      title: 'Hapus section?',
      description: `Section "${selected.type}" akan dihapus dan tidak dapat dipulihkan.`,
      confirmLabel: 'Hapus section',
      tone: 'danger',
    });
    if (!confirmed) return;
    setSaving(true);
    try {
      await deleteSection(websiteId, pageId, selected.id);
      const remaining = sections.filter((s) => s.id !== selected.id);
      setSections(remaining);
      setSavedSections((current) => current.filter((s) => s.id !== selected.id));
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      if (isCompactViewport) setMobilePanel(isMediumViewport ? 'closed' : 'list');
      reloadPreview();
      notify.success('Section dihapus.');
    } catch {
      notify.error('Gagal menghapus section.');
    } finally {
      setSaving(false);
    }
  };

  /** Section `pinned: 'top'` (hero) dikunci di atas saat mengurutkan. */
  const isPinnedSection = (section: WebsiteSection) => schemaFor(section.type)?.pinned === 'top';

  const handleReorderSave = async (ordered: WebsiteSection[]) => {
    setSaving(true);
    try {
      await reorderSections(websiteId, pageId, ordered.map((s) => s.id));
      setSections(ordered);
      setSavedSections((current) => ordered.map((s) => current.find((c) => c.id === s.id) ?? s));
      reloadPreview();
      notify.success('Urutan section disimpan.');
    } catch {
      notify.error('Gagal menyimpan urutan.');
    } finally {
      setSaving(false);
    }
  };

  /** Simpan sekali untuk semua section yang berubah, lalu muat ulang pratinjau (versi tersimpan). */
  const handleSave = async () => {
    const changed = sections.filter((s) => changedIds.has(s.id));
    if (changed.length === 0) return;
    setSaving(true);
    try {
      const updated = await Promise.all(
        changed.map((s) => updateSection(websiteId, pageId, s.id, { content: s.content })),
      );
      const byId = new Map(updated.map((s) => [s.id, s]));
      setSections((current) => current.map((s) => byId.get(s.id) ?? s));
      setSavedSections((current) => current.map((s) => byId.get(s.id) ?? s));
      reloadPreview();
      notify.success(changed.length > 1 ? `${changed.length} section disimpan.` : 'Section disimpan.');
    } catch {
      notify.error('Gagal menyimpan section.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-[100dvh] items-center justify-center">Memuat editor…</div>;
  if (!page) {
    const back = [{ label: 'Kembali ke Tampilan Website', href: '/studio/appearance?tab=pages', variant: 'secondary' as const }];
    return loadError === 'error' ? (
      <StatusScreen
        icon={<Icon name="refresh" size={28} strokeWidth={1.6} />}
        title="Editor gagal dimuat"
        description="Periksa koneksi lalu coba lagi."
        actions={back}
        note={
          <Button color="primary" radius="sm" onPress={() => setReloadKey((key) => key + 1)}>
            Coba lagi
          </Button>
        }
      />
    ) : (
      <StatusScreen
        icon={<Icon name="more" size={28} strokeWidth={1.6} />}
        title="Halaman tidak ditemukan"
        description="Halaman ini mungkin sudah dihapus atau milik website lain."
        actions={back}
      />
    );
  }

  return (
    <>
    <div className="flex h-[100dvh] flex-col bg-default-50">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-default-200 bg-white px-3 py-2.5 min-[1441px]:gap-3 min-[1441px]:px-6 min-[1441px]:py-3.5">
        <div className="flex items-center gap-3">
          <Button variant="light" radius="sm" size="sm" onPress={() => window.history.back()} className="shrink-0 px-2 min-[1441px]:px-3">
            Kembali ke Halaman
          </Button>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="max-w-[28vw] truncate text-[12px] font-semibold uppercase tracking-wider text-default-600 min-[1441px]:max-w-none">{page.title}</span>
          <Button color="primary" radius="sm" size="sm" isDisabled={saving || !dirty} isLoading={saving} onPress={() => void handleSave()} className="shrink-0">
            Simpan
          </Button>
        </div>
      </header>

      <div className="relative grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[320px_minmax(0,1fr)] min-[1441px]:grid-cols-[320px_minmax(0,1fr)_380px]">
        <aside className="hidden min-h-0 flex-col border-r border-default-200 bg-white md:flex">
          <div className="flex items-center justify-between border-b border-default-100 px-4 py-3">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-default-600">Susunan Section</span>
            <Button variant="bordered" radius="sm" size="sm" onPress={openAddSection} className="px-2 text-[11px]">
              Tambah
            </Button>
          </div>
          <div ref={sectionListRef} className="flex-1 overflow-y-auto p-2">
            {sections.length === 0 ? (
              <div className="py-10 text-center text-[12px] text-default-500">Belum ada section. Tambah section untuk memulai.</div>
            ) : (
              <div className="space-y-1.5">
                <SortableSections
                  items={sections}
                  isPinned={isPinnedSection}
                  getLabel={(section) => schemaFor(section.type)?.label ?? section.type}
                  onReorder={(ordered) => void handleReorderSave(ordered)}
                  disabled={saving}
                  size="sm"
                  renderItem={(section, handle) => {
                  const schema = schemaFor(section.type);
                  const isActive = section.id === selectedId;
                  return (
                    <div key={section.id} data-section-id={section.id} className="flex w-full min-w-0 items-center gap-1">
                      {handle}
                      <button
                        type="button"
                        onClick={() => setSelectedId(section.id)}
                        className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-left transition-colors ${
                          isActive
                            ? 'border-primary-200 bg-primary-50 text-primary'
                            : 'border-default-200 bg-white text-default-600 hover:border-default-300 hover:bg-default-50'
                        }`}
                      >
                        <Icon name={SECTION_ICON[schema?.icon ?? ''] ?? 'more'} size={14} strokeWidth={1.6} />
                        <span className="flex-1 truncate text-[12px] font-medium">{schema?.label ?? section.type}</span>
                        {changedIds.has(section.id) && (
                          <span aria-label="Belum disimpan" title="Belum disimpan" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E0679A]" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(section.id);
                          setMobilePanel('properties');
                        }}
                        className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-default-400 hover:bg-primary-50 hover:text-primary md:flex min-[1441px]:hidden"
                        title={`Edit ${schema?.label ?? section.type}`}
                        aria-label={`Edit ${schema?.label ?? section.type}`}
                      >
                        <Icon name="edit" size={14} strokeWidth={1.5} />
                      </button>
                      {isActive && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteSection()}
                          className="rounded-[6px] p-1 text-default-400 hover:bg-danger-50 hover:text-danger"
                          title="Hapus section"
                          aria-label={`Hapus ${schema?.label ?? section.type}`}
                        >
                          <Icon name="trash" size={14} strokeWidth={1.4} />
                        </button>
                      )}
                    </div>
                  );
                  }}
                />
              </div>
            )}
          </div>
        </aside>

        <main className="relative flex min-h-0 min-w-0 flex-col border-r border-default-200 bg-white">
          <PagePreviewPanel
            iframeRef={iframeRef}
            previewUrl={previewUrl}
            frameKey={preview.frameKey}
            status={preview.status}
            device={device}
            onDeviceChange={setDevice}
            onFrameLoad={preview.handleFrameLoad}
            onReload={preview.reload}
            dirty={dirty}
            pageTitle={page.title}
          />
          {mobilePanel === 'closed' && (
            <button
              type="button"
              onClick={() => setMobilePanel('list')}
              className="absolute left-2 top-1/2 z-10 inline-flex -translate-y-1/2 items-center gap-2 rounded-r-xl rounded-l-md border border-l-0 border-default-300 bg-white/95 px-2.5 py-3 text-xs font-semibold text-default-700 shadow-lg backdrop-blur md:hidden"
              aria-label="Buka daftar section"
            >
              <Icon name="menu" size={17} strokeWidth={1.8} />
              <span className="[writing-mode:vertical-rl]">Section</span>
            </button>
          )}
        </main>

        <aside className="hidden min-h-0 w-[380px] flex-col border-l border-default-200 bg-white min-[1441px]:flex">
          <div className="flex items-center justify-between border-b border-default-100 px-4 py-3">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-default-600">
              {selected ? 'Properti Section' : 'Pilih section'}
            </span>
            {selected && (
              <button
                type="button"
                onClick={() => void handleDeleteSection()}
                className="rounded-[6px] p-1 text-default-400 hover:bg-danger-50 hover:text-danger"
                title="Hapus section"
                aria-label="Hapus section"
              >
                <Icon name="trash" size={14} strokeWidth={1.4} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {!selected ? (
              <div className="py-20 text-center text-[12px] text-default-500">
                Pilih section di panel kiri untuk mengedit propertinya.
              </div>
            ) : !selectedSchema ? (
              <div className="py-20 text-center text-[12px] text-default-500">
                Skema untuk section &quot;{selected.type}&quot; tidak tersedia.
              </div>
            ) : (
              <SectionPropertiesForm
                key={selected.id}
                schema={selectedSchema}
                content={selected.content}
                websiteId={websiteId}
                onChange={(next) => updateDraftContent(selected.id, next)}
              />
            )}
          </div>
        </aside>

        {mobilePanel !== 'closed' && (!isMediumViewport || mobilePanel === 'properties') && (
          <div className="absolute inset-0 z-20 flex min-[1441px]:hidden">
            <button
              type="button"
              aria-label="Tutup panel section"
              onClick={() => setMobilePanel('closed')}
              className="absolute inset-0 animate-studio-fade-in bg-black/30 motion-reduce:animate-none"
            />
            <aside className="relative z-10 flex h-full w-[min(88vw,360px)] max-w-full animate-studio-fade-in flex-col border-r border-default-200 bg-white shadow-2xl motion-reduce:animate-none md:w-[380px]">
              {mobilePanel === 'list' ? (
                <>
                  <div className="flex items-center justify-between gap-3 border-b border-default-100 px-4 py-3">
                    <span className="text-[12px] font-semibold uppercase tracking-wider text-default-600">Susunan Section</span>
                    <div className="flex items-center gap-2">
                      <Button variant="bordered" radius="sm" size="sm" onPress={openAddSection} className="px-2 text-[11px]">
                        Tambah
                      </Button>
                      <button
                        type="button"
                        onClick={() => setMobilePanel('closed')}
                        className="rounded-lg p-2 text-default-500 hover:bg-default-100"
                        aria-label="Kembali ke pratinjau"
                      >
                        <Icon name="close" size={16} />
                      </button>
                    </div>
                  </div>
                  <div ref={mobileSectionListRef} className="flex-1 overflow-y-auto p-3">
                    {sections.length === 0 ? (
                      <div className="py-10 text-center text-[12px] text-default-500">
                        Belum ada section. Tambah section untuk memulai.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <SortableSections
                          items={sections}
                          isPinned={isPinnedSection}
                          getLabel={(section) => schemaFor(section.type)?.label ?? section.type}
                          onReorder={(ordered) => void handleReorderSave(ordered)}
                          disabled={saving}
                          size="md"
                          renderItem={(section, handle) => {
                          const schema = schemaFor(section.type);
                          const isActive = section.id === selectedId;
                          return (
                            <div
                              key={section.id}
                              data-section-id={section.id}
                              className={`flex w-full min-w-0 items-center gap-2 rounded-xl border p-1.5 ${
                                isActive ? 'border-primary-200 bg-primary-50' : 'border-default-200 bg-white'
                              }`}
                            >
                              {handle}
                              <button
                                type="button"
                                onClick={() => setSelectedId(section.id)}
                                className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg px-2.5 text-left"
                              >
                                <Icon
                                  name={SECTION_ICON[schema?.icon ?? ''] ?? 'more'}
                                  size={17}
                                  strokeWidth={1.7}
                                  className={isActive ? 'text-primary' : 'text-default-500'}
                                />
                                <span className={`min-w-0 flex-1 truncate text-sm font-medium ${isActive ? 'text-primary' : 'text-default-700'}`}>
                                  {schema?.label ?? section.type}
                                </span>
                                {changedIds.has(section.id) && (
                                  <span
                                    aria-label="Belum disimpan"
                                    title="Belum disimpan"
                                    className="h-2 w-2 shrink-0 rounded-full bg-[#E0679A]"
                                  />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedId(section.id);
                                  setMobilePanel('properties');
                                }}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-default-500 hover:bg-default-100 hover:text-primary"
                                aria-label={`Edit ${schema?.label ?? section.type}`}
                                title="Edit section"
                              >
                                <Icon name="edit" size={17} strokeWidth={1.7} />
                              </button>
                              {isActive && (
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteSection()}
                                  className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg text-default-400 hover:bg-danger-50 hover:text-danger"
                                  aria-label={`Hapus ${schema?.label ?? section.type}`}
                                  title="Hapus section"
                                >
                                  <Icon name="trash" size={15} strokeWidth={1.5} />
                                </button>
                              )}
                            </div>
                          );
                          }}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 border-b border-default-100 px-3 py-3">
                    <button
                      type="button"
                      onClick={() => setMobilePanel(isMediumViewport ? 'closed' : 'list')}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary-50"
                    >
                      <span aria-hidden="true">←</span>
                      Kembali ke daftar komponen
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-default-100 px-4 py-3">
                    <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                      {selectedSchema?.label ?? selected?.type ?? 'Properti section'}
                    </span>
                    {selected && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteSection()}
                        className="rounded-lg p-2 text-default-400 hover:bg-danger-50 hover:text-danger"
                        aria-label="Hapus section"
                        title="Hapus section"
                      >
                        <Icon name="trash" size={15} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {!selected ? (
                      <div className="py-12 text-center text-sm text-default-500">Pilih section untuk mengedit propertinya.</div>
                    ) : !selectedSchema ? (
                      <div className="py-12 text-center text-sm text-default-500">
                        Skema untuk section &quot;{selected.type}&quot; tidak tersedia.
                      </div>
                    ) : (
                      <SectionPropertiesForm
                        key={selected.id}
                        schema={selectedSchema}
                        content={selected.content}
                        websiteId={websiteId}
                        onChange={(next) => updateDraftContent(selected.id, next)}
                      />
                    )}
                  </div>
                </>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
    {confirmDialog}
    <AddSectionDialog
      open={addOpen}
      onClose={() => setAddOpen(false)}
      schemas={schemas}
      templateId={website?.template_id ?? null}
      existingTypes={new Set(sections.map((s) => s.type))}
      insertAfterLabel={selected ? (schemaFor(selected.type)?.label ?? selected.type) : null}
      busy={saving}
      onAdd={(type) => void handleAddSection(type)}
    />
    </>
  );
}

function SectionPropertiesForm({
  schema,
  content,
  websiteId,
  onChange,
}: {
  schema: TemplateManifestSection;
  content: Record<string, unknown>;
  websiteId: string;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() => ({ ...content }));

  const handleFieldChange = useCallback(
    (key: string, value: unknown) => {
      const next = { ...values, [key]: value };
      setValues(next);
      onChange(next);
    },
    [values, onChange],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <span className="text-[12px] font-semibold text-default-600 uppercase tracking-wider">Field</span>
        {schema.fields.filter((field) => isFieldVisible(field, schema.fields, values)).map((field) => (
          <div key={field.key} className="flex flex-col gap-1.5">
            {field.type !== 'richtext' && (
              <label className="text-[12px] font-medium text-foreground">
                {field.label}{field.required ? ' *' : ''}
              </label>
            )}
            <SectionFieldInput
              field={field}
              value={values[field.key]}
              websiteId={websiteId}
              onChange={(v) => handleFieldChange(field.key, v)}
            />
            {!['richtext', 'phone', 'email', 'url'].includes(field.type) && field.description && <p className="text-[11px] text-default-500">{field.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function normalizeSectionSchema(schema: TemplateManifestSection): TemplateManifestSection {
  if (schema.type !== 'features_grid') return schema;
  const defaults = Object.fromEntries(
    Object.entries(schema.defaults).filter(([key]) => !/^feature_[1-4]_(icon|title|desc)$/.test(key)),
  );
  return {
    ...schema,
    description: 'Tambahkan alasan pelanggan memilih kamu, mis. Gratis Ongkir atau Garansi.',
    defaults: { ...defaults, title: 'Kenapa Pilih Kami', features: [] },
    fields: [
      ...schema.fields.filter((field) => field.key !== 'features' && !/^feature_[1-4]_(icon|title|desc)$/.test(field.key)),
      {
        key: 'features',
        label: 'Daftar keunggulan',
        type: 'list',
        itemFields: [
          { key: 'icon', label: 'Ikon', type: 'iconPicker', default: '⭐' },
          { key: 'title', label: 'Judul keunggulan', type: 'text', placeholder: 'Gratis Ongkir' },
          { key: 'desc', label: 'Penjelasan keunggulan', type: 'textarea' },
        ],
      },
    ],
  };
}

function normalizeLegacyFeatures(section: WebsiteSection): WebsiteSection {
  if (section.type !== 'features_grid' || Array.isArray(section.content.features)) return section;
  const features = [1, 2, 3, 4]
    .map((index) => ({
      icon: section.content[`feature_${index}_icon`],
      title: section.content[`feature_${index}_title`],
      desc: section.content[`feature_${index}_desc`],
    }))
    .filter((item) =>
      [item.title, item.desc].some((value) => typeof value === 'string' && value.trim()),
    );
  return { ...section, content: { ...section.content, features } };
}

function SectionFieldInput({
  field,
  value,
  websiteId,
  onChange,
}: {
  field: TemplateManifestField;
  value: unknown;
  websiteId: string;
  onChange: (v: unknown) => void;
}) {
  const str = String(value ?? '');
  switch (field.type) {
    case 'url':
      return <UrlField field={field} value={value} onChange={onChange} />;
    case 'phone':
      return <PhoneField field={field} value={value} websiteId={websiteId} onChange={onChange} />;
    case 'email':
      return <EmailField field={field} value={value} onChange={onChange} />;
    case 'text':
      return (
        <Input
          type={field.type}
          value={str}
          onValueChange={(v) => onChange(v)}
          placeholder={field.placeholder}
        />
      );
    case 'number':
      return (
        <Input
          type="number"
          value={str}
          onValueChange={(v) => onChange(v === '' ? undefined : Number(v))}
          placeholder={field.placeholder}
        />
      );
    case 'textarea':
      return (
        <Textarea value={str} onValueChange={onChange} placeholder={field.placeholder} rows={3} className="w-full" />
      );
    case 'richtext':
      return (
        <RichTextEditor
          label={`${field.label}${field.required ? ' *' : ''}`}
          description={field.description}
          value={str}
          onChange={onChange}
          websiteId={websiteId}
          uploadFolder="content"
        />
      );
    case 'postPicker':
    case 'blogPostPicker':
      return (
        <ArticlePickerField
          value={value}
          websiteId={websiteId}
          multiple={field.multiple ?? false}
          onChange={onChange}
        />
      );
    case 'productPicker':
      return (
        <ProductPickerField
          value={value}
          websiteId={websiteId}
          multiple={field.multiple ?? false}
          maxItems={field.maxItems}
          onChange={onChange}
        />
      );
    case 'faqCategoryPicker':
      return <FaqCategoryPickerField value={str} websiteId={websiteId} onChange={onChange} />;
    case 'select':
      if (field.display === 'segmented' && !field.multiple) {
        return <SegmentedField field={field} value={value} onChange={onChange} />;
      }
      return (
        <Select
          selectedKeys={[str]}
          onSelectionChange={(keys) => {
            const [first] = Array.from(keys);
            onChange(first ?? '');
          }}
          placeholder={field.placeholder}
        >
          {(field.options ?? []).map((o) => (
            <SelectItem key={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </Select>
      );
    case 'iconPicker':
      return <IconPickerField value={str} onChange={onChange} />;
    case 'switch':
      return <Switch isSelected={Boolean(value)} onValueChange={onChange} />;
    case 'image':
      return (
        <ImageUploadField value={str} websiteId={websiteId} label={field.label} onChange={onChange} />
      );
    case 'gallery':
      return <GalleryUploadField value={value} websiteId={websiteId} onChange={onChange} />;
    case 'list':
      return (
        <SectionListField
          field={field}
          value={value}
          websiteId={websiteId}
          onChange={onChange}
        />
      );
    default:
      return <Input value={str} onValueChange={onChange} placeholder={field.placeholder} disabled />;
  }
}

function SectionListField({
  field,
  value,
  websiteId,
  onChange,
}: {
  field: TemplateManifestField;
  value: unknown;
  websiteId: string;
  onChange: (value: Record<string, unknown>[]) => void;
}) {
  const items = Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
  const itemFields = field.itemFields ?? [];
  const maxItems = field.maxItems ?? Number.POSITIVE_INFINITY;
  const minItems = field.minItems ?? 0;
  const itemLabel = field.key === 'features' ? 'keunggulan' : field.label.toLocaleLowerCase('id');

  const updateItem = (index: number, key: string, nextValue: unknown) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: nextValue } : item)));
  };

  const addItem = () => {
    if (items.length >= maxItems) return;
    const newItem = Object.fromEntries(
      itemFields.map((itemField) => [
        itemField.key,
        itemField.default ?? (itemField.type === 'switch' ? false : ''),
      ]),
    );
    onChange([...items, newItem]);
  };

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-default-300 px-3 py-4 text-center text-xs text-default-500">
          Belum ada {itemLabel}. Tambahkan item untuk ditampilkan di halaman.
        </p>
      )}
      {items.map((item, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-lg border border-default-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-default-600">
              {field.key === 'features' ? 'Keunggulan' : 'Item'} {index + 1}
            </span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
              disabled={items.length <= minItems}
              className="rounded-md p-1 text-default-400 hover:bg-danger-50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Hapus item ${index + 1}`}
              title={`Hapus item ${index + 1}`}
            >
              <Icon name="trash" size={14} strokeWidth={1.4} />
            </button>
          </div>
          {itemFields.map((itemField) => (
            <div key={itemField.key} className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-default-600">
                {itemField.label}{itemField.required ? ' *' : ''}
              </label>
              <SectionFieldInput
                field={itemField}
                value={item[itemField.key]}
                websiteId={websiteId}
                onChange={(nextValue) => updateItem(index, itemField.key, nextValue)}
              />
            </div>
          ))}
        </div>
      ))}
      <Button
        type="button"
        variant="bordered"
        radius="sm"
        size="sm"
        onPress={addItem}
        isDisabled={items.length >= maxItems}
      >
        {items.length >= maxItems ? `Maksimal ${maxItems} item` : `Tambah ${itemLabel}`}
      </Button>
    </div>
  );
}
