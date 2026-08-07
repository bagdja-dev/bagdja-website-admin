/**
 * Server-side helper to call Website API with session token from httpOnly cookie.
 */
import { getSession } from './session';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5003';

export async function backendFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T | null; status: number; error?: string }> {
  const { token } = await getSession();

  if (!token) {
    console.error(`[backendFetch] ${path} -> no bw_token cookie on request`);
    return { data: null, status: 401, error: 'Not authenticated' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
    Authorization: `Bearer ${token}`,
  };

  try {
    // `cache: 'no-store'` wajib — tanpa ini, Next.js App Router men-cache
    // GET fetch ke API (Data Cache) meski route handler pemanggilnya
    // dynamic (mis. karena pakai cookies()). Data di sini per-tenant dan
    // sering berubah (create/update/delete), jadi tidak boleh di-cache.
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[backendFetch] ${options.method ?? 'GET'} ${path} -> ${res.status}: ${body || res.statusText}`);
      return { data: null, status: res.status, error: body || res.statusText };
    }

    if (res.status === 204) {
      return { data: null, status: res.status };
    }

    const data = (await res.json()) as T;
    return { data, status: res.status };
  } catch (err) {
    return {
      data: null,
      status: 500,
      error: err instanceof Error ? err.message : 'Request failed',
    };
  }
}

/**
 * Trigger user upsert on Website API (via any authenticated endpoint).
 * Called right after OAuth callback so user is saved even before dashboard loads.
 */
export async function syncUserToBackend(accessToken: string): Promise<boolean> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5003';

  try {
    const res = await fetch(`${apiBase}/api/user/websites`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('[syncUserToBackend] failed:', res.status, await res.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error('[syncUserToBackend] error:', err);
    return false;
  }
}
