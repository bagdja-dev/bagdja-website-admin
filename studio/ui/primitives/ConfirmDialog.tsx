'use client';

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react';
import { useCallback, useRef, useState, type ReactNode } from 'react';

export type ConfirmTone = 'default' | 'danger';

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` HANYA untuk aksi destruktif (hapus). Default netral (bug lama: semua bergaya danger). */
  tone?: ConfirmTone;
}

export interface ConfirmDialogProps extends ConfirmOptions {
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  isLoading = false,
  title,
  description,
  confirmLabel = 'Lanjutkan',
  cancelLabel = 'Batal',
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && !isLoading && onCancel()}
      placement="center"
      size="sm"
      isDismissable={!isLoading}
      role="alertdialog"
    >
      <ModalContent>
        <ModalHeader className="text-base font-semibold">{title}</ModalHeader>
        {description && <ModalBody className="text-sm text-default-600">{description}</ModalBody>}
        <ModalFooter>
          <Button variant="bordered" onPress={onCancel} isDisabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button color={tone === 'danger' ? 'danger' : 'primary'} onPress={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/**
 * Pengganti `window.confirm`: `const ok = await confirm({...})`.
 * Render `dialog` sekali di komponen pemanggil.
 */
export function useConfirm(): { confirm: (options: ConfirmOptions) => Promise<boolean>; dialog: ReactNode } {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((next: ConfirmOptions) => {
    resolverRef.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const dialog = (
    <ConfirmDialog
      isOpen={options !== null}
      title={options?.title ?? ''}
      description={options?.description}
      confirmLabel={options?.confirmLabel}
      cancelLabel={options?.cancelLabel}
      tone={options?.tone}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return { confirm, dialog };
}
