import { studioRequest, jsonBody } from './client';

export interface WebsiteBlogPost {
  id: string;
  website_id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  cover_image?: string | null;
  is_published: boolean;
  published_at?: string | null;
  related_product_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateBlogPostRequest {
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  cover_image?: string | null;
  is_published?: boolean;
  related_product_ids?: string[];
}

export interface UpdateBlogPostRequest extends Partial<CreateBlogPostRequest> {}

function blogPostsPath(websiteId: string, suffix = ''): string {
  return `/api/websites/${encodeURIComponent(websiteId)}/blog-posts${suffix}`;
}

export function fetchBlogPosts(websiteId: string, published?: boolean): Promise<WebsiteBlogPost[]> {
  const url = published !== undefined ? `${blogPostsPath(websiteId)}?published=${published ? 'true' : 'false'}` : blogPostsPath(websiteId);
  return studioRequest<WebsiteBlogPost[]>(url);
}

export function createBlogPost(websiteId: string, body: CreateBlogPostRequest): Promise<WebsiteBlogPost> {
  return studioRequest<WebsiteBlogPost>(blogPostsPath(websiteId), { method: 'POST', ...jsonBody(body) });
}

export function updateBlogPost(websiteId: string, postId: string, body: UpdateBlogPostRequest): Promise<WebsiteBlogPost> {
  return studioRequest<WebsiteBlogPost>(`${blogPostsPath(websiteId)}/${encodeURIComponent(postId)}`, {
    method: 'PATCH',
    ...jsonBody(body),
  });
}

export function deleteBlogPost(websiteId: string, postId: string): Promise<{ deleted: boolean }> {
  return studioRequest<{ deleted: boolean }>(`${blogPostsPath(websiteId)}/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
  });
}
