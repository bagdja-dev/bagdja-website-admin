'use client';

import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react';
import type { ReactNode } from 'react';

export interface StudioDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer: ReactNode;
  isBusy?: boolean;
}

/** Dialog gaya artboard Fitur: radius 18, padding 24, judul 20/800. */
export function StudioDialog({ isOpen, onClose, title, children, footer, isBusy = false }: StudioDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && !isBusy && onClose()}
      placement="top-center"
      isDismissable={!isBusy}
      hideCloseButton
      classNames={{ base: 'max-w-[460px] rounded-[18px] shadow-[0_24px_60px_rgba(24,24,27,0.25)] sm:mt-32', backdrop: 'bg-[rgba(24,24,27,0.45)]' }}
    >
      <ModalContent>
        <ModalHeader className="px-6 pb-0 pt-6 text-xl font-extrabold">{title}</ModalHeader>
        <ModalBody className="gap-4 px-6 py-4">{children}</ModalBody>
        <ModalFooter className="flex flex-wrap justify-end gap-2.5 px-6 pb-6 pt-0">{footer}</ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export const DIALOG_SECONDARY =
  'min-h-11 rounded-[10px] border border-default-300 bg-white px-[18px] text-sm font-semibold text-foreground hover:bg-default-50 disabled:opacity-60';
export const DIALOG_PRIMARY =
  'inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-primary px-[18px] text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-60';
