import type { ProductTypeKey } from '@/studio/api/products';

import { isProductTypeKey } from '../catalog-types';

/**
 * Registry bagian per tipe (plan §3.12 — sumber kebenaran). Editor, navigasi kiri,
 * kelengkapan, dan payload simpan membaca file ini: field dari bagian yang tidak tampil
 * untuk sebuah tipe TIDAK dikirim / direset sesuai aturan tipe (bug lama: berat, dimensi,
 * spesifikasi, estimasi ikut terkirim untuk semua tipe).
 */
export type SectionId =
  | 'info'
  | 'media'
  | 'price'
  | 'variants'
  | 'shipping'
  | 'duration'
  | 'package'
  | 'digital'
  | 'event'
  | 'fulfil'
  | 'advanced';

export const SECTION_LABELS: Readonly<Record<SectionId, string>> = {
  info: 'Informasi dasar',
  media: 'Foto & video',
  price: 'Harga',
  variants: 'Varian & stok',
  shipping: 'Pengiriman',
  duration: 'Durasi',
  package: 'Isi paket',
  digital: 'File yang dikirim',
  event: 'Peserta & pilihan acara',
  fulfil: 'Setelah dipesan',
  advanced: 'Lanjutan',
};

export const SECTIONS_BY_TYPE: Readonly<Record<ProductTypeKey, readonly SectionId[]>> = {
  product: ['info', 'media', 'price', 'variants', 'shipping', 'fulfil', 'advanced'],
  service: ['info', 'media', 'price', 'duration', 'fulfil', 'advanced'],
  package: ['info', 'media', 'price', 'package', 'fulfil', 'advanced'],
  digital: ['info', 'media', 'price', 'digital', 'advanced'],
  gathering: ['info', 'media', 'price', 'event', 'advanced'],
};

export type AdvancedField = 'slug' | 'specifications' | 'estimation' | 'model3d';

/** Isi bagian "Lanjutan" per tipe. Spesifikasi/estimasi hanya untuk tipe yang memakainya. */
export const ADVANCED_FIELDS: Readonly<Record<ProductTypeKey, readonly AdvancedField[]>> = {
  product: ['slug', 'specifications', 'estimation', 'model3d'],
  service: ['slug', 'specifications', 'estimation', 'model3d'],
  package: ['slug', 'specifications', 'estimation', 'model3d'],
  digital: ['slug', 'specifications', 'model3d'],
  gathering: ['slug'],
};

export interface SectionContext {
  /** Item ini adalah varian (punya induk) → tidak boleh punya varian sendiri (maks. 1 level). */
  isChild: boolean;
  /** Jumlah varian tersimpan (item lama non-produk yang terlanjur punya varian tetap bisa diedit). */
  savedVariantCount: number;
}

export function sectionsFor(type: string, ctx: SectionContext): SectionId[] {
  const base = [...(isProductTypeKey(type) ? SECTIONS_BY_TYPE[type] : SECTIONS_BY_TYPE.product)];
  if (ctx.isChild) return base.filter((id) => id !== 'variants');
  if (!base.includes('variants') && ctx.savedVariantCount > 0) base.splice(base.indexOf('price') + 1, 0, 'variants');
  return base;
}

export function advancedFieldsFor(type: string): readonly AdvancedField[] {
  return isProductTypeKey(type) ? ADVANCED_FIELDS[type] : ADVANCED_FIELDS.product;
}
