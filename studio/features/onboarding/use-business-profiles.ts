'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { errorMessage } from '@/studio/api/client';
import { fetchBusinessProfiles } from '@/studio/api/modules';
import { registerBusinessProfileInterest } from '@/studio/api/onboarding';
import type { BusinessProfileDto, BusinessProfileId, ModuleInfoDto } from '@/studio/api/types';
import { CORE_MODULES } from '@/studio/lib/modules';

export type WaitlistState = 'idle' | 'saving' | 'done' | 'error';
export type SelectableProfileId = Exclude<BusinessProfileId, 'legacy'>;

export interface BusinessProfilesState {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  profiles: BusinessProfileDto[];
  reload: () => void;
  waitlist: Partial<Record<SelectableProfileId, WaitlistState>>;
  joinWaitlist: (profileId: SelectableProfileId) => Promise<void>;
  /** Label modul yang langsung aktif (tanpa modul inti); modul segera hadir diberi keterangan. */
  moduleSummary: (profileId: SelectableProfileId) => string[];
}

/** `GET /api/business-profiles` + "Kabari saya" (`POST …/waitlist`, idempoten). */
export function useBusinessProfiles(): BusinessProfilesState {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<BusinessProfileDto[]>([]);
  const [modules, setModules] = useState<ModuleInfoDto[]>([]);
  const [waitlist, setWaitlist] = useState<Partial<Record<SelectableProfileId, WaitlistState>>>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    fetchBusinessProfiles()
      .then((res) => {
        if (cancelled) return;
        if (!res) throw new Error('Daftar jenis bisnis belum tersedia di server.');
        setProfiles([...res.profiles].sort((a, b) => a.sortOrder - b.sortOrder));
        setModules(res.modules);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(errorMessage(err, 'Jenis bisnis gagal dimuat.'));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const joinWaitlist = useCallback(async (profileId: SelectableProfileId) => {
    setWaitlist((prev) => ({ ...prev, [profileId]: 'saving' }));
    try {
      await registerBusinessProfileInterest(profileId);
      setWaitlist((prev) => ({ ...prev, [profileId]: 'done' }));
    } catch {
      setWaitlist((prev) => ({ ...prev, [profileId]: 'error' }));
    }
  }, []);

  const moduleByKey = useMemo(() => new Map(modules.map((m) => [m.key, m])), [modules]);

  const moduleSummary = useCallback(
    (profileId: SelectableProfileId): string[] => {
      const profile = profiles.find((p) => p.id === profileId);
      if (!profile) return [];
      return profile.defaultModules
        .filter((key) => !CORE_MODULES.includes(key))
        .map((key) => {
          const info = moduleByKey.get(key);
          const label = info?.label ?? key;
          return info?.status === 'coming_soon' ? `${label} (segera hadir)` : label;
        });
    },
    [moduleByKey, profiles],
  );

  return {
    status,
    error,
    profiles,
    reload: () => setAttempt((n) => n + 1),
    waitlist,
    joinWaitlist,
    moduleSummary,
  };
}
