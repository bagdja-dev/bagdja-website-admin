import { studioRequest } from './client';
import type { CountResponseDto, NotificationListResponseDto } from './types';

const q = (websiteId: string): string => `website_id=${encodeURIComponent(websiteId)}`;

export function fetchNotifications(websiteId: string, limit = 20): Promise<NotificationListResponseDto> {
  return studioRequest<NotificationListResponseDto>(`/api/notifications?${q(websiteId)}&limit=${limit}`);
}

export function fetchUnreadNotificationCount(websiteId: string): Promise<Partial<CountResponseDto>> {
  return studioRequest<Partial<CountResponseDto>>(`/api/notifications/unread-count?${q(websiteId)}`);
}

export function markAllNotificationsRead(websiteId: string): Promise<void> {
  return studioRequest<void>(`/api/notifications/read-all?${q(websiteId)}`, { method: 'PATCH' });
}

export function markNotificationRead(websiteId: string, notificationId: string): Promise<void> {
  return studioRequest<void>(`/api/notifications/${encodeURIComponent(notificationId)}/read?${q(websiteId)}`, {
    method: 'PATCH',
  });
}
