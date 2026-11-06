import type { WebsiteAsset } from '@/studio/api/digital-assets';

export const MAX_ASSET_BYTES = 100 * 1024 * 1024;

export type AssetKind = 'pdf' | 'image' | 'media' | 'archive' | 'document' | 'other';

export const KIND_OPTIONS: ReadonlyArray<{ value: AssetKind; label: string }> = [
  { value: 'pdf', label: 'PDF' },
  { value: 'document', label: 'Dokumen' },
  { value: 'image', label: 'Gambar' },
  { value: 'media', label: 'Audio/Video' },
  { value: 'archive', label: 'Arsip' },
  { value: 'other', label: 'Lainnya' },
];

const DOC_EXT = new Set(['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'odt', 'ods', 'epub', 'rtf']);
const ARCHIVE_EXT = new Set(['zip', 'rar', '7z', 'tar', 'gz']);

export function fileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? (parts.pop() ?? '').toLowerCase() : '';
}

export function assetKind(asset: Pick<WebsiteAsset, 'filename' | 'mime_type'>): AssetKind {
  const ext = fileExtension(asset.filename);
  const mime = asset.mime_type.toLowerCase();
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/') || mime.startsWith('audio/')) return 'media';
  if (ARCHIVE_EXT.has(ext) || mime.includes('zip') || mime.includes('compressed')) return 'archive';
  if (DOC_EXT.has(ext) || mime.startsWith('text/') || mime.includes('officedocument') || mime.includes('msword')) return 'document';
  return 'other';
}

/** Badge ekstensi (≤5 huruf) atau subtype MIME bila tanpa ekstensi, seperti halaman lama. */
export function extensionBadge(asset: Pick<WebsiteAsset, 'filename' | 'mime_type'>): string {
  const ext = fileExtension(asset.filename);
  if (ext) return ext.slice(0, 5).toUpperCase();
  return asset.mime_type.split('/').pop()?.slice(0, 5).toUpperCase() ?? 'FILE';
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}
