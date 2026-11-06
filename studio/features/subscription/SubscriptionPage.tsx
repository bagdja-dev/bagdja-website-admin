'use client';

import { Button, Card, CardBody, Chip, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Switch } from '@heroui/react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  cancelSubscriptionAtPeriodEnd,
  changeSubscriptionPlan,
  fetchMySubscriptions,
  fetchSubscriptionBillingHistory,
  fetchSubscriptionPlans,
  fetchSubscriptionWallet,
  resumeSubscription,
  RUNNING_SUBSCRIPTION_STATUSES,
  subscribeToPlan,
  type SubscriptionBillingAttemptDto,
  type SubscriptionPlanDto,
  type UserSubscriptionDto,
} from '@/studio/api/subscription';
import { errorMessage, formatWalletCurrency, formatWalletDate } from '@/studio/api/wallet';
import { Icon } from '@/studio/ui/icons';
import { EmptyState } from '@/studio/ui/primitives/EmptyState';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';
import { useIsOwner } from '@/studio/stores/role';

const REACTIVATABLE_STATUSES = new Set(['ACTIVE', 'PAST_DUE', 'TRIALING']);
const PERIOD_ORDER = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const PERIOD_LABELS: Record<string, string> = {
  DAILY: 'Harian',
  WEEKLY: 'Mingguan',
  MONTHLY: 'Bulanan',
  YEARLY: 'Tahunan',
};

function intervalLabel(interval: string, count: number): string {
  const unit: Record<string, string> = {
    DAILY: 'hari',
    WEEKLY: 'minggu',
    MONTHLY: 'bulan',
    YEARLY: 'tahun',
  };
  const label = unit[interval] ?? interval.toLowerCase();
  return count === 1 ? `/${label}` : `/${count} ${label}`;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: 'Aktif',
    PAST_DUE: 'Pembayaran tertunda',
    TRIALING: 'Uji coba',
    SUSPENDED: 'Ditangguhkan',
    CANCELLED: 'Dibatalkan',
    EXPIRED: 'Berakhir',
  };
  return labels[status] ?? status;
}

function statusClass(status: string): string {
  if (status === 'ACTIVE' || status === 'TRIALING') return 'bg-emerald-50 text-emerald-700';
  if (status === 'PAST_DUE') return 'bg-amber-50 text-amber-700';
  if (status === 'SUSPENDED') return 'bg-rose-50 text-rose-700';
  return 'bg-zinc-100 text-zinc-600';
}

function featureRows(features: Record<string, unknown> | null): string[] {
  if (!features) return [];
  return Object.entries(features).flatMap(([key, value]) => {
    if (value === false || value === null || value === undefined) return [];
    const label = key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
    if (value === true) return [label];
    if (typeof value === 'string' || typeof value === 'number') return [`${label}: ${value}`];
    return [];
  }).slice(0, 5);
}

function StatusPill({ status }: { status: string }) {
  return (
    <Chip size="sm" className={`h-6 font-semibold ${statusClass(status)}`}>
      {statusLabel(status)}
    </Chip>
  );
}

export function SubscriptionPage() {
  const isOwner = useIsOwner();
  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscriptionDto[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [history, setHistory] = useState<SubscriptionBillingAttemptDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('MONTHLY');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanDto | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const currentSubscription = useMemo(
    () => subscriptions.find((item) => RUNNING_SUBSCRIPTION_STATUSES.has(item.status)) ?? null,
    [subscriptions],
  );
  const currentPlan = useMemo(
    () => plans.find((plan) => plan.id === currentSubscription?.planId) ?? null,
    [currentSubscription, plans],
  );
  const canChangePlan = currentSubscription
    ? ['ACTIVE', 'PAST_DUE'].includes(currentSubscription.status)
    : false;
  const autoRenewEnabled = Boolean(
    currentSubscription &&
    REACTIVATABLE_STATUSES.has(currentSubscription.status) &&
    !currentSubscription.cancelAtPeriodEnd,
  );
  const availablePeriods = useMemo(() => {
    const periods = Array.from(new Set(plans.map((plan) => plan.billingInterval)));
    return periods.sort((left, right) => {
      const leftOrder = PERIOD_ORDER.indexOf(left);
      const rightOrder = PERIOD_ORDER.indexOf(right);
      if (leftOrder === -1) return rightOrder === -1 ? left.localeCompare(right) : 1;
      if (rightOrder === -1) return -1;
      return leftOrder - rightOrder;
    });
  }, [plans]);
  const activePeriod = availablePeriods.includes(selectedPeriod)
    ? selectedPeriod
    : availablePeriods[0] ?? 'MONTHLY';
  const visiblePlans = plans.filter((plan) => plan.billingInterval === activePeriod);

  const loadPage = useCallback(async () => {
    setLoadError('');
    setActionError('');
    try {
      const [planRows, subscriptionRows, wallet] = await Promise.all([
        fetchSubscriptionPlans(),
        fetchMySubscriptions(),
        fetchSubscriptionWallet(),
      ]);
      const nextPlans = Array.isArray(planRows) ? planRows : [];
      const nextSubscriptions = Array.isArray(subscriptionRows) ? subscriptionRows : [];
      const active = nextSubscriptions.find((item) => RUNNING_SUBSCRIPTION_STATUSES.has(item.status));
      setPlans(nextPlans);
      setSubscriptions(nextSubscriptions);
      setWalletBalance(Number(wallet.balance));
      setHistoryError('');
      if (active) {
        try {
          const attempts = await fetchSubscriptionBillingHistory(active.id);
          setHistory(Array.isArray(attempts) ? attempts : []);
        } catch (error) {
          setHistory([]);
          setHistoryError(errorMessage(error, 'Gagal memuat riwayat tagihan.'));
        }
      } else {
        setHistory([]);
      }
    } catch (error) {
      setLoadError(errorMessage(error, 'Gagal memuat informasi langganan.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) void loadPage();
  }, [isOwner, loadPage]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadPage();
    setRefreshing(false);
  }, [loadPage]);

  const handleSelectPlan = useCallback(async () => {
    if (!selectedPlan) return;
    setActionLoading(true);
    setActionError('');
    try {
      if (currentSubscription) {
        await changeSubscriptionPlan(currentSubscription.id, selectedPlan.id);
      } else {
        await subscribeToPlan(selectedPlan.id);
      }
      setSelectedPlan(null);
      await loadPage();
    } catch (error) {
      setActionError(errorMessage(error, 'Gagal memperbarui paket. Periksa saldo lalu coba lagi.'));
    } finally {
      setActionLoading(false);
    }
  }, [currentSubscription, loadPage, selectedPlan]);

  const handleRenewalChange = useCallback(async (enabled: boolean) => {
    if (!currentSubscription) return;
    if (!enabled) {
      setCancelOpen(true);
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      await resumeSubscription(currentSubscription.id);
      await loadPage();
    } catch (error) {
      setActionError(errorMessage(error, 'Gagal mengaktifkan kembali perpanjangan otomatis.'));
    } finally {
      setActionLoading(false);
    }
  }, [currentSubscription, loadPage]);

  const handleCancelRenewal = useCallback(async () => {
    if (!currentSubscription) return;
    setActionLoading(true);
    setActionError('');
    try {
      await cancelSubscriptionAtPeriodEnd(currentSubscription.id);
      setCancelOpen(false);
      await loadPage();
    } catch (error) {
      setActionError(errorMessage(error, 'Gagal mematikan perpanjangan otomatis.'));
    } finally {
      setActionLoading(false);
    }
  }, [currentSubscription, loadPage]);

  if (!isOwner) {
    return (
      <EmptyState
        title="Halaman ini hanya untuk pemilik akun"
        description="Paket langganan dikelola oleh pemilik akun Bagdja."
        icon="subscription"
        compact
      />
    );
  }

  const actionLabel = currentSubscription ? 'Ganti paket' : 'Pilih paket';

  return (
    <>
      <PageHeader
        title="Langganan"
        description="Paket Bagdja yang kamu gunakan bersama untuk semua website."
        actions={
          <Button size="sm" variant="bordered" isLoading={refreshing} onPress={() => void refresh()}>
            <Icon name="refresh" size={16} />
            Perbarui
          </Button>
        }
      />

      <div className="-mx-3 -mt-3 -mb-8 min-h-[calc(100vh-5rem)] bg-[#faf9f5] px-3 py-5 sm:-mx-8 sm:-mt-5 sm:px-8 sm:py-7">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5">
          {loadError && (
            <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
              {loadError}
            </div>
          )}
          {actionError && (
            <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
              {actionError}
            </div>
          )}

          <section aria-label="Paket aktif" className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="overflow-hidden rounded-[18px] border border-[#e5e2dc] bg-white shadow-sm">
              <CardBody className="flex flex-col justify-between gap-5 p-5 sm:p-6">
                {loading ? (
                  <div className="space-y-3" aria-label="Memuat langganan">
                    <div className="h-4 w-24 animate-pulse rounded bg-default-100" />
                    <div className="h-8 w-40 animate-pulse rounded bg-default-100" />
                    <div className="h-4 w-64 max-w-full animate-pulse rounded bg-default-100" />
                  </div>
                ) : currentSubscription ? (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-zinc-600">Paket aktif</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <h2 className="text-2xl font-extrabold tracking-tight text-[#18181b]">
                            {currentPlan?.name ?? 'Paket langganan'}
                          </h2>
                          <StatusPill status={currentSubscription.status} />
                        </div>
                        <p className="mt-1 text-sm text-zinc-600">
                          {formatWalletCurrency(currentSubscription.lockedAmount, currentSubscription.currency)}
                          {' '}{currentPlan ? intervalLabel(currentPlan.billingInterval, currentPlan.intervalCount) : ''}
                          {' · '}berikutnya {formatWalletDate(currentSubscription.nextBillingDate)}
                        </p>
                      </div>
                      {canChangePlan && (
                        <a href="#pilihan-paket" className="text-sm font-bold text-[#7a1e48] hover:text-[#641838]">
                          Ganti paket
                        </a>
                      )}
                    </div>
                    {currentSubscription.status === 'PAST_DUE' && (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        Pembayaran tertunda. Pastikan saldo cukup untuk percobaan berikutnya
                        {currentSubscription.nextRetryAt ? ` pada ${formatWalletDate(currentSubscription.nextRetryAt)}` : ''}.
                      </p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                      <div>
                        <p className="text-sm font-bold text-zinc-800">Perpanjang otomatis</p>
                        <p className="mt-0.5 text-xs text-zinc-600">
                          Dibayar dari{' '}
                          <Link href="/studio/wallet" className="font-bold text-[#7a1e48] hover:text-[#641838]">
                            Saldo
                          </Link>
                          {walletBalance !== null ? ` · tersedia ${formatWalletCurrency(walletBalance, currentSubscription.currency)}` : ''}
                        </p>
                        {currentSubscription.cancelAtPeriodEnd && (
                          <p className="mt-1 text-xs font-medium text-amber-700">
                            Paket akan berhenti pada {formatWalletDate(currentSubscription.currentPeriodEnd)}.
                          </p>
                        )}
                      </div>
                      <Switch
                        size="sm"
                        aria-label="Perpanjang otomatis"
                        isSelected={autoRenewEnabled}
                        isDisabled={actionLoading || !REACTIVATABLE_STATUSES.has(currentSubscription.status)}
                        onValueChange={(enabled) => void handleRenewalChange(enabled)}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-zinc-600">Paket aktif</p>
                      <h2 className="mt-1 text-xl font-extrabold text-[#18181b]">Belum ada langganan aktif</h2>
                      <p className="mt-1 text-sm text-zinc-600">Pilih paket yang sesuai untuk mulai menggunakan fitur Bagdja.</p>
                    </div>
                    <a href="#pilihan-paket" className="text-sm font-bold text-[#7a1e48] hover:text-[#641838]">
                      Lihat pilihan paket
                    </a>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card className="rounded-[18px] border border-[#e5e2dc] bg-white shadow-sm">
              <CardBody className="flex flex-col justify-between gap-4 p-5 sm:p-6">
                <div>
                  <p className="text-sm font-semibold text-zinc-600">Pembayaran paket</p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#18181b]">
                    {loading || walletBalance === null ? '—' : formatWalletCurrency(walletBalance)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">Saldo tersedia untuk tagihan dan perpanjangan paket.</p>
                </div>
                <Link
                  href="/studio/wallet"
                  className="inline-flex w-fit items-center gap-1 text-sm font-bold text-[#7a1e48] hover:text-[#641838]"
                >
                  Kelola saldo <Icon name="chevronDown" size={15} className="-rotate-90" />
                </Link>
              </CardBody>
            </Card>
          </section>

          <section id="pilihan-paket" className="scroll-mt-5">
            <div className="mb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-[#18181b]">Pilihan paket</h2>
                  <p className="mt-1 text-sm text-zinc-600">Paket berlaku untuk semua website pada akun ini.</p>
                </div>
                {!loading && availablePeriods.length > 1 && (
                  <div
                    className="inline-flex w-fit rounded-xl border border-zinc-200 bg-white p-1"
                    role="tablist"
                    aria-label="Periode paket"
                  >
                    {availablePeriods.map((period) => {
                      const selected = activePeriod === period;
                      const label = PERIOD_LABELS[period] ?? period;
                      return (
                        <button
                          key={period}
                          id={`subscription-period-${period.toLowerCase()}`}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          aria-controls="subscription-plan-list"
                          onClick={() => setSelectedPeriod(period)}
                          className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                            selected
                              ? 'bg-[#7a1e48] text-white shadow-sm'
                              : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-56 animate-pulse rounded-[18px] border border-zinc-200 bg-white" />
                ))}
              </div>
            ) : availablePeriods.length === 0 ? (
              <EmptyState
                title="Belum ada paket tersedia"
                description="Paket langganan belum dapat dimuat. Coba perbarui halaman beberapa saat lagi."
                icon="subscription"
                compact
              />
            ) : visiblePlans.length === 0 ? (
              <EmptyState
                title="Belum ada paket untuk periode ini"
                description="Pilih periode lainnya untuk melihat paket yang tersedia."
                icon="subscription"
                compact
              />
            ) : (
              <div
                id="subscription-plan-list"
                role={availablePeriods.length > 1 ? 'tabpanel' : undefined}
                aria-labelledby={availablePeriods.length > 1 ? `subscription-period-${activePeriod.toLowerCase()}` : undefined}
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              >
                {visiblePlans.map((plan) => {
                  const isCurrent = currentSubscription?.planId === plan.id;
                  const unavailable = Boolean(currentSubscription && !canChangePlan && !isCurrent);
                  const features = featureRows(plan.features);
                  return (
                    <Card
                      key={plan.id}
                      className={`rounded-[18px] border bg-white shadow-sm ${
                        isCurrent ? 'border-[#7a1e48] ring-1 ring-[#7a1e48]' : 'border-[#e5e2dc]'
                      }`}
                    >
                      <CardBody className="flex h-full flex-col gap-4 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-extrabold text-[#18181b]">{plan.name}</h3>
                            {plan.description && <p className="mt-1 text-sm leading-relaxed text-zinc-600">{plan.description}</p>}
                          </div>
                          {isCurrent && <Chip size="sm" className="shrink-0 bg-[#fbf2f6] font-semibold text-[#7a1e48]">Paket kamu</Chip>}
                        </div>
                        <p className="text-xl font-extrabold text-[#18181b]">
                          {formatWalletCurrency(plan.price, plan.currency)}
                          <span className="ml-1 text-xs font-medium text-zinc-500">{intervalLabel(plan.billingInterval, plan.intervalCount)}</span>
                        </p>
                        {features.length > 0 && (
                          <ul className="flex-1 space-y-2 border-t border-zinc-100 pt-3">
                            {features.map((feature) => (
                              <li key={feature} className="flex items-start gap-2 text-sm text-zinc-700">
                                <Icon name="check" size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <Button
                          className={isCurrent ? 'font-semibold' : 'bg-[#7a1e48] font-bold text-white hover:bg-[#641838]'}
                          variant={isCurrent ? 'bordered' : 'solid'}
                          isDisabled={isCurrent || unavailable || (Boolean(currentSubscription) && !canChangePlan)}
                          onPress={() => setSelectedPlan(plan)}
                        >
                          {isCurrent ? 'Paket kamu' : unavailable ? 'Tidak tersedia saat ini' : actionLabel}
                        </Button>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <Card className="overflow-hidden rounded-[18px] border border-[#e5e2dc] bg-white shadow-sm">
            <CardBody className="p-0">
              <div className="border-b border-zinc-100 px-4 py-4 sm:px-5">
                <h2 className="text-base font-extrabold text-[#18181b]">Riwayat tagihan langganan</h2>
                <p className="mt-1 text-sm text-zinc-600">Tagihan dari langganan aktif.</p>
              </div>
              {historyError ? (
                <p className="px-5 py-6 text-sm text-danger" role="alert">{historyError}</p>
              ) : loading ? (
                <div className="space-y-3 px-5 py-5" aria-label="Memuat riwayat tagihan">
                  {[0, 1, 2].map((item) => <div key={item} className="h-10 animate-pulse rounded bg-default-100" />)}
                </div>
              ) : !currentSubscription ? (
                <EmptyState
                  title="Belum ada riwayat tagihan"
                  description="Riwayat akan muncul setelah kamu berlangganan."
                  icon="subscription"
                  compact
                />
              ) : history.length === 0 ? (
                <EmptyState
                  title="Belum ada percobaan tagihan"
                  description="Tagihan langganan akan tercatat di sini."
                  icon="subscription"
                  compact
                />
              ) : (
                <>
                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 text-xs font-bold uppercase tracking-wide text-zinc-500">
                        <tr>
                          <th className="px-5 py-3">Waktu</th>
                          <th className="px-5 py-3">Jenis</th>
                          <th className="px-5 py-3">Jumlah</th>
                          <th className="px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {history.slice(0, 5).map((row) => <BillingRow key={row.id} row={row} />)}
                      </tbody>
                    </table>
                  </div>
                  <ul className="divide-y divide-zinc-100 sm:hidden">
                    {history.slice(0, 5).map((row) => (
                      <li key={row.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#18181b]">{billingKind(row.kind)}</p>
                          <p className="mt-1 text-xs text-zinc-500">{formatWalletDate(row.attemptedAt)}</p>
                          {row.failureReason && <p className="mt-1 text-xs text-rose-700">{row.failureReason}</p>}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span className="text-sm font-bold text-[#18181b]">{formatWalletCurrency(row.amount, row.currency)}</span>
                          <StatusPill status={row.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal isOpen={Boolean(selectedPlan)} onOpenChange={(open) => { if (!open && !actionLoading) setSelectedPlan(null); }} placement="center">
        <ModalContent>
          <ModalHeader>{currentSubscription ? 'Konfirmasi ganti paket' : 'Konfirmasi langganan'}</ModalHeader>
          <ModalBody>
            <p className="text-sm text-zinc-700">
              {selectedPlan && (
                <>
                  {currentSubscription ? 'Ganti paket menjadi ' : 'Mulai berlangganan '}
                  <strong>{selectedPlan.name}</strong> seharga{' '}
                  <strong>{formatWalletCurrency(selectedPlan.price, selectedPlan.currency)} {intervalLabel(selectedPlan.billingInterval, selectedPlan.intervalCount)}</strong>?
                </>
              )}
            </p>
            {currentSubscription && (
              <p className="text-xs leading-relaxed text-zinc-500">
                Perubahan paket diproses sekarang. Penyesuaian biaya mengikuti sisa periode langganan dan akan menggunakan saldo akun.
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" isDisabled={actionLoading} onPress={() => setSelectedPlan(null)}>Kembali</Button>
            <Button className="bg-[#7a1e48] font-bold text-white" isLoading={actionLoading} onPress={() => void handleSelectPlan()}>
              {currentSubscription ? 'Ganti paket' : 'Berlangganan'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={cancelOpen} onOpenChange={(open) => { if (!open && !actionLoading) setCancelOpen(false); }} placement="center">
        <ModalContent>
          <ModalHeader>Matikan perpanjangan otomatis?</ModalHeader>
          <ModalBody>
            <p className="text-sm leading-relaxed text-zinc-700">
              Paket tetap aktif sampai {currentSubscription ? formatWalletDate(currentSubscription.currentPeriodEnd) : 'akhir periode berjalan'}.
              Setelah itu, paket tidak akan diperpanjang dan tidak ada tagihan berikutnya.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" isDisabled={actionLoading} onPress={() => setCancelOpen(false)}>Tetap perpanjang</Button>
            <Button color="danger" variant="flat" isLoading={actionLoading} onPress={() => void handleCancelRenewal()}>
              Matikan perpanjangan
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

function billingKind(kind: string): string {
  const labels: Record<string, string> = {
    SUBSCRIBE: 'Langganan paket',
    RENEWAL: 'Perpanjangan',
    PLAN_CHANGE: 'Perubahan paket',
  };
  return labels[kind] ?? kind;
}

function BillingRow({ row }: { row: SubscriptionBillingAttemptDto }) {
  const statusColor = row.status === 'SUCCEEDED'
    ? 'text-emerald-700'
    : row.status === 'FAILED'
      ? 'text-rose-700'
      : 'text-zinc-600';
  return (
    <tr>
      <td className="px-5 py-3.5 text-zinc-600">{formatWalletDate(row.attemptedAt)}</td>
      <td className="px-5 py-3.5 font-semibold text-zinc-800">{billingKind(row.kind)}</td>
      <td className="px-5 py-3.5 font-semibold text-zinc-800">{formatWalletCurrency(row.amount, row.currency)}</td>
      <td className={`px-5 py-3.5 font-semibold ${statusColor}`}>
        {row.status === 'SUCCEEDED' ? 'Lunas' : row.status === 'FAILED' ? `Gagal${row.failureReason ? ` · ${row.failureReason}` : ''}` : row.status}
      </td>
    </tr>
  );
}
