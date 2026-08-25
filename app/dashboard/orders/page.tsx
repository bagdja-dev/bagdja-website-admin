'use client';

import { Button, Card, CardBody, Chip, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { LoadingSpinner } from '../../components/loading-spinner';
import { NoWebsiteState } from '../../components/no-website-state';
import { apiClient } from '../../lib/api-client';
import { formatCurrency } from '../../lib/currency';
import { TRANSACTION_STATUS_LABELS, type WebsiteTransaction } from '../../lib/types';
import { useWebsiteContext } from '../../context/website-context';

/**
 * Order Handling Phase 1 (plan/website-builder/order-hanlde-plan.md) —
 * daftar pesanan masuk ke website ini. Read-only (visibilitas), aksi
 * (refund/resolusi dispute/fulfillment) menyusul di fase berikutnya.
 */

type TabKey = 'all' | 'awaiting' | 'process' | 'done' | 'cancelled';

const TABS: Array<{ key: TabKey; label: string; statusQuery?: string }> = [
  { key: 'all', label: 'Semua' },
  { key: 'awaiting', label: 'Menunggu Bayar', statusQuery: 'PENDING_PAYMENT,PENDING' },
  { key: 'process', label: 'Diproses', statusQuery: 'HELD,DISPUTED' },
  { key: 'done', label: 'Selesai', statusQuery: 'COMPLETED' },
  { key: 'cancelled', label: 'Dibatalkan/Refund', statusQuery: 'CANCELLED,REFUNDED,CLOSED' },
];

type StatusTone = 'default' | 'primary' | 'success' | 'danger' | 'warning';

const STATUS_TONE: Record<string, StatusTone> = {
  PENDING: 'warning',
  PENDING_PAYMENT: 'warning',
  HELD: 'primary',
  DISPUTED: 'danger',
  COMPLETED: 'success',
  REFUNDED: 'default',
  CLOSED: 'default',
  CANCELLED: 'default',
};

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function OrdersPage() {
  const { websiteId, loading: ctxLoading } = useWebsiteContext();
  const [tab, setTab] = useState<TabKey>('all');
  const [transactions, setTransactions] = useState<WebsiteTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];

  const load = useCallback(async () => {
    if (!websiteId) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), size: '20' });
      if (activeTab.statusQuery) params.set('status', activeTab.statusQuery);
      const result = await apiClient<{ data: WebsiteTransaction[]; meta: { totalPages: number } }>(
        `/api/websites/${websiteId}/transactions?${params.toString()}`,
      );
      setTransactions(result.data);
      setTotalPages(result.meta.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pesanan');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websiteId, page, activeTab.statusQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  if (ctxLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pesanan</h1>
        <p className="mt-1 text-default-500">Pesanan yang masuk ke toko ini dari buyer.</p>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                active
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25'
                  : 'bg-white text-default-600 ring-1 ring-default-200 hover:bg-default-50'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <LoadingSpinner className="h-48" />
      ) : error ? (
        <Card className="border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="py-10 text-center text-sm text-danger">{error}</CardBody>
        </Card>
      ) : transactions.length === 0 ? (
        <Card className="overflow-hidden border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 text-3xl ring-4 ring-cyan-50">
              🧾
            </div>
            <p className="text-lg font-semibold">Belum ada pesanan</p>
            <p className="max-w-sm text-sm text-default-500">
              Pesanan buyer akan muncul di sini begitu ada checkout masuk.
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          <Card className="hidden border-0 shadow-md ring-1 ring-default-100 sm:block">
            <CardBody className="p-0">
              <Table aria-label="Daftar pesanan" removeWrapper>
                <TableHeader>
                  <TableColumn>WAKTU</TableColumn>
                  <TableColumn>PEMBELI</TableColumn>
                  <TableColumn>ITEM</TableColumn>
                  <TableColumn>TOTAL</TableColumn>
                  <TableColumn>STATUS</TableColumn>
                  <TableColumn> </TableColumn>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{formatDate(tx.created_at)}</TableCell>
                      <TableCell>{tx.buyer_identifier ?? '—'}</TableCell>
                      <TableCell>{tx.items?.length ?? 0} item</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(tx.total_amount, tx.currency)}
                      </TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat" color={STATUS_TONE[tx.status] ?? 'default'}>
                          {TRANSACTION_STATUS_LABELS[tx.status] ?? tx.status}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <Button as={Link} href={`/dashboard/orders/${tx.id}`} size="sm" variant="flat" color="primary">
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>

          <div className="flex flex-col gap-3 sm:hidden">
            {transactions.map((tx) => (
              <Link
                key={tx.id}
                href={`/dashboard/orders/${tx.id}`}
                className="block rounded-xl border-0 bg-white p-4 shadow-md ring-1 ring-default-100"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {tx.buyer_identifier ?? '—'}
                    </p>
                    <p className="mt-0.5 text-xs text-default-500">
                      {formatDate(tx.created_at)} · {tx.items?.length ?? 0} item
                    </p>
                  </div>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={STATUS_TONE[tx.status] ?? 'default'}
                    className="shrink-0"
                  >
                    {TRANSACTION_STATUS_LABELS[tx.status] ?? tx.status}
                  </Chip>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(tx.total_amount, tx.currency)}
                  </span>
                  <span className="text-xs font-medium text-primary">Lihat detail →</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {!loading && transactions.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button size="sm" variant="flat" isDisabled={page <= 1} onPress={() => setPage((p) => p - 1)}>
            Sebelumnya
          </Button>
          <span className="text-sm text-default-500">
            Halaman {page} dari {totalPages}
          </span>
          <Button size="sm" variant="flat" isDisabled={page >= totalPages} onPress={() => setPage((p) => p + 1)}>
            Berikutnya
          </Button>
        </div>
      )}
    </div>
  );
}
