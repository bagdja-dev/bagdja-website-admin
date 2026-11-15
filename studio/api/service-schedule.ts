import { studioRequest, websitePath } from './client';

/** Sama dengan `ServiceScheduleStatus` di website-api (`orders/dto/service-schedule.dto.ts`). */
/** planning = praorder, payment = quotation siap & menunggu bayar, confirmed = dibayar (DP), completed = selesai & lunas. */
export type ServiceScheduleStatus = 'planning' | 'payment' | 'confirmed' | 'completed';

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
  /** null = belum checkout. */
  transaction_status: string | null;
  /** null = belum dijadwalkan. */
  start_at: string | null;
  end_at: string | null;
  all_day: boolean;
  buyer_identifier: string | null;
}

/** Kalender jasa: jasa quotation di semua tahap (termasuk belum bertanggal) + pesanan bertanggal dalam [from, to). */
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
