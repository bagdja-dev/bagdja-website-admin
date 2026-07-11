'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type AppModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: AppModalSize;
}

const SIZE_DEFAULT_WIDTH: Record<AppModalSize, number> = {
  sm: 384,
  md: 448,
  lg: 512,
  xl: 672,
};

export function AppModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: AppModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!mounted || !isOpen) return null;

  const portalRoot = document.getElementById('modal-root') ?? document.body;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label="Tutup modal"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
        className="relative z-10 flex w-full flex-col overflow-hidden rounded-2xl border border-default-200 bg-white shadow-2xl resize"
        style={{
          width: SIZE_DEFAULT_WIDTH[size],
          maxWidth: '95vw',
          maxHeight: '95vh',
          minWidth: 320,
          minHeight: 240,
        }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-default-200 px-5 py-4 sm:px-6">
          <h2 id="app-modal-title" className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-default-400 transition-colors hover:bg-default-100 hover:text-foreground"
            aria-label="Tutup"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-default-200 px-5 py-4 sm:px-6">
            {footer}
          </div>
        )}

        <svg
          className="pointer-events-none absolute bottom-1 right-1 h-3 w-3 text-default-300"
          fill="none"
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path d="M10 2 2 10M10 6 6 10M10 10h.01" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
        </svg>
      </div>
    </div>,
    portalRoot,
  );
}
