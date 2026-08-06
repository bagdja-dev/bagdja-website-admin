'use client';

import { useEffect, useState } from 'react';

import { AppModal } from './app-modal';
import { GalleryEditor } from './gallery-editor';
import { FormInput } from './form-field';
import { apiClient, ApiError } from '../lib/api-client';
import type { WebsiteCategory } from '../lib/types';
import type { GalleryImage } from '../lib/section-types';

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
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLabel(category?.label ?? initialLabel ?? '');
      setImages(toGalleryImages(category?.images ?? []));
      setError('');
    }
  }, [isOpen, category, initialLabel]);

  async function handleSave() {
    if (!label.trim()) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        label: label.trim(),
        images: images.map((img) => img.url).filter(Boolean),
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
