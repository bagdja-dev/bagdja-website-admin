/** Endpoint hitungan badge sidebar — sama dengan dashboard lama (parity C · Shell). */
import { studioRequest, websitePath } from './client';
import type { CountResponseDto, PaginatedMetaResponseDto } from './types';

export async function fetchDraftOrderCount(websiteId: string): Promise<number> {
  const res = await studioRequest<CountResponseDto>(websitePath(websiteId, '/orders/drafts/count'));
  return res.count;
}

export async function fetchPendingTransactionCount(websiteId: string): Promise<number> {
  const res = await studioRequest<PaginatedMetaResponseDto>(
    websitePath(websiteId, '/transactions?page=1&size=1&status=PENDING_PAYMENT,PENDING,HELD,DISPUTED'),
  );
  return res.meta.total;
}

export async function fetchScheduledTerminCount(websiteId: string): Promise<number> {
  const res = await studioRequest<CountResponseDto>(
    websitePath(websiteId, '/transactions/termins/count?status=SCHEDULED'),
  );
  return res.count;
}

export async function fetchGatheringActionCount(websiteId: string): Promise<number> {
  const res = await studioRequest<PaginatedMetaResponseDto>(
    websitePath(websiteId, '/transactions?page=1&size=1&kind=gathering&needs_action=true'),
  );
  return res.meta.total;
}
