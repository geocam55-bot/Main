import { Activity, BarChart3, Calendar, CheckSquare, FileText, LayoutDashboard } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface DashboardModuleHelpProps {
  userId: string;
  openDeals: number;
  pipelineValue: number;
  taskCount: number;
  appointmentCount: number;
  onRefresh: () => void;
  onOpenDeals: () => void;
  onOpenTasks: () => void;
  onOpenAppointments: () => void;
}

export function DashboardModuleHelp({
  userId,
  openDeals,
  pipelineValue,
  taskCount,
  appointmentCount,
  onRefresh,
  onOpenDeals,
  onOpenTasks,
  onOpenAppointments,
}: DashboardModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="dashboard-help"
      userId={userId}
      title="Dashboard Module Interactive Help"
      description="Review pipeline health, validate operational load, and route work into execution modules."
      moduleIcon={LayoutDashboard}
      triggerLabel="Dashboard Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Use core metrics to identify pipeline posture, workload pressure, and immediate priorities.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Validate trend signals and confirm where follow-up tasks, appointments, and deal actions are required.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Send approved next actions into Deals, Tasks, and Appointments with clear ownership.',
        },
      ]}
      badges={[
        { label: 'Open Deals', value: openDeals },
        { label: 'Pipeline Value', value: `$${pipelineValue.toFixed(0)}` },
        { label: 'Tasks', value: taskCount },
        { label: 'Appointments', value: appointmentCount },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        { label: 'Show Latest Dashboard', icon: Activity, variant: 'outline', onClick: onRefresh },
        { label: 'Open Deals', icon: FileText, variant: 'outline', onClick: onOpenDeals },
        { label: 'Open Tasks', icon: CheckSquare, variant: 'outline', onClick: onOpenTasks },
        { label: 'Open Appointments', icon: Calendar, variant: 'outline', onClick: onOpenAppointments },
        { label: 'Show Pipeline Charts', icon: BarChart3, variant: 'outline', onClick: onRefresh },
      ]}
      howToGuides={[
        {
          title: 'How to run a quick daily dashboard sweep',
          steps: [
            'Discovery: Review open deals, pipeline value, tasks, and appointments.',
            'Scope Lock: Identify the highest-risk gaps that require action today.',
            'Estimate: Validate trend and status data before assigning work.',
            'Approval: Confirm priorities with owners and expected completion windows.',
            'Handoff: Open the destination modules and execute each action path.',
          ],
        },
      ]}
    />
  );
}
