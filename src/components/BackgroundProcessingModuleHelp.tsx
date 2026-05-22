import { Clock3, PlayCircle, RefreshCw, Settings2 } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface BackgroundProcessingModuleHelpProps {
  userId: string;
  onRefreshStatus: () => void;
  onOpenScheduledJobs: () => void;
  onOpenBackgroundImports: () => void;
  onShowProcessingCadence: () => void;
  onRunDueJobsCheck?: () => void;
}

export function BackgroundProcessingModuleHelp({
  userId,
  onRefreshStatus,
  onOpenScheduledJobs,
  onOpenBackgroundImports,
  onShowProcessingCadence,
  onRunDueJobsCheck,
}: BackgroundProcessingModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  const actions = [
    { label: 'Open Scheduled Jobs', icon: Clock3, variant: 'outline' as const, onClick: onOpenScheduledJobs },
    { label: 'Open Background Imports', icon: Settings2, variant: 'outline' as const, onClick: onOpenBackgroundImports },
    { label: 'Show Processing Status', icon: RefreshCw, variant: 'outline' as const, onClick: onRefreshStatus },
    { label: 'Show Processing Cadence', icon: Clock3, variant: 'outline' as const, onClick: onShowProcessingCadence },
    ...(onRunDueJobsCheck
      ? [{ label: 'Open Due Jobs Check', icon: PlayCircle, onClick: onRunDueJobsCheck, fullWidth: true }]
      : []),
  ];

  return (
    <InteractiveModuleHelp
      moduleKey="background-processing-help"
      userId={userId}
      title="Background Processing Interactive Help"
      description="Understand and operate automated job polling and due-job execution from visible job management screens."
      moduleIcon={Settings2}
      triggerLabel="Processor Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Identify which queue you need to monitor first: scheduled jobs or background imports.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Refresh status and validate polling cadence before forcing a manual due-job check.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Confirm processor outcomes and hand off final job state with clear status context.',
        },
      ]}
      badges={[
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={actions}
      howToGuides={[
        {
          title: 'How to verify background processing health',
          steps: [
            'Discovery: Open Scheduled Jobs and Background Imports to identify active queues.',
            'Scope Lock: Confirm the expected job type and scheduled timing window.',
            'Estimate: Refresh status and compare with expected polling behavior.',
            'Approval: Run a due-jobs check when immediate validation is required.',
            'Handoff: Record final status and escalate only failed jobs with context.',
          ],
        },
      ]}
    />
  );
}
