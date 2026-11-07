export interface ChatReference {
  type: 'product' | 'order' | 'transaction';
  id?: string;
  title: string;
  imageUrl?: string;
  meta?: string;
  href?: string;
}

export function getChatChannelLabel(channelType?: string | null): string {
  switch (channelType) {
    case 'product': return 'Produk';
    case 'support':
    case 'dm': return 'DM';
    case 'order': return 'Order';
    case 'transaction': return 'Transaksi';
    default: return 'Umum';
  }
}

export function getChatStatusLabel(status?: string | null): string {
  switch (status) {
    case 'open': return 'Terbuka';
    case 'waiting': return 'Menunggu';
    case 'resolved': return 'Selesai';
    case 'closed': return 'Ditutup';
    default: return 'Aktif';
  }
}

export function formatChatTime(value?: string | null): string {
  if (!value) return 'Baru';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Baru';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function shortChatRef(id?: string | null): string {
  return (id ?? '').replace(/-/g, '').slice(0, 8) || '----';
}

export function getThreadHeadline(thread: {
  channel_label?: string | null;
  channel_type?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  product_id?: string | null;
  order_id?: string | null;
  id?: string | null;
}): string {
  const type = thread.channel_type ?? '';
  const label = thread.channel_label?.trim() ?? '';
  if (type === 'support' || type === 'dm') return thread.customer_name?.trim() || thread.customer_email?.trim() || 'Pelanggan';
  if (type === 'product') return label || 'Produk';
  if (type === 'transaction' || /^TRX\b/i.test(label)) {
    const raw = label.replace(/^TRX\s*#?/i, '').trim();
    return `TRX ${raw || shortChatRef(thread.order_id ?? thread.id)}`;
  }
  if (type === 'order' || /^Order\b/i.test(label)) {
    const raw = label.replace(/^Order\s*#?/i, '').trim();
    return `Order ${raw || shortChatRef(thread.order_id ?? thread.id)}`;
  }
  return label || getChatChannelLabel(thread.channel_type);
}

function formatLastChatPreview(body?: string | null): string {
  if (!body?.trim()) return 'Belum ada pesan';
  const prefix = '__BAGDJA_CHAT_REFERENCE__';
  if (!body.startsWith(prefix)) return body.replace(/\s+/g, ' ').trim();
  try {
    const value = JSON.parse(body.slice(prefix.length)) as { type?: string };
    if (value.type === 'product') return 'Referensi produk';
    if (value.type === 'transaction') return 'Referensi transaksi';
    if (value.type === 'order') return 'Referensi order';
  } catch {
    return 'Referensi percakapan';
  }
  return 'Referensi percakapan';
}

export function getThreadSubtitle(thread: {
  channel_type?: string | null;
  last_message_preview?: string | null;
  customer_name?: string | null;
}): string {
  const preview = formatLastChatPreview(thread.last_message_preview);
  if (thread.channel_type === 'support' || thread.channel_type === 'dm') return preview;
  const name = thread.customer_name?.trim();
  return name ? `${name} · ${preview}` : preview;
}

export function parseChatReference(body?: string | null): ChatReference | null {
  const prefix = '__BAGDJA_CHAT_REFERENCE__';
  if (!body?.startsWith(prefix)) return null;
  try {
    const value = JSON.parse(body.slice(prefix.length)) as Partial<ChatReference>;
    if ((value.type !== 'product' && value.type !== 'order' && value.type !== 'transaction') || !value.title) return null;
    return {
      type: value.type,
      id: typeof value.id === 'string' ? value.id : undefined,
      title: value.title,
      imageUrl: value.imageUrl,
      meta: value.meta,
      href: value.href,
    };
  } catch {
    return null;
  }
}

export function getChatReferenceLabel(type: ChatReference['type']): string {
  if (type === 'product') return 'produk';
  if (type === 'transaction') return 'transaksi';
  return 'order';
}

export function resolveStudioChatReferenceHref(reference: ChatReference, websiteSlug?: string | null): string | null {
  const stored = reference.href?.trim() ?? '';
  const fromOrderHref = stored.match(/\/(?:order|orders)\/([^/?#]+)/)?.[1];
  if (reference.type === 'order') {
    const draftId = stored.match(/\/cart\/order\/([^/?#]+)/)?.[1];
    const targetId = draftId ?? fromOrderHref ?? reference.id;
    return targetId ? `/studio/quotes?order=${encodeURIComponent(targetId)}` : '/studio/quotes';
  }
  if (reference.type === 'transaction') {
    const targetId = fromOrderHref ?? reference.id;
    return targetId ? `/studio/orders/${encodeURIComponent(targetId)}` : null;
  }
  if (reference.type === 'product') {
    const productSlug = stored.match(/\/products\/([^/?#]+)/)?.[1] ?? reference.id;
    if (!productSlug || !websiteSlug) return '/studio/catalog';
    const webUrl = (process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:5005').replace(/\/+$/, '');
    let base: URL;
    try {
      base = new URL(webUrl);
    } catch {
      return `${webUrl}/${websiteSlug}/products/${productSlug}`;
    }
    if (base.hostname === 'localhost' || base.hostname === '127.0.0.1') {
      return `${webUrl}/${websiteSlug}/products/${productSlug}`;
    }
    base.hostname = `${websiteSlug}.${base.hostname}`;
    base.pathname = `/products/${productSlug}`;
    return base.toString();
  }
  return null;
}
