'use client';

import { useEffect, useMemo, useState } from 'react';

import { Select, SelectItem } from '@heroui/react';

import {
  fetchLanguages,
  fetchPortfolioCategories,
  fetchPortfolioProjects,
  type PortfolioCategoryDto,
  type PortfolioProjectDto,
  type WebsiteLanguageDto,
} from '@/studio/api/company-profile';

type PickerKind = 'projects' | 'categories';

function toIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  return typeof value === 'string' && value ? [value] : [];
}

export function PortfolioDataPickerField({
  value,
  websiteId,
  label,
  kind,
  onChange,
}: {
  value: unknown;
  websiteId: string;
  label: string;
  kind: PickerKind;
  onChange: (value: string[]) => void;
}) {
  const [projects, setProjects] = useState<PortfolioProjectDto[]>([]);
  const [categories, setCategories] = useState<PortfolioCategoryDto[]>([]);
  const [languages, setLanguages] = useState<WebsiteLanguageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const selected = toIds(value);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const request = kind === 'projects'
      ? Promise.all([fetchLanguages(websiteId), fetchPortfolioProjects(websiteId)]).then(([languageItems, items]) => {
          if (cancelled) return;
          setLanguages(languageItems);
          setProjects(items);
        })
      : Promise.all([fetchLanguages(websiteId), fetchPortfolioCategories(websiteId)]).then(([languageItems, items]) => {
          if (cancelled) return;
          setLanguages(languageItems);
          setCategories(items);
        });
    request.catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [kind, retry, websiteId]);

  const options = useMemo(() => {
    const defaultLocale = languages.find((language) => language.is_default)?.locale;
    const items = kind === 'projects'
      ? projects
          .filter((project) => project.is_published)
          .map((project) => ({
            id: project.id,
            label: project.translations?.find((translation) => translation.locale === defaultLocale)?.title
              || project.translations?.[0]?.title
              || project.name,
            active: true,
          }))
      : categories
          .filter((category) => category.is_public && category.is_active)
          .map((category) => ({
            id: category.id,
            label: category.name,
            active: true,
          }));
    const known = new Set(items.map((item) => item.id));
    return [
      ...items.map((item) => ({ ...item, label: item.active ? item.label : `${item.label} (nonaktif/draft)` })),
      ...selected.filter((id) => !known.has(id)).map((id) => ({
        id,
        label: kind === 'projects' ? 'Proyek belum terbit atau sudah dihapus' : 'Kategori tidak publik atau sudah dihapus',
        active: false,
      })),
    ];
  }, [categories, kind, languages, projects, selected]);

  return (
    <div className="flex flex-col gap-1.5">
      <Select
        aria-label={label}
        selectionMode="multiple"
        selectedKeys={new Set(selected)}
        onSelectionChange={(keys) => {
          const picked = new Set(Array.from(keys, String));
          onChange(options.map((option) => option.id).filter((id) => picked.has(id)));
        }}
        isDisabled={loading || error}
        isLoading={loading}
        placeholder={kind === 'projects' ? 'Pilih proyek' : 'Semua kategori'}
        renderValue={(items) => items.length ? items.map((item) => item.textValue).join(', ') : 'Belum ada pilihan'}
      >
        {options.map((option) => <SelectItem key={option.id} textValue={option.label}>{option.label}</SelectItem>)}
      </Select>
      {error ? (
        <div className="flex items-center justify-between gap-2">
          <p role="alert" className="text-[11px] text-danger">Data portofolio gagal dimuat.</p>
          <button type="button" className="text-[11px] font-medium text-primary hover:underline" onClick={() => setRetry((current) => current + 1)}>
            Coba lagi
          </button>
        </div>
      ) : selected.length ? (
        <button type="button" className="self-start text-[11px] font-medium text-primary hover:underline" onClick={() => onChange([])}>
          Hapus semua pilihan
        </button>
      ) : null}
    </div>
  );
}
