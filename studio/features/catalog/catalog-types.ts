import type { ProductTypeKey } from '@/studio/api/products';
import type { ModuleKey } from '@/studio/api/types';

export interface ItemTypeMeta {
  key: ProductTypeKey;
  /** Label pendek (chip daftar, badge). */
  label: string;
  /** Label di pilihan "Mau menambah apa?". */
  pickerLabel: string;
  description: string;
  /** Modul yang wajib aktif agar tipe ini bisa dibuat / difilter. */
  module: ModuleKey | null;
  /** Paket disembunyikan sementara (keputusan user 6 Nov 2026): tidak bisa dibuat baru, item lama tetap bisa diedit. */
  creatable: boolean;
  /** Kelas badge (artboard Produk-List). */
  badgeClass: string;
}

export const ITEM_TYPES: Readonly<Record<ProductTypeKey, ItemTypeMeta>> = {
  service: {
    key: 'service',
    label: 'Layanan',
    pickerLabel: 'Layanan',
    description: 'Jasa yang dikerjakan, mis. potong rambut. Ada durasi.',
    module: null,
    creatable: true,
    badgeClass: 'bg-[#F5F3FF] text-[#6D28D9]',
  },
  product: {
    key: 'product',
    label: 'Produk',
    pickerLabel: 'Produk fisik',
    description: 'Barang dengan stok, bisa punya varian & dikirim kurir.',
    module: null,
    creatable: true,
    badgeClass: 'bg-[#FBF2F6] text-[#7A1E48]',
  },
  package: {
    key: 'package',
    label: 'Paket',
    pickerLabel: 'Paket',
    description: 'Gabungan beberapa layanan/produk dengan satu harga.',
    module: null,
    creatable: false,
    badgeClass: 'bg-[#FFF7ED] text-[#C2410C]',
  },
  digital: {
    key: 'digital',
    label: 'Digital',
    pickerLabel: 'Produk digital',
    description: 'File yang dikirim otomatis setelah bayar.',
    module: 'digital_delivery',
    creatable: true,
    badgeClass: 'bg-[#F0FDFA] text-[#0F766E]',
  },
  gathering: {
    key: 'gathering',
    label: 'Acara',
    pickerLabel: 'Acara',
    description: 'Event dengan kuota peserta, DP, dan tiket.',
    module: 'events',
    creatable: true,
    badgeClass: 'bg-[#FDF2F8] text-[#BE185D]',
  },
};

/** Urutan tampil (chip filter & pilihan jenis). */
export const ITEM_TYPE_ORDER: readonly ProductTypeKey[] = ['service', 'product', 'package', 'digital', 'gathering'];

export function isProductTypeKey(value: string | null | undefined): value is ProductTypeKey {
  return typeof value === 'string' && value in ITEM_TYPES;
}

export function typeMeta(type: string): ItemTypeMeta {
  return isProductTypeKey(type) ? ITEM_TYPES[type] : { ...ITEM_TYPES.product, key: 'product', label: type || 'Item' };
}

/** Tipe yang modulnya aktif (tanpa memandang `creatable`). */
export function isTypeModuleEnabled(type: ProductTypeKey, hasModule: (key: ModuleKey) => boolean): boolean {
  const moduleKey = ITEM_TYPES[type].module;
  return moduleKey === null || hasModule(moduleKey);
}

/** Tipe untuk chip filter daftar: bisa dibuat + modulnya aktif. */
export function filterableTypes(hasModule: (key: ModuleKey) => boolean): ProductTypeKey[] {
  return ITEM_TYPE_ORDER.filter((t) => ITEM_TYPES[t].creatable && isTypeModuleEnabled(t, hasModule));
}

/** D12: editor tipe Acara adalah halaman sendiri di bawah area Gathering (`/studio/events`). */
export function editorHref(product: { id: string; type: string }): string {
  return product.type === 'gathering' ? `/studio/events/items/${product.id}` : `/studio/catalog/${product.id}`;
}

export function newItemHref(type: ProductTypeKey): string {
  return type === 'gathering' ? '/studio/events/items/new' : `/studio/catalog/new?type=${type}`;
}

export const CATALOG_PATH = '/studio/catalog';
export const FEATURES_PATH = '/studio/features';
export const CATEGORIES_PATH = '/studio/catalog/categories';
