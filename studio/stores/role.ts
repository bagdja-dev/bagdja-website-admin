'use client';

import type { TenantRole } from '@/studio/api/types';
import { hasMinRole } from '@/studio/lib/roles';

import { useActiveRole } from './website-store';

export { hasMinRole };

/** Role user di website aktif sudah memenuhi `minRole`? */
export function useHasMinRole(minRole: TenantRole): boolean {
  const role = useActiveRole();
  return hasMinRole(role, minRole);
}

export function useIsOwner(): boolean {
  return useActiveRole() === 'owner';
}
