'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';

import { useWebsiteContext } from '../context/website-context';
import { useAuth } from '../hooks/use-auth';

type EventHandler = (data: Record<string, unknown>) => void;

interface RealtimeEvent {
  id: string;
  eventName: string;
  title: string;
  message: string;
  websiteId?: string | null;
  createdAt: number;
}

interface RealtimeContextValue {
  unreadCount: number;
  lastEvent: RealtimeEvent | null;
  subscribe: (eventName: string, handler: EventHandler) => () => void;
  clearUnread: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

function getEventName(event: Record<string, unknown>): string | null {
  if (typeof event?.eventName === 'string') return event.eventName;
  if (typeof event?.data === 'object' && event.data && 'eventName' in (event.data as Record<string, unknown>)) {
    return typeof (event.data as Record<string, unknown>).eventName === 'string'
      ? String((event.data as Record<string, unknown>).eventName)
      : null;
  }
  return null;
}

function getEventData(event: Record<string, unknown>): Record<string, unknown> {
  if (typeof event?.data === 'object' && event.data && 'data' in (event.data as Record<string, unknown>)) {
    const nestedData = (event.data as Record<string, unknown>).data;
    if (nestedData && typeof nestedData === 'object') return nestedData as Record<string, unknown>;
  }
  if (event?.data && typeof event.data === 'object') return event.data as Record<string, unknown>;
  return event;
}

function getWebsiteId(data: Record<string, unknown>): string | null {
  const websiteRecord = data.website as Record<string, unknown> | undefined;

  const candidates = [
    data.websiteId,
    data.website_id,
    data.merchantWebsiteId,
    websiteRecord?.id,
    websiteRecord?.websiteId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }

  return null;
}

export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtime must be used within RealtimeProvider');
  return context;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { websiteId } = useWebsiteContext();
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  const subscribe = useCallback((eventName: string, handler: EventHandler) => {
    const handlers = listenersRef.current.get(eventName) ?? new Set<EventHandler>();
    handlers.add(handler);
    listenersRef.current.set(eventName, handlers);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) listenersRef.current.delete(eventName);
    };
  }, []);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!user?.userId) {
      setUnreadCount(0);
      setLastEvent(null);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    let cancelled = false;

    fetch('/api/realtime/ws-token', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`ws-token ${response.status}`);
        const data = (await response.json()) as { access_token?: string; accessToken?: string; channels?: string[] };
        const token = data.access_token ?? data.accessToken;
        if (!token || cancelled) return;

        const eventServiceUrl = process.env.NEXT_PUBLIC_EVENT_API ?? 'http://localhost:4085';
        const socket = io(`${eventServiceUrl.replace(/\/$/, '')}/events`, {
          auth: { token },
          transports: ['websocket'],
        });

        socket.on('event', (event: Record<string, unknown>) => {
          const eventName = getEventName(event);
          const eventData = getEventData(event);
          if (!eventName || !eventData) return;

          const eventWebsiteId = getWebsiteId(eventData);
          if (websiteId && eventWebsiteId && eventWebsiteId !== websiteId) return;

          const payload: RealtimeEvent = {
            id: `${eventName}:${Date.now()}:${Math.random().toString(16).slice(2)}`,
            eventName,
            title:
              typeof eventData.title === 'string'
                ? eventData.title
                : typeof eventData.subject === 'string'
                  ? eventData.subject
                  : 'Website update',
            message:
              typeof eventData.message === 'string'
                ? eventData.message
                : typeof eventData.body === 'string'
                  ? eventData.body
                  : 'Ada update baru di website Anda.',
            websiteId: eventWebsiteId,
            createdAt: Date.now(),
          };

          setLastEvent(payload);

          if (eventName.includes('notification.created')) {
            setUnreadCount((count) => count + 1);
          }

          listenersRef.current.get(eventName)?.forEach((handler) => handler(eventData));
        });

        socket.on('connect', () => {
          // no-op: kept intentionally light for performance and debugability
        });

        socket.on('connect_error', (error: Error) => {
          console.error('[WebsiteRealtime] koneksi gagal:', error.message);
        });

        socketRef.current = socket;
      })
      .catch((error) => {
        console.error('[WebsiteRealtime] gagal mengambil token:', error);
      });

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?.userId, websiteId]);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      unreadCount,
      lastEvent,
      subscribe,
      clearUnread,
    }),
    [unreadCount, lastEvent, subscribe, clearUnread],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
