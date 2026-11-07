/** Akses localStorage yang aman (private mode / storage diblokir tidak melempar galat). */
export function readStorage(key: string): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  } catch {
    // Abaikan: pilihan hanya tidak tersimpan.
  }
}

/** Kunci website aktif (sama dengan kunci yang sudah dipakai aplikasi ini). */
export const ACTIVE_WEBSITE_STORAGE_KEY = 'bw_active_website';
