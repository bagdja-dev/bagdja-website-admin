'use client';

import { Button, Modal, ModalBody, ModalContent, ModalHeader } from '@heroui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

import {
  checkInGatheringAttendee,
  completeGathering,
  fetchGatheringDetail,
  openGatheringInitiatorChat,
  releaseGatheringFunds,
  sendGatheringTickets,
  startGathering,
  type GatheringDetail,
} from '@/studio/api/gatherings';
import { errorMessage } from '@/studio/api/client';
import { useActiveRole, useActiveWebsiteId } from '@/studio/stores/website-store';
import { hasMinRole } from '@/studio/lib/roles';
import { Icon } from '@/studio/ui/icons';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';
import { StatusScreen } from '@/studio/ui/primitives/StatusScreen';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import { notify } from '@/studio/ui/primitives/Toast';

import { readOrdersListHref } from '../detail/list-return';
import { GatheringCheckInPanel } from './GatheringCheckInPanel';
import { GatheringNextStep } from './GatheringNextStep';
import { GatheringFunds, GatheringHeader, GatheringProgress, GatheringRegistrations } from './GatheringPanels';

type LoadState = 'loading' | 'ready' | 'error' | 'missing';

interface GatheringMobileAction {
  key: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  hint?: string;
}

function GatheringMobileNav({
  actions,
  primaryAction,
  showCheckIn,
  gathering,
  busy,
  focused,
  onChat,
  chatBusy,
  onCheckInQr,
  onManualCheckIn,
}: {
  actions: GatheringMobileAction[];
  primaryAction: GatheringMobileAction | null;
  showCheckIn: boolean;
  gathering: GatheringDetail;
  busy: string;
  focused: boolean;
  onChat: () => void;
  chatBusy: boolean;
  onCheckInQr: (qr: string) => Promise<'CHECKED_IN' | 'ALREADY_CHECKED_IN'>;
  onManualCheckIn: (registrationId: string, attendeeName: string) => Promise<void>;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(focused);
  if (!primaryAction && actions.length === 0 && !showCheckIn && !gathering.initiator_user_id) return null;

  return (
    <nav
      aria-label="Navigasi aksi acara"
      className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-default-200 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
    >
      {showCheckIn && (
        <Button
          variant={primaryAction ? 'bordered' : 'solid'}
          color={primaryAction ? 'default' : 'primary'}
          className="min-h-12 flex-1 rounded-[12px] font-bold"
          aria-haspopup="dialog"
          aria-expanded={checkInOpen}
          onPress={() => setCheckInOpen(true)}
        >
          Check-in
        </Button>
      )}
      {primaryAction && (
        <Button
          color="primary"
          className="min-h-12 flex-1 rounded-[12px] font-bold"
          isDisabled={primaryAction.disabled}
          isLoading={primaryAction.busy}
          onPress={primaryAction.onPress}
        >
          {primaryAction.label}
        </Button>
      )}
      {actions.length > 0 && (
        <Button
          variant={primaryAction || showCheckIn ? 'bordered' : 'solid'}
          color={primaryAction || showCheckIn ? 'default' : 'primary'}
          className="min-h-12 flex-1 rounded-[12px] font-bold"
          aria-haspopup="dialog"
          aria-expanded={actionsOpen}
          onPress={() => setActionsOpen(true)}
        >
          Aksi lainnya
        </Button>
      )}
      {gathering.initiator_user_id && !primaryAction && actions.length === 0 && !showCheckIn ? (
        <Button
          variant="bordered"
          className="min-h-12 flex-1 rounded-[12px] border-[#7A1E48] font-bold text-[#7A1E48]"
          startContent={<Icon name="chat" size={18} />}
          onPress={onChat}
          isLoading={chatBusy}
        >
          Chat penyelenggara
        </Button>
      ) : gathering.initiator_user_id && (
        <Button
          isIconOnly
          variant={showCheckIn || primaryAction || actions.length ? 'bordered' : 'solid'}
          color={showCheckIn || primaryAction || actions.length ? 'default' : 'primary'}
          className="min-h-12 min-w-12 shrink-0 rounded-[12px]"
          aria-label="Chat penyelenggara"
          onPress={onChat}
          isLoading={chatBusy}
        >
          <Icon name="chat" size={18} />
        </Button>
      )}
      <Modal
        isOpen={actionsOpen}
        onOpenChange={setActionsOpen}
        placement="bottom"
        classNames={{
          wrapper: 'items-end',
          base: 'm-0 h-auto w-full max-w-none rounded-t-2xl rounded-b-none pb-[env(safe-area-inset-bottom)]',
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-3 border-b border-default-100 px-5 pb-4 pt-3">
                <span className="mx-auto h-1 w-10 rounded-full bg-default-300" aria-hidden="true" />
                <span>Aksi acara</span>
              </ModalHeader>
              <ModalBody className="gap-1 px-3 py-3">
                {actions.map((action) => (
                  <div key={action.key}>
                    <button
                      type="button"
                      disabled={action.disabled || action.busy}
                      onClick={() => {
                        onClose();
                        action.onPress();
                      }}
                      className="flex min-h-12 w-full items-center justify-between rounded-xl px-3 text-left text-sm font-semibold text-foreground hover:bg-default-100 disabled:opacity-60"
                    >
                      <span>{action.label}</span>
                      {action.busy && <span className="text-xs text-default-500">Memproses…</span>}
                    </button>
                    {action.hint && <p className="px-3 pb-2 text-xs text-default-500">{action.hint}</p>}
                  </div>
                ))}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
      <Modal
        isOpen={checkInOpen}
        onOpenChange={setCheckInOpen}
        placement="bottom"
        scrollBehavior="inside"
        classNames={{
          wrapper: 'items-end',
          base: 'm-0 h-[88dvh] max-h-[88dvh] w-full max-w-none rounded-t-2xl rounded-b-none pb-[env(safe-area-inset-bottom)]',
          body: 'overflow-y-auto p-0',
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-3 border-b border-default-100 px-5 pb-4 pt-3">
                <span className="mx-auto h-1 w-10 rounded-full bg-default-300" aria-hidden="true" />
                <div className="flex w-full items-center justify-between">
                  <span>Check-in peserta</span>
                  <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm font-semibold text-default-600 hover:bg-default-100">Tutup</button>
                </div>
              </ModalHeader>
              <ModalBody>
                <GatheringCheckInPanel
                  gathering={gathering}
                  focused={focused}
                  busy={busy}
                  scannerId="studio-gathering-check-in-mobile-scanner"
                  sectionId="gathering-check-in-mobile"
                  className="border-0 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
                  onCheckInQr={onCheckInQr}
                  onManualCheckIn={onManualCheckIn}
                />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </nav>
  );
}

function currency(amount: number, code: string): string {
  try {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${code} ${new Intl.NumberFormat('id-ID').format(amount)}`;
  }
}

function GatheringOrderContent({ groupId }: { groupId: string }) {
  const websiteId = useActiveWebsiteId();
  const role = useActiveRole();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldFocusCheckIn = searchParams.get('checkin') === '1';
  const { confirm, dialog } = useConfirm();
  const [gathering, setGathering] = useState<GatheringDetail | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [backHref, setBackHref] = useState('/studio/orders');

  const reload = useCallback(async (silent = false) => {
    if (!websiteId) return;
    if (!silent) setState('loading');
    setLoadError('');
    try {
      setGathering(await fetchGatheringDetail(websiteId, groupId));
      setState('ready');
    } catch (error) {
      setLoadError(errorMessage(error, 'Gagal memuat detail acara.'));
      setState(error instanceof Error && 'status' in error && error.status === 404 ? 'missing' : 'error');
    }
  }, [groupId, websiteId]);

  useEffect(() => {
    setBackHref(readOrdersListHref());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const canEdit = hasMinRole(role, 'editor');
  const canAdmin = hasMinRole(role, 'admin');
  const back = { href: backHref, label: 'Pesanan' };

  if (!websiteId) {
    return (
      <>
        <PageHeader title="Gathering" back={back} />
        <StatusScreen icon={<Icon name="calendar" size={28} />} title="Website belum dipilih" description="Pilih website aktif untuk membuka detail acara." actions={[{ label: 'Kembali ke Pesanan', href: backHref }]} />
      </>
    );
  }

  const perform = async (action: string, operation: () => Promise<void>): Promise<void> => {
    setBusy(action);
    setActionError('');
    try {
      await operation();
      await reload(true);
    } catch (error) {
      const message = errorMessage(error, 'Aksi acara gagal diproses.');
      setActionError(message);
      notify.error('Aksi acara gagal', message);
    } finally {
      setBusy('');
    }
  };

  const confirmedAction = async (
    action: string,
    title: string,
    description: string,
    operation: () => Promise<void>,
    confirmLabel: string,
  ): Promise<void> => {
    const accepted = await confirm({ title, description, confirmLabel });
    if (accepted) await perform(action, operation);
  };

  const checkInQr = async (qr: string): Promise<'CHECKED_IN' | 'ALREADY_CHECKED_IN'> => {
    if (!websiteId) throw new Error('Website aktif belum tersedia.');
    setBusy('check-in-qr');
    setActionError('');
    try {
      const result = await checkInGatheringAttendee(websiteId, groupId, { qr: qr.trim() });
      notify.success(
        result.result === 'CHECKED_IN' ? 'Peserta berhasil check-in' : 'Peserta sudah check-in',
        result.registration.attendee_name,
      );
      await reload(true);
      return result.result;
    } catch (error) {
      const message = errorMessage(error, 'Check-in gagal.');
      setActionError(message);
      notify.error('Check-in gagal', message);
      throw error;
    } finally {
      setBusy('');
    }
  };

  const manualCheckIn = async (registrationId: string, attendeeName: string): Promise<void> => {
    if (!websiteId) return;
    await perform(`check-in-${registrationId}`, async () => {
      const result = await checkInGatheringAttendee(websiteId, groupId, { registration_id: registrationId });
      notify.success(result.result === 'CHECKED_IN' ? 'Check-in berhasil' : 'Peserta sudah check-in', attendeeName);
    });
  };

  const chatInitiator = async () => {
    if (!websiteId || !gathering?.initiator_user_id) {
      notify.error('Gagal membuka chat', 'Akun penyelenggara tidak tersedia untuk memulai chat.');
      return;
    }
    setChatBusy(true);
    try {
      const threadId = await openGatheringInitiatorChat(websiteId, gathering);
      router.push(threadId ? `/studio/inbox?thread=${encodeURIComponent(threadId)}` : '/studio/inbox');
    } catch (error) {
      notify.error('Gagal membuka chat', errorMessage(error, 'Tidak dapat menyiapkan percakapan penyelenggara.'));
    } finally {
      setChatBusy(false);
    }
  };

  if (state === 'missing') {
    return (
      <>
        <PageHeader title="Gathering" back={back} />
        <StatusScreen icon={<Icon name="calendar" size={28} />} title="Acara tidak ditemukan" description={loadError} actions={[{ label: 'Kembali ke Pesanan', href: backHref }]} />
      </>
    );
  }
  if (state === 'error') {
    return (
      <>
        <PageHeader title="Gathering" back={back} />
        <StatusScreen icon={<Icon name="warning" size={28} />} title="Gagal memuat acara" description={loadError} actions={[{ label: 'Kembali ke Pesanan', href: backHref, variant: 'secondary' }]} note={<Button color="primary" onPress={() => void reload()}>Coba lagi</Button>} />
      </>
    );
  }
  if (!gathering || state === 'loading') {
    return (
      <>
        <PageHeader title="Memuat acara…" back={back} />
        <div className="mx-auto flex w-full max-w-[920px] flex-col gap-3 p-4" aria-busy="true">
          {[150, 100, 220].map((height) => <div key={height} className="animate-pulse rounded-2xl bg-default-100" style={{ height }} />)}
        </div>
      </>
    );
  }

  const status = gathering.occurrence.status;
  const startAt = gathering.occurrence.final_schedule ? new Date(gathering.occurrence.final_schedule).getTime() : Number.NaN;
  const canStart = Number.isFinite(startAt) && Date.now() >= startAt - 24 * 60 * 60 * 1000;
  const pendingTickets = Math.max(0, gathering.attendance.paid_count - gathering.attendance.ticket_sent_count);
  const showCheckIn = status === 'IN_PROGRESS' && canEdit;
  const sendTickets = () => confirmedAction(
    'tickets',
    'Kirim tiket peserta?',
    `${pendingTickets} tiket untuk peserta lunas akan dikirim.`,
    async () => {
      const result = await sendGatheringTickets(websiteId, groupId);
      if (result.status === 'FAILED') throw new Error('Antrean pengiriman tiket gagal dibuat.');
      notify.success('Pengiriman tiket diproses', `${result.total_count} tiket masuk antrean.`);
    },
    'Kirim tiket',
  );
  const start = () => confirmedAction(
    'start',
    'Mulai acara sekarang?',
    'Acara akan beralih ke Berlangsung dan check-in peserta dibuka.',
    async () => {
      await startGathering(websiteId, groupId);
      notify.success('Acara dimulai', 'Check-in peserta sekarang dibuka.');
    },
    'Mulai acara',
  );
  const complete = () => confirmedAction(
    'complete',
    'Tandai acara selesai?',
    `Acara akan diselesaikan dan pencairan sisa dana diproses. ${currency(Math.max(0, gathering.settlement.seat_total - gathering.settlement.released_total), gathering.occurrence.currency)} masih ditahan.`,
    async () => {
      const result = await completeGathering(websiteId, groupId);
      const description = `${currency(result.release.released_total, gathering.occurrence.currency)} diproses; ${result.release.failed_count} transaksi gagal.`;
      if (result.release.failed_count > 0) notify.warning('Acara selesai, pencairan belum tuntas', description);
      else notify.success('Acara selesai', description);
    },
    'Tandai selesai',
  );
  const release = () => confirmedAction(
    'release',
    'Proses ulang pencairan dana?',
    `Dana tertahan ${currency(gathering.settlement.outstanding_total, gathering.occurrence.currency)} akan dicoba dicairkan.`,
    async () => {
      const result = await releaseGatheringFunds(websiteId, groupId);
      const description = `${currency(result.released_total, gathering.occurrence.currency)} berhasil dicairkan; ${result.failed_count} transaksi gagal.`;
      if (result.failed_count > 0) notify.warning('Sebagian pencairan gagal', description);
      else notify.success('Pencairan diproses', description);
    },
    'Cairkan dana',
  );
  const pendingDeposit = gathering.settlement.stage === 'DEPOSIT' && gathering.settlement.outstanding_total > 0;
  const mobileActions: GatheringMobileAction[] = [];
  let mobilePrimaryAction: GatheringMobileAction | null = null;

  if (canAdmin && status === 'CONFIRMED') {
    mobilePrimaryAction = {
      key: 'start',
      label: 'Mulai acara',
      onPress: () => void start(),
      disabled: !canStart || Boolean(busy),
      busy: busy === 'start',
      hint: !canStart ? 'Acara dapat dimulai sejak 24 jam sebelum jadwal.' : undefined,
    };
    mobileActions.push({
      key: 'tickets',
      label: pendingTickets ? `Kirim ${pendingTickets} tiket` : 'Semua tiket terkirim',
      onPress: () => void sendTickets(),
      disabled: pendingTickets === 0 || Boolean(busy),
      busy: busy === 'tickets',
    });
    if (pendingDeposit) {
      mobileActions.push({
        key: 'release',
        label: 'Proses ulang pencairan DP',
        onPress: () => void release(),
        disabled: Boolean(busy),
        busy: busy === 'release',
      });
    }
  } else if (canAdmin && status === 'IN_PROGRESS') {
    if (pendingDeposit) {
      mobileActions.push({
        key: 'release',
        label: 'Proses ulang pencairan DP',
        onPress: () => void release(),
        disabled: Boolean(busy),
        busy: busy === 'release',
      });
    }
    mobileActions.push({
      key: 'complete',
      label: 'Tandai selesai',
      onPress: () => void complete(),
      disabled: Boolean(busy),
      busy: busy === 'complete',
    });
  } else if (canAdmin && status === 'COMPLETED' && gathering.settlement.outstanding_total > 0) {
    mobilePrimaryAction = {
      key: 'release',
      label: 'Cairkan dana',
      onPress: () => void release(),
      disabled: Boolean(busy),
      busy: busy === 'release',
    };
  }

  return (
    <>
      <PageHeader title={gathering.title} description="Detail acara gathering" back={back} />
      <main className="mx-auto flex w-full max-w-[920px] flex-col gap-4 px-3 pb-28 md:px-0 md:pb-20">
        <GatheringHeader gathering={gathering} />
        <GatheringProgress gathering={gathering} />

        <GatheringNextStep
          gathering={gathering}
          canAdmin={canAdmin}
          canStart={canStart}
          busy={busy}
          error={actionError}
          pendingTickets={pendingTickets}
          onSendTickets={() => void sendTickets()}
          onStart={() => void start()}
          onComplete={() => void complete()}
          onRelease={() => void release()}
        />

        {showCheckIn && (
          <div className="hidden md:block">
            <GatheringCheckInPanel
              gathering={gathering}
              focused={false}
              busy={busy}
              scannerId="studio-gathering-check-in-desktop-scanner"
              sectionId="gathering-check-in-desktop"
              onCheckInQr={checkInQr}
              onManualCheckIn={manualCheckIn}
            />
          </div>
        )}

        <GatheringFunds gathering={gathering} />
        <GatheringRegistrations gathering={gathering} />
      </main>
      <GatheringMobileNav
        actions={mobileActions}
        primaryAction={mobilePrimaryAction}
        showCheckIn={showCheckIn}
        gathering={gathering}
        busy={busy}
        focused={shouldFocusCheckIn}
        onChat={() => void chatInitiator()}
        chatBusy={chatBusy}
        onCheckInQr={checkInQr}
        onManualCheckIn={manualCheckIn}
      />
      {dialog}
    </>
  );
}

export function GatheringOrderPage({ groupId }: { groupId: string }) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-default-500">Memuat detail acara…</div>}>
      <GatheringOrderContent groupId={groupId} />
    </Suspense>
  );
}
