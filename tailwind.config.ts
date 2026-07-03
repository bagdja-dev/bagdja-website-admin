import type { Config } from 'tailwindcss';
import { heroui } from '@heroui/react';

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
  plugins: [heroui() as unknown as NonNullable<Config['plugins']>[number]],
};

export default config;
