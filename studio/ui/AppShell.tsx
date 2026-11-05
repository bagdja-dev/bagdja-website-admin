'use client';

import { Drawer, DrawerBody, DrawerContent } from '@heroui/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { NotificationToaster } from '@/studio/features/notifications/NotificationToaster';
import { RealtimeProvider } from '@/studio/features/realtime/RealtimeProvider';
import { useModulesStore } from '@/studio/stores/modules-store';
import { useActiveWebsite, useWebsiteStore } from '@/studio/stores/website-store';

import { ModuleGate } from './module-gate/ModuleGate';
import { ModulesErrorBanner, ShellError, ShellLoading } from './shell/ShellStatus';
import { Sidebar } from './shell/Sidebar';
import { Topbar } from './shell/Topbar';
import { useStudioBootstrap } from './shell/use-studio-bootstrap';

const ONBOARDING_PATH = '/studio/onboarding';
/** Rute wizard layar penuh (tanpa sidebar/topbar). */
const FULLSCREEN_PATHS: readonly string[] = [ONBOARDING_PATH, '/studio/websites/new'];

function ShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const modulesError = useModulesStore((s) => (s.status === 'error' ? s.errorMessage : null));
  const retryModules = useModulesStore((s) => s.refresh);

  useEffect(() => setDrawerOpen(false), [pathname]);

  return (
    <div className="flex min-h-screen bg-default-100">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-default-200 lg:block">
        <Sidebar />
      </aside>

      <Drawer
        isOpen={drawerOpen}
        onOpenChange={setDrawerOpen}
        placement="left"
        size="xs"
        hideCloseButton
        classNames={{ base: 'max-w-[min(17rem,85vw)] rounded-none' }}
      >
        <DrawerContent>
          <DrawerBody className="p-0">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setDrawerOpen(true)} />
        <main className="w-full max-w-[1100px] flex-1 px-3 pb-8 pt-3 sm:px-8 sm:pt-5">
          {modulesError && <ModulesErrorBanner message={modulesError} onRetry={() => void retryModules()} />}
          <ModuleGate>{children}</ModuleGate>
        </main>
      </div>
      <NotificationToaster />
    </div>
  );
}

/**
 * Shell Studio: bootstrap store → (loading | galat | belum punya website | onboarding layar penuh | shell lengkap).
 * Urutan provider sama dengan dashboard lama: website → realtime → sidebar/topbar/main → toaster.
 */
export function AppShell({ children }: { children: ReactNode }) {
  useStudioBootstrap();
  const pathname = usePathname();
  const router = useRouter();
  const status = useWebsiteStore((s) => s.status);
  const errorMessage = useWebsiteStore((s) => s.errorMessage);
  const refresh = useWebsiteStore((s) => s.refresh);
  const active = useActiveWebsite();
  const isOnboarding = FULLSCREEN_PATHS.includes(pathname);
  const hasNoWebsite = status === 'ready' && !active;

  // Hanya saat respons 200 berisi daftar kosong (bukan saat galat) — plan S3.
  useEffect(() => {
    if (hasNoWebsite && !isOnboarding) router.replace(ONBOARDING_PATH);
  }, [hasNoWebsite, isOnboarding, router]);

  if (isOnboarding && status !== 'error') {
    return <RealtimeProvider>{children}</RealtimeProvider>;
  }
  if (status === 'idle' || status === 'loading') return <ShellLoading />;
  if (status === 'error') {
    return <ShellError message={errorMessage ?? 'Daftar website gagal dimuat.'} onRetry={() => void refresh()} />;
  }
  // Belum punya website → efek di atas mengarahkan ke wizard; tampilkan loading selama redirect.
  if (hasNoWebsite) return <ShellLoading label="Menyiapkan pembuatan website…" />;

  return (
    <RealtimeProvider>
      <ShellFrame>{children}</ShellFrame>
    </RealtimeProvider>
  );
}
