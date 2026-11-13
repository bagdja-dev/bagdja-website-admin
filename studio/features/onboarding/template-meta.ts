import type { WebsiteTemplateDto } from '@/studio/api/types';
import { formatCurrency } from '@/studio/lib/format';

export interface TemplateSwatch {
  background: string;
  text: string;
  accent: string;
  /** Latar kartu kecil di sketsa (artboard: `card`). */
  card: string;
}

const HEX = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function hex(value: unknown): string | null {
  return typeof value === 'string' && HEX.test(value) ? value : null;
}

/** Warna miniatur kartu dari `structure.theme` (mode/colors); cadangan netral. */
export function templateSwatch(template: WebsiteTemplateDto): TemplateSwatch {
  const theme = record(template.structure.theme);
  const colors = record(theme?.colors);
  const dark = theme?.mode !== 'light';
  return {
    background: hex(colors?.background) ?? (dark ? '#1C1917' : '#FFFFFF'),
    text: hex(colors?.text) ?? (dark ? '#FAFAF9' : '#18181B'),
    accent: hex(colors?.accent) ?? (dark ? '#CA8A04' : '#2563EB'),
    card: hex(colors?.surface) ?? hex(colors?.card) ?? (dark ? '#292524' : '#F4F4F5'),
  };
}

/** Halaman yang ikut dibuat: Beranda + `structure.extra_pages`. */
export function templatePages(template: WebsiteTemplateDto): string[] {
  const extra = Array.isArray(template.structure.extra_pages) ? template.structure.extra_pages : [];
  const titles = extra
    .map((page) => record(page)?.title)
    .filter((title): title is string => typeof title === 'string' && title.trim().length > 0);
  return ['Beranda', ...titles];
}

export function templateAuthor(template: WebsiteTemplateDto): { name: string; official: boolean } {
  const official = template.manifest?.isBuiltin ?? !template.author_name;
  return { name: template.author_name ?? 'Bagdja', official };
}

/** "Cocok untuk X" (profil terpilih) atau "Untuk y" (profil pertama template). */
export function templateFitText(
  template: WebsiteTemplateDto,
  recommendedFor: string | null,
  labelOf: (profileId: string) => string | null,
): string | null {
  if (recommendedFor) return `Cocok untuk ${recommendedFor}`;
  const first = template.business_profiles.map(labelOf).find((l): l is string => Boolean(l));
  return first ? `Untuk ${first.toLowerCase()}` : null;
}

export function templatePriceLabel(template: WebsiteTemplateDto): string {
  return typeof template.price === 'number' && template.price > 0 ? formatCurrency(template.price) : 'Gratis';
}

const CAPABILITY_LABELS: Readonly<Record<string, string>> = {
  catalog: 'Katalog produk',
  cart: 'Keranjang',
  checkout: 'Checkout',
  orders: 'Pesanan',
  blog: 'Blog',
  faq: 'FAQ',
  locations: 'Lokasi',
  gathering: 'Gathering',
  buyer_auth: 'Akun pembeli',
  chat: 'Chat',
  digital_delivery: 'Produk digital',
};

export function templateFeatures(template: WebsiteTemplateDto): string[] {
  return (template.manifest?.capabilities ?? []).map((c) => CAPABILITY_LABELS[c] ?? c);
}

/** Isi contoh yang ikut dibuat dari `structure.master_defaults` (artboard Wizard-Selesai). */
export function templateSeedSummary(template: WebsiteTemplateDto): string[] {
  const defaults = record(template.structure.master_defaults);
  const count = (key: string): number => {
    const value = defaults?.[key];
    return Array.isArray(value) ? value.length : 0;
  };
  const lines = [`${templatePages(template).length} halaman`];
  if (count('services') > 0) lines.push(`${count('services')} contoh jasa`);
  if (count('products') > 0) lines.push(`${count('products')} contoh produk`);
  if (count('gatherings') > 0) lines.push(`${count('gatherings')} contoh gathering`);
  if (count('faqs') > 0) lines.push(`${count('faqs')} FAQ umum`);
  if (record(defaults?.location)) lines.push('1 lokasi utama');
  return lines;
}
