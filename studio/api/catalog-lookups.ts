/**
 * Data pendukung katalog (kategori, lokasi, alur, aset digital) versi baca-saja
 * untuk daftar & editor item. Pengelolaan penuh kategori/aset ada di modulnya sendiri.
 */
import { jsonBody, studioRequest, websitePath } from './client';

export interface CatalogCategoryOption {
  id: string;
  label: string;
  is_active: boolean;
  sort_order: number;
}

export interface CatalogLocationOption {
  id: string;
  name: string;
  type: string;
  is_primary: boolean;
}

export interface CatalogFlowOption {
  id: string;
  name: string;
  is_active: boolean;
}

export interface CatalogAssetOption {
  id: string;
  name: string;
  description: string | null;
  filename: string;
  mime_type: string;
  size_bytes: number;
  is_public: boolean;
}

export function fetchCategoryOptions(websiteId: string): Promise<CatalogCategoryOption[]> {
  return studioRequest<CatalogCategoryOption[]>(websitePath(websiteId, '/categories'));
}

/** Kategori baru cepat dari editor item (hanya nama). */
export function quickCreateCategory(websiteId: string, label: string): Promise<CatalogCategoryOption> {
  return studioRequest<CatalogCategoryOption>(websitePath(websiteId, '/categories'), { method: 'POST', ...jsonBody({ label }) });
}

export function fetchLocationOptions(websiteId: string): Promise<CatalogLocationOption[]> {
  return studioRequest<CatalogLocationOption[]>(websitePath(websiteId, '/locations'));
}

export function fetchFlowOptions(websiteId: string): Promise<CatalogFlowOption[]> {
  return studioRequest<CatalogFlowOption[]>(websitePath(websiteId, '/fulfillment-flows'));
}

/** Hanya aset privat yang bisa dikirim sebagai file produk digital (sama dengan dashboard lama). */
export async function fetchPrivateAssetOptions(websiteId: string): Promise<CatalogAssetOption[]> {
  const assets = await studioRequest<CatalogAssetOption[]>(websitePath(websiteId, '/assets'));
  return assets.filter((asset) => !asset.is_public);
}
