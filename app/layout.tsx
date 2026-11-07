import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bagdja Website — Website Bisnis Tanpa Coding',
  description:
    'Buat website bisnis tanpa coding. Tampilkan halaman, katalog produk atau jasa, dan kelola pesanan serta percakapan pelanggan melalui Bagdja Studio.',
  keywords: [
    'buat toko online',
    'buat website bisnis',
    'buat e-commerce Indonesia',
    'platform toko online Indonesia',
    'toko online untuk UMKM',
    'website jualan online',
    'website jasa',
  ],
  icons: {
    icon: '/studio-icon.svg',
    apple: '/studio-icon.svg',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
