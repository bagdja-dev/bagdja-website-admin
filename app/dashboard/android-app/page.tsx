'use client';

import { Button, Card, CardBody, CardHeader, Chip } from '@heroui/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { LoadingSpinner } from '../../components/loading-spinner';
import { NoWebsiteState } from '../../components/no-website-state';
import { useWebsiteContext } from '../../context/website-context';
import { ApiError, apiClient } from '../../lib/api-client';
import { hasMinRole } from '../../lib/types';

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
  release_signing_cert_sha256: string[];
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
    running: 'Sedang diproses',
    processing: 'Sedang diproses',
    building: 'Sedang dibuat',
    success: 'Berhasil',
    completed: 'Selesai',
    failed: 'Gagal',
    error: 'Gagal',
    cancelled: 'Dibatalkan',
  };
  return labels[status.toLowerCase()] ?? status;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Terjadi kesalahan. Silakan coba lagi.';
}

export default function AndroidAppPage() {
  const { activeWebsite, websiteId, role, loading: contextLoading } = useWebsiteContext();
  const canManage = role !== null && hasMinRole(role, 'admin');
  const [loading, setLoading] = useState(true);
  const [loadedWebsiteId, setLoadedWebsiteId] = useState<string | null>(null);
  const [configuration, setConfiguration] = useState<AndroidAppConfiguration | null>(null);
  const [appName, setAppName] = useState('');
  const [packageName, setPackageName] = useState('');
  const [versionName, setVersionName] = useState('1.0.0');
  const [versionCode, setVersionCode] = useState('1');
  const [buildType, setBuildType] = useState<'debug' | 'release'>('debug');
  const [outputFormat, setOutputFormat] = useState<'apk' | 'aab'>('apk');
  const [builds, setBuilds] = useState<AndroidBuild[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submittingBuild, setSubmittingBuild] = useState(false);
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [alias, setAlias] = useState('');
  const [storePassword, setStorePassword] = useState('');
  const [keyPassword, setKeyPassword] = useState('');
  const [pendingBuildRetry, setPendingBuildRetry] = useState<PendingBuildRetry | null>(null);
  const activeWebsiteId = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBuilds = useCallback(async (id: string) => {
    const result = await apiClient<AndroidBuild[]>(
      `/api/websites/${encodeURIComponent(id)}/android-app/builds`,
    );
    return result;
  }, []);

  useEffect(() => {
    activeWebsiteId.current = websiteId;
    setLoadedWebsiteId(null);
    setConfiguration(null);
    setAppName(activeWebsite?.website.name ?? '');
    setPackageName('');
    setVersionName('1.0.0');
    setVersionCode('1');
    setBuilds([]);
    setError('');
    setMessage('');
    setFile(null);
    setAlias('');
    setStorePassword('');
    setKeyPassword('');
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
        setAppName(config.app_name);
        setPackageName(config.package_name);
        setVersionName(config.version_name);
        setVersionCode(String(config.version_code));
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

  const saveConfiguration = async () => {
    if (!websiteId) return;
    const parsedVersionCode = Number(versionCode);
    if (!appName.trim() || appName.trim().length > 50) {
      setError('Nama aplikasi wajib diisi dan maksimal 50 karakter.');
      return;
    }
    if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(packageName.trim())) {
      setError('Package name tidak valid. Gunakan format seperti com.example.website.');
      return;
    }
    if (!versionName.trim() || versionName.trim().length > 64) {
      setError('Versi wajib diisi dan maksimal 64 karakter.');
      return;
    }
    if (!Number.isInteger(parsedVersionCode) || parsedVersionCode < 1 || parsedVersionCode > 2100000000) {
      setError('Version code harus berupa bilangan bulat antara 1 dan 2.100.000.000.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await apiClient<AndroidAppConfiguration>(
        `/api/websites/${encodeURIComponent(websiteId)}/android-app`,
        {
          method: 'PUT',
          body: JSON.stringify({
            appName: appName.trim(),
            packageName: packageName.trim(),
            versionName: versionName.trim(),
            versionCode: parsedVersionCode,
          }),
        },
      );
      if (activeWebsiteId.current !== websiteId) return;
      setConfiguration(saved);
      setAppName(saved.app_name);
      setPackageName(saved.package_name);
      setVersionName(saved.version_name);
      setVersionCode(String(saved.version_code));
      setMessage('Konfigurasi aplikasi tersimpan.');
      const warnings: string[] = [];
      try {
        const refreshed = await apiClient<AndroidAppConfiguration>(
          `/api/websites/${encodeURIComponent(websiteId)}/android-app`,
        );
        if (activeWebsiteId.current === websiteId) setConfiguration(refreshed);
      } catch (refreshError) {
        warnings.push(`Target URL gagal dimuat ulang: ${getErrorMessage(refreshError)}`);
      }
      try {
        const refreshedBuilds = await loadBuilds(websiteId);
        if (activeWebsiteId.current === websiteId) setBuilds(refreshedBuilds);
      } catch (historyError) {
        warnings.push(`Riwayat build gagal dimuat: ${getErrorMessage(historyError)}`);
      }
      if (activeWebsiteId.current === websiteId) {
        if (warnings.length > 0) setError(`Konfigurasi tersimpan. ${warnings.join(' ')}`);
      }
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const uploadKeystore = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!websiteId || !file) {
      setError('Pilih file keystore terlebih dahulu.');
      return;
    }
    if (!/\.(jks|p12|pfx)$/i.test(file.name) || file.size > 10 * 1024 * 1024) {
      setError('File keystore harus berekstensi .jks, .p12, atau .pfx dan berukuran maksimal 10 MB.');
      return;
    }
    if (!alias.trim() || alias.trim().length > 255 || !storePassword || !keyPassword) {
      setError('Alias, store password, dan key password wajib diisi.');
      return;
    }
    if (storePassword.length > 512 || keyPassword.length > 512) {
      setError('Password keystore maksimal 512 karakter.');
      return;
    }
    setUploading(true);
    setError('');
    setMessage('');
    const form = new FormData();
    form.append('file', file);
    form.append('alias', alias);
    form.append('storePassword', storePassword);
    form.append('keyPassword', keyPassword);
    try {
      const response = await fetch(
        `/api/android-apps/${encodeURIComponent(websiteId)}/keystore`,
        { method: 'POST', body: form },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new ApiError(
          typeof result.message === 'string'
            ? result.message
            : typeof result.error === 'string'
              ? result.error
              : 'Gagal mengunggah signing key.',
          response.status,
        );
      }
      if (activeWebsiteId.current !== websiteId) return;
      setConfiguration((current) => ({
        ...result as AndroidAppConfiguration,
        target_url: current?.target_url,
      }));
      setFile(null);
      setAlias('');
      setStorePassword('');
      setKeyPassword('');
      setMessage('Keystore release tersimpan secara privat.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setUploading(false);
    }
  };

  const submitBuild = async (retry?: PendingBuildRetry) => {
    if (!websiteId || !configuration) return;
    if (!retry) {
      const parsedVersionCode = Number(versionCode);
      if (!versionName.trim() || versionName.trim().length > 64) {
        setError('Versi wajib diisi dan maksimal 64 karakter sebelum build.');
        return;
      }
      if (!Number.isInteger(parsedVersionCode) || parsedVersionCode < 1 || parsedVersionCode > 2100000000) {
        setError('Version code harus berupa bilangan bulat antara 1 dan 2.100.000.000 sebelum build.');
        return;
      }
    }
    const request: PendingBuildRetry = retry ?? {
      key: crypto.randomUUID(),
      payload: {
        buildType,
        outputFormat: buildType === 'debug' ? 'apk' : outputFormat,
        versionName: versionName.trim(),
        versionCode: Number(versionCode),
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
      setBuilds((current) => [
        created,
        ...current.filter((build) => build.id !== created.id),
      ]);
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
    if (!websiteId || !window.confirm('Fingerprint ini tidak lagi dipercaya. Build yang sudah ditandatangani dengan key ini mungkin tidak dapat membuka TWA. Lanjutkan?')) {
      return;
    }
    setError('');
    setMessage('');
    try {
      const updated = await apiClient<AndroidAppConfiguration>(
        `/api/websites/${encodeURIComponent(websiteId)}/android-app/signing-fingerprints`,
        {
          method: 'DELETE',
          body: JSON.stringify({ fingerprint }),
        },
      );
      if (activeWebsiteId.current === websiteId) {
        setConfiguration((current) => ({
          ...updated,
          target_url: current?.target_url,
        }));
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

  const buildInProgress = builds.some((build) => !isTerminalStatus(build.status));
  const configurationExists = configuration !== null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <p className="text-sm text-default-500">{activeWebsite.website.name}</p>
        <h1 className="text-2xl font-bold">Aplikasi Android</h1>
        <p className="mt-1 text-sm text-default-500">
          TWA menampilkan website online melalui HTTPS. Perubahan package name atau signing key dapat berdampak pada update aplikasi yang sudah dibagikan.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger">
          {error}
          {pendingBuildRetry && (
            <Button
              size="sm"
              color="danger"
              variant="flat"
              className="ml-3"
              isLoading={submittingBuild}
              onPress={() => void submitBuild(pendingBuildRetry)}
            >
              Ulangi permintaan yang sama
            </Button>
          )}
        </div>
      )}
      {message && <div role="status" className="rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">{message}</div>}

      <Card>
        <CardHeader className="flex flex-col items-start gap-1 px-5 pt-5">
          <h2 className="text-lg font-semibold">Identitas aplikasi</h2>
          <p className="text-sm text-default-500">Package name akan dikunci setelah build release pertama yang berhasil.</p>
        </CardHeader>
        <CardBody className="space-y-4 px-5 pb-5">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Nama aplikasi
            <input maxLength={50} required value={appName} onChange={(event) => setAppName(event.target.value)} className="rounded-xl border border-default-300 bg-white px-3.5 py-2.5 text-sm font-normal outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Android package name
            <input maxLength={255} required pattern="[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+" value={packageName} disabled={configuration?.package_name_locked} onChange={(event) => setPackageName(event.target.value)} placeholder="com.example.website" className="rounded-xl border border-default-300 bg-white px-3.5 py-2.5 font-mono text-sm font-normal outline-none focus:border-primary disabled:bg-default-100" />
            {configuration?.package_name_locked && <span className="text-xs text-warning-700">Terkunci setelah release pertama.</span>}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Versi
              <input maxLength={64} required value={versionName} onChange={(event) => setVersionName(event.target.value)} className="rounded-xl border border-default-300 bg-white px-3.5 py-2.5 text-sm font-normal outline-none focus:border-primary" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Version code
              <input type="number" min={1} max={2100000000} required value={versionCode} onChange={(event) => setVersionCode(event.target.value)} className="rounded-xl border border-default-300 bg-white px-3.5 py-2.5 text-sm font-normal outline-none focus:border-primary" />
            </label>
          </div>
          {configuration?.target_url && (
            <div className="space-y-1 text-xs text-default-500">
              <p className="break-all">Target website: {configuration.target_url}</p>
              <p>
                {activeWebsite.website.domain && activeWebsite.website.domain_verified_at
                  ? `Domain custom ${activeWebsite.website.domain} terverifikasi.`
                  : activeWebsite.website.domain
                    ? `Domain custom ${activeWebsite.website.domain} belum terverifikasi; aplikasi menggunakan subdomain platform.`
                    : 'Website menggunakan subdomain platform HTTPS.'}
              </p>
            </div>
          )}
          <div>
            <Button color="primary" isLoading={saving} onPress={() => void saveConfiguration()}>
              {configurationExists ? 'Simpan konfigurasi' : 'Buat konfigurasi'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {configurationExists && (
        <>
          <Card>
            <CardHeader className="flex flex-col items-start gap-1 px-5 pt-5">
              <h2 className="text-lg font-semibold">Signing key release</h2>
              <p className="text-sm text-default-500">File dan password dikirim langsung ke server; password tidak disimpan di browser.</p>
            </CardHeader>
            <CardBody className="space-y-4 px-5 pb-5">
              <div className="rounded-xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-800">
                Simpan backup keystore dan password di tempat aman. Jika hilang, Anda tidak dapat menerbitkan update aplikasi dengan identitas signing yang sama.
              </div>
              <p className="text-sm">
                Status: {configuration.has_release_keystore ? (
                  <Chip color="success" size="sm" variant="flat">Keystore terpasang ({configuration.keystore_alias})</Chip>
                ) : (
                  <Chip color="warning" size="sm" variant="flat">Belum ada keystore</Chip>
                )}
              </p>
              <form onSubmit={(event) => void uploadKeystore(event)} className="space-y-4">
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  File keystore (.jks, .p12, .pfx; maks. 10 MB)
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jks,.p12,.pfx"
                    required
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                    className="block w-full rounded-xl border border-default-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Alias
                    <input required maxLength={255} value={alias} onChange={(event) => setAlias(event.target.value)} className="rounded-xl border border-default-300 bg-white px-3.5 py-2.5 text-sm font-normal outline-none focus:border-primary" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Store password
                    <input type="password" required maxLength={512} autoComplete="new-password" value={storePassword} onChange={(event) => setStorePassword(event.target.value)} className="rounded-xl border border-default-300 bg-white px-3.5 py-2.5 text-sm font-normal outline-none focus:border-primary" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Key password
                    <input type="password" required maxLength={512} autoComplete="new-password" value={keyPassword} onChange={(event) => setKeyPassword(event.target.value)} className="rounded-xl border border-default-300 bg-white px-3.5 py-2.5 text-sm font-normal outline-none focus:border-primary" />
                  </label>
                </div>
                <Button type="submit" color="primary" variant="flat" isLoading={uploading} isDisabled={!file}>
                  {configuration.has_release_keystore ? 'Ganti keystore' : 'Unggah keystore'}
                </Button>
              </form>
              {configuration.release_signing_cert_sha256.length > 0 && (
                <div className="space-y-2 border-t border-default-200 pt-4">
                  <h3 className="text-sm font-semibold">Fingerprint sertifikat release aktif</h3>
                  {configuration.release_signing_cert_sha256.map((fingerprint) => (
                    <div key={fingerprint} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-default-50 p-3">
                      <code className="break-all text-xs">{fingerprint}</code>
                      <Button size="sm" color="danger" variant="light" onPress={() => void retireFingerprint(fingerprint)}>Pensiunkan</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex flex-col items-start gap-1 px-5 pt-5">
              <h2 className="text-lg font-semibold">Buat build</h2>
              <p className="text-sm text-default-500">Status build diperbarui otomatis setiap 5 detik selama proses berjalan.</p>
            </CardHeader>
            <CardBody className="space-y-4 px-5 pb-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Tipe build
                  <select value={buildType} onChange={(event) => {
                    const next = event.target.value as 'debug' | 'release';
                    setBuildType(next);
                    if (next === 'debug') setOutputFormat('apk');
                  }} className="rounded-xl border border-default-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary">
                    <option value="debug">Debug (tanpa signing release)</option>
                    <option value="release">Release (perlu keystore)</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Format output
                  <select value={buildType === 'debug' ? 'apk' : outputFormat} disabled={buildType === 'debug'} onChange={(event) => setOutputFormat(event.target.value as 'apk' | 'aab')} className="rounded-xl border border-default-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary disabled:bg-default-100">
                    <option value="apk">APK</option>
                    {buildType === 'release' && <option value="aab">AAB</option>}
                  </select>
                </label>
              </div>
              {buildType === 'release' && !configuration.has_release_keystore && (
                <p className="text-sm text-warning-700">Unggah keystore sebelum meminta build release.</p>
              )}
              <Button
                color="primary"
                isLoading={submittingBuild}
                isDisabled={buildInProgress || pendingBuildRetry !== null || (buildType === 'release' && !configuration.has_release_keystore)}
                onPress={() => void submitBuild()}
              >
                {buildInProgress ? 'Build sedang berjalan' : `Buat ${buildType === 'debug' ? 'APK debug' : `release ${outputFormat.toUpperCase()}`}`}
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between gap-3 px-5 pt-5">
              <div>
                <h2 className="text-lg font-semibold">Riwayat build</h2>
                <p className="text-sm text-default-500">Link unduhan bersifat sementara dan diminta ulang saat tombol unduh dipilih.</p>
              </div>
              <Button size="sm" variant="flat" onPress={async () => {
                try {
                  const refreshedBuilds = await loadBuilds(websiteId);
                  if (activeWebsiteId.current === websiteId) {
                    setBuilds(refreshedBuilds);
                    setError('');
                  }
                } catch (refreshError) {
                  if (activeWebsiteId.current === websiteId) setError(getErrorMessage(refreshError));
                }
              }}>Segarkan</Button>
            </CardHeader>
            <CardBody className="space-y-3 px-5 pb-5">
              {builds.length === 0 ? (
                <p className="py-5 text-center text-sm text-default-500">Belum ada build.</p>
              ) : builds.map((build) => (
                <div key={build.id} className="rounded-xl border border-default-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip size="sm" color={build.status.toLowerCase() === 'success' ? 'success' : isTerminalStatus(build.status) ? 'danger' : 'warning'} variant="flat">{statusLabel(build.status)}</Chip>
                        <span className="text-sm font-medium">{(build.build_type ?? 'Build').toUpperCase()} {(build.output_format ?? '').toUpperCase()}</span>
                        {typeof build.progress === 'number' && !isTerminalStatus(build.status) && <span className="text-xs text-default-500">{build.progress}% · {build.stage}</span>}
                      </div>
                      <p className="text-xs text-default-500">{formatDate(build.created_at)} · {build.bundle_id ?? configuration.package_name}</p>
                      {build.error_message && <p className="text-sm text-danger">{build.error_message}</p>}
                    </div>
                    {build.status.toLowerCase() === 'success' && (
                      <Button size="sm" color="primary" variant="flat" isLoading={downloadingJobId === build.id} onPress={() => void downloadBuild(build.id)}>
                        Unduh artifact
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
