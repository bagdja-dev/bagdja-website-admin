'use client';

import { Button } from '@heroui/react';

import type { GatheringDetail } from '@/studio/api/gatherings';

interface GatheringNextStepProps {
  gathering: GatheringDetail;
  canAdmin: boolean;
  canStart: boolean;
  busy: string;
  error: string;
  pendingTickets: number;
  onSendTickets: () => void;
  onStart: () => void;
  onComplete: () => void;
  onRelease: () => void;
}

export function GatheringNextStep({
  gathering,
  canAdmin,
  canStart,
  busy,
  error,
  pendingTickets,
  onSendTickets,
  onStart,
  onComplete,
  onRelease,
}: GatheringNextStepProps) {
  const status = gathering.occurrence.status;
  const pendingDeposit = gathering.settlement.stage === 'DEPOSIT' && gathering.settlement.outstanding_total > 0;
  return (
    <section className="rounded-2xl border border-[#F0CFDD] bg-[#FBF2F6] p-4 sm:p-5" aria-labelledby="gathering-next-step">
      <h2 id="gathering-next-step" className="text-base font-bold text-foreground">Langkah berikutnya</h2>
      {status === 'DRAFT' || status === 'PREORDER' || status === 'RSVP_OPEN' || status === 'PAYMENT_OPEN' ? (
        <p className="mt-2 text-sm leading-relaxed text-default-700">Penyelenggara sedang mengumpulkan peserta. Pantau progres pendaftaran dan pembayaran di halaman ini.</p>
      ) : status === 'CONFIRMED' ? (
        <>
          <p className="mt-2 text-sm text-default-700">Acara sudah memenuhi syarat untuk dilanjutkan. Tiket dapat dikirim dan acara dimulai oleh admin.</p>
          {canAdmin && (
            <div className="mt-4 hidden gap-2 md:flex md:flex-row">
              <Button
                variant="bordered"
                className="min-h-11 border-[#7A1E48] bg-white font-semibold text-[#7A1E48]"
                isDisabled={pendingTickets === 0 || Boolean(busy)}
                isLoading={busy === 'tickets'}
                onPress={onSendTickets}
              >
                {pendingTickets ? `Kirim ${pendingTickets} tiket` : 'Semua tiket terkirim'}
              </Button>
              {pendingDeposit && (
                <Button
                  variant="bordered"
                  className="min-h-11 border-[#7A1E48] bg-white font-semibold text-[#7A1E48]"
                  isDisabled={Boolean(busy)}
                  isLoading={busy === 'release'}
                  onPress={onRelease}
                >
                  Proses ulang pencairan DP
                </Button>
              )}
              <Button
                className="min-h-11 bg-[#7A1E48] font-bold text-white hover:bg-[#641838]"
                isDisabled={!canStart || Boolean(busy)}
                isLoading={busy === 'start'}
                onPress={onStart}
              >
                Mulai acara
              </Button>
            </div>
          )}
          {canAdmin && !canStart && <p className="mt-2 text-xs text-default-600">Acara dapat dimulai sejak 24 jam sebelum jadwal.</p>}
        </>
      ) : status === 'IN_PROGRESS' ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-default-700">Acara sedang berlangsung. Lakukan check-in peserta yang hadir.</p>
          {canAdmin && (
            <div className="hidden flex-wrap gap-2 md:flex">
              {pendingDeposit && (
                <Button
                  variant="bordered"
                  className="min-h-11 border-[#7A1E48] bg-white font-semibold text-[#7A1E48]"
                  isDisabled={Boolean(busy)}
                  isLoading={busy === 'release'}
                  onPress={onRelease}
                >
                  Proses ulang pencairan DP
                </Button>
              )}
              <Button
                className="min-h-11 bg-[#7A1E48] font-bold text-white hover:bg-[#641838]"
                isDisabled={Boolean(busy)}
                isLoading={busy === 'complete'}
                onPress={onComplete}
              >
                Tandai selesai
              </Button>
            </div>
          )}
        </div>
      ) : status === 'COMPLETED' && gathering.settlement.outstanding_total > 0 ? (
        <>
          <p className="mt-2 text-sm text-default-700">Masih ada dana yang belum dicairkan. Admin dapat mencoba proses pencairan kembali.</p>
          {canAdmin && (
            <Button
              className="mt-4 hidden min-h-11 w-full bg-[#7A1E48] font-bold text-white hover:bg-[#641838] sm:w-auto md:inline-flex"
              isDisabled={Boolean(busy)}
              isLoading={busy === 'release'}
              onPress={onRelease}
            >
              Cairkan dana
            </Button>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-default-700">Tidak ada aksi acara yang perlu dilakukan saat ini.</p>
      )}
      {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </section>
  );
}
