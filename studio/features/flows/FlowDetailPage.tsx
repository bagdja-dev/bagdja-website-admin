'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  createFulfillmentFlow,
  fetchFulfillmentFlow,
  updateFulfillmentFlow,
  type FulfillmentFlow,
  type FulfillmentFlowDraft,
} from '@/studio/api/fulfillment-flows';
import { errorMessage } from '@/studio/api/client';
import { useActiveRole, useActiveWebsiteId } from '@/studio/stores/website-store';
import { hasMinRole } from '@/studio/lib/roles';
import { ListSkeleton } from '@/studio/ui/data-list';
import { Icon } from '@/studio/ui/icons';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';
import { StatusScreen } from '@/studio/ui/primitives/StatusScreen';
import { notify } from '@/studio/ui/primitives/Toast';

import { FlowEditor } from './FlowEditor';

interface FlowDetailPageProps {
  flowId: string | null;
}

export function FlowDetailPage({ flowId }: FlowDetailPageProps) {
  const websiteId = useActiveWebsiteId();
  const role = useActiveRole();
  const router = useRouter();
  const isNew = flowId === null;
  const [flow, setFlow] = useState<FulfillmentFlow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const canEdit = hasMinRole(role, 'editor');

  useEffect(() => {
    if (isNew || !websiteId || !flowId) return;
    let active = true;
    setLoading(true);
    setLoadError(null);
    void fetchFulfillmentFlow(websiteId, flowId)
      .then((result) => {
        if (active) setFlow(result);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(errorMessage(error, 'Gagal memuat Master Flow.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [flowId, isNew, websiteId]);

  const handleSave = useCallback(async (draft: FulfillmentFlowDraft) => {
    if (!websiteId) throw new Error('Website aktif tidak ditemukan.');
    if (isNew) {
      await createFulfillmentFlow(websiteId, draft);
      notify.success('Master Flow ditambahkan.');
    } else if (flowId) {
      await updateFulfillmentFlow(websiteId, flowId, draft);
      notify.success('Master Flow diperbarui.');
    }
    router.push('/studio/flows');
  }, [flowId, isNew, router, websiteId]);

  if (!websiteId) {
    return (
      <StatusScreen
        icon={<Icon name="warning" size={28} />}
        title="Website belum dipilih"
        description="Pilih website aktif sebelum mengelola Master Flow."
        actions={[{ label: 'Kembali ke daftar', href: '/studio/flows' }]}
      />
    );
  }
  if (!canEdit) {
    return (
      <StatusScreen
        icon={<Icon name="lock" size={28} />}
        title="Akses editor diperlukan"
        description="Hanya owner, admin, dan editor yang dapat mengubah Master Flow."
        actions={[{ label: 'Kembali ke daftar', href: '/studio/flows' }]}
      />
    );
  }
  if (loading) {
    return (
      <>
        <PageHeader title="Memuat Master Flow…" back={{ href: '/studio/flows', label: 'Master Flow' }} />
        <ListSkeleton rows={5} />
      </>
    );
  }
  if (loadError || (!isNew && !flow)) {
    return (
      <StatusScreen
        icon={<Icon name="warning" size={28} />}
        title="Master Flow gagal dimuat"
        description={loadError ?? 'Flow tidak ditemukan atau sudah dihapus.'}
        actions={[{ label: 'Kembali ke daftar', href: '/studio/flows' }]}
      />
    );
  }

  return (
    <FlowEditor
      key={flowId ?? 'new'}
      flow={flow}
      onSave={handleSave}
      onCancel={() => router.push('/studio/flows')}
    />
  );
}
