'use client';

import { Button, Checkbox, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react';
import { useMemo, useState } from 'react';

import type { CatalogAssetOption } from '@/studio/api/catalog-lookups';

import { INPUT } from '../fields';

export interface AssetPickerDialogProps {
  isOpen: boolean;
  assets: CatalogAssetOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}

/** Pilih banyak aset privat (cari nama/filename/deskripsi). */
export function AssetPickerDialog({ isOpen, assets, selectedIds, onChange, onClose }: AssetPickerDialogProps) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? assets.filter((a) => `${a.name} ${a.filename} ${a.description ?? ''}`.toLowerCase().includes(q)) : assets;
  }, [assets, query]);
  const toggle = (id: string) => onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()} placement="center" size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <span className="text-base font-bold">Pilih file</span>
          <span className="text-[13px] font-normal text-default-600">File privat yang dikirim ke pembeli setelah bayar.</span>
        </ModalHeader>
        <ModalBody>
          <input autoFocus type="search" className={INPUT} placeholder="Cari nama file…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Cari file" />
          <span className="text-xs text-default-600">{selectedIds.length} file dipilih</span>
          {assets.length === 0 ? (
            <p className="py-8 text-center text-sm text-default-600">Belum ada file privat. Unggah dulu di menu Digital Asset.</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-default-600">Tidak ada file yang cocok.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-default-100 rounded-xl border border-default-200">
              {filtered.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Checkbox isSelected={selectedIds.includes(a.id)} onValueChange={() => toggle(a.id)} aria-label={`Pilih ${a.name}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{a.name}</span>
                    <span className="block truncate text-xs text-default-600">{a.filename}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onPress={onClose}>
            Selesai
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
