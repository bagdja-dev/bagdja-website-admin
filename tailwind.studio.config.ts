import type { Config } from 'tailwindcss';
import { heroui } from '@heroui/react';

import { STUDIO_THEME_NAME, studioThemes } from './studio/theme/studio-theme';

/**
 * Konfigurasi Tailwind khusus Studio, dipakai oleh Tailwind CLI (`npm run studio:css`) untuk
 * `studio/theme/studio.source.css` → `studio.generated.css` (diimpor hanya oleh `app/studio/layout.tsx`).
 *
 * - `important: '.studio'` membuat semua utilitas di file ini hanya berlaku di
 *   bawah elemen ber-kelas `studio`, sehingga walaupun CSS ini tetap termuat
 *   setelah navigasi client ke `/dashboard`, dashboard lama tidak terpengaruh.
 * - Memindai dist `@heroui/theme` (ter-nest di bawah `@heroui/react` pada
 *   instalasi ini) agar kelas komponen HeroUI (Drawer, Table, Toast, dst.)
 *   ikut terbentuk untuk Studio — glob di `tailwind.config.ts` lama tidak
 *   menemukan paket tersebut.
 * - Tanpa preflight/base: reset & variabel tema sudah datang dari globals.css.
 */
const config: Config = {
  content: [
    './studio/**/*.{ts,tsx}',
    './app/studio/**/*.{ts,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,mjs}',
    './node_modules/@heroui/react/node_modules/@heroui/theme/dist/**/*.{js,mjs}',
  ],
  important: `.${STUDIO_THEME_NAME}`,
  darkMode: 'class',
  corePlugins: { preflight: false },
  theme: {
    extend: {},
  },
  plugins: [heroui({ themes: studioThemes }) as unknown as NonNullable<Config['plugins']>[number]],
};

export default config;
