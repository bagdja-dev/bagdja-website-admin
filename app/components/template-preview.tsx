'use client';

import { Button } from '@heroui/react';

import {
  buildTemplatePreviewUrl,
  IFRAME_PREVIEW_TEMPLATES,
  openTemplatePreview,
  type WebsitePreviewProfile,
} from '../lib/preview-url';
import type { WebsiteTemplate } from '../lib/types';

export type PreviewViewport = 'desktop' | 'mobile';

interface TemplatePreviewProps {
  template: WebsiteTemplate | null;
  profile?: WebsitePreviewProfile;
  /** @deprecated use profile.name */
  websiteName?: string;
  viewport?: PreviewViewport;
  onViewportChange?: (viewport: PreviewViewport) => void;
  showToolbar?: boolean;
  interactive?: boolean;
  className?: string;
}

const IFRAME_SANDBOX = 'allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox';

function PreviewToolbar({
  viewport,
  onViewportChange,
  onOpenTab,
  canOpenTab,
}: {
  viewport: PreviewViewport;
  onViewportChange: (v: PreviewViewport) => void;
  onOpenTab: () => void;
  canOpenTab: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-default-200 bg-default-50 px-4 py-3">
      <div className="flex rounded-lg border border-default-200 bg-white p-0.5">
        <button
          type="button"
          onClick={() => onViewportChange('desktop')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            viewport === 'desktop'
              ? 'bg-primary text-white shadow-sm'
              : 'text-default-600 hover:bg-default-100'
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
          </svg>
          Desktop
        </button>
        <button
          type="button"
          onClick={() => onViewportChange('mobile')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            viewport === 'mobile'
              ? 'bg-primary text-white shadow-sm'
              : 'text-default-600 hover:bg-default-100'
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
          </svg>
          Mobile
        </button>
      </div>
      {canOpenTab && (
        <Button size="sm" variant="flat" onPress={onOpenTab}>
          Buka tab baru ↗
        </Button>
      )}
    </div>
  );
}

function InteractiveIframePreview({
  src,
  viewport,
  interactive,
}: {
  src: string;
  viewport: PreviewViewport;
  interactive: boolean;
}) {
  if (viewport === 'mobile') {
    return (
      <div className="flex justify-center bg-gradient-to-b from-default-100 to-default-50 px-4 py-8">
        <div className="overflow-hidden rounded-[2rem] border-[10px] border-zinc-800 bg-zinc-800 shadow-2xl">
          <div className="flex h-6 items-center justify-center bg-zinc-800">
            <div className="h-1 w-16 rounded-full bg-zinc-600" />
          </div>
          <iframe
            key={`mobile-${src}`}
            src={src}
            title="Mobile preview"
            className={`block h-[667px] w-[375px] border-0 bg-white ${interactive ? '' : 'pointer-events-none'}`}
            sandbox={IFRAME_SANDBOX}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-default-50 p-2">
      <iframe
        key={`desktop-${src}`}
        src={src}
        title="Desktop preview"
        className={`block h-[min(680px,70vh)] w-full min-h-[480px] rounded-lg border border-default-200 bg-white ${interactive ? '' : 'pointer-events-none'}`}
        sandbox={IFRAME_SANDBOX}
      />
    </div>
  );
}

function StaticFallbackPreview({
  template,
  profile,
}: {
  template: WebsiteTemplate;
  profile: WebsitePreviewProfile;
}) {
  const title = profile.name?.trim() || 'Nama Website Anda';
  const tagline =
    profile.tagline?.trim() ||
    template.description ||
    'Deskripsi singkat bisnis Anda akan tampil di sini.';

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-default-100 px-6 py-12 text-center">
      <div className="w-full max-w-lg rounded-2xl border border-default-200 bg-white px-8 py-10 shadow-sm">
        {profile.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.logo_url}
            alt="Logo"
            className="mx-auto mb-4 h-14 w-14 rounded-xl object-contain"
          />
        )}
        <p className="text-xs font-medium uppercase tracking-wider text-primary">{template.name}</p>
        <h3 className="mt-2 text-2xl font-bold text-foreground">{title}</h3>
        <p className="mt-3 text-sm text-default-500">{tagline}</p>
        {profile.whatsapp && (
          <p className="mt-4 inline-block rounded-full bg-success-100 px-4 py-1.5 text-xs font-medium text-success-700">
            WA: {profile.whatsapp}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="flex h-[420px] items-center justify-center bg-default-50">
      <div className="text-center">
        <svg className="mx-auto h-10 w-10 text-default-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
        </svg>
        <p className="mt-2 text-sm font-medium text-default-500">Pilih template</p>
        <p className="text-xs text-default-400">Preview interaktif akan muncul di langkah berikutnya</p>
      </div>
    </div>
  );
}

export function TemplatePreview({
  template,
  profile: profileProp,
  websiteName = '',
  viewport = 'desktop',
  onViewportChange,
  showToolbar = false,
  interactive = true,
  className = '',
}: TemplatePreviewProps) {
  const profile: WebsitePreviewProfile = profileProp ?? { name: websiteName };

  if (!template) {
    return <EmptyPreview />;
  }

  const previewUrl = buildTemplatePreviewUrl(template, profile);
  const hasLivePreview = previewUrl !== null;

  const handleOpenTab = () => {
    if (template) openTemplatePreview(template, profile);
  };

  if (template.preview_image && !hasLivePreview) {
    return (
      <div className={`overflow-hidden rounded-2xl border border-default-200 ${className}`}>
        <div className="relative h-[420px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={template.preview_image} alt={`Preview ${template.name}`} className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-6 py-4">
            <p className="text-lg font-semibold text-white">{profile.name?.trim() || template.name}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-default-200 bg-white shadow-sm ${className}`}>
      {showToolbar && onViewportChange && (
        <PreviewToolbar
          viewport={viewport}
          onViewportChange={onViewportChange}
          onOpenTab={handleOpenTab}
          canOpenTab={hasLivePreview}
        />
      )}
      {hasLivePreview && previewUrl ? (
        <InteractiveIframePreview
          src={previewUrl}
          viewport={viewport}
          interactive={interactive}
        />
      ) : (
        <StaticFallbackPreview template={template} profile={profile} />
      )}
    </div>
  );
}

export { IFRAME_PREVIEW_TEMPLATES };
