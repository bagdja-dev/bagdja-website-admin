'use client';

import { useState, type ReactNode } from 'react';

import type { OrderDetail, OrderTermin, StepProgress } from '@/studio/api/order-detail';

import { AdhocTerminForm, type AdhocProduct } from './AdhocTerminForm';
import { StepBody } from './StepBody';
import { TerminRow, TimelineRow, type RowActor, type RowState } from './TimelineRow';
import type { OrderActions } from './use-order-actions';
import {
  buildGroupSteps,
  formatDateTime,
  formatMoney,
  isBuyerStep,
  isQuotationStep,
  stepReleaseAmount,
  terminsByAnchor,
  UNPAID_STATUSES,
  type FlowGroup,
  type GroupStepItem,
} from './order-model';

interface FlowTimelineProps {
  order: OrderDetail;
  group: FlowGroup;
  canManage: boolean;
  websiteId: string;
  actions: OrderActions;
}

interface Entry {
  template: StepProgress;
  items: GroupStepItem[];
}

function entryState(items: GroupStepItem[], template: StepProgress): RowState {
  if (items.every((i) => i.step.completed)) return 'done';
  if (items.some((i) => i.eligible)) return isBuyerStep(template) ? 'waiting' : 'current';
  return 'todo';
}

function entryActor(template: StepProgress): RowActor {
  return isBuyerStep(template) ? 'buyer' : 'seller';
}

function releaseChip(order: OrderDetail, entry: Entry): { label: string; done: boolean } | null {
  const pct = entry.template.releasePercentage;
  if (pct == null) return null;
  const amount = entry.items.reduce((sum, i) => sum + (stepReleaseAmount(i.step, i.itemTotal) ?? 0), 0);
  return { label: `Cair ${pct}% · ${formatMoney(amount, order.currency)}`, done: entry.items.every((i) => i.step.releaseApproved) };
}

/** Kartu "Alur pengerjaan" untuk 1 alur: mode grup (default) atau per produk. */
export function FlowTimeline({ order, group, canManage, websiteId, actions }: FlowTimelineProps) {
  const [perProduct, setPerProduct] = useState(false);
  const multi = group.items.length > 1;
  const item = (orderId: string): string => group.items.find((g) => g.orderId === orderId)?.productName ?? 'Produk';

  const adhocProducts: AdhocProduct[] = group.items.map((gi) => {
    const detailItem = order.items?.find((i) => i.order_id === gi.orderId);
    return {
      orderId: gi.orderId,
      productName: gi.productName,
      basePrice: Number(detailItem?.order?.quoted_total_amount ?? gi.itemTotal),
      anchorSteps: gi.progress.steps.filter((s) => s.phase === 'PASCAORDER' && !s.completed).map((s) => s.stepName),
    };
  });

  const renderSequence = (entries: Entry[], termins: Array<OrderTermin & { orderId: string }>, mode: 'group' | 'product'): ReactNode => {
    const anchored = terminsByAnchor(termins);
    const rows: ReactNode[] = [];
    const termin = (t: OrderTermin & { orderId: string }): ReactNode => (
      <TerminRow
        key={`termin-${t.id}`}
        termin={t}
        productName={multi && mode === 'group' ? item(t.orderId) : undefined}
        currency={order.currency}
        canManage={canManage}
        busy={actions.busy === `termin:${t.id}`}
        onIssue={() => void actions.issue(t.orderId, t.id)}
      />
    );
    const step = (entry: Entry, n: number): ReactNode => {
      const state = entryState(entry.items, entry.template);
      return (
        <TimelineRow
          key={`step-${entry.template.stepName}`}
          mark={String(n)}
          title={entry.template.stepName}
          state={state}
          actor={isQuotationStep(entry.template) ? 'seller' : entryActor(entry.template)}
          when={state === 'current' ? 'Sekarang' : state === 'waiting' ? 'Menunggu' : undefined}
          release={releaseChip(order, entry)}
        >
          <StepBody order={order} template={entry.template} items={entry.items} state={state} mode={mode} canManage={canManage} websiteId={websiteId} actions={actions} />
        </TimelineRow>
      );
    };
    let n = 1;
    entries.filter((e) => e.template.phase === 'PRAORDER').forEach((e) => rows.push(step(e, n++)));
    const paid = !UNPAID_STATUSES.has(order.status) && order.status !== 'CANCELLED';
    rows.push(
      <TimelineRow key="paid" mark={String(n++)} title="Pembayaran diterima" state={paid ? 'done' : 'current'} actor="auto" when={paid ? formatDateTime(order.held_at ?? order.created_at) : 'Menunggu'}>
        <p className="text-[13px] text-default-600">
          {paid ? `${formatMoney(order.total_amount, order.currency)} ${order.escrow ? 'ditahan aman (escrow)' : 'diterima'}` : 'Pembeli belum membayar.'}
        </p>
      </TimelineRow>,
    );
    entries
      .filter((e) => e.template.phase !== 'PRAORDER')
      .forEach((e) => {
        rows.push(step(e, n++));
        (anchored.get(e.template.stepName) ?? []).forEach((t) => rows.push(termin(t)));
      });
    const anchoredNames = new Set(entries.filter((e) => e.template.phase !== 'PRAORDER').map((e) => e.template.stepName));
    termins.filter((t) => !t.anchorStepName || !anchoredNames.has(t.anchorStepName)).forEach((t) => rows.push(termin(t)));
    const finished = order.status === 'COMPLETED';
    rows.push(<TimelineRow key="done" mark={String(n)} title="Pesanan selesai" state={finished ? 'done' : 'todo'} actor="auto" last />);
    return <ol className="m-0 flex list-none flex-col p-0">{rows}</ol>;
  };

  const allTermins = group.items.flatMap((gi) => gi.progress.termins.map((t) => ({ ...t, orderId: gi.orderId })));

  return (
    <section aria-label={`Alur pengerjaan ${group.flowName}`} className="rounded-2xl border border-default-200 bg-white p-5">
      <div className="mb-3.5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col">
          <h2 className="text-base font-extrabold">Alur pengerjaan</h2>
          <span className="text-xs text-default-600">
            {group.flowName} · terlihat juga oleh pembeli{multi ? ` · ${group.items.length} produk · total grup ${formatMoney(group.total, order.currency)}` : ''}
          </span>
        </div>
        {multi && (
          <div role="group" aria-label="Tampilan alur" className="inline-flex rounded-[10px] border border-default-200 p-0.5 text-xs font-semibold">
            {[false, true].map((value) => (
              <button
                key={String(value)}
                type="button"
                aria-pressed={perProduct === value}
                onClick={() => setPerProduct(value)}
                className={`min-h-8 rounded-lg px-3 ${perProduct === value ? 'bg-primary-50 text-primary' : 'text-default-600 hover:bg-default-50'}`}
              >
                {value ? 'Per produk' : 'Grup'}
              </button>
            ))}
          </div>
        )}
      </div>

      {!perProduct ? (
        <>
          {renderSequence(
            buildGroupSteps(group).map((gs) => ({ template: gs.template, items: gs.items })),
            allTermins,
            'group',
          )}
          {canManage && <AdhocTerminForm products={adhocProducts} currency={order.currency} busyOrderId={actions.busy?.startsWith('adhoc:') ? actions.busy.slice(6) : null} onSubmit={actions.addAdhoc} />}
        </>
      ) : (
        <div className="flex flex-col gap-6">
          {group.items.map((gi) => (
            <div key={gi.orderId} className="flex flex-col gap-3 border-t border-default-100 pt-4 first:border-t-0 first:pt-0">
              <p className="text-sm font-bold">{gi.productName}</p>
              {renderSequence(
                gi.progress.steps.map((s, index) => ({
                  template: s,
                  items: [{ orderId: gi.orderId, productName: gi.productName, itemTotal: gi.itemTotal, step: s, eligible: !s.completed && gi.progress.steps.slice(0, index).every((p) => p.completed) }],
                })),
                gi.progress.termins.map((t) => ({ ...t, orderId: gi.orderId })),
                'product',
              )}
              {canManage && (
                <AdhocTerminForm
                  products={adhocProducts.filter((p) => p.orderId === gi.orderId)}
                  currency={order.currency}
                  busyOrderId={actions.busy?.startsWith('adhoc:') ? actions.busy.slice(6) : null}
                  onSubmit={actions.addAdhoc}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
