'use client';

import { useEffect, useState } from 'react';

import type { SectionProps } from '../editor-context';
import type { ProductTranslationDraft } from '../form-state';
import { slugifyProduct } from '../build-payload';
import { Field, HINT, INPUT, Notice, TextAreaField, TextField, ToggleRow } from '../fields';
import { FullDetailField, ShortDescriptionField } from './BasicSection';
import { metaOf } from '../../product-utils';

function draftFor(
  form: SectionProps['form'],
  locale: string,
): ProductTranslationDraft | undefined {
  return form.translations.find((translation) => translation.locale === locale);
}

export function TranslationsSection({ form, set, errors, websiteId, canEdit, languages, languagesError, parent, product }: SectionProps) {
  const activeLanguages = languages.filter((language) => language.is_active || language.is_default);
  const defaultLanguage = activeLanguages.find((language) => language.is_default) ?? activeLanguages[0];
  const [locale, setLocale] = useState(defaultLanguage?.locale ?? '');

  useEffect(() => {
    if (!activeLanguages.some((language) => language.locale === locale)) {
      setLocale(defaultLanguage?.locale ?? '');
    }
  }, [activeLanguages, defaultLanguage?.locale, locale]);

  const language = activeLanguages.find((item) => item.locale === locale);
  if (!language) {
    if (languagesError) return <Notice tone="danger">{languagesError}</Notice>;
    return <Notice>Bahasa website belum tersedia. Tambahkan bahasa terlebih dahulu di pengaturan website untuk mengelola terjemahan.</Notice>;
  }

  const isDefault = language.is_default;
  const translation = draftFor(form, language.locale);
  const inherited = parent !== null && product !== null && metaOf(product).inherit_description === true;
  const translationError = errors[`translation.${language.locale}`];
  const updateTranslation = (patch: Partial<ProductTranslationDraft>) => {
    if (isDefault) return;
    const current = translation;
    const next: ProductTranslationDraft = {
      locale: language.locale,
      slugTouched: current?.slugTouched ?? false,
      name: current?.name ?? '',
      slug: current?.slug ?? '',
      description: current?.description ?? '',
      detail: current?.detail ?? '',
      seoTitle: current?.seoTitle ?? '',
      seoDescription: current?.seoDescription ?? '',
      seoImage: current?.seoImage ?? '',
      seoNoIndex: current?.seoNoIndex ?? form.seoNoIndex,
      isPublished: current?.isPublished ?? form.isActive,
      ...patch,
    };
    set({
      translations: [
        ...form.translations.filter((item) => item.locale !== language.locale),
        next,
      ],
    });
  };
  const localizedText = (key: 'name' | 'slug' | 'description' | 'detail' | 'seoTitle' | 'seoDescription' | 'seoImage', base: string) =>
    isDefault ? base : translation?.[key] ?? '';
  const localizedBoolean = (key: 'seoNoIndex', base: boolean) =>
    isDefault ? base : translation?.[key] ?? base;
  const updateField = (field: keyof Omit<ProductTranslationDraft, 'locale'>, value: string | boolean) => {
    if (isDefault) {
      if (typeof value === 'string') {
        if (field === 'name') set({ name: value });
        if (field === 'slug') set({ slug: slugifyProduct(value, true), slugTouched: true });
        if (field === 'description') set({ description: value });
        if (field === 'detail') set({ detail: value });
        if (field === 'seoTitle') set({ seoTitle: value });
        if (field === 'seoDescription') set({ seoDescription: value });
        if (field === 'seoImage') set({ seoImage: value });
      } else {
        if (field === 'seoNoIndex') set({ seoNoIndex: value });
        if (field === 'isPublished') set({ isActive: value });
      }
      return;
    }
    updateTranslation({
      name: field === 'name' && typeof value === 'string' ? value : translation?.name ?? '',
      slug: field === 'slug' && typeof value === 'string' ? slugifyProduct(value, true) : translation?.slug ?? '',
      description: field === 'description' && typeof value === 'string' ? value : translation?.description ?? '',
      detail: field === 'detail' && typeof value === 'string' ? value : translation?.detail ?? '',
      seoTitle: field === 'seoTitle' && typeof value === 'string' ? value : translation?.seoTitle ?? '',
      seoDescription: field === 'seoDescription' && typeof value === 'string' ? value : translation?.seoDescription ?? '',
      seoImage: field === 'seoImage' && typeof value === 'string' ? value : translation?.seoImage ?? '',
      slugTouched: field === 'slug' ? true : translation?.slugTouched ?? false,
      seoNoIndex: field === 'seoNoIndex' && typeof value === 'boolean' ? value : translation?.seoNoIndex ?? form.seoNoIndex,
      isPublished: field === 'isPublished' && typeof value === 'boolean' ? value : translation?.isPublished ?? form.isActive,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="Bahasa" htmlFor="product-translation-locale" hint="Informasi operasional seperti harga, stok, dan SKU tetap sama di semua bahasa.">
        <select
          id="product-translation-locale"
          value={language.locale}
          onChange={(event) => setLocale(event.target.value)}
          className={INPUT}
          disabled={!canEdit}
        >
          {activeLanguages.map((item) => (
            <option key={item.locale} value={item.locale}>
              {item.label} ({item.locale}){item.is_default ? ' · utama' : ''}
            </option>
          ))}
        </select>
      </Field>

      <div className="rounded-xl border border-primary-100 bg-primary-50/40 p-3.5">
        <p className={HINT}>
          {isDefault
            ? 'Bahasa utama menjadi sumber fallback untuk bahasa lain.'
            : 'Kosongkan field untuk memakai nilai bahasa utama. Nama identitas di Informasi dasar tidak diterjemahkan.'}
        </p>
      </div>

      <TextField
        label="Nama produk / jasa"
        value={localizedText('name', form.name)}
        onChange={(name) => {
          if (isDefault) set({ name });
          else updateTranslation({
            name,
            ...(!translation?.slugTouched ? { slug: slugifyProduct(name) } : {}),
          });
        }}
        maxLength={255}
        disabled={!canEdit}
        error={isDefault ? errors.name : translationError}
      />
      <TextField
        label="Alamat URL (slug)"
        value={localizedText('slug', form.slug)}
        onChange={(slug) => updateField('slug', slugifyProduct(slug, true))}
        hint={isDefault ? 'Alamat bahasa utama.' : 'Alamat unik untuk bahasa ini; kosongkan untuk memakai slug bahasa utama saat ini.'}
        maxLength={255}
        disabled={!canEdit}
        error={isDefault ? errors.slug : translationError}
      />

      {inherited ? (
        <Notice>Deskripsi dan detail mengikuti item induk.</Notice>
      ) : (
        <>
          <ShortDescriptionField
            value={localizedText('description', form.description)}
            canEdit={canEdit}
            onSave={(description) => updateField('description', description)}
          />
          <FullDetailField
            value={localizedText('detail', form.detail)}
            websiteId={websiteId}
            canEdit={canEdit}
            onSave={(detail) => updateField('detail', detail)}
          />
        </>
      )}

      <TextField
        label="Judul SEO"
        value={localizedText('seoTitle', form.seoTitle)}
        onChange={(seoTitle) => updateField('seoTitle', seoTitle)}
        maxLength={255}
        disabled={!canEdit}
      />
      <TextAreaField
        label="Deskripsi SEO"
        value={localizedText('seoDescription', form.seoDescription)}
        onChange={(seoDescription) => updateField('seoDescription', seoDescription)}
        maxLength={500}
        disabled={!canEdit}
      />
      <TextField
        label="URL gambar share"
        value={localizedText('seoImage', form.seoImage)}
        onChange={(seoImage) => updateField('seoImage', seoImage)}
        maxLength={1000}
        disabled={!canEdit}
      />
      <ToggleRow
        title="Jangan indeks halaman"
        description="Berlaku untuk bahasa yang dipilih."
        value={localizedBoolean('seoNoIndex', form.seoNoIndex)}
        onChange={(seoNoIndex) => updateField('seoNoIndex', seoNoIndex)}
        disabled={!canEdit}
      />
      {!isDefault && (
        <ToggleRow
          title="Tampilkan terjemahan di website"
          description="Jika nonaktif, item tidak ditampilkan dalam bahasa ini."
          value={translation?.isPublished ?? true}
          onChange={(isPublished) => updateField('isPublished', isPublished)}
          disabled={!canEdit}
        />
      )}
    </div>
  );
}
