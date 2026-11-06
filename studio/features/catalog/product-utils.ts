import type { CatalogProduct } from '@/studio/api/products';

const plainNumber = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

/** number / string desimal API ("50000.00") → number. Tidak membuang titik desimal (bug lama ×100). */
export function toAmount(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function formatRupiah(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `Rp ${plainNumber.format(value)}`;
}

export function formatPriceRange(prices: number[]): string {
  if (prices.length === 0) return '—';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatRupiah(min) : `${formatRupiah(min)} – ${plainNumber.format(max)}`;
}

export function metaOf(product: Pick<CatalogProduct, 'metadata'>): Record<string, unknown> {
  const meta = product.metadata;
  return meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : {};
}

export function metaString(meta: Record<string, unknown>, key: string): string {
  const value = meta[key];
  return typeof value === 'string' ? value : '';
}

export function metaInt(meta: Record<string, unknown>, key: string): number | null {
  const value = meta[key];
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function stockOf(product: Pick<CatalogProduct, 'metadata'>): number | null {
  return metaInt(metaOf(product), 'stock');
}

export function skuOf(product: Pick<CatalogProduct, 'metadata'>): string {
  return metaString(metaOf(product), 'sku');
}

export function variantAttributesOf(product: Pick<CatalogProduct, 'metadata'>): Record<string, string> {
  const raw = metaOf(product).variant_attributes;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')]));
}

/** Nama pendek varian: nilai atribut ("Merah / L"), atau nama tanpa awalan nama induk. */
export function variantLabelOf(child: CatalogProduct, parentName?: string): string {
  const values = Object.values(variantAttributesOf(child)).map((v) => v.trim()).filter(Boolean);
  if (values.length > 0) return values.join(' / ');
  if (parentName && child.name.startsWith(parentName)) {
    const rest = child.name.slice(parentName.length).replace(/^[\s\-–·/]+/, '').trim();
    if (rest) return rest;
  }
  return child.name;
}

export function priceOf(product: Pick<CatalogProduct, 'price'>): number | null {
  return toAmount(product.price);
}

export function coverOf(product: Pick<CatalogProduct, 'images'>): string | null {
  return product.images?.find((url) => typeof url === 'string' && url.length > 0) ?? null;
}
