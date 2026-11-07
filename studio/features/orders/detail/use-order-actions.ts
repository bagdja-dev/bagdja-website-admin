'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, type ReactNode } from 'react';

import { errorMessage } from '@/studio/api/client';
import {
  addAdhocTermin,
  completeStep,
  forceCompleteOrder,
  forceReleaseStep,
  issueTermin,
  openOrderChat,
  refundOrder,
  saveStepDraft,
  type AdhocTerminInput,
  type OrderDetail,
} from '@/studio/api/order-detail';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import { notify } from '@/studio/ui/primitives/Toast';

import { formatMoney } from './order-model';

export interface StepTarget {
  orderId: string;
  productName: string;
}

export interface OrderActions {
  busy: string | null;
  dialog: ReactNode;
  /** Tandai selesai untuk 1..n item (mode grup = bulk). `true` bila semua berhasil. */
  complete: (key: string, stepName: string, targets: StepTarget[], formData?: Record<string, unknown>) => Promise<boolean>;
  saveDraft: (key: string, stepName: string, targets: StepTarget[], formData: Record<string, unknown>) => Promise<void>;
  release: (key: string, stepName: string, target: StepTarget, amount: number | null) => Promise<void>;
  issue: (orderId: string, terminId: string) => Promise<void>;
  addAdhoc: (orderId: string, input: AdhocTerminInput) => Promise<boolean>;
  refund: () => Promise<void>;
  forceComplete: () => Promise<void>;
  startChat: () => Promise<void>;
}

/** Hasil per item untuk aksi bulk (allSettled): tidak ada rollback, jadi gagal parsial dilaporkan jelas. */
async function runForTargets(targets: StepTarget[], run: (t: StepTarget) => Promise<unknown>): Promise<{ failed: Array<{ target: StepTarget; message: string }> }> {
  const results = await Promise.allSettled(targets.map((t) => run(t)));
  const failed = results.flatMap((r, i) => (r.status === 'rejected' ? [{ target: targets[i], message: errorMessage(r.reason) }] : []));
  return { failed };
}

export function useOrderActions(
  websiteId: string | null,
  order: OrderDetail | null,
  reload: () => Promise<void>,
): OrderActions {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const transactionId = order?.id ?? null;

  const wrap = useCallback(
    async <T,>(key: string, run: () => Promise<T>): Promise<T | undefined> => {
      setBusy(key);
      try {
        return await run();
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const complete: OrderActions['complete'] = async (key, stepName, targets, formData) => {
    if (!websiteId || !transactionId || targets.length === 0) return false;
    const result = await wrap(key, () =>
      runForTargets(targets, (t) => completeStep(websiteId, transactionId, t.orderId, stepName, formData)),
    );
    await reload();
    if (!result) return false;
    if (result.failed.length === 0) {
      notify.success(`"${stepName}" ditandai selesai`, targets.length > 1 ? `${targets.length} produk diperbarui.` : undefined);
      return true;
    }
    const names = result.failed.map((f) => f.target.productName).join(', ');
    notify.error(
      result.failed.length === targets.length ? `Gagal menandai "${stepName}"` : `Sebagian gagal: ${names}`,
      result.failed[0].message,
    );
    return false;
  };

  const saveDraft: OrderActions['saveDraft'] = async (key, stepName, targets, formData) => {
    if (!websiteId || !transactionId || targets.length === 0) return;
    // Bug lama: simpan draft tanpa catch → error hilang. Di sini selalu dilaporkan.
    const result = await wrap(`${key}:draft`, () =>
      runForTargets(targets, (t) => saveStepDraft(websiteId, transactionId, t.orderId, stepName, formData)),
    );
    if (!result) return;
    if (result.failed.length === 0) notify.success('Draft tersimpan', 'Bisa dilanjutkan nanti.');
    else notify.error('Draft gagal disimpan', result.failed[0].message);
  };

  const release: OrderActions['release'] = async (key, stepName, target, amount) => {
    if (!websiteId || !transactionId) return;
    const ok = await confirm({
      title: 'Cairkan dana langkah ini?',
      description: `Dana "${stepName}"${amount != null ? ` (${formatMoney(amount, order?.currency)})` : ''} untuk ${target.productName} dicairkan tanpa persetujuan pembeli. Hanya berhasil bila masa garansi langkah sudah lewat dan tidak sedang dikomplain.`,
      confirmLabel: 'Ya, cairkan',
    });
    if (!ok) return;
    try {
      await wrap(key, () => forceReleaseStep(websiteId, transactionId, target.orderId, stepName));
      notify.success('Dana dicairkan ke Saldo');
      await reload();
    } catch (error) {
      notify.error('Gagal mencairkan dana', errorMessage(error));
    }
  };

  const issue: OrderActions['issue'] = async (orderId, terminId) => {
    if (!websiteId || !transactionId) return;
    try {
      await wrap(`termin:${terminId}`, () => issueTermin(websiteId, transactionId, orderId, terminId));
      notify.success('Tagihan diterbitkan', 'Pembeli menerima tagihan untuk dibayar.');
      await reload();
    } catch (error) {
      notify.error('Gagal menerbitkan tagihan', errorMessage(error));
    }
  };

  const addAdhoc: OrderActions['addAdhoc'] = async (orderId, input) => {
    if (!websiteId || !transactionId) return false;
    try {
      await wrap(`adhoc:${orderId}`, () => addAdhocTermin(websiteId, transactionId, orderId, input));
      notify.success('Tagihan tambahan dibuat', 'Terbitkan saat siap ditagihkan.');
      await reload();
      return true;
    } catch (error) {
      notify.error('Gagal membuat tagihan tambahan', errorMessage(error));
      return false;
    }
  };

  const refund: OrderActions['refund'] = async () => {
    if (!websiteId || !transactionId) return;
    const ok = await confirm({
      title: 'Refund ke pembeli?',
      description: 'Seluruh sisa dana yang masih ditahan dikembalikan ke pembeli. Tindakan ini tidak bisa dibatalkan.',
      confirmLabel: 'Ya, refund',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await wrap('refund', () => refundOrder(websiteId, transactionId));
      notify.success('Refund diproses');
      await reload();
    } catch (error) {
      notify.error('Gagal memproses refund', errorMessage(error));
    }
  };

  const forceComplete: OrderActions['forceComplete'] = async () => {
    if (!websiteId || !transactionId) return;
    const ok = await confirm({
      title: 'Selesaikan pesanan?',
      description: 'Sisa dana yang ditahan dicairkan ke Saldo tanpa konfirmasi pembeli. Hanya berhasil bila masa konfirmasi semua produk sudah lewat.',
      confirmLabel: 'Ya, selesaikan',
    });
    if (!ok) return;
    try {
      await wrap('force-complete', () => forceCompleteOrder(websiteId, transactionId));
      notify.success('Pesanan diselesaikan', 'Sisa dana cair ke Saldo.');
      await reload();
    } catch (error) {
      notify.error('Belum bisa menyelesaikan pesanan', errorMessage(error));
    }
  };

  const startChat: OrderActions['startChat'] = async () => {
    if (!websiteId || !order) return;
    try {
      const threadId = await wrap('chat', () => openOrderChat(websiteId, order));
      router.push(threadId ? `/studio/inbox?thread=${encodeURIComponent(threadId)}` : '/studio/inbox');
    } catch (error) {
      notify.error('Gagal membuka chat', errorMessage(error, 'Tidak dapat menyiapkan percakapan pesanan.'));
    }
  };

  return { busy, dialog, complete, saveDraft, release, issue, addAdhoc, refund, forceComplete, startChat };
}
