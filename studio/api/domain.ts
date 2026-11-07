import { jsonBody, studioRequest, websitePath } from './client';
import type { WebsiteDto } from './types';

export interface DnsRecordDto {
  recordType: string;
  recordName: string;
  recordValue: string;
}

/** `POST /api/websites/:id/domain/verify` — idempoten (memakai ulang token lama). */
export interface DomainVerifyInfoDto extends DnsRecordDto {
  dnsTarget: DnsRecordDto;
}

/** `PATCH /api/websites/:id` — slug (admin+). 409 bila slug sudah dipakai. */
export function updateWebsiteSlug(websiteId: string, slug: string): Promise<WebsiteDto> {
  return studioRequest<WebsiteDto>(websitePath(websiteId), { method: 'PATCH', ...jsonBody({ slug }) });
}

/** `PATCH /api/websites/:id` — menyimpan domain kustom baru (verifikasi di-reset oleh API). */
export function saveWebsiteDomain(websiteId: string, domain: string): Promise<WebsiteDto> {
  return studioRequest<WebsiteDto>(websitePath(websiteId), { method: 'PATCH', ...jsonBody({ domain }) });
}

export function startDomainVerification(websiteId: string): Promise<DomainVerifyInfoDto> {
  return studioRequest<DomainVerifyInfoDto>(websitePath(websiteId, '/domain/verify'), { method: 'POST' });
}

export function checkDomainVerification(websiteId: string): Promise<unknown> {
  return studioRequest<unknown>(websitePath(websiteId, '/domain/check'), { method: 'POST' });
}

/** `DELETE /api/websites/:id/domain` — melepas domain (JANGAN PATCH `domain:null`). */
export function removeWebsiteDomain(websiteId: string): Promise<unknown> {
  return studioRequest<unknown>(websitePath(websiteId, '/domain'), { method: 'DELETE' });
}

/** `PATCH /api/websites/:id` — status publik website (admin+). */
export function updateWebsiteActive(websiteId: string, isActive: boolean): Promise<WebsiteDto> {
  return studioRequest<WebsiteDto>(websitePath(websiteId), { method: 'PATCH', ...jsonBody({ is_active: isActive }) });
}

/** `DELETE /api/websites/:id` — hapus website permanen (owner saja). */
export function deleteWebsite(websiteId: string): Promise<unknown> {
  return studioRequest<unknown>(websitePath(websiteId), { method: 'DELETE' });
}
