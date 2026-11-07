import type { BusinessProfileId, BusinessProfilesResponseDto, WebsiteDto } from '@/studio/api/types';

/** Warna tile inisial (palet artboard Sidebar) — dipilih stabil dari id website. */
const TILE_COLORS: ReadonlyArray<{ bg: string; ink: string }> = [
  { bg: '#CA8A04', ink: '#1C1917' },
  { bg: '#2563EB', ink: '#FFFFFF' },
  { bg: '#EA580C', ink: '#FFFFFF' },
  { bg: '#0F766E', ink: '#FFFFFF' },
  { bg: '#7C3AED', ink: '#FFFFFF' },
  { bg: '#0D9488', ink: '#FFFFFF' },
  { bg: '#475569', ink: '#FFFFFF' },
];

export function siteInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || 'W';
}

export function siteTileColor(websiteId: string): { bg: string; ink: string } {
  let hash = 0;
  for (let i = 0; i < websiteId.length; i += 1) hash = (hash * 31 + websiteId.charCodeAt(i)) >>> 0;
  return TILE_COLORS[hash % TILE_COLORS.length];
}

/** Label jenis bisnis untuk switcher; website lama (`legacy`) = "Semua menu" (artboard). */
export function profileLabelOf(
  profileId: BusinessProfileId | undefined,
  catalog: BusinessProfilesResponseDto | null,
): string {
  if (!profileId || profileId === 'legacy') return 'Semua menu';
  return catalog?.profiles.find((p) => p.id === profileId)?.label ?? 'Website';
}

export type SiteTileWebsite = Pick<WebsiteDto, 'id' | 'name' | 'logo_url'>;
