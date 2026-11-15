import { jsonBody, studioRequest } from '@/studio/api/client';

/** Sama dengan VIDEO_UPLOAD_MAX_BYTES / VIDEO_UPLOAD_MIME_TYPES di website-api (uploads/dto/video-upload.dto.ts). */
export const VIDEO_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;
export const VIDEO_UPLOAD_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5003').replace(/\/+$/, '');

interface VideoUploadTicket {
  ticket: string;
  expires_at: string;
  max_bytes: number;
  mime_types: string[];
}

export function videoUploadProblem(file: File): string | null {
  if (!(VIDEO_UPLOAD_TYPES as readonly string[]).includes(file.type)) return 'Video harus MP4, WebM, atau MOV.';
  if (file.size > VIDEO_UPLOAD_MAX_BYTES) return 'Ukuran video maksimal 15 MB.';
  return null;
}

function errorMessage(request: XMLHttpRequest): string {
  try {
    const body = JSON.parse(request.responseText) as { message?: unknown };
    if (typeof body.message === 'string') return body.message;
    if (Array.isArray(body.message) && typeof body.message[0] === 'string') return body.message[0];
  } catch {
    // respons bukan JSON
  }
  return `Unggah video gagal (${request.status}).`;
}

/**
 * Unggah video produk (maks. 15 MB) lewat website-api → bagdja-storage-service, TANPA lewat route Vercel
 * Studio (batas body ±4,5 MB): tiket unggah diminta lewat proxy Studio (berlogin, JSON kecil), lalu file
 * dikirim browser langsung ke website-api dengan header X-Upload-Ticket. XHR dipakai agar progres terlihat.
 */
export async function uploadVideo(
  file: File,
  websiteId: string,
  onProgress?: (percent: number) => void,
): Promise<{ url: string }> {
  const problem = videoUploadProblem(file);
  if (problem) throw new Error(problem);
  const { ticket } = await studioRequest<VideoUploadTicket>('/api/uploads/video/ticket', {
    method: 'POST',
    ...jsonBody({ website_id: websiteId }),
  });

  const form = new FormData();
  form.append('file', file, file.name || 'video');
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `${API_BASE}/api/uploads/video`);
    request.setRequestHeader('X-Upload-Ticket', ticket);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(errorMessage(request)));
        return;
      }
      try {
        const body = JSON.parse(request.responseText) as { url?: unknown };
        if (typeof body.url !== 'string') throw new Error('invalid');
        resolve({ url: body.url });
      } catch {
        reject(new Error('Respons unggah video tidak valid.'));
      }
    };
    request.onerror = () => reject(new Error('Unggah video gagal. Periksa koneksi lalu coba lagi.'));
    request.send(form);
  });
}
