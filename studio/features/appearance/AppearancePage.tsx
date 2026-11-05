'use client';

import { useState } from 'react';

import { Button } from '@heroui/react';

import { PageList } from './PageList';
import { UnderConstructionState } from '@/studio/features/placeholders/UnderConstructionState';

type AppearanceTab = 'pages' | 'footer' | 'theme' | 'template';

const TABS: { key: AppearanceTab; label: string; icon: string }[] = [
  { key: 'pages', label: 'Halaman', icon: 'layout' },
  { key: 'footer', label: 'Footer', icon: 'layout' },
  { key: 'theme', label: 'Tema &amp; Warna', icon: 'settings' },
  { key: 'template', label: 'Template', icon: 'layout' },
];

export function AppearancePage() {
  const [tab, setTab] = useState<AppearanceTab>('pages');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1 border-b border-default-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`min-h-[40px] px-4 text-sm font-medium transition-colors border-b-2 ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-default-500 hover:text-default-600 hover:bg-default-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-4 flex-1">
        {tab === 'pages' ? <PageList /> : (
          <UnderConstructionState label={TABS.find((t) => t.key === tab)!.label} icon="settings" />
        )}
      </div>
    </div>
  );
}
