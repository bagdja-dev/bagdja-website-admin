'use client';

import { Button, Card, CardBody, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react';
import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  createWalletTopup,
  createWalletWithdrawalSession,
  errorMessage,
  fetchWalletBalance,
  fetchWalletTransactions,
  formatWalletCurrency,
  formatWalletDate,
  formatWalletTransactionFeeNote,
  formatWalletTransactionType,
  type WalletBalanceDto,
  type WalletTransactionDto,
} from '@/studio/api/wallet';
import { Icon } from '@/studio/ui/icons';
import { EmptyState } from '@/studio/ui/primitives/EmptyState';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';

const MIN_TOPUP = 10_000;
const TOPUP_PRESETS = [100_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000];

type ReturnNotice = { tone: 'success' | 'danger' | 'info'; title: string; description: string };
type MovementFilter = 'all' | 'income' | 'outcome' | 'escrow';

function callbackNotice(
  status: string | null,
  invoice: string | null,
  withdrawalId: string | null,
): ReturnNotice | null {
  if (status === 'success') {
    return {
      tone: 'success',
      title: 'Pembayaran berhasil!',
      description: invoice ? `Invoice ${invoice}. Memperbarui saldo dan mutasi terbaru.` : 'Memperbarui saldo dan mutasi terbaru.',
    };
  }
  if (status === 'failure') {
    return {
      tone: 'danger',
      title: 'Pembayaran gagal atau dibatalkan.',
      description: invoice ? `Invoice ${invoice}. Kamu bisa mencoba top up kembali.` : 'Kamu bisa mencoba top up kembali.',
    };
  }
  if (withdrawalId) {
    return {
      tone: 'info',
      title: 'Pengajuan penarikan berhasil dikirim.',
      description: 'Status penarikan akan diperbarui di riwayat mutasi saldo.',
    };
  }
  if (invoice) {
    return {
      tone: 'info',
      title: 'Memperbarui status pembayaran…',
      description: `Invoice ${invoice}. Saldo akan disinkronkan secara otomatis.`,
    };
  }
  return null;
}

export function WalletPage() {
  return (
    <Suspense fallback={<div className="px-4 py-8 text-sm text-default-600">Memuat Wallet…</div>}>
      <WalletPageContent />
    </Suspense>
  );
}

function WalletPageContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const invoice = searchParams.get('invoice');
  const withdrawalId = searchParams.get('withdrawalId');
  const [wallet, setWallet] = useState<WalletBalanceDto | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState('');
  const [transactions, setTransactions] = useState<WalletTransactionDto[]>([]);
  const [transactionLoading, setTransactionLoading] = useState(true);
  const [transactionError, setTransactionError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState('');
  const [movementFilter, setMovementFilter] = useState<MovementFilter>('all');
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);
  const [topupOpen, setTopupOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [topupError, setTopupError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<ReturnNotice | null>(null);
  const currency = wallet?.currency_code || 'IDR';

  const loadWallet = useCallback(async () => {
    setWalletLoading(true);
    setWalletError('');
    try {
      setWallet(await fetchWalletBalance());
    } catch (error) {
      setWalletError(errorMessage(error, 'Gagal memuat saldo wallet.'));
    } finally {
      setWalletLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async (nextPage: number, append = false) => {
    if (append) setLoadingMore(true);
    else setTransactionLoading(true);
    setTransactionError('');
    try {
      const result = await fetchWalletTransactions(nextPage);
      setTransactions((current) => (append ? [...current, ...result.data] : result.data));
      setPage(result.meta.currentPage || nextPage);
      setTotalPages(result.meta.totalPages || 1);
    } catch (error) {
      if (!append) setTransactions([]);
      setTransactionError(errorMessage(error, 'Gagal memuat riwayat mutasi saldo.'));
    } finally {
      if (append) setLoadingMore(false);
      else setTransactionLoading(false);
    }
  }, []);

  useEffect(() => {
    const noticeFromCallback = callbackNotice(status, invoice, withdrawalId);
    setNotice(noticeFromCallback);
    void loadWallet();
    void loadTransactions(1);

    if (!status && !invoice && !withdrawalId) return undefined;

    const interval = window.setInterval(() => {
      void loadWallet();
      void loadTransactions(1);
    }, 3_000);
    const timeout = window.setTimeout(() => window.clearInterval(interval), 30_000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [invoice, loadTransactions, loadWallet, status, withdrawalId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadWallet(), loadTransactions(page)]);
    setRefreshing(false);
  }, [loadTransactions, loadWallet, page]);

  const handleTopup = useCallback(async () => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < MIN_TOPUP) {
      setTopupError(`Minimum top up ${formatWalletCurrency(MIN_TOPUP)}.`);
      return;
    }

    setSubmitting(true);
    setTopupError('');
    try {
      const result = await createWalletTopup(numericAmount);
      if (!result.checkoutUrl) throw new Error('Tautan pembayaran tidak tersedia. Coba lagi.');
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setTopupError(errorMessage(error, 'Gagal memulai top up. Coba lagi.'));
      setSubmitting(false);
    }
  }, [amount]);

  const handleWithdrawal = useCallback(async () => {
    setWithdrawing(true);
    setWithdrawalError('');
    try {
      const session = await createWalletWithdrawalSession(currency);
      if (!session.url) throw new Error('Tautan penarikan tidak tersedia. Coba lagi.');
      window.location.assign(session.url);
    } catch (error) {
      setWithdrawalError(errorMessage(error, 'Gagal membuka halaman penarikan.'));
      setWithdrawing(false);
    }
  }, [currency]);

  const closeTopup = useCallback(() => {
    if (submitting) return;
    setTopupOpen(false);
    setAmount('');
    setTopupError('');
  }, [submitting]);

  const visibleTransactions = transactions.filter((transaction) => {
    if (movementFilter === 'income') return Number(transaction.amount) >= 0;
    if (movementFilter === 'outcome') return Number(transaction.amount) < 0;
    if (movementFilter === 'escrow') return transaction.type.startsWith('ESCROW_');
    return true;
  });

  return (
    <>
      <PageHeader
        title="Saldo"
        description="Saldo akun kamu — dipakai bersama untuk semua website yang kamu miliki."
        actions={
          <Button size="sm" variant="bordered" isLoading={refreshing} onPress={() => void refresh()}>
            <Icon name="refresh" size={16} />
            Perbarui
          </Button>
        }
      />

      <div className="-mx-3 -mt-3 -mb-8 min-h-[calc(100vh-5rem)] bg-[#faf9f5] px-3 py-5 sm:-mx-8 sm:-mt-5 sm:px-8 sm:py-7">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4">
          {withdrawalError && (
            <div className="rounded-[12px] border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
              {withdrawalError}
            </div>
          )}
          {notice && (
            <div
              className={`flex items-start justify-between gap-4 rounded-[14px] border px-4 py-3 text-sm ${
                notice.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : notice.tone === 'danger'
                    ? 'border-rose-200 bg-rose-50 text-rose-900'
                    : 'border-[#ead1dd] bg-[#fbf2f6] text-[#7a1e48]'
              }`}
              role="status"
            >
              <div>
                <p className="font-bold">{notice.title}</p>
                <p className="mt-0.5 opacity-85">{notice.description}</p>
              </div>
              <button
                type="button"
                aria-label="Tutup pemberitahuan"
                className="rounded-md p-1 opacity-70 hover:opacity-100"
                onClick={() => setNotice(null)}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          )}

          <section aria-label="Ringkasan saldo" className="grid gap-4 lg:grid-cols-[1.52fr_1fr]">
            <Card className="overflow-hidden rounded-[18px] border border-[#18181b] bg-[#18181b] text-white">
              <CardBody className="flex min-h-[202px] flex-col justify-between gap-4 p-5 sm:px-6 sm:py-[22px]">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm font-semibold text-zinc-300">Bisa dipakai</p>
                    {walletLoading ? (
                      <div className="mt-2 h-9 w-48 animate-pulse rounded bg-white/15" aria-label="Memuat saldo" />
                    ) : walletError ? (
                      <p className="mt-2 max-w-xl text-sm text-rose-300">{walletError}</p>
                    ) : (
                      <p className="mt-1 break-words text-[clamp(1.7rem,4vw,2.25rem)] font-extrabold leading-tight tracking-tight tabular-nums">
                        {formatWalletCurrency(wallet?.balance ?? 0, currency)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button
                      className="bg-[#7a1e48] font-bold text-white hover:bg-[#641838]"
                      startContent={<Icon name="plus" size={17} />}
                      onPress={() => setTopupOpen(true)}
                    >
                      Topup
                    </Button>
                    <Button
                      variant="bordered"
                      isLoading={withdrawing}
                      endContent={<Icon name="arrowUp" size={16} />}
                      className="border-white/30 font-semibold text-white hover:border-white/60 hover:bg-white/10"
                      onPress={() => void handleWithdrawal()}
                    >
                      Tarik dana
                    </Button>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-zinc-400">Penarikan diproses di Bagdja Pay dengan PIN kamu.</p>
              </CardBody>
            </Card>

            <Card className="rounded-[18px] border border-[#e4e4e7] bg-white">
              <CardBody className="flex min-h-[202px] flex-col justify-between gap-2.5 p-5">
                <p className="flex items-center gap-2 text-sm font-semibold text-zinc-600">
                  <Icon name="lock" size={17} />
                  Tertahan escrow
                </p>
                {walletLoading ? (
                  <div className="h-8 w-40 animate-pulse rounded-md bg-default-100" aria-label="Memuat dana ditahan" />
                ) : walletError ? (
                  <p className="text-sm text-danger">{walletError}</p>
                ) : (
                  <p className="break-words text-2xl font-extrabold tracking-tight text-[#18181b] tabular-nums">
                    {formatWalletCurrency(wallet?.held_balance ?? 0, currency)}
                  </p>
                )}
                <p className="text-xs leading-relaxed text-zinc-600">
                  Dana pesanan yang belum selesai. Cair otomatis ke saldo setelah pesanan dikonfirmasi selesai.
                </p>
                <Link
                  href="/studio/orders?status=PROCESSING"
                  className="inline-flex w-fit items-center gap-1 text-sm font-bold text-[#7a1e48] hover:text-[#641838]"
                >
                  Lihat pesanan berjalan <Icon name="chevronDown" size={15} className="-rotate-90" />
                </Link>
              </CardBody>
            </Card>
          </section>

          <Card className="overflow-hidden rounded-[20px] border border-[#e5e2dc] bg-white shadow-[0_2px_8px_rgba(35,31,32,0.04)]">
            <CardBody className="p-0">
              <div className="flex flex-col gap-3 border-b border-zinc-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <h2 className="text-base font-extrabold text-[#18181b]">Riwayat mutasi</h2>
                </div>
                <div className="-mx-1 overflow-x-auto px-1">
                  <div className="flex min-w-max gap-2" role="tablist" aria-label="Filter mutasi">
                    {([
                      ['all', 'Semua'],
                      ['income', 'Masuk'],
                      ['outcome', 'Keluar'],
                      ['escrow', 'Escrow'],
                    ] as const).map(([key, label]) => {
                      const selected = movementFilter === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          onClick={() => setMovementFilter(key)}
                          className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                            selected
                              ? 'border-[#f0cfdd] bg-[#fbf2f6] text-[#7a1e48]'
                              : 'border-[#e4e4e7] bg-white text-zinc-700 hover:border-zinc-300'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {transactionLoading ? (
                <div className="space-y-4 px-5 py-6" aria-label="Memuat mutasi saldo">
                  {[0, 1, 2].map((row) => (
                    <div key={row} className="flex items-center gap-3">
                      <div className="h-10 w-10 animate-pulse rounded-full bg-default-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-36 animate-pulse rounded bg-default-100" />
                        <div className="h-3 w-52 max-w-full animate-pulse rounded bg-default-100" />
                      </div>
                      <div className="h-4 w-28 animate-pulse rounded bg-default-100" />
                    </div>
                  ))}
                </div>
              ) : transactionError ? (
                <div className="px-5 py-8 text-sm text-danger">{transactionError}</div>
              ) : visibleTransactions.length === 0 ? (
                <EmptyState
                  title={transactions.length === 0 ? 'Belum ada mutasi saldo' : 'Tidak ada mutasi di filter ini'}
                  description={transactions.length === 0 ? 'Transaksi yang memengaruhi saldo wallet akan muncul di sini.' : 'Pilih filter lain untuk melihat mutasi saldo.'}
                  icon="wallet"
                  compact
                />
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {visibleTransactions.map((transaction) => {
                    const isCredit = Number(transaction.amount) >= 0;
                    const feeNote = formatWalletTransactionFeeNote(transaction.type, transaction.metadata);
                    const expanded = expandedTransactionId === transaction.id;
                    const metadata = transaction.metadata ?? {};
                    const requestedAmount = Number(metadata.requested_amount);
                    const platformFee = Number(metadata.platform_fee ?? 0);
                    const appFee = Number(metadata.app_fee ?? 0);
                    const hasFees = platformFee > 0 || appFee > 0;
                    const grossAmount = Number.isFinite(requestedAmount) && requestedAmount > 0
                      ? requestedAmount
                      : Math.abs(Number(transaction.amount)) + platformFee + appFee;
                    const hasFeeBreakdown = hasFees && grossAmount > 0;
                    const orderTransactionId = transaction.reference_id?.match(/(?:^|:)transaction:([0-9a-f-]{36})(?::|$)/i)?.[1];
                    return (
                      <li key={transaction.id}>
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() => setExpandedTransactionId(expanded ? null : transaction.id)}
                          className="flex w-full items-center gap-3 bg-white px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 sm:gap-3.5 sm:px-5"
                        >
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                            isCredit ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                          }`}>
                            <Icon
                              name={transaction.type.startsWith('ESCROW_') ? 'lock' : isCredit ? 'arrowDown' : 'arrowUp'}
                              size={17}
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-[#18181b]">
                              {formatWalletTransactionType(transaction.type)}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-zinc-600">
                              {feeNote || transaction.description || '—'}
                            </span>
                          </span>
                          <span className={`shrink-0 whitespace-nowrap text-right text-sm font-bold tabular-nums ${
                            isCredit ? 'text-emerald-700' : 'text-[#18181b]'
                          }`}>
                            {isCredit ? '+' : '−'} {formatWalletCurrency(Math.abs(Number(transaction.amount)), transaction.currency || currency)}
                          </span>
                          <span className="hidden shrink-0 text-right text-xs text-zinc-500 sm:block">
                            {formatWalletDate(transaction.created_at)}
                          </span>
                          <Icon name="chevronDown" size={16} className={`shrink-0 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                        </button>
                        {expanded && (
                          <div className="ml-[58px] mr-4 mb-3 flex flex-col gap-1.5 rounded-[12px] border border-zinc-100 bg-zinc-50 px-3.5 py-3 text-xs sm:ml-[70px] sm:mr-5">
                            {hasFeeBreakdown ? (
                              <>
                                <DetailLine label="Nilai pesanan" value={formatWalletCurrency(grossAmount, transaction.currency || currency)} />
                                {platformFee > 0 && <DetailLine label="Biaya platform" value={`− ${formatWalletCurrency(platformFee, transaction.currency || currency)}`} />}
                                {appFee > 0 && <DetailLine label="Biaya aplikasi" value={`− ${formatWalletCurrency(appFee, transaction.currency || currency)}`} />}
                                <DetailLine
                                  label={isCredit ? 'Diterima' : 'Dilepas'}
                                  value={formatWalletCurrency(Math.abs(Number(transaction.amount)), transaction.currency || currency)}
                                  strong
                                />
                              </>
                            ) : (
                              <>
                                <DetailLine label="Waktu" value={formatWalletDate(transaction.created_at)} />
                                {transaction.description && <DetailLine label="Keterangan" value={transaction.description} />}
                              </>
                            )}
                            {orderTransactionId && (
                              <Link
                                href={`/studio/orders/${encodeURIComponent(orderTransactionId)}`}
                                onClick={(event) => event.stopPropagation()}
                                className="mt-1 w-fit font-bold text-[#7a1e48] hover:text-[#641838]"
                              >
                                Lihat pesanan →
                              </Link>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {totalPages > page && !transactionLoading && !transactionError && (
                <div className="border-t border-zinc-100 px-5 py-4 text-center">
                  <Button size="sm" variant="bordered" isLoading={loadingMore} onPress={() => void loadTransactions(page + 1, true)}>
                    Muat lebih banyak
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={topupOpen}
        onOpenChange={(open) => {
          if (!open) closeTopup();
        }}
        placement="center"
        size="md"
        isDismissable={!submitting}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 border-b border-[#eeece7] px-5 py-4">
            <span className="text-lg font-extrabold text-[#18181b]">Top up saldo</span>
            <span className="text-xs font-normal text-default-500">Pilih nominal untuk melanjutkan pembayaran.</span>
          </ModalHeader>
          <ModalBody className="gap-5 px-5 py-5">
            <Input
              type="number"
              min={MIN_TOPUP}
              step={1_000}
              inputMode="numeric"
              label="Jumlah top up"
              labelPlacement="outside"
              placeholder="Contoh: 50000"
              startContent={<span className="text-sm font-semibold text-default-500">Rp</span>}
              value={amount}
              onValueChange={(value) => {
                setAmount(value);
                setTopupError('');
              }}
              isInvalid={Boolean(topupError)}
              errorMessage={topupError}
              description={`Minimum top up ${formatWalletCurrency(MIN_TOPUP)}.`}
              isDisabled={submitting}
            />
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-default-500">Pilih nominal cepat</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TOPUP_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setAmount(String(preset));
                      setTopupError('');
                    }}
                    className={`rounded-[12px] border px-3 py-2.5 text-sm font-bold transition-colors disabled:opacity-50 ${
                      Number(amount) === preset
                        ? 'border-[#7a1e48] bg-[#fbf2f6] text-[#7a1e48]'
                        : 'border-[#e5e2dc] bg-white text-[#343238] hover:border-[#c48aa4]'
                    }`}
                  >
                    {formatWalletCurrency(preset)}
                  </button>
                ))}
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="border-t border-[#eeece7] px-5 py-4">
            <Button variant="bordered" isDisabled={submitting} onPress={closeTopup}>Batal</Button>
            <Button className="bg-[#7a1e48] font-bold text-white" isLoading={submitting} onPress={() => void handleTopup()}>
              Lanjut ke pembayaran
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

function DetailLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-zinc-600">{label}</span>
      <span className={`text-right ${strong ? 'font-bold text-[#18181b]' : 'font-medium text-zinc-700'}`}>{value}</span>
    </div>
  );
}
