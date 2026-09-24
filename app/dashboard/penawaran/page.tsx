'use client';

import { Button, Card, CardBody, Chip, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { FormInput, FormSwitch } from '../../components/form-field';
import { FulfillmentFieldInput } from '../../components/fulfillment-field-input';
import { FulfillmentFieldValue } from '../../components/fulfillment-field-value';
import { LoadingSpinner } from '../../components/loading-spinner';
import { useAlertDialog } from '../../components/alert-dialog';
import { NoWebsiteState } from '../../components/no-website-state';
import { apiClient } from '../../lib/api-client';
import { formatCurrency } from '../../lib/currency';
import { hasMinRole, type OrderFulfillmentProgress, type OrderFulfillmentStepProgress } from '../../lib/types';
import { useWebsiteContext } from '../../context/website-context';

/**
 * Halaman "Penawaran" — inbox Praorder (survei/negosiasi/quotation sebelum
 * checkout), dipisah dari menu "Pesanan" karena secara struktur data ini
 * bukan filter status dari dataset transaksi yang sama (draft order, bukan
 * transaksi) — sebelumnya jadi tab "Praorder"/"Praorder Dibatalkan" yang
 * terpaksa dikecualikan dari tab "Semua" milik Pesanan, terasa ambigu.
 */

interface DraftOrder {
  id: string;
  buyer_identifier: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  quoted_total_amount: number | null;
  created_at: string;
  location?: { name?: string } | null;
  vendor?: { name?: string; status?: string } | null;
  product?: { name?: string; type?: string; quotable?: boolean; fulfillment_flow_id?: string | null } | null;
  /** fulfillment-praorder-plan.md §2.1 — ada kalau produknya punya step Praorder. */
  praorderProgress?: OrderFulfillmentProgress | null;
}

interface CancelledPreorder {
  id: string;
  buyer_identifier: string | null;
  quantity: number;
  total_amount: number;
  quoted_total_amount: number | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
  product?: { name?: string | null } | null;
}

function stepKey(orderId: string, stepName: string): string {
  return `${orderId}::${stepName}`;
}

interface TerminRowState {
  label: string;
  amount: string;
  anchor_step_name: string;
}

const DEFAULT_TERMIN_ROWS: TerminRowState[] = [
  { label: 'DP', amount: '', anchor_step_name: '' },
  { label: 'Pelunasan', amount: '', anchor_step_name: '' },
];

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

function maskInteger(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function unmaskInteger(value: string): string {
  return value.replace(/\D/g, '');
}

function MaskedIntegerInput({ value, onChange, ...props }: Omit<React.ComponentProps<typeof FormInput>, 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FormInput
      {...props}
      type="text"
      inputMode="numeric"
      value={maskInteger(value)}
      onChange={(nextValue) => onChange(unmaskInteger(nextValue))}
    />
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 .5 9m5-9-.5 9M5 6h14m-9-3h4l1 3H9l1-3Zm-3 3 .7 13h8.6L17 6" />
    </svg>
  );
}

function FillRemainingIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h10M4 12h6m-6 5h10m7-10v10m0 0-3-3m3 3 3-3" />
    </svg>
  );
}

/** Tab "Aktif" — inbox draft praorder (belum dibatalkan), termasuk widget "Harga Final"/"Atur Termin". */
function PraorderAktifTab() {
  const { alert, dialog: alertDialog } = useAlertDialog();
  const { websiteId, role } = useWebsiteContext();
  const canEdit = role ? hasMinRole(role, 'editor') : false;
  const [drafts, setDrafts] = useState<DraftOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelBusy, setCancelBusy] = useState<string | null>(null);
  const [cancelFormOpen, setCancelFormOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [quoteValues, setQuoteValues] = useState<Record<string, string>>({});
  const [quoteBusy, setQuoteBusy] = useState<string | null>(null);
  /** fulfillment-praorder-plan.md §2.3 — "Atur Termin" opsional di widget Harga Final. */
  const [terminEnabled, setTerminEnabled] = useState<Record<string, boolean>>({});
  const [terminRows, setTerminRows] = useState<Record<string, TerminRowState[]>>({});
  const [stepFormData, setStepFormData] = useState<Record<string, unknown>>({});
  const [openStepKey, setOpenStepKey] = useState<string | null>(null);
  const [stepBusy, setStepBusy] = useState<string | null>(null);
  const [stepSaveBusy, setStepSaveBusy] = useState<string | null>(null);
  const [stepError, setStepError] = useState<Record<string, string>>({});
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  const selectedDraft = drafts.find((draft) => draft.id === selectedDraftId) ?? null;

  const getTerminSummary = (draftId: string, draft: DraftOrder) => {
    const rows = terminRows[draftId] ?? DEFAULT_TERMIN_ROWS;
    const finalPrice = Number(quoteValues[draftId] ?? (draft.quoted_total_amount ?? (draft.unit_price > 0 ? draft.unit_price : 0)));
    const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const difference = finalPrice - total;
    const percentage = finalPrice > 0 ? Math.min(100, Math.max(0, (total / finalPrice) * 100)) : 0;

    return { rows, finalPrice, total, difference, percentage };
  };

  const load = useCallback(async () => {
    if (!websiteId) return;
    setLoading(true);
    try {
      setDrafts(await apiClient<DraftOrder[]>(`/api/websites/${websiteId}/orders/drafts`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat inbox praorder');
    } finally {
      setLoading(false);
    }
  }, [websiteId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (selectedDraftId && !drafts.some((draft) => draft.id === selectedDraftId)) {
      setSelectedDraftId(null);
    }
  }, [drafts, selectedDraftId]);

  const saveQuote = async (draft: DraftOrder) => {
    if (!websiteId) return;
    // quoteValues[draft.id] baru terisi setelah onChange pertama kali — kalau
    // admin belum menyentuh field (harga prefill sudah benar di layar), harus
    // tetap pakai nilai yang tertampil, bukan diam-diam gagal karena undefined.
    const effectiveValue = quoteValues[draft.id] ?? (draft.quoted_total_amount != null ? String(draft.quoted_total_amount) : (draft.unit_price > 0 ? String(draft.unit_price) : ''));
    const value = Number(effectiveValue);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Isi harga final yang valid (lebih dari nol) sebelum menyimpan.');
      return;
    }

    let termins: { label: string; amount: number; anchor_step_name?: string }[] | undefined;
    if (terminEnabled[draft.id]) {
      const rows = terminRows[draft.id] ?? DEFAULT_TERMIN_ROWS;
      if (rows.length < 2) {
        setError('Atur Termin butuh minimal 2 baris (Termin 1 + minimal 1 Termin lanjutan).');
        return;
      }
      const parsed = rows.map((r) => ({
        label: r.label.trim(),
        amount: Number(r.amount),
        anchor_step_name: r.anchor_step_name.trim() || undefined,
      }));
      if (parsed.some((r) => !r.label || !Number.isFinite(r.amount) || r.amount <= 0)) {
        setError('Isi label & jumlah setiap Termin dengan benar (semua wajib > 0).');
        return;
      }
      const sum = parsed.reduce((acc, r) => acc + r.amount, 0);
      if (Math.abs(sum - value) > 1) {
        setError(
          `Total Termin (Rp ${sum.toLocaleString('id-ID')}) harus persis sama dengan Harga Final (Rp ${value.toLocaleString('id-ID')}).`,
        );
        return;
      }
      termins = parsed;
    }

    setQuoteBusy(draft.id);
    setError('');
    try {
      await apiClient(`/api/websites/${websiteId}/orders/${draft.id}/quote`, {
        method: 'PATCH',
        body: JSON.stringify({ final_price: value, termins }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan quotation');
    } finally {
      setQuoteBusy(null);
    }
  };

  const cancelDraftOrder = async (draft: DraftOrder) => {
    if (!websiteId) return;
    setCancelBusy(draft.id);
    setError('');
    try {
      await apiClient(`/api/websites/${websiteId}/orders/${draft.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
      });
      setCancelFormOpen(false);
      setCancelReason('');
      setSelectedDraftId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membatalkan penawaran');
    } finally {
      setCancelBusy(null);
    }
  };

  const toggleTermin = (draftId: string, enabled: boolean) => {
    setTerminEnabled((prev) => ({ ...prev, [draftId]: enabled }));
    if (enabled && !terminRows[draftId]) {
      setTerminRows((prev) => ({ ...prev, [draftId]: DEFAULT_TERMIN_ROWS.map((r) => ({ ...r })) }));
    }
  };

  const updateTerminRow = (draftId: string, index: number, patch: Partial<TerminRowState>) => {
    setTerminRows((prev) => {
      const rows = prev[draftId] ?? DEFAULT_TERMIN_ROWS.map((r) => ({ ...r }));
      const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
      return { ...prev, [draftId]: next };
    });
  };

  const updateTerminPercentage = (draftId: string, index: number, value: string) => {
    const draft = drafts.find((item) => item.id === draftId);
    if (!draft) return;

    const finalPrice = Number(quoteValues[draftId] ?? (draft.quoted_total_amount ?? (draft.unit_price > 0 ? draft.unit_price : 0)));
    const percentage = Number(value);
    updateTerminRow(draftId, index, {
      amount: Number.isFinite(percentage) && finalPrice > 0
        ? String(Math.round((finalPrice * percentage) / 100))
        : '',
    });
  };

  const addTerminRow = (draftId: string) => {
    setTerminRows((prev) => {
      const rows = prev[draftId] ?? DEFAULT_TERMIN_ROWS.map((r) => ({ ...r }));
      return { ...prev, [draftId]: [...rows, { label: `Termin ${rows.length + 1}`, amount: '', anchor_step_name: '' }] };
    });
  };

  const removeTerminRow = (draftId: string, index: number) => {
    setTerminRows((prev) => {
      const rows = prev[draftId] ?? DEFAULT_TERMIN_ROWS.map((r) => ({ ...r }));
      return { ...prev, [draftId]: rows.filter((_, i) => i !== index) };
    });
  };

  const submitStep = async (draftId: string, step: OrderFulfillmentStepProgress) => {
    if (!websiteId) return;
    const key = stepKey(draftId, step.stepName);
    const fields = step.formSchema ?? [];
    for (const field of fields) {
      const value = stepFormData[field.key];
      if (field.required && (!value || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && value.length === 0))) {
        setStepError((prev) => ({ ...prev, [key]: `Field "${field.label}" wajib diisi` }));
        return;
      }
    }
    setStepBusy(key);
    setStepError((prev) => ({ ...prev, [key]: '' }));
    try {
      const payload: Record<string, unknown> = {};
      for (const field of fields) {
        const value = stepFormData[field.key];
        if (Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim()) {
          payload[field.key] = Array.isArray(value) ? value : String(value).trim();
        }
      }
      await apiClient(`/api/websites/${websiteId}/orders/${draftId}/steps/complete`, {
        method: 'POST',
        body: JSON.stringify({
          step_name: step.stepName,
          form_data: Object.keys(payload).length ? payload : undefined,
        }),
      });
      setOpenStepKey(null);
      await load();
    } catch (err) {
      setStepError((prev) => ({
        ...prev,
        [key]: err instanceof Error ? err.message : 'Gagal menyelesaikan step ini',
      }));
    } finally {
      setStepBusy(null);
    }
  };

  // Parent (`PenawaranPage`) sudah menjamin `websiteId` terisi sebelum render tab
  // ini, tapi TypeScript tidak bisa membawa narrowing lintas komponen — guard di
  // sini murni supaya `websiteId` ke bawah bertipe `string` (bukan `string | null`).
  if (!websiteId) return null;

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-danger">{error}</p>}
      {loading ? <LoadingSpinner className="h-48" /> : drafts.length === 0 ? (
        <Card className="border-0 shadow-md ring-1 ring-default-100"><CardBody className="py-16 text-center"><p className="text-lg font-semibold">Belum ada draft praorder</p><p className="mt-1 text-sm text-default-500">Draft akan muncul setelah buyer menekan Pesan, sebelum checkout.</p></CardBody></Card>
      ) : selectedDraft ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="light" onPress={() => setSelectedDraftId(null)}>
              ← Kembali ke daftar penawaran
            </Button>
            {canEdit && !cancelFormOpen && (
              <Button variant="flat" color="danger" onPress={() => setCancelFormOpen(true)}>
                Batalkan Penawaran
              </Button>
            )}
          </div>

          {canEdit && cancelFormOpen && (
            <div className="space-y-2 rounded-lg border border-danger-200 bg-danger-50/50 p-3">
              <FormInput
                label="Alasan pembatalan (opsional)"
                value={cancelReason}
                onChange={setCancelReason}
                placeholder="Mis. Buyer tidak merespons quotation"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="light"
                  onPress={() => {
                    setCancelFormOpen(false);
                    setCancelReason('');
                  }}
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  color="danger"
                  isLoading={cancelBusy === selectedDraft.id}
                  onPress={() => cancelDraftOrder(selectedDraft)}
                >
                  Ya, Batalkan Penawaran Ini
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-4">
          {[selectedDraft].map((draft) => (
            <Card key={draft.id} className="border-0 shadow-md ring-1 ring-default-100">
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div><h2 className="font-semibold">{draft.product?.name ?? 'Produk'}</h2><p className="mt-1 text-xs text-default-500">{formatDate(draft.created_at)}</p></div>
                  <Chip size="sm" color={draft.vendor ? 'success' : 'warning'} variant="flat">{draft.vendor ? 'Vendor ditugaskan' : 'Belum ditugaskan'}</Chip>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-xs text-default-400">Buyer</p><p className="truncate">{draft.buyer_identifier ?? '—'}</p></div>
                  <div><p className="text-xs text-default-400">Total</p><p className="font-semibold">{formatCurrency(draft.total_amount, 'IDR')}</p></div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Chip size="sm" variant="flat">Qty {draft.quantity}</Chip>
                  <Chip size="sm" variant="flat">Lokasi: {draft.location?.name ?? 'Belum dipilih'}</Chip>
                  {draft.vendor && <Chip size="sm" variant="flat">Vendor: {draft.vendor.name}</Chip>}
                </div>
                {draft.praorderProgress && (
                  <div className="rounded-lg border border-default-200 bg-white p-3">
                    <p className="mb-2 text-xs font-medium text-default-600">
                      Step Praorder — {draft.praorderProgress.flowName}
                    </p>
                    <ol className="flex flex-col gap-2">
                      {draft.praorderProgress.steps.map((step, index) => {
                        const priorCompleted = draft.praorderProgress!.steps
                          .slice(0, index)
                          .every((s) => s.completed);
                        const isCurrent = !step.completed && priorCompleted;
                        const key = stepKey(draft.id, step.stepName);
                        return (
                          <li key={step.stepName} className="rounded-lg border border-default-100 p-2 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">
                                {index + 1}. {step.stepName}
                              </span>
                              <span className="text-default-400">
                                {step.completed
                                  ? '✓ Selesai'
                                  : !priorCompleted
                                    ? 'Menunggu langkah sebelumnya'
                                    : step.filledBy === 'buyer'
                                      ? 'Menunggu buyer'
                                      : 'Giliran Anda'}
                              </span>
                            </div>
                            {isCurrent && step.stepName !== 'Quotation' && step.filledBy === 'admin' && canEdit && (
                              openStepKey === key ? (
                                <div className="mt-2 flex flex-col gap-2 rounded-lg bg-default-50 p-2">
                                  {(step.formSchema ?? []).map((f) => (
                                    <FulfillmentFieldInput
                                      field={f}
                                        websiteId={websiteId}
                                      key={f.key}
                                      value={stepFormData[f.key] ?? ''}
                                      onChange={(v) => setStepFormData((prev) => ({ ...prev, [f.key]: v }))}
                                    />
                                  ))}
                                  {stepError[key] && <p className="text-danger">{stepError[key]}</p>}
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="light" onPress={() => setOpenStepKey(null)}>Batal</Button>
                                    <Button
                                      size="sm"
                                      variant="flat"
                                      isLoading={stepSaveBusy === key}
                                      isDisabled={stepSaveBusy === key || stepBusy === key}
                                      onPress={async () => {
                                        setStepSaveBusy(key);
                                        try {
                                          await apiClient(`/api/websites/${websiteId}/orders/${draft.id}/steps/draft`, {
                                            method: 'POST',
                                            body: JSON.stringify({ step_name: step.stepName, form_data: stepFormData }),
                                          });
                                          await alert({ title: 'Tersimpan', message: `${step.stepName} berhasil disimpan.`, tone: 'default' });
                                        } finally {
                                          setStepSaveBusy(null);
                                        }
                                      }}
                                    >
                                      Simpan
                                    </Button>
                                    <Button
                                      size="sm"
                                      color="primary"
                                      isLoading={stepBusy === key}
                                      onPress={() => submitStep(draft.id, step)}
                                    >
                                      Kirim
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="flat"
                                  color="primary"
                                  className="mt-2"
                                  onPress={() => {
                                    setStepFormData(step.formData ?? {});
                                    setOpenStepKey(key);
                                  }}
                                >
                                  Lengkapi {step.stepName}
                                </Button>
                              )
                            )}
                            {step.completed && step.formData && Object.keys(step.formData).length > 0 && (
                              <div className="mt-2 space-y-2 rounded-lg bg-default-50 p-2">
                                {(step.formSchema ?? []).map((field) => {
                                  const value = step.formData?.[field.key];
                                  return value != null && value !== '' ? (
                                    <div key={field.key} className="space-y-1">
                                      <p className="text-default-400">{field.label}</p>
                                      <FulfillmentFieldValue field={field} value={value} />
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}

                <div className="rounded-lg border border-default-200 bg-white p-3">
                  <p className="mb-2 text-xs font-medium text-default-600">Harga final quotation</p>
                  <div className="flex items-end gap-2">
                    <MaskedIntegerInput
                      label="Harga"
                      disabled={!canEdit}
                      value={quoteValues[draft.id] ?? (draft.quoted_total_amount != null ? String(draft.quoted_total_amount) : (draft.unit_price > 0 ? String(draft.unit_price) : ''))}
                      onChange={(value) => setQuoteValues((prev) => ({ ...prev, [draft.id]: value }))}
                    />
                  </div>
                  <p className="mt-2 text-xs text-default-400">
                    {canEdit
                      ? 'Buyer baru dapat checkout setelah harga final lebih dari nol.'
                      : 'Perlu role editor ke atas untuk mengisi harga final.'}
                  </p>

                  {canEdit && (
                    <div className="mt-3 border-t border-default-100 pt-3">
                      <FormSwitch
                        label="Atur Termin"
                        checked={terminEnabled[draft.id] ?? false}
                        onChange={(checked) => toggleTermin(draft.id, checked)}
                      />
                      {terminEnabled[draft.id] && (
                        <div className="mt-3 space-y-3 rounded-xl border border-primary-100 bg-primary-50/30 p-3">
                          {(() => {
                            const summary = getTerminSummary(draft.id, draft);
                            const isBalanced = summary.finalPrice > 0 && Math.abs(summary.difference) <= 1;
                            const isOver = summary.difference < -1;
                            return (
                              <>
                                <div className="flex flex-wrap items-end justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-default-500">Alokasi pembayaran</p>
                                    <p className="mt-1 text-sm text-default-600">
                                      {formatCurrency(summary.total, 'IDR')} dari {formatCurrency(summary.finalPrice, 'IDR')}
                                    </p>
                                  </div>
                                  <Chip size="sm" color={isBalanced ? 'success' : isOver ? 'danger' : 'warning'} variant="flat">
                                    {isBalanced
                                      ? 'Total sesuai'
                                      : isOver
                                        ? `Kelebihan ${formatCurrency(Math.abs(summary.difference), 'IDR')}`
                                        : `Sisa ${formatCurrency(summary.difference, 'IDR')}`}
                                  </Chip>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-default-200">
                                  <div
                                    className={`h-full rounded-full transition-all ${isOver ? 'bg-danger' : isBalanced ? 'bg-success' : 'bg-primary'}`}
                                    style={{ width: `${summary.percentage}%` }}
                                  />
                                </div>
                                <div className="space-y-2">
                                  {summary.rows.map((row, index) => {
                                    const amount = Number(row.amount) || 0;
                                    const share = summary.finalPrice > 0 ? (amount / summary.finalPrice) * 100 : 0;
                                    const isLast = index === summary.rows.length - 1;
                                    const remaining = Math.max(0, summary.difference + amount);
                                    return (
                                      <div key={index} className="rounded-lg border border-default-200 bg-white p-3">
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                          <span className="text-xs font-semibold text-default-600">
                                            Termin {index + 1}{index === 0 ? ' · dibayar saat checkout' : ''}
                                          </span>
                                          <span className="text-xs font-medium text-primary">{share.toFixed(1)}%</span>
                                        </div>
                                        <div className="grid gap-2 md:grid-cols-[1fr_150px_150px_auto] md:items-end">
                                          <FormInput
                                            label="Label"
                                            value={row.label}
                                            onChange={(v) => updateTerminRow(draft.id, index, { label: v })}
                                          />
                                          <MaskedIntegerInput
                                            label="Persentase (%)"
                                            value={share ? String(Math.round(share)) : ''}
                                            onChange={(v) => updateTerminPercentage(draft.id, index, v)}
                                          />
                                          <MaskedIntegerInput
                                            label="Jumlah"
                                            value={row.amount}
                                            onChange={(v) => updateTerminRow(draft.id, index, { amount: v })}
                                          />
                                          <div className="flex gap-2">
                                            {isLast && summary.difference > 1 && (
                                              <Button
                                                size="sm"
                                                variant="flat"
                                                color="primary"
                                                isIconOnly
                                                aria-label="Isi sisa ke termin ini"
                                                title="Isi sisa"
                                                onPress={() => updateTerminRow(draft.id, index, { amount: String(remaining) })}
                                              >
                                                <FillRemainingIcon />
                                              </Button>
                                            )}
                                            {index > 1 && (
                                              <Button
                                                size="sm"
                                                variant="light"
                                                color="danger"
                                                isIconOnly
                                                aria-label={`Hapus Termin ${index + 1}`}
                                                title={`Hapus Termin ${index + 1}`}
                                                onPress={() => removeTerminRow(draft.id, index)}
                                              >
                                                <TrashIcon />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                        {index > 0 && (
                                          <div className="mt-2">
                                            <FormInput
                                              label="Muncul setelah step (opsional)"
                                              value={row.anchor_step_name}
                                              onChange={(v) => updateTerminRow(draft.id, index, { anchor_step_name: v })}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                <Button
                                  size="sm"
                                  variant="flat"
                                  isIconOnly
                                  aria-label="Tambah termin"
                                  title="Tambah termin"
                                  onPress={() => addTerminRow(draft.id)}
                                >
                                  <PlusIcon />
                                </Button>
                                <p className="text-xs text-default-400">
                                  Total termin harus sama persis dengan harga final. Termin 1 menjadi harga checkout;
                                  termin berikutnya diterbitkan manual dan muncul di timeline pascaorder.
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {canEdit && (
                    <Button
                      color="primary"
                      fullWidth
                      isLoading={quoteBusy === draft.id}
                      onPress={() => saveQuote(draft)}
                      className="mt-4 font-semibold"
                    >
                      Simpan Quotation
                    </Button>
                  )}
                </div>
                <p className="rounded-lg bg-default-50 px-3 py-2 text-xs text-default-500">Draft ini belum menjadi transaksi. Gunakan data ini sebagai awal proses survey dan quotation.</p>
              </CardBody>
            </Card>
          ))}
          </div>
        </>
      ) : (
        <Card className="border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-default-200 bg-default-50 text-xs uppercase text-default-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Waktu</th>
                    <th className="px-4 py-3 font-semibold">Buyer</th>
                    <th className="px-4 py-3 font-semibold">Produk</th>
                    <th className="px-4 py-3 font-semibold">Lokasi</th>
                    <th className="px-4 py-3 font-semibold">Vendor</th>
                    <th className="px-4 py-3 font-semibold">Harga</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default-100">
                  {drafts.map((draft) => (
                    <tr
                      key={draft.id}
                      tabIndex={0}
                      role="button"
                      onClick={() => setSelectedDraftId(draft.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') setSelectedDraftId(draft.id);
                      }}
                      className="cursor-pointer transition-colors hover:bg-primary-50 focus:bg-primary-50 focus:outline-none"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-default-500">{formatDate(draft.created_at)}</td>
                      <td className="max-w-[180px] truncate px-4 py-3 font-medium">{draft.buyer_identifier ?? '—'}</td>
                      <td className="max-w-[220px] truncate px-4 py-3">{draft.product?.name ?? 'Produk'}</td>
                      <td className="px-4 py-3">{draft.location?.name ?? 'Belum dipilih'}</td>
                      <td className="px-4 py-3">{draft.vendor?.name ?? 'Belum ditugaskan'}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatCurrency(draft.total_amount, 'IDR')}</td>
                      <td className="px-4 py-3">
                        <Chip size="sm" color={draft.quoted_total_amount != null || (!draft.product?.quotable && draft.unit_price > 0) ? 'success' : 'warning'} variant="flat">
                          {draft.quoted_total_amount != null || (!draft.product?.quotable && draft.unit_price > 0) ? 'Siap checkout' : 'Menunggu quotation'}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
      {alertDialog}
    </div>
  );
}

/** Tab "Dibatalkan" — praorder quotable yang sudah di-quote lalu dibatalkan sebelum checkout. */
function PraorderDibatalkanTab() {
  const { websiteId } = useWebsiteContext();
  const [cancelledPreorders, setCancelledPreorders] = useState<CancelledPreorder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!websiteId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    apiClient<CancelledPreorder[]>(`/api/websites/${websiteId}/orders/preorders/cancelled`)
      .then((data) => {
        if (!cancelled) setCancelledPreorders(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Gagal memuat praorder yang dibatalkan');
          setCancelledPreorders([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [websiteId]);

  if (loading) return <LoadingSpinner className="h-48" />;
  if (error) {
    return (
      <Card className="border-0 shadow-md ring-1 ring-default-100">
        <CardBody className="py-10 text-center text-sm text-danger">{error}</CardBody>
      </Card>
    );
  }
  if (cancelledPreorders.length === 0) {
    return (
      <Card className="overflow-hidden border-0 shadow-md ring-1 ring-default-100">
        <CardBody className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-default-100 text-3xl">🧾</div>
          <p className="text-lg font-semibold">Belum ada praorder dibatalkan</p>
          <p className="max-w-sm text-sm text-default-500">Praorder yang sudah mendapat quotation lalu dibatalkan akan muncul di sini.</p>
        </CardBody>
      </Card>
    );
  }
  return (
    <Card className="border-0 shadow-md ring-1 ring-default-100">
      <CardBody className="p-0">
        <Table aria-label="Praorder dibatalkan" removeWrapper>
          <TableHeader>
            <TableColumn>WAKTU</TableColumn>
            <TableColumn>PEMBELI</TableColumn>
            <TableColumn>PRODUK</TableColumn>
            <TableColumn>HARGA QUOTATION</TableColumn>
            <TableColumn>ALASAN</TableColumn>
            <TableColumn> </TableColumn>
          </TableHeader>
          <TableBody>
            {cancelledPreorders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{formatDate(order.created_at)}</TableCell>
                <TableCell>{order.buyer_identifier ?? '—'}</TableCell>
                <TableCell>{order.product?.name ?? '—'} · {order.quantity} item</TableCell>
                <TableCell className="font-semibold">
                  {formatCurrency(order.quoted_total_amount ?? order.total_amount, 'IDR')}
                </TableCell>
                <TableCell className="max-w-xs truncate text-default-500">
                  {typeof order.metadata?.cancellation_reason === 'string' ? order.metadata.cancellation_reason : '—'}
                </TableCell>
                <TableCell>
                  <Button as={Link} href={`/dashboard/orders/${order.id}`} size="sm" variant="flat" color="primary">
                    Detail
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
}

type TabKey = 'aktif' | 'dibatalkan';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'aktif', label: 'Aktif' },
  { key: 'dibatalkan', label: 'Dibatalkan' },
];

export default function PenawaranPage() {
  const { websiteId, loading: ctxLoading } = useWebsiteContext();
  const [tab, setTab] = useState<TabKey>('aktif');

  if (ctxLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Penawaran</h1>
        <p className="mt-1 text-default-500">Inbox permintaan penawaran sebelum checkout — survey, quotation, dan penugasan vendor.</p>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                active
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25'
                  : 'bg-white text-default-600 ring-1 ring-default-200 hover:bg-default-50'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'aktif' ? <PraorderAktifTab /> : <PraorderDibatalkanTab />}
    </div>
  );
}
