import {
  fetchDraftOrderCount,
  fetchPendingTransactionCount,
  fetchPlannedGatheringCount,
  fetchScheduledTerminCount,
} from '@/studio/api/badges';
import type { ModuleKey, TenantRole } from '@/studio/api/types';

import type { NavIconKey } from './nav-icons';

export type NavBadgeLoader = (websiteId: string) => Promise<number>;

export interface NavItem {
  id: string;
  label: string;
  icon: NavIconKey;
  /** Rute Studio (plan §4.3). Halaman yang belum dibangun menampilkan "sedang disiapkan". */
  href: string;
  module?: ModuleKey;
  minRole?: TenantRole;
  ownerOnly?: boolean;
  /** Hanya untuk rute Studio: aktif bila path sama persis (Beranda). */
  exact?: boolean;
  badge?: NavBadgeLoader;
}

export interface NavGroup {
  id: string;
  /** `null` = kelompok tanpa judul (Beranda). */
  label: string | null;
  items: NavItem[];
}

/**
 * Registry menu Studio (plan §3.3, artboard Sidebar). Semua item menaut ke rute
 * Studio; halaman yang belum dibangun ditangani catch-all `app/studio/[[...studioPath]]`.
 */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: 'home',
    label: null,
    items: [{ id: 'home', label: 'Beranda', icon: 'home', href: '/studio', exact: true }],
  },
  {
    id: 'website',
    label: 'Website',
    items: [
      { id: 'appearance', label: 'Tampilan Website', icon: 'appearance', module: 'site_content', href: '/studio/appearance' },
      { id: 'faq', label: 'FAQ', icon: 'faq', module: 'faq', href: '/studio/faq' },
      { id: 'blog', label: 'Blog', icon: 'blog', module: 'blog', href: '/studio/blog' },
    ],
  },
  {
    id: 'sales',
    label: 'Jualan',
    items: [
      { id: 'catalog', label: 'Produk & Layanan', icon: 'catalog', module: 'catalog', href: '/studio/catalog' },
      { id: 'quotes', label: 'Penawaran', icon: 'quotes', module: 'quotes', href: '/studio/quotes', badge: fetchDraftOrderCount },
      { id: 'orders', label: 'Pesanan', icon: 'orders', module: 'orders', href: '/studio/orders', badge: fetchPendingTransactionCount },
    ],
  },
  {
    id: 'finance',
    label: 'Keuangan',
    items: [
      { id: 'wallet', label: 'Saldo', icon: 'wallet', module: 'wallet', ownerOnly: true, href: '/studio/wallet' },
      { id: 'invoices', label: 'Tagihan', icon: 'billing', module: 'billing', href: '/studio/invoices', badge: fetchScheduledTerminCount },
      { id: 'subscription', label: 'Langganan', icon: 'subscription', module: 'subscription', ownerOnly: true, href: '/studio/subscription' },
    ],
  },
  {
    id: 'operations',
    label: 'Operasional',
    items: [
      { id: 'appointments', label: 'Jadwal & Booking', icon: 'appointments', module: 'appointments', href: '/studio/appointments' },
      { id: 'rentals', label: 'Aset & Sewa', icon: 'rental', module: 'rental', href: '/studio/rentals' },
      { id: 'tickets', label: 'Tiket & Venue', icon: 'ticketing', module: 'ticketing', href: '/studio/tickets' },
      { id: 'events', label: 'Kalender Acara', icon: 'events', module: 'events', href: '/studio/events', badge: fetchPlannedGatheringCount },
      { id: 'flows', label: 'Master Flow', icon: 'fulfillment', module: 'fulfillment', href: '/studio/flows' },
      { id: 'locations', label: 'Lokasi', icon: 'locations', module: 'locations', href: '/studio/locations' },
      { id: 'vendors', label: 'Vendor', icon: 'vendors', module: 'vendors', href: '/studio/vendors' },
      { id: 'assets', label: 'Digital Asset', icon: 'digital_delivery', module: 'digital_delivery', href: '/studio/assets' },
    ],
  },
  {
    id: 'communication',
    label: 'Komunikasi',
    items: [
      { id: 'inbox', label: 'Inbox Chat', icon: 'customer_chat', module: 'customer_chat', href: '/studio/inbox' },
    ],
  },
  {
    id: 'settings',
    label: 'Pengaturan',
    items: [
      { id: 'settings', label: 'Pengaturan', icon: 'settings', module: 'settings', minRole: 'admin', href: '/studio/settings' },
      { id: 'team', label: 'Tim', icon: 'team', module: 'team', href: '/studio/team' },
      { id: 'features', label: 'Fitur', icon: 'features', href: '/studio/features' },
    ],
  },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Item menu yang memiliki `pathname` (prefix terpanjang). */
export function navItemForPath(pathname: string): NavItem | null {
  let best: NavItem | null = null;
  for (const item of NAV_GROUPS.flatMap((g) => g.items)) {
    if (item.exact) continue;
    const match = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (match && (!best || item.href.length > best.href.length)) best = item;
  }
  return best;
}
