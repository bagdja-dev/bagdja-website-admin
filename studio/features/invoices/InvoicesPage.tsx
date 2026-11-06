'use client';

import { Button, Card, CardBody, Chip } from '@heroui/react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { studioRequest } from '@/studio/api/client';
import { hasMinRole } from '@/studio/lib/roles';
import { useActiveRole, useActiveWebsiteId } from '@/studio/stores/website-store';
import { EmptyState } from '@/studio/ui/primitives/EmptyState';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';

type TerminStatus = 'SCHEDULED' | 'ISSUED' | 'PAID' | 'CANCELLED';

interface TagihanListItem {
  id: string;
  sequence: number;
  label: string;
  amount: number;
  status: TerminStatus;
  anchorStepName: string | null;
  orderId: string;
  orderTransactionId: string | null;
  productName: string | null;
  buyerIdentifier: string | null;
  transactionId: string | null;
  createdAt: string;
  issuedAt: string | null;
}

interface TagihanListResponse {
  data: TagihanListItem[];
  meta: { page: number; size: number; total: number; totalPages: number };
}

const TERMIN_STATUS_LABELS: Record<TerminStatus, string> = {
  SCHEDULED: 'Menunggu diterbitkan',
  ISSUED: 'Menunggu dibayar',
  PAID: 'Lunas',
  CANCELLED: 'Dibatalkan',
};

function formatCurrency(value: number, currency = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

type TabKey = 'all' | 'scheduled' | 'issued' | 'paid' | 'cancelled';

type TabDef = { key: TabKey; label: string; status?: TerminStatus };

const TABS: TabDef[] = [
  { key: 'all', label: 'Semua' },
  { key: 'scheduled', label: 'Menunggu diterbitkan', status: 'SCHEDULED' },
  { key: 'issued', label: 'Menunggu dibayar', status: 'ISSUED' },
  { key: 'paid', label: 'Lunas', status: 'PAID' },
  { key: 'cancelled', label: 'Dibatalkan', status: 'CANCELLED' },
];

const STATUS_TONE: Record<TagihanListItem['status'], 'default' | 'warning' | 'success'> = {
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

export function InvoicesPage() {
  const websiteId = useActiveWebsiteId();
  const role = useActiveRole();
  const canIssue = hasMinRole(role, 'editor');
  const [tab, setTab] = useState<TabKey>('all');
  const [items, setItems] = useState<TagihanListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [issuingId, setIssuingId] = useState<string | null>(null);

  const activeTab = useMemo(() => TABS.find((t) => t.key === tab) ?? TABS[0], [tab]);

  const load = useCallback(async () => {
    if (!websiteId) return;

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ page: String(page), size: '20' });
      if (activeTab.status) params.set('status', activeTab.status);

      const result = await studioRequest<TagihanListResponse>(
        `/api/websites/${encodeURIComponent(websiteId)}/transactions/termins?${params.toString()}`,
      );

      setItems(result.data);
      setTotalPages(result.meta.totalPages || 1);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : 'Gagal memuat tagihan.');
    } finally {
      setLoading(false);
    }
  }, [activeTab.status, page, websiteId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const issueTermin = useCallback(
    async (item: TagihanListItem) => {
      if (!websiteId || !item.orderTransactionId) return;
      setIssuingId(item.id);
      try {
        await studioRequest(
          `/api/websites/${encodeURIComponent(websiteId)}/transactions/${encodeURIComponent(item.orderTransactionId)}/orders/${encodeURIComponent(item.orderId)}/termins/${encodeURIComponent(item.id)}/issue`,
          { method: 'POST' },
        );
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal menerbitkan tagihan.');
      } finally {
        setIssuingId(null);
      }
    },
    [load, websiteId],
  );

  const renderState = () => {
    if (!websiteId) {
      return (
        <Card className="border border-default-200 bg-white shadow-sm">
          <CardBody>
            <EmptyState title="Belum ada website aktif" description="Pilih website untuk melihat data tagihan." icon="empty" />
          </CardBody>
        </Card>
      );
    }

    if (loading) {
      return (
        <Card className="border border-default-200 bg-white shadow-sm">
          <CardBody className="flex min-h-[220px] items-center justify-center text-sm text-default-600">Memuat tagihan…</CardBody>
        </Card>
      );
    }

    if (error) {
      return (
        <Card className="border border-default-200 bg-white shadow-sm">
          <CardBody className="py-10 text-center text-sm text-danger">{error}</CardBody>
        </Card>
      );
    }

    if (items.length === 0) {
      return (
        <Card className="border border-default-200 bg-white shadow-sm">
          <CardBody>
            <EmptyState
              title="Belum ada tagihan"
              description="Tagihan yang dijadwalkan, diterbitkan, atau dibayar akan muncul di sini."
              icon="invoice"
            />
          </CardBody>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id} className="border border-default-200 bg-white shadow-sm">
            <CardBody className="p-4 md:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-default-500">
                      {item.label}
                    </span>
                    <Chip size="sm" variant="flat" color={STATUS_TONE[item.status]}>
                      {TERMIN_STATUS_LABELS[item.status] ?? item.status}
                    </Chip>
                  </div>

                  <div className="grid gap-3 text-sm text-default-600 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-default-400">Waktu</p>
                      <p className="mt-1 font-medium text-default-800">{formatDate(item.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-default-400">Produk</p>
                      <p className="mt-1 font-medium text-default-800">{item.productName ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-default-400">Pembeli</p>
                      <p className="mt-1 font-medium text-default-800">{item.buyerIdentifier ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-default-400">Nominal</p>
                      <p className="mt-1 font-semibold text-default-900">{formatCurrency(item.amount, 'IDR')}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-stretch gap-2 md:min-w-[180px] md:items-end">
                  {item.status === 'SCHEDULED' && canIssue && (
                    <Button
                      size="sm"
                      color="primary"
                      variant="flat"
                      isLoading={issuingId === item.id}
                      onPress={() => void issueTermin(item)}
                    >
                      Terbitkan
                    </Button>
                  )}
                  {item.orderTransactionId ? (
                    <Button as={Link} href={`/studio/orders/${item.orderTransactionId}`} size="sm" variant="light">
                      Lihat order
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Tagihan"
        description="Daftar termin dan tagihan lintas pesanan yang perlu ditindaklanjuti."
      />

      <div className="space-y-5 p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-default-500">Keuangan</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-default-900 md:text-3xl">Tagihan</h1>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-2 rounded-full bg-default-100 p-1">
            {TABS.map((tabItem) => {
              const active = tab === tabItem.key;
              return (
                <button
                  key={tabItem.key}
                  type="button"
                  onClick={() => setTab(tabItem.key)}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition-all md:px-4 ${
                    active ? 'bg-white text-default-900 shadow-sm ring-1 ring-default-200' : 'text-default-600 hover:text-default-900'
                  }`}
                >
                  {tabItem.label}
                </button>
              );
            })}
          </div>
        </div>

        {renderState()}

        {totalPages > 1 && !loading && !error && items.length > 0 && (
          <div className="flex items-center justify-center gap-3 pb-2">
            <Button size="sm" variant="light" isDisabled={page <= 1} onPress={() => setPage((prev) => Math.max(1, prev - 1))}>
              Sebelumnya
            </Button>
            <span className="text-sm text-default-600">
              Halaman {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="light"
              isDisabled={page >= totalPages}
              onPress={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Selanjutnya
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
