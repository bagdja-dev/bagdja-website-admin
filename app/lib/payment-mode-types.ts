/**
 * Config field per `payment_mode` — pola sama seperti section-types.ts
 * (config-driven form). Tambah mode baru (transfer bank, QRIS, dst.)
 * cukup nambah entri di PAYMENT_MODE_CONFIGS, tanpa nulis form baru.
 */
export type PaymentModeFieldType = 'text' | 'url';

export interface PaymentModeFieldDef {
  key: string;
  label: string;
  type: PaymentModeFieldType;
  placeholder?: string;
  description?: string;
}

export interface PaymentModeConfig {
  mode: string;
  label: string;
  fields: PaymentModeFieldDef[];
}

export const PAYMENT_MODE_CONFIGS: PaymentModeConfig[] = [
  {
    mode: 'LYNK',
    label: 'Lynk.id',
    fields: [
      {
        key: 'payment_link',
        label: 'Link Pembayaran',
        type: 'url',
        placeholder: 'https://lynk.id/namatoko/produk',
        description: 'Link checkout Lynk.id yang akan dibuka pembeli saat klik tombol beli.',
      },
    ],
  },
];

export function getPaymentModeConfig(mode: string): PaymentModeConfig {
  return PAYMENT_MODE_CONFIGS.find((c) => c.mode === mode) ?? PAYMENT_MODE_CONFIGS[0];
}
