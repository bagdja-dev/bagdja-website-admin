'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billingInterval: string;
  intervalCount: number;
  features: Record<string, unknown> | null;
}

const PERIOD_ORDER = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const PERIOD_LABELS: Record<string, string> = {
  DAILY: 'Harian',
  WEEKLY: 'Mingguan',
  MONTHLY: 'Bulanan',
  YEARLY: 'Tahunan',
};

function intervalLabel(interval: string, count: number): string {
  const unit: Record<string, string> = {
    DAILY: 'hari',
    WEEKLY: 'minggu',
    MONTHLY: 'bulan',
    YEARLY: 'tahun',
  };
  const label = unit[interval] ?? interval.toLowerCase();
  return count === 1 ? `/${label}` : `/${count} ${label}`;
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

function featureRows(features: Record<string, unknown> | null): string[] {
  if (!features) return [];
  return Object.entries(features)
    .flatMap(([key, value]) => {
      if (value === false || value === null || value === undefined) return [];
      const label = key
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
      if (value === true) return [label];
      if (typeof value === 'string' || typeof value === 'number') return [`${label}: ${value}`];
      return [];
    })
    .slice(0, 5);
}

function descriptionRows(description: string | null): string[] {
  if (!description) return [];
  const rows = description.split('\n').map((row) => row.trim()).filter(Boolean);
  return rows.length > 1 ? rows : [];
}

function isSubscriptionPlan(value: unknown): value is SubscriptionPlan {
  if (!value || typeof value !== 'object') return false;
  const plan = value as Partial<SubscriptionPlan>;
  return (
    typeof plan.id === 'string' &&
    typeof plan.name === 'string' &&
    typeof plan.price === 'number' &&
    typeof plan.currency === 'string' &&
    typeof plan.billingInterval === 'string' &&
    typeof plan.intervalCount === 'number'
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
    </svg>
  );
}

export function PublicPricingSection() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('MONTHLY');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadPlans() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/public/subscription-plans', {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(`Gagal memuat pilihan paket (HTTP ${response.status}).`);
        }
        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.every(isSubscriptionPlan)) {
          throw new Error('Format data paket langganan tidak sesuai.');
        }
        setPlans(data);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : 'Gagal memuat pilihan paket.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadPlans();
    return () => controller.abort();
  }, []);

  const availablePeriods = useMemo(() => {
    const periods = Array.from(new Set(plans.map((plan) => plan.billingInterval)));
    return periods.sort((left, right) => {
      const leftOrder = PERIOD_ORDER.indexOf(left);
      const rightOrder = PERIOD_ORDER.indexOf(right);
      if (leftOrder === -1) return rightOrder === -1 ? left.localeCompare(right) : 1;
      if (rightOrder === -1) return -1;
      return leftOrder - rightOrder;
    });
  }, [plans]);
  const activePeriod = availablePeriods.includes(selectedPeriod)
    ? selectedPeriod
    : availablePeriods[0] ?? selectedPeriod;
  const visiblePlans = plans.filter((plan) => plan.billingInterval === activePeriod);

  return (
    <section id="pricing" className="scroll-mt-24 bg-[#f4efe9] px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b4b5e]">Harga & paket</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.045em] text-[#33292a] sm:text-5xl">
              Pilih paket yang sesuai untuk bisnismu.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#746963]">
              Harga dan fitur ditampilkan langsung dari paket langganan Bagdja yang tersedia saat ini.
            </p>
          </div>
          {!loading && !error && availablePeriods.length > 1 && (
            <div className="inline-flex w-fit flex-wrap rounded-xl border border-[#e5ddd5] bg-white p-1" role="tablist" aria-label="Periode paket">
              {availablePeriods.map((period) => {
                const selected = activePeriod === period;
                return (
                  <button
                    key={period}
                    id={`public-pricing-period-${period.toLowerCase()}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="public-pricing-plan-list"
                    onClick={() => setSelectedPeriod(period)}
                    className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                      selected
                        ? 'bg-[#7a1e48] text-white shadow-sm'
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                    }`}
                  >
                    {PERIOD_LABELS[period] ?? period}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error ? (
          <div className="mt-8 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
            {error}
          </div>
        ) : loading ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Memuat pilihan paket">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-64 animate-pulse rounded-[18px] border border-zinc-200 bg-white" />
            ))}
          </div>
        ) : availablePeriods.length === 0 ? (
          <div className="mt-8 rounded-[18px] border border-dashed border-[#d9cbc3] bg-white px-6 py-10 text-center">
            <h3 className="text-lg font-bold text-[#352a2b]">Belum ada paket tersedia</h3>
            <p className="mt-2 text-sm text-[#796e68]">Silakan cek kembali nanti untuk melihat pilihan paket.</p>
          </div>
        ) : visiblePlans.length === 0 ? (
          <div className="mt-8 rounded-[18px] border border-dashed border-[#d9cbc3] bg-white px-6 py-10 text-center">
            <h3 className="text-lg font-bold text-[#352a2b]">Belum ada paket untuk periode ini</h3>
            <p className="mt-2 text-sm text-[#796e68]">Pilih periode lainnya untuk melihat paket tersedia.</p>
          </div>
        ) : (
          <div
            id="public-pricing-plan-list"
            role={availablePeriods.length > 1 ? 'tabpanel' : undefined}
            aria-labelledby={availablePeriods.length > 1 ? `public-pricing-period-${activePeriod.toLowerCase()}` : undefined}
            className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          >
            {visiblePlans.map((plan) => {
              const planFeatures = featureRows(plan.features);
              const features = planFeatures.length > 0 ? planFeatures : descriptionRows(plan.description);
              const description = features.length > 0 && planFeatures.length === 0 ? null : plan.description;
              return (
                <article key={plan.id} className="flex h-full flex-col gap-4 rounded-[18px] border border-[#e5e2dc] bg-white p-5 shadow-sm">
                  <div>
                    <h3 className="text-lg font-extrabold text-[#18181b]">{plan.name}</h3>
                    {description && <p className="mt-1 text-sm leading-relaxed text-zinc-600">{description}</p>}
                  </div>
                  <p className="text-xl font-extrabold text-[#18181b]">
                    {formatPrice(plan.price, plan.currency)}
                    <span className="ml-1 text-xs font-medium text-zinc-500">{intervalLabel(plan.billingInterval, plan.intervalCount)}</span>
                  </p>
                  {features.length > 0 && (
                    <ul className="flex-1 space-y-2 border-t border-zinc-100 pt-3">
                      {features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-zinc-700">
                          <CheckIcon />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    href="/auth/login"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#7a1e48] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#641838] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7a1e48] focus-visible:ring-offset-2"
                  >
                    Pilih paket
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
