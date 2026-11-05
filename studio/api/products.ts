import { studioRequest } from './client';

export interface WebsiteProduct {
  id: string;
  website_id: string;
  name: string;
  slug: string;
  type: string;
  price?: number | null;
  images?: string[] | null;
  cover_image?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function productsPath(websiteId: string): string {
  return `/api/websites/${encodeURIComponent(websiteId)}/products`;
}

export function fetchProducts(websiteId: string): Promise<WebsiteProduct[]> {
  return studioRequest<WebsiteProduct[]>(productsPath(websiteId));
}
