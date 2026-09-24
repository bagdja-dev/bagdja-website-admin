'use client';

import { Button, Card, CardBody, Chip, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { LoadingSpinner } from '../../components/loading-spinner';
import { NoWebsiteState } from '../../components/no-website-state';
import { apiClient } from '../../lib/api-client';
import { formatCurrency } from '../../lib/currency';
import { hasMinRole, TERMIN_STATUS_LABELS, type TagihanListItem, type TagihanListResponse } from '../../lib/types';
import { useWebsiteContext } from '../../context/website-context';

/**
 * Halaman "Tagihan" — shortcut lintas-order untuk aksi Termin (Terbitkan)
 * tanpa harus buka detail satu-satu pesanan. Lihat plan/website-builder
 * riset UX gap: sebelumnya aksi Termin hanya bisa dijangkau dari detail order.
 */

type TabKey = 'all' | 'scheduled' | 'issued' | 'paid' | 'cancelled';

const TABS: Array<{ key: TabKey; label: string; statusQuery?: string }> = [
  { key: 'all', label: 'Semua' },
  { key: 'scheduled', label: 'Menunggu Diterbitkan', statusQuery: 'SCHEDULED' },
  { key: 'issued', label: 'Menunggu Dibayar', statusQuery: 'ISSUED' },
  { key: 'paid', label: 'Lunas', statusQuery: 'PAID' },
  { key: 'cancelled', label: 'Dibatalkan', statusQuery: 'CANCELLED' },
];

type StatusTone = 'default' | 'success' | 'warning';

const STATUS_TONE: Record<TagihanListItem['status'], StatusTone> = {
  SCHEDULED: 'default',
  ISSUED: 'warning',
  PAID: 'success',
  CANCELLED: 'default',
};

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function TagihanPage() {
  const { websiteId, role, loading: ctxLoading } = useWebsiteContext();
  const canManageFulfillment = role ? hasMinRole(role, 'editor') : false;

  const [tab, setTab] = useState<TabKey>('all');
  const [items, setItems] = useState<TagihanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<Record<string, string>>({});

  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];

  const load = useCallback(async () => {
    if (!websiteId) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), size: '20' });
      if (activeTab.statusQuery) params.set('status', activeTab.statusQuery);
      const result = await apiClient<TagihanListResponse>(
        `/api/websites/${websiteId}/transactions/termins?${params.toString()}`,
      );
      setItems(result.data);
      setTotalPages(result.meta.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat Tagihan');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [websiteId, page, activeTab.statusQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const issueTermin = async (item: TagihanListItem) => {
    if (!websiteId || !item.orderTransactionId) return;
    setIssuingId(item.id);
    setIssueError((prev) => ({ ...prev, [item.id]: '' }));
    try {
      await apiClient(
        `/api/websites/${websiteId}/transactions/${item.orderTransactionId}/orders/${item.orderId}/termins/${item.id}/issue`,
        { method: 'POST' },
      );
      await load();
    } catch (err) {
      setIssueError((prev) => ({
        ...prev,
        [item.id]: err instanceof Error ? err.message : 'Gagal menerbitkan Termin',
      }));
    } finally {
      setIssuingId(null);
    }
  };

  if (ctxLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tagihan</h1>
        <p className="mt-1 text-default-500">
          Semua Termin/Tagihan lintas pesanan — shortcut tanpa perlu buka detail pesanan satu-satu.
        </p>
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
      ) : items.length === 0 ? (
        <Card className="overflow-hidden border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-default-100 text-3xl">🧾</div>
            <p className="text-lg font-semibold">Belum ada Termin</p>
            <p className="max-w-sm text-sm text-default-500">
              Termin muncul di sini begitu ada pesanan dengan skema &quot;Atur Termin&quot; saat Harga Final.
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          <Card className="hidden border-0 shadow-md ring-1 ring-default-100 sm:block">
            <CardBody className="p-0">
              <Table aria-label="Daftar Tagihan" removeWrapper>
                <TableHeader>
                  <TableColumn>WAKTU</TableColumn>
                  <TableColumn>PRODUK</TableColumn>
                  <TableColumn>BUYER</TableColumn>
                  <TableColumn>TERMIN</TableColumn>
                  <TableColumn>NOMINAL</TableColumn>
                  <TableColumn>STATUS</TableColumn>
                  <TableColumn> </TableColumn>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell>{item.productName ?? '—'}</TableCell>
                      <TableCell>{item.buyerIdentifier ?? '—'}</TableCell>
                      <TableCell>{item.label}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(item.amount, 'IDR')}</TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat" color={STATUS_TONE[item.status]}>
                          {TERMIN_STATUS_LABELS[item.status] ?? item.status}
                        </Chip>
                        {issueError[item.id] && <p className="mt-1 text-xs text-danger">{issueError[item.id]}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.status === 'SCHEDULED' && canManageFulfillment && (
                            <Button
                              size="sm"
                              color="primary"
                              variant="flat"
                              isLoading={issuingId === item.id}
                              onPress={() => issueTermin(item)}
                            >
                              Terbitkan
                            </Button>
                          )}
                          {item.orderTransactionId && (
                            <Button
                              as={Link}
                              href={`/dashboard/orders/${item.orderTransactionId}`}
                              size="sm"
                              variant="flat"
                            >
                              Lihat Order
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>

          <div className="flex flex-col gap-3 sm:hidden">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border-0 bg-white p-4 shadow-md ring-1 ring-default-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="mt-0.5 text-xs text-default-500">
                      {item.productName ?? '—'} · {item.buyerIdentifier ?? '—'}
                    </p>
                    <p className="mt-0.5 text-xs text-default-400">{formatDate(item.createdAt)}</p>
                  </div>
                  <Chip size="sm" variant="flat" color={STATUS_TONE[item.status]} className="shrink-0">
                    {TERMIN_STATUS_LABELS[item.status] ?? item.status}
                  </Chip>
                </div>
                {issueError[item.id] && <p className="mt-2 text-xs text-danger">{issueError[item.id]}</p>}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">{formatCurrency(item.amount, 'IDR')}</span>
                  <div className="flex items-center gap-2">
                    {item.status === 'SCHEDULED' && canManageFulfillment && (
                      <Button
                        size="sm"
                        color="primary"
                        variant="flat"
                        isLoading={issuingId === item.id}
                        onPress={() => issueTermin(item)}
                      >
                        Terbitkan
                      </Button>
                    )}
                    {item.orderTransactionId && (
                      <Button as={Link} href={`/dashboard/orders/${item.orderTransactionId}`} size="sm" variant="flat">
                        Lihat Order
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && items.length > 0 && totalPages > 1 && (
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
