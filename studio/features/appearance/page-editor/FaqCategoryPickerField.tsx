'use client';

import { useEffect, useMemo, useState } from 'react';

import { Select, SelectItem } from '@heroui/react';

import { fetchFaqs } from '@/studio/api/faqs';

const ALL_CATEGORIES = '__all_faq_categories__';

export function FaqCategoryPickerField({
  value,
  websiteId,
  onChange,
}: {
  value: string;
  websiteId: string;
  onChange: (value: string) => void;
}) {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchFaqs(websiteId)
      .then((faqs) => {
        if (cancelled) return;
        const uniqueCategories = new Map<string, string>();
        for (const faq of faqs) {
          const category = faq.category?.trim();
          if (category) uniqueCategories.set(category.toLocaleLowerCase('id'), category);
        }
        setCategories(
          [...uniqueCategories.values()].sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' })),
        );
      })
      .catch(() => {
        if (!cancelled) setError('Kategori FAQ gagal dimuat.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retry, websiteId]);

  const categoriesWithSelected = useMemo(() => {
    if (value && !categories.some((category) => category === value)) {
      return [value, ...categories];
    }
    return categories;
  }, [categories, value]);
  const options = [
    { key: ALL_CATEGORIES, label: 'Semua kategori' },
    ...categoriesWithSelected.map((category) => ({ key: category, label: category })),
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <Select
        aria-label="Kategori FAQ"
        selectedKeys={[value || ALL_CATEGORIES]}
        onSelectionChange={(keys) => {
          const [selected] = Array.from(keys);
          onChange(!selected || selected === ALL_CATEGORIES ? '' : String(selected));
        }}
        isDisabled={loading || Boolean(error)}
        isLoading={loading}
        placeholder="Pilih kategori FAQ"
      >
        {options.map((option) => (
          <SelectItem key={option.key}>{option.label}</SelectItem>
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
      ) : categories.length === 0 && !loading ? (
        <p className="text-[11px] text-default-500">
          Belum ada kategori FAQ. Tambahkan kategori melalui menu FAQ.
        </p>
      ) : null}
    </div>
  );
}
