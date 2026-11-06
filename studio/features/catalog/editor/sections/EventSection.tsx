'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { uploadAsset } from '@/studio/lib/upload-asset';
import { RichTextEditor } from '@/studio/ui/rich-text-editor';
import { Icon } from '@/studio/ui/icons';
import { notify } from '@/studio/ui/primitives/Toast';

import type { SectionProps } from '../editor-context';
import { ADD_BTN, HINT, ICON_BTN, INPUT, IntField, MoneyField, Notice, TextAreaField, TextField } from '../fields';
import { emptyOption, type GatheringOptionDraft, type PenaltyType, type ProductForm } from '../form-state';

const PENALTY_LABEL: Record<PenaltyType, string> = { NONE: 'Tanpa penalti', FIXED: 'Nominal tetap', PERCENTAGE: 'Persentase' };
const OPTION_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const OPTION_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const OPTION_IMAGE_MAX_COUNT = 10;

type CancellationPolicyDraft = Pick<ProductForm, 'policySummary' | 'prepareDays' | 'cutoffDays' | 'penaltyType' | 'penaltyValue'>;

function CancellationPolicyDialog({
  initialValue,
  websiteId,
  errors,
  onClose,
  onSave,
}: {
  initialValue: CancellationPolicyDraft;
  websiteId: string;
  errors: SectionProps['errors'];
  onClose: () => void;
  onSave: (value: CancellationPolicyDraft) => void;
}) {
  const [draft, setDraft] = useState(initialValue);
  const closeButton = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const update = (patch: Partial<CancellationPolicyDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit aturan pembatalan acara"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-[90vh] w-[90vw] max-w-5xl flex-col overflow-hidden rounded-2xl border border-default-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-default-200 px-4 py-3.5 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-foreground">Edit aturan pembatalan acara</h2>
            <p className={HINT}>Atur keterangan dan batas waktu pembatalan oleh penyelenggara.</p>
          </div>
          <button ref={closeButton} type="button" className={ICON_BTN} aria-label="Tutup aturan pembatalan" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <RichTextEditor
            label="Keterangan aturan"
            description="Teks ini menjelaskan aturan pembatalan kepada peserta."
            placeholder="Contoh: Jika acara dibatalkan oleh penyelenggara, peserta akan menerima pengembalian dana sesuai ketentuan..."
            value={draft.policySummary}
            onChange={(policySummary) => update({ policySummary })}
            websiteId={websiteId}
            uploadFolder="products"
          />
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            <IntField label="Persiapan dimulai" suffix="hari sebelum" value={draft.prepareDays} onChange={(prepareDays) => update({ prepareDays })} error={errors.prepareDays} hint="Awal jendela penalti dan persiapan acara." />
            <IntField label="Batas akhir pembatalan" suffix="hari sebelum" value={draft.cutoffDays} onChange={(cutoffDays) => update({ cutoffDays })} error={errors.cutoffDays} hint="Setelah ini acara tidak bisa dibatalkan." />
          </div>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold">Penalti per peserta</span>
              <select
                className={INPUT}
                value={draft.penaltyType}
                onChange={(event) => {
                  const penaltyType = event.target.value as PenaltyType;
                  update({ penaltyType, penaltyValue: penaltyType === 'NONE' ? '0' : draft.penaltyValue });
                }}
              >
                {(Object.keys(PENALTY_LABEL) as PenaltyType[]).map((key) => (
                  <option key={key} value={key}>{PENALTY_LABEL[key]}</option>
                ))}
              </select>
            </label>
            {draft.penaltyType !== 'NONE' && (
              <IntField
                label={draft.penaltyType === 'PERCENTAGE' ? 'Besar penalti (%)' : 'Besar penalti (Rp)'}
                value={draft.penaltyValue}
                onChange={(penaltyValue) => update({ penaltyValue })}
                error={errors.penaltyValue}
                hint="Per kursi berbayar bila dibatalkan dalam jendela penalti."
              />
            )}
          </div>
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t border-default-200 bg-white px-4 py-3 sm:px-6">
          <button type="button" className="min-h-10 rounded-[10px] border border-default-300 px-4 text-[13px] font-semibold" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="min-h-10 rounded-[10px] bg-primary px-4 text-[13px] font-semibold text-white" onClick={() => { onSave(draft); onClose(); }}>
            Simpan aturan
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function ParticipantTermsDialog({
  value,
  websiteId,
  onClose,
  onSave,
}: {
  value: string;
  websiteId: string;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const closeButton = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const save = () => {
    onSave(draft);
    onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit syarat dan ketentuan peserta"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-[90vh] w-[90vw] max-w-5xl flex-col overflow-hidden rounded-2xl border border-default-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-default-200 px-4 py-3.5 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-foreground">Edit syarat dan ketentuan peserta</h2>
            <p className={HINT}>Ketentuan ini akan disertakan pada undangan gathering.</p>
          </div>
          <button ref={closeButton} type="button" className={ICON_BTN} aria-label="Tutup syarat dan ketentuan" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <RichTextEditor
            label="Syarat dan ketentuan peserta"
            description="Tuliskan hal yang perlu diketahui atau dipersiapkan peserta."
            placeholder="Contoh: Peserta wajib membawa undangan dengan QR code saat registrasi, hadir 30 menit sebelum acara dimulai, dan menunjukkan QR code kepada petugas saat check-in."
            value={draft}
            onChange={setDraft}
            websiteId={websiteId}
            uploadFolder="products"
          />
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t border-default-200 bg-white px-4 py-3 sm:px-6">
          <button type="button" className="min-h-10 rounded-[10px] border border-default-300 px-4 text-[13px] font-semibold" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="min-h-10 rounded-[10px] bg-primary px-4 text-[13px] font-semibold text-white" onClick={save}>
            Simpan ketentuan
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function NewOptionGroupDialog({
  existingGroups,
  onClose,
  onSave,
}: {
  existingGroups: string[];
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const save = () => {
    const groupName = name.trim();
    if (!groupName) {
      notify.error('Isi nama kelompok terlebih dahulu.');
      return;
    }
    if (existingGroups.some((group) => group.trim().toLocaleLowerCase() === groupName.toLocaleLowerCase())) {
      notify.error('Nama kelompok tersebut sudah digunakan.');
      return;
    }
    onSave(groupName);
    onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tambah kelompok pilihan"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-default-200 bg-white shadow-2xl">
        <header className="flex items-center gap-3 border-b border-default-200 px-4 py-3.5 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-foreground">Tambah kelompok pilihan</h2>
            <p className={HINT}>Contoh: Menu, Lokasi, atau Aktivitas.</p>
          </div>
          <button type="button" className={ICON_BTN} aria-label="Tutup tambah kelompok" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="p-4 sm:p-5">
          <TextField
            label="Nama kelompok"
            placeholder="Contoh: Menu"
            value={name}
            onChange={setName}
            maxLength={64}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                save();
              }
            }}
          />
        </div>
        <footer className="flex justify-end gap-2 border-t border-default-200 bg-white px-4 py-3 sm:px-5">
          <button type="button" className="min-h-10 rounded-[10px] border border-default-300 px-4 text-[13px] font-semibold" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="min-h-10 rounded-[10px] bg-primary px-4 text-[13px] font-semibold text-white" onClick={save}>
            Simpan & tambah pilihan
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function OptionDialog({
  group,
  options,
  initialOption,
  isNew,
  websiteId,
  onClose,
  onSave,
  onRemove,
}: {
  group: string;
  options: GatheringOptionDraft[];
  initialOption: GatheringOptionDraft;
  isNew: boolean;
  websiteId: string;
  onClose: () => void;
  onSave: (option: GatheringOptionDraft) => void;
  onRemove: (key: string) => void;
}) {
  const [selectedKey, setSelectedKey] = useState(initialOption.key);
  const [draft, setDraft] = useState(initialOption);
  const [isEditing, setIsEditing] = useState(isNew);
  const [isAddingInDialog, setIsAddingInDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const previousSelectedKey = useRef<string | null>(null);
  const activeOption = options.find((option) => option.key === selectedKey) ?? initialOption;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const selectOption = (option: GatheringOptionDraft) => {
    if (isEditing) return;
    setSelectedKey(option.key);
    setDraft(option);
  };

  const updateDraft = (patch: Partial<GatheringOptionDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const uploadImages = async (files: FileList) => {
    const remaining = OPTION_IMAGE_MAX_COUNT - draft.images.length;
    const valid = Array.from(files).filter((file) => {
      if (!OPTION_IMAGE_TYPES.includes(file.type)) {
        notify.error(`${file.name} bukan PNG/JPG/WebP/GIF.`);
        return false;
      }
      if (file.size > OPTION_IMAGE_MAX_BYTES) {
        notify.error(`${file.name} lebih dari 5 MB.`);
        return false;
      }
      return true;
    }).slice(0, Math.max(remaining, 0));
    if (files.length > remaining) notify.error(`Maksimal ${OPTION_IMAGE_MAX_COUNT} foto untuk setiap pilihan.`);
    if (!valid.length) return;

    setUploading(true);
    const uploaded: string[] = [];
    for (const file of valid) {
      try {
        const result = await uploadAsset(file, websiteId, 'products');
        uploaded.push(result.url);
      } catch (error) {
        notify.error(`Gagal mengunggah ${file.name}`, error instanceof Error ? error.message : undefined);
      }
    }
    if (uploaded.length) updateDraft({ images: [...draft.images, ...uploaded] });
    setUploading(false);
  };

  const save = () => {
    if (!draft.label.trim()) {
      notify.error('Isi nama pilihan terlebih dahulu.');
      return;
    }
    onSave({ ...draft, group });
    if (isAddingInDialog) {
      setSelectedKey(draft.key);
      setIsAddingInDialog(false);
      setIsEditing(false);
      previousSelectedKey.current = null;
      return;
    }
    onClose();
  };

  const addOptionInDialog = () => {
    previousSelectedKey.current = selectedKey;
    const option = { ...emptyOption(), group };
    setSelectedKey(option.key);
    setDraft(option);
    setIsAddingInDialog(true);
    setIsEditing(true);
  };

  const edit = () => {
    setDraft(activeOption);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    if (isNew) {
      onClose();
      return;
    }
    if (isAddingInDialog) {
      const previousKey = previousSelectedKey.current;
      const previousOption = options.find((option) => option.key === previousKey);
      if (previousOption) {
        setSelectedKey(previousOption.key);
        setDraft(previousOption);
      }
      previousSelectedKey.current = null;
      setIsAddingInDialog(false);
      setIsEditing(false);
      return;
    }
    setDraft(activeOption);
    setIsEditing(false);
  };

  const remove = () => {
    onRemove(activeOption.key);
    onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Pilihan dalam kelompok ${group}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-[90vh] w-[90vw] max-w-5xl flex-col overflow-hidden rounded-2xl border border-default-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-default-200 px-4 py-3.5 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-default-500">{group}</p>
            <h2 className="truncate text-base font-bold text-foreground">{activeOption.label || 'Pilihan baru'}</h2>
          </div>
          <button ref={closeButton} type="button" className={ICON_BTN} aria-label="Tutup pilihan" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <section aria-label={`Daftar pilihan kelompok ${group}`}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold">Pilihan dalam kelompok ini</h3>
              <span className="text-xs text-default-500">
                {options.length + (isEditing && !options.some((option) => option.key === draft.key) ? 1 : 0)} pilihan
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {(isEditing && !options.some((option) => option.key === draft.key) ? [...options, draft] : options).map((option, index) => {
                const selected = option.key === selectedKey;
                return (
                  <button
                    key={option.key}
                    type="button"
                    disabled={isEditing}
                    onClick={() => selectOption(option)}
                    aria-pressed={selected}
                    className={`flex w-36 shrink-0 flex-col overflow-hidden rounded-xl border text-left transition-colors disabled:cursor-default ${
                      selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-default-200 hover:bg-default-50'
                    }`}
                  >
                    {option.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element -- tenant option image URL
                      <img src={option.images[0]} alt="" className="h-20 w-full object-cover" />
                    ) : (
                      <span className="flex h-20 items-center justify-center bg-default-50 text-default-400">
                        <Icon name="image" size={22} />
                      </span>
                    )}
                    <span className="truncate px-2.5 py-2 text-xs font-semibold">
                      {option.label || (isEditing && option.key === draft.key ? 'Pilihan baru' : `Pilihan ${index + 1}`)}
                    </span>
                  </button>
                );
              })}
              {!isEditing && (
                <button
                  type="button"
                  onClick={addOptionInDialog}
                  className="flex w-36 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-default-300 bg-default-50 text-default-600 transition hover:border-primary hover:bg-default-100"
                >
                  <Icon name="plus" size={20} />
                  <span className="text-xs font-semibold">Tambah pilihan</span>
                </button>
              )}
            </div>
          </section>

          <section className="mt-4 rounded-xl border border-default-200 bg-default-50/60 p-4 sm:p-5" aria-label="Detail pilihan">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-default-200 pb-3">
              <div>
                <h3 className="text-sm font-bold">Detail pilihan</h3>
                <p className={HINT}>{isEditing ? 'Lengkapi atau ubah informasi pilihan ini.' : 'Informasi ini tampil sebagai baca-saja.'}</p>
              </div>
              {!isEditing ? (
                <div className="flex gap-2">
                  <button type="button" className={`${ICON_BTN} text-danger`} aria-label="Hapus pilihan" onClick={remove}>
                    <Icon name="trash" size={15} />
                  </button>
                  <button type="button" className={ADD_BTN} onClick={edit}>
                    <Icon name="edit" size={15} />
                    Edit
                  </button>
                </div>
              ) : null}
            </div>

            {isEditing ? (
              <div className="flex flex-col gap-3">
                <TextField label="Nama pilihan" placeholder="Contoh: Sate Padang" value={draft.label} onChange={(label) => updateDraft({ label })} maxLength={255} />
                <TextAreaField label="Keterangan" placeholder="Jelaskan pilihan ini untuk peserta" rows={3} value={draft.description} onChange={(description) => updateDraft({ description })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField label="Lokasi (opsional)" placeholder="Contoh: Lantai 2" value={draft.venueLocation} onChange={(venueLocation) => updateDraft({ venueLocation })} />
                  <TextField label="Ketersediaan (opsional)" placeholder="Contoh: Tersedia selama acara" value={draft.availabilityNote} onChange={(availabilityNote) => updateDraft({ availabilityNote })} />
                </div>
                <TextAreaField label="Benefit (satu per baris, opsional)" placeholder={'Contoh:\nTermasuk minuman\nArea khusus keluarga'} rows={3} value={draft.benefits} onChange={(benefits) => updateDraft({ benefits })} />
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold">
                      Foto pilihan <span className="font-normal text-default-500">({draft.images.length}/{OPTION_IMAGE_MAX_COUNT})</span>
                    </span>
                    {draft.images.length < OPTION_IMAGE_MAX_COUNT && (
                      <label className={`${ADD_BTN} cursor-pointer`}>
                        {uploading ? 'Mengunggah…' : '+ Tambah foto'}
                        <input
                          type="file"
                          accept={OPTION_IMAGE_TYPES.join(',')}
                          multiple
                          hidden
                          disabled={uploading}
                          onChange={(event) => {
                            if (event.currentTarget.files) void uploadImages(event.currentTarget.files);
                            event.currentTarget.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                  {draft.images.length ? (
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8">
                      {draft.images.map((url, imageIndex) => (
                        <li key={`${url}-${imageIndex}`} className="relative aspect-square overflow-hidden rounded-lg border border-default-200">
                          {/* eslint-disable-next-line @next/next/no-img-element -- URL storage tenant */}
                          <img src={url} alt={`${draft.label || 'Pilihan'} - foto ${imageIndex + 1}`} className="h-full w-full object-cover" />
                          <button
                            type="button"
                            disabled={uploading}
                            onClick={() => updateDraft({ images: draft.images.filter((_, index) => index !== imageIndex) })}
                            aria-label={`Hapus foto ${imageIndex + 1}`}
                            className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black disabled:opacity-50"
                          >
                            <Icon name="close" size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-default-500">Belum ada foto. Kamu bisa memilih beberapa foto sekaligus.</p>
                  )}
                  <span className={HINT}>PNG, JPG, WebP, atau GIF; maksimal 5 MB per foto dan 10 foto per pilihan.</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-lg font-bold">{activeOption.label || 'Pilihan tanpa nama'}</p>
                  {activeOption.description ? <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-default-700">{activeOption.description}</p> : <p className="mt-1 text-sm italic text-default-500">Belum ada keterangan.</p>}
                </div>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-default-200 bg-white p-3">
                    <dt className="text-xs font-semibold text-default-500">Lokasi</dt>
                    <dd className="mt-1 text-sm">{activeOption.venueLocation || 'Belum diisi'}</dd>
                  </div>
                  <div className="rounded-lg border border-default-200 bg-white p-3">
                    <dt className="text-xs font-semibold text-default-500">Ketersediaan</dt>
                    <dd className="mt-1 text-sm">{activeOption.availabilityNote || 'Belum diisi'}</dd>
                  </div>
                </dl>
                {activeOption.benefits.trim() ? (
                  <div>
                    <p className="text-xs font-semibold text-default-500">Benefit</p>
                    <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
                      {activeOption.benefits.split('\n').map((benefit, index) => benefit.trim() ? <li key={`${index}-${benefit}`}>{benefit}</li> : null)}
                    </ul>
                  </div>
                ) : null}
                {activeOption.images.length ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-default-500">Foto pilihan ({activeOption.images.length})</p>
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8">
                      {activeOption.images.map((url, index) => (
                        <li key={`${url}-${index}`} className="aspect-square overflow-hidden rounded-lg border border-default-200">
                          {/* eslint-disable-next-line @next/next/no-img-element -- URL storage tenant */}
                          <img src={url} alt={`${activeOption.label} - foto ${index + 1}`} className="h-full w-full object-cover" />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : <p className="text-sm italic text-default-500">Belum ada foto untuk pilihan ini.</p>}
              </div>
            )}
          </section>
        </div>

        {isEditing ? (
          <footer className="flex shrink-0 justify-end gap-2 border-t border-default-200 bg-white px-4 py-3 sm:px-6">
            <button type="button" className="min-h-10 rounded-[10px] border border-default-300 px-4 text-[13px] font-semibold" onClick={cancelEdit}>
              Batal
            </button>
            <button type="button" disabled={uploading} className="min-h-10 rounded-[10px] bg-primary px-4 text-[13px] font-semibold text-white disabled:opacity-50" onClick={save}>
              Simpan pilihan
            </button>
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function OptionGroupCard({
  group,
  options,
  websiteId,
  autoOpenOptionKey,
  onAutoOpenHandled,
  onRename,
  onChange,
  onRemove,
}: {
  group: string;
  options: GatheringOptionDraft[];
  websiteId: string;
  autoOpenOptionKey: string | null;
  onAutoOpenHandled: (key: string) => void;
  onRename: (name: string) => void;
  onChange: (option: GatheringOptionDraft) => void;
  onRemove: (key: string) => void;
}) {
  const [dialogOption, setDialogOption] = useState<GatheringOptionDraft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [groupDraft, setGroupDraft] = useState(group);
  const discardOnCancelKey = useRef<string | null>(null);

  useEffect(() => setGroupDraft(group), [group]);

  useEffect(() => {
    if (!autoOpenOptionKey) return;
    const option = options.find((item) => item.key === autoOpenOptionKey);
    if (!option) return;
    discardOnCancelKey.current = option.key;
    setDialogOption(option);
    setIsNew(true);
    onAutoOpenHandled(option.key);
  }, [autoOpenOptionKey, onAutoOpenHandled, options]);

  const commitGroupName = () => {
    if (groupDraft !== group) onRename(groupDraft);
  };

  const addOption = () => {
    discardOnCancelKey.current = null;
    setDialogOption({ ...emptyOption(), group });
    setIsNew(true);
  };

  const saveOption = (option: GatheringOptionDraft) => {
    onChange(option);
    discardOnCancelKey.current = null;
    setIsNew(false);
  };

  const closeDialog = () => {
    if (discardOnCancelKey.current) {
      onRemove(discardOnCancelKey.current);
      discardOnCancelKey.current = null;
    }
    setDialogOption(null);
  };

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-default-200 bg-white p-3.5 sm:p-4">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <TextField
            label="Nama kelompok"
            placeholder="Contoh: Menu"
            value={groupDraft}
            onChange={setGroupDraft}
            onBlur={commitGroupName}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitGroupName();
                event.currentTarget.blur();
              }
            }}
            maxLength={64}
          />
        </div>
        <button type="button" className={`${ICON_BTN} text-danger`} aria-label={`Hapus kelompok ${group || 'tanpa nama'}`} onClick={() => options.forEach((option) => onRemove(option.key))}>
          <Icon name="trash" size={14} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option, index) => (
          <button
            key={option.key}
            type="button"
            onClick={() => { setDialogOption(option); setIsNew(false); }}
            className="flex w-28 flex-col overflow-hidden rounded-xl border border-default-200 bg-white text-left transition hover:border-primary hover:bg-default-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:w-32"
          >
            {option.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element -- tenant option image URL
              <img src={option.images[0]} alt="" className="h-20 w-full object-cover" />
            ) : (
              <span className="flex h-20 items-center justify-center bg-default-50 text-default-400"><Icon name="image" size={22} /></span>
            )}
            <span className="w-full truncate px-2.5 py-2 text-xs font-semibold">
              {option.label || (option.key === autoOpenOptionKey ? 'Pilihan baru' : `Pilihan ${index + 1}`)}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={addOption}
          className="flex h-[116px] w-28 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-default-300 bg-default-50 text-default-600 hover:bg-default-100 sm:w-32"
        >
          <Icon name="plus" size={20} />
          <span className="text-xs font-semibold">Tambah pilihan</span>
        </button>
      </div>
      {dialogOption ? (
        <OptionDialog
          key={dialogOption.key}
          group={group}
          options={options}
          initialOption={dialogOption}
          isNew={isNew}
          websiteId={websiteId}
          onClose={closeDialog}
          onSave={saveOption}
          onRemove={onRemove}
        />
      ) : null}
    </li>
  );
}

/** Bagian "Peserta & pilihan acara": opsi gathering (kuota, pilihan, pembatalan) — disimpan lewat PUT replace. */
export function EventSection({ form, set, errors, websiteId, canEdit }: SectionProps) {
  const options = form.gatheringOptions;
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [pendingNewOptionKey, setPendingNewOptionKey] = useState<string | null>(null);
  const [isCancellationDialogOpen, setIsCancellationDialogOpen] = useState(false);
  const [isParticipantTermsDialogOpen, setIsParticipantTermsDialogOpen] = useState(false);
  const groups = new Map<string, GatheringOptionDraft[]>();
  for (const option of options) {
    const groupOptions = groups.get(option.group) ?? [];
    groupOptions.push(option);
    groups.set(option.group, groupOptions);
  }

  const patchOption = (key: string, patch: Partial<GatheringOptionDraft>) =>
    set({
      gatheringOptions: options.some((option) => option.key === key)
        ? options.map((option) => (option.key === key ? { ...option, ...patch } : option))
        : [...options, { ...emptyOption(), ...patch, key }],
    });
  const renameGroup = (previousName: string, group: string) =>
    set({ gatheringOptions: options.map((option) => (option.group === previousName ? { ...option, group } : option)) });
  const addGroup = (group: string) => {
    const firstOption = { ...emptyOption(), group };
    set({ gatheringOptions: [...options, firstOption] });
    setPendingNewOptionKey(firstOption.key);
  };
  const removeOption = (key: string) => set({ gatheringOptions: options.filter((option) => option.key !== key) });

  return (
    <>
      <Notice>Jadwal final acara ditentukan dari pemesanan (occurrence) di kalender Gathering, bukan di sini.</Notice>
      {errors.gathering && <Notice tone="danger">{errors.gathering}</Notice>}
      <div className="grid gap-3 sm:grid-cols-3">
        <IntField label="Minimum peserta" value={form.minAttendees} onChange={(minAttendees) => set({ minAttendees })} error={errors.minAttendees} />
        <IntField label="Kapasitas maksimum" value={form.maxAttendees} onChange={(maxAttendees) => set({ maxAttendees })} error={errors.maxAttendees} />
        <MoneyField label="DP per peserta" value={form.deposit} onChange={(deposit) => set({ deposit })} error={errors.deposit} />
      </div>
      <span className="text-xs text-default-600">DP per peserta bisa dicairkan lebih dulu untuk biaya venue. Isi 0 bila tidak ada DP.</span>

      <section className="flex flex-col gap-3 rounded-xl border border-default-200 bg-default-50/60 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-bold">Kelompok & pilihan</h3>
            <p className={HINT}>Buat kelompok, lalu masukkan pilihan di dalamnya. Contoh: kelompok “Menu” berisi “Sate Padang” dan “Nasi Campur”. Harga dan kuota berlaku sama untuk semua pilihan.</p>
          </div>
          <button type="button" className={ADD_BTN} onClick={() => setIsAddingGroup(true)}>+ Tambah kelompok</button>
        </div>
        {errors.options && <span role="alert" className="text-xs font-semibold text-danger">{errors.options}</span>}
        {groups.size === 0 ? (
          <div className="rounded-xl border border-dashed border-default-300 bg-white px-4 py-6 text-center">
            <p className="text-sm font-semibold">Belum ada kelompok pilihan</p>
            <p className="mt-1 text-xs text-default-600">Mulai dengan menambahkan kelompok seperti Menu, Transportasi, atau Aktivitas.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {[...groups.entries()].map(([group, groupOptions]) => (
              <OptionGroupCard
                key={group}
                group={group}
                options={groupOptions}
                websiteId={websiteId}
                autoOpenOptionKey={pendingNewOptionKey}
                onAutoOpenHandled={(key) => setPendingNewOptionKey((current) => current === key ? null : current)}
                onRename={(name) => renameGroup(group, name)}
                onChange={(option) => patchOption(option.key, option)}
                onRemove={removeOption}
              />
            ))}
          </ul>
        )}
      </section>
      {isAddingGroup && (
        <NewOptionGroupDialog
          existingGroups={[...groups.keys()]}
          onClose={() => setIsAddingGroup(false)}
          onSave={addGroup}
        />
      )}

      <section className="flex flex-col gap-2 rounded-xl border border-default-200 bg-default-50/60 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[13px] font-bold">Aturan bila penyelenggara membatalkan acara</h3>
            <p className={HINT}>Ringkasan dan kebijakan pembatalan yang berlaku untuk acara.</p>
          </div>
          {canEdit && (
            <button type="button" className={ADD_BTN} onClick={() => setIsCancellationDialogOpen(true)}>
              <Icon name="edit" size={15} />
              Edit
            </button>
          )}
        </div>
        {form.policySummary.trim() ? (
          <RichTextEditor
            label="Pratinjau aturan pembatalan"
            value={form.policySummary}
            onChange={() => {}}
            disabled
            hideToolbar
          />
        ) : (
          <p className="rounded-xl border border-dashed border-default-300 bg-white px-3 py-4 text-sm italic text-default-500">
            Belum ada ringkasan aturan pembatalan.
          </p>
        )}
        <p className="text-xs leading-relaxed text-default-600">
          Persiapan dimulai {form.prepareDays || '0'} hari sebelum acara · Batas pembatalan {form.cutoffDays || '0'} hari sebelum acara · Penalti {form.penaltyType === 'NONE'
            ? 'tanpa penalti'
            : form.penaltyType === 'PERCENTAGE'
              ? `${form.penaltyValue || '0'}% per peserta`
              : `Rp${new Intl.NumberFormat('id-ID').format(Number(form.penaltyValue || 0))} per peserta`}
        </p>
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-default-200 bg-default-50/60 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[13px] font-bold">Syarat dan ketentuan peserta</h3>
            <p className={HINT}>Akan disertakan pada undangan gathering.</p>
          </div>
          {canEdit && (
            <button type="button" className={ADD_BTN} onClick={() => setIsParticipantTermsDialogOpen(true)}>
              <Icon name="edit" size={15} />
              Edit
            </button>
          )}
        </div>
        {form.participantTerms.trim() ? (
          <RichTextEditor
            label="Pratinjau syarat dan ketentuan peserta"
            value={form.participantTerms}
            onChange={() => {}}
            disabled
            hideToolbar
          />
        ) : (
          <p className="rounded-xl border border-dashed border-default-300 bg-white px-3 py-4 text-sm italic text-default-500">
            Belum ada syarat dan ketentuan peserta.
          </p>
        )}
      </section>

      {isCancellationDialogOpen && (
        <CancellationPolicyDialog
          initialValue={{
            policySummary: form.policySummary,
            prepareDays: form.prepareDays,
            cutoffDays: form.cutoffDays,
            penaltyType: form.penaltyType,
            penaltyValue: form.penaltyValue,
          }}
          websiteId={websiteId}
          errors={errors}
          onClose={() => setIsCancellationDialogOpen(false)}
          onSave={(policy) => set(policy)}
        />
      )}
      {isParticipantTermsDialogOpen && (
        <ParticipantTermsDialog
          value={form.participantTerms}
          websiteId={websiteId}
          onClose={() => setIsParticipantTermsDialogOpen(false)}
          onSave={(participantTerms) => set({ participantTerms })}
        />
      )}
    </>
  );
}
