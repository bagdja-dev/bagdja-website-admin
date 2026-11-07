'use client';

import { BrandLogo } from '../brand/BrandLogo';
import { PlanCard } from './PlanCard';
import { SidebarNav } from './SidebarNav';
import { WebsiteSwitcher } from './WebsiteSwitcher';
import { Icon } from '../icons';

/** Isi sidebar (desktop & drawer HP): lockup + switcher, menu, kartu Paket. */
export function Sidebar({
  onNavigate,
  collapsed = false,
  onToggleCollapsed,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  return (
    <div className={`flex h-full flex-col bg-white text-foreground ${collapsed ? 'items-center' : ''}`}>
      <div className={`flex w-full flex-col gap-3 border-b border-default-100 pb-3 pt-4 ${collapsed ? 'items-center px-2' : 'px-3.5'}`}>
        <div className={`flex w-full items-center ${collapsed ? 'flex-col gap-2' : 'justify-between'}`}>
          <span className={collapsed ? '' : 'px-1'}>
            <BrandLogo size="sm" showWordmark={!collapsed} />
          </span>
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? 'Perluas menu' : 'Ciutkan menu'}
              aria-expanded={!collapsed}
              title={collapsed ? 'Perluas menu' : 'Ciutkan menu'}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-default-600 transition-colors hover:bg-default-100 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Icon name="chevronDown" size={16} strokeWidth={2} className={collapsed ? '-rotate-90' : 'rotate-90'} />
            </button>
          )}
        </div>
        <WebsiteSwitcher onNavigate={onNavigate} collapsed={collapsed && !onNavigate} />
      </div>
      <div className={`w-full flex-1 overflow-y-auto ${collapsed ? 'px-1' : ''}`}>
        <SidebarNav onNavigate={onNavigate} collapsed={collapsed && !onNavigate} />
      </div>
      <PlanCard onNavigate={onNavigate} collapsed={collapsed && !onNavigate} />
    </div>
  );
}
