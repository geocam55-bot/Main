import { Calendar, CheckCircle2, FileText, LayoutDashboard, MessageSquare, StickyNote, Users } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface MainPanelsModuleHelpProps {
  userId: string;
  availablePanels: number;
  onOpenDashboard: () => void;
  onOpenContacts: () => void;
  onOpenDeals: () => void;
  onOpenTasks: () => void;
  onOpenAppointments: () => void;
  onOpenNotes: () => void;
  onOpenMessages: () => void;
}

export function MainPanelsModuleHelp({
  userId,
  availablePanels,
  onOpenDashboard,
  onOpenContacts,
  onOpenDeals,
  onOpenTasks,
  onOpenAppointments,
  onOpenNotes,
  onOpenMessages,
}: MainPanelsModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="main-panels-help"
      userId={userId}
      title="Home Panels Interactive Help"
      description="Use the home panel map to open the right workspace quickly and hand off cleanly between modules."
      moduleIcon={LayoutDashboard}
      triggerLabel="Home Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Identify the correct module panel before starting work to avoid context switching overhead.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Open the destination module and validate that it matches the workflow stage and ownership.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Move between modules intentionally so tasks, deals, and communication remain traceable.',
        },
      ]}
      badges={[
        { label: 'Visible Panels', value: availablePanels },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        { label: 'Open Dashboard', icon: LayoutDashboard, variant: 'outline', onClick: onOpenDashboard },
        { label: 'Open Contacts', icon: Users, variant: 'outline', onClick: onOpenContacts },
        { label: 'Open Deals', icon: FileText, variant: 'outline', onClick: onOpenDeals },
        { label: 'Open Tasks', icon: CheckCircle2, variant: 'outline', onClick: onOpenTasks },
        { label: 'Open Appointments', icon: Calendar, variant: 'outline', onClick: onOpenAppointments },
        { label: 'Open Notes', icon: StickyNote, variant: 'outline', onClick: onOpenNotes },
        { label: 'Open Message Space', icon: MessageSquare, onClick: onOpenMessages, fullWidth: true },
      ]}
    />
  );
}
