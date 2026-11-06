import type { CatalogProduct, GatheringOptionInput, ProductWriteRequest } from '@/studio/api/products';

import { moneyValue } from '../money';
import { metaOf } from '../product-utils';
import type { ProductForm } from './form-state';
import { advancedFieldsFor, sectionsFor } from './section-registry';

/** Slug produk (maks. 255, tanpa batas 63 slug website). `typing` mempertahankan "-" di akhir. */
export function slugifyProduct(text: string, typing = false): string {
  const s = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 255);
  return typing ? s : s.replace(/-+$/, '');
}

const intOrNull = (v: string): number | null => (v.trim() === '' ? null : Number.parseInt(v, 10));

export interface PayloadContext {
  base: CatalogProduct | null;
  isChild: boolean;
  savedVariantCount: number;
  attendeeUomId: string | null;
}

export function usesVariantPricing(form: ProductForm, ctx: Pick<PayloadContext, 'isChild' | 'savedVariantCount'>): boolean {
  return sectionsFor(form.type, ctx).includes('variants') && form.hasVariants && form.variants.length > 0;
}

function gallery(form: ProductForm): Array<{ url: string; alt: string; caption: string }> {
  return form.images.filter((i) => i.url).map((i) => ({ url: i.url, alt: i.alt.trim(), caption: i.caption.trim() }));
}

/** Snapshot kebijakan pembatalan v1 (sama dengan dashboard lama). */
export function cancellationPolicy(form: ProductForm): Record<string, unknown> {
  return {
    version: 1,
    prepare_days_before_event: Number.parseInt(form.prepareDays, 10),
    cutoff_days_before_event: Number.parseInt(form.cutoffDays, 10),
    penalty_type: form.penaltyType,
    penalty_value: Number(form.penaltyValue || 0),
    currency: 'IDR',
    ...(form.policySummary.trim() ? { summary: form.policySummary.trim() } : {}),
  };
}

/**
 * Body POST/PATCH produk. Field dari bagian yang tidak tampil untuk tipe ini tidak dikirim,
 * kecuali yang memang wajib direset per tipe (digital/acara: tanpa kirim kurir, tanpa lokasi/alur).
 * Metadata digabung dengan metadata lama supaya kunci lain (mis. `is_seed`) tidak hilang.
 */
export function buildProductPayload(form: ProductForm, ctx: PayloadContext): ProductWriteRequest {
  const type = form.type;
  const sections = sectionsFor(type, ctx);
  const advanced = advancedFieldsFor(type);
  const byVariant = usesVariantPricing(form, ctx);
  const meta: Record<string, unknown> = { ...(ctx.base ? metaOf(ctx.base) : {}) };
  meta.gallery_images = gallery(form);

  if (sections.includes('variants')) {
    delete meta.sku;
    delete meta.stock;
    if (!byVariant) {
      if (form.sku.trim()) meta.sku = form.sku.trim();
      const stock = intOrNull(form.stock);
      if (stock !== null) meta.stock = stock;
    }
  }
  if (sections.includes('duration')) {
    delete meta.duration_minutes;
    const minutes = intOrNull(form.durationMinutes);
    if (minutes && minutes > 0) meta.duration_minutes = minutes;
  }
  if (sections.includes('package')) {
    delete meta.items_included;
    if (form.itemsIncluded.trim()) meta.items_included = form.itemsIncluded.trim();
  }
  if (sections.includes('event')) {
    meta.min_attendees = Number.parseInt(form.minAttendees, 10);
    meta.max_attendees = Number.parseInt(form.maxAttendees, 10);
    meta.deposit_amount_per_seat = moneyValue(form.deposit) ?? 0;
    meta.cancellation_policy = cancellationPolicy(form);
  }

  const variantPrices = form.variants.map((v) => moneyValue(v.price) ?? 0);
  const body: ProductWriteRequest = {
    category_id: form.categoryId || null,
    name: form.name.trim(),
    slug: form.slug.trim(),
    price: byVariant ? Math.min(...variantPrices) : moneyValue(form.price) ?? 0,
    images: form.images.map((i) => i.url).filter(Boolean),
    video_url: form.videoUrl.trim() || null,
    metadata: meta,
    is_active: form.isActive,
    quotable: type === 'digital' || type === 'gathering' ? false : form.quotable,
    uom_id: type === 'gathering' ? ctx.attendeeUomId : form.uomId || null,
  };
  if (!ctx.base) body.type = type;

  const inherits = ctx.isChild && ctx.base !== null && metaOf(ctx.base).inherit_description === true;
  if (!inherits) {
    body.description = form.description.trim() || null;
    body.detail = form.detail.trim() || null;
  }

  if (advanced.includes('specifications')) {
    body.specifications = Object.fromEntries(form.specs.filter((r) => r.key.trim() && r.value.trim()).map((r) => [r.key.trim(), r.value.trim()]));
  }
  if (advanced.includes('estimation')) {
    body.estimation = form.estimation.filter((r) => r.label.trim() && r.price.trim()).map((r) => ({ label: r.label.trim(), price: moneyValue(r.price) ?? 0 }));
  }
  if (advanced.includes('model3d')) body.model3d_url = form.model3dUrl.trim() || null;

  if (type === 'digital' || type === 'gathering') {
    body.requires_shipping = false;
    body.weight_grams = null;
    body.length_cm = null;
    body.width_cm = null;
    body.height_cm = null;
    body.location_ids = [];
    body.fulfillment_flow_id = null;
    body.final_release_guaranty_days = null;
  } else if (sections.includes('shipping')) {
    body.requires_shipping = form.requiresShipping;
    if (form.requiresShipping) {
      body.weight_grams = intOrNull(form.weightGrams);
      body.length_cm = intOrNull(form.lengthCm);
      body.width_cm = intOrNull(form.widthCm);
      body.height_cm = intOrNull(form.heightCm);
    }
  } else if (!ctx.base) {
    // Layanan/Paket baru: tidak dikirim kurir (bagian Pengiriman tidak tampil).
    body.requires_shipping = false;
  }

  if (sections.includes('fulfil')) {
    body.fulfillment_flow_id = form.flowId || null;
    body.final_release_guaranty_days = intOrNull(form.guarantyDays);
    body.location_ids = form.locationIds;
  }
  if (type === 'digital') body.download_link_ttl_minutes = Number.parseInt(form.downloadTtl, 10) || 4320;
  return body;
}

/** Opsi gathering untuk PUT replace (harga/DP/min/maks/kebijakan disalin ke tiap opsi). */
export function buildGatheringOptions(form: ProductForm): GatheringOptionInput[] {
  const price = moneyValue(form.price) ?? 0;
  const deposit = moneyValue(form.deposit) ?? 0;
  const policy = cancellationPolicy(form);
  return activeOptionDrafts(form).map((o, index) => ({
    id: o.id,
    option_group_key: slugifyProduct(o.group).slice(0, 64) || `group-${index + 1}`,
    option_key: o.optionKey || slugifyProduct(o.label).slice(0, 64) || `option-${index + 1}`,
    label: o.label.trim(),
    description: o.description.trim() || undefined,
    price_per_seat: price,
    deposit_amount_per_seat: deposit,
    currency: 'IDR',
    min_attendees: Number.parseInt(form.minAttendees, 10),
    max_attendees: Number.parseInt(form.maxAttendees, 10),
    availability_window: o.availabilityNote.trim() ? { note: o.availabilityNote.trim() } : {},
    venue_location: o.venueLocation.trim() || undefined,
    benefits: o.benefits.split('\n').map((b) => b.trim()).filter(Boolean),
    cancellation_policy: policy,
    sort_order: index,
  }));
}

/** Baris opsi yang benar-benar diisi (baris kosong diabaikan). */
export function activeOptionDrafts(form: ProductForm) {
  return form.gatheringOptions.filter((o) => o.group.trim() || o.label.trim() || o.description.trim());
}
