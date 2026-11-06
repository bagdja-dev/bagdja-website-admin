'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { editorHref } from '@/studio/features/catalog/catalog-types';
import { moneyDisplay, moneyValue } from '@/studio/features/catalog/money';
import { Icon } from '@/studio/ui/icons';
import { StatusSwitch } from '@/studio/ui/primitives/StatusSwitch';
import { notify } from '@/studio/ui/primitives/Toast';

import type { SectionProps } from '../editor-context';
import { ADD_BTN, HINT, ICON_BTN, IntField, MoneyField, Notice, TextField } from '../fields';
import { emptyVariant, type VariantDraft } from '../form-state';

function QuickAddVariantDialog({
  axis,
  variants,
  onClose,
  onSave,
}: {
  axis: string;
  variants: VariantDraft[];
  onClose: () => void;
  onSave: (variant: VariantDraft) => void;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const closeButton = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const save = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      notify.error('Isi nama varian terlebih dahulu.');
      return;
    }
    if (moneyValue(price) === null) {
      notify.error('Isi harga varian terlebih dahulu.');
      return;
    }
    if (variants.some((variant) => variant.name.trim().toLocaleLowerCase() === trimmedName.toLocaleLowerCase())) {
      notify.error('Nama varian tidak boleh kembar.');
      return;
    }
    onSave({ ...emptyVariant(), name: trimmedName, price });
    onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tambah varian"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-default-200 bg-white shadow-2xl">
        <header className="flex items-center gap-3 border-b border-default-200 px-4 py-3.5 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-foreground">Tambah {axis.toLocaleLowerCase() || 'varian'}</h2>
            <p className={HINT}>Isi nama dan harga. Detail lain bisa dilengkapi nanti.</p>
          </div>
          <button ref={closeButton} type="button" className={ICON_BTN} aria-label="Tutup tambah varian" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          <TextField
            label={`Nama ${axis.toLocaleLowerCase() || 'varian'}`}
            placeholder={axis.toLocaleLowerCase() === 'ukuran' ? 'Contoh: L' : 'Contoh: Varian 1'}
            value={name}
            onChange={setName}
            maxLength={255}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                save();
              }
            }}
          />
          <MoneyField label="Harga" value={price} onChange={setPrice} />
        </div>
        <footer className="flex justify-end gap-2 border-t border-default-200 bg-white px-4 py-3 sm:px-5">
          <button type="button" className="min-h-10 rounded-[10px] border border-default-300 px-4 text-[13px] font-semibold" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="min-h-10 rounded-[10px] bg-primary px-4 text-[13px] font-semibold text-white" onClick={save}>
            Simpan varian
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function VariantDialog({
  variants,
  initialVariant,
  axis,
  productType,
  errors,
  canDelete,
  onClose,
  onSave,
  onRemove,
}: {
  variants: VariantDraft[];
  initialVariant: VariantDraft;
  axis: string;
  productType: string;
  errors: Record<string, string | undefined>;
  canDelete: boolean;
  onClose: () => void;
  onSave: (variant: VariantDraft) => void;
  onRemove: (variant: VariantDraft) => void;
}) {
  const [selectedKey, setSelectedKey] = useState(initialVariant.key);
  const [draft, setDraft] = useState(initialVariant);
  const [isEditing, setIsEditing] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const activeVariant = variants.find((variant) => variant.key === selectedKey) ?? initialVariant;
  const activeError = errors[`variant.${selectedKey}`];

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const updateDraft = (patch: Partial<VariantDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const selectVariant = (variant: VariantDraft) => {
    if (isEditing) return;
    setSelectedKey(variant.key);
    setDraft(variant);
  };

  const save = () => {
    const name = draft.name.trim();
    if (!name) {
      notify.error('Isi nama varian terlebih dahulu.');
      return;
    }
    if (moneyValue(draft.price) === null) {
      notify.error('Isi harga varian terlebih dahulu.');
      return;
    }
    if (variants.some((variant) => variant.key !== draft.key && variant.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) {
      notify.error('Nama varian tidak boleh kembar.');
      return;
    }
    const savedVariant = { ...draft, name };
    onSave(savedVariant);
    setDraft(savedVariant);
    setIsEditing(false);
  };

  const edit = () => {
    setDraft(activeVariant);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(activeVariant);
    setIsEditing(false);
  };

  const remove = () => {
    onRemove(activeVariant);
    onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Varian ${axis}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-[90vh] w-[90vw] max-w-5xl flex-col overflow-hidden rounded-2xl border border-default-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-default-200 px-4 py-3.5 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-default-500">{axis || 'Varian'}</p>
            <h2 className="truncate text-base font-bold text-foreground">
              {isEditing ? draft.name || 'Varian baru' : activeVariant.name || 'Varian baru'}
            </h2>
          </div>
          <button ref={closeButton} type="button" className={ICON_BTN} aria-label="Tutup varian" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <section aria-label={`Daftar varian ${axis}`}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold">Daftar varian</h3>
              <span className="text-xs text-default-500">{variants.length} varian</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {variants.map((variant, index) => {
                const selected = variant.key === selectedKey;
                return (
                  <button
                    key={variant.key}
                    type="button"
                    disabled={isEditing}
                    onClick={() => selectVariant(variant)}
                    aria-pressed={selected}
                    className={`flex w-36 shrink-0 flex-col items-start rounded-xl border p-3 text-left transition-colors disabled:cursor-default ${
                      selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-default-200 hover:bg-default-50'
                    }`}
                  >
                    <span className="w-full truncate text-sm font-semibold">
                      {variant.name || `Varian ${index + 1}`}
                    </span>
                    <span className="mt-1 text-xs text-default-600">
                      {variant.price ? `Rp ${moneyDisplay(variant.price)}` : 'Harga belum diisi'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-4 rounded-xl border border-default-200 bg-default-50/60 p-4 sm:p-5" aria-label="Detail varian">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-default-200 pb-3">
              <div>
                <h3 className="text-sm font-bold">Detail varian</h3>
                <p className={HINT}>{isEditing ? 'Lengkapi nama, harga, stok, dan SKU varian.' : 'Informasi ini tampil sebagai baca-saja.'}</p>
              </div>
              {!isEditing && (
                <div className="flex gap-2">
                  {(!activeVariant.id || canDelete) && (
                    <button type="button" className={`${ICON_BTN} text-danger`} aria-label="Hapus varian" onClick={remove}>
                      <Icon name="trash" size={15} />
                    </button>
                  )}
                  <button type="button" className={ADD_BTN} onClick={edit}>
                    <Icon name="edit" size={15} />
                    Edit
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label={`Nama ${axis || 'varian'}`}
                  placeholder={axis.toLocaleLowerCase() === 'ukuran' ? 'Contoh: L' : 'Contoh: Varian 1'}
                  value={draft.name}
                  onChange={(name) => updateDraft({ name })}
                  maxLength={255}
                  error={activeError}
                />
                <MoneyField label="Harga" value={draft.price} onChange={(price) => updateDraft({ price })} />
                <IntField label="Stok" value={draft.stock} onChange={(stock) => updateDraft({ stock })} hint="Kosongkan bila tidak menggunakan pengelolaan stok." />
                <TextField label="SKU (opsional)" value={draft.sku} onChange={(sku) => updateDraft({ sku })} maxLength={100} />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <h4 className="text-lg font-bold">{activeVariant.name || 'Varian tanpa nama'}</h4>
                <dl className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-default-200 bg-white p-3">
                    <dt className="text-xs font-semibold text-default-500">Harga</dt>
                    <dd className="mt-1 text-sm font-semibold">{activeVariant.price ? `Rp ${moneyDisplay(activeVariant.price)}` : 'Belum diisi'}</dd>
                  </div>
                  <div className="rounded-lg border border-default-200 bg-white p-3">
                    <dt className="text-xs font-semibold text-default-500">Stok</dt>
                    <dd className="mt-1 text-sm">{activeVariant.stock || 'Tidak diatur'}</dd>
                  </div>
                  <div className="rounded-lg border border-default-200 bg-white p-3">
                    <dt className="text-xs font-semibold text-default-500">SKU</dt>
                    <dd className="mt-1 text-sm">{activeVariant.sku || 'Belum diisi'}</dd>
                  </div>
                </dl>
                {activeError && <p role="alert" className="text-xs font-semibold text-danger">{activeError}</p>}
                {activeVariant.id ? (
                  <Link
                    href={editorHref({ id: activeVariant.id, type: productType })}
                    aria-label={`Buka editor varian ${activeVariant.name}`}
                    className="inline-flex min-h-10 self-start items-center gap-1.5 rounded-[10px] bg-primary px-4 text-[13px] font-semibold text-white hover:bg-primary/90"
                  >
                    <Icon name="edit" size={15} />
                    Buka editor varian
                  </Link>
                ) : null}
              </div>
            )}
          </section>
        </div>

        {isEditing && (
          <footer className="flex shrink-0 justify-end gap-2 border-t border-default-200 bg-white px-4 py-3 sm:px-6">
            <button type="button" className="min-h-10 rounded-[10px] border border-default-300 px-4 text-[13px] font-semibold" onClick={cancelEdit}>
              Batal
            </button>
            <button type="button" className="min-h-10 rounded-[10px] bg-primary px-4 text-[13px] font-semibold text-white" onClick={save}>
              Simpan varian
            </button>
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Switch "Punya varian" di kepala bagian. Mematikan varian yang sudah tersimpan = menghapusnya (admin+). */
export function VariantsAside({ form, set, canEdit, canDelete }: SectionProps) {
  const saved = form.variants.some((variant) => variant.id);
  return (
    <StatusSwitch
      isSelected={form.hasVariants}
      ariaLabel="Punya varian"
      isDisabled={!canEdit}
      onChange={(on) => {
        if (!on && saved && !canDelete) {
          notify.warning('Menghapus varian butuh role Admin.');
          return;
        }
        set({ hasVariants: on, variants: on && form.variants.length === 0 ? [emptyVariant()] : form.variants });
      }}
    />
  );
}

/** Bagian "Varian & stok": produk anak (parent_product_id), metadata.sku, metadata.stock. */
export function VariantsSection({ form, set, errors, canDelete }: SectionProps) {
  const [dialogVariant, setDialogVariant] = useState<VariantDraft | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const removedSaved = !form.hasVariants && form.variants.some((variant) => variant.id);

  const saveVariant = (variant: VariantDraft) => {
    set({
      variants: form.variants.some((item) => item.key === variant.key)
        ? form.variants.map((item) => item.key === variant.key ? variant : item)
        : [...form.variants, variant],
    });
  };

  const removeVariant = (variant: VariantDraft) =>
    set({ variants: form.variants.filter((item) => item.key !== variant.key) });

  if (!form.hasVariants) {
    return (
      <>
        {removedSaved && <Notice tone="warning">Semua varian yang tersimpan akan dihapus saat kamu menekan Simpan.</Notice>}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="SKU" value={form.sku} onChange={(sku) => set({ sku })} maxLength={100} />
          <IntField label="Stok" value={form.stock} onChange={(stock) => set({ stock })} error={errors.stock} />
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <TextField
        label="Jenis varian"
        value={form.variantAxis}
        onChange={(variantAxis) => set({ variantAxis })}
        hint="Mis. Ukuran, Warna, Berat. Dipakai sebagai label pilihan di halaman produk."
        error={errors.variantAxis}
        maxLength={40}
      />
      {errors.variants && <Notice tone="danger">{errors.variants}</Notice>}
      {form.variants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-default-300 bg-white px-4 py-6 text-center">
          <p className="text-sm font-semibold">Belum ada varian</p>
          <p className="mt-1 text-xs text-default-600">Tambahkan varian untuk mengatur nama, harga, stok, dan SKU masing-masing.</p>
        </div>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {form.variants.map((variant, index) => (
            <li key={variant.key} className="rounded-xl border border-default-200 bg-white p-3">
              <button
                type="button"
                onClick={() => setDialogVariant(variant)}
                className="flex w-full flex-col items-start gap-1 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className="text-sm font-bold">{variant.name || `Varian ${index + 1}`}</span>
                <span className="text-sm text-default-700">{variant.price ? `Rp ${moneyDisplay(variant.price)}` : 'Harga belum diisi'}</span>
                <span className="text-xs text-default-500">
                  Stok: {variant.stock || 'tidak diatur'}{variant.sku ? ` · SKU ${variant.sku}` : ''}
                </span>
                {errors[`variant.${variant.key}`] && (
                  <span role="alert" className="text-xs font-semibold text-danger">{errors[`variant.${variant.key}`]}</span>
                )}
              </button>
              {variant.id && (
                <Link
                  href={editorHref({ id: variant.id, type: form.type })}
                  aria-label={`Buka editor varian ${variant.name || index + 1}`}
                  className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-[9px] border border-default-200 bg-white px-2.5 text-xs font-semibold text-primary hover:bg-primary-50"
                >
                  Buka editor varian <span aria-hidden="true">→</span>
                </Link>
              )}
              {!variant.id && (
                <p className="mt-2 text-xs text-default-500">Simpan dulu untuk edit varian.</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <button type="button" className={ADD_BTN} onClick={() => setIsQuickAddOpen(true)}>
        <Icon name="plus" size={16} />
        Tambah varian
      </button>
      {isQuickAddOpen && (
        <QuickAddVariantDialog
          axis={form.variantAxis}
          variants={form.variants}
          onClose={() => setIsQuickAddOpen(false)}
          onSave={saveVariant}
        />
      )}
      {dialogVariant && (
        <VariantDialog
          key={dialogVariant.key}
          variants={form.variants}
          initialVariant={dialogVariant}
          axis={form.variantAxis}
          productType={form.type}
          errors={errors}
          canDelete={canDelete}
          onClose={() => setDialogVariant(null)}
          onSave={saveVariant}
          onRemove={removeVariant}
        />
      )}
    </div>
  );
}
