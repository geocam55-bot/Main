import { Calendar, CalendarDays, Link2, List, Plus, RefreshCw } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface AppointmentsModuleHelpProps {
  userId: string;
  totalAppointments: number;
  connectedCalendars: number;
  onShowList: () => void;
  onShowWeek: () => void;
  onShowMonth: () => void;
  onOpenCalendarSetup: () => void;
  onSyncCalendar: () => void;
  onOpenAddAppointment: () => void;
}

export function AppointmentsModuleHelp({
  userId,
  totalAppointments,
  connectedCalendars,
  onShowList,
  onShowWeek,
  onShowMonth,
  onOpenCalendarSetup,
  onSyncCalendar,
  onOpenAddAppointment,
}: AppointmentsModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="appointments-help"
      userId={userId}
      title="Appointments Module Interactive Help"
      description="Plan calendars, coordinate meetings, and hand off reliable schedule context to your team."
      moduleIcon={Calendar}
      triggerLabel="Appointments Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Choose the right calendar view and capture complete appointment details before publishing.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Review timing, attendees, and linked contacts to prevent scheduling conflicts and missed context.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Sync calendars and confirm visibility so stakeholders can execute from a single trusted schedule.',
        },
      ]}
      badges={[
        { label: 'Appointments', value: totalAppointments },
        { label: 'Connected Calendars', value: connectedCalendars },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        { label: 'Show List View', icon: List, variant: 'outline', onClick: onShowList },
        { label: 'Show Week View', icon: CalendarDays, variant: 'outline', onClick: onShowWeek },
        { label: 'Show Month View', icon: CalendarDays, variant: 'outline', onClick: onShowMonth },
        { label: 'Open Calendar Setup', icon: Link2, variant: 'outline', onClick: onOpenCalendarSetup },
        { label: 'Open Calendar Sync', icon: RefreshCw, variant: 'outline', onClick: onSyncCalendar },
        { label: 'Open Add Appointment Form', icon: Plus, onClick: onOpenAddAppointment, fullWidth: true },
      ]}
      howToGuides={[
        {
          title: 'How to schedule a new appointment with contact context',
          steps: [
            'Discovery: Open Add Appointment Form from the toolbar.',
            'Scope Lock: Enter title, date, start/end time, and location.',
            'Scope Lock: Add description and link the appointment to the correct contact.',
            'Estimate: Verify duration and meeting details before saving.',
            'Approval/Handoff: Save and confirm the appointment appears in your active view.',
          ],
        },
        {
          title: 'How to keep team calendars aligned',
          steps: [
            'Discovery: Open Calendar Setup and confirm connected provider accounts.',
            'Scope Lock: Choose the right operational view (list/week/month) for validation.',
            'Estimate: Run Sync Calendars and check imported or updated events.',
            'Approval: Resolve any conflicts or missing details in appointment records.',
            'Handoff: Confirm the final schedule is visible for all execution stakeholders.',
          ],
        },
      ]}
    />
  );
}