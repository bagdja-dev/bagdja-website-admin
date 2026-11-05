'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  fetchMySubscriptions,
  fetchSubscriptionPlans,
  RUNNING_SUBSCRIPTION_STATUSES,
} from '@/studio/api/subscription';
import { useIsOwner } from '@/studio/stores/role';

const SUBSCRIPTION_HREF = '/studio/subscription';

/** Kartu "Paket" di kaki sidebar (artboard Sidebar). Paket melekat ke akun owner → hanya owner. */
export function PlanCard({ onNavigate }: { onNavigate?: () => void }) {
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
