'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useActiveWebsiteId } from '@/studio/stores/website-store';

import { isNavItemActive } from './nav-registry';
import { NavIcon } from './nav-icons';
import { useNavBadges } from './use-nav-badges';
import { useVisibleNav } from './use-visible-nav';

export interface SidebarNavProps {
  /** Dipanggil saat link diklik (menutup drawer HP). */
  onNavigate?: () => void;
}

/** Menu berkelompok (artboard Sidebar): label kelompok, item aktif ber-tint burgundi, badge merah. */
export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const groups = useVisibleNav();
  const badges = useNavBadges(useActiveWebsiteId(), groups);

  return (
    <nav aria-label="Menu Studio" className="flex flex-col gap-3.5 px-2.5 pb-3 pt-2.5">
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={group.label ? `nav-group-${group.id}` : undefined} className="flex flex-col gap-0.5">
          {group.label && (
            <h2 id={`nav-group-${group.id}`} className="px-2.5 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-default-500">
              {group.label}
            </h2>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isNavItemActive(item, pathname);
              const count = badges[item.id] ?? 0;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-[38px] items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-sm no-underline transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                      active ? 'bg-primary-50 font-bold text-primary' : 'font-medium text-default-700 hover:bg-default-100 hover:text-foreground'
                    }`}
                  >
                    <NavIcon name={item.icon} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {count > 0 && (
                      <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-white">
                        {count > 99 ? '99+' : count}
                        <span className="sr-only"> perlu perhatian</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
