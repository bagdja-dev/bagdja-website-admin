'use client';

import type { RefObject } from 'react';

import type { PagePreviewDevice } from '@/studio/lib/template-preview';
import { Icon } from '@/studio/ui/icons';
import { ScaledFrame } from '@/studio/ui/primitives/ScaledFrame';

import type { PreviewChannelStatus } from './use-preview-channel';

/** Lebar artboard HP (plan §3.8: toggle desktop / 390px). */
const MOBILE_WIDTH = 390;

const DEVICES: Array<{ id: PagePreviewDevice; label: string }> = [
  { id: 'desktop', label: 'Desktop' },
  { id: 'mobile', label: 'HP' },
];

export interface PagePreviewPanelProps {
  iframeRef: RefObject<HTMLIFrameElement>;
  previewUrl: string | null;
  frameKey: string;
  status: PreviewChannelStatus;
  device: PagePreviewDevice;
  onDeviceChange: (device: PagePreviewDevice) => void;
  onFrameLoad: () => void;
  onReload: () => void;
  /** Ada perubahan draft yang belum disimpan. */
  dirty: boolean;
  pageTitle: string;
}

/** Kolom tengah editor halaman: iframe renderer sungguhan + toggle perangkat + chip status. */
export function PagePreviewPanel({
  iframeRef,
  previewUrl,
  frameKey,
  status,
  device,
  onDeviceChange,
  onFrameLoad,
  onReload,
  dirty,
  pageTitle,
}: PagePreviewPanelProps) {
  const unavailable = !previewUrl || status === 'unreachable';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-default-100 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[12px] font-semibold uppercase tracking-wider text-default-600">Pratinjau</span>
          {dirty ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F0CFDD] bg-[#FBF2F6] px-2.5 py-0.5 text-[11px] font-medium text-[#7A1E48]">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#E0679A]" />
              Pratinjau draft — belum disimpan
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-default-200 bg-default-50 px-2.5 py-0.5 text-[11px] font-medium text-default-600">
              <Icon name="check" size={11} strokeWidth={2} />
              Sama dengan website live
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div role="radiogroup" aria-label="Perangkat pratinjau" className="flex rounded-[10px] border border-default-200 p-0.5">
            {DEVICES.map((option) => {
              const active = option.id === device;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onDeviceChange(option.id)}
                  className={`rounded-[8px] px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    active ? 'bg-[#FBF2F6] text-[#7A1E48]' : 'text-default-500 hover:text-default-700'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onReload}
            disabled={!previewUrl}
            className="rounded-[8px] p-1.5 text-default-500 transition-colors hover:bg-default-100 hover:text-default-700 disabled:opacity-40"
            title="Muat ulang pratinjau"
            aria-label="Muat ulang pratinjau"
          >
            <Icon name="refresh" size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto bg-default-100 p-4">
        <div
          className="relative mx-auto h-full overflow-hidden bg-white shadow-[0_12px_32px_rgba(24,24,27,0.08)] transition-[max-width] duration-200"
          style={{
            maxWidth: device === 'mobile' ? MOBILE_WIDTH : '100%',
            borderRadius: device === 'mobile' ? 24 : 12,
          }}
        >
          {previewUrl && !unavailable ? (
            device === 'mobile' ? (
              <iframe
                key={frameKey}
                ref={iframeRef}
                src={previewUrl}
                title={`Pratinjau halaman ${pageTitle}`}
                onLoad={onFrameLoad}
                className="block h-full w-full border-0 bg-white"
              />
            ) : (
              <ScaledFrame
                key={frameKey}
                iframeRef={iframeRef}
                src={previewUrl}
                title={`Pratinjau halaman ${pageTitle}`}
                onLoad={onFrameLoad}
              />
            )
          ) : null}

          {status === 'loading' && previewUrl ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <span className="inline-flex items-center gap-2 text-[12px] font-medium text-default-500">
                <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#F0CFDD] border-t-[#7A1E48]" />
                Memuat pratinjau…
              </span>
            </div>
          ) : null}

          {unavailable ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 text-center">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#FBF2F6] text-[#7A1E48]">
                <Icon name="warning" size={20} strokeWidth={1.6} />
              </span>
              <p className="text-[14px] font-semibold text-foreground">Pratinjau belum tersedia</p>
              <p className="mt-1 max-w-[340px] text-[12px] leading-relaxed text-default-500">
                {previewUrl
                  ? 'Renderer website belum mendukung pratinjau langsung atau tidak dapat dijangkau. Perubahan tetap bisa disimpan seperti biasa.'
                  : 'Website untuk halaman ini tidak ditemukan di daftar website kamu.'}
              </p>
              {previewUrl ? (
                <button
                  type="button"
                  onClick={onReload}
                  className="mt-4 rounded-[10px] border border-[#F0CFDD] px-3 py-1.5 text-[12px] font-semibold text-[#7A1E48] transition-colors hover:bg-[#FBF2F6]"
                >
                  Coba lagi
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
