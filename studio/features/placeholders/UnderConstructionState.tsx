'use client';

import { PageHeader } from '@/studio/ui/primitives/PageHeader';
import { StatusScreen } from '@/studio/ui/primitives/StatusScreen';
import { NavIcon, type NavIconKey } from '@/studio/ui/shell/nav-icons';

export interface UnderConstructionStateProps {
  label: string;
  icon: NavIconKey;
}

/** Menu Studio yang halamannya belum dibangun (gaya Modul-Nonaktif). */
export function UnderConstructionState({ label, icon }: UnderConstructionStateProps) {
  return (
    <>
      <PageHeader title={label} />
      <StatusScreen
        icon={<NavIcon name={icon} size={28} />}
        title={`${label} sedang disiapkan`}
        description="Halaman ini sedang kami bangun dan akan segera tersedia di sini."
        actions={[{ label: 'Kembali ke Beranda', href: '/studio', variant: 'secondary' }]}
      />
    </>
  );
}
