'use client';

import { useEffect, useState } from 'react';

import { IdentityEditor } from './IdentityEditor';
import { PageList } from './PageList';
import { FooterEditor } from './FooterEditor';
import { ThemeEditor } from './ThemeEditor';
import { TemplateEditor } from './TemplateEditor';

type AppearanceTab = 'identity' | 'pages' | 'footer' | 'theme' | 'template';

const TABS: { key: AppearanceTab; label: string; icon: string }[] = [
  { key: 'pages', label: 'Halaman', icon: 'layout' },
  { key: 'identity', label: 'Identitas', icon: 'settings' },
  { key: 'footer', label: 'Footer', icon: 'layout' },
  { key: 'theme', label: 'Tema & Warna', icon: 'settings' },
  { key: 'template', label: 'Template', icon: 'layout' },
];

export function AppearancePage() {
  const [tab, setTab] = useState<AppearanceTab>('pages');

  // Tautan dalam (mis. checklist Beranda) memilih tab lewat `?tab=…`.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    const match = TABS.find((t) => t.key === requested);
    if (match) setTab(match.key);
  }, []);

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
        {tab === 'identity' ? <IdentityEditor /> : tab === 'pages' ? <PageList /> : tab === 'footer' ? <FooterEditor /> : tab === 'theme' ? <ThemeEditor /> : <TemplateEditor />}
      </div>
    </div>
  );
}
