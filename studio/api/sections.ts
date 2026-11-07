import { studioRequest, jsonBody } from './client';

export interface WebsiteSection {
  id: string;
  page_id: string;
  type: string;
  content: Record<string, unknown>;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSectionRequest {
  type: string;
  content?: Record<string, unknown>;
  order?: number;
}

export interface UpdateSectionRequest extends Partial<CreateSectionRequest> {}

export interface ReorderSectionsRequest {
  section_ids: string[];
}

function sectionsPath(websiteId: string, pageId: string, suffix = ''): string {
  return `/api/websites/${encodeURIComponent(websiteId)}/pages/${encodeURIComponent(pageId)}/sections${suffix}`;
}

export function fetchSections(websiteId: string, pageId: string): Promise<WebsiteSection[]> {
  return studioRequest<WebsiteSection[]>(sectionsPath(websiteId, pageId));
}

export function createSection(websiteId: string, pageId: string, body: CreateSectionRequest): Promise<WebsiteSection> {
  return studioRequest<WebsiteSection>(sectionsPath(websiteId, pageId), { method: 'POST', ...jsonBody(body) });
}

export function updateSection(
  websiteId: string,
  pageId: string,
  sectionId: string,
  body: UpdateSectionRequest,
): Promise<WebsiteSection> {
  return studioRequest<WebsiteSection>(`${sectionsPath(websiteId, pageId)}/${encodeURIComponent(sectionId)}`, {
    method: 'PATCH',
    ...jsonBody(body),
  });
}

export function deleteSection(websiteId: string, pageId: string, sectionId: string): Promise<{ deleted: boolean }> {
  return studioRequest<{ deleted: boolean }>(`${sectionsPath(websiteId, pageId)}/${encodeURIComponent(sectionId)}`, {
    method: 'DELETE',
  });
}

export function reorderSections(websiteId: string, pageId: string, sectionIds: string[]): Promise<WebsiteSection[]> {
  return studioRequest<WebsiteSection[]>(`${sectionsPath(websiteId, pageId)}/reorder`, {
    method: 'POST',
    ...jsonBody({ section_ids: sectionIds }),
  });
}
