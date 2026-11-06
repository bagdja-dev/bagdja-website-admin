'use client';

import { Icon } from '@/studio/ui/icons';
import { StatusSwitch } from '@/studio/ui/primitives/StatusSwitch';
import { notify } from '@/studio/ui/primitives/Toast';

import type { SectionProps } from '../editor-context';
import { ADD_BTN, ICON_BTN, INPUT, IntField, MoneyInput, Notice, TextField } from '../fields';
import { emptyVariant, type VariantDraft } from '../form-state';

/** Switch "Punya varian" di kepala bagian. Mematikan varian yang sudah tersimpan = menghapusnya (admin+). */
export function VariantsAside({ form, set, canEdit, canDelete }: SectionProps) {
  const saved = form.variants.some((v) => v.id);
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
        set({ hasVariants: on, variants: on && form.variants.length === 0 ? [emptyVariant(), emptyVariant()] : form.variants });
      }}
    />
  );
}

/** Bagian "Varian & stok": produk anak (parent_product_id), metadata.sku, metadata.stock. */
export function VariantsSection({ form, set, errors, canDelete }: SectionProps) {
  const update = (key: string, patch: Partial<VariantDraft>) =>
    set({ variants: form.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)) });
  const remove = (v: VariantDraft) => set({ variants: form.variants.filter((x) => x.key !== v.key) });
  const removedSaved = !form.hasVariants && form.variants.some((v) => v.id);

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
      <div className="hidden grid-cols-[2fr_1.2fr_0.8fr_1fr_36px] gap-2 px-0.5 text-xs font-semibold text-default-600 sm:grid">
        <span>Nama varian</span>
        <span>Harga (Rp)</span>
        <span>Stok</span>
        <span>SKU</span>
        <span />
      </div>
      <ul className="flex flex-col gap-2.5 sm:gap-2">
        {form.variants.map((v, index) => {
          const err = errors[`variant.${v.key}`];
          const lockedDelete = v.id !== null && !canDelete;
          return (
            <li key={v.key} className="flex flex-col gap-1 rounded-xl border border-default-200 p-2.5 sm:border-0 sm:p-0">
              <div className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[2fr_1.2fr_0.8fr_1fr_36px]">
                <input className={`${INPUT} col-span-2 sm:col-span-1`} aria-label={`Nama varian ${index + 1}`} placeholder="Mis. 100 g" value={v.name} onChange={(e) => update(v.key, { name: e.target.value })} aria-invalid={err ? true : undefined} />
                <MoneyInput ariaLabel={`Harga varian ${index + 1}`} value={v.price} onChange={(price) => update(v.key, { price })} />
                <input className={INPUT} inputMode="numeric" aria-label={`Stok varian ${index + 1}`} placeholder="Stok" value={v.stock} onChange={(e) => update(v.key, { stock: e.target.value.replace(/[^\d]/g, '') })} />
                <input className={INPUT} aria-label={`SKU varian ${index + 1}`} placeholder="SKU" value={v.sku} onChange={(e) => update(v.key, { sku: e.target.value })} />
                <button
                  type="button"
                  className={ICON_BTN}
                  disabled={lockedDelete}
                  title={lockedDelete ? 'Menghapus varian tersimpan butuh role Admin' : undefined}
                  aria-label={`Hapus varian ${v.name || index + 1}`}
                  onClick={() => remove(v)}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
              {err && (
                <span role="alert" className="text-xs font-semibold text-danger">
                  {err}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <button type="button" className={ADD_BTN} onClick={() => set({ variants: [...form.variants, emptyVariant()] })}>
        + Tambah varian
      </button>
    </div>
  );
}
