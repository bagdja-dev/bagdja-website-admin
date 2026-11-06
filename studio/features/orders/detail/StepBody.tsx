'use client';

import { Button } from '@heroui/react';
import { useState } from 'react';

import type { OrderDetail, StepProgress } from '@/studio/api/order-detail';

import { StepFieldValues } from './StepFieldValue';
import { StepForm } from './StepForm';
import type { OrderActions } from './use-order-actions';
import { formatMoney, isBuyerStep, isQuotationStep, stepReleaseAmount, type GroupStepItem } from './order-model';
import type { RowState } from './TimelineRow';

interface StepBodyProps {
  order: OrderDetail;
  template: StepProgress;
  items: GroupStepItem[];
  state: RowState;
  /** `group` = bulk (form ada di kartu Langkah berikutnya); `product` = form inline per produk. */
  mode: 'group' | 'product';
  canManage: boolean;
  websiteId: string;
  actions: OrderActions;
}

export function stepKey(orderId: string, stepName: string): string {
  return `${orderId}::${stepName}`;
}

/** Isi 1 langkah di timeline: keterangan, isian, komplain, pencairan per item, form inline (mode per produk). */
export function StepBody({ order, template, items, state, mode, canManage, websiteId, actions }: StepBodyProps) {
  const [formOpen, setFormOpen] = useState(false);
  const completed = items.filter((i) => i.step.completed);
  const shown = completed.find((i) => i.step.formData) ?? null;
  const disputed = items.filter((i) => i.step.disputed);
  const releasable = items.filter(
    (i) => i.step.completed && i.step.releasePercentage != null && !i.step.releaseApproved && !i.step.disputed,
  );
  const single = items.length === 1 ? items[0] : null;

  return (
    <div className="flex flex-col gap-2 text-[13px] text-default-600">
      {(template.description || template.processDay != null || items.length > 1) && (
        <p>
          {template.description}
          {template.processDay != null && <span className="text-default-500">{template.description ? ' · ' : ''}± {template.processDay} hari</span>}
          {items.length > 1 && <span className="text-default-500"> · {completed.length}/{items.length} produk selesai</span>}
        </p>
      )}
      {isQuotationStep(template) && (
        <p>Harga final ditetapkan lewat Penawaran{single?.step.completed ? '.' : ' (belum ditetapkan).'}</p>
      )}
      {shown && <StepFieldValues schema={template.formSchema} data={shown.step.formData} />}
      {disputed.length > 0 && (
        <p className="rounded-lg bg-danger-50 px-2.5 py-1.5 text-xs font-semibold text-[#B91C1C]">
          Dikomplain pembeli{items.length > 1 ? ` (${disputed.map((d) => d.productName).join(', ')})` : ''}. Langkah berikutnya dan pencairan tertahan sampai komplain selesai.
        </p>
      )}
      {releasable.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-lg bg-warning-50 px-2.5 py-2 text-xs text-warning-800">
          <span>
            Menunggu persetujuan pembeli{template.guarantyDays ? ` · bisa dicairkan sendiri setelah garansi ${template.guarantyDays} hari` : ''}.
          </span>
          {canManage && Boolean(order.escrow) && template.guarantyDays != null && (
            <div className="flex flex-wrap gap-1.5">
              {releasable.map((i) => {
                const amount = stepReleaseAmount(i.step, i.itemTotal);
                return (
                  <Button
                    key={i.orderId}
                    size="sm"
                    variant="bordered"
                    className="bg-white font-semibold"
                    isLoading={actions.busy === stepKey(i.orderId, template.stepName)}
                    onPress={() => void actions.release(stepKey(i.orderId, template.stepName), template.stepName, i, amount)}
                  >
                    Cairkan {formatMoney(amount, order.currency)}{items.length > 1 ? ` · ${i.productName}` : ''}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {state === 'waiting' && isBuyerStep(template) && <p className="text-xs text-default-500">Menunggu pembeli mengisi langkah ini — bukan tugas kamu.</p>}
      {state === 'current' && mode === 'group' && <p className="text-xs font-semibold text-primary">Isi di kartu &ldquo;Langkah berikutnya&rdquo; di atas.</p>}
      {state === 'current' && mode === 'product' && single && canManage && !isBuyerStep(template) && !isQuotationStep(template) && (
        formOpen ? (
          <div className="rounded-xl border border-default-200 p-3">
            <StepForm
              schema={template.formSchema}
              saved={single.step.formData}
              websiteId={websiteId}
              solid={false}
              submitLabel="Kirim & tandai selesai"
              submitting={actions.busy === stepKey(single.orderId, template.stepName)}
              savingDraft={actions.busy === `${stepKey(single.orderId, template.stepName)}:draft`}
              onSubmit={async (formData) => {
                const ok = await actions.complete(stepKey(single.orderId, template.stepName), template.stepName, [single], formData);
                if (ok) setFormOpen(false);
                return ok;
              }}
              onSaveDraft={(values) => actions.saveDraft(stepKey(single.orderId, template.stepName), template.stepName, [single], values)}
              onCancel={() => setFormOpen(false)}
            />
          </div>
        ) : (
          <Button size="sm" variant="bordered" className="self-start font-semibold text-primary" onPress={() => setFormOpen(true)}>
            {single.step.formData ? 'Lanjutkan draft' : 'Tandai selesai'}
          </Button>
        )
      )}
    </div>
  );
}
