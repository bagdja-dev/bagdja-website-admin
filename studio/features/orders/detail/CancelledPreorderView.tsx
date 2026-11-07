import Link from 'next/link';

import type { OrderLookup } from '@/studio/api/order-detail';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';

import { formatDateTime, formatMoney, PILL_CLASS } from './order-model';

/** Fallback: id adalah praorder yang dibatalkan (bukan transaksi). */
export function CancelledPreorderView({ preorder }: { preorder: OrderLookup }) {
  const reason = typeof preorder.metadata?.cancellation_reason === 'string' ? preorder.metadata.cancellation_reason : 'Dibatalkan oleh penjual';
  const rows: Array<[string, string]> = [
    ['Produk', preorder.product?.name ?? '—'],
    ['Pembeli', preorder.buyer_identifier ?? '—'],
    ['Jumlah', String(preorder.quantity)],
    ['Lokasi', preorder.location?.name ?? 'Belum dipilih'],
    ['Harga quotation', formatMoney(preorder.quoted_total_amount ?? preorder.total_amount)],
    ['Alasan pembatalan', reason],
  ];
  return (
    <>
      <PageHeader title="Penawaran dibatalkan" description={formatDateTime(preorder.created_at)} back={{ href: '/studio/quotes?tab=dibatalkan', label: 'Penawaran' }} />
      <section className="mx-auto flex w-full max-w-[720px] flex-col gap-4 rounded-2xl border border-default-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold">Ringkasan penawaran</h2>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${PILL_CLASS.danger}`}>Dibatalkan</span>
        </div>
        <dl className="m-0 grid gap-3 text-sm sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-default-600">{label}</dt>
              <dd className="m-0 font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[13px] text-default-600">
          Praorder ini tidak pernah menjadi pesanan. <Link href="/studio/orders">Kembali ke daftar pesanan</Link>
        </p>
      </section>
    </>
  );
}
