'use client';

import { Button, Card, CardBody, CardHeader, Chip, Divider } from '@heroui/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { LoadingSpinner } from '../../../components/loading-spinner';
import { NoWebsiteState } from '../../../components/no-website-state';
import { apiClient } from '../../../lib/api-client';
import { formatCurrency } from '../../../lib/currency';
import { TRANSACTION_STATUS_LABELS, type WebsiteTransaction } from '../../../lib/types';
import { useWebsiteContext } from '../../../context/website-context';

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
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { websiteId, loading: ctxLoading } = useWebsiteContext();
  const [transaction, setTransaction] = useState<WebsiteTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!websiteId || !params.id) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiClient<WebsiteTransaction>(
        `/api/websites/${websiteId}/transactions/${params.id}`,
      );
      setTransaction(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat detail pesanan');
    } finally {
      setLoading(false);
    }
  }, [websiteId, params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (ctxLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;
  if (loading) return <LoadingSpinner />;

  if (error || !transaction) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/orders" className="text-sm font-medium text-primary hover:underline">
          ← Kembali ke Pesanan
        </Link>
        <Card className="border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="py-10 text-center text-sm text-danger">
            {error || 'Pesanan tidak ditemukan'}
          </CardBody>
        </Card>
      </div>
    );
  }

  const shippingLines = [
    transaction.recipient_name,
    transaction.phone,
    [transaction.address, transaction.district, transaction.city].filter(Boolean).join(', '),
    transaction.postal_code,
  ].filter((line): line is string => Boolean(line));

  return (
    <div className="space-y-6">
      <Link href="/dashboard/orders" className="text-sm font-medium text-primary hover:underline">
        ← Kembali ke Pesanan
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Detail Pesanan</h1>
          <p className="mt-1 text-sm text-default-500">{formatDate(transaction.created_at)}</p>
        </div>
        <Chip size="lg" variant="flat" color={STATUS_TONE[transaction.status] ?? 'default'}>
          {TRANSACTION_STATUS_LABELS[transaction.status] ?? transaction.status}
        </Chip>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="border-0 shadow-md ring-1 ring-default-100">
            <CardHeader className="font-semibold">Item ({transaction.items?.length ?? 0})</CardHeader>
            <CardBody className="space-y-3 pt-0">
              {(transaction.items ?? []).map((item) => {
                const product = item.order?.product;
                const image = product?.images?.[0];
                return (
                  <div key={item.id} className="flex gap-3 rounded-xl bg-default-50 p-3">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-default-200 text-lg font-bold text-default-500">
                        {(product?.name ?? 'P').charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{product?.name ?? 'Produk'}</p>
                      <div className="mt-1 flex items-center justify-between text-sm text-default-500">
                        <span>{item.quantity} × {formatCurrency(item.unit_price)}</span>
                        <span className="font-semibold text-foreground">{formatCurrency(item.total_amount)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>

          {shippingLines.length > 0 && (
            <Card className="border-0 shadow-md ring-1 ring-default-100">
              <CardHeader className="font-semibold">Alamat Pengiriman</CardHeader>
              <CardBody className="space-y-1.5 pt-0 text-sm">
                {transaction.recipient_name && <p><span className="text-default-500">Penerima:</span> {transaction.recipient_name}</p>}
                {transaction.phone && <p><span className="text-default-500">No. HP:</span> {transaction.phone}</p>}
                {(transaction.address || transaction.district || transaction.city) && (
                  <p>
                    <span className="text-default-500">Alamat:</span>{' '}
                    {[transaction.address, transaction.district, transaction.city].filter(Boolean).join(', ')}
                  </p>
                )}
                {transaction.postal_code && <p><span className="text-default-500">Kode Pos:</span> {transaction.postal_code}</p>}
                {transaction.courier && <p><span className="text-default-500">Kurir:</span> {transaction.courier}</p>}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-0 shadow-md ring-1 ring-default-100">
            <CardHeader className="font-semibold">Ringkasan</CardHeader>
            <CardBody className="space-y-2 pt-0 text-sm">
              <div className="flex justify-between">
                <span className="text-default-500">Pembeli</span>
                <span className="font-medium">{transaction.buyer_identifier ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Mode</span>
                <span className="font-medium">{transaction.payment_mode === 'ESCROW' ? 'Escrow' : 'Checkout Bagdja'}</span>
              </div>
              <Divider className="my-2" />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold">{formatCurrency(transaction.total_amount, transaction.currency)}</span>
              </div>
            </CardBody>
          </Card>

          {transaction.escrow && (
            <Card className="border-0 shadow-md ring-1 ring-default-100">
              <CardHeader className="font-semibold">Status Dana (Escrow)</CardHeader>
              <CardBody className="space-y-2 pt-0 text-sm">
                <div className="flex justify-between">
                  <span className="text-default-500">Ditahan</span>
                  <span className="font-medium">{formatCurrency(transaction.escrow.amount_held, transaction.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-default-500">Sudah Dicairkan</span>
                  <span className="font-medium">{formatCurrency(transaction.escrow.amount_released, transaction.currency)}</span>
                </div>
                {transaction.status === 'DISPUTED' && (
                  <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger">
                    Buyer mengajukan komplain untuk pesanan ini. Fitur resolusi (refund/cabut sengketa) menyusul di fase berikutnya.
                  </p>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
