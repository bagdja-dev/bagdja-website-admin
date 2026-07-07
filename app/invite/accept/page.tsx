'use client';

import { Button, Card, CardBody } from '@heroui/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

import { LoadingSpinner } from '../../components/loading-spinner';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAuth } from '../../hooks/use-auth';

type AcceptState = 'idle' | 'loading' | 'success' | 'error' | 'login-required';

interface AcceptResult {
  website_id: string;
  role: string;
  email?: string | null;
}

function InviteAcceptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const { isLoggedIn, loading: authLoading, user } = useAuth();

  const [state, setState] = useState<AcceptState>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<AcceptResult | null>(null);

  const acceptInvitation = useCallback(async () => {
    if (!token) {
      setState('error');
      setError('Token undangan tidak ditemukan. Periksa link dari email Anda.');
      return;
    }

    setState('loading');
    setError('');

    try {
      const data = await apiClient<AcceptResult>('/api/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      setResult(data);
      setState('success');

      if (typeof localStorage !== 'undefined' && data.website_id) {
        localStorage.setItem('bw_active_website', data.website_id);
      }

      setTimeout(() => router.replace('/dashboard'), 2500);
    } catch (err) {
      setState('error');
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Gagal menerima undangan. Silakan coba lagi.');
      }
    }
  }, [token, router]);

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      setState('error');
      setError('Token undangan tidak ditemukan. Periksa link dari email Anda.');
      return;
    }

    if (!isLoggedIn) {
      setState('login-required');
      return;
    }

    if (state === 'idle') {
      void acceptInvitation();
    }
  }, [authLoading, isLoggedIn, token, state, acceptInvitation]);

  const loginHref = `/auth/login?next=${encodeURIComponent(`/invite/accept?token=${token}`)}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-white to-indigo-50 px-4 py-12">
      <Card className="w-full max-w-md border-0 shadow-xl ring-1 ring-default-100">
        <div className="bg-gradient-to-br from-violet-600 to-indigo-500 px-6 py-8 text-center text-white">
          <div className="text-4xl">✉️</div>
          <h1 className="mt-3 text-xl font-bold">Undangan Tim</h1>
          <p className="mt-1 text-sm text-white/80">Bagdja Website Builder</p>
        </div>

        <CardBody className="gap-4 px-6 py-8">
          {(authLoading || state === 'loading') && (
            <div className="flex flex-col items-center gap-3 py-6">
              <LoadingSpinner />
              <p className="text-sm text-default-500">Memproses undangan…</p>
            </div>
          )}

          {state === 'login-required' && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-default-600">
                Login dengan akun Bagdja untuk menerima undangan tim.
              </p>
              <Button as={Link} href={loginHref} color="primary" className="w-full font-semibold">
                Login untuk Lanjut
              </Button>
            </div>
          )}

          {state === 'success' && result && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
                ✅
              </div>
              <div>
                <p className="text-lg font-semibold text-emerald-700">Undangan diterima!</p>
                <p className="mt-2 text-sm text-default-500">
                  Anda bergabung sebagai <strong className="capitalize">{result.role}</strong>
                  {user?.email ? (
                    <> dengan akun <strong>{user.email}</strong></>
                  ) : null}
                  .
                </p>
                <p className="mt-2 text-xs text-default-400">Mengalihkan ke dashboard…</p>
              </div>
              <Button as={Link} href="/dashboard" color="primary" variant="flat" className="w-full">
                Buka Dashboard
              </Button>
            </div>
          )}

          {state === 'error' && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-100 text-2xl">
                ⚠️
              </div>
              <p className="text-sm text-danger">{error}</p>
              {isLoggedIn ? (
                <Button color="primary" variant="flat" className="w-full" onPress={() => acceptInvitation()}>
                  Coba Lagi
                </Button>
              ) : (
                <Button as={Link} href={loginHref} color="primary" className="w-full">
                  Login
                </Button>
              )}
              <Button as={Link} href="/" variant="light" className="w-full">
                Kembali ke Beranda
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <InviteAcceptContent />
    </Suspense>
  );
}
