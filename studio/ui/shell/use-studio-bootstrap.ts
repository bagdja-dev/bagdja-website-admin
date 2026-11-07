'use client';

import { useEffect } from 'react';

import { useModulesStore } from '@/studio/stores/modules-store';
import { useActiveWebsite, useWebsiteStore } from '@/studio/stores/website-store';

/** Muat daftar website sekali, lalu modul setiap kali website aktif berganti. */
export function useStudioBootstrap(): void {
  const load = useWebsiteStore((s) => s.load);
  const active = useActiveWebsite();
  const loadModules = useModulesStore((s) => s.loadForWebsite);
  const modulesWebsiteId = useModulesStore((s) => s.website?.id ?? null);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (active && active.website.id !== modulesWebsiteId) void loadModules(active.website);
  }, [active, loadModules, modulesWebsiteId]);
}
