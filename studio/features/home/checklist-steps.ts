import type { WebsiteOnboardingStatusDto } from '@/studio/api/home';
import type { BusinessProfileId, ModuleKey, WebsiteDto } from '@/studio/api/types';

export type ChecklistAction =
  | { kind: 'link'; label: string; href: string }
  | { kind: 'upload-logo'; label: string }
  | { kind: 'copy-link'; label: string };

export interface ChecklistStep {
  id: string;
  title: string;
  hint: string;
  done: boolean;
  action: ChecklistAction | null;
}

export interface ChecklistContext {
  website: WebsiteDto;
  businessProfile: BusinessProfileId;
  enabled: ReadonlySet<ModuleKey>;
  /** `null` = status belum/ gagal dimuat → semua langkah dianggap belum selesai. */
  status: WebsiteOnboardingStatusDto | null;
  canEditWebsite: boolean;
}

/** Langkah "Siapkan website kamu" (artboard Beranda + plan §3.6) dari onboarding-status; hanya modul aktif. */
export function buildChecklist(ctx: ChecklistContext): ChecklistStep[] {
  const { website, enabled, status } = ctx;
  const noun = ctx.businessProfile === 'service_business' ? 'layanan' : 'produk';
  const seeds = status?.seedProductCount ?? 0;
  const steps: Array<ChecklistStep | null> = [
    { id: 'create', title: 'Buat website', hint: '', done: true, action: null },
    {
      id: 'logo',
      title: 'Unggah logo',
      hint: 'Logo tampil di header website dan aplikasi.',
      // website dari store langsung ter-update setelah unggah logo; status server sebagai cadangan.
      done: Boolean(website.logo_url) || status?.hasLogo === true,
      action: ctx.canEditWebsite ? { kind: 'upload-logo', label: 'Unggah' } : null,
    },
    {
      id: 'home',
      title: 'Sesuaikan halaman depan',
      hint: 'Ganti foto & teks contoh dengan milikmu.',
      done: status?.homeEdited === true,
      action: { kind: 'link', label: 'Buka editor', href: '/studio/appearance' },
    },
    enabled.has('catalog')
      ? {
          id: 'catalog',
          title: `Tambah ${noun} pertamamu`,
          hint: seeds > 0 ? `${seeds} ${noun} contoh dari template bisa diedit atau dihapus.` : `Tambahkan ${noun} yang kamu jual.`,
          done: status?.hasOwnProduct === true,
          action: { kind: 'link', label: `Tambah ${noun}`, href: '/studio/catalog' },
        }
      : null,
    enabled.has('locations')
      ? {
          id: 'location',
          title: 'Lengkapi alamat lokasi',
          hint: 'Agar pelanggan tahu di mana kamu berada.',
          done: status?.primaryLocationComplete === true,
          action: { kind: 'link', label: 'Atur lokasi', href: '/studio/locations' },
        }
      : null,
    enabled.has('fulfillment')
      ? {
          id: 'flow',
          title: 'Atur alur pengerjaan layanan',
          hint: 'Mis. Booking → Datang → Selesai. Pelanggan bisa memantau.',
          done: status?.hasFlow === true,
          action: { kind: 'link', label: 'Buat alur', href: '/studio/flows' },
        }
      : null,
    enabled.has('events')
      ? {
          id: 'event',
          title: 'Buat acara pertama',
          hint: 'Atur kuota peserta, DP, dan jadwal acara.',
          done: status?.hasGathering === true,
          action: { kind: 'link', label: 'Buat acara', href: '/studio/events' },
        }
      : null,
    {
      id: 'team',
      title: 'Undang tim',
      hint: 'Beri akses ke kasir atau karyawan.',
      done: (status?.teamCount ?? 0) > 1,
      action: { kind: 'link', label: 'Undang', href: '/studio/team' },
    },
    {
      id: 'share',
      title: 'Bagikan link website',
      hint: 'Kirim ke pelanggan lewat WhatsApp atau media sosial.',
      done: Boolean(status?.linkSharedAt),
      action: { kind: 'copy-link', label: 'Salin link' },
    },
  ];
  return steps.filter((s): s is ChecklistStep => s !== null);
}
