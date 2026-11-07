/**
 * Input uang Studio. State form menyimpan string kanonis ("50000" / "50000.5"), tampilan
 * memakai format id-ID ("50.000" / "50.000,5"). Nilai API seperti "50000.00" dibaca lewat
 * `Number()` sehingga titik desimal tidak hilang (bug lama `formatCurrencyInput` → ×100).
 */
const intFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

/** Nilai API (number | "50000.00") → string kanonis. */
export function moneyFromApi(value: unknown): string {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return '';
  return String(Math.round(n * 100) / 100);
}

/** Ketikan pengguna (format id-ID) → string kanonis. Maks. 2 digit desimal. */
export function moneyFromInput(text: string): string {
  const cleaned = text.replace(/[^\d,]/g, '');
  const [intPart = '', ...rest] = cleaned.split(',');
  const intDigits = intPart.replace(/^0+(?=\d)/, '');
  if (rest.length === 0) return intDigits;
  const decimals = rest.join('').slice(0, 2);
  return `${intDigits || '0'}.${decimals}`;
}

/** String kanonis → tampilan id-ID; mempertahankan koma yang sedang diketik. */
export function moneyDisplay(canonical: string): string {
  if (canonical === '') return '';
  const [intPart, decimals] = canonical.split('.');
  const formatted = intPart === '' ? '' : intFormat.format(Number(intPart));
  return decimals === undefined ? formatted : `${formatted},${decimals}`;
}

/** String kanonis → number (kosong = null). */
export function moneyValue(canonical: string): number | null {
  if (canonical.trim() === '') return null;
  const n = Number(canonical);
  return Number.isFinite(n) ? n : null;
}
