'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';

const inputClass =
  'w-full rounded-xl border border-default-300 bg-white px-3.5 py-2.5 text-sm text-foreground shadow-sm transition-all placeholder:text-default-400 hover:border-default-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-default-50 disabled:opacity-60';

interface FormFieldBase {
  label: string;
  description?: string;
  required?: boolean;
  error?: string;
}

interface FormInputProps
  extends FormFieldBase,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export function FormInput({
  label,
  description,
  required,
  error,
  value,
  onChange,
  className,
  ...props
}: FormInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      <input
        {...props}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass}${error ? ' border-danger focus:border-danger focus:ring-danger/20' : ''}${className ? ` ${className}` : ''}`}
      />
      {description && !error && (
        <p className="text-xs leading-relaxed text-default-500">{description}</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

interface FormTextareaProps
  extends FormFieldBase,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export function FormTextarea({
  label,
  description,
  required,
  error,
  value,
  onChange,
  className,
  rows = 4,
  ...props
}: FormTextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      <textarea
        {...props}
        rows={rows}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} resize-y min-h-[5rem]${error ? ' border-danger focus:border-danger focus:ring-danger/20' : ''}${className ? ` ${className}` : ''}`}
      />
      {description && !error && (
        <p className="text-xs leading-relaxed text-default-500">{description}</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export interface FormSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface CustomSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: FormSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  'aria-labelledby'?: string;
}

const MENU_MAX_HEIGHT = 240;
const MENU_ITEM_HEIGHT = 44;

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-default-400 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function CustomSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  error,
  className,
  'aria-labelledby': ariaLabelledBy,
}: CustomSelectProps) {
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(
    null,
  );

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const estimatedHeight = Math.min(options.length * MENU_ITEM_HEIGHT + 8, MENU_MAX_HEIGHT);
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUpward = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    const maxHeight = openUpward
      ? Math.min(MENU_MAX_HEIGHT, spaceAbove)
      : Math.min(MENU_MAX_HEIGHT, spaceBelow);

    setMenuRect({
      top: openUpward ? rect.top - maxHeight - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      maxHeight,
    });
  }, [options.length]);

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();

    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const menu =
    mounted && open && menuRect
      ? createPortal(
          <>
            <button
              type="button"
              tabIndex={-1}
              aria-hidden
              className="fixed inset-0 z-[10000] cursor-default bg-transparent"
              onClick={() => setOpen(false)}
            />
            <ul
              id={listboxId}
              role="listbox"
              aria-activedescendant={value ? `${listboxId}-${value}` : undefined}
              className="fixed z-[10001] overflow-y-auto rounded-xl border border-default-200 bg-white py-1 shadow-xl ring-1 ring-black/5"
              style={{
                top: menuRect.top,
                left: menuRect.left,
                width: menuRect.width,
                maxHeight: menuRect.maxHeight,
              }}
            >
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <li key={opt.value} role="presentation">
                    <button
                      id={`${listboxId}-${opt.value}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt.value)}
                      className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-default-100 active:bg-default-200 ${
                        isSelected ? 'bg-primary-50 font-medium text-primary' : 'text-foreground'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{opt.label}</span>
                        {opt.description && (
                          <span className="mt-0.5 block truncate text-xs font-normal text-default-400">
                            {opt.description}
                          </span>
                        )}
                      </span>
                      {isSelected && <CheckIcon />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={ariaLabelledBy}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        className={`flex w-full items-center justify-between gap-2 text-left ${inputClass}${error ? ' border-danger focus:border-danger focus:ring-danger/20' : ''}${open ? ' border-primary ring-2 ring-primary/20' : ''}${className ? ` ${className}` : ''}`}
      >
        <span className={`truncate ${!selected && placeholder ? 'text-default-400' : ''}`}>
          {selected?.label ?? placeholder ?? 'Pilih...'}
        </span>
        <ChevronIcon open={open} />
      </button>
      {menu}
    </>
  );
}

interface FormSelectProps extends FormFieldBase {
  value: string;
  onChange: (value: string) => void;
  options: FormSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function FormSelect({
  label,
  description,
  required,
  error,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
  id: idProp,
}: FormSelectProps) {
  const autoId = useId();
  const labelId = `${autoId}-label`;
  const fieldId = idProp ?? autoId;

  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </span>
      <CustomSelect
        id={fieldId}
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        error={!!error}
        className={className}
        aria-labelledby={labelId}
      />
      {description && !error && (
        <p className="text-xs leading-relaxed text-default-500">{description}</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

interface FormSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function FormSwitch({ label, description, checked, onChange, disabled }: FormSwitchProps) {
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border border-default-200 bg-default-50/50 px-4 py-3 transition-colors ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-default-50'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-default-300 text-primary focus:ring-primary/20 disabled:cursor-not-allowed"
      />
      <div>
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description && (
          <p className="mt-0.5 text-xs text-default-500">{description}</p>
        )}
      </div>
    </label>
  );
}
