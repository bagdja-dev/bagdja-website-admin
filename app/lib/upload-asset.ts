export interface UploadAssetResult {
  url: string;
  path: string;
}

export class UploadError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

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

  return res.json() as Promise<UploadAssetResult>;
}
