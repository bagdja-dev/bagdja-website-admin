'use client';

import type { PriceFilter } from './use-template-catalog';

export interface TemplateFiltersProps {
  price: PriceFilter;
  onPrice: (value: PriceFilter) => void;
  counts: Record<PriceFilter, number>;
  profileLabel: string | null;
  showMatch: boolean;
  matchOnly: boolean;
  onMatchOnly: (value: boolean) => void;
}

const OPTIONS: ReadonlyArray<{ value: PriceFilter; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'free', label: 'Gratis' },
  { value: 'premium', label: 'Premium' },
];

const CHIP = (on: boolean): string =>
  `inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] ${
    on ? 'border-primary-200 bg-primary-50 font-bold text-primary' : 'border-default-200 bg-white font-medium text-default-700 hover:bg-default-50'
  }`;

/** Chip harga berhitung + chip centang "Cocok untuk …" (artboard Wizard-Template). */
export function TemplateFilters({ price, onPrice, counts, profileLabel, showMatch, matchOnly, onMatchOnly }: TemplateFiltersProps) {
  return (
    <div role="group" aria-label="Filter template" className="flex flex-wrap items-center gap-2">
      {OPTIONS.map((option) => {
        const on = option.value === price;
        return (
          <button key={option.value} type="button" aria-pressed={on} onClick={() => onPrice(option.value)} className={CHIP(on)}>
            {option.label}
            <span className={`rounded-full px-1.5 py-px text-[11px] font-bold ${on ? 'bg-primary text-white' : 'bg-default-100 text-default-600'}`}>
              {counts[option.value]}
            </span>
          </button>
        );
      })}
      {showMatch && profileLabel && (
        <button type="button" aria-pressed={matchOnly} onClick={() => onMatchOnly(!matchOnly)} className={CHIP(matchOnly)}>
          <span
            aria-hidden="true"
            className={`inline-flex h-4 w-4 items-center justify-center rounded text-[11px] ${matchOnly ? 'bg-primary text-white' : 'border-[1.5px] border-default-400'}`}
          >
            {matchOnly ? '✓' : ''}
          </span>
          Cocok untuk {profileLabel}
        </button>
      )}
    </div>
  );
}
