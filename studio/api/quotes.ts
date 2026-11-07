import { jsonBody, studioRequest, websitePath } from './client';
import type { StepProgress } from './order-detail';

export interface DraftQuote {
  id: string;
  buyer_user_id?: string | null;
  buyer_identifier: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  quoted_total_amount: number | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  status?: string;
  transaction_id?: string | null;
  location?: { name?: string | null } | null;
  vendor?: { name?: string | null; status?: string } | null;
  product?: {
    name?: string | null;
    type?: string | null;
    description?: string | null;
    images?: string[] | null;
    quotable?: boolean;
    fulfillment_flow_id?: string | null;
  } | null;
  praorderProgress?: { flowName: string; steps: StepProgress[] } | null;
}

export interface CancelledQuote {
  id: string;
  buyer_identifier: string | null;
  quantity: number;
  total_amount: number;
  quoted_total_amount: number | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
  product?: { name?: string | null } | null;
}

export type QuoteTerminInput = {
  label: string;
  amount: number;
  anchor_step_name?: string;
};

export async function fetchDraftQuotes(websiteId: string): Promise<DraftQuote[]> {
  return studioRequest<DraftQuote[]>(websitePath(websiteId, '/orders/drafts'));
}

export async function fetchCancelledQuotes(websiteId: string): Promise<CancelledQuote[]> {
  return studioRequest<CancelledQuote[]>(websitePath(websiteId, '/orders/preorders/cancelled'));
}

export async function fetchQuoteOrder(websiteId: string, orderId: string): Promise<DraftQuote> {
  return studioRequest<DraftQuote>(websitePath(websiteId, `/orders/${encodeURIComponent(orderId)}`));
}

export async function saveQuote(
  websiteId: string,
  orderId: string,
  finalPrice: number,
  termins?: QuoteTerminInput[],
): Promise<void> {
  await studioRequest(websitePath(websiteId, `/orders/${encodeURIComponent(orderId)}/quote`), {
    method: 'PATCH',
    ...jsonBody({ final_price: finalPrice, termins }),
  });
}

export async function cancelQuote(websiteId: string, orderId: string, reason?: string): Promise<void> {
  await studioRequest(websitePath(websiteId, `/orders/${encodeURIComponent(orderId)}/cancel`), {
    method: 'POST',
    ...jsonBody({ reason }),
  });
}

export async function saveQuoteStep(
  websiteId: string,
  orderId: string,
  stepName: string,
  formData: Record<string, unknown>,
  complete: boolean,
): Promise<void> {
  await studioRequest(
    websitePath(websiteId, `/orders/${encodeURIComponent(orderId)}/steps/${complete ? 'complete' : 'draft'}`),
    {
      method: 'POST',
      ...jsonBody({ step_name: stepName, form_data: Object.keys(formData).length ? formData : undefined }),
    },
  );
}

export async function openQuoteChat(websiteId: string, quote: DraftQuote): Promise<string | null> {
  if (!quote.buyer_user_id) {
    throw new Error('Akun pembeli tidak tersedia untuk memulai chat.');
  }
  const label = `Order ${quote.id.slice(0, 8)}`;
  const reference = {
    type: 'order',
    id: quote.id,
    title: label,
    href: `/studio/quotes?order=${encodeURIComponent(quote.id)}`,
    meta: quote.product?.name ?? 'Detail penawaran',
  };
  const response = await studioRequest<{ id?: string }>(`/api/chat/${encodeURIComponent(websiteId)}/threads`, {
    method: 'POST',
    ...jsonBody({
      channel_type: 'order',
      channel_label: label,
      order_id: quote.id,
      customer_user_id: quote.buyer_user_id,
      initial_message: `__BAGDJA_CHAT_REFERENCE__${JSON.stringify(reference)}`,
    }),
  });
  return response.id ?? null;
}
