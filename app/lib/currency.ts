export function formatCurrency(
  value: number | string,
  currency: string = 'IDR',
  fractionDigits?: number,
  locale: string = 'id-ID',
) {
  const numeric = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    ...(typeof fractionDigits === 'number'
      ? {
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits,
        }
      : {}),
  }).format(numeric);
}

export const SUPPORTED_CURRENCIES = [
  { value: 'IDR', label: 'Rupiah Indonesia (IDR)' },
];
