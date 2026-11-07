/**
 * Turunan murni dari `OrderDetail` untuk layar detail pesanan (plan §3.14).
 * Tidak ada state/efek di sini supaya mudah diuji & dipakai ulang.
 */
import type { DetailItem, FulfillmentProgress, OrderDetail, OrderTermin, StepProgress, TransactionTermin } from '@/studio/api/order-detail';

export type PillTone = 'success' | 'warning' | 'danger' | 'neutral' | 'primary';

export const PILL_CLASS: Record<PillTone, string> = {
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  danger: 'bg-danger-50 text-[#B91C1C]',
  neutral: 'bg-default-100 text-default-700',
  primary: 'bg-primary-50 text-primary',
};

export const UNPAID_STATUSES = new Set(['PENDING', 'PENDING_PAYMENT']);
/** Dana masih ditahan — satu-satunya kondisi refund (backend juga memeriksa). */
export const REFUNDABLE_STATUSES = new Set(['HELD', 'DISPUTED']);

const DAY_MS = 24 * 60 * 60 * 1000;

export function orderNumber(order: Pick<OrderDetail, 'id' | 'ref_number'>): string {
  return order.ref_number || `#${order.id.slice(0, 8).toUpperCase()}`;
}

export function buyerName(order: OrderDetail): string {
  return order.recipient_name || order.buyer_identifier || 'Pembeli';
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map((p) => p.charAt(0)).join('') || 'P').toUpperCase();
}

/** Status Pembayaran (bukan Pengerjaan) — warna status, bukan burgundi (§3.13). */
export function paymentStatus(order: OrderDetail): { label: string; tone: PillTone } {
  const released = order.escrow?.amount_released ?? 0;
  const summary = order.termin_summary;
  if (order.status === 'COMPLETED' && summary && summary.total > summary.paid) {
    return { label: `Sisa ${summary.total - summary.paid} tagihan`, tone: 'warning' };
  }
  switch (order.status) {
    case 'PENDING':
    case 'PENDING_PAYMENT':
      return { label: 'Menunggu bayar', tone: 'warning' };
    case 'HELD':
      return released > 0
        ? { label: 'Dibayar · sebagian cair', tone: 'warning' }
        : { label: 'Dibayar · dana ditahan', tone: 'warning' };
    case 'DISPUTED':
      return { label: 'Sengketa', tone: 'danger' };
    case 'COMPLETED':
      return { label: 'Selesai · dana cair', tone: 'success' };
    case 'REFUNDED':
      return { label: 'Refund', tone: 'neutral' };
    case 'CANCELLED':
      return { label: 'Dibatalkan', tone: 'neutral' };
    case 'CLOSED':
      return { label: 'Ditutup', tone: 'neutral' };
    default:
      return { label: order.status, tone: 'neutral' };
  }
}

export interface FlowGroupItem {
  orderId: string;
  productName: string;
  itemTotal: number;
  progress: FulfillmentProgress;
}

export interface FlowGroup {
  flowName: string;
  items: FlowGroupItem[];
  total: number;
}

export function productName(item: DetailItem): string {
  return item.order?.product?.name || 'Produk';
}

export function orderTermins(order: OrderDetail): TransactionTermin[] {
  if (order.termins) return order.termins;
  return (order.items ?? []).flatMap((item) =>
    (order.fulfillment?.[item.order_id]?.termins ?? []).map((termin) => ({ ...termin, orderId: item.order_id })),
  );
}

export function hasAdditionalTermins(order: OrderDetail): boolean {
  return orderTermins(order).length > 0;
}

export function projectTotal(order: OrderDetail): number {
  const items = order.items ?? [];
  const quotedTotal = items.reduce((sum, item) => sum + Number(item.order?.quoted_total_amount ?? item.total_amount), 0);
  if (items.length === 0) return Number(order.total_amount);
  const chargesTotal = items.reduce((sum, item) => sum + Number(item.total_amount), 0)
    + orderTermins(order).filter((termin) => termin.status !== 'CANCELLED').reduce((sum, termin) => sum + Number(termin.amount), 0);
  return Math.max(quotedTotal, chargesTotal) + Number(order.shipping_cost ?? 0);
}

/** Item dikelompokkan per alur (nama flow) — sama dengan tampilan grup halaman lama. */
export function buildFlowGroups(order: OrderDetail): FlowGroup[] {
  const byFlow = new Map<string, FlowGroupItem[]>();
  for (const item of order.items ?? []) {
    const progress = order.fulfillment?.[item.order_id];
    if (!progress || progress.steps.length === 0) continue;
    const list = byFlow.get(progress.flowName) ?? [];
    list.push({ orderId: item.order_id, productName: productName(item), itemTotal: Number(item.total_amount), progress });
    byFlow.set(progress.flowName, list);
  }
  return Array.from(byFlow.entries()).map(([flowName, items]) => ({
    flowName,
    items,
    total: items.reduce((sum, i) => sum + i.itemTotal, 0),
  }));
}

export function isBuyerStep(step: Pick<StepProgress, 'filledBy'>): boolean {
  return step.filledBy === 'buyer';
}

/** Step sistem "Quotation" ditangani widget harga (Penawaran), tidak pernah diberi form di sini. */
export function isQuotationStep(step: Pick<StepProgress, 'stepName'>): boolean {
  return step.stepName === 'Quotation';
}

export function isCurrentStep(steps: StepProgress[], index: number): boolean {
  return !steps[index].completed && steps.slice(0, index).every((s) => s.completed);
}

export function currentStepIndex(steps: StepProgress[]): number {
  return steps.findIndex((s) => !s.completed);
}

export interface GroupStepItem {
  orderId: string;
  productName: string;
  itemTotal: number;
  step: StepProgress;
  eligible: boolean;
}

export interface GroupStep {
  index: number;
  template: StepProgress;
  items: GroupStepItem[];
  completedCount: number;
  eligibleItems: GroupStepItem[];
}

/** Progres per item → progres per langkah di level grup (aksi bulk satu klik). */
export function buildGroupSteps(group: FlowGroup): GroupStep[] {
  const first = group.items[0];
  if (!first) return [];
  return first.progress.steps.map((template, index) => {
    const items: GroupStepItem[] = group.items
      .filter((gi) => gi.progress.steps[index])
      .map((gi) => ({
        orderId: gi.orderId,
        productName: gi.productName,
        itemTotal: gi.itemTotal,
        step: gi.progress.steps[index],
        eligible: isCurrentStep(gi.progress.steps, index),
      }));
    return {
      index,
      template,
      items,
      completedCount: items.filter((i) => i.step.completed).length,
      eligibleItems: items.filter((i) => i.eligible),
    };
  });
}

/** Langkah yang sedang giliran seller (untuk kartu "Langkah berikutnya"). */
export function sellerTurnSteps(groups: FlowGroup[]): Array<{ group: FlowGroup; step: GroupStep }> {
  const result: Array<{ group: FlowGroup; step: GroupStep }> = [];
  for (const group of groups) {
    const step = buildGroupSteps(group).find(
      (s) => s.eligibleItems.length > 0 && !isBuyerStep(s.template) && !isQuotationStep(s.template),
    );
    if (step) result.push({ group, step });
  }
  return result;
}

/** Langkah yang sedang menunggu pembeli. */
export function buyerTurnSteps(groups: FlowGroup[]): Array<{ group: FlowGroup; step: GroupStep }> {
  const result: Array<{ group: FlowGroup; step: GroupStep }> = [];
  for (const group of groups) {
    const step = buildGroupSteps(group).find((s) => s.eligibleItems.length > 0 && isBuyerStep(s.template));
    if (step) result.push({ group, step });
  }
  return result;
}

/** Nominal pencairan 1 langkah untuk 1 item — memakai total ITEM, bukan total grup (bug lama 976-979). */
export function stepReleaseAmount(step: StepProgress, itemTotal: number): number | null {
  if (step.releaseApproved && step.releaseAmount != null) return Number(step.releaseAmount);
  return step.releasePercentage != null ? (Number(step.releasePercentage) / 100) * itemTotal : null;
}

export function workProgress(groups: FlowGroup[]): { done: number; total: number } {
  const steps = groups.flatMap((g) => g.items.flatMap((i) => i.progress.steps.filter((s) => s.phase !== 'PRAORDER')));
  return { done: steps.filter((s) => s.completed).length, total: steps.length };
}

/** Termin dikelompokkan per langkah jangkar (`anchorStepName`); tanpa jangkar → kunci ''. */
export function terminsByAnchor<T extends OrderTermin>(termins: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const termin of [...termins].sort((a, b) => a.sequence - b.sequence)) {
    const key = termin.anchorStepName ?? '';
    map.set(key, [...(map.get(key) ?? []), termin]);
  }
  return map;
}

export function hasPreorder(order: OrderDetail): boolean {
  return Object.values(order.fulfillment ?? {}).some((p) => p.steps.some((s) => s.phase === 'PRAORDER'));
}

export interface ForceCompleteState {
  /** Tombol ditampilkan (escrow ada, status HELD). */
  visible: boolean;
  enabled: boolean;
  reason: string | null;
  /** Perkiraan paling cepat (held_at + garansi terbesar); backend menghitung dari langkah terakhir selesai. */
  availableFrom: Date | null;
}

/**
 * Cermin syarat `forceCompleteTransaction` (backend): HELD + escrow, semua produk
 * punya `final_release_guaranty_days`, semua langkah selesai, garansi lewat.
 * Waktu langkah terakhir selesai tidak ada di response, jadi tanggal di sini
 * batas bawah; bila backend masih menolak, pesannya ditampilkan.
 */
export function forceCompleteState(order: OrderDetail, now = Date.now()): ForceCompleteState {
  const visible = Boolean(order.escrow) && order.status === 'HELD';
  if (!visible) return { visible, enabled: false, reason: null, availableFrom: null };
  const items = order.items ?? [];
  const missing = items.find((i) => !i.order?.product?.final_release_guaranty_days);
  if (missing) {
    return {
      visible,
      enabled: false,
      reason: `Produk "${productName(missing)}" belum punya masa konfirmasi penerimaan. Atur di Katalog.`,
      availableFrom: null,
    };
  }
  const unfinished = Object.values(order.fulfillment ?? {}).some((p) => p.steps.some((s) => !s.completed));
  if (unfinished) {
    return { visible, enabled: false, reason: 'Tersedia setelah semua langkah pengerjaan selesai.', availableFrom: null };
  }
  const days = Math.max(...items.map((i) => Number(i.order?.product?.final_release_guaranty_days ?? 0)), 0);
  const since = new Date(order.held_at ?? order.created_at).getTime();
  const availableFrom = new Date(since + days * DAY_MS);
  if (availableFrom.getTime() > now) {
    return {
      visible,
      enabled: false,
      reason: `Tersedia jika pembeli tidak mengonfirmasi sampai ${formatDay(availableFrom)}.`,
      availableFrom,
    };
  }
  return { visible, enabled: true, reason: null, availableFrom };
}

export function formatDay(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function formatMoney(amount: number | null | undefined, currency = 'IDR'): string {
  if (amount == null || !Number.isFinite(Number(amount))) return '—';
  try {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount));
  } catch {
    return `${currency} ${new Intl.NumberFormat('id-ID').format(Number(amount))}`;
  }
}

const RESI_PATTERN = /resi|tracking|awb/i;

/** Nomor resi dari data langkah (field ber-key/label "resi"/"tracking"). */
export function findTrackingNumber(order: OrderDetail): string | null {
  for (const progress of Object.values(order.fulfillment ?? {})) {
    for (const step of progress.steps) {
      if (!step.completed || !step.formData) continue;
      for (const field of step.formSchema ?? []) {
        const value = step.formData[field.key];
        if ((RESI_PATTERN.test(field.key) || RESI_PATTERN.test(field.label)) && typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
    }
  }
  return null;
}

export function trackingUrl(resi: string): string {
  return `https://cekresi.com/?noresi=${encodeURIComponent(resi)}`;
}

/** Sama dengan daftar kurir shipping-service (disalin dari label lama). */
const COURIER_LABELS: Record<string, string> = {
  jne: 'JNE',
  jnt: 'J&T Express',
  sicepat: 'SiCepat',
  pos: 'Pos Indonesia',
  tiki: 'TIKI',
  anteraja: 'AnterAja',
  wahana: 'Wahana',
  ninja: 'Ninja Xpress',
  lion: 'Lion Parcel',
  sap: 'SAP Express',
};

export function courierLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return COURIER_LABELS[code.toLowerCase()] ?? code.toUpperCase();
}
