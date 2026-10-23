'use client';

import { Button, Card, CardBody, Chip, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { LoadingSpinner } from '../../components/loading-spinner';
import { NoWebsiteState } from '../../components/no-website-state';
import { useWebsiteContext } from '../../context/website-context';
import { apiClient } from '../../lib/api-client';
import { formatCurrency } from '../../lib/currency';

interface GatheringCalendarRow {
  id: string;
  title: string;
  status: string;
  workflow_step: string;
  occurrence: {
    id: string;
    status: string;
    final_schedule?: string | null;
    final_location?: string | null;
    payment_deadline?: string | null;
    min_attendees: number;
    max_attendees: number;
    deposit_amount_per_seat: number;
  };
  attendee_count: number;
  paid_seat_count: number;
}

type CalendarTab = 'ALL' | 'PLANNING' | 'RSVP' | 'PAYMENT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const CALENDAR_TABS: Array<{ key: CalendarTab; label: string; matches: (row: GatheringCalendarRow) => boolean }> = [
  { key: 'ALL', label: 'Semua', matches: () => true },
  { key: 'PLANNING', label: 'Perencanaan', matches: (row) => row.status === 'PREORDER' && row.workflow_step === 'PLAN' },
  { key: 'RSVP', label: 'RSVP', matches: (row) => row.status === 'RSVP_OPEN' },
  { key: 'PAYMENT', label: 'Pembayaran', matches: (row) => row.status === 'PAYMENT_OPEN' },
  { key: 'CONFIRMED', label: 'Dikonfirmasi', matches: (row) => row.status === 'CONFIRMED' },
  { key: 'IN_PROGRESS', label: 'Berlangsung', matches: (row) => row.status === 'IN_PROGRESS' },
  { key: 'COMPLETED', label: 'Selesai', matches: (row) => row.status === 'COMPLETED' },
  { key: 'CANCELLED', label: 'Dibatalkan', matches: (row) => row.status === 'CANCELLED' },
];

const STATUS_LABEL: Record<string, string> = {
  PREORDER: 'Perencanaan',
  RSVP_OPEN: 'RSVP dibuka',
  PAYMENT_OPEN: 'Menunggu pembayaran',
  CONFIRMED: 'Terkonfirmasi',
  IN_PROGRESS: 'Berlangsung',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

type StatusTone = 'default' | 'primary' | 'success' | 'danger' | 'warning';

const STATUS_TONE: Record<string, StatusTone> = {
  PREORDER: 'warning',
  RSVP_OPEN: 'primary',
  IN_PROGRESS: 'primary',
  PAYMENT_OPEN: 'warning',
  CONFIRMED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'default',
};

function formatDate(value?: string | null) {
  if (!value) return 'Belum ditentukan';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function GatheringCalendarPage() {
  const { websiteId, loading: contextLoading } = useWebsiteContext();
  const [rows, setRows] = useState<GatheringCalendarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<CalendarTab>('ALL');

  const load = useCallback(async () => {
    if (!websiteId) return;
    setLoading(true);
    setError('');
    try {
      const result = await apiClient<GatheringCalendarRow[]>(`/api/websites/${websiteId}/gatherings/calendar`);
      setRows(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat kalender acara.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [websiteId]);

  useEffect(() => { void load(); }, [load]);

  const filteredRows = rows.filter((row) => (CALENDAR_TABS.find((tab) => tab.key === activeTab) ?? CALENDAR_TABS[0]).matches(row));

  if (contextLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Kalender acara</h1>
          <p className="mt-1 text-default-500">Jadwal, RSVP, dan status pembayaran seat per acara.</p>
        </div>
        <Button color="primary" variant="flat" isLoading={loading} onPress={() => void load()}>
          Muat ulang
        </Button>
      </div>

      {error ? (
        <Card className="border-0 shadow-md ring-1 ring-default-100">
          <CardBody role="alert" className="py-4 text-sm text-danger">{error}</CardBody>
        </Card>
      ) : null}

      <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none" aria-label="Filter status acara">
        {CALENDAR_TABS.map((tab) => {
          const selected = activeTab === tab.key;
          const count = rows.filter(tab.matches).length;
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                selected
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25'
                  : 'bg-white text-default-600 ring-1 ring-default-200 hover:bg-default-50'
              }`}
            >
              {tab.label} <span className="ml-1 opacity-80">({count})</span>
            </button>
          );
        })}
      </nav>

      {loading ? (
        <LoadingSpinner className="h-48" />
      ) : filteredRows.length === 0 ? (
        <Card className="overflow-hidden border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 text-3xl ring-4 ring-cyan-50">
              🗓️
            </div>
            <p className="text-lg font-semibold">Belum ada acara</p>
            <p className="max-w-sm text-sm text-default-500">Rencana gathering akan muncul di sini setelah dibuat.</p>
          </CardBody>
        </Card>
      ) : (
        <>
          <Card className="hidden border-0 shadow-md ring-1 ring-default-100 sm:block">
            <CardBody className="p-0">
              <Table aria-label="Kalender gathering" removeWrapper>
                <TableHeader>
                  <TableColumn>ACARA</TableColumn>
                  <TableColumn>JADWAL</TableColumn>
                  <TableColumn>LOKASI</TableColumn>
                  <TableColumn>STATUS</TableColumn>
                  <TableColumn>PESERTA</TableColumn>
                  <TableColumn>SEAT LUNAS</TableColumn>
                  <TableColumn> </TableColumn>
                </TableHeader>
                <TableBody items={filteredRows}>
                  {filteredRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-semibold">{row.title}</div>
                        <div className="text-xs text-default-500">{row.workflow_step.replaceAll('_', ' ')}</div>
                      </TableCell>
                      <TableCell>{formatDate(row.occurrence.final_schedule)}</TableCell>
                      <TableCell>{row.occurrence.final_location || 'Belum ditentukan'}</TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat" color={STATUS_TONE[row.status] ?? 'default'}>
                          {STATUS_LABEL[row.status] ?? row.status}
                        </Chip>
                      </TableCell>
                      <TableCell>{row.attendee_count} / {row.occurrence.max_attendees}</TableCell>
                      <TableCell>
                        <div className="font-semibold">{row.paid_seat_count} seat</div>
                        <div className="text-xs text-default-500">DP {formatCurrency(row.occurrence.deposit_amount_per_seat, 'IDR')} / seat</div>
                      </TableCell>
                      <TableCell>
                        <Button as={Link} href={`/dashboard/calendar/${row.id}`} size="sm" variant="flat" color="primary">
                          Detail acara
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>

          <div className="flex flex-col gap-3 sm:hidden">
            {filteredRows.map((row) => (
              <Link key={row.id} href={`/dashboard/calendar/${row.id}`} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Card className="border-0 shadow-md ring-1 ring-default-100 transition-shadow hover:shadow-lg">
                  <CardBody className="gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{row.title}</p>
                        <p className="mt-0.5 text-xs text-default-500">{row.workflow_step.replaceAll('_', ' ')}</p>
                      </div>
                      <Chip size="sm" variant="flat" color={STATUS_TONE[row.status] ?? 'default'} className="shrink-0">
                        {STATUS_LABEL[row.status] ?? row.status}
                      </Chip>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-default-100 pt-3 text-sm">
                      <div className="min-w-0">
                        <dt className="text-xs text-default-500">Jadwal</dt>
                        <dd className="mt-0.5 break-words">{formatDate(row.occurrence.final_schedule)}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-default-500">Lokasi</dt>
                        <dd className="mt-0.5 break-words">{row.occurrence.final_location || 'Belum ditentukan'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-default-500">Peserta</dt>
                        <dd className="mt-0.5">{row.attendee_count} / {row.occurrence.max_attendees}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-default-500">Seat lunas · DP / seat</dt>
                        <dd className="mt-0.5">{row.paid_seat_count} · {formatCurrency(row.occurrence.deposit_amount_per_seat, 'IDR')}</dd>
                      </div>
                    </dl>
                    <span className="border-t border-default-100 pt-3 text-xs font-semibold text-primary">Lihat detail acara →</span>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
