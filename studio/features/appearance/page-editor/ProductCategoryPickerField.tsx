'use client';

import { useEffect, useMemo, useState } from 'react';

import { Select, SelectItem } from '@heroui/react';

import { type CatalogCategoryOption, fetchCategoryOptions } from '@/studio/api/catalog-lookups';

/** Nilai field: array id kategori (string[]). Kosong = semua kategori. */
function toIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  return typeof value === 'string' && value ? [value] : [];
}

/**
 * Pilih beberapa kategori produk untuk section daftar produk (`productCategoryPicker`).
 * Tidak ada yang dipilih = semua kategori tampil.
 */
export function ProductCategoryPickerField({
  value,
  websiteId,
  label,
  onChange,
}: {
  value: unknown;
  websiteId: string;
  label: string;
  onChange: (value: string[]) => void;
}) {
  const [categories, setCategories] = useState<CatalogCategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const selected = toIds(value);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCategoryOptions(websiteId)
      .then((items) => {
        if (cancelled) return;
        setCategories([...items].sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label, 'id')));
      })
      .catch(() => {
        if (!cancelled) setError('Kategori produk gagal dimuat.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [retry, websiteId]);

  // Kategori terpilih yang sudah dihapus tetap tampil (agar bisa dilepas), ditandai.
  const options = useMemo(() => {
    const known = new Set(categories.map((category) => category.id));
    return [
      ...categories.map((category) => ({
        key: category.id,
        label: category.is_active ? category.label : `${category.label} (nonaktif)`,
      })),
      ...selected.filter((id) => !known.has(id)).map((id) => ({ key: id, label: 'Kategori dihapus' })),
    ];
  }, [categories, selected]);

  return (
    <div className="flex flex-col gap-1.5">
      <Select
        aria-label={label}
        selectionMode="multiple"
        selectedKeys={new Set(selected)}
        onSelectionChange={(keys) => {
          // Urutan mengikuti daftar kategori agar konten section stabil.
          const picked = new Set(Array.from(keys, String));
          onChange(options.map((option) => option.key).filter((id) => picked.has(id)));
        }}
        isDisabled={loading || Boolean(error)}
        isLoading={loading}
        placeholder="Semua kategori"
        renderValue={(items) =>
          items.length === 0 ? 'Semua kategori' : items.map((item) => item.textValue).join(', ')
        }
      >
        {options.map((option) => (
          <SelectItem key={option.key} textValue={option.label}>
            {option.label}
          </SelectItem>
        ))}
      </Select>
      {error ? (
        <div className="flex items-center justify-between gap-2">
          <p role="alert" className="text-[11px] text-danger">{error}</p>
          <button
            type="button"
            className="text-[11px] font-medium text-primary hover:underline"
            onClick={() => setRetry((current) => current + 1)}
          >
            Coba lagi
          </button>
        </div>
      ) : selected.length > 0 ? (
        <button
          type="button"
          className="self-start text-[11px] font-medium text-primary hover:underline"
          onClick={() => onChange([])}
        >
          Tampilkan semua kategori
        </button>
      ) : categories.length === 0 && !loading ? (
        <p className="text-[11px] text-default-500">Belum ada kategori. Tambahkan lewat menu Produk dan Jasa → Kategori.</p>
      ) : null}
    </div>
  );
}
