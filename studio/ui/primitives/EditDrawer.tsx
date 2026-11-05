'use client';

import { Button, Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@heroui/react';
import { useId, type FormEvent, type ReactNode } from 'react';

import { Icon } from '../icons';

export interface EditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Bila diisi, isi dibungkus `<form>` dan tombol simpan bertipe submit. */
  onSubmit?: () => void | Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
  isSubmitDisabled?: boolean;
  /** Konten footer tambahan di kiri (mis. tombol hapus garis merah). */
  footerStart?: ReactNode;
}

/** Drawer kanan untuk form pendek (plan §3.10 #8); layar penuh di HP (<640px). */
export function EditDrawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  onSubmit,
  submitLabel = 'Simpan',
  isSubmitting = false,
  isSubmitDisabled = false,
  footerStart,
}: EditDrawerProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (onSubmit && !isSubmitting) void onSubmit();
  };

  const formId = `edit-drawer-${useId().replace(/:/g, '')}`;

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={(open) => !open && !isSubmitting && onClose()}
      placement="right"
      size="md"
      isDismissable={!isSubmitting}
      hideCloseButton
      classNames={{ base: 'h-[100dvh] w-full max-w-full rounded-none shadow-[-16px_0_40px_rgba(24,24,27,0.18)] sm:max-w-[440px]' }}
    >
      <DrawerContent>
        <DrawerHeader className="flex items-center justify-between gap-3 border-b border-default-100 px-5 py-4">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-lg font-extrabold">{title}</span>
            {description && <span className="text-[13px] font-normal text-default-600">{description}</span>}
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Tutup"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-default-200 bg-white text-foreground hover:bg-default-50"
          >
            <Icon name="close" size={16} strokeWidth={2.2} />
          </button>
        </DrawerHeader>
        <DrawerBody className="p-5">
          {onSubmit ? (
            <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              {children}
            </form>
          ) : (
            children
          )}
        </DrawerBody>
        <DrawerFooter className="flex items-center justify-between gap-2.5 border-t border-default-100 px-5 py-3.5">
          <div>{footerStart}</div>
          <div className="flex gap-2.5">
            <Button variant="bordered" radius="sm" className="min-h-11 border-1 border-default-300 font-semibold" onPress={onClose} isDisabled={isSubmitting}>
              {onSubmit ? 'Batal' : 'Tutup'}
            </Button>
            {onSubmit && (
              <Button
                color="primary"
                radius="sm"
                className="min-h-11 font-bold"
                type="submit"
                form={formId}
                isLoading={isSubmitting}
                isDisabled={isSubmitDisabled}
              >
                {submitLabel}
              </Button>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
