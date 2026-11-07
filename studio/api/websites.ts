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
