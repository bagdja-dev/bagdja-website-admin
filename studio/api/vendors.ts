import { jsonBody, studioRequest, websitePath } from './client';

export type VendorStatus = 'active' | 'inactive';

export interface VendorLocationCoverage {
  id: string;
  vendor_id: string;
  location_id: string;
  location?: {
    id: string;
    name: string;
    type: string;
  } | null;
}

export interface WebsiteVendor {
  id: string;
  website_id: string;
  name: string;
  contact_whatsapp: string | null;
  notes: string | null;
  status: VendorStatus;
  vendor_locations: VendorLocationCoverage[];
  created_at: string;
  updated_at: string;
}

export interface VendorDraft {
  name: string;
  contact_whatsapp?: string;
  notes?: string;
  status?: VendorStatus;
  location_ids?: string[];
}

export type VendorUpdate = Partial<VendorDraft>;

export function fetchVendors(websiteId: string): Promise<WebsiteVendor[]> {
  return studioRequest<WebsiteVendor[]>(websitePath(websiteId, '/vendors'));
}

export function createVendor(websiteId: string, draft: VendorDraft): Promise<WebsiteVendor> {
  return studioRequest<WebsiteVendor>(websitePath(websiteId, '/vendors'), {
    method: 'POST',
    ...jsonBody(draft),
  });
}

export function updateVendor(websiteId: string, vendorId: string, draft: VendorUpdate): Promise<WebsiteVendor> {
  return studioRequest<WebsiteVendor>(websitePath(websiteId, `/vendors/${encodeURIComponent(vendorId)}`), {
    method: 'PATCH',
    ...jsonBody(draft),
  });
}

/** API DELETE menonaktifkan vendor secara lunak; data dan relasi tetap ada. */
export function deactivateVendor(websiteId: string, vendorId: string): Promise<{ deleted: boolean; status: VendorStatus }> {
  return studioRequest<{ deleted: boolean; status: VendorStatus }>(
    websitePath(websiteId, `/vendors/${encodeURIComponent(vendorId)}`),
    { method: 'DELETE' },
  );
}
