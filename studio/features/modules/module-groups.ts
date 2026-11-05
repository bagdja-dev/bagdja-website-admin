import type { ModuleKey } from '@/studio/api/types';

/** Pengelompokan kartu di halaman Fitur (artboard "7 · Fitur"). Modul inti tidak ditampilkan. */
export const FEATURE_SECTIONS: ReadonlyArray<{ label: string; keys: readonly ModuleKey[] }> = [
  { label: 'Jualan', keys: ['catalog', 'orders', 'quotes', 'billing'] },
  {
    label: 'Operasional',
    keys: ['appointments', 'rental', 'asset_tracking', 'ticketing', 'fulfillment', 'events', 'digital_delivery', 'locations', 'vendors'],
  },
  { label: 'Konten & komunikasi', keys: ['customer_chat', 'blog', 'faq', 'android_app'] },
];
