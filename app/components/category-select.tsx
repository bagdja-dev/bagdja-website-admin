'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { AppModal } from './app-modal';
import { QuickAddCategoryModal } from './quick-add-category-modal';
import { apiClient } from '../lib/api-client';
import type { WebsiteCategory } from '../lib/types';

const CREATE_NEW_KEY = '__create_new__';

interface DisplayOption {
  id: string;
  label: string;
}

interface CategorySelectProps {
  label?: string;
  placeholder?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  className?: string;
  websiteId: string;
  selectedId: string;
  /** Label kategori terpilih — ditampilkan di tombol pemicu tanpa perlu fetch ulang. */
  selectedLabel?: string;
  onSelect: (id: string, label: string) => void;
}

/**
 * Combobox pencarian kategori — pola sama seperti `AsyncSearchSelect` di
 * bagdja-pos-admin (modal search, bukan dropdown mengambang, supaya nyaman
 * di mobile). Disederhanakan tanpa pagination server-side karena kategori
 * per-website realistis cuma puluhan, jadi fetch penuh sekali + filter
 * client-side sudah cukup. Kalau ketik nama yang belum ada → opsi
 * "+ Tambah ... kategori baru" membuka `QuickAddCategoryModal`.
 */
export function CategorySelect({
  label,
  placeholder,
  isRequired,
  isDisabled,
  className,
  websiteId,
  selectedId,
  selectedLabel,
  onSelect,
}: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<WebsiteCategory[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddQuery, setQuickAddQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || loaded) return;
    setLoading(true);
    apiClient<WebsiteCategory[]>(`/api/websites/${websiteId}/categories`)
      .then((data) => {
        setCategories(data);
        setLoaded(true);
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, [open, loaded, websiteId]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => searchRef.current?.focus());
    else {
      setFilterText('');
      setHighlighted(0);
    }
  }, [open]);

  const trimmedInput = filterText.trim();
  const filtered = categories.filter((c) => c.label.toLowerCase().includes(trimmedInput.toLowerCase()));
  const hasExactMatch = categories.some((c) => c.label.toLowerCase() === trimmedInput.toLowerCase());
  const showCreateOption = trimmedInput.length > 0 && !hasExactMatch;

  const displayItems: DisplayOption[] = showCreateOption
    ? [...filtered, { id: CREATE_NEW_KEY, label: `+ Tambah "${trimmedInput}" sebagai kategori baru` }]
    : filtered;

  function closeMenu() {
    setOpen(false);
  }

  function selectOption(opt: DisplayOption) {
    if (opt.id === CREATE_NEW_KEY) {
      setQuickAddQuery(trimmedInput);
      setQuickAddOpen(true);
      return;
    }
    onSelect(opt.id, opt.label);
    closeMenu();
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, displayItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = displayItems[highlighted];
      if (opt) selectOption(opt);
    }
  }

  return (
    <div className={className}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-foreground">
          {label}
          {isRequired && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}

      <button
        type="button"
        disabled={isDisabled}
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-xl border border-default-300 bg-white px-3.5 py-2.5 text-left text-sm shadow-sm transition-colors hover:border-default-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={selectedLabel ? 'truncate text-foreground' : 'truncate text-default-400'}>
          {selectedLabel || placeholder || 'Pilih kategori...'}
        </span>
        <svg className="h-4 w-4 shrink-0 text-default-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <AppModal isOpen={open} onClose={closeMenu} title={label || 'Pilih Kategori'} size="sm">
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
              placeholder="Cari atau ketik nama kategori baru..."
              className="w-full rounded-md border border-default-200 px-3 py-2 text-base outline-none focus:border-primary"
            />
          </div>
          <div role="listbox" className="flex-1 overflow-y-auto py-1 text-sm">
            {loading ? (
              <div className="px-3 py-4 text-center text-default-400">Memuat...</div>
            ) : displayItems.length === 0 ? (
              <div className="px-3 py-4 text-center text-default-400">Belum ada kategori — ketik nama untuk membuat baru.</div>
            ) : (
              displayItems.map((opt, idx) => (
                <div
                  key={opt.id}
                  role="option"
                  aria-selected={opt.id === selectedId}
                  onMouseEnter={() => setHighlighted(idx)}
                  onClick={() => selectOption(opt)}
                  className={`cursor-pointer px-4 py-3 active:bg-default-100 ${idx === highlighted ? 'bg-default-100' : ''} ${
                    opt.id === CREATE_NEW_KEY || opt.id === selectedId ? 'font-medium text-primary' : ''
                  }`}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      </AppModal>

      <QuickAddCategoryModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        websiteId={websiteId}
        initialLabel={quickAddQuery}
        onSaved={(category) => {
          setCategories((prev) => [...prev, category]);
          onSelect(category.id, category.label);
          setQuickAddOpen(false);
          closeMenu();
        }}
      />
    </div>
  );
}
