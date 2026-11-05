/** Normalisasi payload event realtime — sama persis dengan realtime-provider lama. */
export type RealtimePayload = Record<string, unknown>;

function asRecord(value: unknown): RealtimePayload | null {
  return value && typeof value === 'object' ? (value as RealtimePayload) : null;
}

/** Nama event dari `eventName` atau `data.eventName`. */
export function getEventName(event: RealtimePayload): string | null {
  if (typeof event.eventName === 'string') return event.eventName;
  const data = asRecord(event.data);
  return data && typeof data.eventName === 'string' ? data.eventName : null;
}

/** Payload dari `data.data`, lalu `data`, lalu event itu sendiri. */
export function getEventData(event: RealtimePayload): RealtimePayload {
  const data = asRecord(event.data);
  const nested = data ? asRecord(data.data) : null;
  return nested ?? data ?? event;
}

/** `websiteId` / `website_id` / `merchantWebsiteId` / `website.id` / `website.websiteId`. */
export function getEventWebsiteId(data: RealtimePayload): string | null {
  const website = asRecord(data.website);
  const candidates: unknown[] = [data.websiteId, data.website_id, data.merchantWebsiteId, website?.id, website?.websiteId];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  return null;
}

/** Filter website/user seperti bell & toaster lama. */
export function isEventForRecipient(data: RealtimePayload, websiteId: string, userId: string | null): boolean {
  const eventUserId = String(data.userId ?? data.user_id ?? '');
  const eventWebsiteId = String(data.websiteId ?? data.website_id ?? '');
  if (eventWebsiteId && eventWebsiteId !== websiteId) return false;
  if (userId && eventUserId && eventUserId !== userId) return false;
  return true;
}

export const REALTIME_EVENTS = {
  notificationCreated: 'website.notification.created',
  chatMessageCreated: 'website.chat.message.created',
  chatThreadCreated: 'website.chat.thread.created',
  chatUnreadUpdated: 'website.chat.unread.updated',
} as const;

/** Window event yang dipakai halaman lain untuk memaksa bell memuat ulang. */
export const NOTIFICATIONS_REFRESH_EVENT = 'website-notifications-refresh';
