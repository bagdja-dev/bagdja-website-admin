import { studioRequest, jsonBody } from './client';
import type { WebsiteDto } from './types';

export interface WebsiteFaq {
  id: string;
  website_id: string;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  is_public: boolean;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateFaqRequest {
  question: string;
  answer: string;
  category?: string | null;
  sort_order?: number;
  is_public?: boolean;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export type UpdateFaqRequest = Partial<CreateFaqRequest>;

export interface ReorderFaqRequest {
  faq_ids: string[];
}

function faqsPath(websiteId: string, suffix = ''): string {
  return `/api/websites/${encodeURIComponent(websiteId)}/faqs${suffix}`;
}

export function fetchFaqs(websiteId: string, category?: string): Promise<WebsiteFaq[]> {
  const url = category ? `${faqsPath(websiteId)}?category=${encodeURIComponent(category)}` : faqsPath(websiteId);
  return studioRequest<WebsiteFaq[]>(url);
}

export function createFaq(websiteId: string, body: CreateFaqRequest): Promise<WebsiteFaq> {
  return studioRequest<WebsiteFaq>(faqsPath(websiteId), { method: 'POST', ...jsonBody(body) });
}

export function updateFaq(websiteId: string, faqId: string, body: UpdateFaqRequest): Promise<WebsiteFaq> {
  return studioRequest<WebsiteFaq>(`${faqsPath(websiteId)}/${encodeURIComponent(faqId)}`, {
    method: 'PATCH',
    ...jsonBody(body),
  });
}

export function deleteFaq(websiteId: string, faqId: string): Promise<{ deleted: boolean }> {
  return studioRequest<{ deleted: boolean }>(`${faqsPath(websiteId)}/${encodeURIComponent(faqId)}`, {
    method: 'DELETE',
  });
}

export function reorderFaqs(websiteId: string, faqIds: string[]): Promise<WebsiteFaq[]> {
  return studioRequest<WebsiteFaq[]>(`${faqsPath(websiteId)}/reorder`, {
    method: 'POST',
    ...jsonBody({ faq_ids: faqIds }),
  });
}
