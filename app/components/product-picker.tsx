'use client';

import { useEffect, useState } from 'react';

import { apiClient } from '../lib/api-client';
import type { WebsiteProduct } from '../lib/types';

interface ProductPickerProps {
  label: string;
  description?: string;
  value: string[];
  onChange: (ids: string[]) => void;
  websiteId?: string;
  disabled?: boolean;
  /** true = radio (maks. 1 dipilih), false = checkbox (multi). Default true. */
  single?: boolean;
}

export function ProductPicker({
  label,
  description,
  value,
  onChange,
  websiteId,
  disabled = false,
  single = true,
}: ProductPickerProps) {
  const [products, setProducts] = useState<WebsiteProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!websiteId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await apiClient<WebsiteProduct[]>(`/api/websites/${websiteId}/products`);
        if (!cancelled) setProducts(data);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [websiteId]);

  const toggle = (id: string) => {
    if (disabled) return;
    if (single) {
      onChange(value.includes(id) ? [] : [id]);
      return;
    }
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>

      <div className="max-h-64 overflow-y-auto rounded-xl border border-default-300 bg-white">
        {loading ? (
          <p className="p-4 text-sm text-default-400">Memuat produk…</p>
        ) : products.length === 0 ? (
          <p className="p-4 text-sm text-default-400">Belum ada produk/layanan — buat dulu di menu Produk & Layanan.</p>
        ) : (
          products.map((product) => (
            <label
              key={product.id}
              className="flex cursor-pointer items-center gap-3 border-b border-default-100 px-3 py-2 last:border-b-0 hover:bg-default-50"
            >
              <input
                type={single ? 'radio' : 'checkbox'}
                name={single ? 'product-picker' : undefined}
                checked={value.includes(product.id)}
                onChange={() => toggle(product.id)}
                disabled={disabled}
                className="h-4 w-4 shrink-0 border-default-300"
              />
              {product.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0]} alt="" className="h-8 w-12 shrink-0 rounded object-cover" />
              ) : (
                <span className="flex h-8 w-12 shrink-0 items-center justify-center rounded bg-default-100 text-xs">
                  🛍️
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{product.name}</span>
              {!product.is_active && (
                <span className="shrink-0 rounded bg-default-100 px-1.5 py-0.5 text-[10px] font-medium text-default-500">
                  Nonaktif
                </span>
              )}
            </label>
          ))
        )}
      </div>

      {description && <p className="text-xs text-default-500">{description}</p>}
      {value.length > 0 && !single && <p className="text-xs text-default-400">{value.length} produk dipilih</p>}
    </div>
  );
}
