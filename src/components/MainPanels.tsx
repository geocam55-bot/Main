import { ChevronRight, Users, FileText, CheckCircle2, Calendar, StickyNote, Folder, LayoutDashboard, MessageSquare } from 'lucide-react';
import type { User, Organization } from '../App';
import { canView } from '../utils/permissions';
import { MainPanelsModuleHelp } from './MainPanelsModuleHelp';

interface MainPanelsProps {
  user: User;
  organization?: Organization | null;
  onNavigate?: (view: string) => void;
}

export function MainPanels({ user, organization, onNavigate }: MainPanelsProps) {
  const modulePanels = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'View KPI snapshots, pipeline health, and performance trends across your CRM.',
      icon: LayoutDashboard,
      gradient: 'from-indigo-500 to-blue-600',
      shadow: 'shadow-indigo-500/20',
      accent: 'bg-indigo-500',
      show: true,
    },
    {
      id: 'contacts',
      label: 'Contacts',
      description: 'Manage customers, vendors, and key relationships in one organized workspace.',
      icon: Users,
      gradient: 'from-cyan-500 to-blue-600',
      shadow: 'shadow-cyan-500/20',
      accent: 'bg-cyan-500',
      show: canView('contacts', user.role),
    },
    {
      id: 'bids',
      label: 'Deals',
      description: 'Track opportunities from proposal to close with clear status and value visibility.',
      icon: FileText,
      gradient: 'from-orange-500 to-red-600',
      shadow: 'shadow-orange-500/20',
      accent: 'bg-orange-500',
      show: canView('bids', user.role),
    },
    {
      id: 'tasks',
      label: 'Tasks',
      description: 'Keep every follow-up and internal action on track with priority-aware task lists.',
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/20',
      accent: 'bg-emerald-500',
      show: canView('tasks', user.role),
    },
    {
      id: 'appointments',
      label: 'Appointments',
      description: 'Schedule meetings and site visits with timeline visibility for the full team.',
      icon: Calendar,
      gradient: 'from-indigo-500 to-purple-600',
      shadow: 'shadow-indigo-500/20',
      accent: 'bg-indigo-500',
      show: organization?.appointments_enabled !== false && canView('appointments', user.role),
    },
    {
      id: 'notes',
      label: 'Notes',
      description: 'Capture project context, call summaries, and internal updates in one place.',
      icon: StickyNote,
      gradient: 'from-violet-500 to-fuchsia-600',
      shadow: 'shadow-violet-500/20',
      accent: 'bg-violet-500',
      show: canView('notes', user.role),
    },
    {
      id: 'documents',
      label: 'Documents',
      description: 'Store contracts, photos, and project files with cleaner access for your team.',
      icon: Folder,
      gradient: 'from-slate-500 to-gray-700',
      shadow: 'shadow-slate-500/20',
      accent: 'bg-slate-500',
      show: organization?.documents_enabled !== false && canView('documents', user.role),
    },
    {
      id: 'messages',
      label: 'Message Space',
      description: 'Team chats, direct messages, customer portal conversations, and internal notes — all in one place.',
      icon: MessageSquare,
      gradient: 'from-cyan-400 to-sky-600',
      shadow: 'shadow-cyan-500/20',
      accent: 'bg-cyan-400',
      show: true,
    },
  ].filter((panel) => panel.show);

  return (
    <div className="min-h-screen bg-slate-100 text-foreground">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 lg:text-5xl">
            Welcome back, {user.full_name?.split(' ')[0] || 'there'}
          </h1>
          <p className="mt-3 text-xl text-slate-500">Choose a panel to start working.</p>
        </div>

        <div className="flex justify-end">
          <MainPanelsModuleHelp
            userId={user.id}
            availablePanels={modulePanels.length}
            onOpenDashboard={() => onNavigate?.('dashboard')}
            onOpenContacts={() => onNavigate?.('contacts')}
            onOpenDeals={() => onNavigate?.('bids')}
            onOpenTasks={() => onNavigate?.('tasks')}
            onOpenAppointments={() => onNavigate?.('appointments')}
            onOpenNotes={() => onNavigate?.('notes')}
            onOpenMessages={() => onNavigate?.('messages')}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {modulePanels.map((panel) => {
            const Icon = panel.icon;
            return (
              <button
                key={panel.id}
                onClick={() => onNavigate?.(panel.id)}
                className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left transition-all duration-200 hover:border-slate-300 hover:shadow-lg ${panel.shadow}`}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${panel.gradient}`} />
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${panel.gradient} shadow-lg ${panel.shadow}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-1.5 text-lg font-semibold text-slate-900">{panel.label}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{panel.description}</p>
                <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition-all group-hover:gap-3">
                  Open module
                  <ChevronRight className="h-4 w-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
