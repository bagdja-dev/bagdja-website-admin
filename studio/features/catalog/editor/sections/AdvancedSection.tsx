'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { uploadAsset } from '@/studio/lib/upload-asset';
import { ModelViewerElement } from '@/lib/model-viewer-element';
import { Icon } from '@/studio/ui/icons';
import { notify } from '@/studio/ui/primitives/Toast';

import { slugifyProduct } from '../build-payload';
import type { SectionProps } from '../editor-context';
import { ADD_BTN, HINT, ICON_BTN, INPUT, MoneyInput, Notice, TextAreaField, TextField } from '../fields';
import { advancedFieldsFor } from '../section-registry';

const MODEL_MAX = 50 * 1024 * 1024;

type Specification = { key: string; value: string };

function SpecificationDialog({
  initialSpec,
  existingSpecs,
  index,
  isNew,
  onRemove,
  onClose,
  onSave,
}: {
  initialSpec: Specification;
  existingSpecs: Specification[];
  index: number;
  isNew: boolean;
  onRemove?: () => void;
  onClose: () => void;
  onSave: (spec: Specification) => void;
}) {
  const [draft, setDraft] = useState(initialSpec);
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
    const key = draft.key.trim();
    const value = draft.value.trim();
    if (!key || !value) {
      notify.error('Isi nama dan nilai spesifikasi terlebih dahulu.');
      return;
    }
    if (existingSpecs.some((spec, specIndex) => specIndex !== index && spec.key.trim().toLocaleLowerCase() === key.toLocaleLowerCase())) {
      notify.error('Nama spesifikasi tidak boleh kembar.');
      return;
    }

    onSave({ key, value });
    onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${isNew ? 'Tambah' : 'Edit'} spesifikasi`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-default-200 bg-white shadow-2xl">
        <header className="flex items-center gap-3 border-b border-default-200 px-4 py-3.5 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-foreground">{isNew ? 'Tambah spesifikasi' : 'Edit spesifikasi'}</h2>
            <p className={HINT}>Masukkan nama dan nilai informasi produk.</p>
          </div>
          <button ref={closeButton} type="button" className={ICON_BTN} aria-label="Tutup spesifikasi" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <TextField
            label="Nama spesifikasi"
            placeholder="Contoh: Bahan atau Ukuran"
            value={draft.key}
            onChange={(key) => setDraft((current) => ({ ...current, key }))}
            maxLength={255}
            autoFocus
          />
          <TextAreaField
            label="Nilai"
            placeholder="Contoh: Katun 100%"
            rows={5}
            value={draft.value}
            onChange={(value) => setDraft((current) => ({ ...current, value }))}
          />
        </div>

        <footer className="flex justify-between gap-2 border-t border-default-200 bg-white px-4 py-3 sm:px-5">
          {onRemove ? (
            <button type="button" className="min-h-10 rounded-[10px] border border-danger/30 px-4 text-[13px] font-semibold text-danger hover:bg-danger/5" onClick={onRemove}>
              Hapus
            </button>
          ) : <span />}
          <div className="ml-auto flex gap-2">
            <button type="button" className="min-h-10 rounded-[10px] border border-default-300 px-4 text-[13px] font-semibold" onClick={onClose}>
              Batal
            </button>
            <button type="button" className="min-h-10 rounded-[10px] bg-primary px-4 text-[13px] font-semibold text-white" onClick={save}>
              Simpan
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

/** Bagian "Lanjutan" (tertutup): slug, specifications, estimation, model3d_url — isi per tipe dari registry. */
export function AdvancedSection({ form, set, errors, product, websiteId, canEdit }: SectionProps) {
  const [open, setOpen] = useState(Boolean(errors.slug || errors.estimation) || !canEdit);
  const [specDialog, setSpecDialog] = useState<{ index: number; isNew: boolean } | null>(null);
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
              <div>
                <span className="text-[13px] font-bold">Spesifikasi</span>
                <p className={HINT}>Informasi penting produk, seperti bahan, ukuran, atau warna.</p>
              </div>
              {form.specs.length ? (
                <ul className="flex flex-col gap-2.5">
                  {form.specs.map((spec, index) => (
                    <li key={`${index}-${spec.key}`} className="w-full">
                      <button
                        type="button"
                        onClick={() => setSpecDialog({ index, isNew: false })}
                        className="flex w-full flex-col items-start rounded-xl border border-default-200 bg-white p-4 text-left transition hover:border-primary/50 hover:bg-default-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <span className="text-sm font-bold">{spec.key || `Spesifikasi ${index + 1}`}</span>
                        <span className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-default-600">{spec.value || 'Nilai belum diisi'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-default-300 bg-default-50 px-3.5 py-3 text-[13px] text-default-600">
                  Belum ada spesifikasi. Tambahkan informasi seperti bahan, ukuran, atau warna.
                </p>
              )}
              {canEdit && (
                <button type="button" className={ADD_BTN} onClick={() => setSpecDialog({ index: -1, isNew: true })}>
                  <Icon name="plus" size={15} />
                  Tambah spesifikasi
                </button>
              )}
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
                <>
                  <div className="h-[280px] w-full overflow-hidden rounded-xl border border-default-200 bg-default-50 sm:h-[360px]">
                    <ModelViewerElement
                      src={form.model3dUrl}
                      className="h-full w-full"
                      cameraControls
                      autoRotate
                      showFullscreenButton
                    />
                  </div>
                  <p className={HINT}>Seret untuk memutar model, scroll atau pinch untuk memperbesar.</p>
                  <span className="flex flex-wrap items-center gap-2 text-[13px]">
                    <a href={form.model3dUrl} target="_blank" rel="noreferrer" className="min-w-0 truncate">Buka file model 3D</a>
                  {canEdit && <button type="button" onClick={() => modelInput.current?.click()} className="min-h-9 rounded-[9px] border border-default-300 px-3 font-semibold">Ganti</button>}
                  {canEdit && <button type="button" onClick={() => set({ model3dUrl: '' })} className="min-h-9 rounded-[9px] border border-default-300 px-3 font-semibold text-[#B91C1C]">Hapus</button>}
                  </span>
                </>
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
      {specDialog && (
        <SpecificationDialog
          initialSpec={specDialog.isNew ? { key: '', value: '' } : form.specs[specDialog.index] ?? { key: '', value: '' }}
          existingSpecs={form.specs}
          index={specDialog.index}
          isNew={specDialog.isNew}
          onRemove={!specDialog.isNew ? () => {
            set({ specs: form.specs.filter((_, index) => index !== specDialog.index) });
            setSpecDialog(null);
          } : undefined}
          onClose={() => setSpecDialog(null)}
          onSave={(spec) => set({
            specs: specDialog.isNew
              ? [...form.specs, spec]
              : form.specs.map((current, index) => index === specDialog.index ? spec : current),
          })}
        />
      )}
    </>
  );
}
