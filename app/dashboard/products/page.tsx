'use client';

import { Button, Card, CardBody, Chip } from '@heroui/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { desktopAddButtonClass, MobileFloatingActionBar, mobileFabPagePadding } from '../../components/mobile-floating-action';
import { AppModal } from '../../components/app-modal';
import { useConfirmDialog } from '../../components/confirm-dialog';
import { GalleryEditor } from '../../components/gallery-editor';
import { RichTextEditor } from '../../components/rich-text-editor';
import { FormInput, FormSelect, FormSwitch, FormTextarea } from '../../components/form-field';
import { LoadingSpinner } from '../../components/loading-spinner';
import { NoWebsiteState } from '../../components/no-website-state';
import { apiClient, slugify } from '../../lib/api-client';
import {
  hasMinRole,
  PRODUCT_TYPE_LABELS,
  type ProductType,
  type WebsiteProduct,
} from '../../lib/types';
import { useWebsiteContext } from '../../context/website-context';
import type { GalleryImage } from '../../lib/section-types';

const TYPE_TABS = [
  { key: 'all', label: 'Semua' },
  { key: 'product', label: 'Produk' },
  { key: 'service', label: 'Layanan' },
  { key: 'package', label: 'Paket' },
  { key: 'digital', label: 'Digital' },
] as const;

const TYPE_OPTIONS = Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const TYPE_THEME: Record<
  string,
  { gradient: string; glow: string; icon: string; ring: string; chipColor: 'primary' | 'secondary' | 'warning' | 'success' }
> = {
  product: {
    gradient: 'from-cyan-500 to-sky-600',
    glow: 'bg-cyan-300/25',
    icon: '🛍️',
    ring: 'ring-cyan-100',
    chipColor: 'primary',
  },
  service: {
    gradient: 'from-indigo-500 to-violet-600',
    glow: 'bg-violet-300/25',
    icon: '✂️',
    ring: 'ring-violet-100',
    chipColor: 'secondary',
  },
  package: {
    gradient: 'from-amber-500 to-orange-600',
    glow: 'bg-orange-300/25',
    icon: '📦',
    ring: 'ring-orange-100',
    chipColor: 'warning',
  },
  digital: {
    gradient: 'from-fuchsia-500 to-purple-600',
    glow: 'bg-fuchsia-300/25',
    icon: '💾',
    ring: 'ring-fuchsia-100',
    chipColor: 'success',
  },
};

function getTypeTheme(type: string) {
  return TYPE_THEME[type] ?? TYPE_THEME.product;
}

function buildMetadata(
  type: string,
  sku: string,
  stock: string,
  durationMinutes: string,
  isBookable: boolean,
  downloadUrl: string,
  itemsIncluded: string,
): Record<string, unknown> {
  if (type === 'service') {
    const meta: Record<string, unknown> = {};
    const dur = parseInt(durationMinutes, 10);
    if (!Number.isNaN(dur) && dur > 0) meta.duration_minutes = dur;
    meta.is_bookable = isBookable;
    return meta;
  }
  if (type === 'product') {
    const meta: Record<string, unknown> = {};
    if (sku.trim()) meta.sku = sku.trim();
    const st = parseInt(stock, 10);
    if (!Number.isNaN(st)) meta.stock = st;
    return meta;
  }
  if (type === 'digital') {
    return downloadUrl.trim() ? { download_url: downloadUrl.trim() } : {};
  }
  if (type === 'package') {
    return itemsIncluded.trim() ? { items_included: itemsIncluded.trim() } : {};
  }
  return {};
}

function loadMetadataFields(product: WebsiteProduct | null) {
  const meta = product?.metadata ?? {};
  return {
    sku: typeof meta.sku === 'string' ? meta.sku : '',
    stock: meta.stock != null ? String(meta.stock) : '',
    durationMinutes: meta.duration_minutes != null ? String(meta.duration_minutes) : '',
    isBookable: meta.is_bookable === true,
    downloadUrl: typeof meta.download_url === 'string' ? meta.download_url : '',
    itemsIncluded: typeof meta.items_included === 'string' ? meta.items_included : '',
  };
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n);
}

function getMetaHint(product: WebsiteProduct): string | null {
  const meta = product.metadata ?? {};
  if (product.type === 'service') {
    const parts: string[] = [];
    if (meta.duration_minutes) parts.push(`${meta.duration_minutes} menit`);
    if (meta.is_bookable) parts.push('Bookable');
    return parts.length ? parts.join(' · ') : null;
  }
  if (product.type === 'product') {
    const parts: string[] = [];
    if (meta.sku) parts.push(`SKU: ${meta.sku}`);
    if (meta.stock != null) parts.push(`Stok: ${meta.stock}`);
    return parts.length ? parts.join(' · ') : null;
  }
  if (product.type === 'digital' && meta.download_url) return 'Download tersedia';
  if (product.type === 'package' && meta.items_included) return 'Paket bundling';
  return null;
}

interface ProductCardProps {
  product: WebsiteProduct;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (product: WebsiteProduct) => void;
  onDelete: (productId: string) => void;
}

function ProductCard({ product, canEdit, canDelete, onEdit, onDelete }: ProductCardProps) {
  const theme = getTypeTheme(product.type);
  const initial = product.name.trim().charAt(0).toUpperCase() || '?';
  const metaHint = getMetaHint(product);
  const photos = product.images ?? [];

  return (
    <Card className="group overflow-hidden border-0 shadow-md ring-1 ring-default-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className={`relative bg-gradient-to-br ${theme.gradient} px-4 pb-10 pt-4 sm:px-5 sm:pt-5`}>
        <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full ${theme.glow} blur-2xl`} />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-lg font-bold text-white shadow-lg ring-2 ring-white/30 backdrop-blur-sm">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <Chip
                  size="sm"
                  variant="flat"
                  color={theme.chipColor}
                  className="border border-white/25 bg-white/15 backdrop-blur-sm"
                  classNames={{ content: 'font-semibold text-white text-[10px] uppercase tracking-wide' }}
                >
                  {PRODUCT_TYPE_LABELS[product.type] ?? product.type}
                </Chip>
                <Chip
                  size="sm"
                  variant="flat"
                  className={`border backdrop-blur-sm ${product.is_active ? 'border-emerald-300/40 bg-emerald-500/20' : 'border-white/20 bg-white/10'}`}
                  classNames={{ content: `font-semibold text-[10px] ${product.is_active ? 'text-emerald-100' : 'text-white/70'}` }}
                >
                  {product.is_active ? '● Aktif' : '○ Nonaktif'}
                </Chip>
              </div>
              <h3 className="line-clamp-2 text-base font-bold leading-snug text-white sm:text-lg">
                {product.name}
              </h3>
            </div>
          </div>
          <div className="hidden shrink-0 rounded-xl bg-white/15 p-2 text-xl backdrop-blur-sm sm:block">
            {theme.icon}
          </div>
        </div>
      </div>

      <CardBody className="relative -mt-5 space-y-3 rounded-t-2xl bg-white px-4 pb-4 pt-4 sm:px-5">
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xl font-bold tracking-tight text-foreground">{formatPrice(product.price)}</p>
            {product.category && (
              <Chip size="sm" variant="flat" className="shrink-0 bg-default-100 text-default-600">
                {product.category}
              </Chip>
            )}
          </div>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-sm text-default-500">{product.description}</p>
          )}
        </div>

        {photos.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {photos.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg ring-1 ${theme.ring} sm:h-[4.5rem] sm:w-[4.5rem]`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                {index === 0 && (
                  <span className="absolute bottom-0 left-0 right-0 bg-black/50 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-white">
                    Cover
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-default-200 bg-default-50/80">
            <span className="text-xs text-default-400">Belum ada foto</span>
          </div>
        )}

        {metaHint && (
          <span
            className={`inline-flex items-center rounded-lg bg-default-100 px-2.5 py-1 text-xs font-medium text-default-600 ring-1 ${theme.ring}`}
          >
            {metaHint}
          </span>
        )}

        {(canEdit || canDelete) && (
          <div className="flex gap-2 border-t border-default-100 pt-3">
            {canEdit && (
              <Button size="sm" color="primary" variant="flat" className="flex-1 font-medium" onPress={() => onEdit(product)}>
                Edit
              </Button>
            )}
            {canDelete && (
              <Button size="sm" color="danger" variant="light" className="flex-1" onPress={() => onDelete(product.id)}>
                Hapus
              </Button>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default function ProductsManagement() {
  const { websiteId, role, loading: ctxLoading } = useWebsiteContext();
  const { confirm, dialog } = useConfirmDialog();
  const [products, setProducts] = useState<WebsiteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<WebsiteProduct | null>(null);
  const [type, setType] = useState<ProductType>('product');
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [detail, setDetail] = useState('');
  const [price, setPrice] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sku, setSku] = useState('');
  const [stock, setStock] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [isBookable, setIsBookable] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [itemsIncluded, setItemsIncluded] = useState('');
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canEdit = role ? hasMinRole(role, 'editor') : false;
  const canDelete = role ? hasMinRole(role, 'admin') : false;

  const load = useCallback(async () => {
    if (!websiteId) return;
    setLoading(true);
    try {
      const query = typeFilter !== 'all' ? `?type=${typeFilter}` : '';
      const data = await apiClient<WebsiteProduct[]>(
        `/api/websites/${websiteId}/products${query}`,
      );
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [websiteId, typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const active = products.filter((p) => p.is_active).length;
    return { total: products.length, active };
  }, [products]);

  const categorySuggestions = useMemo(() => {
    const set = new Set(
      products
        .filter((p) => p.type === type)
        .map((p) => p.category?.trim())
        .filter((c): c is string => !!c),
    );
    return Array.from(set).sort();
  }, [products, type]);

  const resetMetadata = () => {
    setSku('');
    setStock('');
    setDurationMinutes('');
    setIsBookable(false);
    setDownloadUrl('');
    setItemsIncluded('');
    setImages([]);
  };

  const openCreate = () => {
    setEditProduct(null);
    setType(typeFilter !== 'all' ? (typeFilter as ProductType) : 'product');
    setCategory('');
    setName('');
    setSlug('');
    setDescription('');
    setDetail('');
    setPrice('0');
    setIsActive(true);
    resetMetadata();
    setError('');
    setModalOpen(true);
  };

  const openEdit = (product: WebsiteProduct) => {
    const fields = loadMetadataFields(product);
    setEditProduct(product);
    setType((product.type as ProductType) || 'product');
    setCategory(product.category ?? '');
    setName(product.name);
    setSlug(product.slug);
    setDescription(product.description ?? '');
    setDetail(product.detail ?? '');
    setPrice(String(product.price));
    setIsActive(product.is_active);
    setSku(fields.sku);
    setStock(fields.stock);
    setDurationMinutes(fields.durationMinutes);
    setIsBookable(fields.isBookable);
    setDownloadUrl(fields.downloadUrl);
    setItemsIncluded(fields.itemsIncluded);
    setImages((product.images ?? []).map((url) => ({ url, alt: '', caption: '' })));
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!websiteId || !name.trim() || !slug.trim()) {
      setError('Nama dan slug wajib diisi');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        type,
        category: category.trim() || undefined,
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        detail: detail.trim() || undefined,
        price: parseFloat(price) || 0,
        images: images.map((img) => img.url).filter(Boolean),
        metadata: buildMetadata(type, sku, stock, durationMinutes, isBookable, downloadUrl, itemsIncluded),
        is_active: isActive,
      };
      if (editProduct) {
        await apiClient(`/api/websites/${websiteId}/products/${editProduct.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await apiClient(`/api/websites/${websiteId}/products`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!websiteId) return;
    const ok = await confirm({ title: 'Hapus Item Ini?', message: 'Item yang dihapus tidak bisa dikembalikan.' });
    if (!ok) return;
    try {
      await apiClient(`/api/websites/${websiteId}/products/${productId}`, { method: 'DELETE' });
      await load();
    } catch {
      alert('Gagal menghapus');
    }
  };

  if (ctxLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;

  return (
    <div className={`space-y-6 ${canEdit ? mobileFabPagePadding : ''}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Produk & Layanan</h1>
          <p className="mt-1 text-default-500">Kelola katalog produk, layanan, paket, dan item digital.</p>
        </div>
        {canEdit && (
          <Button color="primary" onPress={openCreate} className={desktopAddButtonClass}>
            + Item Baru
          </Button>
        )}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        {TYPE_TABS.map((tab) => {
          const active = typeFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTypeFilter(tab.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                active
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25'
                  : 'bg-white text-default-600 ring-1 ring-default-200 hover:bg-default-50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {!loading && products.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Chip variant="flat" color="primary" className="font-medium">
            {stats.total} item
          </Chip>
          <Chip variant="flat" color="success" className="font-medium">
            {stats.active} aktif
          </Chip>
        </div>
      )}

      {loading ? (
        <LoadingSpinner className="h-48" />
      ) : products.length === 0 ? (
        <Card className="overflow-hidden border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 text-3xl ring-4 ring-cyan-50">
              🛍️
            </div>
            <div>
              <p className="text-lg font-semibold">Belum ada item</p>
              <p className="mt-1 max-w-sm text-sm text-default-500">
                {typeFilter === 'all'
                  ? 'Tambahkan produk, layanan, paket, atau item digital pertama.'
                  : `Belum ada ${PRODUCT_TYPE_LABELS[typeFilter]?.toLowerCase() ?? 'item'} di katalog.`}
              </p>
            </div>
            {canEdit && (
              <Button color="primary" onPress={openCreate} className="hidden font-semibold sm:inline-flex">
                + Item Baru
              </Button>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AppModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editProduct ? 'Edit Item' : 'Item Baru'}
        size="xl"
        footer={
          <>
            <Button variant="light" onPress={() => setModalOpen(false)}>Batal</Button>
            <Button color="primary" isLoading={saving} onPress={handleSave}>Simpan</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <FormSelect label="Tipe" value={type} onChange={(v) => setType(v as ProductType)} options={TYPE_OPTIONS} />
          <FormInput
            label="Kategori"
            value={category}
            onChange={setCategory}
            list="product-category-suggestions"
            placeholder="mis. Pomade & Styling"
            description="Opsional — pengelompokan tambahan di dalam tipe ini."
          />
          <datalist id="product-category-suggestions">
            {categorySuggestions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <FormInput
            label="Nama"
            value={name}
            onChange={(v) => {
              setName(v);
              if (!editProduct) setSlug(slugify(v));
            }}
            required
          />
          <FormInput
            label="Slug"
            value={slug}
            onChange={setSlug}
            description="Dipakai di URL halaman detail produk."
            required
          />
          <FormTextarea
            label="Deskripsi Singkat"
            description="Ringkasan pendek yang tampil di katalog."
            value={description}
            onChange={setDescription}
          />
          <RichTextEditor
            label="Detail Produk"
            description="Konten lengkap yang tampil di halaman detail produk — bisa tabel, gambar, dsb."
            value={detail}
            onChange={setDetail}
            websiteId={websiteId ?? undefined}
            uploadFolder="products"
          />
          <FormInput
            label="Harga (IDR)"
            type="number"
            min={0}
            value={price}
            onChange={setPrice}
          />

          <GalleryEditor
            label="Foto Produk"
            description="PNG, JPG, WebP, GIF — maks. 5 MB. Foto pertama menjadi cover di katalog."
            value={images}
            onChange={setImages}
            websiteId={websiteId ?? undefined}
            uploadFolder="products"
          />

          {type === 'product' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput label="SKU" value={sku} onChange={setSku} />
              <FormInput label="Stok" type="number" min={0} value={stock} onChange={setStock} />
            </div>
          )}

          {type === 'service' && (
            <>
              <FormInput
                label="Durasi (menit)"
                type="number"
                min={0}
                value={durationMinutes}
                onChange={setDurationMinutes}
              />
              <FormSwitch label="Dapat dibooking" checked={isBookable} onChange={setIsBookable} />
            </>
          )}

          {type === 'digital' && (
            <FormInput label="URL Download" value={downloadUrl} onChange={setDownloadUrl} />
          )}

          {type === 'package' && (
            <FormTextarea
              label="Item yang termasuk"
              value={itemsIncluded}
              onChange={setItemsIncluded}
              rows={3}
            />
          )}

          <FormSwitch label="Aktif" checked={isActive} onChange={setIsActive} />
          {error && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
        </div>
      </AppModal>

      {canEdit && <MobileFloatingActionBar label="Item Baru" onClick={openCreate} />}
      {dialog}
    </div>
  );
}
