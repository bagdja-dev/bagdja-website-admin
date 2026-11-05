'use client';

import { Button, Spinner } from '@heroui/react';

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
  const busy = cfg.saving || cfg.uploading !== null || cfg.removing !== null;

  if (cfg.loading) {
    return <div className="flex justify-center py-16"><Spinner aria-label="Memuat pengaturan Android" /></div>;
  }
  if (cfg.loadError) {
    return <p role="alert" className="rounded-[14px] border border-danger-200 bg-danger-50 p-5 text-sm text-danger-700">{cfg.loadError}</p>;
  }

  const startBuild = (variant: BuildVariant): void => {
    const v = BUILD_VARIANTS[variant];
    if (!cfg.config) return;
    void builds.start({ buildType: v.buildType, outputFormat: v.outputFormat, versionName: cfg.config.version_name, versionCode: cfg.config.version_code });
  };

  return (
    <div className="flex flex-col gap-5">
      <ConfigSection website={website} config={cfg.config} form={cfg.form} onChange={cfg.updateForm} />
      <AssetsSection config={cfg.config} splashColor={cfg.form.splashColor} uploading={cfg.uploading} removing={cfg.removing} onUpload={(k, f) => void cfg.uploadImage(k, f)} onRemove={(k) => void cfg.removeImage(k)} />
      <SigningSection config={cfg.config} keystore={cfg.keystore} onKeystore={cfg.updateKeystore} fingerprintInput={cfg.fingerprintInput} onFingerprints={cfg.updateFingerprints} onRetire={(f) => void cfg.retireFingerprint(f)} />

      <SettingsCard title="Simpan" description="Urutan: konfigurasi, lalu keystore, lalu fingerprint. Langkah yang gagal tidak membatalkan langkah sebelumnya dan isiannya tetap ada.">
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
      {cfg.dialog}
    </div>
  );
}
