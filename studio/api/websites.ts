import { jsonBody, studioRequest, websitePath } from './client';
import type { UserWebsiteDto, WebsiteDto, WebsiteFooterSettingsDto, WebsiteThemeConfigDto } from './types';

/** `GET /api/user/websites` — 401 diarahkan ke login oleh apiClient. */
export function fetchUserWebsites(): Promise<UserWebsiteDto[]> {
  return studioRequest<UserWebsiteDto[]>('/api/user/websites');
}

/** `PATCH /api/websites/:id` — footer global yang dirender seluruh template. */
export function updateWebsiteFooterSettings(
  websiteId: string,
  footerSettings: WebsiteFooterSettingsDto,
): Promise<WebsiteDto> {
  return studioRequest<WebsiteDto>(websitePath(websiteId), {
    method: 'PATCH',
    ...jsonBody({ footer_settings: footerSettings }),
  });
}

/** `PATCH /api/websites/:id` — warna dan tipografi website. */
export function updateWebsiteTheme(websiteId: string, theme: WebsiteThemeConfigDto): Promise<WebsiteDto> {
  return studioRequest<WebsiteDto>(websitePath(websiteId), {
    method: 'PATCH',
    ...jsonBody({ theme }),
  });
}

/** `PATCH /api/websites/:id` — template aktif website. */
export function updateWebsiteTemplate(websiteId: string, templateId: string): Promise<WebsiteDto> {
  return studioRequest<WebsiteDto>(websitePath(websiteId), {
    method: 'PATCH',
    ...jsonBody({ template_id: templateId }),
  });
}

/** Kolom identitas & kontak — API hanya mengizinkan owner mengubahnya (403 untuk role lain). */
export interface WebsiteIdentityPayload {
  name: string;
  tagline: string | null;
  logo_url: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  social_links: Record<string, unknown>;
  opening_hours: Record<string, unknown>;
}

/** `PATCH /api/websites/:id` — identitas & kontak website (owner saja). */
export function updateWebsiteIdentity(websiteId: string, identity: WebsiteIdentityPayload): Promise<WebsiteDto> {
  return studioRequest<WebsiteDto>(websitePath(websiteId), {
    method: 'PATCH',
    ...jsonBody(identity),
  });
}

/** Versi template designer — mirror `WebsiteTemplateVersionStatusResponseDto` (Website API). */
export interface WebsiteTemplateVersionSummaryDto {
  versionId: string;
  version: string;
  status: 'published' | 'deprecated' | 'revoked';
  changelog: string | null;
  publishedAt: string;
}

export interface WebsiteTemplateVersionStatusDto {
  websiteId: string;
  templateId: string | null;
  source: 'builtin' | 'package' | null;
  /** Versi yang terpasang; null untuk template bawaan. */
  current: WebsiteTemplateVersionSummaryDto | null;
  /** Versi published terbaru; null untuk template bawaan. */
  latest: WebsiteTemplateVersionSummaryDto | null;
  updateAvailable: boolean;
}

export function fetchTemplateVersionStatus(websiteId: string): Promise<WebsiteTemplateVersionStatusDto> {
  return studioRequest<WebsiteTemplateVersionStatusDto>(`${websitePath(websiteId)}/template-version`);
}

/** Update eksplisit ke versi yang lebih baru — versi template tidak pernah naik otomatis. */
export function upgradeTemplateVersion(websiteId: string, versionId: string): Promise<WebsiteTemplateVersionStatusDto> {
  return studioRequest<WebsiteTemplateVersionStatusDto>(`${websitePath(websiteId)}/template-version/upgrade`, {
    method: 'POST',
    ...jsonBody({ versionId }),
  });
}
