import { jsonBody, studioRequest, websitePath } from './client';

export interface LocationDraft {
  name: string;
  type: string;
  is_primary?: boolean;
  is_public?: boolean;
  is_active?: boolean;
  address_line?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  whatsapp?: string | null;
  maps_url?: string | null;
  shipping_area_name?: string | null;
  active_couriers?: string[];
}

export interface WebsiteLocationRow {
  id: string;
  website_id: string;
  name: string;
  type: string;
  is_primary: boolean;
  is_public: boolean;
  is_active: boolean;
  address_line: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  phone: string | null;
  whatsapp: string | null;
  maps_url: string | null;
  shipping_area_name: string | null;
  active_couriers: string[] | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function fetchLocations(websiteId: string): Promise<WebsiteLocationRow[]> {
  return studioRequest<WebsiteLocationRow[]>(websitePath(websiteId, '/locations'));
}

export function createLocation(websiteId: string, draft: LocationDraft): Promise<WebsiteLocationRow> {
  return studioRequest<WebsiteLocationRow>(websitePath(websiteId, '/locations'), {
    method: 'POST',
    ...jsonBody(draft),
  });
}

export function updateLocation(
  websiteId: string,
  locationId: string,
  draft: LocationDraft,
): Promise<WebsiteLocationRow> {
  return studioRequest<WebsiteLocationRow>(websitePath(websiteId, `/locations/${encodeURIComponent(locationId)}`), {
    method: 'PATCH',
    ...jsonBody(draft),
  });
}

export function setPrimaryLocation(websiteId: string, locationId: string): Promise<WebsiteLocationRow> {
  return studioRequest<WebsiteLocationRow>(
    websitePath(websiteId, `/locations/${encodeURIComponent(locationId)}/set-primary`),
    { method: 'POST' },
  );
}

export function deleteLocation(websiteId: string, locationId: string): Promise<{ deleted: boolean }> {
  return studioRequest<{ deleted: boolean }>(
    websitePath(websiteId, `/locations/${encodeURIComponent(locationId)}`),
    { method: 'DELETE' },
  );
}
