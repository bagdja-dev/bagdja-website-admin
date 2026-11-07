/** Sketsa kecil bentuk section untuk kartu "Tambah bagian" (artboard Editor-Tambah-Bagian). */
export type SectionThumbKind = 'hero' | 'grid' | 'text' | 'split' | 'steps' | 'quote' | 'logos' | 'list';

const KIND_BY_TYPE: Record<string, SectionThumbKind> = {
  hero: 'hero',
  cta: 'text',
  text_block: 'text',
  rich_text: 'text',
  about: 'split',
  featured_product: 'split',
  contact: 'split',
  features_grid: 'grid',
  gallery: 'grid',
  services_grid: 'grid',
  products_grid: 'grid',
  category_grid: 'grid',
  blog_list: 'grid',
  testimonial: 'quote',
  logo_wall: 'logos',
  service_process_section: 'steps',
  locations_list: 'list',
  faq_list: 'list',
  blog_collection: 'list',
  blog_search: 'list',
};

export function sectionThumbKind(type: string): SectionThumbKind {
  return KIND_BY_TYPE[type] ?? 'text';
}

const BAR = 'rounded-[3px]';

export function SectionThumb({ kind }: { kind: SectionThumbKind }) {
  return (
    <span aria-hidden="true" className="flex h-[84px] items-center rounded-[10px] bg-[#1C1917] p-3">
      {kind === 'hero' && (
        <span className="flex w-full flex-col gap-[5px]">
          <span className={`h-[5px] w-[30%] ${BAR} bg-[#CA8A04]`} />
          <span className={`h-2.5 w-4/5 ${BAR} bg-[#FAFAF9]`} />
          <span className={`h-2.5 w-3/5 ${BAR} bg-[#FAFAF9] opacity-60`} />
          <span className="mt-1 h-3 w-[32%] rounded bg-[#CA8A04]" />
        </span>
      )}
      {kind === 'grid' && (
        <span className="grid w-full grid-cols-3 gap-[5px]">
          <span className="h-10 rounded bg-[#57534E]" />
          <span className="h-10 rounded bg-[#57534E]" />
          <span className="h-10 rounded bg-[#57534E]" />
        </span>
      )}
      {kind === 'text' && (
        <span className="flex w-full flex-col gap-[5px]">
          <span className={`h-2 w-[45%] ${BAR} bg-[#FAFAF9]`} />
          <span className="h-[5px] w-[95%] rounded-sm bg-[#A8A29E]" />
          <span className="h-[5px] w-[90%] rounded-sm bg-[#A8A29E]" />
          <span className="h-[5px] w-[70%] rounded-sm bg-[#A8A29E]" />
        </span>
      )}
      {kind === 'split' && (
        <span className="flex w-full items-center gap-2">
          <span className="flex flex-1 flex-col gap-[5px]">
            <span className={`h-2 w-[70%] ${BAR} bg-[#FAFAF9]`} />
            <span className="h-[5px] w-full rounded-sm bg-[#A8A29E]" />
            <span className="h-[5px] w-[85%] rounded-sm bg-[#A8A29E]" />
          </span>
          <span className="h-[46px] flex-1 rounded-[5px] bg-[#57534E]" />
        </span>
      )}
      {kind === 'steps' && (
        <span className="flex w-full items-center justify-between">
          <span className="h-[18px] w-[18px] rounded-full bg-[#CA8A04]" />
          <span className="h-0.5 flex-1 bg-[#78716C]" />
          <span className="h-[18px] w-[18px] rounded-full bg-[#CA8A04]" />
          <span className="h-0.5 flex-1 bg-[#78716C]" />
          <span className="h-[18px] w-[18px] rounded-full bg-[#CA8A04]" />
        </span>
      )}
      {kind === 'quote' && (
        <span className="grid w-full grid-cols-2 gap-1.5">
          <span className="h-10 rounded-[5px] border-l-[3px] border-[#CA8A04] bg-[#44403C]" />
          <span className="h-10 rounded-[5px] border-l-[3px] border-[#CA8A04] bg-[#44403C]" />
        </span>
      )}
      {kind === 'logos' && (
        <span className="flex w-full justify-between">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-3.5 w-[30px] ${BAR} bg-[#A8A29E]`} />
          ))}
        </span>
      )}
      {kind === 'list' && (
        <span className="flex w-full flex-col gap-[5px]">
          <span className={`h-3 ${BAR} bg-[#44403C]`} />
          <span className={`h-3 ${BAR} bg-[#44403C]`} />
          <span className={`h-3 ${BAR} bg-[#44403C]`} />
        </span>
      )}
    </span>
  );
}
