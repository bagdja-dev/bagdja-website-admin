import { errorMessage, studioRequest } from './client';

export interface WalletBalanceDto {
  currency_code: string;
  balance: number;
  held_balance: number;
  is_active: boolean;
}

export interface WalletTransactionDto {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  reference_id: string | null;
  currency: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
}

export interface WalletTransactionsResponseDto {
  data: WalletTransactionDto[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

const WALLET_TRANSACTION_TYPE_LABELS: Record<string, string> = {
  TOPUP_CREDIT: 'Topup Saldo',
  SALE_PROCEEDS: 'Hasil Penjualan',
  ESCROW_CREDIT: 'Dana Escrow Masuk',
  ESCROW_RELEASE_CREDIT: 'Dana Pesanan Dicairkan',
  TRANSFER_IN: 'Transfer Masuk',
  SUBSCRIPTION_REVENUE: 'Pendapatan Subscription',
  LICENSE_REVENUE: 'Pendapatan Lisensi',
  PAYMENT_DEBIT: 'Pembayaran',
  TRANSACTION_FEE: 'Biaya Transaksi',
  PLATFORM_FEE: 'Biaya Platform',
  ESCROW_HOLD: 'Dana Ditahan (Escrow)',
  ESCROW_RELEASE: 'Pelepasan Dana Escrow',
  ESCROW_FEE: 'Biaya Escrow',
  TRANSFER_OUT: 'Penarikan Dana',
  SUBSCRIPTION_CHARGE: 'Biaya Subscription',
  LICENSE_CHARGE: 'Biaya Lisensi',
  ADMIN_FEE: 'Biaya Admin',
};

function formatRupiah(value: number): string {
  return `Rp${Math.round(value).toLocaleString('id-ID')}`;
}

export function formatWalletTransactionType(type: string): string {
  return WALLET_TRANSACTION_TYPE_LABELS[type] ?? type;
}

export function formatWalletTransactionFeeNote(
  type: string,
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if ((type !== 'ESCROW_RELEASE' && type !== 'ESCROW_RELEASE_CREDIT') || !metadata) return null;

  const platformFee = Number(metadata.platform_fee ?? 0);
  const appFee = Number(metadata.app_fee ?? 0);
  if (!platformFee && !appFee) return null;

  const parts: string[] = [];
  if (platformFee > 0) parts.push(`platform ${formatRupiah(platformFee)}`);
  if (appFee > 0) parts.push(`aplikasi ${formatRupiah(appFee)}`);
  return `Dipotong biaya ${parts.join(' + ')}`;
}

export function formatWalletCurrency(value: number, currency = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatWalletDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function fetchWalletBalance(): Promise<WalletBalanceDto> {
  return studioRequest<WalletBalanceDto>('/api/wallet/balance');
}

export function fetchWalletTransactions(page: number, size = 10): Promise<WalletTransactionsResponseDto> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return studioRequest<WalletTransactionsResponseDto>(`/api/wallet/transactions?${params.toString()}`);
}

export function createWalletTopup(amount: number): Promise<{ checkoutUrl: string }> {
  return studioRequest<{ checkoutUrl: string }>('/api/wallet/topup', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

export function createWalletWithdrawalSession(currency = 'IDR'): Promise<{ url: string }> {
  const params = new URLSearchParams({ currency });
  return studioRequest<{ url: string }>(`/api/wallet/withdrawal-sessions?${params.toString()}`, {
    method: 'POST',
  });
}

export { errorMessage };
