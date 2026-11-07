import type { CatalogProduct, ProductWriteRequest } from '@/studio/api/products';

import { moneyValue } from '../money';
import { metaOf, skuOf, stockOf, toAmount } from '../product-utils';
import { slugifyProduct } from './build-payload';
import type { ProductForm, VariantDraft } from './form-state';

export type VariantOp =
  | { kind: 'create'; draft: VariantDraft; body: ProductWriteRequest }
  | { kind: 'update'; draft: VariantDraft; id: string; body: ProductWriteRequest }
  | { kind: 'delete'; id: string; label: string };

function variantName(parentName: string, name: string): string {
  return `${parentName.trim()} - ${name.trim()}`;
}

function attributesFor(draft: VariantDraft, axis: string): Record<string, string> {
  const keys = Object.keys(draft.loadedAttributes);
  const unchanged = draft.id !== null && draft.name.trim() === draft.loadedName.trim();
  if (unchanged && keys.length > 1) return draft.loadedAttributes;
  return { [axis.trim() || 'Varian']: draft.name.trim() };
}

function sameAttrs(a: Record<string, string>, b: Record<string, string>): boolean {
  return JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
}

function uniqueSlug(base: string, taken: Set<string>): string {
  let slug = base;
  let n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;
  taken.add(slug);
  return slug;
}

/**
 * Rencana simpan varian (produk anak `parent_product_id`) dari tabel varian di item induk.
 * Varian baru mewarisi kategori, satuan, foto, pengiriman, alur, dan lokasi dari induk;
 * deskripsi mengikuti induk (`metadata.inherit_description`).
 */
export function planVariantOps(form: ProductForm, parent: CatalogProduct, parentBody: ProductWriteRequest, loaded: CatalogProduct[], allSlugs: string[]): VariantOp[] {
  const ops: VariantOp[] = [];
  const keep = form.hasVariants ? form.variants : [];
  const keptIds = new Set(keep.map((v) => v.id).filter(Boolean));
  for (const child of loaded) {
    if (!keptIds.has(child.id)) ops.push({ kind: 'delete', id: child.id, label: child.name });
  }
  const taken = new Set(allSlugs);
  const axis = form.variantAxis;

  for (const draft of keep) {
    const attrs = attributesFor(draft, axis);
    const stock = draft.stock.trim() === '' ? null : Number.parseInt(draft.stock, 10);
    const price = moneyValue(draft.price) ?? 0;
    if (draft.id === null) {
      const meta: Record<string, unknown> = {
        variant_attributes: attrs,
        inherit_description: true,
        gallery_images: (parentBody.metadata?.gallery_images as unknown[]) ?? [],
        ...(draft.sku.trim() ? { sku: draft.sku.trim() } : {}),
        ...(stock !== null ? { stock } : {}),
      };
      ops.push({
        kind: 'create',
        draft,
        body: {
          type: parent.type,
          parent_product_id: parent.id,
          name: variantName(parent.name, draft.name),
          slug: uniqueSlug(`${parent.slug}-${slugifyProduct(draft.name) || 'varian'}`.slice(0, 250), taken),
          description: '',
          detail: '',
          price,
          category_id: parent.category_id,
          uom_id: parent.uom_id,
          images: parent.images ?? [],
          metadata: meta,
          is_active: parent.is_active,
          quotable: parent.quotable,
          requires_shipping: parent.requires_shipping,
          weight_grams: parent.weight_grams,
          length_cm: parent.length_cm,
          width_cm: parent.width_cm,
          height_cm: parent.height_cm,
          fulfillment_flow_id: parent.fulfillment_flow_id,
          final_release_guaranty_days: parent.final_release_guaranty_days,
          location_ids: parentBody.location_ids ?? parent.location_ids ?? [],
        },
      });
      continue;
    }
    const child = loaded.find((c) => c.id === draft.id);
    if (!child) continue;
    const body: ProductWriteRequest = {};
    if (draft.name.trim() !== draft.loadedName.trim()) body.name = variantName(parent.name, draft.name);
    if ((toAmount(child.price) ?? 0) !== price) body.price = price;
    const childMeta = metaOf(child);
    const metaChanged = draft.sku.trim() !== skuOf(child) || stock !== stockOf(child) || !sameAttrs(attrs, draft.loadedAttributes);
    if (metaChanged) {
      const meta: Record<string, unknown> = { ...childMeta, variant_attributes: attrs };
      delete meta.sku;
      delete meta.stock;
      if (draft.sku.trim()) meta.sku = draft.sku.trim();
      if (stock !== null) meta.stock = stock;
      body.metadata = meta;
    }
    if (Object.keys(body).length > 0) ops.push({ kind: 'update', draft, id: child.id, body });
  }
  return ops;
}
