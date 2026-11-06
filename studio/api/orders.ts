import type { ServerPage, ServerQuery } from '@/studio/ui/data-list';

import { studioRequest, websitePath } from './client';
import type { StepProgress, TerminProgressSummary } from './order-detail';

/** Subset `StepProgress` detail (response list memakai bentuk progres yang sama). */
export type OrderListStep = Pick<StepProgress, 'stepName' | 'phase' | 'filledBy' | 'completed'>;

export interface OrderListProgress {
  flowName: string;
  steps: OrderListStep[];
}

export interface OrderListItem {
  id: string;
  total_amount: number;
  quoted_total_amount: number | null;
  quantity: number;
  location?: { name?: string | null } | null;
  vendor?: { name?: string | null } | null;
  product?: { name?: string | null } | null;
}

export interface OrderListRow {
  id: string;
  buyer_identifier: string | null;
  recipient_name: string | null;
  city: string | null;
  courier: string | null;
  shipping_cost: number | null;
  total_amount: number;
  currency: string;
  payment_mode: 'ADD_TO_CART' | 'ESCROW';
  status: string;
  fulfillment_status: string;
  created_at: string;
  ref_number: string | null;
  metadata?: { shipping?: { destination_area_name?: string } } | null;
  items: Array<{ order_id: string; total_amount: number; order?: OrderListItem | null }>;
  fulfillment: Record<string, OrderListProgress>;
  needs_action: boolean;
  termin_summary: TerminProgressSummary | null;
}

export interface OrderListSummary {
  counts: {
    all: number;
    needsAction: number;
    awaitingPayment: number;
    processing: number;
    completed: number;
    cancelled: number;
  };
  heldAmounts: Array<{ currency: string; amount: number }>;
  releasedThisMonth: Array<{ currency: string; amount: number }>;
  releasedThisMonthCount: number;
}

function dateRange(period: string | undefined): { from?: string; to?: string } {
  if (!period) return {};
  const today = new Date();
  const to = localDate(today);
  if (period === 'month') {
    return { from: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`, to };
  }
  const days = period === '7d' ? 6 : period === '30d' ? 29 : null;
  if (days === null) return {};
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);
  return { from: localDate(from), to };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function localDate(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export async function fetchOrders(websiteId: string, query: ServerQuery): Promise<ServerPage<OrderListRow>> {
  const params = new URLSearchParams({
    page: String(query.page),
    size: String(query.pageSize),
  });
  if (query.search) params.set('q', query.search);

  const selectedStatus = query.filters.status ?? 'NEEDS_ACTION';
  if (selectedStatus === 'NEEDS_ACTION') {
    params.set('needs_action', 'true');
  } else if (selectedStatus === 'AWAITING_PAYMENT') {
    params.set('status', 'PENDING_PAYMENT,PENDING');
  } else if (selectedStatus === 'PROCESSING') {
    params.set('status', 'HELD,DISPUTED');
  } else if (selectedStatus === 'COMPLETED') {
    params.set('status', 'COMPLETED');
  } else if (selectedStatus === 'CANCELLED') {
    params.set('status', 'CANCELLED,REFUNDED,CLOSED');
  } else if (selectedStatus === 'RELEASED_THIS_MONTH') {
    params.set('released_this_month', 'true');
  }

  const { from, to } = dateRange(query.filters.period);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (query.filters.vendor) params.set('vendorId', query.filters.vendor);

  const result = await studioRequest<{ data: OrderListRow[]; meta: { total: number } }>(
    websitePath(websiteId, `/transactions?${params.toString()}`),
  );
  return { items: result.data, total: result.meta.total };
}

export function fetchOrderListSummary(websiteId: string): Promise<OrderListSummary> {
  return studioRequest<OrderListSummary>(websitePath(websiteId, '/transactions/summary'));
}

export function fetchOrderVendors(websiteId: string): Promise<Array<{ id: string; name: string }>> {
  return studioRequest<Array<{ id: string; name: string }>>(websitePath(websiteId, '/vendors'));
}
