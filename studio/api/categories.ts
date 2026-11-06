import { studioRequest, jsonBody, websitePath } from './client';

export interface EstimationRow {
  label: string;
  price: number | string | null;
}

export interface WebsiteCategory {
  id: string;
  website_id: string;
  label: string;
  description?: string | null;
  images: string[];
  specifications?: Record<string, string> | null;
  estimation?: EstimationRow[] | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryRequest {
  label: string;
  description?: string | null;
  images?: string[];
  specifications?: Record<string, string>;
  estimation?: Array<{ label: string; price: number | string }>;
  sort_order?: number;
  is_active?: boolean;
}

export type UpdateCategoryRequest = Partial<CreateCategoryRequest>;

function categoriesPath(websiteId: string, suffix = ''): string {
  return websitePath(websiteId, `/categories${suffix}`);
}

export function fetchCategories(websiteId: string): Promise<WebsiteCategory[]> {
  return studioRequest<WebsiteCategory[]>(categoriesPath(websiteId));
}

export function createCategory(websiteId: string, body: CreateCategoryRequest): Promise<WebsiteCategory> {
  return studioRequest<WebsiteCategory>(categoriesPath(websiteId), { method: 'POST', ...jsonBody(body) });
}

export function updateCategory(websiteId: string, categoryId: string, body: UpdateCategoryRequest): Promise<WebsiteCategory> {
  return studioRequest<WebsiteCategory>(categoriesPath(websiteId, `/${encodeURIComponent(categoryId)}`), {
    method: 'PATCH',
    ...jsonBody(body),
  });
}

export function deleteCategory(websiteId: string, categoryId: string): Promise<{ deleted: boolean }> {
  return studioRequest<{ deleted: boolean }>(categoriesPath(websiteId, `/${encodeURIComponent(categoryId)}`), {
    method: 'DELETE',
  });
}

/**
 * API belum punya endpoint reorder kategori: urutan disimpan dengan PATCH `sort_order`
 * (= indeks baru) hanya untuk kategori yang nilainya berubah, paralel.
 * `currentSort` = sort_order tersimpan saat ini per id. Mengembalikan peta sort_order baru.
 */
export async function reorderCategories(
  websiteId: string,
  orderedIds: string[],
  currentSort: ReadonlyMap<string, number>,
): Promise<Map<string, number>> {
  const next = new Map<string, number>();
  await Promise.all(
    orderedIds.map(async (id, index) => {
      next.set(id, index);
      if (currentSort.get(id) !== index) await updateCategory(websiteId, id, { sort_order: index });
    }),
  );
  return next;
}

/** Jumlah produk per kategori (API tidak punya agregat; dihitung dari daftar produk). */
export async function fetchCategoryProductCounts(websiteId: string): Promise<Record<string, number>> {
  const products = await studioRequest<Array<{ category_id?: string | null }>>(websitePath(websiteId, '/products'));
  const counts: Record<string, number> = {};
  for (const p of products) {
    if (p.category_id) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1;
  }
  return counts;
}
