'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

interface ModelViewerElementProps {
  src: string;
  className?: string;
  style?: CSSProperties;
  autoRotate?: boolean;
  cameraControls?: boolean;
  ar?: boolean;
  showFullscreenButton?: boolean;
}

function ViewerIcon({ name, size }: { name: 'maximize' | 'close'; size: number }) {
  const path = name === 'maximize'
    ? 'M8.25 3.75H5.625A1.875 1.875 0 0 0 3.75 5.625V8.25m12-4.5h2.625a1.875 1.875 0 0 1 1.875 1.875V8.25m0 7.5v2.625a1.875 1.875 0 0 1-1.875 1.875H15.75m-7.5 0H5.625a1.875 1.875 0 0 1-1.875-1.875V15.75'
    : 'M6 18 18 6M6 6l12 12';

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

/**
 * Thin wrapper around Google's <model-viewer> web component. The package
 * touches browser-only globals at import time, so load it from an effect.
 */
export function ModelViewerElement({
  src,
  className,
  style,
  autoRotate = false,
  cameraControls = true,
  ar = false,
  showFullscreenButton = false,
}: ModelViewerElementProps) {
  const viewerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!isModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsModalOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const handleLoad = () => setLoadError(false);
    const handleError = () => setLoadError(true);
    viewer.addEventListener('load', handleLoad);
    viewer.addEventListener('error', handleError);
    void import('@google/model-viewer');

    return () => {
      viewer.removeEventListener('load', handleLoad);
      viewer.removeEventListener('error', handleError);
    };
  }, [src]);

  return (
    <div className={`relative ${className ?? ''}`} style={style}>
      <model-viewer
        ref={viewerRef}
        src={src}
        style={{ width: '100%', height: '100%' }}
        camera-controls={cameraControls ? '' : undefined}
        auto-rotate={autoRotate ? '' : undefined}
        ar={ar ? '' : undefined}
        ar-modes={ar ? 'webxr scene-viewer quick-look' : undefined}
        shadow-intensity="1"
      />
      {showFullscreenButton && (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          aria-label="Lihat model 3D ukuran besar"
          title="Lihat ukuran besar"
          className="absolute bottom-3 right-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <ViewerIcon name="maximize" size={16} />
        </button>
      )}
      {loadError && (
        <p
          role="alert"
          className="absolute inset-x-3 bottom-14 rounded-lg bg-white/95 p-3 text-sm text-danger shadow"
        >
          Model 3D gagal dimuat. Periksa file GLB/glTF dan akses CDN (termasuk izin CORS).
        </p>
      )}
      {isModalOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Model 3D ukuran besar"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          >
            <div className="relative h-[90vh] w-[90vw] overflow-hidden rounded-xl border border-white/15 bg-black shadow-2xl">
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Tutup model 3D"
                className="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <ViewerIcon name="close" size={22} />
              </button>
              <ModelViewerElement
                src={src}
                className="h-full w-full"
                autoRotate={autoRotate}
                cameraControls={cameraControls}
                ar={ar}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
