'use client';

import Link from 'next/link';

import { NotificationBell } from '@/studio/features/notifications/NotificationBell';
import { usePageMetaStore } from '@/studio/stores/page-meta-store';

import { Icon } from '../icons';
import { ProfileMenu } from './ProfileMenu';

/**
 * Topbar (pola header artboard Pesanan/Fitur/Langganan + Beranda): judul halaman
 * 18px + deskripsi di kiri; aksi halaman, bell, dan avatar di kanan.
 */
export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const meta = usePageMetaStore((s) => s.meta);

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-default-200 bg-white px-4 py-3 sm:gap-x-3 sm:px-8 sm:py-3.5">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Buka menu"
        className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-default-200 bg-white text-default-700 hover:bg-default-50 lg:hidden"
      >
        <Icon name="menu" size={18} strokeWidth={2} />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {meta?.back && (
          <Link href={meta.back.href} className="inline-flex items-center gap-1 text-xs font-semibold text-default-600 no-underline hover:text-primary">
            <Icon name="arrowUp" size={12} className="-rotate-90" /> {meta.back.label}
          </Link>
        )}
        <h1 className="truncate text-lg font-extrabold text-foreground sm:font-bold">
          {meta?.title ?? ''}
          {typeof meta?.count === 'number' && <span className="text-sm font-semibold text-default-500"> · {meta.count}</span>}
        </h1>
        {meta?.description && <p className="hidden text-[13px] text-default-600 sm:block">{meta.description}</p>}
      </div>
      {meta?.actions && (
        <div className="order-last flex w-full flex-wrap items-center gap-2 sm:order-none sm:w-auto">{meta.actions}</div>
      )}
      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationBell />
        <ProfileMenu />
      </div>
    </header>
  );
}
