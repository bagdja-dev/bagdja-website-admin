'use client';

import { Card, CardBody } from '@heroui/react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRealtime } from '../../components/realtime-provider';
import { LoadingSpinner } from '../../components/loading-spinner';
import { NoWebsiteState } from '../../components/no-website-state';
import { useWebsiteContext } from '../../context/website-context';
import { useAuth } from '../../hooks/use-auth';
import { apiClient } from '../../lib/api-client';
import { AdminChatReferenceCard } from '../../components/chat-reference-card';
import { formatChatTime, getThreadHeadline, getThreadSubtitle, parseChatReference } from '../../lib/chat';

interface ChatThread {
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
  status?: string | null;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  created_at?: string | null;
  unread_count?: number | null;
}

interface ChatMessage {
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

function messageId(message: ChatMessage) {
  return message.id || message.messageId || message.message_id || '';
}

function sameMessage(left: ChatMessage, right: ChatMessage) {
  const leftId = messageId(left);
  const rightId = messageId(right);
  if (leftId && rightId && leftId === rightId) return true;

  const leftSender = left.senderUserId ?? left.sender_user_id;
  const rightSender = right.senderUserId ?? right.sender_user_id;
  const leftTime = Date.parse(left.createdAt ?? left.created_at ?? '');
  const rightTime = Date.parse(right.createdAt ?? right.created_at ?? '');
  return Boolean(
    left.body
    && left.body === right.body
    && leftSender
    && leftSender === rightSender
    && Number.isFinite(leftTime)
    && Number.isFinite(rightTime)
    && Math.abs(leftTime - rightTime) < 3000,
  );
}

function mergeMessage(existing: ChatMessage, incoming: ChatMessage): ChatMessage {
  return {
    ...existing,
    ...incoming,
    id: messageId(incoming) || messageId(existing),
    senderUserId: incoming.senderUserId ?? incoming.sender_user_id ?? existing.senderUserId ?? existing.sender_user_id,
    senderDisplayName: incoming.senderDisplayName ?? incoming.sender_display_name ?? existing.senderDisplayName ?? existing.sender_display_name,
    createdAt: incoming.createdAt ?? incoming.created_at ?? existing.createdAt ?? existing.created_at,
  };
}

type ChipTone = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

const CHANNEL_TONE: Record<string, ChipTone> = {
  product: 'primary',
  support: 'secondary',
  order: 'success',
  transaction: 'success',
};

const STATUS_TONE: Record<string, ChipTone> = {
  open: 'primary',
  waiting: 'warning',
  resolved: 'success',
  closed: 'default',
};

const CHANNEL_FILTERS = [
  { key: 'support', label: 'DM' },
  { key: 'product', label: 'Product' },
  { key: 'order', label: 'Order' },
] as const;

const STATUS_FILTERS = [
  { key: 'all', label: 'Semua status' },
  { key: 'open', label: 'Terbuka' },
  { key: 'waiting', label: 'Menunggu' },
  { key: 'resolved', label: 'Selesai' },
  { key: 'closed', label: 'Ditutup' },
] as const;

export default function ChatsPage() {
  const { websiteId, loading: websiteLoading, activeWebsite } = useWebsiteContext();
  const websiteSlug = activeWebsite?.website.slug;
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { subscribe } = useRealtime();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [channelFilter, setChannelFilter] = useState<(typeof CHANNEL_FILTERS)[number]['key']>('support');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]['key']>('all');
  const [search, setSearch] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const messagesPaneRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const selectedThreadIdRef = useRef<string | null>(null);
  const threadsRef = useRef<ChatThread[]>([]);
  const userIdRef = useRef<string | null>(null);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [selectedThreadId, threads],
  );

  selectedThreadIdRef.current = selectedThreadId;
  threadsRef.current = threads;
  userIdRef.current = user?.userId ?? null;

  const scrollMessagesToBottom = useCallback(() => {
    const pane = messagesPaneRef.current;
    if (!pane) return;
    requestAnimationFrame(() => {
      pane.scrollTop = pane.scrollHeight;
    });
  }, []);

  const loadThreads = useCallback(async (silent = false) => {
    if (!websiteId) return;
    try {
      if (!silent) setLoading(true);

      const queryThreadId = searchParams.get('thread');
      const effectiveChannelFilter = queryThreadId ? 'all' : channelFilter;

      const params = new URLSearchParams();
      params.set('channel_type', effectiveChannelFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const queryString = params.toString();
      const payload = await apiClient<ChatThread[] | { items?: ChatThread[] }>(
        `/api/chat/${websiteId}/threads${queryString ? `?${queryString}` : ''}`,
      );
      const nextThreads = Array.isArray(payload) ? payload : payload.items ?? [];
      setThreads(nextThreads);

      const matchedThread = queryThreadId ? nextThreads.find((thread) => thread.id === queryThreadId) : null;
      if (matchedThread) {
        const targetFilter = matchedThread.channel_type === 'support' ? 'support' : matchedThread.channel_type === 'product' ? 'product' : 'order';
        setChannelFilter((current) => current === targetFilter ? current : targetFilter);
        setSelectedThreadId(queryThreadId);
      } else {
        setSelectedThreadId((current) => {
          if (queryThreadId) return null;
          return current && nextThreads.some((thread) => thread.id === current) ? current : null;
        });
      }
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat inbox chat');
      setThreads([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [channelFilter, search, statusFilter, searchParams, websiteId]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const markThreadRead = useCallback(async (threadId: string) => {
    setThreads((current) => current.map((thread) => (
      thread.id === threadId ? { ...thread, unread_count: 0 } : thread
    )));
    try {
      await apiClient(`/api/chat/${websiteId}/threads/${threadId}/read`, { method: 'POST' });
      window.dispatchEvent(new CustomEvent('website-notifications-refresh'));
    } catch {
      // Read state is best-effort after the thread is opened.
    }
  }, [websiteId]);

  const loadMessages = useCallback(async (threadId: string, silent = false) => {
    if (!silent) setMessagesLoading(true);
    try {
      const payload = await apiClient<ChatMessage[] | { items?: ChatMessage[] }>(
        `/api/chat/${websiteId}/threads/${threadId}/messages`,
      );
      const nextMessages = Array.isArray(payload) ? payload : payload.items ?? [];
      setMessages(nextMessages.slice().reverse());
      await markThreadRead(threadId);
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : 'Gagal memuat pesan');
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  }, [markThreadRead, websiteId]);

  useEffect(() => {
    if (!websiteId) return;

    const matchesThread = (thread: ChatThread, threadId: string, topicId: string) => (
      Boolean((threadId && thread.id === threadId) || (topicId && thread.topic_id === topicId))
    );

    const unsubscribeMessage = subscribe('website.chat.message.created', (eventData) => {
      const eventThreadId = String(eventData.threadId ?? eventData.thread_id ?? '');
      const eventTopicId = String(eventData.topicId ?? eventData.topic_id ?? '');
      if (!eventThreadId && !eventTopicId) return;

      const preview = typeof eventData.body === 'string' ? eventData.body.replace(/\s+/g, ' ').trim().slice(0, 140) : '';
      const createdAt = typeof eventData.createdAt === 'string' ? eventData.createdAt : new Date().toISOString();
      const eventMessageId = String(eventData.messageId ?? eventData.message_id ?? eventData.id ?? `evt-${createdAt}`);
      const openThreadId = selectedThreadIdRef.current;
      const isOpen = Boolean(openThreadId && (
        openThreadId === eventThreadId
        || threadsRef.current.some((thread) => thread.id === openThreadId && matchesThread(thread, eventThreadId, eventTopicId))
      ));

      setThreads((current) => {
        const index = current.findIndex((thread) => matchesThread(thread, eventThreadId, eventTopicId));
        if (index < 0) {
          void loadThreads(true);
          return current;
        }
        const thread = current[index];
        const next = current.slice();
        next[index] = {
          ...thread,
          last_message_preview: preview || thread.last_message_preview,
          last_message_at: createdAt,
          unread_count: isOpen ? 0 : Number(thread.unread_count ?? 0) + 1,
        };
        return next;
      });

      if (!isOpen || !openThreadId) return;

      setMessages((current) => (
        (() => {
          const incoming: ChatMessage = {
              id: eventMessageId,
              body: typeof eventData.body === 'string' ? eventData.body : '',
              senderUserId: typeof (eventData.senderUserId ?? eventData.sender_user_id) === 'string' ? String(eventData.senderUserId ?? eventData.sender_user_id) : null,
              senderDisplayName: typeof (eventData.senderDisplayName ?? eventData.sender_display_name) === 'string' ? String(eventData.senderDisplayName ?? eventData.sender_display_name) : null,
              createdAt,
          };
          const duplicateIndex = current.findIndex((message) => sameMessage(message, incoming));
          if (duplicateIndex < 0) return [...current, incoming];
          return current.map((message, index) => index === duplicateIndex ? mergeMessage(message, incoming) : message);
        })()
      ));
      void markThreadRead(openThreadId);
    });

    const unsubscribeThread = subscribe('website.chat.thread.created', () => {
      void loadThreads(true);
    });

    const unsubscribeUnread = subscribe('website.chat.unread.updated', (eventData) => {
      const eventUserId = String(eventData.userId ?? eventData.user_id ?? '');
      const currentUserId = userIdRef.current;
      if (!currentUserId || !eventUserId || eventUserId !== currentUserId) return;

      const eventThreadId = String(eventData.threadId ?? eventData.thread_id ?? '');
      const eventTopicId = String(eventData.topicId ?? eventData.topic_id ?? '');
      if (!eventThreadId && !eventTopicId) return;
      const unreadCount = Number(eventData.unreadCount ?? eventData.unread_count ?? 0);
      setThreads((current) => current.map((thread) => (
        matchesThread(thread, eventThreadId, eventTopicId)
          ? { ...thread, unread_count: Number.isFinite(unreadCount) ? unreadCount : 0 }
          : thread
      )));
    });

    return () => {
      unsubscribeMessage();
      unsubscribeThread();
      unsubscribeUnread();
    };
  }, [loadThreads, markThreadRead, subscribe, websiteId]);

  useEffect(() => {
    if (selectedThreadId && websiteId) void loadMessages(selectedThreadId);
  }, [loadMessages, selectedThreadId, websiteId]);

  useEffect(() => {
    if (messagesLoading) return;
    scrollMessagesToBottom();
  }, [messages, messagesLoading, selectedThreadId, scrollMessagesToBottom]);

  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const maxHeight = 160;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [draft]);

  const sendMessage = useCallback(async () => {
    if (!selectedThreadId || !draft.trim() || sending) return;
    setSending(true);
    try {
      const created = await apiClient<ChatMessage>(`/api/chat/${websiteId}/threads/${selectedThreadId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: draft.trim() }),
      });
      const preview = draft.trim().replace(/\s+/g, ' ').slice(0, 140);
      const normalizedCreated: ChatMessage = {
        ...created,
        id: messageId(created) || `sent-${Date.now()}`,
        senderUserId: created.senderUserId ?? created.sender_user_id ?? user?.userId ?? null,
        senderDisplayName: created.senderDisplayName ?? created.sender_display_name,
        createdAt: created.createdAt ?? created.created_at ?? new Date().toISOString(),
      };
      setMessages((current) => {
        const duplicateIndex = current.findIndex((message) => sameMessage(message, normalizedCreated));
        if (duplicateIndex < 0) return [...current, normalizedCreated];
        return current.map((message, index) => index === duplicateIndex ? mergeMessage(message, normalizedCreated) : message);
      });
      setDraft('');
      setThreads((current) => current.map((thread) => (
        thread.id === selectedThreadId
          ? { ...thread, last_message_preview: preview, last_message_at: created.createdAt ?? new Date().toISOString() }
          : thread
      )));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim balasan');
    } finally {
      setSending(false);
    }
  }, [draft, selectedThreadId, sending, websiteId]);

  if (websiteLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
        <h1 className="text-xl font-bold tracking-tight">Inbox</h1>
        <div className="flex flex-wrap gap-1.5">
          {CHANNEL_FILTERS.map((filter) => {
            const active = channelFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setChannelFilter(filter.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  active ? 'bg-primary text-white' : 'bg-default-100 text-default-600 hover:bg-default-200'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:justify-end">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari percakapan..."
            className="w-full rounded-lg border border-default-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-primary sm:max-w-64"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as (typeof STATUS_FILTERS)[number]['key'])}
            className="rounded-lg border border-default-200 bg-white px-3 py-1.5 text-sm text-default-700 outline-none focus:border-primary"
          >
            {STATUS_FILTERS.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner className="min-h-0 flex-1" />
      ) : error ? (
        <Card className="min-h-0 flex-1 border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="flex h-full items-center justify-center text-sm text-danger">{error}</CardBody>
        </Card>
      ) : threads.length === 0 ? (
        <Card className="min-h-0 flex-1 overflow-hidden border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 text-3xl ring-4 ring-cyan-50">
              💬
            </div>
            <p className="text-lg font-semibold">Belum ada percakapan</p>
            <p className="max-w-md text-sm text-default-500">
              Chat baru dari produk, support, atau order akan muncul di sini secara realtime.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-default-200 bg-white shadow-sm">
          <aside className={`min-h-0 w-full shrink-0 overflow-y-auto border-default-200 sm:block sm:w-72 sm:border-r ${selectedThreadId ? 'hidden' : 'block'}`}>
            <ul className="divide-y divide-default-200">
              {threads.map((thread) => (
                <li key={thread.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-default-50 ${selectedThreadId === thread.id ? 'bg-default-100' : ''}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                      {(getThreadHeadline(thread).charAt(0) || 'P').toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{getThreadHeadline(thread)}</span>
                      <span className="mt-1 block truncate text-xs text-default-500">{getThreadSubtitle(thread)}</span>
                    </span>
                    {Number(thread.unread_count ?? 0) > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white">
                        {thread.unread_count}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <section className={`min-h-0 min-w-0 flex-1 flex-col ${selectedThreadId ? 'flex' : 'hidden sm:flex'}`}>
            {!selectedThread ? (
              <div className="flex flex-1 items-center justify-center text-sm text-default-500">Pilih percakapan di sebelah kiri.</div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex shrink-0 items-center gap-3 border-b border-default-200 px-4 py-2.5">
                  <button type="button" onClick={() => setSelectedThreadId(null)} className="text-xl text-default-500 sm:hidden">←</button>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                    {(getThreadHeadline(selectedThread).charAt(0) || 'C').toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{getThreadHeadline(selectedThread)}</p>
                    <p className="truncate text-xs text-default-500">{getThreadSubtitle(selectedThread)}</p>
                  </div>
                </div>
                <div ref={messagesPaneRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                  {messagesLoading ? (
                    <p className="py-8 text-center text-sm text-default-500">Memuat pesan...</p>
                  ) : messages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-default-500">Belum ada pesan.</p>
                  ) : (
                    messages.map((message) => {
                      const senderId = message.senderUserId ?? message.sender_user_id;
                      const isAdmin = senderId === selectedThread.merchant_id || senderId === user?.userId;
                      const reference = parseChatReference(message.body);
                      return (
                        <div key={message.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${isAdmin ? 'bg-primary text-white' : 'bg-default-100 text-foreground'}`}>
                            <p className="text-[10px] font-semibold uppercase opacity-70">
                              {message.senderDisplayName ?? message.sender_display_name ?? (isAdmin ? 'Admin' : selectedThread.customer_name ?? 'Customer')}
                            </p>
                            {reference ? (
                              <AdminChatReferenceCard reference={reference} websiteSlug={websiteSlug} />
                            ) : (
                              <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
                            )}
                            <p className={`mt-1 text-[10px] ${isAdmin ? 'text-white/70' : 'text-default-500'}`}>
                              {formatChatTime(message.createdAt ?? message.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="flex shrink-0 items-end gap-2 border-t border-default-200 bg-default-50/70 p-3">
                  <textarea
                    ref={composerRef}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={1}
                    maxLength={4000}
                    placeholder="Tulis balasan..."
                    className="min-h-10 min-w-0 flex-1 resize-none overflow-hidden border-0 bg-transparent px-3 py-2 text-sm leading-5 text-foreground outline-none placeholder:text-default-400 focus:ring-0"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void sendMessage();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={sending || !draft.trim()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
                  >
                    {sending ? '...' : '↑'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
