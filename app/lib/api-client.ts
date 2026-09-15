/**
 * Client-side API helper — calls admin BFF proxy (reads httpOnly token server-side).
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const res = await fetch(`/api/proxy${normalized}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message ?? body.error ?? JSON.stringify(body);
    } catch {
      message = await res.text().catch(() => message);
    }

    // 401 = sesi tidak valid (token expired/rusak) — sebelumnya cuma throw
    // ApiError, jadi setiap halaman/hook harus handle sendiri (banyak yang
    // lupa, akibatnya tampil layar "Gagal memuat" alih-alih diarahkan login
    // ulang). Redirect ke sini, satu tempat, konsisten dengan pola yang
    // sudah dipakai bagdja-novelo-app/lib/api-client.ts.
    if (res.status === 401 && typeof window !== 'undefined') {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/auth/login?next=${next}&force_login=1`;
    }

    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
