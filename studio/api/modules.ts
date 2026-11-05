import { isNotFound, jsonBody, studioRequest, websitePath } from './client';
import type {
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
