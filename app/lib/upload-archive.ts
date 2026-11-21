import { apiClient } from './api-client';

export const ARCHIVE_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
export const ARCHIVE_UPLOAD_ACCEPT = '.zip,application/zip,application/x-zip-compressed';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5003').replace(/\/+$/, '');

interface ArchiveUploadTicket {
  ticket: string;
}

function errorMessage(request: XMLHttpRequest): string {
  try {
    const body = JSON.parse(request.responseText) as { message?: unknown };
    if (typeof body.message === 'string') return body.message;
    if (Array.isArray(body.message) && typeof body.message[0] === 'string') return body.message[0];
  } catch {
    // respons bukan JSON
  }
  return `Unggah arsip gagal (${request.status}).`;
}

export function archiveUploadProblem(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.zip')) return 'File harus berformat ZIP.';
  if (file.size > ARCHIVE_UPLOAD_MAX_BYTES) return 'Ukuran arsip ZIP maksimal 50 MB.';
  return null;
}

/** Unggah arsip langsung ke website-api agar file hingga 50 MB tidak melewati batas body BFF. */
export async function uploadArchive(file: File, websiteId: string): Promise<{ url: string; path: string }> {
  const problem = archiveUploadProblem(file);
  if (problem) throw new Error(problem);

  const { ticket } = await apiClient<ArchiveUploadTicket>('/api/uploads/archive/ticket', {
    method: 'POST',
    body: JSON.stringify({ website_id: websiteId }),
  });
  const form = new FormData();
  form.append('file', file, file.name);

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `${API_BASE}/api/uploads/archive`);
    request.setRequestHeader('X-Upload-Ticket', ticket);
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(errorMessage(request)));
        return;
      }
      try {
        const body = JSON.parse(request.responseText) as { url?: unknown; path?: unknown };
        if (typeof body.url !== 'string' || typeof body.path !== 'string') throw new Error('invalid');
        resolve({ url: body.url, path: body.path });
      } catch {
        reject(new Error('Respons unggah arsip tidak valid.'));
      }
    };
    request.onerror = () => reject(new Error('Unggah arsip gagal. Periksa koneksi lalu coba lagi.'));
    request.send(form);
  });
}
