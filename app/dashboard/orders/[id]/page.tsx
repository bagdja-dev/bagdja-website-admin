'use client';

import { Button, Card, CardBody, CardHeader, Chip, Divider } from '@heroui/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAlertDialog } from '../../../components/alert-dialog';
import { useConfirmDialog } from '../../../components/confirm-dialog';
import { FormInput } from '../../../components/form-field';
import { LoadingSpinner } from '../../../components/loading-spinner';
import { NoWebsiteState } from '../../../components/no-website-state';
import { apiClient, ApiError } from '../../../lib/api-client';
import { formatCurrency } from '../../../lib/currency';
import {
  hasMinRole,
  TRANSACTION_STATUS_LABELS,
  type OrderFulfillmentStepProgress,
  type WebsiteTransaction,
} from '../../../lib/types';
import { formatCourierCode } from '../../../lib/courier-labels';
import { useWebsiteContext } from '../../../context/website-context';

function stepKey(orderId: string, stepName: string): string {
  return `${orderId}::${stepName}`;
}

function groupStepKey(flowName: string, stepName: string): string {
  return `group:${flowName}::${stepName}`;
}

interface GroupStepItemView {
  orderId: string;
  productName: string;
  step: OrderFulfillmentStepProgress;
  priorCompleted: boolean;
}

interface GroupStepView {
  index: number;
  stepName: string;
  description: string | null;
  processDay: number | null;
  releasePercentage: number | null;
  guarantyDays: number | null;
  formSchema: OrderFulfillmentStepProgress['formSchema'];
  items: GroupStepItemView[];
  completedCount: number;
  totalCount: number;
  /** Produk yang step-nya belum selesai TAPI sudah waktunya (step sebelumnya sudah selesai) — target aksi bulk "Tandai Selesai". */
  eligibleItems: GroupStepItemView[];
}

/**
 * Ubah progress per-item (per order_id) jadi progress per-STEP di level
 * grup — dasar tampilan default "grup" yang bisa update banyak produk
 * sekaligus dalam 1 klik (mempermudah input, lihat catatan di render).
 */
function buildGroupSteps(
  groupItems: { orderId: string; productName: string; progress: { steps: OrderFulfillmentStepProgress[] } }[],
): GroupStepView[] {
  if (groupItems.length === 0) return [];
  const stepCount = groupItems[0].progress.steps.length;
  return Array.from({ length: stepCount }, (_, index) => {
    const items: GroupStepItemView[] = groupItems.map((gi) => ({
      orderId: gi.orderId,
      productName: gi.productName,
      step: gi.progress.steps[index],
      priorCompleted: gi.progress.steps.slice(0, index).every((s) => s.completed),
    }));
    const template = items[0].step;
    return {
      index,
      stepName: template.stepName,
      description: template.description,
      processDay: template.processDay,
      releasePercentage: template.releasePercentage,
      guarantyDays: template.guarantyDays,
      formSchema: template.formSchema,
      items,
      completedCount: items.filter((i) => i.step.completed).length,
      totalCount: items.length,
      eligibleItems: items.filter((i) => !i.step.completed && i.priorCompleted),
    };
  });
}

/** Status yang dana-nya masih ter-hold — satu-satunya kondisi bisa direfund. */
const REFUNDABLE_STATUSES = new Set(['HELD', 'DISPUTED']);

type StatusTone = 'default' | 'primary' | 'success' | 'danger' | 'warning';

const STATUS_TONE: Record<string, StatusTone> = {
  PENDING: 'warning',
  PENDING_PAYMENT: 'warning',
  HELD: 'primary',
  DISPUTED: 'danger',
  COMPLETED: 'success',
  REFUNDED: 'default',
  CLOSED: 'default',
  CANCELLED: 'default',
};

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { websiteId, role, loading: ctxLoading } = useWebsiteContext();
  const { confirm, dialog } = useConfirmDialog();
  const { alert, dialog: alertDialog } = useAlertDialog();
  const [transaction, setTransaction] = useState<WebsiteTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [forceCompleting, setForceCompleting] = useState(false);
  const [completingKey, setCompletingKey] = useState<string | null>(null);
  const [completeFormData, setCompleteFormData] = useState<Record<string, string>>({});
  const [stepBusy, setStepBusy] = useState<string | null>(null);
  const [stepError, setStepError] = useState<Record<string, string>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupFormData, setGroupFormData] = useState<Record<string, Record<string, string>>>({});
  const [groupBusy, setGroupBusy] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!websiteId || !params.id) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiClient<WebsiteTransaction>(
        `/api/websites/${websiteId}/transactions/${params.id}`,
      );
      setTransaction(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat detail pesanan');
    } finally {
      setLoading(false);
    }
  }, [websiteId, params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const canRefund = role ? hasMinRole(role, 'admin') : false;
  const canManageFulfillment = role ? hasMinRole(role, 'editor') : false;

  const itemTotalByOrderId = useMemo(() => {
    const map = new Map<string, number>();
    (transaction?.items ?? []).forEach((i) => map.set(i.order_id, Number(i.total_amount)));
    return map;
  }, [transaction]);

  const fulfillmentGroups = useMemo(() => {
    if (!transaction?.fulfillment) return [];
    const byFlow = new Map<string, { orderId: string; productName: string; progress: (typeof transaction.fulfillment)[string] }[]>();
    for (const item of transaction.items ?? []) {
      const progress = transaction.fulfillment[item.order_id];
      if (!progress) continue;
      const list = byFlow.get(progress.flowName) ?? [];
      list.push({ orderId: item.order_id, productName: item.order?.product?.name ?? 'Produk', progress });
      byFlow.set(progress.flowName, list);
    }
    return Array.from(byFlow.entries()).map(([flowName, items]) => ({ flowName, items }));
  }, [transaction]);

  const openCompleteForm = (orderId: string, step: OrderFulfillmentStepProgress) => {
    const key = stepKey(orderId, step.stepName);
    setCompletingKey(key);
    const initial: Record<string, string> = {};
    (step.formSchema ?? []).forEach((f) => {
      initial[f.key] = '';
    });
    setCompleteFormData(initial);
    setStepError((prev) => ({ ...prev, [key]: '' }));
  };

  const submitCompleteStep = async (orderId: string, step: OrderFulfillmentStepProgress) => {
    if (!websiteId || !params.id) return;
    const key = stepKey(orderId, step.stepName);
    for (const field of step.formSchema ?? []) {
      if (field.required && !completeFormData[field.key]?.trim()) {
        setStepError((prev) => ({ ...prev, [key]: `Field "${field.label}" wajib diisi` }));
        return;
      }
    }
    setStepBusy(key);
    setStepError((prev) => ({ ...prev, [key]: '' }));
    try {
      const formData: Record<string, unknown> = {};
      for (const field of step.formSchema ?? []) {
        if (completeFormData[field.key]?.trim()) formData[field.key] = completeFormData[field.key].trim();
      }
      await apiClient(
        `/api/websites/${websiteId}/transactions/${params.id}/orders/${orderId}/steps/complete`,
        {
          method: 'POST',
          body: JSON.stringify({
            step_name: step.stepName,
            form_data: Object.keys(formData).length ? formData : undefined,
          }),
        },
      );
      setCompletingKey(null);
      await load();
    } catch (err) {
      setStepError((prev) => ({ ...prev, [key]: err instanceof Error ? err.message : 'Gagal menyimpan' }));
    } finally {
      setStepBusy(null);
    }
  };

  const submitForceRelease = async (orderId: string, step: OrderFulfillmentStepProgress) => {
    if (!websiteId || !params.id) return;
    const key = stepKey(orderId, step.stepName);
    const ok = await confirm({
      title: 'Release Dana Sekarang?',
      message: `Cairkan dana step "${step.stepName}" tanpa persetujuan buyer. Hanya berhasil kalau masa garansi sudah lewat dan step tidak sedang dikomplain.`,
      confirmLabel: 'Ya, Release Dana',
    });
    if (!ok) return;
    setStepBusy(key);
    setStepError((prev) => ({ ...prev, [key]: '' }));
    try {
      await apiClient(
        `/api/websites/${websiteId}/transactions/${params.id}/orders/${orderId}/steps/${encodeURIComponent(step.stepName)}/force-release`,
        { method: 'POST' },
      );
      await load();
    } catch (err) {
      setStepError((prev) => ({ ...prev, [key]: err instanceof Error ? err.message : 'Gagal merilis dana' }));
    } finally {
      setStepBusy(null);
    }
  };

  const toggleGroupExpanded = (flowName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(flowName)) next.delete(flowName);
      else next.add(flowName);
      return next;
    });
  };

  /** Tandai step selesai untuk SEMUA produk grup yang sedang eligible sekaligus — form-nya dipakai bareng (mis. 1 No Resi untuk 1 paket berisi banyak produk). */
  const submitGroupCompleteStep = async (flowName: string, step: GroupStepView) => {
    if (!websiteId || !params.id) return;
    const key = groupStepKey(flowName, step.stepName);
    const fields = step.formSchema ?? [];
    for (const field of fields) {
      if (field.required && !groupFormData[key]?.[field.key]?.trim()) {
        setGroupError((prev) => ({ ...prev, [key]: `Field "${field.label}" wajib diisi` }));
        return;
      }
    }
    setGroupBusy(key);
    setGroupError((prev) => ({ ...prev, [key]: '' }));
    try {
      const formData: Record<string, unknown> = {};
      for (const field of fields) {
        const v = groupFormData[key]?.[field.key];
        if (v?.trim()) formData[field.key] = v.trim();
      }
      await Promise.all(
        step.eligibleItems.map((item) =>
          apiClient(
            `/api/websites/${websiteId}/transactions/${params.id}/orders/${item.orderId}/steps/complete`,
            {
              method: 'POST',
              body: JSON.stringify({
                step_name: step.stepName,
                form_data: Object.keys(formData).length ? formData : undefined,
              }),
            },
          ),
        ),
      );
      setGroupFormData((prev) => ({ ...prev, [key]: {} }));
      await load();
    } catch (err) {
      setGroupError((prev) => ({ ...prev, [key]: err instanceof Error ? err.message : 'Gagal menyimpan' }));
    } finally {
      setGroupBusy(null);
    }
  };

  const handleRefund = async () => {
    if (!websiteId || !params.id) return;
    const ok = await confirm({
      title: 'Refund Pembeli?',
      message:
        'Seluruh sisa dana yang ditahan akan dikembalikan ke wallet pembeli. Tindakan ini tidak bisa diurungkan.',
      confirmLabel: 'Ya, Refund',
      tone: 'danger',
    });
    if (!ok) return;

    setRefunding(true);
    setRefundError('');
    try {
      await apiClient(`/api/websites/${websiteId}/transactions/${params.id}/refund`, {
        method: 'POST',
      });
      await load();
    } catch (err) {
      setRefundError(err instanceof ApiError ? err.message : 'Gagal memproses refund');
    } finally {
      setRefunding(false);
    }
  };

  const handleForceComplete = async () => {
    if (!websiteId || !params.id) return;
    const ok = await confirm({
      title: 'Force-Complete Transaksi?',
      message:
        'Sisa dana escrow akan dicairkan ke Anda tanpa konfirmasi buyer. Hanya berhasil kalau semua produk di transaksi ini sudah diatur masa garansinya dan masa garansi itu sudah lewat.',
      confirmLabel: 'Force-Complete',
    });
    if (!ok) return;

    setForceCompleting(true);
    try {
      await apiClient(`/api/websites/${websiteId}/transactions/${params.id}/force-complete`, {
        method: 'POST',
      });
      await load();
    } catch (err) {
      await alert({
        title: 'Force-Complete Gagal',
        message: err instanceof ApiError ? err.message : 'Gagal force-complete transaksi',
      });
    } finally {
      setForceCompleting(false);
    }
  };

  if (ctxLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;
  if (loading) return <LoadingSpinner />;

  if (error || !transaction) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/orders" className="text-sm font-medium text-primary hover:underline">
          ← Kembali ke Pesanan
        </Link>
        <Card className="border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="py-10 text-center text-sm text-danger">
            {error || 'Pesanan tidak ditemukan'}
          </CardBody>
        </Card>
      </div>
    );
  }

  const shippingLines = [
    transaction.recipient_name,
    transaction.phone,
    [transaction.address, transaction.district, transaction.city].filter(Boolean).join(', '),
    transaction.postal_code,
  ].filter((line): line is string => Boolean(line));

  // `metadata.shipping` cuma ada kalau checkout lewat flow baru (cek ongkir
  // real) — flow lama (tombol label statis) tidak punya ini sama sekali,
  // walau `shipping_cost` kolomnya selalu berisi angka (default 0, BUKAN
  // penanda "belum ditentukan") — lihat catatan di lib/types.ts.
  const shippingDetail = transaction.metadata?.shipping ?? null;
  const itemsSubtotal = (transaction.items ?? []).reduce(
    (sum, i) => sum + Number(i.total_amount),
    0,
  );
  const shippingCost = transaction.shipping_cost ?? 0;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/orders" className="text-sm font-medium text-primary hover:underline">
        ← Kembali ke Pesanan
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Detail Pesanan</h1>
          <p className="mt-1 text-sm text-default-500">{formatDate(transaction.created_at)}</p>
        </div>
        <Chip size="lg" variant="flat" color={STATUS_TONE[transaction.status] ?? 'default'}>
          {TRANSACTION_STATUS_LABELS[transaction.status] ?? transaction.status}
        </Chip>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="border-0 shadow-md ring-1 ring-default-100">
            <CardHeader className="font-semibold">Item ({transaction.items?.length ?? 0})</CardHeader>
            <CardBody className="space-y-3 pt-0">
              {(transaction.items ?? []).map((item) => {
                const product = item.order?.product;
                const image = product?.images?.[0];
                return (
                  <div key={item.id} className="flex gap-3 rounded-xl bg-default-50 p-3">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-default-200 text-lg font-bold text-default-500">
                        {(product?.name ?? 'P').charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{product?.name ?? 'Produk'}</p>
                      <div className="mt-1 flex items-center justify-between text-sm text-default-500">
                        <span>{item.quantity} × {formatCurrency(item.unit_price)}</span>
                        <span className="font-semibold text-foreground">{formatCurrency(item.total_amount)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>

          {fulfillmentGroups.length > 0 && (
            <Card className="border-0 shadow-md ring-1 ring-default-100">
              <CardHeader className="font-semibold">Progres Pengiriman</CardHeader>
              <CardBody className="space-y-5 pt-0">
                {fulfillmentGroups.map((group) => {
                  const groupTotal = group.items.reduce(
                    (sum, gi) => sum + (itemTotalByOrderId.get(gi.orderId) ?? 0),
                    0,
                  );
                  const isExpanded = expandedGroups.has(group.flowName);
                  const groupSteps = buildGroupSteps(group.items);

                  return (
                    <div key={group.flowName} className="rounded-xl border border-default-200 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-foreground">{group.flowName}</span>
                          <span className="ml-2 text-xs text-default-400">{group.items.length} produk</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-default-500">
                            Total grup: {formatCurrency(groupTotal, transaction.currency)}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleGroupExpanded(group.flowName)}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            {isExpanded ? 'Sembunyikan per produk' : 'Lihat per produk'}
                          </button>
                        </div>
                      </div>

                      {!isExpanded ? (
                        <ol className="space-y-2">
                          {groupSteps.map((step) => {
                            const key = groupStepKey(group.flowName, step.stepName);
                            const allCompleted = step.completedCount === step.totalCount;
                            const hasEligible = step.eligibleItems.length > 0;
                            const pendingAmount =
                              step.releasePercentage != null ? (step.releasePercentage / 100) * groupTotal : null;
                            const anyDisputed = step.items.some((i) => i.step.disputed);
                            const anyReleaseApproved = step.items.some(
                              (i) => i.step.completed && i.step.releasePercentage != null && i.step.releaseApproved,
                            );
                            const anyPendingRelease = step.items.some(
                              (i) => i.step.completed && i.step.releasePercentage != null && !i.step.releaseApproved,
                            );

                            return (
                              <li
                                key={step.stepName}
                                className={`rounded-lg border p-3 text-sm ${
                                  allCompleted
                                    ? 'border-success-200 bg-success-50/50'
                                    : hasEligible
                                      ? 'border-primary-200 bg-primary-50/40'
                                      : 'border-default-200 bg-default-50/50 opacity-70'
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-medium text-foreground">
                                    {step.index + 1}. {step.stepName}
                                    {allCompleted && <span className="ml-1.5 text-success">✓</span>}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {step.processDay != null && (
                                      <span className="text-xs text-default-400">± {step.processDay} hari</span>
                                    )}
                                    <span className="text-xs font-medium text-default-500">
                                      {step.completedCount}/{step.totalCount} produk selesai
                                    </span>
                                  </div>
                                </div>
                                {step.description && (
                                  <p className="mt-1 text-xs text-default-500">{step.description}</p>
                                )}

                                {anyDisputed && (
                                  <p className="mt-2 rounded-lg bg-danger-50 px-2.5 py-1.5 text-xs text-danger">
                                    Ada produk yang dikomplain buyer di step ini — buka &quot;Lihat per produk&quot;
                                    untuk detail.
                                  </p>
                                )}

                                {step.releasePercentage != null && (anyReleaseApproved || anyPendingRelease) && (
                                  <p className="mt-2 rounded-lg bg-default-100 px-2.5 py-1.5 text-xs text-default-600">
                                    {anyReleaseApproved && anyPendingRelease
                                      ? 'Sebagian dana sudah dirilis, sebagian menunggu persetujuan buyer — lihat per produk.'
                                      : anyReleaseApproved
                                        ? 'Dana untuk step ini sudah dirilis.'
                                        : `Menunggu persetujuan buyer — ${formatCurrency(pendingAmount ?? 0, transaction.currency)} per produk.`}
                                  </p>
                                )}

                                {groupError[key] && <p className="mt-2 text-xs text-danger">{groupError[key]}</p>}

                                {hasEligible && canManageFulfillment && (
                                  <div className="mt-3 space-y-2 rounded-lg border border-default-200 bg-white p-3">
                                    <p className="text-xs text-default-500">
                                      Berlaku untuk: {step.eligibleItems.map((i) => i.productName).join(', ')}
                                    </p>
                                    {(step.formSchema ?? []).map((f) => (
                                      <FormInput
                                        key={f.key}
                                        label={f.label}
                                        required={f.required}
                                        value={groupFormData[key]?.[f.key] ?? ''}
                                        onChange={(v) =>
                                          setGroupFormData((prev) => ({
                                            ...prev,
                                            [key]: { ...prev[key], [f.key]: v },
                                          }))
                                        }
                                      />
                                    ))}
                                    <Button
                                      size="sm"
                                      color="primary"
                                      isLoading={groupBusy === key}
                                      onPress={() => submitGroupCompleteStep(group.flowName, step)}
                                    >
                                      Tandai Selesai ({step.eligibleItems.length} Produk)
                                    </Button>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ol>
                      ) : (
                        <div className="space-y-4">
                          {group.items.map((gi) => (
                            <div key={gi.orderId}>
                              <p className="mb-2 text-sm font-medium text-default-600">{gi.productName}</p>
                              <ol className="space-y-2">
                                {gi.progress.steps.map((step, index) => {
                                  const key = stepKey(gi.orderId, step.stepName);
                                  const priorCompleted = gi.progress.steps
                                    .slice(0, index)
                                    .every((s) => s.completed);
                                  const isCurrent = !step.completed && priorCompleted;
                                  const pendingAmount =
                                    step.releasePercentage != null
                                      ? (step.releasePercentage / 100) * groupTotal
                                      : null;

                                  return (
                                    <li
                                      key={step.stepName}
                                      className={`rounded-lg border p-3 text-sm ${
                                        step.completed
                                          ? 'border-success-200 bg-success-50/50'
                                          : isCurrent
                                            ? 'border-primary-200 bg-primary-50/40'
                                            : 'border-default-200 bg-default-50/50 opacity-70'
                                      }`}
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="font-medium text-foreground">
                                          {index + 1}. {step.stepName}
                                          {step.completed && <span className="ml-1.5 text-success">✓</span>}
                                        </span>
                                        {step.processDay != null && (
                                          <span className="text-xs text-default-400">
                                            ± {step.processDay} hari
                                          </span>
                                        )}
                                      </div>
                                      {step.description && (
                                        <p className="mt-1 text-xs text-default-500">{step.description}</p>
                                      )}

                                      {step.completed &&
                                        step.formData &&
                                        Object.keys(step.formData).length > 0 && (
                                          <div className="mt-2 space-y-0.5 text-xs text-default-600">
                                            {(step.formSchema ?? []).map((f) =>
                                              step.formData?.[f.key] != null && step.formData[f.key] !== '' ? (
                                                <p key={f.key}>
                                                  <span className="text-default-400">{f.label}:</span>{' '}
                                                  {String(step.formData?.[f.key])}
                                                </p>
                                              ) : null,
                                            )}
                                          </div>
                                        )}

                                      {step.disputed && (
                                        <p className="mt-2 rounded-lg bg-danger-50 px-2.5 py-1.5 text-xs text-danger">
                                          Dikomplain buyer — tidak bisa lanjut ke step berikutnya atau
                                          force-release sampai buyer menyetujui pelepasan dana.
                                        </p>
                                      )}

                                      {step.completed &&
                                        step.releasePercentage != null &&
                                        (step.releaseApproved ? (
                                          <p className="mt-2 rounded-lg bg-success-50 px-2.5 py-1.5 text-xs text-success-700">
                                            Dana {formatCurrency(step.releaseAmount ?? 0, transaction.currency)}{' '}
                                            sudah dirilis (
                                            {step.releaseApprovedBy === 'buyer'
                                              ? 'disetujui buyer'
                                              : 'force-release masa garansi'}
                                            ).
                                          </p>
                                        ) : (
                                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-warning-50 px-2.5 py-1.5 text-xs text-warning-700">
                                            <span>
                                              Menunggu persetujuan buyer —{' '}
                                              {formatCurrency(pendingAmount ?? 0, transaction.currency)}
                                              {step.guarantyDays != null && ` (garansi ${step.guarantyDays} hari)`}
                                            </span>
                                            {canManageFulfillment && !step.disputed && (
                                              <Button
                                                size="sm"
                                                variant="flat"
                                                color="warning"
                                                isLoading={stepBusy === key}
                                                onPress={() => submitForceRelease(gi.orderId, step)}
                                              >
                                                Release Dana
                                              </Button>
                                            )}
                                          </div>
                                        ))}

                                      {stepError[key] && completingKey !== key && (
                                        <p className="mt-2 text-xs text-danger">{stepError[key]}</p>
                                      )}

                                      {isCurrent &&
                                        canManageFulfillment &&
                                        (completingKey === key ? (
                                          <div className="mt-3 space-y-2 rounded-lg border border-default-200 bg-white p-3">
                                            {(step.formSchema ?? []).map((f) => (
                                              <FormInput
                                                key={f.key}
                                                label={f.label}
                                                required={f.required}
                                                value={completeFormData[f.key] ?? ''}
                                                onChange={(v) =>
                                                  setCompleteFormData((prev) => ({ ...prev, [f.key]: v }))
                                                }
                                              />
                                            ))}
                                            {stepError[key] && (
                                              <p className="text-xs text-danger">{stepError[key]}</p>
                                            )}
                                            <div className="flex gap-2">
                                              <Button
                                                size="sm"
                                                variant="light"
                                                onPress={() => setCompletingKey(null)}
                                              >
                                                Batal
                                              </Button>
                                              <Button
                                                size="sm"
                                                color="primary"
                                                isLoading={stepBusy === key}
                                                onPress={() => submitCompleteStep(gi.orderId, step)}
                                              >
                                                Tandai Selesai
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <Button
                                            size="sm"
                                            color="primary"
                                            variant="flat"
                                            className="mt-2"
                                            onPress={() => openCompleteForm(gi.orderId, step)}
                                          >
                                            Tandai Selesai
                                          </Button>
                                        ))}
                                    </li>
                                  );
                                })}
                              </ol>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          )}

          {shippingLines.length > 0 && (
            <Card className="border-0 shadow-md ring-1 ring-default-100">
              <CardHeader className="font-semibold">Alamat Pengiriman</CardHeader>
              <CardBody className="space-y-1.5 pt-0 text-sm">
                {transaction.recipient_name && <p><span className="text-default-500">Penerima:</span> {transaction.recipient_name}</p>}
                {transaction.phone && <p><span className="text-default-500">No. HP:</span> {transaction.phone}</p>}
                {(transaction.address || transaction.district || transaction.city) && (
                  <p>
                    <span className="text-default-500">Alamat:</span>{' '}
                    {[transaction.address, transaction.district, transaction.city].filter(Boolean).join(', ')}
                  </p>
                )}
                {transaction.postal_code && <p><span className="text-default-500">Kode Pos:</span> {transaction.postal_code}</p>}

                {shippingDetail ? (
                  <>
                    <Divider className="my-2" />
                    <p>
                      <span className="text-default-500">Kurir:</span>{' '}
                      <span className="font-medium">{formatCourierCode(shippingDetail.courier_code)}</span>
                      {(shippingDetail.courier_service_name || shippingDetail.resolved_service) &&
                        ` — ${shippingDetail.courier_service_name ?? shippingDetail.resolved_service}`}
                    </p>
                    <p>
                      <span className="text-default-500">Biaya Ongkir:</span>{' '}
                      <span className="font-medium">{formatCurrency(shippingCost, transaction.currency)}</span>
                    </p>
                    {shippingDetail.destination_area_name && (
                      <p><span className="text-default-500">Area Tujuan:</span> {shippingDetail.destination_area_name}</p>
                    )}
                  </>
                ) : (
                  transaction.courier && <p><span className="text-default-500">Kurir:</span> {transaction.courier}</p>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-0 shadow-md ring-1 ring-default-100">
            <CardHeader className="font-semibold">Ringkasan</CardHeader>
            <CardBody className="space-y-2 pt-0 text-sm">
              <div className="flex justify-between">
                <span className="text-default-500">Pembeli</span>
                <span className="font-medium">{transaction.buyer_identifier ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Mode</span>
                <span className="font-medium">{transaction.payment_mode === 'ESCROW' ? 'Escrow' : 'Checkout Bagdja'}</span>
              </div>
              <Divider className="my-2" />
              <div className="flex justify-between">
                <span className="text-default-500">Subtotal Produk</span>
                <span className="font-medium">{formatCurrency(itemsSubtotal, transaction.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Ongkir</span>
                <span className="font-medium">
                  {shippingDetail
                    ? formatCurrency(shippingCost, transaction.currency)
                    : 'Ditentukan penjual'}
                </span>
              </div>
              <Divider className="my-2" />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold">{formatCurrency(transaction.total_amount, transaction.currency)}</span>
              </div>
            </CardBody>
          </Card>

          {transaction.escrow && (
            <Card className="border-0 shadow-md ring-1 ring-default-100">
              <CardHeader className="font-semibold">Status Dana (Escrow)</CardHeader>
              <CardBody className="space-y-2 pt-0 text-sm">
                <div className="flex justify-between">
                  <span className="text-default-500">Ditahan</span>
                  <span className="font-medium">{formatCurrency(transaction.escrow.amount_held, transaction.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-default-500">Sudah Dicairkan</span>
                  <span className="font-medium">{formatCurrency(transaction.escrow.amount_released, transaction.currency)}</span>
                </div>
                {transaction.status === 'DISPUTED' && (
                  <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger">
                    Buyer mengajukan komplain untuk pesanan ini. Kalau komplain-nya valid, refund pembeli di bawah.
                    Untuk menolak komplain (cabut sengketa tanpa refund), hubungi tim Bagdja lewat bagdja-console —
                    itu keputusan platform, bukan tenant sepihak.
                  </p>
                )}
                {REFUNDABLE_STATUSES.has(transaction.status) && canRefund && (
                  <div className="mt-3 border-t border-default-100 pt-3">
                    <Button
                      color="danger"
                      variant="flat"
                      size="sm"
                      className="w-full font-medium"
                      isLoading={refunding}
                      onPress={handleRefund}
                    >
                      Refund Pembeli
                    </Button>
                    {refundError && (
                      <p className="mt-2 text-xs text-danger">{refundError}</p>
                    )}
                  </div>
                )}

                {transaction.status === 'HELD' && canManageFulfillment && (
                  <div className="mt-3 border-t border-default-100 pt-3">
                    <Button
                      color="warning"
                      variant="flat"
                      size="sm"
                      className="w-full font-medium"
                      isLoading={forceCompleting}
                      onPress={handleForceComplete}
                    >
                      Force-Complete (Buyer Tidak Konfirmasi)
                    </Button>
                    <p className="mt-2 text-xs text-default-500">
                      Cuma bisa dipakai kalau semua produk di transaksi ini sudah diatur masa garansi konfirmasi
                      penerimaan (atur di halaman Produk) dan masa garansinya sudah lewat.
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
      {dialog}
      {alertDialog}
    </div>
  );
}
