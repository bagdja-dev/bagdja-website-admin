import Link from 'next/link';
import { Icon } from '@/studio/ui/icons';

import type { GatheringDetail, GatheringOccurrenceStatus } from '@/studio/api/gatherings';

const OCCURRENCE_LABEL: Record<GatheringOccurrenceStatus, string> = {
  DRAFT: 'Rencana',
  PREORDER: 'Rencana',
  RSVP_OPEN: 'Rencana',
  PAYMENT_OPEN: 'Menunggu pembayaran peserta',
  CONFIRMED: 'Terkonfirmasi',
  IN_PROGRESS: 'Berlangsung',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${new Intl.NumberFormat('id-ID').format(amount)}`;
  }
}

function dateTime(value: string | null | undefined): string {
  if (!value) return 'Belum ditentukan';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short' }).format(date);
}

export function GatheringHeader({ gathering }: { gathering: GatheringDetail }) {
  const status = gathering.occurrence.status;
  const statusTone = status === 'CONFIRMED' ? 'bg-green-50 text-green-700'
    : status === 'COMPLETED' ? 'bg-green-50 text-green-700'
    : status === 'PAYMENT_OPEN' ? 'bg-amber-50 text-amber-800'
      : status === 'IN_PROGRESS' ? 'bg-[#FBF2F6] text-[#7A1E48]'
        : status === 'CANCELLED' ? 'bg-red-50 text-red-700'
          : 'bg-default-100 text-default-700';
  return (
    <section className="rounded-2xl border border-default-200 bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex rounded-full border border-[#F0CFDD] bg-[#FBF2F6] px-2.5 py-1 text-[11px] font-bold text-[#7A1E48]">
          Gathering
        </span>
        <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-bold sm:px-3 sm:text-xs ${statusTone}`}>
          {OCCURRENCE_LABEL[status] ?? status}
        </span>
      </div>
      <h1 className="mt-2 text-xl font-extrabold leading-tight text-foreground sm:text-2xl">{gathering.title}</h1>
      <p className="mt-1 text-sm text-default-500">Penyelenggara: {gathering.initiator_name || 'Penyelenggara'}</p>
      <div className="mt-5 grid gap-3 border-t border-default-100 pt-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-default-500">Jadwal</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{dateTime(gathering.occurrence.final_schedule)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-default-500">Lokasi</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{gathering.occurrence.final_location || 'Belum ditentukan'}</p>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { key: 'plan', label: 'Rencana', mobileLabel: 'Rencana' },
  { key: 'payment', label: 'Pembayaran peserta', mobileLabel: 'Bayar' },
  { key: 'confirmed', label: 'Terkonfirmasi', mobileLabel: 'Siap' },
  { key: 'progress', label: 'Berlangsung', mobileLabel: 'Acara' },
  { key: 'complete', label: 'Selesai', mobileLabel: 'Selesai' },
] as const;

function stepIndex(status: GatheringOccurrenceStatus): number {
  if (status === 'DRAFT' || status === 'PREORDER' || status === 'RSVP_OPEN') return 0;
  if (status === 'PAYMENT_OPEN') return 1;
  if (status === 'CONFIRMED') return 2;
  if (status === 'IN_PROGRESS') return 3;
  return status === 'COMPLETED' ? 4 : -1;
}

export function GatheringProgress({ gathering }: { gathering: GatheringDetail }) {
  const active = stepIndex(gathering.occurrence.status);
  const paid = gathering.paid_seat_count;
  const max = gathering.occurrence.max_attendees;
  const min = gathering.occurrence.min_attendees;
  const percentage = max > 0 ? Math.min(100, Math.round((paid / max) * 100)) : 0;
  return (
    <section className="rounded-2xl border border-default-200 bg-white p-4 sm:p-5">
      <h2 className="text-base font-bold text-foreground">Progres acara</h2>
      <div className="mt-4 grid grid-cols-5 gap-1">
        {STEPS.map((step, index) => (
          <div key={step.key} className="min-w-0 text-center">
            <div className={`mx-auto h-2 rounded-full ${index <= active ? 'bg-[#7A1E48]' : 'bg-default-200'}`} />
            <p aria-label={step.label} className={`mt-2 text-[9px] leading-tight sm:text-xs ${index === active ? 'font-bold text-[#7A1E48]' : 'text-default-500'}`}>
              <span className="sm:hidden">{step.mobileLabel}</span>
              <span className="hidden sm:inline">{step.label}</span>
            </p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-foreground">{paid}/{max} peserta sudah lunas</p>
          <p className="mt-1 text-xs text-default-500">
            Minimal {min} peserta {paid >= min ? 'terpenuhi' : 'belum terpenuhi'} · {gathering.attendee_count} terdaftar
          </p>
        </div>
        <span className="text-sm font-extrabold text-[#7A1E48]">{percentage}%</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-default-100"
        role="progressbar"
        aria-label="Progres pembayaran peserta"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={paid}
      >
        <div className="h-full rounded-full bg-[#7A1E48]" style={{ width: `${percentage}%` }} />
      </div>
    </section>
  );
}

export function GatheringFunds({ gathering }: { gathering: GatheringDetail }) {
  const settlement = gathering.settlement;
  const heldAmount = Math.max(0, settlement.seat_total - settlement.released_total);
  return (
    <section className="rounded-2xl border border-default-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground">Dana peserta</h2>
          <p className="mt-1 text-xs text-default-500">Dana tahap {settlement.stage.toLowerCase()}</p>
        </div>
        <Link href="/studio/wallet" className="text-sm font-semibold text-[#7A1E48] underline-offset-2 hover:underline">
          Lihat di Saldo
        </Link>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-default-50 p-3">
          <dt className="text-[11px] text-default-500">Terkumpul</dt>
          <dd className="mt-1 text-sm font-bold text-foreground">{money(settlement.seat_total, gathering.occurrence.currency)}</dd>
        </div>
        <div className="rounded-xl bg-default-50 p-3">
          <dt className="text-[11px] text-default-500">Target DP</dt>
          <dd className="mt-1 text-sm font-bold text-foreground">{money(settlement.deposit_target_total, gathering.occurrence.currency)}</dd>
        </div>
        <div className="rounded-xl bg-default-50 p-3">
          <dt className="text-[11px] text-default-500">Sudah dicairkan</dt>
          <dd className="mt-1 text-sm font-bold text-foreground">{money(settlement.released_total, gathering.occurrence.currency)}</dd>
        </div>
        <div className="rounded-xl bg-default-50 p-3">
          <dt className="text-[11px] text-default-500">Masih ditahan</dt>
          <dd className="mt-1 text-sm font-bold text-foreground">{money(heldAmount, gathering.occurrence.currency)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-default-500">
        DP dicairkan saat acara terkonfirmasi. Sisa dana dicairkan setelah acara selesai.
      </p>
    </section>
  );
}

function optionSummary(gathering: GatheringDetail, registration: GatheringDetail['registrations'][number]): string {
  const selected = registration.selected_options ?? {};
  const labels = Object.entries(selected).map(([groupKey, optionId]) => {
    const option = gathering.occurrence.option_groups.find(
      (candidate) => candidate.option_group_key === groupKey && candidate.product_option_id === optionId,
    );
    return option?.label || option?.name || option?.venue || optionId;
  });
  return labels.length ? labels.join(' · ') : 'Belum memilih';
}

function registrationStatus(status: string): string {
  const labels: Record<string, string> = {
    RSVP_CONFIRMED: 'Terdaftar',
    REJECTED: 'Ditolak',
    CANCELLED: 'Dibatalkan',
  };
  return labels[status] ?? status;
}

function paymentStatus(status: string): string {
  const labels: Record<string, string> = {
    PAID: 'Lunas',
    UNPAID: 'Belum bayar',
    REFUNDED: 'Refund',
  };
  return labels[status] ?? status;
}

export function GatheringRegistrations({ gathering }: { gathering: GatheringDetail }) {
  return (
    <section className="rounded-2xl border border-default-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-foreground">Peserta</h2>
        <span className="text-xs text-default-500">{gathering.registrations.length} pendaftaran</span>
      </div>
      {gathering.registrations.length === 0 ? (
        <p className="mt-4 rounded-xl bg-default-50 px-3 py-5 text-center text-sm text-default-500">Belum ada peserta.</p>
      ) : (
        <ul className="mt-3 divide-y divide-default-100">
          {gathering.registrations.map((registration) => (
            <li key={registration.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.5fr)_auto_auto] sm:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{registration.attendee_name}</p>
                <p className="mt-0.5 text-[11px] text-default-500">{registrationStatus(registration.registration_status)}</p>
              </div>
              <p className="truncate text-xs text-default-600">{optionSummary(gathering, registration)}</p>
              <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${registration.payment_status === 'PAID' ? 'bg-green-50 text-green-700' : 'bg-default-100 text-default-600'}`}>
                {paymentStatus(registration.payment_status)}
              </span>
              {registration.transaction_id ? (
                <Link
                  href={`/studio/orders/${encodeURIComponent(registration.transaction_id)}`}
                  className="text-xs font-semibold text-[#7A1E48] underline-offset-2 hover:underline"
                >
                  {registration.checked_in_at ? 'Sudah check-in' : registration.payment_status === 'PAID' ? 'Belum check-in' : 'Lihat transaksi'}
                </Link>
              ) : (
                <span className="text-xs text-default-500">{registration.checked_in_at ? 'Sudah check-in' : 'Belum check-in'}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
