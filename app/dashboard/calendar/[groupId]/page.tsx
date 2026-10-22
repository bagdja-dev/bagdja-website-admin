'use client';

import { Button, Card, CardBody, Chip, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useAlertDialog } from '../../../components/alert-dialog';
import { useConfirmDialog } from '../../../components/confirm-dialog';
import { LoadingSpinner } from '../../../components/loading-spinner';
import { NoWebsiteState } from '../../../components/no-website-state';
import { useWebsiteContext } from '../../../context/website-context';
import { apiClient } from '../../../lib/api-client';
import { formatCurrency } from '../../../lib/currency';
import { hasMinRole, TRANSACTION_STATUS_LABELS } from '../../../lib/types';

interface GatheringSettlement {
  stage: 'HOLD' | 'DEPOSIT' | 'FINAL';
  seat_total: number;
  deposit_target_total: number;
  released_total: number;
  outstanding_total: number;
  transactions: Array<{
    transaction_id: string;
    transaction_status: string;
    seat_count: number;
    registration_ids: string[];
    seat_total: number;
    deposit_target: number;
    released_amount: number;
  }>;
}

interface GatheringReleaseOutcome {
  stage: 'DEPOSIT' | 'FINAL';
  released_total: number;
  failed_count: number;
  items: Array<{ transaction_id: string; status: 'RELEASED' | 'NOTHING_TO_RELEASE' | 'FAILED'; error?: string }>;
}

interface GatheringDetail {
  id: string;
  title: string;
  status: string;
  workflow_step: string;
  invite_policy: string;
  occurrence: {
    status: string;
    rsvp_open_at?: string | null;
    rsvp_close_at?: string | null;
    payment_deadline?: string | null;
    final_schedule?: string | null;
    final_location?: string | null;
    price_per_seat: number;
    deposit_amount_per_seat: number;
    currency: string;
    min_attendees: number;
    max_attendees: number;
    cancellation_policy?: {
      prepare_days_before_event?: number;
      cutoff_days_before_event?: number;
      penalty_type?: string;
      penalty_value?: number;
    };
    option_groups: Array<{
      product_option_id: string;
      option_group_key: string;
      option_key?: string;
      label?: string;
      description?: string | null;
      venue_location?: string | null;
      is_final_selection?: boolean;
    }>;
    opened_option_ids: string[];
    voting_results: Record<string, {
      total_votes: number;
      options: Record<string, { votes: number; percentage: number }>;
    }>;
  };
  attendee_count: number;
  paid_seat_count: number;
  settlement: GatheringSettlement;
  registrations: Array<{
    id: string;
    attendee_name: string;
    selected_options: Record<string, string>;
    registration_status: string;
    payment_status: string;
    transaction_id: string | null;
    transaction_status: string | null;
    created_at: string;
  }>;
}

const SETTLEMENT_STAGE_LABEL: Record<GatheringSettlement['stage'], string> = {
  HOLD: 'Dana seat masih ditahan penuh di escrow sampai initiator mengonfirmasi acara.',
  DEPOSIT: 'DP per seat dirilis saat acara dikonfirmasi. Sisa dana dirilis setelah acara ditandai selesai.',
  FINAL: 'Acara selesai. Seluruh dana seat dirilis ke saldo bisnis.',
};

const STATUS_LABEL: Record<string, string> = {
  PREORDER: 'Perencanaan',
  RSVP_OPEN: 'RSVP dibuka',
  PAYMENT_OPEN: 'Menunggu pembayaran',
  CONFIRMED: 'Terkonfirmasi',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
  RSVP_CONFIRMED: 'Terdaftar',
  REJECTED: 'Ditolak',
  PAID: 'Lunas',
  PENDING_PAYMENT: 'Menunggu pembayaran',
  UNPAID: 'Belum dibayar',
  REFUNDED: 'Direfund',
};

type StatusTone = 'default' | 'primary' | 'success' | 'danger' | 'warning';

const STATUS_TONE: Record<string, StatusTone> = {
  PREORDER: 'warning',
  RSVP_OPEN: 'primary',
  PAYMENT_OPEN: 'warning',
  CONFIRMED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'default',
  RSVP_CONFIRMED: 'primary',
  REJECTED: 'danger',
  PAID: 'success',
  PENDING_PAYMENT: 'warning',
  UNPAID: 'warning',
  REFUNDED: 'default',
};

function formatDate(value?: string | null) {
  if (!value) return 'Belum ditentukan';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function dateBeforeEvent(value: string | null | undefined, daysBefore?: number) {
  if (!value || daysBefore == null) return 'Belum ditentukan';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Belum ditentukan';
  date.setUTCDate(date.getUTCDate() - daysBefore);
  return formatDate(date.toISOString());
}

function StatusChip({ status }: { status: string }) {
  return (
    <Chip size="sm" variant="flat" color={STATUS_TONE[status] ?? 'default'}>
      {STATUS_LABEL[status] ?? status.replaceAll('_', ' ')}
    </Chip>
  );
}

function TransactionCell({ registration }: { registration: GatheringDetail['registrations'][number] }) {
  if (!registration.transaction_id) return <span className="text-default-400">—</span>;
  return (
    <div className="text-xs">
      <Link href={`/dashboard/orders/${registration.transaction_id}`} className="font-medium text-primary hover:underline">
        #{registration.transaction_id.slice(0, 8)}
      </Link>
      {registration.transaction_status ? (
        <p className="text-default-500">{TRANSACTION_STATUS_LABELS[registration.transaction_status] ?? registration.transaction_status}</p>
      ) : null}
    </div>
  );
}

export default function GatheringDetailPage() {
  const params = useParams<{ groupId: string }>();
  const { websiteId, role, loading: contextLoading } = useWebsiteContext();
  const { confirm, dialog } = useConfirmDialog();
  const { alert, dialog: alertDialog } = useAlertDialog();
  const [detail, setDetail] = useState<GatheringDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settlementBusy, setSettlementBusy] = useState<'complete' | 'release' | null>(null);
  const canManageSettlement = role ? hasMinRole(role, 'admin') : false;
  const detailPath = websiteId && params.groupId
    ? `/api/websites/${websiteId}/gatherings/calendar/${encodeURIComponent(params.groupId)}`
    : null;

  const load = useCallback(async () => {
    if (!detailPath) return;
    try {
      setDetail(await apiClient<GatheringDetail>(detailPath));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat detail acara.');
      setDetail(null);
    }
  }, [detailPath]);

  useEffect(() => {
    if (!detailPath) return;
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [detailPath, load]);

  const reportRelease = async (outcome: GatheringReleaseOutcome, successTitle: string) => {
    if (outcome.failed_count > 0) {
      await alert({
        title: 'Sebagian dana belum dirilis',
        message: (
          <>
            {outcome.failed_count} transaksi gagal dirilis. Coba proses ulang beberapa saat lagi.
            {outcome.items.filter((item) => item.status === 'FAILED').map((item) => (
              <span key={item.transaction_id} className="mt-1 block text-xs">
                #{item.transaction_id.slice(0, 8)}: {item.error ?? 'Gagal dirilis'}
              </span>
            ))}
          </>
        ),
      });
    } else {
      await alert({
        title: successTitle,
        message: `${formatCurrency(outcome.released_total, detail?.occurrence.currency ?? 'IDR')} dirilis ke saldo bisnis.`,
      });
    }
  };

  const completeEvent = async () => {
    if (!detailPath || !detail) return;
    const outstanding = detail.settlement.seat_total - detail.settlement.released_total;
    const ok = await confirm({
      title: 'Tandai acara selesai?',
      message: `Status acara menjadi Selesai dan sisa dana seat (${formatCurrency(outstanding, detail.occurrence.currency)}) dirilis ke saldo bisnis. Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Ya, tandai selesai',
    });
    if (!ok) return;
    setSettlementBusy('complete');
    try {
      const result = await apiClient<{ release: GatheringReleaseOutcome }>(`${detailPath}/complete`, { method: 'POST' });
      await load();
      await reportRelease(result.release, 'Acara selesai');
    } catch (cause) {
      await alert({ title: 'Gagal menandai selesai', message: cause instanceof Error ? cause.message : 'Gagal menandai acara selesai' });
    } finally {
      setSettlementBusy(null);
    }
  };

  const retryRelease = async () => {
    if (!detailPath) return;
    setSettlementBusy('release');
    try {
      const outcome = await apiClient<GatheringReleaseOutcome>(`${detailPath}/release`, { method: 'POST' });
      await load();
      await reportRelease(outcome, 'Pencairan diproses');
    } catch (cause) {
      await alert({ title: 'Gagal memproses pencairan', message: cause instanceof Error ? cause.message : 'Gagal memproses pencairan' });
    } finally {
      setSettlementBusy(null);
    }
  };

  const eventDateReached = Boolean(
    detail?.occurrence.final_schedule && new Date(detail.occurrence.final_schedule).getTime() <= Date.now(),
  );

  if (contextLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;

  return (
    <div className="space-y-6">
      {dialog}
      {alertDialog}
      <div>
        <Button as={Link} href="/dashboard/calendar" variant="light" className="-ml-3 mb-2">
          ← Kembali ke kalender
        </Button>
        {detail ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{detail.title}</h1>
              <p className="mt-1 text-sm text-default-500">
                Tahap {detail.workflow_step.replaceAll('_', ' ').toLowerCase()} · Undangan {detail.invite_policy === 'OPEN' ? 'terbuka' : 'khusus'}
              </p>
            </div>
            <StatusChip status={detail.status} />
          </div>
        ) : (
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Detail acara</h1>
        )}
      </div>

      {loading ? <LoadingSpinner className="h-48" /> : error ? (
        <Card className="border-0 shadow-md ring-1 ring-default-100">
          <CardBody role="alert" className="py-8 text-center text-sm text-danger">{error}</CardBody>
        </Card>
      ) : detail ? (
        <>
          <Card className="border-0 shadow-md ring-1 ring-default-100">
            <CardBody className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-default-500">Jadwal acara</p>
                <p className="mt-1 text-sm font-semibold">{formatDate(detail.occurrence.final_schedule)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-default-500">Lokasi</p>
                <p className="mt-1 text-sm font-semibold">{detail.occurrence.final_location || 'Belum ditentukan'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-default-500">Harga per seat</p>
                <p className="mt-1 text-sm font-semibold">{formatCurrency(detail.occurrence.price_per_seat, detail.occurrence.currency)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-default-500">Batas peserta</p>
                <p className="mt-1 text-sm font-semibold">{detail.attendee_count} peserta · min. {detail.occurrence.min_attendees} · maks. {detail.occurrence.max_attendees}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-default-500">Seat lunas</p>
                <p className="mt-1 text-sm font-semibold">{detail.paid_seat_count} dari {detail.attendee_count}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-default-500">DP booking per seat</p>
                <p className="mt-1 text-sm font-semibold">{formatCurrency(detail.occurrence.deposit_amount_per_seat, detail.occurrence.currency)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-default-500">Batas RSVP</p>
                <p className="mt-1 text-sm font-semibold">{formatDate(detail.occurrence.rsvp_close_at)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-default-500">Batas pembayaran</p>
                <p className="mt-1 text-sm font-semibold">{formatDate(detail.occurrence.payment_deadline)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-default-500">Persiapan dimulai</p>
                <p className="mt-1 text-sm font-semibold">
                  {dateBeforeEvent(detail.occurrence.final_schedule, detail.occurrence.cancellation_policy?.prepare_days_before_event)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-default-500">Cutoff pembatalan</p>
                <p className="mt-1 text-sm font-semibold">
                  {dateBeforeEvent(detail.occurrence.final_schedule, detail.occurrence.cancellation_policy?.cutoff_days_before_event)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-default-500">Penalti dalam jendela persiapan</p>
                <p className="mt-1 text-sm font-semibold">
                  {detail.occurrence.cancellation_policy?.penalty_type === 'PERCENTAGE'
                    ? `${detail.occurrence.cancellation_policy.penalty_value ?? 0}% per seat`
                    : detail.occurrence.cancellation_policy?.penalty_type === 'FIXED'
                      ? `${formatCurrency(detail.occurrence.cancellation_policy.penalty_value ?? 0, detail.occurrence.currency)} per seat`
                      : 'Tanpa penalti'}
                </p>
              </div>
            </CardBody>
          </Card>

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Pencairan dana</h2>
              <p className="text-sm text-default-500">{SETTLEMENT_STAGE_LABEL[detail.settlement.stage]}</p>
            </div>
            <Card className="border-0 shadow-md ring-1 ring-default-100">
              <CardBody className="gap-4 p-5">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs font-medium text-default-500">Total dana seat lunas</p>
                    <p className="mt-1 text-sm font-semibold">{formatCurrency(detail.settlement.seat_total, detail.occurrence.currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-default-500">Target DP</p>
                    <p className="mt-1 text-sm font-semibold">{formatCurrency(detail.settlement.deposit_target_total, detail.occurrence.currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-default-500">Sudah dirilis</p>
                    <p className="mt-1 text-sm font-semibold text-success">{formatCurrency(detail.settlement.released_total, detail.occurrence.currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-default-500">Masih ditahan</p>
                    <p className="mt-1 text-sm font-semibold">
                      {formatCurrency(Math.max(0, detail.settlement.seat_total - detail.settlement.released_total), detail.occurrence.currency)}
                    </p>
                  </div>
                </div>
                {detail.settlement.outstanding_total > 0 ? (
                  <p role="alert" className="rounded-lg bg-warning-50 px-3 py-2 text-sm text-warning-700">
                    {formatCurrency(detail.settlement.outstanding_total, detail.occurrence.currency)} belum berhasil dirilis untuk tahap ini. Proses ulang pencairan untuk mencoba lagi.
                  </p>
                ) : null}
                {canManageSettlement && (detail.status === 'CONFIRMED' || detail.settlement.outstanding_total > 0) ? (
                  <div className="flex flex-col gap-2 border-t border-default-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
                    {detail.status === 'CONFIRMED' && !eventDateReached ? (
                      <p className="text-xs text-default-500 sm:mr-auto">Acara bisa ditandai selesai mulai {formatDate(detail.occurrence.final_schedule)}.</p>
                    ) : null}
                    {detail.settlement.outstanding_total > 0 ? (
                      <Button variant="flat" onPress={retryRelease} isLoading={settlementBusy === 'release'} isDisabled={settlementBusy !== null}>
                        Proses ulang pencairan
                      </Button>
                    ) : null}
                    {detail.status === 'CONFIRMED' ? (
                      <Button
                        color="primary"
                        onPress={completeEvent}
                        isLoading={settlementBusy === 'complete'}
                        isDisabled={settlementBusy !== null || !eventDateReached}
                      >
                        Tandai acara selesai
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </CardBody>
            </Card>
          </section>

          {detail.occurrence.option_groups.length > 0 ? (
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">Voting opsi</h2>
                <p className="text-sm text-default-500">Pilihan peserta dan hasil voting per kelompok.</p>
              </div>
              {Array.from(new Set(detail.occurrence.option_groups.map((option) => option.option_group_key))).map((groupKey) => {
                const groupOptions = detail.occurrence.option_groups.filter((option) => option.option_group_key === groupKey);
                const voting = detail.occurrence.voting_results[groupKey];
                return (
                  <Card key={groupKey} className="border-0 shadow-md ring-1 ring-default-100">
                    <CardBody className="gap-3 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold">{groupKey}</h3>
                        <span className="text-xs text-default-500">{voting?.total_votes ?? 0} suara</span>
                      </div>
                      <ul className="space-y-3">
                        {groupOptions.map((option) => {
                          const result = voting?.options[option.product_option_id];
                          return (
                            <li key={option.product_option_id}>
                              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                <span className="font-medium">{option.label ?? option.option_key ?? 'Opsi'}</span>
                                <span className="text-default-500">{result?.votes ?? 0} suara · {result?.percentage ?? 0}%</span>
                              </div>
                              {option.venue_location ? <p className="mt-0.5 text-xs text-default-500">{option.venue_location}</p> : null}
                              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-default-100">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${result?.percentage ?? 0}%` }} />
                              </div>
                              {option.is_final_selection ? <Chip className="mt-2" size="sm" color="success" variant="flat">Opsi final</Chip> : null}
                            </li>
                          );
                        })}
                      </ul>
                    </CardBody>
                  </Card>
                );
              })}
            </section>
          ) : null}

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Peserta</h2>
              <p className="text-sm text-default-500">Status pendaftaran dan pembayaran seat.</p>
            </div>
            {detail.registrations.length === 0 ? (
              <Card className="border-0 shadow-md ring-1 ring-default-100">
                <CardBody className="py-10 text-center text-sm text-default-500">Belum ada peserta terdaftar.</CardBody>
              </Card>
            ) : (
              <>
                <Card className="hidden border-0 shadow-md ring-1 ring-default-100 sm:block">
                  <CardBody className="p-0">
                    <Table aria-label="Daftar peserta acara" removeWrapper>
                      <TableHeader>
                        <TableColumn>PESERTA</TableColumn>
                        <TableColumn>PILIHAN</TableColumn>
                        <TableColumn>PENDAFTARAN</TableColumn>
                        <TableColumn>PEMBAYARAN</TableColumn>
                        <TableColumn>TRANSAKSI</TableColumn>
                        <TableColumn>TERDAFTAR</TableColumn>
                      </TableHeader>
                      <TableBody>
                        {detail.registrations.map((registration) => (
                          <TableRow key={registration.id}>
                            <TableCell className="font-medium">{registration.attendee_name}</TableCell>
                            <TableCell>
                              {Object.entries(registration.selected_options ?? {}).map(([group, optionId]) => {
                                const option = detail.occurrence.option_groups.find((item) => item.product_option_id === optionId);
                                return <p key={group}>{group}: {option?.label ?? option?.option_key ?? '—'}</p>;
                              })}
                            </TableCell>
                            <TableCell><StatusChip status={registration.registration_status} /></TableCell>
                            <TableCell><StatusChip status={registration.payment_status} /></TableCell>
                            <TableCell><TransactionCell registration={registration} /></TableCell>
                            <TableCell>{formatDate(registration.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardBody>
                </Card>
                <div className="flex flex-col gap-3 sm:hidden">
                  {detail.registrations.map((registration) => (
                    <Card key={registration.id} className="border-0 shadow-md ring-1 ring-default-100">
                      <CardBody className="gap-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold">{registration.attendee_name}</p>
                          <StatusChip status={registration.registration_status} />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-default-500">
                          <span>{formatDate(registration.created_at)}</span>
                          <StatusChip status={registration.payment_status} />
                        </div>
                        {registration.transaction_id ? <TransactionCell registration={registration} /> : null}
                        {Object.entries(registration.selected_options ?? {}).length > 0 ? (
                          <p className="border-t border-default-100 pt-2 text-sm">
                            {Object.entries(registration.selected_options).map(([group, optionId]) => {
                              const option = detail.occurrence.option_groups.find((item) => item.product_option_id === optionId);
                              return `${group}: ${option?.label ?? option?.option_key ?? '—'}`;
                            }).join(' · ')}
                          </p>
                        ) : null}
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}