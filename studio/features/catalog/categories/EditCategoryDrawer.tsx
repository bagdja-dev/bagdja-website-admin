'use client';

import { useCallback, useEffect, useState } from 'react';

import { Input, Select, SelectItem, Textarea } from '@heroui/react';

import type { CreateCategoryRequest, WebsiteCategory } from '@/studio/api/categories';
import { fetchLanguages, type WebsiteLanguageDto } from '@/studio/api/company-profile';
import { errorMessage } from '@/studio/api/client';
import { useActiveWebsiteId } from '@/studio/stores/website-store';
import { EditDrawer } from '@/studio/ui/primitives/EditDrawer';
import { StatusSwitch } from '@/studio/ui/primitives/StatusSwitch';

import { CategoryImages } from './CategoryImages';
import { KeyValueRepeater, type KeyValueRow } from './CategoryExtraFields';

interface EditCategoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  category: WebsiteCategory | null;
  onSave: (draft: CategoryDraft) => Promise<void>;
}

export interface CategoryDraft extends CreateCategoryRequest {
  locale: string;
  is_default_locale: boolean;
}

interface LocalizedFields {
  label: string;
  description: string;
}

const EMPTY_ROW: KeyValueRow[] = [{ key: '', value: '' }];
const EMPTY_TRANSLATION: LocalizedFields = { label: '', description: '' };

function toSpecRows(spec: WebsiteCategory['specifications']): KeyValueRow[] {
  const rows = Object.entries(spec ?? {}).map(([key, value]) => ({ key, value: String(value) }));
  return rows.length > 0 ? rows : EMPTY_ROW;
}

function toEstimationRows(est: WebsiteCategory['estimation']): KeyValueRow[] {
  const rows = (est ?? []).map((e) => ({ key: e.label, value: e.price === null || e.price === undefined ? '' : String(e.price) }));
  return rows.length > 0 ? rows : EMPTY_ROW;
}

export function EditCategoryDrawer({ isOpen, onClose, category, onSave }: EditCategoryDrawerProps) {
  const websiteId = useActiveWebsiteId();
  const [identityName, setIdentityName] = useState('');
  const [languages, setLanguages] = useState<WebsiteLanguageDto[]>([]);
  const [languagesLoading, setLanguagesLoading] = useState(false);
  const [locale, setLocale] = useState('id');
  const [defaultLocale, setDefaultLocale] = useState('id');
  const [localizedFields, setLocalizedFields] = useState<Record<string, LocalizedFields>>({});
  const [images, setImages] = useState<string[]>([]);
  const [specs, setSpecs] = useState<KeyValueRow[]>(EMPTY_ROW);
  const [estimation, setEstimation] = useState<KeyValueRow[]>(EMPTY_ROW);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (!websiteId) {
      setError('Website aktif tidak ditemukan.');
      return;
    }

    setLanguages([]);
    setLanguagesLoading(true);
    setError(null);
    void fetchLanguages(websiteId)
      .then((items) => {
        const activeItems = items.filter((item) => item.is_active);
        setLanguages(activeItems);
        const fallback = activeItems.find((item) => item.is_default) ?? activeItems[0];
        if (fallback) {
          setLocale(fallback.locale);
          setDefaultLocale(fallback.locale);
        }
      })
      .catch((err) => setError(errorMessage(err, 'Gagal memuat bahasa website.')))
      .finally(() => setLanguagesLoading(false));
  }, [isOpen, websiteId]);

  useEffect(() => {
    if (!isOpen || languagesLoading || languages.length === 0) return;
    const defaultLanguage = languages.find((item) => item.is_default) ?? languages[0];
    const translations = Object.fromEntries(
      (category?.translations ?? []).map((translation) => [
        translation.locale,
        { label: translation.label, description: translation.description ?? '' },
      ]),
    );
    if (category && !translations[defaultLanguage.locale]) {
      translations[defaultLanguage.locale] = {
        label: category.label,
        description: category.description ?? '',
      };
    }
    setIdentityName(category?.identity_name ?? category?.label ?? '');
    setDefaultLocale(defaultLanguage.locale);
    setLocale(defaultLanguage.locale);
    setLocalizedFields(translations);
    setImages(category?.images ?? []);
    setSpecs(toSpecRows(category?.specifications));
    setEstimation(toEstimationRows(category?.estimation));
    setIsActive(category?.is_active ?? true);
    setError(null);
  }, [isOpen, category, languages, languagesLoading]);

  const currentTranslation = localizedFields[locale] ?? EMPTY_TRANSLATION;
  const languageLabel = languages.find((item) => item.locale === locale)?.label;
  const updateLocalizedField = (field: keyof LocalizedFields, value: string) => {
    setLocalizedFields((current) => ({
      ...current,
      [locale]: { ...(current[locale] ?? EMPTY_TRANSLATION), [field]: value },
    }));
  };

  const handleSubmit = useCallback(async () => {
    if (!identityName.trim()) {
      setError('Nama identitas kategori wajib diisi.');
      return;
    }
    if (!currentTranslation.label.trim()) {
      setError(`Nama kategori${languageLabel ? ` (${languageLabel})` : ''} wajib diisi.`);
      return;
    }
    const badPrice = estimation.find((r) => r.key.trim() && r.value.trim() && !(Number(r.value) >= 0));
    if (badPrice) {
      setError(`Harga estimasi "${badPrice.key}" tidak boleh negatif.`);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSave({
        identity_name: identityName.trim(),
        label: currentTranslation.label.trim(),
        description: currentTranslation.description.trim() || null,
        images,
        specifications: Object.fromEntries(specs.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value.trim()])),
        estimation: estimation.filter((r) => r.key.trim()).map((r) => ({ label: r.key.trim(), price: r.value.trim() ? Number(r.value) : 0 })),
        is_active: isActive,
        locale,
        is_default_locale: locale === defaultLocale,
      });
    } catch (err) {
      setError(errorMessage(err, 'Gagal menyimpan kategori.'));
    } finally {
      setIsSubmitting(false);
    }
  }, [onSave, identityName, currentTranslation, languageLabel, images, specs, estimation, isActive, locale, defaultLocale]);

  return (
    <EditDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={category ? 'Edit kategori' : 'Tambah kategori'}
      onSubmit={handleSubmit}
      submitLabel={category ? 'Simpan perubahan' : 'Buat kategori'}
      isSubmitting={isSubmitting}
      isSubmitDisabled={languagesLoading || languages.length === 0 || !identityName.trim() || !currentTranslation.label.trim()}
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Nama identitas kategori"
          labelPlacement="outside"
          value={identityName}
          onValueChange={setIdentityName}
          placeholder="Mis. Atasan"
          description="Kunci tetap kategori untuk mengenalinya di Studio; tidak berubah per bahasa."
          maxLength={255}
          autoFocus
          isRequired
          variant="bordered"
        />
        <div className="grid gap-3 rounded-xl border border-default-200 p-4">
          <Select
            label="Bahasa konten"
            labelPlacement="outside"
            isLoading={languagesLoading}
            selectedKeys={languages.some((language) => language.locale === locale) ? [locale] : []}
            onSelectionChange={(keys) => {
              const nextLocale = Array.from(keys)[0]?.toString();
              if (nextLocale && languages.some((language) => language.locale === nextLocale)) {
                setLocale(nextLocale);
              }
            }}
            isDisabled={languagesLoading || languages.length < 2}
            renderValue={(items) => items.map((item) => item.textValue).join(', ')}
          >
            {languages.map((language) => {
              const label = `${language.label} (${language.locale})`;
              return <SelectItem key={language.locale} textValue={label}>{label}</SelectItem>;
            })}
          </Select>
          {languages.length < 2 && !languagesLoading && (
            <p className="text-xs text-default-500">Belum ada bahasa aktif tambahan. Periksa Pengaturan → Bahasa.</p>
          )}
          {!category && locale !== defaultLocale && (
            <p className="text-xs text-default-500">
              Nama dan deskripsi akan disimpan dalam bahasa yang dipilih. Nama identitas menjadi fallback bahasa default sampai terjemahannya diisi.
            </p>
          )}
          <Input
            label={`Nama kategori${languageLabel ? ` (${languageLabel})` : ''}`}
            labelPlacement="outside"
            value={currentTranslation.label}
            onValueChange={(value) => updateLocalizedField('label', value)}
            placeholder="Mis. Atasan"
            maxLength={100}
            isRequired
            variant="bordered"
          />
          <Textarea
            label={`Deskripsi${languageLabel ? ` (${languageLabel})` : ''}`}
            labelPlacement="outside"
            value={currentTranslation.description}
            onValueChange={(value) => updateLocalizedField('description', value)}
            placeholder="Deskripsi singkat kategori…"
            minRows={3}
            variant="bordered"
          />
        </div>
        <CategoryImages websiteId={websiteId} images={images} onChange={setImages} />
        <KeyValueRepeater
          label="Spesifikasi"
          hint="Mis. Bahan: Baja ringan."
          keyLabel="Nama"
          valueLabel="Nilai"
          rows={specs}
          onChange={setSpecs}
        />
        <KeyValueRepeater
          label="Estimasi harga"
          hint="Harga acuan (Rp), tidak boleh negatif."
          keyLabel="Label"
          valueLabel="Harga"
          valueType="number"
          rows={estimation}
          onChange={setEstimation}
        />
        <div className="flex items-center gap-3 pt-1">
          <StatusSwitch isSelected={isActive} onChange={setIsActive} ariaLabel="Tampilkan kategori di website" />
          <span className="text-[13px] text-default-600">Tampilkan di website</span>
        </div>
        {error && <p role="alert" className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#B91C1C]">{error}</p>}
      </div>
    </EditDrawer>
  );
}
