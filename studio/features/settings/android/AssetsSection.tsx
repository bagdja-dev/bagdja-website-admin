'use client';

import { Button } from '@heroui/react';

import type { AndroidAppConfigDto } from '@/studio/api/android';

import { SettingsCard } from '../parts';
import { toSixDigitHex } from './android-utils';

type Kind = 'icon' | 'splash';

const ASSETS: { type: Kind; title: string; hint: string; box: string }[] = [
  { type: 'icon', title: 'App icon', hint: 'PNG, JPEG, atau WebP; persegi minimal 512 × 512 px dengan ruang kosong di tepi; maks. 5 MB.', box: 'h-24 w-24' },
  { type: 'splash', title: 'Splash screen image', hint: 'Latar transparan disarankan, tampil di tengah di atas warna latar splash; maks. 5 MB.', box: 'h-24 w-40' },
];

/** Icon & splash: langsung tersimpan saat diunggah (terpisah dari logo website). */
export function AssetsSection({
  config, splashColor, uploading, removing, onUpload, onRemove,
}: {
  config: AndroidAppConfigDto | null;
  splashColor: string;
  uploading: Kind | null;
  removing: Kind | null;
  onUpload: (kind: Kind, file: File) => void;
  onRemove: (kind: Kind) => void;
}) {
  const busy = uploading !== null || removing !== null;
  return (
    <SettingsCard title="Icon & splash screen" description="Diunggah khusus untuk app Android dan langsung tersimpan. File dapat diakses publik agar builder bisa mengambilnya.">
      {!config ? (
        <p className="rounded-[10px] border border-dashed border-default-300 p-5 text-sm text-default-600">Simpan konfigurasi dulu sebelum mengunggah icon dan splash screen.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {ASSETS.map((asset) => {
            const url = asset.type === 'icon' ? config.icon_url : config.splash_image_url;
            return (
              <div key={asset.type} className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-foreground">{asset.title}</h3>
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL storage eksternal
                  <img src={url} alt={asset.title} className={`${asset.box} rounded-xl border border-default-200 object-contain p-2`} style={{ backgroundColor: asset.type === 'splash' ? toSixDigitHex(splashColor) : '#FFFFFF' }} />
                ) : (
                  <div className={`${asset.box} flex items-center justify-center rounded-xl border border-dashed border-default-300 bg-default-50 text-xs text-default-500`}>Belum ada gambar</div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <label className={`inline-flex min-h-10 cursor-pointer items-center rounded-[10px] border border-default-300 px-3 text-sm font-semibold hover:bg-default-50 ${busy ? 'pointer-events-none opacity-60' : ''}`}>
                    {uploading === asset.type ? 'Mengunggah…' : url ? 'Ganti gambar' : 'Unggah gambar'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={busy}
                      className="sr-only"
                      onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onUpload(asset.type, f); }}
                    />
                  </label>
                  {url && <Button size="sm" color="danger" variant="light" isLoading={removing === asset.type} isDisabled={uploading !== null} onPress={() => onRemove(asset.type)}>Hapus</Button>}
                </div>
                <p className="text-xs text-default-500">{asset.hint}</p>
              </div>
            );
          })}
        </div>
      )}
    </SettingsCard>
  );
}
