'use client';

import { useEffect, useState } from 'react';

import { Button, Input, Textarea } from '@heroui/react';

import { errorMessage } from '@/studio/api/client';
import type { DnsRecordDto } from '@/studio/api/domain';
import { updateWebsiteSearchConsoleVerification } from '@/studio/api/websites';
import type { WebsiteDto } from '@/studio/api/types';
import { buildTenantWebUrl, displayHost, slugAddressParts } from '@/studio/lib/template-preview';
import { formatDate } from '@/studio/lib/format';
import { useWebsiteStore } from '@/studio/stores/website-store';
import { notify } from '@/studio/ui/primitives/Toast';

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

const GOOGLE_VERIFICATION_FILENAME = /^google[a-zA-Z0-9_-]+\.html$/;

function SearchConsoleCard({ website }: { website: WebsiteDto }) {
  const patchWebsite = useWebsiteStore((s) => s.patchWebsite);
  const [filename, setFilename] = useState(website.search_console_verification_filename ?? '');
  const [content, setContent] = useState(website.search_console_verification_content ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFilename(website.search_console_verification_filename ?? '');
    setContent(website.search_console_verification_content ?? '');
  }, [website.id, website.search_console_verification_filename, website.search_console_verification_content]);

  const trimmedFilename = filename.trim();
  const trimmedContent = content.trim();
  const empty = !trimmedFilename && !trimmedContent;
  const valid = empty || (
    GOOGLE_VERIFICATION_FILENAME.test(trimmedFilename) &&
    trimmedContent === `google-site-verification: ${trimmedFilename}`
  );
  const dirty =
    trimmedFilename !== (website.search_console_verification_filename ?? '') ||
    trimmedContent !== (website.search_console_verification_content ?? '');
  const host = website.domain && website.domain_verified_at
    ? `https://${website.domain}`
    : buildTenantWebUrl(website.slug);
  const verificationUrl = `${host.replace(/\/$/, '')}/${trimmedFilename}`;

  const save = async (): Promise<void> => {
    if (!valid || !dirty || saving) return;
    setSaving(true);
    try {
      const updated = await updateWebsiteSearchConsoleVerification(website.id, {
        search_console_verification_filename: empty ? null : trimmedFilename,
        search_console_verification_content: empty ? null : trimmedContent,
      });
      patchWebsite(website.id, {
        search_console_verification_filename: updated.search_console_verification_filename ?? null,
        search_console_verification_content: updated.search_console_verification_content ?? null,
      });
      notify.success(empty ? 'Verifikasi Search Console dihapus.' : 'Pengaturan verifikasi Search Console disimpan.');
    } catch (error) {
      notify.error('Gagal menyimpan verifikasi Search Console.', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard
      title="Google Search Console"
      description="Metode file HTML: simpan nama dan isi file dari Google. File akan dilayani di root alamat website dan custom domain yang aktif."
    >
      <div className="flex flex-col gap-3">
        <Input
          label="Nama file verifikasi"
          labelPlacement="outside"
          value={filename}
          onValueChange={setFilename}
          maxLength={255}
          placeholder="google9bbe81680154a078.html"
          classNames={FIELD_CLASSES}
          autoComplete="off"
          spellCheck="false"
        />
        <Textarea
          label="Isi file verifikasi"
          labelPlacement="outside"
          value={content}
          onValueChange={setContent}
          maxLength={1000}
          minRows={2}
          placeholder="google-site-verification: google9bbe81680154a078.html"
          classNames={FIELD_CLASSES}
          spellCheck="false"
        />
        {!valid && (
          <p role="alert" className="text-sm text-danger">
            Masukkan nama file dan isi verifikasi yang cocok persis seperti yang diberikan Google.
          </p>
        )}
        {valid && trimmedFilename && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <a href={verificationUrl} target="_blank" rel="noreferrer" className="min-w-0 break-all text-primary hover:underline">
              {verificationUrl}
            </a>
            <CopyButton value={verificationUrl} />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button color="primary" isDisabled={!valid || !dirty} isLoading={saving} onPress={() => void save()}>
            Simpan verifikasi
          </Button>
          {dirty && (
            <Button variant="bordered" isDisabled={saving} onPress={() => {
              setFilename(website.search_console_verification_filename ?? '');
              setContent(website.search_console_verification_content ?? '');
            }}>
              Batal
            </Button>
          )}
        </div>
        {(website.search_console_verification_filename || website.search_console_verification_content) && (
          <p className="text-xs text-default-500">Kosongkan kedua field lalu simpan untuk menghapus file verifikasi.</p>
        )}
      </div>
    </SettingsCard>
  );
}

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
      <SearchConsoleCard website={website} />
    </div>
  );
}
