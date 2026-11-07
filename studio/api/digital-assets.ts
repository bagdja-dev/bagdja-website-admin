import { studioRequest, jsonBody, websitePath } from './client';

export interface WebsiteAsset {
  id: string;
  website_id: string;
  storage_file_id: string;
  name: string;
  description: string;
  asset_type: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  is_public: boolean;
  public_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateAssetRequest {
  name?: string;
  description?: string;
}

export interface UploadAssetInput {
  websiteId: string;
  file: File;
  name: string;
  description: string;
}

function assetsPath(websiteId: string, suffix = ''): string {
  return websitePath(websiteId, `/assets${suffix}`);
}

export function fetchDigitalAssets(websiteId: string): Promise<WebsiteAsset[]> {
  return studioRequest<WebsiteAsset[]>(assetsPath(websiteId));
}

export function updateDigitalAsset(websiteId: string, assetId: string, body: UpdateAssetRequest): Promise<WebsiteAsset> {
  return studioRequest<WebsiteAsset>(assetsPath(websiteId, `/${encodeURIComponent(assetId)}`), {
    method: 'PATCH',
    ...jsonBody(body),
  });
}

export function deleteDigitalAsset(websiteId: string, assetId: string): Promise<{ success: boolean }> {
  return studioRequest<{ success: boolean }>(assetsPath(websiteId, `/${encodeURIComponent(assetId)}`), {
    method: 'DELETE',
  });
}

/**
 * Unggah multipart lewat route Next `api/uploads/website-assets` (bukan proxy JSON).
 * XHR dipakai agar progres unggah bisa dilaporkan.
 */
interface UploadErrorBody {
  message?: string | string[];
  error?: string;
}

function sendForm<T>(method: 'POST' | 'PATCH', form: FormData, onProgress?: (percent: number) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, '/api/uploads/website-assets');
    xhr.responseType = 'text';
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new Error('Koneksi terputus saat mengunggah. Coba lagi.'));
    xhr.onload = () => {
      let body: UploadErrorBody | null = null;
      try {
        body = xhr.responseText ? (JSON.parse(xhr.responseText) as UploadErrorBody) : null;
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as T);
        return;
      }
      const msg = body?.message ?? body?.error;
      reject(new Error((Array.isArray(msg) ? msg.join(', ') : msg) || 'Unggah gagal.'));
    };
    xhr.send(form);
  });
}

export function uploadDigitalAsset(input: UploadAssetInput, onProgress?: (percent: number) => void): Promise<WebsiteAsset> {
  const form = new FormData();
  form.append('website_id', input.websiteId);
  form.append('file', input.file);
  form.append('name', input.name);
  form.append('description', input.description);
  form.append('asset_type', 'downloadable');
  form.append('is_public', 'false');
  return sendForm<WebsiteAsset>('POST', form, onProgress);
}

export function replaceDigitalAssetFile(
  websiteId: string,
  assetId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<WebsiteAsset> {
  const form = new FormData();
  form.append('website_id', websiteId);
  form.append('asset_id', assetId);
  form.append('file', file);
  return sendForm<WebsiteAsset>('PATCH', form, onProgress);
}
