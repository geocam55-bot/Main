import { useState, useEffect, useCallback } from 'react';
import {
  getCurrentSubscription,
  type Subscription,
  type PlanId,
} from '../utils/subscription-client';

/**
 * Feature gates mapped to minimum plan tier.
 * 'starter' = all paid plans (Standard User), 'professional' = pro+enterprise, 'enterprise' = enterprise only.
 * Features not listed are available on all plans including free.
 */
const FEATURE_GATES: Record<string, PlanId> = {
  // Standard User+ features
  'email-integration': 'starter',
  'basic-reports': 'starter',

  // Professional+ features
  'marketing-automation': 'professional',
  'inventory-management': 'professional',
  'document-management': 'professional',
  'project-wizards': 'professional',
  'advanced-reports': 'professional',
  'customer-portal': 'professional',

  // Enterprise-only features
  'sso-saml': 'enterprise',
  'audit-log': 'enterprise',
  'api-access': 'enterprise',
  'custom-integrations': 'enterprise',
  'priority-support': 'enterprise',
};

const PLAN_TIERS: Record<PlanId, number> = {
  starter: 1,
  professional: 2,
  enterprise: 3,
};

export interface SubscriptionState {
  subscription: Subscription | null;
  loading: boolean;
  /** Current plan id, or null if on free tier */
  planId: PlanId | null;
  /** Whether the subscription is active (including trialing) */
  isActive: boolean;
  /** Whether the subscription is in trial */
  isTrialing: boolean;
  /** Check if a feature is available on the current plan */
  hasFeature: (feature: string) => boolean;
  /** Check if plan meets minimum tier */
  meetsMinPlan: (minPlan: PlanId) => boolean;
  /** Reload subscription data */
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const sub = await getCurrentSubscription();
      setSubscription(sub);
    } catch (err) {
      // Failed silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isActive =
    !!subscription &&
    (subscription.status === 'active' || subscription.status === 'trialing');

  const isTrialing = subscription?.status === 'trialing';
  const planId = isActive ? subscription!.plan_id : null;

  const meetsMinPlan = useCallback(
    (minPlan: PlanId): boolean => {
      if (!planId) return false;
      return PLAN_TIERS[planId] >= PLAN_TIERS[minPlan];
    },
    [planId],
  );

  const hasFeature = useCallback(
    (feature: string): boolean => {
      const minPlan = FEATURE_GATES[feature];
      if (!minPlan) return true; // Feature not gated → available to all
      return meetsMinPlan(minPlan);
    },
    [meetsMinPlan],
  );

  return {
    subscription,
    loading,
    planId,
    isActive,
    isTrialing,
    hasFeature,
    meetsMinPlan,
    refresh: load,
  };
}