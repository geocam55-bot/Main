import { Activity, BarChart3, FileText, LayoutDashboard, Users } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface TeamDashboardModuleHelpProps {
  userId: string;
  activeTab: string;
  opportunities: number;
  teamMembers: number;
  onRefresh: () => void;
  onOpenOverview: () => void;
  onOpenAgents: () => void;
  onOpenDealsTab: () => void;
  onOpenDealsModule: () => void;
}

export function TeamDashboardModuleHelp({
  userId,
  activeTab,
  opportunities,
  teamMembers,
  onRefresh,
  onOpenOverview,
  onOpenAgents,
  onOpenDealsTab,
  onOpenDealsModule,
}: TeamDashboardModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="team-dashboard-help"
      userId={userId}
      title="Team Dashboard Interactive Help"
      description="Monitor team performance, align opportunity ownership, and hand off priorities with clarity."
      moduleIcon={LayoutDashboard}
      triggerLabel="Team Dashboard Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Start in Overview to confirm team pipeline health and decide where management attention is required.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Review Agents and Deals tabs to validate owner capacity, progress, and expected outcomes.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Finalize owner-level actions and route execution to Deals and other operating modules.',
        },
      ]}
      badges={[
        { label: 'Active Tab', value: activeTab },
        { label: 'Opportunities', value: opportunities },
        { label: 'Team Members', value: teamMembers },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        { label: 'Show Latest Team Dashboard', icon: Activity, variant: 'outline', onClick: onRefresh },
        { label: 'Open Overview Tab', icon: BarChart3, variant: 'outline', onClick: onOpenOverview },
        { label: 'Open Agents Tab', icon: Users, variant: 'outline', onClick: onOpenAgents },
        { label: 'Open Deals Tab', icon: FileText, variant: 'outline', onClick: onOpenDealsTab },
        { label: 'Open Deals Module', icon: FileText, onClick: onOpenDealsModule, fullWidth: true },
      ]}
      howToGuides={[
        {
          title: 'How to run a weekly team performance review',
          steps: [
            'Discovery: Open Overview and identify trend, pipeline, and risk signals.',
            'Scope Lock: Move to Agents to verify workload and owner-level performance.',
            'Estimate: Open Deals tab to validate stage movement and expected close outcomes.',
            'Approval: Confirm intervention priorities and owner assignments.',
            'Handoff: Open Deals module and execute the agreed action plan.',
          ],
        },
      ]}
    />
  );
}
