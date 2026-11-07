'use client';

import { useEffect, useState } from 'react';

import { hasMinRole } from '@/studio/lib/roles';
import { useModulesStore } from '@/studio/stores/modules-store';
import { useActiveRole, useActiveWebsite } from '@/studio/stores/website-store';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';
import { StatusScreen } from '@/studio/ui/primitives/StatusScreen';
import { NavIcon } from '@/studio/ui/shell/nav-icons';

import { AndroidTab } from './android/AndroidTab';
import { DomainTab } from './DomainTab';
import { GeneralTab } from './GeneralTab';

type SettingsTab = 'domain' | 'android' | 'umum';

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'domain', label: 'Domain' },
  { key: 'android', label: 'Android' },
  { key: 'umum', label: 'Umum' },
];

/** Pengaturan (admin+): Domain | Android | Umum. `?tab=domain|android|umum`, bawaan domain. */
export function SettingsPage() {
  const role = useActiveRole();
  const active = useActiveWebsite();
  const androidEnabled = useModulesStore((s) => s.hasModule('android_app'));
  const [tab, setTab] = useState<SettingsTab>('domain');

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    const match = TABS.find((t) => t.key === requested);
    if (match) setTab(match.key);
  }, []);

  const selectTab = (key: SettingsTab): void => {
    setTab(key);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', key);
    window.history.replaceState(null, '', url.toString());
  };

  if (!hasMinRole(role, 'admin') || !active) {
    return (
      <>
        <PageHeader title="Pengaturan" />
        <StatusScreen
          icon={<NavIcon name="settings" size={28} />}
          title="Hanya admin yang dapat membuka Pengaturan."
          actions={[{ label: 'Kembali ke Beranda', href: '/studio', variant: 'secondary' }]}
        />
      </>
    );
  }

  const website = active.website;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Pengaturan" description="Domain, aplikasi Android, dan status website." />
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-default-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => selectTab(t.key)}
            className={`min-h-[40px] border-b-2 px-4 text-sm font-medium transition-colors ${
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-default-500 hover:bg-default-50 hover:text-default-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-2 max-w-[1100px]">
        {tab === 'domain' && <DomainTab website={website} />}
        {tab === 'android' && <AndroidTab website={website} enabled={androidEnabled} />}
        {tab === 'umum' && <GeneralTab website={website} role={role} />}
      </div>
    </div>
  );
}
