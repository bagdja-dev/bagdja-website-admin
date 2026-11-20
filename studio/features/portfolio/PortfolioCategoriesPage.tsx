'use client';

import { Input, Select, SelectItem, Switch, Textarea } from '@heroui/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { errorMessage } from '@/studio/api/client';
import {
  createPortfolioCategory,
  fetchLanguages,
  fetchPortfolioCategories,
  updatePortfolioCategory,
  upsertPortfolioCategoryTranslation,
  type PortfolioCategoryDto,
  type WebsiteLanguageDto,
} from '@/studio/api/company-profile';
import { useActiveWebsiteId } from '@/studio/stores/website-store';
import {
  actionsColumn,
  DataListPage,
  Pill,
  titleColumn,
  useDataList,
  type DataColumn,
  type RowAction,
} from '@/studio/ui/data-list';
import { EditDrawer } from '@/studio/ui/primitives/EditDrawer';
import { notify } from '@/studio/ui/primitives/Toast';

type CategoryTranslationDraft = { description: string };
type CategoryDraft = {
  name: string;
  slug: string;
  is_public: boolean;
  is_active: boolean;
  translations: Record<string, CategoryTranslationDraft>;
};

const EMPTY_DRAFT: CategoryDraft = { name: '', slug: '', is_public: true, is_active: true, translations: {} };

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function PortfolioCategoriesPage() {
  const websiteId = useActiveWebsiteId();
  const [languages, setLanguages] = useState<WebsiteLanguageDto[]>([]);
  const [locale, setLocale] = useState('');
  const [languagesLoading, setLanguagesLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioCategoryDto | null>(null);
  const [draft, setDraft] = useState<CategoryDraft>(EMPTY_DRAFT);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [saving, setSaving] = useState(false);

  const list = useDataList<PortfolioCategoryDto>({
    mode: 'client',
    searchKeys: ['name', 'slug', 'description'],
    load: async () => websiteId ? fetchPortfolioCategories(websiteId) : [],
  });

  useEffect(() => {
    let cancelled = false;
    if (!websiteId) return;
    setLanguagesLoading(true);
    fetchLanguages(websiteId)
      .then((items) => {
        if (cancelled) return;
        const active = items.filter((item) => item.is_active || item.is_default);
        setLanguages(active);
        setLocale((current) => active.some((item) => item.locale === current)
          ? current
          : (active.find((item) => item.is_default) ?? active[0])?.locale ?? 'id');
      })
      .catch((error) => notify.error('Gagal memuat bahasa website.', errorMessage(error)))
      .finally(() => { if (!cancelled) setLanguagesLoading(false); });
    return () => { cancelled = true; };
  }, [websiteId]);

  const currentTranslation = draft.translations[locale] ?? { description: '' };
  const setCurrentTranslation = (patch: Partial<CategoryTranslationDraft>) => {
    setDraft((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [locale]: { ...(current.translations[locale] ?? { description: '' }), ...patch },
      },
    }));
  };

  const openCreate = () => {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setSlugManuallyEdited(false);
    setDrawerOpen(true);
  };

  const openEdit = useCallback((category: PortfolioCategoryDto) => {
    setEditing(category);
    const translations = Object.fromEntries(
      (category.translations ?? []).map((item) => [item.locale, {
        description: item.description ?? '',
      }]),
    );
    const defaultLocale = languages.find((item) => item.is_default)?.locale ?? 'id';
    if (!translations[defaultLocale]) {
      translations[defaultLocale] = { description: category.description ?? '' };
    }
    setDraft({
      name: category.name,
      slug: category.slug,
      is_public: category.is_public,
      is_active: category.is_active,
      translations,
    });
    setSlugManuallyEdited(category.slug !== slugify(category.name));
    setDrawerOpen(true);
  }, [languages]);

  const columns = useMemo<DataColumn<PortfolioCategoryDto>[]>(() => {
    const actions: RowAction<PortfolioCategoryDto>[] = [
      { key: 'edit', label: 'Edit', minRole: 'editor', onAction: openEdit },
    ];
    return [
      titleColumn<PortfolioCategoryDto>({
        header: 'Kategori',
        getTitle: (category) => category.name,
        getSubtitle: (category) => `/${category.slug}${category.description ? ` · ${category.description}` : ''}`,
        onOpen: openEdit,
      }),
      {
        key: 'visibility',
        header: 'Visibilitas',
        mobile: 'meta',
        render: (category) => <Pill tone={category.is_public ? 'primary' : 'default'}>{category.is_public ? 'Publik' : 'Internal'}</Pill>,
      },
      {
        key: 'status',
        header: 'Status',
        mobile: 'meta',
        render: (category) => <Pill tone={category.is_active ? 'success' : 'default'}>{category.is_active ? 'Aktif' : 'Nonaktif'}</Pill>,
      },
      actionsColumn({ actions, getRowLabel: (category) => category.name }),
    ];
  }, [openEdit]);

  const saveCategory = async () => {
    const defaultLocale = languages.find((item) => item.is_default)?.locale ?? 'id';
    if (!websiteId || !draft.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        slug: draft.slug.trim() || slugify(draft.name),
        description: draft.translations[defaultLocale]?.description.trim() || null,
        is_public: draft.is_public,
        is_active: draft.is_active,
        sort_order: editing?.sort_order ?? list.allRows.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1,
      };
      const saved = editing
        ? await updatePortfolioCategory(websiteId, editing.id, payload)
        : await createPortfolioCategory(websiteId, payload);
      for (const language of languages) {
        const translation = draft.translations[language.locale];
        await upsertPortfolioCategoryTranslation(websiteId, saved.id, language.locale, {
          name: draft.name.trim(),
          description: translation?.description.trim() || null,
        });
      }
      const refreshed = await fetchPortfolioCategories(websiteId);
      list.replaceRows(refreshed);
      notify.success(editing ? 'Kategori proyek diperbarui.' : 'Kategori proyek ditambahkan.');
      setDrawerOpen(false);
      setEditing(null);
    } catch (error) {
      notify.error('Gagal menyimpan kategori proyek.', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <DataListPage
        title="Kategori Portofolio"
        description="Kelola kategori proyek untuk mengelompokkan dan memfilter portofolio di section website."
        list={list}
        columns={columns}
        getRowLabel={(category) => category.name}
        itemNoun="kategori"
        primaryAction={{ label: 'Tambah kategori', icon: 'plus', minRole: 'editor', onPress: openCreate }}
        searchPlaceholder="Cari kategori berdasarkan nama atau slug..."
        emptyState={{ title: 'Belum ada kategori proyek', description: 'Buat kategori untuk mulai mengelompokkan proyek portofolio.' }}
      />
      <EditDrawer
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditing(null); }}
        title={editing ? 'Edit kategori proyek' : 'Tambah kategori proyek'}
        description="Atur identitas kategori, deskripsi per bahasa, dan status publiknya."
        onSubmit={() => void saveCategory()}
        submitLabel={editing ? 'Simpan perubahan' : 'Tambah kategori'}
        isSubmitting={saving}
        isSubmitDisabled={languagesLoading || !draft.name.trim()}
      >
        <div className="grid gap-4 rounded-xl border border-default-200 bg-default-50/60 p-4">
          <div>
            <p className="text-sm font-semibold text-default-900">Identitas kategori</p>
            <p className="mt-1 text-xs text-default-500">Nama dan slug berlaku sama untuk semua bahasa.</p>
          </div>
          <Input
            label="Nama kategori"
            labelPlacement="outside"
            value={draft.name}
            onValueChange={(name) => {
              setDraft((current) => ({
                ...current,
                name,
                ...(!slugManuallyEdited ? { slug: slugify(name) } : {}),
              }));
            }}
            placeholder="Contoh: Website"
            isRequired
            variant="bordered"
          />
          <Input
            label="Slug"
            labelPlacement="outside"
            value={draft.slug}
            onValueChange={(slug) => {
              setSlugManuallyEdited(true);
              setDraft((current) => ({ ...current, slug }));
            }}
            placeholder="Dibuat otomatis dari nama kategori"
            description="Slug akan mengikuti nama sampai Anda mengubahnya."
            variant="bordered"
          />
        </div>
        <div className="grid gap-4 rounded-xl border border-default-200 p-4">
          <div>
            <p className="text-sm font-semibold text-default-900">Konten per bahasa</p>
            <p className="mt-1 text-xs text-default-500">Pilih bahasa untuk mengatur deskripsi kategori.</p>
          </div>
        <Select
          label="Bahasa"
          labelPlacement="outside"
          selectedKeys={locale ? [locale] : []}
          onSelectionChange={(keys) => setLocale(String(Array.from(keys)[0] ?? ''))}
          isDisabled={languagesLoading}
        >
          {languages.map((language) => <SelectItem key={language.locale}>{language.label}</SelectItem>)}
        </Select>
        <Textarea
          label={`Deskripsi${languages.find((item) => item.locale === locale)?.label ? ` (${languages.find((item) => item.locale === locale)?.label})` : ''}`}
          labelPlacement="outside"
          value={currentTranslation.description}
          onValueChange={(description) => setCurrentTranslation({ description })}
          placeholder="Tuliskan deskripsi kategori dalam bahasa yang dipilih"
          minRows={2}
          variant="bordered"
        />
        </div>
        <div className="grid gap-3 rounded-xl border border-default-200 p-4 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <Switch size="sm" isSelected={draft.is_public} onValueChange={(is_public) => setDraft((current) => ({ ...current, is_public }))} />
            <div>
              <p className="text-sm font-medium text-default-900">Tampil di website publik</p>
              <p className="text-xs text-default-500">Pengaturan ini berlaku untuk semua bahasa.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Switch size="sm" isSelected={draft.is_active} onValueChange={(is_active) => setDraft((current) => ({ ...current, is_active }))} />
            <div>
              <p className="text-sm font-medium text-default-900">Aktif</p>
              <p className="text-xs text-default-500">Pengaturan ini berlaku untuk semua bahasa.</p>
            </div>
          </div>
        </div>
      </EditDrawer>
    </div>
  );
}
