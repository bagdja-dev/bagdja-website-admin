'use client';

import { Spinner } from '@heroui/react';

export type StatusSwitchSize = 'md' | 'sm';

export interface StatusSwitchProps {
  isSelected: boolean;
  onChange: (next: boolean) => void;
  /** Label aksesibel, mis. "Tampilkan di website: Cara pesan". */
  ariaLabel: string;
  isDisabled?: boolean;
  isPending?: boolean;
  /** md = 46×28 (artboard FAQ-HP & drawer), sm = 42×26 (tabel FAQ-List). */
  size?: StatusSwitchSize;
  /** Tampilkan teks "Aktif"/"Nonaktif" di samping switch. */
  showLabel?: boolean;
  onLabel?: string;
  offLabel?: string;
}

const DIM: Record<StatusSwitchSize, { track: string; knob: string; on: string }> = {
  md: { track: 'h-7 w-[46px]', knob: 'h-[22px] w-[22px]', on: 'translate-x-[18px]' },
  sm: { track: 'h-[26px] w-[42px]', knob: 'h-5 w-5', on: 'translate-x-4' },
};

/** Toggle status sesuai artboard: track burgundi saat aktif, abu `#D4D4D8` saat mati. */
export function StatusSwitch({
  isSelected,
  onChange,
  ariaLabel,
  isDisabled = false,
  isPending = false,
  size = 'md',
  showLabel = false,
  onLabel = 'Aktif',
  offLabel = 'Nonaktif',
}: StatusSwitchProps) {
  const dim = DIM[size];
  const disabled = isDisabled || isPending;
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={isSelected}
        aria-label={ariaLabel}
        aria-busy={isPending || undefined}
        disabled={disabled}
        onClick={() => onChange(!isSelected)}
        className={`relative inline-flex shrink-0 items-center rounded-full p-[3px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed ${dim.track} ${
          isSelected ? 'bg-primary' : 'bg-default-300'
        } ${isDisabled && !isPending ? 'opacity-50' : ''}`}
      >
        <span
          aria-hidden="true"
          className={`flex items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform ${dim.knob} ${
            isSelected ? dim.on : 'translate-x-0'
          }`}
        >
          {isPending && <Spinner size="sm" color="default" classNames={{ wrapper: 'h-3 w-3' }} aria-label="Menyimpan" />}
        </span>
      </button>
      {showLabel && <span className="text-xs text-default-600">{isSelected ? onLabel : offLabel}</span>}
    </span>
  );
}
