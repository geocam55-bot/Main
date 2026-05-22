import { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Zap, Crown, Building2, AlertTriangle, Sparkles } from 'lucide-react';
import {
  getCurrentSubscription,
  formatCurrency,
  daysUntil,
  type Subscription,
  type PlanId,
} from '../../utils/subscription-client';

interface SubscriptionBadgeProps {
  onClick?: () => void;
  compact?: boolean;
}

const PLAN_CONFIG: Record<PlanId, { name: string; icon: typeof Zap; gradient: string; text: string; badge: string }> = {
  starter: {
    name: 'Standard User',
    icon: Zap,
    gradient: 'from-orange-500 to-amber-500',
    text: 'text-orange-700',
    badge: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
  },
  professional: {
    name: 'Pro',
    icon: Crown,
    gradient: 'from-blue-500 to-indigo-500',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  },
  enterprise: {
    name: 'Enterprise',
    icon: Building2,
    gradient: 'from-purple-500 to-violet-500',
    text: 'text-purple-700',
    badge: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
  },
};

export function SubscriptionBadge({ onClick, compact = false }: SubscriptionBadgeProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentSubscription()
      .then((sub) => {
        if (!cancelled) {
          setSubscription(sub);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  if (!loaded) return null;

  // No subscription — show "Free" badge
  if (!subscription) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border hover:bg-muted transition-colors cursor-pointer"
          >
            <Sparkles className="h-3 w-3" />
            {!compact && 'Free'}
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">Free tier — click to view plans</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const config = PLAN_CONFIG[subscription.plan_id] || PLAN_CONFIG.starter;
  const Icon = config.icon;
  const days = daysUntil(subscription.current_period_end);
  const isTrialing = subscription.status === 'trialing';
  const isCanceling = subscription.cancel_at_period_end;
  const isExpired = subscription.status === 'expired' || subscription.status === 'canceled';

  let tooltipText = `${config.name} plan — ${formatCurrency(subscription.amount)}/${subscription.billing_interval}`;
  if (isTrialing) tooltipText = `Trial — ${days} days remaining`;
  else if (isCanceling) tooltipText = `Cancels in ${days} days`;
  else if (isExpired) tooltipText = `${config.name} plan (expired)`;

  let badgeClass = config.badge;
  if (isCanceling) badgeClass = 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200';
  if (isExpired) badgeClass = 'bg-muted text-muted-foreground border-border hover:bg-muted';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          type="button"
          onClick={onClick}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${badgeClass}`}
        >
          {isCanceling ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <Icon className="h-3 w-3" />
          )}
          {!compact && (
            <span>
              {isTrialing ? 'Trial' : isExpired ? 'Expired' : config.name}
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
