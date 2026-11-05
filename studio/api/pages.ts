import { studioRequest, jsonBody } from './client';
import type { WebsiteSection } from './sections';

export type { WebsiteSection };

export interface WebsitePage {
  id: string;
  website_id: string;
  title: string;
  slug: string;
  is_home: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePageRequest {
  title: string;
  slug?: string;
  is_home?: boolean;
}

export interface UpdatePageRequest extends Partial<CreatePageRequest> {}

export interface ReorderPagesRequest {
  page_ids: string[];
}

function pagesPath(websiteId: string, suffix = ''): string {
  return `/api/websites/${encodeURIComponent(websiteId)}/pages${suffix}`;
}

export function fetchPages(websiteId: string): Promise<WebsitePage[]> {
  return studioRequest<WebsitePage[]>(pagesPath(websiteId));
}

export function createPage(websiteId: string, body: CreatePageRequest): Promise<WebsitePage> {
  return studioRequest<WebsitePage>(pagesPath(websiteId), { method: 'POST', ...jsonBody(body) });
}

export function updatePage(websiteId: string, pageId: string, body: UpdatePageRequest): Promise<WebsitePage> {
  return studioRequest<WebsitePage>(`${pagesPath(websiteId)}/${encodeURIComponent(pageId)}`, {
    method: 'PATCH',
    ...jsonBody(body),
  });
}

export function deletePage(websiteId: string, pageId: string): Promise<{ deleted: boolean }> {
  return studioRequest<{ deleted: boolean }>(`${pagesPath(websiteId)}/${encodeURIComponent(pageId)}`, {
    method: 'DELETE',
  });
}

export interface WebsitePageWithSections extends WebsitePage {
  sections: WebsiteSection[];
}

export function fetchPageAndSections(websiteId: string, pageId: string): Promise<{ page: WebsitePage; sections: WebsiteSection[] }> {
  return studioRequest<{ page: WebsitePage; sections: WebsiteSection[] }>(`${pagesPath(websiteId)}/${encodeURIComponent(pageId)}`);
}

export function reorderPages(websiteId: string, pageIds: string[]): Promise<WebsitePage[]> {
  return studioRequest<WebsitePage[]>(`${pagesPath(websiteId)}/reorder`, {
    method: 'POST',
    ...jsonBody({ page_ids: pageIds }),
  });
}
