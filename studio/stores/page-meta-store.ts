'use client';

import type { ReactNode } from 'react';
import { create } from 'zustand';

export interface PageMeta {
  title: string;
  description?: ReactNode;
  count?: number;
  actions?: ReactNode;
  back?: { href: string; label: string };
}

interface PageMetaState {
  meta: PageMeta | null;
  setMeta: (meta: PageMeta | null) => void;
}

/**
 * Judul/aksi halaman yang ditampilkan di TOPBAR (artboard Pesanan/Fitur/Langganan:
 * judul 18px + deskripsi di header putih). Diisi oleh `PageHeader`.
 */
export const usePageMetaStore = create<PageMetaState>()((set) => ({
  meta: null,
  setMeta: (meta) => set({ meta }),
}));
