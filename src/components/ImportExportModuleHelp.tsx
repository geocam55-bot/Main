import { Calendar, Download, History, Upload, Wrench } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface ImportExportModuleHelpProps {
  userId: string;
  activeTab: string;
  isImporting: boolean;
  isExporting: boolean;
  onOpenImportTab: () => void;
  onOpenExportTab: () => void;
  onOpenBackgroundImports: () => void;
  onOpenScheduledJobs: () => void;
  onOpenScheduleDialog: () => void;
}

export function ImportExportModuleHelp({
  userId,
  activeTab,
  isImporting,
  isExporting,
  onOpenImportTab,
  onOpenExportTab,
  onOpenBackgroundImports,
  onOpenScheduledJobs,
  onOpenScheduleDialog,
}: ImportExportModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="import-export-help"
      userId={userId}
      title="Import and Export Interactive Help"
      description="Prepare clean data movement workflows and hand off reliable imports, exports, and scheduled jobs."
      moduleIcon={Wrench}
      triggerLabel="Import/Export Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Confirm dataset type and data quality before choosing import or export execution path.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Use mapping, preview, and scheduling controls to validate processing risk and timing.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Route jobs to background processing and scheduled queues for traceable execution handoffs.',
        },
      ]}
      badges={[
        { label: 'Active Tab', value: activeTab },
        { label: 'Importing', value: isImporting ? 'Yes' : 'No' },
        { label: 'Exporting', value: isExporting ? 'Yes' : 'No' },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        { label: 'Open Import Tab', icon: Upload, variant: 'outline', onClick: onOpenImportTab },
        { label: 'Open Export Tab', icon: Download, variant: 'outline', onClick: onOpenExportTab },
        { label: 'Open Background Imports', icon: Upload, variant: 'outline', onClick: onOpenBackgroundImports },
        { label: 'Open Scheduled Jobs', icon: History, variant: 'outline', onClick: onOpenScheduledJobs },
        { label: 'Open Schedule Dialog', icon: Calendar, onClick: onOpenScheduleDialog, fullWidth: true },
      ]}
    />
  );
}
