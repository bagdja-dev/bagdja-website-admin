'use client';

import { useCallback, useEffect, useState } from 'react';

import { AppModal } from './app-modal';
import { useConfirmDialog } from './confirm-dialog';
import { QuickAddCategoryModal } from './quick-add-category-modal';
import { apiClient, ApiError } from '../lib/api-client';
import type { WebsiteCategory } from '../lib/types';

function ChevronUpIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function EyeSlashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.166m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  );
}

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  websiteId: string;
  /** Dipanggil setiap kali daftar kategori berubah (tambah/edit/hapus/urutkan) — parent bisa refresh label kategori di list produk. */
  onChanged?: () => void;
}

export function ManageCategoriesModal({ isOpen, onClose, websiteId, onChanged }: ManageCategoriesModalProps) {
  const { confirm, dialog } = useConfirmDialog();
  const [categories, setCategories] = useState<WebsiteCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WebsiteCategory | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient<WebsiteCategory[]>(`/api/websites/${websiteId}/categories`);
      setCategories(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat kategori');
    } finally {
      setLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen, load]);

  function notifyChanged() {
    onChanged?.();
  }

  async function toggleActive(category: WebsiteCategory) {
    setBusyId(category.id);
    try {
      const updated = await apiClient<WebsiteCategory>(`/api/websites/${websiteId}/categories/${category.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !category.is_active }),
      });
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      notifyChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengubah status kategori');
    } finally {
      setBusyId(null);
    }
  }

  async function move(index: number, direction: 'up' | 'down') {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= categories.length) return;

    const a = categories[index];
    const b = categories[swapIndex];
    setBusyId(a.id);
    try {
      const [updatedA, updatedB] = await Promise.all([
        apiClient<WebsiteCategory>(`/api/websites/${websiteId}/categories/${a.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ sort_order: b.sort_order }),
        }),
        apiClient<WebsiteCategory>(`/api/websites/${websiteId}/categories/${b.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ sort_order: a.sort_order }),
        }),
      ]);
      const next = [...categories];
      next[index] = updatedB;
      next[swapIndex] = updatedA;
      setCategories(next);
      notifyChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengubah urutan');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(category: WebsiteCategory) {
    const ok = await confirm({
      title: `Hapus kategori "${category.label}"?`,
      message: 'Produk yang memakai kategori ini akan jadi tanpa kategori (tidak ikut terhapus).',
    });
    if (!ok) return;

    setBusyId(category.id);
    try {
      await apiClient(`/api/websites/${websiteId}/categories/${category.id}`, { method: 'DELETE' });
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      notifyChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menghapus kategori');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <AppModal isOpen={isOpen} onClose={onClose} title="Kelola Kategori" size="lg">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-default-500">Kategori produk & layanan untuk website ini.</p>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="shrink-0 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              + Tambah
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">{error}</div>
          )}

          {loading ? (
            <div className="py-10 text-center text-sm text-default-400">Memuat...</div>
          ) : categories.length === 0 ? (
            <div className="py-10 text-center text-sm text-default-400">Belum ada kategori.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {categories.map((category, index) => (
                <div
                  key={category.id}
                  className="flex items-center gap-3 rounded-xl border border-default-200 bg-white p-3"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-default-100">
                    {category.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={category.images[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-default-300">🗂️</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-medium ${category.is_active ? 'text-foreground' : 'text-default-400'}`}>
                      {category.label}
                      {!category.is_active && <span className="ml-2 text-xs font-normal text-default-400">(nonaktif)</span>}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      disabled={index === 0 || busyId === category.id}
                      onClick={() => move(index, 'up')}
                      className="rounded-lg p-2 text-default-400 hover:bg-default-100 hover:text-primary disabled:opacity-30"
                      aria-label="Naik"
                      title="Naik"
                    >
                      <ChevronUpIcon />
                    </button>
                    <button
                      type="button"
                      disabled={index === categories.length - 1 || busyId === category.id}
                      onClick={() => move(index, 'down')}
                      className="rounded-lg p-2 text-default-400 hover:bg-default-100 hover:text-primary disabled:opacity-30"
                      aria-label="Turun"
                      title="Turun"
                    >
                      <ChevronDownIcon />
                    </button>
                    <button
                      type="button"
                      disabled={busyId === category.id}
                      onClick={() => toggleActive(category)}
                      className="rounded-lg p-2 text-default-500 hover:bg-default-100 disabled:opacity-50"
                      aria-label={category.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      title={category.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {category.is_active ? <EyeIcon /> : <EyeSlashIcon />}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === category.id}
                      onClick={() => setEditTarget(category)}
                      className="rounded-lg p-2 text-primary hover:bg-primary-50 disabled:opacity-50"
                      aria-label="Edit"
                      title="Edit"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      disabled={busyId === category.id}
                      onClick={() => handleDelete(category)}
                      className="rounded-lg p-2 text-danger hover:bg-danger-50 disabled:opacity-50"
                      aria-label="Hapus"
                      title="Hapus"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppModal>

      <QuickAddCategoryModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        websiteId={websiteId}
        onSaved={(category) => {
          setCategories((prev) => [...prev, category]);
          setAddOpen(false);
          notifyChanged();
        }}
      />

      <QuickAddCategoryModal
        isOpen={editTarget !== null}
        onClose={() => setEditTarget(null)}
        websiteId={websiteId}
        category={editTarget}
        onSaved={(category) => {
          setCategories((prev) => prev.map((c) => (c.id === category.id ? category : c)));
          setEditTarget(null);
          notifyChanged();
        }}
      />

      {dialog}
    </>
  );
}
