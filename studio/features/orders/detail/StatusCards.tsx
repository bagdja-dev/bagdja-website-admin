'use client';

import { Button } from '@heroui/react';

import type { OrderDetail } from '@/studio/api/order-detail';
import { Icon } from '@/studio/ui/icons';
import { notify } from '@/studio/ui/primitives/Toast';

import { StepForm } from './StepForm';
import type { OrderActions } from './use-order-actions';
import { buyerName, formatDateTime, formatDay, formatMoney, type FlowGroup, type GroupStep } from './order-model';

const EYEBROW = 'text-xs font-bold uppercase tracking-[0.08em]';
const CARD = 'flex flex-col gap-3 rounded-2xl bg-white p-5';
export const OUTLINE_DANGER =
  'min-h-11 rounded-[10px] border border-danger-200 bg-white px-3.5 text-sm font-semibold text-[#B91C1C] hover:bg-danger-50';

export function groupStepKey(flowName: string, stepName: string): string {
  return `group:${flowName}::${stepName}`;
}

interface NextStepCardProps {
  order: OrderDetail;
  group: FlowGroup;
  step: GroupStep;
  websiteId: string;
  solid: boolean;
  canManage: boolean;
  actions: OrderActions;
}

/** Kartu "Langkah berikutnya · giliranmu" (berbingkai burgundi). Mode grup = satu klik untuk semua item eligible. */
export function NextStepCard({ order, group, step, websiteId, solid, canManage, actions }: NextStepCardProps) {
  const { template, eligibleItems } = step;
  const key = groupStepKey(group.flowName, template.stepName);
  const pct = template.releasePercentage;
  const amount = pct != null ? (pct / 100) * eligibleItems.reduce((s, i) => s + i.itemTotal, 0) : null;
  const targets = eligibleItems.map((i) => ({ orderId: i.orderId, productName: i.productName }));
  const draft = eligibleItems.find((i) => i.step.formData)?.step.formData ?? null;
  const many = eligibleItems.length > 1;
  const submitLabel = pct != null ? `Tandai selesai & ajukan cair ${pct}%` : many ? `Tandai selesai (${eligibleItems.length} produk)` : 'Tandai selesai';

  return (
    <section aria-label="Langkah berikutnya" className={`${CARD} gap-3.5 border-2 border-primary`}>
      <div className="flex flex-col gap-1">
        <span className={`${EYEBROW} text-primary`}>Langkah berikutnya · giliranmu</span>
        <h2 className="text-[19px] font-extrabold text-foreground">Tandai &ldquo;{template.stepName}&rdquo;</h2>
        <p className="text-sm text-default-600">
          {template.description ? `${template.description} ` : ''}
          {amount != null && (
            <>
              Setelah ditandai, <strong className="text-foreground">{pct}% dana ({formatMoney(amount, order.currency)})</strong> cair ke Saldo saat pembeli
              menyetujui{template.guarantyDays ? ` atau setelah masa garansi ${template.guarantyDays} hari lewat` : ''}.
            </>
          )}
        </p>
        {group.items.length > 1 && (
          <p className="text-xs text-default-500">Berlaku untuk: {eligibleItems.map((i) => i.productName).join(', ')}</p>
        )}
      </div>
      {canManage ? (
        <StepForm
          key={`${key}:${eligibleItems.length}`}
          schema={template.formSchema}
          saved={draft}
          websiteId={websiteId}
          solid={solid}
          submitLabel={submitLabel}
          hint="Pembeli menerima notifikasi beserta isian langkah ini."
          submitting={actions.busy === key}
          savingDraft={actions.busy === `${key}:draft`}
          onSubmit={(formData) => actions.complete(key, template.stepName, targets, formData)}
          onSaveDraft={(values) => actions.saveDraft(key, template.stepName, targets, values)}
        />
      ) : (
        <p className="rounded-[10px] bg-default-100 px-3 py-2 text-[13px] text-default-700">Hanya editor ke atas yang dapat menandai langkah ini.</p>
      )}
    </section>
  );
}

interface WaitingBuyerCardProps {
  order: OrderDetail;
  stepName: string | null;
  deadline: Date | null;
  actions: OrderActions;
}

/** Giliran pembeli: langkah ber-`filledBy: 'buyer'` atau konfirmasi akhir. Tidak pernah ada tombol "tandai selesai". */
export function WaitingBuyerCard({ order, stepName, deadline, actions }: WaitingBuyerCardProps) {
  const released = order.escrow?.amount_released ?? 0;
  const held = order.escrow?.remaining_hold ?? 0;
  return (
    <section aria-label="Status saat ini" className={`${CARD} border border-default-200`}>
      {released > 0 && (
        <span role="status" className="flex items-center gap-2 rounded-[10px] bg-success-50 px-3 py-2.5 text-[13px] font-bold text-success-700">
          <Icon name="check" size={16} strokeWidth={2.6} /> {formatMoney(released, order.currency)} sudah cair ke Saldo.
        </span>
      )}
      <span className={`${EYEBROW} text-default-600`}>Menunggu pembeli</span>
      <h2 className="text-lg font-extrabold">
        {stepName ? `${buyerName(order)} perlu mengisi “${stepName}”` : `${buyerName(order)} perlu mengonfirmasi pesanan`}
      </h2>
      <p className="text-sm leading-relaxed text-default-600">
        {stepName
          ? 'Langkah ini diisi oleh pembeli, bukan tugas kamu. Pengerjaan berlanjut setelah pembeli mengirimnya.'
          : `Sisa ${formatMoney(held, order.currency)} cair saat pembeli mengonfirmasi.`}
        {!stepName && deadline && (
          <>
            {' '}Jika tidak dikonfirmasi sampai <strong className="text-foreground">{formatDay(deadline)}</strong>, kamu bisa menyelesaikan pesanan sendiri.
          </>
        )}
      </p>
      <div>
        <Button variant="bordered" className="min-h-11 rounded-[10px] font-semibold" isLoading={actions.busy === 'chat'} onPress={() => void actions.startChat()}>
          Ingatkan lewat chat
        </Button>
      </div>
    </section>
  );
}

/** Belum dibayar: tanpa kartu langkah, hanya status & tautan bayar. */
export function UnpaidCard({ order }: { order: OrderDetail }) {
  const copy = async (): Promise<void> => {
    if (!order.checkout_url) return;
    try {
      await navigator.clipboard.writeText(order.checkout_url);
      notify.success('Link pembayaran disalin');
    } catch {
      notify.warning('Tidak bisa menyalin otomatis.');
    }
  };
  return (
    <section aria-label="Status pembayaran" className={`${CARD} border border-warning-200`}>
      <span className={`${EYEBROW} text-warning-700`}>Menunggu pembayaran</span>
      <h2 className="text-lg font-extrabold">Pembeli belum menyelesaikan pembayaran</h2>
      <p className="text-sm text-default-600">
        Pesanan dibuat {formatDateTime(order.created_at)}. Langkah pengerjaan dimulai otomatis setelah pembayaran diterima.
      </p>
      {order.checkout_url && (
        <div>
          <Button variant="bordered" className="min-h-11 rounded-[10px] font-semibold" onPress={() => void copy()}>
            Salin link pembayaran
          </Button>
        </div>
      )}
    </section>
  );
}

interface DisputeCardProps {
  order: OrderDetail;
  disputedSteps: Array<{ productName: string; stepName: string }>;
  canRefund: boolean;
  actions: OrderActions;
}

/** Sengketa: keluhan pembeli + pilihan tanggapan (chat, refund). Menolak komplain = keputusan platform. */
export function DisputeCard({ order, disputedSteps, canRefund, actions }: DisputeCardProps) {
  const refundable = Boolean(order.escrow) && (order.status === 'HELD' || order.status === 'DISPUTED');
  return (
    <section aria-label="Sengketa" className={`${CARD} border-2 border-danger-200`}>
      <span className={`${EYEBROW} text-[#B91C1C]`}>Pembeli mengajukan komplain</span>
      <h2 className="text-lg font-extrabold">
        {disputedSteps.length > 0 ? `Komplain pada ${disputedSteps.map((d) => `“${d.stepName}”`).join(', ')}` : 'Pesanan dalam sengketa'}
      </h2>
      <p className="text-sm leading-relaxed text-default-600">
        Dana {disputedSteps.length > 0 ? 'langkah ini' : 'pesanan'} dibekukan sampai komplain selesai. Tanyakan detail keluhan lewat chat. Jika komplain
        valid, refund pembeli. Untuk menolak komplain, hubungi tim Bagdja.
      </p>
      {disputedSteps.length > 0 && (
        <ul className="m-0 list-disc pl-5 text-[13px] text-default-700">
          {disputedSteps.map((d) => (
            <li key={`${d.productName}-${d.stepName}`}>{d.productName} · {d.stepName}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2.5">
        <Button variant="bordered" className="min-h-11 rounded-[10px] font-semibold" isLoading={actions.busy === 'chat'} onPress={() => void actions.startChat()}>
          Chat pembeli
        </Button>
        {canRefund && refundable && (
          <button type="button" className={OUTLINE_DANGER} disabled={actions.busy === 'refund'} onClick={() => void actions.refund()}>
            Refund ke pembeli…
          </button>
        )}
      </div>
    </section>
  );
}
