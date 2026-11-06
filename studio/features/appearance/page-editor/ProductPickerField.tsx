'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react';

import { fetchProducts, type WebsiteProduct } from '@/studio/api/products';

interface ProductPickerFieldProps {
  value: unknown;
  websiteId: string;
  multiple: boolean;
  maxItems?: number;
  onChange: (value: string[]) => void;
}

function selectedIdsFrom(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((id): id is string => typeof id === 'string');
  return typeof value === 'string' && value ? [value] : [];
}

function productImage(product: WebsiteProduct): string | undefined {
  return product.cover_image || product.images?.find(Boolean) || undefined;
}

function formatProductPrice(price?: number | null): string {
  if (price == null || !Number.isFinite(price)) return '';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(price);
}

export function ProductPickerField({
  value,
  websiteId,
  multiple,
  maxItems,
  onChange,
}: ProductPickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<WebsiteProduct[]>([]);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const selectedIds = selectedIdsFrom(value);
  const selectionLimit = multiple ? maxItems ?? Number.POSITIVE_INFINITY : 1;

  useEffect(() => {
    if (!isOpen || products.length > 0) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchProducts(websiteId)
      .then((result) => {
        if (!cancelled) setProducts(result);
      })
      .catch(() => {
        if (!cancelled) setError('Daftar produk gagal dimuat. Coba muat ulang.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, loadAttempt, products.length, websiteId]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id');
    return products
      .filter((product) => product.is_active)
      .filter((product) =>
        !normalizedQuery ||
        [product.name, product.slug, product.type].some((text) =>
          text.toLocaleLowerCase('id').includes(normalizedQuery),
        ),
      );
  }, [products, query]);

  const selectedProducts = selectedIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is WebsiteProduct => Boolean(product));

  const toggleProduct = (productId: string) => {
    setDraftIds((current) => {
      if (current.includes(productId)) return current.filter((id) => id !== productId);
      if (!multiple) return [productId];
      if (current.length >= selectionLimit) return current;
      return [...current, productId];
    });
  };

  const applySelection = () => {
    onChange(draftIds.slice(0, selectionLimit));
    setIsOpen(false);
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="bordered"
          radius="sm"
          className="justify-start"
          onPress={() => {
            setDraftIds(selectedIds);
            setQuery('');
            setIsOpen(true);
          }}
        >
          {selectedIds.length > 0
            ? `Ubah pilihan (${selectedIds.length} produk)`
            : 'Pilih produk'}
        </Button>
        {selectedIds.length > 0 && (
          <div className="flex flex-col gap-1.5" aria-live="polite">
            {selectedProducts.length > 0 ? (
              selectedProducts.map((product) => (
                <div key={product.id} className="flex min-w-0 items-center gap-2 rounded-lg border border-default-200 p-2">
                  {productImage(product) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={productImage(product)} alt="" className="h-10 w-12 shrink-0 rounded-md object-cover" />
                  ) : (
                    <span className="flex h-10 w-12 shrink-0 items-center justify-center rounded-md bg-default-100 text-lg" aria-hidden="true">
                      🛍️
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-default-700">{product.name}</span>
                    <span className="block truncate text-[10px] capitalize text-default-500">
                      {product.type}{product.price != null ? ` · ${formatProductPrice(product.price)}` : ''}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onChange(selectedIds.filter((id) => id !== product.id))}
                    className="shrink-0 rounded-md px-2 py-1 text-[11px] text-danger hover:bg-danger-50"
                    aria-label={`Hapus ${product.name} dari pilihan`}
                  >
                    Hapus
                  </button>
                </div>
              ))
            ) : (
              <span className="text-xs text-default-500">{selectedIds.length} produk dipilih</span>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) setIsOpen(false);
        }}
        placement="center"
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="text-base font-semibold">Pilih produk</ModalHeader>
          <ModalBody className="gap-3">
            <Input
              aria-label="Cari produk"
              placeholder="Cari nama, slug, atau jenis produk..."
              value={query}
              onValueChange={setQuery}
              autoFocus
            />
            {loading ? (
              <p className="py-8 text-center text-sm text-default-500">Memuat produk…</p>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-danger">{error}</p>
                <Button variant="bordered" size="sm" onPress={() => setLoadAttempt((attempt) => attempt + 1)}>
                  Coba lagi
                </Button>
              </div>
            ) : products.filter((product) => product.is_active).length === 0 ? (
              <p className="py-8 text-center text-sm text-default-500">
                Belum ada produk aktif. Tambahkan atau aktifkan produk terlebih dahulu di menu Produk &amp; Layanan.
              </p>
            ) : filteredProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-default-500">Tidak ada produk yang cocok dengan pencarian.</p>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-default-200">
                {filteredProducts.map((product) => {
                  const selected = draftIds.includes(product.id);
                  const atLimit = !selected && draftIds.length >= selectionLimit;
                  return (
                    <label
                      key={product.id}
                      className={`flex items-start gap-3 border-b border-default-100 px-3 py-3 last:border-b-0 ${
                        atLimit ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-default-50'
                      }`}
                    >
                      <input
                        type={multiple ? 'checkbox' : 'radio'}
                        name="featured-product-selection"
                        checked={selected}
                        disabled={atLimit}
                        onChange={() => toggleProduct(product.id)}
                        className="mt-1 h-4 w-4 shrink-0 accent-[var(--studio-primary)]"
                      />
                      {productImage(product) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={productImage(product)} alt="" className="h-12 w-16 shrink-0 rounded-md object-cover" />
                      ) : (
                        <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-default-100 text-lg" aria-hidden="true">
                          🛍️
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{product.name}</span>
                        <span className="mt-0.5 block truncate text-xs capitalize text-default-500">
                          {product.type} · /{product.slug}
                        </span>
                        {product.price != null && (
                          <span className="mt-1 block text-xs font-medium text-default-700">
                            {formatProductPrice(product.price)}
                          </span>
                        )}
                      </span>
                      {selected && (
                        <span className="shrink-0 rounded bg-success-50 px-1.5 py-0.5 text-[10px] font-medium text-success-700">
                          Terpilih
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
            {multiple && !loading && !error && products.some((product) => product.is_active) && (
              <p className="text-xs text-default-500">
                {draftIds.length} produk dipilih{Number.isFinite(selectionLimit) ? ` dari maksimal ${selectionLimit}` : ''}
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setIsOpen(false)}>Batal</Button>
            <Button color="primary" onPress={applySelection} isDisabled={loading || Boolean(error)}>
              Gunakan pilihan
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
