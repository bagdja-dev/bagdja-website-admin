'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Select, SelectItem, Switch, Textarea } from '@heroui/react';

import { errorMessage } from '@/studio/api/client';
import { createClient, fetchClients, fetchLanguages, removeClient, updateClient, upsertClientTranslation, type WebsiteLanguageDto } from '@/studio/api/company-profile';
import { uploadAsset } from '@/studio/lib/upload-asset';
import { useActiveWebsiteId } from '@/studio/stores/website-store';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';
import { StatusScreen } from '@/studio/ui/primitives/StatusScreen';
import { notify } from '@/studio/ui/primitives/Toast';

const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const LOGO_MAX_BYTES = 5 * 1024 * 1024;

export function ClientEditor({ clientId }: { clientId: string | null }) {
  const websiteId = useActiveWebsiteId();
  const router = useRouter();
  const logoInput = useRef<HTMLInputElement>(null);
  const isNew = clientId === null || clientId === 'new';
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [languages, setLanguages] = useState<WebsiteLanguageDto[]>([]);
  const [locale, setLocale] = useState('id');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [active, setActive] = useState(true);

  const uploadLogo = async (file: File) => {
    if (!LOGO_TYPES.includes(file.type)) {
      notify.error('Format logo tidak didukung.', 'Pilih PNG, JPG, WebP, atau GIF.');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      notify.error('Ukuran logo terlalu besar.', 'Ukuran maksimal 5 MB.');
      return;
    }
    if (!websiteId) {
      notify.error('Website aktif tidak ditemukan.', 'Pilih website sebelum mengunggah logo.');
      return;
    }

    setUploadingLogo(true);
    try {
      const uploaded = await uploadAsset(file, websiteId, 'content');
      setLogoUrl(uploaded.url);
      notify.success('Logo berhasil diunggah.');
    } catch (error) {
      notify.error('Gagal mengunggah logo.', errorMessage(error));
    } finally {
      setUploadingLogo(false);
    }
  };

  useEffect(() => {
    if (!websiteId) return;
    void fetchLanguages(websiteId).then((items) => { setLanguages(items); const fallback = items.find((item) => item.is_default) ?? items[0]; if (fallback) setLocale(fallback.locale); }).catch((error) => notify.error('Gagal memuat bahasa.', errorMessage(error)));
  }, [websiteId]);

  useEffect(() => {
    if (!websiteId || isNew) return;
    setLoading(true);
    void fetchClients(websiteId).then((items) => {
      const client = items.find((item) => item.id === clientId);
      if (!client) return;
      const translation = client.translations?.find((item) => item.locale === locale) ?? client.translations?.find((item) => item.locale === 'id');
      setName(translation?.name ?? ''); setDescription(translation?.description ?? ''); setLogoUrl(client.logo_url ?? ''); setWebsiteUrl(client.website_url ?? ''); setActive(client.is_active);
    }).catch((error) => notify.error('Gagal memuat klien.', errorMessage(error))).finally(() => setLoading(false));
  }, [websiteId, isNew, clientId, locale]);

  const save = async () => {
    if (!websiteId || !name.trim()) return;
    setSaving(true);
    try {
      const payload = { logo_url: logoUrl.trim() || null, website_url: websiteUrl.trim() || null, is_active: active };
      const client = isNew ? await createClient(websiteId, payload) : await updateClient(websiteId, clientId as string, payload);
      await upsertClientTranslation(websiteId, client.id, locale, { name: name.trim(), description: description.trim() || null });
      notify.success(isNew ? 'Klien ditambahkan.' : 'Klien diperbarui.');
      if (isNew) router.replace(`/studio/clients/${client.id}`); else router.refresh();
    } catch (error) { notify.error('Gagal menyimpan klien.', errorMessage(error)); } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!websiteId || isNew) return;
    setSaving(true);
    try { await removeClient(websiteId, clientId as string); notify.success('Klien dihapus.'); router.push('/studio/clients'); } catch (error) { notify.error('Gagal menghapus klien.', errorMessage(error)); } finally { setSaving(false); }
  };

  if (loading) return <StatusScreen icon={<span aria-hidden="true">…</span>} title="Memuat klien" description="Mengambil data klien…" />;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={name.trim() || (isNew ? 'Klien baru' : 'Klien')} back={{ href: '/studio/clients', label: 'Klien' }} actions={<>{!isNew && <Button size="sm" color="danger" variant="flat" isDisabled={saving} onPress={() => void remove()}>Hapus</Button>}<Switch size="sm" isSelected={active} onValueChange={setActive}>Aktif</Switch><Button size="sm" color="primary" isDisabled={!name.trim()} isLoading={saving} onPress={() => void save()}>Simpan</Button></>} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex flex-col gap-3 rounded-[14px] border border-default-200 bg-white p-5"><Input label="Nama klien" labelPlacement="outside" value={name} onValueChange={setName} /><Textarea label="Deskripsi" labelPlacement="outside" value={description} onValueChange={setDescription} minRows={6} /></section>
        <aside className="flex flex-col gap-3 rounded-[14px] border border-default-200 bg-white p-5">
          <Select label="Bahasa" labelPlacement="outside" selectedKeys={[locale]} onSelectionChange={(keys) => setLocale(Array.from(keys)[0]?.toString() || 'id')}>{languages.map((item) => <SelectItem key={item.locale}>{item.label} ({item.locale})</SelectItem>)}</Select>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Logo klien</span>
            {logoUrl ? (
              <div className="flex h-28 items-center justify-center rounded-xl border border-default-200 bg-default-50 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL gambar dari storage tenant */}
                <img src={logoUrl} alt={`Logo ${name || 'klien'}`} className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-default-300 bg-default-50 text-xs text-default-500">Belum ada logo</div>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="bordered" isDisabled={uploadingLogo || !websiteId} isLoading={uploadingLogo} onPress={() => logoInput.current?.click()}>{logoUrl ? 'Ganti logo' : 'Unggah logo'}</Button>
              {logoUrl && <Button size="sm" color="danger" variant="light" isDisabled={uploadingLogo} onPress={() => setLogoUrl('')}>Hapus</Button>}
            </div>
            <p className="text-xs text-default-500">PNG, JPG, WebP, atau GIF · maksimal 5 MB. File disimpan di storage website.</p>
            <input ref={logoInput} type="file" accept={LOGO_TYPES.join(',')} hidden disabled={uploadingLogo || !websiteId} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void uploadLogo(file); event.currentTarget.value = ''; }} />
          </div>
          <Input label="Situs klien" labelPlacement="outside" value={websiteUrl} onValueChange={setWebsiteUrl} placeholder="https://..." />
        </aside>
      </div>
    </div>
  );
}
