import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  AlertCircle, 
  Check, 
  CreditCard, 
  ArrowLeft, 
  Lock, 
  LogOut, 
  Zap, 
  Crown, 
  Building2, 
  ShieldCheck,
  LifeBuoy
} from 'lucide-react';
import { Logo } from '../Logo';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  description: string;
  features: string[];
  popular?: boolean;
}

interface PlanSelectionProps {
  plans?: Plan[];
  onSelectPlan?: (planId: string) => Promise<void>;
  onContactSupport?: () => void;
  trialEndDate?: Date;
  onLogout?: () => void;
}

// Default plans (can be overridden by props)
const DEFAULT_PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Basic',
    price: 29,
    currency: 'USD',
    description: 'Essential CRM workflows for small builders',
    features: [
      'Core CRM (Contacts, Deals, Tasks)',
      'Email integration',
      'Basic reports',
      'Community support',
    ],
    popular: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 79,
    currency: 'USD',
    description: 'Perfect for growing teams & custom builders',
    features: [
      'Everything in Basic',
      'Marketing automation',
      'Inventory management',
      'Document management',
      'Project Wizards (3D Planners)',
      'Customer portal',
    ],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    currency: 'USD',
    description: 'For large organizations needing custom scaling',
    features: [
      'Everything in Professional',
      'SSO SAML encryption',
      'Audit logging history',
      'Developer API access',
      'Custom integrations',
      'SLA performance guarantees',
    ],
    popular: false,
  },
];

const PLAN_ICON_MAP: Record<string, any> = {
  starter: Zap,
  professional: Crown,
  enterprise: Building2,
};

const PLAN_COLOR_MAP: Record<string, string> = {
  starter: 'text-orange-600 bg-orange-50 border-orange-200',
  professional: 'text-blue-600 bg-blue-50 border-blue-200',
  enterprise: 'text-purple-600 bg-purple-50 border-purple-200',
};

export function PlanSelection({
  plans = DEFAULT_PLANS,
  onSelectPlan,
  onContactSupport,
  trialEndDate,
  onLogout,
}: PlanSelectionProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('starter');
  const [showCheckout, setShowCheckout] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Payment Form States
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expMonth, setExpMonth] = useState('12');
  const [expYear, setExpYear] = useState('2028');
  const [cvc, setCvc] = useState('123');
  const [nameOnCard, setNameOnCard] = useState('');

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleSelectPlan = (planId: string) => {
    setError('');
    setSelectedPlanId(planId);
    setShowCheckout(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const last4 = cardNumber.replace(/\s/g, '').slice(-4) || '4242';
      const { updatePaymentMethod } = await import('../../utils/subscription-client');
      try {
        await updatePaymentMethod({
          brand: 'Visa',
          last4,
          exp_month: parseInt(expMonth) || 12,
          exp_year: parseInt(expYear) || 2028,
          cardholder_name: nameOnCard || 'User Name'
        });
      } catch (pmErr) {
        console.warn('Failed to update payment method in demo backend', pmErr);
      }

      if (onSelectPlan) {
        await onSelectPlan(selectedPlanId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete payment. Please check card details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCardInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const activePlanObj = plans.find((p) => p.id === selectedPlanId) || plans[0];
  const PlanIcon = PLAN_ICON_MAP[selectedPlanId] || Zap;
  const planColorClass = PLAN_COLOR_MAP[selectedPlanId] || 'text-blue-600 bg-blue-50 border-blue-200';

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Navigation Header bar with Cancel option */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
          <Logo size="md" />
          {onLogout && (
            <Button 
              variant="ghost" 
              onClick={onLogout}
              className="text-slate-600 hover:text-red-650 hover:bg-slate-100 flex items-center gap-2 text-sm px-4 h-11 rounded-lg"
              id="plan-selection-top-cancel"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Cancel & Log Out</span>
              <span className="sm:hidden">Cancel</span>
            </Button>
          )}
        </div>

        {!showCheckout ? (
          /* ================= PLAN SELECTION MODE ================= */
          <div>
            {/* Header Text */}
            <div className="text-center mb-10 max-w-3xl mx-auto">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
                Select your CRM plan
              </h1>
              <p className="text-base sm:text-lg text-slate-600">
                Your 15-day trial {trialEndDate ? `ended on ${formatDate(trialEndDate)}` : 'has ended'}. Select a suitable tier to secure your data and continue using ProSpaces CRM.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-6 max-w-2xl mx-auto">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Plans Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 items-stretch">
              {plans.map((plan) => {
                const CurrentIcon = PLAN_ICON_MAP[plan.id] || Zap;
                const activeColor = PLAN_COLOR_MAP[plan.id] || 'text-blue-600 bg-blue-50 border-blue-200';
                return (
                  <Card
                    key={plan.id}
                    className={`relative flex flex-col shadow-md hover:shadow-lg border-2 transition-all duration-300 rounded-xl overflow-hidden ${
                      selectedPlanId === plan.id 
                        ? 'border-blue-600 ring-2 ring-blue-600/25 md:scale-[1.02]' 
                        : 'border-slate-100 hover:border-slate-300'
                    }`}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    {plan.popular && (
                      <div className="absolute top-0 right-0 py-1 px-4 bg-blue-600 text-white rounded-bl-lg text-xs font-semibold uppercase tracking-wider">
                        Most Popular
                      </div>
                    )}

                    <CardHeader className="pt-8 pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg border ${activeColor.split(' ')[1]} ${activeColor.split(' ')[2]}`}>
                          <CurrentIcon className={`h-5 w-5 ${activeColor.split(' ' )[0]}`} />
                        </div>
                        <CardTitle className="text-xl font-bold text-slate-900">{plan.name}</CardTitle>
                      </div>
                      <CardDescription className="text-slate-500 text-sm h-10 line-clamp-2">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col justify-between p-6 pt-0 space-y-6">
                      {/* Price Section */}
                      <div className="pt-2">
                        {plan.price > 0 ? (
                          <div>
                            <span className="text-4xl font-extrabold text-slate-900">${plan.price}</span>
                            <span className="text-slate-500 text-base font-normal">/month</span>
                            <p className="text-xs text-slate-400 mt-1">Billed monthly • Cancel anytime</p>
                          </div>
                        ) : (
                          <div className="text-xl font-bold text-slate-900">
                            Custom enterprise pricing
                          </div>
                        )}
                      </div>

                      {/* Feature Lists */}
                      <ul className="space-y-3 pt-3 border-t border-slate-100 flex-1">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-slate-700">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Direct Action Button */}
                      <div className="pt-4">
                        <Button
                          className="w-full h-11 text-sm font-medium rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectPlan(plan.id);
                          }}
                          variant={selectedPlanId === plan.id ? 'default' : 'outline'}
                          id={`choose-plan-btn-${plan.id}`}
                        >
                          Choose {plan.name}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Bottom Support and Bottom Logout Section */}
            <div className="max-w-2xl mx-auto space-y-6 text-center">
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5 justify-center sm:justify-start">
                    <LifeBuoy className="w-4 h-4 text-blue-500" />
                    Need custom pricing or assistance?
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    We help businesses with volume discounts, custom integrations, & dedicated SLA guarantees.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onContactSupport}
                  className="whitespace-nowrap h-10 px-4 rounded-lg"
                  id="contact-sales-btn"
                >
                  Contact Sales Support
                </Button>
              </div>

              {onLogout && (
                <div className="pt-4">
                  <Button 
                    variant="link" 
                    onClick={onLogout}
                    className="text-slate-500 hover:text-red-650 text-sm flex items-center justify-center gap-2 mx-auto"
                    id="plan-selection-bottom-logout"
                  >
                    <LogOut className="w-4 h-4" />
                    Decide later? Discard trial and sign out.
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ================= PAYMENT SCREEN MODE ================= */
          <div className="max-w-4xl mx-auto">
            {/* Page Header Back / Cancel Bar */}
            <div className="mb-6 flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setShowCheckout(false)}
                className="text-slate-600 hover:bg-slate-100 flex items-center gap-2 text-sm"
                id="back-to-plans-btn"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Plans
              </Button>
              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                Demo Secured Checkout Mode
              </span>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Order Summary */}
              <div className="lg:col-span-5 space-y-6">
                <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                  <CardHeader className="bg-slate-100 border-b border-slate-200 p-5">
                    <CardTitle className="text-base font-bold text-slate-900">Order Summary</CardTitle>
                    <CardDescription className="text-xs">Verify your chosen subscription details</CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    {/* Selected Plan badge */}
                    <div className="flex items-center justify-between p-3.5 rounded-lg border bg-slate-50 border-slate-150">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border ${planColorClass.split(' ')[1]} ${planColorClass.split(' ')[2]}`}>
                          <PlanIcon className={`h-5 w-5 ${planColorClass.split(' ')[0]}`} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{activePlanObj.name}</p>
                          <p className="text-xs text-slate-500">Billed Monthly</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold text-slate-900">${activePlanObj.price}</p>
                        <p className="text-[10px] text-slate-400">USD / mo</p>
                      </div>
                    </div>

                    {/* Pricing Breakdown */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>Subscription Cost</span>
                        <span>${activePlanObj.price}.00</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Workspace Setup Fees</span>
                        <span className="text-emerald-600">FREE</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Taxes & Duties</span>
                        <span>$0.00</span>
                      </div>
                      <div className="border-t border-slate-100 my-2 pt-2 flex justify-between font-bold text-slate-900">
                        <span>Total Due Today</span>
                        <span>${activePlanObj.price}.00</span>
                      </div>
                    </div>

                    {/* Features list shrunken */}
                    <div className="border-t border-slate-100 pt-3 mt-2">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Included Premium Features:</p>
                      <ul className="space-y-1.5">
                        {activePlanObj.features.slice(0, 4).map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                            <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span className="truncate">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* Secure Trust Banner */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 text-slate-600 text-xs">
                  <Lock className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Interactive Secure Tunnel</p>
                    <p className="mt-0.5 leading-relaxed">
                      All connection states are encrypted and stored inside your secure Supabase database environment helper. No actual payment methods are billed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Secure Payment Details Form Card */}
              <div className="lg:col-span-7">
                <Card className="border border-slate-200 shadow-md rounded-xl">
                  <CardHeader className="p-5 sm:p-6 border-b border-slate-100">
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                      Secure Payment Information
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Enter your card details to activate your subscription and proceed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 sm:p-6">
                    <form onSubmit={handlePaymentSubmit} className="space-y-4">
                      {/* Name on Card */}
                      <div className="space-y-1">
                        <Label htmlFor="nameOnCard" className="text-xs font-semibold text-slate-700">Cardholder Name</Label>
                        <Input
                          id="nameOnCard"
                          type="text"
                          required
                          placeholder="John Smith"
                          value={nameOnCard}
                          onChange={(e) => setNameOnCard(e.target.value)}
                          className="h-11 bg-slate-50 focus:bg-white text-sm"
                          disabled={isLoading}
                        />
                      </div>

                      {/* Card Number */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="cardNumber" className="text-xs font-semibold text-slate-700">Credit Card Number</Label>
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 text-slate-500 rounded font-bold uppercase tracking-wider">Demo Default Provided</span>
                        </div>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                          <Input
                            id="cardNumber"
                            type="text"
                            required
                            placeholder="4242 4242 4242 4242"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(formatCardInput(e.target.value))}
                            maxLength={19}
                            className="h-11 pl-9 bg-slate-50 focus:bg-white font-mono text-sm"
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      {/* Expiry & CVC inline */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="expMonth" className="text-xs font-semibold text-slate-700">Exp. Month</Label>
                          <Input
                            id="expMonth"
                            type="text"
                            required
                            placeholder="12"
                            value={expMonth}
                            onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            className="h-11 text-center bg-slate-50 focus:bg-white text-sm"
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="expYear" className="text-xs font-semibold text-slate-700">Exp. Year</Label>
                          <Input
                            id="expYear"
                            type="text"
                            required
                            placeholder="2028"
                            value={expYear}
                            onChange={(e) => setExpYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            className="h-11 text-center bg-slate-50 focus:bg-white text-sm"
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="cvc" className="text-xs font-semibold text-slate-700">CVC Code</Label>
                          <Input
                            id="cvc"
                            type="password"
                            required
                            placeholder="123"
                            value={cvc}
                            onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            className="h-11 text-center bg-slate-50 focus:bg-white font-mono text-sm shadow-sm"
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      {/* Trust Info */}
                      <div className="pt-2">
                        <Alert className="border-blue-150 bg-blue-50/50 p-3 leading-tight flex items-start gap-2.5">
                          <ShieldCheck className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <AlertDescription className="text-xs text-blue-800">
                            Pressing the button will simulate payment processing, store visa card suffix ending in <strong>{cardNumber.slice(-4) || '4242'}</strong>, & transition your workspace to <strong>{activePlanObj.name} User</strong>.
                          </AlertDescription>
                        </Alert>
                      </div>

                      {/* Action buttons list */}
                      <div className="pt-4 space-y-2.5">
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow"
                          id="submit-payment-btn"
                        >
                          {isLoading ? (
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent" />
                              Verifying Payment Details...
                            </span>
                          ) : (
                            <>
                              <Lock className="w-4 h-4" />
                              Pay & Activate Subscription — ${activePlanObj.price}.00
                            </>
                          )}
                        </Button>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowCheckout(false)}
                            disabled={isLoading}
                            className="h-11 text-xs font-semibold rounded-lg border-slate-200"
                            id="payment-cancel-back-btn"
                          >
                            Go Back
                          </Button>
                          {onLogout && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={onLogout}
                              disabled={isLoading}
                              className="h-11 text-xs font-semibold rounded-lg text-red-650 hover:bg-red-50 border-red-200"
                              id="payment-cancel-logoff-btn"
                            >
                              <LogOut className="w-3.5 h-3.5 mr-1" />
                              Cancel & Logout
                            </Button>
                          )}
                        </div>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
