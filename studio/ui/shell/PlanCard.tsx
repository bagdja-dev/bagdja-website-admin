'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  fetchMySubscriptions,
  fetchSubscriptionPlans,
  RUNNING_SUBSCRIPTION_STATUSES,
} from '@/studio/api/subscription';
import { useIsOwner } from '@/studio/stores/role';

import { Icon } from '../icons';

const SUBSCRIPTION_HREF = '/studio/subscription';

/** Kartu "Paket" di kaki sidebar (artboard Sidebar). Paket melekat ke akun owner → hanya owner. */
export function PlanCard({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const isOwner = useIsOwner();
  const [planName, setPlanName] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    Promise.all([fetchMySubscriptions(), fetchSubscriptionPlans()])
      .then(([subs, plans]) => {
        if (cancelled) return;
        const running = (Array.isArray(subs) ? subs : []).find((s) => RUNNING_SUBSCRIPTION_STATUSES.has(s.status));
        const plan = running ? plans.find((p) => p.id === running.planId) : null;
        setPlanName(plan?.name ?? 'Free');
      })
      .catch(() => {
        if (!cancelled) setPlanName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  if (!isOwner) return null;

  if (collapsed) {
    return (
      <div className="w-full border-t border-default-100 px-2 pb-3 pt-2">
        <Link
          href={SUBSCRIPTION_HREF}
          onClick={onNavigate}
          aria-label={`Paket ${planName ?? '—'} · lihat atau upgrade paket`}
          title={`Paket ${planName ?? '—'} · lihat atau upgrade paket`}
          className="flex h-10 items-center justify-center rounded-lg bg-default-100 text-primary no-underline hover:bg-primary-50"
        >
          <Icon name="subscription" size={19} />
        </Link>
      </div>
    );
  }

  return (
    <div className="border-t border-default-100 px-3.5 pb-4 pt-3">
      <div className="flex items-center justify-between gap-2 rounded-xl bg-default-100 px-3 py-2.5">
        <span className="flex flex-col">
          <span className="text-xs text-default-600">Paket</span>
          <span className="text-[13px] font-bold text-foreground">{planName ?? '—'}</span>
        </span>
        <Link href={SUBSCRIPTION_HREF} onClick={onNavigate} className="text-[13px] font-bold text-primary no-underline hover:text-primary-700">
          Upgrade
        </Link>
      </div>
    </div>
  );
}
