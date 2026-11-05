'use client';

import { Skeleton } from '@heroui/react';

import { ComingSoonCard, ProfileCard } from './ProfileCard';
import type { BusinessProfilesState, SelectableProfileId } from './use-business-profiles';
import { ARROW_RIGHT, Arrow, LoadError, StepActions, StepIntro, WizardButton } from './wizard-ui';

const CHECK = 'm4.5 12.75 6 6 9-13.5';

export interface ProfileStepProps {
  catalog: BusinessProfilesState;
  selectedId: SelectableProfileId | null;
  onSelect: (id: SelectableProfileId) => void;
  onNext: () => void;
}

/** Langkah 1 — artboard "1 · Wizard — Jenis bisnis (9 profil)" + "Wizard di HP". */
export function ProfileStep({ catalog, selectedId, onSelect, onNext }: ProfileStepProps) {
  const selected = catalog.profiles.find((p) => p.id === selectedId && p.status === 'available') ?? null;
  const modules = selected ? catalog.moduleSummary(selected.id) : [];

  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-4 px-4 pb-28 pt-5 md:gap-[22px] md:px-6 md:pb-7 md:pt-8">
      <StepIntro
        step={1}
        title="Bisnis kamu jenis apa?"
        description="Kami siapkan menu, contoh konten, dan template yang pas. Semua bisa diubah lagi nanti."
      />

      {catalog.status === 'error' && <LoadError message={catalog.error ?? 'Gagal memuat.'} onRetry={catalog.reload} />}

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-[repeat(auto-fill,minmax(290px,1fr))] md:gap-3.5">
        {catalog.status === 'loading' &&
          Array.from({ length: 9 }, (_, i) => <Skeleton key={i} className="h-16 rounded-[14px] md:h-[140px]" />)}
        {catalog.profiles.map((profile) =>
          profile.status === 'available' ? (
            <ProfileCard
              key={profile.id}
              profile={profile}
              selected={profile.id === selectedId}
              onSelect={() => onSelect(profile.id)}
            />
          ) : (
            <ComingSoonCard
              key={profile.id}
              profile={profile}
              waitlist={catalog.waitlist[profile.id] ?? 'idle'}
              onNotify={() => void catalog.joinWaitlist(profile.id)}
            />
          ),
        )}
      </div>

      {selected && (
        <section
          aria-label="Menu yang langsung aktif"
          className="hidden flex-wrap items-center justify-between gap-5 rounded-[14px] border border-default-200 bg-white px-6 py-5 md:flex"
        >
          <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-2.5">
          <p className="text-sm text-default-600">
            Menu yang langsung aktif untuk <strong className="text-foreground">{selected.label}</strong>:
          </p>
          <ul className="flex flex-wrap gap-2">
            {modules.map((label) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#F0FDF4] px-3 py-1.5 text-[13px] font-semibold text-success"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={CHECK} />
                </svg>
                {label}
              </li>
            ))}
          </ul>
          <p className="text-[13px] text-default-500">
            Fitur lain (Penawaran, Vendor, Kalender Acara, dll.) bisa diaktifkan kapan saja dari menu Fitur. Fitur bertanda
            «segera hadir» aktif otomatis saat siap.
          </p>
          </div>
          <WizardButton onClick={onNext}>
            Lanjut pilih template
            <Arrow d={ARROW_RIGHT} />
          </WizardButton>
        </section>
      )}

      <div className="md:hidden">
        <StepActions>
          <WizardButton onClick={onNext} disabled={!selected}>
            Lanjut
          </WizardButton>
        </StepActions>
      </div>
    </div>
  );
}
