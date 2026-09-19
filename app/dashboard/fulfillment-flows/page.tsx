'use client';

import { Button, Card, CardBody, Chip } from '@heroui/react';
import { useCallback, useEffect, useState } from 'react';

import { desktopAddButtonClass, MobileFloatingActionBar, mobileFabPagePadding } from '../../components/mobile-floating-action';
import { AppModal } from '../../components/app-modal';
import { useConfirmDialog } from '../../components/confirm-dialog';
import { FormInput, FormSwitch, FormTextarea, type FormSelectOption } from '../../components/form-field';
import { LoadingSpinner } from '../../components/loading-spinner';
import { NoWebsiteState } from '../../components/no-website-state';
import { apiClient } from '../../lib/api-client';
import { hasMinRole, type FulfillmentFlow, type FulfillmentStepFormField } from '../../lib/types';
import { useWebsiteContext } from '../../context/website-context';

const FIELD_TYPE_OPTIONS: FormSelectOption[] = [
  { value: 'text', label: 'Teks' },
  { value: 'number', label: 'Angka' },
  { value: 'textarea', label: 'Teks panjang' },
  { value: 'select', label: 'Pilihan (dropdown)' },
];

// fulfillment-praorder-plan.md §2.1 — "diisi oleh" sekarang di level STEP
// (bukan per-field lagi). Field.filled_by di form_schema sudah tidak
// dipakai sebagai sumber kebenaran, sengaja tidak ditampilkan lagi di sini.
const STEP_FILLED_BY_OPTIONS: FormSelectOption[] = [
  { value: 'admin', label: 'Admin/Seller' },
  { value: 'buyer', label: 'Buyer' },
];

type FlowPhase = 'PRAORDER' | 'PASCAORDER';

interface StepFieldState {
  key: string;
  label: string;
  type: FulfillmentStepFormField['type'];
  required: boolean;
  optionsText: string;
}

interface StepState {
  status_name: string;
  description: string;
  process_day: string;
  release_percentage: string;
  guaranty_days: string;
  filled_by: 'admin' | 'buyer';
  fields: StepFieldState[];
}

function emptyField(): StepFieldState {
  return { key: '', label: '', type: 'text', required: false, optionsText: '' };
}

function emptyStep(): StepState {
  return {
    status_name: '',
    description: '',
    process_day: '',
    release_percentage: '',
    // Standar masa garansi per step = 1 hari (dipakai kalau seller mengisi
    // release_percentage — kalau tidak, field ini tidak relevan).
    guaranty_days: '1',
    filled_by: 'admin',
    fields: [],
  };
}

/**
 * Pecah step Flow jadi 2 kelompok terpisah sesuai `phase` (fulfillment-
 * praorder-plan.md §2.1) — Praorder jalan sebelum checkout (di atas order
 * PENDING), Pascaorder setelah dibayar (existing). Urutan Praorder SELALU
 * mendahului Pascaorder saat disimpan lagi (lihat handleSave), jadi tidak
 * perlu simpan `sequence` mentah di sini — cukup urutan dalam tiap kelompok.
 */
function loadStepsFromFlow(flow: FulfillmentFlow): { praorder: StepState[]; pascaorder: StepState[] } {
  const sorted = [...flow.steps].sort((a, b) => a.sequence - b.sequence);
  const toState = (step: (typeof sorted)[number]): StepState => ({
    status_name: step.status_name,
    description: step.description ?? '',
    process_day: step.process_day != null ? String(step.process_day) : '',
    release_percentage: step.release_percentage != null ? String(step.release_percentage) : '',
    guaranty_days: step.guaranty_days != null ? String(step.guaranty_days) : '',
    filled_by: step.filled_by ?? 'admin',
    fields: (step.form_schema ?? []).map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required ?? false,
      optionsText: (f.options ?? []).join(', '),
    })),
  });
  return {
    praorder: sorted.filter((s) => s.phase === 'PRAORDER').map(toState),
    pascaorder: sorted.filter((s) => (s.phase ?? 'PASCAORDER') === 'PASCAORDER').map(toState),
  };
}

function totalReleasePercentage(steps: StepState[]): number {
  return steps.reduce((sum, s) => sum + (parseFloat(s.release_percentage) || 0), 0);
}

export default function FulfillmentFlowsManagement() {
  const { websiteId, role, loading: ctxLoading } = useWebsiteContext();
  const { confirm, dialog } = useConfirmDialog();
  const [flows, setFlows] = useState<FulfillmentFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editFlow, setEditFlow] = useState<FulfillmentFlow | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  // fulfillment-praorder-plan.md §2.1 — 2 section terpisah sesuai arahan:
  // Praorder kosong secara default (flow lama tanpa Praorder tetap sama
  // persis seperti sebelumnya), Pascaorder tetap default 1 step kosong
  // (perilaku existing untuk flow baru).
  const [praorderSteps, setPraorderSteps] = useState<StepState[]>([]);
  const [pascaorderSteps, setPascaorderSteps] = useState<StepState[]>([emptyStep()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const stepsFor = (phase: FlowPhase): StepState[] => (phase === 'PRAORDER' ? praorderSteps : pascaorderSteps);
  const setStepsFor = (phase: FlowPhase) => (phase === 'PRAORDER' ? setPraorderSteps : setPascaorderSteps);

  const canEdit = role ? hasMinRole(role, 'editor') : false;
  const canDelete = role ? hasMinRole(role, 'admin') : false;

  const load = useCallback(async () => {
    if (!websiteId) return;
    setLoading(true);
    try {
      const data = await apiClient<FulfillmentFlow[]>(`/api/websites/${websiteId}/fulfillment-flows`);
      setFlows(data);
    } catch {
      setFlows([]);
    } finally {
      setLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditFlow(null);
    setName('');
    setDescription('');
    setIsActive(true);
    setPraorderSteps([]);
    setPascaorderSteps([emptyStep()]);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (flow: FulfillmentFlow) => {
    setEditFlow(flow);
    setName(flow.name);
    setDescription(flow.description ?? '');
    setIsActive(flow.is_active);
    const loaded = loadStepsFromFlow(flow);
    setPraorderSteps(loaded.praorder);
    setPascaorderSteps(loaded.pascaorder.length ? loaded.pascaorder : [emptyStep()]);
    setError('');
    setModalOpen(true);
  };

  const updateStep = (phase: FlowPhase, index: number, patch: Partial<StepState>) => {
    setStepsFor(phase)((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const removeStep = (phase: FlowPhase, index: number) => {
    setStepsFor(phase)((prev) => prev.filter((_, i) => i !== index));
  };

  const moveStep = (phase: FlowPhase, index: number, direction: -1 | 1) => {
    setStepsFor(phase)((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const updateField = (phase: FlowPhase, stepIndex: number, fieldIndex: number, patch: Partial<StepFieldState>) => {
    setStepsFor(phase)((prev) =>
      prev.map((s, i) =>
        i === stepIndex
          ? { ...s, fields: s.fields.map((f, fi) => (fi === fieldIndex ? { ...f, ...patch } : f)) }
          : s,
      ),
    );
  };

  const removeField = (phase: FlowPhase, stepIndex: number, fieldIndex: number) => {
    setStepsFor(phase)((prev) =>
      prev.map((s, i) => (i === stepIndex ? { ...s, fields: s.fields.filter((_, fi) => fi !== fieldIndex) } : s)),
    );
  };

  const allSteps = [...praorderSteps, ...pascaorderSteps];
  const releasePercentageTotal = totalReleasePercentage(allSteps);

  const handleSave = async () => {
    if (!websiteId || !name.trim()) {
      setError('Nama flow wajib diisi');
      return;
    }
    if (allSteps.length === 0) {
      setError('Minimal 1 step');
      return;
    }
    if (allSteps.some((s) => !s.status_name.trim())) {
      setError('Nama status tiap step wajib diisi');
      return;
    }
    if (releasePercentageTotal > 100) {
      setError(`Total persentase pelepasan dana (${releasePercentageTotal}%) tidak boleh lebih dari 100%`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      // Praorder SELALU didahulukan dari Pascaorder saat disimpan — checkout
      // jadi gerbang di antara keduanya (fulfillment-praorder-plan.md §2.1),
      // jadi sequence dibangun dari urutan gabungan ini, bukan per-section.
      const orderedSteps: { phase: FlowPhase; step: StepState }[] = [
        ...praorderSteps.map((step) => ({ phase: 'PRAORDER' as FlowPhase, step })),
        ...pascaorderSteps.map((step) => ({ phase: 'PASCAORDER' as FlowPhase, step })),
      ];
      const body = {
        name: name.trim(),
        description: description.trim() || undefined,
        is_active: isActive,
        steps: orderedSteps.map(({ phase, step: s }, index) => ({
          sequence: index + 1,
          phase,
          filled_by: s.filled_by,
          status_name: s.status_name.trim(),
          description: s.description.trim() || undefined,
          process_day: s.process_day ? parseInt(s.process_day, 10) : undefined,
          release_percentage: s.release_percentage ? parseFloat(s.release_percentage) : undefined,
          guaranty_days: s.guaranty_days ? parseInt(s.guaranty_days, 10) : undefined,
          form_schema: s.fields.length
            ? s.fields
                .filter((f) => f.key.trim() && f.label.trim())
                .map((f) => ({
                  key: f.key.trim(),
                  label: f.label.trim(),
                  type: f.type,
                  required: f.required || undefined,
                  options:
                    f.type === 'select'
                      ? f.optionsText
                          .split(',')
                          .map((o) => o.trim())
                          .filter(Boolean)
                      : undefined,
                }))
            : undefined,
        })),
      };
      if (editFlow) {
        await apiClient(`/api/websites/${websiteId}/fulfillment-flows/${editFlow.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await apiClient(`/api/websites/${websiteId}/fulfillment-flows`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (flowId: string) => {
    if (!websiteId) return;
    const ok = await confirm({
      title: 'Hapus Flow Ini?',
      message: 'Produk yang memakai flow ini akan jadi tanpa tracking pengiriman. Tindakan tidak bisa dibatalkan.',
    });
    if (!ok) return;
    try {
      await apiClient(`/api/websites/${websiteId}/fulfillment-flows/${flowId}`, { method: 'DELETE' });
      await load();
    } catch {
      alert('Gagal menghapus');
    }
  };

  /**
   * 1 section step (Praorder atau Pascaorder) — sesuai arahan eksplisit
   * untuk UI Master Flow dipecah 2 bagian terpisah (fulfillment-praorder-
   * plan.md §2.1). Reusable lewat closure `phase`, supaya JSX-nya tidak
   * perlu diduplikasi mentah-mentah.
   */
  function renderStepSection(phase: FlowPhase, title: string, hint: string) {
    const sectionSteps = stepsFor(phase);
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-default-200 p-4">
        <div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <p className="mt-0.5 text-xs text-default-500">{hint}</p>
        </div>

        <div className="flex flex-col gap-4">
          {sectionSteps.map((step, index) => (
            <div key={index} className="rounded-xl border border-default-200 bg-default-50/50 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {title} — Step {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveStep(phase, index, -1)}
                    className="rounded-lg p-1.5 text-default-500 hover:bg-default-100 disabled:opacity-30"
                    aria-label="Pindah ke atas"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === sectionSteps.length - 1}
                    onClick={() => moveStep(phase, index, 1)}
                    className="rounded-lg p-1.5 text-default-500 hover:bg-default-100 disabled:opacity-30"
                    aria-label="Pindah ke bawah"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStep(phase, index)}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-danger hover:bg-danger-50"
                  >
                    Hapus step
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormInput
                  label="Nama status"
                  value={step.status_name}
                  onChange={(v) => updateStep(phase, index, { status_name: v })}
                  placeholder="Mis. SHIPPED"
                  required
                />
                <FormInput
                  label="Estimasi hari"
                  type="number"
                  min={1}
                  value={step.process_day}
                  onChange={(v) => updateStep(phase, index, { process_day: v })}
                  placeholder="Opsional"
                />
              </div>
              <div className="mt-3">
                <FormTextarea
                  label="Deskripsi step"
                  value={step.description}
                  onChange={(v) => updateStep(phase, index, { description: v })}
                  rows={2}
                  placeholder="Opsional"
                />
              </div>

              <div className="mt-3">
                <span className="mb-1.5 block text-xs font-medium text-default-600">Diisi oleh</span>
                <select
                  value={step.filled_by}
                  onChange={(e) =>
                    updateStep(phase, index, { filled_by: e.target.value as StepState['filled_by'] })
                  }
                  className="w-full max-w-xs rounded-lg border border-default-300 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                >
                  {STEP_FILLED_BY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-default-400">
                  Step Buyer diselesaikan lewat endpoint buyer sendiri — admin cuma lihat read-only.
                </p>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <FormInput
                  label="% pelepasan dana"
                  type="number"
                  min={0}
                  max={100}
                  value={step.release_percentage}
                  onChange={(v) => updateStep(phase, index, { release_percentage: v })}
                  description="Opsional — % dari total amount grup yang dirilis saat step ini selesai (§3.0.1)"
                  placeholder="Kosongkan kalau tidak ada"
                />
                <FormInput
                  label="Masa garansi (hari)"
                  type="number"
                  min={1}
                  value={step.guaranty_days}
                  onChange={(v) => updateStep(phase, index, { guaranty_days: v })}
                  description="Batas hari buyer approve sebelum seller boleh force-release"
                  placeholder="Kosongkan kalau tidak ada"
                  disabled={!step.release_percentage}
                />
              </div>

              <div className="mt-4 rounded-lg border border-dashed border-default-300 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-default-500">
                    Kolom Form yang Harus Diisi Saat Step Ini Selesai
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {step.fields.map((field, fieldIndex) => (
                    <div key={fieldIndex} className="rounded-lg border border-default-200 bg-white p-2">
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-medium uppercase tracking-wide text-default-500">Key</span>
                          <input
                            type="text"
                            placeholder="no_resi"
                            value={field.key}
                            onChange={(e) => updateField(phase, index, fieldIndex, { key: e.target.value })}
                            className="w-full rounded-lg border border-default-300 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-medium uppercase tracking-wide text-default-500">Label</span>
                          <input
                            type="text"
                            placeholder="No Resi"
                            value={field.label}
                            onChange={(e) => updateField(phase, index, fieldIndex, { label: e.target.value })}
                            className="w-full rounded-lg border border-default-300 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-medium uppercase tracking-wide text-default-500">Tipe</span>
                          <select
                            value={field.type}
                            onChange={(e) =>
                              updateField(phase, index, fieldIndex, {
                                type: e.target.value as FulfillmentStepFormField['type'],
                              })
                            }
                            className="w-full rounded-lg border border-default-300 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                          >
                            {FIELD_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {field.type === 'select' && (
                        <div className="mt-2 flex flex-col gap-1">
                          <span className="text-[10px] font-medium uppercase tracking-wide text-default-500">Pilihan</span>
                          <input
                            type="text"
                            placeholder="Opsional, pisah koma"
                            value={field.optionsText}
                            onChange={(e) => updateField(phase, index, fieldIndex, { optionsText: e.target.value })}
                            className="w-full rounded-lg border border-default-300 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                          />
                        </div>
                      )}

                      <div className="mt-2 flex items-center justify-end gap-3">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-default-500">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateField(phase, index, fieldIndex, { required: e.target.checked })}
                          />
                          Wajib
                        </label>
                        <button
                          type="button"
                          onClick={() => removeField(phase, index, fieldIndex)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-danger hover:bg-danger-50"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => updateStep(phase, index, { fields: [...step.fields, emptyField()] })}
                    className="self-start rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-50"
                  >
                    + Tambah field
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setStepsFor(phase)((prev) => [...prev, emptyStep()])}
            className="self-start rounded-lg border border-dashed border-default-300 px-4 py-2 text-sm font-medium text-primary hover:bg-primary-50"
          >
            + Tambah step {title}
          </button>
        </div>
      </div>
    );
  }

  if (ctxLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;

  return (
    <div className={`space-y-6 ${canEdit ? mobileFabPagePadding : ''}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Master Flow</h1>
          <p className="mt-1 text-default-500">
            SOP pengiriman/fulfillment kustom yang bisa dipasang ke produk — tiap step dilewati berurutan oleh
            penjual, dan bisa mencairkan dana sebagian saat step selesai.
          </p>
        </div>
        {canEdit && (
          <Button color="primary" onPress={openCreate} className={desktopAddButtonClass}>
            Tambah
          </Button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner className="h-48" />
      ) : flows.length === 0 ? (
        <Card className="overflow-hidden border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 text-3xl ring-4 ring-cyan-50">
              🚚
            </div>
            <div>
              <p className="text-lg font-semibold">Belum ada flow</p>
              <p className="mt-1 max-w-sm text-sm text-default-500">
                Buat flow untuk produk yang butuh proses pengiriman/pemenuhan bertahap, mis. Dikemas → Dikirim →
                Sampai.
              </p>
            </div>
            {canEdit && (
              <Button color="primary" onPress={openCreate} className="hidden font-semibold sm:inline-flex">
                + Flow Baru
              </Button>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {flows.map((flow) => {
            const sortedSteps = [...flow.steps].sort((a, b) => a.sequence - b.sequence);
            const pct = flow.steps.reduce((sum, s) => sum + (s.release_percentage ?? 0), 0);
            return (
              <Card key={flow.id} className="overflow-hidden border-0 shadow-md ring-1 ring-default-100">
                <CardBody className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-foreground">{flow.name}</h3>
                      {flow.description && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-default-500">{flow.description}</p>
                      )}
                    </div>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={flow.is_active ? 'success' : 'default'}
                      className="shrink-0 font-medium"
                    >
                      {flow.is_active ? 'Aktif' : 'Nonaktif'}
                    </Chip>
                  </div>

                  <ol className="space-y-1.5 border-l-2 border-default-100 pl-3">
                    {sortedSteps.map((step) => (
                      <li key={step.id ?? step.sequence} className="text-sm">
                        {step.phase === 'PRAORDER' && (
                          <span className="mr-1.5 rounded bg-warning-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-warning-700">
                            Praorder
                          </span>
                        )}
                        <span className="font-medium text-foreground">
                          {step.sequence}. {step.status_name}
                        </span>
                        <span className="ml-1.5 text-xs text-default-400">
                          {step.filled_by === 'buyer' ? '· diisi buyer' : null}
                          {step.process_day ? ` · ± ${step.process_day} hari` : null}
                          {step.release_percentage ? ` · rilis ${step.release_percentage}%` : null}
                        </span>
                      </li>
                    ))}
                  </ol>

                  <div className="flex flex-wrap items-center gap-1.5 border-t border-default-100 pt-2">
                    <Chip size="sm" variant="flat" className="bg-default-100 text-default-600">
                      {flow.steps.length} step
                    </Chip>
                    {pct > 0 && (
                      <Chip size="sm" variant="flat" className="bg-default-100 text-default-600">
                        Total rilis bertahap: {pct}%
                      </Chip>
                    )}
                  </div>

                  {(canEdit || canDelete) && (
                    <div className="flex gap-2 border-t border-default-100 pt-3">
                      {canEdit && (
                        <Button size="sm" color="primary" variant="flat" className="flex-1 font-medium" onPress={() => openEdit(flow)}>
                          Edit
                        </Button>
                      )}
                      {canDelete && (
                        <Button size="sm" color="danger" variant="light" className="flex-1" onPress={() => handleDelete(flow.id)}>
                          Hapus
                        </Button>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <AppModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editFlow ? 'Edit Flow' : 'Flow Baru'}
        size="xl"
        footer={
          <>
            <Button variant="light" onPress={() => setModalOpen(false)}>Batal</Button>
            <Button color="primary" isLoading={saving} onPress={handleSave}>Simpan</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <FormInput label="Nama Flow" value={name} onChange={setName} placeholder="Mis. Pengiriman Standar" required />
          <FormTextarea
            label="Deskripsi"
            value={description}
            onChange={setDescription}
            placeholder="Opsional — jelaskan kapan flow ini dipakai"
          />
          <FormSwitch label="Aktif" description="Flow nonaktif tidak bisa dipilih untuk produk baru." checked={isActive} onChange={setIsActive} />

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Steps</span>
            <span
              className={`text-xs font-medium ${releasePercentageTotal > 100 ? 'text-danger' : 'text-default-500'}`}
            >
              Total rilis bertahap: {releasePercentageTotal}% {releasePercentageTotal > 100 ? '(melebihi 100%)' : ''}
            </span>
          </div>

          {renderStepSection(
            'PRAORDER',
            'Step Praorder',
            'Jalan SEBELUM checkout, di atas order yang belum dibayar — mis. survey, upload dokumen, negosiasi harga. Kosongkan kalau produk ini tidak butuh quotation.',
          )}
          {renderStepSection(
            'PASCAORDER',
            'Step Pascaorder',
            'Jalan SETELAH order dibayar (existing) — mis. Dikemas → Dikirim → Sampai. Minimal 1 step.',
          )}

          {error && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
        </div>
      </AppModal>

      {canEdit && <MobileFloatingActionBar label="Flow Baru" onClick={openCreate} />}
      {dialog}
    </div>
  );
}
