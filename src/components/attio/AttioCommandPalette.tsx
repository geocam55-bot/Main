import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Users,
  FileText,
  CheckSquare,
  Calendar,
  Mail,
  Package,
  Settings,
  Truck,
  Plus,
  ArrowRight,
  Sparkles,
  Command,
  X,
  Building2,
  DollarSign,
  Tag,
  Phone,
  Clock,
  ExternalLink
} from 'lucide-react';
import type { User } from '../../App';
import { contactsAPI, bidsAPI } from '../../utils/api';

interface AttioCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  user: User;
  onSelectContact?: (contact: any) => void;
  onOpenAddContact?: () => void;
}

export function AttioCommandPalette({
  isOpen,
  onClose,
  onNavigate,
  user,
  onSelectContact,
  onOpenAddContact
}: AttioCommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);

      // Load contacts for instant search if not already loaded
      setIsLoading(true);
      contactsAPI.getAll('team')
        .then(res => {
          if (res?.contacts) {
            setContacts(res.contacts);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  // System navigation items
  const navigationItems = [
    { id: 'contacts', name: 'Contacts & Accounts', icon: Users, category: 'Navigation', shortcut: 'G C' },
    { id: 'bids', name: 'Deals & Estimates', icon: DollarSign, category: 'Navigation', shortcut: 'G D' },
    { id: 'tasks', name: 'Tasks & Follow-ups', icon: CheckSquare, category: 'Navigation', shortcut: 'G T' },
    { id: 'appointments', name: 'Calendar & Appointments', icon: Calendar, category: 'Navigation', shortcut: 'G A' },
    { id: 'email', name: 'Email Inbox', icon: Mail, category: 'Navigation', shortcut: 'G E' },
    { id: 'inventory', name: 'Inventory & Materials', icon: Package, category: 'Navigation', shortcut: 'G I' },
    { id: 'logistics', name: 'Logistics & Fleet', icon: Truck, category: 'Navigation', shortcut: 'G L' },
    { id: 'settings', name: 'Settings & System', icon: Settings, category: 'Navigation', shortcut: 'G S' },
  ];

  // Quick action items
  const quickActions = [
    {
      id: 'action-new-contact',
      name: 'Create New Contact',
      description: 'Add a customer or contractor',
      icon: Plus,
      category: 'Actions',
      shortcut: 'C',
      action: () => {
        onClose();
        if (onOpenAddContact) onOpenAddContact();
        else onNavigate('contacts');
      }
    },
    {
      id: 'action-new-deal',
      name: 'Create New Deal / Estimate',
      description: 'Start a project quote or bid',
      icon: FileText,
      category: 'Actions',
      shortcut: 'N D',
      action: () => {
        onClose();
        onNavigate('bids');
      }
    },
    {
      id: 'action-new-task',
      name: 'Create New Task',
      description: 'Schedule a call or follow-up',
      icon: CheckSquare,
      category: 'Actions',
      shortcut: 'N T',
      action: () => {
        onClose();
        onNavigate('tasks');
      }
    }
  ];

  // Filter contacts based on query
  const filteredContacts = query.trim()
    ? contacts.filter(c => {
        const q = query.toLowerCase();
        return (
          (c.name || '').toLowerCase().includes(q) ||
          (c.company || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.phone || '').includes(q) ||
          (c.trade || '').toLowerCase().includes(q)
        );
      }).slice(0, 6)
    : contacts.slice(0, 4);

  // Filter navigation items
  const filteredNav = query.trim()
    ? navigationItems.filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
    : navigationItems.slice(0, 4);

  // Filter quick actions
  const filteredActions = query.trim()
    ? quickActions.filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
    : quickActions;

  // Flattened items for keyboard navigation
  const allFilteredItems = [
    ...filteredActions.map(a => ({ type: 'action', data: a })),
    ...filteredContacts.map(c => ({ type: 'contact', data: c })),
    ...filteredNav.map(n => ({ type: 'nav', data: n }))
  ];

  // Handle keyboard events (up, down, enter, esc)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(allFilteredItems.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allFilteredItems.length) % Math.max(allFilteredItems.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = allFilteredItems[selectedIndex];
      if (current) {
        if (current.type === 'action') {
          current.data.action();
        } else if (current.type === 'contact') {
          onClose();
          if (onSelectContact) {
            onSelectContact(current.data);
          } else {
            onNavigate('contacts');
          }
        } else if (current.type === 'nav') {
          onClose();
          onNavigate(current.data.id);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Attio-Style Command Header Search */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Search className="h-4 w-4 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search contacts, actions, or jump to view..."
            className="flex-1 bg-transparent border-0 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-0 text-slate-900 dark:text-slate-100"
          />
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 rounded border border-slate-200 dark:border-slate-700">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60 space-y-2">
          {/* Actions Section */}
          {filteredActions.length > 0 && (
            <div className="pt-1">
              <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Quick Actions
              </div>
              <div className="space-y-0.5 mt-1">
                {filteredActions.map((action, idx) => {
                  const Icon = action.icon;
                  const itemIndex = idx;
                  const isSelected = selectedIndex === itemIndex;
                  return (
                    <button
                      key={action.id}
                      onClick={action.action}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-xs">{action.name}</div>
                          <div className="text-[11px] text-slate-400">{action.description}</div>
                        </div>
                      </div>
                      {action.shortcut && (
                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                          {action.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contacts Section */}
          {filteredContacts.length > 0 && (
            <div className="pt-2">
              <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Contacts & Accounts</span>
                <span className="text-[10px] font-normal">{filteredContacts.length} matched</span>
              </div>
              <div className="space-y-0.5 mt-1">
                {filteredContacts.map((contact, idx) => {
                  const itemIndex = filteredActions.length + idx;
                  const isSelected = selectedIndex === itemIndex;
                  return (
                    <button
                      key={contact.id}
                      onClick={() => {
                        onClose();
                        if (onSelectContact) {
                          onSelectContact(contact);
                        } else {
                          onNavigate('contacts');
                        }
                      }}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-200 dark:border-emerald-800">
                          {(contact.name || contact.company || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                            <span>{contact.name}</span>
                            {contact.trade && (
                              <span className="text-[10px] font-normal text-slate-400">· {contact.trade}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                            <span>{contact.company || 'Direct Client'}</span>
                            {contact.email && <span>· {contact.email}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {contact.status && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                            contact.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {contact.status}
                          </span>
                        )}
                        <ArrowRight className="h-3 w-3 text-slate-300 opacity-60" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation Section */}
          {filteredNav.length > 0 && (
            <div className="pt-2">
              <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Jump To View
              </div>
              <div className="space-y-0.5 mt-1">
                {filteredNav.map((nav, idx) => {
                  const Icon = nav.icon;
                  const itemIndex = filteredActions.length + filteredContacts.length + idx;
                  const isSelected = selectedIndex === itemIndex;
                  return (
                    <button
                      key={nav.id}
                      onClick={() => {
                        onClose();
                        onNavigate(nav.id);
                      }}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-medium">{nav.name}</span>
                      </div>
                      {nav.shortcut && (
                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                          {nav.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {allFilteredItems.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs">
              No matching contacts or actions found for "{query}".
            </div>
          )}
        </div>

        {/* Attio Command Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-mono">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-mono">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-mono">esc</kbd>
              Close
            </span>
          </div>
          <span className="font-semibold text-slate-500">ProSpaces × Attio UI</span>
        </div>
      </div>
    </div>
  );
}
