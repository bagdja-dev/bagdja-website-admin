import { siteInitials, siteTileColor, type SiteTileWebsite } from './site-identity';

/** Logo website, atau inisial di atas warna (34px, radius 9 — artboard Sidebar). */
export function SiteTile({ website, size = 34 }: { website: SiteTileWebsite; size?: number }) {
  if (website.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logo tenant dari storage eksternal
      <img
        src={website.logo_url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-[9px] border border-default-200 bg-white object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  const color = siteTileColor(website.id);
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-[9px] text-[13px] font-extrabold"
      style={{ width: size, height: size, background: color.bg, color: color.ink }}
    >
      {siteInitials(website.name)}
    </span>
  );
}
