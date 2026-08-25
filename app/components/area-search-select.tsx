'use client';

import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../lib/api-client';

interface ShippingAreaOption {
  providerAreaId: string;
  name: string;
  type: string;
}

interface AreaSearchSelectProps {
  label: string;
  description?: string;
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Search-select nama area (provinsi/kota/kecamatan) dari
 * `bagdja-shipping-service` (proxy `GET /api/public/shipping/areas?q=`) —
 * dipakai untuk isi `shipping_area_name` lokasi (asal pengiriman). Simpan
 * NAMA-nya (bukan ID mentah) — `bagdja-shipping-service` re-search by name
 * tiap hitung ongkir (lihat plan/shipping-service/overview.md §6 isu #1).
 */
export function AreaSearchSelect({
  label,
  description,
  value,
  onChange,
  disabled,
  placeholder,
}: AreaSearchSelectProps) {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<ShippingAreaOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed || trimmed === value) {
      setOptions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await apiClient<ShippingAreaOption[]>(
          `/api/public/shipping/areas?q=${encodeURIComponent(trimmed)}`,
        );
        setOptions(Array.isArray(results) ? results : []);
        setOpen(true);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, value]);

  return (
    <div className="relative flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        value={query}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          // Cuma propagate ke parent kalau dikosongkan (clear) atau lewat klik
          // hasil pencarian di bawah — BUKAN tiap keystroke. Kalau tiap
          // keystroke di-propagate, `value` prop langsung menyusul `query` di
          // render berikutnya, membuat guard `trimmed === value` di effect
          // debounce selalu true → pencarian tidak pernah jalan (bug 26 Agu 2026).
          if (!next.trim()) onChange('');
        }}
        onFocus={() => options.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder ?? 'Cari kota/kecamatan...'}
        className="w-full rounded-xl border border-default-300 bg-white px-3.5 py-2.5 text-sm text-foreground shadow-sm transition-all placeholder:text-default-400 hover:border-default-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-default-50 disabled:opacity-60"
      />
      {loading && <p className="text-xs text-default-400">Mencari area...</p>}
      {open && options.length > 0 && (
        <ul className="absolute top-full z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-default-200 bg-white py-1 shadow-xl">
          {options.map((opt) => (
            <li key={opt.providerAreaId}>
              <button
                type="button"
                className="block w-full px-3.5 py-2 text-left text-sm text-foreground hover:bg-default-100"
                onClick={() => {
                  onChange(opt.name);
                  setQuery(opt.name);
                  setOpen(false);
                }}
              >
                {opt.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {description && <p className="text-xs leading-relaxed text-default-500">{description}</p>}
    </div>
  );
}
