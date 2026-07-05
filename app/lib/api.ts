/**
 * Server-side API client for Bagdja Website API.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5003';

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { token, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...rest,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `API error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
