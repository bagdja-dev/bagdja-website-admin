import type { TenantRole } from '@/studio/api/types';

/** owner > admin > editor > viewer (sama dengan dashboard lama). */
export const ROLE_LEVEL: Readonly<Record<TenantRole, number>> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  owner: 3,
};

export const ROLE_LABEL: Readonly<Record<TenantRole, string>> = {
  owner: 'Pemilik',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Pengamat',
};

export function isTenantRole(value: unknown): value is TenantRole {
  return typeof value === 'string' && value in ROLE_LEVEL;
}

/** `false` bila role tidak dikenal/null — gagal tertutup. */
export function hasMinRole(role: string | null | undefined, minRole: TenantRole): boolean {
  if (!isTenantRole(role)) return false;
  return ROLE_LEVEL[role] >= ROLE_LEVEL[minRole];
}
