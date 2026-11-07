'use client';

import { useEffect, useRef, useState } from 'react';

import { studioRequest } from '@/studio/api/client';

interface ShippingAreaOption {
  providerAreaId: string;
  name: string;
  type: string;
}

interface LocationAreaSearchProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function LocationAreaSearch({ value, onChange, disabled = false }: LocationAreaSearchProps) {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<ShippingAreaOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed === value) {
      setOptions([]);
      setOpen(false);
      setLoading(false);
      setError(null);
      return;
    }

    const id = ++requestId.current;
    setOptions([]);
    setOpen(false);
    setLoading(true);
    const timer = window.setTimeout(async () => {
      setError(null);
      try {
        const results = await studioRequest<ShippingAreaOption[]>(
          `/api/public/shipping/areas?q=${encodeURIComponent(trimmed)}`,
        );
        if (id === requestId.current) {
          setOptions(results);
          setOpen(true);
        }
      } catch {
        if (id === requestId.current) {
          setOptions([]);
          setError('Area tidak dapat dimuat. Coba cari lagi.');
        }
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query, value]);

  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor="location-shipping-area" className="text-[12px] font-semibold text-default-600">
        Area asal pengiriman
      </label>
      <input
        id="location-shipping-area"
        value={query}
        disabled={disabled}
        onChange={(event) => {
          setQuery(event.target.value);
          if (!event.target.value.trim()) onChange('');
        }}
        onFocus={() => options.length > 0 && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder="Cari kota atau kecamatan..."
        autoComplete="off"
        className="min-h-11 w-full rounded-[10px] border border-default-300 bg-white px-3 text-sm text-foreground placeholder:text-default-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-default-50"
      />
      {loading && <p className="text-[12px] text-default-500">Mencari area...</p>}
      {error && <p role="alert" className="text-[12px] text-danger">{error}</p>}
      {!loading && !error && query.trim() && query.trim() !== value && options.length === 0 && (
        <p className="text-[12px] text-default-500">Tidak ada area yang cocok.</p>
      )}
      {open && options.length > 0 && (
        <ul className="absolute left-0 top-full z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-[10px] border border-default-200 bg-white py-1 shadow-xl">
          {options.map((option) => (
            <li key={option.providerAreaId}>
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-sm text-foreground hover:bg-default-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.name);
                  setQuery(option.name);
                  setOpen(false);
                }}
              >
                {option.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[12px] text-default-500">Pilih area yang dipakai sebagai titik asal perhitungan ongkir.</p>
    </div>
  );
}
