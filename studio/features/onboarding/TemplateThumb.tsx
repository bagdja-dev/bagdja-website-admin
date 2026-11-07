import type { WebsiteTemplateDto } from '@/studio/api/types';
import { buildTemplatePreviewUrl, templatePreviewImage } from '@/studio/lib/template-preview';
import { ScaledFrame } from '@/studio/ui/primitives/ScaledFrame';

import { templateSwatch } from './template-meta';

/**
 * Thumbnail kartu (artboard Wizard-Template): gambar pratinjau bila ada; selain itu
 * sketsa 190px dari warna template — logo, menu, eyebrow, judul 2 baris, CTA, 3 kartu.
 */
export function TemplateThumb({ template, height = 190 }: { template: WebsiteTemplateDto; height?: number }) {
  const previewUrl = buildTemplatePreviewUrl(template);
  if (previewUrl) {
    return (
      <ScaledFrame
        src={previewUrl}
        title={`Pratinjau template ${template.name}`}
        height={height}
        loading="lazy"
      />
    );
  }

  const image = templatePreviewImage(template);
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element -- aset template dari banyak host
    return <img src={image} alt="" className="w-full object-cover" style={{ height }} />;
  }
  const c = templateSwatch(template);
  return (
    <span aria-hidden="true" className="flex w-full flex-col gap-[7px] px-4 py-3.5" style={{ height, background: c.background }}>
      <span className="flex items-center justify-between">
        <span className="h-[7px] w-[70px] rounded-[3px] opacity-90" style={{ background: c.text }} />
        <span className="flex gap-[5px]">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1 w-4 rounded-sm opacity-40" style={{ background: c.text }} />
          ))}
        </span>
      </span>
      <span className="mt-2.5 h-[5px] w-[34%] rounded-sm" style={{ background: c.accent }} />
      <span className="h-[13px] w-[78%] rounded opacity-90" style={{ background: c.text }} />
      <span className="h-[13px] w-[56%] rounded opacity-90" style={{ background: c.text }} />
      <span className="h-4 w-[28%] rounded-[5px]" style={{ background: c.accent }} />
      <span className="mt-auto grid grid-cols-3 gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-[38px] rounded-md" style={{ background: c.card }} />
        ))}
      </span>
    </span>
  );
}
