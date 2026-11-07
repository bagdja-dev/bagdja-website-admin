import type { AndroidAppConfigDto, AndroidBuildDto, AndroidDisplayMode } from '@/studio/api/android';

export interface AndroidForm {
  appName: string;
  packageName: string;
  versionName: string;
  versionCode: string;
  primaryColor: string;
  splashColor: string;
  navigationBarColor: string;
  /** Kosong = tanpa garis pemisah di atas navigation bar. */
  navigationBarDividerColor: string;
  displayMode: AndroidDisplayMode;
}

export type BuildVariant = 'aab-release' | 'apk-release' | 'apk-debug';

export const BUILD_VARIANTS: Record<BuildVariant, { label: string; buildType: 'debug' | 'release'; outputFormat: 'apk' | 'aab' }> = {
  'aab-release': { label: 'AAB Release (Play Store)', buildType: 'release', outputFormat: 'aab' },
  'apk-release': { label: 'APK Release (instal langsung)', buildType: 'release', outputFormat: 'apk' },
  'apk-debug': { label: 'APK Debug (testing, tanpa keystore)', buildType: 'debug', outputFormat: 'apk' },
};

export const DISPLAY_MODES: Record<AndroidDisplayMode, string> = {
  standalone: 'Standar (status & navigation bar terlihat)',
  fullscreen: 'Layar penuh (bar muncul saat diusap)',
  'fullscreen-sticky': 'Layar penuh sticky (bar muncul sebentar lalu sembunyi)',
};

export const POLL_INTERVAL_MS = 5000;
export const DEFAULT_DIVIDER_COLOR = '#E5E5E5';
const DEFAULT_PRIMARY_COLOR = '#7C3AED';
const DEFAULT_SPLASH_COLOR = '#0F172A';

const TERMINAL = new Set(['success', 'succeeded', 'failed', 'failure', 'cancelled', 'canceled', 'error', 'completed']);
const SUCCESS = new Set(['success', 'succeeded', 'completed']);
const DOWNLOADABLE = new Set(['success', 'succeeded']);

export const isTerminalStatus = (status: string): boolean => TERMINAL.has(status.toLowerCase());
export const isSuccessStatus = (status: string): boolean => SUCCESS.has(status.toLowerCase());
/** Unduh boleh untuk `success` maupun `succeeded` (bug lama: hanya `success`). */
export const isDownloadable = (status: string): boolean => DOWNLOADABLE.has(status.toLowerCase());

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    queued: 'Dalam antrean', pending: 'Menunggu', validating: 'Validasi', running: 'Sedang diproses',
    processing: 'Sedang diproses', building: 'Sedang dibuat', signing: 'Signing', uploading: 'Mengunggah',
    success: 'Berhasil', succeeded: 'Berhasil', completed: 'Selesai', failed: 'Gagal', failure: 'Gagal',
    error: 'Gagal', cancelled: 'Dibatalkan', canceled: 'Dibatalkan',
  };
  return labels[status.toLowerCase()] ?? status;
}

/** `succeeded` = sukses (bug lama: diwarnai danger karena termasuk status terminal). */
export function statusTone(status: string): 'success' | 'danger' | 'warning' | 'neutral' {
  const s = status.toLowerCase();
  if (isSuccessStatus(s)) return 'success';
  if (s === 'cancelled' || s === 'canceled') return 'neutral';
  return isTerminalStatus(s) ? 'danger' : 'warning';
}

export function formatVariant(build: AndroidBuildDto): string {
  if (!build.output_format || !build.build_type) return '—';
  return `${build.output_format.toUpperCase()} · ${build.build_type === 'debug' ? 'Debug' : 'Release'}`;
}

export function emptyForm(appName = ''): AndroidForm {
  return {
    appName, packageName: '', versionName: '1.0.0', versionCode: '1',
    primaryColor: DEFAULT_PRIMARY_COLOR, splashColor: DEFAULT_SPLASH_COLOR, navigationBarColor: DEFAULT_SPLASH_COLOR,
    navigationBarDividerColor: '', displayMode: 'standalone',
  };
}

export function formFromConfig(config: AndroidAppConfigDto): AndroidForm {
  return {
    appName: config.app_name,
    packageName: config.package_name,
    versionName: config.version_name,
    versionCode: String(config.version_code),
    primaryColor: config.primary_color,
    splashColor: config.splash_color,
    // NULL di API = mengikuti warna splash.
    navigationBarColor: config.navigation_bar_color ?? config.splash_color,
    navigationBarDividerColor: config.navigation_bar_divider_color ?? '',
    displayMode: config.display_mode,
  };
}

/** Input warna menerima #abc; API hanya menerima #AABBCC. */
export function toSixDigitHex(value: string): string {
  const hex = value.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) return `#${hex.slice(1).split('').map((c) => c + c).join('')}`.toUpperCase();
  return hex.toUpperCase();
}

export function parseFingerprints(input: string): string[] {
  return input.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
}

export interface KeystoreInput {
  file: File | null;
  alias: string;
  storePassword: string;
  keyPassword: string;
}

export function validateAndroidForm(form: AndroidForm, keystore: KeystoreInput, fingerprintInput: string): string | null {
  const code = Number(form.versionCode);
  if (!form.appName.trim() || form.appName.trim().length > 50) return 'Nama aplikasi wajib diisi dan maksimal 50 karakter.';
  if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(form.packageName.trim())) return 'Package name tidak valid. Gunakan format seperti com.example.website.';
  if (!form.versionName.trim() || form.versionName.trim().length > 64) return 'Versi wajib diisi dan maksimal 64 karakter.';
  if (!Number.isInteger(code) || code < 1 || code > 2100000000) return 'Version code harus berupa bilangan bulat antara 1 dan 2.100.000.000.';
  const colors = [form.primaryColor, form.splashColor, form.navigationBarColor, form.navigationBarDividerColor].filter(Boolean);
  if (colors.some((c) => !/^#[0-9A-F]{6}$/.test(toSixDigitHex(c)))) return 'Semua warna harus berformat hex, misalnya #0F172A.';
  if (keystore.file) {
    if (!/\.(jks|p12|pfx)$/i.test(keystore.file.name) || keystore.file.size > 10 * 1024 * 1024) return 'File keystore harus berekstensi .jks, .p12, atau .pfx dan berukuran maksimal 10 MB.';
    if (!keystore.alias.trim() || keystore.alias.trim().length > 255 || !keystore.storePassword || !keystore.keyPassword) return 'Alias, store password, dan key password wajib diisi untuk mengunggah keystore.';
    if (keystore.storePassword.length > 512 || keystore.keyPassword.length > 512) return 'Password keystore maksimal 512 karakter.';
  }
  if (parseFingerprints(fingerprintInput).some((f) => !/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/i.test(f))) return 'Setiap baris fingerprint Play Store harus berformat SHA-256 AA:BB:... (32 byte).';
  return null;
}
