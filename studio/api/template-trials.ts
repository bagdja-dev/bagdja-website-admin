/**
 * Uji template kandidat sebelum terbit (plan/website-builder/template-candidate-trial-plan.md).
 * Tipe = DTO `TemplateCandidateResponseDto` / `WebsiteTemplateTrialResponseDto` di bagdja-website-api.
 */
import { jsonBody, studioRequest, websitePath } from './client';
import type { WebsiteThemeConfigDto } from './types';

export type TemplateCandidateStatus = 'checked' | 'submitted' | 'in_review' | 'publishing' | 'publish_failed';

export interface TemplateCandidateDto {
  submissionId: string;
  slug: string;
  name: string;
  version: string;
  description: string;
  changelog: string;
  status: TemplateCandidateStatus;
  statusLabel: string;
  viewerRole: 'designer' | 'reviewer';
  businessProfiles: string[];
  pageOverrides: string[];
  hasClientScript: boolean;
  previewImageUrl: string | null;
  /** Versi terbit terbaru template yang sama; null = template baru. */
  publishedVersion: string | null;
  submittedAt: string | null;
  /** Palet bawaan versi kandidat (`manifest.theme`). */
  theme: WebsiteThemeConfigDto | null;
}

export interface TemplatePublishedVersionOptionDto {
  versionId: string;
  version: string;
  changelog: string | null;
  publishedAt: string;
  latest: boolean;
}

/** `GET /api/template-versions/:slug` — `TemplateVersionOptionsResponseDto`. */
export interface TemplateVersionOptionsDto {
  slug: string;
  templateId: string | null;
  published: TemplatePublishedVersionOptionDto[];
  candidates: TemplateCandidateDto[];
}

export interface WebsiteTemplateTrialDto {
  websiteId: string;
  candidate: TemplateCandidateDto | null;
  hiddenFromYou: boolean;
}

export interface TemplateCandidatePreviewDto {
  submissionId: string;
  digest: string;
  fixture: string;
  html: string;
  clientScript: string | null;
}

/** `GET /api/template-candidates` — kandidat yang boleh diuji user ini. */
export function fetchTemplateCandidates(): Promise<TemplateCandidateDto[]> {
  return studioRequest<TemplateCandidateDto[]>('/api/template-candidates');
}

/** `GET /api/template-candidates/:id/preview` — SSR fixture standar + client.js. */
export function fetchTemplateCandidatePreview(submissionId: string, fixture = 'home'): Promise<TemplateCandidatePreviewDto> {
  return studioRequest<TemplateCandidatePreviewDto>(
    `/api/template-candidates/${encodeURIComponent(submissionId)}/preview?fixture=${encodeURIComponent(fixture)}`,
  );
}

/** Opsi versi untuk pemilih versi: semua versi terbit + versi uji milik user. */
export function fetchTemplateVersionOptions(slug: string): Promise<TemplateVersionOptionsDto> {
  return studioRequest<TemplateVersionOptionsDto>(`/api/template-versions/${encodeURIComponent(slug)}`);
}

export function fetchWebsiteTemplateTrial(websiteId: string): Promise<WebsiteTemplateTrialDto> {
  return studioRequest<WebsiteTemplateTrialDto>(`${websitePath(websiteId)}/template-trial`);
}

export function startWebsiteTemplateTrial(websiteId: string, submissionId: string): Promise<WebsiteTemplateTrialDto> {
  return studioRequest<WebsiteTemplateTrialDto>(`${websitePath(websiteId)}/template-trial`, {
    method: 'PUT',
    ...jsonBody({ submissionId }),
  });
}

export function stopWebsiteTemplateTrial(websiteId: string): Promise<WebsiteTemplateTrialDto> {
  return studioRequest<WebsiteTemplateTrialDto>(`${websitePath(websiteId)}/template-trial`, { method: 'DELETE' });
}
