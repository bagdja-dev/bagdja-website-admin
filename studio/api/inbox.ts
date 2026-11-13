import { jsonBody, studioRequest } from './client';

export interface ChatThread {
  id: string;
  topic_id?: string | null;
  website_id?: string | null;
  merchant_id?: string | null;
  channel_type?: string | null;
  channel_label?: string | null;
  customer_user_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  product_id?: string | null;
  order_id?: string | null;
  transaction_id?: string | null;
  /** Kelompok gathering dari metadata order thread (Website API) → /studio/orders/gathering/:id. */
  gathering_group_id?: string | null;
  status?: string | null;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  created_at?: string | null;
  unread_count?: number | null;
}

export interface ChatMessage {
  id: string;
  messageId?: string | null;
  message_id?: string | null;
  senderUserId?: string | null;
  sender_user_id?: string | null;
  senderDisplayName?: string | null;
  sender_display_name?: string | null;
  body?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
}

export type ChatChannelFilter = 'all' | 'support' | 'product' | 'order';
export type ChatStatusFilter = 'all' | 'open' | 'waiting' | 'resolved' | 'closed';

export function fetchChatThreads(
  websiteId: string,
  query: { channel: ChatChannelFilter; status: ChatStatusFilter; search: string },
): Promise<ChatThread[] | { items?: ChatThread[] }> {
  const params = new URLSearchParams({ channel_type: query.channel });
  if (query.status !== 'all') params.set('status', query.status);
  if (query.search.trim()) params.set('search', query.search.trim());
  return studioRequest<ChatThread[] | { items?: ChatThread[] }>(
    `/api/chat/${encodeURIComponent(websiteId)}/threads?${params.toString()}`,
  );
}

export function fetchChatMessages(websiteId: string, threadId: string): Promise<ChatMessage[] | { items?: ChatMessage[] }> {
  return studioRequest<ChatMessage[] | { items?: ChatMessage[] }>(
    `/api/chat/${encodeURIComponent(websiteId)}/threads/${encodeURIComponent(threadId)}/messages`,
  );
}

export function markChatThreadRead(websiteId: string, threadId: string): Promise<void> {
  return studioRequest<void>(
    `/api/chat/${encodeURIComponent(websiteId)}/threads/${encodeURIComponent(threadId)}/read`,
    { method: 'POST' },
  );
}

export function sendChatMessage(websiteId: string, threadId: string, body: string): Promise<ChatMessage> {
  return studioRequest<ChatMessage>(
    `/api/chat/${encodeURIComponent(websiteId)}/threads/${encodeURIComponent(threadId)}/messages`,
    { method: 'POST', ...jsonBody({ body }) },
  );
}
