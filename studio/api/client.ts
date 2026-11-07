/**
 * Satu-satunya pintu Studio ke HTTP: membungkus `apiClient` bersama
 * (BFF `/api/proxy`, 401 → redirect login ditangani di sana).
 */
import { ApiError, apiClient } from '@/app/lib/api-client';

export { ApiError };

export function studioRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return apiClient<T>(path, init);
}

export function jsonBody(body: unknown): Pick<RequestInit, 'body'> {
  return { body: JSON.stringify(body) };
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** 404 dipakai untuk mendeteksi endpoint S1 yang belum ter-deploy. */
export function isNotFound(error: unknown): boolean {
  return isApiError(error) && error.status === 404;
}

export function errorMessage(error: unknown, fallback = 'Terjadi kesalahan. Coba lagi.'): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function websitePath(websiteId: string, suffix = ''): string {
  return `/api/websites/${encodeURIComponent(websiteId)}${suffix}`;
}
