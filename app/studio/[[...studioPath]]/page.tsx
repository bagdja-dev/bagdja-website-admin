import { notFound } from 'next/navigation';

import { StudioHome } from '@/studio/features/home/StudioHome';
import { UnderConstructionState } from '@/studio/features/placeholders/UnderConstructionState';
import { navItemForPath } from '@/studio/ui/shell/nav-registry';

/** Area yang rutenya sudah dibangun: path lain di bawahnya = 404, bukan "sedang disiapkan". */
const BUILT_PREFIXES: readonly string[] = ['/studio/catalog', '/studio/events/items'];

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

  const path = `/studio/${segments.join('/')}`;
  if (BUILT_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) notFound();
  const item = navItemForPath(path);
  if (!item) notFound();
  return <UnderConstructionState label={item.label} icon={item.icon} />;
}
