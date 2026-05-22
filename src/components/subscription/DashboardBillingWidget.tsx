import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  CreditCard,
  Zap,
  Crown,
  Building2,
  ArrowRight,
  Clock,
  AlertTriangle,
  Sparkles,
  Users,
  Database,
} from 'lucide-react';
import {
  getCurrentSubscription,
  formatCurrency,
  formatDate,
  daysUntil,
  type Subscription,
  type PlanId,
} from '../../utils/subscription-client';

interface DashboardBillingWidgetProps {
  onNavigate: (view: string) => void;
}

const PLAN_CONFIG: Record<PlanId, { name: string; icon: typeof Zap; color: string; bg: string; border: string }> = {
  starter: {
    name: 'Standard User',
    icon: Zap,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  professional: {
    name: 'Professional',
    icon: Crown,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  enterprise: {
    name: 'Enterprise',
    icon: Building2,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
};

export function DashboardBillingWidget({ onNavigate }: DashboardBillingWidgetProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCurrentSubscription()
      .then((sub) => { if (!cancelled) setSubscription(sub); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="py-8">
          <div className="h-4 bg-muted rounded w-1/3 mb-2" />
          <div className="h-3 bg-muted rounded w-2/3" />
        </CardContent>
      </Card>
    );
  }

  // No subscription — upgrade prompt
  if (!subscription) {
    return (
      <Card className="border-dashed border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Unlock Premium Features</p>
                <p className="text-sm text-muted-foreground">
                  Upgrade to access marketing, inventory, 3D planners & more
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => onNavigate('subscription-billing')}
            >
              View Plans
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = PLAN_CONFIG[subscription.plan_id] || PLAN_CONFIG.starter;
  const Icon = config.icon;
  const days = daysUntil(subscription.current_period_end);
  const isTrialing = subscription.status === 'trialing';
  const isCanceling = subscription.cancel_at_period_end;
  const isExpired = subscription.status === 'expired' || subscription.status === 'canceled';

  // Period progress (what % of billing cycle has elapsed)
  const periodStart = new Date(subscription.current_period_start).getTime();
  const periodEnd = new Date(subscription.current_period_end).getTime();
  const now = Date.now();
  const periodProgress = Math.min(100, Math.max(0, ((now - periodStart) / (periodEnd - periodStart)) * 100));

  return (
    <Card className={isExpired ? 'border-border opacity-75' : isCanceling ? `${config.border} border-amber-300` : config.border}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <CreditCard className="h-4 w-4" />
            Subscription
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onNavigate('subscription-billing')}
          >
            Manage
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Plan info */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bg}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{config.name}</span>
              {isTrialing && (
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                  Trial
                </Badge>
              )}
              {isCanceling && !isExpired && (
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                  Canceling
                </Badge>
              )}
              {isExpired && (
                <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
                  {subscription.status === 'canceled' ? 'Canceled' : 'Expired'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isExpired
                ? 'Subscription ended'
                : `${formatCurrency(subscription.amount)}/${subscription.billing_interval === 'year' ? 'yr' : 'mo'}`}
            </p>
          </div>
        </div>

        {/* Billing period progress */}
        {!isExpired && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {isTrialing ? 'Trial ends' : 'Next billing'}
              </span>
              <span className="font-medium text-foreground">
                {formatDate(subscription.current_period_end)}
                <span className="text-muted-foreground ml-1">({days}d)</span>
              </span>
            </div>
            <Progress
              value={periodProgress}
              className={`h-1.5 ${isCanceling ? '[&>div]:bg-amber-500' : ''}`}
            />
          </div>
        )}

        {/* Cancellation warning */}
        {isCanceling && !isExpired && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 border border-amber-100">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
            <p className="text-[11px] text-amber-700">
              Access ends {formatDate(subscription.current_period_end)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
