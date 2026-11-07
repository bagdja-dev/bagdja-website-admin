'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@heroui/react';
import Link from 'next/link';
import { useState } from 'react';

import { ROLE_LABEL } from '@/studio/lib/roles';
import { useModulesStore } from '@/studio/stores/modules-store';
import { useActiveWebsite, useWebsiteStore } from '@/studio/stores/website-store';

import { Icon } from '../icons';
import { notify } from '../primitives/Toast';
import { profileLabelOf } from './site-identity';
import { SiteTile } from './SiteTile';

/**
 * Pemilih website di ATAS sidebar (artboard Sidebar): tile logo/inisial, nama,
 * label jenis bisnis. Daftar: semua website + role + centang aktif, lalu "+ Website baru".
 */
export function WebsiteSwitcher({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const websites = useWebsiteStore((s) => s.websites);
  const switchWebsite = useWebsiteStore((s) => s.switchWebsite);
  const active = useActiveWebsite();
  const catalog = useModulesStore((s) => s.catalog);
  const [open, setOpen] = useState(false);

  if (!active) return null;

  const choose = async (websiteId: string): Promise<void> => {
    setOpen(false);
    if (websiteId === active.website.id) return;
    const ok = await switchWebsite(websiteId);
    if (!ok) notify.error('Website tidak ditemukan', 'Muat ulang halaman lalu coba lagi.');
    else onNavigate?.();
  };

  return (
    <Popover placement="bottom-start" isOpen={open} onOpenChange={setOpen} offset={6}>
      <PopoverTrigger>
        <button
          type="button"
          aria-label={`Website aktif: ${active.website.name}. Ganti website`}
          title={collapsed ? `${active.website.name} · Ganti website` : undefined}
          className={`flex min-h-[52px] w-full items-center rounded-xl border border-default-200 bg-default-50 py-2 text-left text-foreground hover:bg-default-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
            collapsed ? 'justify-center px-1.5' : 'gap-2.5 px-2.5'
          }`}
        >
          <SiteTile website={active.website} />
          {!collapsed && (
            <>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-bold">{active.website.name}</span>
                <span className="truncate text-xs text-default-600">{profileLabelOf(active.website.business_profile, catalog)}</span>
              </span>
              <Icon name="chevronUpDown" size={16} strokeWidth={2} className="shrink-0 text-default-500" />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(18rem,calc(100vw-2rem))] p-1.5">
        <div className="w-full">
          <p className="px-2 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-default-500">Website kamu</p>
          <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
            {websites.map(({ website, role }) => {
              const isActive = website.id === active.website.id;
              return (
                <li key={website.id}>
                  <button
                    type="button"
                    onClick={() => void choose(website.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`flex w-full items-center gap-2.5 rounded-[9px] px-2 py-1.5 text-left ${isActive ? 'bg-primary-50' : 'hover:bg-default-100'}`}
                  >
                    <SiteTile website={website} size={28} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={`truncate text-[13px] ${isActive ? 'font-bold text-primary' : 'font-semibold text-foreground'}`}>
                        {website.name}
                      </span>
                      <span className="text-xs text-default-600">{ROLE_LABEL[role]}</span>
                    </span>
                    {isActive && <Icon name="check" size={16} strokeWidth={2.5} className="shrink-0 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-1 border-t border-default-100 pt-1">
            <Link
              href="/studio/websites/new"
              onClick={() => setOpen(false)}
              className="flex min-h-9 items-center gap-2 rounded-[9px] px-2 text-[13px] font-bold text-primary no-underline hover:bg-primary-50"
            >
              <Icon name="plus" size={16} strokeWidth={2} /> Website baru
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
