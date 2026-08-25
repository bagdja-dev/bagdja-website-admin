'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react';

import { AppModal } from '../../components/app-modal';
import { LoadingSpinner } from '../../components/loading-spinner';
import { apiClient, ApiError } from '../../lib/api-client';
import { formatCurrency } from '../../lib/currency';
import {
  formatWalletTransactionFeeNote,
  formatWalletTransactionType,
} from '../../lib/wallet-transaction-labels';

interface WalletBalance {
  currency_code: string;
  balance: number;
  held_balance: number;
  is_active: boolean;
}

interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billingInterval: string;
  intervalCount: number;
  isActive: boolean;
}

interface Subscription {
  id: string;
  planId: string;
  lockedAmount: number;
  currency: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  failedAttemptCount: number;
  gracePeriodEndsAt: string | null;
  nextRetryAt: string | null;
}

interface BillingAttempt {
  id: string;
  attemptNumber: number;
  status: string;
  kind: string;
  amount: number;
  platformFeeAmount: number;
  currency: string;
  failureReason: string | null;
  attemptedAt: string;
}

interface WalletTransactionRow {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  currency: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
}

interface WalletTransactionsResult {
  data: WalletTransactionRow[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

const MIN_TOPUP = 10000;

const BLOCKING_STATUSES = new Set(['ACTIVE', 'PAST_DUE', 'TRIALING']);

const STATUS_COLOR: Record<
  string,
  'success' | 'warning' | 'danger' | 'default' | 'primary'
> = {
  ACTIVE: 'success',
  PAST_DUE: 'warning',
  TRIALING: 'primary',
  SUSPENDED: 'danger',
  CANCELLED: 'default',
  EXPIRED: 'default',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatInterval(interval: string, count: number): string {
  const labels: Record<string, string> = {
    DAILY: 'hari',
    WEEKLY: 'minggu',
    MONTHLY: 'bulan',
    YEARLY: 'tahun',
  };
  const unit = labels[interval] || interval.toLowerCase();
  return count === 1 ? `per ${unit}` : `setiap ${count} ${unit}`;
}

function IconWallet({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
    </svg>
  );
}

function IconRefresh({ className, spin }: { className?: string; spin?: boolean }) {
  return (
    <svg
      className={`${className ?? ''} ${spin ? 'animate-spin' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

function BillingPageContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const invoice = searchParams.get('invoice');

  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [history, setHistory] = useState<BillingAttempt[]>([]);

  const [historyTab, setHistoryTab] = useState<'subscription' | 'transactions'>(
    'subscription',
  );

  const [transactions, setTransactions] = useState<WalletTransactionRow[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [topupOpen, setTopupOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [changePlanSelectedId, setChangePlanSelectedId] = useState<string | null>(null);

  const [postPaymentBanner, setPostPaymentBanner] = useState<{
    tone: 'success' | 'danger' | 'info';
    title: string;
    subtitle?: string;
  } | null>(null);

  const planById = useMemo(() => {
    const map = new Map<string, SubscriptionPlan>();
    for (const p of plans) map.set(p.id, p);
    return map;
  }, [plans]);

  const currentSubscription = useMemo(() => {
    return (
      subscriptions.find((s) => BLOCKING_STATUSES.has(s.status)) ||
      subscriptions.find((s) => s.status === 'SUSPENDED') ||
      null
    );
  }, [subscriptions]);

  const canSubscribe = !subscriptions.some((s) =>
    BLOCKING_STATUSES.has(s.status),
  );

  const loadAll = useCallback(async () => {
    setLoadError(null);
    setActionError(null);
    try {
      const [walletData, plansData, subsData] = await Promise.all([
        apiClient<WalletBalance>('/api/wallet/balance'),
        apiClient<SubscriptionPlan[]>('/api/subscriptions/plans'),
        apiClient<Subscription[]>('/api/subscriptions/my'),
      ]);
      setWallet(walletData);
      setPlans(Array.isArray(plansData) ? plansData : []);
      setSubscriptions(Array.isArray(subsData) ? subsData : []);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : 'Gagal memuat data. Coba lagi.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (subscriptionId: string) => {
    setHistoryError(null);
    try {
      const data = await apiClient<BillingAttempt[]>(
        `/api/subscriptions/${subscriptionId}/billing-history`,
      );
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      setHistory([]);
      setHistoryError(
        err instanceof ApiError
          ? err.message
          : 'Gagal memuat riwayat pembayaran.',
      );
    }
  }, []);

  useEffect(() => {
    if (!status && !invoice) {
      void loadAll();
      return;
    }

    if (status === 'success') {
      setPostPaymentBanner({
        tone: 'success',
        title: 'Pembayaran berhasil!',
        subtitle: invoice
          ? `Invoice: ${invoice}. Saldo dan langganan Anda sedang diperbarui.`
          : 'Saldo dan langganan Anda sedang diperbarui.',
      });
    } else if (status === 'failure') {
      setPostPaymentBanner({
        tone: 'danger',
        title: 'Pembayaran gagal atau dibatalkan.',
        subtitle: invoice
          ? `Invoice: ${invoice}. Silakan coba lagi dari menu Topup Saldo.`
          : 'Silakan coba lagi dari menu Topup Saldo.',
      });
    } else if (invoice) {
      setPostPaymentBanner({
        tone: 'info',
        title: 'Menerima callback pembayaran…',
        subtitle: `Invoice: ${invoice}. Menyinkronkan status transaksi terbaru.`,
      });
    }

    void loadAll();

    const interval = setInterval(() => {
      void loadAll();
    }, 3000);

    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [loadAll, status, invoice]);

  useEffect(() => {
    if (currentSubscription?.id) {
      void loadHistory(currentSubscription.id);
    } else {
      setHistory([]);
      setHistoryError(null);
    }
  }, [currentSubscription?.id, loadHistory]);

  const loadTransactions = useCallback(async (page: number) => {
    setTxLoading(true);
    setTxError(null);
    try {
      const result = await apiClient<WalletTransactionsResult>(
        `/api/wallet/transactions?page=${page}&size=10`,
      );
      setTransactions(Array.isArray(result?.data) ? result.data : []);
      setTxTotalPages(result?.meta?.totalPages || 1);
      setTxPage(result?.meta?.currentPage || page);
    } catch (err) {
      setTransactions([]);
      setTxError(
        err instanceof ApiError ? err.message : 'Gagal memuat riwayat transaksi.',
      );
    } finally {
      setTxLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTransactions(1);
  }, [loadTransactions]);

  async function handleTopup() {
    const numeric = Number(amount);
    if (!numeric || numeric < MIN_TOPUP) {
      setFormError(`Minimum topup ${formatCurrency(MIN_TOPUP, 'IDR')}`);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const result = await apiClient<{ checkoutUrl: string }>(
        '/api/wallet/topup',
        {
          method: 'POST',
          body: JSON.stringify({ amount: numeric }),
        },
      );
      window.location.href = result.checkoutUrl;
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Gagal memulai topup. Coba lagi.',
      );
      setSubmitting(false);
    }
  }

  async function handleSubscribe() {
    if (!selectedPlanId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await apiClient('/api/subscriptions/subscribe', {
        method: 'POST',
        body: JSON.stringify({ planId: selectedPlanId }),
      });
      setSubscribeOpen(false);
      setSelectedPlanId(null);
      await loadAll();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : 'Gagal berlangganan. Cek saldo lalu coba lagi.',
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!currentSubscription) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await apiClient(
        `/api/subscriptions/${currentSubscription.id}/cancel`,
        {
          method: 'POST',
          body: JSON.stringify({ cancelAtPeriodEnd: true }),
        },
      );
      setCancelOpen(false);
      await loadAll();
      if (currentSubscription?.id) {
        await loadHistory(currentSubscription.id);
      }
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : 'Gagal membatalkan langganan. Coba lagi.',
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleChangePlan() {
    if (!changePlanSelectedId || !currentSubscription) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await apiClient(
        `/api/subscriptions/${currentSubscription.id}/change-plan`,
        {
          method: 'POST',
          body: JSON.stringify({ planId: changePlanSelectedId }),
        },
      );
      setChangePlanOpen(false);
      setChangePlanSelectedId(null);
      await loadAll();
      await loadHistory(currentSubscription.id);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : 'Gagal mengubah plan. Cek saldo lalu coba lagi.',
      );
    } finally {
      setActionLoading(false);
    }
  }

  const currentPlan = currentSubscription
    ? planById.get(currentSubscription.planId)
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Tagihan & Langganan
          </h1>
          <p className="text-sm text-default-500">
            Kelola saldo dan langganan Bagdja Website Builder Anda.
          </p>
        </div>
        <Button
          isIconOnly
          variant="light"
          onPress={async () => {
            setRefreshing(true);
            await loadAll();
            setRefreshing(false);
          }}
        >
          <IconRefresh
            className="h-4 w-4"
            spin={refreshing}
          />
        </Button>
      </div>

      {postPaymentBanner && (
        <div
          className={[
            'relative rounded-lg border px-4 py-3 text-sm',
            postPaymentBanner.tone === 'success'
              ? 'border-success-200 bg-success-50 text-success-700'
              : postPaymentBanner.tone === 'danger'
                ? 'border-danger-200 bg-danger-50 text-danger-700'
                : 'border-primary-200 bg-primary-50 text-primary-700',
          ].join(' ')}
          role="status"
        >
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => setPostPaymentBanner(null)}
            className="absolute right-2 top-2 rounded-md p-1 text-current opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth={2}
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <div className="pr-7">
            <p className="font-semibold">{postPaymentBanner.title}</p>
            {postPaymentBanner.subtitle && (
              <p className="mt-1 opacity-90">{postPaymentBanner.subtitle}</p>
            )}
          </div>
        </div>
      )}
      {actionError && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {actionError}
        </div>
      )}
      {loadError && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconWallet className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Saldo</span>
            </div>
            {wallet && (
              <Chip size="sm" color={wallet.is_active ? 'success' : 'default'}>
                {wallet.is_active ? 'Aktif' : 'Nonaktif'}
              </Chip>
            )}
          </CardHeader>
          <CardBody className="space-y-4">
            {loading ? (
              <LoadingSpinner className="h-20" />
            ) : (
              <>
                <div>
                  <p className="text-xs text-default-500">Saldo tersedia</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(
                      wallet?.balance ?? 0,
                      wallet?.currency_code ?? 'IDR',
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-default-500">
                    Dana ditahan (escrow, belum bisa ditarik)
                  </p>
                  <p className="text-lg font-semibold text-warning-600">
                    {formatCurrency(
                      wallet?.held_balance ?? 0,
                      wallet?.currency_code ?? 'IDR',
                    )}
                  </p>
                </div>
                <Button color="primary" onPress={() => setTopupOpen(true)}>
                  Topup
                </Button>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Plan</span>
            {currentSubscription && (
              <Chip
                size="sm"
                color={STATUS_COLOR[currentSubscription.status] || 'default'}
                variant="flat"
              >
                {currentSubscription.status}
              </Chip>
            )}
          </CardHeader>
          <CardBody className="space-y-4">
            {loading ? (
              <LoadingSpinner className="h-20" />
            ) : currentSubscription ? (
              <>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {currentPlan?.name || 'Plan'}
                  </p>
                  {currentPlan && (
                    <p className="text-sm text-default-500">
                      {formatCurrency(currentPlan.price, currentPlan.currency)}{' '}
                      {formatInterval(
                        currentPlan.billingInterval,
                        currentPlan.intervalCount,
                      )}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-default-500">Periode berjalan</p>
                    <p className="text-foreground">
                      {formatDate(currentSubscription.currentPeriodStart)}
                      <br />→ {formatDate(currentSubscription.currentPeriodEnd)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-default-500">Tagihan berikutnya</p>
                    <p className="text-foreground">
                      {currentSubscription.cancelAtPeriodEnd
                        ? 'Dibatalkan di akhir periode'
                        : formatDate(currentSubscription.nextBillingDate)}
                    </p>
                  </div>
                </div>
                {currentSubscription.status === 'PAST_DUE' && (
                  <p className="text-xs text-warning-600">
                    Pembayaran gagal. Retry{' '}
                    {formatDate(currentSubscription.nextRetryAt)} — pastikan
                    saldo cukup.
                  </p>
                )}
                {currentSubscription.status === 'SUSPENDED' && (
                  <p className="text-xs text-danger-600">
                    Langganan ditangguhkan karena gagal bayar berulang. Topup
                    saldo lalu berlangganan ulang.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {BLOCKING_STATUSES.has(currentSubscription.status) &&
                    !currentSubscription.cancelAtPeriodEnd && (
                      <Button
                        color="danger"
                        variant="flat"
                        onPress={() => setCancelOpen(true)}
                      >
                        Batalkan di akhir periode
                      </Button>
                    )}
                  {currentSubscription.cancelAtPeriodEnd &&
                    BLOCKING_STATUSES.has(currentSubscription.status) && (
                      <Chip size="sm" color="warning" variant="flat">
                        Akan berhenti{' '}
                        {formatDate(currentSubscription.currentPeriodEnd)}
                      </Chip>
                    )}
                  {BLOCKING_STATUSES.has(currentSubscription.status) && (
                    <Button
                      color="primary"
                      variant="flat"
                      onPress={() => {
                        setChangePlanSelectedId(
                          plans.find(
                            (p) => p.id !== currentSubscription.planId,
                          )?.id ?? null,
                        );
                        setChangePlanOpen(true);
                      }}
                    >
                      Ubah ke plan lain
                    </Button>
                  )}
                  {canSubscribe && (
                    <Button
                      color="primary"
                      variant="flat"
                      onPress={() => {
                        setSelectedPlanId(plans[0]?.id ?? null);
                        setSubscribeOpen(true);
                      }}
                    >
                      Pilih plan baru
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-default-500">
                  Belum berlangganan. Pilih plan untuk mulai — biaya dipotong
                  langsung dari saldo.
                </p>
                <Button
                  color="primary"
                  isDisabled={plans.length === 0}
                  onPress={() => {
                    setSelectedPlanId(plans[0]?.id ?? null);
                    setSubscribeOpen(true);
                  }}
                >
                  {plans.length === 0 ? 'Belum ada plan tersedia' : 'Pilih Plan'}
                </Button>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col items-start gap-3">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
            {(
              [
                { key: 'subscription' as const, label: 'Riwayat Subscription' },
                { key: 'transactions' as const, label: 'Riwayat Transaksi' },
              ]
            ).map((tab) => {
              const active = historyTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setHistoryTab(tab.key)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    active
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/25'
                      : 'bg-white text-default-600 ring-1 ring-default-200 hover:bg-default-50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardBody>
          {historyTab === 'subscription' ? (
            !currentSubscription ? (
              <p className="text-sm text-default-500">
                Riwayat akan muncul setelah Anda berlangganan.
              </p>
            ) : historyError ? (
              <p className="text-sm text-danger">{historyError}</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-default-500">Belum ada percobaan tagihan.</p>
            ) : (
              <>
                <div className="hidden sm:block">
                  <Table
                    aria-label="Riwayat pembayaran subscription"
                    removeWrapper
                  >
                    <TableHeader>
                      <TableColumn>WAKTU</TableColumn>
                      <TableColumn>JENIS</TableColumn>
                      <TableColumn>JUMLAH</TableColumn>
                      <TableColumn>STATUS</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {history.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{formatDate(row.attemptedAt)}</TableCell>
                          <TableCell>{row.kind}</TableCell>
                          <TableCell>
                            {formatCurrency(row.amount, row.currency)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="sm"
                              variant="flat"
                              color={
                                row.status === 'SUCCEEDED'
                                  ? 'success'
                                  : row.status === 'FAILED'
                                    ? 'danger'
                                    : 'default'
                              }
                            >
                              {row.status}
                              {row.failureReason ? ` · ${row.failureReason}` : ''}
                            </Chip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-2 sm:hidden">
                  {history.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-lg border border-default-200 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {row.kind}
                        </span>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={
                            row.status === 'SUCCEEDED'
                              ? 'success'
                              : row.status === 'FAILED'
                                ? 'danger'
                                : 'default'
                          }
                        >
                          {row.status}
                        </Chip>
                      </div>
                      {row.failureReason && (
                        <p className="mt-1 text-xs text-danger-600">
                          {row.failureReason}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-default-500">
                          {formatDate(row.attemptedAt)}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(row.amount, row.currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : (
            <div className="space-y-3">
              {txLoading ? (
                <LoadingSpinner className="h-20" />
              ) : txError ? (
                <p className="text-sm text-danger">{txError}</p>
              ) : transactions.length === 0 ? (
                <p className="text-sm text-default-500">
                  Belum ada mutasi saldo.
                </p>
              ) : (
                <>
                  <div className="hidden sm:block">
                    <Table aria-label="Riwayat mutasi saldo" removeWrapper>
                      <TableHeader>
                        <TableColumn>WAKTU</TableColumn>
                        <TableColumn>JENIS</TableColumn>
                        <TableColumn>KETERANGAN</TableColumn>
                        <TableColumn>JUMLAH</TableColumn>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((row) => {
                          const isCredit = Number(row.amount) >= 0;
                          const feeNote = formatWalletTransactionFeeNote(row.type, row.metadata);
                          return (
                            <TableRow key={row.id}>
                              <TableCell>{formatDate(row.created_at)}</TableCell>
                              <TableCell>{formatWalletTransactionType(row.type)}</TableCell>
                              <TableCell>{feeNote || row.description || '—'}</TableCell>
                              <TableCell>
                                <span
                                  className={
                                    isCredit
                                      ? 'font-medium text-success-600'
                                      : 'font-medium text-danger-600'
                                  }
                                >
                                  {isCredit ? '+' : '-'}
                                  {formatCurrency(
                                    Math.abs(Number(row.amount)),
                                    row.currency || 'IDR',
                                  )}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="space-y-2 sm:hidden">
                    {transactions.map((row) => {
                      const isCredit = Number(row.amount) >= 0;
                      const feeNote = formatWalletTransactionFeeNote(row.type, row.metadata);
                      return (
                        <div
                          key={row.id}
                          className="rounded-lg border border-default-200 px-3 py-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {formatWalletTransactionType(row.type)}
                              </p>
                              {feeNote ? (
                                <p className="mt-0.5 text-xs text-default-500">{feeNote}</p>
                              ) : (
                                row.description && (
                                  <p className="mt-0.5 truncate text-xs text-default-500">
                                    {row.description}
                                  </p>
                                )
                              )}
                            </div>
                            <span
                              className={`shrink-0 text-sm font-semibold ${
                                isCredit ? 'text-success-600' : 'text-danger-600'
                              }`}
                            >
                              {isCredit ? '+' : '-'}
                              {formatCurrency(
                                Math.abs(Number(row.amount)),
                                row.currency || 'IDR',
                              )}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-default-500">
                            {formatDate(row.created_at)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  {txTotalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        size="sm"
                        variant="flat"
                        isDisabled={txPage <= 1}
                        onPress={() => void loadTransactions(txPage - 1)}
                      >
                        Sebelumnya
                      </Button>
                      <span className="text-xs text-default-500">
                        Halaman {txPage} dari {txTotalPages}
                      </span>
                      <Button
                        size="sm"
                        variant="flat"
                        isDisabled={txPage >= txTotalPages}
                        onPress={() => void loadTransactions(txPage + 1)}
                      >
                        Berikutnya
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <AppModal
        isOpen={topupOpen}
        onClose={() => {
          setTopupOpen(false);
          setAmount('');
          setFormError(null);
        }}
        title="Topup Saldo"
        footer={
          <>
            <Button variant="flat" onPress={() => setTopupOpen(false)}>
              Batal
            </Button>
            <Button
              color="primary"
              isLoading={submitting}
              onPress={handleTopup}
            >
              Lanjut ke Pembayaran
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="topup-amount"
              className="block text-sm font-medium text-foreground"
            >
              Jumlah Topup <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-medium text-default-400">
                Rp
              </span>
              <input
                id="topup-amount"
                type="number"
                inputMode="numeric"
                min={MIN_TOPUP}
                step={1000}
                placeholder="Contoh: 50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block w-full rounded-lg border border-default-200 bg-background pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-default-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            {formError ? (
              <p className="text-sm text-danger">{formError}</p>
            ) : (
              <p className="text-xs text-default-400">
                Minimum topup {formatCurrency(MIN_TOPUP, 'IDR')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-default-400">
              Pilih Cepat
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[100000, 500000, 1000000, 2000000, 5000000, 10000000].map(
                (preset) => {
                  const selected = Number(amount) === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(preset))}
                      className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                        selected
                          ? 'border-primary bg-primary-50 text-primary'
                          : 'border-default-200 bg-background text-foreground hover:border-default-400 hover:bg-default-50'
                      }`}
                    >
                      {formatCurrency(preset, 'IDR', 0)}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        </div>
      </AppModal>

      <AppModal
        isOpen={subscribeOpen}
        onClose={() => {
          setSubscribeOpen(false);
          setSelectedPlanId(null);
        }}
        title="Pilih Plan"
        size="lg"
        footer={
          <>
            <Button variant="flat" onPress={() => setSubscribeOpen(false)}>
              Batal
            </Button>
            <Button
              color="primary"
              isLoading={actionLoading}
              isDisabled={!selectedPlanId}
              onPress={handleSubscribe}
            >
              Berlangganan sekarang
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-default-500">
            Biaya dipotong langsung dari saldo personal Anda. Pastikan saldo
            cukup sebelum lanjut.
          </p>
          {plans.length > 0 ? (
            <>
              {['MONTHLY', 'YEARLY'].map((interval) => {
                const intervalPlans = plans.filter(
                  (p) => p.billingInterval === interval,
                );
                if (intervalPlans.length === 0) return null;

                const intervalLabel =
                  interval === 'MONTHLY' ? 'Bulanan' : 'Tahunan';

                return (
                  <div key={interval}>
                    <p className="mb-2 text-xs font-semibold uppercase text-default-400">
                      {intervalLabel}
                    </p>
                    <div className="space-y-2">
                      {intervalPlans.map((plan) => {
                        const selected = selectedPlanId === plan.id;
                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => setSelectedPlanId(plan.id)}
                            className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                              selected
                                ? 'border-primary bg-primary-50'
                                : 'border-default-200 hover:border-default-400'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-foreground">
                                  {plan.name}
                                </p>
                                {plan.description && (
                                  <p className="mt-1 text-xs text-default-500">
                                    {plan.description}
                                  </p>
                                )}
                              </div>
                              <p className="shrink-0 font-semibold text-foreground">
                                {formatCurrency(plan.price, plan.currency)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <p className="text-sm text-default-500">
              Belum ada plan aktif. Hubungi admin Bagdja untuk mengaktifkan
              paket.
            </p>
          )}
        </div>
      </AppModal>

      <AppModal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Batalkan Langganan"
        footer={
          <>
            <Button variant="flat" onPress={() => setCancelOpen(false)}>
              Tetap berlangganan
            </Button>
            <Button
              color="danger"
              isLoading={actionLoading}
              onPress={handleCancel}
            >
              Ya, batalkan di akhir periode
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-sm text-default-600">
          <p>
            Langganan tetap aktif sampai{' '}
            <strong>{formatDate(currentSubscription?.currentPeriodEnd)}</strong>,
            lalu otomatis berhenti. Tidak ada pengembalian sisa periode.
          </p>
          <p>Tagihan otomatis berikutnya tidak akan dipotong.</p>
        </div>
      </AppModal>

      <AppModal
        isOpen={changePlanOpen}
        onClose={() => {
          setChangePlanOpen(false);
          setChangePlanSelectedId(null);
        }}
        title="Ubah ke Plan Lain"
        size="lg"
        footer={
          <>
            <Button variant="flat" onPress={() => setChangePlanOpen(false)}>
              Batal
            </Button>
            <Button
              color="primary"
              isLoading={actionLoading}
              isDisabled={!changePlanSelectedId}
              onPress={handleChangePlan}
            >
              Ubah plan sekarang
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-info-50 px-4 py-3">
            <p className="text-xs text-info-700">
              💡 <strong>Proration:</strong> Biaya disesuaikan dengan sisa
              periode plan saat ini. Jika upgrade, biaya tambahan dipotong dari
              saldo. Jika downgrade, saldo dikreditkan (tanpa refund tunai).
            </p>
          </div>

          {currentPlan && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-default-400">
                Plan Saat Ini
              </p>
              <div className="rounded-lg border-2 border-primary bg-primary-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">
                      {currentPlan.name}
                    </p>
                    {currentPlan.description && (
                      <p className="mt-1 text-xs text-default-500">
                        {currentPlan.description}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 font-semibold text-foreground">
                    {formatCurrency(currentPlan.price, currentPlan.currency)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {plans.length > 0 ? (
            <>
              {['MONTHLY', 'YEARLY'].map((interval) => {
                const intervalPlans = plans.filter(
                  (p) =>
                    p.billingInterval === interval &&
                    p.id !== currentSubscription?.planId,
                );
                if (intervalPlans.length === 0) return null;

                const intervalLabel =
                  interval === 'MONTHLY' ? 'Bulanan' : 'Tahunan';

                return (
                  <div key={interval}>
                    <p className="mb-2 text-xs font-semibold uppercase text-default-400">
                      {intervalLabel}
                    </p>
                    <div className="space-y-2">
                      {intervalPlans.map((plan) => {
                        const selected = changePlanSelectedId === plan.id;
                        const currentPrice = currentPlan?.price ?? 0;
                        const newPrice = plan.price;
                        const priceDiff = newPrice - currentPrice;
                        const isUpgrade = priceDiff > 0;

                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => setChangePlanSelectedId(plan.id)}
                            className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                              selected
                                ? 'border-primary bg-primary-50'
                                : 'border-default-200 hover:border-default-400'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className="font-semibold text-foreground">
                                  {plan.name}
                                </p>
                                {plan.description && (
                                  <p className="mt-1 text-xs text-default-500">
                                    {plan.description}
                                  </p>
                                )}
                                {priceDiff !== 0 && (
                                  <p
                                    className={`mt-2 text-xs font-medium ${
                                      isUpgrade
                                        ? 'text-warning-600'
                                        : 'text-success-600'
                                    }`}
                                  >
                                    {isUpgrade ? '⬆ Upgrade' : '⬇ Downgrade'} ·{' '}
                                    {isUpgrade ? '+' : ''}
                                    {formatCurrency(priceDiff, plan.currency)} /
                                    periode
                                  </p>
                                )}
                              </div>
                              <p className="shrink-0 font-semibold text-foreground">
                                {formatCurrency(plan.price, plan.currency)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <p className="text-sm text-default-500">
              Belum ada plan aktif. Hubungi admin Bagdja untuk mengaktifkan
              paket.
            </p>
          )}
        </div>
      </AppModal>
    </div>
  );
}


/**
 * Wrapper + Suspense boundary untuk `useSearchParams` — wajib di Next.js
 * App Router (error "useSearchParams() should be wrapped in a suspense
 * boundary" saat prerender/deploy Vercel, karena hook ini butuh CSR bailout).
 * Fallback pakai LoadingSpinner yang sudah ada.
 */
export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <LoadingSpinner className="h-10" />
        </div>
      }
    >
      <BillingPageContent />
    </Suspense>
  );
}
