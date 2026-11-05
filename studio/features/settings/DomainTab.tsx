'use client';

import { Button, Input } from '@heroui/react';

import type { DnsRecordDto } from '@/studio/api/domain';
import type { WebsiteDto } from '@/studio/api/types';
import { buildTenantWebUrl, displayHost, slugAddressParts } from '@/studio/lib/template-preview';
import { formatDate } from '@/studio/lib/format';

import { CopyButton, FIELD_CLASSES, SettingsCard, StatusPill } from './parts';
import { useDomain } from './use-domain';
import { useSlugChange, type SlugCheck } from './use-slug-change';

const SLUG_HINT: Record<SlugCheck, { text: string; cls: string } | null> = {
  same: null,
  invalid: { text: 'Hanya huruf kecil, angka, dan tanda hubung.', cls: 'text-danger' },
  checking: { text: 'Mengecek ketersediaan…', cls: 'text-default-500' },
  available: { text: 'Alamat tersedia.', cls: 'text-success' },
  taken: { text: 'Sudah dipakai website lain.', cls: 'text-danger' },
  error: { text: 'Gagal mengecek alamat. Coba lagi.', cls: 'text-warning-700' },
};

function DefaultAddressCard({ website }: { website: WebsiteDto }) {
  const s = useSlugChange(website);
  const { prefix, suffix } = slugAddressParts();
  const hint = SLUG_HINT[s.check];
  return (
    <SettingsCard title="Alamat bawaan" description="Alamat gratis dari platform. Selalu aktif walau kamu memasang domain sendiri.">
      {s.editing ? (
        <div className="flex flex-col gap-3">
          <Input
            aria-label="Alamat website"
            value={s.slug}
            onValueChange={s.setSlug}
            maxLength={63}
            autoComplete="off"
            startContent={prefix ? <span className="text-sm text-default-500">{prefix}</span> : undefined}
            endContent={suffix ? <span className="text-sm text-default-500">{suffix}</span> : undefined}
            isInvalid={s.check === 'invalid' || s.check === 'taken'}
          />
          <p aria-live="polite" className={`min-h-5 text-[13px] font-semibold ${hint?.cls ?? ''}`}>{hint?.text ?? ''}</p>
          <p className="rounded-[10px] bg-warning-50 px-3 py-2 text-xs text-warning-700">Link lama akan berhenti bekerja setelah alamat diubah.</p>
          <div className="flex flex-wrap gap-2">
            <Button color="primary" isDisabled={s.check !== 'available'} isLoading={s.saving} onPress={() => void s.save()}>Simpan alamat</Button>
            <Button variant="bordered" isDisabled={s.saving} onPress={() => { s.setEditing(false); s.setSlug(website.slug); }}>Batal</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <a href={buildTenantWebUrl(website.slug)} target="_blank" rel="noreferrer" className="min-w-0 break-all text-[15px] font-semibold text-primary no-underline hover:underline">
            {displayHost(website.slug)}
          </a>
          <CopyButton value={buildTenantWebUrl(website.slug)} />
          <Button size="sm" variant="bordered" className="ml-auto" onPress={() => s.setEditing(true)}>Ubah alamat</Button>
        </div>
      )}
      {s.dialog}
    </SettingsCard>
  );
}

function DnsTable({ rows }: { rows: DnsRecordDto[] }) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-default-200">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-default-200 bg-default-50 text-left text-xs text-default-600">
            <th className="px-3 py-2 font-semibold">Tipe</th>
            <th className="px-3 py-2 font-semibold">Nama</th>
            <th className="px-3 py-2 font-semibold">Nilai</th>
            <th className="w-20 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.recordType}-${row.recordName}`} className="border-b border-default-100 last:border-0">
              <td className="px-3 py-2 align-top font-mono text-xs">{row.recordType}</td>
              <td className="break-all px-3 py-2 align-top font-mono text-xs">{row.recordName}</td>
              <td className="break-all px-3 py-2 align-top font-mono text-xs">{row.recordValue || 'Belum tersedia dari server'}</td>
              <td className="px-3 py-2 align-top">{row.recordValue && <CopyButton value={row.recordValue} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomDomainCard({ website }: { website: WebsiteDto }) {
  const d = useDomain(website);
  const pill = d.state === 'active' ? <StatusPill tone="success">Aktif</StatusPill>
    : d.state === 'pending' ? <StatusPill tone="warning">Menunggu verifikasi</StatusPill>
      : <StatusPill tone="neutral">Belum dipasang</StatusPill>;

  return (
    <SettingsCard title="Domain sendiri" description="Pakai domain milikmu, mis. www.bisnisku.com." action={pill}>
      {d.state === 'none' ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <Input
            className="sm:flex-1"
            label="Domain"
            labelPlacement="outside"
            placeholder="www.bisnisku.com"
            classNames={FIELD_CLASSES}
            value={d.input}
            onValueChange={d.setInput}
            isInvalid={Boolean(d.inputError)}
            errorMessage={d.inputError}
            autoComplete="off"
            spellCheck="false"
          />
          <Button className="sm:mt-6" color="primary" isDisabled={!d.normalized || Boolean(d.inputError)} isLoading={d.saving} onPress={() => void d.save()}>
            Pasang domain
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="min-w-0 break-all text-[15px] font-semibold text-foreground">{d.saved}</span>
            <div className="ml-auto flex flex-wrap gap-2">
              {d.state === 'pending' && <Button size="sm" color="primary" isLoading={d.checking} onPress={() => void d.check()}>Verifikasi sekarang</Button>}
              <Button size="sm" color="danger" variant="flat" isLoading={d.removing} onPress={() => void d.remove()}>Lepas domain</Button>
            </div>
          </div>

          {d.state === 'active' ? (
            <p className="text-sm text-default-600">
              Terverifikasi{website.domain_verified_at ? ` sejak ${formatDate(website.domain_verified_at, true)}` : ''}. HTTPS domain ini tetap diurus lewat akun Cloudflare milikmu sendiri.
            </p>
          ) : (
            <>
              <p className="text-sm text-default-600">Tambahkan record DNS berikut di penyedia domainmu, lalu klik &quot;Verifikasi sekarang&quot;. Propagasi DNS bisa butuh beberapa menit.</p>
              {d.loadingRecords && <p className="text-sm text-default-500">Memuat record DNS…</p>}
              {d.recordsError && (
                <div className="flex flex-wrap items-center gap-3 rounded-[10px] bg-danger-50 px-3 py-2 text-sm text-danger-700">
                  <span className="flex-1">{d.recordsError}</span>
                  <Button size="sm" variant="flat" onPress={() => void d.loadRecords()}>Coba lagi</Button>
                </div>
              )}
              {d.info && <DnsTable rows={[{ recordType: 'TXT', recordName: d.info.recordName, recordValue: d.info.recordValue }, d.info.dnsTarget]} />}
              <div className="rounded-[10px] border border-default-200 bg-default-50 p-3 text-sm">
                <p className="font-semibold text-foreground">Aktifkan HTTPS lewat Cloudflare milikmu</p>
                <p className="mt-1 text-default-600">Daftarkan domain di akun Cloudflare, aktifkan proxy (awan oranye), lalu set mode SSL/TLS ke &quot;Full&quot;.</p>
              </div>
            </>
          )}
        </div>
      )}
      {d.dialog}
    </SettingsCard>
  );
}

/** Tab "Domain": alamat bawaan (slug) dan domain sendiri. */
export function DomainTab({ website }: { website: WebsiteDto }) {
  return (
    <div className="flex flex-col gap-5">
      <DefaultAddressCard website={website} />
      <CustomDomainCard website={website} />
    </div>
  );
}
