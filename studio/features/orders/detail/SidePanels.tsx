'use client';

import { Button } from '@heroui/react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { OrderDetail } from '@/studio/api/order-detail';

import { OUTLINE_DANGER } from './StatusCards';
import type { OrderActions } from './use-order-actions';
import {
  buyerName,
  courierLabel,
  findTrackingNumber,
  formatMoney,
  initials,
  hasAdditionalTermins,
  orderTermins,
  projectTotal,
  REFUNDABLE_STATUSES,
  trackingUrl,
  type ForceCompleteState,
} from './order-model';

const TERMIN_STATUS: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: 'Belum diterbitkan', className: 'bg-default-100 text-default-700' },
  ISSUED: { label: 'Menunggu dibayar', className: 'bg-warning-50 text-warning-800' },
  PAID: { label: 'Lunas', className: 'bg-success-50 text-success-700' },
  CANCELLED: { label: 'Dibatalkan', className: 'bg-default-100 text-default-600' },
};

function initialChargeStatus(order: OrderDetail): { label: string; className: string } {
  if (order.status === 'DISPUTED') return { label: 'Sengketa', className: 'bg-danger-50 text-danger-700' };
  if (['HELD', 'COMPLETED'].includes(order.status)) return { label: 'Lunas', className: 'bg-success-50 text-success-700' };
  if (order.status === 'REFUNDED') return { label: 'Refund', className: 'bg-default-100 text-default-700' };
  if (order.status === 'CANCELLED' || order.status === 'CLOSED') {
    return { label: order.status === 'CANCELLED' ? 'Dibatalkan' : 'Ditutup', className: 'bg-default-100 text-default-700' };
  }
  return { label: 'Menunggu dibayar', className: 'bg-warning-50 text-warning-800' };
}

const PANEL = 'flex flex-col gap-2.5 rounded-2xl border border-default-200 bg-white p-[18px] text-sm';
const EYEBROW = 'text-xs font-bold uppercase tracking-[0.06em] text-default-600';

function Row({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-default-600">{label}</span>
      <span className={`text-right ${mono ? 'break-all font-mono text-xs' : ''}`}>{children}</span>
    </div>
  );
}

export function hasShipping(order: OrderDetail): boolean {
  return Boolean(order.metadata?.shipping || order.address || order.courier);
}

export function BuyerPanel({ order }: { order: OrderDetail }) {
  const name = buyerName(order);
  const contact = [order.phone, order.recipient_name && order.buyer_identifier ? order.buyer_identifier : null].filter(Boolean).join(' · ');
  return (
    <section className={PANEL}>
      <span className={EYEBROW}>Pembeli</span>
      <span className="flex items-center gap-3">
        <span className="inline-flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full bg-primary-100 font-extrabold text-primary">{initials(name)}</span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-bold">{name}</span>
          {contact && <span className="truncate text-[13px] text-default-600">{contact}</span>}
        </span>
      </span>
      <span className="text-[13px] leading-normal text-default-700">
        {hasShipping(order) ? (
          <><strong>Kirim ke:</strong> {[order.city, order.metadata?.shipping?.destination_area_name].filter(Boolean).join(' · ') || 'alamat di bawah'}</>
        ) : (
          <><strong>Cara terima:</strong> datang ke lokasi / layanan sesuai pesanan</>
        )}
      </span>
    </section>
  );
}

/** Pengiriman barang: alamat, kurir & ongkir, resi + lacak. */
export function ShippingCard({ order }: { order: OrderDetail }) {
  const shipping = order.metadata?.shipping ?? null;
  const resi = findTrackingNumber(order);
  const address = [order.address, order.district, order.city].filter(Boolean).join(', ');
  const service = shipping?.courier_service_name ?? shipping?.resolved_service;
  return (
    <section aria-label="Pengiriman" className="flex flex-col gap-2.5 rounded-2xl border border-default-200 bg-white p-5 text-sm">
      <h2 className="text-base font-extrabold">Pengiriman</h2>
      {order.recipient_name && <Row label="Penerima">{order.recipient_name}</Row>}
      {order.phone && <Row label="No. HP">{order.phone}</Row>}
      {address && <Row label="Alamat">{address}{order.postal_code ? ` ${order.postal_code}` : ''}</Row>}
      {shipping ? (
        <>
          <Row label="Kurir">{courierLabel(shipping.courier_code)}{service ? ` · ${service}` : ''}</Row>
          {shipping.destination_area_name && <Row label="Area tujuan">{shipping.destination_area_name}</Row>}
          <Row label="Ongkir">{formatMoney(order.shipping_cost ?? 0, order.currency)}</Row>
        </>
      ) : (
        order.courier && <Row label="Kurir">{order.courier}</Row>
      )}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-default-50 px-3 py-2.5">
        {resi ? (
          <>
            <span>No. resi <strong className="font-mono">{resi}</strong></span>
            <a href={trackingUrl(resi)} target="_blank" rel="noreferrer" className="text-[13px] font-semibold">Lacak paket →</a>
          </>
        ) : (
          <span className="text-default-600">Nomor resi belum diisi. Isi di langkah pengiriman.</span>
        )}
      </div>
    </section>
  );
}

export function PaymentPanel({ order }: { order: OrderDetail }) {
  const items = order.items ?? [];
  const hasInstallments = hasAdditionalTermins(order);
  const total = hasInstallments ? projectTotal(order) : order.total_amount;
  const termins = orderTermins(order);
  const productNameByOrderId = new Map(items.map((item) => [item.order_id, item.order?.product?.name ?? '']));
  const initialStatus = initialChargeStatus(order);
  const activeTermins = termins.filter((termin) => termin.status !== 'CANCELLED');
  const paidCharges = (['HELD', 'COMPLETED', 'DISPUTED'].includes(order.status) ? 1 : 0)
    + activeTermins.filter((termin) => termin.status === 'PAID').length;
  const totalCharges = 1 + activeTermins.length;
  const sortedTermins = termins.slice().sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id));
  const displayedTerminNumberById = new Map<string, number>();
  const terminNumberByOrderId = new Map<string, number>();
  for (const termin of sortedTermins) {
    const number = (terminNumberByOrderId.get(termin.orderId) ?? 0) + 1;
    terminNumberByOrderId.set(termin.orderId, number);
    displayedTerminNumberById.set(termin.id, number);
  }
  const shippingRow = order.metadata?.shipping ? (
    <Row label={hasInstallments ? 'Ongkir · termasuk total proyek' : 'Ongkir'}>
      {formatMoney(order.shipping_cost ?? 0, order.currency)}
    </Row>
  ) : hasShipping(order) ? (
    <Row label="Ongkir">Ditentukan penjual</Row>
  ) : null;

  return (
    <section className={PANEL}>
      <span className={EYEBROW}>Pembayaran</span>
      {hasInstallments && (
        <div className="flex items-center justify-between gap-3 border-b border-default-100 pb-2 text-base font-extrabold">
          <span>Total proyek</span>
          <span className="text-right">{formatMoney(total, order.currency)}</span>
        </div>
      )}
      {hasInstallments && shippingRow}
      {hasInstallments && (
        <div className="mt-1 flex flex-col gap-2 border-t border-default-100 pt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold">Rincian pembayaran</span>
            <span className="text-xs text-default-600">{paidCharges}/{totalCharges} tagihan lunas</span>
          </div>
          <div className="flex items-start justify-between gap-2 rounded-lg bg-default-50 px-3 py-2.5">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="font-semibold">DP · Pembayaran awal</span>
              <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-bold ${initialStatus.className}`}>{initialStatus.label}</span>
            </div>
            <strong className="whitespace-nowrap">{formatMoney(order.total_amount, order.currency)}</strong>
          </div>
          {sortedTermins
            .map((termin) => {
              const status = TERMIN_STATUS[termin.status] ?? TERMIN_STATUS.SCHEDULED;
              const productName = productNameByOrderId.get(termin.orderId);
              return (
                <div key={termin.id} className="flex items-start justify-between gap-2 rounded-lg bg-default-50 px-3 py-2.5">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-semibold">Termin {displayedTerminNumberById.get(termin.id)} · {termin.label}</span>
                    {items.length > 1 && productName && <span className="truncate text-xs text-default-600">{productName}</span>}
                    <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-bold ${status.className}`}>{status.label}</span>
                  </div>
                  <strong className="whitespace-nowrap">{formatMoney(termin.amount, order.currency)}</strong>
                </div>
              );
            })}
          {termins.length === 0 && (
            <p className="text-xs text-warning-800">Rincian tagihan lanjutan belum tersedia.</p>
          )}
        </div>
      )}
      {!hasInstallments && (
        <>
          <Row label={`Subtotal (${items.length} item)`}>
            {formatMoney(items.reduce((sum, item) => sum + Number(item.total_amount), 0), order.currency)}
          </Row>
          {shippingRow}
          <div className="flex justify-between border-t border-default-100 pt-2 font-extrabold">
            <span>Total</span>
            <span>{formatMoney(total, order.currency)}</span>
          </div>
        </>
      )}
      <Row label="Metode">{order.payment_mode === 'ESCROW' ? 'Escrow' : 'Checkout Bagdja'}</Row>
      {order.ref_number && <Row label="No. referensi" mono>{order.ref_number}</Row>}
      {order.escrow_id && <Row label="Escrow ID" mono>{order.escrow_id}</Row>}
    </section>
  );
}

export function FundsPanel({ order }: { order: OrderDetail }) {
  const escrow = order.escrow;
  if (!escrow) return null;
  const hasTermins = hasAdditionalTermins(order);
  const released = Number(escrow.amount_released);
  const held = Number(escrow.remaining_hold);
  const total = released + held;
  const pct = total > 0 ? Math.round((released / total) * 100) : 0;
  return (
    <section className={PANEL}>
      <span className={EYEBROW}>{hasTermins ? 'Dana DP' : 'Dana pesanan'}</span>
      <span className="flex h-2.5 overflow-hidden rounded-[5px] bg-warning-200" role="img" aria-label={`${pct}% ${hasTermins ? 'dana DP' : 'dana pesanan'} sudah cair`}>
        <span className="block h-full bg-success" style={{ width: `${pct}%` }} />
      </span>
      <Row label={hasTermins ? 'DP sudah cair ke Saldo' : 'Sudah cair ke Saldo'}><strong>{formatMoney(released, order.currency)}</strong></Row>
      <Row label={hasTermins ? 'DP masih ditahan' : 'Masih ditahan'}><strong>{formatMoney(held, order.currency)}</strong></Row>
      <Link href="/studio/wallet" className="text-[13px] font-semibold">Lihat di Saldo →</Link>
    </section>
  );
}

interface OtherActionsProps {
  order: OrderDetail;
  forceComplete: ForceCompleteState;
  canForceComplete: boolean;
  canRefund: boolean;
  actions: OrderActions;
}

/** "Aksi lain": selesaikan (editor+, nonaktif + alasan) dan refund (admin+, garis merah). */
export function OtherActionsPanel({ order, forceComplete, canForceComplete, canRefund, actions }: OtherActionsProps) {
  const showComplete = forceComplete.visible && canForceComplete;
  const showRefund = canRefund && Boolean(order.escrow) && REFUNDABLE_STATUSES.has(order.status);
  if (!showComplete && !showRefund) return null;
  return (
    <section id="aksi-lain" className={PANEL}>
      <span className={EYEBROW}>Aksi lain</span>
      {showComplete && (
        <>
          <Button
            variant="bordered"
            className="min-h-11 justify-start rounded-[10px] font-semibold"
            isDisabled={!forceComplete.enabled}
            isLoading={actions.busy === 'force-complete'}
            onPress={() => void actions.forceComplete()}
          >
            Selesaikan pesanan
          </Button>
          <span className="-mt-1 text-xs text-default-600">
            {forceComplete.reason ?? 'Pembeli belum mengonfirmasi dan masa konfirmasi sudah lewat. Sisa dana cair ke Saldo.'}
          </span>
        </>
      )}
      {showRefund && (
        <button type="button" className={`${OUTLINE_DANGER} text-left`} disabled={actions.busy === 'refund'} onClick={() => void actions.refund()}>
          {actions.busy === 'refund' ? 'Memproses refund…' : 'Refund ke pembeli…'}
        </button>
      )}
    </section>
  );
}
