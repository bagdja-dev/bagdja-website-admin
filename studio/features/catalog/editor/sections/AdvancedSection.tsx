'use client';

import { useRef, useState } from 'react';

import { uploadAsset } from '@/studio/lib/upload-asset';
import { Icon } from '@/studio/ui/icons';
import { notify } from '@/studio/ui/primitives/Toast';

import { slugifyProduct } from '../build-payload';
import type { SectionProps } from '../editor-context';
import { ADD_BTN, HINT, ICON_BTN, INPUT, MoneyInput, Notice, TextField } from '../fields';
import { advancedFieldsFor } from '../section-registry';

const MODEL_MAX = 50 * 1024 * 1024;

/** Bagian "Lanjutan" (tertutup): slug, specifications, estimation, model3d_url — isi per tipe dari registry. */
export function AdvancedSection({ form, set, errors, product, websiteId, canEdit }: SectionProps) {
  const [open, setOpen] = useState(Boolean(errors.slug || errors.estimation) || !canEdit);
  const [uploading, setUploading] = useState(false);
  const modelInput = useRef<HTMLInputElement>(null);
  const fields = advancedFieldsFor(form.type);

  const uploadModel = async (file: File) => {
    if (!/\.(glb|gltf)$/i.test(file.name)) return notify.error('Model 3D harus berformat .glb atau .gltf.');
    if (file.size > MODEL_MAX) return notify.error('Ukuran model 3D maksimal 50 MB.');
    setUploading(true);
    try {
      const res = await uploadAsset(file, websiteId, 'products');
      set({ model3dUrl: res.url });
    } catch (err) {
      notify.error('Gagal mengunggah model 3D', err instanceof Error ? err.message : undefined);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center justify-between gap-3 text-left">
        <span className="text-[13px] text-default-600">Alamat URL{fields.includes('specifications') ? ', spesifikasi' : ''}{fields.includes('estimation') ? ', estimasi biaya tambahan' : ''}{fields.includes('model3d') ? ', model 3D' : ''}</span>
        <Icon name="chevronDown" size={18} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <div className="flex flex-col gap-4">
          <TextField
            label="Alamat URL (slug)"
            value={form.slug}
            onChange={(v) => set({ slug: slugifyProduct(v, true), slugTouched: true })}
            error={errors.slug}
            hint={product ? 'Mengubah alamat membuat tautan lama ke item ini tidak berlaku.' : 'Dibuat otomatis dari nama.'}
            maxLength={255}
          />
          {fields.includes('specifications') && (
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-bold">Spesifikasi</span>
              {form.specs.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_1.4fr_36px] gap-2">
                  <input className={INPUT} aria-label="Nama spesifikasi" placeholder="Mis. Bahan" value={row.key} onChange={(e) => set({ specs: form.specs.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)) })} />
                  <input className={INPUT} aria-label="Nilai spesifikasi" placeholder="Mis. Katun" value={row.value} onChange={(e) => set({ specs: form.specs.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)) })} />
                  <button type="button" className={ICON_BTN} aria-label="Hapus spesifikasi" onClick={() => set({ specs: form.specs.filter((_, j) => j !== i) })}><Icon name="trash" size={14} /></button>
                </div>
              ))}
              <button type="button" className={ADD_BTN} onClick={() => set({ specs: [...form.specs, { key: '', value: '' }] })}>+ Tambah spesifikasi</button>
            </div>
          )}
          {fields.includes('estimation') && (
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-bold">Estimasi biaya tambahan</span>
              <span className={HINT}>Mis. biaya pemasangan. Hanya informasi, tidak ditagihkan otomatis.</span>
              {errors.estimation && <Notice tone="danger">{errors.estimation}</Notice>}
              {form.estimation.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_36px] gap-2">
                  <input className={INPUT} aria-label="Label estimasi" placeholder="Mis. Pemasangan" value={row.label} onChange={(e) => set({ estimation: form.estimation.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)) })} />
                  <MoneyInput ariaLabel="Harga estimasi" value={row.price} onChange={(price) => set({ estimation: form.estimation.map((r, j) => (j === i ? { ...r, price } : r)) })} />
                  <button type="button" className={ICON_BTN} aria-label="Hapus estimasi" onClick={() => set({ estimation: form.estimation.filter((_, j) => j !== i) })}><Icon name="trash" size={14} /></button>
                </div>
              ))}
              <button type="button" className={ADD_BTN} onClick={() => set({ estimation: [...form.estimation, { label: '', price: '' }] })}>+ Tambah estimasi</button>
            </div>
          )}
          {fields.includes('model3d') && (
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-bold">Model 3D</span>
              {form.model3dUrl ? (
                <span className="flex flex-wrap items-center gap-2 text-[13px]">
                  <a href={form.model3dUrl} target="_blank" rel="noreferrer" className="min-w-0 truncate">Lihat file model 3D</a>
                  {canEdit && <button type="button" onClick={() => modelInput.current?.click()} className="min-h-9 rounded-[9px] border border-default-300 px-3 font-semibold">Ganti</button>}
                  {canEdit && <button type="button" onClick={() => set({ model3dUrl: '' })} className="min-h-9 rounded-[9px] border border-default-300 px-3 font-semibold text-[#B91C1C]">Hapus</button>}
                </span>
              ) : (
                canEdit && (
                  <button type="button" disabled={uploading} onClick={() => modelInput.current?.click()} className={ADD_BTN}>
                    {uploading ? 'Mengunggah…' : '+ Unggah model 3D (.glb)'}
                  </button>
                )
              )}
              <span className={HINT}>.glb / .gltf, maks. 50 MB.</span>
              <input ref={modelInput} type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadModel(f); e.currentTarget.value = ''; }} />
            </div>
          )}
        </div>
      )}
    </>
  );
}
