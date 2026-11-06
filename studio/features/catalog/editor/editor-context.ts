import type {
  CatalogAssetOption,
  CatalogCategoryOption,
  CatalogFlowOption,
  CatalogLocationOption,
} from '@/studio/api/catalog-lookups';
import type { CatalogProduct, ProductUom } from '@/studio/api/products';
import type { ModuleKey } from '@/studio/api/types';

import type { ProductForm } from './form-state';

export interface EditorLookups {
  categories: CatalogCategoryOption[];
  uoms: ProductUom[];
  flows: CatalogFlowOption[];
  locations: CatalogLocationOption[];
  assets: CatalogAssetOption[];
}

export type FormErrors = Partial<Record<string, string>>;

/** Semua yang dibutuhkan komponen bagian (satu komponen per bagian, lihat section-registry). */
export interface SectionProps {
  form: ProductForm;
  set: (patch: Partial<ProductForm>) => void;
  errors: FormErrors;
  lookups: EditorLookups;
  websiteId: string;
  /** Item tersimpan (null = baru). */
  product: CatalogProduct | null;
  /** Item ini sendiri adalah varian (punya induk). */
  parent: CatalogProduct | null;
  canEdit: boolean;
  canDelete: boolean;
  hasModule: (key: ModuleKey) => boolean;
  moduleLabel: (key: ModuleKey) => string;
  addCategory: (label: string) => Promise<string | null>;
}
