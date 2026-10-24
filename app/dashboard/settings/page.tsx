'use client';

import { Button, Card, CardBody, CardHeader } from '@heroui/react';
import { useEffect, useState } from 'react';

import { FormInput, FormSwitch, FormTextarea } from '../../components/form-field';
import { AudioUpload } from '../../components/audio-upload';
import { ThemeCustomizer } from '../../components/theme-customizer';
import { LoadingSpinner } from '../../components/loading-spinner';
import { LogoUpload } from '../../components/logo-upload';
import { NoWebsiteState } from '../../components/no-website-state';
import { TemplatePreview, type PreviewViewport } from '../../components/template-preview';
import { apiClient } from '../../lib/api-client';
import type { Website, WebsiteFooterSettings, WebsiteTemplate } from '../../lib/types';
import {
  extractTemplateTheme,
  resolveTheme,
  sanitizeWebsiteTheme,
  type WebsiteTheme,
} from '../../lib/website-theme';
import { hasMinRole } from '../../lib/types';
import { useConfirmDialog } from '../../components/confirm-dialog';
import { useWebsiteContext } from '../../context/website-context';

// Diaktifkan 9 September 2026 — bug session cookie lintas-domain sudah
// diperbaiki (session handoff SSO, port dari bagdja-auction-web yang sudah
// production) + UX Admin disamakan dengan Auction Market (auto-fetch,
// tombol Hapus domain, dst). Lihat plan/website-builder/custom-domain-adjustment-plan.md.
// Test matrix manual (login+logout via domain custom sungguhan, retry
// callback, dll — §3.4 dokumen itu) dilakukan Nandang langsung di
// lingkungan live setelah deploy, bukan dari sesi coding ini.
const CUSTOM_DOMAIN_FEATURE_ENABLED = true;

function getSocialLink(links: Record<string, unknown> | undefined, key: string): string {
  const val = links?.[key];
  return typeof val === 'string' ? val : '';
}

function getOpeningHoursNote(hours: Record<string, unknown> | undefined): string {
  const note = hours?.note;
  return typeof note === 'string' ? note : '';
}

const DEFAULT_FOOTER_SETTINGS: WebsiteFooterSettings = {
  enabled: true,
  show_logo: true,
  show_business_name: true,
  show_tagline: true,
  show_social_links: true,
  show_pages: true,
  show_address: true,
  show_whatsapp: true,
  show_phone: true,
  show_email: true,
  contact_heading: 'Kontak',
  pages_heading: 'Halaman',
  copyright_text: '© Bagdja Website Builder',
};

function readFooterSettings(raw: Record<string, unknown> | undefined): WebsiteFooterSettings {
  const settings = { ...DEFAULT_FOOTER_SETTINGS };
  if (!raw) return settings;

  for (const key of [
    'enabled',
    'show_logo',
    'show_business_name',
    'show_tagline',
    'show_social_links',
    'show_pages',
    'show_address',
    'show_whatsapp',
    'show_phone',
    'show_email',
  ] as const) {
    if (typeof raw[key] === 'boolean') settings[key] = raw[key];
  }
  for (const key of ['contact_heading', 'pages_heading', 'copyright_text'] as const) {
    if (typeof raw[key] === 'string') settings[key] = raw[key];
  }
  return settings;
}

/**
 * Satu baris record DNS (Tipe/Nama/Nilai) + tombol salin — port dari
 * `bagdja-auction-admin` `DomainRecordRow` (`dashboard/market-settings/page.tsx`).
 * Tombol salin pakai TEKS (bukan ikon) karena app ini (HeroUI) belum punya
 * dependency ikon (`lucide-react` dkk) — sengaja tidak ditambah dependency
 * baru cuma untuk ini.
 */
function DomainRecordRow({
  type,
  name,
  value,
  placeholder,
  fieldKey,
  copiedField,
  onCopy,
  last = false,
}: {
  type: string;
  name: string;
  value: string;
  placeholder?: string;
  fieldKey: string;
  copiedField: string | null;
  onCopy: (field: string, value: string) => void;
  last?: boolean;
}) {
  const isEmpty = !value;
  const copied = copiedField === fieldKey;

  return (
    <tr className={last ? '' : 'border-b border-default-100'}>
      <td className="px-3 py-2 align-top font-mono text-xs">{type}</td>
      <td className="px-3 py-2 align-top font-mono text-xs break-all">{name}</td>
      <td className={`px-3 py-2 align-top font-mono text-xs break-all ${isEmpty ? 'text-default-400' : ''}`}>
        {isEmpty ? (placeholder ?? '—') : value}
      </td>
      <td className="px-3 py-2 align-top">
        {!isEmpty && (
          <button
            type="button"
            onClick={() => onCopy(fieldKey, value)}
            className="text-xs text-default-500 underline hover:text-default-700"
          >
            {copied ? 'Tersalin!' : 'Salin'}
          </button>
        )}
      </td>
    </tr>
  );
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
  const [footerSettings, setFooterSettings] = useState<WebsiteFooterSettings>(DEFAULT_FOOTER_SETTINGS);
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(true);
  const [notificationSoundUrl, setNotificationSoundUrl] = useState('');
  const [savingSound, setSavingSound] = useState(false);
  const [soundMessage, setSoundMessage] = useState('');
  const [soundError, setSoundError] = useState('');
  const [theme, setTheme] = useState<WebsiteTheme>({});
  const [templateDefaultTheme, setTemplateDefaultTheme] = useState<WebsiteTheme>({});
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateMessage, setTemplateMessage] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [templatePreviewViewport, setTemplatePreviewViewport] = useState<PreviewViewport>('desktop');
  const [saving, setSaving] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [savingFooter, setSavingFooter] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [brandMessage, setBrandMessage] = useState('');
  const [footerMessage, setFooterMessage] = useState('');
  const [themeMessage, setThemeMessage] = useState('');
  const [error, setError] = useState('');
  const [brandError, setBrandError] = useState('');
  const [footerError, setFooterError] = useState('');
  const [themeError, setThemeError] = useState('');
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [removingDomain, setRemovingDomain] = useState(false);
  const [domainVerifyInfo, setDomainVerifyInfo] = useState<{
    recordName: string;
    recordValue: string;
    dnsTarget: { recordType: string; recordName: string; recordValue: string };
  } | null>(null);
  const [domainMessage, setDomainMessage] = useState('');
  const [domainError, setDomainError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

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
      setFooterSettings(readFooterSettings(w.footer_settings));
      setNotificationSoundEnabled(w.notification_sound_enabled !== false);
      setNotificationSoundUrl(w.notification_sound_url ?? '');
      setTheme(sanitizeWebsiteTheme(w.theme));
      setSelectedTemplateId(w.template_id ?? '');
    }
  }, [activeWebsite]);

  useEffect(() => {
    let cancelled = false;
    apiClient<WebsiteTemplate[]>('/api/templates')
      .then((data) => { if (!cancelled) setTemplates(data); })
      .catch((err) => { if (!cancelled) setTemplateError(err instanceof Error ? err.message : 'Gagal memuat template.'); })
      .finally(() => { if (!cancelled) setLoadingTemplates(false); });
    return () => { cancelled = true; };
  }, []);

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;

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

  const handleSaveFooter = async () => {
    if (!websiteId) return;
    setSavingFooter(true);
    setFooterError('');
    setFooterMessage('');
    try {
      await apiClient<Website>(`/api/websites/${websiteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ footer_settings: footerSettings }),
      });
      setFooterMessage('Pengaturan footer berhasil disimpan');
      await refresh();
    } catch (err) {
      setFooterError(err instanceof Error ? err.message : 'Gagal menyimpan footer');
    } finally {
      setSavingFooter(false);
    }
  };

  const handleSaveSound = async () => {
    if (!websiteId) return;
    setSavingSound(true);
    setSoundError('');
    setSoundMessage('');
    try {
      await apiClient<Website>(`/api/websites/${websiteId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          notification_sound_enabled: notificationSoundEnabled,
          notification_sound_url: notificationSoundUrl.trim() || null,
        }),
      });
      setSoundMessage('Pengaturan suara notifikasi berhasil disimpan');
      await refresh();
    } catch (err) {
      setSoundError(err instanceof Error ? err.message : 'Gagal menyimpan suara notifikasi');
    } finally {
      setSavingSound(false);
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

  const handleSaveTemplate = async () => {
    if (!websiteId || !selectedTemplateId || selectedTemplateId === activeWebsite?.website.template_id) return;
    const ok = await confirm({
      title: 'Ganti Template Website?',
      message: 'Tampilan dan layout publik akan mengikuti template baru. Halaman, produk, dan data website yang sudah ada tetap disimpan.',
      confirmLabel: 'Ya, Ganti Template',
      tone: 'default',
    });
    if (!ok) return;
    setSavingTemplate(true);
    setTemplateError('');
    setTemplateMessage('');
    try {
      await apiClient<Website>(`/api/websites/${websiteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ template_id: selectedTemplateId }),
      });
      setTemplateMessage('Template website berhasil diganti.');
      await refresh();
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : 'Gagal mengganti template.');
    } finally {
      setSavingTemplate(false);
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
      const result = await apiClient<{
        recordType: string;
        recordName: string;
        recordValue: string;
        dnsTarget: { recordType: string; recordName: string; recordValue: string };
      }>(`/api/websites/${websiteId}/domain/verify`, { method: 'POST' });
      setDomainVerifyInfo({
        recordName: result.recordName,
        recordValue: result.recordValue,
        dnsTarget: result.dnsTarget,
      });
      setDomainMessage('Tambahkan record DNS berikut, lalu klik "Cek Status".');
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

  // Gap sebelumnya (ditemukan 9 Sep 2026): TIDAK ADA tombol hapus domain
  // terpisah — satu-satunya cara sebelumnya adalah kosongkan field domain +
  // "Simpan Perubahan", yang cuma PATCH domain:null dan TIDAK PERNAH panggil
  // DELETE /domain (jadi coolifyService.removeDomain() juga tidak pernah
  // terpanggil — domain bisa nyangkut terdaftar di Coolify selamanya). Port
  // handleRemoveDomain dari bagdja-auction-admin.
  const handleDeleteDomain = async () => {
    if (!websiteId) return;
    const ok = await confirm({
      title: 'Hapus Domain Kustom?',
      message: 'Domain ini akan dilepas dari Website Anda dan verifikasi yang sudah ada akan direset. Website tetap bisa diakses lewat subdomain bawaan.',
      confirmLabel: 'Ya, Hapus Domain',
    });
    if (!ok) return;
    setRemovingDomain(true);
    setDomainError('');
    setDomainMessage('');
    try {
      await apiClient(`/api/websites/${websiteId}/domain`, { method: 'DELETE' });
      setDomainVerifyInfo(null);
      setDomain('');
      await refresh();
      setDomainMessage('Domain kustom berhasil dihapus.');
    } catch (err) {
      setDomainError(err instanceof Error ? err.message : 'Gagal menghapus domain');
    } finally {
      setRemovingDomain(false);
    }
  };

  async function handleCopy(field: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 1500);
    } catch {
      // Clipboard API bisa gagal (context tidak secure/permission ditolak) —
      // non-kritikal, user masih bisa select-and-copy manual dari tabel.
    }
  }

  // Auto-tampilkan record DNS begitu domain tersimpan & belum terverifikasi
  // — port dari bagdja-auction-admin (pola sama Vercel: langsung tampil
  // record begitu domain ditambahkan, bukan nunggu user klik tombol dulu).
  // Idempotent di sisi backend (reuse token lama), aman dipanggil ulang.
  useEffect(() => {
    if (domainDirty || !savedDomain || domainVerifiedAt) return;
    if (domainVerifyInfo || verifyingDomain) return;
    void handleVerifyDomain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainDirty, savedDomain, domainVerifiedAt, domainVerifyInfo, verifyingDomain]);

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
          <h2 className="text-lg font-semibold">Footer Store Classic</h2>
          <p className="text-sm font-normal text-default-500">
            Atur bagian footer secara global. Pengaturan ini berlaku di semua halaman saat template Store Classic digunakan.
          </p>
        </CardHeader>
        <CardBody className="flex flex-col gap-5 px-6 py-5">
          <FormSwitch
            label="Tampilkan footer"
            checked={footerSettings.enabled !== false}
            onChange={(enabled) => setFooterSettings((current) => ({ ...current, enabled }))}
            disabled={!canEdit}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <FormSwitch
              label="Logo"
              checked={footerSettings.show_logo !== false}
              onChange={(show_logo) => setFooterSettings((current) => ({ ...current, show_logo }))}
              disabled={!canEdit || footerSettings.enabled === false}
            />
            <FormSwitch
              label="Nama website"
              checked={footerSettings.show_business_name !== false}
              onChange={(show_business_name) => setFooterSettings((current) => ({ ...current, show_business_name }))}
              disabled={!canEdit || footerSettings.enabled === false}
            />
            <FormSwitch
              label="Tagline"
              checked={footerSettings.show_tagline !== false}
              onChange={(show_tagline) => setFooterSettings((current) => ({ ...current, show_tagline }))}
              disabled={!canEdit || footerSettings.enabled === false}
            />
            <FormSwitch
              label="Media sosial"
              checked={footerSettings.show_social_links !== false}
              onChange={(show_social_links) => setFooterSettings((current) => ({ ...current, show_social_links }))}
              disabled={!canEdit || footerSettings.enabled === false}
            />
            <FormSwitch
              label="Link halaman"
              checked={footerSettings.show_pages !== false}
              onChange={(show_pages) => setFooterSettings((current) => ({ ...current, show_pages }))}
              disabled={!canEdit || footerSettings.enabled === false}
            />
            <FormSwitch
              label="Alamat lokasi utama"
              checked={footerSettings.show_address !== false}
              onChange={(show_address) => setFooterSettings((current) => ({ ...current, show_address }))}
              disabled={!canEdit || footerSettings.enabled === false}
            />
            <FormSwitch
              label="WhatsApp"
              checked={footerSettings.show_whatsapp !== false}
              onChange={(show_whatsapp) => setFooterSettings((current) => ({ ...current, show_whatsapp }))}
              disabled={!canEdit || footerSettings.enabled === false}
            />
            <FormSwitch
              label="Telepon"
              checked={footerSettings.show_phone !== false}
              onChange={(show_phone) => setFooterSettings((current) => ({ ...current, show_phone }))}
              disabled={!canEdit || footerSettings.enabled === false}
            />
            <FormSwitch
              label="Email"
              checked={footerSettings.show_email !== false}
              onChange={(show_email) => setFooterSettings((current) => ({ ...current, show_email }))}
              disabled={!canEdit || footerSettings.enabled === false}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormInput
              label="Judul kontak"
              value={footerSettings.contact_heading ?? ''}
              onChange={(contact_heading) => setFooterSettings((current) => ({ ...current, contact_heading }))}
              disabled={!canEdit || footerSettings.enabled === false}
            />
            <FormInput
              label="Judul link halaman"
              value={footerSettings.pages_heading ?? ''}
              onChange={(pages_heading) => setFooterSettings((current) => ({ ...current, pages_heading }))}
              disabled={!canEdit || footerSettings.enabled === false}
            />
          </div>
          <FormInput
            label="Teks copyright"
            value={footerSettings.copyright_text ?? ''}
            onChange={(copyright_text) => setFooterSettings((current) => ({ ...current, copyright_text }))}
            disabled={!canEdit || footerSettings.enabled === false}
            description="Kosongkan untuk menyembunyikan baris copyright."
          />
          {footerMessage && (
            <div className="rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success">
              {footerMessage}
            </div>
          )}
          {footerError && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">
              {footerError}
            </div>
          )}
          {canEdit && (
            <div className="pt-1">
              <Button color="primary" isLoading={savingFooter} onPress={handleSaveFooter}>
                Simpan Footer
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="border border-default-200 shadow-sm">
        <CardHeader className="flex flex-col items-start gap-1 border-b border-default-100 px-6 py-4">
          <h2 className="text-lg font-semibold">Notifikasi</h2>
          <p className="text-sm font-normal text-default-500">
            Toast tetap muncul. Suara bisa dimatikan atau diganti file sendiri.
          </p>
        </CardHeader>
        <CardBody className="flex flex-col gap-5 px-6 py-5">
          <FormSwitch
            label="Putar suara saat notifikasi masuk"
            description="Berlaku di dashboard admin dan situs pembeli yang login."
            checked={notificationSoundEnabled}
            onChange={setNotificationSoundEnabled}
            disabled={!canEdit}
          />
          <AudioUpload
            value={notificationSoundUrl}
            onChange={setNotificationSoundUrl}
            websiteId={websiteId ?? undefined}
            disabled={!canEdit}
          />
          {soundMessage && (
            <div className="rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success">
              {soundMessage}
            </div>
          )}
          {soundError && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">
              {soundError}
            </div>
          )}
          {canEdit && (
            <div className="pt-1">
              <Button color="primary" isLoading={savingSound} onPress={handleSaveSound}>
                Simpan Notifikasi
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="border border-default-200 shadow-sm">
        <CardHeader className="flex flex-col items-start gap-1 border-b border-default-100 px-6 py-4">
          <h2 className="text-lg font-semibold">Template Website</h2>
          <p className="text-sm font-normal text-default-500">Ganti desain publik tanpa menghapus halaman dan data website.</p>
        </CardHeader>
        <CardBody className="flex flex-col gap-5 px-6 py-5">
          {loadingTemplates ? <p className="text-sm text-default-500">Memuat template…</p> : templates.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => {
                const selected = template.id === selectedTemplateId;
                return (
                  <button
                    key={template.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => { setSelectedTemplateId(template.id); setTemplateMessage(''); setTemplateError(''); }}
                    disabled={!canEdit}
                    className={`overflow-hidden rounded-lg border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-default-200 hover:border-default-400'}`}
                  >
                    {template.preview_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={template.preview_image} alt={`Preview ${template.name}`} className="h-28 w-full object-cover" />
                    ) : <div className="flex h-28 items-center justify-center bg-default-100 text-2xl font-semibold text-default-500">{template.name.slice(0, 2)}</div>}
                    <span className="block px-3 py-2.5">
                      <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                        {template.name}
                        {selected ? <span className="text-xs font-medium text-primary">Dipilih</span> : null}
                      </span>
                      {template.description ? <span className="mt-1 block line-clamp-2 text-xs font-normal text-default-500">{template.description}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : <p className="text-sm text-default-500">Tidak ada template aktif yang tersedia.</p>}

          {selectedTemplate ? (
            <div>
              <p className="mb-2 text-sm font-medium">Preview: {selectedTemplate.name}</p>
              <TemplatePreview
                template={selectedTemplate}
                profile={{
                  name: name || activeWebsite?.website.name,
                  tagline,
                  logo_url: logoUrl,
                  whatsapp,
                  phone,
                  email,
                  footerSettings,
                  theme,
                }}
                viewport={templatePreviewViewport}
                onViewportChange={setTemplatePreviewViewport}
                showToolbar
                interactive={false}
              />
            </div>
          ) : null}

          {templateMessage ? <p role="status" className="rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success">{templateMessage}</p> : null}
          {templateError ? <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">{templateError}</p> : null}
          {canEdit && (
            <div className="pt-1">
              <Button color="primary" isLoading={savingTemplate} isDisabled={!selectedTemplateId || selectedTemplateId === activeWebsite?.website.template_id} onPress={handleSaveTemplate}>
                Simpan Template
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
          {CUSTOM_DOMAIN_FEATURE_ENABLED ? (
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
          ) : (
            <div className="rounded-lg border border-default-200 bg-default-50 px-4 py-3 text-sm text-default-500">
              Fitur domain kustom sedang dalam perbaikan dan sementara tidak tersedia. Website Anda
              tetap bisa diakses lewat subdomain <strong>{slug || '{slug}'}.sites.bagdja.com</strong>.
            </div>
          )}

          {CUSTOM_DOMAIN_FEATURE_ENABLED && savedDomain && (
            <div className="rounded-lg border border-default-200 bg-default-50 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{savedDomain}</p>
                {domainVerifiedAt ? (
                  <span className="rounded-full bg-success-100 px-2 py-0.5 text-xs font-medium text-success-700">
                    Terverifikasi
                  </span>
                ) : (
                  <span className="rounded-full bg-danger-100 px-2 py-0.5 text-xs font-medium text-danger-700">
                    Verifikasi Diperlukan
                  </span>
                )}
                {canEdit && !domainDirty && (
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" variant="flat" isLoading={checkingDomain} onPress={handleCheckDomain}>
                      Refresh
                    </Button>
                    <Button size="sm" color="danger" variant="flat" isLoading={removingDomain} onPress={handleDeleteDomain}>
                      Hapus
                    </Button>
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-default-500">
                {domainDirty
                  ? 'Simpan perubahan domain terlebih dahulu untuk memverifikasi.'
                  : domainVerifiedAt
                    ? `Terverifikasi sejak ${new Date(domainVerifiedAt).toLocaleString('id-ID')}. TLS/HTTPS domain ini tetap tanggung jawab Anda lewat akun Cloudflare sendiri.`
                    : 'Perbarui DNS record di penyedia domain Anda agar sesuai dengan yang tercantum di bawah. Ini memverifikasi kepemilikan domain sekaligus mengarahkannya ke platform kami.'}
              </p>

              {verifyingDomain && !domainVerifyInfo && (
                <p className="mt-3 text-xs text-default-500">Memuat record DNS…</p>
              )}

              {domainVerifyInfo && (
                <div className="mt-3 space-y-3">
                  <div className="overflow-x-auto rounded-md border border-default-200 bg-white">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-default-100 bg-default-50 text-left text-xs text-default-500">
                          <th className="px-3 py-2 font-medium">Tipe</th>
                          <th className="px-3 py-2 font-medium">Nama</th>
                          <th className="px-3 py-2 font-medium">Nilai</th>
                          <th className="px-3 py-2 font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        <DomainRecordRow
                          type="TXT"
                          name={domainVerifyInfo.recordName}
                          value={domainVerifyInfo.recordValue}
                          fieldKey="txt"
                          copiedField={copiedField}
                          onCopy={handleCopy}
                        />
                        <DomainRecordRow
                          type={domainVerifyInfo.dnsTarget.recordType}
                          name={domainVerifyInfo.dnsTarget.recordName}
                          value={domainVerifyInfo.dnsTarget.recordValue}
                          placeholder="(isi CUSTOM_DOMAIN_TARGET_IP di server dulu)"
                          fieldKey="a"
                          copiedField={copiedField}
                          onCopy={handleCopy}
                          last
                        />
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-default-500">
                    Perubahan DNS bisa perlu beberapa menit untuk propagasi. Klik &quot;Refresh&quot; di atas
                    untuk cek ulang setelah menambahkan record.
                  </p>
                  <div className="rounded-md border border-default-200 bg-default-50 p-3 text-sm">
                    <p className="font-medium">Aktifkan HTTPS lewat Cloudflare Anda sendiri</p>
                    <p className="mt-1 text-default-500">
                      Daftarkan domain ini di akun Cloudflare Anda, aktifkan proxy (awan oranye), lalu set
                      mode SSL/TLS ke &quot;Full&quot;. Cloudflare akan otomatis mengurus sertifikat HTTPS
                      untuk pengunjung Anda — bukan tanggung jawab kami.
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
