import { jsonBody, studioRequest, websitePath } from './client';

export type GatheringOccurrenceStatus =
  | 'DRAFT'
  | 'PREORDER'
  | 'RSVP_OPEN'
  | 'PAYMENT_OPEN'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface GatheringCalendarItem {
  id: string;
  title: string;
  initiator_user_id?: string;
  initiator_order_id?: string | null;
  initiator_name?: string | null;
  status: string;
  workflow_step: string;
  occurrence: {
    id: string;
    status: GatheringOccurrenceStatus;
    final_schedule: string | null;
    final_location: string | null;
    payment_deadline?: string | null;
    min_attendees: number;
    max_attendees: number;
    deposit_amount_per_seat: number;
  };
  attendee_count: number;
  paid_seat_count: number;
}

export interface GatheringRegistration {
  id: string;
  attendee_name: string;
  selected_options: Record<string, string> | null;
  registration_status: string;
  payment_status: string;
  transaction_id: string | null;
  transaction_status: string | null;
  ticket_email_sent_at: string | null;
  checked_in_at: string | null;
  check_in_method: 'SCAN' | 'MANUAL' | null;
  created_at: string;
}

export interface GatheringSettlementTransaction {
  transaction_id: string;
  transaction_status: string;
  seat_count: number;
  registration_ids: string[];
  seat_total: number;
  deposit_target: number;
  released_amount: number;
}

export interface GatheringDetail extends GatheringCalendarItem {
  invite_policy: 'OPEN' | 'INVITE_ONLY';
  started_at: string | null;
  completed_at: string | null;
  occurrence: GatheringCalendarItem['occurrence'] & {
    rsvp_open_at?: string | null;
    rsvp_close_at?: string | null;
    price_per_seat: number;
    currency: string;
    option_groups: Array<{
      option_group_key: string;
      product_option_id: string;
      label?: string;
      name?: string;
      venue?: string | null;
    }>;
  };
  paid_seat_count: number;
  settlement: {
    stage: 'HOLD' | 'DEPOSIT' | 'FINAL';
    seat_total: number;
    deposit_target_total: number;
    released_total: number;
    outstanding_total: number;
    transactions: GatheringSettlementTransaction[];
  };
  attendance: {
    paid_count: number;
    ticket_sent_count: number;
    checked_in_count: number;
  };
  registrations: GatheringRegistration[];
}

export interface GatheringReleaseOutcome {
  stage: 'DEPOSIT' | 'FINAL';
  released_total: number;
  failed_count: number;
  items: Array<{
    transaction_id: string;
    seat_count: number;
    amount: number;
    status: 'RELEASED' | 'NOTHING_TO_RELEASE' | 'FAILED';
    error?: string;
  }>;
}

export async function fetchGatheringCalendar(websiteId: string): Promise<GatheringCalendarItem[]> {
  return studioRequest<GatheringCalendarItem[]>(websitePath(websiteId, '/gatherings/calendar'));
}

export async function fetchGatheringDetail(websiteId: string, groupId: string): Promise<GatheringDetail> {
  return studioRequest<GatheringDetail>(
    websitePath(websiteId, `/gatherings/calendar/${encodeURIComponent(groupId)}`),
  );
}

export async function openGatheringInitiatorChat(
  websiteId: string,
  gathering: Pick<GatheringDetail, 'id' | 'title' | 'initiator_user_id' | 'initiator_order_id'>,
): Promise<string | null> {
  if (!gathering.initiator_user_id) {
    throw new Error('Akun penyelenggara tidak tersedia untuk memulai chat.');
  }
  const label = `Gathering ${gathering.id.slice(0, 8)}`;
  // id = order rencana (website membuka /cart/order/:id); href Studio tetap ke halaman gathering.
  const reference = {
    type: 'order',
    id: gathering.initiator_order_id ?? gathering.id,
    title: gathering.title || label,
    href: `/studio/orders/gathering/${encodeURIComponent(gathering.id)}`,
    meta: 'Detail acara gathering',
  };
  const response = await studioRequest<{ id?: string }>(`/api/chat/${encodeURIComponent(websiteId)}/threads`, {
    method: 'POST',
    ...jsonBody({
      channel_type: 'order',
      channel_label: label,
      order_id: gathering.initiator_order_id ?? undefined,
      customer_user_id: gathering.initiator_user_id,
      initial_message: `__BAGDJA_CHAT_REFERENCE__${JSON.stringify(reference)}`,
    }),
  });
  return response.id ?? null;
}

export async function sendGatheringTickets(websiteId: string, groupId: string): Promise<{ status: string; total_count: number }> {
  return studioRequest<{ status: string; total_count: number }>(websitePath(websiteId, `/gatherings/calendar/${encodeURIComponent(groupId)}/tickets/send`), {
    method: 'POST',
  });
}

export async function startGathering(websiteId: string, groupId: string): Promise<{ id: string; status: string }> {
  return studioRequest<{ id: string; status: string }>(websitePath(websiteId, `/gatherings/calendar/${encodeURIComponent(groupId)}/start`), {
    method: 'POST',
  });
}

export async function completeGathering(websiteId: string, groupId: string): Promise<{
  id: string;
  status: string;
  release: GatheringReleaseOutcome;
}> {
  return studioRequest<{ id: string; status: string; release: GatheringReleaseOutcome }>(websitePath(websiteId, `/gatherings/calendar/${encodeURIComponent(groupId)}/complete`), {
    method: 'POST',
  });
}

export async function releaseGatheringFunds(websiteId: string, groupId: string): Promise<GatheringReleaseOutcome> {
  return studioRequest<GatheringReleaseOutcome>(websitePath(websiteId, `/gatherings/calendar/${encodeURIComponent(groupId)}/release`), {
    method: 'POST',
  });
}

export async function checkInGatheringAttendee(
  websiteId: string,
  groupId: string,
  input: { qr?: string; registration_id?: string },
): Promise<{ result: 'CHECKED_IN' | 'ALREADY_CHECKED_IN'; registration: { id: string; attendee_name: string; checked_in_at: string } }> {
  return studioRequest<{ result: 'CHECKED_IN' | 'ALREADY_CHECKED_IN'; registration: { id: string; attendee_name: string; checked_in_at: string } }>(
    websitePath(websiteId, `/gatherings/calendar/${encodeURIComponent(groupId)}/check-in`),
    { method: 'POST', ...jsonBody(input) },
  );
}
