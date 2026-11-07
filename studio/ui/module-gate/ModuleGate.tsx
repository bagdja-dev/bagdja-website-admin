'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { moduleForPath } from '@/studio/lib/route-modules';
import { useModulesStore } from '@/studio/stores/modules-store';

import { ListSkeleton } from '../data-list/ListSkeleton';
import { ModuleDisabledState } from './ModuleDisabledState';

/** Gate rute → modul (studio/lib/route-modules.ts) di layout Studio. */
export function ModuleGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const moduleKey = moduleForPath(pathname);
  const status = useModulesStore((s) => s.status);
  const enabled = useModulesStore((s) => (moduleKey ? s.enabledModules.includes(moduleKey) : true));

  if (!moduleKey) return <>{children}</>;
  if (status === 'idle' || status === 'loading') return <ListSkeleton rows={4} />;
  if (!enabled) return <ModuleDisabledState moduleKey={moduleKey} />;
  return <>{children}</>;
}
