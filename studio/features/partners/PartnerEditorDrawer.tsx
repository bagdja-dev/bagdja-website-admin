'use client';

import { Button, Checkbox, Input, Select, SelectItem, Switch, Textarea } from '@heroui/react';
import { useEffect, useRef, useState } from 'react';

import { errorMessage } from '@/studio/api/client';
import {
  createPartner,
  createPartnerAccount,
  updatePartner,
  upsertPartnerTranslation,
  type PartnerCategoryDto,
  type WebsiteLanguageDto,
  type WebsitePartnerDto,
} from '@/studio/api/company-profile';
import type { WebsiteLocationRow } from '@/studio/api/locations';
import { uploadAsset } from '@/studio/lib/upload-asset';
import { EditDrawer } from '@/studio/ui/primitives/EditDrawer';

const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const LOGO_MAX_BYTES = 5 * 1024 * 1024;

interface PartnerTranslationDraft {
  name: string;
  description: string;
}

interface PartnerEditorDrawerProps {
  websiteId: string;
  isOpen: boolean;
  partner: WebsitePartnerDto | null;
  languages: WebsiteLanguageDto[];
  categories: PartnerCategoryDto[];
  categoriesLoading: boolean;
  locations: WebsiteLocationRow[];
  onClose: () => void;
  onSaved: (partner: WebsitePartnerDto, created: boolean) => void;
}

export function PartnerEditorDrawer({
  websiteId,
  isOpen,
  partner,
  languages,
  categories,
  categoriesLoading,
  locations,
  onClose,
  onSaved,
}: PartnerEditorDrawerProps) {
  const logoInput = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [notes, setNotes] = useState('');
  const [isClient, setIsClient] = useState(true);
  const [isProvider, setIsProvider] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [locale, setLocale] = useState('id');
  const [translations, setTranslations] = useState<Record<string, PartnerTranslationDraft>>({});
  const [accountId, setAccountId] = useState('');
  const [accountRole, setAccountRole] = useState('client');

  const currentTranslation = translations[locale] ?? { name: '', description: '' };

  useEffect(() => {
    if (!isOpen) return;
    const defaultLocale = languages.find((language) => language.is_default)?.locale ?? languages[0]?.locale ?? 'id';
    setLocale(defaultLocale);
    setName(partner?.name ?? '');
    setLogoUrl(partner?.logo_url ?? '');
    setWebsiteUrl(partner?.website_url ?? '');
    setContactWhatsapp(partner?.contact_whatsapp ?? '');
    setNotes(partner?.notes ?? '');
    setIsClient(partner?.is_client ?? true);
    setIsProvider(partner?.is_provider ?? false);
    setIsPublic(partner?.is_public ?? false);
    setIsActive(partner?.is_active ?? true);
    setCategoryIds(partner?.categories.map((category) => category.id) ?? []);
    setLocationIds(partner?.vendor_locations.map((coverage) => coverage.location_id) ?? []);
    setTranslations(Object.fromEntries((partner?.translations ?? []).map((translation) => [
      translation.locale,
      { name: translation.name, description: translation.description ?? '' },
    ])));
    setAccountId('');
    setAccountRole(partner?.bagdja_accounts[0]?.role ?? 'client');
    setError(null);
  }, [isOpen, partner, languages]);

  const updateTranslation = (patch: Partial<PartnerTranslationDraft>) => {
    setTranslations((current) => ({
      ...current,
      [locale]: { ...(current[locale] ?? { name: '', description: '' }), ...patch },
    }));
  };

  const uploadLogo = async (file: File) => {
    if (!LOGO_TYPES.includes(file.type)) {
      setError('Pilih logo PNG, JPG, WebP, atau GIF.');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError('Ukuran logo maksimal 5 MB.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadAsset(file, websiteId, 'content');
      setLogoUrl(uploaded.url);
    } catch (cause) {
      setError(errorMessage(cause, 'Gagal mengunggah logo.'));
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!name.trim()) {
      setError('Nama partner wajib diisi.');
      return;
    }
    if (!isClient && !isProvider) {
      setError('Pilih minimal satu peran: klien atau penyedia.');
      return;
    }
    if (!isProvider && locationIds.length) {
      setError('Lokasi layanan hanya dapat diberikan kepada partner berperan sebagai penyedia.');
      return;
    }
    setSaving(true);
    setError(null);
    let savedPartner: WebsitePartnerDto | null = null;
    try {
      const payload = {
        name: name.trim(),
        logo_url: logoUrl.trim() || null,
        website_url: websiteUrl.trim() || null,
        contact_whatsapp: contactWhatsapp.trim() || null,
        notes: notes.trim() || null,
        is_client: isClient,
        is_provider: isProvider,
        is_public: isPublic,
        is_active: isActive,
        category_ids: categoryIds,
        location_ids: locationIds,
      };
      const created = partner === null;
      savedPartner = created
        ? await createPartner(websiteId, payload)
        : await updatePartner(websiteId, partner.id, payload);
      const translationName = currentTranslation.name.trim() || name.trim();
      await upsertPartnerTranslation(websiteId, savedPartner.id, locale, {
        name: translationName,
        description: currentTranslation.description.trim() || null,
      });
      if (accountId.trim()) {
        await createPartnerAccount(websiteId, savedPartner.id, {
          bagdja_account_id: accountId.trim(),
          role: accountRole.trim() || 'member',
        });
      }
      onSaved(savedPartner, created);
      onClose();
    } catch (cause) {
      setError(savedPartner
        ? `Partner tersimpan, tetapi relasi terjemahan/akun belum lengkap: ${errorMessage(cause)}`
        : errorMessage(cause, 'Gagal menyimpan partner.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={partner ? `Edit ${partner.name}` : 'Tambah partner'}
      description="Kelola satu identitas partner untuk peran klien, penyedia, atau keduanya."
      onSubmit={() => void submit()}
      submitLabel={partner ? 'Simpan perubahan' : 'Tambah partner'}
      isSubmitting={saving}
      isSubmitDisabled={!name.trim() || (!isClient && !isProvider) || uploading}
    >
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-3">
          <Input label="Nama partner" labelPlacement="outside" value={name} onValueChange={setName} isRequired description="Nama identitas yang digunakan admin untuk mengenali record ini." />
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="flex h-16 w-24 items-center justify-center rounded-lg border border-default-200 bg-default-50 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL gambar dari storage tenant */}
                <img src={logoUrl} alt={`Logo ${name || 'partner'}`} className="max-h-full max-w-full object-contain" />
              </div>
            ) : <div className="flex h-16 w-24 items-center justify-center rounded-lg border border-dashed border-default-300 text-xs text-default-500">Belum ada logo</div>}
            <div className="flex flex-col gap-1">
              <Button size="sm" variant="bordered" isLoading={uploading} isDisabled={uploading} onPress={() => logoInput.current?.click()}>{logoUrl ? 'Ganti logo' : 'Unggah logo'}</Button>
              {logoUrl && <Button size="sm" color="danger" variant="light" onPress={() => setLogoUrl('')}>Hapus logo</Button>}
              <span className="text-[11px] text-default-500">PNG, JPG, WebP, GIF · maks. 5 MB</span>
            </div>
            <input ref={logoInput} type="file" accept={LOGO_TYPES.join(',')} hidden onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void uploadLogo(file); event.currentTarget.value = ''; }} />
          </div>
          <Input label="Website" labelPlacement="outside" value={websiteUrl} onValueChange={setWebsiteUrl} placeholder="https://..." />
          <Input label="WhatsApp" labelPlacement="outside" value={contactWhatsapp} onValueChange={setContactWhatsapp} />
          <Textarea label="Catatan internal" labelPlacement="outside" value={notes} onValueChange={setNotes} minRows={2} />
        </section>

        <section className="flex flex-col gap-2 border-t border-default-100 pt-4">
          <h3 className="text-sm font-semibold">Peran dan publikasi</h3>
          <Checkbox isSelected={isClient} onValueChange={setIsClient}>Klien</Checkbox>
          <Checkbox isSelected={isProvider} onValueChange={setIsProvider}>Penyedia / vendor</Checkbox>
          <Switch size="sm" isSelected={isPublic} onValueChange={setIsPublic}>Boleh ditampilkan di website publik</Switch>
          <Switch size="sm" isSelected={isActive} onValueChange={setIsActive}>Partner aktif</Switch>
        </section>

        <section className="flex flex-col gap-2 border-t border-default-100 pt-4">
          <h3 className="text-sm font-semibold">Kategori</h3>
          {categoriesLoading ? (
            <p className="text-xs text-default-500">Memuat kategori...</p>
          ) : categories.length ? categories.map((category) => (
            <Checkbox
              key={category.id}
              isSelected={categoryIds.includes(category.id)}
              onValueChange={(selected) => setCategoryIds((current) => selected
                ? [...new Set([...current, category.id])]
                : current.filter((id) => id !== category.id))}
            >
              {category.name}{category.is_public ? ' · publik' : ''}
            </Checkbox>
          )) : <p className="text-xs text-default-500">Belum ada kategori. Tambahkan melalui tab Kategori pada halaman Kelola Partner.</p>}
        </section>

        {isProvider && (
          <section className="flex flex-col gap-2 border-t border-default-100 pt-4">
            <h3 className="text-sm font-semibold">Lokasi layanan</h3>
            {locations.length ? locations.map((location) => (
              <Checkbox
                key={location.id}
                isSelected={locationIds.includes(location.id)}
                onValueChange={(selected) => setLocationIds((current) => selected
                  ? [...new Set([...current, location.id])]
                  : current.filter((id) => id !== location.id))}
              >
                {location.name}
              </Checkbox>
            )) : <p className="text-xs text-default-500">Belum ada lokasi layanan.</p>}
          </section>
        )}

        <section className="flex flex-col gap-3 border-t border-default-100 pt-4">
          <h3 className="text-sm font-semibold">Nama dan deskripsi untuk renderer</h3>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs font-medium text-default-600">Bahasa konten</span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.currentTarget.value)}
              disabled={languages.length === 0}
              className="h-10 w-full rounded-medium border border-default-200 bg-default-50 px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {languages.length === 0 ? (
                <option value={locale}>Tidak ada bahasa aktif</option>
              ) : (
                languages.map((language) => (
                  <option key={language.locale} value={language.locale}>
                    {language.label} ({language.locale}){language.is_default ? ' · default' : ''}
                  </option>
                ))
              )}
            </select>
          </label>
          <Input label="Nama tampilan" labelPlacement="outside" value={currentTranslation.name} onValueChange={(value) => updateTranslation({ name: value })} placeholder={name || 'Nama lokal partner'} />
          <Textarea label="Deskripsi" labelPlacement="outside" value={currentTranslation.description} onValueChange={(value) => updateTranslation({ description: value })} minRows={2} />
        </section>

        <section className="flex flex-col gap-3 border-t border-default-100 pt-4">
          <h3 className="text-sm font-semibold">Akun Bagdja</h3>
          {partner?.bagdja_accounts.map((account) => (
            <p key={account.id} className="text-xs text-default-600">
              {account.bagdja_account_id} · role {account.role} · {account.status}
            </p>
          ))}
          <Input label="ID akun Bagdja" labelPlacement="outside" value={accountId} onValueChange={setAccountId} placeholder="UUID akun yang sudah terdaftar" />
          <Input label="Role dalam partner" labelPlacement="outside" value={accountRole} onValueChange={setAccountRole} placeholder="client, driver, admin..." />
          <p className="text-xs text-default-500">Menghubungkan akun tidak otomatis membuat akun baru atau memberi izin aplikasi.</p>
        </section>
        {error && <p role="alert" className="rounded-lg bg-danger-50 p-3 text-xs text-danger">{error}</p>}
      </div>
    </EditDrawer>
  );
}
