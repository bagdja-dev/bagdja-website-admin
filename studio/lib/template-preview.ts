/**
 * URL renderer untuk pratinjau template & website tenant — ditulis ulang untuk
 * Studio (tidak mengimpor app/lib/preview-url).
 *
 * Wizard Studio tidak punya langkah warna/tema (dipindah ke Tampilan Website),
 * jadi parameter tema TIDAK dikirim: renderer memakai tema bawaan template.
 */
import type { WebsiteTemplateDto } from '@/studio/api/types';

const WEB_URL = (process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:5005').replace(/\/+$/, '');

/** Naikkan bila kontrak query pratinjau renderer berubah (cache-buster iframe). */
const PREVIEW_VERSION = '4';

export interface TemplatePreviewProfile {
  name?: string;
  logoUrl?: string | null;
  whatsapp?: string;
}

/** Path demo renderer: `manifest.preview.demoPath`, atau `/templates/<slug>` untuk template bawaan. */
function demoPathOf(template: WebsiteTemplateDto): string | null {
  const demoPath = template.manifest?.preview?.demoPath;
  if (demoPath) return demoPath.startsWith('/') ? demoPath : `/${demoPath}`;
  if (template.manifest?.isBuiltin) return `/templates/${encodeURIComponent(template.slug)}`;
  return null;
}

/** `null` bila template tidak punya pratinjau langsung (pakai gambar/thumbnail). */
export function buildTemplatePreviewUrl(
  template: WebsiteTemplateDto,
  profile: TemplatePreviewProfile = {},
): string | null {
  const path = demoPathOf(template);
  if (!path) return null;
  const params = new URLSearchParams({ preview: '1', preview_version: PREVIEW_VERSION });
  if (profile.name?.trim()) params.set('name', profile.name.trim());
  if (profile.logoUrl?.trim()) params.set('logo', profile.logoUrl.trim());
  if (profile.whatsapp?.trim()) params.set('whatsapp', profile.whatsapp.trim());
  return `${WEB_URL}${path}?${params.toString()}`;
}

export function templatePreviewImage(template: WebsiteTemplateDto): string | null {
  return template.manifest?.preview?.imageUrl ?? template.preview_image ?? null;
}

/**
 * URL publik tenant. Production: `https://{slug}.<host renderer>`; lokal
 * (localhost) memakai path `http://localhost:5005/{slug}`.
 */
export function buildTenantWebUrl(slug: string): string {
  try {
    const base = new URL(WEB_URL);
    if (base.hostname === 'localhost' || base.hostname === '127.0.0.1') return `${WEB_URL}/${slug}`;
    base.hostname = `${slug}.${base.hostname}`;
    base.pathname = '/';
    return base.toString().replace(/\/$/, '');
  } catch {
    return `${WEB_URL}/${slug}`;
  }
}

/** Host tampilan pendek untuk kolom alamat (mis. `nama-bisnis.sites.bagdja.com`). */
export function displayHost(slug: string): string {
  return buildTenantWebUrl(slug).replace(/^https?:\/\//, '');
}

/** Bagian tetap di sekitar slug: `{prefix}{slug}{suffix}` (subdomain di production, path di lokal). */
export function slugAddressParts(): { prefix: string; suffix: string } {
  const marker = '__slug__';
  const host = displayHost(marker);
  const at = host.indexOf(marker);
  return { prefix: host.slice(0, at), suffix: host.slice(at + marker.length) };
}
