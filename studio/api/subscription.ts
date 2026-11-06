import { studioRequest } from './client';
import type { WalletBalanceDto } from './wallet';

/** Item `GET /api/subscriptions/plans` (field yang dipakai Studio). */
export interface SubscriptionPlanDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billingInterval: string;
  intervalCount: number;
  features: Record<string, unknown> | null;
}

/** Item `GET /api/subscriptions/my` (field yang dipakai Studio). */
export interface UserSubscriptionDto {
  id: string;
  planId: string;
  lockedAmount: number;
  currency: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  cancelAtPeriodEnd: boolean;
  nextRetryAt: string | null;
}

export interface SubscriptionBillingAttemptDto {
  id: string;
  attemptNumber: number;
  status: string;
  kind: string;
  amount: number;
  platformFeeAmount: number;
  currency: string;
  failureReason: string | null;
  attemptedAt: string;
}

/** Status yang dianggap paket berjalan (sama dengan halaman langganan lama). */
export const RUNNING_SUBSCRIPTION_STATUSES: ReadonlySet<string> = new Set(['ACTIVE', 'PAST_DUE', 'TRIALING']);

export function fetchSubscriptionPlans(): Promise<SubscriptionPlanDto[]> {
  return studioRequest<SubscriptionPlanDto[]>('/api/subscriptions/plans');
}

export function fetchMySubscriptions(): Promise<UserSubscriptionDto[]> {
  return studioRequest<UserSubscriptionDto[]>('/api/subscriptions/my');
}

export function fetchSubscriptionBillingHistory(subscriptionId: string): Promise<SubscriptionBillingAttemptDto[]> {
  return studioRequest<SubscriptionBillingAttemptDto[]>(
    `/api/subscriptions/${encodeURIComponent(subscriptionId)}/billing-history`,
  );
}

export function subscribeToPlan(planId: string): Promise<UserSubscriptionDto> {
  return studioRequest<UserSubscriptionDto>('/api/subscriptions/subscribe', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  });
}

export function changeSubscriptionPlan(subscriptionId: string, planId: string): Promise<UserSubscriptionDto> {
  return studioRequest<UserSubscriptionDto>(
    `/api/subscriptions/${encodeURIComponent(subscriptionId)}/change-plan`,
    {
      method: 'POST',
      body: JSON.stringify({ planId }),
    },
  );
}

export function cancelSubscriptionAtPeriodEnd(subscriptionId: string): Promise<UserSubscriptionDto> {
  return studioRequest<UserSubscriptionDto>(
    `/api/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify({ cancelAtPeriodEnd: true }),
    },
  );
}

export function resumeSubscription(subscriptionId: string): Promise<UserSubscriptionDto> {
  return studioRequest<UserSubscriptionDto>(
    `/api/subscriptions/${encodeURIComponent(subscriptionId)}/resume`,
    { method: 'POST' },
  );
}

export function fetchSubscriptionWallet(): Promise<WalletBalanceDto> {
  return studioRequest<WalletBalanceDto>('/api/wallet/balance');
}
