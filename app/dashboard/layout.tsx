'use client';

import { useState, type ReactNode } from 'react';
import { Sidebar } from '../components/sidebar';
import { Topbar } from '../components/topbar';
import { WebsiteProvider } from '../context/website-context';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <WebsiteProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar onMenuToggle={() => setSidebarOpen((v) => !v)} />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </WebsiteProvider>
  );
}
