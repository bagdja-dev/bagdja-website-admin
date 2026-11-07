'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { WebsiteNotificationDto } from '@/studio/api/types';
import { formatShortDateTime } from '@/studio/lib/format';
import { toStudioPath } from '@/studio/lib/notification-route';
import { Icon } from '@/studio/ui/icons';
import { useActiveWebsiteId } from '@/studio/stores/website-store';

import { useNotifications } from './use-notifications';

/** Bell notifikasi topbar (parity C · Shell notifikasi). Tidak dirender tanpa website aktif. */
export function NotificationBell() {
  const router = useRouter();
  const websiteId = useActiveWebsiteId();
  const { items, unreadCount, markAllRead, markRead } = useNotifications(websiteId);
  const [open, setOpen] = useState(false);

  if (!websiteId) return null;

  const openItem = async (item: WebsiteNotificationDto): Promise<void> => {
    await markRead(item);
    setOpen(false);
    if (item.action_url) router.push(toStudioPath(item.action_url));
  };

  const badge = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <Popover placement="bottom-end" isOpen={open} onOpenChange={setOpen} offset={8}>
      <PopoverTrigger>
        <button
          type="button"
          aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : 'Notifikasi'}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-default-200 bg-white text-default-700 transition hover:bg-default-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:h-11 sm:w-11 sm:rounded-xl"
        >
          <Icon name="bell" size={20} strokeWidth={1.6} />
          {unreadCount > 0 && (
            <span aria-hidden="true" className="absolute right-2.5 top-[9px] h-2 w-2 rounded-full bg-danger" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-0">
        <div className="w-full">
          <div className="flex items-center justify-between border-b border-default-100 px-3 py-2">
            <p className="text-sm font-bold text-foreground">
              Notifikasi{unreadCount > 0 && <span className="font-semibold text-default-500"> · {badge} baru</span>}
            </p>
            {unreadCount > 0 && (
              <button type="button" onClick={() => void markAllRead()} className="text-xs font-medium text-primary">
                Tandai semua dibaca
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-default-600">Tidak ada notifikasi.</li>
            ) : (
              items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void openItem(item)}
                    className={`block w-full border-b border-default-100 px-3 py-2.5 text-left hover:bg-default-50 ${item.read_at ? '' : 'bg-primary-50'}`}
                  >
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-default-600">{item.message}</p>
                    <p className="mt-1 text-[11px] text-default-500">{formatShortDateTime(item.created_at)}</p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}
