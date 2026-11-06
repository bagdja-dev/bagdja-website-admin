'use client';

import { Checkbox, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem } from '@heroui/react';
import { useState } from 'react';

import type { FulfillmentStepFieldType } from '@/studio/api/fulfillment-flows';
import { Icon } from '@/studio/ui/icons';

export interface FlowStepFieldDraft {
  key: string;
  label: string;
  type: FulfillmentStepFieldType;
  required: boolean;
  options: string[];
  maxFiles: string;
}

const FIELD_TYPES: { value: FulfillmentStepFieldType; label: string }[] = [
  { value: 'text', label: 'Teks' },
  { value: 'number', label: 'Angka' },
  { value: 'textarea', label: 'Teks panjang' },
  { value: 'select', label: 'Pilihan' },
  { value: 'pdf', label: 'Dokumen PDF' },
  { value: 'foto', label: 'Foto' },
  { value: 'video', label: 'Video' },
  { value: 'lokasi', label: 'Lokasi' },
];

function emptyField(): FlowStepFieldDraft {
  return { key: '', label: '', type: 'text', required: false, options: [], maxFiles: '5' };
}

function fieldTypeLabel(type: FulfillmentStepFieldType): string {
  return FIELD_TYPES.find((fieldType) => fieldType.value === type)?.label ?? type;
}

function mediaField(type: FulfillmentStepFieldType): boolean {
  return type === 'pdf' || type === 'foto' || type === 'video';
}

export function FlowStepFieldsEditor({
  fields,
  onChange,
  isDisabled,
}: {
  fields: FlowStepFieldDraft[];
  onChange: (fields: FlowStepFieldDraft[]) => void;
  isDisabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftFields, setDraftFields] = useState<FlowStepFieldDraft[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const activeField = draftFields[activeIndex];

  const openEditor = (index?: number) => {
    const nextFields = fields.map((field) => ({ ...field, options: [...field.options] }));
    if (index === undefined) {
      nextFields.push(emptyField());
      setActiveIndex(nextFields.length - 1);
    } else {
      setActiveIndex(index);
    }
    setDraftFields(nextFields);
    setError(null);
    setIsOpen(true);
  };

  const updateActiveField = (patch: Partial<FlowStepFieldDraft>) => {
    setDraftFields((current) => current.map((field, index) => (
      index === activeIndex ? { ...field, ...patch } : field
    )));
    setError(null);
  };

  const addField = () => {
    setActiveIndex(draftFields.length);
    setDraftFields((current) => [...current, emptyField()]);
    setError(null);
  };

  const removeActiveField = () => {
    const nextFields = draftFields.filter((_, index) => index !== activeIndex);
    setDraftFields(nextFields);
    setActiveIndex(Math.max(0, Math.min(activeIndex, nextFields.length - 1)));
    setError(null);
  };

  const updateOption = (optionIndex: number, value: string) => {
    if (!activeField) return;
    updateActiveField({
      options: activeField.options.map((option, index) => index === optionIndex ? value : option),
    });
  };

  const save = () => {
    const normalized = draftFields.map((field) => ({
      ...field,
      key: field.key.trim(),
      label: field.label.trim(),
      options: field.options.map((option) => option.trim()).filter(Boolean),
    }));
    if (normalized.some((field) => !field.key || !field.label)) {
      setError('Setiap field harus memiliki key dan label.');
      return;
    }
    if (normalized.some((field) => field.type === 'select' && field.options.length === 0)) {
      setError('Tambahkan minimal satu pilihan pada setiap field bertipe Pilihan.');
      return;
    }
    onChange(normalized);
    setIsOpen(false);
  };

  return (
    <>
      <details className="rounded-lg border border-dashed border-default-300">
        <summary className="cursor-pointer px-3 py-2.5 text-[12px] font-semibold text-default-700">
          Form penyelesaian · {fields.length} field
        </summary>
        <div className="border-t border-default-100 p-3">
          <div className="flex flex-wrap gap-2">
            {fields.map((field, index) => (
              <button
                key={`${field.key}-${index}`}
                type="button"
                onClick={() => openEditor(index)}
                disabled={isDisabled}
                className="flex w-28 flex-col overflow-hidden rounded-xl border border-default-200 bg-white text-left transition hover:border-primary hover:bg-default-50 disabled:opacity-50 sm:w-32"
              >
                <span className="flex h-16 w-full items-center justify-center bg-default-50 text-lg font-bold text-default-400">
                  {field.label.trim().charAt(0).toLocaleUpperCase() || <Icon name="image" size={20} />}
                </span>
                <span className="w-full truncate px-2.5 pt-2 text-xs font-semibold">
                  {field.label.trim() || `Field ${index + 1}`}
                </span>
                <span className="w-full truncate px-2.5 pb-2 text-[10px] text-default-500">
                  {fieldTypeLabel(field.type)}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => openEditor()}
              disabled={isDisabled}
              className="flex h-[104px] w-28 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-default-300 bg-white text-default-600 hover:border-primary hover:bg-default-50 disabled:opacity-50 sm:w-32"
            >
              <Icon name="plus" size={20} />
              <span className="text-xs font-semibold">Tambah field</span>
            </button>
          </div>
          {fields.length === 0 && (
            <p className="mt-2 text-[11px] text-default-500">Tambahkan field untuk menentukan data yang perlu diisi saat step diselesaikan.</p>
          )}
        </div>
      </details>

      <Modal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="center"
        size="3xl"
        scrollBehavior="inside"
        isDismissable
      >
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader className="flex flex-col items-start gap-0.5">
                <div className="flex w-full items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-default-500">Form penyelesaian</span>
                    <span className="block truncate text-base font-bold text-foreground">{activeField?.label || 'Field baru'}</span>
                  </div>
                  <button
                    type="button"
                    aria-label="Tutup editor field"
                    onClick={close}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-default-200 text-default-600 hover:bg-default-50"
                  >
                    <Icon name="close" size={17} />
                  </button>
                </div>
              </ModalHeader>
              <ModalBody>
                <section aria-label="Daftar field penyelesaian">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">Field dalam step ini</h3>
                    <span className="text-xs text-default-500">{draftFields.length} field</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {draftFields.map((field, index) => (
                      <button
                        key={`${field.key}-${index}`}
                        type="button"
                        onClick={() => { setActiveIndex(index); setError(null); }}
                        aria-pressed={activeIndex === index}
                        className={`flex w-32 shrink-0 flex-col overflow-hidden rounded-xl border text-left transition ${activeIndex === index ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-default-200 hover:bg-default-50'}`}
                      >
                        <span className="flex h-16 items-center justify-center bg-default-50 text-lg font-bold text-default-400">
                          {field.label.trim().charAt(0).toLocaleUpperCase() || <Icon name="image" size={20} />}
                        </span>
                        <span className="truncate px-2.5 pt-2 text-xs font-semibold">
                          {field.label.trim() || `Field ${index + 1}`}
                        </span>
                        <span className="truncate px-2.5 pb-2 text-[10px] text-default-500">{fieldTypeLabel(field.type)}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={addField}
                      className="flex w-32 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-default-300 bg-default-50 text-default-600 transition hover:border-primary hover:bg-default-100"
                    >
                      <Icon name="plus" size={20} />
                      <span className="text-xs font-semibold">Tambah field</span>
                    </button>
                  </div>
                </section>

                {activeField ? (
                  <section className="mt-2 rounded-xl border border-default-200 bg-default-50/60 p-4 sm:p-5" aria-label="Detail field">
                    <div className="mb-4 flex items-center justify-between gap-2 border-b border-default-200 pb-3">
                      <div>
                        <h3 className="text-sm font-bold">Detail field</h3>
                        <p className="text-xs text-default-500">Atur informasi yang diminta dari pengisi step.</p>
                      </div>
                      <button
                        type="button"
                        aria-label="Hapus field"
                        onClick={removeActiveField}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-danger hover:bg-danger-50"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                    <div className="flex flex-col gap-3">
                      <Input
                        label="Key"
                        labelPlacement="outside"
                        value={activeField.key}
                        onValueChange={(key) => updateActiveField({ key })}
                        placeholder="no_resi"
                        variant="bordered"
                        maxLength={255}
                      />
                      <Input
                        label="Label"
                        labelPlacement="outside"
                        value={activeField.label}
                        onValueChange={(label) => updateActiveField({ label })}
                        placeholder="Nomor resi"
                        variant="bordered"
                        maxLength={255}
                      />
                      <Select
                        label="Tipe field"
                        labelPlacement="outside"
                        selectedKeys={[activeField.type]}
                        onSelectionChange={(keys) => {
                          const [value] = Array.from(keys);
                          if (FIELD_TYPES.some((option) => option.value === value)) {
                            updateActiveField({ type: value as FulfillmentStepFieldType });
                          }
                        }}
                        variant="bordered"
                      >
                        {FIELD_TYPES.map((option) => <SelectItem key={option.value}>{option.label}</SelectItem>)}
                      </Select>
                      {mediaField(activeField.type) && (
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          label="Maksimum file"
                          labelPlacement="outside"
                          value={activeField.maxFiles}
                          onValueChange={(maxFiles) => updateActiveField({ maxFiles })}
                          variant="bordered"
                          description="1–20 file; default 5."
                        />
                      )}
                      {activeField.type === 'select' && (
                        <div className="flex flex-col gap-2 rounded-lg border border-default-200 bg-white p-3">
                          <div>
                            <p className="text-[12px] font-semibold text-foreground">Daftar pilihan</p>
                            <p className="mt-0.5 text-[11px] text-default-500">Kelola opsi yang dapat dipilih pengisi.</p>
                          </div>
                          {activeField.options.map((option, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                aria-label={`Opsi ${index + 1}`}
                                value={option}
                                onValueChange={(value) => updateOption(index, value)}
                                placeholder={`Opsi ${index + 1}`}
                                variant="bordered"
                                size="sm"
                              />
                              <button
                                type="button"
                                aria-label={`Hapus opsi ${index + 1}`}
                                onClick={() => updateActiveField({ options: activeField.options.filter((_, optionIndex) => optionIndex !== index) })}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-danger hover:bg-danger-50"
                              >
                                <Icon name="trash" size={15} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => updateActiveField({ options: [...activeField.options, ''] })}
                            className="min-h-9 self-start rounded-lg border border-dashed border-default-300 px-3 text-[12px] font-semibold text-primary hover:bg-primary-50"
                          >
                            + Tambah opsi
                          </button>
                        </div>
                      )}
                      <Checkbox
                        size="sm"
                        isSelected={activeField.required}
                        onValueChange={(required) => updateActiveField({ required })}
                      >
                        Wajib diisi
                      </Checkbox>
                    </div>
                  </section>
                ) : (
                  <div className="rounded-xl border border-dashed border-default-300 p-6 text-center">
                    <p className="text-sm text-default-500">Belum ada field. Tambahkan field untuk mulai mengatur detail.</p>
                  </div>
                )}
                {error && <p role="alert" className="text-xs font-medium text-danger">{error}</p>}
              </ModalBody>
              <ModalFooter>
                <button
                  type="button"
                  onClick={() => { setError(null); close(); }}
                  className="min-h-10 rounded-[10px] border border-default-300 px-4 text-[13px] font-semibold text-foreground"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={save}
                  className="min-h-10 rounded-[10px] bg-primary px-4 text-[13px] font-semibold text-white"
                >
                  Simpan field
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
