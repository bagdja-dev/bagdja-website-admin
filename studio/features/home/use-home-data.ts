'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  fetchChatUnreadCount,
  fetchNewOrderCount,
  fetchOnboardingStatus,
  type WebsiteOnboardingStatusDto,
} from '@/studio/api/home';
import type { ModuleKey, WebsiteDto } from '@/studio/api/types';

import { loadLegacyOnboardingStatus } from './legacy-onboarding-status';

/** Data Beranda. `null` = belum/ tidak bisa dimuat → langkah dianggap belum selesai. */
export interface HomeSignals {
  /** Checklist §3.6 dari `GET onboarding-status` (atau fallback multi-request bila 404). */
  status: WebsiteOnboardingStatusDto | null;
  newOrders: number | null;
  unreadChats: number | null;
}

const EMPTY: HomeSignals = { status: null, newOrders: null, unreadChats: null };

async function safe<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch {
    return null;
  }
}

async function loadStatus(website: WebsiteDto, enabled: ReadonlySet<ModuleKey>): Promise<WebsiteOnboardingStatusDto> {
  const status = await fetchOnboardingStatus(website.id);
  return status ?? loadLegacyOnboardingStatus(website, enabled);
}

/** Muat status checklist + statistik secara paralel; statistik hanya untuk modul yang aktif. */
export function useHomeData(website: WebsiteDto | null, enabled: readonly ModuleKey[]): {
  signals: HomeSignals;
  loading: boolean;
  reload: () => void;
  setLinkSharedAt: (iso: string) => void;
} {
  const [signals, setSignals] = useState<HomeSignals>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const enabledKey = [...enabled].sort().join(',');

  useEffect(() => {
    if (!website) return;
    let cancelled = false;
    const enabledSet = new Set(enabledKey.split(',') as ModuleKey[]);
    const id = website.id;
    setLoading(true);

    void Promise.all([
      safe(() => loadStatus(website, enabledSet)),
      enabledSet.has('orders') ? safe(() => fetchNewOrderCount(id)) : Promise.resolve(null),
      enabledSet.has('customer_chat') ? safe(() => fetchChatUnreadCount(id)) : Promise.resolve(null),
    ]).then(([status, newOrders, unreadChats]) => {
      if (cancelled) return;
      setSignals({ status, newOrders, unreadChats });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [website, enabledKey, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const setLinkSharedAt = useCallback((iso: string) => {
    setSignals((prev) => (prev.status ? { ...prev, status: { ...prev.status, linkSharedAt: prev.status.linkSharedAt ?? iso } } : prev));
  }, []);
  return { signals, loading, reload, setLinkSharedAt };
}
