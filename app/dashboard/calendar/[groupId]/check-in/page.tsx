'use client';

import { Button, Card, CardBody, Chip } from '@heroui/react';
import type { Html5Qrcode } from 'html5-qrcode';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { LoadingSpinner } from '../../../../components/loading-spinner';
import { NoWebsiteState } from '../../../../components/no-website-state';
import { useWebsiteContext } from '../../../../context/website-context';
import { ApiError, apiClient } from '../../../../lib/api-client';
import { hasMinRole } from '../../../../lib/types';

interface CheckInRegistration {
  id: string;
  attendee_name: string;
  registration_status: string;
  payment_status: string;
  checked_in_at: string | null;
  check_in_method: 'SCAN' | 'MANUAL' | null;
}

interface CheckInDetail {
  id: string;
  title: string;
  status: string;
  occurrence: { final_schedule?: string | null; final_location?: string | null };
  attendance: { paid_count: number; checked_in_count: number };
  registrations: CheckInRegistration[];
}

interface CheckInResponse {
  result: 'CHECKED_IN' | 'ALREADY_CHECKED_IN';
  registration: { id: string; attendee_name: string; checked_in_at: string; check_in_method: 'SCAN' | 'MANUAL' };
}

type ScanFeedback =
  | { tone: 'success'; title: string; detail: string }
  | { tone: 'warning'; title: string; detail: string }
  | { tone: 'danger'; title: string; detail: string };

const SCANNER_ELEMENT_ID = 'gathering-check-in-scanner';
/** Jeda sebelum kamera kembali memindai setelah satu hasil, agar petugas sempat membaca. */
const RESUME_AFTER_MS = 2500;

const FEEDBACK_CLASS: Record<ScanFeedback['tone'], string> = {
  success: 'border-success-300 bg-success-50 text-success-800',
  warning: 'border-warning-300 bg-warning-50 text-warning-800',
  danger: 'border-danger-300 bg-danger-50 text-danger-700',
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', { timeStyle: 'short' }).format(new Date(value));
}

function checkInErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'QR ini tidak terdaftar untuk acara ini.';
    if (/paid seat/i.test(error.message)) return 'Seat peserta ini tidak lunas atau sudah dibatalkan.';
    if (/in progress/i.test(error.message)) return 'Check-in hanya dibuka saat acara berlangsung.';
    return error.message;
  }
  return error instanceof Error ? error.message : 'Check-in gagal. Coba lagi.';
}

export default function GatheringCheckInPage() {
  const params = useParams<{ groupId: string }>();
  const { websiteId, role, loading: contextLoading } = useWebsiteContext();
  const canCheckIn = role ? hasMinRole(role, 'editor') : false;
  const [detail, setDetail] = useState<CheckInDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'running' | 'error'>('idle');
  const [cameraError, setCameraError] = useState('');
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [search, setSearch] = useState('');
  const [manualBusyId, setManualBusyId] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);

  const basePath = websiteId && params.groupId
    ? `/api/websites/${websiteId}/gatherings/calendar/${encodeURIComponent(params.groupId)}`
    : null;

  const load = useCallback(async () => {
    if (!basePath) return;
    try {
      setDetail(await apiClient<CheckInDetail>(basePath));
      setLoadError('');
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Gagal memuat data acara.');
    }
  }, [basePath]);

  useEffect(() => {
    if (!basePath) return;
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [basePath, load]);

  /** Terapkan hasil check-in ke daftar lokal tanpa menunggu muat ulang. */
  const applyCheckIn = useCallback((response: CheckInResponse) => {
    setDetail((current) => {
      if (!current) return current;
      const wasCheckedIn = current.registrations.some((row) => row.id === response.registration.id && row.checked_in_at);
      return {
        ...current,
        attendance: {
          ...current.attendance,
          checked_in_count: current.attendance.checked_in_count + (wasCheckedIn ? 0 : 1),
        },
        registrations: current.registrations.map((row) => row.id === response.registration.id
          ? { ...row, checked_in_at: response.registration.checked_in_at, check_in_method: response.registration.check_in_method }
          : row),
      };
    });
  }, []);

  const submitCheckIn = useCallback(async (body: { qr: string } | { registration_id: string }): Promise<ScanFeedback> => {
    if (!basePath) throw new Error('Website belum dipilih.');
    try {
      const response = await apiClient<CheckInResponse>(`${basePath}/check-in`, { method: 'POST', body: JSON.stringify(body) });
      applyCheckIn(response);
      if (response.result === 'CHECKED_IN') {
        navigator.vibrate?.(120);
        return { tone: 'success', title: response.registration.attendee_name, detail: `Check-in berhasil · ${formatTime(response.registration.checked_in_at)}` };
      }
      navigator.vibrate?.([80, 60, 80]);
      return {
        tone: 'warning',
        title: response.registration.attendee_name,
        detail: `Sudah check-in sebelumnya pukul ${formatTime(response.registration.checked_in_at)}`,
      };
    } catch (error) {
      navigator.vibrate?.([200, 100, 200]);
      return { tone: 'danger', title: 'Check-in ditolak', detail: checkInErrorMessage(error) };
    }
  }, [applyCheckIn, basePath]);

  const stopCamera = useCallback(async () => {
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    const scanner = scannerRef.current;
    scannerRef.current = null;
    processingRef.current = false;
    if (scanner) {
      try {
        if (scanner.isScanning) await scanner.stop();
        scanner.clear();
      } catch {
        // Kamera sudah berhenti (mis. tab ditutup) — tidak perlu ditangani.
      }
    }
    setCameraState('idle');
  }, []);

  const startCamera = useCallback(async () => {
    if (scannerRef.current) return;
    setCameraState('starting');
    setCameraError('');
    setFeedback(null);
    try {
      // Dimuat dinamis: html5-qrcode mengakses `window` dan tidak boleh ikut SSR.
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: (width, height) => {
          const size = Math.floor(Math.min(width, height) * 0.7);
          return { width: size, height: size };
        } },
        (decodedText) => {
          if (processingRef.current) return;
          processingRef.current = true;
          scanner.pause(true);
          void submitCheckIn({ qr: decodedText }).then((result) => {
            setFeedback(result);
            resumeTimerRef.current = window.setTimeout(() => {
              processingRef.current = false;
              setFeedback(null);
              if (scannerRef.current === scanner) scanner.resume();
            }, RESUME_AFTER_MS);
          });
        },
        () => undefined,
      );
      setCameraState('running');
    } catch (error) {
      scannerRef.current = null;
      setCameraState('error');
      setCameraError(
        error instanceof Error && /permission|notallowed/i.test(`${error.name} ${error.message}`)
          ? 'Izin kamera ditolak. Izinkan akses kamera di pengaturan browser, lalu coba lagi.'
          : 'Kamera tidak dapat dibuka. Pastikan halaman dibuka lewat HTTPS dan kamera tidak dipakai aplikasi lain, atau gunakan check-in manual.',
      );
    }
  }, [submitCheckIn]);

  useEffect(() => () => { void stopCamera(); }, [stopCamera]);

  useEffect(() => {
    if (mode === 'manual') void stopCamera();
  }, [mode, stopCamera]);

  const manualCheckIn = async (registration: CheckInRegistration) => {
    setManualBusyId(registration.id);
    setFeedback(await submitCheckIn({ registration_id: registration.id }));
    setManualBusyId(null);
  };

  if (contextLoading || loading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;
  if (!canCheckIn) {
    return (
      <Card className="border-0 shadow-md ring-1 ring-default-100">
        <CardBody className="p-6">
          <h1 className="text-lg font-semibold">Akses terbatas</h1>
          <p className="mt-2 text-sm text-default-500">Check-in hanya dapat dilakukan oleh staff dengan role editor ke atas.</p>
        </CardBody>
      </Card>
    );
  }

  const detailHref = `/dashboard/calendar/${encodeURIComponent(params.groupId)}`;
  if (loadError || !detail) {
    return (
      <Card className="border-0 shadow-md ring-1 ring-default-100">
        <CardBody role="alert" className="py-8 text-center text-sm text-danger">{loadError || 'Acara tidak ditemukan.'}</CardBody>
      </Card>
    );
  }

  const eligible = detail.registrations
    .filter((row) => row.registration_status === 'RSVP_CONFIRMED' && row.payment_status === 'PAID')
    .sort((a, b) => a.attendee_name.localeCompare(b.attendee_name, 'id'));
  const query = search.trim().toLowerCase();
  const filtered = query ? eligible.filter((row) => row.attendee_name.toLowerCase().includes(query)) : eligible;
  const progress = detail.attendance.paid_count ? Math.round((detail.attendance.checked_in_count / detail.attendance.paid_count) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <div>
        <Button as={Link} href={detailHref} variant="light" className="-ml-3 mb-1">← Kembali ke detail acara</Button>
        <h1 className="text-2xl font-bold tracking-tight">Check-in</h1>
        <p className="text-sm text-default-500">{detail.title}{detail.occurrence.final_location ? ` · ${detail.occurrence.final_location}` : ''}</p>
      </div>

      <Card className="border-0 shadow-md ring-1 ring-default-100">
        <CardBody className="gap-2 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-default-500">Hadir</span>
            <span className="text-2xl font-bold tabular-nums">
              {detail.attendance.checked_in_count}
              <span className="text-base font-medium text-default-400"> / {detail.attendance.paid_count}</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-default-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Persentase kehadiran">
            <div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </CardBody>
      </Card>

      {detail.status !== 'IN_PROGRESS' ? (
        <Card className="border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="gap-3 p-5 text-sm">
            <p className="font-semibold">
              {detail.status === 'COMPLETED' ? 'Acara sudah selesai.' : 'Check-in belum dibuka.'}
            </p>
            <p className="text-default-500">
              {detail.status === 'COMPLETED'
                ? 'Check-in ditutup setelah acara ditandai selesai.'
                : 'Admin perlu menekan "Mulai acara" di halaman detail sebelum panitia dapat memindai tiket.'}
            </p>
            <Button as={Link} href={detailHref} variant="flat" className="self-start">Ke detail acara</Button>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-default-100 p-1" role="tablist" aria-label="Metode check-in">
            {([['scan', 'Scan QR'], ['manual', 'Cari nama']] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mode === key}
                onClick={() => setMode(key)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mode === key ? 'bg-white shadow-sm' : 'text-default-500'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {feedback ? (
            <div role="status" aria-live="assertive" className={`rounded-xl border-2 px-4 py-3 ${FEEDBACK_CLASS[feedback.tone]}`}>
              <p className="text-lg font-bold">{feedback.title}</p>
              <p className="text-sm">{feedback.detail}</p>
            </div>
          ) : null}

          {mode === 'scan' ? (
            <Card className="border-0 shadow-md ring-1 ring-default-100">
              <CardBody className="gap-3 p-4">
                <div className="relative overflow-hidden rounded-xl bg-black">
                  <div id={SCANNER_ELEMENT_ID} className="aspect-square w-full [&_video]:!h-full [&_video]:!w-full [&_video]:object-cover" />
                  {cameraState !== 'running' ? (
                    <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/80">
                      {cameraState === 'starting' ? 'Membuka kamera…' : 'Kamera belum aktif'}
                    </div>
                  ) : null}
                </div>
                {cameraError ? <p role="alert" className="text-sm text-danger">{cameraError}</p> : null}
                {cameraState === 'running' ? (
                  <Button variant="flat" onPress={() => void stopCamera()}>Hentikan kamera</Button>
                ) : (
                  <Button color="primary" size="lg" isLoading={cameraState === 'starting'} onPress={() => void startCamera()}>
                    Mulai scan
                  </Button>
                )}
                <p className="text-xs text-default-500">Arahkan kamera ke QR pada tiket peserta. Hasil tampil di atas dan kamera memindai lagi otomatis setelah {RESUME_AFTER_MS / 1000} detik.</p>
              </CardBody>
            </Card>
          ) : (
            <Card className="border-0 shadow-md ring-1 ring-default-100">
              <CardBody className="gap-3 p-4">
                <label htmlFor="check-in-search" className="text-sm font-medium">Cari peserta</label>
                <input
                  id="check-in-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Ketik nama peserta"
                  className="w-full rounded-lg border border-default-200 bg-white px-3 py-2.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {filtered.length === 0 ? (
                  <p className="py-6 text-center text-sm text-default-500">{query ? 'Tidak ada peserta dengan nama tersebut.' : 'Belum ada peserta lunas.'}</p>
                ) : (
                  <ul className="divide-y divide-default-100">
                    {filtered.map((row) => (
                      <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.attendee_name}</p>
                          {row.checked_in_at ? (
                            <p className="text-xs text-default-500">Hadir {formatTime(row.checked_in_at)}{row.check_in_method === 'MANUAL' ? ' · manual' : ''}</p>
                          ) : null}
                        </div>
                        {row.checked_in_at ? (
                          <Chip size="sm" color="success" variant="flat">Hadir</Chip>
                        ) : (
                          <Button size="sm" color="primary" variant="flat" isLoading={manualBusyId === row.id} isDisabled={manualBusyId !== null} onPress={() => void manualCheckIn(row)}>
                            Check-in
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
