'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

/**
 * Hook konfirmasi berbasis Promise — pengganti `window.confirm()` bawaan
 * browser dengan modal yang seragam & eye-catching di seluruh admin.
 *
 * Pakai: `const { confirm, dialog } = useConfirmDialog();` lalu
 * `if (!(await confirm({ title: '...' }))) return;` di handler, dan render
 * `{dialog}` sekali di JSX halaman.
 */
export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [visible, setVisible] = useState(false);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  useEffect(() => {
    if (!pending) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [pending]);

  const settle = useCallback(
    (result: boolean) => {
      setVisible(false);
      window.setTimeout(() => {
        pending?.resolve(result);
        setPending(null);
      }, 180);
    },
    [pending],
  );

  const dialog = pending ? (
    <ConfirmDialogView
      title={pending.title}
      message={pending.message}
      confirmLabel={pending.confirmLabel}
      cancelLabel={pending.cancelLabel}
      tone={pending.tone}
      visible={visible}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  ) : null;

  return { confirm, dialog };
}

interface ConfirmDialogViewProps extends ConfirmOptions {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialogView({
  title,
  message,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  tone = 'danger',
  visible,
  onConfirm,
  onCancel,
}: ConfirmDialogViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  if (!mounted) return null;
  const portalRoot = document.getElementById('modal-root') ?? document.body;
  const isDanger = tone === 'danger';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onCancel}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
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
              className="h-8 w-8 animate-icon-wobble"
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
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
                />
              )}
            </svg>
          </span>
          <div>
            <h2 id="confirm-dialog-title" className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            {message && <p className="mt-1.5 text-sm text-default-500">{message}</p>}
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6 pt-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-default-300 px-4 py-2.5 text-sm font-medium text-default-700 transition-colors hover:bg-default-100"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors ${
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
