import type { ModuleKey } from '@/studio/api/types';

/** Modul inti — selalu aktif (kontrak §1.1). */
export const CORE_MODULES: readonly ModuleKey[] = ['site_content', 'team', 'subscription', 'wallet', 'settings'];

/**
 * Cadangan HANYA bila `GET /api/business-profiles` belum ada (404): modul yang
 * sudah dibangun = `available`. Sumber kebenaran tetap registry di API.
 */
export const FALLBACK_AVAILABLE_MODULES: readonly ModuleKey[] = [
  ...CORE_MODULES,
  'catalog',
  'orders',
  'quotes',
  'billing',
  'fulfillment',
  'events',
  'digital_delivery',
  'locations',
  'vendors',
  'customer_chat',
  'faq',
  'blog',
  'android_app',
];

/** Label cadangan untuk ModuleDisabledState bila katalog dari API belum termuat. */
export const FALLBACK_MODULE_LABELS: Readonly<Record<ModuleKey, string>> = {
  site_content: 'Tampilan Website',
  team: 'Tim',
  subscription: 'Langganan',
  wallet: 'Saldo',
  settings: 'Pengaturan',
  catalog: 'Produk dan Jasa',
  orders: 'Pesanan',
  quotes: 'Penawaran',
  billing: 'Tagihan',
  fulfillment: 'Master Flow',
  events: 'Gathering',
  digital_delivery: 'Digital Asset',
  locations: 'Lokasi',
  vendors: 'Vendor',
  customer_chat: 'Inbox Chat',
  faq: 'FAQ',
  blog: 'Blog',
  android_app: 'Aplikasi Android',
  appointments: 'Jadwal & Booking',
  rental: 'Aset & Sewa',
  asset_tracking: 'Pelacakan Aset',
  ticketing: 'Tiket & Venue',
};
