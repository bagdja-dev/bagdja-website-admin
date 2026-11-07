'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import type { ConfirmOptions } from '@/studio/ui/primitives/ConfirmDialog';

/**
 * Peringatan perubahan belum tersimpan: menutup/muat ulang tab (beforeunload) dan klik
 * tautan internal (sidebar, kembali, breadcrumb) → dialog konfirmasi.
 */
export function useUnsavedGuard(dirty: boolean, confirm: (o: ConfirmOptions) => Promise<boolean>): void {
  const router = useRouter();
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      void confirm({
        title: 'Tinggalkan tanpa menyimpan?',
        description: 'Perubahan yang belum disimpan akan hilang.',
        confirmLabel: 'Tinggalkan',
        cancelLabel: 'Tetap di sini',
      }).then((ok) => {
        if (ok) {
          dirtyRef.current = false;
          router.push(`${url.pathname}${url.search}${url.hash}`);
        }
      });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [confirm, router]);
}
