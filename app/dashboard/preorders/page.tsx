'use client';

import { Button, Card, CardBody, Chip } from '@heroui/react';
import { useCallback, useEffect, useState } from 'react';

import { FormInput, FormSwitch } from '../../components/form-field';
import { LoadingSpinner } from '../../components/loading-spinner';
import { NoWebsiteState } from '../../components/no-website-state';
import { apiClient } from '../../lib/api-client';
import { formatCurrency } from '../../lib/currency';
import { hasMinRole, type OrderFulfillmentProgress, type OrderFulfillmentStepProgress } from '../../lib/types';
import { useWebsiteContext } from '../../context/website-context';

interface DraftOrder {
  id: string;
  buyer_identifier: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  created_at: string;
  location?: { name?: string } | null;
  vendor?: { name?: string; status?: string } | null;
  product?: { name?: string; type?: string; fulfillment_flow_id?: string | null } | null;
  /** fulfillment-praorder-plan.md §2.1 — ada kalau produknya punya step Praorder. */
  praorderProgress?: OrderFulfillmentProgress | null;
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

export default function PreordersPage() {
  const { websiteId, role, loading: contextLoading } = useWebsiteContext();
  const canEdit = role ? hasMinRole(role, 'editor') : false;
  const [drafts, setDrafts] = useState<DraftOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quoteValues, setQuoteValues] = useState<Record<string, string>>({});
  const [quoteBusy, setQuoteBusy] = useState<string | null>(null);
  /** fulfillment-praorder-plan.md §2.3 — "Atur Termin" opsional di widget Harga Final. */
  const [terminEnabled, setTerminEnabled] = useState<Record<string, boolean>>({});
  const [terminRows, setTerminRows] = useState<Record<string, TerminRowState[]>>({});
  const [stepFormData, setStepFormData] = useState<Record<string, string>>({});
  const [openStepKey, setOpenStepKey] = useState<string | null>(null);
  const [stepBusy, setStepBusy] = useState<string | null>(null);
  const [stepError, setStepError] = useState<Record<string, string>>({});

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

  const saveQuote = async (draft: DraftOrder) => {
    if (!websiteId) return;
    // quoteValues[draft.id] baru terisi setelah onChange pertama kali — kalau
    // admin belum menyentuh field (harga prefill sudah benar di layar), harus
    // tetap pakai nilai yang tertampil, bukan diam-diam gagal karena undefined.
    const effectiveValue = quoteValues[draft.id] ?? (draft.unit_price > 0 ? String(draft.unit_price) : '');
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
      if (field.required && !stepFormData[field.key]?.trim()) {
        setStepError((prev) => ({ ...prev, [key]: `Field "${field.label}" wajib diisi` }));
        return;
      }
    }
    setStepBusy(key);
    setStepError((prev) => ({ ...prev, [key]: '' }));
    try {
      const payload: Record<string, string> = {};
      for (const field of fields) {
        if (stepFormData[field.key]?.trim()) payload[field.key] = stepFormData[field.key].trim();
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

  if (contextLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Praorder</h1>
        <p className="mt-1 text-default-500">Inbox draft order sebelum checkout untuk survey, quotation, dan penugasan vendor.</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {loading ? <LoadingSpinner className="h-48" /> : drafts.length === 0 ? (
        <Card className="border-0 shadow-md ring-1 ring-default-100"><CardBody className="py-16 text-center"><p className="text-lg font-semibold">Belum ada draft praorder</p><p className="mt-1 text-sm text-default-500">Draft akan muncul setelah buyer menekan Pesan, sebelum checkout.</p></CardBody></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {drafts.map((draft) => (
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
                            {isCurrent && step.filledBy === 'admin' && canEdit && (
                              openStepKey === key ? (
                                <div className="mt-2 flex flex-col gap-2 rounded-lg bg-default-50 p-2">
                                  {(step.formSchema ?? []).map((f) => (
                                    <FormInput
                                      key={f.key}
                                      label={f.label}
                                      required={f.required}
                                      value={stepFormData[f.key] ?? ''}
                                      onChange={(v) => setStepFormData((prev) => ({ ...prev, [f.key]: v }))}
                                    />
                                  ))}
                                  {stepError[key] && <p className="text-danger">{stepError[key]}</p>}
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="light" onPress={() => setOpenStepKey(null)}>Batal</Button>
                                    <Button
                                      size="sm"
                                      color="primary"
                                      isLoading={stepBusy === key}
                                      onPress={() => submitStep(draft.id, step)}
                                    >
                                      Tandai Selesai
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="flat"
                                  color="primary"
                                  className="mt-2"
                                  onPress={() => setOpenStepKey(key)}
                                >
                                  Lengkapi {step.stepName}
                                </Button>
                              )
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
                    <FormInput
                      label="Harga"
                      type="number"
                      disabled={!canEdit}
                      value={quoteValues[draft.id] ?? (draft.unit_price > 0 ? String(draft.unit_price) : '')}
                      onChange={(value) => setQuoteValues((prev) => ({ ...prev, [draft.id]: value }))}
                    />
                    {canEdit && (
                      <Button color="primary" size="sm" isLoading={quoteBusy === draft.id} onPress={() => saveQuote(draft)}>
                        Simpan
                      </Button>
                    )}
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
                        <div className="mt-3 flex flex-col gap-2">
                          {(terminRows[draft.id] ?? DEFAULT_TERMIN_ROWS).map((row, index) => (
                            <div key={index} className="flex items-end gap-2 rounded-lg bg-default-50 p-2">
                              <FormInput
                                label={index === 0 ? 'Termin 1' : `Termin ${index + 1}`}
                                value={row.label}
                                onChange={(v) => updateTerminRow(draft.id, index, { label: v })}
                              />
                              <FormInput
                                label="Jumlah"
                                type="number"
                                value={row.amount}
                                onChange={(v) => updateTerminRow(draft.id, index, { amount: v })}
                              />
                              {index > 0 && (
                                <FormInput
                                  label="Muncul setelah step (opsional)"
                                  value={row.anchor_step_name}
                                  onChange={(v) => updateTerminRow(draft.id, index, { anchor_step_name: v })}
                                />
                              )}
                              {index > 1 && (
                                <Button size="sm" variant="light" color="danger" onPress={() => removeTerminRow(draft.id, index)}>
                                  Hapus
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button size="sm" variant="flat" onPress={() => addTerminRow(draft.id)}>
                            + Tambah Termin
                          </Button>
                          <p className="text-xs text-default-400">
                            Total tiap Termin harus persis sama dengan Harga Final di atas. Termin 1 langsung jadi harga
                            checkout; Termin 2 dst. muncul di timeline Pascaorder setelah Anda &quot;Terbitkan&quot;.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="rounded-lg bg-default-50 px-3 py-2 text-xs text-default-500">Draft ini belum menjadi transaksi. Gunakan data ini sebagai awal proses survey dan quotation.</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}