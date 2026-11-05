import { studioRequest } from './client';
import type { UserWebsiteDto } from './types';

/** `GET /api/user/websites` — 401 diarahkan ke login oleh apiClient. */
export function fetchUserWebsites(): Promise<UserWebsiteDto[]> {
  return studioRequest<UserWebsiteDto[]>('/api/user/websites');
}
