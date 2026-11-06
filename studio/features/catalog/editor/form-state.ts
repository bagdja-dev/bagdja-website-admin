import type { CatalogProduct, GatheringProductOption } from '@/studio/api/products';

import { moneyFromApi } from '../money';
import { metaInt, metaOf, metaString, skuOf, stockOf, variantAttributesOf, variantLabelOf } from '../product-utils';

export interface GalleryImage {
  url: string;
  alt: string;
  caption: string;
}

export interface VariantDraft {
  /** Kunci React stabil. */
  key: string;
  /** null = varian baru (dibuat saat Simpan). */
  id: string | null;
  name: string;
  price: string;
  stock: string;
  sku: string;
  /** Nama tampil saat dimuat, untuk tahu apakah atribut perlu diubah. */
  loadedName: string;
  loadedAttributes: Record<string, string>;
}

export interface GatheringOptionDraft {
  key: string;
  id?: string;
  optionKey?: string;
  group: string;
  label: string;
  description: string;
  availabilityNote: string;
  venueLocation: string;
  benefits: string;
}

export interface KeyValueRow {
  key: string;
  value: string;
}

export interface EstimationRow {
  label: string;
  price: string;
}

export type PenaltyType = 'NONE' | 'FIXED' | 'PERCENTAGE';

export interface ProductForm {
  type: string;
  name: string;
  slug: string;
  /** Slug diubah manual → tidak lagi mengikuti nama. */
  slugTouched: boolean;
  categoryId: string;
  uomId: string;
  description: string;
  detail: string;
  images: GalleryImage[];
  videoUrl: string;
  model3dUrl: string;
  price: string;
  quotable: boolean;
  isActive: boolean;
  sku: string;
  stock: string;
  hasVariants: boolean;
  variantAxis: string;
  variants: VariantDraft[];
  requiresShipping: boolean;
  weightGrams: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  durationMinutes: string;
  itemsIncluded: string;
  assetIds: string[];
  downloadTtl: string;
  minAttendees: string;
  maxAttendees: string;
  deposit: string;
  gatheringOptions: GatheringOptionDraft[];
  policySummary: string;
  prepareDays: string;
  cutoffDays: string;
  penaltyType: PenaltyType;
  penaltyValue: string;
  flowId: string;
  guarantyDays: string;
  locationIds: string[];
  specs: KeyValueRow[];
  estimation: EstimationRow[];
}

let keySeq = 0;
export function newKey(prefix: string): string {
  keySeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${keySeq}`;
}

const numText = (v: number | null | undefined): string => (v === null || v === undefined ? '' : String(v));

export function emptyVariant(): VariantDraft {
  return { key: newKey('v'), id: null, name: '', price: '', stock: '', sku: '', loadedName: '', loadedAttributes: {} };
}

export function emptyOption(): GatheringOptionDraft {
  return { key: newKey('o'), group: '', label: '', description: '', availabilityNote: '', venueLocation: '', benefits: '' };
}

/** Default item baru. `requires_shipping` mengikuti tipe (Produk fisik saja yang dikirim kurir). */
export function emptyForm(type: string): ProductForm {
  return {
    type,
    name: '',
    slug: '',
    slugTouched: false,
    categoryId: '',
    uomId: '',
    description: '',
    detail: '',
    images: [],
    videoUrl: '',
    model3dUrl: '',
    price: '',
    quotable: false,
    isActive: true,
    sku: '',
    stock: '',
    hasVariants: false,
    variantAxis: 'Varian',
    variants: [],
    requiresShipping: type === 'product',
    weightGrams: '',
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    durationMinutes: '',
    itemsIncluded: '',
    assetIds: [],
    downloadTtl: '4320',
    minAttendees: '',
    maxAttendees: '',
    deposit: '0',
    gatheringOptions: [],
    policySummary: '',
    prepareDays: '0',
    cutoffDays: '0',
    penaltyType: 'NONE',
    penaltyValue: '0',
    flowId: '',
    guarantyDays: '3',
    locationIds: [],
    specs: [],
    estimation: [],
  };
}

function galleryOf(product: CatalogProduct): GalleryImage[] {
  const meta = metaOf(product);
  const saved = Array.isArray(meta.gallery_images)
    ? meta.gallery_images.filter((e): e is Record<string, unknown> => Boolean(e) && typeof e === 'object' && !Array.isArray(e))
    : [];
  return (product.images ?? []).map((url, index) => {
    const entry = saved.find((e) => e.url === url) ?? saved[index];
    return { url, alt: typeof entry?.alt === 'string' ? entry.alt : '', caption: typeof entry?.caption === 'string' ? entry.caption : '' };
  });
}

function variantDraftOf(child: CatalogProduct, parentName: string): VariantDraft {
  const name = variantLabelOf(child, parentName);
  return {
    key: child.id,
    id: child.id,
    name,
    price: moneyFromApi(child.price),
    stock: numText(stockOf(child)),
    sku: skuOf(child),
    loadedName: name,
    loadedAttributes: variantAttributesOf(child),
  };
}

/** Opsi gathering aktif dari endpoint; bila kosong, fallback `metadata.option_groups` lama ("Grup: Pilihan"). */
function optionDraftsOf(product: CatalogProduct, options: GatheringProductOption[]): GatheringOptionDraft[] {
  const active = options.filter((o) => o.is_active);
  if (active.length > 0) {
    return active.map((o) => ({
      key: o.id,
      id: o.id,
      optionKey: o.option_key,
      group: o.option_group_key,
      label: o.label,
      description: o.description ?? '',
      availabilityNote: typeof o.availability_window?.note === 'string' ? o.availability_window.note : '',
      venueLocation: o.venue_location ?? '',
      benefits: (o.benefits ?? []).filter((b): b is string => typeof b === 'string').join('\n'),
    }));
  }
  const raw = metaOf(product).option_groups;
  const lines = Array.isArray(raw) ? raw.map(String) : typeof raw === 'string' ? raw.split(/\n|;/) : [];
  return lines.filter(Boolean).map((line) => {
    const [group, ...rest] = line.split(':');
    return { ...emptyOption(), group: group.trim() || 'Pilihan', label: rest.join(':').trim() || line };
  });
}

export interface FormSources {
  product: CatalogProduct;
  children: CatalogProduct[];
  gatheringOptions: GatheringProductOption[];
  assetIds: string[];
}

export function formFromProduct({ product, children, gatheringOptions, assetIds }: FormSources): ProductForm {
  const meta = metaOf(product);
  const policy = meta.cancellation_policy && typeof meta.cancellation_policy === 'object' ? (meta.cancellation_policy as Record<string, unknown>) : {};
  const firstActive = gatheringOptions.find((o) => o.is_active);
  const axisKeys = Object.keys(variantAttributesOf(children[0] ?? product));
  const penalty = typeof policy.penalty_type === 'string' ? policy.penalty_type : 'NONE';
  return {
    ...emptyForm(product.type),
    name: product.name,
    slug: product.slug,
    slugTouched: true,
    categoryId: product.category_id ?? '',
    uomId: product.uom_id ?? '',
    description: product.description ?? '',
    detail: product.detail ?? '',
    images: galleryOf(product),
    videoUrl: product.video_url ?? '',
    model3dUrl: product.model3d_url ?? '',
    price: moneyFromApi(product.price),
    quotable: product.quotable ?? false,
    isActive: product.is_active,
    sku: skuOf(product),
    stock: numText(stockOf(product)),
    hasVariants: children.length > 0,
    variantAxis: axisKeys.length === 1 ? axisKeys[0] : 'Varian',
    variants: children.map((c) => variantDraftOf(c, product.name)),
    requiresShipping: product.requires_shipping ?? false,
    weightGrams: numText(product.weight_grams),
    lengthCm: numText(product.length_cm),
    widthCm: numText(product.width_cm),
    heightCm: numText(product.height_cm),
    durationMinutes: numText(metaInt(meta, 'duration_minutes')),
    itemsIncluded: metaString(meta, 'items_included'),
    assetIds,
    downloadTtl: String(product.download_link_ttl_minutes ?? 4320),
    minAttendees: meta.min_attendees != null ? String(meta.min_attendees) : '',
    maxAttendees: meta.max_attendees != null ? String(meta.max_attendees) : '',
    deposit: moneyFromApi(firstActive ? firstActive.deposit_amount_per_seat : meta.deposit_amount_per_seat ?? 0) || '0',
    gatheringOptions: product.type === 'gathering' ? optionDraftsOf(product, gatheringOptions) : [],
    policySummary: typeof meta.cancellation_policy === 'string' ? meta.cancellation_policy : typeof policy.summary === 'string' ? policy.summary : '',
    prepareDays: String(policy.prepare_days_before_event ?? policy.cutoff_days_before_event ?? 0),
    cutoffDays: String(policy.cutoff_days_before_event ?? 0),
    penaltyType: penalty === 'FIXED' || penalty === 'PERCENTAGE' ? penalty : 'NONE',
    penaltyValue: String(policy.penalty_value ?? 0),
    flowId: product.fulfillment_flow_id ?? '',
    guarantyDays: numText(product.final_release_guaranty_days),
    locationIds: product.location_ids ?? [],
    specs: Object.entries(product.specifications ?? {}).map(([key, value]) => ({ key, value: String(value) })),
    estimation: (product.estimation ?? []).map((e) => ({ label: e.label, price: moneyFromApi(e.price) })),
  };
}
