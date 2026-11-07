'use client';

import { Input, Select, SelectItem, Switch, Textarea } from '@heroui/react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import type {
  FulfillmentFlow,
  FulfillmentFlowDraft,
  FulfillmentFlowPhase,
  FulfillmentFlowStep,
  FulfillmentStepFieldType,
  FulfillmentStepFormField,
} from '@/studio/api/fulfillment-flows';
import { Icon } from '@/studio/ui/icons';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';
import { useUnsavedGuard } from '@/studio/features/catalog/editor/use-unsaved-guard';
import { FlowStepFieldsEditor, type FlowStepFieldDraft } from './FlowStepFieldsEditor';

type FieldForm = FlowStepFieldDraft;

interface StepForm {
  status_name: string;
  description: string;
  process_day: string;
  filled_by: 'admin' | 'buyer';
  release_percentage: string;
  guaranty_days: string;
  fields: FieldForm[];
}

interface FlowForm {
  name: string;
  description: string;
  is_active: boolean;
  praorder: StepForm[];
  pascaorder: StepForm[];
}

interface StepSelection {
  phase: FulfillmentFlowPhase;
  index: number;
}

function firstStepSelection(form: FlowForm): StepSelection {
  return form.praorder.length > 0
    ? { phase: 'PRAORDER', index: 0 }
    : { phase: 'PASCAORDER', index: 0 };
}

function emptyStep(): StepForm {
  return {
    status_name: '',
    description: '',
    process_day: '',
    filled_by: 'admin',
    release_percentage: '',
    guaranty_days: '',
    fields: [],
  };
}

function emptyFlow(): FlowForm {
  return { name: '', description: '', is_active: true, praorder: [], pascaorder: [emptyStep()] };
}

function stepToForm(step: FulfillmentFlowStep): StepForm {
  return {
    status_name: step.status_name,
    description: step.description ?? '',
    process_day: step.process_day == null ? '' : String(step.process_day),
    filled_by: step.filled_by ?? 'admin',
    release_percentage: step.release_percentage == null ? '' : String(step.release_percentage),
    guaranty_days: step.guaranty_days == null ? '' : String(step.guaranty_days),
    fields: (step.form_schema ?? []).map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type,
      required: field.required ?? false,
      options: [...(field.options ?? [])],
      maxFiles: String(field.max_files ?? 5),
    })),
  };
}

function flowToForm(flow: FulfillmentFlow | null): FlowForm {
  if (!flow) return emptyFlow();
  const steps = [...flow.steps].sort((a, b) => a.sequence - b.sequence);
  const praorder = steps.filter((step) => step.phase === 'PRAORDER').map(stepToForm);
  const pascaorder = steps.filter((step) => (step.phase ?? 'PASCAORDER') === 'PASCAORDER').map(stepToForm);
  return {
    name: flow.name,
    description: flow.description ?? '',
    is_active: flow.is_active,
    praorder,
    pascaorder,
  };
}

function mediaField(type: FulfillmentStepFieldType): boolean {
  return type === 'pdf' || type === 'foto' || type === 'video';
}

function parseOptionalNumber(value: string, label: string, min: number, max?: number): number | undefined {
  if (!value.trim()) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || (max !== undefined && number > max)) {
    throw new Error(`${label} harus berupa angka antara ${min} dan ${max ?? 'tanpa batas'}.`);
  }
  return number;
}

function parseOptionalInteger(value: string, label: string, min: number): number | undefined {
  const number = parseOptionalNumber(value, label, min);
  if (number !== undefined && !Number.isInteger(number)) {
    throw new Error(`${label} harus berupa bilangan bulat.`);
  }
  return number;
}

function toDraft(form: FlowForm): FulfillmentFlowDraft {
  const name = form.name.trim();
  if (!name) throw new Error('Nama flow wajib diisi.');

  const steps: { phase: FulfillmentFlowPhase; step: StepForm }[] = [
    ...form.praorder.map((step) => ({ phase: 'PRAORDER' as const, step })),
    ...form.pascaorder.map((step) => ({ phase: 'PASCAORDER' as const, step })),
  ];
  if (steps.length === 0) throw new Error('Flow minimal harus memiliki satu step.');
  if (steps.some(({ step }) => !step.status_name.trim())) throw new Error('Nama status setiap step wajib diisi.');

  const percentageTotal = steps.reduce((total, { step }) => {
    return total + (parseOptionalNumber(step.release_percentage, 'Persentase rilis', 0.01, 100) ?? 0);
  }, 0);
  if (percentageTotal > 100) throw new Error(`Total persentase rilis (${percentageTotal}%) tidak boleh melebihi 100%.`);

  return {
    name,
    description: form.description.trim() || null,
    is_active: form.is_active,
    steps: steps.map(({ phase, step }, index) => {
      const processDay = parseOptionalInteger(step.process_day, 'Estimasi hari', 1);
      const releasePercentage = parseOptionalNumber(step.release_percentage, 'Persentase rilis', 0.01, 100);
      const guarantyDays = parseOptionalInteger(step.guaranty_days, 'Masa garansi', 1);
      const keys = new Set<string>();
      const fields: FulfillmentStepFormField[] = step.fields.map((field) => {
        const key = field.key.trim();
        const label = field.label.trim();
        if (!key || !label) throw new Error('Setiap field form harus memiliki key dan label.');
        if (keys.has(key)) throw new Error(`Key field "${key}" tidak boleh duplikat dalam satu step.`);
        keys.add(key);
        const options = field.type === 'select'
          ? field.options.map((option) => option.trim()).filter(Boolean)
          : undefined;
        if (field.type === 'select' && (!options || options.length === 0)) {
          throw new Error(`Tambahkan minimal satu pilihan untuk field "${label}".`);
        }
        return {
          key,
          label,
          type: field.type,
          required: field.required || undefined,
          options,
          max_files: mediaField(field.type)
            ? Math.max(1, Math.min(20, Number.parseInt(field.maxFiles, 10) || 5))
            : undefined,
        };
      });

      return {
        sequence: index + 1,
        phase,
        filled_by: step.filled_by,
        status_name: step.status_name.trim(),
        description: step.description.trim() || undefined,
        process_day: processDay,
        release_percentage: releasePercentage,
        guaranty_days: guarantyDays,
        form_schema: fields.length > 0 ? fields : undefined,
      };
    }),
  };
}

interface FlowEditorProps {
  flow: FulfillmentFlow | null;
  onSave: (draft: FulfillmentFlowDraft) => Promise<void>;
  onCancel: () => void;
}

export function FlowEditor({ flow, onSave, onCancel }: FlowEditorProps) {
  const initialForm = useMemo(() => flowToForm(flow), [flow]);
  const [form, setForm] = useState<FlowForm>(initialForm);
  const [activeStep, setActiveStep] = useState<StepSelection>(() => firstStepSelection(initialForm));
  const [mobileTimelineOpen, setMobileTimelineOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  useEffect(() => {
    setForm(initialForm);
    setActiveStep(firstStepSelection(initialForm));
    setError(null);
  }, [initialForm]);

  useUnsavedGuard(dirty && !isSubmitting, confirm);

  const updateStep = (phase: FulfillmentFlowPhase, index: number, patch: Partial<StepForm>) => {
    setForm((current) => ({
      ...current,
      [phase === 'PRAORDER' ? 'praorder' : 'pascaorder']:
        (phase === 'PRAORDER' ? current.praorder : current.pascaorder).map((step, stepIndex) =>
          stepIndex === index ? { ...step, ...patch } : step,
        ),
    }));
  };

  const moveStep = (phase: FulfillmentFlowPhase, index: number, direction: -1 | 1) => {
    const key = phase === 'PRAORDER' ? 'praorder' : 'pascaorder';
    const currentSteps = form[key];
    const target = index + direction;
    if (target < 0 || target >= currentSteps.length) return;
    const next = [...currentSteps];
    [next[index], next[target]] = [next[target], next[index]];
    setForm((current) => ({ ...current, [key]: next }));
    if (activeStep.phase === phase) {
      if (activeStep.index === index) setActiveStep({ phase, index: target });
      else if (activeStep.index === target) setActiveStep({ phase, index });
    }
  };

  const removeStep = (phase: FulfillmentFlowPhase, index: number) => {
    const key = phase === 'PRAORDER' ? 'praorder' : 'pascaorder';
    if (form.praorder.length + form.pascaorder.length <= 1) return;
    const remaining = form[key].filter((_, stepIndex) => stepIndex !== index);
    setForm((current) => ({ ...current, [key]: remaining }));
    if (activeStep.phase === phase) {
      if (activeStep.index === index) {
        if (remaining.length > 0) setActiveStep({ phase, index: Math.min(index, remaining.length - 1) });
        else {
          const otherPhase = phase === 'PRAORDER' ? 'PASCAORDER' : 'PRAORDER';
          setActiveStep({ phase: otherPhase, index: 0 });
        }
      } else if (activeStep.index > index) {
        setActiveStep({ phase, index: activeStep.index - 1 });
      }
    }
  };

  const insertStep = (phase: FulfillmentFlowPhase, index: number) => {
    const key = phase === 'PRAORDER' ? 'praorder' : 'pascaorder';
    const next = [...form[key]];
    next.splice(index, 0, emptyStep());
    setForm((current) => ({ ...current, [key]: next }));
    setActiveStep({ phase, index });
  };

  const handleSubmit = useCallback(async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onSave(toDraft(form));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Gagal menyimpan flow.');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, onSave]);

  const handleCancel = async () => {
    if (dirty) {
      const shouldLeave = await confirm({
        title: 'Tinggalkan tanpa menyimpan?',
        description: 'Perubahan yang belum disimpan akan hilang.',
        confirmLabel: 'Tinggalkan',
        cancelLabel: 'Tetap di sini',
      });
      if (!shouldLeave) return;
    }
    onCancel();
  };

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSubmitting) void handleSubmit();
  };

  const percentageTotal = [...form.praorder, ...form.pascaorder].reduce(
    (total, step) => total + (Number(step.release_percentage) || 0),
    0,
  );

  const renderTimelinePhase = (
    phase: FulfillmentFlowPhase,
    title: string,
  ) => {
    const steps = phase === 'PRAORDER' ? form.praorder : form.pascaorder;
    return (
      <section key={phase} className="w-full min-w-0">
        <h3 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-default-500">{title}</h3>
        <div className="flex w-full flex-col gap-1.5">
          {steps.length === 0 && (
            <button
              type="button"
              onClick={() => insertStep(phase, 0)}
              disabled={isSubmitting}
              className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-dashed border-default-300 bg-white px-2.5 text-left text-[12px] font-semibold text-primary hover:border-primary hover:bg-primary-50 disabled:opacity-50"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-primary"><Icon name="plus" size={12} /></span>
              Tambah step
            </button>
          )}
          {steps.map((step, index) => {
            const selected = activeStep.phase === phase && activeStep.index === index;
            const isOnlyStep = form.praorder.length + form.pascaorder.length <= 1;
            return (
              <div
                key={`${phase}-${index}`}
                className={`flex min-h-11 w-full items-center gap-1 rounded-lg border px-1.5 transition-colors ${selected ? 'border-primary-200 bg-primary-50' : 'border-default-200 bg-white hover:border-default-300'}`}
              >
                <button
                  type="button"
                  aria-current={selected ? 'step' : undefined}
                  onClick={() => {
                    setActiveStep({ phase, index });
                    setMobileTimelineOpen(false);
                  }}
                  disabled={isSubmitting}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-2 text-left text-[12px] disabled:opacity-50 ${selected ? 'font-bold text-primary' : 'font-medium text-default-600'}`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-primary bg-primary text-white' : 'border-default-300 bg-white'}`}>
                    {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : <span className="text-[9px]">{index + 1}</span>}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{step.status_name.trim() || 'Step baru'}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Tambah step setelah ${step.status_name.trim() || `step ${index + 1}`} di ${title}`}
                  onClick={() => insertStep(phase, index + 1)}
                  disabled={isSubmitting}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-primary hover:bg-primary-100 disabled:opacity-40"
                >
                  <Icon name="plus" size={15} />
                </button>
                <button
                  type="button"
                  aria-label={`Hapus ${step.status_name.trim() || `step ${index + 1}`} di ${title}`}
                  onClick={() => removeStep(phase, index)}
                  disabled={isSubmitting || isOnlyStep}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-danger hover:bg-danger-50 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderTimelinePanel = (mobile = false) => (
    <aside
      aria-label="Timeline flow"
      className={`min-w-0 rounded-xl border border-default-200 bg-default-50/70 p-3 ${mobile ? 'h-full w-[min(88vw,360px)] max-w-full overflow-y-auto rounded-l-none rounded-r-2xl bg-white shadow-2xl' : 'hidden lg:sticky lg:top-24 lg:block'}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <p className="text-[12px] font-bold text-foreground">Timeline flow</p>
        {mobile && (
          <button
            type="button"
            onClick={() => setMobileTimelineOpen(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-default-200 text-default-600 hover:bg-default-50"
            aria-label="Tutup timeline"
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        {renderTimelinePhase('PRAORDER', 'Praorder')}
        <span aria-hidden="true" className="hidden border-l border-dashed border-default-300 lg:ml-[10px] lg:block lg:h-3" />
        {renderTimelinePhase('PASCAORDER', 'Pascaorder')}
      </div>
      {!mobile && (
        <p className="mt-3 hidden px-1 text-[11px] leading-relaxed text-default-500 lg:block">
          Pilih step untuk mengedit, atau gunakan + dan hapus pada kartu.
        </p>
      )}
    </aside>
  );

  const renderActiveStep = () => {
    const phase = activeStep.phase;
    const title = phase === 'PRAORDER' ? 'Praorder' : 'Pascaorder';
    const steps = phase === 'PRAORDER' ? form.praorder : form.pascaorder;
    const step = steps[activeStep.index];
    if (!step) return null;
    const stepNumber = activeStep.index + 1;
    const isOnlyStep = form.praorder.length + form.pascaorder.length <= 1;
    return (
      <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-default-200 bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 border-b border-default-100 pb-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{title} · Step {stepNumber}</p>
            <h3 className="mt-1 truncate text-base font-bold text-foreground">{step.status_name.trim() || 'Step baru'}</h3>
            <p className="mt-1 text-[12px] text-default-500">Klik node lain pada timeline untuk mengedit step tersebut.</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label={`Pindahkan ${title} step ${stepNumber} ke atas`}
              disabled={activeStep.index === 0 || isSubmitting}
              onClick={() => moveStep(phase, activeStep.index, -1)}
              className="rounded-md p-2 text-default-600 hover:bg-default-100 disabled:opacity-40"
            >
              <Icon name="chevronDown" size={15} className="rotate-180" />
            </button>
            <button
              type="button"
              aria-label={`Pindahkan ${title} step ${stepNumber} ke bawah`}
              disabled={activeStep.index === steps.length - 1 || isSubmitting}
              onClick={() => moveStep(phase, activeStep.index, 1)}
              className="rounded-md p-2 text-default-600 hover:bg-default-100 disabled:opacity-40"
            >
              <Icon name="chevronDown" size={15} />
            </button>
            <button
              type="button"
              aria-label={`Hapus ${title} step ${stepNumber}`}
              disabled={isSubmitting || isOnlyStep}
              onClick={() => removeStep(phase, activeStep.index)}
              className="rounded-md p-2 text-danger hover:bg-danger-50 disabled:opacity-40"
            >
              <Icon name="trash" size={15} />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-4">
              <Input
                label="Nama status"
                labelPlacement="outside"
                value={step.status_name}
                onValueChange={(value) => updateStep(phase, activeStep.index, { status_name: value })}
                placeholder="Mis. Produk dikirim"
                maxLength={255}
                isRequired
                variant="bordered"
                isDisabled={isSubmitting}
              />
              <Textarea
                label="Deskripsi"
                labelPlacement="outside"
                value={step.description}
                onValueChange={(value) => updateStep(phase, activeStep.index, { description: value })}
                minRows={2}
                variant="bordered"
                placeholder="Opsional"
                isDisabled={isSubmitting}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  min={1}
                  label="Estimasi hari"
                  labelPlacement="outside"
                  value={step.process_day}
                  onValueChange={(value) => updateStep(phase, activeStep.index, { process_day: value })}
                  placeholder="Opsional"
                  variant="bordered"
                  isDisabled={isSubmitting}
                />
                <Select
                  label="Diselesaikan oleh"
                  labelPlacement="outside"
                  selectedKeys={[step.filled_by]}
                  onSelectionChange={(keys) => {
                    const [value] = Array.from(keys);
                    if (value === 'admin' || value === 'buyer') updateStep(phase, activeStep.index, { filled_by: value });
                  }}
                  variant="bordered"
                  isDisabled={isSubmitting}
                >
                  <SelectItem key="admin">Admin / seller</SelectItem>
                  <SelectItem key="buyer">Buyer</SelectItem>
                </Select>
              </div>
              <p className="-mt-2 text-[11px] leading-relaxed text-default-500">
                Step buyer diisi melalui halaman pesanan buyer; admin melihat hasilnya.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  min={0.01}
                  max={100}
                  step="0.01"
                  label="Pelepasan dana (%)"
                  labelPlacement="outside"
                  value={step.release_percentage}
                  onValueChange={(value) => updateStep(phase, activeStep.index, { release_percentage: value })}
                  placeholder="Opsional"
                  variant="bordered"
                  isDisabled={isSubmitting}
                />
                <Input
                  type="number"
                  min={1}
                  label="Garansi (hari)"
                  labelPlacement="outside"
                  value={step.guaranty_days}
                  onValueChange={(value) => updateStep(phase, activeStep.index, { guaranty_days: value })}
                  placeholder="Opsional"
                  variant="bordered"
                  isDisabled={isSubmitting || !step.release_percentage}
                />
              </div>
              <p className="-mt-2 text-[11px] leading-relaxed text-default-500">
                Total rilis seluruh flow maksimal 100%. Masa garansi berlaku jika step memiliki persentase rilis.
              </p>

              <FlowStepFieldsEditor
                fields={step.fields}
                onChange={(fields) => updateStep(phase, activeStep.index, { fields })}
                isDisabled={isSubmitting}
              />
            </div>
      </section>
    );
  };

  const title = flow?.name ?? 'Flow baru';
  return (
    <>
      <PageHeader
        title={title}
        description="Atur tahapan fulfillment praorder dan pascaorder."
        back={{ href: '/studio/flows', label: 'Master Flow' }}
        actions={
          <>
            <span className={`hidden text-[13px] font-semibold sm:inline ${dirty ? 'text-[#92400E]' : 'text-[#15803D]'}`} aria-live="polite">
              {dirty ? 'Belum disimpan' : 'Tersimpan'}
            </span>
            <button type="button" onClick={() => void handleCancel()} className="min-h-10 rounded-[10px] border border-default-300 bg-white px-3 text-[13px] font-semibold text-foreground hover:bg-default-50">
              Batal
            </button>
            <button
              type="submit"
              form="flow-editor-form"
              disabled={isSubmitting}
              className="inline-flex min-h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Menyimpan…' : flow ? 'Simpan perubahan' : 'Buat flow'}
            </button>
          </>
        }
      />
      <form id="flow-editor-form" onSubmit={submitForm} className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 pb-10">
        <section className="flex flex-col gap-3">
          <div className="border-b border-default-200 pb-4">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-primary">{flow ? 'Edit Master Flow' : 'Master Flow baru'}</p>
            <h1 className="mt-1 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{flow ? flow.name : 'Rancang alur pengerjaan'}</h1>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-default-600">
              Flow adalah SOP yang dapat digunakan ulang pada produk. Atur urutan kerja, siapa yang menyelesaikan tiap step, dan form yang perlu diisi.
            </p>
          </div>
          <h2 className="text-[13px] font-bold text-foreground">Informasi flow</h2>
          <Input
            label="Nama flow"
            labelPlacement="outside"
            value={form.name}
            onValueChange={(name) => setForm((current) => ({ ...current, name }))}
            placeholder="Mis. Pengiriman standar"
            maxLength={255}
            isRequired
            variant="bordered"
            isDisabled={isSubmitting}
          />
          <Textarea
            label="Deskripsi"
            labelPlacement="outside"
            value={form.description}
            onValueChange={(description) => setForm((current) => ({ ...current, description }))}
            minRows={2}
            variant="bordered"
            placeholder="Jelaskan kapan flow ini digunakan."
            isDisabled={isSubmitting}
          />
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-default-200 p-3">
            <span>
              <span className="block text-[13px] font-semibold text-foreground">Flow aktif</span>
              <span className="text-[11px] text-default-500">Flow nonaktif tidak bisa dipilih untuk produk.</span>
            </span>
            <Switch size="sm" isSelected={form.is_active} onValueChange={(is_active) => setForm((current) => ({ ...current, is_active }))} isDisabled={isSubmitting} />
          </div>
          <p className={`text-[12px] font-semibold ${percentageTotal > 100 ? 'text-danger' : 'text-default-600'}`}>
            Total pelepasan dana: {percentageTotal}% / 100%
          </p>
        </section>
        <div className="relative grid min-w-0 gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
          {renderTimelinePanel()}
          <div className="relative min-w-0">
            <button
              type="button"
              onClick={() => setMobileTimelineOpen(true)}
              className="fixed left-0 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-1 rounded-r-xl border border-l-0 border-default-300 bg-white px-2 py-3 text-[10px] font-semibold leading-tight text-default-700 shadow-lg max-lg:flex"
              aria-label="Buka timeline flow"
            >
              <Icon name="menu" size={17} />
              <span className="[writing-mode:vertical-rl]">Timeline</span>
            </button>
            {renderActiveStep() ?? (
              <div className="rounded-xl border border-dashed border-default-300 p-6 text-center">
                <p className="text-sm font-semibold text-foreground">Belum ada step di fase ini</p>
                <p className="mt-1 text-xs text-default-500">Tambahkan step dari timeline untuk mulai mengatur alur.</p>
              </div>
            )}
          </div>
        </div>
        {error && <p role="alert" className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#B91C1C]">{error}</p>}
      </form>
      {mobileTimelineOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Tutup panel timeline"
            onClick={() => setMobileTimelineOpen(false)}
            className="absolute inset-0 bg-black/30"
          />
          <div className="relative z-10 h-full">{renderTimelinePanel(true)}</div>
        </div>
      )}
      {dialog}
    </>
  );
}
