import { Copy, RotateCcw, Save, Search, Shield } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface SecurityModuleHelpProps {
  userId: string;
  selectedSpace: string;
  hasChanges: boolean;
  canEditSecurity: boolean;
  onOpenPermissionsTab: () => void;
  onOpenBulkTab: () => void;
  onOpenAuditTab: () => void;
  onShowAllSpaces: () => void;
  onClearSearch: () => void;
  onReset: () => void;
  onSave: () => void;
  onCopyRoleAccess: () => void;
}

export function SecurityModuleHelp({
  userId,
  selectedSpace,
  hasChanges,
  canEditSecurity,
  onOpenPermissionsTab,
  onOpenBulkTab,
  onOpenAuditTab,
  onShowAllSpaces,
  onClearSearch,
  onReset,
  onSave,
  onCopyRoleAccess,
}: SecurityModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="security-help"
      userId={userId}
      title="Security Module Interactive Help"
      description="Control role access by space and module with auditable, approval-ready security changes."
      moduleIcon={Shield}
      triggerLabel="Security Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Start in Hierarchy Matrix to confirm which spaces and modules are in scope for the role change.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Use bulk operations and audit context to validate the downstream impact of each permission change.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Save approved changes and hand off with audit visibility for compliance and operations.',
        },
      ]}
      badges={[
        { label: 'Selected Space', value: selectedSpace },
        { label: 'Unsaved Changes', value: hasChanges ? 'Yes' : 'No' },
        { label: 'Edit Access', value: canEditSecurity ? 'Enabled' : 'View only' },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        { label: 'Open Hierarchy Matrix', icon: Shield, variant: 'outline', onClick: onOpenPermissionsTab },
        { label: 'Open Bulk Operations', icon: Copy, variant: 'outline', onClick: onOpenBulkTab },
        { label: 'Open Audit Logs', icon: Search, variant: 'outline', onClick: onOpenAuditTab },
        { label: 'Show All Spaces', icon: Search, variant: 'outline', onClick: onShowAllSpaces },
        { label: 'Clear Search', icon: RotateCcw, variant: 'outline', onClick: onClearSearch },
        { label: 'Open Role Access Copy', icon: Copy, variant: 'outline', onClick: onCopyRoleAccess },
        { label: 'Clear Pending Changes', icon: RotateCcw, variant: 'outline', onClick: onReset },
        { label: 'Save Security Changes', icon: Save, onClick: onSave, fullWidth: true },
      ]}
    />
  );
}
