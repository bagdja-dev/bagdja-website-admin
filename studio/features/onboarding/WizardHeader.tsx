import { BrandLogo } from '@/studio/ui/brand/BrandLogo';

export type WizardStepNumber = 1 | 2 | 3 | 4;

const STEPS = ['Jenis bisnis', 'Template', 'Nama & logo'] as const;
const CHECK = 'm4.5 12.75 6 6 9-13.5';

export interface WizardHeaderProps {
  /** 4 = selesai (semua langkah tercentang). */
  current: WizardStepNumber;
  exitHref: string;
}

/** Header wizard: desktop = stepper bernomor (artboard 1/2); HP = "Langkah n / 3" + bar progres (artboard HP). */
export function WizardHeader({ current, exitHref }: WizardHeaderProps) {
  const shown = Math.min(current, 3);
  // Artboard Wizard-Selesai: header hanya lockup.
  if (current === 4) {
    return (
      <header className="border-b border-default-200 bg-white px-4 py-3.5 md:px-8">
        <span className="md:hidden">
          <BrandLogo size="sm" />
        </span>
        <span className="hidden md:inline-flex">
          <BrandLogo size="md" />
        </span>
      </header>
    );
  }
  return (
    <header className="border-b border-default-200 bg-white">
      <div className="flex flex-col gap-3 px-4 pb-3.5 pt-4 md:hidden">
        <div className="flex items-center justify-between">
          <BrandLogo size="sm" />
          <span className="text-[13px] font-semibold text-default-600">Langkah {shown} / 3</span>
        </div>
        <div
          role="progressbar"
          aria-label="Progres wizard"
          aria-valuemin={0}
          aria-valuemax={3}
          aria-valuenow={shown}
          className="grid grid-cols-3 gap-1.5"
        >
          {STEPS.map((label, i) => (
            <span key={label} className={`h-1 rounded-sm ${i < shown ? 'bg-primary' : 'bg-default-200'}`} />
          ))}
        </div>
      </div>

      <div className="hidden flex-wrap items-center justify-between gap-4 px-8 py-3.5 md:flex">
        <BrandLogo size="md" />
        <ol className="flex flex-wrap items-center gap-3 text-sm" aria-label="Langkah pembuatan website">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < current;
            const active = n === current;
            return (
              <li key={label} className="flex items-center gap-3">
                {i > 0 && <span aria-hidden="true" className={`h-0.5 w-8 ${done || active ? 'bg-[#86EFAC]' : 'bg-default-200'}`} />}
                <span
                  aria-current={active ? 'step' : undefined}
                  className={`flex items-center gap-2 ${done ? 'font-semibold text-success' : active ? 'font-bold text-primary' : 'font-medium text-default-500'}`}
                >
                  <span
                    className={`inline-flex h-[26px] w-[26px] items-center justify-center rounded-full text-[13px] ${
                      done
                        ? 'bg-[#DCFCE7] text-success'
                        : active
                          ? 'bg-primary text-white'
                          : 'border-[1.5px] border-default-300 text-default-500'
                    }`}
                  >
                    {done ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d={CHECK} />
                      </svg>
                    ) : (
                      n
                    )}
                  </span>
                  {label}
                  {done && <span className="sr-only">(selesai)</span>}
                </span>
              </li>
            );
          })}
        </ol>
        <a href={exitHref} className="text-sm font-semibold text-default-600 no-underline hover:text-primary">
          Keluar
        </a>
      </div>
    </header>
  );
}
