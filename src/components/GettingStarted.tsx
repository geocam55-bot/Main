/**
 * GettingStarted — onboarding checklist shown to new users.
 *
 * Appears as a collapsible panel at the bottom-right of the screen the first
 * time a user logs in.  Each item links to a specific module and can optionally
 * launch that module's guided tour.
 *
 * Progress is persisted in localStorage per user.
 */
import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  FileText,
  LayoutDashboard,
  Package,
  Rocket,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '../utils/permissions';

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  navigateTo: string;
  /** Roles that should see this item. Omit to show to all roles. */
  roles?: UserRole[];
}

const ALL_ITEMS: ChecklistItem[] = [
  {
    id: 'explore-dashboard',
    label: 'Explore the Dashboard',
    description: 'Get a quick overview of your key metrics and activity.',
    icon: LayoutDashboard,
    navigateTo: 'dashboard',
  },
  {
    id: 'add-first-contact',
    label: 'Add your first contact',
    description: 'Contacts are the foundation of quotes, deals, and campaigns.',
    icon: Users,
    navigateTo: 'contacts',
  },
  {
    id: 'create-first-quote',
    label: 'Create a quote or bid',
    description: 'Build a professional quote and send it to a customer.',
    icon: FileText,
    navigateTo: 'bids',
  },
  {
    id: 'add-inventory-item',
    label: 'Add an inventory item',
    description: 'Your inventory catalog powers quotes and planners.',
    icon: Package,
    navigateTo: 'inventory',
  },
  {
    id: 'try-a-planner',
    label: 'Try a Project Planner',
    description: 'Use the Deck, Roof, Shed or Kitchen planner to estimate a project.',
    icon: Rocket,
    navigateTo: 'project-wizards',
  },
  {
    id: 'configure-settings',
    label: 'Configure your settings',
    description: 'Set tax rates, export templates, and organization defaults.',
    icon: Settings,
    navigateTo: 'settings',
    roles: ['admin', 'super_admin'],
  },
];

interface GettingStartedProps {
  userId: string;
  userRole: UserRole;
  onNavigate: (view: string) => void;
}

function storageKey(userId: string) {
  return `prospaces.getting-started.${userId}`;
}

function dismissKey(userId: string) {
  return `prospaces.getting-started.dismissed.${userId}`;
}

export function GettingStarted({ userId, userRole, onNavigate }: GettingStartedProps) {
  const items = ALL_ITEMS.filter((item) => !item.roles || item.roles.includes(userRole));

  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(storageKey(userId));
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem(dismissKey(userId)) === 'true';
  });

  const [collapsed, setCollapsed] = useState(false);

  // Persist checked state
  useEffect(() => {
    localStorage.setItem(storageKey(userId), JSON.stringify(checked));
  }, [checked, userId]);

  const completedCount = items.filter((item) => checked[item.id]).length;
  const allDone = completedCount === items.length;

  const handleNavigate = (item: ChecklistItem) => {
    setChecked((prev) => ({ ...prev, [item.id]: true }));
    // Signal that the target module should auto-start its guided tour
    sessionStorage.setItem('prospaces.pending-tour', item.navigateTo);
    window.dispatchEvent(new CustomEvent('prospaces:tour-starting'));
    onNavigate(item.navigateTo);
    // Fire after navigation so mounted module help can explicitly start from step 1.
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('prospaces:start-tour', { detail: { key: item.navigateTo } }));
    }, 0);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(dismissKey(userId), 'true');
  };

  const handleReset = () => {
    setChecked({});
    setDismissed(false);
    localStorage.removeItem(storageKey(userId));
    sessionStorage.removeItem(dismissKey(userId));
  };

  if (dismissed) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
      style={{ maxHeight: collapsed ? 56 : 480 }}
    >
      {/* Header */}
      <div
        className="flex cursor-pointer items-center justify-between border-b border-border bg-blue-600 px-4 py-3"
        onClick={() => setCollapsed((p) => !p)}
      >
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-white" />
          <span className="text-sm font-semibold text-white">Getting Started</span>
          <Badge className="bg-white/20 text-white text-xs border-0 hover:bg-white/30">
            {completedCount}/{items.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {collapsed ? (
            <ChevronUp className="h-4 w-4 text-white/80" />
          ) : (
            <ChevronDown className="h-4 w-4 text-white/80" />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            className="ml-1 rounded p-0.5 text-white/70 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Progress bar */}
          <div className="h-1 bg-blue-100">
            <div
              className="h-1 bg-blue-500 transition-all duration-500"
              style={{ width: `${(completedCount / items.length) * 100}%` }}
            />
          </div>

          {/* Checklist */}
          <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
            {allDone && (
              <div className="px-4 py-3 bg-green-50 border-b border-green-100 text-sm text-green-700 font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                All done — you\'re ready to go!
              </div>
            )}
            <ul className="divide-y divide-border">
              {items.map((item) => {
                const Icon = item.icon;
                const done = !!checked[item.id];
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleNavigate(item)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${done ? 'opacity-60' : ''}`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {done ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-medium leading-tight ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {item.label}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground leading-snug">
                          {item.description}
                        </div>
                      </div>
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Click any item to go there &amp; start a tour</span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleDismiss}>
              Dismiss
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/** Exported so Settings can reset the checklist for the current user. */
export function resetGettingStarted(userId: string) {
  localStorage.removeItem(storageKey(userId));
  sessionStorage.removeItem(dismissKey(userId));
}
