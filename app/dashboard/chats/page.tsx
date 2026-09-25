'use client';

import { Card, CardBody, Textarea } from '@heroui/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRealtime } from '../../components/realtime-provider';
import { LoadingSpinner } from '../../components/loading-spinner';
import { NoWebsiteState } from '../../components/no-website-state';
import { useWebsiteContext } from '../../context/website-context';
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
  senderUserId?: string | null;
  senderDisplayName?: string | null;
  body?: string | null;
  createdAt?: string | null;
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
  { key: 'all', label: 'DM' },
  { key: 'product', label: 'Product' },
  { key: 'order', label: 'Order' },
  { key: 'support', label: 'Ticket' },
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
  const { subscribe } = useRealtime();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [channelFilter, setChannelFilter] = useState<(typeof CHANNEL_FILTERS)[number]['key']>('all');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]['key']>('all');
  const [search, setSearch] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [selectedThreadId, threads],
  );

  const loadThreads = useCallback(async () => {
    if (!websiteId) return;
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (channelFilter !== 'all') params.set('channel_type', channelFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const queryString = params.toString();
      const payload = await apiClient<ChatThread[] | { items?: ChatThread[] }>(
        `/api/chat/${websiteId}/threads${queryString ? `?${queryString}` : ''}`,
      );
      const nextThreads = Array.isArray(payload) ? payload : payload.items ?? [];
      setThreads(nextThreads);
      setSelectedThreadId((current) => current && nextThreads.some((thread) => thread.id === current) ? current : nextThreads[0]?.id ?? null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat inbox chat');
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [channelFilter, search, statusFilter, websiteId]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!websiteId) return;
    const unsubscribeMessage = subscribe('website.chat.message.created', () => {
      void loadThreads();
    });
    const unsubscribeThread = subscribe('website.chat.thread.created', () => {
      void loadThreads();
    });
    const unsubscribeUnread = subscribe('website.chat.unread.updated', () => {
      void loadThreads();
    });

    return () => {
      unsubscribeMessage();
      unsubscribeThread();
      unsubscribeUnread();
    };
  }, [loadThreads, subscribe, websiteId]);

  const loadMessages = useCallback(async (threadId: string) => {
    setMessagesLoading(true);
    try {
      const payload = await apiClient<ChatMessage[] | { items?: ChatMessage[] }>(
        `/api/chat/${websiteId}/threads/${threadId}/messages`,
      );
      const nextMessages = Array.isArray(payload) ? payload : payload.items ?? [];
      setMessages(nextMessages.slice().reverse());
      await apiClient(`/api/chat/${websiteId}/threads/${threadId}/read`, { method: 'POST' });
      setThreads((current) => current.map((thread) => thread.id === threadId ? { ...thread, unread_count: 0 } : thread));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pesan');
    } finally {
      setMessagesLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    if (selectedThreadId && websiteId) void loadMessages(selectedThreadId);
  }, [loadMessages, selectedThreadId, websiteId]);

  const sendMessage = useCallback(async () => {
    if (!selectedThreadId || !draft.trim() || sending) return;
    setSending(true);
    try {
      const created = await apiClient<ChatMessage>(`/api/chat/${websiteId}/threads/${selectedThreadId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: draft.trim() }),
      });
      setMessages((current) => [...current, created]);
      setDraft('');
      void loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim balasan');
    } finally {
      setSending(false);
    }
  }, [draft, loadThreads, selectedThreadId, sending, websiteId]);

  if (websiteLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Inbox</h1>
        <p className="mt-1 text-sm text-default-500">Kelola percakapan customer dari satu tempat.</p>
      </div>

      <div className="flex flex-wrap gap-2">
          {CHANNEL_FILTERS.map((filter) => {
            const active = channelFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setChannelFilter(filter.key)}
                className={`rounded-xl border px-5 py-2 text-sm font-semibold transition ${
                  active ? 'bg-primary text-white' : 'bg-default-100 text-default-600 hover:bg-default-200'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari percakapan..." className="w-full rounded-xl border border-default-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as (typeof STATUS_FILTERS)[number]['key'])} className="rounded-xl border border-default-200 bg-white px-3 py-2 text-sm text-default-700 outline-none focus:border-primary">
          {STATUS_FILTERS.map((filter) => <option key={filter.key} value={filter.key}>{filter.label}</option>)}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner className="h-56" />
      ) : error ? (
        <Card className="border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="py-10 text-center text-sm text-danger">{error}</CardBody>
        </Card>
      ) : threads.length === 0 ? (
        <Card className="overflow-hidden border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="flex flex-col items-center gap-3 py-16 text-center">
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
          <aside className={`w-full shrink-0 overflow-y-auto border-default-200 sm:block sm:w-72 sm:border-r ${selectedThreadId ? 'hidden' : 'block'}`}>
            <div className="border-b border-default-200 px-4 py-3"><p className="text-sm font-semibold">Percakapan</p><p className="text-xs text-default-500">Pesan pelanggan</p></div>
            {threads.length === 0 ? <p className="p-4 text-sm text-default-500">Belum ada percakapan.</p> : <ul className="divide-y divide-default-200">{threads.map((thread) => <li key={thread.id}><button type="button" onClick={() => setSelectedThreadId(thread.id)} className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-default-50 ${selectedThreadId === thread.id ? 'bg-default-100' : ''}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">A</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{getThreadHeadline(thread)}</span><span className="mt-1 block truncate text-xs text-default-500">{getThreadSubtitle(thread)}</span></span>{Number(thread.unread_count ?? 0) > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white">{thread.unread_count}</span>}</button></li>)}</ul>}
          </aside>
          <section className={`min-w-0 flex-1 flex-col ${selectedThreadId ? 'flex' : 'hidden sm:flex'}`}>
            {!selectedThread ? <div className="flex flex-1 items-center justify-center text-sm text-default-500">Pilih percakapan di sebelah kiri.</div> : <>
              <div className="flex shrink-0 items-center gap-3 border-b border-default-200 px-4 py-3"><button type="button" onClick={() => setSelectedThreadId(null)} className="text-xl text-default-500 sm:hidden">←</button><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">{(getThreadHeadline(selectedThread).charAt(0) || 'C').toUpperCase()}</span><div><p className="text-sm font-semibold">{getThreadHeadline(selectedThread)}</p><p className="truncate text-xs text-default-500">{getThreadSubtitle(selectedThread)}</p></div></div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messagesLoading ? (
                  <p className="py-8 text-center text-sm text-default-500">Memuat pesan...</p>
                ) : messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-default-500">Belum ada pesan.</p>
                ) : (
                  messages.map((message) => {
                    const isAdmin = message.senderUserId === selectedThread.merchant_id;
                    const reference = parseChatReference(message.body);
                    return (
                      <div key={message.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${isAdmin ? 'bg-primary text-white' : 'bg-default-100 text-foreground'}`}>
                          <p className="text-[10px] font-semibold uppercase opacity-70">
                            {message.senderDisplayName ?? (isAdmin ? 'Admin' : selectedThread.customer_name ?? 'Customer')}
                          </p>
                          {reference ? (
                            <AdminChatReferenceCard reference={reference} websiteSlug={websiteSlug} />
                          ) : (
                            <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
                          )}
                          <p className={`mt-1 text-[10px] ${isAdmin ? 'text-white/70' : 'text-default-500'}`}>
                            {formatChatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex shrink-0 items-end gap-2 border-t border-default-200 p-3"><Textarea value={draft} onValueChange={setDraft} minRows={1} maxRows={4} placeholder="Tulis balasan..." onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} /><button type="button" onClick={() => void sendMessage()} disabled={sending || !draft.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40">{sending ? '...' : '↑'}</button></div>
            </>}
          </section>
        </div>
      )}
    </div>
  );
}
