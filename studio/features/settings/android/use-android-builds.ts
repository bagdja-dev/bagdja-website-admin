'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createAndroidBuild,
  fetchAndroidBuild,
  fetchAndroidBuilds,
  type AndroidBuildDto,
  type AndroidBuildRequestDto,
} from '@/studio/api/android';
import { errorMessage } from '@/studio/api/client';
import { notify } from '@/studio/ui/primitives/Toast';

import { POLL_INTERVAL_MS, isTerminalStatus } from './android-utils';

interface PendingRetry {
  key: string;
  payload: AndroidBuildRequestDto;
}

/** Riwayat build + polling 5 detik selama ada build berjalan, mulai build (Idempotency-Key), unduh artifact. */
export function useAndroidBuilds(websiteId: string, enabled: boolean) {
  const [builds, setBuilds] = useState<AndroidBuildDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [retry, setRetry] = useState<PendingRetry | null>(null);
  const activeId = useRef(websiteId);
  activeId.current = websiteId;

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const next = await fetchAndroidBuilds(websiteId);
      if (activeId.current === websiteId) setBuilds(next);
    } catch (err) {
      notify.error('Riwayat build gagal dimuat.', errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    setBuilds([]);
    setRetry(null);
    if (enabled) void refresh();
  }, [websiteId, enabled, refresh]);

  const running = builds.some((b) => !isTerminalStatus(b.status));

  useEffect(() => {
    if (!enabled || !running) return undefined;
    let cancelled = false;
    const timer = window.setInterval(() => {
      fetchAndroidBuilds(websiteId)
        .then((next) => { if (!cancelled && activeId.current === websiteId) setBuilds(next); })
        .catch(() => { /* polling: coba lagi di putaran berikutnya */ });
    }, POLL_INTERVAL_MS);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [enabled, running, websiteId]);

  const start = async (payload: AndroidBuildRequestDto, again?: PendingRetry): Promise<void> => {
    const request = again ?? { key: crypto.randomUUID(), payload };
    setSubmitting(true);
    try {
      const created = await createAndroidBuild(websiteId, request.payload, request.key);
      if (activeId.current !== websiteId) return;
      setRetry(null);
      setBuilds((cur) => [created, ...cur.filter((b) => b.id !== created.id)]);
      notify.success('Build masuk antrean.', 'Status diperbarui otomatis.');
    } catch (err) {
      setRetry(request);
      notify.error('Build gagal dimulai.', errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const download = async (jobId: string): Promise<void> => {
    setDownloadingId(jobId);
    try {
      const latest = await fetchAndroidBuild(websiteId, jobId);
      if (!latest.artifact_url) throw new Error('URL artifact belum tersedia. Segarkan riwayat setelah build berhasil.');
      const url = new URL(latest.artifact_url);
      if (url.protocol !== 'https:') throw new Error('URL artifact tidak aman dan tidak dapat dibuka.');
      if (latest.artifact_url_expires_at) {
        const expires = new Date(latest.artifact_url_expires_at).getTime();
        if (Number.isNaN(expires) || expires <= Date.now()) throw new Error('URL unduhan sudah kedaluwarsa. Segarkan riwayat build lalu coba lagi.');
      }
      window.location.assign(url.toString());
    } catch (err) {
      notify.error('Gagal mengunduh.', errorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  };

  return { builds, loading, running, submitting, downloadingId, retry, refresh, start, download };
}
