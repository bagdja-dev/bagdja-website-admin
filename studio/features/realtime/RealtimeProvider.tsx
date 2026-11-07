'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';

import { fetchRealtimeToken } from '@/studio/api/realtime';
import { useSessionUser } from '@/studio/lib/session-user';
import { useActiveWebsiteId } from '@/studio/stores/website-store';

import { getEventData, getEventName, getEventWebsiteId, type RealtimePayload } from './event-payload';

export type RealtimeHandler = (data: RealtimePayload) => void;

interface RealtimeContextValue {
  subscribe: (eventName: string, handler: RealtimeHandler) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime harus dipakai di dalam RealtimeProvider Studio');
  return ctx;
}

/**
 * Socket.io ke `{NEXT_PUBLIC_EVENT_API}/events` (websocket saja, `auth.token`),
 * event `'event'`, buang event milik website lain, reconnect saat user/website
 * berubah, putus saat logout. (`unreadCount`/`lastEvent` lama tidak dipakai — dibuang.)
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const user = useSessionUser();
  const websiteId = useActiveWebsiteId();
  const listenersRef = useRef(new Map<string, Set<RealtimeHandler>>());

  const subscribe = useCallback((eventName: string, handler: RealtimeHandler) => {
    const handlers = listenersRef.current.get(eventName) ?? new Set<RealtimeHandler>();
    handlers.add(handler);
    listenersRef.current.set(eventName, handlers);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) listenersRef.current.delete(eventName);
    };
  }, []);

  useEffect(() => {
    if (!user?.userId) return;
    let cancelled = false;
    let socket: Socket | null = null;

    fetchRealtimeToken()
      .then((token) => {
        if (!token || cancelled) return;
        const baseUrl = (process.env.NEXT_PUBLIC_EVENT_API ?? 'http://localhost:4085').replace(/\/$/, '');
        socket = io(`${baseUrl}/events`, { auth: { token }, transports: ['websocket'] });
        socket.on('event', (event: RealtimePayload) => {
          const eventName = getEventName(event);
          if (!eventName) return;
          const data = getEventData(event);
          const eventWebsiteId = getEventWebsiteId(data);
          if (websiteId && eventWebsiteId && eventWebsiteId !== websiteId) return;
          listenersRef.current.get(eventName)?.forEach((handler) => handler(data));
        });
        socket.on('connect_error', (error: Error) => {
          console.error('[StudioRealtime] koneksi gagal:', error.message);
        });
      })
      .catch((error: unknown) => {
        console.error('[StudioRealtime] gagal mengambil token:', error);
      });

    return () => {
      cancelled = true;
      socket?.disconnect();
      socket = null;
    };
  }, [user?.userId, websiteId]);

  const value = useMemo<RealtimeContextValue>(() => ({ subscribe }), [subscribe]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
