import { Bell, FileSpreadsheet, History, Package, RefreshCw } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface BackgroundImportsModuleHelpProps {
  userId: string;
  activeJobs: number;
  completedJobs: number;
  notificationsEnabled: boolean;
  onRefreshJobs: () => void;
  onEnableNotifications: () => void;
  onOpenImportExport: () => void;
  onOpenScheduledJobs: () => void;
  onOpenInventory: () => void;
}

export function BackgroundImportsModuleHelp({
  userId,
  activeJobs,
  completedJobs,
  notificationsEnabled,
  onRefreshJobs,
  onEnableNotifications,
  onOpenImportExport,
  onOpenScheduledJobs,
  onOpenInventory,
}: BackgroundImportsModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="background-imports-help"
      userId={userId}
      title="Background Imports Interactive Help"
      description="Track background import progress, confirm completion outcomes, and route follow-up actions quickly."
      moduleIcon={Package}
      triggerLabel="Background Imports Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Identify active imports and confirm data type scope before operational follow-up.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Refresh status, validate completion counts, and inspect failed jobs for recovery planning.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Enable alerts and route completed datasets to owning modules for execution handoff.',
        },
      ]}
      badges={[
        { label: 'Active Jobs', value: activeJobs },
        { label: 'Recent Jobs', value: completedJobs },
        { label: 'Notifications', value: notificationsEnabled ? 'On' : 'Off' },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        { label: 'Show Latest Imports', icon: RefreshCw, variant: 'outline', onClick: onRefreshJobs },
        { label: 'Open Notifications Prompt', icon: Bell, variant: 'outline', onClick: onEnableNotifications },
        { label: 'Open Import and Export', icon: FileSpreadsheet, variant: 'outline', onClick: onOpenImportExport },
        { label: 'Open Scheduled Jobs', icon: History, variant: 'outline', onClick: onOpenScheduledJobs },
        { label: 'Open Inventory Module', icon: Package, onClick: onOpenInventory, fullWidth: true },
      ]}
    />
  );
}
