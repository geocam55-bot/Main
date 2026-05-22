import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';
import { PricingPlans } from './PricingPlans';
import { CurrentPlan } from './CurrentPlan';
import { BillingHistory } from './BillingHistory';
import { PaymentMethodCard } from './PaymentMethodCard';
import { CheckoutDialog } from './CheckoutDialog';
import { CancelConfirmDialog } from './CancelConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, CreditCard, Receipt, LayoutGrid, AlertTriangle, Sparkles, Users } from 'lucide-react';
import type { User } from '../../App';
import { SubscriptionBillingModuleHelp } from './SubscriptionBillingModuleHelp';
import {
  getCurrentSubscription,
  getBillingHistorySummary,
  getPaymentMethod,
  getOrgSubscriptions,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  reactivateSubscription,
  updatePaymentMethod,
  sendBillingTestEmail,
  type Subscription,
  type BillingEvent,
  type PaymentMethod,
  type PlanId,
} from '../../utils/subscription-client';

interface SubscriptionBillingProps {
  user: User;
  planRefreshKey?: number;
}

export function SubscriptionBilling({ user, planRefreshKey }: SubscriptionBillingProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingEvents, setBillingEvents] = useState<BillingEvent[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<PlanId | null>(null);
  const [checkoutInterval, setCheckoutInterval] = useState<'month' | 'year'>('month');
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [billingSupportEmail, setBillingSupportEmail] = useState<string>('');
  const [billingSmtpConfig, setBillingSmtpConfig] = useState<{ host?: string; port?: number; security?: string; authRequired?: boolean } | null>(null);
  const [sendingBillingTestEmail, setSendingBillingTestEmail] = useState(false);
  const [orgSubscriptions, setOrgSubscriptions] = useState<(Subscription & { user_email?: string; user_name?: string; user_role?: string })[]>([]);

  const isAdmin = ['admin', 'super_admin'].includes(user.role);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sub, history, pm] = await Promise.all([
        getCurrentSubscription(),
        getBillingHistorySummary(),
        getPaymentMethod(),
      ]);
      setSubscription(sub);
      setBillingEvents(history.events || []);
      setBillingSupportEmail(history.support_email || '');
      setBillingSmtpConfig(history.smtp || null);
      setPaymentMethod(pm);

      // Load org-wide subscriptions for admins
      if (['admin', 'super_admin'].includes(user.role)) {
        try {
          const orgSubs = await getOrgSubscriptions();
          setOrgSubscriptions(orgSubs);
        } catch { /* non-critical */ }
      }
    } catch (err: any) {
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }, [user.role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectPlan = (planId: PlanId, interval: 'month' | 'year') => {
    if (!isAdmin) {
      toast.error('Only admins can manage subscriptions');
      return;
    }
    setCheckoutPlan(planId);
    setCheckoutInterval(interval);
    setCheckoutOpen(true);
  };

  const handleCheckout = async (planId: PlanId, interval: 'month' | 'year', pm: Partial<PaymentMethod>, trial: boolean) => {
    try {
      setActionLoading(true);

      if (subscription && ['active', 'trialing'].includes(subscription.status)) {
        // Upgrade/downgrade
        const updated = await updateSubscription(planId, interval);
        setSubscription(updated);
        toast.success(`Plan changed to ${planId.charAt(0).toUpperCase() + planId.slice(1)}!`);
      } else {
        // New subscription
        const newSub = await createSubscription(planId, interval, pm, trial);
        setSubscription(newSub);
        toast.success(trial ? 'Trial started! Enjoy 14 days free.' : 'Subscription activated!');
      }

      setCheckoutOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Checkout failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (immediate: boolean = false) => {
    try {
      setActionLoading(true);
      const updated = await cancelSubscription(immediate);
      setSubscription(updated);
      setCancelDialogOpen(false);
      toast.success(
        immediate
          ? 'Subscription canceled immediately'
          : 'Subscription will cancel at end of billing period'
      );
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    try {
      setActionLoading(true);
      const updated = await reactivateSubscription();
      setSubscription(updated);
      toast.success('Subscription reactivated!');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reactivate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePaymentMethod = async (pm: Partial<PaymentMethod>) => {
    try {
      setActionLoading(true);
      const updated = await updatePaymentMethod(pm);
      setPaymentMethod(updated);
      toast.success('Payment method updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update payment method');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendBillingTestEmail = async () => {
    if (!user.email) {
      toast.error('No user email found for test delivery');
      return;
    }

    try {
      setSendingBillingTestEmail(true);
      const result = await sendBillingTestEmail(user.email);
      const senderText = result.sender ? ` from ${result.sender}` : '';
      toast.success(`Billing test email sent to ${user.email}${senderText}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send billing test email');
    } finally {
      setSendingBillingTestEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-muted-foreground">Loading subscription...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Demo Banner */}
      <Alert className="border-amber-200 bg-amber-50">
        <Sparkles className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <span>
            <strong>Demo Mode:</strong> This subscription system uses demonstration pricing. No real charges are processed.
            Payment information is simulated for testing purposes.
          </span>
        </AlertDescription>
      </Alert>

      {!isAdmin && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Only organization admins can manage subscriptions and billing. Contact your admin for changes.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-end">
          <SubscriptionBillingModuleHelp
            userId={user.id}
            activeTab={activeTab}
            eventCount={billingEvents.length}
            teamSubscriptions={orgSubscriptions.length}
            isAdmin={isAdmin}
            onRefreshBilling={loadData}
            onOpenOverview={() => setActiveTab('overview')}
            onOpenPlans={() => setActiveTab('plans')}
            onOpenPayment={() => setActiveTab('payment')}
            onOpenHistory={() => setActiveTab('history')}
            onOpenTeam={() => {
              if (isAdmin) {
                setActiveTab('team');
              }
            }}
            onStartPlanSelection={() => {
              if (isAdmin) {
                setActiveTab('plans');
              }
            }}
          />
        </div>
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Plans</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Team</span>
              {orgSubscriptions.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {orgSubscriptions.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="payment" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Payment</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
            {billingEvents.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {billingEvents.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <CurrentPlan
            subscription={subscription}
            paymentMethod={paymentMethod}
            isAdmin={isAdmin}
            actionLoading={actionLoading}
            onChangePlan={() => setActiveTab('plans')}
            onCancel={() => setCancelDialogOpen(true)}
            onReactivate={handleReactivate}
          />
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="mt-6">
          <PricingPlans
            currentPlanId={subscription?.plan_id || null}
            subscriptionStatus={subscription?.status || null}
            isAdmin={isAdmin}
            onSelectPlan={handleSelectPlan}
            refreshKey={planRefreshKey}
          />
        </TabsContent>

        {/* Team Subscriptions Tab (admin only) */}
        {isAdmin && (
          <TabsContent value="team" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Team Subscriptions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Each user in your organization can have their own plan level. Manage individual subscriptions below.
                </p>
                {orgSubscriptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No active user subscriptions yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-4">User</th>
                          <th className="pb-2 pr-4">Plan</th>
                          <th className="pb-2 pr-4">Status</th>
                          <th className="pb-2 pr-4">Billing</th>
                          <th className="pb-2 pr-4">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orgSubscriptions.map((sub) => (
                          <tr key={sub.id} className="border-b last:border-0">
                            <td className="py-3 pr-4">
                              <div>
                                <p className="font-medium">{sub.user_name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{sub.user_email || sub.user_id}</p>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <Badge variant="outline" className="capitalize">{sub.plan_id}</Badge>
                            </td>
                            <td className="py-3 pr-4">
                              <Badge
                                variant={sub.status === 'active' ? 'default' : 'secondary'}
                                className={
                                  sub.status === 'active' ? 'bg-green-100 text-green-700' :
                                  sub.status === 'trialing' ? 'bg-blue-100 text-blue-700' :
                                  sub.status === 'canceled' ? 'bg-red-100 text-red-700' :
                                  'bg-muted text-foreground'
                                }
                              >
                                {sub.status}
                              </Badge>
                            </td>
                            <td className="py-3 pr-4 capitalize">{sub.billing_interval}ly</td>
                            <td className="py-3 pr-4">${sub.amount}/{sub.billing_interval === 'year' ? 'yr' : 'mo'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Payment Method Tab */}
        <TabsContent value="payment" className="mt-6">
          <PaymentMethodCard
            paymentMethod={paymentMethod}
            isAdmin={isAdmin}
            actionLoading={actionLoading}
            onUpdate={handleUpdatePaymentMethod}
          />
        </TabsContent>

        {/* Billing History Tab */}
        <TabsContent value="history" className="mt-6">
          {isAdmin && (
            <div className="mb-6 space-y-4">
              <div className="flex items-start justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Billing System SMTP Sender</h4>
                  <div className="space-y-2 text-sm text-slate-700">
                    {billingSupportEmail && (
                      <div>
                        <span className="font-medium">Sender:</span> {billingSupportEmail}
                      </div>
                    )}
                    {billingSmtpConfig && (
                      <>
                        {billingSmtpConfig.host && (
                          <div>
                            <span className="font-medium">Host:</span> {billingSmtpConfig.host}:{billingSmtpConfig.port || 587}
                          </div>
                        )}
                        {billingSmtpConfig.security && (
                          <div>
                            <span className="font-medium">Security:</span> {billingSmtpConfig.security.toUpperCase()}
                          </div>
                        )}
                        {billingSmtpConfig.authRequired !== undefined && (
                          <div>
                            <span className="font-medium">Auth:</span> {billingSmtpConfig.authRequired ? 'Required' : 'Optional'}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleSendBillingTestEmail}
                  disabled={sendingBillingTestEmail}
                  className="ml-4"
                >
                  {sendingBillingTestEmail ? 'Sending...' : 'Send Test Email'}
                </Button>
              </div>
            </div>
          )}
          <BillingHistory events={billingEvents} supportEmail={billingSupportEmail} />
        </TabsContent>
      </Tabs>

      {/* Checkout Dialog */}
      {checkoutPlan && (
        <CheckoutDialog
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          planId={checkoutPlan}
          interval={checkoutInterval}
          onIntervalChange={setCheckoutInterval}
          hasExistingSub={!!subscription && ['active', 'trialing'].includes(subscription.status)}
          currentPlanId={subscription?.plan_id}
          actionLoading={actionLoading}
          onConfirm={handleCheckout}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      {subscription && (
        <CancelConfirmDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          subscription={subscription}
          actionLoading={actionLoading}
          onConfirmCancel={handleCancel}
        />
      )}
    </div>
  );
}