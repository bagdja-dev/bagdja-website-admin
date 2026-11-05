/** Endpoint hitungan badge sidebar — sama dengan dashboard lama (parity C · Shell). */
import { studioRequest, websitePath } from './client';
import type { CountResponseDto, GatheringCalendarRowDto, PaginatedMetaResponseDto } from './types';

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

export async function fetchPlannedGatheringCount(websiteId: string): Promise<number> {
  const rows = await studioRequest<GatheringCalendarRowDto[]>(websitePath(websiteId, '/gatherings/calendar'));
  return rows.filter((row) => row.status === 'PREORDER' && row.workflow_step === 'PLAN').length;
}
