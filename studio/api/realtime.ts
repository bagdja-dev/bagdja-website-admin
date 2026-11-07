import type { RealtimeTokenResponseDto } from './types';

/**
 * `GET /api/realtime/ws-token` (route handler bersama, bukan lewat proxy).
 * Mengembalikan token atau `null` bila layanan realtime tidak tersedia.
 */
export async function fetchRealtimeToken(): Promise<string | null> {
  const response = await fetch('/api/realtime/ws-token', { cache: 'no-store' });
  if (!response.ok) throw new Error(`ws-token ${response.status}`);
  const data = (await response.json()) as RealtimeTokenResponseDto;
  return data.access_token ?? data.accessToken ?? null;
}
