import type { CatalogProduct } from '@/studio/api/products';
import type { DataRow, FilterCounts, ServerPage, ServerQuery } from '@/studio/ui/data-list';

import { skuOf } from '../product-utils';

export const NO_CATEGORY = '__none';

export interface CatalogRow extends DataRow {
  kind: 'item' | 'variant';
  product: CatalogProduct;
  /** Baris varian: id item induk. */
  parentId: string | null;
  /** Baris item: produk anak (varian). */
  variants: CatalogProduct[];
  parentName: string | null;
}

function matchesSearch(product: CatalogProduct, children: CatalogProduct[], q: string): boolean {
  if (!q) return true;
  const hit = (p: CatalogProduct) => p.name.toLowerCase().includes(q) || skuOf(p).toLowerCase().includes(q);
  return hit(product) || children.some(hit);
}

function categoryKey(product: CatalogProduct): string {
  return product.category_id ?? NO_CATEGORY;
}

function bump(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

/**
 * API `GET /products` belum mendukung page/size/search, jadi "mode server" Data List
 * dijalankan di sini atas daftar lengkap (tanpa filter tab — memperbaiki bug lama
 * Rule B/kandidat induk dari daftar terfilter). Bila API menambah paginasi, cukup
 * ganti fungsi `load` tanpa mengubah UI.
 */
export function buildCatalogPage(all: CatalogProduct[], query: ServerQuery): ServerPage<CatalogRow> {
  const byId = new Map(all.map((p) => [p.id, p]));
  const childrenOf = new Map<string, CatalogProduct[]>();
  for (const p of all) {
    if (p.parent_product_id && byId.has(p.parent_product_id)) {
      const list = childrenOf.get(p.parent_product_id) ?? [];
      list.push(p);
      childrenOf.set(p.parent_product_id, list);
    }
  }
  const topLevel = all.filter((p) => !p.parent_product_id || !byId.has(p.parent_product_id));

  const q = query.search.trim().toLowerCase();
  const typeFilter = query.filters.type ?? '';
  const categoryFilter = query.filters.category ?? '';

  const typeCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  const matched: CatalogProduct[] = [];
  let allTypesCount = 0;

  for (const p of topLevel) {
    const children = childrenOf.get(p.id) ?? [];
    if (!matchesSearch(p, children, q)) continue;
    const typeOk = !typeFilter || p.type === typeFilter;
    const catOk = !categoryFilter || categoryKey(p) === categoryFilter;
    if (catOk) {
      bump(typeCounts, p.type);
      allTypesCount += 1;
    }
    if (typeOk) bump(categoryCounts, categoryKey(p));
    if (typeOk && catOk) matched.push(p);
  }
  typeCounts[''] = allTypesCount;

  const start = (Math.max(1, query.page) - 1) * query.pageSize;
  const pageItems = matched.slice(start, start + query.pageSize);
  const items: CatalogRow[] = [];
  for (const p of pageItems) {
    const variants = childrenOf.get(p.id) ?? [];
    items.push({ id: p.id, kind: 'item', product: p, parentId: null, variants, parentName: null });
    for (const v of variants) {
      items.push({ id: v.id, kind: 'variant', product: v, parentId: p.id, variants: [], parentName: p.name });
    }
  }

  const counts: FilterCounts = { type: typeCounts, category: categoryCounts };
  return { items, total: matched.length, counts };
}
