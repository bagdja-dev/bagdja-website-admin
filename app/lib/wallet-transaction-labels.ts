const WALLET_TX_TYPE_LABELS: Record<string, string> = {
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

export function formatWalletTransactionType(type: string): string {
  return WALLET_TX_TYPE_LABELS[type] ?? type;
}

function formatRupiah(value: number): string {
  return `Rp${Math.round(value).toLocaleString('id-ID')}`;
}

/**
 * Baris `ESCROW_RELEASE`/`ESCROW_RELEASE_CREDIT` cuma menyimpan angka NETO di
 * wallet tenant (mis. rilis Rp1.259.000 -> diterima Rp1.249.000) — potongan
 * fee-nya sendiri tercatat di wallet LAIN (platform/app), jadi dari sisi
 * tenant selisihnya kelihatan "hilang" tanpa penjelasan. Datanya sebenarnya
 * sudah ada di `metadata` (disalin persis dari `escrow_release_ledger` saat
 * release — lihat `bagdja-payment-service` `escrow.service.ts`), cuma belum
 * ditampilkan. Description mentah dari backend (`Escrow partial release
 * transaction:<uuid>:...`) juga tidak informatif untuk tenant — diganti kalau
 * ada breakdown fee ini.
 */
export function formatWalletTransactionFeeNote(
  type: string,
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if (type !== 'ESCROW_RELEASE' && type !== 'ESCROW_RELEASE_CREDIT') return null;
  if (!metadata) return null;

  const platformFee = Number(metadata.platform_fee ?? 0);
  const appFee = Number(metadata.app_fee ?? 0);
  if (!platformFee && !appFee) return null;

  const parts: string[] = [];
  if (platformFee > 0) parts.push(`platform ${formatRupiah(platformFee)}`);
  if (appFee > 0) parts.push(`aplikasi ${formatRupiah(appFee)}`);

  return `Dipotong biaya ${parts.join(' + ')}`;
}
