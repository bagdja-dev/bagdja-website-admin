'use client';

/**
 * Sisi parent (Studio) protokol preview v1 — template-contract.md §4.
 * Pasangannya di renderer: `components/preview/preview-shell.tsx`.
 *
 * - Tunggu `bagdja:preview:ready` dari iframe (origin renderer saja);
 * - kirim draft section (`bagdja:preview:sections`, debounce) setiap edit;
 * - kirim `bagdja:preview:highlight` saat section dipilih di Studio;
 * - terima `bagdja:preview:select` → pilih section di panel properti.
 * Bila `ready` tidak datang (renderer lama tanpa route preview, CSP menolak,
 * jaringan), status menjadi `unreachable` supaya UI menampilkan fallback.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';

export const PREVIEW_PROTOCOL_VERSION = 1;

const MESSAGE = {
  ready: 'bagdja:preview:ready',
  sections: 'bagdja:preview:sections',
  highlight: 'bagdja:preview:highlight',
  select: 'bagdja:preview:select',
} as const;

/** Setelah iframe `load`, tunggu `ready` selama ini sebelum dianggap tidak tersedia. */
const READY_AFTER_LOAD_MS = 5000;
/** Batas total (iframe tidak pernah `load`, mis. host tidak terjangkau). */
const READY_TOTAL_MS = 20000;

export type PreviewChannelStatus = 'loading' | 'ready' | 'unreachable';

export interface PreviewDraftSection {
  id: string;
  type: string;
  content: Record<string, unknown>;
}

export interface UsePreviewChannelOptions {
  iframeRef: RefObject<HTMLIFrameElement>;
  /** URL route preview renderer; `null` = tidak ada pratinjau. */
  previewUrl: string | null;
  pageSlug: string;
  sections: PreviewDraftSection[];
  selectedId: string | null;
  onSelect: (sectionId: string) => void;
  debounceMs?: number;
}

export interface PreviewChannel {
  status: PreviewChannelStatus;
  /** Token untuk `key` iframe — berubah saat `reload()` dipanggil. */
  frameKey: string;
  reload: () => void;
  /** Pasang ke `onLoad` iframe. */
  handleFrameLoad: () => void;
}

function originOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function usePreviewChannel({
  iframeRef,
  previewUrl,
  pageSlug,
  sections,
  selectedId,
  onSelect,
  debounceMs = 300,
}: UsePreviewChannelOptions): PreviewChannel {
  const rendererOrigin = useMemo(() => originOf(previewUrl), [previewUrl]);
  const [reloadToken, setReloadToken] = useState(0);
  const [status, setStatus] = useState<PreviewChannelStatus>('loading');
  const readyRef = useRef(false);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nilai terbaru untuk handler yang terdaftar sekali.
  const latest = useRef({ sections, selectedId, pageSlug, onSelect });
  latest.current = { sections, selectedId, pageSlug, onSelect };
  /** Pilihan terakhir yang datang DARI pratinjau — tidak dipantulkan balik sebagai highlight. */
  const selectedFromPreviewRef = useRef<string | null>(null);

  const post = useCallback(
    (message: Record<string, unknown>) => {
      const target = iframeRef.current?.contentWindow;
      if (!target || !rendererOrigin || !readyRef.current) return;
      target.postMessage({ ...message, protocol: PREVIEW_PROTOCOL_VERSION }, rendererOrigin);
    },
    [iframeRef, rendererOrigin],
  );

  const sendSections = useCallback(() => {
    const { sections: draft, pageSlug: slug } = latest.current;
    post({
      type: MESSAGE.sections,
      pageSlug: slug,
      sections: draft.map(({ id, type, content }) => ({ id, type, content })),
    });
  }, [post]);

  // Reset setiap kali iframe dimuat ulang (URL/perangkat berubah atau reload()).
  useEffect(() => {
    readyRef.current = false;
    setStatus(previewUrl ? 'loading' : 'unreachable');
    if (!previewUrl) return;
    const totalTimer = setTimeout(() => {
      if (!readyRef.current) setStatus('unreachable');
    }, READY_TOTAL_MS);
    return () => {
      clearTimeout(totalTimer);
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  }, [previewUrl, reloadToken]);

  const handleFrameLoad = useCallback(() => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    if (readyRef.current) return;
    loadTimerRef.current = setTimeout(() => {
      if (!readyRef.current) setStatus('unreachable');
    }, READY_AFTER_LOAD_MS);
  }, []);

  // Pesan dari iframe — validasi ketat: sumber = iframe ini, origin = renderer, versi = 1.
  useEffect(() => {
    if (!rendererOrigin) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== rendererOrigin) return;
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const data: unknown = event.data;
      if (!isRecord(data) || data.protocol !== PREVIEW_PROTOCOL_VERSION) return;

      if (data.type === MESSAGE.ready) {
        readyRef.current = true;
        if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
        setStatus('ready');
        sendSections();
        const current = latest.current.selectedId;
        if (current) post({ type: MESSAGE.highlight, sectionId: current });
        return;
      }

      if (data.type === MESSAGE.select) {
        const sectionId = data.sectionId;
        if (typeof sectionId !== 'string' || !sectionId) return;
        if (!latest.current.sections.some((section) => section.id === sectionId)) return;
        selectedFromPreviewRef.current = sectionId;
        latest.current.onSelect(sectionId);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [iframeRef, post, rendererOrigin, sendSections]);

  // Draft → iframe (debounce).
  useEffect(() => {
    if (status !== 'ready') return;
    const timer = setTimeout(sendSections, debounceMs);
    return () => clearTimeout(timer);
  }, [debounceMs, sections, pageSlug, sendSections, status]);

  // Pilihan Studio → garis penanda di iframe.
  useEffect(() => {
    if (status !== 'ready') return;
    if (selectedId && selectedId === selectedFromPreviewRef.current) {
      selectedFromPreviewRef.current = null;
      return;
    }
    selectedFromPreviewRef.current = null;
    post({ type: MESSAGE.highlight, sectionId: selectedId });
  }, [post, selectedId, status]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return {
    status,
    frameKey: `${previewUrl ?? 'none'}#${reloadToken}`,
    reload,
    handleFrameLoad,
  };
}
