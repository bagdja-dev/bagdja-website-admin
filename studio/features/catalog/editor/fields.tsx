'use client';

import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { StatusSwitch } from '@/studio/ui/primitives/StatusSwitch';

import { moneyDisplay, moneyFromInput } from '../money';

export const INPUT =
  'w-full min-w-0 rounded-[10px] border border-default-300 bg-white px-3 py-2.5 text-[15px] text-foreground placeholder:text-default-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-default-50 disabled:text-default-500 md:text-sm';
export const LABEL = 'text-[13px] font-bold text-foreground';
export const HINT = 'text-xs text-default-600';
export const ADD_BTN =
  'inline-flex min-h-10 items-center gap-1.5 self-start rounded-[10px] border border-dashed border-default-300 bg-white px-3.5 text-[13px] font-semibold text-foreground hover:bg-default-50 disabled:opacity-50';
export const ICON_BTN =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-default-200 bg-white text-default-600 hover:bg-default-50 disabled:opacity-40';

/** Kartu bagian editor (artboard Produk-Editor: radius 16, padding 20). */
export function SectionCard({ id, title, description, aside, children }: { id: string; title: string; description?: ReactNode; aside?: ReactNode; children?: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-24 flex-col gap-3.5 rounded-2xl border border-default-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <h2 id={`${id}-title`} className="text-base font-extrabold text-foreground">
            {title}
          </h2>
          {description && <span className="text-[13px] text-default-600">{description}</span>}
        </span>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, hint, error, htmlFor, children }: { label: string; hint?: ReactNode; error?: string | null; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className={LABEL}>
        {label}
      </label>
      {children}
      {error ? (
        <span role="alert" className="text-xs font-semibold text-danger">
          {error}
        </span>
      ) : (
        hint && <span className={HINT}>{hint}</span>
      )}
    </div>
  );
}

type TextProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  error?: string | null;
  suffix?: string;
};

export function TextField({ label, value, onChange, hint, error, suffix, ...rest }: TextProps) {
  const id = useId();
  const input = (
    <input id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={error ? true : undefined} className={INPUT} {...rest} />
  );
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      {suffix ? (
        <span className="flex items-center gap-2">
          {input}
          <span className="shrink-0 text-sm text-default-600">{suffix}</span>
        </span>
      ) : (
        input
      )}
    </Field>
  );
}

/** Angka bulat ≥0 (stok, menit, gram). */
export function IntField(props: TextProps) {
  return <TextField inputMode="numeric" {...props} onChange={(v) => props.onChange(v.replace(/[^\d]/g, ''))} />;
}

export function TextAreaField({ label, value, onChange, hint, error, rows = 3, placeholder, disabled }: { label: string; value: string; onChange: (v: string) => void; hint?: ReactNode; error?: string | null; rows?: number; placeholder?: string; disabled?: boolean }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <textarea id={id} rows={rows} value={value} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={`${INPUT} resize-y`} />
    </Field>
  );
}

/** Input rupiah: tampilan "50.000", state kanonis "50000" (lihat money.ts). */
export function MoneyInput({ value, onChange, ariaLabel, id, invalid }: { value: string; onChange: (v: string) => void; ariaLabel?: string; id?: string; invalid?: boolean }) {
  return (
    <span className="flex min-w-0 items-center overflow-hidden rounded-[10px] border border-default-300 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      <span className="border-r border-default-200 bg-default-50 px-3 py-2.5 text-sm font-semibold text-default-600">Rp</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        value={moneyDisplay(value)}
        onChange={(e) => onChange(moneyFromInput(e.target.value))}
        className="w-full min-w-0 border-0 bg-transparent px-3 py-2.5 text-[15px] tabular-nums text-foreground outline-none disabled:text-default-500 md:text-sm"
      />
    </span>
  );
}

export function MoneyField({ label, value, onChange, hint, error }: { label: string; value: string; onChange: (v: string) => void; hint?: ReactNode; error?: string | null }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <MoneyInput id={id} value={value} onChange={onChange} invalid={Boolean(error)} />
    </Field>
  );
}

/** Baris toggle: judul + penjelasan di kiri, switch di kanan. */
export function ToggleRow({ title, description, value, onChange, disabled }: { title: string; description?: ReactNode; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-default-200 px-3.5 py-3">
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-bold text-foreground">{title}</span>
        {description && <span className="text-[13px] text-default-600">{description}</span>}
      </span>
      <StatusSwitch isSelected={value} onChange={onChange} ariaLabel={title} isDisabled={disabled} />
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'danger'; children: ReactNode }) {
  const cls =
    tone === 'danger'
      ? 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
      : tone === 'warning'
        ? 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]'
        : 'border-default-200 bg-default-50 text-default-700';
  return <div className={`rounded-xl border px-3.5 py-3 text-[13px] ${cls}`}>{children}</div>;
}
