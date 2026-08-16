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

/**
 * Auto-subscribe user ke plan free jika belum punya subscription.
 * Non-blocking pada login flow — jika gagal, user tetap bisa login.
 *
 * Pola diadaptasi persis dari POS
 * (`app/pos/bagdja-pos-admin/app/auth/callback/route.ts`), karena
 * Website Builder mengikuti blueprint POS untuk subscription/wallet
 * (lihat `app/website/bagdja-website-api/subscription-implementasi-plan.md`
 * §2 Blueprint Pola yang Diadopsi dari POS).
 *
 * Endpoint tujuan: `POST {apiBase}/api/subscriptions/auto-subscribe-free`
 * (website-api `SubscriptionsController.autoSubscribeFree`, JwtAuthGuard +
 * @CurrentUser() — idempotent, feature-flag AUTO_SUBSCRIBE_FREE_ENABLED).
 */
export async function attemptAutoSubscribeFree(accessToken: string): Promise<void> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5003';

  try {
    const res = await fetch(`${apiBase}/api/subscriptions/auto-subscribe-free`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.warn(
        '[Auto-Subscribe] Non-blocking attempt failed (status: ' +
          res.status +
          '). Login continues anyway.',
      );
      console.warn('[Auto-Subscribe] Error:', errorBody);
      return;
    }

    const result = (await res.json()) as {
      autoSubscribed: boolean;
      reason?: string;
      subscription?: unknown;
    };

    if (result.autoSubscribed) {
      console.log('[Auto-Subscribe] Success: User auto-subscribed to free plan');
    } else {
      console.log('[Auto-Subscribe] Skipped:', result.reason || 'unknown reason');
    }
  } catch (err) {
    console.error(
      '[Auto-Subscribe] Network/parse error (non-blocking):',
      err instanceof Error ? err.message : String(err),
    );
    // Continue login anyway — auto-subscribe is non-blocking
  }
}
