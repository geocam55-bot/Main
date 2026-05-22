import { Download, History, RefreshCw, Search, Shield, Users } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface AuditLogModuleHelpProps {
  userId: string;
  totalEvents: number;
  last24hEvents: number;
  onRefreshLogs: () => void;
  onExportCsv: () => void;
  onClearFilters: () => void;
  onShowPermissionChanges: () => void;
  onShowUserEvents: () => void;
  onOpenSearchExample: (query: string) => void;
}

export function AuditLogModuleHelp({
  userId,
  totalEvents,
  last24hEvents,
  onRefreshLogs,
  onExportCsv,
  onClearFilters,
  onShowPermissionChanges,
  onShowUserEvents,
  onOpenSearchExample,
}: AuditLogModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="audit-log-help"
      userId={userId}
      title="Audit Log Interactive Help"
      description="Trace operational events, validate change context, and hand off auditable security and process history."
      moduleIcon={History}
      triggerLabel="Audit Log Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Start with filters to isolate the correct time window, action type, and resource scope.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Inspect detailed records to validate actor, target resource, and before/after context.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Export validated records and hand off a reliable audit trail for compliance and operations.',
        },
      ]}
      badges={[
        { label: 'Total Events', value: totalEvents },
        { label: 'Last 24h', value: last24hEvents },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        { label: 'Show Latest Audit Logs', icon: RefreshCw, variant: 'outline', onClick: onRefreshLogs },
        { label: 'Open CSV Export', icon: Download, variant: 'outline', onClick: onExportCsv },
        { label: 'Open Search Example', icon: Search, variant: 'outline', onClick: () => onOpenSearchExample('permission') },
        { label: 'Show Permission Changes', icon: Shield, variant: 'outline', onClick: onShowPermissionChanges },
        { label: 'Show User Events', icon: Users, variant: 'outline', onClick: onShowUserEvents },
        { label: 'Clear Filters', icon: Search, onClick: onClearFilters, fullWidth: true },
      ]}
    />
  );
}
