import { moneyValue } from '../money';
import { activeOptionDrafts, slugifyProduct, usesVariantPricing } from './build-payload';
import type { FormErrors } from './editor-context';
import type { ProductForm } from './form-state';
import { advancedFieldsFor, sectionsFor, type SectionContext, type SectionId } from './section-registry';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isInt = (v: string): boolean => /^\d+$/.test(v.trim());

/** Bagian tempat sebuah galat tampil (untuk menandai navigasi kiri & lompat ke bagian pertama). */
export function sectionOfError(key: string): SectionId {
  if (key === 'name') return 'info';
  if (key === 'price') return 'price';
  if (key.startsWith('variant') || key === 'stock') return 'variants';
  if (['weightGrams', 'lengthCm', 'widthCm', 'heightCm'].includes(key)) return 'shipping';
  if (key === 'durationMinutes') return 'duration';
  if (key === 'downloadTtl' || key === 'assets') return 'digital';
  if (key === 'guarantyDays') return 'fulfil';
  if (key === 'slug' || key === 'estimation') return 'advanced';
  return 'event';
}

export interface ValidationContext extends SectionContext {
  attendeeUomMissing: boolean;
  gatheringOptionsBlocked: boolean;
  assetLinksBlocked: boolean;
}

export function validateForm(form: ProductForm, ctx: ValidationContext): FormErrors {
  const e: FormErrors = {};
  const sections = sectionsFor(form.type, ctx);
  if (!form.name.trim()) e.name = 'Nama wajib diisi.';
  const slug = form.slug.trim() || slugifyProduct(form.name);
  if (!slug) e.slug = 'Alamat URL wajib diisi.';
  else if (!SLUG.test(slug)) e.slug = 'Hanya huruf kecil, angka, dan tanda hubung.';

  const byVariant = usesVariantPricing(form, ctx);
  if (!byVariant) {
    const price = moneyValue(form.price);
    if (price === null) e.price = 'Harga wajib diisi (isi 0 bila gratis).';
    else if (price < 0) e.price = 'Harga tidak boleh negatif.';
  }

  if (sections.includes('variants')) {
    if (form.stock.trim() && !isInt(form.stock)) e.stock = 'Stok harus angka bulat ≥ 0.';
    if (form.hasVariants) {
      if (form.variants.length === 0) e.variants = 'Tambahkan minimal satu varian atau matikan varian.';
      if (!form.variantAxis.trim()) e.variantAxis = 'Isi jenis varian, mis. Ukuran.';
      const seen = new Set<string>();
      for (const v of form.variants) {
        const name = v.name.trim().toLowerCase();
        const key = `variant.${v.key}`;
        if (!name) e[key] = 'Nama varian wajib diisi.';
        else if (seen.has(name)) e[key] = 'Nama varian tidak boleh kembar.';
        else if (moneyValue(v.price) === null) e[key] = 'Harga varian wajib diisi.';
        seen.add(name);
      }
    }
  }
  if (sections.includes('shipping') && form.requiresShipping) {
    for (const k of ['weightGrams', 'lengthCm', 'widthCm', 'heightCm'] as const) {
      if (form[k].trim() && (!isInt(form[k]) || Number(form[k]) < 1)) e[k] = 'Minimal 1.';
    }
  }
  if (sections.includes('duration') && form.durationMinutes.trim() && (!isInt(form.durationMinutes) || Number(form.durationMinutes) < 1)) {
    e.durationMinutes = 'Durasi minimal 1 menit.';
  }
  if (sections.includes('digital')) {
    const ttl = Number(form.downloadTtl);
    if (!isInt(form.downloadTtl) || ttl < 1 || ttl > 10080) e.downloadTtl = 'Isi 1–10.080 menit.';
    if (ctx.assetLinksBlocked) e.assets = 'Daftar file item ini gagal dimuat. Simpan diblokir agar tautan file tidak terhapus — muat ulang halaman.';
  }
  if (sections.includes('fulfil') && form.guarantyDays.trim() && (!isInt(form.guarantyDays) || Number(form.guarantyDays) < 1)) {
    e.guarantyDays = 'Minimal 1 hari, atau kosongkan.';
  }
  if (advancedFieldsFor(form.type).includes('estimation') && form.estimation.some((r) => r.label.trim() && (moneyValue(r.price) ?? -1) < 0)) {
    e.estimation = 'Setiap estimasi butuh harga ≥ 0.';
  }
  if (sections.includes('event')) validateEvent(form, ctx, e);
  return e;
}

function validateEvent(form: ProductForm, ctx: ValidationContext, e: FormErrors): void {
  if (ctx.gatheringOptionsBlocked) e.gathering = 'Pilihan acara gagal dimuat. Simpan diblokir agar data yang ada tidak terhapus — muat ulang halaman.';
  if (ctx.attendeeUomMissing) e.gathering = 'Satuan "Peserta" belum tersedia di server. Hubungi admin platform.';
  const min = Number(form.minAttendees);
  const max = Number(form.maxAttendees);
  if (!isInt(form.minAttendees)) e.minAttendees = 'Wajib, angka ≥ 0.';
  if (!isInt(form.maxAttendees) || max < 1) e.maxAttendees = 'Wajib, minimal 1.';
  else if (isInt(form.minAttendees) && min > max) e.minAttendees = 'Tidak boleh melebihi kapasitas maksimum.';
  const deposit = moneyValue(form.deposit) ?? 0;
  const price = moneyValue(form.price) ?? 0;
  if (deposit < 0 || deposit > price) e.deposit = 'DP antara 0 dan harga per peserta.';

  const drafts = activeOptionDrafts(form);
  if (drafts.some((o) => !o.group.trim() || !o.label.trim())) e.options = 'Setiap pilihan wajib punya kelompok dan nama pilihan.';
  else {
    const keys = drafts.map((o, i) => `${slugifyProduct(o.group) || `group-${i + 1}`}:${o.optionKey || slugifyProduct(o.label) || `option-${i + 1}`}`);
    if (new Set(keys).size !== keys.length) e.options = 'Nama pilihan dalam satu kelompok harus unik.';
  }

  const prepare = Number(form.prepareDays);
  const cutoff = Number(form.cutoffDays);
  if (!isInt(form.cutoffDays)) e.cutoffDays = 'Angka ≥ 0.';
  if (!isInt(form.prepareDays)) e.prepareDays = 'Angka ≥ 0.';
  else if (isInt(form.cutoffDays) && prepare < cutoff) e.prepareDays = 'Harus ≥ batas akhir pembatalan.';
  const penalty = Number(form.penaltyValue || 0);
  if (form.penaltyType === 'PERCENTAGE' && penalty > 100) e.penaltyValue = 'Maksimal 100%.';
  if (form.penaltyType === 'FIXED' && penalty > price) e.penaltyValue = 'Tidak boleh melebihi harga per peserta.';
}
