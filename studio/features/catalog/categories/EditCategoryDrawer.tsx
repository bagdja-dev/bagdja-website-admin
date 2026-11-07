'use client';

import { useCallback, useEffect, useState } from 'react';

import { Input, Textarea } from '@heroui/react';

import type { CreateCategoryRequest, WebsiteCategory } from '@/studio/api/categories';
import { errorMessage } from '@/studio/api/client';
import { useActiveWebsiteId } from '@/studio/stores/website-store';
import { EditDrawer } from '@/studio/ui/primitives/EditDrawer';
import { StatusSwitch } from '@/studio/ui/primitives/StatusSwitch';

import { CategoryImages } from './CategoryImages';
import { KeyValueRepeater, type KeyValueRow } from './CategoryExtraFields';

interface EditCategoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  category: WebsiteCategory | null;
  onSave: (draft: CreateCategoryRequest) => Promise<void>;
}

const EMPTY_ROW: KeyValueRow[] = [{ key: '', value: '' }];

function toSpecRows(spec: WebsiteCategory['specifications']): KeyValueRow[] {
  const rows = Object.entries(spec ?? {}).map(([key, value]) => ({ key, value: String(value) }));
  return rows.length > 0 ? rows : EMPTY_ROW;
}

function toEstimationRows(est: WebsiteCategory['estimation']): KeyValueRow[] {
  const rows = (est ?? []).map((e) => ({ key: e.label, value: e.price === null || e.price === undefined ? '' : String(e.price) }));
  return rows.length > 0 ? rows : EMPTY_ROW;
}

export function EditCategoryDrawer({ isOpen, onClose, category, onSave }: EditCategoryDrawerProps) {
  const websiteId = useActiveWebsiteId();
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [specs, setSpecs] = useState<KeyValueRow[]>(EMPTY_ROW);
  const [estimation, setEstimation] = useState<KeyValueRow[]>(EMPTY_ROW);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLabel(category?.label ?? '');
    setDescription(category?.description ?? '');
    setImages(category?.images ?? []);
    setSpecs(toSpecRows(category?.specifications));
    setEstimation(toEstimationRows(category?.estimation));
    setIsActive(category?.is_active ?? true);
    setError(null);
  }, [isOpen, category]);

  const handleSubmit = useCallback(async () => {
    const badPrice = estimation.find((r) => r.key.trim() && r.value.trim() && !(Number(r.value) >= 0));
    if (badPrice) {
      setError(`Harga estimasi "${badPrice.key}" tidak boleh negatif.`);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSave({
        label: label.trim(),
        description: description.trim() || null,
        images,
        specifications: Object.fromEntries(specs.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value.trim()])),
        estimation: estimation.filter((r) => r.key.trim()).map((r) => ({ label: r.key.trim(), price: r.value.trim() ? Number(r.value) : 0 })),
        is_active: isActive,
      });
    } catch (err) {
      setError(errorMessage(err, 'Gagal menyimpan kategori.'));
    } finally {
      setIsSubmitting(false);
    }
  }, [onSave, label, description, images, specs, estimation, isActive]);

  return (
    <EditDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={category ? 'Edit kategori' : 'Tambah kategori'}
      onSubmit={handleSubmit}
      submitLabel={category ? 'Simpan perubahan' : 'Buat kategori'}
      isSubmitting={isSubmitting}
      isSubmitDisabled={!label.trim()}
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Nama kategori"
          labelPlacement="outside"
          value={label}
          onValueChange={setLabel}
          placeholder="Mis. Atasan"
          maxLength={100}
          autoFocus
          isRequired
          variant="bordered"
        />
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-semibold text-default-600">Deskripsi</label>
          <Textarea value={description} onValueChange={setDescription} placeholder="Deskripsi singkat kategori…" rows={3} className="w-full" />
        </div>
        <CategoryImages websiteId={websiteId} images={images} onChange={setImages} />
        <KeyValueRepeater
          label="Spesifikasi"
          hint="Mis. Bahan: Baja ringan."
          keyLabel="Nama"
          valueLabel="Nilai"
          rows={specs}
          onChange={setSpecs}
        />
        <KeyValueRepeater
          label="Estimasi harga"
          hint="Harga acuan (Rp), tidak boleh negatif."
          keyLabel="Label"
          valueLabel="Harga"
          valueType="number"
          rows={estimation}
          onChange={setEstimation}
        />
        <div className="flex items-center gap-3 pt-1">
          <StatusSwitch isSelected={isActive} onChange={setIsActive} ariaLabel="Tampilkan kategori di website" />
          <span className="text-[13px] text-default-600">Tampilkan di website</span>
        </div>
        {error && <p role="alert" className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#B91C1C]">{error}</p>}
      </div>
    </EditDrawer>
  );
}
