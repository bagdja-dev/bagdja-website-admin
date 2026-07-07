'use client';

import { Button } from '@heroui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { FormInput } from '../../../components/form-field';
import { LoadingSpinner } from '../../../components/loading-spinner';
import { LogoUpload } from '../../../components/logo-upload';
import { ThemeCustomizer } from '../../../components/theme-customizer';
import { useWebsiteContext } from '../../../context/website-context';
import { apiClient, slugify } from '../../../lib/api-client';
import {
  applyPresetToTheme,
  ACCENT_SWATCH,
  extractTemplateTheme,
  type WebsiteTheme,
} from '../../../lib/website-theme';
import type { WebsitePreviewProfile } from '../../../lib/preview-url';
import type { Website, WebsiteTemplate } from '../../../lib/types';

type WizardStep = 1 | 2 | 3;

const STEPS: { num: WizardStep; label: string }[] = [
  { num: 1, label: 'Profil' },
  { num: 2, label: 'Template' },
  { num: 3, label: 'Tampilan' },
];

export default function CreateWebsitePage() {
  const router = useRouter();
  const { refresh, switchWebsite } = useWebsiteContext();

  const [step, setStep] = useState<WizardStep>(1);
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagline, setTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [theme, setTheme] = useState<WebsiteTheme>({});

  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient<WebsiteTemplate[]>('/api/templates')
      .then((data) => {
        setTemplates(data);
        if (data.length > 0) setSelectedTemplateId(data[0].id);
      })
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTemplates(false));
  }, []);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;

  const templateDefaultTheme = useMemo(
    () => extractTemplateTheme(selectedTemplate?.structure),
    [selectedTemplate],
  );

  useEffect(() => {
    if (selectedTemplate) {
      const tplTheme = extractTemplateTheme(selectedTemplate.structure);
      const mode = tplTheme.mode ?? 'dark';
      const accent = tplTheme.accent ?? 'amber';
      setTheme(applyPresetToTheme(mode, tplTheme, ACCENT_SWATCH[accent]));
    }
  }, [selectedTemplateId, selectedTemplate]);

  const profile: WebsitePreviewProfile = useMemo(
    () => ({
      name,
      tagline,
      logo_url: logoUrl,
      whatsapp,
      phone,
      email,
      theme,
    }),
    [name, tagline, logoUrl, whatsapp, phone, email, theme],
  );

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const validateStep1 = (): boolean => {
    if (!name.trim() || !slug.trim()) {
      setError('Nama dan slug wajib diisi');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!selectedTemplateId) {
      setError('Pilih template terlebih dahulu');
      return false;
    }
    setError('');
    return true;
  };

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setError('');
    setStep((s) => Math.min(3, s + 1) as WizardStep);
  };

  const goBack = () => {
    setError('');
    if (step === 1) return;
    setStep((s) => Math.max(1, s - 1) as WizardStep);
  };

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) return;

    setSubmitting(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        slug: slug.trim(),
        template_id: selectedTemplateId!,
        theme,
      };
      if (tagline.trim()) body.tagline = tagline.trim();
      if (logoUrl.trim()) body.logo_url = logoUrl.trim();
      if (whatsapp.trim()) body.whatsapp = whatsapp.trim();
      if (phone.trim()) body.phone = phone.trim();
      if (email.trim()) body.email = email.trim();

      const website = await apiClient<Website>('/api/websites', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      await refresh();
      switchWebsite(website.id);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat website');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTemplates) return <LoadingSpinner className="h-64" />;

  return (
    <div className={`mx-auto space-y-8 ${step === 3 ? 'max-w-7xl' : 'max-w-5xl'}`}>
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-default-500 transition-colors hover:text-foreground"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Kembali
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Buat Website Baru</h1>
        <p className="mt-1 text-default-500">
          Isi profil bisnis, pilih template, sesuaikan tampilan, lalu publish.
        </p>
      </div>

      {/* Progress */}
      <nav aria-label="Langkah pembuatan website" className="flex items-center gap-2">
        {STEPS.map(({ num, label }, i) => {
          const isActive = step === num;
          const isDone = step > num;
          return (
            <div key={num} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : isDone
                      ? 'bg-primary-100 text-primary'
                      : 'bg-default-100 text-default-400'
                }`}
              >
                {isDone ? '✓' : num}
              </div>
              <span
                className={`hidden text-sm font-medium sm:inline ${
                  isActive ? 'text-foreground' : 'text-default-400'
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`mx-1 h-px flex-1 ${isDone ? 'bg-primary-200' : 'bg-default-200'}`} />
              )}
            </div>
          );
        })}
      </nav>

      {/* Step 1 — Profil */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Informasi Website</h2>
            <p className="mt-1 text-sm text-default-500">
              Data ini akan tampil di hero website dan dipakai untuk preview.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Nama Website"
              placeholder="Contoh: Barber Shop Jhon"
              value={name}
              onChange={handleNameChange}
              required
            />
            <FormInput
              label="Slug URL"
              placeholder="barber-shop-jhon"
              description="URL publik: /slug"
              value={slug}
              onChange={(v) => {
                setSlugTouched(true);
                setSlug(v);
              }}
              required
            />
          </div>
          <FormInput
            label="Tagline"
            placeholder="Premium Barbershop sejak 2020"
            value={tagline}
            onChange={setTagline}
          />
          <LogoUpload value={logoUrl} onChange={setLogoUrl} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="WhatsApp"
              placeholder="6281234567890"
              description="Format internasional tanpa +"
              value={whatsapp}
              onChange={setWhatsapp}
            />
            <FormInput
              label="Telepon"
              placeholder="+62 812 3456 7890"
              value={phone}
              onChange={setPhone}
            />
          </div>
          <FormInput
            label="Email"
            type="email"
            placeholder="hello@myshop.com"
            value={email}
            onChange={setEmail}
          />
        </div>
      )}

      {/* Step 2 — Template */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Pilih Template</h2>
            <p className="mt-1 text-sm text-default-500">
              Template menentukan tampilan dan struktur halaman default.
            </p>
          </div>
          {templates.length === 0 ? (
            <p className="text-sm text-default-500">Belum ada template tersedia.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => {
                const isSelected = t.id === selectedTemplateId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary-50 shadow-md ring-2 ring-primary/20'
                        : 'border-default-200 bg-white hover:border-default-400 hover:shadow-sm'
                    }`}
                  >
                    <div
                      className={`flex h-28 items-center justify-center ${
                        t.slug === 'barber-classic'
                          ? 'bg-zinc-950 text-amber-400'
                          : 'bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700'
                      }`}
                    >
                      <span className="text-3xl">{t.slug === 'barber-classic' ? '✂' : t.name.slice(0, 2)}</span>
                    </div>
                    <div className="p-4">
                      <p className={`font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {t.name}
                      </p>
                      {t.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-default-500">{t.description}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Tampilan & Preview */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Sesuaikan Tampilan</h2>
            <p className="mt-1 text-sm text-default-500">
              Atur warna dan tipografi. Preview di kanan (atau bawah di mobile) langsung terupdate.
            </p>
          </div>
          <ThemeCustomizer
            layout="split"
            template={selectedTemplate}
            profile={profile}
            viewport={viewport}
            onViewportChange={setViewport}
            value={theme}
            templateDefault={templateDefaultTheme}
            onChange={setTheme}
            showMiniPreview={false}
          />
          <div className="rounded-xl border border-default-200 bg-default-50 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">{name || '—'}</p>
            <p className="text-default-500">/{slug} · {selectedTemplate?.name ?? '—'}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 border-t border-default-200 pt-6">
        <div>
          {step > 1 ? (
            <Button variant="light" onPress={goBack}>
              ← Sebelumnya
            </Button>
          ) : (
            <Button as={Link} href="/dashboard" variant="light">
              Batal
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          {step < 3 ? (
            <Button
              color="primary"
              isDisabled={step === 2 && templates.length === 0}
              onPress={goNext}
            >
              Lanjut →
            </Button>
          ) : (
            <Button
              color="primary"
              isLoading={submitting}
              isDisabled={templates.length === 0}
              onPress={handleSubmit}
            >
              Buat Website
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
