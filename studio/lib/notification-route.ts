/**
 * `action_url` notifikasi dibuat oleh API dengan pola path admin lama
 * (mis. `/dashboard/orders/{id}`, `/dashboard/chats?thread=`, `/dashboard/penawaran?order=`).
 * Studio menerjemahkannya ke rute Studio padanannya (plan §4.3) — tidak pernah
 * membuka tampilan lama. Area yang belum dibangun menampilkan "sedang disiapkan".
 *
 * Catatan: string prefix di bawah adalah DATA dari API (bukan tautan); bisa
 * dihapus setelah API mengirim path Studio langsung.
 */
const API_PREFIX = '/dashboard';

const PATH_MAP: ReadonlyArray<readonly [from: string, to: string]> = [
  ['/websites/new', '/studio/websites/new'],
  ['/pages', '/studio/appearance'],
  ['/footer', '/studio/appearance'],
  ['/faqs', '/studio/faq'],
  ['/blog', '/studio/blog'],
  ['/products', '/studio/catalog'],
  ['/assets', '/studio/assets'],
  ['/billing', '/studio/subscription'],
  ['/locations', '/studio/locations'],
  ['/vendors', '/studio/vendors'],
  ['/staff', '/studio/team'],
  ['/settings', '/studio/settings'],
  // Build Android kini tab di Pengaturan; `rest` (mis. query) ditambahkan di toStudioPath.
  ['/android-app', '/studio/settings?tab=android'],
  ['/orders', '/studio/orders'],
  ['/penawaran', '/studio/quotes'],
  ['/tagihan', '/studio/invoices'],
  ['/calendar', '/studio/events'],
  ['/fulfillment-flows', '/studio/flows'],
  ['/chats', '/studio/inbox'],
];

/** Path relatif apa pun → path Studio. Path Studio/eksternal dibiarkan; selain itu → `/studio`. */
export function toStudioPath(actionUrl: string): string {
  if (!actionUrl.startsWith('/')) return '/studio';
  if (actionUrl === '/studio' || actionUrl.startsWith('/studio/') || actionUrl.startsWith('/studio?')) return actionUrl;

  const match = actionUrl.match(/^([^?#]*)(.*)$/);
  const path = match?.[1] ?? actionUrl;
  const rest = match?.[2] ?? '';
  const sub = path.startsWith(API_PREFIX) ? path.slice(API_PREFIX.length) : path;
  if (sub === '' || sub === '/') return `/studio${rest}`;

  for (const [from, to] of PATH_MAP) {
    if (sub === from || sub.startsWith(`${from}/`)) {
      // Tujuan berquery (mis. tab Pengaturan): sub-path dibuang, query asli digabung dengan `&`.
      if (to.includes('?')) return rest.startsWith('?') ? `${to}&${rest.slice(1)}` : `${to}${rest}`;
      return `${to}${sub.slice(from.length)}${rest}`;
    }
  }
  return '/studio';
}
