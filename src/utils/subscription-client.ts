/**
 * Subscription & Billing client — communicates with the server endpoints.
 * All routes go through the Edge Function (KV-backed).
 */

import { projectId } from './supabase/info';
import { getServerHeaders, getUserAccessToken } from './server-headers';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;

// ── Types ───────────────────────────────────────────────────────────────

export type PlanId = 'starter' | 'professional' | 'enterprise';

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  priceAnnual: number;
  currency: string;
  interval: string;
  features: string[];
}

export interface Subscription {
  id: string;
  organization_id: string;
  user_id: string;
  plan_id: PlanId;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
  billing_interval: 'month' | 'year';
  current_period_start: string;
  current_period_end: string;
  trial_end?: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  amount: number;
  currency: string;
  payment_method_id?: string;
  created_at: string;
  updated_at: string;
}

export interface BillingEvent {
  id: string;
  organization_id: string;
  type: 'payment' | 'refund' | 'credit' | 'plan_change' | 'subscription_created' | 'subscription_canceled' | 'trial_started';
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  description: string;
  plan_id?: PlanId;
  invoice_number?: string;
  support_email?: string;
  created_at: string;
}

export interface BillingHistoryResponse {
  events: BillingEvent[];
  support_email?: string;
  smtp?: {
    host?: string;
    port?: number;
    security?: string;
    authRequired?: boolean;
  };
}

export interface PaymentMethod {
  id: string;
  organization_id: string;
  type: 'card';
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  created_at: string;
}

// ── Plan Configuration (SuperAdmin) ─────────────────────────────────────

export interface PlanConfig {
  name: string;
  description: string;
  price: number;
  priceAnnual: number;
  currency: string;
  features: string[];
  popular: boolean;
  trialEnabled: boolean;
  visible: boolean;
}

export interface BillingPlanConfig {
  plans: Record<string, PlanConfig>;
  trialDays: number;
  currency: string;
  billingTerms: string;
  annualDiscountPercent: number;
  updated_at: string | null;
  updated_by?: string;
}

export async function getPlanConfig(): Promise<BillingPlanConfig> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/plan-config`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch plan configuration');
  }
  const data = await res.json();
  return data.config;
}

export async function savePlanConfig(config: BillingPlanConfig): Promise<BillingPlanConfig> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/plan-config`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save plan configuration');
  }
  const data = await res.json();
  return data.config;
}

// ── API calls ───────────────────────────────────────────────────────────

export async function getPlans(): Promise<Record<string, Plan>> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/plans`, { headers });
  if (!res.ok) throw new Error('Failed to fetch plans');
  const data = await res.json();
  return data.plans;
}

export async function getCurrentSubscription(): Promise<Subscription | null> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/current`, { headers });
  if (!res.ok) throw new Error('Failed to fetch subscription');
  const data = await res.json();
  return data.subscription;
}

export async function createSubscription(
  planId: PlanId,
  billingInterval: 'month' | 'year' = 'month',
  paymentMethod?: Partial<PaymentMethod>,
  trial = false,
  targetUserId?: string,
  targetOrgId?: string,
): Promise<Subscription> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      plan_id: planId,
      billing_interval: billingInterval,
      payment_method: paymentMethod,
      trial,
      target_user_id: targetUserId,
      target_org_id: targetOrgId,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create subscription');
  }
  const data = await res.json();
  return data.subscription;
}

export async function updateSubscription(
  planId?: PlanId,
  billingInterval?: 'month' | 'year',
  targetUserId?: string,
  targetOrgId?: string,
): Promise<Subscription> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/update`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ plan_id: planId, billing_interval: billingInterval, target_user_id: targetUserId, target_org_id: targetOrgId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update subscription');
  }
  const data = await res.json();
  return data.subscription;
}

export async function cancelSubscription(immediate = false): Promise<Subscription> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/cancel`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ immediate }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to cancel subscription');
  }
  const data = await res.json();
  return data.subscription;
}

export async function reactivateSubscription(): Promise<Subscription> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/reactivate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reactivate subscription');
  }
  const data = await res.json();
  return data.subscription;
}

export async function getBillingHistory(): Promise<BillingEvent[]> {
  const data = await getBillingHistorySummary();
  return data.events;
}

export async function getBillingHistorySummary(): Promise<BillingHistoryResponse> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/billing-history`, { headers });
  if (!res.ok) throw new Error('Failed to fetch billing history');
  const data = await res.json();
  return {
    events: data.events || [],
    support_email: data.support_email,
    smtp: data.smtp,
  };
}

export async function sendBillingTestEmail(toEmail: string): Promise<{ sender?: string; message?: string }> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/send-test-email`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      to: toEmail,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send billing test email');
  }

  const data = await res.json().catch(() => ({}));
  return {
    sender: data.sender,
    message: data.message,
  };
}

export async function getPaymentMethod(): Promise<PaymentMethod | null> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/payment-method`, { headers });
  if (!res.ok) throw new Error('Failed to fetch payment method');
  const data = await res.json();
  return data.payment_method;
}

export async function updatePaymentMethod(pm: Partial<PaymentMethod>): Promise<PaymentMethod> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/payment-method`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(pm),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update payment method');
  }
  const data = await res.json();
  return data.payment_method;
}

export async function simulatePayment(): Promise<{ event: BillingEvent; subscription: Subscription }> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/simulate-payment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to simulate payment');
  }
  return res.json();
}

/**
 * Fetch all user subscriptions within the organization (admin only).
 */
export async function getOrgSubscriptions(orgOverride?: string): Promise<(Subscription & { user_email?: string; user_name?: string; user_role?: string })[]> {
  const headers = await getServerHeaders();
  const url = orgOverride
    ? `${BASE_URL}/subscriptions/org-subscriptions?org_override=${encodeURIComponent(orgOverride)}`
    : `${BASE_URL}/subscriptions/org-subscriptions`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch org subscriptions');
  }
  const data = await res.json();
  return data.subscriptions || [];
}

/**
 * Sign up for a free 15-day trial account (public signup).
 * No authentication required.
 */
export async function signupFree(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}): Promise<{ success: boolean; message: string; userId?: string; email?: string }> {
  const res = await fetch(`${BASE_URL}/auth/signup-free`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: data.email.toLowerCase(),
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      organizationName: data.organizationName,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create free trial account');
  }

  const result = await res.json();
  return {
    success: result.success,
    message: result.message || 'Account created successfully! Check your email for the temporary password.',
    userId: result.userId,
    email: result.email,
  };
}

/**
 * Upgrade from trial to a paid plan
 */
export async function upgradeFromTrial(planId: string, paymentMethodId?: string): Promise<{ success: boolean; subscription: Subscription }> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/subscriptions/upgrade-from-trial`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      planId,
      paymentMethodId,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upgrade subscription');
  }

  const data = await res.json();
  return {
    success: data.success,
    subscription: data.subscription,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}