import { studioRequest } from './client';

/** Item `GET /api/subscriptions/plans` (field yang dipakai Studio). */
export interface SubscriptionPlanDto {
  id: string;
  code: string;
  name: string;
  price: number;
}

/** Item `GET /api/subscriptions/my` (field yang dipakai Studio). */
export interface UserSubscriptionDto {
  id: string;
  planId: string;
  status: string;
}

/** Status yang dianggap paket berjalan (sama dengan halaman langganan lama). */
export const RUNNING_SUBSCRIPTION_STATUSES: ReadonlySet<string> = new Set(['ACTIVE', 'PAST_DUE', 'TRIALING']);

export function fetchSubscriptionPlans(): Promise<SubscriptionPlanDto[]> {
  return studioRequest<SubscriptionPlanDto[]>('/api/subscriptions/plans');
}

export function fetchMySubscriptions(): Promise<UserSubscriptionDto[]> {
  return studioRequest<UserSubscriptionDto[]>('/api/subscriptions/my');
}
