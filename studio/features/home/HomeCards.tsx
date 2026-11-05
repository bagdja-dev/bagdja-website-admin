'use client';

import Link from 'next/link';

import type { WebsiteDto } from '@/studio/api/types';
import { buildTenantWebUrl, displayHost } from '@/studio/lib/template-preview';
import { siteTileColor } from '@/studio/ui/shell/site-identity';

/** Kartu website (artboard Beranda): sketsa, status, URL, Lihat website / Edit tampilan. */
export function WebsiteCard({ website }: { website: WebsiteDto }) {
  const accent = siteTileColor(website.id).bg;
  return (
    <section className="overflow-hidden rounded-2xl border border-default-200 bg-white">
      <div aria-hidden="true" className="flex h-[120px] flex-col justify-end gap-2 bg-[#1C1917] p-4">
        <span className="h-2 w-2/5 rounded" style={{ background: accent }} />
        <span className="h-3.5 w-3/4 rounded bg-[#FAFAF9] opacity-90" />
        <span className="h-3.5 w-[55%] rounded bg-[#FAFAF9] opacity-50" />
      </div>
      <div className="flex flex-col gap-2.5 p-4">
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${website.is_active ? 'text-success' : 'text-default-600'}`}>
          <span className={`h-2 w-2 rounded-full ${website.is_active ? 'bg-[#16A34A]' : 'bg-default-400'}`} />
          {website.is_active ? 'Online' : 'Nonaktif'}
        </span>
        <span className="truncate text-sm font-semibold">{displayHost(website.slug)}</span>
        <div className="flex gap-2">
          <a
            href={buildTenantWebUrl(website.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-[10px] border border-default-300 text-[13px] font-semibold text-foreground no-underline hover:bg-default-50"
          >
            Lihat website
          </a>
          <Link
            href="/studio/appearance"
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-[10px] bg-foreground text-[13px] font-semibold text-white no-underline"
          >
            Edit tampilan
          </Link>
        </div>
      </div>
    </section>
  );
}

export interface StatsCardProps {
  newOrders: number | null;
  unreadChats: number | null;
}

/** Ringkasan (artboard Beranda): Pesanan baru & Chat belum dibaca — hanya untuk modul aktif. */
export function StatsCard({ newOrders, unreadChats }: StatsCardProps) {
  const items = [
    newOrders !== null ? { label: 'Pesanan baru', value: newOrders } : null,
    unreadChats !== null ? { label: 'Chat belum dibaca', value: unreadChats } : null,
  ].filter((i): i is { label: string; value: number } => i !== null);
  if (items.length === 0) return null;
  return (
    <section aria-label="Ringkasan" className="grid grid-cols-2 gap-3 rounded-2xl border border-default-200 bg-white p-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-default-600">{item.label}</span>
          <span className="text-[26px] font-extrabold">{item.value}</span>
        </div>
      ))}
      {newOrders === 0 && (
        <p className="col-span-2 text-[13px] leading-normal text-default-600">
          Belum ada pesanan. Bagikan link website ke pelanggan agar pesanan pertama masuk ke sini.
        </p>
      )}
    </section>
  );
}

export function MoreFeaturesCard() {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-primary-200 bg-primary-50 p-4">
      <span className="text-sm font-bold text-primary-700">Butuh fitur lain?</span>
      <span className="text-[13px] leading-normal text-primary-700">
        Penawaran harga, Vendor, Kalender Acara, dan lainnya bisa diaktifkan kapan saja.
      </span>
      <Link href="/studio/features" className="text-[13px] font-bold text-primary">
        Lihat semua fitur →
      </Link>
    </section>
  );
}
