'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface AlertOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'default';
}

interface PendingAlert extends AlertOptions {
  resolve: () => void;
}

/**
 * Hook alert berbasis Promise — modal 1-tombol untuk menampilkan pesan
 * error dari aksi (mis. gagal force-complete), pengganti teks error inline
 * atau `window.alert()`. Sama gaya visual dengan `useConfirmDialog`, cuma
 * tanpa tombol batal.
 *
 * Pakai: `const { alert, dialog } = useAlertDialog();` lalu
 * `await alert({ title: '...', message: err.message })` di catch block,
 * dan render `{dialog}` sekali di JSX halaman.
 */
export function useAlertDialog() {
  const [pending, setPending] = useState<PendingAlert | null>(null);
  const [visible, setVisible] = useState(false);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  useEffect(() => {
    if (!pending) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [pending]);

  const settle = useCallback(() => {
    setVisible(false);
    window.setTimeout(() => {
      pending?.resolve();
      setPending(null);
    }, 180);
  }, [pending]);

  const dialog = pending ? (
    <AlertDialogView
      title={pending.title}
      message={pending.message}
      confirmLabel={pending.confirmLabel}
      tone={pending.tone}
      visible={visible}
      onClose={settle}
    />
  ) : null;

  return { alert, dialog };
}

interface AlertDialogViewProps extends AlertOptions {
  visible: boolean;
  onClose: () => void;
}

function AlertDialogView({
  title,
  message,
  confirmLabel = 'Mengerti',
  tone = 'danger',
  visible,
  onClose,
}: AlertDialogViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!mounted) return null;
  const portalRoot = document.getElementById('modal-root') ?? document.body;
  const isDanger = tone === 'danger';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-dialog-title"
        className={`relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-200 ease-out ${
          visible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}
      >
        <div className="flex flex-col items-center gap-3 px-6 pb-2 pt-8 text-center">
          <span
            className={`flex h-16 w-16 items-center justify-center rounded-full ${
              isDanger ? 'bg-danger-100 text-danger-600' : 'bg-primary-100 text-primary-600'
            }`}
          >
            <svg
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              {isDanger ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                />
              )}
            </svg>
          </span>
          <div>
            <h2 id="alert-dialog-title" className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            {message && <p className="mt-1.5 text-sm text-default-500">{message}</p>}
          </div>
        </div>

        <div className="px-6 pb-6 pt-5">
          <button
            type="button"
            onClick={onClose}
            className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors ${
              isDanger ? 'bg-danger-600 hover:bg-danger-700' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    portalRoot,
  );
}
