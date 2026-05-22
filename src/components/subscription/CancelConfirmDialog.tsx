import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { formatDate, type Subscription, type PlanId } from '../../utils/subscription-client';

interface CancelConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription;
  actionLoading: boolean;
  onConfirmCancel: (immediate: boolean) => void;
}

const PLAN_NAMES: Record<PlanId, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

export function CancelConfirmDialog({
  open,
  onOpenChange,
  subscription,
  actionLoading,
  onConfirmCancel,
}: CancelConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [cancelImmediately, setCancelImmediately] = useState(false);

  const planName = PLAN_NAMES[subscription.plan_id] || subscription.plan_id;
  const isConfirmed = confirmText.toLowerCase() === 'cancel';

  const handleConfirm = () => {
    if (!isConfirmed) return;
    onConfirmCancel(cancelImmediately);
    setConfirmText('');
    setCancelImmediately(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => {
      if (!v) {
        setConfirmText('');
        setCancelImmediately(false);
      }
      onOpenChange(v);
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <AlertDialogTitle className="text-lg">Cancel Subscription?</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                You're about to cancel your <strong>{planName}</strong> plan. Here's what will happen:
              </p>

              <div className="p-3 rounded-lg bg-muted border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current plan</span>
                  <Badge variant="secondary">{planName}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Access until</span>
                  <span className="font-medium text-foreground">{formatDate(subscription.current_period_end)}</span>
                </div>
              </div>

              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Your data will be preserved but access to paid features will end</li>
                <li>Active users beyond the free tier limit will be deactivated</li>
                <li>You can reactivate at any time to restore full access</li>
                <li>No further charges will be made after the current period</li>
              </ul>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cancelImmediately}
                    onChange={(e) => setCancelImmediately(e.target.checked)}
                    className="rounded border-border text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-red-600 font-medium">
                    Cancel immediately (lose access now instead of at period end)
                  </span>
                </label>
              </div>

              <div className="pt-1">
                <Label className="text-xs text-muted-foreground">
                  Type <strong className="text-foreground">cancel</strong> to confirm
                </Label>
                <Input
                  placeholder="Type 'cancel' to confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="mt-1"
                  autoFocus
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={actionLoading}>
            Keep Subscription
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmed || actionLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {actionLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Canceling...
              </>
            ) : cancelImmediately ? (
              'Cancel Immediately'
            ) : (
              'Cancel at Period End'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
