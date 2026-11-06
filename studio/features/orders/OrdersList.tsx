'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { errorMessage } from '@/studio/api/client';
import {
  fetchOrderListSummary,
  fetchOrders,
  fetchOrderVendors,
  type OrderListProgress,
  type OrderListRow,
  type OrderListSummary,
} from '@/studio/api/orders';
import type { TenantRole } from '@/studio/api/types';
import { hasMinRole } from '@/studio/lib/roles';
import { useModulesStore } from '@/studio/stores/modules-store';
import { useActiveRole, useActiveWebsiteId } from '@/studio/stores/website-store';
import {
  chipFilter,
  DataCardList,
  DataTable,
  DataToolbar,
  ListPager,
  ListSkeleton,
  selectFilter,
  useDataList,
  type ColumnContext,
  type DataColumn,
  type ServerQuery,
} from '@/studio/ui/data-list';
import { rememberOrdersListQuery } from '@/studio/features/orders/detail/list-return';
import { EmptyState } from '@/studio/ui/primitives/EmptyState';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';

const ORDER_STATUSES = [
  { value: 'NEEDS_ACTION', label: 'Perlu tindakan' },
  { value: 'ALL', label: 'Semua' },
  { value: 'AWAITING_PAYMENT', label: 'Menunggu bayar' },
  { value: 'PROCESSING', label: 'Diproses' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'CANCELLED', label: 'Batal & refund' },
] as const;

const PERIOD_OPTIONS = [
  { value: '7d', label: '7 hari terakhir' },
  { value: '30d', label: '30 hari terakhir' },
  { value: 'month', label: 'Bulan ini' },
];

const STATUS_TONE: Record<string, string> = {
  PENDING: 'bg-warning-50 text-warning-700',
  PENDING_PAYMENT: 'bg-warning-50 text-warning-700',
  HELD: 'bg-primary-50 text-primary-700',
  DISPUTED: 'bg-danger-50 text-danger-700',
  COMPLETED: 'bg-success-50 text-success-700',
  REFUNDED: 'bg-default-100 text-default-700',
  CLOSED: 'bg-default-100 text-default-700',
  CANCELLED: 'bg-default-100 text-default-700',
};

function paymentLabel(row: OrderListRow): string {
  if (row.status === 'COMPLETED' && row.termin_summary && row.termin_summary.total > row.termin_summary.paid) {
    return `Sisa ${row.termin_summary.total - row.termin_summary.paid} tagihan`;
  }
  const labels: Record<string, string> = {
    PENDING: 'Menunggu bayar',
    PENDING_PAYMENT: 'Menunggu bayar',
    HELD: 'Dibayar · dana ditahan',
    DISPUTED: 'Sengketa',
    COMPLETED: 'Selesai · dana cair',
    REFUNDED: 'Refund',
    CLOSED: 'Ditutup',
    CANCELLED: 'Dibatalkan',
  };
  return labels[row.status] ?? row.status;
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${new Intl.NumberFormat('id-ID').format(amount)}`;
  }
}

function formatAmounts(rows: Array<{ currency: string; amount: number }>): string {
  if (rows.length === 0) return formatAmount(0, 'IDR');
  return rows
    .slice()
    .sort((a, b) => a.currency.localeCompare(b.currency))
    .map((row) => formatAmount(row.amount, row.currency))
    .join(' · ');
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function orderTotal(row: OrderListRow): number {
  if (!row.items.length) return row.total_amount;
  return row.items.reduce((sum, item) => sum + (item.order?.quoted_total_amount ?? item.total_amount), 0);
}

function deliveryLabel(row: OrderListRow): string {
  const area = row.metadata?.shipping?.destination_area_name ?? row.city;
  if (area || row.courier) {
    return [row.courier?.toUpperCase(), area ? `ke ${area}` : null].filter(Boolean).join(' · ');
  }
  const location = row.items.find((item) => item.order?.location?.name)?.order?.location?.name;
  return location ? `Datang ke ${location}` : 'Cara terima belum diatur';
}

function progressFor(row: OrderListRow): { progress: OrderListProgress | null; current: string; completed: number; total: number } {
  const progresses = Object.values(row.fulfillment ?? {});
  const steps = progresses.flatMap((progress) => progress.steps);
  const currentStep = steps.find((step) => !step.completed);
  const currentProgress = currentStep
    ? progresses.find((progress) => progress.steps.includes(currentStep)) ?? null
    : progresses[0] ?? null;

  if (steps.length === 0) {
    return {
      progress: null,
      current: row.fulfillment_status === 'DELIVERED' ? 'Selesai' : 'Belum ada alur',
      completed: 0,
      total: 0,
    };
  }

  return {
    progress: currentProgress,
    current: currentStep?.stepName ?? 'Selesai',
    completed: steps.filter((step) => step.completed).length,
    total: steps.length,
  };
}

function StatusBadge({ row }: { row: OrderListRow }) {
  return (
    <span className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[11px] font-bold leading-tight ${STATUS_TONE[row.status] ?? 'bg-default-100 text-default-700'}`}>
      {paymentLabel(row)}
    </span>
  );
}

function orderColumns(): DataColumn<OrderListRow>[] {
  return [
    {
      key: 'order',
      header: 'Pesanan',
      mobile: 'title',
      render: (row) => (
        <Link href={`/studio/orders/${row.id}`} onClick={rememberOrdersListQuery} className="flex items-start gap-2 text-foreground no-underline hover:text-primary">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${row.needs_action ? 'bg-warning' : 'bg-transparent'}`} aria-hidden="true" />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-bold">{row.ref_number || `#${row.id.slice(0, 8).toUpperCase()}`}</span>
            <span className="mt-0.5 block text-xs text-default-500">{formatDate(row.created_at)}</span>
          </span>
        </Link>
      ),
    },
    {
      key: 'buyer',
      header: 'Pembeli',
      mobile: 'subtitle',
      render: (row, ctx) => (
        <div className={ctx.variant === 'table' ? 'min-w-[140px]' : 'min-w-0'}>
          <p className="truncate text-[13px] font-semibold text-foreground">{row.recipient_name || row.buyer_identifier || 'Pembeli'}</p>
          {row.recipient_name && row.buyer_identifier && <p className="truncate text-xs text-default-500">{row.buyer_identifier}</p>}
          <p className="mt-0.5 truncate text-xs text-default-500">{deliveryLabel(row)}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Item',
      mobile: 'meta',
      render: (row, ctx) => {
        const firstItem = row.items[0];
        const count = row.items.length;
        return (
          <div className={ctx.variant === 'table' ? 'min-w-[130px]' : 'min-w-0'}>
            <p className="truncate text-[13px] font-semibold text-foreground">{firstItem?.order?.product?.name || `${count} item`}</p>
            {count > 1 && <p className="mt-0.5 text-xs text-default-500">+{count - 1} lainnya</p>}
            {firstItem && <p className="mt-0.5 text-xs text-default-500">Qty {firstItem.order?.quantity ?? 1}</p>}
          </div>
        );
      },
    },
    {
      key: 'total',
      header: 'Total',
      align: 'end',
      mobile: 'trailing',
      render: (row, ctx) => (
        <div className={`${ctx.variant === 'table' ? 'min-w-[120px]' : 'max-w-[120px]'} text-right`}>
          <p className="whitespace-nowrap text-[13px] font-bold text-foreground">{formatAmount(orderTotal(row), row.currency)}</p>
          {row.termin_summary && row.termin_summary.total > 1 ? (
            <p className="mt-0.5 text-xs text-default-500">DP {formatAmount(row.total_amount, row.currency)} · {row.termin_summary.paid}/{row.termin_summary.total} tagihan</p>
          ) : row.shipping_cost ? (
            <p className="mt-0.5 text-xs text-default-500">Ongkir {formatAmount(row.shipping_cost, row.currency)}</p>
          ) : (
            <p className="mt-0.5 text-xs text-default-500">{row.payment_mode === 'ESCROW' ? 'Pembayaran escrow' : 'Pembayaran langsung'}</p>
          )}
        </div>
      ),
    },
    {
      key: 'payment',
      header: 'Pembayaran',
      mobile: 'meta',
      render: (row, ctx) => <span className={ctx.variant === 'card' ? 'mr-1' : ''}><StatusBadge row={row} /></span>,
    },
    {
      key: 'fulfillment',
      header: 'Pengerjaan',
      mobile: 'subtitle',
      render: (row, ctx) => {
        const progress = progressFor(row);
        const percentage = progress.total ? Math.round((progress.completed / progress.total) * 100) : 0;
        return (
          <div className={ctx.variant === 'table' ? 'min-w-[140px]' : 'min-w-0'}>
            <p className="truncate text-[13px] font-semibold text-foreground">{progress.current}</p>
            {progress.total > 0 ? (
              <>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-default-100">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-default-500">{progress.completed}/{progress.total} langkah</p>
              </>
            ) : (
              <p className="mt-0.5 text-xs text-default-500">
                {row.status === 'PENDING' || row.status === 'PENDING_PAYMENT' ? 'Menunggu pembayaran' : row.fulfillment_status}
              </p>
            )}
          </div>
        );
      },
    },
  ];
}

function SummaryCard({
  label,
  value,
  hint,
  active,
  onPress,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onPress}
      className={`flex min-h-[100px] flex-col items-start justify-between rounded-[14px] border bg-white p-3.5 text-left transition-colors sm:p-4 ${
        active ? 'border-primary-200 bg-primary-50' : 'border-default-200 hover:border-default-300 hover:bg-default-50'
      }`}
    >
      <span className={`text-xs font-semibold ${active ? 'text-primary' : 'text-default-600'}`}>{label}</span>
      <span className="mt-2 text-lg font-extrabold leading-tight text-foreground sm:text-xl">{value}</span>
      <span className="mt-1 text-[11px] text-default-500">{hint}</span>
    </button>
  );
}

function statusCount(summary: OrderListSummary | null, status: string): number | null {
  if (!summary) return null;
  if (status === 'NEEDS_ACTION') return summary.counts.needsAction;
  if (status === 'ALL') return summary.counts.all;
  if (status === 'AWAITING_PAYMENT') return summary.counts.awaitingPayment;
  if (status === 'PROCESSING') return summary.counts.processing;
  if (status === 'COMPLETED') return summary.counts.completed;
  if (status === 'CANCELLED') return summary.counts.cancelled;
  return 0;
}

function SummaryValue({ summary, loading, type }: { summary: OrderListSummary | null; loading: boolean; type: 'held' | 'released' }) {
  if (!summary) return <span>{loading ? 'Memuat…' : '—'}</span>;
  const rows = type === 'held' ? summary.heldAmounts : summary.releasedThisMonth;
  return <>{formatAmounts(rows)}</>;
}

export function OrdersList() {
  const router = useRouter();
  const websiteId = useActiveWebsiteId();
  const openOrder = useCallback(
    (row: OrderListRow) => {
      rememberOrdersListQuery();
      router.push(`/studio/orders/${row.id}`);
    },
    [router],
  );
  const role = useActiveRole();
  const hasModule = useModulesStore((state) => state.hasModule);
  const hasVendors = hasModule('vendors');
  const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [summary, setSummary] = useState<OrderListSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const previousWebsiteId = useRef(websiteId);

  const load = useCallback(
    (query: ServerQuery) => websiteId ? fetchOrders(websiteId, query) : Promise.resolve({ items: [], total: 0 }),
    [websiteId],
  );
  const filters = useMemo(
    () => [
      chipFilter<OrderListRow>({
        key: 'status',
        label: 'Status pesanan',
        allLabel: 'Semua',
        options: ORDER_STATUSES.map((status) => ({ value: status.value, label: status.label })),
        getValue: (row) => row.status,
      }),
      selectFilter<OrderListRow>({
        key: 'period',
        label: 'Periode',
        options: PERIOD_OPTIONS,
        getValue: () => '',
      }),
      ...(hasVendors
        ? [
            selectFilter<OrderListRow>({
              key: 'vendor',
              label: 'Vendor',
              options: vendors.map((vendor) => ({ value: vendor.id, label: vendor.name })),
              getValue: () => '',
            }),
          ]
        : []),
    ],
    [hasVendors, vendors],
  );
  const list = useDataList<OrderListRow>({
    mode: 'server',
    load,
    filters,
    pageSize: 20,
    initialFilterValues: { status: 'NEEDS_ACTION' },
  });
  const reloadOrders = list.reload;

  const refreshSummary = useCallback(async () => {
    if (!websiteId) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      setSummary(await fetchOrderListSummary(websiteId));
    } catch (error) {
      setSummaryError(errorMessage(error, 'Gagal memuat ringkasan pesanan.'));
    } finally {
      setSummaryLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    if (!websiteId) return;
    void refreshSummary();
  }, [refreshSummary, websiteId]);

  useEffect(() => {
    if (previousWebsiteId.current === websiteId) return;
    previousWebsiteId.current = websiteId;
    void reloadOrders();
  }, [reloadOrders, websiteId]);

  useEffect(() => {
    if (!websiteId || !hasVendors) {
      setVendors([]);
      setVendorError(null);
      return;
    }
    let active = true;
    fetchOrderVendors(websiteId)
      .then((result) => {
        if (active) {
          setVendors(result);
          setVendorError(null);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setVendorError(errorMessage(error, 'Gagal memuat daftar vendor.'));
          setVendors([]);
        }
      });
    return () => {
      active = false;
    };
  }, [hasVendors, websiteId]);

  const columns = useMemo(() => orderColumns(), []);
  const ctx = useMemo<ColumnContext>(
    () => ({
      variant: 'table',
      canAct: (minimumRole?: TenantRole) => !minimumRole || hasMinRole(role, minimumRole),
      isPending: () => false,
    }),
    [role],
  );
  const status = list.filterValues.status || 'NEEDS_ACTION';
  const tabFilters = list.filters.filter((filter) => filter.key !== 'status');
  const listTableProps = {
    ariaLabel: 'Daftar pesanan',
    rows: list.rows,
    columns,
    ctx,
    selectable: false,
    selection: list.selection,
    getRowLabel: (row: OrderListRow) => row.recipient_name || row.buyer_identifier || 'Pesanan',
    onRowClick: openOrder,
  };

  const setStatus = (next: string) => list.setFilter('status', next);

  return (
    <>
      <PageHeader title="Pesanan" description="Pantau pembayaran dan tindak lanjuti pengerjaan pesanan." count={list.status === 'ready' ? list.totalCount : undefined} />
      <div className="flex flex-col gap-4 pb-20 md:pb-0">
        <section aria-label="Ringkasan pesanan" className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          <SummaryCard
            label="Perlu tindakan"
            value={summary ? String(summary.counts.needsAction) : summaryLoading ? 'Memuat…' : '—'}
            hint="Pesanan yang menunggu giliranmu"
            active={status === 'NEEDS_ACTION'}
            onPress={() => setStatus('NEEDS_ACTION')}
          />
          <SummaryCard
            label="Menunggu bayar"
            value={summary ? String(summary.counts.awaitingPayment) : summaryLoading ? 'Memuat…' : '—'}
            hint="Belum dibayar pembeli"
            active={status === 'AWAITING_PAYMENT'}
            onPress={() => setStatus('AWAITING_PAYMENT')}
          />
          <SummaryCard
            label="Dana ditahan"
            value={<SummaryValue summary={summary} loading={summaryLoading} type="held" />}
            hint={summary ? `${summary.counts.processing} pesanan diproses` : 'Dana dari pesanan diproses'}
            active={status === 'PROCESSING'}
            onPress={() => setStatus('PROCESSING')}
          />
          <SummaryCard
            label="Cair bulan ini"
            value={<SummaryValue summary={summary} loading={summaryLoading} type="released" />}
            hint={summary ? `${summary.releasedThisMonthCount} pesanan dicairkan` : 'Dana yang sudah dicairkan'}
            active={status === 'RELEASED_THIS_MONTH'}
            onPress={() => {
              setStatus('RELEASED_THIS_MONTH');
              list.setFilter('period', 'month');
            }}
          />
        </section>

        {summaryError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-danger-200 bg-danger-50 px-3.5 py-3 text-[13px] text-danger-700">
            <span>Ringkasan pesanan gagal dimuat: {summaryError}</span>
            <button type="button" onClick={() => void refreshSummary()} className="min-h-8 rounded-lg border border-danger-300 px-3 font-semibold hover:bg-white">
              Coba lagi
            </button>
          </div>
        )}
        {vendorError && (
          <p role="status" className="text-xs text-warning-700">Filter vendor tidak tersedia: {vendorError}</p>
        )}

        <div role="group" aria-label="Filter status pesanan" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {ORDER_STATUSES.map((item) => {
            const active = status === item.value;
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={active}
                onClick={() => setStatus(item.value)}
                className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors ${
                  active ? 'border-primary-200 bg-primary-50 font-bold text-primary' : 'border-default-200 bg-white font-medium text-default-700 hover:bg-default-50'
                }`}
              >
                {item.label}
                <span className={`rounded-full px-1.5 py-px text-[11px] font-bold ${active ? 'bg-primary text-white' : 'bg-default-100 text-default-600'}`}>
                  {statusCount(summary, item.value) ?? (summaryLoading ? '…' : '—')}
                </span>
              </button>
            );
          })}
        </div>

        <DataToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Cari pembeli, nomor pesanan, atau produk"
          filters={tabFilters}
          filterValues={list.filterValues}
          filterCounts={list.filterCounts}
          onFilterChange={list.setFilter}
        />

        {list.status === 'loading' && list.rows.length === 0 ? (
          <div className="rounded-[14px] border border-default-200 bg-white"><ListSkeleton /></div>
        ) : list.status === 'error' ? (
          <div className="rounded-[14px] border border-default-200 bg-white">
            <EmptyState
              compact
              icon="warning"
              title="Pesanan gagal dimuat"
              description={list.error ?? undefined}
              action={<button type="button" onClick={() => void list.reload()} className="min-h-10 rounded-[10px] border border-default-300 bg-white px-3.5 text-[13px] font-semibold">Coba lagi</button>}
            />
          </div>
        ) : list.rows.length === 0 ? (
          <div className="rounded-[14px] border border-default-200 bg-white">
            <EmptyState
              compact
              icon={Boolean(list.search || list.filterValues.period || list.filterValues.vendor) ? 'search' : undefined}
              title={
                Boolean(list.search || list.filterValues.period || list.filterValues.vendor)
                  ? 'Tidak ada pesanan yang cocok'
                  : status === 'NEEDS_ACTION'
                    ? 'Tidak ada pesanan yang perlu ditindaklanjuti'
                    : status === 'ALL'
                      ? 'Belum ada pesanan'
                      : `Tidak ada pesanan: ${ORDER_STATUSES.find((item) => item.value === status)?.label ?? 'filter ini'}`
              }
              description={
                Boolean(list.search || list.filterValues.period || list.filterValues.vendor)
                  ? 'Coba kata kunci lain atau ubah filter.'
                  : 'Pesanan baru dari pembeli akan muncul di sini.'
              }
              action={Boolean(list.search || list.filterValues.period || list.filterValues.vendor) ? <button type="button" onClick={list.resetQuery} className="min-h-10 rounded-[10px] border border-default-300 bg-white px-3.5 text-[13px] font-semibold">Reset filter</button> : undefined}
            />
          </div>
        ) : (
          <>
            <section className="hidden overflow-hidden rounded-[14px] border border-default-200 bg-white md:block">
              <DataTable {...listTableProps} />
              <ListPager list={list} />
            </section>
            <div className="flex flex-col gap-2 md:hidden">
              <DataCardList {...listTableProps} ctx={{ ...ctx, variant: 'card' }} />
              <ListPager list={list} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
