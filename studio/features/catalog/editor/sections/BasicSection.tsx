'use client';

import Link from 'next/link';
import { useId, useState } from 'react';

import { RichTextEditor } from '@/studio/ui/rich-text-editor';

import { editorHref } from '../../catalog-types';
import { metaOf } from '../../product-utils';
import type { SectionProps } from '../editor-context';
import { Field, INPUT, Notice, TextAreaField, TextField } from '../fields';

const NEW_CATEGORY = '__new';

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
          <TextAreaField label="Deskripsi singkat" rows={2} value={form.description} onChange={(description) => set({ description })} hint="Tampil di kartu produk. Detail lengkap di bawah." />
          <RichTextEditor label="Detail lengkap" value={form.detail} onChange={(detail) => set({ detail })} websiteId={websiteId} uploadFolder="products" disabled={!props.canEdit} />
        </>
      )}
    </>
  );
}
