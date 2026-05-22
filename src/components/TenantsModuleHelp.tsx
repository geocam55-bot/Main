import { Building2, FileText, Plus, RefreshCw, Search, Shield } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface TenantsModuleHelpProps {
  userId: string;
  totalOrganizations: number;
  activeOrganizations: number;
  onRefreshOrganizations: () => void;
  onOpenAddOrganization: () => void;
  onOpenSearchExample: (query: string) => void;
  onClearSearchAndFilters: () => void;
  onShowActiveOnly: () => void;
  onOpenAgreementView: () => void;
}

export function TenantsModuleHelp({
  userId,
  totalOrganizations,
  activeOrganizations,
  onRefreshOrganizations,
  onOpenAddOrganization,
  onOpenSearchExample,
  onClearSearchAndFilters,
  onShowActiveOnly,
  onOpenAgreementView,
}: TenantsModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="tenants-help"
      userId={userId}
      title="Organizations Module Interactive Help"
      description="Manage tenant organizations, validate governance settings, and hand off clean operational ownership."
      moduleIcon={Building2}
      triggerLabel="Organizations Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Review organization inventory and status to lock the exact tenant in scope before edits.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Validate plan, module access, and organization metadata before committing changes.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Apply approved tenant updates and preserve agreement context for operational handoff.',
        },
      ]}
      badges={[
        { label: 'Organizations', value: totalOrganizations },
        { label: 'Active', value: activeOrganizations },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        { label: 'Show Latest Organizations', icon: RefreshCw, variant: 'outline', onClick: onRefreshOrganizations },
        { label: 'Open Add Organization Form', icon: Plus, variant: 'outline', onClick: onOpenAddOrganization },
        { label: 'Open Search Example', icon: Search, variant: 'outline', onClick: () => onOpenSearchExample('acme') },
        { label: 'Show Active Organizations', icon: Shield, variant: 'outline', onClick: onShowActiveOnly },
        { label: 'Open Agreement View', icon: FileText, variant: 'outline', onClick: onOpenAgreementView },
        { label: 'Clear Search and Filters', icon: Search, onClick: onClearSearchAndFilters, fullWidth: true },
      ]}
    />
  );
}
