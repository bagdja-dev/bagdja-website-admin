'use client';

import type { BusinessProfileDto } from '@/studio/api/types';

import { ProfileIcon } from './profile-icons';
import type { WaitlistState } from './use-business-profiles';

const CHECK = 'm4.5 12.75 6 6 9-13.5';

export interface ProfileCardProps {
  profile: BusinessProfileDto;
  selected: boolean;
  onSelect: () => void;
}

/** Kartu profil tersedia: desktop kartu vertikal + centang; HP baris dengan radio (artboard HP). */
export function ProfileCard({ profile, selected, onSelect }: ProfileCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative flex w-full items-center gap-3 rounded-[14px] text-left transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:min-h-[140px] md:flex-col md:items-start md:gap-3 ${
        selected
          ? 'border-2 border-primary bg-primary-50 px-[13px] py-[11px] shadow-[0_4px_14px_rgba(122,30,72,0.12)] md:p-[19px]'
          : 'border border-default-200 bg-white px-3.5 py-3 hover:border-primary-200 md:p-5'
      }`}
    >
      <span
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] md:h-11 md:w-11 md:rounded-[11px] ${
          selected ? 'bg-primary text-white' : 'bg-default-100 text-default-700'
        }`}
      >
        <ProfileIcon profileId={profile.id} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 md:gap-1">
        <span className="text-[15px] font-bold text-foreground md:text-base">{profile.label}</span>
        <span className="text-[13px] leading-snug text-default-600">{profile.examples}</span>
      </span>
      <span
        aria-hidden="true"
        className={`h-5 w-5 shrink-0 rounded-full md:hidden ${selected ? 'border-[6px] border-primary bg-white' : 'border-[1.5px] border-default-400'}`}
      />
      {selected && (
        <span className="absolute right-3.5 top-3.5 hidden h-6 w-6 items-center justify-center rounded-full bg-primary text-white md:inline-flex">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={CHECK} />
          </svg>
        </span>
      )}
    </button>
  );
}

export interface ComingSoonCardProps {
  profile: BusinessProfileDto;
  waitlist: WaitlistState;
  onNotify: () => void;
}

const NOTIFY_LABEL: Record<WaitlistState, string> = {
  idle: 'Kabari saya',
  saving: 'Mencatat…',
  done: '✓ Kami akan kabari kamu',
  error: 'Gagal, coba lagi',
};

/** Kartu "Segera hadir": tidak bisa dipilih; "Kabari saya" mencatat minat. */
export function ComingSoonCard({ profile, waitlist, onNotify }: ComingSoonCardProps) {
  const done = waitlist === 'done';
  return (
    <div className="relative flex items-center gap-3 rounded-[14px] border border-dashed border-default-300 bg-default-50 px-3.5 py-3 md:min-h-[140px] md:flex-col md:items-start md:px-5 md:py-[18px]">
      <span className="absolute right-3.5 top-3.5 hidden rounded-full bg-[#FFFBEB] px-2.5 py-0.5 text-[11px] font-bold text-[#92400E] md:inline">
        Segera hadir
      </span>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-default-100 text-default-500 md:h-11 md:w-11 md:rounded-[11px]">
        <ProfileIcon profileId={profile.id} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 md:gap-1">
        <span className="text-[15px] font-bold text-default-700 md:text-base">{profile.label}</span>
        <span className="text-xs font-bold text-[#92400E] md:hidden">Segera hadir</span>
        <span className="hidden text-[13px] leading-snug text-default-600 md:block">{profile.examples}</span>
      </span>
      <button
        type="button"
        onClick={onNotify}
        disabled={done || waitlist === 'saving'}
        aria-live="polite"
        className={`min-h-9 shrink-0 rounded-[9px] px-2.5 py-1.5 text-xs font-bold md:px-3 md:text-[13px] ${
          done ? 'bg-[#F0FDF4] text-success' : 'border border-primary-200 bg-white text-primary hover:bg-primary-50'
        }`}
      >
        {done ? (
          <>
            <span className="md:hidden">✓ Dicatat</span>
            <span className="hidden md:inline">{NOTIFY_LABEL.done}</span>
          </>
        ) : (
          NOTIFY_LABEL[waitlist]
        )}
      </button>
    </div>
  );
}
