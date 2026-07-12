'use client';

import { Button, Card, CardBody, Chip } from '@heroui/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { BlogPostPicker } from '../../../components/blog-post-picker';
import { GalleryEditor } from '../../../components/gallery-editor';
import { RichTextEditor } from '../../../components/rich-text-editor';
import { AppModal } from '../../../components/app-modal';
import { useConfirmDialog } from '../../../components/confirm-dialog';
import { FormInput, FormSelect, FormSwitch, FormTextarea } from '../../../components/form-field';
import { LoadingSpinner } from '../../../components/loading-spinner';
import { desktopAddButtonClass, MobileFloatingActionBar, mobileFabPagePadding } from '../../../components/mobile-floating-action';
import { apiClient } from '../../../lib/api-client';
import {
  contentToFormValues,
  formValuesToContent,
  getDefaultFormValues,
  getSectionPreview,
  getSectionTypeConfig,
  SECTION_TYPE_CONFIGS,
  type GalleryImage,
  type SectionFieldDef,
  type SectionFormValue,
  type SectionTypeConfig,
} from '../../../lib/section-types';
import { hasMinRole, type WebsitePage, type WebsiteSection } from '../../../lib/types';
import { buildTenantWebUrl } from '../../../lib/preview-url';
import { useWebsiteContext } from '../../../context/website-context';

function SectionFormFields({
  config,
  values,
  websiteId,
  onChange,
}: {
  config: SectionTypeConfig;
  values: Record<string, SectionFormValue>;
  websiteId?: string;
  onChange: (key: string, value: SectionFormValue) => void;
}) {
  const renderField = (field: SectionFieldDef) => {
    const val = values[field.key];

    if (field.type === 'switch') {
      return (
        <FormSwitch
          key={field.key}
          label={field.label}
          description={field.description}
          checked={val === true}
          onChange={(checked) => onChange(field.key, checked)}
        />
      );
    }

    if (field.type === 'richtext') {
      return (
        <RichTextEditor
          key={field.key}
          label={field.label}
          description={field.description}
          value={typeof val === 'string' ? val : ''}
          onChange={(html) => onChange(field.key, html)}
          websiteId={websiteId}
          uploadFolder="sections"
        />
      );
    }

    if (field.type === 'gallery') {
      const images = Array.isArray(val)
        ? val.filter((item): item is GalleryImage => typeof item === 'object' && item !== null)
        : [];
      return (
        <GalleryEditor
          key={field.key}
          label={field.label}
          description={field.description}
          value={images}
          websiteId={websiteId}
          onChange={(next) => onChange(field.key, next)}
        />
      );
    }

    if (field.type === 'blogPostPicker') {
      const postIds = Array.isArray(val) ? val.filter((item): item is string => typeof item === 'string') : [];
      return (
        <BlogPostPicker
          key={field.key}
          label={field.label}
          description={field.description}
          value={postIds}
          websiteId={websiteId}
          onChange={(ids) => onChange(field.key, ids)}
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
          value={typeof val === 'string' ? val : ''}
          onChange={(v) => onChange(field.key, v)}
          rows={4}
        />
      );
    }

    if (field.type === 'select' && field.options) {
      return (
        <FormSelect
          key={field.key}
          label={field.label}
          description={field.description}
          value={typeof val === 'string' ? val : ''}
          onChange={(v) => onChange(field.key, v)}
          options={field.options}
        />
      );
    }

    return (
      <FormInput
        key={field.key}
        label={field.label}
        description={field.description}
        placeholder={field.placeholder}
        value={typeof val === 'string' ? val : ''}
        onChange={(v) => onChange(field.key, v)}
      />
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {config.manageHint && (
        <div className="rounded-xl border border-primary-200 bg-primary-50/80 px-4 py-3 text-sm text-primary-700">
          <span className="font-medium">💡 Tip:</span> {config.manageHint}
        </div>
      )}
      {config.fields.length > 0 ? (
        config.fields.map(renderField)
      ) : (
        <p className="rounded-xl border border-default-200 bg-default-50 px-4 py-3 text-sm text-default-500">
          Section ini tidak punya field kustom. Gunakan mode lanjutan (JSON) jika perlu mengubah konten.
        </p>
      )}
    </div>
  );
}

interface SectionCardProps {
  section: WebsiteSection;
  index: number;
  total: number;
  canEdit: boolean;
  onEdit: (section: WebsiteSection) => void;
  onDelete: (sectionId: string) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  moving: boolean;
}

function SectionCard({
  section,
  index,
  total,
  canEdit,
  onEdit,
  onDelete,
  onMove,
  moving,
}: SectionCardProps) {
  const config = getSectionTypeConfig(section.type);
  const preview = getSectionPreview(section.type, section.content);

  return (
    <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-default-100 transition-all hover:shadow-md">
      <div className="flex gap-0 sm:gap-0">
        {canEdit && (
          <div className="flex flex-col items-center justify-center gap-1 border-r border-default-100 bg-default-50/80 px-2 py-3">
            <button
              type="button"
              disabled={index === 0 || moving}
              onClick={() => onMove(index, 'up')}
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
              disabled={index === total - 1 || moving}
              onClick={() => onMove(index, 'down')}
              className="rounded-lg p-1.5 text-default-400 transition-colors hover:bg-white hover:text-primary disabled:opacity-30"
              aria-label="Pindah ke bawah"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>
        )}

        <CardBody className="flex flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg shadow-sm ${config.gradient} text-white`}
            >
              {config.icon}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground">{config.label}</p>
                <Chip
                  size="sm"
                  variant="flat"
                  color={config.category === 'master' ? 'secondary' : 'primary'}
                  className="text-[10px] uppercase"
                >
                  {config.categoryLabel}
                </Chip>
              </div>
              <p className="mt-0.5 truncate text-sm text-default-600">{preview}</p>
              <p className="mt-1 line-clamp-1 text-xs text-default-400">{config.description}</p>
            </div>
          </div>

          {canEdit && (
            <div className="flex shrink-0 gap-2">
              <Button size="sm" color="primary" variant="flat" className="font-medium px-2" onPress={() => onEdit(section)}>
                Edit
              </Button>
              <Button className='px-2' size="sm" color="danger" variant="light" onPress={() => onDelete(section.id)}>
                Hapus
              </Button>
            </div>
          )}
        </CardBody>
      </div>
    </Card>
  );
}

export default function PageSectionsEditor() {
  const params = useParams();
  const pageId = params.pageId as string;
  const { activeWebsite, websiteId, role, loading: ctxLoading } = useWebsiteContext();
  const { confirm, dialog } = useConfirmDialog();

  const [page, setPage] = useState<WebsitePage | null>(null);
  const [sections, setSections] = useState<WebsiteSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editSection, setEditSection] = useState<WebsiteSection | null>(null);
  const [sectionType, setSectionType] = useState('hero');
  const [formValues, setFormValues] = useState<Record<string, SectionFormValue>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [contentJson, setContentJson] = useState('{}');
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState('');

  const canEdit = role ? hasMinRole(role, 'editor') : false;
  const typeConfig = getSectionTypeConfig(sectionType);

  const webPreviewUrl = useMemo(() => {
    const siteSlug = activeWebsite?.website.slug;
    const pageSlug = page?.slug;
    if (!siteSlug) return null;
    if (!pageSlug || pageSlug === 'home' || page?.is_home) return buildTenantWebUrl(siteSlug);
    return buildTenantWebUrl(siteSlug, pageSlug);
  }, [activeWebsite?.website.slug, page?.slug, page?.is_home]);

  const load = useCallback(async () => {
    if (!websiteId || !pageId) return;
    setLoading(true);
    try {
      const data = await apiClient<WebsitePage>(`/api/websites/${websiteId}/pages/${pageId}`);
      setPage(data);
      setSections(data.sections ?? []);
    } catch {
      setPage(null);
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [websiteId, pageId]);

  useEffect(() => {
    void load();
  }, [load]);

  const syncJsonFromForm = (type: string, values: Record<string, SectionFormValue>) => {
    const content = formValuesToContent(type, values);
    setContentJson(JSON.stringify(content, null, 2));
  };

  const openPicker = () => {
    setPickerOpen(true);
  };

  const selectTypeAndOpen = (type: string) => {
    setEditSection(null);
    setSectionType(type);
    const values = getDefaultFormValues(type);
    setFormValues(values);
    syncJsonFromForm(type, values);
    setShowAdvanced(false);
    setError('');
    setPickerOpen(false);
    setModalOpen(true);
  };

  const openEdit = (section: WebsiteSection) => {
    setEditSection(section);
    setSectionType(section.type);
    const values = contentToFormValues(section.type, section.content);
    setFormValues(values);
    setContentJson(JSON.stringify(section.content, null, 2));
    setShowAdvanced(false);
    setError('');
    setModalOpen(true);
  };

  const handleTypeChange = (type: string) => {
    setSectionType(type);
    const values = editSection
      ? contentToFormValues(type, editSection.content)
      : getDefaultFormValues(type);
    setFormValues(values);
    syncJsonFromForm(type, values);
  };

  const handleFormChange = (key: string, value: SectionFormValue) => {
    const next = { ...formValues, [key]: value };
    setFormValues(next);
    if (!showAdvanced) syncJsonFromForm(sectionType, next);
  };

  const handleSave = async () => {
    if (!websiteId) return;

    let content: Record<string, unknown>;
    if (showAdvanced) {
      try {
        content = JSON.parse(contentJson);
      } catch {
        setError('JSON tidak valid. Periksa format kurung kurawal dan tanda kutip.');
        return;
      }
    } else {
      content = formValuesToContent(sectionType, formValues);
    }

    setSaving(true);
    setError('');
    try {
      if (editSection) {
        await apiClient(
          `/api/websites/${websiteId}/pages/${pageId}/sections/${editSection.id}`,
          { method: 'PATCH', body: JSON.stringify({ type: sectionType, content }) },
        );
      } else {
        await apiClient(`/api/websites/${websiteId}/pages/${pageId}/sections`, {
          method: 'POST',
          body: JSON.stringify({ type: sectionType, content, order: sections.length }),
        });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sectionId: string) => {
    if (!websiteId) return;
    const ok = await confirm({ title: 'Hapus Section Ini?', message: 'Section ini akan dihapus dari halaman secara permanen.' });
    if (!ok) return;
    try {
      await apiClient(
        `/api/websites/${websiteId}/pages/${pageId}/sections/${sectionId}`,
        { method: 'DELETE' },
      );
      await load();
    } catch {
      alert('Gagal menghapus section');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (!websiteId) return;
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= sections.length) return;

    const reordered = [...sections];
    [reordered[index], reordered[swapIdx]] = [reordered[swapIdx], reordered[index]];

    setMoving(true);
    try {
      await apiClient(`/api/websites/${websiteId}/pages/${pageId}/sections/reorder`, {
        method: 'POST',
        body: JSON.stringify({ section_ids: reordered.map((s) => s.id) }),
      });
      setSections(reordered);
    } catch {
      alert('Gagal mengubah urutan section');
    } finally {
      setMoving(false);
    }
  };

  if (ctxLoading || loading) return <LoadingSpinner />;

  if (!page) {
    return (
      <div className="py-16 text-center">
        <p className="text-default-500">Halaman tidak ditemukan.</p>
        <Button as={Link} href="/dashboard/pages" color="primary" variant="flat" className="mt-4">
          Kembali ke Daftar Halaman
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${canEdit ? mobileFabPagePadding : ''}`}>
      <div className="space-y-4">
        <Link
          href="/dashboard/pages"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          ← Kembali ke Halaman
        </Link>

        <Card className="overflow-hidden border-0 shadow-md ring-1 ring-default-100">
          <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 px-4 py-5 sm:px-6">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  {page.is_home && (
                    <Chip size="sm" className="border border-white/25 bg-white/15 text-white backdrop-blur-sm px-2">
                      ★ Halaman Utama
                    </Chip>
                  )}
                  <Chip size="sm" className="border border-white/25 bg-white/15 text-white/90 backdrop-blur-sm px-2">
                    {sections.length} section
                  </Chip>
                </div>
                <h1 className="text-xl font-bold text-white sm:text-2xl">{page.title}</h1>
                <p className="mt-0.5 text-sm text-blue-100">/{page.slug} · Page Builder</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {webPreviewUrl && (
                  <Button
                    as={Link}
                    href={webPreviewUrl}
                    target="_blank"
                    size="sm"
                    className="bg-white font-semibold text-blue-700 shadow-lg hover:bg-blue-50"
                  >
                    Preview ↗
                  </Button>
                )}
                {canEdit && (
                  <Button
                    color="primary"
                    onPress={openPicker}
                    className={`bg-white/15 font-semibold text-white backdrop-blur-sm ${desktopAddButtonClass}`}
                    variant="flat"
                  >
                    + Section Baru
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {sections.length === 0 ? (
        <Card className="overflow-hidden border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 text-3xl ring-4 ring-blue-50">
              🧩
            </div>
            <div>
              <p className="text-lg font-semibold">Halaman masih kosong</p>
              <p className="mt-1 max-w-md text-sm text-default-500">
                Susun halaman dengan menambahkan section — hero banner, grid layanan, FAQ, dan lainnya.
              </p>
            </div>
            {canEdit && (
              <Button color="primary" onPress={openPicker} className="hidden font-semibold sm:inline-flex">
                Pilih Section Pertama
              </Button>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-default-400">
            Urutan tampil di website (atas → bawah)
          </p>
          {sections.map((section, idx) => (
            <SectionCard
              key={section.id}
              section={section}
              index={idx}
              total={sections.length}
              canEdit={canEdit}
              onEdit={openEdit}
              onDelete={handleDelete}
              onMove={handleMove}
              moving={moving}
            />
          ))}
        </div>
      )}

      <AppModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Pilih Tipe Section"
        size="xl"
        footer={
          <Button variant="light" onPress={() => setPickerOpen(false)}>
            Batal
          </Button>
        }
      >
        <div className="space-y-6">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-default-400">Data Master</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SECTION_TYPE_CONFIGS.filter((c) => c.category === 'master').map((config) => (
                <button
                  key={config.type}
                  type="button"
                  onClick={() => selectTypeAndOpen(config.type)}
                  className="flex items-start gap-3 rounded-xl border border-default-200 bg-white p-4 text-left transition-all hover:border-primary hover:shadow-md"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg text-white ${config.gradient}`}
                  >
                    {config.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{config.label}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-default-500">{config.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-default-400">Konten & Layout</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SECTION_TYPE_CONFIGS.filter((c) => c.category === 'narrative').map((config) => (
                <button
                  key={config.type}
                  type="button"
                  onClick={() => selectTypeAndOpen(config.type)}
                  className="flex items-start gap-3 rounded-xl border border-default-200 bg-white p-4 text-left transition-all hover:border-primary hover:shadow-md"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg text-white ${config.gradient}`}
                  >
                    {config.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{config.label}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-default-500">{config.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </AppModal>

      <AppModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editSection ? `Edit — ${typeConfig.label}` : `Section Baru — ${typeConfig.label}`}
        size="xl"
        footer={
          <>
            <Button variant="light" onPress={() => setModalOpen(false)}>Batal</Button>
            <Button color="primary" isLoading={saving} onPress={handleSave}>Simpan Section</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 rounded-xl border border-default-200 bg-default-50/50 p-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg text-white ${typeConfig.gradient}`}
            >
              {typeConfig.icon}
            </div>
            <div className="min-w-0 flex-1">
              <FormSelect
                label="Tipe Section"
                value={sectionType}
                onChange={handleTypeChange}
                options={SECTION_TYPE_CONFIGS.map((c) => ({
                  value: c.type,
                  label: c.label,
                }))}
              />
            </div>
          </div>

          {!showAdvanced ? (
            <SectionFormFields
              config={typeConfig}
              values={formValues}
              websiteId={websiteId ?? undefined}
              onChange={handleFormChange}
            />
          ) : (
            <FormTextarea
              label="Content (JSON)"
              rows={12}
              value={contentJson}
              onChange={setContentJson}
              description="Mode lanjutan untuk konten kustom di luar field standar."
              className="font-mono text-sm"
            />
          )}

          <button
            type="button"
            onClick={() => {
              if (!showAdvanced) syncJsonFromForm(sectionType, formValues);
              setShowAdvanced(!showAdvanced);
            }}
            className="text-left text-xs font-medium text-default-500 hover:text-primary"
          >
            {showAdvanced ? '← Kembali ke form visual' : 'Mode lanjutan (JSON) →'}
          </button>

          {error && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
        </div>
      </AppModal>

      {canEdit && <MobileFloatingActionBar label="Section Baru" onClick={openPicker} />}
      {dialog}
    </div>
  );
}
