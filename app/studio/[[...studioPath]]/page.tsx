import { notFound } from 'next/navigation';

import { StudioHome } from '@/studio/features/home/StudioHome';
import { UnderConstructionState } from '@/studio/features/placeholders/UnderConstructionState';
import { navItemForPath } from '@/studio/ui/shell/nav-registry';

interface StudioCatchAllPageProps {
  params: { studioPath?: string[] };
}

/**
 * `/studio` (Beranda) dan rute menu Studio
 * yang halamannya belum dibangun → "{Menu} sedang disiapkan". Rute statis yang
 * dibuat di S3+ (mis. app/studio/faq/page.tsx) otomatis menang atas catch-all ini.
 * Path lain → 404.
 */
export default function StudioCatchAllPage({ params }: StudioCatchAllPageProps) {
  const segments = params.studioPath ?? [];
  if (segments.length === 0) return <StudioHome />;

  const item = navItemForPath(`/studio/${segments.join('/')}`);
  if (!item) notFound();
  return <UnderConstructionState label={item.label} icon={item.icon} />;
}
