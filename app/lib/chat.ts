import { buildTenantWebUrl } from './preview-url';

export function getChatChannelLabel(channelType?: string | null): string {
  switch (channelType) {
    case 'product':
      return 'Produk';
    case 'support':
      return 'Support';
    case 'order':
      return 'Order';
    case 'transaction':
      return 'Transaksi';
    default:
      return 'Umum';
  }
}

export function getChatStatusLabel(status?: string | null): string {
  switch (status) {
    case 'open':
      return 'Terbuka';
    case 'waiting':
      return 'Menunggu';
    case 'resolved':
      return 'Selesai';
    case 'closed':
      return 'Ditutup';
    default:
      return 'Aktif';
  }
}

export function formatChatTime(value?: string | null): string {
  if (!value) return 'Baru';

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Baru';

    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return 'Baru';
  }
}

const REFERENCE_PREFIX = '__BAGDJA_CHAT_REFERENCE__';

function shortChatRef(id?: string | null): string {
  const compact = (id ?? '').replace(/-/g, '');
  return compact.slice(0, 8) || '----';
}

function isAdminDmThread(thread: { channel_type?: string | null }): boolean {
  const type = thread.channel_type ?? '';
  return type === 'support' || type === 'dm';
}

function customerDisplayName(thread: {
  customer_name?: string | null;
  customer_email?: string | null;
}): string {
  return thread.customer_name?.trim() || thread.customer_email?.trim() || 'Pelanggan';
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

  if (isAdminDmThread(thread)) return customerDisplayName(thread);
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

export function formatLastChatPreview(body?: string | null): string {
  if (!body?.trim()) return 'Belum ada pesan';
  if (body.startsWith(REFERENCE_PREFIX)) {
    try {
      const value = JSON.parse(body.slice(REFERENCE_PREFIX.length)) as { type?: string };
      if (value.type === 'product') return 'Referensi produk';
      if (value.type === 'transaction') return 'Referensi transaksi';
      if (value.type === 'order') return 'Referensi order';
    } catch {
      // fall through
    }
    return 'Referensi percakapan';
  }
  return body.replace(/\s+/g, ' ').trim();
}

export function getThreadSubtitle(thread: {
  channel_type?: string | null;
  last_message_preview?: string | null;
  customer_name?: string | null;
}): string {
  const preview = formatLastChatPreview(thread.last_message_preview);
  if (isAdminDmThread(thread)) return preview;
  const name = thread.customer_name?.trim();
  return name ? `${name} · ${preview}` : preview;
}

export type ChatReference = {
  type: 'product' | 'order' | 'transaction';
  id?: string;
  title: string;
  imageUrl?: string;
  meta?: string;
  href?: string;
};

export function createChatReferenceMessage(reference: ChatReference): string {
  return `${REFERENCE_PREFIX}${JSON.stringify(reference)}`;
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

export function resolveAdminChatReferenceHref(reference: ChatReference, websiteSlug?: string | null): string | null {
  const stored = reference.href?.trim() ?? '';
  const fromOrderHref = stored.match(/\/(?:order|orders)\/([^/?#]+)/)?.[1];
  const productSlug = stored.match(/\/products\/([^/?#]+)/)?.[1] ?? reference.id;

  if (reference.type === 'order') {
    const fromDraftHref = stored.match(/\/cart\/order\/([^/?#]+)/)?.[1];
    const targetId = fromDraftHref ?? fromOrderHref ?? reference.id;
    return targetId ? `/dashboard/penawaran?order=${encodeURIComponent(targetId)}` : '/dashboard/penawaran';
  }

  if (reference.type === 'transaction') {
    const targetId = fromOrderHref ?? reference.id;
    return targetId ? `/dashboard/orders/${targetId}` : null;
  }

  if (reference.type === 'product') {
    if (productSlug && websiteSlug) {
      return buildTenantWebUrl(websiteSlug, `products/${productSlug}`);
    }
    return '/dashboard/products';
  }

  return null;
}
