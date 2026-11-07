import type { MouseEvent } from 'react';

/** Selector elemen interaktif di dalam baris: kliknya tidak boleh ikut membuka baris. */
const INTERACTIVE = 'a, button, input, select, textarea, label, [role="switch"], [role="checkbox"], [role="menuitem"], [data-row-click-ignore]';

/**
 * Handler klik baris/kartu Data List. Mengabaikan klik pada elemen interaktif
 * (checkbox, switch, tombol, tautan) dan saat pengguna sedang menyeleksi teks.
 * Akses keyboard tetap lewat tautan di kolom judul.
 */
export function rowClickHandler<T>(row: T, onRowClick?: (row: T) => void) {
  if (!onRowClick) return undefined;
  return (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest(INTERACTIVE)) return;
    if (typeof window !== 'undefined' && window.getSelection()?.toString()) return;
    onRowClick(row);
  };
}
