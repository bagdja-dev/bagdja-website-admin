'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useWebsiteContext } from '../context/website-context';
import { useAuth } from '../hooks/use-auth';
import { apiClient } from '../lib/api-client';
import { useRealtime } from './realtime-provider';

interface WebsiteNotification {
  id: string;
  website_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  action_url: string;
  read_at?: string | null;
  created_at: string;
}

function formatNotificationTime(value?: string) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

export function NotificationBell() {
  const router = useRouter();
  const { user } = useAuth();
  const { websiteId } = useWebsiteContext();
  const { subscribe } = useRealtime();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<WebsiteNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!websiteId) return;
    try {
      const [list, unread] = await Promise.all([
        apiClient<{ items?: WebsiteNotification[] }>(`/api/notifications?website_id=${encodeURIComponent(websiteId)}&limit=20`),
        apiClient<{ count?: number }>(`/api/notifications/unread-count?website_id=${encodeURIComponent(websiteId)}`),
      ]);
      setItems(list.items ?? []);
      setUnreadCount(unread.count ?? 0);
    } catch {
      // Bell stays on last known state if refresh fails.
    }
  }, [websiteId]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const refresh = () => void loadNotifications();
    window.addEventListener('website-notifications-refresh', refresh);
    return () => window.removeEventListener('website-notifications-refresh', refresh);
  }, [loadNotifications]);

  useEffect(() => {
    if (!websiteId) return;
    const onNotification = (eventData: Record<string, unknown>) => {
      const eventUserId = String(eventData.userId ?? eventData.user_id ?? '');
      const eventWebsiteId = String(eventData.websiteId ?? eventData.website_id ?? '');
      if (eventWebsiteId && eventWebsiteId !== websiteId) return;
      if (user?.userId && eventUserId && eventUserId !== user.userId) return;
      void loadNotifications();
    };
    const unsubscribeCreated = subscribe('website.notification.created', onNotification);
    const unsubscribeRead = subscribe('website.chat.unread.updated', onNotification);
    return () => {
      unsubscribeCreated();
      unsubscribeRead();
    };
  }, [loadNotifications, subscribe, user?.userId, websiteId]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const markAllRead = useCallback(async () => {
    if (!websiteId || unreadCount === 0) return;
    try {
      await apiClient(`/api/notifications/read-all?website_id=${encodeURIComponent(websiteId)}`, { method: 'PATCH' });
      setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // Keep current unread state if the request fails.
    }
  }, [unreadCount, websiteId]);

  const openNotification = useCallback(async (notification: WebsiteNotification) => {
    if (!websiteId) return;
    if (!notification.read_at) {
      try {
        await apiClient(`/api/notifications/${notification.id}/read?website_id=${encodeURIComponent(websiteId)}`, {
          method: 'PATCH',
        });
        setItems((current) => current.map((item) => (
          item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
        )));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch {
        // Navigation still proceeds if mark-read fails.
      }
    }
    setOpen(false);
    if (notification.action_url) router.push(notification.action_url);
  }, [router, websiteId]);

  if (!websiteId) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label="Notifikasi website"
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-full p-2 text-default-600 transition hover:bg-default-100"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 1-5.714 0M6.75 17.25h10.5a2.25 2.25 0 0 0 1.892-3.526L17.2 11.2A4.2 4.2 0 0 1 16.5 8.25V7.5A4.5 4.5 0 0 0 12 3a4.5 4.5 0 0 0-4.5 4.5v.75a4.2 4.2 0 0 1-.7 2.95l-1.942 2.524A2.25 2.25 0 0 0 6.75 17.25Z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 overflow-hidden rounded-xl border border-default-200 bg-white shadow-xl shadow-default-200">
          <div className="flex items-center justify-between border-b border-default-100 px-3 py-2">
            <p className="text-sm font-semibold text-foreground">Notifikasi</p>
            {unreadCount > 0 && (
              <button type="button" onClick={() => void markAllRead()} className="text-[11px] font-medium text-primary">
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-default-500">Tidak ada notifikasi.</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openNotification(item)}
                  className={`block w-full border-b border-default-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-default-50 ${item.read_at ? '' : 'bg-primary/5'}`}
                >
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-default-500">{item.message}</p>
                  <p className="mt-1 text-[10px] text-default-400">{formatNotificationTime(item.created_at)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
