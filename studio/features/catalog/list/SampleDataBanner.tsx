'use client';

/**
 * Banner data contoh template di daftar Produk dan Jasa
 * (plan/website-builder/template-sample-data-plan.md, keputusan S3).
 */
import { useEffect, useState } from 'react';

import { Button } from '@heroui/react';

import { errorMessage } from '@/studio/api/client';
import { fetchOnboardingStatus } from '@/studio/api/home';
import { removeWebsiteSampleData } from '@/studio/api/websites';
import { hasMinRole } from '@/studio/lib/roles';
import { useActiveRole, useActiveWebsite } from '@/studio/stores/website-store';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import { notify } from '@/studio/ui/primitives/Toast';

export function SampleDataBanner({ onRemoved }: { onRemoved: () => void }) {
  const websiteId = useActiveWebsite()?.website.id;
  const canRemove = hasMinRole(useActiveRole(), 'admin');
  const { confirm, dialog } = useConfirm();
  const [seedCount, setSeedCount] = useState(0);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!websiteId) return;
    let cancelled = false;
    fetchOnboardingStatus(websiteId)
      .then((status) => {
        if (!cancelled) setSeedCount(status?.seedProductCount ?? 0);
      })
      .catch(() => {
        if (!cancelled) setSeedCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [websiteId]);

  if (!websiteId || seedCount === 0) return null;

  const remove = async () => {
    const accepted = await confirm({
      title: 'Hapus semua data contoh?',
      description: (
        <span>
          {seedCount} item contoh dari template dan FAQ contoh akan dihapus. Item contoh yang sudah pernah dipesan
          atau dibahas di chat dinonaktifkan, bukan dihapus. Kategori dan item milik Anda tidak disentuh.
        </span>
      ),
      confirmLabel: 'Hapus data contoh',
    });
    if (!accepted) return;
    setRemoving(true);
    try {
      const result = await removeWebsiteSampleData(websiteId);
      setSeedCount(0);
      notify.success(
        'Data contoh dihapus.',
        `${result.removedProducts} item & ${result.removedFaqs} FAQ dihapus${result.deactivatedProducts ? `, ${result.deactivatedProducts} item dinonaktifkan` : ''}.`,
      );
      onRemoved();
    } catch (cause: unknown) {
      notify.error('Data contoh gagal dihapus.', errorMessage(cause, 'Coba lagi.'));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary-200 bg-primary-50 p-3.5 sm:flex-row sm:items-center sm:justify-between">
      {dialog}
      <p className="text-sm text-default-700">
        <strong className="text-foreground">{seedCount} item contoh</strong> dari template masih tampil di website.
        Edit menjadi milik Anda, atau hapus semuanya sekaligus.
      </p>
      {canRemove ? (
        <Button size="sm" variant="bordered" className="shrink-0 bg-white" isLoading={removing} onPress={() => void remove()}>
          Hapus data contoh
        </Button>
      ) : null}
    </div>
  );
}
