/**
 * Token warna & tema HeroUI "studio" (plan §3.13).
 *
 * File ini diimpor oleh `tailwind.config.ts` dan `tailwind.studio.config.ts`
 * (dievaluasi oleh jiti di luar bundler Next), jadi JANGAN memakai alias `@/`
 * atau mengimpor modul runtime lain di sini.
 */
import type { heroui } from '@heroui/react';

type HeroUIPluginConfig = NonNullable<Parameters<typeof heroui>[0]>;
type HeroUIThemes = NonNullable<HeroUIPluginConfig['themes']>;

/** Nama kelas/tema; dipasang di wrapper `app/studio/layout.tsx` dan di `<body>` selama Studio aktif (untuk portal). */
export const STUDIO_THEME_NAME = 'studio';

export const studioColors = {
  primary: {
    50: '#FBF2F6',
    100: '#F5DDE7',
    200: '#F0CFDD',
    300: '#DC8FB1',
    400: '#C45F8D',
    500: '#9E3567',
    600: '#7A1E48',
    700: '#641838',
    800: '#4E122C',
    900: '#380C1F',
    DEFAULT: '#7A1E48',
    foreground: '#FFFFFF',
  },
  /** Garis section terpilih di pratinjau berlatar gelap (dekoratif). */
  previewAccent: '#E0679A',
  foreground: '#18181B',
  background: '#FFFFFF',
  success: '#15803D',
  warning: '#B45309',
  danger: '#DC2626',
  dangerText: '#B91C1C',
} as const;

export const studioThemes: HeroUIThemes = {
  [STUDIO_THEME_NAME]: {
    extend: 'light',
    colors: {
      background: studioColors.background,
      foreground: studioColors.foreground,
      primary: { ...studioColors.primary },
      success: { DEFAULT: studioColors.success, foreground: '#FFFFFF' },
      warning: { DEFAULT: studioColors.warning, foreground: '#FFFFFF' },
      danger: { DEFAULT: studioColors.danger, foreground: '#FFFFFF' },
      focus: studioColors.primary.DEFAULT,
    },
  },
};
