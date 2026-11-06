import { moneyValue } from '../money';
import type { ProductForm } from './form-state';
import type { SectionId } from './section-registry';

export interface CompletenessCheck {
  section: SectionId;
  label: string;
  ok: boolean;
  optional?: boolean;
}

/** Daftar kelengkapan di panel kanan (artboard Produk-Editor), disesuaikan dengan bagian yang tampil. */
export function completenessChecks(form: ProductForm, sections: readonly SectionId[]): CompletenessCheck[] {
  const checks: CompletenessCheck[] = [
    { section: 'info', label: 'Nama item', ok: form.name.trim().length > 0 },
    { section: 'media', label: `Foto produk${form.images.length ? ` (${form.images.length})` : ''}`, ok: form.images.length > 0 },
    { section: 'info', label: 'Deskripsi', ok: form.description.trim().length > 0 || form.detail.replace(/<[^>]*>/g, '').trim().length > 0 },
  ];
  const byVariant = sections.includes('variants') && form.hasVariants && form.variants.length > 0;
  checks.push({
    section: 'price',
    label: 'Harga',
    ok: byVariant ? form.variants.every((v) => (moneyValue(v.price) ?? 0) > 0) : (moneyValue(form.price) ?? 0) > 0 || form.quotable,
  });
  if (sections.includes('variants')) {
    checks.push({ section: 'variants', label: byVariant ? 'Stok varian' : 'Stok', ok: byVariant ? form.variants.every((v) => v.stock.trim() !== '') : form.stock.trim() !== '' });
  }
  if (sections.includes('shipping')) {
    checks.push({ section: 'shipping', label: 'Data pengiriman', ok: !form.requiresShipping || form.weightGrams.trim() !== '' });
  }
  if (sections.includes('duration')) checks.push({ section: 'duration', label: 'Durasi', ok: form.durationMinutes.trim() !== '' });
  if (sections.includes('package')) checks.push({ section: 'package', label: 'Isi paket', ok: form.itemsIncluded.trim() !== '' });
  if (sections.includes('digital')) checks.push({ section: 'digital', label: `File yang dikirim${form.assetIds.length ? ` (${form.assetIds.length})` : ''}`, ok: form.assetIds.length > 0 });
  if (sections.includes('event')) {
    checks.push({ section: 'event', label: 'Kapasitas peserta', ok: form.maxAttendees.trim() !== '' });
  }
  if (form.type !== 'gathering') {
    checks.push({ section: 'advanced', label: 'Spesifikasi', ok: form.specs.some((s) => s.key.trim() && s.value.trim()), optional: true });
  }
  return checks;
}

export function sectionComplete(section: SectionId, checks: CompletenessCheck[]): boolean {
  return checks.filter((c) => c.section === section && !c.optional).every((c) => c.ok);
}
