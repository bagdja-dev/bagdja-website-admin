'use client';

import { HeroUIProvider } from '@heroui/react';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <HeroUIProvider>
      {children}
      {/* Portal target harus di dalam HeroUIProvider agar styling komponen HeroUI tetap aktif */}
      <div id="modal-root" />
    </HeroUIProvider>
  );
}
