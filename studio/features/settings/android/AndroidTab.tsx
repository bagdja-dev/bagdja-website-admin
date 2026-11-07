'use client';

import { Button, Spinner } from '@heroui/react';
import { useState } from 'react';

import type { WebsiteDto } from '@/studio/api/types';
import { StatusScreen } from '@/studio/ui/primitives/StatusScreen';
import { NavIcon } from '@/studio/ui/shell/nav-icons';

import { SettingsCard } from '../parts';
import { AssetsSection } from './AssetsSection';
import { BuildSection } from './BuildSection';
import { ConfigSection } from './ConfigSection';
import { SigningSection } from './SigningSection';
import { BUILD_VARIANTS, type BuildVariant } from './android-utils';
import { useAndroidBuilds } from './use-android-builds';
import { useAndroidConfig } from './use-android-config';

const SECTIONS = [
  { id: 'config', number: '01', label: 'Konfigurasi', hint: 'Identitas & tampilan' },
  { id: 'assets', number: '02', label: 'Aset aplikasi', hint: 'Icon & splash' },
  { id: 'signing', number: '03', label: 'Signing', hint: 'Keystore & fingerprint' },
  { id: 'builds', number: '04', label: 'Build', hint: 'Buat & unduh aplikasi' },
] as const;

type AndroidSection = (typeof SECTIONS)[number]['id'];

/** Tab "Android": konfigurasi TWA, signing, icon/splash, build, dan riwayat. */
export function AndroidTab({ website, enabled }: { website: WebsiteDto; enabled: boolean }) {
  if (!enabled) {
    return (
      <StatusScreen
        icon={<NavIcon name="android_app" size={28} />}
        title="Fitur Aplikasi Android belum aktif"
        description="Aktifkan fitur Aplikasi Android di halaman Fitur untuk membuat aplikasi dari website kamu."
        actions={[{ label: 'Buka Fitur', href: '/studio/features' }, { label: 'Kembali ke Beranda', href: '/studio', variant: 'secondary' }]}
      />
    );
  }
  return <AndroidContent website={website} />;
}

function AndroidContent({ website }: { website: WebsiteDto }) {
  const cfg = useAndroidConfig(website, true);
  const builds = useAndroidBuilds(website.id, !cfg.loading && cfg.config !== null);
  const [selectedSection, setSelectedSection] = useState<AndroidSection>('config');
  const busy = cfg.saving || cfg.uploading !== null || cfg.removing !== null;

  if (cfg.loading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-[14px] border border-default-200 bg-white">
        <Spinner aria-label="Memuat pengaturan Android" />
      </div>
    );
  }
  if (cfg.loadError) {
    return (
      <div role="alert" className="rounded-[14px] border border-danger-200 bg-danger-50 p-5 text-sm text-danger-700">
        <p className="font-semibold">Pengaturan Android gagal dimuat</p>
        <p className="mt-1">{cfg.loadError}</p>
      </div>
    );
  }

  const startBuild = (variant: BuildVariant): void => {
    const v = BUILD_VARIANTS[variant];
    if (!cfg.config) return;
    void builds.start({ buildType: v.buildType, outputFormat: v.outputFormat, versionName: cfg.config.version_name, versionCode: cfg.config.version_code });
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="overflow-hidden rounded-[16px] border border-default-200 bg-white">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-primary-50 text-primary">
              <NavIcon name="android_app" size={25} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">Aplikasi Android</h2>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${cfg.config ? 'bg-success-50 text-success-700' : 'bg-default-100 text-default-700'}`}>
                  {cfg.config ? 'Konfigurasi tersimpan' : 'Belum dikonfigurasi'}
                </span>
                {builds.running && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-50 px-2.5 py-1 text-xs font-bold text-warning-700">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning-500" />
                    Build sedang berjalan
                  </span>
                )}
              </div>
              <p className="mt-1 max-w-2xl text-sm text-default-600">
                Siapkan aplikasi Android yang membuka website bisnis kamu. Atur identitas dan tampilan, lalu buat APK untuk pengujian atau AAB untuk Play Store.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-default-100 pt-4 sm:grid-cols-3 lg:min-w-[360px] lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-default-500">Nama aplikasi</p>
              <p className="mt-1 truncate text-sm font-semibold text-foreground">{cfg.config?.app_name || cfg.form.appName || 'Belum diatur'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-default-500">Package name</p>
              <p className="mt-1 truncate font-mono text-xs text-default-700">{cfg.config?.package_name || cfg.form.packageName || 'Belum diatur'}</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-default-500">Riwayat build</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{builds.loading ? 'Memuat…' : `${builds.builds.length} build`}</p>
            </div>
          </div>
        </div>
        <div role="tablist" aria-label="Bagian pengaturan Android" className="flex overflow-x-auto border-t border-default-200 bg-default-50/70 px-3 sm:px-4">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                id={`android-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={item.id === selectedSection}
                aria-controls="android-tabpanel"
                onClick={() => setSelectedSection(item.id)}
                className={`flex min-h-[58px] shrink-0 items-center gap-3 border-b-2 px-4 text-left transition-colors sm:min-w-0 sm:flex-1 ${
                  item.id === selectedSection
                    ? 'border-primary text-primary'
                    : 'border-transparent text-default-500 hover:bg-white/70 hover:text-foreground'
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  item.id === selectedSection ? 'bg-primary-50 text-primary' : 'bg-default-100 text-default-600'
                }`}>{item.number}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{item.label}</span>
                  <span className="block truncate text-xs text-default-500">{item.hint}</span>
                </span>
              </button>
            ))}
        </div>
      </section>

      <div id="android-tabpanel" role="tabpanel" aria-labelledby={`android-tab-${selectedSection}`} className="flex flex-col gap-5">
        {selectedSection === 'config' && (
          <ConfigSection website={website} config={cfg.config} form={cfg.form} onChange={cfg.updateForm} />
        )}
        {selectedSection === 'assets' && (
          <AssetsSection config={cfg.config} splashColor={cfg.form.splashColor} uploading={cfg.uploading} removing={cfg.removing} onUpload={(k, f) => void cfg.uploadImage(k, f)} onRemove={(k) => void cfg.removeImage(k)} />
        )}
        {selectedSection === 'signing' && (
          <SigningSection config={cfg.config} keystore={cfg.keystore} onKeystore={cfg.updateKeystore} fingerprintInput={cfg.fingerprintInput} onFingerprints={cfg.updateFingerprints} onRetire={(f) => void cfg.retireFingerprint(f)} />
        )}
        {selectedSection === 'builds' && (
          <BuildSection
            config={cfg.config}
            dirty={cfg.dirty}
            busy={busy}
            builds={builds.builds}
            loading={builds.loading}
            running={builds.running}
            submitting={builds.submitting}
            downloadingId={builds.downloadingId}
            hasRetry={builds.retry !== null}
            onStart={startBuild}
            onRetry={() => { if (builds.retry) void builds.start(builds.retry.payload, builds.retry); }}
            onRefresh={() => void builds.refresh()}
            onDownload={(id) => void builds.download(id)}
          />
        )}
        {(selectedSection !== 'builds' || cfg.dirty || !cfg.config) && (
          <SettingsCard title="Simpan perubahan" description="Perubahan disimpan berurutan: konfigurasi, lalu keystore, lalu fingerprint. Jika satu langkah gagal, hasil langkah sebelumnya tetap tersimpan dan setiap hasil ditampilkan di sini.">
            <div className="flex flex-col gap-3">
              {cfg.steps.length > 0 && (
                <ul className="flex flex-col gap-1 text-sm" aria-live="polite">
                  {cfg.steps.map((s) => (
                    <li key={s.label} className={s.ok ? 'text-success-700' : 'text-danger-700'}>
                      {s.ok ? 'Berhasil' : 'Gagal'}: {s.label}{s.detail ? ` — ${s.detail}` : ''}
                    </li>
                  ))}
                </ul>
              )}
              <div>
                <Button color="primary" isLoading={cfg.saving} isDisabled={busy || (!cfg.dirty && cfg.config !== null)} onPress={() => void cfg.saveAll()}>
                  {cfg.config ? 'Simpan perubahan' : 'Buat konfigurasi'}
                </Button>
              </div>
            </div>
          </SettingsCard>
        )}
      </div>
      {cfg.dialog}
    </div>
  );
}
