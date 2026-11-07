'use client';

import { Button, Input } from '@heroui/react';
import type { Html5Qrcode } from 'html5-qrcode';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { GatheringDetail } from '@/studio/api/gatherings';
import { errorMessage } from '@/studio/api/client';

const SCANNER_ID = 'studio-gathering-check-in-scanner';
const RESUME_AFTER_MS = 2500;

type CheckInResult = 'CHECKED_IN' | 'ALREADY_CHECKED_IN';

interface GatheringCheckInPanelProps {
  gathering: GatheringDetail;
  focused: boolean;
  busy: string;
  scannerId?: string;
  sectionId?: string;
  className?: string;
  onCheckInQr: (qr: string) => Promise<CheckInResult>;
  onManualCheckIn: (registrationId: string, attendeeName: string) => Promise<void>;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('id-ID', { timeStyle: 'short' }).format(new Date(value));
}

export function GatheringCheckInPanel({
  gathering,
  focused,
  busy,
  scannerId = SCANNER_ID,
  sectionId = 'gathering-check-in',
  className,
  onCheckInQr,
  onManualCheckIn,
}: GatheringCheckInPanelProps) {
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'running' | 'error'>('idle');
  const [cameraError, setCameraError] = useState('');
  const [scanFeedback, setScanFeedback] = useState('');
  const [search, setSearch] = useState('');
  const [qr, setQr] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const eligible = useMemo(
    () => gathering.registrations.filter(
      (row) => row.registration_status === 'RSVP_CONFIRMED' && row.payment_status === 'PAID',
    ),
    [gathering.registrations],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id-ID');
    return eligible.filter((row) => !query || row.attendee_name.toLocaleLowerCase('id-ID').includes(query));
  }, [eligible, search]);

  const stopCamera = useCallback(async (updateState = true) => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = null;
    const scanner = scannerRef.current;
    scannerRef.current = null;
    processingRef.current = false;
    if (scanner) {
      try {
        if (scanner.isScanning) await scanner.stop();
        scanner.clear();
      } catch (error) {
        if (updateState && mountedRef.current) {
          setCameraError(errorMessage(error, 'Kamera tidak dapat dihentikan dengan benar.'));
        }
      }
    }
    if (updateState && mountedRef.current) setCameraState('idle');
  }, []);

  const startCamera = useCallback(async () => {
    if (scannerRef.current) return;
    setCameraState('starting');
    setCameraError('');
    setScanFeedback('');
    let scanner: Html5Qrcode | null = null;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (!mountedRef.current) return;
      const activeScanner = new Html5Qrcode(scannerId, { verbose: false });
      scanner = activeScanner;
      scannerRef.current = activeScanner;
      await activeScanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.floor(Math.min(width, height) * 0.7);
            return { width: size, height: size };
          },
        },
        (decodedText) => {
          if (processingRef.current) return;
          processingRef.current = true;
          activeScanner.pause(true);
          void onCheckInQr(decodedText)
            .then((result) => {
              if (!mountedRef.current) return;
              const label = result === 'CHECKED_IN' ? 'Check-in berhasil' : 'Peserta sudah check-in';
              setScanFeedback(`${label} · ${new Date().toLocaleTimeString('id-ID', { timeStyle: 'short' })}`);
              navigator.vibrate?.(result === 'CHECKED_IN' ? 120 : [80, 60, 80]);
            })
            .catch((error: unknown) => {
              if (mountedRef.current) setScanFeedback(errorMessage(error, 'Check-in gagal.'));
              navigator.vibrate?.([200, 100, 200]);
            })
            .finally(() => {
              resumeTimerRef.current = setTimeout(() => {
                processingRef.current = false;
                if (!mountedRef.current || scannerRef.current !== activeScanner) return;
                setScanFeedback('');
                try {
                  activeScanner.resume();
                } catch (error) {
                  setCameraError(errorMessage(error, 'Pemindaian tidak dapat dilanjutkan.'));
                  setCameraState('error');
                }
              }, RESUME_AFTER_MS);
            });
        },
        () => undefined,
      );
      if (mountedRef.current) setCameraState('running');
    } catch (error) {
      scannerRef.current = null;
      let cleanupMessage = '';
      if (scanner) {
        try {
          if (scanner.isScanning) await scanner.stop();
          scanner.clear();
        } catch (cleanupError) {
          cleanupMessage = errorMessage(cleanupError, 'Kamera gagal dihentikan setelah pemindaian gagal.');
        }
      }
      if (mountedRef.current) {
        setCameraState('error');
        const message = error instanceof Error && /permission|notallowed/i.test(`${error.name} ${error.message}`)
          ? 'Izin kamera ditolak. Izinkan kamera di browser lalu coba lagi.'
          : 'Kamera tidak dapat dibuka. Pastikan halaman menggunakan HTTPS dan kamera tidak dipakai aplikasi lain.';
        setCameraError(cleanupMessage ? `${message} ${cleanupMessage}` : message);
      }
    }
  }, [onCheckInQr, scannerId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void stopCamera(false);
    };
  }, [stopCamera]);

  useEffect(() => {
    if (mode === 'manual') void stopCamera();
  }, [mode, stopCamera]);

  const submitQr = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = qr.trim();
    if (!value) return;
    try {
      const result = await onCheckInQr(value);
      setScanFeedback(result === 'CHECKED_IN' ? 'Check-in berhasil.' : 'Peserta sudah check-in sebelumnya.');
      setQr('');
    } catch (error) {
      setScanFeedback(errorMessage(error, 'Check-in gagal.'));
    }
  };

  return (
    <section id={sectionId} className={className ?? 'rounded-2xl border border-default-200 bg-white p-4 sm:p-5'}>
      <div>
        <h2 className="text-base font-bold text-foreground">Check-in peserta</h2>
        <p className="mt-1 text-sm text-default-500">Pindai QR tiket atau cari peserta yang sudah lunas.</p>
      </div>
      <div role="tablist" aria-label="Metode check-in" className="mt-4 grid grid-cols-2 rounded-xl bg-default-100 p-1">
        <button type="button" role="tab" aria-selected={mode === 'scan'} onClick={() => setMode('scan')} className={`min-h-10 rounded-lg text-sm font-semibold ${mode === 'scan' ? 'bg-white text-[#7A1E48] shadow-sm' : 'text-default-600'}`}>Scan QR</button>
        <button type="button" role="tab" aria-selected={mode === 'manual'} onClick={() => setMode('manual')} className={`min-h-10 rounded-lg text-sm font-semibold ${mode === 'manual' ? 'bg-white text-[#7A1E48] shadow-sm' : 'text-default-600'}`}>Cari nama</button>
      </div>

      {mode === 'scan' ? (
        <div className="mt-4">
          <div id={scannerId} className="mx-auto min-h-0 w-full max-w-[420px] overflow-hidden rounded-xl bg-black empty:hidden" />
          {cameraError && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{cameraError}</p>}
          {scanFeedback && <p role="status" aria-live="polite" className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">{scanFeedback}</p>}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {cameraState === 'running' ? (
              <Button variant="bordered" className="min-h-11 border-[#7A1E48] font-semibold text-[#7A1E48]" onPress={() => void stopCamera()}>Hentikan kamera</Button>
            ) : (
              <Button className="min-h-11 bg-[#7A1E48] font-bold text-white hover:bg-[#641838]" isLoading={cameraState === 'starting'} onPress={() => void startCamera()}>Mulai scan</Button>
            )}
            <form onSubmit={(event) => void submitQr(event)} className="flex min-w-0 flex-1 gap-2">
              <Input
                autoFocus={focused}
                aria-label="Kode tiket"
                placeholder="Atau masukkan kode tiket"
                value={qr}
                onValueChange={setQr}
                classNames={{ inputWrapper: 'min-h-11 rounded-xl border border-default-300 bg-white' }}
              />
              <Button type="submit" variant="bordered" className="min-h-11 border-default-300 font-semibold" isDisabled={!qr.trim() || Boolean(busy)} isLoading={busy === 'check-in-qr'}>
                Kirim
              </Button>
            </form>
          </div>
          <p className="mt-2 text-xs text-default-500">Akses kamera memerlukan HTTPS dan izin kamera browser.</p>
        </div>
      ) : (
        <div className="mt-4">
          <Input aria-label="Cari nama peserta" placeholder="Cari nama peserta…" value={search} onValueChange={setSearch} />
          {filtered.length === 0 ? (
            <p className="mt-3 rounded-xl bg-default-50 px-3 py-4 text-center text-sm text-default-500">Tidak ada peserta lunas yang cocok.</p>
          ) : (
            <ul className="mt-3 divide-y divide-default-100 rounded-xl border border-default-200">
              {filtered.map((registration) => (
                <li key={registration.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{registration.attendee_name}</p>
                    <p className="text-xs text-default-500">{registration.checked_in_at ? `Hadir ${formatTime(registration.checked_in_at)}` : 'Belum check-in'}</p>
                  </div>
                  {registration.checked_in_at ? (
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">Hadir</span>
                  ) : (
                    <Button size="sm" variant="bordered" className="min-h-9 border-[#7A1E48] font-semibold text-[#7A1E48]" isDisabled={Boolean(busy)} isLoading={busy === `check-in-${registration.id}`} onPress={() => void onManualCheckIn(registration.id, registration.attendee_name)}>
                      Check-in
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="mt-4 text-xs text-default-500">{gathering.attendance.checked_in_count}/{gathering.attendance.paid_count} peserta lunas sudah check-in.</p>
    </section>
  );
}
