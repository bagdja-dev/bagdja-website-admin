'use client';

/**
 * Uji template kandidat (belum terbit) di website sungguhan
 * (plan/website-builder/template-candidate-trial-plan.md §7).
 *
 * - Toko template: kandidat yang boleh dilihat user (designer pengaju / reviewer yang mengambil).
 * - Template aktif: banner uji yang sedang berjalan + Hentikan uji.
 * Kandidat hanya dirender untuk designer/reviewer yang login; pengunjung melihat template terpasang.
 */
import { useEffect, useState } from 'react';

import { Button, Spinner } from '@heroui/react';

import { errorMessage } from '@/studio/api/client';
import {
  fetchTemplateCandidatePreview,
  fetchTemplateCandidates,
  fetchWebsiteTemplateTrial,
  startWebsiteTemplateTrial,
  stopWebsiteTemplateTrial,
  type TemplateCandidateDto,
  type WebsiteTemplateTrialDto,
} from '@/studio/api/template-trials';
import { buildPreviewDocument } from '@/studio/lib/template-preview-document';
import { buildTenantWebUrl } from '@/studio/lib/template-preview';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import { notify } from '@/studio/ui/primitives/Toast';

const ROLE_LABELS: Record<TemplateCandidateDto['viewerRole'], string> = {
  designer: 'Pengajuan Anda',
  reviewer: 'Anda reviewer',
};

function visibilityText(candidate: TemplateCandidateDto): string {
  return candidate.status === 'checked'
    ? 'Belum diajukan — hanya terlihat oleh Anda sebagai designer.'
    : candidate.status === 'submitted'
    ? 'Hanya terlihat oleh designer pengaju selama menunggu review.'
    : 'Hanya terlihat oleh designer pengaju dan reviewer yang mengambil pengajuan.';
}

function CandidateThumb({ candidate }: { candidate: TemplateCandidateDto }) {
  const [document, setDocument] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchTemplateCandidatePreview(candidate.submissionId)
      .then((preview) => {
        if (!cancelled) setDocument(buildPreviewDocument(preview.html, preview.clientScript, true));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [candidate.submissionId]);

  return (
    <div className="relative h-[150px] overflow-hidden border-b border-default-200 bg-default-100" aria-hidden="true">
      {document ? (
        <iframe
          title={`Pratinjau ${candidate.name}`}
          sandbox="allow-scripts"
          srcDoc={document}
          tabIndex={-1}
          className="pointer-events-none absolute left-0 top-0 h-[600px] w-[400%] origin-top-left scale-[0.25] border-0 bg-white"
        />
      ) : failed ? (
        <div className="flex h-full items-center justify-center px-4 text-center text-xs text-default-500">Pratinjau belum tersedia</div>
      ) : (
        <div className="flex h-full items-center justify-center"><Spinner size="sm" /></div>
      )}
    </div>
  );
}

/** Toko template: kandidat belum terbit yang boleh diuji user ini. */
export function CandidateTemplateSection({
  websiteId,
  canChange,
  businessProfile,
}: {
  websiteId: string;
  canChange: boolean;
  businessProfile?: string | null;
}) {
  const { confirm, dialog } = useConfirm();
  // Kandidat dari template yang sudah terbit dipilih lewat pemilih versi di detail template;
  // bagian ini hanya untuk template baru yang belum pernah terbit.
  const [candidates, setCandidates] = useState<TemplateCandidateDto[]>([]);
  const [trial, setTrial] = useState<WebsiteTemplateTrialDto | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchTemplateCandidates(), fetchWebsiteTemplateTrial(websiteId)])
      .then(([items, current]) => {
        if (cancelled) return;
        setCandidates(items.filter((item) => !item.publishedVersion));
        setTrial(current);
      })
      .catch(() => {
        // Akun tanpa kandidat / bukan designer-reviewer: bagian ini tidak ditampilkan.
        if (!cancelled) setCandidates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [websiteId]);

  if (candidates.length === 0) return null;

  const startTrial = async (candidate: TemplateCandidateDto) => {
    const accepted = await confirm({
      title: `Uji ${candidate.name} ${candidate.version} di website ini?`,
      description: (
        <span>
          Saat Anda login, website tampil dengan template kandidat ini — termasuk keranjang, tagihan, dan halaman
          lain yang dikelola template. <strong>Pengunjung lain tetap melihat template terpasang.</strong> Uji berhenti
          otomatis bila pengajuan diminta revisi/ditolak, dan template terpasang untuk semua pengunjung saat terbit.
        </span>
      ),
      confirmLabel: 'Mulai uji',
    });
    if (!accepted) return;
    setBusyId(candidate.submissionId);
    try {
      setTrial(await startWebsiteTemplateTrial(websiteId, candidate.submissionId));
      notify.success('Uji template dimulai.', 'Buka website Anda dalam keadaan login untuk mencobanya.');
    } catch (cause: unknown) {
      notify.error('Uji template gagal dimulai.', errorMessage(cause, 'Coba lagi.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="flex flex-col gap-3" aria-labelledby="candidate-templates-title">
      {dialog}
      <div className="flex flex-col gap-1">
        <h3 id="candidate-templates-title" className="font-semibold text-foreground">Template baru (belum terbit)</h3>
        <p className="max-w-3xl text-sm text-default-600">
          Uji template baru di website sungguhan sebelum terbit. Versi uji template yang sudah terbit dipilih di detail template.
          Tidak tampil untuk akun lain.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {candidates.map((candidate) => {
          const active = trial?.candidate?.submissionId === candidate.submissionId;
          const unsupported = Boolean(businessProfile && candidate.businessProfiles.length
            && !candidate.businessProfiles.includes(businessProfile));
          return (
            <article
              key={candidate.submissionId}
              className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-dashed border-primary-300 bg-white"
            >
              <CandidateThumb candidate={candidate} />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-foreground">{candidate.name} <span className="font-normal text-default-500">{candidate.version}</span></span>
                  <span className="flex shrink-0 flex-wrap justify-end gap-1">
                    {active && <span className="rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700">Sedang diuji</span>}
                    <span className="rounded-full bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-700">{candidate.statusLabel}</span>
                  </span>
                </div>
                <p className="text-xs text-default-500">
                  {ROLE_LABELS[candidate.viewerRole]}
                  {candidate.publishedVersion ? ` · update dari versi terbit ${candidate.publishedVersion}` : ' · template baru'}
                </p>
                {candidate.changelog ? <p className="line-clamp-3 whitespace-pre-line text-xs text-default-600">{candidate.changelog}</p> : null}
                <p className="text-[11px] text-default-500">{visibilityText(candidate)}</p>
                {unsupported ? (
                  <p className="text-xs text-warning-700">Tidak mendukung jenis bisnis website ini.</p>
                ) : null}
                <div className="mt-auto pt-1">
                  {canChange ? (
                    <Button
                      size="sm"
                      color="primary"
                      variant={active ? 'bordered' : 'solid'}
                      isDisabled={active || unsupported || busyId !== null}
                      isLoading={busyId === candidate.submissionId}
                      onPress={() => void startTrial(candidate)}
                    >
                      {active ? 'Sedang diuji di website ini' : 'Uji di website ini'}
                    </Button>
                  ) : (
                    <p className="text-xs text-default-500">Minta admin website untuk memulai uji.</p>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** Template aktif: banner uji yang sedang berjalan di website ini. */
export function ActiveTemplateTrialBanner({
  websiteId,
  websiteSlug,
  canChange,
}: {
  websiteId: string;
  websiteSlug: string;
  canChange: boolean;
}) {
  const [trial, setTrial] = useState<WebsiteTemplateTrialDto | null>(null);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchWebsiteTemplateTrial(websiteId)
      .then((result) => {
        if (!cancelled) setTrial(result);
      })
      .catch(() => {
        if (!cancelled) setTrial(null);
      });
    return () => {
      cancelled = true;
    };
  }, [websiteId]);

  if (!trial) return null;
  if (!trial.candidate) {
    return trial.hiddenFromYou ? (
      <p className="rounded-xl border border-default-200 bg-default-50 p-3 text-xs text-default-600">
        Website ini sedang menguji template kandidat milik designer/reviewer lain. Pengunjung tetap melihat template terpasang.
      </p>
    ) : null;
  }
  const candidate = trial.candidate;

  const stop = async () => {
    setStopping(true);
    try {
      setTrial(await stopWebsiteTemplateTrial(websiteId));
      notify.success('Uji template dihentikan.');
    } catch (cause: unknown) {
      notify.error('Uji template gagal dihentikan.', errorMessage(cause, 'Coba lagi.'));
    } finally {
      setStopping(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-warning-200 bg-warning-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">
          Mode uji: {candidate.name} {candidate.version} <span className="font-normal text-default-600">({candidate.statusLabel})</span>
        </p>
        <p className="mt-1 text-xs leading-relaxed text-default-700">
          {visibilityText(candidate)} Pengunjung lain tetap melihat template terpasang di bawah ini.
          Uji berhenti otomatis bila diminta revisi/ditolak, dan menjadi template terpasang saat terbit.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button as="a" href={buildTenantWebUrl(websiteSlug)} target="_blank" rel="noreferrer" size="sm" variant="bordered">
          Buka website
        </Button>
        {canChange ? (
          <Button size="sm" color="warning" variant="flat" isLoading={stopping} onPress={() => void stop()}>
            Hentikan uji
          </Button>
        ) : null}
      </div>
    </section>
  );
}
