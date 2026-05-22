import { useEffect, useState } from 'react';
import { getCurrentSubscription } from '../utils/subscription-client';
import { AlertCircle, Clock } from 'lucide-react';

interface TrialCountdownProps {
  variant?: 'banner' | 'badge';
  className?: string;
}

export function TrialCountdown({ variant = 'banner', className = '' }: TrialCountdownProps) {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrialInfo = async () => {
      try {
        const subscription = await getCurrentSubscription();
        if (subscription?.trial_end && subscription.status === 'trialing') {
          const trialEnd = new Date(subscription.trial_end);
          const now = new Date();
          const diff = trialEnd.getTime() - now.getTime();
          const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
          setDaysLeft(Math.max(0, days));
        }
      } catch (error) {
        // Silently fail - user may not be on trial
      } finally {
        setLoading(false);
      }
    };

    fetchTrialInfo();

    // Refresh every minute to keep count accurate
    const interval = setInterval(fetchTrialInfo, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading || daysLeft === null) {
    return null;
  }

  if (variant === 'badge') {
    if (daysLeft > 7) {
      return (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 ${className}`}>
          <Clock className="w-4 h-4" />
          <span>{daysLeft} days left</span>
        </div>
      );
    } else if (daysLeft > 0) {
      return (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700 ${className}`}>
          <AlertCircle className="w-4 h-4" />
          <span>{daysLeft} day{daysLeft === 1 ? '' : 's'} left!</span>
        </div>
      );
    } else {
      return (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 ${className}`}>
          <AlertCircle className="w-4 h-4" />
          <span>Trial ended</span>
        </div>
      );
    }
  }

  // Banner variant
  if (daysLeft === 0) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3 ${className}`}>
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-900">Your trial has ended</h3>
          <p className="text-sm text-red-700 mt-1">Please select a plan to continue using ProSpaces.</p>
        </div>
      </div>
    );
  }

  if (daysLeft <= 3) {
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3 ${className}`}>
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-amber-900">Your trial expires in {daysLeft} day{daysLeft === 1 ? '' : 's'}</h3>
          <p className="text-sm text-amber-700 mt-1">Upgrade to a paid plan to keep your data and continue working.</p>
        </div>
      </div>
    );
  }

  if (daysLeft <= 7) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3 ${className}`}>
        <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-blue-900">Your trial expires in {daysLeft} days</h3>
          <p className="text-sm text-blue-700 mt-1">Plan ahead and select your subscription to avoid any interruption.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 flex items-start gap-3 ${className}`}>
      <Clock className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="font-semibold text-slate-900">Free trial: {daysLeft} days remaining</h3>
        <p className="text-sm text-slate-600 mt-1">Explore all features. Upgrade anytime to continue after your trial ends.</p>
      </div>
    </div>
  );
}
