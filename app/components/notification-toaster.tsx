'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useWebsiteContext } from '../context/website-context';
import { useAuth } from '../hooks/use-auth';
import { apiClient } from '../lib/api-client';
import { playNotificationSound, unlockNotificationAudio } from '../lib/notification-sound';
import { useRealtime } from './realtime-provider';

interface ToastItem {
  id: string;
  title: string;
  message: string;
  actionUrl: string;
}

export function NotificationToaster() {
  const router = useRouter();
  const { user } = useAuth();
  const { websiteId, activeWebsite } = useWebsiteContext();
  const { subscribe } = useRealtime();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seenRef = useRef(new Set<string>());

  useEffect(() => {
    const unlock = () => unlockNotificationAudio();
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (!websiteId) return;

    return subscribe('website.notification.created', (eventData) => {
      const notificationId = String(eventData.notificationId ?? eventData.id ?? '');
      const eventUserId = String(eventData.userId ?? eventData.user_id ?? '');
      const eventWebsiteId = String(eventData.websiteId ?? eventData.website_id ?? '');
      const title = typeof eventData.title === 'string' ? eventData.title : '';
      const message = typeof eventData.message === 'string' ? eventData.message : '';
      const actionUrl = typeof eventData.actionUrl === 'string'
        ? eventData.actionUrl
        : typeof eventData.action_url === 'string'
          ? eventData.action_url
          : '/dashboard/chats';

      if (eventWebsiteId && eventWebsiteId !== websiteId) return;
      if (user?.userId && eventUserId && eventUserId !== user.userId) return;
      if (!title) return;
      if (notificationId && seenRef.current.has(notificationId)) return;
      if (notificationId) seenRef.current.add(notificationId);

      playNotificationSound({
        enabled: activeWebsite?.website.notification_sound_enabled !== false,
        url: activeWebsite?.website.notification_sound_url ?? null,
      });

      const toast: ToastItem = {
        id: notificationId || `${Date.now()}`,
        title,
        message,
        actionUrl,
      };
      setToasts((current) => [toast, ...current].slice(0, 4));
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, 6000);
    });
  }, [activeWebsite?.website.notification_sound_enabled, activeWebsite?.website.notification_sound_url, subscribe, user?.userId, websiteId]);

  const openToast = useCallback(async (toast: ToastItem) => {
    if (websiteId && toast.id) {
      try {
        await apiClient(`/api/notifications/${toast.id}/read?website_id=${encodeURIComponent(websiteId)}`, {
          method: 'PATCH',
        });
      } catch {
        // Navigation still proceeds if mark-read fails.
      }
    }
    setToasts((current) => current.filter((item) => item.id !== toast.id));
    if (toast.actionUrl) router.push(toast.actionUrl);
  }, [router, websiteId]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[80] flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => void openToast(toast)}
          className="pointer-events-auto rounded-xl border border-default-200 bg-white p-3 text-left shadow-xl shadow-default-200"
        >
          <p className="text-sm font-semibold text-foreground">{toast.title}</p>
          {toast.message && <p className="mt-1 line-clamp-2 text-xs text-default-500">{toast.message}</p>}
        </button>
      ))}
    </div>
  );
}
