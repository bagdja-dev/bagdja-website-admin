'use client';

import { Button } from '@heroui/react';
import { useEffect, useMemo, useState } from 'react';

import type { OrderDetail } from '@/studio/api/order-detail';
import { useHasModule } from '@/studio/stores/modules-store';
import { useHasMinRole } from '@/studio/stores/role';
import { useActiveWebsiteId } from '@/studio/stores/website-store';
import { Icon } from '@/studio/ui/icons';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';
import { StatusScreen } from '@/studio/ui/primitives/StatusScreen';

import { CancelledPreorderView } from './CancelledPreorderView';
import { FlowTimeline } from './FlowTimeline';
import { ItemsCard } from './ItemsCard';
import { ChatBottomBar, HeaderActions, SummaryStrip } from './OrderHeader';
import { BuyerPanel, FundsPanel, hasShipping, OtherActionsPanel, PaymentPanel, ShippingCard } from './SidePanels';
import { DisputeCard, NextStepCard, UnpaidCard, WaitingBuyerCard } from './StatusCards';
import { useOrderActions } from './use-order-actions';
import { readOrdersListHref } from './list-return';
import { useOrderDetail } from './use-order-detail';
import {
  buildFlowGroups,
  buyerTurnSteps,
  forceCompleteState,
  formatDateTime,
  hasPreorder,
  hasAdditionalTermins,
  orderNumber,
  projectTotal,
  REFUNDABLE_STATUSES,
  sellerTurnSteps,
  UNPAID_STATUSES,
  workProgress,
} from './order-model';

const ACTIVE_STATUSES = new Set(['HELD', 'DISPUTED', 'COMPLETED']);

function useListBackHref(): string {
  const [href, setHref] = useState('/studio/orders');
  useEffect(() => setHref(readOrdersListHref()), []);
  return href;
}

function DetailSkeleton() {
  return (
    <div className="flex flex-wrap gap-5" aria-busy="true" aria-label="Memuat pesanan">
      <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4">
        {[96, 220, 320].map((h) => (
          <div key={h} className="animate-pulse rounded-2xl bg-default-100" style={{ height: h }} />
        ))}
      </div>
      <div className="flex flex-[1_1_300px] flex-col gap-3.5 lg:max-w-[360px]">
        {[120, 180, 140].map((h) => (
          <div key={h} className="animate-pulse rounded-2xl bg-default-100" style={{ height: h }} />
        ))}
      </div>
    </div>
  );
}

export function OrderDetailPage({ id }: { id: string }) {
  const websiteId = useActiveWebsiteId();
  const backHref = useListBackHref();
  const { state, reload } = useOrderDetail(id);
  const order = state.kind === 'ready' ? state.order : null;
  const actions = useOrderActions(websiteId, order, () => reload({ silent: true }));
  const back = { href: backHref, label: 'Pesanan' };

  if (state.kind === 'cancelled') return <CancelledPreorderView preorder={state.preorder} />;
  if (state.kind === 'not-found') {
    return (
      <>
        <PageHeader title="Pesanan" back={back} />
        <StatusScreen
          icon={<Icon name="orders" size={28} />}
          title="Pesanan tidak ditemukan"
          description="Pesanan ini tidak ada di website aktif, atau sudah dihapus. Pastikan website yang dipilih benar."
          actions={[{ label: 'Kembali ke Pesanan', href: backHref }]}
        />
      </>
    );
  }
  if (state.kind === 'error') {
    return (
      <>
        <PageHeader title="Pesanan" back={back} />
        <StatusScreen
          icon={<Icon name="warning" size={28} />}
          title="Gagal memuat pesanan"
          description={state.message}
          actions={[{ label: 'Kembali ke Pesanan', href: backHref, variant: 'secondary' }]}
          note={<Button color="primary" onPress={() => void reload()}>Coba lagi</Button>}
        />
      </>
    );
  }
  if (!order || !websiteId) {
    return (
      <>
        <PageHeader title="Pesanan" back={back} />
        <DetailSkeleton />
      </>
    );
  }
  return <ReadyView order={order} websiteId={websiteId} back={back} actions={actions} reload={() => reload({ silent: true })} />;
}

interface ReadyViewProps {
  order: OrderDetail;
  websiteId: string;
  back: { href: string; label: string };
  actions: ReturnType<typeof useOrderActions>;
  reload: () => Promise<void>;
}

function ReadyView({ order, websiteId, back, actions, reload }: ReadyViewProps) {
  const canManage = useHasMinRole('editor');
  const canRefund = useHasMinRole('admin');
  const vendorsOn = useHasModule('vendors');
  const groups = useMemo(() => buildFlowGroups(order), [order]);
  const fc = useMemo(() => forceCompleteState(order), [order]);
  const unpaid = UNPAID_STATUSES.has(order.status);
  const active = ACTIVE_STATUSES.has(order.status);
  const sellerTurn = active ? sellerTurnSteps(groups) : [];
  const buyerTurn = active ? buyerTurnSteps(groups) : [];
  const progress = workProgress(groups);
  const disputedSteps = groups.flatMap((g) =>
    g.items.flatMap((i) => i.progress.steps.filter((s) => s.disputed).map((s) => ({ productName: i.productName, stepName: s.stepName }))),
  );
  const disputed = order.status === 'DISPUTED' || disputedSteps.length > 0;
  const awaitingConfirmation = order.status === 'HELD' && sellerTurn.length === 0 && buyerTurn.length === 0 && progress.done === progress.total;
  const scheduledTermins = groups.flatMap((g) => g.items.flatMap((i) => i.progress.termins)).filter((t) => t.status === 'SCHEDULED').length;
  const hasTermins = hasAdditionalTermins(order);
  const total = hasTermins ? projectTotal(order) : order.total_amount;
  const position = `Langkah ${Math.min(progress.done + 1, progress.total)}/${progress.total}`;
  const work = unpaid
    ? { label: 'Belum mulai', tone: 'neutral' as const }
    : progress.total === 0
      ? { label: order.fulfillment_status === 'DELIVERED' ? 'Pengerjaan selesai' : 'Tanpa alur', tone: 'neutral' as const }
      : sellerTurn.length > 0
        ? { label: `${position} · giliranmu`, tone: 'primary' as const }
        : buyerTurn.length > 0 || awaitingConfirmation
          ? { label: `${position} · menunggu pembeli`, tone: 'neutral' as const }
          : progress.done === progress.total
            ? { label: 'Pengerjaan selesai', tone: 'success' as const }
            : { label: position, tone: 'neutral' as const };
  const refundable = Boolean(order.escrow) && REFUNDABLE_STATUSES.has(order.status);

  return (
    <>
      <PageHeader
        title={orderNumber(order)}
        description={formatDateTime(order.created_at)}
        back={back}
        actions={<HeaderActions order={order} canRefund={canRefund} refundable={refundable} actions={actions} />}
      />
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-start gap-5 pb-24 md:pb-0">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4">
          <SummaryStrip order={order} total={total} work={work} preorder={hasPreorder(order)} />
          {unpaid && <UnpaidCard order={order} />}
          {disputed && <DisputeCard order={order} disputedSteps={disputedSteps} canRefund={canRefund} actions={actions} />}
          {sellerTurn.map(({ group, step }, index) => (
            <NextStepCard
              key={`${group.flowName}:${step.template.stepName}`}
              order={order}
              group={group}
              step={step}
              websiteId={websiteId}
              solid={index === 0}
              canManage={canManage}
              actions={actions}
            />
          ))}
          {sellerTurn.length === 0 && buyerTurn.length > 0 && (
            <WaitingBuyerCard order={order} stepName={buyerTurn[0].step.template.stepName} deadline={null} actions={actions} />
          )}
          {awaitingConfirmation && !disputed && <WaitingBuyerCard order={order} stepName={null} deadline={fc.availableFrom} actions={actions} />}
          {scheduledTermins > 0 && canManage && (
            <p role="status" className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
              <strong>{scheduledTermins} tagihan menunggu diterbitkan</strong> — terbitkan dari alur pengerjaan di bawah.
            </p>
          )}
          {groups.map((group) => (
            <FlowTimeline key={group.flowName} order={order} group={group} canManage={canManage && !unpaid} websiteId={websiteId} actions={actions} />
          ))}
          <ItemsCard order={order} websiteId={websiteId} showVendors={vendorsOn} canAssign={canManage} onChanged={reload} />
          {hasShipping(order) && <ShippingCard order={order} />}
        </div>
        <aside className="flex w-full flex-[1_1_300px] flex-col gap-3.5 lg:max-w-[360px]">
          <BuyerPanel order={order} />
          <PaymentPanel order={order} />
          <FundsPanel order={order} />
          <OtherActionsPanel order={order} forceComplete={fc} canForceComplete={canManage} canRefund={canRefund} actions={actions} />
        </aside>
      </div>
      <ChatBottomBar order={order} canRefund={canRefund} refundable={refundable} actions={actions} />
      {actions.dialog}
    </>
  );
}
