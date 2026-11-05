import type { ModuleKey } from '@/studio/api/types';

/**
 * Peta rute Studio → modul (plan §4.3). Dipakai `ModuleGate` di layout Studio
 * untuk menampilkan `ModuleDisabledState` alih-alih 404. Prefix terpanjang menang.
 */
export const STUDIO_ROUTE_MODULES: ReadonlyArray<{ prefix: string; module: ModuleKey }> = [
  { prefix: '/studio/faq', module: 'faq' },
  { prefix: '/studio/blog', module: 'blog' },
  { prefix: '/studio/catalog', module: 'catalog' },
  { prefix: '/studio/assets', module: 'digital_delivery' },
  { prefix: '/studio/wallet', module: 'wallet' },
  { prefix: '/studio/subscription', module: 'subscription' },
  { prefix: '/studio/locations', module: 'locations' },
  { prefix: '/studio/vendors', module: 'vendors' },
  { prefix: '/studio/orders', module: 'orders' },
  { prefix: '/studio/quotes', module: 'quotes' },
  { prefix: '/studio/invoices', module: 'billing' },
  { prefix: '/studio/events', module: 'events' },
  { prefix: '/studio/flows', module: 'fulfillment' },
  { prefix: '/studio/inbox', module: 'customer_chat' },
  { prefix: '/studio/appointments', module: 'appointments' },
  { prefix: '/studio/rentals', module: 'rental' },
  { prefix: '/studio/tickets', module: 'ticketing' },
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function moduleForPath(pathname: string): ModuleKey | null {
  let best: { prefix: string; module: ModuleKey } | null = null;
  for (const entry of STUDIO_ROUTE_MODULES) {
    if (matchesPrefix(pathname, entry.prefix) && (!best || entry.prefix.length > best.prefix.length)) {
      best = entry;
    }
  }
  return best?.module ?? null;
}

export { matchesPrefix };
