'use client';

import { useEffect, useRef, useState, type Ref } from 'react';

/** Lebar viewport "desktop" yang dirender renderer sebelum diperkecil agar muat di kolom pratinjau. */
export const DESKTOP_VIEWPORT = 1280;

export interface ScaledFrameProps {
  src: string;
  title: string;
  /** Tinggi tampak (px). Kosongkan untuk mengisi tinggi induk (`h-full`). */
  height?: number;
  /** Lebar viewport iframe; diperkecil (tidak pernah diperbesar) mengikuti lebar kontainer. */
  viewportWidth?: number;
  iframeRef?: Ref<HTMLIFrameElement>;
  onLoad?: () => void;
}

/**
 * iframe dengan viewport tetap (default 1280px) yang diskalakan ke lebar kontainer,
 * jadi pratinjau desktop selalu menampilkan layout desktop asli, bukan versi sempit.
 * Dipakai semua pratinjau Studio (detail template, tab Template, editor halaman).
 */
export function ScaledFrame({ src, title, height, viewportWidth = DESKTOP_VIEWPORT, iframeRef, onLoad }: ScaledFrameProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ scale: 1, boxHeight: height ?? 0 });

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const update = () =>
      setSize({ scale: Math.min(1, box.clientWidth / viewportWidth) || 1, boxHeight: height ?? box.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(box);
    return () => observer.disconnect();
  }, [viewportWidth, height]);

  return (
    <div ref={boxRef} className={`relative w-full overflow-hidden bg-white ${height ? '' : 'h-full'}`} style={height ? { height } : undefined}>
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        onLoad={onLoad}
        className="absolute left-0 top-0 block border-0 bg-white"
        style={{
          width: viewportWidth,
          height: size.boxHeight / size.scale,
          transform: `scale(${size.scale})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  );
}
