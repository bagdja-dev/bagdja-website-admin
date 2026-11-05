'use client';

import { BrandLogo } from '../brand/BrandLogo';
import { PlanCard } from './PlanCard';
import { SidebarNav } from './SidebarNav';
import { WebsiteSwitcher } from './WebsiteSwitcher';

/** Isi sidebar (desktop & drawer HP): lockup + switcher, menu, kartu Paket. */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-white text-foreground">
      <div className="flex flex-col gap-3 border-b border-default-100 px-3.5 pb-3 pt-4">
        <span className="px-1">
          <BrandLogo size="sm" />
        </span>
        <WebsiteSwitcher onNavigate={onNavigate} />
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav onNavigate={onNavigate} />
      </div>
      <PlanCard onNavigate={onNavigate} />
    </div>
  );
}
