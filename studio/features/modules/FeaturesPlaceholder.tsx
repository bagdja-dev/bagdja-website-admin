'use client';

import { Chip } from '@heroui/react';

import { useModulesStore } from '@/studio/stores/modules-store';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';

/**
 * Placeholder `/studio/features` (S2) agar menu Fitur & tombol "Aktifkan" tidak 404.
 * Halaman Fitur lengkap (toggle, dependensi, alasan blokir — §3.4) dibangun di S3.
 */
export function FeaturesPlaceholder() {
  const enabled = useModulesStore((s) => s.enabledModules);
  const label = useModulesStore((s) => s.moduleLabel);
  const source = useModulesStore((s) => s.source);

  return (
    <>
      <PageHeader
        title="Fitur"
        description="Pengaturan aktif/nonaktif fitur sedang disiapkan. Berikut fitur yang aktif di website ini."
      />
      {source === 'legacy-fallback' && (
        <p className="mb-3 text-sm text-default-600">
          Website ini memakai pengaturan lama: semua fitur yang tersedia aktif.
        </p>
      )}
      <ul className="flex flex-wrap gap-2" aria-label="Fitur aktif">
        {enabled.map((key) => (
          <li key={key}>
            <Chip variant="flat">{label(key)}</Chip>
          </li>
        ))}
      </ul>
    </>
  );
}
