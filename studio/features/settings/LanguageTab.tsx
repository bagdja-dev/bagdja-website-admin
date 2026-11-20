'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Select, SelectItem, Switch } from '@heroui/react';

import { errorMessage } from '@/studio/api/client';
import { fetchLanguages, removeLanguage, upsertLanguage, type WebsiteLanguageDto } from '@/studio/api/company-profile';
import type { WebsiteDto } from '@/studio/api/types';
import { notify } from '@/studio/ui/primitives/Toast';

import { SettingsCard, StatusPill } from './parts';

export function LanguageTab({ website }: { website: WebsiteDto }) {
  const [languages, setLanguages] = useState<WebsiteLanguageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locale, setLocale] = useState('en');
  const [label, setLabel] = useState('English');
  const [isActive, setIsActive] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setLanguages(await fetchLanguages(website.id));
    } catch (error) {
      notify.error('Gagal memuat bahasa.', errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [website.id]);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await upsertLanguage(website.id, locale, {
        locale,
        label,
        is_default: false,
        is_active: isActive,
        sort_order: languages.length,
      });
      setLanguages((current) => {
        const exists = current.some((item) => item.locale === saved.locale);
        return exists
          ? current.map((item) => item.locale === saved.locale ? saved : item)
          : [...current, saved].sort((a, b) => a.sort_order - b.sort_order);
      });
      notify.success(`Bahasa ${saved.label} disimpan.`);
    } catch (error) {
      notify.error('Gagal menyimpan bahasa.', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (language: WebsiteLanguageDto) => {
    if (language.is_default) return;
    setSaving(true);
    try {
      await removeLanguage(website.id, language.locale);
      setLanguages((current) => current.filter((item) => item.locale !== language.locale));
      notify.success(`Bahasa ${language.label} dihapus.`);
    } catch (error) {
      notify.error('Gagal menghapus bahasa.', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (language: WebsiteLanguageDto, active: boolean) => {
    if (language.is_default && !active) return;
    setSaving(true);
    try {
      await upsertLanguage(website.id, language.locale, {
        locale: language.locale,
        label: language.label,
        is_default: language.is_default,
        is_active: active,
        sort_order: language.sort_order,
      });
      setLanguages((current) => current.map((item) => item.locale === language.locale ? { ...item, is_active: active } : item));
    } catch (error) {
      notify.error('Gagal mengubah bahasa.', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard title="Bahasa website" description="Bahasa default tetap aktif. Bahasa tambahan dapat dinyalakan untuk konten lokal dan URL /locale.">
      {loading ? (
        <p className="text-sm text-default-500">Memuat bahasa…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {languages.map((language) => (
              <div key={language.locale} className="flex flex-wrap items-center gap-3 rounded-[10px] border border-default-200 p-3">
                <div className="min-w-32 flex-1">
                  <p className="text-sm font-semibold text-foreground">{language.label}</p>
                  <p className="text-xs text-default-500">{language.locale}</p>
                </div>
                {language.is_default && <StatusPill tone="success">Default</StatusPill>}
                <Switch isSelected={language.is_active} isDisabled={saving || language.is_default} onValueChange={(active) => void toggleActive(language, active)} aria-label={`Bahasa ${language.label} aktif`}>
                  <span className="text-xs">Aktif</span>
                </Switch>
                {!language.is_default && (
                  <Button size="sm" color="danger" variant="flat" isDisabled={saving} onPress={() => void remove(language)}>Hapus</Button>
                )}
              </div>
            ))}
          </div>

          <div className="grid gap-3 rounded-[10px] border border-default-200 p-3 sm:grid-cols-[150px_1fr_auto] sm:items-end">
            <Select label="Locale" labelPlacement="outside" selectedKeys={[locale]} onSelectionChange={(keys) => setLocale(Array.from(keys)[0]?.toString() || 'en')}>
              <SelectItem key="en">English (en)</SelectItem>
              <SelectItem key="id">Indonesia (id)</SelectItem>
            </Select>
            <Input label="Nama bahasa" labelPlacement="outside" value={label} onValueChange={setLabel} />
            <Switch isSelected={isActive} onValueChange={setIsActive}>Aktif</Switch>
            <Button color="primary" isDisabled={!locale || !label.trim()} isLoading={saving} onPress={() => void save()}>
              Tambah bahasa
            </Button>
          </div>
        </div>
      )}
    </SettingsCard>
  );
}
