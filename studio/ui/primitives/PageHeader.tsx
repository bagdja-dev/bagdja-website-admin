'use client';

import { useEffect, type ReactNode } from 'react';

import { usePageMetaStore } from '@/studio/stores/page-meta-store';

export interface PageHeaderProps {
  title: string;
  titleHref?: string;
  titlePrefix?: { label: string; href: string };
  description?: ReactNode;
  /** Jumlah data, ditampilkan di samping judul (mis. daftar). */
  count?: number;
  /** Aksi di kanan topbar (satu tombol utama + tombol garis). */
  actions?: ReactNode;
  back?: { href: string; label: string };
}

/**
 * Mendaftarkan judul halaman ke topbar Studio (bukan render di konten), sesuai
 * artboard: header putih berisi judul 18px + deskripsi + aksi. Tidak merender apa pun.
 */
export function PageHeader({ title, titleHref, titlePrefix, description, count, actions, back }: PageHeaderProps) {
  const setMeta = usePageMetaStore((s) => s.setMeta);

  useEffect(() => {
    setMeta({ title, titleHref, titlePrefix, description, count, actions, back });
  });

  useEffect(() => () => setMeta(null), [setMeta]);

  return null;
}
