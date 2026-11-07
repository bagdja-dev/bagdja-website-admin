'use client';

import { useEffect, useState } from 'react';

export interface SessionUser {
  userId: string;
  email?: string;
  username?: string;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function parseUser(raw: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SessionUser>;
    return typeof value.userId === 'string' ? (value as SessionUser) : null;
  } catch {
    return null;
  }
}

/** Membaca cookie `bw_user` (non-httpOnly) yang ditulis `/auth/callback`. */
export function useSessionUser(): SessionUser | null {
  const [user, setUser] = useState<SessionUser | null>(null);
  useEffect(() => {
    setUser(parseUser(readCookie('bw_user')));
  }, []);
  return user;
}

export function displayNameOf(user: SessionUser | null): string {
  return user?.username ?? user?.email ?? 'Pengguna';
}
