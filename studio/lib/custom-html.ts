/**
 * Helper editor section HTML Kustom.
 *
 * Konstanta protokol sandbox HARUS sama dengan bagdja-website/lib/custom-html-sandbox.ts
 * (dokumen bootstrap di `/api/sandbox/custom-html`). Preview di modal memakai dokumen
 * sandbox yang sama dengan website publik, jadi yang terlihat = yang tayang.
 */

import { uploadAsset } from './upload-asset';

export const CUSTOM_HTML_MESSAGE = {
  ready: 'bagdja:custom-html:ready',
  render: 'bagdja:custom-html:render',
  height: 'bagdja:custom-html:height',
} as const;

export const CUSTOM_HTML_SANDBOX_FLAGS = [
  'allow-scripts',
  'allow-forms',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-top-navigation-by-user-activation',
].join(' ');

/** Sama dengan CUSTOM_HTML_MAX_BYTES di bagdja-website-api/src/common/custom-html.ts. */
export const CUSTOM_HTML_MAX_BYTES = 300 * 1024;

export function getCustomHtmlSandboxUrl(): string {
  const configured = process.env.NEXT_PUBLIC_CUSTOM_HTML_SANDBOX_URL?.trim();
  if (configured) return configured;
  const webUrl = (process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:5005').replace(/\/+$/, '');
  return `${webUrl}/api/sandbox/custom-html`;
}

/** Host aset yang diizinkan CSP sandbox (DEFAULT_CUSTOM_HTML_ASSET_ORIGINS di website). */
export function isAllowedAssetHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'cdn.bagdja.com' || host.endsWith('.r2.dev') || host.endsWith('.supabase.co');
}

export type HtmlIssueLevel = 'error' | 'warning' | 'info';

export interface HtmlIssue {
  level: HtmlIssueLevel;
  message: string;
}

const TAILWIND_CLASS = /^(?:[a-z]+:)*-?(?:bg|text|p[xytrbl]?|m[xytrbl]?|w|h|min-w|min-h|max-w|gap|space-[xy]|rounded|shadow|font|leading|tracking|grid-cols|col-span|items|justify|border|inset|top|left|right|bottom|z|opacity)-[\w./[\]#%-]+$/;
const NETWORK_API = /\b(?:fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource|importScripts)\b/;
const CSS_EXTERNAL_URL = /url\(\s*['"]?(https?:)?\/\/([^/'")\s]+)/gi;

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** Analisis draft HTML: apa yang akan dibuang API / diblokir sandbox, supaya user tahu sebelum menyimpan. */
export function analyzeCustomHtml(html: string): HtmlIssue[] {
  const issues: HtmlIssue[] = [];
  if (!html.trim()) return issues;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const count = (selector: string) => doc.querySelectorAll(selector).length;

  const bytes = byteLength(html);
  const dataImages = Array.from(doc.querySelectorAll('img[src^="data:"]'));
  const dataBytes = dataImages.reduce((total, image) => total + (image.getAttribute('src')?.length ?? 0), 0);
  if (bytes - dataBytes > CUSTOM_HTML_MAX_BYTES) {
    issues.push({ level: 'error', message: `Kode terlalu besar (${Math.ceil(bytes / 1024)} KB). Maksimal ${CUSTOM_HTML_MAX_BYTES / 1024} KB.` });
  }

  const externalScripts = count('script[src]');
  if (externalScripts) issues.push({ level: 'warning', message: `${externalScripts} script eksternal (CDN/library luar) akan dibuang. Tulis JS langsung di dalam <script>.` });
  const links = count('link');
  if (links) issues.push({ level: 'warning', message: `${links} <link> (stylesheet/font luar) akan dibuang. Pakai CSS di <style> dan font sistem.` });
  const frames = count('iframe, frame, object, embed');
  if (frames) issues.push({ level: 'warning', message: `${frames} iframe/embed akan dibuang.` });
  const metaBase = count('meta, base');
  if (metaBase) issues.push({ level: 'info', message: '<meta>/<base> akan dibuang.' });
  if (count('[action], [formaction]')) {
    issues.push({ level: 'info', message: 'Atribut action form dibuang — form tidak bisa mengirim data keluar, hanya diproses JS.' });
  }

  const inlineScripts = Array.from(doc.querySelectorAll('script:not([src])')).map((script) => script.textContent ?? '').join('\n');
  if (NETWORK_API.test(inlineScripts)) {
    issues.push({ level: 'warning', message: 'JS memakai fetch/XHR/WebSocket — permintaan jaringan diblokir di website.' });
  }

  const externalImages = Array.from(doc.querySelectorAll('img[src], source[src], video[src], video[poster]'))
    .map((element) => element.getAttribute('src') ?? element.getAttribute('poster') ?? '')
    .filter((src) => /^https?:\/\//i.test(src))
    .filter((src) => {
      const host = hostOf(src);
      return !host || !isAllowedAssetHost(host);
    });
  const cssText = [
    ...Array.from(doc.querySelectorAll('style')).map((style) => style.textContent ?? ''),
    ...Array.from(doc.querySelectorAll('[style]')).map((element) => element.getAttribute('style') ?? ''),
  ].join('\n');
  const externalCssUrls = Array.from(cssText.matchAll(CSS_EXTERNAL_URL)).filter((match) => !isAllowedAssetHost(match[2]));
  const blockedAssets = externalImages.length + externalCssUrls.length;
  if (blockedAssets) {
    issues.push({ level: 'warning', message: `${blockedAssets} gambar/aset dari domain luar tidak akan tampil. Unggah lewat tombol "Sisipkan gambar".` });
  }
  if (dataImages.length) {
    issues.push({ level: 'info', message: `${dataImages.length} gambar base64 akan diunggah ke CDN saat disimpan.` });
  }

  const classTokens = Array.from(doc.querySelectorAll('[class]')).flatMap((element) => Array.from(element.classList));
  const tailwindLike = classTokens.filter((token) => TAILWIND_CLASS.test(token));
  if (tailwindLike.length >= 5 && !/\.(?:bg|text|p|m|w|h|flex|grid)-/.test(cssText)) {
    issues.push({ level: 'warning', message: `Terdeteksi class Tailwind (mis. ${tailwindLike.slice(0, 3).join(', ')}). Tailwind tidak dimuat — minta AI memakai CSS biasa.` });
  }
  if (/\b\d+(?:\.\d+)?[sld]?vh\b/.test(cssText)) {
    issues.push({ level: 'info', message: 'Satuan vh mengikuti tinggi bingkai section, bukan layar. Hindari min-height: 100vh.' });
  }
  return issues;
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([\s\S]*)$/i.exec(dataUrl);
  if (!match) return null;
  try {
    const binary = atob(match[2].replace(/\s+/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: match[1].toLowerCase() });
  } catch {
    return null;
  }
}

async function isDecodableImage(blob: Blob): Promise<boolean> {
  if (blob.type === 'image/svg+xml') return blob.size > 0;
  try {
    const bitmap = await createImageBitmap(blob);
    bitmap.close();
    return true;
  } catch {
    return false;
  }
}

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
};

export interface UploadDataImagesResult {
  html: string;
  uploaded: number;
  invalid: number;
}

/**
 * Unggah gambar `data:` di <img> ke CDN lalu ganti src-nya. Penggantian berbasis string
 * supaya format kode user tidak berubah. Gambar rusak (base64 tidak valid) dikosongkan.
 */
export async function uploadDataImages(
  html: string,
  websiteId: string | undefined,
  folder: string,
): Promise<UploadDataImagesResult> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const sources = Array.from(new Set(
    Array.from(doc.querySelectorAll('img[src^="data:"]'))
      .map((image) => image.getAttribute('src') ?? '')
      .filter(Boolean),
  ));
  let next = html;
  let uploaded = 0;
  let invalid = 0;
  for (const [index, src] of sources.entries()) {
    const blob = dataUrlToBlob(src);
    if (!blob || !(await isDecodableImage(blob))) {
      next = next.split(src).join('');
      invalid += 1;
      continue;
    }
    const extension = EXTENSION_BY_TYPE[blob.type] ?? 'png';
    const file = new File([blob], `custom-html-${Date.now()}-${index}.${extension}`, { type: blob.type });
    const result = await uploadAsset(file, websiteId, folder);
    next = next.split(src).join(result.url);
    uploaded += 1;
  }
  return { html: next, uploaded, invalid };
}

export async function formatHtml(html: string): Promise<string> {
  const [{ format }, htmlPlugin, postcssPlugin, babelPlugin, estreePlugin] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/html'),
    import('prettier/plugins/postcss'),
    import('prettier/plugins/babel'),
    import('prettier/plugins/estree'),
  ]);
  return format(html, {
    parser: 'html',
    plugins: [htmlPlugin, postcssPlugin, babelPlugin, estreePlugin],
    printWidth: 100,
    tabWidth: 2,
  });
}

export const CUSTOM_HTML_AI_PROMPT = `Buatkan satu section HTML untuk website dengan aturan berikut:
1. Semua CSS ditulis di dalam <style> atau atribut style. Jangan pakai Tailwind, Bootstrap, atau framework CSS lain.
2. JS boleh untuk interaksi UI (tab, slider, accordion, animasi) di dalam <script> inline. Jangan pakai library dari CDN, dan jangan memanggil fetch/API.
3. Jangan memuat font, stylesheet, atau script dari luar. Pakai font sistem (system-ui, sans-serif).
4. Untuk gambar, pakai <img src="" alt="deskripsi gambar"> — gambarnya akan saya isi sendiri.
5. Responsif dengan media query. Hindari tinggi 100vh.
6. Balas hanya dengan kode HTML-nya.

Isi section: `;
