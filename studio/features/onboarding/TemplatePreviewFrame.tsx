'use client';

import type { WebsiteTemplateDto } from '@/studio/api/types';
import { buildTemplatePreviewUrl, displayHost, type TemplatePreviewProfile } from '@/studio/lib/template-preview';

import { TemplateThumb } from './TemplateThumb';

export type PreviewDevice = 'desktop' | 'mobile';

export interface TemplatePreviewFrameProps {
  template: WebsiteTemplateDto;
  profile?: TemplatePreviewProfile;
  slug?: string;
  device?: PreviewDevice;
  /** `compact` = bingkai detail template (titik 9px, alamat 11px); `regular` = pratinjau langkah 3. */
  size?: 'compact' | 'regular';
  /** Tinggi area situs (px). */
  height?: number;
}

/** Bingkai browser artboard (3 titik + kolom alamat) berisi iframe renderer `?preview=1`. */
export function TemplatePreviewFrame({
  template,
  profile,
  slug,
  device = 'desktop',
  size = 'regular',
  height = 560,
}: TemplatePreviewFrameProps) {
  const url = buildTemplatePreviewUrl(template, profile);
  const host = displayHost(slug?.trim() ? slug : 'nama-bisnis');
  const compact = size === 'compact';
  const dot = compact ? 'h-[9px] w-[9px]' : 'h-2.5 w-2.5';

  return (
    <div
      className={`w-full overflow-hidden bg-white ${
        compact
          ? `rounded-xl shadow-[0_12px_32px_rgba(24,24,27,0.12)] ${device === 'mobile' ? 'max-w-[380px]' : 'max-w-[820px]'}`
          : 'rounded-[14px] border border-default-200 shadow-[0_12px_32px_rgba(24,24,27,0.08)]'
      }`}
    >
      <div className={`flex items-center border-b border-default-200 bg-default-100 ${compact ? 'gap-2.5 px-3 py-[9px]' : 'gap-3 px-3.5 py-2.5'}`}>
        <span aria-hidden="true" className={`flex ${compact ? 'gap-[5px]' : 'gap-1.5'}`}>
          <span className={`${dot} rounded-full bg-default-300`} />
          <span className={`${dot} rounded-full bg-default-300`} />
          <span className={`${dot} rounded-full bg-default-300`} />
        </span>
        <span className={`min-w-0 flex-1 truncate bg-white text-default-600 ${compact ? 'rounded-[7px] px-2.5 py-1 text-[11px]' : 'rounded-lg px-3 py-[5px] text-xs'}`}>
          {host}
        </span>
      </div>
      {url ? (
        <iframe
          key={url}
          src={url}
          title={`Pratinjau template ${template.name}`}
          className="block w-full border-0 bg-white"
          style={{ height: device === 'mobile' ? 680 : height }}
          loading="lazy"
        />
      ) : (
        <div>
          <TemplateThumb template={template} height={height} />
          <p className="px-4 py-3 text-center text-[13px] text-default-600">Pratinjau langsung belum tersedia untuk template ini.</p>
        </div>
      )}
    </div>
  );
}
