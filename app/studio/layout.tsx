import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

import { STUDIO_THEME_NAME } from '@/studio/theme/studio-theme';
import { StudioRoot } from '@/studio/ui/StudioRoot';
import '@/studio/theme/studio.generated.css';

/** Font artboard Studio. Hanya dimuat di segmen /studio; dashboard lama tetap Inter. */
const studioFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

/** Ikon Studio hanya untuk segmen /studio; root layout (dashboard lama) tetap memakai ikon lama. */
export const metadata: Metadata = {
  title: 'Studio · bagdja website',
  icons: { icon: '/studio-icon.svg', apple: '/studio-icon.svg' },
};

/** Tema `studio` (plan §3.13) dipasang hanya di sini lewat className. */
export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${STUDIO_THEME_NAME} ${studioFont.className}`}>
      <div className="min-h-screen bg-background text-foreground">
        <StudioRoot bodyClassName={studioFont.className}>{children}</StudioRoot>
      </div>
    </div>
  );
}
