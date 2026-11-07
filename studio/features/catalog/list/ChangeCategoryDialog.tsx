'use client';

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react';
import { useEffect, useState } from 'react';

import type { CatalogCategoryOption } from '@/studio/api/catalog-lookups';

export interface ChangeCategoryDialogProps {
  count: number | null;
  categories: CatalogCategoryOption[];
  onCancel: () => void;
  onApply: (categoryId: string | null) => void;
}

/** Aksi massal "Ubah kategori". */
export function ChangeCategoryDialog({ count, categories, onCancel, onApply }: ChangeCategoryDialogProps) {
  const [value, setValue] = useState('');
  useEffect(() => {
    if (count !== null) setValue('');
  }, [count]);

  return (
    <Modal isOpen={count !== null} onOpenChange={(open) => !open && onCancel()} placement="center" size="sm">
      <ModalContent>
        <ModalHeader className="text-base font-semibold">Ubah kategori {count ?? 0} item</ModalHeader>
        <ModalBody>
          <label htmlFor="bulk-category" className="text-[13px] font-bold">
            Kategori baru
          </label>
          <select
            id="bulk-category"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="min-h-11 rounded-[10px] border border-default-300 bg-white px-3 text-sm text-foreground"
          >
            <option value="">Tanpa kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
                {c.is_active ? '' : ' (nonaktif)'}
              </option>
            ))}
          </select>
          <p className="text-xs text-default-600">Varian ikut dipindah bersama item induknya.</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="bordered" onPress={onCancel}>
            Batal
          </Button>
          <Button color="primary" onPress={() => onApply(value || null)}>
            Terapkan
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
