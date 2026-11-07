'use client';

import { useMemo } from 'react';

import { hasMinRole } from '@/studio/lib/roles';
import { useModulesStore } from '@/studio/stores/modules-store';
import { useActiveRole } from '@/studio/stores/website-store';

import { NAV_GROUPS, type NavGroup, type NavItem } from './nav-registry';

export type VisibleNavItem = NavItem;

export interface VisibleNavGroup extends Omit<NavGroup, 'items'> {
  items: VisibleNavItem[];
}

/** Menu sesuai modul aktif + role; kelompok kosong (termasuk judulnya) disembunyikan. */
export function useVisibleNav(): VisibleNavGroup[] {
  const role = useActiveRole();
  const enabledModules = useModulesStore((s) => s.enabledModules);

  return useMemo(() => {
    const enabled = new Set(enabledModules);
    const isVisible = (item: NavItem): boolean =>
      (!item.module || enabled.has(item.module)) &&
      (!item.ownerOnly || role === 'owner') &&
      (!item.minRole || hasMinRole(role, item.minRole));

    return NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter(isVisible) })).filter(
      (group) => group.items.length > 0,
    );
  }, [enabledModules, role]);
}
