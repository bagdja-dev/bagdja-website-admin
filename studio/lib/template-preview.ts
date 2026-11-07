/**
 * URL renderer untuk pratinjau template & website tenant — ditulis ulang untuk
 * Studio (tidak mengimpor app/lib/preview-url).
 *
 * Wizard Studio tidak punya langkah warna/tema (dipindah ke Tampilan Website),
 * jadi parameter tema TIDAK dikirim: renderer memakai tema bawaan template.
 */
import type { WebsiteFooterSettingsDto, WebsiteTemplateDto, WebsiteThemeConfigDto } from '@/studio/api/types';

const WEB_URL = (process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:5005').replace(/\/+$/, '');

/** Naikkan bila kontrak query pratinjau renderer berubah (cache-buster iframe). */
const PREVIEW_VERSION = '4';

export interface TemplatePreviewProfile {
  name?: string;
  tagline?: string | null;
  logoUrl?: string | null;
  whatsapp?: string;
  phone?: string | null;
  email?: string | null;
  footerSettings?: WebsiteFooterSettingsDto | null;
  theme?: WebsiteThemeConfigDto | null;
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
  if (profile.tagline?.trim()) params.set('tagline', profile.tagline.trim());
  if (profile.logoUrl?.trim()) params.set('logo', profile.logoUrl.trim());
  if (profile.whatsapp?.trim()) params.set('whatsapp', profile.whatsapp.trim());
  if (profile.phone?.trim()) params.set('phone', profile.phone.trim());
  if (profile.email?.trim()) params.set('email', profile.email.trim());
  if (profile.footerSettings) params.set('footer_settings', JSON.stringify(profile.footerSettings));

  const theme = profile.theme;
  if (theme?.mode) params.set('theme_mode', theme.mode);
  if (theme?.accent) params.set('theme_accent', theme.accent);

  const colorParams: Record<string, keyof NonNullable<WebsiteThemeConfigDto['colors']>> = {
    c_bg: 'background',
    c_surface: 'surface',
    c_text: 'text',
    c_muted: 'textMuted',
    c_accent: 'accent',
    c_accent_h: 'accentHover',
    c_border: 'border',
    c_on_accent: 'onAccent',
  };
  for (const [param, key] of Object.entries(colorParams)) {
    const color = theme?.colors?.[key];
    if (color) params.set(param, color.replace(/^#/, ''));
  }

  const extendedColors = Object.fromEntries(
    (['heading', 'accentMuted', 'success', 'warning', 'danger'] as const)
      .flatMap((key) => theme?.colors?.[key] ? [[key, theme.colors[key]]] : []),
  );
  if (Object.keys(extendedColors).length > 0 || theme?.components) {
    params.set('theme_x', JSON.stringify({
      ...(Object.keys(extendedColors).length > 0 ? { colors: extendedColors } : {}),
      ...(theme?.components ? { components: theme.components } : {}),
    }));
  }

  const headingFont = theme?.typography?.headingFont ?? theme?.font;
  const bodyFont = theme?.typography?.bodyFont ?? theme?.font;
  if (headingFont) params.set('tf_head', headingFont);
  if (bodyFont) params.set('tf_body', bodyFont);
  if (theme?.typography?.headingWeight) params.set('tw_head', theme.typography.headingWeight);
  if (theme?.typography?.bodyWeight) params.set('tw_body', theme.typography.bodyWeight);
  if (theme?.typography?.headingScale) params.set('ts_scale', theme.typography.headingScale);
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

/** Perangkat pratinjau editor halaman (S8): desktop penuh atau HP 390px. */
export type PagePreviewDevice = 'desktop' | 'mobile';

/**
 * URL route preview renderer (S8-A) untuk satu halaman website — versi
 * tersimpan, tanpa cache; draft dikirim terpisah lewat protokol preview v1.
 * Production: `https://{slug}.<host renderer>/__preview?page=…`; lokal:
 * `http://localhost:5005/{slug}/__preview?page=…`.
 */
export function buildPagePreviewUrl(
  website: { slug: string },
  page: { id: string },
  device: PagePreviewDevice = 'desktop',
): string {
  const params = new URLSearchParams({ page: page.id, device });
  return `${buildTenantWebUrl(website.slug)}/__preview?${params.toString()}`;
}
