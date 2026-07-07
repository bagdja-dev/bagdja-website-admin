'use client';

import { Button } from '@heroui/react';
import { useMemo, useState } from 'react';

import { ColorPickerField } from './color-picker-field';
import { FormSelect } from './form-field';
import {
  ACCENT_SWATCH,
  applyPresetToTheme,
  COLOR_FIELD_LABELS,
  FONT_OPTIONS,
  getContrastWarnings,
  getLuminance,
  resolveTheme,
  themeToCssVariables,
  updateThemeColor,
  type ThemeColors,
  type ThemeTypography,
  type WebsiteTheme,
} from '../lib/website-theme';

export type ThemeEditorTab = 'quick' | 'colors' | 'typography';

export const ALL_THEME_EDITOR_TABS: ThemeEditorTab[] = ['quick', 'colors', 'typography'];

export interface ColorSchemeEditorProps {
  value: WebsiteTheme;
  templateDefault: WebsiteTheme;
  onChange: (theme: WebsiteTheme) => void;
  disabled?: boolean;
  /** Tabs to show (default: all) */
  tabs?: ThemeEditorTab[];
  defaultTab?: ThemeEditorTab;
  /** Show built-in mini preview card (hide when live iframe preview is shown) */
  showMiniPreview?: boolean;
  showReset?: boolean;
  showContrastWarnings?: boolean;
  /** Grid columns for detailed color pickers */
  colorsColumns?: 1 | 2;
}

const COLOR_KEYS = Object.keys(COLOR_FIELD_LABELS) as (keyof ThemeColors)[];

function ThemeMiniPreview({ templateDefault, value }: { templateDefault: WebsiteTheme; value: WebsiteTheme }) {
  const resolved = resolveTheme(templateDefault, value);
  const cssVars = themeToCssVariables(resolved);

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-default-200" style={cssVars}>
      <div
        className="border-b px-4 py-3"
        style={{ backgroundColor: 'var(--brand-bg)', borderColor: 'var(--brand-border)', fontFamily: 'var(--font-body)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs font-bold tracking-widest"
            style={{ color: 'var(--brand-accent)', fontFamily: 'var(--font-heading)', fontWeight: 'var(--font-heading-weight)' }}
          >
            BRAND
          </span>
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
            style={{ color: 'var(--brand-accent)', borderColor: 'var(--brand-accent-border)' }}
          >
            Menu
          </span>
        </div>
      </div>
      <div className="px-4 py-5 text-center" style={{ backgroundColor: 'var(--brand-bg)', fontFamily: 'var(--font-body)' }}>
        <p
          className="text-[10px] uppercase tracking-widest"
          style={{ color: 'var(--brand-accent)', fontWeight: 'var(--font-body-weight)' }}
        >
          Tagline
        </p>
        <p
          className="mt-2 text-sm font-semibold"
          style={{
            color: 'var(--brand-text)',
            fontFamily: 'var(--font-heading)',
            fontWeight: 'var(--font-heading-weight)',
            fontSize: `calc(0.875rem * var(--heading-scale))`,
          }}
        >
          Nama Website Anda
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--brand-muted)', fontWeight: 'var(--font-body-weight)' }}>
          Deskripsi singkat brand
        </p>
        <div
          className="mx-auto mt-4 inline-flex rounded-full px-4 py-2 text-xs font-semibold"
          style={{ backgroundColor: 'var(--brand-accent)', color: 'var(--brand-on-accent)' }}
        >
          Hubungi Kami
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 px-4 pb-4" style={{ backgroundColor: 'var(--brand-bg)' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border p-2"
            style={{ backgroundColor: 'var(--brand-surface)', borderColor: 'var(--brand-border)' }}
          >
            <div className="h-2 w-8 rounded opacity-20" style={{ backgroundColor: 'var(--brand-text)' }} />
            <div className="mt-2 h-1.5 w-6 rounded opacity-80" style={{ backgroundColor: 'var(--brand-accent)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ColorSchemeEditor({
  value,
  templateDefault,
  onChange,
  disabled = false,
  tabs: visibleTabs = ALL_THEME_EDITOR_TABS,
  defaultTab,
  showMiniPreview = true,
  showReset = true,
  showContrastWarnings = true,
  colorsColumns = 2,
}: ColorSchemeEditorProps) {
  const initialTab = defaultTab && visibleTabs.includes(defaultTab) ? defaultTab : visibleTabs[0];
  const [tab, setTab] = useState<ThemeEditorTab>(initialTab);
  const resolved = resolveTheme(templateDefault, value);
  const warnings = useMemo(() => getContrastWarnings(resolved), [resolved]);

  const isCustom = JSON.stringify(value) !== '{}' && value.preset === 'custom';

  const getQuickMode = (): 'dark' | 'light' => {
    if (value.preset === 'light' || value.mode === 'light') return 'light';
    if (value.preset === 'dark' || value.mode === 'dark') return 'dark';
    return getLuminance(resolved.colors.background) > 0.5 ? 'light' : 'dark';
  };

  const setPreset = (preset: 'dark' | 'light') => {
    onChange(applyPresetToTheme(preset, value, resolved.colors.accent));
  };

  const applyQuickAccent = (hex: string) => {
    onChange(applyPresetToTheme(getQuickMode(), value, hex));
  };

  const setColor = (key: keyof ThemeColors, hex: string) => {
    onChange(updateThemeColor(value, key, hex));
  };

  const setTypography = (patch: Partial<ThemeTypography>) => {
    onChange({
      ...value,
      preset: value.preset ?? 'custom',
      typography: { ...value.typography, ...patch },
    });
  };

  const handleReset = () => onChange({});

  const tabLabels: Record<ThemeEditorTab, string> = {
    quick: 'Mode Cepat',
    colors: 'Warna',
    typography: 'Tipografi',
  };

  const tabs = visibleTabs.map((key) => ({ key, label: tabLabels[key] }));

  return (
    <div className="space-y-5">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/25'
                : 'bg-white text-default-600 ring-1 ring-default-200 hover:bg-default-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'quick' && (
        <div className="space-y-4">
          <p className="text-sm text-default-500">
            Pilih mode gelap atau terang, lalu tentukan warna brand. Warna lain otomatis menyesuaikan.
          </p>
          <div className="flex gap-2">
            {(['dark', 'light'] as const).map((preset) => {
              const active = getQuickMode() === preset && value.preset !== 'custom';
              return (
                <button
                  key={preset}
                  type="button"
                  disabled={disabled}
                  onClick={() => setPreset(preset)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all disabled:opacity-50 ${
                    active
                      ? 'border-primary bg-primary-50 text-primary ring-2 ring-primary/20'
                      : 'border-default-200 bg-white text-default-600 hover:bg-default-50'
                  }`}
                >
                  <span>{preset === 'dark' ? '🌙' : '☀️'}</span>
                  {preset === 'dark' ? 'Gelap' : 'Terang'}
                </button>
              );
            })}
          </div>

          <ColorPickerField
            label="Warna brand / CTA"
            value={resolved.colors.accent}
            onChange={applyQuickAccent}
            disabled={disabled}
            description="Warna tombol, link, dan highlight. Hover & teks tombol diatur otomatis."
          />

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Atau pilih shortcut</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ACCENT_SWATCH) as (keyof typeof ACCENT_SWATCH)[]).map((accent) => (
                <button
                  key={accent}
                  type="button"
                  disabled={disabled}
                  title={accent}
                  onClick={() => applyQuickAccent(ACCENT_SWATCH[accent])}
                  className={`h-9 w-9 rounded-full ring-2 shadow-sm transition-transform hover:scale-110 disabled:opacity-50 ${
                    resolved.colors.accent.toLowerCase() === ACCENT_SWATCH[accent].toLowerCase()
                      ? 'ring-primary ring-offset-2'
                      : 'ring-white'
                  }`}
                  style={{ backgroundColor: ACCENT_SWATCH[accent] }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'colors' && (
        <div className={`grid gap-4 ${colorsColumns === 2 ? 'sm:grid-cols-2' : ''}`}>
          {COLOR_KEYS.map((key) => (
            <ColorPickerField
              key={key}
              label={COLOR_FIELD_LABELS[key]}
              value={resolved.colors[key]}
              onChange={(hex) => setColor(key, hex)}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {tab === 'typography' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Font judul"
            value={resolved.typography.headingFont}
            onChange={(v) => setTypography({ headingFont: v })}
            options={FONT_OPTIONS.map((f) => ({ value: f.value, label: f.label }))}
            disabled={disabled}
          />
          <FormSelect
            label="Font isi"
            value={resolved.typography.bodyFont}
            onChange={(v) => setTypography({ bodyFont: v })}
            options={FONT_OPTIONS.map((f) => ({ value: f.value, label: f.label }))}
            disabled={disabled}
          />
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-medium text-foreground">Ketebalan judul</p>
            <div className="flex gap-2">
              {(['500', '600', '700'] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  disabled={disabled}
                  onClick={() => setTypography({ headingWeight: w })}
                  className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-all disabled:opacity-50 ${
                    resolved.typography.headingWeight === w
                      ? 'border-primary bg-primary-50 text-primary'
                      : 'border-default-200 hover:bg-default-50'
                  }`}
                  style={{ fontWeight: w }}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-medium text-foreground">Ketebalan isi</p>
            <div className="flex gap-2">
              {(['400', '500'] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  disabled={disabled}
                  onClick={() => setTypography({ bodyWeight: w })}
                  className={`flex-1 rounded-lg border py-2 text-sm transition-all disabled:opacity-50 ${
                    resolved.typography.bodyWeight === w
                      ? 'border-primary bg-primary-50 text-primary'
                      : 'border-default-200 hover:bg-default-50'
                  }`}
                  style={{ fontWeight: w }}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-medium text-foreground">Skala judul</p>
            <div className="flex gap-2">
              {([
                { key: 'compact', label: 'Kompak' },
                { key: 'default', label: 'Default' },
                { key: 'large', label: 'Besar' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => setTypography({ headingScale: key })}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                    resolved.typography.headingScale === key
                      ? 'border-primary bg-primary-50 text-primary'
                      : 'border-default-200 hover:bg-default-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showContrastWarnings && warnings.length > 0 && (
        <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
          <p className="font-medium">Perhatian kontras warna</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {showMiniPreview && (
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Preview</p>
          <ThemeMiniPreview templateDefault={templateDefault} value={value} />
        </div>
      )}

      {showReset && (isCustom || Object.keys(value).length > 0) && !disabled && (
        <Button size="sm" variant="flat" onPress={handleReset}>
          Reset ke default template
        </Button>
      )}
    </div>
  );
}
