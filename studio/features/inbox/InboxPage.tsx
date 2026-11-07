'use client';

import { Button, Chip, Textarea } from '@heroui/react';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { StudioChatReferenceCard } from '@/studio/features/inbox/ChatReferenceCard';
import {
  formatChatTime,
  getChatChannelLabel,
  getChatStatusLabel,
  getThreadHeadline,
  getThreadSubtitle,
  parseChatReference,
} from '@/studio/lib/chat';
import {
  fetchChatMessages,
  fetchChatThreads,
  markChatThreadRead,
  sendChatMessage,
  type ChatChannelFilter,
  type ChatMessage,
  type ChatStatusFilter,
  type ChatThread,
} from '@/studio/api/inbox';
import { errorMessage } from '@/studio/api/client';
import { useRealtime } from '@/studio/features/realtime/RealtimeProvider';
import { useSessionUser } from '@/studio/lib/session-user';
import { useActiveWebsite, useActiveWebsiteId } from '@/studio/stores/website-store';
import { Icon } from '@/studio/ui/icons';
import { ListSkeleton } from '@/studio/ui/data-list';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';
import { StatusScreen } from '@/studio/ui/primitives/StatusScreen';
import { notify } from '@/studio/ui/primitives/Toast';

const CHANNELS: Array<{ key: ChatChannelFilter; label: string }> = [
  { key: 'all', label: 'Semua' },
  { key: 'support', label: 'DM' },
  { key: 'product', label: 'Produk' },
  { key: 'order', label: 'Order' },
];

const STATUSES: Array<{ key: ChatStatusFilter; label: string }> = [
  { key: 'all', label: 'Semua status' },
  { key: 'open', label: 'Terbuka' },
  { key: 'waiting', label: 'Menunggu' },
  { key: 'resolved', label: 'Selesai' },
  { key: 'closed', label: 'Ditutup' },
];

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'warning'> = {
  open: 'primary',
  waiting: 'warning',
  resolved: 'success',
  closed: 'default',
};

function messageId(message: ChatMessage): string {
  return message.id || message.messageId || message.message_id || '';
}

function isDuplicateMessage(left: ChatMessage, right: ChatMessage): boolean {
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

function initials(thread: ChatThread): string {
  return getThreadHeadline(thread).trim().charAt(0).toUpperCase() || 'P';
}

function InboxWorkspace() {
  const websiteId = useActiveWebsiteId();
  const website = useActiveWebsite();
  const websiteSlug = website?.website.slug;
  const user = useSessionUser();
  const { subscribe } = useRealtime();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedThreadId = searchParams.get('thread');

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [channel, setChannel] = useState<ChatChannelFilter>(requestedThreadId ? 'all' : 'support');
  const [status, setStatus] = useState<ChatStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(requestedThreadId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const messagesPaneRef = useRef<HTMLDivElement | null>(null);
  const selectedThreadIdRef = useRef<string | null>(selectedThreadId);
  const threadsRef = useRef<ChatThread[]>(threads);
  const currentUserIdRef = useRef<string | null>(user?.userId ?? null);
  const deepLinkThreadIdRef = useRef<string | null>(requestedThreadId);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [selectedThreadId, threads],
  );
  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => Date.parse(a.createdAt ?? a.created_at ?? '') - Date.parse(b.createdAt ?? b.created_at ?? '')),
    [messages],
  );

  selectedThreadIdRef.current = selectedThreadId;
  threadsRef.current = threads;
  currentUserIdRef.current = user?.userId ?? null;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadThreads = useCallback(async (silent = false) => {
    if (!websiteId) return;
    if (!silent) {
      setThreadsLoading(true);
      setThreadsError(null);
    }
    try {
      const deepLinkThreadId = deepLinkThreadIdRef.current;
      const payload = await fetchChatThreads(websiteId, {
        channel: deepLinkThreadId ? 'all' : channel,
        status,
        search: debouncedSearch,
      });
      const next = Array.isArray(payload) ? payload : payload.items ?? [];
      setThreads(next);
      const requested = deepLinkThreadId ? next.find((thread) => thread.id === deepLinkThreadId) : null;
      if (deepLinkThreadId) deepLinkThreadIdRef.current = null;
      if (requested) {
        setSelectedThreadId(requested.id);
        const nextChannel: ChatChannelFilter =
          requested.channel_type === 'support' ? 'support'
            : requested.channel_type === 'product' ? 'product'
              : 'order';
        setChannel((current) => current === nextChannel ? current : nextChannel);
      } else if (deepLinkThreadId) {
        setSelectedThreadId(null);
      } else {
        setSelectedThreadId((current) => current && next.some((thread) => thread.id === current) ? current : null);
      }
    } catch (error) {
      const message = errorMessage(error, 'Gagal memuat inbox chat.');
      if (!silent) setThreadsError(message);
      else notify.error('Inbox gagal diperbarui.', message);
    } finally {
      if (!silent) setThreadsLoading(false);
    }
  }, [channel, debouncedSearch, status, websiteId]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const markRead = useCallback(async (threadId: string) => {
    if (!websiteId) return;
    setThreads((current) => current.map((thread) => thread.id === threadId ? { ...thread, unread_count: 0 } : thread));
    try {
      await markChatThreadRead(websiteId, threadId);
      window.dispatchEvent(new CustomEvent('website-notifications-refresh'));
    } catch (error) {
      notify.warning('Status pesan belum dapat diperbarui.', errorMessage(error));
    }
  }, [websiteId]);

  const loadMessages = useCallback(async (threadId: string, silent = false) => {
    if (!websiteId) return;
    if (!silent) {
      setMessagesLoading(true);
      setMessagesError(null);
      setMessages([]);
    }
    try {
      const payload = await fetchChatMessages(websiteId, threadId);
      const next = Array.isArray(payload) ? payload : payload.items ?? [];
      setMessages(next);
      await markRead(threadId);
    } catch (error) {
      const message = errorMessage(error, 'Gagal memuat pesan.');
      if (!silent) setMessagesError(message);
      else notify.error('Pesan gagal diperbarui.', message);
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  }, [markRead, websiteId]);

  useEffect(() => {
    if (selectedThreadId) {
      void loadMessages(selectedThreadId);
    } else {
      setMessages([]);
      setMessagesError(null);
    }
  }, [loadMessages, selectedThreadId]);

  useEffect(() => {
    const pane = messagesPaneRef.current;
    if (!pane || messagesLoading) return;
    requestAnimationFrame(() => { pane.scrollTop = pane.scrollHeight; });
  }, [messagesLoading, sortedMessages, selectedThreadId]);

  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const maxHeight = 144;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [draft]);

  const openThread = useCallback((threadId: string) => {
    setSelectedThreadId(threadId);
    setDraft('');
    if (requestedThreadId) {
      router.replace(`/studio/inbox?thread=${encodeURIComponent(threadId)}`, { scroll: false });
    }
  }, [requestedThreadId, router]);

  const closeThread = useCallback(() => {
    setSelectedThreadId(null);
    setDraft('');
    router.replace('/studio/inbox', { scroll: false });
  }, [router]);

  const sendMessage = useCallback(async () => {
    const body = draft.trim();
    if (!websiteId || !selectedThreadId || !body || sending) return;
    setSending(true);
    setMessagesError(null);
    try {
      const created = await sendChatMessage(websiteId, selectedThreadId, body);
      const outgoing: ChatMessage = {
        ...created,
        id: messageId(created) || `sent-${Date.now()}`,
        body: created.body ?? body,
        senderUserId: created.senderUserId ?? created.sender_user_id ?? user?.userId ?? null,
        senderDisplayName: created.senderDisplayName ?? created.sender_display_name,
        createdAt: created.createdAt ?? created.created_at ?? new Date().toISOString(),
      };
      setMessages((current) => {
        const duplicate = current.findIndex((message) => isDuplicateMessage(message, outgoing));
        if (duplicate < 0) return [...current, outgoing];
        return current.map((message, index) => index === duplicate ? mergeMessage(message, outgoing) : message);
      });
      setDraft('');
      setThreads((current) => current.map((thread) => (
        thread.id === selectedThreadId
          ? { ...thread, last_message_preview: body.replace(/\s+/g, ' ').slice(0, 140), last_message_at: outgoing.createdAt }
          : thread
      )));
    } catch (error) {
      setMessagesError(errorMessage(error, 'Gagal mengirim balasan.'));
    } finally {
      setSending(false);
    }
  }, [draft, selectedThreadId, sending, user?.userId, websiteId]);

  useEffect(() => {
    if (!websiteId) return;
    const matchesThread = (thread: ChatThread, threadId: string, topicId: string) => (
      Boolean((threadId && thread.id === threadId) || (topicId && thread.topic_id === topicId))
    );

    const unsubscribeMessage = subscribe('website.chat.message.created', (event) => {
      const eventThreadId = String(event.threadId ?? event.thread_id ?? '');
      const eventTopicId = String(event.topicId ?? event.topic_id ?? '');
      if (!eventThreadId && !eventTopicId) return;

      const messageTimestamp = typeof event.createdAt === 'string' ? event.createdAt : new Date().toISOString();
      const eventMessage: ChatMessage = {
        id: String(event.messageId ?? event.message_id ?? event.id ?? `event-${messageTimestamp}`),
        body: typeof event.body === 'string' ? event.body : '',
        senderUserId: typeof (event.senderUserId ?? event.sender_user_id) === 'string'
          ? String(event.senderUserId ?? event.sender_user_id)
          : null,
        senderDisplayName: typeof (event.senderDisplayName ?? event.sender_display_name) === 'string'
          ? String(event.senderDisplayName ?? event.sender_display_name)
          : null,
        createdAt: messageTimestamp,
      };
      const openThreadId = selectedThreadIdRef.current;
      const matchingOpenThread = openThreadId
        ? threadsRef.current.find((thread) => thread.id === openThreadId && matchesThread(thread, eventThreadId, eventTopicId))
        : null;
      const isOpen = Boolean(openThreadId && (openThreadId === eventThreadId || matchingOpenThread));
      const currentIndex = threadsRef.current.findIndex((thread) => matchesThread(thread, eventThreadId, eventTopicId));
      if (currentIndex < 0) {
        void loadThreads(true);
        return;
      }

      setThreads((current) => {
        const index = current.findIndex((thread) => matchesThread(thread, eventThreadId, eventTopicId));
        if (index < 0) return current;
        const updated = current.slice();
        const thread = updated[index];
        updated[index] = {
          ...thread,
          last_message_preview: eventMessage.body?.replace(/\s+/g, ' ').trim().slice(0, 140) || thread.last_message_preview,
          last_message_at: messageTimestamp,
          unread_count: isOpen ? 0 : Number(thread.unread_count ?? 0) + 1,
        };
        return updated.sort((a, b) => Date.parse(b.last_message_at ?? '') - Date.parse(a.last_message_at ?? ''));
      });

      if (!isOpen || !openThreadId) return;
      setMessages((current) => {
        const duplicate = current.findIndex((message) => isDuplicateMessage(message, eventMessage));
        if (duplicate < 0) return [...current, eventMessage];
        return current.map((message, index) => index === duplicate ? mergeMessage(message, eventMessage) : message);
      });
      void markRead(openThreadId);
    });

    const unsubscribeCreated = subscribe('website.chat.thread.created', () => { void loadThreads(true); });
    const unsubscribeUnread = subscribe('website.chat.unread.updated', (event) => {
      const eventUserId = String(event.userId ?? event.user_id ?? '');
      const currentUserId = currentUserIdRef.current;
      if (!currentUserId || !eventUserId || eventUserId !== currentUserId) return;
      const threadId = String(event.threadId ?? event.thread_id ?? '');
      const topicId = String(event.topicId ?? event.topic_id ?? '');
      if (!threadId && !topicId) return;
      const count = Number(event.unreadCount ?? event.unread_count ?? 0);
      setThreads((current) => current.map((thread) => (
        matchesThread(thread, threadId, topicId)
          ? { ...thread, unread_count: Number.isFinite(count) ? count : 0 }
          : thread
      )));
    });

    return () => {
      unsubscribeMessage();
      unsubscribeCreated();
      unsubscribeUnread();
    };
  }, [loadThreads, markRead, subscribe, websiteId]);

  if (!websiteId) {
    return (
      <StatusScreen
        icon={<Icon name="warning" size={28} />}
        title="Website belum dipilih"
        description="Pilih website aktif sebelum membuka inbox."
      />
    );
  }

  const unreadTotal = threads.reduce((total, thread) => total + Number(thread.unread_count ?? 0), 0);

  return (
    <div className="flex min-h-[28rem] flex-col">
      <PageHeader title="Inbox" description={unreadTotal > 0 ? `${unreadTotal} pesan belum dibaca · Kelola percakapan pelanggan dari berbagai kanal.` : 'Kelola percakapan pelanggan dari berbagai kanal.'} />
      <section className="flex h-[calc(100dvh-10.5rem)] min-h-[28rem] overflow-hidden rounded-[14px] border border-default-200 bg-white shadow-sm">
        <aside className={`flex w-full shrink-0 flex-col border-default-200 md:w-[21rem] md:border-r xl:w-[23rem] ${selectedThreadId ? 'hidden md:flex' : 'flex'}`}>
          <div className="border-b border-default-100 p-3.5">
            <label className="sr-only" htmlFor="inbox-search">Cari percakapan</label>
            <div className="relative">
              <Icon name="search" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-default-500" />
              <input
                id="inbox-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari percakapan..."
                className="min-h-10 w-full rounded-[10px] border border-default-300 bg-white py-2 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-default-400 focus:border-primary"
              />
            </div>
            <div className="-mx-1 mt-3 flex gap-1 overflow-x-auto px-1 pb-1">
              {CHANNELS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={channel === option.key}
                  onClick={() => setChannel(option.key)}
                  className={`min-h-8 shrink-0 rounded-full px-3 text-xs font-semibold transition-colors ${
                    channel === option.key ? 'bg-primary text-white' : 'bg-default-100 text-default-600 hover:bg-default-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor="inbox-status-filter">Filter status</label>
            <select
              id="inbox-status-filter"
              value={status}
              onChange={(event) => setStatus(event.target.value as ChatStatusFilter)}
              className="mt-2 min-h-9 w-full rounded-[10px] border border-default-200 bg-white px-3 text-[13px] text-default-700 outline-none focus:border-primary"
            >
              {STATUSES.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {threadsLoading ? (
              <div className="p-3"><ListSkeleton rows={5} /></div>
            ) : threadsError ? (
              <div className="p-5 text-center">
                <Icon name="warning" size={24} className="mx-auto text-danger" />
                <p className="mt-2 text-sm font-semibold text-foreground">Inbox gagal dimuat</p>
                <p className="mt-1 text-xs text-default-600">{threadsError}</p>
                <Button size="sm" variant="bordered" className="mt-3" onPress={() => void loadThreads()}>Coba lagi</Button>
              </div>
            ) : threads.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary"><Icon name="chat" size={22} /></span>
                <p className="mt-3 text-sm font-bold text-foreground">{debouncedSearch ? 'Tidak ada percakapan yang cocok' : 'Belum ada percakapan'}</p>
                <p className="mt-1 text-xs leading-relaxed text-default-500">
                  {debouncedSearch ? 'Coba kata kunci lain.' : 'Chat pelanggan dari produk, support, atau order akan muncul di sini.'}
                </p>
              </div>
            ) : (
              <ul aria-label="Daftar percakapan" className="divide-y divide-default-100">
                {threads.map((thread) => (
                  <li key={thread.id}>
                    <button
                      type="button"
                      aria-current={selectedThreadId === thread.id ? 'true' : undefined}
                      onClick={() => openThread(thread.id)}
                      className={`flex min-h-[76px] w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-default-50 ${
                        selectedThreadId === thread.id ? 'bg-primary-50/70' : ''
                      }`}
                    >
                      <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        Number(thread.unread_count ?? 0) > 0 ? 'bg-primary text-white' : 'bg-default-100 text-default-700'
                      }`}>
                        {initials(thread)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-bold text-foreground">{getThreadHeadline(thread)}</span>
                          <span className="shrink-0 text-[10px] text-default-500">{formatChatTime(thread.last_message_at)}</span>
                        </span>
                        <span className="mt-1 block truncate text-xs text-default-600">{getThreadSubtitle(thread)}</span>
                        <span className="mt-1.5 flex items-center justify-between gap-2">
                          <span className="truncate rounded-full bg-default-100 px-2 py-0.5 text-[10px] font-semibold text-default-600">
                            {getChatChannelLabel(thread.channel_type)}
                          </span>
                          {Number(thread.unread_count ?? 0) > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                              {thread.unread_count}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-between border-t border-default-100 px-4 py-2.5 text-xs text-default-500">
            <span>{threads.length} percakapan</span>
            <button type="button" onClick={() => void loadThreads()} aria-label="Muat ulang inbox" className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-default-100">
              <Icon name="refresh" size={16} />
            </button>
          </div>
        </aside>

        <section className={`min-w-0 flex-1 flex-col ${selectedThreadId ? 'flex' : 'hidden md:flex'}`} aria-label="Percakapan">
          {!selectedThread ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-default-100 text-default-500"><Icon name="chat" size={26} /></span>
              <h2 className="mt-4 text-base font-bold text-foreground">Pilih percakapan</h2>
              <p className="mt-1 max-w-xs text-sm text-default-500">Pilih chat dari daftar untuk melihat pesan dan membalas pelanggan.</p>
            </div>
          ) : (
            <>
              <header className="flex min-h-[4.25rem] shrink-0 items-center gap-3 border-b border-default-200 px-3.5 py-2.5 sm:px-5">
                <button type="button" onClick={closeThread} aria-label="Kembali ke daftar percakapan" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-default-600 hover:bg-default-100 md:hidden">
                  <Icon name="arrowUp" size={18} className="-rotate-90" />
                </button>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary">{initials(selectedThread)}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-bold text-foreground">{getThreadHeadline(selectedThread)}</h2>
                  <p className="truncate text-xs text-default-500">{getThreadSubtitle(selectedThread)}</p>
                </div>
                <Chip size="sm" variant="flat" color={STATUS_COLORS[selectedThread.status ?? ''] ?? 'default'}>
                  {getChatStatusLabel(selectedThread.status)}
                </Chip>
              </header>

              <div ref={messagesPaneRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-default-50/50 px-3 py-4 sm:px-6">
                {messagesLoading ? (
                  <div className="space-y-3 py-3" role="status" aria-label="Memuat pesan">
                    {[0, 1, 2].map((item) => <div key={item} className={`h-16 max-w-[70%] animate-pulse rounded-2xl bg-default-200 ${item % 2 ? 'ml-auto' : ''}`} />)}
                  </div>
                ) : messagesError ? (
                  <div className="mx-auto mt-8 max-w-sm rounded-xl border border-danger-200 bg-white p-5 text-center" role="alert">
                    <Icon name="warning" size={24} className="mx-auto text-danger" />
                    <p className="mt-2 text-sm font-semibold text-foreground">Pesan gagal dimuat</p>
                    <p className="mt-1 text-xs text-default-600">{messagesError}</p>
                    <Button size="sm" variant="bordered" className="mt-3" onPress={() => void loadMessages(selectedThread.id)}>Coba lagi</Button>
                  </div>
                ) : sortedMessages.length === 0 ? (
                  <p className="py-12 text-center text-sm text-default-500">Belum ada pesan di percakapan ini.</p>
                ) : sortedMessages.map((message) => {
                  const senderId = message.senderUserId ?? message.sender_user_id;
                  const isAdmin = senderId === selectedThread.merchant_id || senderId === user?.userId;
                  const reference = parseChatReference(message.body);
                  return (
                    <div key={messageId(message)} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <article className={`max-w-[min(34rem,88%)] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                        isAdmin ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md border border-default-200 bg-white text-foreground'
                      }`}>
                        <p className={`text-[10px] font-semibold uppercase tracking-wide ${isAdmin ? 'text-white/75' : 'text-default-500'}`}>
                          {message.senderDisplayName ?? message.sender_display_name ?? (isAdmin ? 'Admin' : selectedThread.customer_name ?? 'Pelanggan')}
                        </p>
                        {reference ? (
                        <StudioChatReferenceCard reference={reference} websiteSlug={websiteSlug} />
                        ) : (
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body || '—'}</p>
                        )}
                        <p className={`mt-1.5 text-right text-[10px] ${isAdmin ? 'text-white/70' : 'text-default-500'}`}>
                          {formatChatTime(message.createdAt ?? message.created_at)}
                        </p>
                      </article>
                    </div>
                  );
                })}
              </div>

              <div className="shrink-0 border-t border-default-200 bg-white p-3 sm:p-4">
                {messagesError && !messagesLoading && (
                  <p role="alert" className="mb-2 text-xs text-danger">{messagesError}</p>
                )}
                <div className="flex items-end gap-2 rounded-xl border border-default-200 bg-default-50 p-2 focus-within:border-primary">
                  <Textarea
                    ref={composerRef}
                    aria-label="Tulis balasan"
                    value={draft}
                    onValueChange={setDraft}
                    minRows={1}
                    maxRows={5}
                    maxLength={4000}
                    placeholder="Tulis balasan..."
                    variant="flat"
                    classNames={{
                      base: 'flex-1',
                      inputWrapper: 'min-h-10 bg-transparent px-2 py-1 shadow-none data-[hover=true]:bg-transparent group-data-[focus=true]:bg-transparent',
                      input: 'text-sm',
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void sendMessage();
                      }
                    }}
                  />
                  <Button
                    isIconOnly
                    aria-label="Kirim balasan"
                    color="primary"
                    isLoading={sending}
                    isDisabled={!draft.trim() || messagesLoading}
                    onPress={() => void sendMessage()}
                    className="mb-0.5"
                  >
                    <Icon name="arrowUp" size={18} className="rotate-90" />
                  </Button>
                </div>
                <p className="mt-1.5 px-1 text-[10px] text-default-400">Enter untuk mengirim · Shift + Enter untuk baris baru</p>
              </div>
            </>
          )}
        </section>
      </section>
    </div>
  );
}

export function InboxPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={6} />}>
      <InboxWorkspace />
    </Suspense>
  );
}
