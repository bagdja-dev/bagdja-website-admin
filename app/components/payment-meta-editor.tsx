'use client';

import { FormInput, FormSelect } from './form-field';
import { getPaymentModeConfig, PAYMENT_MODE_CONFIGS } from '../lib/payment-mode-types';
import type { PaymentMetaEntry } from '../lib/types';

const MODE_OPTIONS = PAYMENT_MODE_CONFIGS.map((c) => ({ value: c.mode, label: c.label }));

interface PaymentMetaEditorProps {
  value: PaymentMetaEntry[];
  onChange: (next: PaymentMetaEntry[]) => void;
}

/** Editor generik untuk daftar cara/link pembayaran checkout produk — form field per entry mengikuti config di payment-mode-types.ts, jadi mode baru otomatis punya form tanpa ubah komponen ini. */
export function PaymentMetaEditor({ value, onChange }: PaymentMetaEditorProps) {
  const updateEntry = (index: number, patch: Record<string, unknown>) => {
    onChange(value.map((entry, i) => (i === index ? ({ ...entry, ...patch } as PaymentMetaEntry) : entry)));
  };

  const changeMode = (index: number, mode: string) => {
    // Mode internal tidak boleh membawa field external lama (mis. payment_link).
    const next = value.map((entry, i) =>
      i === index ? ({ payment_mode: mode } as PaymentMetaEntry) : entry,
    );
    onChange(next);
  };

  const removeEntry = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const addEntry = () => {
    const firstMode = PAYMENT_MODE_CONFIGS[0].mode;
    onChange([...value, { payment_mode: firstMode } as PaymentMetaEntry]);
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-foreground">Cara Pembayaran / Checkout</span>
      <p className="text-xs text-default-500">
        Daftar link/cara pembayaran yang ditampilkan sebagai pilihan checkout di halaman produk publik.
      </p>

      {value.map((entry, index) => {
        const config = getPaymentModeConfig(entry.payment_mode);
        const record = entry as unknown as Record<string, unknown>;

        return (
          <div key={index} className="flex flex-col gap-3 rounded-xl border border-default-200 p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FormSelect
                  label="Tipe Pembayaran"
                  value={entry.payment_mode}
                  onChange={(mode) => changeMode(index, mode)}
                  options={MODE_OPTIONS}
                />
              </div>
              <button
                type="button"
                onClick={() => removeEntry(index)}
                className="rounded-lg px-2 py-1.5 text-xs font-medium text-danger hover:bg-danger-50"
              >
                Hapus
              </button>
            </div>

            {config.fields.length > 0 ? (
              config.fields.map((field) => (
                <FormInput
                  key={field.key}
                  label={field.label}
                  description={field.description}
                  placeholder={field.placeholder}
                  type={field.type === 'url' ? 'url' : 'text'}
                  value={typeof record[field.key] === 'string' ? (record[field.key] as string) : ''}
                  onChange={(v) => updateEntry(index, { [field.key]: v })}
                />
              ))
            ) : entry.payment_mode === 'ADD_TO_CART' ? (
              <p className="rounded-lg bg-primary-50 px-3 py-2 text-xs text-primary-700">
                Checkout melalui Bagdja. Produk akan masuk ke cart pembeli dan dibayar melalui flow Bagdja.
              </p>
            ) : entry.payment_mode === 'ESCROW' ? (
              <p className="rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-700">
                Bagdja Escrow. Pembeli membayar penuh di awal dan dana dicairkan setelah konfirmasi terima barang.
              </p>
            ) : null}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addEntry}
        className="self-start rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-50"
      >
        + Tambah cara pembayaran
      </button>
    </div>
  );
}
