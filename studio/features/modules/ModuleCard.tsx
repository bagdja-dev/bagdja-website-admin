'use client';

import { StatusSwitch } from '@/studio/ui/primitives/StatusSwitch';

import type { FeatureCardModel } from './use-features-page';

export interface ModuleCardProps {
  card: FeatureCardModel;
  canEdit: boolean;
  onToggle: (next: boolean) => void;
}

/** Kartu modul (artboard Fitur): nama + switch, deskripsi, "Butuh: …", alasan kunci kuning tua. */
export function ModuleCard({ card, canEdit, onToggle }: ModuleCardProps) {
  const locked = card.lockReason !== null;
  return (
    <div
      className={`flex flex-col gap-2 rounded-[14px] border bg-white p-4 ${card.enabled ? 'border-primary-200' : 'border-default-200'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[15px] font-bold text-foreground">{card.label}</span>
        <StatusSwitch
          isSelected={card.enabled}
          onChange={onToggle}
          ariaLabel={`${card.enabled ? 'Matikan' : 'Aktifkan'} ${card.label}`}
          isDisabled={locked || !canEdit}
          isPending={card.pending}
        />
      </div>
      <p className="text-[13px] leading-snug text-default-600">{card.description}</p>
      {card.dependsOnLabels.length > 0 && <p className="text-xs text-default-500">Butuh: {card.dependsOnLabels.join(', ')}</p>}
      {card.lockReason && (
        <p className="inline-flex items-start gap-1.5 text-xs font-semibold text-[#92400E]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="mt-px shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          {card.lockReason}
        </p>
      )}
    </div>
  );
}
