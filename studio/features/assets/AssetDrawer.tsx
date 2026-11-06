'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Input, Textarea } from '@heroui/react';

import { errorMessage } from '@/studio/api/client';
import {
  replaceDigitalAssetFile,
  updateDigitalAsset,
  uploadDigitalAsset,
  type WebsiteAsset,
} from '@/studio/api/digital-assets';
import { useActiveWebsiteId } from '@/studio/stores/website-store';
import { EditDrawer } from '@/studio/ui/primitives/EditDrawer';
import { notify } from '@/studio/ui/primitives/Toast';

import { MAX_ASSET_BYTES, formatBytes } from './asset-utils';

interface AssetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  asset: WebsiteAsset | null;
  /** Dipanggil setelah berhasil membuat / mengubah / mengganti file. */
  onSaved: (asset: WebsiteAsset, mode: 'create' | 'update') => void;
}

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="flex flex-col gap-1" role="status" aria-live="polite">
      <div className="flex justify-between text-[12px] text-default-600">
        <span>{label}</span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-default-100">
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

const FILE_INPUT =
  'block min-h-11 w-full rounded-[10px] border border-default-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-default-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold';

function validateFile(file: File): string | null {
  if (file.size === 0) return 'Berkas kosong.';
  if (file.size > MAX_ASSET_BYTES) return `Ukuran ${formatBytes(file.size)} melebihi batas 100 MB.`;
  return null;
}

export function AssetDrawer({ isOpen, onClose, asset, onSaved }: AssetDrawerProps) {
  const websiteId = useActiveWebsiteId();
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    setName(asset?.name ?? '');
    setDescription(asset?.description ?? '');
    setProgress(null);
    setError(null);
  }, [isOpen, asset]);

  const handlePick = (picked: File | null): void => {
    setFile(picked);
    setError(picked ? validateFile(picked) : null);
    if (picked && !name.trim()) setName(picked.name.slice(0, 255));
  };

  const handleSubmit = useCallback(async () => {
    if (!websiteId) return;
    if (!name.trim()) return setError('Judul asset wajib diisi.');
    if (!asset && !file) return setError('Pilih file yang akan diunggah.');
    const fileError = file && !asset ? validateFile(file) : null;
    if (fileError) return setError(fileError);
    setError(null);
    setIsSubmitting(true);
    try {
      if (asset) {
        const saved = await updateDigitalAsset(websiteId, asset.id, { name: name.trim(), description: description.trim() });
        onSaved(saved, 'update');
        notify.success('Asset diperbarui.');
      } else if (file) {
        setProgress(0);
        const saved = await uploadDigitalAsset({ websiteId, file, name: name.trim(), description: description.trim() }, setProgress);
        onSaved(saved, 'create');
        notify.success('Asset diunggah.');
      }
    } catch (err) {
      setError(errorMessage(err, 'Gagal menyimpan asset.'));
    } finally {
      setIsSubmitting(false);
      setProgress(null);
    }
  }, [websiteId, name, description, asset, file, onSaved]);

  const handleReplace = async (picked: File | undefined): Promise<void> => {
    if (!websiteId || !asset || !picked) return;
    const fileError = validateFile(picked);
    if (fileError) return setError(fileError);
    setError(null);
    setReplacing(true);
    setProgress(0);
    try {
      const saved = await replaceDigitalAssetFile(websiteId, asset.id, picked, setProgress);
      onSaved(saved, 'update');
      notify.success('File asset diganti. Transaksi lama kini mengakses file terbaru.');
    } catch (err) {
      setError(errorMessage(err, 'Gagal mengganti file asset.'));
    } finally {
      setReplacing(false);
      setProgress(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  const busy = isSubmitting || replacing;

  return (
    <EditDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={asset ? 'Edit asset' : 'Unggah asset'}
      description={asset ? asset.filename : 'File privat, hanya dapat diunduh pembeli produk digital.'}
      onSubmit={handleSubmit}
      submitLabel={asset ? 'Simpan perubahan' : 'Unggah asset'}
      isSubmitting={busy}
      isSubmitDisabled={!name.trim() || (!asset && !file)}
    >
      <div className="flex flex-col gap-4">
        {!asset && (
          <div className="flex flex-col gap-2">
            <label htmlFor="asset-file" className="text-[12px] font-semibold text-default-600">File (maks. 100 MB)</label>
            <input id="asset-file" type="file" disabled={busy} onChange={(e) => handlePick(e.target.files?.[0] ?? null)} className={FILE_INPUT} />
            {file && <p className="text-[12px] text-default-600">{file.name} · {formatBytes(file.size)}</p>}
          </div>
        )}
        <Input label="Judul" labelPlacement="outside" value={name} onValueChange={setName} maxLength={255} isRequired variant="bordered" placeholder="Mis. Panduan pengguna v2" />
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-semibold text-default-600">Deskripsi</label>
          <Textarea value={description} onValueChange={setDescription} maxLength={2000} rows={4} className="w-full" placeholder="Catatan singkat tentang file ini…" />
        </div>
        {asset && (
          <div className="flex flex-col gap-2 rounded-[10px] border border-default-200 bg-default-50 p-3">
            <span className="text-[13px] font-bold text-foreground">Ganti file</span>
            <p className="text-[12px] text-default-600">
              Mengganti file langsung berlaku untuk semua pembeli, termasuk transaksi lama. Judul dan tautan ke produk tetap.
            </p>
            <input ref={replaceInputRef} type="file" disabled={busy} onChange={(e) => void handleReplace(e.target.files?.[0])} className={FILE_INPUT} aria-label="Pilih file pengganti" />
          </div>
        )}
        {progress !== null && <ProgressBar percent={progress} label={replacing ? 'Mengganti file…' : 'Mengunggah…'} />}
        {error && <p role="alert" className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#B91C1C]">{error}</p>}
      </div>
    </EditDrawer>
  );
}
