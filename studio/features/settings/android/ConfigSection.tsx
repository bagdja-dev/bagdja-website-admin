'use client';

import { Input, Select, SelectItem } from '@heroui/react';

import type { AndroidAppConfigDto, AndroidDisplayMode } from '@/studio/api/android';
import type { WebsiteDto } from '@/studio/api/types';

import { SettingsCard, FIELD_CLASSES } from '../parts';
import { ColorField } from './ColorField';
import { DEFAULT_DIVIDER_COLOR, DISPLAY_MODES, type AndroidForm } from './android-utils';

function targetUrlHint(website: WebsiteDto): string {
  if (website.domain && website.domain_verified_at) return `Domain sendiri ${website.domain} terverifikasi.`;
  if (website.domain) return `Domain ${website.domain} belum terverifikasi; aplikasi memakai alamat bawaan platform.`;
  return 'Website memakai alamat bawaan platform (HTTPS).';
}

/** Konfigurasi build: nama, package, versi, mode tampilan, dan warna. */
export function ConfigSection({
  website, config, form, onChange,
}: {
  website: WebsiteDto;
  config: AndroidAppConfigDto | null;
  form: AndroidForm;
  onChange: <K extends keyof AndroidForm>(key: K, value: AndroidForm[K]) => void;
}) {
  return (
    <SettingsCard title="Konfigurasi aplikasi" description="TWA menampilkan website online lewat HTTPS. Mengubah package name atau signing key dapat berdampak pada update aplikasi yang sudah dibagikan.">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="Nama aplikasi" labelPlacement="outside" classNames={FIELD_CLASSES} description="Tampil di bawah icon launcher." value={form.appName} maxLength={50} isRequired onValueChange={(v) => onChange('appName', v)} />
        <Input
          label="Package name"
          labelPlacement="outside"
          classNames={FIELD_CLASSES}
          placeholder="com.example.website"
          description={config?.package_name_locked ? 'Terkunci setelah release pertama.' : 'Dikunci setelah build release pertama yang berhasil.'}
          value={form.packageName}
          maxLength={255}
          isRequired
          isDisabled={config?.package_name_locked}
          onValueChange={(v) => onChange('packageName', v)}
        />
        <Input label="Target URL" labelPlacement="outside" classNames={FIELD_CLASSES} description={targetUrlHint(website)} value={config?.target_url ?? 'Tersedia setelah konfigurasi disimpan'} isReadOnly isDisabled />
        <Input label="Versi" labelPlacement="outside" classNames={FIELD_CLASSES} value={form.versionName} maxLength={64} isRequired onValueChange={(v) => onChange('versionName', v)} />
        <Input label="Version code" labelPlacement="outside" classNames={FIELD_CLASSES} type="number" min={1} max={2100000000} value={form.versionCode} isRequired onValueChange={(v) => onChange('versionCode', v)} />
        <Select
          label="Mode tampilan"
          labelPlacement="outside"
          classNames={FIELD_CLASSES}
          selectedKeys={[form.displayMode]}
          disallowEmptySelection
          onSelectionChange={(keys) => { const key = Array.from(keys)[0]; if (key) onChange('displayMode', String(key) as AndroidDisplayMode); }}
        >
          {(Object.keys(DISPLAY_MODES) as AndroidDisplayMode[]).map((mode) => <SelectItem key={mode}>{DISPLAY_MODES[mode]}</SelectItem>)}
        </Select>
        <ColorField label="Warna status bar (atas)" value={form.primaryColor} onChange={(v) => onChange('primaryColor', v)} />
        <ColorField label="Warna latar splash" value={form.splashColor} onChange={(v) => onChange('splashColor', v)} />
        <ColorField label="Warna navigation bar (bawah)" description="Tombol navigasi otomatis gelap/terang mengikuti kontras." value={form.navigationBarColor} onChange={(v) => onChange('navigationBarColor', v)} />
        <div className="flex flex-col gap-2">
          <label className="flex min-h-6 items-center gap-2 text-sm font-semibold text-default-700">
            <input
              type="checkbox"
              checked={Boolean(form.navigationBarDividerColor)}
              onChange={(e) => onChange('navigationBarDividerColor', e.target.checked ? DEFAULT_DIVIDER_COLOR : '')}
              className="h-4 w-4 accent-primary"
            />
            Garis pemisah di atas navigation bar
          </label>
          {form.navigationBarDividerColor ? (
            <ColorField label="Warna garis pemisah" value={form.navigationBarDividerColor} onChange={(v) => onChange('navigationBarDividerColor', v)} />
          ) : (
            <p className="text-xs text-default-500">Berguna bila warna navigation bar sama dengan latar halaman.</p>
          )}
        </div>
      </div>
    </SettingsCard>
  );
}
