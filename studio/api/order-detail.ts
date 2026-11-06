/**
 * Detail pesanan (S7) — tipe selaras response `GET /api/websites/:w/transactions/:id`
 * (`TransactionsService.getTenantTransaction`) dan endpoint aksi tenant di
 * `tenant-transactions.controller.ts` / `tenant-orders.controller.ts`.
 */
import { jsonBody, studioRequest, websitePath } from './client';

export type StepFieldType = 'text' | 'number' | 'textarea' | 'select' | 'pdf' | 'foto' | 'video' | 'lokasi';

export interface StepFormField {
  key: string;
  label: string;
  type: StepFieldType;
  required?: boolean;
  options?: string[];
  max_files?: number;
}

export interface StepProgress {
  stepName: string;
  phase: 'PRAORDER' | 'PASCAORDER';
  filledBy: 'admin' | 'buyer';
  description: string | null;
  processDay: number | null;
  releasePercentage: number | null;
  guarantyDays: number | null;
  formSchema: StepFormField[] | null;
  completed: boolean;
  /** Data langkah selesai, atau draft terakhir bila belum selesai. */
  formData: Record<string, unknown> | null;
  releaseApproved: boolean;
  releaseAmount: number | null;
  releaseApprovedBy: string | null;
  disputed: boolean;
}

export type TerminStatus = 'SCHEDULED' | 'ISSUED' | 'PAID' | 'CANCELLED';

export interface OrderTermin {
  id: string;
  sequence: number;
  label: string;
  amount: number;
  anchorStepName: string | null;
  status: TerminStatus;
  transactionId: string | null;
}

export interface TransactionTermin extends OrderTermin {
  orderId: string;
}

export interface FulfillmentProgress {
  flowName: string;
  steps: StepProgress[];
  termins: OrderTermin[];
}

export interface DetailProduct {
  id?: string;
  name?: string | null;
  images?: string[] | null;
  /** Hari masa konfirmasi penerimaan — syarat force-complete (backend). */
  final_release_guaranty_days?: number | null;
  uom?: { name?: string | null } | null;
}

export interface DetailOrder {
  id?: string;
  location_id?: string | null;
  vendor_id?: string | null;
  vendor?: { id: string; name: string } | null;
  product?: DetailProduct | null;
  quantity?: number;
  quoted_total_amount?: number | null;
  metadata?: { gathering?: { role?: string; group_id?: string; occurrence_id?: string } } | null;
}

export interface DetailItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  order?: DetailOrder | null;
}

export interface EscrowSummary {
  id: string;
  status: string;
  amount_held: number;
  amount_released: number;
  remaining_hold: number;
}

export interface ShippingMetadata {
  destination_area_name?: string;
  courier_code?: string;
  courier_service_name?: string;
  resolved_service?: string;
}

export interface TerminProgressSummary {
  total: number;
  paid: number;
  issued: number;
  scheduled: number;
}

export interface OrderDetail {
  id: string;
  website_id: string;
  buyer_user_id: string;
  buyer_identifier: string | null;
  recipient_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  postal_code: string | null;
  courier: string | null;
  shipping_cost?: number | null;
  total_amount: number;
  currency: string;
  payment_mode: 'ADD_TO_CART' | 'ESCROW';
  status: string;
  fulfillment_status: string;
  checkout_url: string | null;
  held_at?: string | null;
  created_at: string;
  ref_number?: string | null;
  escrow_id?: string | null;
  items?: DetailItem[];
  escrow?: EscrowSummary | null;
  fulfillment?: Record<string, FulfillmentProgress>;
  termins?: TransactionTermin[];
  metadata?: {
    shipping?: ShippingMetadata;
    gathering?: { role?: string; group_id?: string; occurrence_id?: string };
  } | null;
  termin_summary?: TerminProgressSummary | null;
}

/** `GET .../orders/:orderId` — dipakai rantai fallback (order belum/tidak jadi transaksi). */
export interface OrderLookup {
  id: string;
  status?: string;
  transaction_id?: string | null;
  buyer_identifier: string | null;
  quantity: number;
  total_amount: number;
  quoted_total_amount: number | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
  location?: { name?: string | null } | null;
  product?: { name?: string | null } | null;
}

export interface VendorCandidate {
  id: string;
  name: string;
  contact_whatsapp?: string | null;
}

export interface AdhocTerminInput {
  label: string;
  amount: number;
  anchor_step_name?: string;
}

const tx = (websiteId: string, transactionId: string, suffix = ''): string =>
  websitePath(websiteId, `/transactions/${encodeURIComponent(transactionId)}${suffix}`);

const orderPath = (orderId: string): string => `/orders/${encodeURIComponent(orderId)}`;

export function fetchOrderDetail(websiteId: string, transactionId: string): Promise<OrderDetail> {
  return studioRequest<OrderDetail>(tx(websiteId, transactionId));
}

export function fetchOrderLookup(websiteId: string, orderId: string): Promise<OrderLookup> {
  return studioRequest<OrderLookup>(websitePath(websiteId, orderPath(orderId)));
}

export function fetchCancelledPreorders(websiteId: string): Promise<OrderLookup[]> {
  return studioRequest<OrderLookup[]>(websitePath(websiteId, '/orders/preorders/cancelled'));
}

export function completeStep(
  websiteId: string,
  transactionId: string,
  orderId: string,
  stepName: string,
  formData?: Record<string, unknown>,
): Promise<unknown> {
  return studioRequest(tx(websiteId, transactionId, `${orderPath(orderId)}/steps/complete`), {
    method: 'POST',
    ...jsonBody({ step_name: stepName, form_data: formData }),
  });
}

export function saveStepDraft(
  websiteId: string,
  transactionId: string,
  orderId: string,
  stepName: string,
  formData: Record<string, unknown>,
): Promise<unknown> {
  return studioRequest(tx(websiteId, transactionId, `${orderPath(orderId)}/steps/draft`), {
    method: 'POST',
    ...jsonBody({ step_name: stepName, form_data: formData }),
  });
}

export function forceReleaseStep(websiteId: string, transactionId: string, orderId: string, stepName: string): Promise<unknown> {
  return studioRequest(
    tx(websiteId, transactionId, `${orderPath(orderId)}/steps/${encodeURIComponent(stepName)}/force-release`),
    { method: 'POST' },
  );
}

export function issueTermin(websiteId: string, transactionId: string, orderId: string, terminId: string): Promise<unknown> {
  return studioRequest(
    tx(websiteId, transactionId, `${orderPath(orderId)}/termins/${encodeURIComponent(terminId)}/issue`),
    { method: 'POST' },
  );
}

export function addAdhocTermin(websiteId: string, transactionId: string, orderId: string, input: AdhocTerminInput): Promise<unknown> {
  return studioRequest(tx(websiteId, transactionId, `${orderPath(orderId)}/termins/adhoc`), {
    method: 'POST',
    ...jsonBody(input),
  });
}

export function refundOrder(websiteId: string, transactionId: string): Promise<unknown> {
  return studioRequest(tx(websiteId, transactionId, '/refund'), { method: 'POST' });
}

export function forceCompleteOrder(websiteId: string, transactionId: string): Promise<unknown> {
  return studioRequest(tx(websiteId, transactionId, '/force-complete'), { method: 'POST' });
}

export function fetchVendorCandidates(websiteId: string, locationId: string): Promise<VendorCandidate[]> {
  return studioRequest<VendorCandidate[]>(
    websitePath(websiteId, `/orders/vendor-candidates?locationId=${encodeURIComponent(locationId)}`),
  );
}

export function assignOrderVendor(websiteId: string, orderId: string, vendorId: string): Promise<unknown> {
  return studioRequest(websitePath(websiteId, `${orderPath(orderId)}/assign-vendor`), {
    method: 'PATCH',
    ...jsonBody({ vendor_id: vendorId }),
  });
}

const CHAT_REFERENCE_PREFIX = '__BAGDJA_CHAT_REFERENCE__';

/**
 * `POST /api/chat/:websiteId/threads` (channel order). Backend men-dedup thread
 * per order, jadi aman dipanggil ulang. Pesan pertama = kartu referensi transaksi.
 */
export async function openOrderChat(websiteId: string, order: OrderDetail): Promise<string | null> {
  const label = `TRX ${order.id.slice(0, 8)}`;
  const reference = {
    type: 'transaction',
    id: order.id,
    title: label,
    href: `/studio/orders/${order.id}`,
    meta: order.items?.[0]?.order?.product?.name ?? 'Detail pesanan',
  };
  const response = await studioRequest<{ id?: string }>(`/api/chat/${encodeURIComponent(websiteId)}/threads`, {
    method: 'POST',
    ...jsonBody({
      channel_type: 'order',
      channel_label: label,
      order_id: order.items?.[0]?.order_id ?? undefined,
      customer_user_id: order.buyer_user_id,
      initial_message: `${CHAT_REFERENCE_PREFIX}${JSON.stringify(reference)}`,
    }),
  });
  return response.id ?? null;
}
