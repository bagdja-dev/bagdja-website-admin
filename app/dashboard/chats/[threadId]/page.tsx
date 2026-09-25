'use client';

import { Button, Card, CardBody, Textarea } from '@heroui/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRealtime } from '../../../components/realtime-provider';
import { LoadingSpinner } from '../../../components/loading-spinner';
import { NoWebsiteState } from '../../../components/no-website-state';
import { useWebsiteContext } from '../../../context/website-context';
import { apiClient } from '../../../lib/api-client';
import { AdminChatReferenceCard } from '../../../components/chat-reference-card';
import { formatChatTime, getThreadHeadline, getThreadSubtitle, parseChatReference } from '../../../lib/chat';

interface ChatThread {
  id: string;
  topic_id?: string | null;
  merchant_id?: string | null;
  channel_type?: string | null;
  channel_label?: string | null;
  customer_user_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  product_id?: string | null;
  order_id?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_message_preview?: string | null;
  unread_count?: number | null;
}

interface ChatMessage {
  id: string;
  topic_id?: string | null;
  senderUserId?: string | null;
  senderDisplayName?: string | null;
  body?: string | null;
  createdAt?: string | null;
  author_type?: string | null;
}

export default function ChatDetailPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = params?.threadId;
  const { websiteId, loading: websiteLoading, activeWebsite } = useWebsiteContext();
  const websiteSlug = activeWebsite?.website.slug;
  const { subscribe } = useRealtime();
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const refreshThread = useCallback(async () => {
    if (!websiteId || !threadId) return;

    try {
      const [threadData, messageData] = await Promise.all([
        apiClient<ChatThread>(`/api/chat/${websiteId}/threads/${threadId}`),
        apiClient<{ items?: ChatMessage[]; total?: number } | ChatMessage[]>(`/api/chat/${websiteId}/threads/${threadId}/messages`),
      ]);

      setThread(threadData);
      const nextMessages = Array.isArray(messageData) ? messageData : messageData.items ?? [];
      setMessages(nextMessages);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat detail chat');
    } finally {
      setLoading(false);
    }
  }, [threadId, websiteId]);

  useEffect(() => {
    void refreshThread();
  }, [refreshThread]);

  useEffect(() => {
    if (!websiteId || !threadId) return;

    const markRead = async () => {
      try {
        await apiClient(`/api/chat/${websiteId}/threads/${threadId}/read`, { method: 'POST' });
      } catch {
        // No-op: unread state is best-effort on open.
      }
    };

    void markRead();
  }, [threadId, websiteId]);

  useEffect(() => {
    if (!websiteId || !threadId) return;

    const unsubscribeMessage = subscribe('website.chat.message.created', (eventData) => {
      const eventThreadId = String((eventData as Record<string, unknown>).threadId ?? (eventData as Record<string, unknown>).thread_id ?? '');
      if (eventThreadId === threadId) {
        void refreshThread();
      }
    });

    const unsubscribeUnread = subscribe('website.chat.unread.updated', (eventData) => {
      const eventThreadId = String((eventData as Record<string, unknown>).threadId ?? (eventData as Record<string, unknown>).thread_id ?? '');
      if (eventThreadId === threadId) {
        void refreshThread();
      }
    });

    return () => {
      unsubscribeMessage();
      unsubscribeUnread();
    };
  }, [refreshThread, subscribe, threadId, websiteId]);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()),
    [messages],
  );

  const sendMessage = useCallback(async () => {
    if (!websiteId || !threadId || !draft.trim()) return;

    setSubmitting(true);
    try {
      await apiClient(`/api/chat/${websiteId}/threads/${threadId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: draft.trim() }),
      });
      setDraft('');
      await refreshThread();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim pesan');
    } finally {
      setSubmitting(false);
    }
  }, [draft, refreshThread, threadId, websiteId]);

  if (websiteLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Button as={Link} href="/dashboard/chats" variant="light" size="sm" className="mb-3">
            ← Kembali ke inbox
          </Button>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {thread ? getThreadHeadline(thread) : 'Chat detail'}
          </h1>
          {thread && (
            <p className="mt-1 text-default-500">
              {getThreadSubtitle(thread)}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner className="h-56" />
      ) : error ? (
        <Card className="border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="py-10 text-center text-sm text-danger">{error}</CardBody>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
          <Card className="border-0 shadow-md ring-1 ring-default-100">
            <CardBody className="space-y-4 p-4">
              <div className="max-h-[520px] space-y-3 overflow-y-auto pr-2">
                {sortedMessages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-default-500">Belum ada pesan. Mulai percakapan sekarang.</p>
                ) : (
                  sortedMessages.map((message) => {
                    const isAdmin = message.senderUserId === thread?.merchant_id;
                    const reference = parseChatReference(message.body);
                    return (
                      <div key={message.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-md rounded-2xl px-3 py-2 ${isAdmin ? 'bg-primary text-white' : 'bg-default-100 text-foreground'}`}>
                          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                            {message.senderDisplayName ?? 'User'}
                          </p>
                          {reference ? (
                            <AdminChatReferenceCard reference={reference} websiteSlug={websiteSlug} />
                          ) : (
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{message.body ?? '-'}</p>
                          )}
                          <p className={`mt-2 text-[10px] ${isAdmin ? 'text-white/80' : 'text-default-500'}`}>
                            {formatChatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="space-y-3 border-t border-default-200 pt-4">
                <Textarea
                  value={draft}
                  onValueChange={setDraft}
                  minRows={3}
                  maxRows={6}
                  placeholder="Tulis balasan untuk pelanggan..."
                />
                <div className="flex justify-end">
                  <Button color="primary" onPress={() => void sendMessage()} isLoading={submitting} isDisabled={!draft.trim() || submitting}>
                    Kirim balasan
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {thread && (
            <Card className="border-0 shadow-md ring-1 ring-default-100">
              <CardBody className="space-y-4 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-default-500">Ringkasan</p>
                  <p className="mt-2 text-base font-semibold">{getThreadHeadline(thread)}</p>
                  <p className="mt-1 text-sm text-default-500">{getThreadSubtitle(thread)}</p>
                </div>

                <div className="rounded-xl bg-default-50 p-3 text-sm text-default-600">
                  <p className="font-medium text-foreground">Customer</p>
                  <p className="mt-1">{thread.customer_name ?? thread.customer_email ?? thread.customer_user_id ?? 'Tidak tersedia'}</p>
                </div>

                {thread.product_id && (
                  <div className="rounded-xl bg-default-50 p-3 text-sm text-default-600">
                    <p className="font-medium text-foreground">Produk</p>
                    <p className="mt-1">{thread.product_id}</p>
                  </div>
                )}

                {thread.order_id && (
                  <div className="rounded-xl bg-default-50 p-3 text-sm text-default-600">
                    <p className="font-medium text-foreground">Order</p>
                    <p className="mt-1">{thread.order_id}</p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
