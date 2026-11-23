import { useState } from 'react';
import { Users, FileText, CheckCircle2, Calendar, StickyNote, Folder, LayoutDashboard, MessageSquare } from 'lucide-react';
import type { User, Organization } from '../App';
import { canView } from '../utils/permissions';
import { MainPanelsModuleHelp } from './MainPanelsModuleHelp';

interface MainPanelsProps {
  user: User;
  organization?: Organization | null;
  onNavigate?: (view: string) => void;
}

export function MainPanels({ user, organization, onNavigate }: MainPanelsProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const modulePanels = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'View KPI snapshots, pipeline health, and performance trends across your CRM.',
      icon: LayoutDashboard,
      gradient: 'from-indigo-500 to-blue-600',
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
      show: true,
    },
    {
      id: 'contacts',
      label: 'Contacts',
      description: 'Manage customers, vendors, and key relationships in one organized workspace.',
      icon: Users,
      gradient: 'from-cyan-500 to-blue-600',
      iconBg: 'bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20',
      show: canView('contacts', user.role),
    },
    {
      id: 'bids',
      label: 'Deals',
      description: 'Track opportunities from proposal to close with clear status and value visibility.',
      icon: FileText,
      gradient: 'from-orange-500 to-red-600',
      iconBg: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
      show: canView('bids', user.role),
    },
    {
      id: 'tasks',
      label: 'Tasks',
      description: 'Keep every follow-up and internal action on track with priority-aware task lists.',
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
      show: canView('tasks', user.role),
    },
    {
      id: 'appointments',
      label: 'Appointments',
      description: 'Schedule meetings and site visits with timeline visibility for the full team.',
      icon: Calendar,
      gradient: 'from-indigo-500 to-purple-600',
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
      show: organization?.appointments_enabled !== false && canView('appointments', user.role),
    },
    {
      id: 'notes',
      label: 'Notes',
      description: 'Capture project context, call summaries, and internal updates in one place.',
      icon: StickyNote,
      gradient: 'from-violet-500 to-fuchsia-600',
      iconBg: 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20',
      show: canView('notes', user.role),
    },
    {
      id: 'documents',
      label: 'Documents',
      description: 'Store contracts, photos, and project files with cleaner access for your team.',
      icon: Folder,
      gradient: 'from-slate-500 to-gray-600',
      iconBg: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/20',
      show: organization?.documents_enabled !== false && canView('documents', user.role),
    },
    {
      id: 'messages',
      label: 'Message Space',
      description: 'Team chats, direct messages, customer portal conversations, and internal notes — all in one place.',
      icon: MessageSquare,
      gradient: 'from-cyan-400 to-sky-600',
      iconBg: 'bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20',
      show: true,
    },
  ].filter((panel) => panel.show);

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto text-slate-900 dark:text-slate-100">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Welcome back, {user.full_name?.split(' ')[0] || 'there'}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Your Sales workspace command center. Hover over any module for details or click to launch.
          </p>
        </div>

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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {modulePanels.map((panel) => {
          const Icon = panel.icon;
          const isTooltipActive = activeTooltip === panel.id;

          return (
            <div
              key={panel.id}
              className="relative group"
              onMouseEnter={() => setActiveTooltip(panel.id)}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <button
                type="button"
                onClick={() => onNavigate?.(panel.id)}
                className="w-full bg-white hover:bg-slate-50/90 dark:bg-slate-900/90 dark:hover:bg-slate-800/90 border border-slate-200 hover:border-blue-400 dark:border-slate-800 dark:hover:border-blue-500/50 rounded-2xl p-5 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-lg dark:shadow-lg flex flex-col items-center text-center relative overflow-hidden group-hover:-translate-y-1"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${panel.gradient} opacity-80 group-hover:opacity-100`} />
                <div className={`w-14 h-14 rounded-2xl ${panel.iconBg} border flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-300 transition-colors mb-1">
                  {panel.label}
                </h3>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Module
                </span>
              </button>

              {isTooltipActive && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 p-3.5 bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md z-50 text-left pointer-events-none">
                  <div className="flex items-center space-x-1.5 mb-1 text-xs font-bold text-slate-900 dark:text-white">
                    <span>{panel.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {panel.description}
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                    <span>Click to open module</span>
                    <span>&rarr;</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
