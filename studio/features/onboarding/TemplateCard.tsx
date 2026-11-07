'use client';

import type { WebsiteTemplateDto } from '@/studio/api/types';

import { isPaidTemplate } from './use-template-catalog';
import { templateAuthor, templatePages, templatePriceLabel } from './template-meta';
import { TemplateThumb } from './TemplateThumb';

export interface TemplateCardProps {
  template: WebsiteTemplateDto;
  fitText: string | null;
  onOpen: () => void;
}

export function OfficialBadge() {
  return <span className="rounded-full bg-primary-50 px-[7px] py-px text-[11px] font-bold text-primary">Resmi</span>;
}

/** Kartu marketplace (artboard Wizard-Template): sketsa 190px, nama + pill harga, pembuat, halaman · kecocokan. */
export function TemplateCard({ template, fitText, onOpen }: TemplateCardProps) {
  const author = templateAuthor(template);
  const pages = templatePages(template).length;
  const price = templatePriceLabel(template);
  const paid = isPaidTemplate(template);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${template.name}, ${price}. Lihat detail`}
      className="flex w-full flex-col overflow-hidden rounded-2xl border border-default-200 bg-white text-left text-foreground shadow-[0_1px_2px_rgba(24,24,27,0.04)] transition-shadow hover:shadow-[0_8px_24px_rgba(24,24,27,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <TemplateThumb template={template} />
      <span className="flex flex-col gap-1.5 px-4 pb-4 pt-3.5">
        <span className="flex items-center justify-between gap-2">
          <span className="text-base font-extrabold">{template.name}</span>
          <span
            className={`shrink-0 rounded-full px-2.5 py-[3px] text-[13px] font-extrabold ${paid ? 'bg-foreground text-white' : 'bg-[#F0FDF4] text-success'}`}
          >
            {price}
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-[13px] text-default-600">
          oleh {author.name}
          {author.official && <OfficialBadge />}
        </span>
        <span className="text-xs text-default-500">
          {pages} halaman{fitText ? ` · ${fitText}` : ''}
        </span>
      </span>
    </button>
  );
}
