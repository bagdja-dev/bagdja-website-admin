'use client';

import { useEffect, useState } from 'react';

import { AppModal } from './app-modal';
import { GalleryEditor } from './gallery-editor';
import { FormInput, FormTextarea } from './form-field';
import { apiClient, ApiError } from '../lib/api-client';
import type { WebsiteCategory } from '../lib/types';
import type { GalleryImage } from '../lib/section-types';

function formatCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '0';
  const numeric = Number(digits);
  if (Number.isNaN(numeric)) return '0';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(numeric);
}

function parseCurrencyInput(value: string): number {
  const normalized = value.replace(/\./g, '').replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toGalleryImages(urls: string[]): GalleryImage[] {
  return urls.map((url) => ({ url, alt: '', caption: '' }));
}

interface QuickAddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  websiteId: string;
  /** Diisi kalau mode edit kategori yang sudah ada — kalau kosong, mode tambah baru. */
  category?: WebsiteCategory | null;
  /** Prefill nama saat mode tambah baru (dipicu dari `CategorySelect`). */
  initialLabel?: string;
  onSaved: (category: WebsiteCategory) => void;
}

/**
 * Modal select-or-create/edit kategori — dipicu dari `CategorySelect` (mode
 * tambah, prefill dari query yang diketik) maupun `ManageCategoriesModal`
 * (mode tambah baru atau edit kategori yang sudah ada).
 */
export function QuickAddCategoryModal({
  isOpen,
  onClose,
  websiteId,
  category,
  initialLabel,
  onSaved,
}: QuickAddCategoryModalProps) {
  const isEdit = Boolean(category);
  const [label, setLabel] = useState(initialLabel ?? '');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [specificationsRows, setSpecificationsRows] = useState<{ key: string; value: string }[]>([
    { key: '', value: '' },
  ]);
  const [estimationRows, setEstimationRows] = useState<{ label: string; price: string }[]>([
    { label: '', price: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLabel(category?.label ?? initialLabel ?? '');
      setDescription(category?.description ?? '');
      setImages(toGalleryImages(category?.images ?? []));
      setSpecificationsRows(
        Object.entries(category?.specifications ?? {}).length > 0
          ? Object.entries(category?.specifications ?? {}).map(([key, value]) => ({ key, value: String(value) }))
          : [{ key: '', value: '' }],
      );
      setEstimationRows(
        (category?.estimation ?? []).length > 0
          ? (category?.estimation ?? []).map((entry) => ({ label: entry.label, price: String(entry.price ?? '') }))
          : [{ label: '', price: '' }],
      );
      setError('');
    }
  }, [isOpen, category, initialLabel]);

  async function handleSave() {
    if (!label.trim()) return;
    setSaving(true);
    setError('');
    try {
      const specifications = Object.fromEntries(
        specificationsRows.filter((row) => row.key.trim() && row.value.trim()).map((row) => [row.key.trim(), row.value.trim()]),
      );
      const estimation = estimationRows
        .filter((row) => row.label.trim() && row.price.trim())
        .map((row) => ({ label: row.label.trim(), price: parseCurrencyInput(row.price) }));

      if (estimation.some((row) => Number.isNaN(row.price) || row.price < 0)) {
        throw new Error('Estimasi harga mengandung nilai tidak valid. Pastikan semua harga angka non-negatif.');
      }

      const body = {
        label: label.trim(),
        description: description.trim() || undefined,
        images: images.map((img) => img.url).filter(Boolean),
        specifications,
        estimation,
      };
      const saved = isEdit
        ? await apiClient<WebsiteCategory>(`/api/websites/${websiteId}/categories/${category!.id}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
          })
        : await apiClient<WebsiteCategory>(`/api/websites/${websiteId}/categories`, {
            method: 'POST',
            body: JSON.stringify(body),
          });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyimpan kategori');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Kategori' : 'Tambah Kategori Baru'}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-default-600 transition-colors hover:bg-default-100"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={saving || !label.trim()}
            onClick={handleSave}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormInput label="Nama Kategori" value={label} onChange={setLabel} placeholder="mis. Atasan" required autoFocus />
        <FormTextarea
          label="Deskripsi Kategori"
          value={description}
          onChange={setDescription}
          placeholder="Masukkan ringkasan/tentang kategori ini..."
          rows={4}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-medium text-foreground">Spesifikasi</label>
            <button
              type="button"
              onClick={() => setSpecificationsRows((prev) => [...prev, { key: '', value: '' }])}
              className="rounded-lg border border-primary/40 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary-50"
            >
              + Tambah
            </button>
          </div>
          <div className="space-y-2">
            {specificationsRows.map((row, index) => (
              <div key={`spec-${index}`} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1.5fr_40px]">
                <input
                  value={row.key}
                  onChange={(e) =>
                    setSpecificationsRows((prev) => prev.map((item, idx) => (idx === index ? { ...item, key: e.target.value } : item)))
                  }
                  placeholder="Judul (mis. Bahan)"
                  className="w-full rounded-xl border border-default-300 bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-default-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  value={row.value}
                  onChange={(e) =>
                    setSpecificationsRows((prev) => prev.map((item, idx) => (idx === index ? { ...item, value: e.target.value } : item)))
                  }
                  placeholder="Nilai (mis. Baja ringan)"
                  className="w-full rounded-xl border border-default-300 bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-default-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setSpecificationsRows((prev) => prev.filter((_, idx) => idx !== index))}
                  className="rounded-xl border border-danger-200 bg-danger-50 px-2 py-2 text-danger hover:bg-danger-100"
                  aria-label="Hapus spesifikasi"
                  title="Hapus"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-medium text-foreground">Estimasi Harga</label>
            <button
              type="button"
              onClick={() => setEstimationRows((prev) => [...prev, { label: '', price: '' }])}
              className="rounded-lg border border-primary/40 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary-50"
            >
              + Tambah
            </button>
          </div>
          <div className="space-y-2">
            {estimationRows.map((row, index) => (
              <div key={`est-${index}`} className="grid grid-cols-1 gap-2 md:grid-cols-[1.1fr_1fr_40px]">
                <input
                  value={row.label}
                  onChange={(e) =>
                    setEstimationRows((prev) => prev.map((item, idx) => (idx === index ? { ...item, label: e.target.value } : item)))
                  }
                  placeholder="Label estimasi (mis. 1-3 hari)"
                  className="w-full rounded-xl border border-default-300 bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-default-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  value={formatCurrencyInput(row.price)}
                  onChange={(e) =>
                    setEstimationRows((prev) => prev.map((item, idx) => (idx === index ? { ...item, price: formatCurrencyInput(e.target.value) } : item)))
                  }
                  placeholder="0"
                  className="w-full rounded-xl border border-default-300 bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-default-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setEstimationRows((prev) => prev.filter((_, idx) => idx !== index))}
                  className="rounded-xl border border-danger-200 bg-danger-50 px-2 py-2 text-danger hover:bg-danger-100"
                  aria-label="Hapus estimasi"
                  title="Hapus"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <GalleryEditor
          label="Foto Kategori (opsional)"
          description="Ditampilkan sebagai cover kategori — kalau kosong, tampilan kategori akan pakai foto produk pertama."
          value={images}
          onChange={setImages}
          websiteId={websiteId}
          uploadFolder="categories"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </AppModal>
  );
}
