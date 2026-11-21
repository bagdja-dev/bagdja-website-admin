import { errorMessage } from '@/studio/api/client';
import {
  createProduct,
  deleteProduct,
  fetchProductAssetLinks,
  linkProductAsset,
  replaceGatheringOptions,
  upsertProductTranslation,
  unlinkProductAsset,
  updateProduct,
  type CatalogProduct,
  type GatheringProductOption,
  type ProductWriteRequest,
} from '@/studio/api/products';

import { buildGatheringOptions } from './build-payload';
import type { ProductForm } from './form-state';
import type { WebsiteLanguageDto } from '@/studio/api/company-profile';
import { planVariantOps } from './variant-plan';

export type StepKey = 'product' | 'translations' | 'variants' | 'options' | 'assets';
export type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

export interface StepResult {
  key: StepKey;
  label: string;
  status: StepStatus;
  message?: string;
}

export const STEP_LABELS: Readonly<Record<StepKey, string>> = {
  product: 'Data item',
  translations: 'Terjemahan',
  variants: 'Varian',
  options: 'Pilihan acara',
  assets: 'File digital',
};

export interface SaveInput {
  websiteId: string;
  form: ProductForm;
  body: ProductWriteRequest;
  /** Item tersimpan (null = buat baru). */
  existing: CatalogProduct | null;
  loadedChildren: CatalogProduct[];
  allSlugs: string[];
  languages: WebsiteLanguageDto[];
  steps: StepKey[];
}

export interface SaveCallbacks {
  onStep: (result: StepResult) => void;
  /** Item baru berhasil dibuat → editor menyimpan id agar percobaan ulang memakai PATCH. */
  onProductSaved: (product: CatalogProduct) => void;
  onVariantCreated: (draftKey: string, child: CatalogProduct) => void;
  onVariantDeleted: (childId: string) => void;
  onVariantError: (draftKey: string, message: string | null) => void;
  onOptionsSaved: (options: GatheringProductOption[]) => void;
}

/**
 * Simpan bertahap & berurutan: item → terjemahan → varian → opsi acara (PUT replace) → tautan file (diff).
 * Langkah 1 gagal = berhenti. Langkah lain gagal = item sudah tersimpan; form TIDAK direset,
 * jadi menekan Simpan lagi mengulang dengan aman (PATCH, PUT replace, dan diff idempoten).
 */
export async function runStagedSave(input: SaveInput, cb: SaveCallbacks): Promise<{ ok: boolean; product: CatalogProduct | null }> {
  const { websiteId, form } = input;
  const mark = (key: StepKey, status: StepStatus, message?: string) => cb.onStep({ key, label: STEP_LABELS[key], status, message });

  mark('product', 'running');
  let product: CatalogProduct;
  try {
    product = input.existing ? await updateProduct(websiteId, input.existing.id, input.body) : await createProduct(websiteId, input.body);
    cb.onProductSaved(product);
    mark('product', 'done', input.existing ? 'Perubahan tersimpan.' : 'Item dibuat.');
  } catch (err) {
    mark('product', 'failed', errorMessage(err, 'Item gagal disimpan.'));
    for (const key of input.steps.filter((k) => k !== 'product')) mark(key, 'skipped', 'Tidak dijalankan karena data item gagal disimpan.');
    return { ok: false, product: null };
  }

  let ok = true;
  if (input.steps.includes('translations')) {
    mark('translations', 'running');
    const activeLocales = new Set(
      input.languages.filter((language) => language.is_active && !language.is_default).map((language) => language.locale),
    );
    const drafts = form.translations.filter((translation) => {
      if (!activeLocales.has(translation.locale)) return false;
      return Boolean(
        translation.name.trim()
        || translation.slug.trim()
        || translation.description.trim()
        || translation.detail.trim()
        || translation.seoTitle.trim()
        || translation.seoDescription.trim()
        || translation.seoImage.trim()
        || translation.seoNoIndex !== form.seoNoIndex
        || translation.isPublished !== form.isActive,
      );
    });
    let failed = 0;
    for (const translation of drafts) {
      try {
        await upsertProductTranslation(websiteId, product.id, translation.locale, {
          slug: translation.slug.trim(),
          name: translation.name.trim() || form.name.trim(),
          description: translation.description.trim() || null,
          detail: translation.detail.trim() || null,
          seo_title: translation.seoTitle.trim() || null,
          seo_description: translation.seoDescription.trim() || null,
          seo_image: translation.seoImage.trim() || null,
          seo_no_index: translation.seoNoIndex,
          is_published: translation.isPublished,
        });
      } catch (err) {
        failed += 1;
        mark('translations', 'failed', errorMessage(err, `Terjemahan ${translation.locale} gagal disimpan.`));
      }
    }
    if (failed) ok = false;
    else mark('translations', 'done', drafts.length ? `${drafts.length} terjemahan tersimpan.` : 'Tidak ada perubahan terjemahan.');
  }

  if (input.steps.includes('variants')) {
    mark('variants', 'running');
    const ops = planVariantOps(form, product, input.body, input.loadedChildren, input.allSlugs);
    let failed = 0;
    for (const op of ops) {
      try {
        if (op.kind === 'create') {
          const child = await createProduct(websiteId, op.body);
          cb.onVariantCreated(op.draft.key, child);
          cb.onVariantError(op.draft.key, null);
        } else if (op.kind === 'update') {
          await updateProduct(websiteId, op.id, op.body);
          cb.onVariantError(op.draft.key, null);
        } else {
          await deleteProduct(websiteId, op.id);
          cb.onVariantDeleted(op.id);
        }
      } catch (err) {
        failed += 1;
        const message = errorMessage(err, 'Gagal disimpan.');
        if (op.kind === 'delete') cb.onVariantError(`delete:${op.id}`, `Gagal menghapus "${op.label}": ${message}`);
        else cb.onVariantError(op.draft.key, message);
      }
    }
    if (failed) ok = false;
    mark('variants', failed ? 'failed' : 'done', ops.length === 0 ? 'Tidak ada perubahan.' : failed ? `${failed} dari ${ops.length} perubahan varian gagal — lihat baris yang ditandai.` : `${ops.length} perubahan varian tersimpan.`);
  }

  if (input.steps.includes('options')) {
    mark('options', 'running');
    try {
      const saved = await replaceGatheringOptions(websiteId, product.id, buildGatheringOptions(form));
      if (Array.isArray(saved)) cb.onOptionsSaved(saved);
      mark('options', 'done', 'Pilihan acara tersimpan.');
    } catch (err) {
      ok = false;
      mark('options', 'failed', errorMessage(err, 'Pilihan acara gagal disimpan.'));
    }
  }

  if (input.steps.includes('assets')) {
    mark('assets', 'running');
    try {
      const existing = new Set((await fetchProductAssetLinks(websiteId, product.id)).map((l) => l.asset_id));
      const next = new Set(form.assetIds);
      for (const id of existing) if (!next.has(id)) await unlinkProductAsset(websiteId, id, product.id);
      for (const id of next) if (!existing.has(id)) await linkProductAsset(websiteId, id, product.id);
      mark('assets', 'done', `${next.size} file terhubung.`);
    } catch (err) {
      ok = false;
      mark('assets', 'failed', errorMessage(err, 'Tautan file gagal disimpan.'));
    }
  }
  return { ok, product };
}
