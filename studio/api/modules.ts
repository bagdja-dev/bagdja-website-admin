import { isNotFound, jsonBody, studioRequest, websitePath } from './client';
import type {
  BusinessProfileId,
  BusinessProfilesResponseDto,
  UpdateWebsiteModulesRequestDto,
  WebsiteModulesResponseDto,
} from './types';

/** `GET /api/business-profiles`; `null` bila endpoint belum ada (404). */
export async function fetchBusinessProfiles(): Promise<BusinessProfilesResponseDto | null> {
  try {
    return await studioRequest<BusinessProfilesResponseDto>('/api/business-profiles');
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/** `GET /api/websites/:id/modules`; `null` bila endpoint belum ada (404 → perlakukan legacy). */
export async function fetchWebsiteModules(websiteId: string): Promise<WebsiteModulesResponseDto | null> {
  try {
    return await studioRequest<WebsiteModulesResponseDto>(websitePath(websiteId, '/modules'));
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/** `PATCH /api/websites/:id/modules` (owner). 409 diteruskan sebagai ApiError. */
export function updateWebsiteModules(
  websiteId: string,
  body: UpdateWebsiteModulesRequestDto,
): Promise<WebsiteModulesResponseDto> {
  return studioRequest<WebsiteModulesResponseDto>(websitePath(websiteId, '/modules'), {
    method: 'PATCH',
    ...jsonBody(body),
  });
}

/** Body `PATCH /api/websites/:id/business-profile` (owner). */
export interface UpdateBusinessProfileRequestDto {
  businessProfile: Exclude<BusinessProfileId, 'legacy'>;
  /** `true` = tambahkan modul preset profile baru (tidak ada yang dimatikan). */
  applyPreset: boolean;
  /** `true` = samakan modul aktif dengan preset; modul di luar preset dinonaktifkan tanpa menghapus datanya. */
  resetFeaturesToPreset?: boolean;
}

export function updateBusinessProfile(
  websiteId: string,
  body: UpdateBusinessProfileRequestDto,
): Promise<WebsiteModulesResponseDto> {
  return studioRequest<WebsiteModulesResponseDto>(websitePath(websiteId, '/business-profile'), {
    method: 'PATCH',
    ...jsonBody(body),
  });
}
