import type { Config } from 'tailwindcss';
import { heroui } from '@heroui/react';

import { studioThemes } from './studio/theme/studio-theme';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  darkMode: 'class',
  // heroui() menyediakan plugin dengan API PluginAPI dari @heroui/theme;
  // typing-nya sedikit berbeda dengan Tailwind Config['plugins'], jadi
  // di-cast agar TypeScript strict lolos tanpa mengubah runtime behavior.
  // Tema `studio` (plan §3.13) hanya mendefinisikan variabel CSS di bawah
  // selector `.studio` / `[data-theme="studio"]`, jadi dashboard lama yang
  // memakai tema default (light) tidak berubah. Kelas utilitas Studio sendiri
  // dikompilasi terpisah lewat `tailwind.studio.config.ts` (lihat studio/theme/studio.source.css).
  plugins: [heroui({ themes: studioThemes }) as unknown as NonNullable<Config['plugins']>[number]],
};

export default config;
