import { jsonBody, studioRequest } from './client';
import type {
  BusinessProfileId,
  CreateWebsiteRequestDto,
  CreatedWebsiteDto,
  WebsiteSlugAvailabilityDto,
  WebsiteTemplateDto,
} from './types';

/** `POST /api/business-profiles/:id/waitlist` — idempoten. */
export function registerBusinessProfileInterest(profileId: BusinessProfileId): Promise<{ registered: true }> {
  return studioRequest<{ registered: true }>(`/api/business-profiles/${encodeURIComponent(profileId)}/waitlist`, {
    method: 'POST',
  });
}

/** `GET /api/templates` — dengan `businessProfile` hanya template yang cocok. */
export function fetchTemplates(businessProfile?: BusinessProfileId): Promise<WebsiteTemplateDto[]> {
  const query = businessProfile ? `?business_profile=${encodeURIComponent(businessProfile)}` : '';
  return studioRequest<WebsiteTemplateDto[]>(`/api/templates${query}`);
}

/** `GET /api/websites/slug-availability?slug=` */
export function checkWebsiteSlug(slug: string, init?: RequestInit): Promise<WebsiteSlugAvailabilityDto> {
  return studioRequest<WebsiteSlugAvailabilityDto>(
    `/api/websites/slug-availability?slug=${encodeURIComponent(slug)}`,
    init,
  );
}

/** `POST /api/websites` dengan `business_profile` (preset modul diisi API). */
export function createWebsite(body: CreateWebsiteRequestDto): Promise<CreatedWebsiteDto> {
  return studioRequest<CreatedWebsiteDto>('/api/websites', { method: 'POST', ...jsonBody(body) });
}

function readError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
    return payload.error;
  }
  return fallback;
}

/** Upload multipart `POST /api/uploads/logo` (route bersama, bukan lewat proxy JSON). */
export async function uploadLogo(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/uploads/logo', { method: 'POST', body: formData });
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // ditangani di bawah
  }
  if (!response.ok) throw new Error(readError(payload, 'Logo gagal diunggah.'));
  if (!payload || typeof payload !== 'object' || !('url' in payload) || typeof payload.url !== 'string') {
    throw new Error('Respons unggah logo tidak memuat URL.');
  }
  return payload.url;
}
