import { Building2, LayoutGrid, Palette, Save, Settings, Users, Wrench } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface SettingsModuleHelpProps {
  userId: string;
  onOpenProfileTab: () => void;
  onOpenOrganizationTab: () => void;
  onOpenModuleDefaultsTab: () => void;
  onOpenAppearanceTab: () => void;
  onOpenDiagnosticsTab: () => void;
  onOpenWorkflowDialog: () => void;
  onOpenCustomFieldsDialog: () => void;
  onResetHelpTours: () => void;
  onSaveAppearanceSettings: () => void;
}

export function SettingsModuleHelp({
  userId,
  onOpenProfileTab,
  onOpenOrganizationTab,
  onOpenModuleDefaultsTab,
  onOpenAppearanceTab,
  onOpenDiagnosticsTab,
  onOpenWorkflowDialog,
  onOpenCustomFieldsDialog,
  onResetHelpTours,
  onSaveAppearanceSettings,
}: SettingsModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="settings-help"
      userId={userId}
      title="Settings Module Interactive Help"
      description="Configure profile, organization, and module defaults with consistent governance and handoff-ready settings."
      moduleIcon={Settings}
      triggerLabel="Settings Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Open the relevant settings area and confirm whether changes are user-level or organization-level.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Validate workflow, custom-field, and appearance impacts before persisting defaults.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Save approved settings and reset help tours when onboarding requires a clean guided start.',
        },
      ]}
      badges={[
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        { label: 'Open Profile', icon: Users, variant: 'outline', onClick: onOpenProfileTab },
        { label: 'Open Organization', icon: Building2, variant: 'outline', onClick: onOpenOrganizationTab },
        { label: 'Open Module Defaults', icon: Wrench, variant: 'outline', onClick: onOpenModuleDefaultsTab },
        { label: 'Open Appearance', icon: Palette, variant: 'outline', onClick: onOpenAppearanceTab },
        { label: 'Open Diagnostics', icon: LayoutGrid, variant: 'outline', onClick: onOpenDiagnosticsTab },
        { label: 'Open Workflow Settings', icon: Wrench, variant: 'outline', onClick: onOpenWorkflowDialog },
        { label: 'Open Custom Fields', icon: LayoutGrid, variant: 'outline', onClick: onOpenCustomFieldsDialog },
        { label: 'Reset Help Tours', icon: Wrench, variant: 'outline', onClick: onResetHelpTours },
        { label: 'Save Appearance Settings', icon: Save, onClick: onSaveAppearanceSettings, fullWidth: true },
      ]}
    />
  );
}
