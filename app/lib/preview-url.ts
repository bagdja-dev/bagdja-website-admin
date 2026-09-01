import type { WebsiteTemplate } from './types';
import { extractTemplateTheme, themeToSearchParams, type WebsiteTheme } from './website-theme';

const WEB_URL = (process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:5005').replace(/\/+$/, '');

/** Template slugs dengan halaman live preview di web app */
export const IFRAME_PREVIEW_TEMPLATES = new Set(['barber-classic', 'store-classic', 'workshop']);

export interface WebsitePreviewProfile {
  name?: string;
  tagline?: string;
  logo_url?: string;
  whatsapp?: string;
  phone?: string;
  email?: string;
  theme?: WebsiteTheme;
}

export function buildTemplatePreviewUrl(
  template: WebsiteTemplate,
  profile: WebsitePreviewProfile = {},
): string | null {
  if (!IFRAME_PREVIEW_TEMPLATES.has(template.slug)) return null;

  const templateTheme = extractTemplateTheme(template.structure);
  // Bump this when the renderer preview contract changes so an already-open
  // admin session cannot reuse a cached iframe document from an older deploy.
  const params = new URLSearchParams({ preview: '1', preview_version: '2' });
  if (profile.name?.trim()) params.set('name', profile.name.trim());
  if (profile.tagline?.trim()) params.set('tagline', profile.tagline.trim());
  if (profile.logo_url?.trim()) params.set('logo', profile.logo_url.trim());
  if (profile.whatsapp?.trim()) params.set('whatsapp', profile.whatsapp.trim());
  if (profile.phone?.trim()) params.set('phone', profile.phone.trim());
  if (profile.email?.trim()) params.set('email', profile.email.trim());

  const themeParams = themeToSearchParams(templateTheme, profile.theme ?? {});
  Object.entries(themeParams).forEach(([k, v]) => params.set(k, v));

  return `${WEB_URL}/templates/${template.slug}?${params.toString()}`;
}

export function openTemplatePreview(
  template: WebsiteTemplate,
  profile: WebsitePreviewProfile = {},
): void {
  const url = buildTemplatePreviewUrl(template, profile);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * URL publik tenant di web renderer. Production: subdomain per tenant
 * (`https://{slug}.sites.bagdja.com[/page]`, lihat middleware.ts web/ — Phase 8a).
 * Local dev tetap path-based (`http://localhost:5005/{slug}[/page]`) karena
 * localhost tidak punya DNS wildcard/cert untuk dites sebagai subdomain nyata.
 */
export function buildTenantWebUrl(slug: string, pageSlug?: string): string {
  let base: URL;
  try {
    base = new URL(WEB_URL);
  } catch {
    return pageSlug ? `${WEB_URL}/${slug}/${pageSlug}` : `${WEB_URL}/${slug}`;
  }

  if (base.hostname === 'localhost' || base.hostname === '127.0.0.1') {
    return pageSlug ? `${WEB_URL}/${slug}/${pageSlug}` : `${WEB_URL}/${slug}`;
  }

  base.hostname = `${slug}.${base.hostname}`;
  base.pathname = pageSlug ? `/${pageSlug}` : '/';
  return base.toString();
}
