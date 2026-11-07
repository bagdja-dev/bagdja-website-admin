'use client';

import { useCallback, useEffect, useState } from 'react';

import { errorMessage, isNotFound } from '@/studio/api/client';
import {
  fetchCategoryOptions,
  fetchFlowOptions,
  fetchLocationOptions,
  fetchPrivateAssetOptions,
  quickCreateCategory,
} from '@/studio/api/catalog-lookups';
import {
  fetchCatalogProducts,
  fetchGatheringOptions,
  fetchProductAssetLinks,
  fetchProductUoms,
  type CatalogProduct,
  type GatheringProductOption,
} from '@/studio/api/products';
import { notify } from '@/studio/ui/primitives/Toast';

import type { EditorLookups } from './editor-context';

const EMPTY_LOOKUPS: EditorLookups = { categories: [], uoms: [], flows: [], locations: [], assets: [] };

const orEmpty = <T,>(p: Promise<T[]>): Promise<T[]> => p.catch(() => []);

export interface LoadedItem {
  product: CatalogProduct;
  children: CatalogProduct[];
  parent: CatalogProduct | null;
  gatheringOptions: GatheringProductOption[];
  assetIds: string[];
}

export interface EditorData {
  status: 'loading' | 'ready' | 'not-found' | 'error';
  error: string | null;
  lookups: EditorLookups;
  item: LoadedItem | null;
  /** Semua slug produk website (cek bentrok slug varian baru). */
  allSlugs: string[];
  gatheringOptionsBlocked: boolean;
  assetLinksBlocked: boolean;
  reload: (productId?: string | null) => Promise<LoadedItem | null>;
  addCategory: (label: string) => Promise<string | null>;
}

/** Memuat item + data pendukung. Kandidat varian & slug dihitung dari daftar LENGKAP (bukan terfilter). */
export function useEditorData(websiteId: string | null, productId: string | null, type: string): EditorData {
  const [status, setStatus] = useState<EditorData['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const [lookups, setLookups] = useState<EditorLookups>(EMPTY_LOOKUPS);
  const [item, setItem] = useState<LoadedItem | null>(null);
  const [allSlugs, setAllSlugs] = useState<string[]>([]);
  const [gatheringOptionsBlocked, setGatheringBlocked] = useState(false);
  const [assetLinksBlocked, setAssetBlocked] = useState(false);

  const loadItem = useCallback(
    async (id: string): Promise<LoadedItem | null> => {
      if (!websiteId) return null;
      const all = await fetchCatalogProducts(websiteId);
      setAllSlugs(all.map((p) => p.slug));
      const product = all.find((p) => p.id === id);
      if (!product) return null;
      const children = all.filter((p) => p.parent_product_id === id);
      const parent = product.parent_product_id ? all.find((p) => p.id === product.parent_product_id) ?? null : null;
      let gatheringOptions: GatheringProductOption[] = [];
      let assetIds: string[] = [];
      if (product.type === 'gathering') {
        try {
          gatheringOptions = await fetchGatheringOptions(websiteId, id);
          setGatheringBlocked(false);
        } catch {
          setGatheringBlocked(true);
        }
      }
      if (product.type === 'digital') {
        try {
          assetIds = (await fetchProductAssetLinks(websiteId, id)).map((l) => l.asset_id);
          setAssetBlocked(false);
        } catch {
          setAssetBlocked(true);
        }
      }
      return { product, children, parent, gatheringOptions, assetIds };
    },
    [websiteId],
  );

  const reload = useCallback(
    async (id: string | null = productId): Promise<LoadedItem | null> => {
      if (!websiteId) return null;
      try {
        if (!id) {
          const all = await fetchCatalogProducts(websiteId).catch(() => [] as CatalogProduct[]);
          setAllSlugs(all.map((p) => p.slug));
          setStatus('ready');
          return null;
        }
        const loaded = await loadItem(id);
        setItem(loaded);
        setStatus(loaded ? 'ready' : 'not-found');
        return loaded;
      } catch (err) {
        setError(errorMessage(err, 'Item gagal dimuat.'));
        setStatus(isNotFound(err) ? 'not-found' : 'error');
        return null;
      }
    },
    [loadItem, productId, websiteId],
  );

  useEffect(() => {
    if (!websiteId) return;
    void Promise.all([
      orEmpty(fetchCategoryOptions(websiteId)),
      orEmpty(fetchProductUoms(websiteId)),
      orEmpty(fetchFlowOptions(websiteId)),
      orEmpty(fetchLocationOptions(websiteId)),
    ]).then(([categories, uoms, flows, locations]) => setLookups((prev) => ({ ...prev, categories, uoms, flows, locations })));
  }, [websiteId]);

  // Aset privat hanya dibutuhkan item digital (tipe efektif diketahui setelah item dimuat).
  useEffect(() => {
    if (!websiteId || type !== 'digital') return;
    void orEmpty(fetchPrivateAssetOptions(websiteId)).then((assets) => setLookups((prev) => ({ ...prev, assets })));
  }, [type, websiteId]);

  useEffect(() => {
    setStatus('loading');
    void reload();
  }, [reload]);

  const addCategory = useCallback(
    async (label: string): Promise<string | null> => {
      if (!websiteId) return null;
      try {
        const created = await quickCreateCategory(websiteId, label);
        setLookups((prev) => ({ ...prev, categories: [...prev.categories, created] }));
        notify.success(`Kategori "${created.label}" ditambahkan.`);
        return created.id;
      } catch (err) {
        notify.error('Kategori gagal dibuat', errorMessage(err));
        return null;
      }
    },
    [websiteId],
  );

  return { status, error, lookups, item, allSlugs, gatheringOptionsBlocked, assetLinksBlocked, reload, addCategory };
}
