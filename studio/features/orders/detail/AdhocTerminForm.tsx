'use client';

import { Button, Input } from '@heroui/react';
import { useState } from 'react';

import type { AdhocTerminInput } from '@/studio/api/order-detail';

import { formatMoney } from './order-model';

export interface AdhocProduct {
  orderId: string;
  productName: string;
  /** Harga final item (dasar input persen). */
  basePrice: number;
  /** Langkah Pascaorder yang bisa dijadikan jangkar. */
  anchorSteps: string[];
}

interface AdhocTerminFormProps {
  products: AdhocProduct[];
  currency: string;
  busyOrderId: string | null;
  onSubmit: (orderId: string, input: AdhocTerminInput) => Promise<boolean>;
}

function parseAmount(raw: string): number {
  return Number(raw.replace(/\./g, '').replace(',', '.'));
}

/** "+ Tagihan tambahan" (termin ad-hoc): label, jumlah ↔ persen harga item, langkah jangkar opsional. */
export function AdhocTerminForm({ products, currency, busyOrderId, onSubmit }: AdhocTerminFormProps) {
  const [open, setOpen] = useState(false);
  const [orderId, setOrderId] = useState(products[0]?.orderId ?? '');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [percent, setPercent] = useState('');
  const [anchor, setAnchor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const product = products.find((p) => p.orderId === orderId) ?? products[0];
  if (!product) return null;

  const setFromPercent = (raw: string): void => {
    setPercent(raw);
    const pct = Number(raw.replace(',', '.'));
    if (Number.isFinite(pct) && raw.trim()) setAmount(String(Math.round((pct / 100) * product.basePrice)));
  };
  const setFromAmount = (raw: string): void => {
    setAmount(raw);
    const value = parseAmount(raw);
    setPercent(Number.isFinite(value) && product.basePrice > 0 && raw.trim() ? String(Math.round((value / product.basePrice) * 1000) / 10) : '');
  };

  const reset = (): void => {
    setOpen(false);
    setLabel('');
    setAmount('');
    setPercent('');
    setAnchor('');
    setError(null);
  };

  const submit = async (): Promise<void> => {
    const value = parseAmount(amount);
    if (!label.trim()) return setError('Isi label tagihan.');
    if (!Number.isFinite(value) || value <= 0) return setError('Jumlah harus lebih dari 0.');
    setError(null);
    const ok = await onSubmit(product.orderId, { label: label.trim(), amount: value, anchor_step_name: anchor || undefined });
    if (ok) reset();
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start text-[13px] font-semibold text-primary hover:underline">
        + Tagihan tambahan
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-default-200 bg-default-50 p-3.5">
      <p className="text-sm font-bold">Tagihan tambahan</p>
      {products.length > 1 && (
        <label className="flex flex-col gap-1.5 text-[13px] font-bold">
          Untuk produk
          <select value={product.orderId} onChange={(e) => setOrderId(e.target.value)} className="min-h-10 rounded-[10px] border border-default-300 bg-white px-3 text-sm font-normal">
            {products.map((p) => (
              <option key={p.orderId} value={p.orderId}>{p.productName}</option>
            ))}
          </select>
        </label>
      )}
      <Input label="Label tagihan" labelPlacement="outside" placeholder="mis. Biaya bongkar atap" value={label} onValueChange={setLabel} />
      <div className="grid grid-cols-[1fr_96px] gap-2">
        <Input label="Jumlah" labelPlacement="outside" inputMode="numeric" placeholder="0" value={amount} onValueChange={setFromAmount} startContent={<span className="text-xs text-default-500">Rp</span>} />
        <Input label="% harga" labelPlacement="outside" inputMode="decimal" placeholder="0" value={percent} onValueChange={setFromPercent} endContent={<span className="text-xs text-default-500">%</span>} />
      </div>
      <p className="-mt-1 text-xs text-default-500">Harga item: {formatMoney(product.basePrice, currency)}</p>
      {product.anchorSteps.length > 0 && (
        <label className="flex flex-col gap-1.5 text-[13px] font-bold">
          Muncul setelah langkah <span className="font-medium text-default-500">(opsional — langkah berikutnya menunggu tagihan lunas)</span>
          <select value={anchor} onChange={(e) => setAnchor(e.target.value)} className="min-h-10 rounded-[10px] border border-default-300 bg-white px-3 text-sm font-normal">
            <option value="">Tanpa jangkar (informasi saja)</option>
            {product.anchorSteps.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      )}
      {error && <p role="alert" className="text-sm font-medium text-[#B91C1C]">{error}</p>}
      <div className="flex gap-2">
        <Button variant="bordered" className="font-semibold" isLoading={busyOrderId === product.orderId} onPress={() => void submit()}>
          Simpan tagihan
        </Button>
        <Button variant="light" onPress={reset}>Batal</Button>
      </div>
    </div>
  );
}
