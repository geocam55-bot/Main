import { ArrowLeft, CalendarClock, History, PlayCircle, RefreshCw } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface ScheduledJobsModuleHelpProps {
  userId: string;
  pendingJobs: number;
  completedJobs: number;
  onOpenImportExport: () => void;
  onRefreshJobs: () => void;
  onProcessDueJobs: () => void;
  onShowPendingGuidance: () => void;
  onShowHistoryGuidance: () => void;
}

export function ScheduledJobsModuleHelp({
  userId,
  pendingJobs,
  completedJobs,
  onOpenImportExport,
  onRefreshJobs,
  onProcessDueJobs,
  onShowPendingGuidance,
  onShowHistoryGuidance,
}: ScheduledJobsModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="scheduled-jobs-help"
      userId={userId}
      title="Scheduled Jobs Interactive Help"
      description="Monitor timed import/export execution, validate job outcomes, and hand off reliable job history."
      moduleIcon={CalendarClock}
      triggerLabel="Scheduled Jobs Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Review pending jobs and confirm each schedule aligns with data movement priorities.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Refresh and process due jobs, then validate completion records and failure diagnostics.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Hand off final job history with clear status and record counts for auditability.',
        },
      ]}
      badges={[
        { label: 'Pending Jobs', value: pendingJobs },
        { label: 'History Entries', value: completedJobs },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        { label: 'Open Import and Export', icon: ArrowLeft, variant: 'outline', onClick: onOpenImportExport },
        { label: 'Show Latest Jobs', icon: RefreshCw, variant: 'outline', onClick: onRefreshJobs },
        { label: 'Open Due Jobs Check', icon: PlayCircle, variant: 'outline', onClick: onProcessDueJobs },
        { label: 'Show Pending Jobs Guidance', icon: CalendarClock, variant: 'outline', onClick: onShowPendingGuidance },
        { label: 'Show Job History Guidance', icon: History, onClick: onShowHistoryGuidance, fullWidth: true },
      ]}
    />
  );
}
