'use client';

import { Button, Card, CardBody, CardHeader, Chip, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ColorPickerField } from '../../components/color-picker-field';
import { useConfirmDialog } from '../../components/confirm-dialog';
import { LoadingSpinner } from '../../components/loading-spinner';
import { NoWebsiteState } from '../../components/no-website-state';
import { useWebsiteContext } from '../../context/website-context';
import { ApiError, apiClient } from '../../lib/api-client';
import { hasMinRole } from '../../lib/types';

type AndroidDisplayMode = 'standalone' | 'fullscreen' | 'fullscreen-sticky';

interface AndroidAppConfiguration {
  id: string;
  website_id: string;
  app_name: string;
  package_name: string;
  version_name: string;
  version_code: number;
  package_name_locked: boolean;
  has_release_keystore: boolean;
  keystore_alias: string | null;
  icon_url: string | null;
  splash_image_url: string | null;
  primary_color: string;
  splash_color: string;
  navigation_bar_color: string | null;
  navigation_bar_divider_color: string | null;
  display_mode: AndroidDisplayMode;
  release_signing_cert_sha256: string[];
  play_store_signing_cert_sha256: string[];
  retired_signing_cert_sha256: string[];
  target_url?: string;
}

interface AndroidBuild {
  id: string;
  status: string;
  progress: number;
  stage: string;
  build_type: string | null;
  output_format: string | null;
  bundle_id: string | null;
  artifact_url: string | null;
  artifact_url_expires_at: string | null;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
}

interface BuildRequest {
  buildType: 'debug' | 'release';
  outputFormat: 'apk' | 'aab';
  versionName: string;
  versionCode: number;
}

interface PendingBuildRetry {
  key: string;
  payload: BuildRequest;
}

interface ConfigForm {
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

type BuildVariantOption = 'aab-release' | 'apk-release' | 'apk-debug';

const BUILD_VARIANT_OPTIONS: Record<BuildVariantOption, { label: string; buildType: 'debug' | 'release'; outputFormat: 'apk' | 'aab' }> = {
  'aab-release': { label: 'AAB Release (Play Store)', buildType: 'release', outputFormat: 'aab' },
  'apk-release': { label: 'APK Release (instal langsung)', buildType: 'release', outputFormat: 'apk' },
  'apk-debug': { label: 'APK Debug (testing, tanpa keystore)', buildType: 'debug', outputFormat: 'apk' },
};

const DISPLAY_MODE_OPTIONS: Record<AndroidDisplayMode, string> = {
  standalone: 'Standar (status & navigation bar terlihat)',
  fullscreen: 'Layar penuh (bar muncul saat diusap)',
  'fullscreen-sticky': 'Layar penuh sticky (bar muncul sebentar lalu sembunyi)',
};

const DEFAULT_PRIMARY_COLOR = '#7C3AED';
const DEFAULT_SPLASH_COLOR = '#0F172A';
const DEFAULT_DIVIDER_COLOR = '#E5E5E5';

const POLL_INTERVAL_MS = 5000;
const TERMINAL_STATUSES = new Set([
  'success',
  'succeeded',
  'failed',
  'failure',
  'cancelled',
  'canceled',
  'error',
  'completed',
]);

const INPUT_CLASS = 'w-full rounded-lg border border-default-200 bg-white px-3 py-2 text-sm font-normal text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-default-100 disabled:text-default-500';

function emptyForm(appName = ''): ConfigForm {
  return {
    appName,
    packageName: '',
    versionName: '1.0.0',
    versionCode: '1',
    primaryColor: DEFAULT_PRIMARY_COLOR,
    splashColor: DEFAULT_SPLASH_COLOR,
    navigationBarColor: DEFAULT_SPLASH_COLOR,
    navigationBarDividerColor: '',
    displayMode: 'standalone',
  };
}

function formFromConfiguration(config: AndroidAppConfiguration): ConfigForm {
  return {
    appName: config.app_name,
    packageName: config.package_name,
    versionName: config.version_name,
    versionCode: String(config.version_code),
    primaryColor: config.primary_color,
    splashColor: config.splash_color,
    // NULL di API = mengikuti warna splash (perilaku builder sebelum field ini ada).
    navigationBarColor: config.navigation_bar_color ?? config.splash_color,
    navigationBarDividerColor: config.navigation_bar_divider_color ?? '',
    displayMode: config.display_mode,
  };
}

/** ColorPickerField menerima #abc; API hanya menerima #aabbcc. */
function toSixDigitHex(value: string): string {
  const hex = value.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex.slice(1).split('').map((char) => char + char).join('')}`.toUpperCase();
  }
  return hex.toUpperCase();
}

function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status.toLowerCase());
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    queued: 'Dalam antrean',
    pending: 'Menunggu',
    validating: 'Validasi',
    running: 'Sedang diproses',
    processing: 'Sedang diproses',
    building: 'Sedang dibuat',
    signing: 'Signing',
    uploading: 'Mengunggah',
    success: 'Berhasil',
    completed: 'Selesai',
    failed: 'Gagal',
    error: 'Gagal',
    cancelled: 'Dibatalkan',
  };
  return labels[status.toLowerCase()] ?? status;
}

function statusColor(status: string): 'success' | 'danger' | 'warning' | 'default' {
  const normalized = status.toLowerCase();
  if (normalized === 'success' || normalized === 'completed') return 'success';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'default';
  return isTerminalStatus(status) ? 'danger' : 'warning';
}

function formatVariant(build: AndroidBuild): string {
  if (!build.output_format || !build.build_type) return '—';
  return `${build.output_format.toUpperCase()} · ${build.build_type === 'debug' ? 'Debug' : 'Release'}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Terjadi kesalahan. Silakan coba lagi.';
}

async function readUploadResponse(response: Response, fallback: string): Promise<AndroidAppConfiguration> {
  const body = await response.json();
  if (!response.ok) {
    throw new ApiError(
      typeof body.message === 'string'
        ? body.message
        : typeof body.error === 'string'
          ? body.error
          : fallback,
      response.status,
    );
  }
  return body as AndroidAppConfiguration;
}

function BuildProgress({ build }: { build: AndroidBuild }) {
  const progress = Math.max(0, Math.min(100, build.progress ?? 0));
  return (
    <div className="min-w-32">
      <div className="text-sm">{progress}%</div>
      {build.stage && !isTerminalStatus(build.status) && <div className="text-xs text-default-500">{build.stage}</div>}
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-default-100">
        <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {hint && <p className="text-xs text-default-500">{hint}</p>}
    </div>
  );
}

export default function AndroidAppPage() {
  const { activeWebsite, websiteId, role, loading: contextLoading } = useWebsiteContext();
  const canManage = role !== null && hasMinRole(role, 'admin');
  const { confirm, dialog } = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const [loadedWebsiteId, setLoadedWebsiteId] = useState<string | null>(null);
  const [configuration, setConfiguration] = useState<AndroidAppConfiguration | null>(null);
  const [form, setForm] = useState<ConfigForm>(() => emptyForm());
  /** true saat ada perubahan yang belum disimpan — Start Build menunggu Simpan seperti di Bookpedia. */
  const [dirty, setDirty] = useState(false);
  const [buildVariant, setBuildVariant] = useState<BuildVariantOption>('apk-debug');
  const [builds, setBuilds] = useState<AndroidBuild[]>([]);
  const [loadingBuilds, setLoadingBuilds] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [submittingBuild, setSubmittingBuild] = useState(false);
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);
  const [keystoreFile, setKeystoreFile] = useState<File | null>(null);
  const [alias, setAlias] = useState('');
  const [storePassword, setStorePassword] = useState('');
  const [keyPassword, setKeyPassword] = useState('');
  const [playStoreFingerprintInput, setPlayStoreFingerprintInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState<'icon' | 'splash' | null>(null);
  const [removingImage, setRemovingImage] = useState<'icon' | 'splash' | null>(null);
  const [pendingBuildRetry, setPendingBuildRetry] = useState<PendingBuildRetry | null>(null);
  const activeWebsiteId = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBuilds = useCallback(async (id: string) => {
    return apiClient<AndroidBuild[]>(`/api/websites/${encodeURIComponent(id)}/android-app/builds`);
  }, []);

  useEffect(() => {
    activeWebsiteId.current = websiteId;
    setLoadedWebsiteId(null);
    setConfiguration(null);
    setForm(emptyForm(activeWebsite?.website.name ?? ''));
    setDirty(false);
    setBuilds([]);
    setError('');
    setMessage('');
    setKeystoreFile(null);
    setAlias('');
    setStorePassword('');
    setKeyPassword('');
    setPlayStoreFingerprintInput('');
    setUploadingImage(null);
    setRemovingImage(null);
    setPendingBuildRetry(null);

    if (contextLoading) return;
    if (!websiteId || !canManage) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const load = async () => {
      try {
        const config = await apiClient<AndroidAppConfiguration>(
          `/api/websites/${encodeURIComponent(websiteId)}/android-app`,
        );
        if (cancelled) return;
        setConfiguration(config);
        setForm(formFromConfiguration(config));
        try {
          const initialBuilds = await loadBuilds(websiteId);
          if (!cancelled) setBuilds(initialBuilds);
        } catch (buildError) {
          if (!cancelled) setError(`Konfigurasi termuat, tetapi riwayat build gagal dimuat: ${getErrorMessage(buildError)}`);
        }
      } catch (loadError) {
        if (cancelled) return;
        if (loadError instanceof ApiError && loadError.status === 404) {
          setConfiguration(null);
        } else {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadedWebsiteId(websiteId);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeWebsite?.website.name, canManage, contextLoading, loadBuilds, websiteId]);

  useEffect(() => {
    if (!websiteId || !configuration || !builds.some((build) => !isTerminalStatus(build.status))) return;
    let cancelled = false;
    const interval = window.setInterval(() => {
      void loadBuilds(websiteId)
        .then((nextBuilds) => {
          if (!cancelled && activeWebsiteId.current === websiteId) {
            setBuilds(nextBuilds);
            setError('');
          }
        })
        .catch((pollError: unknown) => {
          if (!cancelled && activeWebsiteId.current === websiteId) {
            setError(`Gagal memperbarui status build: ${getErrorMessage(pollError)}`);
          }
        });
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [builds, configuration, loadBuilds, websiteId]);

  const updateForm = <K extends keyof ConfigForm>(field: K, value: ConfigForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setDirty(true);
  };

  /** Respons upload/fingerprint tidak membawa target_url; pertahankan yang sudah ada. */
  const applyConfiguration = (next: AndroidAppConfiguration) => {
    setConfiguration((current) => ({ ...next, target_url: next.target_url ?? current?.target_url }));
  };

  const refreshBuilds = async () => {
    if (!websiteId) return;
    setLoadingBuilds(true);
    try {
      const refreshedBuilds = await loadBuilds(websiteId);
      if (activeWebsiteId.current === websiteId) {
        setBuilds(refreshedBuilds);
        setError('');
      }
    } catch (refreshError) {
      if (activeWebsiteId.current === websiteId) setError(getErrorMessage(refreshError));
    } finally {
      setLoadingBuilds(false);
    }
  };

  const parsePlayStoreFingerprints = () => playStoreFingerprintInput
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);

  const validateBeforeSave = (): string | null => {
    const parsedVersionCode = Number(form.versionCode);
    if (!form.appName.trim() || form.appName.trim().length > 50) return 'Nama aplikasi wajib diisi dan maksimal 50 karakter.';
    if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(form.packageName.trim())) {
      return 'Package name tidak valid. Gunakan format seperti com.example.website.';
    }
    if (!form.versionName.trim() || form.versionName.trim().length > 64) return 'Versi wajib diisi dan maksimal 64 karakter.';
    if (!Number.isInteger(parsedVersionCode) || parsedVersionCode < 1 || parsedVersionCode > 2100000000) {
      return 'Version code harus berupa bilangan bulat antara 1 dan 2.100.000.000.';
    }
    const colors = [form.primaryColor, form.splashColor, form.navigationBarColor, form.navigationBarDividerColor].filter(Boolean);
    if (colors.some((color) => !/^#[0-9A-F]{6}$/.test(toSixDigitHex(color)))) return 'Semua warna harus berformat hex, misalnya #0F172A.';
    if (keystoreFile) {
      if (!/\.(jks|p12|pfx)$/i.test(keystoreFile.name) || keystoreFile.size > 10 * 1024 * 1024) {
        return 'File keystore harus berekstensi .jks, .p12, atau .pfx dan berukuran maksimal 10 MB.';
      }
      if (!alias.trim() || alias.trim().length > 255 || !storePassword || !keyPassword) {
        return 'Alias, store password, dan key password wajib diisi untuk mengunggah keystore.';
      }
      if (storePassword.length > 512 || keyPassword.length > 512) return 'Password keystore maksimal 512 karakter.';
    }
    if (parsePlayStoreFingerprints().some((fingerprint) => !/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/i.test(fingerprint))) {
      return 'Setiap baris fingerprint Play Store harus berformat SHA-256 AA:BB:... (32 byte).';
    }
    return null;
  };

  /**
   * Satu tombol Simpan seperti Bookpedia: konfigurasi + tampilan, lalu keystore baru
   * dan fingerprint Play Store bila diisi. Langkah lanjutan yang gagal tidak
   * membatalkan konfigurasi yang sudah tersimpan.
   */
  const saveAll = async () => {
    if (!websiteId) return;
    const validationError = validateBeforeSave();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    const saved: string[] = [];
    const failures: string[] = [];
    try {
      const config = await apiClient<AndroidAppConfiguration>(
        `/api/websites/${encodeURIComponent(websiteId)}/android-app`,
        {
          method: 'PUT',
          body: JSON.stringify({
            appName: form.appName.trim(),
            packageName: form.packageName.trim(),
            versionName: form.versionName.trim(),
            versionCode: Number(form.versionCode),
            primaryColor: toSixDigitHex(form.primaryColor),
            splashColor: toSixDigitHex(form.splashColor),
            navigationBarColor: toSixDigitHex(form.navigationBarColor),
            navigationBarDividerColor: form.navigationBarDividerColor ? toSixDigitHex(form.navigationBarDividerColor) : null,
            displayMode: form.displayMode,
          }),
        },
      );
      if (activeWebsiteId.current !== websiteId) return;
      applyConfiguration(config);
      setForm(formFromConfiguration(config));
      saved.push('Konfigurasi');

      if (keystoreFile) {
        try {
          const body = new FormData();
          body.append('file', keystoreFile);
          body.append('alias', alias.trim());
          body.append('storePassword', storePassword);
          body.append('keyPassword', keyPassword);
          const response = await fetch(`/api/android-apps/${encodeURIComponent(websiteId)}/keystore`, { method: 'POST', body });
          applyConfiguration(await readUploadResponse(response, 'Gagal mengunggah signing key.'));
          setKeystoreFile(null);
          setAlias('');
          setStorePassword('');
          setKeyPassword('');
          if (fileInputRef.current) fileInputRef.current.value = '';
          saved.push('keystore');
        } catch (keystoreError) {
          failures.push(`Keystore: ${getErrorMessage(keystoreError)}`);
        }
      }

      const fingerprints = parsePlayStoreFingerprints();
      if (fingerprints.length) {
        try {
          applyConfiguration(await apiClient<AndroidAppConfiguration>(
            `/api/websites/${encodeURIComponent(websiteId)}/android-app/signing-fingerprints`,
            { method: 'POST', body: JSON.stringify({ fingerprints }) },
          ));
          setPlayStoreFingerprintInput('');
          saved.push('fingerprint Play Store');
        } catch (fingerprintError) {
          failures.push(`Fingerprint Play Store: ${getErrorMessage(fingerprintError)}`);
        }
      }

      try {
        const refreshed = await apiClient<AndroidAppConfiguration>(`/api/websites/${encodeURIComponent(websiteId)}/android-app`);
        if (activeWebsiteId.current === websiteId) applyConfiguration(refreshed);
      } catch (refreshError) {
        failures.push(`Target URL gagal dimuat ulang: ${getErrorMessage(refreshError)}`);
      }

      if (activeWebsiteId.current !== websiteId) return;
      setMessage(`${saved.join(', ')} tersimpan.`);
      if (failures.length) {
        setError(failures.join(' '));
      } else {
        setDirty(false);
      }
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const uploadImageAsset = async (assetType: 'icon' | 'splash', image: File) => {
    if (!websiteId) return;
    if (image.size > 5 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(image.type)) {
      setError('Pilih gambar PNG, JPEG, atau WebP dengan ukuran maksimal 5 MB.');
      return;
    }
    if (assetType === 'icon') {
      try {
        const bitmap = await createImageBitmap(image);
        const validDimensions = bitmap.width >= 512 && bitmap.height >= 512 && bitmap.width === bitmap.height;
        bitmap.close();
        if (!validDimensions) {
          setError('App icon harus berbentuk persegi dan minimal berukuran 512 × 512 piksel.');
          return;
        }
      } catch {
        setError('Gambar app icon tidak dapat dibaca.');
        return;
      }
    }

    setUploadingImage(assetType);
    setError('');
    setMessage('');
    const body = new FormData();
    body.append('file', image);
    try {
      const response = await fetch(
        `/api/android-apps/${encodeURIComponent(websiteId)}/assets/${assetType}`,
        { method: 'POST', body },
      );
      const updated = await readUploadResponse(response, 'Gagal mengunggah gambar aplikasi.');
      if (activeWebsiteId.current !== websiteId) return;
      applyConfiguration(updated);
      setMessage(assetType === 'icon' ? 'App icon berhasil diperbarui.' : 'Splash screen berhasil diperbarui.');
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setUploadingImage(null);
    }
  };

  const removeImageAsset = async (assetType: 'icon' | 'splash') => {
    if (!websiteId) return;
    setRemovingImage(assetType);
    setError('');
    setMessage('');
    try {
      const response = await fetch(
        `/api/android-apps/${encodeURIComponent(websiteId)}/assets/${assetType}`,
        { method: 'DELETE' },
      );
      const updated = await readUploadResponse(response, 'Gagal menghapus gambar aplikasi.');
      if (activeWebsiteId.current !== websiteId) return;
      applyConfiguration(updated);
      setMessage(assetType === 'icon' ? 'App icon dihapus.' : 'Splash screen dihapus.');
    } catch (removeError) {
      setError(getErrorMessage(removeError));
    } finally {
      setRemovingImage(null);
    }
  };

  const submitBuild = async (retry?: PendingBuildRetry) => {
    if (!websiteId || !configuration) return;
    const variant = BUILD_VARIANT_OPTIONS[buildVariant];
    const request: PendingBuildRetry = retry ?? {
      key: crypto.randomUUID(),
      payload: {
        buildType: variant.buildType,
        outputFormat: variant.outputFormat,
        versionName: configuration.version_name,
        versionCode: configuration.version_code,
      },
    };
    setSubmittingBuild(true);
    setError('');
    setMessage('');
    try {
      const created = await apiClient<AndroidBuild>(
        `/api/websites/${encodeURIComponent(websiteId)}/android-app/builds`,
        {
          method: 'POST',
          headers: { 'Idempotency-Key': request.key },
          body: JSON.stringify(request.payload),
        },
      );
      if (activeWebsiteId.current !== websiteId) return;
      setPendingBuildRetry(null);
      setBuilds((current) => [created, ...current.filter((build) => build.id !== created.id)]);
      setMessage('Build masuk antrean. Status akan diperbarui otomatis.');
    } catch (buildError) {
      setPendingBuildRetry(request);
      setError(getErrorMessage(buildError));
    } finally {
      setSubmittingBuild(false);
    }
  };

  const downloadBuild = async (jobId: string) => {
    if (!websiteId) return;
    setDownloadingJobId(jobId);
    setError('');
    try {
      const latest = await apiClient<AndroidBuild>(
        `/api/websites/${encodeURIComponent(websiteId)}/android-app/builds/${encodeURIComponent(jobId)}`,
      );
      if (!latest.artifact_url) throw new Error('URL artifact belum tersedia. Segarkan riwayat setelah build berhasil.');
      const downloadUrl = new URL(latest.artifact_url);
      if (downloadUrl.protocol !== 'https:') throw new Error('URL artifact tidak aman dan tidak dapat dibuka.');
      if (latest.artifact_url_expires_at) {
        const expiresAt = new Date(latest.artifact_url_expires_at).getTime();
        if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
          throw new Error('URL unduhan sudah kedaluwarsa atau tidak valid. Segarkan riwayat build lalu coba lagi.');
        }
      }
      window.location.assign(downloadUrl.toString());
    } catch (downloadError) {
      setError(getErrorMessage(downloadError));
    } finally {
      setDownloadingJobId(null);
    }
  };

  const retireFingerprint = async (fingerprint: string) => {
    if (!websiteId) return;
    const ok = await confirm({
      title: 'Pensiunkan fingerprint?',
      message: 'Fingerprint ini tidak lagi dipercaya. Build yang sudah ditandatangani dengan key ini mungkin tidak dapat membuka TWA.',
      confirmLabel: 'Ya, pensiunkan',
    });
    if (!ok) return;
    setError('');
    setMessage('');
    try {
      const updated = await apiClient<AndroidAppConfiguration>(
        `/api/websites/${encodeURIComponent(websiteId)}/android-app/signing-fingerprints`,
        { method: 'DELETE', body: JSON.stringify({ fingerprint }) },
      );
      if (activeWebsiteId.current === websiteId) {
        applyConfiguration(updated);
        setMessage('Fingerprint signing lama dipensiunkan.');
      }
    } catch (retireError) {
      setError(getErrorMessage(retireError));
    }
  };

  if (
    contextLoading ||
    loading ||
    (canManage && websiteId !== null && loadedWebsiteId !== websiteId)
  ) {
    return <LoadingSpinner />;
  }
  if (!websiteId || !activeWebsite) return <NoWebsiteState />;
  if (!canManage) {
    return (
      <Card>
        <CardBody className="p-6">
          <h1 className="text-lg font-semibold">Akses terbatas</h1>
          <p className="mt-2 text-sm text-default-500">
            Hanya owner atau admin website yang dapat mengelola aplikasi Android.
          </p>
        </CardBody>
      </Card>
    );
  }

  const configurationExists = configuration !== null;
  const buildInProgress = builds.some((build) => !isTerminalStatus(build.status));
  const isReleaseBuild = BUILD_VARIANT_OPTIONS[buildVariant].buildType === 'release';
  const needsKeystore = isReleaseBuild && !configuration?.has_release_keystore;
  const busy = saving || uploadingImage !== null || removingImage !== null;
  const canStartBuild = configurationExists && !dirty && !buildInProgress && pendingBuildRetry === null && !needsKeystore && !busy;
  const targetUrlHint = activeWebsite.website.domain && activeWebsite.website.domain_verified_at
    ? `Domain custom ${activeWebsite.website.domain} terverifikasi.`
    : activeWebsite.website.domain
      ? `Domain custom ${activeWebsite.website.domain} belum terverifikasi; aplikasi menggunakan subdomain platform.`
      : 'Website menggunakan subdomain platform HTTPS.';

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {dialog}
      <div>
        <p className="text-sm text-default-500">{activeWebsite.website.name}</p>
        <h1 className="text-2xl font-bold">Aplikasi Android</h1>
        <p className="mt-1 text-sm text-default-500">
          TWA menampilkan website online melalui HTTPS. Perubahan package name atau signing key dapat berdampak pada update aplikasi yang sudah dibagikan.
        </p>
      </div>

      <Card className="border-0 shadow-md ring-1 ring-default-100">
        <CardHeader className="flex flex-row items-start justify-between gap-4 px-5 pt-5">
          <div>
            <h2 className="text-lg font-semibold">Build Aplikasi Android</h2>
            <p className="text-sm text-default-500">Build TWA untuk website aktif dan riwayat artifact-nya.</p>
          </div>
          <Button size="sm" variant="bordered" isLoading={loadingBuilds} isDisabled={!configurationExists} onPress={() => void refreshBuilds()}>
            Segarkan
          </Button>
        </CardHeader>
        <CardBody className="space-y-6 px-5 pb-5">
          <section>
            <h3 className="mb-3 text-base font-semibold">Konfigurasi build</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Nama aplikasi" htmlFor="android-app-name" hint="Nama yang tampil di bawah icon launcher Android.">
                <input id="android-app-name" maxLength={50} required value={form.appName} onChange={(event) => updateForm('appName', event.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field
                label="Package name"
                htmlFor="android-package-name"
                hint={configuration?.package_name_locked
                  ? <span className="text-warning-700">Terkunci setelah release pertama.</span>
                  : 'Dikunci setelah build release pertama yang berhasil.'}
              >
                <input
                  id="android-package-name"
                  maxLength={255}
                  required
                  value={form.packageName}
                  disabled={configuration?.package_name_locked}
                  onChange={(event) => updateForm('packageName', event.target.value)}
                  placeholder="com.example.website"
                  className={`${INPUT_CLASS} font-mono`}
                />
              </Field>
              <Field label="Target URL" htmlFor="android-target-url" hint={targetUrlHint}>
                <input id="android-target-url" readOnly disabled value={configuration?.target_url ?? 'Tersedia setelah konfigurasi disimpan'} className={INPUT_CLASS} />
              </Field>
              <Field label="Versi" htmlFor="android-version-name">
                <input id="android-version-name" maxLength={64} required value={form.versionName} onChange={(event) => updateForm('versionName', event.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Version code" htmlFor="android-version-code">
                <input id="android-version-code" type="number" min={1} max={2100000000} required value={form.versionCode} onChange={(event) => updateForm('versionCode', event.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Mode tampilan" htmlFor="android-display-mode">
                <select id="android-display-mode" value={form.displayMode} onChange={(event) => updateForm('displayMode', event.target.value as AndroidDisplayMode)} className={INPUT_CLASS}>
                  {(Object.keys(DISPLAY_MODE_OPTIONS) as AndroidDisplayMode[]).map((mode) => (
                    <option key={mode} value={mode}>{DISPLAY_MODE_OPTIONS[mode]}</option>
                  ))}
                </select>
              </Field>
              <ColorPickerField label="Warna status bar (atas)" value={form.primaryColor} onChange={(value) => updateForm('primaryColor', value)} />
              <ColorPickerField label="Warna latar splash" value={form.splashColor} onChange={(value) => updateForm('splashColor', value)} />
              <ColorPickerField
                label="Warna navigation bar (bawah)"
                description="Tombol navigasi otomatis gelap/terang mengikuti kontras warna ini."
                value={form.navigationBarColor}
                onChange={(value) => updateForm('navigationBarColor', value)}
              />
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={Boolean(form.navigationBarDividerColor)}
                    onChange={(event) => updateForm('navigationBarDividerColor', event.target.checked ? DEFAULT_DIVIDER_COLOR : '')}
                    className="h-4 w-4 accent-primary"
                  />
                  Garis pemisah di atas navigation bar
                </label>
                {form.navigationBarDividerColor ? (
                  <ColorPickerField label="Warna garis pemisah" value={form.navigationBarDividerColor} onChange={(value) => updateForm('navigationBarDividerColor', value)} />
                ) : (
                  <p className="text-xs text-default-500">Berguna bila warna navigation bar sama dengan latar halaman.</p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-default-200 pt-5">
            <div>
              <h3 className="text-base font-semibold">Icon &amp; splash screen</h3>
              <p className="text-sm text-default-500">
                Diunggah khusus untuk app Android, terpisah dari logo website, dan langsung tersimpan. File dapat diakses publik agar TWA Builder bisa mengambilnya.
              </p>
            </div>
            {!configurationExists ? (
              <p className="rounded-lg border border-dashed border-default-300 p-5 text-sm text-default-500">Simpan konfigurasi terlebih dahulu sebelum mengunggah icon dan splash screen.</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {([
                  {
                    type: 'icon' as const,
                    title: 'App icon',
                    url: configuration.icon_url,
                    hint: 'PNG, JPEG, atau WebP; persegi minimal 512 × 512 px dengan ruang kosong di tepi; maks. 5 MB.',
                    previewClass: 'h-24 w-24',
                  },
                  {
                    type: 'splash' as const,
                    title: 'Splash screen image',
                    url: configuration.splash_image_url,
                    hint: 'Latar transparan disarankan — ditampilkan di tengah di atas warna latar splash; maks. 5 MB.',
                    previewClass: 'h-24 w-40',
                  },
                ]).map((asset) => (
                  <div key={asset.type} className="space-y-3">
                    <h4 className="text-sm font-medium">{asset.title}</h4>
                    {asset.url ? (
                      <Image
                        src={asset.url}
                        alt={asset.title}
                        width={asset.type === 'icon' ? 96 : 160}
                        height={96}
                        unoptimized
                        className={`${asset.previewClass} rounded-xl border border-default-200 object-contain p-2`}
                        style={{ backgroundColor: asset.type === 'splash' ? toSixDigitHex(form.splashColor) : '#FFFFFF' }}
                      />
                    ) : (
                      <div className={`${asset.previewClass} flex items-center justify-center rounded-xl border border-dashed border-default-300 bg-default-50 text-xs text-default-400`}>
                        Belum ada gambar
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center rounded-lg border border-default-300 px-3 py-2 text-sm hover:bg-default-50">
                        {uploadingImage === asset.type ? 'Mengunggah…' : asset.url ? 'Ganti gambar' : 'Unggah gambar'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          disabled={uploadingImage !== null || removingImage !== null}
                          onChange={(event) => {
                            const selected = event.target.files?.[0];
                            event.target.value = '';
                            if (selected) void uploadImageAsset(asset.type, selected);
                          }}
                          className="sr-only"
                        />
                      </label>
                      {asset.url && (
                        <Button
                          size="sm"
                          color="danger"
                          variant="light"
                          isLoading={removingImage === asset.type}
                          isDisabled={uploadingImage !== null}
                          onPress={() => void removeImageAsset(asset.type)}
                        >
                          Hapus
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-default-500">{asset.hint}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4 border-t border-default-200 pt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Android signing</h3>
                <p className="text-sm text-default-500">
                  Keystore dikirim langsung ke server dan password disimpan terenkripsi. Keystore hanya wajib untuk build release; APK Debug memakai debug key builder.
                </p>
              </div>
              {configuration?.has_release_keystore ? (
                <Chip color="success" size="sm" variant="flat">Keystore terpasang ({configuration.keystore_alias})</Chip>
              ) : (
                <Chip color="warning" size="sm" variant="flat">Belum ada keystore</Chip>
              )}
            </div>
            <div className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm text-warning-800">
              Simpan backup keystore dan password di tempat aman. Jika hilang, Anda tidak dapat menerbitkan update aplikasi dengan identitas signing yang sama.
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={configuration?.has_release_keystore ? 'Ganti file keystore' : 'File keystore'} htmlFor="android-keystore-file" hint=".jks, .p12, atau .pfx; maks. 10 MB. Diunggah saat Simpan.">
                <input
                  id="android-keystore-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".jks,.p12,.pfx"
                  onChange={(event) => {
                    setKeystoreFile(event.target.files?.[0] ?? null);
                    setDirty(true);
                  }}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Key alias" htmlFor="android-keystore-alias">
                <input id="android-keystore-alias" maxLength={255} value={alias} disabled={!keystoreFile} onChange={(event) => setAlias(event.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Keystore password" htmlFor="android-store-password">
                <input id="android-store-password" type="password" maxLength={512} autoComplete="new-password" value={storePassword} disabled={!keystoreFile} onChange={(event) => setStorePassword(event.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Key password" htmlFor="android-key-password">
                <input id="android-key-password" type="password" maxLength={512} autoComplete="new-password" value={keyPassword} disabled={!keystoreFile} onChange={(event) => setKeyPassword(event.target.value)} placeholder="Biasanya sama dengan keystore password" className={INPUT_CLASS} />
              </Field>
            </div>

            <div className="space-y-3 rounded-lg bg-default-50 p-4">
              <div>
                <h4 className="text-sm font-semibold">SHA-256 certificate fingerprints</h4>
                <p className="mt-1 text-xs text-default-500">
                  Fingerprint release ditambahkan otomatis setelah build berhasil. Tambahkan fingerprint Google Play App Signing dari Play Console agar instalasi Play Store juga terverifikasi.
                </p>
              </div>
              {[
                ...(configuration?.release_signing_cert_sha256 ?? []).map((fingerprint) => ({ fingerprint, source: 'Release' })),
                ...(configuration?.play_store_signing_cert_sha256 ?? []).map((fingerprint) => ({ fingerprint, source: 'Play Store' })),
              ].map(({ fingerprint, source }) => (
                <div key={`${source}-${fingerprint}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 ring-1 ring-default-200">
                  <div className="min-w-0 space-y-1">
                    <Chip size="sm" variant="flat">{source}</Chip>
                    <code className="block break-all text-xs">{fingerprint}</code>
                  </div>
                  <Button size="sm" color="danger" variant="light" onPress={() => void retireFingerprint(fingerprint)}>Pensiunkan</Button>
                </div>
              ))}
              <Field label="Fingerprint Google Play App Signing (satu per baris)" htmlFor="android-play-fingerprints" hint="Ditambahkan ke Digital Asset Links saat Simpan.">
                <textarea
                  id="android-play-fingerprints"
                  rows={3}
                  value={playStoreFingerprintInput}
                  disabled={!configurationExists}
                  onChange={(event) => {
                    setPlayStoreFingerprintInput(event.target.value);
                    setDirty(true);
                  }}
                  placeholder="AA:BB:CC:... (SHA-256, 32 byte)"
                  className={`${INPUT_CLASS} font-mono text-xs`}
                />
              </Field>
            </div>
          </section>

          {error && (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger">
              <span className="flex-1">{error}</span>
              {pendingBuildRetry && (
                <Button size="sm" color="danger" variant="flat" isLoading={submittingBuild} onPress={() => void submitBuild(pendingBuildRetry)}>
                  Ulangi permintaan yang sama
                </Button>
              )}
            </div>
          )}
          {message && <div role="status" className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">{message}</div>}
          {needsKeystore && (
            <p className="text-sm text-default-500">Build release membutuhkan keystore yang sudah disimpan. Pilih APK Debug untuk build testing tanpa keystore.</p>
          )}
          {dirty && configurationExists && <p className="text-sm text-warning-700">Ada perubahan yang belum disimpan. Simpan dulu sebelum memulai build.</p>}

          <div className="flex flex-col gap-2 border-b border-default-200 pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
            <div className="space-y-1.5 sm:mr-auto sm:w-72">
              <label htmlFor="android-build-variant" className="text-sm font-medium">Output build</label>
              <select id="android-build-variant" value={buildVariant} onChange={(event) => setBuildVariant(event.target.value as BuildVariantOption)} className={INPUT_CLASS}>
                {(Object.keys(BUILD_VARIANT_OPTIONS) as BuildVariantOption[]).map((key) => (
                  <option key={key} value={key}>{BUILD_VARIANT_OPTIONS[key].label}</option>
                ))}
              </select>
            </div>
            <Button variant="bordered" isLoading={saving} isDisabled={busy} onPress={() => void saveAll()}>
              {configurationExists ? 'Simpan' : 'Buat konfigurasi'}
            </Button>
            <Button color="primary" isLoading={submittingBuild} isDisabled={!canStartBuild} onPress={() => void submitBuild()}>
              {buildInProgress ? 'Build sedang berjalan' : 'Mulai build'}
            </Button>
          </div>

          <section className="space-y-3">
            <div>
              <h3 className="text-base font-semibold">Riwayat build</h3>
              <p className="text-sm text-default-500">
                Status diperbarui otomatis setiap 5 detik selama build berjalan. Link unduhan bersifat sementara dan diminta ulang saat tombol unduh dipilih.
              </p>
            </div>
            {builds.length === 0 ? (
              <p className="rounded-lg border border-dashed border-default-300 p-8 text-center text-sm text-default-500">Belum ada build yang dijalankan untuk website ini.</p>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <Table aria-label="Riwayat build Android" removeWrapper>
                    <TableHeader>
                      <TableColumn>ID</TableColumn>
                      <TableColumn>STATUS</TableColumn>
                      <TableColumn>OUTPUT</TableColumn>
                      <TableColumn>PROGRESS</TableColumn>
                      <TableColumn>DIBUAT</TableColumn>
                      <TableColumn>SELESAI</TableColumn>
                      <TableColumn>ARTIFACT</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {builds.map((build) => (
                        <TableRow key={build.id}>
                          <TableCell className="font-mono text-xs">{build.id.slice(0, 8)}</TableCell>
                          <TableCell>
                            <Chip size="sm" color={statusColor(build.status)} variant="flat">{statusLabel(build.status)}</Chip>
                            {build.error_message && <p className="mt-1 max-w-56 text-xs text-danger">{build.error_message}</p>}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="whitespace-nowrap">{formatVariant(build)}</div>
                            <div className="max-w-48 truncate font-mono text-[10px] text-default-500">{build.bundle_id ?? configuration?.package_name}</div>
                          </TableCell>
                          <TableCell><BuildProgress build={build} /></TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{formatDate(build.created_at)}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{formatDate(build.finished_at)}</TableCell>
                          <TableCell>
                            {build.status.toLowerCase() === 'success' ? (
                              <Button size="sm" color="primary" variant="light" isLoading={downloadingJobId === build.id} onPress={() => void downloadBuild(build.id)}>
                                Unduh
                              </Button>
                            ) : <span className="text-default-400">—</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex flex-col gap-3 md:hidden">
                  {builds.map((build) => (
                    <div key={build.id} className="space-y-3 rounded-lg border border-default-200 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{formatVariant(build)}</p>
                          <p className="font-mono text-xs text-default-500">{build.id.slice(0, 8)} · {formatDate(build.created_at)}</p>
                        </div>
                        <Chip size="sm" color={statusColor(build.status)} variant="flat">{statusLabel(build.status)}</Chip>
                      </div>
                      {!isTerminalStatus(build.status) && <BuildProgress build={build} />}
                      {build.error_message && <p className="text-xs text-danger">{build.error_message}</p>}
                      {build.status.toLowerCase() === 'success' && (
                        <Button size="sm" color="primary" variant="flat" className="w-full" isLoading={downloadingJobId === build.id} onPress={() => void downloadBuild(build.id)}>
                          Unduh artifact
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </CardBody>
      </Card>
    </div>
  );
}
