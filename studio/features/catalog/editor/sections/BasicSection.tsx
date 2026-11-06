'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { RichTextEditor } from '@/studio/ui/rich-text-editor';
import { Icon } from '@/studio/ui/icons';

import { editorHref } from '../../catalog-types';
import { metaOf } from '../../product-utils';
import type { SectionProps } from '../editor-context';
import { ADD_BTN, Field, HINT, ICON_BTN, INPUT, Notice, TextField } from '../fields';

const NEW_CATEGORY = '__new';

function ShortDescriptionDialog({
  value,
  onClose,
  onSave,
}: {
  value: string;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
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
    onSave(draft);
    onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit deskripsi singkat"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-[90vh] w-[90vw] max-w-5xl flex-col overflow-hidden rounded-2xl border border-default-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-default-200 px-4 py-3.5 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-foreground">Edit deskripsi singkat</h2>
            <p className={HINT}>Deskripsi ini tampil di kartu produk.</p>
          </div>
          <button ref={closeButton} type="button" className={ICON_BTN} aria-label="Tutup editor deskripsi" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <Field label="Deskripsi singkat" hint="Tulis ringkasan yang membantu pelanggan memahami produk atau jasa.">
            <textarea
              rows={16}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className={`${INPUT} min-h-[45vh] resize-y`}
            />
          </Field>
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t border-default-200 bg-white px-4 py-3 sm:px-6">
          <button type="button" className="min-h-10 rounded-[10px] border border-default-300 px-4 text-[13px] font-semibold" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="min-h-10 rounded-[10px] bg-primary px-4 text-[13px] font-semibold text-white" onClick={save}>
            Simpan deskripsi
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function ShortDescriptionField({
  value,
  onSave,
  canEdit,
}: {
  value: string;
  onSave: (value: string) => void;
  canEdit: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <section className="flex flex-col gap-2 rounded-xl border border-default-200 bg-default-50/60 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[13px] font-bold text-foreground">Deskripsi singkat</h3>
            <p className={HINT}>Tampil di kartu produk. Detail lengkap di bawah.</p>
          </div>
          {canEdit && (
            <button type="button" className={ADD_BTN} onClick={() => setIsOpen(true)}>
              <Icon name="edit" size={15} />
              Edit
            </button>
          )}
        </div>
        {value.trim() ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-default-700">{value}</p>
        ) : (
          <p className="text-sm italic text-default-500">Belum ada deskripsi singkat.</p>
        )}
      </section>
      {isOpen && (
        <ShortDescriptionDialog
          value={value}
          onClose={() => setIsOpen(false)}
          onSave={(description) => onSave(description)}
        />
      )}
    </>
  );
}

function DetailEditorDialog({
  value,
  websiteId,
  onClose,
  onSave,
}: {
  value: string;
  websiteId: string;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
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
    onSave(draft);
    onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit detail lengkap"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-[90vh] w-[90vw] max-w-5xl flex-col overflow-hidden rounded-2xl border border-default-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-default-200 px-4 py-3.5 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-foreground">Edit detail lengkap</h2>
            <p className={HINT}>Atur format, gambar, dan konten detail produk atau jasa.</p>
          </div>
          <button ref={closeButton} type="button" className={ICON_BTN} aria-label="Tutup editor detail" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <RichTextEditor
            label="Detail lengkap"
            value={draft}
            onChange={setDraft}
            websiteId={websiteId}
            uploadFolder="products"
          />
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t border-default-200 bg-white px-4 py-3 sm:px-6">
          <button type="button" className="min-h-10 rounded-[10px] border border-default-300 px-4 text-[13px] font-semibold" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="min-h-10 rounded-[10px] bg-primary px-4 text-[13px] font-semibold text-white" onClick={save}>
            Simpan detail
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function FullDetailField({
  value,
  onSave,
  websiteId,
  canEdit,
}: {
  value: string;
  onSave: (value: string) => void;
  websiteId: string;
  canEdit: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <section className="flex flex-col gap-2 rounded-xl border border-default-200 bg-default-50/60 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[13px] font-bold text-foreground">Detail lengkap</h3>
            <p className={HINT}>Konten rich text untuk informasi lengkap produk atau jasa.</p>
          </div>
          {canEdit && (
            <button type="button" className={ADD_BTN} onClick={() => setIsOpen(true)}>
              <Icon name="edit" size={15} />
              Edit
            </button>
          )}
        </div>
        {value.trim() ? (
          <RichTextEditor label="Pratinjau detail" value={value} onChange={() => {}} disabled hideToolbar />
        ) : (
          <p className="rounded-xl border border-dashed border-default-300 bg-white px-3 py-5 text-sm italic text-default-500">
            Belum ada detail lengkap.
          </p>
        )}
      </section>
      {isOpen && (
        <DetailEditorDialog
          value={value}
          websiteId={websiteId}
          onClose={() => setIsOpen(false)}
          onSave={onSave}
        />
      )}
    </>
  );
}

function CategoryField({ form, set, lookups, addCategory }: SectionProps) {
  const id = useId();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const current = lookups.categories.find((c) => c.id === form.categoryId);

  const submit = async () => {
    if (!label.trim()) return;
    setBusy(true);
    const createdId = await addCategory(label.trim());
    setBusy(false);
    if (createdId) {
      set({ categoryId: createdId });
      setAdding(false);
      setLabel('');
    }
  };

  return (
    <Field label="Kategori" htmlFor={id} hint={adding ? 'Kategori baru langsung dipilih untuk item ini.' : undefined}>
      {adding ? (
        <span className="flex gap-2">
          <input
            id={id}
            autoFocus
            value={label}
            placeholder="Nama kategori baru"
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void submit();
              }
            }}
            className={INPUT}
          />
          <button type="button" disabled={busy || !label.trim()} onClick={() => void submit()} className="min-h-10 shrink-0 rounded-[10px] bg-primary px-3 text-[13px] font-bold text-white disabled:opacity-50">
            {busy ? 'Menyimpan…' : 'Tambah'}
          </button>
          <button type="button" onClick={() => setAdding(false)} className="min-h-10 shrink-0 rounded-[10px] border border-default-300 px-3 text-[13px] font-semibold">
            Batal
          </button>
        </span>
      ) : (
        <select
          id={id}
          value={form.categoryId}
          onChange={(e) => (e.target.value === NEW_CATEGORY ? setAdding(true) : set({ categoryId: e.target.value }))}
          className={INPUT}
        >
          <option value="">Tanpa kategori</option>
          {lookups.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
              {c.is_active ? '' : ' (nonaktif)'}
            </option>
          ))}
          {form.categoryId && !current && <option value={form.categoryId}>Kategori tidak ditemukan</option>}
          <option value={NEW_CATEGORY}>+ Kategori baru…</option>
        </select>
      )}
    </Field>
  );
}

function UomField({ form, set, lookups }: SectionProps) {
  const id = useId();
  if (form.type === 'gathering') {
    return (
      <Field label="Satuan">
        <span className="rounded-[10px] border border-default-200 bg-default-50 px-3 py-2.5 text-sm text-default-700">Peserta (otomatis)</span>
      </Field>
    );
  }
  return (
    <Field label="Satuan" htmlFor={id} hint="Konteks jumlah & harga, mis. Rp350.000/m².">
      <select id={id} value={form.uomId} onChange={(e) => set({ uomId: e.target.value })} className={INPUT}>
        <option value="">Tanpa satuan</option>
        {lookups.uoms
          .filter((u) => u.code !== 'ATTENDEE' || u.id === form.uomId)
          .map((u) => (
            <option key={u.id} value={u.id}>
              {u.label} ({u.symbol})
            </option>
          ))}
      </select>
    </Field>
  );
}

/** Bagian "Informasi dasar": name, category_id, uom_id, description, detail. */
export function BasicSection(props: SectionProps) {
  const { form, set, errors, parent, product, websiteId } = props;
  const inherits = parent !== null && product !== null && metaOf(product).inherit_description === true;
  return (
    <>
      {parent && (
        <Notice>
          Item ini adalah varian dari <Link href={editorHref(parent)} className="font-bold">{parent.name}</Link>. Harga & stok varian juga bisa diatur dari item induknya.
        </Notice>
      )}
      <TextField label="Nama" value={form.name} onChange={(name) => set({ name })} error={errors.name} maxLength={255} />
      <div className="grid gap-3 sm:grid-cols-2">
        <CategoryField {...props} />
        <UomField {...props} />
      </div>
      {inherits ? (
        <Notice>Deskripsi & detail mengikuti item induk.</Notice>
      ) : (
        <>
          <ShortDescriptionField value={form.description} onSave={(description) => set({ description })} canEdit={props.canEdit} />
          <FullDetailField value={form.detail} onSave={(detail) => set({ detail })} websiteId={websiteId} canEdit={props.canEdit} />
        </>
      )}
    </>
  );
}
