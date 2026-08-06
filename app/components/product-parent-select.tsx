'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { AppModal } from './app-modal';

export interface ProductOption {
  id: string;
  label: string;
}

interface ProductParentSelectProps {
  label?: string;
  placeholder?: string;
  isDisabled?: boolean;
  className?: string;
  /** Kandidat produk induk — sudah difilter caller (top-level, bukan diri sendiri). */
  candidates: ProductOption[];
  selectedId: string;
  selectedLabel?: string;
  onSelect: (id: string, label: string) => void;
}

/**
 * Combobox pilih produk induk (untuk jadikan produk ini varian) — pola sama
 * seperti `CategorySelect` (modal search, bukan dropdown mengambang), tanpa
 * opsi "+ Tambah" karena produk induk harus sudah ada (bukan dibuat dari sini).
 */
export function ProductParentSelect({
  label,
  placeholder,
  isDisabled,
  className,
  candidates,
  selectedId,
  selectedLabel,
  onSelect,
}: ProductParentSelectProps) {
  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) requestAnimationFrame(() => searchRef.current?.focus());
    else {
      setFilterText('');
      setHighlighted(0);
    }
  }, [open]);

  const filtered = candidates.filter((c) => c.label.toLowerCase().includes(filterText.trim().toLowerCase()));

  function closeMenu() {
    setOpen(false);
  }

  function selectOption(opt: ProductOption) {
    onSelect(opt.id, opt.label);
    closeMenu();
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[highlighted];
      if (opt) selectOption(opt);
    }
  }

  return (
    <div className={className}>
      {label && <label className="mb-1 block text-sm font-medium text-foreground">{label}</label>}

      <button
        type="button"
        disabled={isDisabled}
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-xl border border-default-300 bg-white px-3.5 py-2.5 text-left text-sm shadow-sm transition-colors hover:border-default-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={selectedLabel ? 'truncate text-foreground' : 'truncate text-default-400'}>
          {selectedLabel || placeholder || 'Pilih produk induk...'}
        </span>
        <svg className="h-4 w-4 shrink-0 text-default-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <AppModal isOpen={open} onClose={closeMenu} title={label || 'Pilih Produk Induk'} size="sm">
        <div className="-mx-5 -my-5 flex h-[60vh] max-h-[420px] flex-col sm:-mx-6">
          <div className="shrink-0 border-b border-default-100 p-3">
            <input
              ref={searchRef}
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value);
                setHighlighted(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Cari nama produk..."
              className="w-full rounded-md border border-default-200 px-3 py-2 text-base outline-none focus:border-primary"
            />
          </div>
          <div role="listbox" className="flex-1 overflow-y-auto py-1 text-sm">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-default-400">Tidak ada produk yang cocok.</div>
            ) : (
              filtered.map((opt, idx) => (
                <div
                  key={opt.id}
                  role="option"
                  aria-selected={opt.id === selectedId}
                  onMouseEnter={() => setHighlighted(idx)}
                  onClick={() => selectOption(opt)}
                  className={`cursor-pointer px-4 py-3 active:bg-default-100 ${idx === highlighted ? 'bg-default-100' : ''} ${
                    opt.id === selectedId ? 'font-medium text-primary' : ''
                  }`}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      </AppModal>
    </div>
  );
}
