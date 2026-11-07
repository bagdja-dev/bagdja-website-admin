import { studioColors } from '@/studio/theme/studio-theme';

export type BrandLogoSize = 'sm' | 'md' | 'lg' | 'xl';

/** Ukuran artboard: sm = sidebar/HP (28px, teks 16), md = header wizard (32px, teks 18). */
const MARK_PX: Readonly<Record<BrandLogoSize, number>> = { sm: 28, md: 32, lg: 40, xl: 56 };
const TEXT_CLASS: Readonly<Record<BrandLogoSize, string>> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl',
};

export interface BrandMarkProps {
  size?: BrandLogoSize;
  /** `inverted`: kotak putih + blok burgundi, untuk latar burgundi/gelap. */
  inverted?: boolean;
  className?: string;
  /** Isi bila mark berdiri sendiri (tanpa teks); kosong = dekoratif. */
  title?: string;
}

/** Logomark konsep A "Susun" (plan §3.13). Status: konsep arah, belum final desainer. */
export function BrandMark({ size = 'md', inverted = false, className, title }: BrandMarkProps) {
  const px = MARK_PX[size];
  const box = inverted ? '#FFFFFF' : studioColors.primary.DEFAULT;
  const block = inverted ? studioColors.primary.DEFAULT : '#FFFFFF';
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 48 48"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width="48" height="48" rx="12" fill={box} />
      <rect x="11" y="11" width="26" height="8" rx="2.5" fill={block} />
      <rect x="11" y="22" width="12" height="15" rx="2.5" fill={block} />
      <rect x="26" y="22" width="11" height="6" rx="2" fill={block} opacity=".7" />
      <rect x="26" y="31" width="11" height="6" rx="2" fill={block} opacity=".7" />
    </svg>
  );
}

export interface BrandLogoProps extends Omit<BrandMarkProps, 'title'> {
  /** `false` = hanya mark (dengan label aksesibel). */
  showWordmark?: boolean;
}

/** Lockup: mark + "**bagdja** website" (nama produk sementara, plan §3.13). */
export function BrandLogo({ size = 'md', inverted = false, showWordmark = true, className }: BrandLogoProps) {
  if (!showWordmark) return <BrandMark size={size} inverted={inverted} className={className} title="bagdja website" />;
  return (
    <span className={`inline-flex items-center ${size === 'sm' ? 'gap-2' : 'gap-2.5'} ${className ?? ''}`}>
      <BrandMark size={size} inverted={inverted} />
      <span className={`${TEXT_CLASS[size]} leading-none tracking-[-0.02em]`}>
        <span className={`font-extrabold ${inverted ? 'text-white' : 'text-foreground'}`}>bagdja</span>
        <span className={`font-medium ${inverted ? 'text-primary-100' : 'text-primary'}`}> website</span>
      </span>
    </span>
  );
}
