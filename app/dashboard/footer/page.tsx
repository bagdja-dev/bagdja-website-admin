'use client';

import { Button, Card, CardBody } from '@heroui/react';
import { useEffect, useMemo, useState } from 'react';

import { AppModal } from '../../components/app-modal';
import { useConfirmDialog } from '../../components/confirm-dialog';
import { FormInput, FormSwitch, FormTextarea } from '../../components/form-field';
import { LoadingSpinner } from '../../components/loading-spinner';
import { TemplatePreview, type PreviewViewport } from '../../components/template-preview';
import { useWebsiteContext } from '../../context/website-context';
import { apiClient } from '../../lib/api-client';
import {
  createFooterBlockId,
  FOOTER_BLOCK_CONFIGS,
  footerBlockToFormValues,
  formValuesToFooterContent,
  getFooterBlockConfig,
  getFooterBlockSummary,
} from '../../lib/footer-blocks';
import type { SectionFormValue } from '../../lib/section-types';
import {
  FOOTER_BLOCK_TYPES,
  hasMinRole,
  type FooterBlock,
  type FooterBlockType,
  type Website,
  type WebsiteTemplate,
} from '../../lib/types';
import { sanitizeWebsiteTheme } from '../../lib/website-theme';

function readBlocks(raw: Website['footer_settings']): FooterBlock[] {
  if (!raw || !Array.isArray(raw.blocks)) return [];
  return raw.blocks.filter(
    (block): block is FooterBlock =>
      !!block && typeof block.id === 'string' && (FOOTER_BLOCK_TYPES as readonly string[]).includes(block.type),
  );
}

export default function FooterComponentEditor() {
  const { activeWebsite, websiteId, role, loading: ctxLoading, refresh } = useWebsiteContext();
  const { confirm, dialog } = useConfirmDialog();
  const website = activeWebsite?.website;
  const canEdit = role ? hasMinRole(role, 'editor') : false;

  const [blocks, setBlocks] = useState<FooterBlock[]>([]);
  const [savedJson, setSavedJson] = useState('[]');
  const [template, setTemplate] = useState<WebsiteTemplate | null>(null);
  const [viewport, setViewport] = useState<PreviewViewport>('desktop');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string | null; type: FooterBlockType } | null>(null);
  const [formValues, setFormValues] = useState<Record<string, SectionFormValue>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const initial = readBlocks(website?.footer_settings);
    setBlocks(initial);
    setSavedJson(JSON.stringify(initial));
  }, [website?.footer_settings]);

  useEffect(() => {
    const templateId = website?.template_id;
    if (!templateId) {
      setTemplate(null);
      return;
    }
    apiClient<WebsiteTemplate>(`/api/templates/${templateId}`)
      .then(setTemplate)
      .catch(() => setTemplate(null));
  }, [website?.template_id]);

  const dirty = JSON.stringify(blocks) !== savedJson;
  const usedSingles = new Set(blocks.filter((b) => getFooterBlockConfig(b.type).single).map((b) => b.type));
  const editingConfig = editing ? getFooterBlockConfig(editing.type) : null;

  const previewProfile = useMemo(
    () => ({
      name: website?.name,
      tagline: website?.tagline ?? undefined,
      logo_url: website?.logo_url ?? undefined,
      whatsapp: website?.whatsapp ?? undefined,
      phone: website?.phone ?? undefined,
      email: website?.email ?? undefined,
      footerSettings: { blocks },
      theme: sanitizeWebsiteTheme(website?.theme),
    }),
    [website, blocks],
  );

  const openNew = (type: FooterBlockType) => {
    const config = getFooterBlockConfig(type);
    setEditing({ id: null, type });
    setFormValues(footerBlockToFormValues({ type, content: config.defaults }));
    setPickerOpen(false);
  };

  const openEdit = (block: FooterBlock) => {
    setEditing({ id: block.id, type: block.type });
    setFormValues(footerBlockToFormValues(block));
  };

  const applyBlock = () => {
    if (!editing) return;
    const content = formValuesToFooterContent(editing.type, formValues);
    setBlocks((current) =>
      editing.id
        ? current.map((block) => (block.id === editing.id ? { ...block, content } : block))
        : [...current, { id: createFooterBlockId(), type: editing.type, content }],
    );
    setEditing(null);
    setMessage('');
  };

  const removeBlock = async (block: FooterBlock) => {
    const ok = await confirm({
      title: 'Hapus Blok Ini?',
      message: `Blok "${getFooterBlockConfig(block.type).label}" akan dihapus dari footer setelah disimpan.`,
    });
    if (!ok) return;
    setBlocks((current) => current.filter((b) => b.id !== block.id));
    setMessage('');
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const swap = direction === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= blocks.length) return;
    setBlocks((current) => {
      const next = [...current];
      [next[index], next[swap]] = [next[swap], next[index]];
      return next;
    });
    setMessage('');
  };

  const handleSave = async () => {
    if (!websiteId) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await apiClient<Website>(`/api/websites/${websiteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ footer_settings: { blocks } }),
      });
      setSavedJson(JSON.stringify(blocks));
      setMessage(blocks.length > 0 ? 'Footer berhasil disimpan' : 'Footer dikosongkan — website tidak menampilkan footer');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan footer');
    } finally {
      setSaving(false);
    }
  };

  if (ctxLoading) return <LoadingSpinner />;
  if (!website) return null;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 shadow-md ring-1 ring-default-100">
        <div className="relative bg-gradient-to-br from-slate-700 via-slate-800 to-indigo-700 px-4 py-5 sm:px-6">
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">Komponen Footer</h1>
              <p className="mt-0.5 text-sm text-slate-200">
                Susun footer dari blok. Berlaku di semua halaman website. Tanpa blok = footer tidak ditampilkan.
              </p>
            </div>
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="flat"
                  className="bg-white/15 font-semibold text-white backdrop-blur-sm"
                  onPress={() => setPickerOpen(true)}
                >
                  + Tambah Blok
                </Button>
                <Button
                  className="bg-white font-semibold text-slate-800"
                  isLoading={saving}
                  isDisabled={!dirty}
                  onPress={handleSave}
                >
                  Simpan Footer
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {message && (
        <p role="status" className="rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {dirty && !saving && (
        <p className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-700">
          Ada perubahan yang belum disimpan.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr] lg:items-start">
        <div className="space-y-3">
          {blocks.length === 0 ? (
            <Card className="border-0 shadow-sm ring-1 ring-default-100">
              <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-default-100 text-2xl">🧱</div>
                <p className="font-semibold">Footer belum ada</p>
                <p className="max-w-xs text-sm text-default-500">
                  Tambahkan blok seperti Brand, Kontak, atau Copyright untuk menampilkan footer di website.
                </p>
                {canEdit && (
                  <Button color="primary" onPress={() => setPickerOpen(true)}>
                    Tambah Blok Pertama
                  </Button>
                )}
              </CardBody>
            </Card>
          ) : (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-default-400">
                Urutan kolom (kiri → kanan, atas → bawah di mobile)
              </p>
              {blocks.map((block, index) => {
                const config = getFooterBlockConfig(block.type);
                return (
                  <Card key={block.id} className="overflow-hidden border-0 shadow-sm ring-1 ring-default-100">
                    <div className="flex">
                      {canEdit && (
                        <div className="flex flex-col items-center justify-center gap-1 border-r border-default-100 bg-default-50/80 px-2 py-3">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveBlock(index, 'up')}
                            className="rounded-lg p-1.5 text-default-400 transition-colors hover:bg-white hover:text-primary disabled:opacity-30"
                            aria-label="Pindah ke atas"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                            </svg>
                          </button>
                          <span className="text-xs font-bold text-default-400">{index + 1}</span>
                          <button
                            type="button"
                            disabled={index === blocks.length - 1}
                            onClick={() => moveBlock(index, 'down')}
                            className="rounded-lg p-1.5 text-default-400 transition-colors hover:bg-white hover:text-primary disabled:opacity-30"
                            aria-label="Pindah ke bawah"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                          </button>
                        </div>
                      )}
                      <CardBody className="flex flex-1 flex-col gap-3 p-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg text-white ${config.gradient}`}
                          >
                            {config.icon}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{config.label}</p>
                            <p className="mt-0.5 line-clamp-2 text-sm text-default-500">{getFooterBlockSummary(block)}</p>
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex gap-2">
                            <Button size="sm" color="primary" variant="flat" className="px-2" onPress={() => openEdit(block)}>
                              Edit
                            </Button>
                            <Button size="sm" color="danger" variant="light" className="px-2" onPress={() => void removeBlock(block)}>
                              Hapus
                            </Button>
                          </div>
                        )}
                      </CardBody>
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </div>

        <div className="min-w-0">
          <p className="mb-2 text-sm font-medium text-foreground">Preview live</p>
          {template ? (
            <TemplatePreview
              template={template}
              profile={previewProfile}
              viewport={viewport}
              onViewportChange={setViewport}
              showToolbar
              interactive={false}
            />
          ) : (
            <p className="rounded-xl border border-default-200 bg-default-50 px-4 py-6 text-center text-sm text-default-500">
              Pilih template di menu Pengaturan untuk melihat preview.
            </p>
          )}
          <p className="mt-2 text-xs text-default-400">
            Preview memakai data contoh template — alamat, media sosial, dan link halaman tampil sesuai data asli di website.
          </p>
        </div>
      </div>

      <AppModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Pilih Blok Footer"
        size="xl"
        footer={
          <Button variant="light" onPress={() => setPickerOpen(false)}>
            Batal
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FOOTER_BLOCK_CONFIGS.map((config) => {
            const disabled = Boolean(config.single && usedSingles.has(config.type));
            return (
              <button
                key={config.type}
                type="button"
                disabled={disabled}
                onClick={() => openNew(config.type)}
                className="flex items-start gap-3 rounded-xl border border-default-200 bg-white p-4 text-left transition-all hover:border-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-default-200 disabled:hover:shadow-none"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg text-white ${config.gradient}`}
                >
                  {config.icon}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{config.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-default-500">
                    {disabled ? 'Sudah ada di footer.' : config.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </AppModal>

      <AppModal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editingConfig ? `${editing?.id ? 'Edit' : 'Blok Baru'} — ${editingConfig.label}` : ''}
        size="lg"
        footer={
          <>
            <Button variant="light" onPress={() => setEditing(null)}>
              Batal
            </Button>
            <Button color="primary" onPress={applyBlock}>
              Terapkan
            </Button>
          </>
        }
      >
        {editingConfig && (
          <div className="flex flex-col gap-4">
            {editingConfig.hint && (
              <div className="rounded-xl border border-primary-200 bg-primary-50/80 px-4 py-3 text-sm text-primary-700">
                <span className="font-medium">💡 Tip:</span> {editingConfig.hint}
              </div>
            )}
            {editingConfig.fields.map((field) => {
              const value = formValues[field.key];
              const setValue = (next: SectionFormValue) => setFormValues((current) => ({ ...current, [field.key]: next }));
              if (field.type === 'switch') {
                return (
                  <FormSwitch
                    key={field.key}
                    label={field.label}
                    description={field.description}
                    checked={value === true}
                    onChange={setValue}
                  />
                );
              }
              if (field.type === 'textarea') {
                return (
                  <FormTextarea
                    key={field.key}
                    label={field.label}
                    description={field.description}
                    placeholder={field.placeholder}
                    value={typeof value === 'string' ? value : ''}
                    onChange={setValue}
                    rows={4}
                  />
                );
              }
              return (
                <FormInput
                  key={field.key}
                  label={field.label}
                  description={field.description}
                  placeholder={field.placeholder}
                  value={typeof value === 'string' ? value : ''}
                  onChange={setValue}
                />
              );
            })}
            <p className="text-xs text-default-400">Perubahan baru tersimpan ke website setelah menekan &quot;Simpan Footer&quot;.</p>
          </div>
        )}
      </AppModal>

      {dialog}
    </div>
  );
}
