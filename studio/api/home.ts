/**
 * Endpoint yang dipakai Beranda (checklist §3.6 + ringkasan).
 * Checklist = satu panggilan `onboarding-status` (template-contract.md §1.3);
 * fallback multi-request untuk API lama ada di `features/home/legacy-onboarding-status.ts`.
 */
import { isNotFound, jsonBody, studioRequest, websitePath } from './client';
import type { PaginatedMetaResponseDto, WebsiteDto } from './types';

/** `GET /api/websites/:id/onboarding-status` — sama dengan `WebsiteOnboardingStatusDto` di API. */
export interface WebsiteOnboardingStatusDto {
  hasLogo: boolean;
  /** Ada section Home buatan user / section contoh template yang isinya sudah diubah. */
  homeEdited: boolean;
  /** Ada produk/layanan yang bukan contoh template (`metadata.is_seed`). */
  hasOwnProduct: boolean;
  /** Produk/layanan contoh template yang masih ada. */
  seedProductCount: number;
  primaryLocationComplete: boolean;
  hasFlow: boolean;
  hasGathering: boolean;
  /** Anggota tim aktif, termasuk owner. */
  teamCount: number;
  /** ISO 8601; `null` = link belum pernah disalin dari Beranda. */
  linkSharedAt: string | null;
}

/** `POST /api/websites/:id/onboarding-status/link-shared` (idempotent). */
export interface WebsiteOnboardingLinkSharedResponseDto {
  linkSharedAt: string;
}

/** `GET /api/chat/:websiteId/unread-count`. */
export interface ChatUnreadCountDto {
  unread_count: number;
}

/** `null` bila endpoint belum ter-deploy (404) → pakai fallback multi-request. */
export async function fetchOnboardingStatus(websiteId: string): Promise<WebsiteOnboardingStatusDto | null> {
  try {
    return await studioRequest<WebsiteOnboardingStatusDto>(websitePath(websiteId, '/onboarding-status'));
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/** `null` bila endpoint belum ter-deploy (404) → simpan di localStorage (fallback). */
export async function markOnboardingLinkShared(websiteId: string): Promise<WebsiteOnboardingLinkSharedResponseDto | null> {
  try {
    return await studioRequest<WebsiteOnboardingLinkSharedResponseDto>(
      websitePath(websiteId, '/onboarding-status/link-shared'),
      { method: 'POST' },
    );
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function fetchChatUnreadCount(websiteId: string): Promise<number> {
  const res = await studioRequest<Partial<ChatUnreadCountDto>>(`/api/chat/${encodeURIComponent(websiteId)}/unread-count`);
  return res.unread_count ?? 0;
}

/** Pesanan baru = transaksi `PENDING_PAYMENT,PENDING` (belum diproses seller). */
export async function fetchNewOrderCount(websiteId: string): Promise<number> {
  const res = await studioRequest<PaginatedMetaResponseDto>(
    websitePath(websiteId, '/transactions?page=1&size=1&status=PENDING_PAYMENT,PENDING'),
  );
  return res.meta.total;
}

/** `PATCH /api/websites/:id` (admin) — dipakai untuk logo dari checklist. */
export function updateWebsiteLogo(websiteId: string, logoUrl: string): Promise<WebsiteDto> {
  return studioRequest<WebsiteDto>(websitePath(websiteId), { method: 'PATCH', ...jsonBody({ logo_url: logoUrl }) });
}
