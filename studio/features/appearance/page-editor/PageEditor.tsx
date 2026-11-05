'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useSearchParams, useRouter } from 'next/navigation';

import { Button, Input, Select, SelectItem, Switch, Textarea } from '@heroui/react';

import {
  fetchPageAndSections,
  type WebsitePage,
  type WebsiteSection,
} from '@/studio/api/pages';
import { createSection, updateSection, deleteSection, reorderSections } from '@/studio/api/sections';
import { fetchSectionSchemas } from '@/studio/api/templates';
import type { TemplateManifestSection } from '@/studio/api/templates';
import type { IconName } from '@/studio/ui/icons';
import { Icon } from '@/studio/ui/icons';
import { notify } from '@/studio/ui/primitives/Toast';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';

interface PageEditorProps {
  pageId: string;
}

export function PageEditor({ pageId }: PageEditorProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const websiteId = searchParams.get('websiteId') ?? '';
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [page, setPage] = useState<WebsitePage | null>(null);
  const [sections, setSections] = useState<WebsiteSection[]>([]);
  const [schemas, setSchemas] = useState<TemplateManifestSection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!websiteId) {
      setLoading(false);
      notify.error('Website ID tidak ditemukan.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [schemaRes, pageRes] = await Promise.all([
          fetchSectionSchemas(),
          fetchPageAndSections(websiteId, pageId),
        ]);
        if (cancelled) return;
        setSchemas(schemaRes.sections);
        setPage(pageRes.page);
        setSections(pageRes.sections);
        if (pageRes.sections.length > 0) setSelectedId(pageRes.sections[0].id);
      } catch {
        notify.error('Gagal memuat halaman dan section.');
      } finally {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [websiteId, pageId]);

  const schemaMap = useMemo(() => {
    const map = new Map<string, TemplateManifestSection>();
    for (const s of schemas) map.set(s.type, s);
    return map;
  }, [schemas]);

  const schemaFor = useCallback((type: string) => schemaMap.get(type), [schemaMap]);

  const selected = useMemo(() => sections.find((s) => s.id === selectedId) ?? null, [sections, selectedId]);
  const selectedSchema = selected ? schemaFor(selected.type) : null;

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
      setSections([...sections, created]);
      setSelectedId(created.id);
      setDirty(true);
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
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      setDirty(true);
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
      setDirty(true);
      notify.success('Urutan section disimpan.');
    } catch {
      notify.error('Gagal menyimpan urutan.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSection = async (patch: Partial<WebsiteSection>) => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateSection(websiteId, pageId, selected.id, patch);
      setSections(sections.map((s) => (s.id === selected.id ? updated : s)));
      setDirty(false);
      notify.success('Section disimpan.');
    } catch {
      notify.error('Gagal menyimpan section.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-[100dvh] items-center justify-center">Memuat editor…</div>;
  if (!page) return <div className="flex h-[100dvh] items-center justify-center">Halaman tidak ditemukan.</div>;

  return (
    <>
    <div className="flex h-[100dvh] bg-default-50">
      <header className="border-b border-default-200 bg-white sticky top-0 z-10 px-6 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="light" radius="sm" size="sm" onPress={() => window.history.back()}>
            Kembali ke Halaman
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-default-600 uppercase tracking-wider">{page.title}</span>
          <Button color="primary" radius="sm" size="sm" disabled={saving || !dirty} onPress={() => void handleUpdateSection({})}>
            Simpan
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex">
        <aside className="w-[320px] border-r border-default-200 bg-white flex flex-col">
          <div className="border-b border-default-100 px-4 py-3 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-default-600 uppercase tracking-wider">Susunan Section</span>
            <Button variant="bordered" radius="sm" size="sm" onPress={handleAddSection} className="px-2 text-[11px]">
              Tambah
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
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
                      onClick={() => {
                        setSelectedId(s.id);
                        setDirty(false);
                      }}
                      className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left transition-colors ${
                        isActive
                          ? 'bg-primary-50 border border-primary-200 text-primary'
                          : 'bg-white border border-default-200 text-default-600 hover:bg-default-50 hover:border-default-300'
                      }`}
                    >
                      <Icon name={(schema?.icon as IconName) ?? 'more'} size={14} strokeWidth={1.6} />
                      <span className="text-[12px] font-medium truncate flex-1">{schema?.label ?? s.type}</span>
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
          <div className="border-b border-default-100 px-4 py-3 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-default-600 uppercase tracking-wider">Pratinjau</span>
            <span className="text-[11px] text-default-500">Draft — belum tersimpan</span>
          </div>
          <div className="flex-1 overflow-auto p-8 bg-default-50">
            <div className="max-w-2xl mx-auto">
              <div className="rounded-[20px] border border-default-200 bg-white p-8 shadow-sm">
                {sections.length === 0 ? (
                  <div className="text-center py-20 text-default-400">
                    <Icon name="empty" size={32} strokeWidth={1.4} className="mx-auto mb-3" />
                    <p className="text-sm text-default-500">Tambah section untuk melihat pratinjau.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {sections.map((s) => {
                      const schema = schemaFor(s.type);
                      return (
                        <div key={s.id} className="relative rounded-[16px] border border-default-200 bg-white p-6 mb-4 shadow-sm ring-1 ring-transparent">
                          <div className="absolute top-2 right-2 flex gap-1">
                            <span className="text-[10px] font-semibold text-default-400 uppercase tracking-wider px-2 py-0.5 rounded bg-default-100">
                              {s.type}
                            </span>
                          </div>
                          <div className="text-sm text-default-600">{schema?.description ?? 'Pratinjau section tidak tersedia.'}</div>
                          <div className="mt-4 text-[12px] text-default-400 font-mono break-all">
                            {JSON.stringify(s.content ?? {}, null, 2).slice(0, 300)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
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
            ) : (
              <SectionPropertiesForm
                schema={selectedSchema!}
                content={selected.content}
                onChange={async (patch) => {
                  setDirty(true);
                  await handleUpdateSection({ content: patch });
                }}
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
  onChange: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() => ({ ...content }));

  const handleFieldChange = useCallback(
    (key: string, value: unknown) => {
      const next = { ...values, [key]: value };
      setValues(next);
      void onChange(next);
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
