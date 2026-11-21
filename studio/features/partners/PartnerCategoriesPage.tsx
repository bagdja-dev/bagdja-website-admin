'use client';

import { Input, Switch, Textarea } from '@heroui/react';
import { useEffect, useMemo, useState } from 'react';

import { errorMessage } from '@/studio/api/client';
import {
  createPartnerCategory,
  fetchPartnerCategories,
  updatePartnerCategory,
  type PartnerCategoryDto,
} from '@/studio/api/company-profile';
import { useActiveWebsiteId } from '@/studio/stores/website-store';
import {
  actionsColumn,
  DataListPage,
  Pill,
  switchColumn,
  titleColumn,
  useDataList,
  type DataColumn,
  type RowAction,
} from '@/studio/ui/data-list';
import { EditDrawer } from '@/studio/ui/primitives/EditDrawer';
import { notify } from '@/studio/ui/primitives/Toast';

interface CategoryDraft {
  name: string;
  slug: string;
  description: string;
  is_public: boolean;
  is_active: boolean;
}

const EMPTY_DRAFT: CategoryDraft = {
  name: '',
  slug: '',
  description: '',
  is_public: false,
  is_active: true,
};

interface PartnerCategoriesPageProps {
  onCategoriesChange: (categories: PartnerCategoryDto[]) => void;
}

function toDraft(category: PartnerCategoryDto | null): CategoryDraft {
  return category
    ? {
        name: category.name,
        slug: category.slug,
        description: category.description ?? '',
        is_public: category.is_public,
        is_active: category.is_active,
      }
    : EMPTY_DRAFT;
}

export function PartnerCategoriesPage({ onCategoriesChange }: PartnerCategoriesPageProps) {
  const websiteId = useActiveWebsiteId();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PartnerCategoryDto | null>(null);
  const [draft, setDraft] = useState<CategoryDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const list = useDataList<PartnerCategoryDto>({
    mode: 'client',
    searchKeys: ['name', 'slug', 'description'],
    filters: [
      {
        key: 'status',
        label: 'Status',
        allLabel: 'Semua status',
        kind: 'chip',
        options: [{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }],
        getValue: (category) => category.is_active ? 'active' : 'inactive',
      },
      {
        key: 'visibility',
        label: 'Visibilitas',
        allLabel: 'Semua visibilitas',
        kind: 'chip',
        options: [{ value: 'public', label: 'Publik' }, { value: 'private', label: 'Internal' }],
        getValue: (category) => category.is_public ? 'public' : 'private',
      },
    ],
    load: async () => websiteId ? fetchPartnerCategories(websiteId) : [],
  });

  useEffect(() => {
    onCategoriesChange(list.allRows);
  }, [list.allRows, onCategoriesChange]);

  const openCreate = () => {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setDrawerOpen(true);
  };

  const openEdit = (category: PartnerCategoryDto) => {
    setEditing(category);
    setDraft(toDraft(category));
    setDrawerOpen(true);
  };

  const columns = useMemo<DataColumn<PartnerCategoryDto>[]>(() => {
    const actions: RowAction<PartnerCategoryDto>[] = [
      { key: 'edit', label: 'Edit', minRole: 'editor', onAction: openEdit },
    ];
    const saveStatus = (category: PartnerCategoryDto, patch: Partial<PartnerCategoryDto>) => {
      if (!websiteId) return Promise.resolve();
      return updatePartnerCategory(websiteId, category.id, {
        name: category.name,
        slug: category.slug,
        description: category.description,
        is_public: patch.is_public ?? category.is_public,
        is_active: patch.is_active ?? category.is_active,
        sort_order: category.sort_order,
      });
    };

    return [
      titleColumn<PartnerCategoryDto>({
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
      switchColumn<PartnerCategoryDto>({
        key: 'active',
        header: 'Aktif',
        getValue: (category) => category.is_active,
        ariaLabel: (category) => `Status aktif kategori ${category.name}`,
        minRole: 'editor',
        onToggle: (category, next) => {
          void list.optimisticUpdate(
            category.id,
            { is_active: next },
            () => saveStatus(category, { is_active: next }),
            'Gagal mengubah status kategori',
          );
        },
      }),
      switchColumn<PartnerCategoryDto>({
        key: 'public',
        header: 'Publik',
        getValue: (category) => category.is_public,
        ariaLabel: (category) => `Visibilitas publik kategori ${category.name}`,
        minRole: 'editor',
        onToggle: (category, next) => {
          void list.optimisticUpdate(
            category.id,
            { is_public: next },
            () => saveStatus(category, { is_public: next }),
            'Gagal mengubah visibilitas kategori',
          );
        },
      }),
      actionsColumn({ actions, getRowLabel: (category) => category.name }),
    ];
  }, [list, websiteId]);

  const saveCategory = async () => {
    if (!websiteId || !draft.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        slug: draft.slug.trim() || undefined,
        description: draft.description.trim() || null,
        is_public: draft.is_public,
        is_active: draft.is_active,
        sort_order: editing?.sort_order ?? list.allRows.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1,
      };
      const saved = editing
        ? await updatePartnerCategory(websiteId, editing.id, payload)
        : await createPartnerCategory(websiteId, payload);
      if (editing) list.patchRow(saved.id, saved);
      else list.replaceRows([...list.allRows, saved]);
      notify.success(editing ? 'Kategori partner diperbarui.' : 'Kategori partner ditambahkan.');
      setDrawerOpen(false);
      setEditing(null);
    } catch (error) {
      notify.error('Gagal menyimpan kategori partner.', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <DataListPage
        title="Kategori Partner"
        description="Kelola kategori secara terpisah dari daftar partner. Kategori publik dapat digunakan untuk menyaring partner di widget website."
        list={list}
        columns={columns}
        getRowLabel={(category) => category.name}
        itemNoun="kategori"
        primaryAction={{ label: 'Tambah kategori', icon: 'plus', minRole: 'editor', onPress: openCreate }}
        isRowMuted={(category) => !category.is_active}
        searchPlaceholder="Cari nama, slug, atau deskripsi..."
        emptyState={{ title: 'Belum ada kategori', description: 'Buat kategori untuk mengelompokkan partner.' }}
      />
      <EditDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Edit kategori partner' : 'Tambah kategori partner'}
        description="Atur nama, slug, dan visibilitas kategori."
        onSubmit={() => void saveCategory()}
        submitLabel={editing ? 'Simpan perubahan' : 'Tambah kategori'}
        isSubmitting={saving}
        isSubmitDisabled={!draft.name.trim()}
      >
        <Input
          label="Nama kategori"
          labelPlacement="outside"
          value={draft.name}
          onValueChange={(name) => setDraft((current) => ({ ...current, name }))}
          placeholder="Contoh: Mitra logistik"
          isRequired
          variant="bordered"
        />
        <Input
          label="Slug"
          labelPlacement="outside"
          value={draft.slug}
          onValueChange={(slug) => setDraft((current) => ({ ...current, slug }))}
          placeholder="Dibuat otomatis dari nama"
          variant="bordered"
        />
        <Textarea
          label="Deskripsi"
          labelPlacement="outside"
          value={draft.description}
          onValueChange={(description) => setDraft((current) => ({ ...current, description }))}
          placeholder="Keterangan singkat kategori"
          minRows={2}
          variant="bordered"
        />
        <Switch
          size="sm"
          isSelected={draft.is_public}
          onValueChange={(is_public) => setDraft((current) => ({ ...current, is_public }))}
        >
          Tampilkan sebagai kategori publik
        </Switch>
        <Switch
          size="sm"
          isSelected={draft.is_active}
          onValueChange={(is_active) => setDraft((current) => ({ ...current, is_active }))}
        >
          Aktif
        </Switch>
      </EditDrawer>
    </div>
  );
}
