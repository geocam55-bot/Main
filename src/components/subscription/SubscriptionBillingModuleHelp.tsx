import { CreditCard, Download, LayoutGrid, Receipt, RefreshCw, Sparkles, Users } from 'lucide-react';
import { InteractiveModuleHelp } from '../InteractiveModuleHelp';

interface SubscriptionBillingModuleHelpProps {
  userId: string;
  activeTab: string;
  eventCount: number;
  teamSubscriptions: number;
  isAdmin: boolean;
  onRefreshBilling: () => void;
  onOpenOverview: () => void;
  onOpenPlans: () => void;
  onOpenPayment: () => void;
  onOpenHistory: () => void;
  onOpenTeam: () => void;
  onStartPlanSelection: () => void;
}

export function SubscriptionBillingModuleHelp({
  userId,
  activeTab,
  eventCount,
  teamSubscriptions,
  isAdmin,
  onRefreshBilling,
  onOpenOverview,
  onOpenPlans,
  onOpenPayment,
  onOpenHistory,
  onOpenTeam,
  onStartPlanSelection,
}: SubscriptionBillingModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="subscription-billing-help"
      userId={userId}
      title="Subscription and Billing Help"
      description="Manage plan lifecycle, payment readiness, and billing history with auditable team handoffs."
      moduleIcon={CreditCard}
      triggerLabel="Billing Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Review current plan and billing status to lock the scope of subscription changes.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Compare plans, validate payment method readiness, and review history for continuity.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Apply approved billing changes and hand off usage and billing context to stakeholders.',
        },
      ]}
      badges={[
        { label: 'Active View', value: activeTab },
        { label: 'History Events', value: eventCount },
        { label: 'Team Plans', value: teamSubscriptions },
        { label: 'Admin Access', value: isAdmin ? 'Yes' : 'No' },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        { label: 'Show Latest Billing Data', icon: RefreshCw, variant: 'outline', onClick: onRefreshBilling },
        { label: 'Open Overview', icon: LayoutGrid, variant: 'outline', onClick: onOpenOverview },
        { label: 'Open Plans', icon: Sparkles, variant: 'outline', onClick: onOpenPlans },
        { label: 'Open Payment', icon: CreditCard, variant: 'outline', onClick: onOpenPayment },
        { label: 'Open History', icon: Receipt, variant: 'outline', onClick: onOpenHistory },
        { label: 'Open Team Billing', icon: Users, variant: 'outline', onClick: onOpenTeam },
        { label: 'Open Plan Selection', icon: Download, onClick: onStartPlanSelection, fullWidth: true },
      ]}
    />
  );
}
