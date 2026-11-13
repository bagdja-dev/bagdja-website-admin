import { jsonBody, studioRequest, websitePath } from './client';

/** Bentuk ringkas yang dipakai pemilih produk (editor halaman, blog). */
export interface WebsiteProduct {
  id: string;
  website_id: string;
  name: string;
  slug: string;
  type: string;
  price?: number | null;
  images?: string[] | null;
  cover_image?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductTypeKey = 'product' | 'service' | 'package' | 'digital' | 'gathering';

export interface ProductUom {
  id: string;
  code: string;
  label: string;
  symbol: string;
  is_active: boolean;
  sort_order: number;
}

export interface ProductEstimationEntry {
  label: string;
  price: number;
}

/** `GET /api/websites/:id/products` — entity `WebsiteProduct` lengkap (+ `location_ids`, relasi `uom`). */
export interface CatalogProduct {
  id: string;
  website_id: string;
  type: string;
  category_id: string | null;
  parent_product_id: string | null;
  location_ids?: string[];
  name: string;
  slug: string;
  description: string | null;
  detail: string | null;
  /** API mengirim number (transformer), tetapi dibaca defensif karena kolom decimal. */
  price: number | string;
  images: string[] | null;
  video_url: string | null;
  model3d_url: string | null;
  metadata: Record<string, unknown> | null;
  specifications: Record<string, string> | null;
  estimation: ProductEstimationEntry[] | null;
  sort_order: number;
  is_active: boolean;
  quotable: boolean;
  download_link_ttl_minutes: number | null;
  uom_id: string | null;
  uom?: ProductUom | null;
  fulfillment_flow_id: string | null;
  final_release_guaranty_days: number | null;
  weight_grams: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  requires_shipping: boolean;
  created_at: string;
  updated_at: string;
}

/** Body POST/PATCH produk (CreateProductDto / UpdateProductDto API, whitelist ketat). */
export interface ProductWriteRequest {
  type?: string;
  category_id?: string | null;
  parent_product_id?: string | null;
  name?: string;
  slug?: string;
  description?: string | null;
  detail?: string | null;
  price?: number;
  images?: string[];
  video_url?: string | null;
  model3d_url?: string | null;
  metadata?: Record<string, unknown>;
  specifications?: Record<string, string>;
  estimation?: ProductEstimationEntry[];
  location_ids?: string[];
  is_active?: boolean;
  quotable?: boolean;
  download_link_ttl_minutes?: number;
  uom_id?: string | null;
  fulfillment_flow_id?: string | null;
  final_release_guaranty_days?: number | null;
  weight_grams?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  requires_shipping?: boolean;
}

export interface GatheringProductOption {
  id: string;
  product_id: string;
  option_group_key: string;
  option_key: string;
  label: string;
  description?: string | null;
  price_per_seat: number | string;
  deposit_amount_per_seat: number | string;
  currency: string;
  min_attendees: number;
  max_attendees: number;
  availability_window: Record<string, unknown> | null;
  venue_location?: string | null;
  venue_address?: string | null;
  venue_map_url?: string | null;
  benefits: unknown[] | null;
  images?: string[] | null;
  cancellation_policy: Record<string, unknown> | null;
  is_active: boolean;
  sort_order: number;
}

export interface GatheringOptionInput {
  id?: string;
  option_group_key: string;
  option_key: string;
  label: string;
  description?: string;
  price_per_seat: number;
  deposit_amount_per_seat: number;
  currency: 'IDR';
  min_attendees: number;
  max_attendees: number;
  availability_window: Record<string, unknown>;
  venue_location?: string;
  /** Alamat lengkap (≤ 500). */
  venue_address?: string;
  /** Tautan Google Maps (https). */
  venue_map_url?: string;
  benefits: string[];
  images: string[];
  cancellation_policy: Record<string, unknown>;
  sort_order: number;
}

export interface ProductAssetLink {
  id: string;
  product_id: string;
  asset_id: string;
  role: string;
  sort_order: number;
  is_active: boolean;
}

function productsPath(websiteId: string, suffix = ''): string {
  return websitePath(websiteId, `/products${suffix}`);
}

export function fetchProducts(websiteId: string): Promise<WebsiteProduct[]> {
  return studioRequest<WebsiteProduct[]>(productsPath(websiteId));
}

/** Semua item (tanpa filter tipe) — dipakai daftar katalog & editor (varian, Rule A/B). */
export function fetchCatalogProducts(websiteId: string): Promise<CatalogProduct[]> {
  return studioRequest<CatalogProduct[]>(productsPath(websiteId));
}

export function fetchCatalogProduct(websiteId: string, productId: string): Promise<CatalogProduct> {
  return studioRequest<CatalogProduct>(productsPath(websiteId, `/${encodeURIComponent(productId)}`));
}

export function createProduct(websiteId: string, body: ProductWriteRequest): Promise<CatalogProduct> {
  return studioRequest<CatalogProduct>(productsPath(websiteId), { method: 'POST', ...jsonBody(body) });
}

export function updateProduct(websiteId: string, productId: string, body: ProductWriteRequest): Promise<CatalogProduct> {
  return studioRequest<CatalogProduct>(productsPath(websiteId, `/${encodeURIComponent(productId)}`), {
    method: 'PATCH',
    ...jsonBody(body),
  });
}

/** Admin+ (API). */
export function deleteProduct(websiteId: string, productId: string): Promise<{ deleted: boolean }> {
  return studioRequest<{ deleted: boolean }>(productsPath(websiteId, `/${encodeURIComponent(productId)}`), { method: 'DELETE' });
}

export function fetchProductUoms(websiteId: string): Promise<ProductUom[]> {
  return studioRequest<ProductUom[]>(productsPath(websiteId, '/uoms/list'));
}

export function fetchGatheringOptions(websiteId: string, productId: string): Promise<GatheringProductOption[]> {
  return studioRequest<GatheringProductOption[]>(productsPath(websiteId, `/${encodeURIComponent(productId)}/gathering-options`));
}

/** PUT = ganti seluruh opsi (opsi lama yang tidak dikirim dinonaktifkan API). */
export function replaceGatheringOptions(
  websiteId: string,
  productId: string,
  options: GatheringOptionInput[],
): Promise<GatheringProductOption[]> {
  return studioRequest<GatheringProductOption[]>(productsPath(websiteId, `/${encodeURIComponent(productId)}/gathering-options`), {
    method: 'PUT',
    ...jsonBody({ options }),
  });
}

export function fetchProductAssetLinks(websiteId: string, productId: string): Promise<ProductAssetLink[]> {
  return studioRequest<ProductAssetLink[]>(websitePath(websiteId, `/assets/products/${encodeURIComponent(productId)}`));
}

export function linkProductAsset(websiteId: string, assetId: string, productId: string): Promise<unknown> {
  return studioRequest<unknown>(
    websitePath(websiteId, `/assets/${encodeURIComponent(assetId)}/products/${encodeURIComponent(productId)}`),
    { method: 'POST', ...jsonBody({ role: 'download' }) },
  );
}

export function unlinkProductAsset(websiteId: string, assetId: string, productId: string): Promise<unknown> {
  return studioRequest<unknown>(
    websitePath(websiteId, `/assets/${encodeURIComponent(assetId)}/products/${encodeURIComponent(productId)}`),
    { method: 'DELETE' },
  );
}
