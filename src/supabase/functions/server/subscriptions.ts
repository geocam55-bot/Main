import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { extractUserToken } from './auth-helper.ts';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

/**
 * Subscription & Billing routes (KV-backed).
 *
 * Key patterns:
 *   subscription:{orgId}:{userId}     — per-user subscription record
 *   billing_event:{orgId}:{eventId}   — individual billing/payment events
 *   payment_method:{orgId}            — stored payment method (demo/tokenised)
 *
 * Subscriptions are attached to individual users, allowing different plan
 * levels within the same organization.
 */

const PREFIX = '/make-server-8405be07';

const DEFAULT_FREE_ACCOUNT_BILLING_SUPPORT_EMAIL = 'support@prospacescrm.ca';

function getScopedEmailConfig() {
  const supportEmail = (Deno.env.get('SUPPORT_EMAIL_ADDRESS') || DEFAULT_FREE_ACCOUNT_BILLING_SUPPORT_EMAIL).trim();
  const smtpHost = (Deno.env.get('SYSTEM_SMTP_HOST') || 'smtp.ionos.com').trim();
  const smtpPort = Number(Deno.env.get('SYSTEM_SMTP_PORT') || '587');
  const smtpSecurity = (Deno.env.get('SYSTEM_SMTP_SECURITY') || 'tls').trim().toLowerCase();
  return {
    supportEmail,
    smtp: {
      host: smtpHost,
      port: Number.isFinite(smtpPort) ? smtpPort : 587,
      security: smtpSecurity,
      authRequired: true,
    },
  };
}

async function sendSystemSmtpEmail(params: {
  to: string | string[];
  subject: string;
  htmlBody: string;
  textBody?: string;
}): Promise<{ sender: string }> {
  const smtpHost = (Deno.env.get('SYSTEM_SMTP_HOST') || 'smtp.ionos.com').trim();
  const smtpPort = Number(Deno.env.get('SYSTEM_SMTP_PORT') || '587');
  const smtpUsername = (Deno.env.get('SYSTEM_SMTP_USERNAME') || '').trim();
  const smtpPassword = Deno.env.get('SYSTEM_SMTP_PASSWORD') || '';
  const sender = (Deno.env.get('SUPPORT_EMAIL_ADDRESS') || DEFAULT_FREE_ACCOUNT_BILLING_SUPPORT_EMAIL).trim();

  if (!smtpUsername || !smtpPassword) {
    throw new Error('System SMTP credentials are not configured');
  }

  const recipients = Array.isArray(params.to) ? params.to : [params.to];
  const fallbackText = params.htmlBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const client = new SMTPClient({
    connection: {
      hostname: smtpHost,
      port: Number.isFinite(smtpPort) ? smtpPort : 587,
      tls: smtpPort === 465,
      auth: {
        username: smtpUsername,
        password: smtpPassword,
      },
    },
  });

  try {
    await client.send({
      from: sender,
      to: recipients,
      subject: params.subject,
      content: params.textBody || fallbackText,
      html: params.htmlBody,
    });
  } finally {
    await client.close();
  }

  return { sender };
}

// ── Plan definitions (demonstration pricing) ────────────────────────────
export const PLANS = {
  starter: {
    id: 'starter',
    name: 'Standard User',
    price: 29,
    priceAnnual: 290, // ~17% savings
    currency: 'USD',
    interval: 'month',
    features: [
      'Core CRM (Contacts, Deals, Tasks)',
      'Email integration',
      'Basic reports',
      'Community support',
    ],
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 79,
    priceAnnual: 790,
    currency: 'USD',
    interval: 'month',
    features: [
      'Everything in Standard User',
      'Marketing automation',
      'Inventory management',
      'Document management',
      'Project Wizards (3D planners)',
      'Advanced reports & analytics',
      'Customer portal',
      'Email support',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    priceAnnual: 1990,
    currency: 'USD',
    interval: 'month',
    features: [
      'Everything in Professional',
      'Dedicated account manager',
      'Custom integrations',
      'SSO / SAML support',
      'Audit log',
      'Priority support (24/7)',
      'API access',
      'Custom onboarding',
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

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

// ── Helper: authenticate and resolve org ────────────────────────────────
async function authenticateAndGetOrg(c: any): Promise<{
  userId: string;
  orgId: string;
  role: string;
} | null> {
  const accessToken = extractUserToken(c);
  if (!accessToken) return null;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  const orgId = profile?.organization_id || user.user_metadata?.organizationId;
  if (!orgId) return null;

  return { userId: user.id, orgId, role: profile?.role || 'standard_user' };
}

// ── Helper: generate invoice number ─────────────────────────────────────
function generateInvoiceNumber(): string {
  const prefix = 'PS';
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${y}${m}-${seq}`;
}

// ── Helper: resolve price from plan (checks admin config) ───────────────
async function resolvePlanPrice(planId: PlanId, interval: 'month' | 'year'): Promise<number> {
  const defaultPlan = PLANS[planId];
  try {
    const customConfig: any = await kv.get('billing_plan_config:global');
    if (customConfig?.plans?.[planId]) {
      const custom = customConfig.plans[planId];
      return interval === 'year'
        ? (custom.priceAnnual ?? defaultPlan.priceAnnual)
        : (custom.price ?? defaultPlan.price);
    }
  } catch { /* ignore */ }
  return interval === 'year' ? defaultPlan.priceAnnual : defaultPlan.price;
}

// ── Helper: resolve target user for subscription operations ─────────────
// Admins can optionally specify a target_user_id; otherwise defaults to self.
function resolveTargetUser(auth: { userId: string; role: string }, body: any): string {
  if (body?.target_user_id && ['admin', 'super_admin'].includes(auth.role)) {
    return body.target_user_id;
  }
  return auth.userId;
}

// ── Helper: resolve target org for subscription operations ──────────────
// Super admins can optionally specify a target_org_id to store subscriptions under
// a different organization (e.g. when managing users across orgs).
function resolveTargetOrg(auth: { orgId: string; role: string }, body: any): string {
  if (body?.target_org_id && auth.role === 'super_admin') {
    return body.target_org_id;
  }
  return auth.orgId;
}

// ── Register routes ─────────────────────────────────────────────────────
export function subscriptions(app: Hono) {

  // POST /auth/signup-free — public signup for free 15-day trial
  app.post(`${PREFIX}/auth/signup-free`, async (c) => {
    try {
      const body = await c.req.json();
      const { email, password, firstName, lastName, organizationName } = body;

      // Validation
      if (!email || !password || !firstName || !lastName || !organizationName) {
        return c.json({ error: 'Missing required fields' }, 400);
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      // Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true, // Auto-confirm email for trial
        user_metadata: {
          name: `${firstName} ${lastName}`,
          role: 'user',
        },
      });

      if (authError || !authData.user) {
        console.error('[auth/signup-free] Auth error:', authError);
        return c.json({ error: authError?.message || 'Failed to create auth user' }, 400);
      }

      const userId = authData.user.id;
      const userEmail = authData.user.email!;

      // Create organization  
      const orgId = crypto.randomUUID();
      const now = new Date().toISOString();

      await supabase.from('organizations').insert([
        {
          id: orgId,
          name: organizationName,
          industry: null,
          created_at: now,
          updated_at: now,
          type: 'business',
          status: 'active',
        },
      ]);

      // Create profile
      await supabase.from('profiles').insert([
        {
          id: userId,
          email: userEmail,
          name: `${firstName} ${lastName}`,
          role: 'admin', // First user in org is admin
          organization_id: orgId,
          status: 'active',
          needs_password_change: true,
          temp_password: password, // Store for verification if needed
          temp_password_created_at: now,
          created_at: now,
          updated_at: now,
        },
      ]);

      // Create 15-day trial subscription
      const subId = crypto.randomUUID();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 15);
      const trialEnd = trialEndDate.toISOString();

      const { supportEmail } = getScopedEmailConfig();
      const starterPlanPrice = await resolvePlanPrice('starter', 'month');

      const subscription: any = {
        id: subId,
        organization_id: orgId,
        user_id: userId,
        plan_id: 'starter',
        status: 'trialing',
        billing_interval: 'month',
        current_period_start: now,
        current_period_end: trialEnd,
        trial_end: trialEnd,
        cancel_at_period_end: false,
        amount: 0, // Free trial
        currency: 'USD',
        created_at: now,
        updated_at: now,
        support_email: supportEmail,
      };

      await kv.set(`subscription:${orgId}:${userId}`, subscription);

      // Create billing event for trial start
      const eventId = crypto.randomUUID();
      const event: any = {
        id: eventId,
        organization_id: orgId,
        user_id: userId,
        subscription_id: subId,
        type: 'trial_started',
        description: `Free 15-day trial started for ${organizationName}`,
        amount: 0,
        currency: 'USD',
        status: 'completed',
        invoice_number: null,
        created_at: now,
        support_email: supportEmail,
      };

      await kv.set(`billing_event:${orgId}:${eventId}`, event);

      // Send temporary password email via system SMTP
      try {
        await sendSystemSmtpEmail({
          to: userEmail,
          subject: 'Welcome to ProSpaces - Your Temporary Password',
          htmlBody: `
            <h1>Welcome to ProSpaces CRM, ${firstName}!</h1>
            <p>Your free 15-day trial account has been created.</p>
            <p><strong>Temporary Password:</strong> ${password}</p>
            <p><strong>Sign in here:</strong> <a href="${Deno.env.get('VITE_APP_URL') || 'https://app.prospacescrm.ca'}/member-login">ProSpaces Login</a></p>
            <p>On your first login, you'll be asked to set a permanent password.</p>
            <p>Your trial expires on ${trialEndDate.toLocaleDateString()}. After that, you'll need to select a plan to continue.</p>
            <br/>
            <p style="color: #666; font-size: 12px;">Questions? Contact support@prospacescrm.ca</p>
          `,
        });
      } catch (emailErr: any) {
        console.error('[auth/signup-free] Email error:', emailErr);
        // Don't fail signup if email fails
      }

      return c.json({
        success: true,
        message: 'Free trial account created successfully! Check your email for temporary password.',
        userId,
        email: userEmail,
      });
    } catch (error: any) {
      console.error('[auth/signup-free] Error:', error);
      return c.json({ error: error.message || 'Failed to create free trial account' }, 500);
    }
  });

  // GET /subscriptions/plans — public, no auth required
  app.get(`${PREFIX}/subscriptions/plans`, async (c) => {
    try {
      // Check for custom plan config in KV
      const customConfig: any = await kv.get('billing_plan_config:global');
      if (customConfig?.plans) {
        // Merge custom config over defaults
        const mergedPlans: Record<string, any> = {};
        for (const [key, defaultPlan] of Object.entries(PLANS)) {
          const custom = customConfig.plans[key];
          if (custom) {
            mergedPlans[key] = { ...defaultPlan, ...custom, id: key };
          } else {
            mergedPlans[key] = { ...defaultPlan };
          }
        }
        return c.json({ plans: mergedPlans });
      }
      return c.json({ plans: PLANS });
    } catch (error: any) {
      console.error('[subscriptions] Error fetching plans:', error);
      return c.json({ plans: PLANS });
    }
  });

  // GET /subscriptions/current — get the authenticated user's subscription
  app.get(`${PREFIX}/subscriptions/current`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      // Allow super_admin to query any user's subscription
      let targetOrgId = auth.orgId;
      let targetUserId = auth.userId;
      const orgOverride = c.req.query('org_override');
      const userOverride = c.req.query('user_override');
      if (orgOverride && auth.role === 'super_admin') {
        targetOrgId = orgOverride;
      }
      if (userOverride && ['admin', 'super_admin'].includes(auth.role)) {
        targetUserId = userOverride;
      }

      const sub: Subscription | null = await kv.get(`subscription:${targetOrgId}:${targetUserId}`);

      // If subscription exists, check if it's expired
      if (sub && sub.status === 'active' && new Date(sub.current_period_end) < new Date()) {
        sub.status = 'expired';
        await kv.set(`subscription:${targetOrgId}:${targetUserId}`, sub);
      }

      return c.json({ subscription: sub || null });
    } catch (error: any) {
      console.error('[subscriptions] Error fetching subscription:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /subscriptions/create — create a new subscription (demo: instant activation)
  app.post(`${PREFIX}/subscriptions/create`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      // Only admins can manage subscriptions (for self or others)
      if (!['admin', 'super_admin'].includes(auth.role)) {
        return c.json({ error: 'Only admins can manage subscriptions' }, 403);
      }

      const body = await c.req.json();
      const { plan_id, billing_interval = 'month', payment_method, trial } = body;
      const targetUserId = resolveTargetUser(auth, body);
      const targetOrgId = resolveTargetOrg(auth, body);

      if (!plan_id || !PLANS[plan_id as PlanId]) {
        return c.json({ error: 'Invalid plan_id' }, 400);
      }

      const plan = PLANS[plan_id as PlanId];
      const now = new Date();
      const periodStart = now.toISOString();
      let periodEnd: string;
      let status: Subscription['status'] = 'active';
      let trialEnd: string | undefined;

      if (trial) {
        // 14-day free trial
        const trialEndDate = new Date(now);
        trialEndDate.setDate(trialEndDate.getDate() + 14);
        trialEnd = trialEndDate.toISOString();
        periodEnd = trialEnd;
        status = 'trialing';
      } else if (billing_interval === 'year') {
        const end = new Date(now);
        end.setFullYear(end.getFullYear() + 1);
        periodEnd = end.toISOString();
      } else {
        const end = new Date(now);
        end.setMonth(end.getMonth() + 1);
        periodEnd = end.toISOString();
      }

      const amount = await resolvePlanPrice(plan_id as PlanId, billing_interval);
      const { supportEmail } = getScopedEmailConfig();

      const subId = crypto.randomUUID();
      const subscription: Subscription = {
        id: subId,
        organization_id: targetOrgId,
        user_id: targetUserId,
        plan_id: plan_id as PlanId,
        status,
        billing_interval,
        current_period_start: periodStart,
        current_period_end: periodEnd!,
        trial_end: trialEnd,
        cancel_at_period_end: false,
        amount,
        currency: plan.currency,
        created_at: periodStart,
        updated_at: periodStart,
      };

      // Store payment method if provided
      if (payment_method) {
        const pmId = crypto.randomUUID();
        const pm: PaymentMethod = {
          id: pmId,
          organization_id: targetOrgId,
          type: 'card',
          brand: payment_method.brand || 'Visa',
          last4: payment_method.last4 || '4242',
          exp_month: payment_method.exp_month || 12,
          exp_year: payment_method.exp_year || 2028,
          is_default: true,
          created_at: periodStart,
        };
        await kv.set(`payment_method:${targetOrgId}`, pm);
        subscription.payment_method_id = pmId;
      }

      await kv.set(`subscription:${targetOrgId}:${targetUserId}`, subscription);

      // Create billing event
      const eventId = crypto.randomUUID();
      const event: BillingEvent = {
        id: eventId,
        organization_id: targetOrgId,
        type: trial ? 'trial_started' : 'subscription_created',
        amount: trial ? 0 : amount,
        currency: plan.currency,
        status: 'succeeded',
        description: trial
          ? `Started 14-day free trial of ${plan.name} plan for user ${targetUserId}`
          : `Subscribed user ${targetUserId} to ${plan.name} plan (${billing_interval}ly)`,
        plan_id: plan_id as PlanId,
        invoice_number: trial ? undefined : generateInvoiceNumber(),
        support_email: supportEmail,
        created_at: periodStart,
      };
      await kv.set(`billing_event:${targetOrgId}:${eventId}`, event);

      // If not a trial, simulate payment event
      if (!trial) {
        const paymentId = crypto.randomUUID();
        const paymentEvent: BillingEvent = {
          id: paymentId,
          organization_id: targetOrgId,
          type: 'payment',
          amount,
          currency: plan.currency,
          status: 'succeeded',
          description: `Payment for ${plan.name} plan — ${billing_interval === 'year' ? 'annual' : 'monthly'} billing (user ${targetUserId})`,
          plan_id: plan_id as PlanId,
          invoice_number: generateInvoiceNumber(),
          support_email: supportEmail,
          created_at: periodStart,
        };
        await kv.set(`billing_event:${targetOrgId}:${paymentId}`, paymentEvent);
      }

      console.log(`[subscriptions] Created ${status} subscription for user ${targetUserId} in org ${targetOrgId}: ${plan_id} (${billing_interval})`);

      return c.json({ subscription });
    } catch (error: any) {
      console.error('[subscriptions] Error creating subscription:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // PUT /subscriptions/update — change plan (upgrade/downgrade) for a user
  app.put(`${PREFIX}/subscriptions/update`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      if (!['admin', 'super_admin'].includes(auth.role)) {
        return c.json({ error: 'Only admins can manage subscriptions' }, 403);
      }

      const body = await c.req.json();
      const { plan_id, billing_interval } = body;
      const targetUserId = resolveTargetUser(auth, body);
      const targetOrgId = resolveTargetOrg(auth, body);

      const existing: Subscription | null = await kv.get(`subscription:${targetOrgId}:${targetUserId}`);
      if (!existing) {
        return c.json({ error: 'No active subscription found for this user' }, 404);
      }

      if (plan_id && !PLANS[plan_id as PlanId]) {
        return c.json({ error: 'Invalid plan_id' }, 400);
      }

      const now = new Date().toISOString();
      const newPlanId = (plan_id || existing.plan_id) as PlanId;
      const newInterval = billing_interval || existing.billing_interval;
      const plan = PLANS[newPlanId];
      const oldPlan = PLANS[existing.plan_id];

      // Recalculate period end if interval changed
      let periodEnd = existing.current_period_end;
      if (billing_interval && billing_interval !== existing.billing_interval) {
        const end = new Date();
        if (billing_interval === 'year') {
          end.setFullYear(end.getFullYear() + 1);
        } else {
          end.setMonth(end.getMonth() + 1);
        }
        periodEnd = end.toISOString();
      }

      const amount = await resolvePlanPrice(newPlanId, newInterval);
      const { supportEmail } = getScopedEmailConfig();

      const updated: Subscription = {
        ...existing,
        plan_id: newPlanId,
        billing_interval: newInterval,
        amount,
        current_period_end: periodEnd,
        status: 'active',
        cancel_at_period_end: false,
        canceled_at: undefined,
        updated_at: now,
      };

      await kv.set(`subscription:${targetOrgId}:${targetUserId}`, updated);

      // Log the plan change
      const eventId = crypto.randomUUID();
      const isUpgrade = plan.price > oldPlan.price;
      const event: BillingEvent = {
        id: eventId,
        organization_id: targetOrgId,
        type: 'plan_change',
        amount,
        currency: plan.currency,
        status: 'succeeded',
        description: `${isUpgrade ? 'Upgraded' : 'Changed'} user ${targetUserId} from ${oldPlan.name} to ${plan.name} plan`,
        plan_id: newPlanId,
        invoice_number: generateInvoiceNumber(),
        support_email: supportEmail,
        created_at: now,
      };
      await kv.set(`billing_event:${targetOrgId}:${eventId}`, event);

      // Simulate prorated payment for upgrades
      if (isUpgrade) {
        const newAmount = newInterval === 'year' ? plan.priceAnnual : plan.price;
        const proratedAmount = Math.round((newAmount - (existing.amount || 0)) * 0.5 * 100) / 100;
        if (proratedAmount > 0) {
          const paymentId = crypto.randomUUID();
          const paymentEvent: BillingEvent = {
            id: paymentId,
            organization_id: targetOrgId,
            type: 'payment',
            amount: proratedAmount,
            currency: plan.currency,
            status: 'succeeded',
            description: `Prorated charge for upgrade to ${plan.name} (user ${targetUserId})`,
            plan_id: newPlanId,
            invoice_number: generateInvoiceNumber(),
            support_email: supportEmail,
            created_at: now,
          };
          await kv.set(`billing_event:${targetOrgId}:${paymentId}`, paymentEvent);
        }
      }

      console.log(`[subscriptions] Plan changed for user ${targetUserId} in org ${targetOrgId}: ${existing.plan_id} → ${newPlanId}`);

      return c.json({ subscription: updated });
    } catch (error: any) {
      console.error('[subscriptions] Error updating subscription:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /subscriptions/cancel — cancel a user's subscription at end of period
  app.post(`${PREFIX}/subscriptions/cancel`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      if (!['admin', 'super_admin'].includes(auth.role)) {
        return c.json({ error: 'Only admins can manage subscriptions' }, 403);
      }

      const body = await c.req.json().catch(() => ({}));
      const targetUserId = resolveTargetUser(auth, body);
      const existing: Subscription | null = await kv.get(`subscription:${auth.orgId}:${targetUserId}`);
      if (!existing) {
        return c.json({ error: 'No active subscription found for this user' }, 404);
      }

      const immediate = body.immediate === true;
      const now = new Date().toISOString();

      const updated: Subscription = {
        ...existing,
        status: immediate ? 'canceled' : existing.status,
        cancel_at_period_end: !immediate,
        canceled_at: now,
        updated_at: now,
      };

      await kv.set(`subscription:${auth.orgId}:${targetUserId}`, updated);

      const plan = PLANS[existing.plan_id];
      const { supportEmail } = getScopedEmailConfig();
      const eventId = crypto.randomUUID();
      const event: BillingEvent = {
        id: eventId,
        organization_id: auth.orgId,
        type: 'subscription_canceled',
        amount: 0,
        currency: plan.currency,
        status: 'succeeded',
        description: immediate
          ? `${plan.name} plan canceled immediately`
          : `${plan.name} plan set to cancel at end of billing period`,
        plan_id: existing.plan_id,
        support_email: supportEmail,
        created_at: now,
      };
      await kv.set(`billing_event:${auth.orgId}:${eventId}`, event);

      console.log(`[subscriptions] Subscription canceled for org ${auth.orgId} (immediate=${immediate})`);
      return c.json({ subscription: updated });
    } catch (error: any) {
      console.error('[subscriptions] Error canceling subscription:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /subscriptions/reactivate — reactivate a canceled user subscription
  app.post(`${PREFIX}/subscriptions/reactivate`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      if (!['admin', 'super_admin'].includes(auth.role)) {
        return c.json({ error: 'Only admins can manage subscriptions' }, 403);
      }

      const body = await c.req.json().catch(() => ({}));
      const targetUserId = resolveTargetUser(auth, body);
      const existing: Subscription | null = await kv.get(`subscription:${auth.orgId}:${targetUserId}`);
      if (!existing) {
        return c.json({ error: 'No subscription found for this user' }, 404);
      }

      const now = new Date().toISOString();
      const updated: Subscription = {
        ...existing,
        status: 'active',
        cancel_at_period_end: false,
        canceled_at: undefined,
        updated_at: now,
      };

      // If expired, reset period
      if (new Date(existing.current_period_end) < new Date()) {
        updated.current_period_start = now;
        const end = new Date();
        if (existing.billing_interval === 'year') {
          end.setFullYear(end.getFullYear() + 1);
        } else {
          end.setMonth(end.getMonth() + 1);
        }
        updated.current_period_end = end.toISOString();

        // Simulate renewal payment
        const plan = PLANS[existing.plan_id];
        const { supportEmail } = getScopedEmailConfig();
        const paymentId = crypto.randomUUID();
        const paymentEvent: BillingEvent = {
          id: paymentId,
          organization_id: auth.orgId,
          type: 'payment',
          amount: existing.amount,
          currency: plan.currency,
          status: 'succeeded',
          description: `Renewal payment for ${plan.name} plan`,
          plan_id: existing.plan_id,
          invoice_number: generateInvoiceNumber(),
          support_email: supportEmail,
          created_at: now,
        };
        await kv.set(`billing_event:${auth.orgId}:${paymentId}`, paymentEvent);
      }

      await kv.set(`subscription:${auth.orgId}:${targetUserId}`, updated);

      console.log(`[subscriptions] Subscription reactivated for user ${targetUserId} in org ${auth.orgId}`);
      return c.json({ subscription: updated });
    } catch (error: any) {
      console.error('[subscriptions] Error reactivating subscription:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /subscriptions/billing-history — list billing events
  app.get(`${PREFIX}/subscriptions/billing-history`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const events: BillingEvent[] = await kv.getByPrefix(`billing_event:${auth.orgId}:`);
      // Sort newest first
      events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const scopedEmailConfig = getScopedEmailConfig();
      return c.json({
        events,
        support_email: scopedEmailConfig.supportEmail,
        smtp: scopedEmailConfig.smtp,
      });
    } catch (error: any) {
      console.error('[subscriptions] Error fetching billing history:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /subscriptions/send-test-email — send a billing SMTP test email
  app.post(`${PREFIX}/subscriptions/send-test-email`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json().catch(() => ({}));
      const to = (body?.to || '').toString().trim();
      if (!to) return c.json({ error: 'Missing required field: to' }, 400);

      const subject = 'ProSpaces Billing SMTP Test';
      const htmlBody = '<p>This is a billing SMTP test email from ProSpaces CRM.</p><p>If you received this, the scoped billing sender configuration is working.</p>';
      const textBody = 'This is a billing SMTP test email from ProSpaces CRM. If you received this, the scoped billing sender configuration is working.';

      const { sender } = await sendSystemSmtpEmail({
        to,
        subject,
        htmlBody,
        textBody,
      });

      return c.json({
        success: true,
        sender,
        message: 'System email sent successfully',
      });
    } catch (error: any) {
      console.error('[subscriptions] Error sending billing test email:', error);
      return c.json({ error: error.message || 'Failed to send billing test email' }, 500);
    }
  });

  // GET /subscriptions/payment-method — get stored payment method
  app.get(`${PREFIX}/subscriptions/payment-method`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const pm: PaymentMethod | null = await kv.get(`payment_method:${auth.orgId}`);
      return c.json({ payment_method: pm || null });
    } catch (error: any) {
      console.error('[subscriptions] Error fetching payment method:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // PUT /subscriptions/payment-method — update payment method
  app.put(`${PREFIX}/subscriptions/payment-method`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      if (!['admin', 'super_admin'].includes(auth.role)) {
        return c.json({ error: 'Only admins can manage billing' }, 403);
      }

      const body = await c.req.json();
      const now = new Date().toISOString();
      const pmId = crypto.randomUUID();

      const pm: PaymentMethod = {
        id: pmId,
        organization_id: auth.orgId,
        type: 'card',
        brand: body.brand || 'Visa',
        last4: body.last4 || '4242',
        exp_month: body.exp_month || 12,
        exp_year: body.exp_year || 2028,
        is_default: true,
        created_at: now,
      };

      await kv.set(`payment_method:${auth.orgId}`, pm);

      // Update the user's subscription with new payment method
      const sub: Subscription | null = await kv.get(`subscription:${auth.orgId}:${auth.userId}`);
      if (sub) {
        sub.payment_method_id = pmId;
        sub.updated_at = now;
        await kv.set(`subscription:${auth.orgId}:${auth.userId}`, sub);
      }

      console.log(`[subscriptions] Payment method updated for org ${auth.orgId}`);
      return c.json({ payment_method: pm });
    } catch (error: any) {
      console.error('[subscriptions] Error updating payment method:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /subscriptions/simulate-payment — demo: simulate a recurring payment
  app.post(`${PREFIX}/subscriptions/simulate-payment`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const sub: Subscription | null = await kv.get(`subscription:${auth.orgId}:${auth.userId}`);
      if (!sub) return c.json({ error: 'No active subscription' }, 404);

      const plan = PLANS[sub.plan_id];
      const now = new Date();
      const { supportEmail } = getScopedEmailConfig();

      // Simulate payment
      const paymentId = crypto.randomUUID();
      const event: BillingEvent = {
        id: paymentId,
        organization_id: auth.orgId,
        type: 'payment',
        amount: sub.amount,
        currency: sub.currency,
        status: 'succeeded',
        description: `Recurring payment for ${plan.name} plan`,
        plan_id: sub.plan_id,
        invoice_number: generateInvoiceNumber(),
        support_email: supportEmail,
        created_at: now.toISOString(),
      };
      await kv.set(`billing_event:${auth.orgId}:${paymentId}`, event);

      // Advance the billing period
      const newStart = now.toISOString();
      const newEnd = new Date(now);
      if (sub.billing_interval === 'year') {
        newEnd.setFullYear(newEnd.getFullYear() + 1);
      } else {
        newEnd.setMonth(newEnd.getMonth() + 1);
      }

      sub.current_period_start = newStart;
      sub.current_period_end = newEnd.toISOString();
      sub.updated_at = newStart;
      await kv.set(`subscription:${auth.orgId}:${auth.userId}`, sub);

      console.log(`[subscriptions] Simulated payment for user ${auth.userId} in org ${auth.orgId}: $${sub.amount}`);
      return c.json({ event, subscription: sub });
    } catch (error: any) {
      console.error('[subscriptions] Error simulating payment:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /subscriptions/plan-config — get custom plan configuration (super_admin only)
  app.get(`${PREFIX}/subscriptions/plan-config`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      if (auth.role !== 'super_admin') {
        return c.json({ error: 'Only super admins can manage plan configuration' }, 403);
      }

      const config: any = await kv.get('billing_plan_config:global');
      // Return stored config, or defaults derived from PLANS
      if (config) {
        return c.json({ config });
      }

      // Build default config from hardcoded PLANS
      const defaultConfig = {
        plans: Object.fromEntries(
          Object.entries(PLANS).map(([key, plan]) => [
            key,
            {
              name: plan.name,
              description: '',
              price: plan.price,
              priceAnnual: plan.priceAnnual,
              currency: plan.currency,
              features: [...plan.features],
              popular: key === 'professional',
              trialEnabled: true,
              visible: true,
            },
          ]),
        ),
        trialDays: 14,
        currency: 'USD',
        billingTerms: 'Payment due upon subscription activation. All prices in USD.',
        annualDiscountPercent: 17,
        updated_at: null,
      };

      return c.json({ config: defaultConfig });
    } catch (error: any) {
      console.error('[subscriptions] Error fetching plan config:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // PUT /subscriptions/plan-config — update custom plan configuration (super_admin only)
  app.put(`${PREFIX}/subscriptions/plan-config`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      if (auth.role !== 'super_admin') {
        return c.json({ error: 'Only super admins can manage plan configuration' }, 403);
      }

      const body = await c.req.json();
      const now = new Date().toISOString();

      const config = {
        ...body,
        updated_at: now,
        updated_by: auth.userId,
      };

      await kv.set('billing_plan_config:global', config);

      console.log(`[subscriptions] Plan config updated by super_admin ${auth.userId}`);
      return c.json({ config, success: true });
    } catch (error: any) {
      console.error('[subscriptions] Error updating plan config:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /subscriptions/org-subscriptions — list all user subscriptions in the org (admin only)
  app.get(`${PREFIX}/subscriptions/org-subscriptions`, async (c) => {
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      if (!['admin', 'super_admin'].includes(auth.role)) {
        return c.json({ error: 'Only admins can view organization subscriptions' }, 403);
      }

      let targetOrgId = auth.orgId;
      const orgOverride = c.req.query('org_override');
      if (orgOverride && auth.role === 'super_admin') {
        targetOrgId = orgOverride;
      }

      // Fetch all subscriptions with the org prefix
      const allSubs: Subscription[] = await kv.getByPrefix(`subscription:${targetOrgId}:`);

      // Enrich with user profile info
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const userIds = allSubs.map(s => s.user_id).filter(Boolean);
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, email, name, role, status')
          .in('id', userIds);
        profiles = data || [];
      }

      const profileMap = new Map(profiles.map(p => [p.id, p]));
      const enriched = allSubs.map(sub => ({
        ...sub,
        user_email: profileMap.get(sub.user_id)?.email || null,
        user_name: profileMap.get(sub.user_id)?.name || null,
        user_role: profileMap.get(sub.user_id)?.role || null,
      }));

      return c.json({ subscriptions: enriched });
    } catch (error: any) {
      console.error('[subscriptions] Error listing org subscriptions:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // POST /subscriptions/fix-mismatch — finds the correct org with Enterprise plan and moves user there
  app.post(`${PREFIX}/subscriptions/fix-mismatch`, async (c) => {
    try {
      const accessToken = extractUserToken(c);
      if (!accessToken) return c.json({ error: 'Unauthorized' }, 401);

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { data: { user }, error } = await supabase.auth.getUser(accessToken);
      if (error || !user) return c.json({ error: 'Unauthorized' }, 401);

      // Find ANY subscription with 'enterprise' plan
      const allSubs: any[] = await kv.getByPrefix('subscription:');
      const enterpriseSub = allSubs.find(sub => sub.plan_id === 'enterprise');

      if (!enterpriseSub) {
        return c.json({ error: 'No Enterprise subscription found in system' }, 404);
      }

      const correctOrgId = enterpriseSub.organization_id;
      
      // Update profile
      await supabase.from('profiles')
        .update({ organization_id: correctOrgId })
        .eq('id', user.id);
        
      // Update metadata
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: { organizationId: correctOrgId }
      });

      return c.json({ success: true, message: 'Moved to Enterprise organization', orgId: correctOrgId });
    } catch (error: any) {
      console.error('[subscriptions] Error fixing mismatch:', error);
      return c.json({ error: error.message }, 500);
    }
  });

}