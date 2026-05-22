import { BarChart3, Globe, Mail, Target, TrendingUp, Zap } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface MarketingModuleHelpProps {
  userId: string;
  activeTab: string;
  onOpenDashboard: () => void;
  onOpenCampaigns: () => void;
  onOpenLeads: () => void;
  onOpenJourneys: () => void;
  onOpenLandingPages: () => void;
  onOpenAnalytics: () => void;
}

export function MarketingModuleHelp({
  userId,
  activeTab,
  onOpenDashboard,
  onOpenCampaigns,
  onOpenLeads,
  onOpenJourneys,
  onOpenLandingPages,
  onOpenAnalytics,
}: MarketingModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="marketing-help"
      userId={userId}
      title="Marketing Module Interactive Help"
      description="Plan campaigns, align targeting, and hand off measurable marketing execution across channels."
      moduleIcon={TrendingUp}
      triggerLabel="Marketing Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Start in Dashboard to confirm goals, audience, and channel scope before building execution assets.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Move through campaigns, scoring, journeys, and landing pages to validate assumptions and expected outcomes.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Finalize launch settings and share analytics context so teams can operate from the same source of truth.',
        },
      ]}
      badges={[
        { label: 'Active View', value: activeTab },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        { label: 'Open Dashboard', icon: BarChart3, variant: 'outline', onClick: onOpenDashboard },
        { label: 'Open Campaigns', icon: Mail, variant: 'outline', onClick: onOpenCampaigns },
        { label: 'Open Lead Scoring', icon: Target, variant: 'outline', onClick: onOpenLeads },
        { label: 'Open Journeys', icon: Zap, variant: 'outline', onClick: onOpenJourneys },
        { label: 'Open Landing Pages', icon: Globe, variant: 'outline', onClick: onOpenLandingPages },
        { label: 'Open Analytics', icon: TrendingUp, onClick: onOpenAnalytics, fullWidth: true },
      ]}
      howToGuides={[
        {
          title: 'How to launch a campaign with alignment',
          steps: [
            'Discovery: Open Dashboard and confirm the campaign objective and target audience.',
            'Scope Lock: Open Campaigns and lock messaging, channels, and schedule.',
            'Estimate: Validate audience quality with Lead Scoring and journey flow coverage.',
            'Approval: Review landing page and launch configuration with stakeholders.',
            'Handoff: Open Analytics and monitor early performance for optimization.',
          ],
        },
        {
          title: 'How to troubleshoot weak campaign performance',
          steps: [
            'Discovery: Open Analytics and identify underperforming stages or channels.',
            'Scope Lock: Trace the issue to campaign setup, lead quality, journey logic, or page conversion.',
            'Estimate: Open the related tab and quantify likely impact of each fix.',
            'Approval: Prioritize and approve the highest-impact correction first.',
            'Handoff: Publish updates and expected KPI shifts for team follow-through.',
          ],
        },
      ]}
    />
  );
}
