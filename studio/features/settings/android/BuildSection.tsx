'use client';

import { Button, Select, SelectItem } from '@heroui/react';
import { useState } from 'react';

import type { AndroidAppConfigDto, AndroidBuildDto } from '@/studio/api/android';
import { formatDate } from '@/studio/lib/format';

import { SettingsCard, StatusPill } from '../parts';
import { BUILD_VARIANTS, formatVariant, isDownloadable, isTerminalStatus, statusLabel, statusTone, type BuildVariant } from './android-utils';

function Progress({ build }: { build: AndroidBuildDto }) {
  const pct = Math.max(0, Math.min(100, build.progress ?? 0));
  return (
    <div className="min-w-28">
      <div className="text-sm">{pct}%</div>
      {build.stage && !isTerminalStatus(build.status) && <div className="text-xs text-default-500">{build.stage}</div>}
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-default-100">
        <div className="h-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function BuildRow({ build, config, downloading, onDownload }: { build: AndroidBuildDto; config: AndroidAppConfigDto | null; downloading: boolean; onDownload: () => void }) {
  return (
    <li className="flex flex-col gap-3 rounded-[12px] border border-default-200 p-4 md:flex-row md:items-center md:gap-6">
      <div className="min-w-0 md:w-56">
        <p className="text-sm font-semibold text-foreground">{formatVariant(build)}</p>
        <p className="truncate font-mono text-[11px] text-default-500">{build.bundle_id ?? config?.package_name}</p>
        <p className="font-mono text-[11px] text-default-500">{build.id.slice(0, 8)}</p>
      </div>
      <div className="md:w-40">
        <StatusPill tone={statusTone(build.status)}>{statusLabel(build.status)}</StatusPill>
        {build.error_message && <p className="mt-1 text-xs text-danger">{build.error_message}</p>}
      </div>
      <div className="md:w-36"><Progress build={build} /></div>
      <div className="text-xs text-default-600 md:flex-1">
        <p>Dibuat: {formatDate(build.created_at, true)}</p>
        <p>Selesai: {formatDate(build.finished_at, true)}</p>
      </div>
      {isDownloadable(build.status) && (
        <Button size="sm" color="primary" variant="flat" isLoading={downloading} onPress={onDownload}>Unduh</Button>
      )}
    </li>
  );
}

/** Mulai build + riwayat build (polling 5 detik selama berjalan). */
export function BuildSection({
  config, dirty, busy, builds, loading, running, submitting, downloadingId, hasRetry, onStart, onRetry, onRefresh, onDownload,
}: {
  config: AndroidAppConfigDto | null;
  dirty: boolean;
  busy: boolean;
  builds: AndroidBuildDto[];
  loading: boolean;
  running: boolean;
  submitting: boolean;
  downloadingId: string | null;
  hasRetry: boolean;
  onStart: (variant: BuildVariant) => void;
  onRetry: () => void;
  onRefresh: () => void;
  onDownload: (jobId: string) => void;
}) {
  const [variant, setVariant] = useState<BuildVariant>('apk-debug');
  const needsKeystore = BUILD_VARIANTS[variant].buildType === 'release' && !config?.has_release_keystore;
  const canStart = Boolean(config) && !dirty && !running && !hasRetry && !needsKeystore && !busy;
  return (
    <SettingsCard
      title="Build & riwayat"
      description="Status diperbarui otomatis tiap 5 detik selama build berjalan. Link unduhan bersifat sementara dan diminta ulang saat tombol Unduh ditekan."
      action={<Button size="sm" variant="bordered" isLoading={loading} isDisabled={!config} onPress={onRefresh}>Segarkan</Button>}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Select
            className="sm:max-w-xs"
            label="Output build"
            labelPlacement="outside"
            classNames={{ label: 'font-semibold text-default-700' }}
            selectedKeys={[variant]}
            disallowEmptySelection
            onSelectionChange={(keys) => { const k = Array.from(keys)[0]; if (k) setVariant(String(k) as BuildVariant); }}
          >
            {(Object.keys(BUILD_VARIANTS) as BuildVariant[]).map((k) => <SelectItem key={k}>{BUILD_VARIANTS[k].label}</SelectItem>)}
          </Select>
          <Button color="primary" isLoading={submitting} isDisabled={!canStart} onPress={() => onStart(variant)}>
            {running ? 'Build sedang berjalan' : 'Mulai build'}
          </Button>
          {hasRetry && <Button variant="flat" color="danger" isLoading={submitting} onPress={onRetry}>Ulangi permintaan yang sama</Button>}
        </div>
        {needsKeystore && <p className="text-sm text-default-600">Build release butuh keystore yang sudah tersimpan. Pilih APK Debug untuk build testing tanpa keystore.</p>}
        {dirty && config && <p className="text-sm text-warning-700">Ada perubahan yang belum disimpan. Simpan dulu sebelum memulai build.</p>}

        {builds.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-default-300 p-8 text-center text-sm text-default-600">Belum ada build untuk website ini.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {builds.map((b) => <BuildRow key={b.id} build={b} config={config} downloading={downloadingId === b.id} onDownload={() => onDownload(b.id)} />)}
          </ul>
        )}
      </div>
    </SettingsCard>
  );
}
