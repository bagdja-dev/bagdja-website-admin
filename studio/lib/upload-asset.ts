export interface UploadAssetResult {
  url: string;
  path: string;
}

export class UploadError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'UploadError';
  }
}

/** Unggah aset lewat route bersama `app/api/uploads/asset` (baca sesi via cookie). */
export async function uploadAsset(
  file: File,
  websiteId?: string,
  folder = 'assets',
): Promise<UploadAssetResult> {
  const formData = new FormData();
  formData.append('file', file);
  if (websiteId) formData.append('website_id', websiteId);
  formData.append('folder', folder);

  const res = await fetch('/api/uploads/asset', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message ?? body.error ?? message;
    } catch {
      message = await res.text().catch(() => message);
    }
    throw new UploadError(message, res.status);
  }

  let result: unknown;
  try {
    result = await res.json();
  } catch {
    throw new UploadError('Respons upload tidak valid.', res.status);
  }

  if (
    !result ||
    typeof result !== 'object' ||
    !('url' in result) ||
    typeof result.url !== 'string' ||
    !('path' in result) ||
    typeof result.path !== 'string'
  ) {
    throw new UploadError('Respons upload tidak memuat URL file yang valid.', res.status);
  }

  return { url: result.url, path: result.path };
}
