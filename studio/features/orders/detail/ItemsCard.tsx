'use client';

import { Button } from '@heroui/react';
import { useEffect, useState } from 'react';

import { errorMessage } from '@/studio/api/client';
import { assignOrderVendor, fetchVendorCandidates, type DetailItem, type OrderDetail, type VendorCandidate } from '@/studio/api/order-detail';
import { notify } from '@/studio/ui/primitives/Toast';

import { formatMoney, orderTermins, productName } from './order-model';

interface ItemsCardProps {
  order: OrderDetail;
  websiteId: string;
  showVendors: boolean;
  canAssign: boolean;
  onChanged: () => Promise<void>;
}

/** Item pesanan + tugaskan vendor per item (modul `vendors`). Viewer hanya melihat (bug lama: dropdown bisa diubah viewer). */
export function ItemsCard({ order, websiteId, showVendors, canAssign, onChanged }: ItemsCardProps) {
  const items = order.items ?? [];
  const termins = orderTermins(order);
  return (
    <section aria-label="Item pesanan" className="overflow-hidden rounded-2xl border border-default-200 bg-white">
      <h2 className="border-b border-default-100 px-5 py-4 text-base font-extrabold">Item ({items.length})</h2>
      <ul className="m-0 list-none p-0">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-3 border-b border-default-100 px-5 py-3.5 last:border-b-0">
            <ItemRow item={item} currency={order.currency} termins={termins.filter((termin) => termin.orderId === item.order_id)} />
            {showVendors && <VendorAssign item={item} websiteId={websiteId} canAssign={canAssign} onChanged={onChanged} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ItemRow({
  item,
  currency,
  termins,
}: {
  item: DetailItem;
  currency: string;
  termins: ReturnType<typeof orderTermins>;
}) {
  const product = item.order?.product;
  const image = product?.images?.[0];
  const name = productName(item);
  const unit = product?.uom?.name ? ` ${product.uom.name}` : '';
  const hasInstallments = termins.length > 0;
  const projectAmount = item.order?.quoted_total_amount != null
    ? Number(item.order.quoted_total_amount)
    : Number(item.total_amount) + termins
      .filter((termin) => termin.status !== 'CANCELLED')
      .reduce((sum, termin) => sum + Number(termin.amount), 0);
  const quantity = Math.max(1, Number(item.quantity) || 1);
  return (
    <div className="flex items-start gap-3.5">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-12 w-12 flex-none rounded-[10px] object-cover" />
      ) : (
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[10px] bg-default-200 font-bold text-default-600">{name.charAt(0)}</span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-bold">{name}</span>
        {hasInstallments ? (
          <div className="mt-1 flex flex-col gap-1 text-xs text-default-600">
            <span>{quantity}{unit} · nilai proyek {formatMoney(projectAmount, currency)}</span>
            <span>DP awal {formatMoney(item.total_amount, currency)}</span>
            {termins
              .slice()
              .sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id))
              .map((termin, index) => {
                const status = termin.status === 'PAID'
                  ? 'Lunas'
                  : termin.status === 'ISSUED'
                    ? 'Menunggu dibayar'
                    : termin.status === 'CANCELLED'
                      ? 'Dibatalkan'
                      : 'Belum diterbitkan';
                return (
                  <span key={termin.id}>
                    Termin {index + 1} · {termin.label}: {formatMoney(termin.amount, currency)} · {status}
                  </span>
                );
              })}
          </div>
        ) : (
          <span className="text-xs text-default-600">
            {quantity}{unit} × {formatMoney(item.unit_price, currency)}
          </span>
        )}
      </span>
      <span className="flex flex-none flex-col items-end gap-1 text-right">
        <strong className="whitespace-nowrap font-bold">{formatMoney(hasInstallments ? projectAmount : item.total_amount, currency)}</strong>
        <span className="text-[11px] text-default-500">{hasInstallments ? 'Nilai proyek' : 'Subtotal item'}</span>
      </span>
    </div>
  );
}

function VendorAssign({ item, websiteId, canAssign, onChanged }: { item: DetailItem; websiteId: string; canAssign: boolean; onChanged: () => Promise<void> }) {
  const locationId = item.order?.location_id ?? null;
  const assigned = item.order?.vendor_id ?? null;
  const [candidates, setCandidates] = useState<VendorCandidate[]>([]);
  const [selected, setSelected] = useState(assigned ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!locationId || !canAssign) return;
    let active = true;
    fetchVendorCandidates(websiteId, locationId)
      .then((list) => active && setCandidates(list))
      .catch(() => active && setCandidates([]));
    return () => {
      active = false;
    };
  }, [websiteId, locationId, canAssign]);

  // Assignment dari server jadi sumber kebenaran; pilihan lokal yang belum disimpan tidak ditimpa.
  useEffect(() => {
    if (assigned) setSelected(assigned);
  }, [assigned]);

  const assign = async (): Promise<void> => {
    if (!selected || !item.order_id) return;
    setBusy(true);
    try {
      await assignOrderVendor(websiteId, item.order_id, selected);
      notify.success('Vendor ditugaskan');
      await onChanged();
    } catch (error) {
      notify.error('Gagal menugaskan vendor', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const current = item.order?.vendor?.name ?? (assigned ? 'Sudah ditugaskan' : 'Belum ditugaskan');
  return (
    <div className="flex flex-col gap-2 rounded-[10px] bg-default-50 px-3 py-2.5 text-xs sm:ml-[62px]">
      <span className="text-default-600">
        Vendor: <strong className="text-foreground">{current}</strong>
      </span>
      {!locationId ? (
        <span className="text-warning-700">Lokasi layanan belum dipilih pembeli.</span>
      ) : canAssign ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label={`Vendor untuk ${productName(item)}`}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="min-h-9 min-w-0 flex-1 rounded-lg border border-default-300 bg-white px-2 text-xs"
          >
            <option value="">Pilih vendor</option>
            {candidates.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <Button size="sm" variant="bordered" className="bg-white font-semibold" isLoading={busy} isDisabled={!selected || selected === assigned} onPress={() => void assign()}>
            Tugaskan
          </Button>
          {candidates.length === 0 && <span className="basis-full text-default-500">Belum ada vendor aktif untuk lokasi ini.</span>}
        </div>
      ) : null}
    </div>
  );
}
