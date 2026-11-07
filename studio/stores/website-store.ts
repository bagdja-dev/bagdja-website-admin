'use client';

import { create } from 'zustand';

import { errorMessage, isApiError } from '@/studio/api/client';
import type { TenantRole, UserWebsiteDto, WebsiteDto } from '@/studio/api/types';
import { fetchUserWebsites } from '@/studio/api/websites';
import { ACTIVE_WEBSITE_STORAGE_KEY, readStorage, writeStorage } from '@/studio/lib/storage';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface RefreshWebsitesOptions {
  /** Website yang harus aktif setelah refresh (mis. baru dibuat). */
  preferWebsiteId?: string;
}

interface WebsiteState {
  websites: UserWebsiteDto[];
  activeWebsiteId: string | null;
  status: LoadStatus;
  errorMessage: string | null;
  patchWebsite: (websiteId: string, patch: Partial<WebsiteDto>) => void;
  /** Muat sekali (dipanggil oleh bootstrap layout). */
  load: () => Promise<void>;
  refresh: (options?: RefreshWebsitesOptions) => Promise<void>;
  /**
   * Ganti website aktif. Membaca daftar TERKINI dari store (bukan closure),
   * dan bila id belum ada di daftar (mis. baru dibuat) memuat ulang dulu.
   * Mengembalikan `true` bila website tersebut benar-benar aktif.
   */
  switchWebsite: (websiteId: string) => Promise<boolean>;
}

let requestSeq = 0;

function pickActiveId(websites: UserWebsiteDto[], candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    if (candidate && websites.some((w) => w.website.id === candidate)) return candidate;
  }
  return websites[0]?.website.id ?? null;
}

export const useWebsiteStore = create<WebsiteState>()((set, get) => ({
  websites: [],
  activeWebsiteId: null,
  status: 'idle',
  errorMessage: null,
  patchWebsite: (websiteId, patch) => set((state) => ({
    websites: state.websites.map((entry) => (
      entry.website.id === websiteId
        ? { ...entry, website: { ...entry.website, ...patch } }
        : entry
    )),
  })),

  load: async () => {
    if (get().status !== 'idle') return;
    await get().refresh();
  },

  refresh: async (options) => {
    const seq = ++requestSeq;
    if (get().websites.length === 0) set({ status: 'loading', errorMessage: null });
    try {
      const websites = await fetchUserWebsites();
      if (seq !== requestSeq) return;
      const activeWebsiteId = pickActiveId(websites, [
        options?.preferWebsiteId,
        get().activeWebsiteId,
        readStorage(ACTIVE_WEBSITE_STORAGE_KEY),
      ]);
      if (activeWebsiteId) writeStorage(ACTIVE_WEBSITE_STORAGE_KEY, activeWebsiteId);
      set({ websites, activeWebsiteId, status: 'ready', errorMessage: null });
    } catch (error) {
      if (seq !== requestSeq) return;
      // 401: apiClient sudah mengarahkan ke login — biarkan tetap "loading"
      // supaya tidak ada kilasan layar galat sebelum navigasi selesai.
      if (isApiError(error) && error.status === 401) return;
      set({ status: 'error', errorMessage: errorMessage(error, 'Gagal memuat daftar website.') });
    }
  },

  switchWebsite: async (websiteId) => {
    if (!get().websites.some((w) => w.website.id === websiteId)) {
      await get().refresh({ preferWebsiteId: websiteId });
    }
    const exists = get().websites.some((w) => w.website.id === websiteId);
    if (!exists) return false;
    writeStorage(ACTIVE_WEBSITE_STORAGE_KEY, websiteId);
    set({ activeWebsiteId: websiteId });
    return true;
  },
}));

export function useActiveWebsite(): UserWebsiteDto | null {
  return useWebsiteStore((s) => s.websites.find((w) => w.website.id === s.activeWebsiteId) ?? null);
}

export function useActiveWebsiteId(): string | null {
  return useWebsiteStore((s) => s.activeWebsiteId);
}

export function useActiveRole(): TenantRole | null {
  return useWebsiteStore((s) => s.websites.find((w) => w.website.id === s.activeWebsiteId)?.role ?? null);
}
