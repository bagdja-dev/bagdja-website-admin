'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button, Select, SelectItem, Spinner } from '@heroui/react';

import { errorMessage } from '@/studio/api/client';
import { fetchWebsiteTemplates } from '@/studio/api/templates';
import { fetchWebsiteTemplateTrial } from '@/studio/api/template-trials';
import { fetchTemplateVersionStatus, updateWebsiteTheme } from '@/studio/api/websites';
import type {
  ThemeAccentDto,
  ThemeFontDto,
  ThemeModeDto,
  ThemePresetDto,
  WebsiteTemplateDto,
  WebsiteThemeConfigDto,
} from '@/studio/api/types';
import { TemplatePreviewFrame, type PreviewDevice } from '@/studio/features/onboarding/TemplatePreviewFrame';
import { useActiveRole, useActiveWebsite, useWebsiteStore } from '@/studio/stores/website-store';
import { hasMinRole } from '@/studio/lib/roles';
import { notify } from '@/studio/ui/primitives/Toast';

const PRESETS: Array<{ value: Exclude<ThemePresetDto, 'custom'>; label: string; description: string }> = [
  { value: 'light', label: 'Terang', description: 'Latar cerah, cocok untuk tampilan bersih.' },
  { value: 'dark', label: 'Gelap', description: 'Latar gelap dengan kontras yang tegas.' },
];

const ACCENTS: Array<{ value: ThemeAccentDto; label: string; color: string }> = [
  { value: 'amber', label: 'Amber', color: '#f59e0b' },
  { value: 'blue', label: 'Biru', color: '#3b82f6' },
  { value: 'emerald', label: 'Emerald', color: '#10b981' },
  { value: 'rose', label: 'Rose', color: '#f43f5e' },
  { value: 'violet', label: 'Violet', color: '#8b5cf6' },
  { value: 'indigo', label: 'Indigo', color: '#6366f1' },
  { value: 'orange', label: 'Oranye', color: '#f97316' },
  { value: 'teal', label: 'Teal', color: '#14b8a6' },
];

const FONTS: ThemeFontDto[] = [
  'Inter', 'Poppins', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Playfair Display', 'Merriweather',
];

const BASE_COLORS: Record<ThemeModeDto, Record<string, string>> = {
  light: {
    background: '#ffffff',
    surface: '#f4f4f5',
    text: '#18181b',
    textMuted: '#71717a',
    border: '#e4e4e7',
  },
  dark: {
    background: '#09090b',
    surface: '#18181b',
    text: '#fafafa',
    textMuted: '#a1a1aa',
    border: '#27272a',
  },
};

const COLOR_FIELDS = [
  { key: 'background', label: 'Latar utama' },
  { key: 'surface', label: 'Permukaan / kartu' },
  { key: 'text', label: 'Teks utama' },
  { key: 'textMuted', label: 'Teks sekunder' },
  { key: 'accent', label: 'Warna aksen' },
] as const;

type ThemeComponentName = keyof NonNullable<WebsiteThemeConfigDto['components']>;

const COMPONENT_COLOR_FIELDS: Record<ThemeComponentName, Array<{ key: string; label: string; fallback: string }>> = {
  header: [
    { key: 'background', label: 'Latar header', fallback: 'background' },
    { key: 'text', label: 'Teks dan navigasi', fallback: 'text' },
    { key: 'border', label: 'Garis bawah', fallback: 'accent' },
  ],
  footer: [
    { key: 'background', label: 'Latar footer', fallback: 'background' },
    { key: 'text', label: 'Teks footer', fallback: 'textMuted' },
    { key: 'heading', label: 'Judul kolom', fallback: 'accent' },
    { key: 'link', label: 'Tautan footer', fallback: 'textMuted' },
    { key: 'border', label: 'Garis pemisah', fallback: 'border' },
  ],
  button: [
    { key: 'primaryBackground', label: 'Latar tombol utama', fallback: 'accent' },
    { key: 'primaryText', label: 'Teks tombol utama', fallback: 'onAccent' },
    { key: 'secondaryText', label: 'Teks tombol outline', fallback: 'text' },
    { key: 'secondaryBorder', label: 'Garis tombol outline', fallback: 'border' },
  ],
};

const COMPONENT_LABELS: Record<ThemeComponentName, string> = {
  header: 'Header',
  footer: 'Footer',
  button: 'Tombol',
};

const ACCENT_DERIVATIVES: Record<ThemeAccentDto, { hover: string; onAccent: string }> = {
  amber: { hover: '#d97706', onAccent: '#09090b' },
  blue: { hover: '#2563eb', onAccent: '#ffffff' },
  emerald: { hover: '#059669', onAccent: '#ffffff' },
  rose: { hover: '#e11d48', onAccent: '#ffffff' },
  violet: { hover: '#7c3aed', onAccent: '#ffffff' },
  indigo: { hover: '#4f46e5', onAccent: '#ffffff' },
  orange: { hover: '#ea580c', onAccent: '#ffffff' },
  teal: { hover: '#0d9488', onAccent: '#ffffff' },
};

function isThemeMode(value: unknown): value is ThemeModeDto {
  return value === 'light' || value === 'dark';
}

function isThemeFont(value: unknown): value is ThemeFontDto {
  return typeof value === 'string' && FONTS.includes(value as ThemeFontDto);
}

function normalizeTheme(raw: WebsiteThemeConfigDto | null | undefined): WebsiteThemeConfigDto {
  const theme = raw ?? {};
  const font = isThemeFont(theme.font) ? theme.font : undefined;
  return {
    ...theme,
    typography: theme.typography
      ? {
          ...theme.typography,
          headingFont: theme.typography.headingFont ?? font,
          bodyFont: theme.typography.bodyFont ?? font,
        }
      : font
        ? { headingFont: font, bodyFont: font }
        : undefined,
    colors: theme.colors
      ? { ...theme.colors }
      : undefined,
  };
}

/** Field tema yang membentuk skema warna (tipografi tidak termasuk). */
const COLOR_SCHEME_KEYS = ['mode', 'accent', 'preset', 'colors', 'components'] as const;

/**
 * Skema warna bawaan template untuk website ini — urutan sama dengan renderer (tenantTemplateTheme):
 * versi uji yang sedang dilihat user → versi terpasang (`manifest.theme`) → `structure.theme` katalog.
 */
function templateColorScheme(raw: unknown): WebsiteThemeConfigDto {
  if (!raw || typeof raw !== 'object') return {};
  const source = raw as WebsiteThemeConfigDto;
  const scheme: WebsiteThemeConfigDto = {};
  if (isThemeMode(source.mode)) scheme.mode = source.mode;
  if (source.accent && ACCENTS.some((item) => item.value === source.accent)) scheme.accent = source.accent;
  if (source.preset) scheme.preset = source.preset;
  if (source.colors && typeof source.colors === 'object') scheme.colors = { ...source.colors };
  if (source.components && typeof source.components === 'object') scheme.components = { ...source.components };
  return scheme;
}

/** Tanpa override warna website → renderer memakai skema warna template. */
function followsTemplateColors(theme: WebsiteThemeConfigDto): boolean {
  return COLOR_SCHEME_KEYS.every((key) => theme[key] === undefined);
}

function withoutColorScheme(theme: WebsiteThemeConfigDto): WebsiteThemeConfigDto {
  const next: WebsiteThemeConfigDto = { ...theme };
  for (const key of COLOR_SCHEME_KEYS) delete next[key];
  return next;
}

/** Gabungan template + override website, mengikuti urutan `resolveTheme` renderer. */
function effectiveColorTheme(template: WebsiteThemeConfigDto, website: WebsiteThemeConfigDto): WebsiteThemeConfigDto {
  const merged: WebsiteThemeConfigDto = { ...template, ...website };
  if (website.colors) merged.colors = { ...template.colors, ...website.colors };
  if (template.components || website.components) {
    merged.components = {
      header: { ...template.components?.header, ...website.components?.header },
      footer: { ...template.components?.footer, ...website.components?.footer },
      button: { ...template.components?.button, ...website.components?.button },
    };
  }
  return merged;
}

function resolveColors(theme: WebsiteThemeConfigDto): Record<string, string> {
  const mode = isThemeMode(theme.mode) ? theme.mode : 'dark';
  const accent = ACCENTS.find((item) => item.value === theme.accent) ?? ACCENTS[0];
  const derivatives = ACCENT_DERIVATIVES[accent.value];
  const base = BASE_COLORS[mode];
  const overrides = theme.colors ?? {};
  const resolved: Record<string, string> = {
    ...base,
    accent: accent.color,
    accentHover: derivatives.hover,
    onAccent: derivatives.onAccent,
    ...overrides,
  };
  resolved.text = overrides.text ?? base.text;
  resolved.textMuted = overrides.textMuted ?? base.textMuted;
  resolved.surface = overrides.surface ?? base.surface;
  resolved.background = overrides.background ?? base.background;
  resolved.accent = overrides.accent ?? accent.color;
  resolved.accentHover = overrides.accentHover ?? derivatives.hover;
  resolved.onAccent = overrides.onAccent ?? derivatives.onAccent;
  return resolved;
}

function normalizeHex(value: string): string {
  const hex = value.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase();
  }
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : '#000000';
}

function luminance(hex: string): number {
  const normalized = normalizeHex(hex).slice(1);
  const rgb = [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16) / 255);
  const linear = rgb.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground: string, background: string): number {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function darkenHex(hex: string, amount = 0.12): string {
  const normalized = normalizeHex(hex).slice(1);
  const channels = [0, 2, 4].map((index) => Math.round(parseInt(normalized.slice(index, index + 2), 16) * (1 - amount)));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function bestContrastText(background: string): string {
  return contrastRatio('#ffffff', background) > contrastRatio('#09090b', background) ? '#ffffff' : '#09090b';
}

function getComponentOverride(
  theme: WebsiteThemeConfigDto,
  group: ThemeComponentName,
  key: string,
): string | undefined {
  const component = theme.components?.[group];
  return component?.[key as keyof typeof component];
}

function getComponentDefaults(colors: Record<string, string>) {
  return {
    header: { background: colors.background, text: colors.text, border: colors.accent },
    footer: {
      background: colors.background,
      text: colors.textMuted,
      heading: colors.accent,
      link: colors.textMuted,
      border: colors.border,
    },
    button: {
      primaryBackground: colors.accent,
      primaryText: colors.onAccent,
      secondaryText: colors.text,
      secondaryBorder: colors.border,
    },
  };
}

function ContrastCheck({ label, foreground, background }: { label: string; foreground: string; background: string }) {
  const ratio = contrastRatio(foreground, background);
  const passes = ratio >= 4.5;
  return (
    <div className={`flex items-center justify-between gap-3 rounded-[9px] px-3 py-2 text-xs ${passes ? 'bg-success-50 text-success' : 'bg-warning-50 text-warning-700'}`}>
      <span>{label}</span>
      <span className="shrink-0 font-semibold">{ratio.toFixed(2)}:1 · {passes ? 'Lulus AA' : 'Perlu diperbaiki'}</span>
    </div>
  );
}

export function ThemeEditor() {
  const websiteEntry = useActiveWebsite();
  const role = useActiveRole();
  const patchWebsite = useWebsiteStore((state) => state.patchWebsite);
  const website = websiteEntry?.website;
  const [theme, setTheme] = useState<WebsiteThemeConfigDto>(() => normalizeTheme(website?.theme));
  const [savedTheme, setSavedTheme] = useState<WebsiteThemeConfigDto>(() => normalizeTheme(website?.theme));
  const [templates, setTemplates] = useState<WebsiteTemplateDto[]>([]);
  // Palet versi yang benar-benar dipakai website (bukan versi terbaru katalog).
  const [versionTheme, setVersionTheme] = useState<WebsiteThemeConfigDto | null>(null);
  const [trialTheme, setTrialTheme] = useState<WebsiteThemeConfigDto | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [saving, setSaving] = useState(false);

  const canSave = hasMinRole(role, 'admin');
  const isDirty = JSON.stringify(theme) !== JSON.stringify(savedTheme);
  const activeTemplate = templates.find((template) => template.id === website?.template_id) ?? null;

  useEffect(() => {
    let cancelled = false;
    if (!website?.id) return () => {
      cancelled = true;
    };
    Promise.all([
      fetchTemplateVersionStatus(website.id).catch(() => null),
      fetchWebsiteTemplateTrial(website.id).catch(() => null),
    ]).then(([status, trial]) => {
      if (cancelled) return;
      setVersionTheme(status?.templateTheme ?? null);
      setTrialTheme(trial?.candidate?.theme ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [website?.id, website?.template_id, website?.template_runtime_version]);

  const templateScheme = useMemo(
    () => templateColorScheme(trialTheme ?? versionTheme ?? activeTemplate?.structure?.theme),
    [activeTemplate, trialTheme, versionTheme],
  );
  const effectiveTheme = useMemo(() => effectiveColorTheme(templateScheme, theme), [templateScheme, theme]);
  const colors = useMemo(() => resolveColors(effectiveTheme), [effectiveTheme]);
  const componentDefaults = useMemo(() => getComponentDefaults(colors), [colors]);
  const usesTemplateColors = followsTemplateColors(theme);
  const headingFont = theme.typography?.headingFont ?? (isThemeFont(theme.font) ? theme.font : 'Inter');
  const bodyFont = theme.typography?.bodyFont ?? (isThemeFont(theme.font) ? theme.font : 'Inter');
  const selectedPreset = effectiveTheme.preset ?? effectiveTheme.mode ?? 'dark';
  const templateAccentColor = effectiveTheme.colors?.accent?.toLowerCase();
  const selectedAccent =
    ACCENTS.find((item) => item.value === effectiveTheme.accent)?.value ??
    ACCENTS.find((item) => item.color.toLowerCase() === templateAccentColor)?.value ??
    (templateAccentColor ? undefined : 'amber');

  useEffect(() => {
    const nextTheme = normalizeTheme(website?.theme);
    setTheme(nextTheme);
    setSavedTheme(nextTheme);
  }, [website?.id, website?.theme]);

  useEffect(() => {
    let cancelled = false;
    if (!website?.id) {
      setTemplates([]);
      setTemplateError(null);
      return () => {
        cancelled = true;
      };
    }
    setTemplateError(null);
    fetchWebsiteTemplates()
      .then((items) => {
        if (!cancelled) setTemplates(items);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setTemplateError(errorMessage(cause, 'Template aktif gagal dimuat untuk pratinjau.'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [website?.id]);

  const resetToTemplateColors = () => {
    setTheme((current) => withoutColorScheme(current));
  };

  const selectPreset = (preset: Exclude<ThemePresetDto, 'custom'>) => {
    setTheme((current) => ({
      ...current,
      mode: preset,
      preset,
      colors: undefined,
      components: undefined,
    }));
  };

  const selectAccent = (accent: ThemeAccentDto) => {
    const swatch = ACCENTS.find((item) => item.value === accent)!;
    const derivatives = ACCENT_DERIVATIVES[accent];
    setTheme((current) => ({
      ...current,
      accent,
      preset: current.preset === 'custom' ? 'custom' : current.preset,
      colors: {
        ...current.colors,
        accent: swatch.color,
        accentHover: derivatives.hover,
        onAccent: derivatives.onAccent,
        accentMuted: swatch.color,
      },
    }));
  };

  const setColor = (key: typeof COLOR_FIELDS[number]['key'], value: string) => {
    const nextColor = normalizeHex(value);
    setTheme((current) => ({
      ...current,
      preset: 'custom',
      colors: {
        ...current.colors,
        [key]: nextColor,
        ...(key === 'accent' ? {
          accentHover: darkenHex(nextColor),
          onAccent: bestContrastText(nextColor),
          accentMuted: nextColor,
        } : {}),
      },
    }));
  };

  const setComponentColor = (group: ThemeComponentName, key: string, value: string | undefined) => {
    const nextColor = value === undefined ? undefined : normalizeHex(value);
    setTheme((current) => {
      const components = { ...current.components };
      if (group === 'header') {
        const header = { ...current.components?.header };
        if (nextColor) header[key as keyof typeof header] = nextColor;
        else delete header[key as keyof typeof header];
        components.header = Object.keys(header).length > 0 ? header : undefined;
      } else if (group === 'footer') {
        const footer = { ...current.components?.footer };
        if (nextColor) footer[key as keyof typeof footer] = nextColor;
        else delete footer[key as keyof typeof footer];
        components.footer = Object.keys(footer).length > 0 ? footer : undefined;
      } else {
        const button = { ...current.components?.button };
        if (nextColor) button[key as keyof typeof button] = nextColor;
        else delete button[key as keyof typeof button];
        components.button = Object.keys(button).length > 0 ? button : undefined;
      }

      return {
        ...current,
        preset: 'custom',
        components: Object.values(components).some(Boolean) ? components : undefined,
      };
    });
  };

  const setFont = (key: 'headingFont' | 'bodyFont', value: ThemeFontDto) => {
    setTheme((current) => ({
      ...current,
      typography: { ...current.typography, [key]: value },
    }));
  };

  const save = async () => {
    if (!website || !canSave || !isDirty || saving) return;
    setSaving(true);
    try {
      const saved = await updateWebsiteTheme(website.id, theme);
      const canonical = normalizeTheme(saved.theme ?? theme);
      setTheme(canonical);
      setSavedTheme(canonical);
      patchWebsite(website.id, { theme: saved.theme ?? theme });
      notify.success('Tema dan warna tersimpan.');
    } catch {
      notify.error('Gagal menyimpan tema. Perubahan belum disimpan.');
    } finally {
      setSaving(false);
    }
  };

  if (!website) {
    return <div className="rounded-[14px] border border-default-200 bg-white p-6 text-sm text-default-600">Pilih website untuk mengatur tema.</div>;
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-[14px] border border-default-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Tema & Warna</h2>
            <p className="mt-1 text-sm text-default-600">Atur palet, warna aksen, dan tipografi untuk website {website.name}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="bordered"
              isDisabled={!canSave || saving || usesTemplateColors}
              onPress={resetToTemplateColors}
            >
              Reset ke warna template
            </Button>
            <Button color="primary" isDisabled={!canSave || !isDirty || saving} isLoading={saving} onPress={() => void save()}>
              Simpan perubahan
            </Button>
          </div>
        </div>
        <p className={`mt-3 rounded-[10px] px-3 py-2 text-xs ${
          usesTemplateColors ? 'bg-default-100 text-default-600' : 'bg-primary-50 text-primary'
        }`}>
          {usesTemplateColors
            ? `Mengikuti skema warna template${activeTemplate ? ` ${activeTemplate.name}` : ''}. Ubah warna di bawah untuk membuat palet sendiri.`
            : 'Website memakai palet sendiri. Tekan “Reset ke warna template” lalu simpan untuk kembali ke warna bawaan template. Font tidak ikut direset.'}
        </p>
        {!canSave && (
          <p className="mt-3 rounded-[10px] bg-warning-50 px-3 py-2 text-xs text-warning-700">
            Hanya admin atau pemilik yang dapat menyimpan pengaturan tema.
          </p>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
          <div className="flex flex-col gap-6">
            <fieldset>
              <legend className="text-sm font-semibold text-foreground">Preset tampilan</legend>
              <p className="mt-1 text-xs text-default-500">Pilih mode terang atau gelap. Memilih preset akan menghapus override warna khusus.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    disabled={!canSave}
                    onClick={() => selectPreset(preset.value)}
                    className={`rounded-[12px] border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      selectedPreset === preset.value
                        ? 'border-primary-400 bg-primary-50 ring-1 ring-primary-200'
                        : 'border-default-200 bg-white hover:border-default-300'
                    }`}
                  >
                    <span className={`mb-3 block h-14 rounded-[8px] border ${
                      preset.value === 'dark' ? 'border-zinc-700 bg-zinc-950' : 'border-zinc-200 bg-white'
                    }`}>
                      <span className={`mx-3 mt-3 block h-2 w-1/3 rounded ${preset.value === 'dark' ? 'bg-white' : 'bg-zinc-900'}`} />
                      <span className={`mx-3 mt-2 block h-1.5 w-2/3 rounded ${preset.value === 'dark' ? 'bg-zinc-500' : 'bg-zinc-300'}`} />
                    </span>
                    <span className="block text-sm font-bold text-foreground">{preset.label}</span>
                    <span className="mt-0.5 block text-xs text-default-500">{preset.description}</span>
                  </button>
                ))}
                {selectedPreset === 'custom' && (
                  <div className="sm:col-span-2 rounded-[10px] border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-medium text-primary">
                    Palet khusus aktif — pilih preset, atau reset ke warna template.
                  </div>
                )}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold text-foreground">Warna aksen</legend>
              <p className="mt-1 text-xs text-default-500">Digunakan untuk tombol utama, tautan, dan elemen penekanan.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ACCENTS.map((accent) => (
                  <button
                    key={accent.value}
                    type="button"
                    aria-label={`Pilih aksen ${accent.label}`}
                    aria-pressed={selectedAccent === accent.value}
                    disabled={!canSave}
                    onClick={() => selectAccent(accent.value)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 ${
                      selectedAccent === accent.value ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: accent.color }}
                    title={accent.label}
                  >
                    {selectedAccent === accent.value && <span className="text-sm font-bold text-white" aria-hidden="true">✓</span>}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold text-foreground">Warna khusus</legend>
              <p className="mt-1 text-xs text-default-500">Pilih warna untuk latar, kartu, dan teks. Mengubah nilai akan beralih ke preset khusus.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {COLOR_FIELDS.map((field) => (
                  <label key={field.key} className="flex min-h-[58px] items-center gap-3 rounded-[10px] border border-default-200 px-3 py-2">
                    <input
                      type="color"
                      value={normalizeHex(colors[field.key])}
                      disabled={!canSave}
                      onChange={(event) => setColor(field.key, event.target.value)}
                      aria-label={field.label}
                      className="h-9 w-10 cursor-pointer rounded border-0 bg-transparent p-0 disabled:cursor-not-allowed"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-default-700">{field.label}</span>
                      <span className="block font-mono text-[11px] uppercase text-default-500">{colors[field.key]}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold text-foreground">Font judul</p>
                <Select
                  aria-label="Font judul"
                  selectedKeys={[headingFont]}
                  onChange={(event) => {
                    if (FONTS.includes(event.target.value as ThemeFontDto)) setFont('headingFont', event.target.value as ThemeFontDto);
                  }}
                  isDisabled={!canSave}
                  variant="bordered"
                  size="sm"
                >
                  {FONTS.map((font) => <SelectItem key={font}>{font}</SelectItem>)}
                </Select>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-foreground">Font isi</p>
                <Select
                  aria-label="Font isi"
                  selectedKeys={[bodyFont]}
                  onChange={(event) => {
                    if (FONTS.includes(event.target.value as ThemeFontDto)) setFont('bodyFont', event.target.value as ThemeFontDto);
                  }}
                  isDisabled={!canSave}
                  variant="bordered"
                  size="sm"
                >
                  {FONTS.map((font) => <SelectItem key={font}>{font}</SelectItem>)}
                </Select>
              </div>
            </fieldset>

            <details className="rounded-[12px] border border-default-200 bg-default-50">
              <summary className="cursor-pointer list-none px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block text-sm font-bold text-foreground">Pengaturan warna lanjutan</span>
                    <span className="mt-0.5 block text-xs text-default-500">Atur warna khusus untuk header, footer, dan tombol.</span>
                  </span>
                  <span className="text-xs font-semibold text-primary">Buka</span>
                </span>
              </summary>
              <div className="flex flex-col gap-5 border-t border-default-200 p-4">
                {(Object.keys(COMPONENT_COLOR_FIELDS) as ThemeComponentName[]).map((group) => (
                  <fieldset key={group}>
                    <legend className="text-sm font-semibold text-foreground">{COMPONENT_LABELS[group]}</legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {COMPONENT_COLOR_FIELDS[group].map((field) => {
                        const override = getComponentOverride(theme, group, field.key);
                        const effectiveColor = getComponentOverride(effectiveTheme, group, field.key) ?? colors[field.fallback];
                        return (
                          <div key={`${group}-${field.key}`} className="flex min-h-[58px] items-center gap-2 rounded-[10px] border border-default-200 bg-white px-2.5 py-2">
                            <input
                              type="color"
                              value={normalizeHex(effectiveColor)}
                              disabled={!canSave}
                              onChange={(event) => setComponentColor(group, field.key, event.target.value)}
                              aria-label={`${COMPONENT_LABELS[group]}: ${field.label}`}
                              className="h-9 w-10 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0 disabled:cursor-not-allowed"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-semibold text-default-700">{field.label}</span>
                              <span className="block font-mono text-[11px] uppercase text-default-500">{effectiveColor}</span>
                            </span>
                            <Button
                              size="sm"
                              variant="light"
                              isDisabled={!canSave || !override}
                              onPress={() => setComponentColor(group, field.key, undefined)}
                              className="shrink-0 px-1.5 text-[11px]"
                            >
                              Ikuti tema
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
                <p className="text-xs leading-relaxed text-default-500">
                  Warna lanjutan menimpa warna dasar hanya pada komponen yang dipilih. Tekan “Ikuti tema” untuk menghapus override komponen tersebut.
                </p>
              </div>
            </details>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Pratinjau tema</h3>
                <p className="mt-1 text-xs text-default-500">Template aktif dengan perubahan tema draft sebelum disimpan.</p>
              </div>
              <div className="flex rounded-lg bg-default-100 p-1" role="group" aria-label="Ukuran pratinjau tema">
                {(['desktop', 'mobile'] as const).map((device) => (
                  <button
                    key={device}
                    type="button"
                    aria-pressed={previewDevice === device}
                    onClick={() => setPreviewDevice(device)}
                    className={`min-h-8 rounded-md px-3 text-xs font-medium ${
                      previewDevice === device ? 'bg-white text-foreground shadow-sm' : 'text-default-600'
                    }`}
                  >
                    {device === 'desktop' ? 'Desktop' : 'HP'}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-[280px] overflow-hidden rounded-[14px] border border-default-200 bg-default-100 p-2">
              {templateError ? (
                <p role="alert" className="p-4 text-sm text-danger-700">{templateError}</p>
              ) : !activeTemplate ? (
                <div className="flex min-h-[260px] items-center justify-center">
                  {templates.length === 0 ? (
                    <Spinner label="Memuat template aktif..." />
                  ) : (
                    <p className="px-4 text-center text-sm text-default-600">Template aktif tidak ditemukan di katalog.</p>
                  )}
                </div>
              ) : (
                <div className="mx-auto w-full max-w-[760px]">
                  <TemplatePreviewFrame
                    template={activeTemplate}
                    profile={{
                      name: website.name,
                      tagline: website.tagline,
                      logoUrl: website.logo_url,
                      whatsapp: website.whatsapp ?? undefined,
                      phone: website.phone,
                      email: website.email,
                      footerSettings: website.footer_settings,
                      theme,
                    }}
                    slug={website.slug}
                    device={previewDevice}
                    size="compact"
                    height={520}
                  />
                </div>
              )}
            </div>

            <div className="rounded-[12px] border border-default-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-foreground">Pemeriksaan kontras</h3>
              <p className="mb-3 mt-1 text-xs text-default-500">WCAG AA untuk teks normal membutuhkan rasio minimal 4.5:1.</p>
              <div className="flex flex-col gap-2">
                <ContrastCheck label="Teks utama / latar" foreground={colors.text} background={colors.background} />
                <ContrastCheck label="Teks sekunder / latar" foreground={colors.textMuted} background={colors.background} />
                <ContrastCheck label="Teks tombol / aksen" foreground={colors.onAccent} background={colors.accent} />
                <ContrastCheck
                  label="Teks header / latar"
                  foreground={effectiveTheme.components?.header?.text ?? colors.text}
                  background={effectiveTheme.components?.header?.background ?? colors.background}
                />
                <ContrastCheck
                  label="Teks footer / latar"
                  foreground={effectiveTheme.components?.footer?.text ?? colors.textMuted}
                  background={effectiveTheme.components?.footer?.background ?? colors.background}
                />
                <ContrastCheck
                  label="Tombol utama / latar"
                  foreground={effectiveTheme.components?.button?.primaryText ?? colors.onAccent}
                  background={effectiveTheme.components?.button?.primaryBackground ?? colors.accent}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
