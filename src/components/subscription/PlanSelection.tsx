import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle, Check } from 'lucide-react';
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
}

// Default plans (can be overridden by props)
const DEFAULT_PLANS: Plan[] = [
  {
    id: 'pro-monthly',
    name: 'Professional',
    price: 99,
    currency: 'USD',
    description: 'Perfect for growing teams',
    features: [
      'Up to 5 team members',
      'All core features',
      'Email support',
      'Monthly billing',
      'Basic analytics',
    ],
    popular: false,
  },
  {
    id: 'business-monthly',
    name: 'Business',
    price: 199,
    currency: 'USD',
    description: 'For established businesses',
    features: [
      'Up to 20 team members',
      'All Professional features',
      'Priority email & phone support',
      'Advanced analytics',
      'Custom integrations',
    ],
    popular: true,
  },
  {
    id: 'enterprise-contact',
    name: 'Enterprise',
    price: 0,
    currency: 'USD',
    description: 'For large organizations',
    features: [
      'Unlimited team members',
      'All Business features',
      'Dedicated account manager',
      'Unlimited integrations',
      'SLA guarantee',
    ],
    popular: false,
  },
];

export function PlanSelection({
  plans = DEFAULT_PLANS,
  onSelectPlan,
  onContactSupport,
  trialEndDate,
}: PlanSelectionProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleSelectPlan = async (planId: string) => {
    setError('');
    setSelectedPlan(planId);
    setIsLoading(true);

    try {
      if (onSelectPlan) {
        await onSelectPlan(planId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to select plan. Please try again.');
      setSelectedPlan(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Logo size="md" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Choose your plan
          </h1>
          <p className="text-lg text-slate-600">
            Your 15-day trial {trialEndDate ? `ended on ${formatDate(trialEndDate)}` : 'has ended'}. Select a plan to continue using ProSpaces.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6 max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative shadow-lg border-0 transition-all duration-300 ${
                selectedPlan === plan.id ? 'ring-2 ring-blue-600 scale-105' : ''
              } ${plan.popular ? 'md:scale-105' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <CardHeader className={plan.popular ? 'pt-8' : ''}>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Pricing */}
                <div className="space-y-1">
                  {plan.price > 0 ? (
                    <>
                      <div className="text-4xl font-bold text-slate-900">
                        ${plan.price}
                        <span className="text-lg text-slate-600 font-normal">/month</span>
                      </div>
                      <p className="text-sm text-slate-500">Billed monthly</p>
                    </>
                  ) : (
                    <div className="text-2xl font-bold text-slate-900">
                      Contact for pricing
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {plan.id === 'enterprise-contact' ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={onContactSupport}
                    disabled={isLoading}
                  >
                    Contact Sales
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isLoading || selectedPlan !== plan.id ? false : true}
                    variant={selectedPlan === plan.id ? 'default' : 'outline'}
                  >
                    {selectedPlan === plan.id && isLoading
                      ? 'Processing...'
                      : `Choose ${plan.name}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Support Notice */}
        <div className="max-w-2xl mx-auto bg-white rounded-lg p-6 border border-slate-200 text-center">
          <p className="text-slate-600">
            Need help choosing a plan?{' '}
            <button
              onClick={onContactSupport}
              className="text-blue-600 hover:underline font-medium"
            >
              Contact our sales team
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
