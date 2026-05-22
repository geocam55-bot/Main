import { Building2, CheckCircle2, RefreshCw, Settings2, Shield } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface OrganizationModuleManagerHelpProps {
  userId: string;
  totalOrganizations: number;
  selectedOrganizationName: string;
  enabledModules: number;
  totalModules: number;
  onRefreshOrganizations: () => void;
  onSelectFirstOrganization: () => void;
  onSelectNoOrganization: () => void;
  onShowEnabledModulesSummary: () => void;
}

export function OrganizationModuleManagerHelp({
  userId,
  totalOrganizations,
  selectedOrganizationName,
  enabledModules,
  totalModules,
  onRefreshOrganizations,
  onSelectFirstOrganization,
  onSelectNoOrganization,
  onShowEnabledModulesSummary,
}: OrganizationModuleManagerHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="organization-module-manager-help"
      userId={userId}
      title="Organization Module Manager Help"
      description="Control module availability per organization with clear governance and deployment-safe handoffs."
      moduleIcon={Settings2}
      triggerLabel="Module Manager Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Select the correct organization and confirm the scope before toggling module access.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Review enabled module counts and validate operational impact of each toggle change.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Apply approved toggles and hand off final module state to admin and support teams.',
        },
      ]}
      badges={[
        { label: 'Organizations', value: totalOrganizations },
        { label: 'Selected Org', value: selectedOrganizationName || 'None' },
        { label: 'Modules Enabled', value: `${enabledModules}/${totalModules}` },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        { label: 'Show Latest Organizations', icon: RefreshCw, variant: 'outline', onClick: onRefreshOrganizations },
        { label: 'Open First Organization', icon: Building2, variant: 'outline', onClick: onSelectFirstOrganization },
        { label: 'Clear Organization Selection', icon: Shield, variant: 'outline', onClick: onSelectNoOrganization },
        { label: 'Show Enabled Modules Summary', icon: CheckCircle2, onClick: onShowEnabledModulesSummary, fullWidth: true },
      ]}
    />
  );
}
