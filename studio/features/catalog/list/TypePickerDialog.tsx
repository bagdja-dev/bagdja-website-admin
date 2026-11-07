'use client';

import { Modal, ModalBody, ModalContent, ModalHeader } from '@heroui/react';
import Link from 'next/link';

import { useModulesStore } from '@/studio/stores/modules-store';

import { FEATURES_PATH, ITEM_TYPE_ORDER, ITEM_TYPES, isTypeModuleEnabled, newItemHref } from '../catalog-types';

export interface TypePickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/** "Mau menambah apa?" (artboard Produk-List). Paket disembunyikan sementara; tipe tanpa modul aktif tampil redup → Fitur. */
export function TypePickerDialog({ isOpen, onClose }: TypePickerDialogProps) {
  const hasModule = useModulesStore((s) => s.hasModule);
  const moduleLabel = useModulesStore((s) => s.moduleLabel);
  const kinds = ITEM_TYPE_ORDER.filter((t) => ITEM_TYPES[t].creatable);

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()} placement="center" size="md" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="text-lg font-extrabold">Mau menambah apa?</ModalHeader>
        <ModalBody className="pb-6">
          <ul className="flex flex-col gap-2.5">
            {kinds.map((key) => {
              const meta = ITEM_TYPES[key];
              const enabled = isTypeModuleEnabled(key, hasModule);
              const needs = meta.module ? moduleLabel(meta.module) : '';
              return (
                <li key={key}>
                  <Link
                    href={enabled ? newItemHref(key) : FEATURES_PATH}
                    onClick={onClose}
                    className={`flex flex-col gap-1 rounded-[14px] px-4 py-3.5 text-foreground no-underline ${
                      enabled
                        ? 'border border-default-200 bg-white hover:border-primary-200 hover:bg-primary-50'
                        : 'border border-dashed border-default-300 bg-default-50 opacity-75'
                    }`}
                  >
                    <span className="text-[15px] font-bold">{meta.pickerLabel}</span>
                    <span className="text-[13px] text-default-600">{meta.description}</span>
                    {!enabled && <span className="text-xs font-semibold text-primary">Aktifkan fitur {needs} dulu</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
