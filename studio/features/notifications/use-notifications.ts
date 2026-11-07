'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/studio/api/notifications';
import type { WebsiteNotificationDto } from '@/studio/api/types';
import { useSessionUser } from '@/studio/lib/session-user';

import { isEventForRecipient, NOTIFICATIONS_REFRESH_EVENT, REALTIME_EVENTS } from '../realtime/event-payload';
import { useRealtime } from '../realtime/RealtimeProvider';

export interface NotificationsState {
  items: WebsiteNotificationDto[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
  markRead: (notification: WebsiteNotificationDto) => Promise<void>;
}

/** Data bell: muat saat website berubah, saat event realtime, dan saat window event refresh. */
export function useNotifications(websiteId: string | null): NotificationsState {
  const user = useSessionUser();
  const { subscribe } = useRealtime();
  const [items, setItems] = useState<WebsiteNotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    if (!websiteId) return;
    try {
      const [list, unread] = await Promise.all([
        fetchNotifications(websiteId, 20),
        fetchUnreadNotificationCount(websiteId),
      ]);
      setItems(list.items ?? []);
      setUnreadCount(unread.count ?? 0);
    } catch {
      // Bell tetap di state terakhir bila gagal.
    }
  }, [websiteId]);

  useEffect(() => {
    setItems([]);
    setUnreadCount(0);
    void load();
  }, [load]);

  useEffect(() => {
    const onRefresh = (): void => void load();
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
  }, [load]);

  useEffect(() => {
    if (!websiteId) return;
    const userId = user?.userId ?? null;
    const handler = (data: Record<string, unknown>): void => {
      if (isEventForRecipient(data, websiteId, userId)) void load();
    };
    const offCreated = subscribe(REALTIME_EVENTS.notificationCreated, handler);
    const offUnread = subscribe(REALTIME_EVENTS.chatUnreadUpdated, handler);
    return () => {
      offCreated();
      offUnread();
    };
  }, [load, subscribe, user?.userId, websiteId]);

  const markAllRead = useCallback(async () => {
    if (!websiteId || unreadCount === 0) return;
    try {
      await markAllNotificationsRead(websiteId);
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? now })));
      setUnreadCount(0);
    } catch {
      // Biarkan status belum dibaca bila gagal.
    }
  }, [unreadCount, websiteId]);

  const markRead = useCallback(
    async (notification: WebsiteNotificationDto) => {
      if (!websiteId || notification.read_at) return;
      try {
        await markNotificationRead(websiteId, notification.id);
        const now = new Date().toISOString();
        setItems((current) => current.map((item) => (item.id === notification.id ? { ...item, read_at: now } : item)));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch {
        // Navigasi tetap jalan walau gagal menandai dibaca.
      }
    },
    [websiteId],
  );

  return { items, unreadCount, markAllRead, markRead };
}
