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
import type { TemplateManifestSection } from '@/studio/api/templates';
import { buildPagePreviewUrl, type PagePreviewDevice } from '@/studio/lib/template-preview';
import { useWebsiteStore } from '@/studio/stores/website-store';
import type { IconName } from '@/studio/ui/icons';
import { Icon } from '@/studio/ui/icons';
import { StatusScreen } from '@/studio/ui/primitives/StatusScreen';
import { notify } from '@/studio/ui/primitives/Toast';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';

import { PagePreviewPanel } from './PagePreviewPanel';
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sectionListRef = useRef<HTMLDivElement>(null);
  const website = useWebsiteStore((s) => s.websites.find((w) => w.website.id === websiteId)?.website ?? null);

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
        setSchemas(schemaRes.value.sections);
      } else {
        notify.error('Daftar jenis section gagal dimuat. Properti section belum bisa diedit.');
      }
      if (pageRes.status === 'fulfilled') {
        setPage(pageRes.value.page);
        setSections(pageRes.value.sections);
        setSavedSections(pageRes.value.sections);
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
    const item = sectionListRef.current?.querySelector(`[data-section-id="${CSS.escape(sectionId)}"]`);
    item?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

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

  const handleAddSection = async () => {
    const type = window.prompt('Tipe section (contoh: hero, text_block, cta, products_grid):', 'text_block');
    if (!type?.trim()) return;
    const schema = schemaFor(type.trim());
    if (!schema) {
      notify.error(`Tipe section "${type.trim()}" tidak diketahui.`);
      return;
    }
    setSaving(true);
    try {
      const created = await createSection(websiteId, pageId, { type: type.trim(), content: { ...schema.defaults } });
      setSections((current) => [...current, created]);
      setSavedSections((current) => [...current, created]);
      setSelectedId(created.id);
      reloadPreview();
      notify.success('Section ditambahkan.');
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
      reloadPreview();
      notify.success('Section dihapus.');
    } catch {
      notify.error('Gagal menghapus section.');
    } finally {
      setSaving(false);
    }
  };

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
      <header className="border-b border-default-200 bg-white sticky top-0 z-10 px-6 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="light" radius="sm" size="sm" onPress={() => window.history.back()}>
            Kembali ke Halaman
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-default-600 uppercase tracking-wider">{page.title}</span>
          <Button color="primary" radius="sm" size="sm" isDisabled={saving || !dirty} isLoading={saving} onPress={() => void handleSave()}>
            Simpan
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden flex">
        <aside className="w-[320px] border-r border-default-200 bg-white flex flex-col">
          <div className="border-b border-default-100 px-4 py-3 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-default-600 uppercase tracking-wider">Susunan Section</span>
            <Button variant="bordered" radius="sm" size="sm" onPress={handleAddSection} className="px-2 text-[11px]">
              Tambah
            </Button>
          </div>
          <div ref={sectionListRef} className="flex-1 overflow-y-auto p-2">
            {sections.length === 0 ? (
              <div className="text-center py-10 text-default-500 text-[12px]">Belum ada section. Tambah section untuk memulai.</div>
            ) : (
              <div className="space-y-1.5">
                {sections.map((s) => {
                  const schema = schemaFor(s.type);
                  const isActive = s.id === selectedId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      data-section-id={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className={`flex w-full min-w-0 items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left transition-colors ${
                        isActive
                          ? 'bg-primary-50 border border-primary-200 text-primary'
                          : 'bg-white border border-default-200 text-default-600 hover:bg-default-50 hover:border-default-300'
                      }`}
                    >
                      <Icon name={SECTION_ICON[schema?.icon ?? ''] ?? 'more'} size={14} strokeWidth={1.6} />
                      <span className="text-[12px] font-medium truncate flex-1">{schema?.label ?? s.type}</span>
                      {changedIds.has(s.id) && (
                        <span aria-label="Belum disimpan" title="Belum disimpan" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E0679A]" />
                      )}
                      {s.id === selectedId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteSection();
                          }}
                          className="rounded-[6px] text-default-400 hover:text-danger hover:bg-danger-50 p-1"
                          title="Hapus"
                        >
                          <Icon name="trash" size={11} strokeWidth={1.4} />
                        </button>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 border-r border-default-200 bg-white relative flex flex-col min-w-0">
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
        </main>

        <aside className="w-[380px] border-l border-default-200 bg-white flex flex-col">
          <div className="border-b border-default-100 px-4 py-3 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-default-600 uppercase tracking-wider">
              {selected ? 'Properti Section' : 'Pilih section'}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {!selected ? (
              <div className="text-center py-20 text-default-500 text-[12px]">
                Pilih section di panel kiri untuk mengedit propertinya.
              </div>
            ) : !selectedSchema ? (
              <div className="text-center py-20 text-default-500 text-[12px]">
                Skema untuk section &quot;{selected.type}&quot; tidak tersedia.
              </div>
            ) : (
              <SectionPropertiesForm
                key={selected.id}
                schema={selectedSchema}
                content={selected.content}
                onChange={(next) => updateDraftContent(selected.id, next)}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
    {confirmDialog}
    </>
  );
}

function SectionPropertiesForm({
  schema,
  content,
  onChange,
}: {
  schema: TemplateManifestSection;
  content: Record<string, unknown>;
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
        {schema.fields.map((field) => (
          <div key={field.key} className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">
              {field.label}{field.required ? ' *' : ''}
            </label>
            <SectionFieldInput
              field={field}
              value={values[field.key]}
              onChange={(v) => handleFieldChange(field.key, v)}
            />
            {field.description && <p className="text-[11px] text-default-500">{field.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionFieldInput({
  field,
  value,
  onChange,
}: {
  field: TemplateManifestSection['fields'][number];
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const str = String(value ?? '');
  switch (field.type) {
    case 'text':
    case 'url':
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
    case 'select':
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
    case 'switch':
      return <Switch isSelected={Boolean(value)} onValueChange={onChange} />;
    case 'image':
    case 'gallery':
      return (
        <div className="flex items-center gap-2">
          <Input type="text" value={str} onValueChange={onChange} placeholder={field.placeholder ?? 'URL gambar'} />
          <Button variant="bordered" radius="sm" size="sm" onPress={() => {}} className="px-2">
            Pilih
          </Button>
        </div>
      );
    default:
      return <Input value={str} onValueChange={onChange} placeholder={field.placeholder} disabled />;
  }
}
