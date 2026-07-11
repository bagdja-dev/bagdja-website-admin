'use client';

import { Button, Card, CardBody, CardHeader } from '@heroui/react';
import { useEffect, useState } from 'react';

import { FormInput, FormSwitch, FormTextarea } from '../../components/form-field';
import { ThemeCustomizer } from '../../components/theme-customizer';
import { LoadingSpinner } from '../../components/loading-spinner';
import { LogoUpload } from '../../components/logo-upload';
import { NoWebsiteState } from '../../components/no-website-state';
import { apiClient } from '../../lib/api-client';
import type { Website, WebsiteTemplate } from '../../lib/types';
import {
  extractTemplateTheme,
  resolveTheme,
  sanitizeWebsiteTheme,
  type WebsiteTheme,
} from '../../lib/website-theme';
import { hasMinRole } from '../../lib/types';
import { useConfirmDialog } from '../../components/confirm-dialog';
import { useWebsiteContext } from '../../context/website-context';

function getSocialLink(links: Record<string, unknown> | undefined, key: string): string {
  const val = links?.[key];
  return typeof val === 'string' ? val : '';
}

function getOpeningHoursNote(hours: Record<string, unknown> | undefined): string {
  const note = hours?.note;
  return typeof note === 'string' ? note : '';
}

export default function SettingsPage() {
  const { activeWebsite, websiteId, role, loading: ctxLoading, refresh } = useWebsiteContext();
  const { confirm, dialog } = useConfirmDialog();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [domain, setDomain] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [tagline, setTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [openingHoursNote, setOpeningHoursNote] = useState('');
  const [theme, setTheme] = useState<WebsiteTheme>({});
  const [templateDefaultTheme, setTemplateDefaultTheme] = useState<WebsiteTheme>({});
  const [saving, setSaving] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [brandMessage, setBrandMessage] = useState('');
  const [themeMessage, setThemeMessage] = useState('');
  const [error, setError] = useState('');
  const [brandError, setBrandError] = useState('');
  const [themeError, setThemeError] = useState('');
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainVerifyInfo, setDomainVerifyInfo] = useState<{ recordName: string; recordValue: string } | null>(
    null,
  );
  const [domainMessage, setDomainMessage] = useState('');
  const [domainError, setDomainError] = useState('');

  const canEdit = role ? hasMinRole(role, 'admin') : false;
  const canDelete = role === 'owner';

  useEffect(() => {
    const w = activeWebsite?.website;
    if (w) {
      setName(w.name);
      setSlug(w.slug);
      setDomain(w.domain ?? '');
      setIsActive(w.is_active);
      setTagline(w.tagline ?? '');
      setLogoUrl(w.logo_url ?? '');
      setWhatsapp(w.whatsapp ?? '');
      setPhone(w.phone ?? '');
      setEmail(w.email ?? '');
      setInstagram(getSocialLink(w.social_links, 'instagram'));
      setFacebook(getSocialLink(w.social_links, 'facebook'));
      setTiktok(getSocialLink(w.social_links, 'tiktok'));
      setOpeningHoursNote(getOpeningHoursNote(w.opening_hours));
      setTheme(sanitizeWebsiteTheme(w.theme));
    }
  }, [activeWebsite]);

  useEffect(() => {
    const templateId = activeWebsite?.website?.template_id;
    if (!templateId) {
      setTemplateDefaultTheme({});
      return;
    }
    apiClient<WebsiteTemplate>(`/api/templates/${templateId}`)
      .then((tpl) => setTemplateDefaultTheme(extractTemplateTheme(tpl.structure)))
      .catch(() => setTemplateDefaultTheme({}));
  }, [activeWebsite?.website?.template_id]);

  const handleSave = async () => {
    if (!websiteId || !name.trim() || !slug.trim()) {
      setError('Nama dan slug wajib diisi');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await apiClient<Website>(`/api/websites/${websiteId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          domain: domain.trim() || null,
          is_active: isActive,
        }),
      });
      setMessage('Pengaturan berhasil disimpan');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBrand = async () => {
    if (!websiteId) return;
    setSavingBrand(true);
    setBrandError('');
    setBrandMessage('');
    try {
      const social_links: Record<string, string> = {};
      if (instagram.trim()) social_links.instagram = instagram.trim();
      if (facebook.trim()) social_links.facebook = facebook.trim();
      if (tiktok.trim()) social_links.tiktok = tiktok.trim();

      await apiClient<Website>(`/api/websites/${websiteId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          tagline: tagline.trim() || null,
          logo_url: logoUrl.trim() || null,
          whatsapp: whatsapp.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          social_links,
          opening_hours: openingHoursNote.trim() ? { note: openingHoursNote.trim() } : {},
        }),
      });
      setBrandMessage('Profil brand berhasil disimpan');
      await refresh();
    } catch (err) {
      setBrandError(err instanceof Error ? err.message : 'Gagal menyimpan profil');
    } finally {
      setSavingBrand(false);
    }
  };

  const handleSaveTheme = async () => {
    if (!websiteId) return;
    setSavingTheme(true);
    setThemeError('');
    setThemeMessage('');
    try {
      await apiClient<Website>(`/api/websites/${websiteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ theme }),
      });
      setThemeMessage('Skema warna berhasil disimpan');
      await refresh();
    } catch (err) {
      setThemeError(err instanceof Error ? err.message : 'Gagal menyimpan skema warna');
    } finally {
      setSavingTheme(false);
    }
  };

  const savedDomain = activeWebsite?.website?.domain ?? null;
  const domainVerifiedAt = activeWebsite?.website?.domain_verified_at ?? null;
  const domainDirty = domain.trim() !== (savedDomain ?? '');

  const handleVerifyDomain = async () => {
    if (!websiteId) return;
    setVerifyingDomain(true);
    setDomainError('');
    setDomainMessage('');
    try {
      const result = await apiClient<{ recordType: string; recordName: string; recordValue: string }>(
        `/api/websites/${websiteId}/domain/verify`,
        { method: 'POST' },
      );
      setDomainVerifyInfo({ recordName: result.recordName, recordValue: result.recordValue });
      setDomainMessage('Tambahkan TXT record berikut di DNS domain Anda, lalu klik "Cek Status".');
    } catch (err) {
      setDomainError(err instanceof Error ? err.message : 'Gagal memulai verifikasi domain');
    } finally {
      setVerifyingDomain(false);
    }
  };

  const handleCheckDomain = async () => {
    if (!websiteId) return;
    setCheckingDomain(true);
    setDomainError('');
    setDomainMessage('');
    try {
      await apiClient(`/api/websites/${websiteId}/domain/check`, { method: 'POST' });
      setDomainMessage('Domain berhasil diverifikasi dan aktif!');
      setDomainVerifyInfo(null);
      await refresh();
    } catch (err) {
      setDomainError(err instanceof Error ? err.message : 'Verifikasi gagal, coba lagi');
    } finally {
      setCheckingDomain(false);
    }
  };

  const handleDelete = async () => {
    if (!websiteId) return;
    const ok = await confirm({
      title: 'Hapus Website Permanen?',
      message: 'Semua halaman, produk, lokasi, FAQ, artikel, dan data staff terkait akan ikut terhapus. Tindakan ini tidak bisa dibatalkan.',
      confirmLabel: 'Ya, Hapus Permanen',
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await apiClient(`/api/websites/${websiteId}`, { method: 'DELETE' });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus website');
    } finally {
      setDeleting(false);
    }
  };

  if (ctxLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pengaturan</h1>
        <p className="mt-1 text-default-500">Konfigurasi website, profil brand, dan status.</p>
      </div>

      <Card className="border border-default-200 shadow-sm">
        <CardHeader className="border-b border-default-100 px-6 py-4">
          <h2 className="text-lg font-semibold">Profil Brand</h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-5 px-6 py-5">
          <FormInput
            label="Tagline"
            placeholder="Premium Barbershop sejak 2020"
            value={tagline}
            onChange={setTagline}
            disabled={!canEdit}
          />
          <LogoUpload
            value={logoUrl}
            onChange={setLogoUrl}
            websiteId={websiteId ?? undefined}
            disabled={!canEdit}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <FormInput
              label="WhatsApp"
              placeholder="6281234567890"
              value={whatsapp}
              onChange={setWhatsapp}
              disabled={!canEdit}
              description="Format internasional tanpa +"
            />
            <FormInput
              label="Telepon"
              placeholder="+62 812 3456 7890"
              value={phone}
              onChange={setPhone}
              disabled={!canEdit}
            />
          </div>
          <FormInput
            label="Email"
            type="email"
            placeholder="hello@myshop.com"
            value={email}
            onChange={setEmail}
            disabled={!canEdit}
          />
          <FormTextarea
            label="Jam Operasional"
            placeholder="Senin–Sabtu 09:00–21:00"
            value={openingHoursNote}
            onChange={setOpeningHoursNote}
            disabled={!canEdit}
            rows={2}
          />
          <div className="grid gap-5 sm:grid-cols-3">
            <FormInput
              label="Instagram"
              placeholder="@myshop"
              value={instagram}
              onChange={setInstagram}
              disabled={!canEdit}
            />
            <FormInput
              label="Facebook"
              placeholder="myshop"
              value={facebook}
              onChange={setFacebook}
              disabled={!canEdit}
            />
            <FormInput
              label="TikTok"
              placeholder="@myshop"
              value={tiktok}
              onChange={setTiktok}
              disabled={!canEdit}
            />
          </div>

          {brandMessage && (
            <div className="rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success">
              {brandMessage}
            </div>
          )}
          {brandError && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">
              {brandError}
            </div>
          )}

          {canEdit && (
            <div className="pt-1">
              <Button color="primary" isLoading={savingBrand} onPress={handleSaveBrand}>
                Simpan Profil Brand
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="border border-default-200 shadow-sm">
        <CardHeader className="flex flex-col items-start gap-1 border-b border-default-100 px-6 py-4">
          <h2 className="text-lg font-semibold">Skema Warna</h2>
          <p className="text-sm font-normal text-default-500">
            Warna tampilan website publik. Default mengikuti template (
            {resolveTheme(templateDefaultTheme).colors.accent} ·{' '}
            {resolveTheme(templateDefaultTheme).typography.headingFont}
            ).
          </p>
        </CardHeader>
        <CardBody className="flex flex-col gap-5 px-6 py-5">
          <ThemeCustomizer
            layout="editor-only"
            value={theme}
            templateDefault={templateDefaultTheme}
            onChange={setTheme}
            disabled={!canEdit}
          />

          {themeMessage && (
            <div className="rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success">
              {themeMessage}
            </div>
          )}
          {themeError && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">
              {themeError}
            </div>
          )}

          {canEdit && (
            <div className="pt-1">
              <Button color="primary" isLoading={savingTheme} onPress={handleSaveTheme}>
                Simpan Skema Warna
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="border border-default-200 shadow-sm">
        <CardHeader className="border-b border-default-100 px-6 py-4">
          <h2 className="text-lg font-semibold">Informasi Website</h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-5 px-6 py-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormInput
              label="Nama Website"
              value={name}
              onChange={setName}
              disabled={!canEdit}
              required
            />
            <FormInput
              label="Slug URL"
              value={slug}
              onChange={setSlug}
              disabled={!canEdit}
              description="Hanya huruf kecil, angka, dan strip"
              required
            />
          </div>
          <FormInput
            label="Domain Kustom (opsional)"
            placeholder="www.mybusiness.com"
            value={domain}
            onChange={(v) => {
              setDomain(v);
              setDomainVerifyInfo(null);
              setDomainMessage('');
              setDomainError('');
            }}
            disabled={!canEdit}
            description="Simpan perubahan dulu, baru verifikasi kepemilikan domain di bawah."
          />

          {savedDomain && (
            <div className="rounded-lg border border-default-200 bg-default-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{savedDomain}</p>
                  <p className="mt-0.5 text-xs text-default-500">
                    {domainDirty
                      ? 'Simpan perubahan domain terlebih dahulu untuk memverifikasi.'
                      : domainVerifiedAt
                        ? `Terverifikasi ✓ sejak ${new Date(domainVerifiedAt).toLocaleDateString('id-ID')}`
                        : 'Belum diverifikasi'}
                  </p>
                </div>
                {canEdit && !domainDirty && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="flat" isLoading={verifyingDomain} onPress={handleVerifyDomain}>
                      {domainVerifiedAt ? 'Verifikasi Ulang' : 'Verifikasi Domain'}
                    </Button>
                    {!domainVerifiedAt && (
                      <Button size="sm" color="primary" isLoading={checkingDomain} onPress={handleCheckDomain}>
                        Cek Status
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {domainVerifyInfo && (
                <div className="mt-3 rounded-md border border-default-200 bg-white px-3 py-2 text-xs">
                  <p className="text-default-600">
                    Tambahkan DNS TXT record berikut di penyedia domain Anda, lalu klik &quot;Cek Status&quot;:
                  </p>
                  <div className="mt-2 space-y-1 font-mono">
                    <p>
                      <span className="text-default-400">Name: </span>
                      {domainVerifyInfo.recordName}
                    </p>
                    <p>
                      <span className="text-default-400">Value: </span>
                      {domainVerifyInfo.recordValue}
                    </p>
                  </div>
                </div>
              )}

              {domainMessage && <p className="mt-2 text-xs text-success">{domainMessage}</p>}
              {domainError && <p className="mt-2 text-xs text-danger">{domainError}</p>}
            </div>
          )}

          <FormSwitch
            label="Website aktif (publik)"
            description="Nonaktifkan untuk menyembunyikan website dari publik"
            checked={isActive}
            onChange={setIsActive}
            disabled={!canEdit}
          />

          {message && (
            <div className="rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          {canEdit && (
            <div className="pt-1">
              <Button color="primary" isLoading={saving} onPress={handleSave}>
                Simpan Perubahan
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {canDelete && (
        <Card className="border border-danger-200 bg-danger-50/30 shadow-sm">
          <CardHeader className="border-b border-danger-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-danger">Zona Bahaya</h2>
          </CardHeader>
          <CardBody className="flex flex-col gap-4 px-6 py-5">
            <p className="text-sm text-default-600">
              Menghapus website akan menghapus semua halaman, produk, dan data staff terkait.
            </p>
            <Button color="danger" variant="flat" isLoading={deleting} onPress={handleDelete}>
              Hapus Website Permanen
            </Button>
          </CardBody>
        </Card>
      )}
      {dialog}
    </div>
  );
}
