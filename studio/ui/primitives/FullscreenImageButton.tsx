'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Icon } from '../icons';

export function FullscreenImageButton({ src, alt }: { src: string; alt: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Lihat foto layar penuh"
        title="Layar penuh"
        className="absolute bottom-1 right-1 z-10 inline-flex h-6 w-6 items-center justify-center rounded text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Icon name="maximize" size={15} />
      </button>
      {isOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Foto ukuran besar"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          >
            <div className="relative flex h-[90vh] w-[90vw] items-center justify-center rounded-xl bg-black p-3 shadow-2xl">
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup foto"
                className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <Icon name="close" size={22} />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element -- URL storage tenant */}
              <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
