'use client';

import { ColorSchemeEditor, type ColorSchemeEditorProps } from './color-scheme-editor';
import { TemplatePreview, type PreviewViewport } from './template-preview';
import type { WebsitePreviewProfile } from '../lib/preview-url';
import type { WebsiteTemplate } from '../lib/types';

export type ThemeCustomizerLayout = 'editor-only' | 'split';

export interface ThemeCustomizerProps extends ColorSchemeEditorProps {
  layout?: ThemeCustomizerLayout;
  /** Live template preview — required when layout is "split" */
  template?: WebsiteTemplate | null;
  profile?: WebsitePreviewProfile;
  viewport?: PreviewViewport;
  onViewportChange?: (viewport: PreviewViewport) => void;
  previewInteractive?: boolean;
  editorTitle?: string;
  editorDescription?: string;
}

/**
 * Reusable theme customization block.
 * - `editor-only`: settings page (mini preview inside ColorSchemeEditor)
 * - `split`: wizard / onboarding — editor + live iframe side by side
 */
export function ThemeCustomizer({
  layout = 'editor-only',
  template = null,
  profile,
  viewport = 'desktop',
  onViewportChange,
  previewInteractive = true,
  editorTitle,
  editorDescription,
  showMiniPreview,
  ...editorProps
}: ThemeCustomizerProps) {
  const resolvedShowMiniPreview =
    showMiniPreview ?? layout === 'editor-only';

  const editor = (
    <div className="space-y-3">
      {(editorTitle || editorDescription) && (
        <div>
          {editorTitle && <h3 className="text-base font-semibold text-foreground">{editorTitle}</h3>}
          {editorDescription && (
            <p className="mt-1 text-sm text-default-500">{editorDescription}</p>
          )}
        </div>
      )}
      <ColorSchemeEditor
        {...editorProps}
        showMiniPreview={resolvedShowMiniPreview}
        colorsColumns={layout === 'split' ? 1 : editorProps.colorsColumns}
      />
    </div>
  );

  if (layout === 'editor-only') {
    return editor;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr] lg:items-start">
      <div className="max-h-[calc(100vh-12rem)] overflow-y-auto rounded-xl border border-default-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
        {editor}
      </div>
      <div className="min-w-0">
        <p className="mb-2 text-sm font-medium text-foreground">Preview live</p>
        <TemplatePreview
          template={template}
          profile={profile}
          viewport={viewport}
          onViewportChange={onViewportChange}
          showToolbar
          interactive={previewInteractive}
        />
      </div>
    </div>
  );
}
