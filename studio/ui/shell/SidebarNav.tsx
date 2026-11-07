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
  collapsed?: boolean;
}

/** Menu berkelompok (artboard Sidebar): label kelompok, item aktif ber-tint burgundi, badge merah. */
export function SidebarNav({ onNavigate, collapsed = false }: SidebarNavProps) {
  const pathname = usePathname();
  const groups = useVisibleNav();
  const badges = useNavBadges(useActiveWebsiteId(), groups);

  return (
    <nav aria-label="Menu Studio" className={`flex flex-col pb-3 pt-2.5 ${collapsed ? 'gap-1 px-1' : 'gap-3.5 px-2.5'}`}>
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={group.label && !collapsed ? `nav-group-${group.id}` : undefined} className="flex flex-col gap-0.5">
          {group.label && !collapsed && (
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
                    aria-label={collapsed ? item.label : undefined}
                    title={collapsed ? item.label : undefined}
                    className={`relative flex min-h-[40px] items-center rounded-[9px] py-2 text-sm no-underline transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                      collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'
                    } ${
                      active ? 'bg-primary-50 font-bold text-primary' : 'font-medium text-default-700 hover:bg-default-100 hover:text-foreground'
                    }`}
                  >
                    <NavIcon name={item.icon} />
                    {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                    {count > 0 && (
                      <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-danger font-bold text-white ${
                        collapsed
                          ? 'absolute right-0 top-0 h-4 min-w-4 px-1 text-[9px]'
                          : 'h-5 min-w-5 px-1.5 text-[11px]'
                      }`}>
                        {collapsed ? (count > 9 ? '9+' : count) : count > 99 ? '99+' : count}
                        <span className="sr-only">{` ${item.label}: perlu perhatian`}</span>
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
