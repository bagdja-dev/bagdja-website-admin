'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { markNotificationRead } from '@/studio/api/notifications';
import { toStudioPath } from '@/studio/lib/notification-route';
import { playNotificationSound, unlockNotificationAudio } from '@/studio/lib/notification-sound';
import { useSessionUser } from '@/studio/lib/session-user';
import { useActiveWebsite } from '@/studio/stores/website-store';

import { isEventForRecipient, REALTIME_EVENTS } from '../realtime/event-payload';
import { useRealtime } from '../realtime/RealtimeProvider';

interface ToastItem {
  id: string;
  title: string;
  message: string;
  actionUrl: string;
}

const MAX_TOASTS = 4;
const TOAST_MS = 6000;
const DEFAULT_ACTION_URL = '/studio/inbox';

/** Toast notifikasi realtime kanan atas + bunyi per website (parity C · Shell notifikasi). */
export function NotificationToaster() {
  const router = useRouter();
  const user = useSessionUser();
  const active = useActiveWebsite();
  const websiteId = active?.website.id ?? null;
  const soundEnabled = active?.website.notification_sound_enabled !== false;
  const soundUrl = active?.website.notification_sound_url ?? null;
  const { subscribe } = useRealtime();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seenRef = useRef(new Set<string>());

  useEffect(() => {
    const unlock = (): void => unlockNotificationAudio();
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (!websiteId) return;
    const userId = user?.userId ?? null;
    return subscribe(REALTIME_EVENTS.notificationCreated, (data) => {
      if (!isEventForRecipient(data, websiteId, userId)) return;
      const title = typeof data.title === 'string' ? data.title : '';
      if (!title) return;
      const notificationId = String(data.notificationId ?? data.id ?? '');
      if (notificationId && seenRef.current.has(notificationId)) return;
      if (notificationId) seenRef.current.add(notificationId);

      const actionUrl =
        typeof data.actionUrl === 'string'
          ? data.actionUrl
          : typeof data.action_url === 'string'
            ? data.action_url
            : DEFAULT_ACTION_URL;
      const message = typeof data.message === 'string' ? data.message : '';

      playNotificationSound({ enabled: soundEnabled, url: soundUrl });

      const toast: ToastItem = { id: notificationId || `${Date.now()}`, title, message, actionUrl };
      setToasts((current) => [toast, ...current].slice(0, MAX_TOASTS));
      window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), TOAST_MS);
    });
  }, [soundEnabled, soundUrl, subscribe, user?.userId, websiteId]);

  const openToast = useCallback(
    async (toast: ToastItem) => {
      if (websiteId && toast.id) {
        try {
          await markNotificationRead(websiteId, toast.id);
        } catch {
          // Navigasi tetap jalan.
        }
      }
      setToasts((current) => current.filter((item) => item.id !== toast.id));
      router.push(toStudioPath(toast.actionUrl || DEFAULT_ACTION_URL));
    },
    [router, websiteId],
  );

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 top-20 z-[80] flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => void openToast(toast)}
          className="pointer-events-auto rounded-xl border border-default-200 bg-background p-3 text-left shadow-xl"
        >
          <p className="text-sm font-semibold text-foreground">{toast.title}</p>
          {toast.message && <p className="mt-1 line-clamp-2 text-xs text-default-600">{toast.message}</p>}
        </button>
      ))}
    </div>
  );
}
