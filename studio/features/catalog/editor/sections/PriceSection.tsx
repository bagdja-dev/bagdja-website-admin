'use client';

import Link from 'next/link';

import { StatusSwitch } from '@/studio/ui/primitives/StatusSwitch';

import { FEATURES_PATH } from '../../catalog-types';
import { moneyValue } from '../../money';
import { formatPriceRange } from '../../product-utils';
import type { SectionProps } from '../editor-context';
import { MoneyField, Notice } from '../fields';

/** Harga diatur per varian bila item punya varian. */
export function priceByVariant(form: SectionProps['form']): boolean {
  return form.hasVariants && form.variants.length > 0;
}

/** Bagian "Harga": price, quotable (hanya bila modul Penawaran aktif). */
export function PriceSection({ form, set, errors, hasModule, moduleLabel }: SectionProps) {
  const isEvent = form.type === 'gathering';
  const showQuote = form.type !== 'digital' && !isEvent;
  const quotesOn = hasModule('quotes');

  return (
    <>
      {priceByVariant(form) ? (
        <Notice>
          Harga diatur per varian di bagian <a href="#variants" className="font-bold">Varian</a>. Di website tampil sebagai{' '}
          <strong>{formatPriceRange(form.variants.map((v) => moneyValue(v.price) ?? 0))}</strong>.
        </Notice>
      ) : (
        <MoneyField
          label={isEvent ? 'Harga per peserta' : 'Harga'}
          value={form.price}
          onChange={(price) => set({ price })}
          error={errors.price}
          hint={isEvent ? 'Berlaku sama untuk semua pilihan acara.' : undefined}
        />
      )}
      {showQuote && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-default-200 px-3.5 py-3">
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-bold">Harga lewat penawaran</span>
            <span className="text-[13px] text-default-600">
              Pelanggan minta penawaran dulu sebelum bayar.
              {!quotesOn && (
                <>
                  {' '}Butuh fitur {moduleLabel('quotes')} — <Link href={FEATURES_PATH}>aktifkan</Link>.
                </>
              )}
            </span>
          </span>
          <StatusSwitch
            isSelected={form.quotable}
            onChange={(quotable) => set({ quotable })}
            ariaLabel="Harga lewat penawaran"
            isDisabled={!quotesOn && !form.quotable}
          />
        </div>
      )}
    </>
  );
}
