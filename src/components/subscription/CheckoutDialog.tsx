import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Card } from '../ui/card';
import {
  CreditCard,
  Loader2,
  ShieldCheck,
  Check,
  ArrowUpCircle,
  Zap,
  Crown,
  Building2,
} from 'lucide-react';
import { formatCurrency, getPlans, type PlanId, type PaymentMethod } from '../../utils/subscription-client';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: PlanId;
  interval: 'month' | 'year';
  onIntervalChange: (interval: 'month' | 'year') => void;
  hasExistingSub: boolean;
  currentPlanId?: PlanId;
  actionLoading: boolean;
  onConfirm: (planId: PlanId, interval: 'month' | 'year', pm: Partial<PaymentMethod>, trial: boolean) => void;
}

const PLAN_INFO_DEFAULTS: Record<PlanId, { name: string; price: number; priceAnnual: number; icon: typeof Zap; color: string }> = {
  starter: { name: 'Standard User', price: 29, priceAnnual: 290, icon: Zap, color: 'text-orange-600' },
  professional: { name: 'Professional', price: 79, priceAnnual: 790, icon: Crown, color: 'text-blue-600' },
  enterprise: { name: 'Enterprise', price: 199, priceAnnual: 1990, icon: Building2, color: 'text-purple-600' },
};

const PLAN_ICON_MAP: Record<string, typeof Zap> = {
  starter: Zap,
  professional: Crown,
  enterprise: Building2,
};

const PLAN_COLOR_MAP: Record<string, string> = {
  starter: 'text-orange-600',
  professional: 'text-blue-600',
  enterprise: 'text-purple-600',
};

export function CheckoutDialog({
  open,
  onOpenChange,
  planId,
  interval,
  onIntervalChange,
  hasExistingSub,
  currentPlanId,
  actionLoading,
  onConfirm,
}: CheckoutDialogProps) {
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expMonth, setExpMonth] = useState('12');
  const [expYear, setExpYear] = useState('2028');
  const [cvc, setCvc] = useState('123');
  const [nameOnCard, setNameOnCard] = useState('');
  const [wantsTrial, setWantsTrial] = useState(false);
  const [planInfo, setPlanInfo] = useState(PLAN_INFO_DEFAULTS);

  // Fetch dynamic plan data when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const serverPlans = await getPlans();
        if (cancelled || !serverPlans) return;
        const merged = { ...PLAN_INFO_DEFAULTS };
        for (const key of Object.keys(merged) as PlanId[]) {
          const sp = serverPlans[key] as any;
          if (sp) {
            merged[key] = {
              name: sp.name || merged[key].name,
              price: sp.price ?? merged[key].price,
              priceAnnual: sp.priceAnnual ?? merged[key].priceAnnual,
              icon: PLAN_ICON_MAP[key] || merged[key].icon,
              color: PLAN_COLOR_MAP[key] || merged[key].color,
            };
          }
        }
        setPlanInfo(merged);
      } catch {
        // keep defaults
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const plan = planInfo[planId];
  const Icon = plan.icon;
  const amount = interval === 'year' ? plan.priceAnnual : plan.price;
  const isAnnual = interval === 'year';

  const isUpgrade = hasExistingSub && currentPlanId && planInfo[planId].price > planInfo[currentPlanId].price;
  const isDowngrade = hasExistingSub && currentPlanId && planInfo[planId].price < planInfo[currentPlanId].price;

  const handleConfirm = () => {
    const last4 = cardNumber.replace(/\s/g, '').slice(-4) || '4242';
    onConfirm(
      planId,
      interval,
      {
        brand: 'Visa',
        last4,
        exp_month: parseInt(expMonth) || 12,
        exp_year: parseInt(expYear) || 2028,
      },
      wantsTrial && !hasExistingSub,
    );
  };

  const formatCardInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {hasExistingSub ? (
              <>
                <ArrowUpCircle className="h-5 w-5 text-blue-600" />
                {isUpgrade ? 'Upgrade' : isDowngrade ? 'Change' : 'Update'} Plan
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 text-blue-600" />
                Subscribe to ProSpaces CRM
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {hasExistingSub
              ? `Switch to the ${plan.name} plan. Changes take effect immediately.`
              : `Complete your subscription to the ${plan.name} plan.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Selected plan summary */}
          <Card className="p-4 bg-muted border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-background border border-border">
                  <Icon className={`h-5 w-5 ${plan.color}`} />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{plan.name} Plan</p>
                  <p className="text-xs text-muted-foreground capitalize">{interval}ly billing</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-foreground">{formatCurrency(amount)}</p>
                <p className="text-xs text-muted-foreground">/user/{interval}</p>
              </div>
            </div>

            {/* Billing toggle */}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
              <Label className={`text-xs ${!isAnnual ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                Monthly
              </Label>
              <Switch
                checked={isAnnual}
                onCheckedChange={(checked) => onIntervalChange(checked ? 'year' : 'month')}
              />
              <Label className={`text-xs ${isAnnual ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                Annual
              </Label>
              {isAnnual && (
                <Badge className="bg-green-100 text-green-700 text-[10px]">
                  Save {formatCurrency(plan.price * 12 - plan.priceAnnual)}
                </Badge>
              )}
            </div>
          </Card>

          {/* Trial option (new subscriptions only) */}
          {!hasExistingSub && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-blue-300 bg-blue-50/50">
              <div>
                <p className="text-sm font-medium text-blue-900">Start with a 14-day free trial?</p>
                <p className="text-xs text-blue-600">No charge until the trial ends</p>
              </div>
              <Switch
                checked={wantsTrial}
                onCheckedChange={setWantsTrial}
              />
            </div>
          )}

          <Separator />

          {/* Payment form */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Details
              <Badge variant="secondary" className="text-[10px]">Demo</Badge>
            </p>

            <div>
              <Label className="text-xs">Name on Card</Label>
              <Input
                placeholder="John Smith"
                value={nameOnCard}
                onChange={(e) => setNameOnCard(e.target.value)}
                className="h-9"
              />
            </div>

            <div>
              <Label className="text-xs">Card Number</Label>
              <Input
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardInput(e.target.value))}
                maxLength={19}
                className="h-9 font-mono"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Month</Label>
                <Input
                  placeholder="12"
                  value={expMonth}
                  onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Year</Label>
                <Input
                  placeholder="2028"
                  value={expYear}
                  onChange={(e) => setExpYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">CVC</Label>
                <Input
                  placeholder="123"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="h-9"
                  type="password"
                />
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div className="space-y-2 p-3 rounded-lg bg-muted border border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{plan.name} ({interval}ly)</span>
              <span className="text-foreground">{wantsTrial && !hasExistingSub ? '$0.00' : formatCurrency(amount)}</span>
            </div>
            {wantsTrial && !hasExistingSub && (
              <div className="flex justify-between text-sm">
                <span className="text-blue-600">14-day trial discount</span>
                <span className="text-blue-600">-{formatCurrency(amount)}</span>
              </div>
            )}
            <Separator className="my-1" />
            <div className="flex justify-between font-semibold">
              <span>Due today</span>
              <span>{wantsTrial && !hasExistingSub ? '$0.00' : formatCurrency(amount)}</span>
            </div>
            {wantsTrial && !hasExistingSub && (
              <p className="text-xs text-muted-foreground">
                After trial: {formatCurrency(amount)}/{interval} starting on trial end date
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-auto">
            <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
            Demo mode — no real charges
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleConfirm}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Processing...
              </>
            ) : wantsTrial && !hasExistingSub ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Start Free Trial
              </>
            ) : hasExistingSub ? (
              <>
                <ArrowUpCircle className="h-4 w-4 mr-1" />
                Confirm Change
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-1" />
                Subscribe — {formatCurrency(amount)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}