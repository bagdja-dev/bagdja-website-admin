'use client';

import { Button, Input, Textarea } from '@heroui/react';
import { useRef } from 'react';

import type { AndroidAppConfigDto } from '@/studio/api/android';

import { FIELD_CLASSES, SettingsCard, StatusPill } from '../parts';
import type { KeystoreInput } from './android-utils';

/** Android signing: keystore (diunggah saat Simpan) dan fingerprint SHA-256. */
export function SigningSection({
  config, keystore, onKeystore, fingerprintInput, onFingerprints, onRetire,
}: {
  config: AndroidAppConfigDto | null;
  keystore: KeystoreInput;
  onKeystore: (patch: Partial<KeystoreInput>) => void;
  fingerprintInput: string;
  onFingerprints: (value: string) => void;
  onRetire: (fingerprint: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const hasFile = keystore.file !== null;
  const fingerprints = [
    ...(config?.release_signing_cert_sha256 ?? []).map((fingerprint) => ({ fingerprint, source: 'Release' })),
    ...(config?.play_store_signing_cert_sha256 ?? []).map((fingerprint) => ({ fingerprint, source: 'Play Store' })),
  ];
  return (
    <SettingsCard
      title="Android signing"
      description="Keystore dikirim langsung ke server dan password disimpan terenkripsi. Keystore hanya wajib untuk build release; APK Debug memakai debug key builder."
      action={config?.has_release_keystore ? <StatusPill tone="success">Keystore terpasang ({config.keystore_alias})</StatusPill> : <StatusPill tone="warning">Belum ada keystore</StatusPill>}
    >
      <div className="flex flex-col gap-5">
        <p className="rounded-[10px] bg-warning-50 px-3 py-2 text-sm text-warning-700">
          Simpan backup keystore dan password di tempat aman. Bila hilang, kamu tidak bisa menerbitkan update aplikasi dengan identitas signing yang sama.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-default-700">{config?.has_release_keystore ? 'Ganti file keystore' : 'File keystore'}</span>
            <input
              ref={fileRef}
              type="file"
              accept=".jks,.p12,.pfx"
              aria-label="File keystore"
              onChange={(e) => onKeystore({ file: e.target.files?.[0] ?? null })}
              className="block w-full rounded-[10px] border border-default-300 bg-white px-2 py-2 text-sm"
            />
            <span className="text-xs text-default-500">.jks, .p12, atau .pfx; maks. 10 MB. Diunggah saat Simpan.</span>
          </div>
          <Input label="Key alias" labelPlacement="outside" classNames={FIELD_CLASSES} value={keystore.alias} maxLength={255} isDisabled={!hasFile} onValueChange={(v) => onKeystore({ alias: v })} />
          <Input label="Keystore password" labelPlacement="outside" classNames={FIELD_CLASSES} type="password" autoComplete="new-password" value={keystore.storePassword} maxLength={512} isDisabled={!hasFile} onValueChange={(v) => onKeystore({ storePassword: v })} />
          <Input label="Key password" labelPlacement="outside" classNames={FIELD_CLASSES} type="password" autoComplete="new-password" placeholder="Biasanya sama dengan keystore password" value={keystore.keyPassword} maxLength={512} isDisabled={!hasFile} onValueChange={(v) => onKeystore({ keyPassword: v })} />
        </div>

        <div className="flex flex-col gap-3 rounded-[12px] bg-default-50 p-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">SHA-256 certificate fingerprints</h3>
            <p className="mt-1 text-xs text-default-600">Fingerprint release ditambahkan otomatis setelah build berhasil. Tambahkan fingerprint Google Play App Signing dari Play Console agar instalasi Play Store terverifikasi.</p>
          </div>
          {fingerprints.map(({ fingerprint, source }) => (
            <div key={`${source}-${fingerprint}`} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-white p-3 ring-1 ring-default-200">
              <div className="min-w-0 space-y-1">
                <StatusPill tone="neutral">{source}</StatusPill>
                <code className="block break-all text-xs">{fingerprint}</code>
              </div>
              <Button size="sm" color="danger" variant="light" onPress={() => onRetire(fingerprint)}>Pensiunkan</Button>
            </div>
          ))}
          <Textarea
            label="Fingerprint Google Play App Signing (satu per baris)"
            labelPlacement="outside"
            classNames={FIELD_CLASSES}
            description="Ditambahkan ke Digital Asset Links saat Simpan."
            placeholder="AA:BB:CC:... (SHA-256, 32 byte)"
            minRows={3}
            value={fingerprintInput}
            isDisabled={!config}
            onValueChange={onFingerprints}
          />
        </div>
      </div>
    </SettingsCard>
  );
}
