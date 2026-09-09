'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { UserWebsite } from '../lib/types';

interface WebsiteContextValue {
  websites: UserWebsite[];
  activeWebsite: UserWebsite | null;
  websiteId: string | null;
  role: string | null;
  loading: boolean;
  switchWebsite: (websiteId: string) => void;
  refresh: () => Promise<void>;
}

const WebsiteContext = createContext<WebsiteContextValue | null>(null);

export function WebsiteProvider({ children }: { children: ReactNode }) {
  const [websites, setWebsites] = useState<UserWebsite[]>([]);
  const [activeWebsite, setActiveWebsite] = useState<UserWebsite | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/user/websites');

      // 401 = sesi tidak valid (token expired/rusak) — sebelumnya diperlakukan
      // sama seperti "belum punya website" (state kosong), jadi user yang
      // sesinya expired melihat NoWebsiteState yang menyesatkan alih-alih
      // diarahkan login ulang. Redirect di sini, JANGAN lanjut set state
      // apa pun, biar tidak ada flash UI keliru sebelum navigasi selesai.
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/auth/login?next=${next}`;
        }
        // Sengaja TIDAK setLoading(false) — biar UI tetap tampil loading
        // (bukan flash NoWebsiteState) sampai navigasi browser ke /auth/login
        // benar-benar selesai.
        return;
      }

      if (!res.ok) {
        setWebsites([]);
        setActiveWebsite(null);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as UserWebsite[];
      setWebsites(data);

      const savedId =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem('bw_active_website')
          : null;
      const found = data.find((w) => w.website.id === savedId);
      setActiveWebsite(found ?? data[0] ?? null);
      setLoading(false);
    } catch {
      setWebsites([]);
      setActiveWebsite(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const switchWebsite = useCallback(
    (websiteId: string) => {
      const found = websites.find((w) => w.website.id === websiteId);
      if (found) {
        setActiveWebsite(found);
        localStorage.setItem('bw_active_website', websiteId);
      }
    },
    [websites],
  );

  const value = useMemo(
    () => ({
      websites,
      activeWebsite,
      websiteId: activeWebsite?.website.id ?? null,
      role: activeWebsite?.role ?? null,
      loading,
      switchWebsite,
      refresh,
    }),
    [websites, activeWebsite, loading, switchWebsite, refresh],
  );

  return (
    <WebsiteContext.Provider value={value}>{children}</WebsiteContext.Provider>
  );
}

export function useWebsiteContext() {
  const ctx = useContext(WebsiteContext);
  if (!ctx) {
    throw new Error('useWebsiteContext must be used within WebsiteProvider');
  }
  return ctx;
}
