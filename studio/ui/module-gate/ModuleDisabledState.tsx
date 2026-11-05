'use client';

import type { ModuleKey } from '@/studio/api/types';
import { useModuleLabel, useModulesStore } from '@/studio/stores/modules-store';
import { useActiveRole } from '@/studio/stores/website-store';

import { PageHeader } from '../primitives/PageHeader';
import { StatusScreen, type StatusScreenAction } from '../primitives/StatusScreen';
import { NAV_GROUPS } from '../shell/nav-registry';
import { NavIcon, type NavIconKey } from '../shell/nav-icons';

const HOME: StatusScreenAction = { label: 'Kembali ke Beranda', href: '/studio', variant: 'secondary' };

function iconFor(moduleKey: ModuleKey): NavIconKey {
  return NAV_GROUPS.flatMap((g) => g.items).find((item) => item.module === moduleKey)?.icon ?? 'features';
}

/**
 * URL modul nonaktif (artboard "8 · Buka URL modul nonaktif"): owner → "Aktifkan X"
 * (ke halaman Fitur) + "Kembali ke Beranda"; role lain → teks minta owner.
 */
export function ModuleDisabledState({ moduleKey }: { moduleKey: ModuleKey }) {
  const label = useModuleLabel(moduleKey);
  const role = useActiveRole();
  const info = useModulesStore((s) => s.catalog?.modules.find((m) => m.key === moduleKey) ?? null);
  const comingSoon =
    useModulesStore((s) => s.moduleStates.find((m) => m.key === moduleKey)?.status === 'coming_soon') ||
    info?.status === 'coming_soon';
  const isOwner = role === 'owner';

  return (
    <>
      <PageHeader title={label} />
      <StatusScreen
        icon={<NavIcon name={iconFor(moduleKey)} size={28} />}
        title={comingSoon ? `Fitur ${label} segera hadir` : `Fitur ${label} belum aktif`}
        description={comingSoon ? 'Fitur ini sedang dibangun dan aktif otomatis saat siap.' : info?.description}
        actions={!comingSoon && isOwner ? [{ label: `Aktifkan ${label}`, href: '/studio/features' }, HOME] : [HOME]}
        note={!comingSoon && !isOwner ? 'Minta owner website untuk mengaktifkan fitur ini.' : undefined}
      />
    </>
  );
}
