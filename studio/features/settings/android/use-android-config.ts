'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  addPlayStoreFingerprints,
  fetchAndroidConfig,
  removeAndroidAsset,
  retireSigningFingerprint,
  saveAndroidConfig,
  uploadAndroidAsset,
  uploadAndroidKeystore,
  type AndroidAppConfigDto,
} from '@/studio/api/android';
import { errorMessage, isApiError } from '@/studio/api/client';
import type { WebsiteDto } from '@/studio/api/types';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import { notify } from '@/studio/ui/primitives/Toast';

import { emptyForm, formFromConfig, parseFingerprints, toSixDigitHex, validateAndroidForm, type AndroidForm, type KeystoreInput } from './android-utils';

export interface SaveStep {
  label: string;
  ok: boolean;
  detail?: string;
}

type ImageKind = 'icon' | 'splash';

/**
 * Konfigurasi aplikasi Android: muat, simpan berurutan (konfigurasi → keystore →
 * fingerprint, hasil per langkah; langkah gagal tidak menghapus input), aset gambar,
 * dan pensiun fingerprint.
 */
export function useAndroidConfig(website: WebsiteDto, enabled: boolean) {
  const websiteId = website.id;
  const { confirm, dialog } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [config, setConfig] = useState<AndroidAppConfigDto | null>(null);
  const [form, setForm] = useState<AndroidForm>(() => emptyForm(website.name));
  const [dirty, setDirty] = useState(false);
  const [keystore, setKeystore] = useState<KeystoreInput>({ file: null, alias: '', storePassword: '', keyPassword: '' });
  const [fingerprintInput, setFingerprintInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [steps, setSteps] = useState<SaveStep[]>([]);
  const [uploading, setUploading] = useState<ImageKind | null>(null);
  const [removing, setRemoving] = useState<ImageKind | null>(null);
  const activeId = useRef(websiteId);
  activeId.current = websiteId;

  // Respons upload/fingerprint tidak membawa target_url; pertahankan yang sudah ada.
  const applyConfig = useCallback((next: AndroidAppConfigDto) => {
    setConfig((current) => ({ ...next, target_url: next.target_url ?? current?.target_url }));
  }, []);

  useEffect(() => {
    setConfig(null);
    setForm(emptyForm(website.name));
    setDirty(false);
    setKeystore({ file: null, alias: '', storePassword: '', keyPassword: '' });
    setFingerprintInput('');
    setSteps([]);
    setLoadError(null);
    if (!enabled) { setLoading(false); return undefined; }
    let cancelled = false;
    setLoading(true);
    fetchAndroidConfig(websiteId)
      .then((c) => { if (!cancelled) { setConfig(c); setForm(formFromConfig(c)); } })
      .catch((err: unknown) => { if (!cancelled && !(isApiError(err) && err.status === 404)) setLoadError(errorMessage(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // Nama website hanya dipakai sebagai nilai awal formulir baru.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websiteId, enabled]);

  const updateForm = <K extends keyof AndroidForm>(key: K, value: AndroidForm[K]): void => {
    setForm((c) => ({ ...c, [key]: value }));
    setDirty(true);
  };
  const updateKeystore = (patch: Partial<KeystoreInput>): void => {
    setKeystore((c) => ({ ...c, ...patch }));
    setDirty(true);
  };
  const updateFingerprints = (value: string): void => { setFingerprintInput(value); setDirty(true); };

  const saveAll = async (): Promise<void> => {
    if (saving) return;
    const invalid = validateAndroidForm(form, keystore, fingerprintInput);
    if (invalid) { notify.error('Periksa isian.', invalid); return; }
    setSaving(true);
    setSteps([]);
    const results: SaveStep[] = [];
    const push = (step: SaveStep): void => { results.push(step); setSteps([...results]); };
    try {
      try {
        const saved = await saveAndroidConfig(websiteId, {
          appName: form.appName.trim(),
          packageName: form.packageName.trim(),
          versionName: form.versionName.trim(),
          versionCode: Number(form.versionCode),
          primaryColor: toSixDigitHex(form.primaryColor),
          splashColor: toSixDigitHex(form.splashColor),
          navigationBarColor: toSixDigitHex(form.navigationBarColor),
          navigationBarDividerColor: form.navigationBarDividerColor ? toSixDigitHex(form.navigationBarDividerColor) : null,
          displayMode: form.displayMode,
        });
        if (activeId.current !== websiteId) return;
        applyConfig(saved);
        setForm(formFromConfig(saved));
        push({ label: 'Konfigurasi', ok: true });
      } catch (err) {
        push({ label: 'Konfigurasi', ok: false, detail: errorMessage(err) });
        notify.error('Konfigurasi gagal disimpan.', errorMessage(err));
        return; // tanpa konfigurasi tersimpan, langkah lanjutan tidak dijalankan; isian tetap utuh
      }

      if (keystore.file) {
        try {
          applyConfig(await uploadAndroidKeystore(websiteId, {
            file: keystore.file, alias: keystore.alias.trim(), storePassword: keystore.storePassword, keyPassword: keystore.keyPassword,
          }));
          setKeystore({ file: null, alias: '', storePassword: '', keyPassword: '' });
          push({ label: 'Keystore', ok: true });
        } catch (err) {
          push({ label: 'Keystore', ok: false, detail: errorMessage(err) });
        }
      }

      const fingerprints = parseFingerprints(fingerprintInput);
      if (fingerprints.length) {
        try {
          applyConfig(await addPlayStoreFingerprints(websiteId, fingerprints));
          setFingerprintInput('');
          push({ label: 'Fingerprint Play Store', ok: true });
        } catch (err) {
          push({ label: 'Fingerprint Play Store', ok: false, detail: errorMessage(err) });
        }
      }

      try {
        const fresh = await fetchAndroidConfig(websiteId);
        if (activeId.current === websiteId) applyConfig(fresh);
      } catch (err) {
        push({ label: 'Muat ulang target URL', ok: false, detail: errorMessage(err) });
      }

      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) { setDirty(false); notify.success('Perubahan Android tersimpan.'); }
      else notify.warning('Sebagian langkah gagal.', 'Konfigurasi yang sudah tersimpan tidak hilang; perbaiki langkah yang gagal lalu simpan lagi.');
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (kind: ImageKind, file: File): Promise<void> => {
    if (file.size > 5 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      notify.error('Gambar tidak valid.', 'Pilih PNG, JPEG, atau WebP dengan ukuran maksimal 5 MB.');
      return;
    }
    if (kind === 'icon') {
      try {
        const bitmap = await createImageBitmap(file);
        const ok = bitmap.width >= 512 && bitmap.width === bitmap.height;
        bitmap.close();
        if (!ok) { notify.error('App icon harus persegi dan minimal 512 × 512 piksel.'); return; }
      } catch {
        notify.error('Gambar app icon tidak dapat dibaca.');
        return;
      }
    }
    setUploading(kind);
    try {
      const updated = await uploadAndroidAsset(websiteId, kind, file);
      if (activeId.current === websiteId) applyConfig(updated);
      notify.success(kind === 'icon' ? 'App icon diperbarui.' : 'Splash screen diperbarui.');
    } catch (err) {
      notify.error('Gagal mengunggah gambar.', errorMessage(err));
    } finally {
      setUploading(null);
    }
  };

  const removeImage = async (kind: ImageKind): Promise<void> => {
    setRemoving(kind);
    try {
      const updated = await removeAndroidAsset(websiteId, kind);
      if (activeId.current === websiteId) applyConfig(updated);
      notify.success(kind === 'icon' ? 'App icon dihapus.' : 'Splash screen dihapus.');
    } catch (err) {
      notify.error('Gagal menghapus gambar.', errorMessage(err));
    } finally {
      setRemoving(null);
    }
  };

  const retireFingerprint = async (fingerprint: string): Promise<void> => {
    const ok = await confirm({
      title: 'Pensiunkan fingerprint?',
      description: 'Fingerprint ini tidak lagi dipercaya. Build yang sudah ditandatangani dengan key ini mungkin tidak dapat membuka TWA.',
      confirmLabel: 'Ya, pensiunkan',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const updated = await retireSigningFingerprint(websiteId, fingerprint);
      if (activeId.current === websiteId) applyConfig(updated);
      notify.success('Fingerprint signing dipensiunkan.');
    } catch (err) {
      notify.error('Gagal memensiunkan fingerprint.', errorMessage(err));
    }
  };

  return {
    loading, loadError, config, form, updateForm, dirty, keystore, updateKeystore, fingerprintInput, updateFingerprints,
    saving, steps, saveAll, uploading, removing, uploadImage, removeImage, retireFingerprint, dialog,
  };
}
