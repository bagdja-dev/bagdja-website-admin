'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Select, SelectItem } from '@heroui/react';

import { fetchFulfillmentFlows, type FulfillmentFlow } from '@/studio/api/fulfillment-flows';

/**
 * Pilih Master Flow untuk section "Alur Layanan" (`flowPicker`, nilai = id flow). Langkah flow terpilih
 * diinjeksi renderer ke section saat halaman dibuka — hanya untuk flow AKTIF (endpoint publik menyaring
 * is_active), jadi flow nonaktif tetap bisa dipilih tetapi diberi peringatan.
 */
export function FlowPickerField({
  value,
  websiteId,
  label,
  onChange,
}: {
  value: string;
  websiteId: string;
  label: string;
  onChange: (value: string) => void;
}) {
  const [flows, setFlows] = useState<FulfillmentFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchFulfillmentFlows(websiteId)
      .then((result) => {
        if (!cancelled) setFlows(result);
      })
      .catch(() => {
        if (!cancelled) setError('Master Flow gagal dimuat.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [retry, websiteId]);

  const selected = flows.find((flow) => flow.id === value);
  const missing = Boolean(value) && !loading && !error && !selected;
  const options = [
    ...flows.map((flow) => ({
      key: flow.id,
      label: `${flow.name}${flow.is_active ? '' : ' (nonaktif)'}`,
      description: `${flow.steps.length} langkah`,
    })),
    // Flow terpilih sudah dihapus: tetap tampil agar pengguna sadar perlu memilih ulang.
    ...(missing ? [{ key: value, label: 'Flow tidak ditemukan', description: 'Pilih Master Flow lain' }] : []),
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <Select
        aria-label={label}
        selectedKeys={value ? [value] : []}
        onSelectionChange={(keys) => {
          const [next] = Array.from(keys);
          onChange(next ? String(next) : '');
        }}
        isDisabled={loading || Boolean(error)}
        isLoading={loading}
        placeholder="Pilih Master Flow"
        isInvalid={missing}
      >
        {options.map((option) => (
          <SelectItem key={option.key} description={option.description}>{option.label}</SelectItem>
        ))}
      </Select>
      {error ? (
        <div className="flex items-center justify-between gap-2">
          <p role="alert" className="text-[11px] text-danger">{error}</p>
          <button
            type="button"
            className="text-[11px] font-medium text-primary hover:underline"
            onClick={() => setRetry((current) => current + 1)}
          >
            Coba lagi
          </button>
        </div>
      ) : flows.length === 0 && !loading ? (
        <p className="text-[11px] text-default-500">
          Belum ada Master Flow.{' '}
          <Link href="/studio/flows" className="font-medium text-primary hover:underline">Buat Master Flow</Link>{' '}
          lalu pilih di sini.
        </p>
      ) : selected && !selected.is_active ? (
        <p className="text-[11px] text-warning-700">
          Flow ini nonaktif sehingga langkahnya tidak tampil di website.{' '}
          <Link href={`/studio/flows/${encodeURIComponent(selected.id)}`} className="font-medium underline">Aktifkan di Master Flow</Link>.
        </p>
      ) : null}
    </div>
  );
}
