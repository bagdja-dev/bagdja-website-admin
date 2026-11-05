import { ApiError, jsonBody, studioRequest, websitePath } from './client';

export type AndroidDisplayMode = 'standalone' | 'fullscreen' | 'fullscreen-sticky';

export interface AndroidAppConfigDto {
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
  /** Hanya ada di GET/PUT konfigurasi, tidak di respons upload/fingerprint. */
  target_url?: string;
}

export interface AndroidBuildDto {
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

export interface AndroidConfigPayload {
  appName: string;
  packageName: string;
  versionName: string;
  versionCode: number;
  primaryColor: string;
  splashColor: string;
  navigationBarColor: string;
  navigationBarDividerColor: string | null;
  displayMode: AndroidDisplayMode;
}

export interface AndroidBuildRequestDto {
  buildType: 'debug' | 'release';
  outputFormat: 'apk' | 'aab';
  versionName: string;
  versionCode: number;
}

const base = (websiteId: string, suffix = ''): string => websitePath(websiteId, `/android-app${suffix}`);

export const fetchAndroidConfig = (websiteId: string) => studioRequest<AndroidAppConfigDto>(base(websiteId));
export const fetchAndroidBuilds = (websiteId: string) => studioRequest<AndroidBuildDto[]>(base(websiteId, '/builds'));
export const fetchAndroidBuild = (websiteId: string, jobId: string) =>
  studioRequest<AndroidBuildDto>(base(websiteId, `/builds/${encodeURIComponent(jobId)}`));

export const saveAndroidConfig = (websiteId: string, payload: AndroidConfigPayload) =>
  studioRequest<AndroidAppConfigDto>(base(websiteId), { method: 'PUT', ...jsonBody(payload) });

export const addPlayStoreFingerprints = (websiteId: string, fingerprints: string[]) =>
  studioRequest<AndroidAppConfigDto>(base(websiteId, '/signing-fingerprints'), { method: 'POST', ...jsonBody({ fingerprints }) });

export const retireSigningFingerprint = (websiteId: string, fingerprint: string) =>
  studioRequest<AndroidAppConfigDto>(base(websiteId, '/signing-fingerprints'), { method: 'DELETE', ...jsonBody({ fingerprint }) });

export const createAndroidBuild = (websiteId: string, payload: AndroidBuildRequestDto, idempotencyKey: string) =>
  studioRequest<AndroidBuildDto>(base(websiteId, '/builds'), {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    ...jsonBody(payload),
  });

async function readConfigResponse(response: Response, fallback: string): Promise<AndroidAppConfigDto> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Badan bukan JSON — pakai pesan bawaan.
  }
  const record = (body ?? {}) as { message?: unknown; error?: unknown };
  if (!response.ok) {
    const message = typeof record.message === 'string' ? record.message : typeof record.error === 'string' ? record.error : fallback;
    throw new ApiError(message, response.status);
  }
  return body as AndroidAppConfigDto;
}

/** Multipart lewat route Next `api/android-apps/*` (bukan proxy JSON). */
export async function uploadAndroidKeystore(
  websiteId: string,
  input: { file: File; alias: string; storePassword: string; keyPassword: string },
): Promise<AndroidAppConfigDto> {
  const body = new FormData();
  body.append('file', input.file);
  body.append('alias', input.alias);
  body.append('storePassword', input.storePassword);
  body.append('keyPassword', input.keyPassword);
  const response = await fetch(`/api/android-apps/${encodeURIComponent(websiteId)}/keystore`, { method: 'POST', body });
  return readConfigResponse(response, 'Gagal mengunggah signing key.');
}

export async function uploadAndroidAsset(websiteId: string, assetType: 'icon' | 'splash', file: File): Promise<AndroidAppConfigDto> {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch(`/api/android-apps/${encodeURIComponent(websiteId)}/assets/${assetType}`, { method: 'POST', body });
  return readConfigResponse(response, 'Gagal mengunggah gambar aplikasi.');
}

export async function removeAndroidAsset(websiteId: string, assetType: 'icon' | 'splash'): Promise<AndroidAppConfigDto> {
  const response = await fetch(`/api/android-apps/${encodeURIComponent(websiteId)}/assets/${assetType}`, { method: 'DELETE' });
  return readConfigResponse(response, 'Gagal menghapus gambar aplikasi.');
}
