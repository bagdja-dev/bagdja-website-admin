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
      if (!res.ok) {
        setWebsites([]);
        setActiveWebsite(null);
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
    } catch {
      setWebsites([]);
      setActiveWebsite(null);
    } finally {
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
