/**
 * Pemuat browser.js kandidat untuk pratinjau mode client (plan/website-builder/template-client-rendering-plan.md §8).
 * Diambil dari CDN (R2), SHA-256 dicocokkan dengan nilai dari API sebelum dipakai, di-cache di memori per hash.
 * Salinan bagdja-website-platform/lib/template-browser-bundle.ts — jaga tetap sinkron.
 */

export interface TemplateBrowserBundleRef {
  url: string;
  sha256: string;
}

const MAX_BROWSER_BUNDLE_BYTES = 1024 * 1024;
const memory = new Map<string, Promise<string>>();

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await window.crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function fetchBundle({ url, sha256 }: TemplateBrowserBundleRef): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer' });
  } catch {
    throw new Error('browser.js template tidak dapat diunduh (periksa koneksi/CORS CDN).');
  }
  if (!response.ok) throw new Error(`browser.js template tidak dapat diunduh (${response.status}).`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_BROWSER_BUNDLE_BYTES) {
    throw new Error('browser.js template kosong atau melebihi batas ukuran.');
  }
  if ((await sha256Hex(bytes)) !== sha256) throw new Error('Isi browser.js tidak cocok dengan hasil Cek package.');
  return new TextDecoder().decode(bytes);
}

export function loadTemplateBrowserBundle(ref: TemplateBrowserBundleRef): Promise<string> {
  if (!/^[a-f0-9]{64}$/.test(ref.sha256) || !/^https?:\/\//.test(ref.url)) {
    return Promise.reject(new Error('Referensi browser.js tidak valid.'));
  }
  let pending = memory.get(ref.sha256);
  if (!pending) {
    pending = fetchBundle(ref);
    memory.set(ref.sha256, pending);
    pending.catch(() => memory.delete(ref.sha256));
  }
  return pending;
}
