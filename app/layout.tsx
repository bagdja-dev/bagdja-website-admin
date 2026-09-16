import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Buat Toko Online dengan Custom Domain | Bagdja',
  description:
    'Buat toko online profesional untuk bisnis Indonesia dengan katalog produk, custom domain toko online, checkout, payment gateway, chat pelanggan, rating, dan review.',
  keywords: [
    'buat toko online',
    'custom domain toko online',
    'buat e-commerce Indonesia',
    'platform toko online Indonesia',
    'toko online untuk UMKM',
    'website jualan online',
    'toko online dengan payment gateway',
  ],
  icons: {
    icon: '/bagdja-cart-logo.svg',
    apple: '/bagdja-cart-logo.svg',
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
