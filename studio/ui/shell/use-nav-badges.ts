'use client';

import { useEffect, useMemo, useState } from 'react';

import type { VisibleNavGroup } from './use-visible-nav';

/**
 * Hitungan badge hanya untuk item yang tampil (= modulnya aktif); dimuat saat
 * mount, saat website/menu berubah, dan saat window kembali fokus. Gagal → diam.
 */
export function useNavBadges(websiteId: string | null, groups: VisibleNavGroup[]): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const loaders = useMemo(
    () => groups.flatMap((g) => g.items).filter((item) => item.badge !== undefined),
    [groups],
  );
  const loaderKey = loaders.map((item) => item.id).join(',');

  useEffect(() => {
    setCounts({});
  }, [websiteId]);

  useEffect(() => {
    if (!websiteId || loaders.length === 0) return;
    let cancelled = false;
    const load = (): void => {
      loaders.forEach((item) => {
        item
          .badge?.(websiteId)
          .then((count) => {
            if (!cancelled) setCounts((prev) => ({ ...prev, [item.id]: count }));
          })
          .catch(() => undefined);
      });
    };
    load();
    window.addEventListener('focus', load);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', load);
    };
    // loaderKey mewakili daftar loader; array `loaders` berganti identitas tiap render menu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websiteId, loaderKey]);

  return counts;
}
