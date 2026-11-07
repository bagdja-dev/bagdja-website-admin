/**
 * FALLBACK SEMENTARA — hapus file ini setelah `GET /api/websites/:id/onboarding-status`
 * ter-deploy di semua environment (lalu buang cabang `null` di use-home-data.ts &
 * use-home-actions.ts).
 *
 * Menghitung `WebsiteOnboardingStatusDto` dari 6–7 request lama + heuristik waktu
 * untuk "halaman depan disesuaikan"; "link dibagikan" disimpan di localStorage.
 */
import { studioRequest, websitePath } from '@/studio/api/client';
import type { WebsiteOnboardingStatusDto } from '@/studio/api/home';
import type { ModuleKey, WebsiteDto } from '@/studio/api/types';
import { readStorage, writeStorage } from '@/studio/lib/storage';

interface PageSummaryDto {
  id: string;
  slug: string;
  is_home: boolean;
}

interface SectionSummaryDto {
  id: string;
  created_at: string;
  updated_at: string;
}

interface ProductSummaryDto {
  id: string;
  type: string;
  metadata?: { is_seed?: boolean } | null;
}

interface LocationSummaryDto {
  id: string;
  is_primary: boolean;
  address_line: string | null;
  city: string | null;
}

interface StaffSummaryDto {
  id: string;
  is_active?: boolean;
}

const EDIT_GRACE_MS = 60_000;
const SEED_WINDOW_MS = 10 * 60_000;

const sharedKey = (websiteId: string): string => `studio_home_shared:${websiteId}`;

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

async function getList<T>(websiteId: string, suffix: string): Promise<T[]> {
  return asArray<T>(await studioRequest<unknown>(websitePath(websiteId, suffix)));
}

async function safe<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch {
    return null;
  }
}

/** Heuristik lama: section beranda diubah > 1 menit setelah dibuat, atau ditambah > 10 menit setelah website dibuat. */
async function loadHomeEdited(website: WebsiteDto): Promise<boolean> {
  const pages = await getList<PageSummaryDto>(website.id, '/pages');
  const home = pages.find((p) => p.is_home) ?? pages.find((p) => p.slug === 'home');
  if (!home) return false;
  const sections = await getList<SectionSummaryDto>(website.id, `/pages/${encodeURIComponent(home.id)}/sections`);
  const websiteCreated = Date.parse(website.created_at);
  return sections.some((s) => {
    const created = Date.parse(s.created_at);
    return Date.parse(s.updated_at) - created > EDIT_GRACE_MS || created - websiteCreated > SEED_WINDOW_MS;
  });
}

/** Hitung status checklist dari endpoint lama; hanya modul aktif yang di-request. */
export async function loadLegacyOnboardingStatus(
  website: WebsiteDto,
  enabled: ReadonlySet<ModuleKey>,
): Promise<WebsiteOnboardingStatusDto> {
  const id = website.id;
  const [homeEdited, products, locations, flows, staff] = await Promise.all([
    safe(() => loadHomeEdited(website)),
    enabled.has('catalog') ? safe(() => getList<ProductSummaryDto>(id, '/products')) : Promise.resolve(null),
    enabled.has('locations') ? safe(() => getList<LocationSummaryDto>(id, '/locations')) : Promise.resolve(null),
    enabled.has('fulfillment') ? safe(() => getList<{ id: string }>(id, '/fulfillment-flows')) : Promise.resolve(null),
    safe(() => getList<StaffSummaryDto>(id, '/staff')),
  ]);
  const primary = locations?.find((l) => l.is_primary) ?? null;
  return {
    hasLogo: Boolean(website.logo_url),
    homeEdited: homeEdited === true,
    hasOwnProduct: (products ?? []).some((p) => p.metadata?.is_seed !== true),
    seedProductCount: (products ?? []).filter((p) => p.metadata?.is_seed === true).length,
    primaryLocationComplete: Boolean(primary?.address_line?.trim() && primary?.city?.trim()),
    hasFlow: (flows?.length ?? 0) > 0,
    hasGathering: (products ?? []).some((p) => p.type === 'gathering'),
    teamCount: staff ? staff.filter((s) => s.is_active !== false).length : 0,
    linkSharedAt: readStorage(sharedKey(id)) === '1' ? new Date(0).toISOString() : null,
  };
}

/** "Link dibagikan" versi lama (per browser). Mengembalikan waktu sekarang (ISO). */
export function markLegacyLinkShared(websiteId: string): string {
  writeStorage(sharedKey(websiteId), '1');
  return new Date().toISOString();
}
