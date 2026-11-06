import Link from 'next/link';
import type { ReactNode } from 'react';

import type { OrderListRow } from '@/studio/api/orders';
import type { ColumnContext } from '@/studio/ui/data-list';

function formatSchedule(value: string | null): string {
  if (!value) return 'Jadwal belum ditentukan';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Rencana',
    PREORDER: 'Rencana',
    RSVP_OPEN: 'Rencana',
    PAYMENT_OPEN: 'Menunggu pembayaran peserta',
    CONFIRMED: 'Terkonfirmasi',
    IN_PROGRESS: 'Berlangsung',
    COMPLETED: 'Selesai',
    CANCELLED: 'Dibatalkan',
  };
  return labels[status] ?? status;
}

function statusTone(status: string): string {
  if (status === 'CONFIRMED' || status === 'COMPLETED') return 'bg-success-50 text-success-700';
  if (status === 'PAYMENT_OPEN') return 'bg-warning-50 text-warning-700';
  if (status === 'IN_PROGRESS') return 'bg-primary-50 text-primary-700';
  if (status === 'CANCELLED') return 'bg-danger-50 text-danger-700';
  return 'bg-default-100 text-default-700';
}

export function GatheringStatusBadge({ row }: { row: OrderListRow }) {
  const status = row.gathering?.status ?? row.status;
  return (
    <span className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[11px] font-bold leading-tight ${statusTone(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

export function GatheringOrderTitle({ row }: { row: OrderListRow }) {
  return (
    <>
      <span className="mb-1 inline-flex rounded-full bg-[#FBF2F6] px-2 py-0.5 text-[10px] font-bold text-[#7A1E48]">Gathering</span>
      <span className="block truncate text-[13px] font-bold">{row.gathering?.title ?? 'Acara gathering'}</span>
      <span className="mt-0.5 block text-xs text-default-500">{formatSchedule(row.gathering?.final_schedule ?? null)}</span>
    </>
  );
}

export function GatheringOrganizerCell({ row, ctx }: { row: OrderListRow; ctx: ColumnContext }) {
  return (
    <div className={ctx.variant === 'table' ? 'min-w-[140px]' : 'min-w-0'}>
      <p className="truncate text-[13px] font-semibold text-foreground">{row.gathering?.initiator_name || 'Penyelenggara'}</p>
      <p className="mt-0.5 truncate text-xs text-default-500">{row.gathering?.final_location || 'Lokasi belum ditentukan'}</p>
    </div>
  );
}

export function GatheringAttendeeCell({ row, ctx }: { row: OrderListRow; ctx: ColumnContext }) {
  const gathering = row.gathering;
  const paid = gathering?.paid_count ?? 0;
  const max = gathering?.max_attendees ?? 0;
  const minimum = gathering?.min_attendees ?? 0;
  return (
    <div className={ctx.variant === 'table' ? 'min-w-[150px]' : 'min-w-0'}>
      <p className="text-[13px] font-semibold text-foreground">{paid}/{max} bayar{ctx.variant === 'table' ? ` · minimal ${minimum}${paid >= minimum ? ' ✓' : ''}` : ''}</p>
      <p className="mt-0.5 text-xs text-default-500">
        {ctx.variant === 'table'
          ? `${gathering?.registered_count ?? 0} peserta terdaftar`
          : `${gathering?.registered_count ?? 0} terdaftar · min ${minimum}`}
      </p>
    </div>
  );
}

export function GatheringTotalCell({ row, ctx }: { row: OrderListRow; ctx: ColumnContext }) {
  const currency = row.gathering?.currency ?? row.currency;
  let amount: string;
  try {
    amount = new Intl.NumberFormat('id-ID', { style: 'currency', currency, maximumFractionDigits: 0 })
      .format(row.gathering?.collected_amount ?? 0);
  } catch {
    amount = `${currency} ${new Intl.NumberFormat('id-ID').format(row.gathering?.collected_amount ?? 0)}`;
  }
  return (
    <div className={`${ctx.variant === 'table' ? 'min-w-[120px]' : 'max-w-[120px]'} text-right`}>
      <p className="whitespace-nowrap text-[13px] font-bold text-foreground">{amount}</p>
      <p className="mt-0.5 text-xs text-default-500">Terkumpul</p>
    </div>
  );
}

export function GatheringStateCell({ row, ctx }: { row: OrderListRow; ctx: ColumnContext }) {
  const status = row.gathering?.status ?? row.status;
  const label = status === 'COMPLETED' ? 'Acara selesai' : status === 'IN_PROGRESS' ? 'Acara berlangsung' : 'Progres acara';
  if (ctx.variant === 'card') return <GatheringStatusBadge row={row} />;
  return (
    <div className={ctx.variant === 'table' ? 'min-w-[140px]' : 'min-w-0'}>
      <p className="mb-1 truncate text-[13px] font-semibold text-foreground">{label}</p>
      <GatheringStatusBadge row={row} />
    </div>
  );
}

export function GatheringOrderLink({ row, onClick, children }: {
  row: OrderListRow;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={`/studio/orders/gathering/${encodeURIComponent(row.gathering?.group_id ?? row.id)}`}
      onClick={onClick}
      className="flex items-start gap-2 text-foreground no-underline hover:text-primary"
    >
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${row.needs_action ? 'bg-warning' : 'bg-transparent'}`} aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </Link>
  );
}
