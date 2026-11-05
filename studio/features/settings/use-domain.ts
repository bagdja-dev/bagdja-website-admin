'use client';

import { useEffect, useRef, useState } from 'react';

import {
  checkDomainVerification,
  removeWebsiteDomain,
  saveWebsiteDomain,
  startDomainVerification,
  type DomainVerifyInfoDto,
} from '@/studio/api/domain';
import { errorMessage } from '@/studio/api/client';
import type { WebsiteDto } from '@/studio/api/types';
import { useWebsiteStore } from '@/studio/stores/website-store';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import { notify } from '@/studio/ui/primitives/Toast';

export type DomainState = 'none' | 'pending' | 'active';

const DOMAIN_PATTERN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** Rapikan input domain: huruf kecil, tanpa protokol/path. */
export function normalizeDomain(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

/** Alur Domain sendiri: simpan → verifikasi otomatis → cek → lepas (lewat `DELETE /domain`). */
export function useDomain(website: WebsiteDto) {
  const refresh = useWebsiteStore((s) => s.refresh);
  const patchWebsite = useWebsiteStore((s) => s.patchWebsite);
  const { confirm, dialog } = useConfirm();
  const [input, setInput] = useState('');
  const [info, setInfo] = useState<DomainVerifyInfoDto | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const autoTried = useRef<string | null>(null);

  const saved = website.domain ?? null;
  const state: DomainState = !saved ? 'none' : website.domain_verified_at ? 'active' : 'pending';
  const normalized = normalizeDomain(input);
  const inputError = input.trim() && !DOMAIN_PATTERN.test(normalized) ? 'Format domain tidak valid, contoh: www.bisnisku.com.' : null;

  const loadRecords = async (): Promise<void> => {
    setLoadingRecords(true);
    setRecordsError(null);
    try {
      setInfo(await startDomainVerification(website.id));
    } catch (err) {
      setRecordsError(errorMessage(err, 'Gagal memuat record DNS.'));
    } finally {
      setLoadingRecords(false);
    }
  };

  // Tersimpan tapi belum terverifikasi → tampilkan record DNS otomatis (satu kali per domain; idempoten di API).
  useEffect(() => {
    if (state !== 'pending' || !saved || autoTried.current === `${website.id}:${saved}`) return;
    autoTried.current = `${website.id}:${saved}`;
    void loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, saved, website.id]);

  useEffect(() => {
    if (state === 'none' || state === 'active') setInfo(null);
  }, [state]);

  const save = async (): Promise<void> => {
    if (!normalized || inputError || saving) return;
    setSaving(true);
    try {
      const result = await saveWebsiteDomain(website.id, normalized);
      patchWebsite(website.id, { domain: result.domain ?? normalized, domain_verified_at: result.domain_verified_at ?? null });
      setInput('');
      notify.success('Domain tersimpan.', 'Tambahkan record DNS di bawah lalu verifikasi.');
    } catch (err) {
      notify.error('Gagal menyimpan domain.', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const check = async (): Promise<void> => {
    if (checking) return;
    setChecking(true);
    try {
      await checkDomainVerification(website.id);
      await refresh();
      notify.success('Domain terverifikasi dan aktif.');
    } catch (err) {
      notify.error('Belum terverifikasi.', errorMessage(err, 'Pastikan record DNS sudah benar; propagasi bisa butuh beberapa menit.'));
    } finally {
      setChecking(false);
    }
  };

  const remove = async (): Promise<void> => {
    const ok = await confirm({
      title: 'Lepas domain sendiri?',
      description: `${saved ?? 'Domain'} akan dilepas dan verifikasinya direset. Website tetap bisa dibuka lewat alamat bawaan.`,
      confirmLabel: 'Ya, lepas domain',
      tone: 'danger',
    });
    if (!ok) return;
    setRemoving(true);
    try {
      await removeWebsiteDomain(website.id);
      patchWebsite(website.id, { domain: null, domain_verified_at: null });
      setInfo(null);
      autoTried.current = null;
      await refresh();
      notify.success('Domain dilepas.');
    } catch (err) {
      notify.error('Gagal melepas domain.', errorMessage(err));
    } finally {
      setRemoving(false);
    }
  };

  return { state, saved, input, setInput, inputError, normalized, info, loadingRecords, recordsError, loadRecords, saving, checking, removing, save, check, remove, dialog };
}
