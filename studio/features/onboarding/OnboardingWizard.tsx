'use client';

import { useEffect, useState } from 'react';

import { errorMessage } from '@/studio/api/client';
import {
  fetchTemplateVersionOptions,
  type TemplateVersionOptionsDto,
} from '@/studio/api/template-trials';
import {
  CandidateVersionPreview,
  TemplateVersionPicker,
  type TemplateVersionChoice,
} from '@/studio/features/appearance/TemplateVersionPicker';
import { useWebsiteStore } from '@/studio/stores/website-store';

import { DoneStep } from './DoneStep';
import { IdentityStep } from './IdentityStep';
import { ProfileStep } from './ProfileStep';
import { TemplateDetail } from './TemplateDetail';
import { TemplateStep } from './TemplateStep';
import { useBusinessProfiles, type SelectableProfileId } from './use-business-profiles';
import { useCreateWebsite } from './use-create-website';
import { normalizeWhatsapp, useIdentityForm } from './use-identity-form';
import { useTemplateCatalog } from './use-template-catalog';
import { WizardHeader, type WizardStepNumber } from './WizardHeader';

type Step = 'profile' | 'template' | 'identity' | 'done';

const STEP_NUMBER: Record<Step, WizardStepNumber> = { profile: 1, template: 2, identity: 3, done: 4 };

/**
 * Wizard onboarding Studio (plan §3.2): Jenis bisnis → Template (marketplace)
 * → Nama & logo → Selesai. Tidak ada langkah warna/tema (pindah ke Tampilan Website).
 * Dipakai oleh /studio/onboarding dan /studio/websites/new.
 */
export function OnboardingWizard() {
  const hasWebsites = useWebsiteStore((s) => s.websites.length > 0);
  const profiles = useBusinessProfiles();
  const [step, setStep] = useState<Step>('profile');
  const [profileId, setProfileId] = useState<SelectableProfileId | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [candidateOptions, setCandidateOptions] = useState<TemplateVersionOptionsDto | null>(null);
  const [candidateChoice, setCandidateChoice] = useState<TemplateVersionChoice | null>(null);
  const [candidateOptionsError, setCandidateOptionsError] = useState<string | null>(null);
  const [candidateOptionsLoading, setCandidateOptionsLoading] = useState(false);
  const [trialSubmissionId, setTrialSubmissionId] = useState<string | null>(null);
  const templates = useTemplateCatalog(step === 'profile' ? null : profileId);
  const form = useIdentityForm();
  const creation = useCreateWebsite();

  // Pra-pilih profil tersedia pertama (artboard: satu kartu selalu terpilih).
  useEffect(() => {
    if (profileId || profiles.status !== 'ready') return;
    const first = profiles.profiles.find((p) => p.status === 'available');
    if (first) setProfileId(first.id);
  }, [profileId, profiles.profiles, profiles.status]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step, detailId]);

  const profileLabel = profiles.profiles.find((p) => p.id === profileId)?.label ?? null;
  const profileLabelOf = (id: string): string | null => profiles.profiles.find((p) => p.id === id)?.label ?? null;
  const detail = detailId ? templates.findById(detailId) : null;
  const chosen = templateId ? templates.findById(templateId) : null;
  const detailPackageSlug = detail?.manifest && !detail.manifest.isBuiltin ? detail.slug : null;

  useEffect(() => {
    setCandidateOptions(null);
    setCandidateChoice(null);
    setCandidateOptionsError(null);
    setCandidateOptionsLoading(Boolean(detailPackageSlug));
    if (!detailPackageSlug) return;

    let cancelled = false;
    fetchTemplateVersionOptions(detailPackageSlug)
      .then((options) => {
        if (cancelled) return;
        setCandidateOptionsLoading(false);
        const candidates = options.candidates.filter(
          (candidate) =>
            !profileId ||
            candidate.businessProfiles.length === 0 ||
            candidate.businessProfiles.includes(profileId),
        );
        setCandidateOptions({ ...options, candidates });
        if (candidates[0]) {
          setCandidateChoice({
            kind: 'candidate',
            submissionId: candidates[0].submissionId,
            version: candidates[0].version,
          });
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setCandidateOptionsLoading(false);
          setCandidateOptionsError(errorMessage(cause, 'Versi uji template gagal dimuat.'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [detailPackageSlug, profileId]);

  const submit = async (): Promise<void> => {
    if (!profileId || !chosen) return;
    const whatsapp = normalizeWhatsapp(form.whatsapp);
    const ok = await creation.submit({
      name: form.name.trim(),
      slug: form.slug,
      template_id: chosen.id,
      business_profile: profileId,
      ...(form.logoUrl ? { logo_url: form.logoUrl } : {}),
      ...(whatsapp ? { whatsapp } : {}),
    }, trialSubmissionId ?? undefined);
    if (ok) setStep('done');
  };

  let body: JSX.Element;
  if (step === 'done' && creation.created) {
    body = (
      <DoneStep
        name={creation.created.name}
        slug={creation.created.slug}
        template={chosen}
        modules={profileId ? profiles.moduleSummary(profileId) : []}
        candidateTrial={Boolean(trialSubmissionId)}
      />
    );
  } else if (step === 'identity' && chosen) {
    body = (
      <IdentityStep
        form={form}
        template={chosen}
        submitting={creation.submitting}
        submitError={creation.error}
        onBack={() => setStep('template')}
        onSubmit={() => void submit()}
      />
    );
  } else if (step !== 'profile' && detail) {
    body = (
      <TemplateDetail
        template={detail}
        fitLabel={detail.business_profiles.map(profileLabelOf).filter((l): l is string => Boolean(l)).join(', ') || null}
        canUse={!candidateOptionsLoading}
        onBack={() => setDetailId(null)}
        {...(candidateOptionsLoading ? {
          versionPicker: <p className="text-xs text-default-600">Memuat versi uji…</p>,
        } : candidateOptions ? {
          versionPicker: (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-default-600">
                Versi terbit tetap digunakan pengunjung. Versi uji hanya terlihat oleh designer/reviewer yang berhak.
              </p>
              {candidateOptions.candidates.length > 0 ? (
                <TemplateVersionPicker
                  options={{ ...candidateOptions, published: [] }}
                  value={candidateChoice}
                  onChange={setCandidateChoice}
                  installedVersionId={null}
                  trialSubmissionId={null}
                />
              ) : (
                <p className="text-xs text-default-600">
                  Versi terbit: {candidateOptions.published[0]?.version ?? detail.manifest?.version ?? '—'}.
                  Belum ada versi uji yang tersedia untuk akun ini. Jika pengajuan sudah ditandai “Sedang direview”,
                  pastikan review diambil oleh akun reviewer yang sama.
                </p>
              )}
            </div>
          ),
          ...(candidateChoice?.kind === 'candidate' ? {
            previewOverride: <CandidateVersionPreview submissionId={candidateChoice.submissionId} />,
            applyLabel: `Uji versi ${candidateChoice.version} (hanya Anda)`,
          } : {}),
        } : candidateOptionsError ? {
          versionPicker: <p className="text-xs text-danger-600" role="alert">{candidateOptionsError}</p>,
        } : {})}
        onUse={() => {
          setTemplateId(detail.id);
          setTrialSubmissionId(candidateChoice?.kind === 'candidate' ? candidateChoice.submissionId : null);
          setDetailId(null);
          setStep('identity');
        }}
      />
    );
  } else if (step !== 'profile') {
    body = (
      <TemplateStep
        catalog={templates}
        profileLabel={profileLabel}
        profileLabelOf={profileLabelOf}
        onOpen={setDetailId}
        onBack={() => setStep('profile')}
      />
    );
  } else {
    body = (
      <ProfileStep
        catalog={profiles}
        selectedId={profileId}
        onSelect={setProfileId}
        onNext={() => profileId && setStep('template')}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-default-50 text-foreground">
      <WizardHeader current={STEP_NUMBER[step]} exitHref={hasWebsites ? '/studio' : '/auth/logout'} />
      <main className="flex flex-1 flex-col">{body}</main>
    </div>
  );
}
