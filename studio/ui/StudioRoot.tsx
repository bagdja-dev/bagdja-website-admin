'use client';

import { useEffect, type ReactNode } from 'react';

import { STUDIO_THEME_NAME } from '@/studio/theme/studio-theme';

import { AppShell } from './AppShell';
import { StudioToastProvider } from './primitives/Toast';

/**
 * Root client Studio. Kelas tema `studio` juga dipasang di `<body>` selama
 * Studio ter-mount, supaya konten portal HeroUI (Modal, Drawer, Dropdown,
 * Toast — dirender di luar wrapper layout) ikut memakai token, utilitas, dan font Studio.
 * Dilepas saat keluar dari /studio sehingga dashboard lama tidak terpengaruh.
 */
export function StudioRoot({ children, bodyClassName }: { children: ReactNode; bodyClassName?: string }) {
  useEffect(() => {
    const classes = [STUDIO_THEME_NAME, ...(bodyClassName ? bodyClassName.split(' ') : [])].filter(Boolean);
    document.body.classList.add(...classes);
    return () => document.body.classList.remove(...classes);
  }, [bodyClassName]);

  return (
    <>
      <AppShell>{children}</AppShell>
      <StudioToastProvider />
    </>
  );
}
