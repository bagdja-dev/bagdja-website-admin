import { studioRequest, websitePath } from './client';

/** Sama dengan `ServiceScheduleStatus` di website-api (`orders/dto/service-schedule.dto.ts`). */
export type ServiceScheduleStatus = 'proposed' | 'scheduled' | 'done';

/** Sama dengan `ServiceScheduleItemDto` di website-api. */
export interface ServiceScheduleItem {
  order_id: string;
  transaction_id: string | null;
  website_id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  status: ServiceScheduleStatus;
  order_status: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  buyer_identifier: string | null;
}

/** Jasa terjadwal (field flow bertanda kalender) yang beririsan dengan rentang [from, to). */
export async function fetchServiceSchedule(websiteId: string, from: Date, to: Date): Promise<ServiceScheduleItem[]> {
  const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  return studioRequest<ServiceScheduleItem[]>(websitePath(websiteId, `/orders/schedule?${query.toString()}`));
}

/** Pesanan sudah checkout → detail pesanan; masih di keranjang → halaman Penawaran. */
export function serviceScheduleHref(item: Pick<ServiceScheduleItem, 'order_id' | 'transaction_id'>): string {
  return item.transaction_id
    ? `/studio/orders/${encodeURIComponent(item.transaction_id)}`
    : `/studio/quotes?order=${encodeURIComponent(item.order_id)}`;
}
