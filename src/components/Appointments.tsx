import { useState, useEffect, useMemo, useCallback } from 'react';
import { appointmentsAPI } from '../utils/api';
import { CalendarAccountSetup } from './CalendarAccountSetup';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { getServerHeaders } from '../utils/server-headers';
import { toast } from 'sonner@2.0.3';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Plus, Trash2, Clock, MapPin, Calendar as CalendarIcon, MoreVertical, Link2, RefreshCw, Loader2 } from 'lucide-react';
import { Video, List, ChevronLeft, ChevronRight, LayoutGrid, CalendarDays, User as UserIcon, X, Pencil } from 'lucide-react';
import type { User } from '../App';
import { PermissionGate } from './PermissionGate';
import { canAdd, canDelete } from '../utils/permissions';
import { canChange } from '../utils/permissions';
import { contactsAPI } from '../utils/api';
import { AppointmentsModuleHelp } from './AppointmentsModuleHelp';

interface Appointment {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  contact_id?: string;
  owner_id?: string;
  organization_id: string;
  created_at: string;
  created_by?: string;
  calendar_event_id?: string;
  calendar_provider?: string;
  status?: string;
  attendees?: string;
}

interface AppointmentsProps {
  user: User;
}

type ViewMode = 'list' | 'week' | 'month';

// ─── Helpers ────────────────────────────────────────────────────────

function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day;
  const s = new Date(d);
  s.setDate(diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM – 9 PM
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Deterministic pastel colour per appointment to keep the calendar colourful
const EVENT_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800', dot: 'bg-blue-500' },
  { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  { bg: 'bg-violet-100', border: 'border-violet-400', text: 'text-violet-800', dot: 'bg-violet-500' },
  { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-800', dot: 'bg-amber-500' },
  { bg: 'bg-rose-100', border: 'border-rose-400', text: 'text-rose-800', dot: 'bg-rose-500' },
  { bg: 'bg-cyan-100', border: 'border-cyan-400', text: 'text-cyan-800', dot: 'bg-cyan-500' },
  { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-800', dot: 'bg-pink-500' },
  { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-800', dot: 'bg-teal-500' },
];

function colorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length];
}

// ─── Sub-components ─────────────────────────────────────────────────

function AppointmentDetailPopover({ appointment, formatTime, onDelete, onEdit, userRole }: {
  appointment: Appointment;
  formatTime: (s: string) => string;
  onDelete: (id: string) => void;
  onEdit: (appointment: Appointment) => void;
  userRole: string;
}) {
  const [open, setOpen] = useState(false);
  const color = colorForId(appointment.id);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className={`w-full text-left px-1.5 py-0.5 rounded text-xs truncate border-l-2 ${color.bg} ${color.border} ${color.text} hover:opacity-80 transition-opacity cursor-pointer`}>
        <span className="font-medium">{appointment.title}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-0">
        <div className="p-3 space-y-2">
          <h4 className="font-semibold text-sm text-foreground">{appointment.title}</h4>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}</span>
          </div>
          {appointment.location && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{appointment.location}</span>
            </div>
          )}
          {appointment.description && (
            <p className="text-xs text-muted-foreground line-clamp-3">{appointment.description}</p>
          )}
          {appointment.calendar_provider && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-700">
              <CalendarIcon className="h-2.5 w-2.5 mr-1" />
              {appointment.calendar_provider === 'google' ? 'Google' : appointment.calendar_provider === 'microsoft' ? 'Outlook' : appointment.calendar_provider}
            </span>
          )}
        </div>
        <div className="border-t" />
        {canChange('appointments', userRole as any) && (
          <DropdownMenuItem
            onClick={() => { setOpen(false); onEdit(appointment); }}
            className="m-1"
          >
            <Pencil className="h-3.5 w-3.5 mr-2" />
            Edit
          </DropdownMenuItem>
        )}
        {canDelete('appointments', userRole as any) && (
          <DropdownMenuItem
            onClick={() => { setOpen(false); onDelete(appointment.id); }}
            className="text-red-600 m-1"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function Appointments({ user }: AppointmentsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('prospaces_appt_view') as ViewMode) || 'list';
  });
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Calendar sync state
  const [isCalendarSetupOpen, setIsCalendarSetupOpen] = useState(false);
  const [calendarAccounts, setCalendarAccounts] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Contact picker state
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [isContactDropdownOpen, setIsContactDropdownOpen] = useState(false);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  // Map contact_id -> name for display
  const [contactNameMap, setContactNameMap] = useState<Record<string, string>>({});

  // Edit state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
  });
  const [editContactId, setEditContactId] = useState<string>('');
  const [editContactSearch, setEditContactSearch] = useState('');
  const [isEditContactDropdownOpen, setIsEditContactDropdownOpen] = useState(false);

  const [newAppointment, setNewAppointment] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
  });

  // Persist view preference
  useEffect(() => {
    localStorage.setItem('prospaces_appt_view', viewMode);
  }, [viewMode]);

  // Load appointments on mount
  useEffect(() => {
    loadAppointments();
    loadCalendarAccounts();
    loadContacts();
  }, []);

  // Auto-sync every 5 min
  useEffect(() => {
    if (calendarAccounts.length === 0) return;
    const id = setInterval(() => {
      handleSyncCalendar();
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [calendarAccounts]);

  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      const response = await appointmentsAPI.getAll();
      setAppointments(response.appointments || []);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startDateTime = new Date(`${newAppointment.date}T${newAppointment.startTime}`);
      const endDateTime = new Date(`${newAppointment.date}T${newAppointment.endTime}`);
      await appointmentsAPI.create({
        title: newAppointment.title,
        description: newAppointment.description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location: newAppointment.location,
        ...(selectedContactId ? { contact_id: selectedContactId } : {}),
      });
      await loadAppointments();
      setNewAppointment({ title: '', description: '', date: '', startTime: '', endTime: '', location: '' });
      setSelectedContactId('');
      setIsAddDialogOpen(false);
    } catch (error) {
      alert('Failed to create appointment. Please try again.');
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    try {
      await appointmentsAPI.delete(id);
      await loadAppointments();
    } catch (error) {
      alert('Failed to delete appointment. Please try again.');
    }
  };

  const sortedAppointments = useMemo(
    () => [...appointments].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    [appointments]
  );

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const loadCalendarAccounts = async () => {
    try {
      const headers = await getServerHeaders();
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/calendar-accounts`, { headers });
      if (!res.ok) { return; }
      const json = await res.json();
      if (json.error) { return; }
      else {
        setCalendarAccounts(json.accounts || []);
      }
    } catch (error) {
    }
  };

  const handleSyncCalendar = async () => {
    if (calendarAccounts.length === 0) { toast.error('No calendar accounts connected'); return; }
    setIsSyncing(true);
    try {
      const headers = await getServerHeaders();
      for (const account of calendarAccounts) {
        try {
          const res = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/calendar-sync`,
            {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({ accountId: account.id }),
            }
          );
          const data = await res.json();
          if (!res.ok || !data?.success) {
            if (data?.needsReconnect) {
              toast.error(`Failed to sync ${account.email}`, {
                description: 'Calendar permissions missing. Please disconnect and reconnect this account with calendar access.',
                duration: 8000,
              });
            } else {
              toast.error(`Failed to sync ${account.provider || 'calendar'}`, {
                description: data?.error || 'Sync operation was not successful'
              });
            }
            continue;
          }
          if (data.skipped) {
            // skipped
          } else {
            toast.success(`Synced ${account.provider || 'calendar'}!`, { description: `${data.syncedCount || 0} new event(s) imported` });
          }
        } catch (accountError: any) {
          toast.error(`Failed to sync ${account.provider || 'calendar'}`, {
            description: accountError.message || 'Calendar sync request failed'
          });
        }
      }
      // Reload appointments to show any newly imported ones
      await loadAppointments();
      await loadCalendarAccounts();
    } catch (error: any) {
      toast.error('Failed to sync calendar', { description: error.message || 'Please try again' });
    } finally {
      setIsSyncing(false);
    }
  };

  const loadContacts = async () => {
    try {
      const response = await contactsAPI.getAll();
      setContacts(response.contacts || []);
      setContactsLoaded(true);
      const nameMap: Record<string, string> = {};
      for (const contact of response.contacts || []) {
        nameMap[contact.id] = contact.name;
      }
      setContactNameMap(nameMap);
    } catch (error) {
    }
  };

  const openEditDialog = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    const start = new Date(appointment.start_time);
    const end = new Date(appointment.end_time);
    setEditForm({
      title: appointment.title || '',
      description: appointment.description || '',
      date: start.toISOString().split('T')[0],
      startTime: start.toTimeString().slice(0, 5),
      endTime: end.toTimeString().slice(0, 5),
      location: appointment.location || '',
    });
    setEditContactId(appointment.contact_id || '');
    setEditContactSearch('');
    setIsEditContactDropdownOpen(false);
    setIsEditDialogOpen(true);
  };

  const handleEditAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointment) return;
    try {
      const startDateTime = new Date(`${editForm.date}T${editForm.startTime}`);
      const endDateTime = new Date(`${editForm.date}T${editForm.endTime}`);
      await appointmentsAPI.update(editingAppointment.id, {
        title: editForm.title,
        description: editForm.description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location: editForm.location,
        contact_id: editContactId || null,
      });
      toast.success('Appointment updated');
      await loadAppointments();
      setIsEditDialogOpen(false);
      setEditingAppointment(null);
    } catch (error) {
      toast.error('Failed to update appointment');
    }
  };

  // ─── Navigation helpers ──────────────────────────────────────────

  const goToday = () => setCurrentDate(new Date());

  const goPrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const goNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const headerLabel = useMemo(() => {
    if (viewMode === 'month') return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    const ws = startOfWeek(currentDate);
    const we = new Date(ws);
    we.setDate(we.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (ws.getMonth() !== we.getMonth()) return `${ws.toLocaleDateString('en-US', opts)} – ${we.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
    return `${ws.toLocaleDateString('en-US', opts)} – ${we.getDate()}, ${we.getFullYear()}`;
  }, [viewMode, currentDate]);

  // ─── Month grid data ─────────────────────────────────────────────

  const monthGrid = useMemo(() => {
    if (viewMode !== 'month') return [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = first.getDay();
    const cells: Date[] = [];
    // fill leading blanks with previous month dates
    for (let i = startDay - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      cells.push(d);
    }
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
    // fill trailing
    while (cells.length % 7 !== 0) {
      const d = new Date(year, month + 1, cells.length - startDay - last.getDate() + 1);
      cells.push(d);
    }
    return cells;
  }, [viewMode, currentDate]);

  // ─── Week grid data ───────────────────────────────────────────────

  const weekDays = useMemo(() => {
    if (viewMode !== 'week') return [];
    const ws = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ws);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [viewMode, currentDate]);

  // Map: dateKey -> appointments for quick lookup
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of sortedAppointments) {
      const key = new Date(a.start_time).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [sortedAppointments]);

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <PermissionGate user={user} module="appointments" action="view">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        {/* ── Toolbar ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: View toggle + date nav */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle pills */}
            <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">List</span>
                  </TooltipTrigger>
                  <TooltipContent>List view</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    onClick={() => setViewMode('week')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'week' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <CalendarDays className="h-4 w-4" />
                    <span className="hidden sm:inline">Week</span>
                  </TooltipTrigger>
                  <TooltipContent>Week view</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    onClick={() => setViewMode('month')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'month' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden sm:inline">Month</span>
                  </TooltipTrigger>
                  <TooltipContent>Month view</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Date navigation – shown for week & month */}
            {viewMode !== 'list' && (
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={goToday} className="text-xs">
                  Today
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goPrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold text-foreground ml-1 whitespace-nowrap">{headerLabel}</span>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <AppointmentsModuleHelp
              userId={user.id}
              totalAppointments={appointments.length}
              connectedCalendars={calendarAccounts.length}
              onShowList={() => setViewMode('list')}
              onShowWeek={() => setViewMode('week')}
              onShowMonth={() => setViewMode('month')}
              onOpenCalendarSetup={() => setIsCalendarSetupOpen(true)}
              onSyncCalendar={handleSyncCalendar}
              onOpenAddAppointment={() => setIsAddDialogOpen(true)}
            />
            {calendarAccounts.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleSyncCalendar} disabled={isSyncing}>
                {isSyncing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Syncing...</> : <><RefreshCw className="h-4 w-4 mr-2" />Sync Calendar</>}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setIsCalendarSetupOpen(true)}>
              <Link2 className="h-4 w-4 mr-2" />
              {calendarAccounts.length > 0 ? 'Manage Calendars' : 'Connect Calendar'}
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              {canAdd('appointments', user.role) && (
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Appointment
                  </Button>
                </DialogTrigger>
              )}
              <DialogContent className="sm:max-w-[500px] bg-background">
                <DialogHeader>
                  <DialogTitle>Schedule New Appointment</DialogTitle>
                  <DialogDescription>Create a new appointment with date, time, and location details.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddAppointment} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" value={newAppointment.title} onChange={(e) => setNewAppointment({ ...newAppointment, title: e.target.value })} placeholder="Meeting title" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={newAppointment.description} onChange={(e) => setNewAppointment({ ...newAppointment, description: e.target.value })} rows={3} placeholder="Meeting details..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" value={newAppointment.date} onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input id="startTime" type="time" value={newAppointment.startTime} onChange={(e) => setNewAppointment({ ...newAppointment, startTime: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">End Time</Label>
                      <Input id="endTime" type="time" value={newAppointment.endTime} onChange={(e) => setNewAppointment({ ...newAppointment, endTime: e.target.value })} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" value={newAppointment.location} onChange={(e) => setNewAppointment({ ...newAppointment, location: e.target.value })} placeholder="Meeting location" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">Link to Contact <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <div className="relative">
                      <Input
                        id="contact"
                        value={selectedContactId ? (contactNameMap[selectedContactId] || '') : contactSearch}
                        onChange={(e) => {
                          setContactSearch(e.target.value);
                          setSelectedContactId('');
                          setIsContactDropdownOpen(true);
                        }}
                        onFocus={() => setIsContactDropdownOpen(true)}
                        placeholder="Search contacts..."
                        className="w-full"
                        autoComplete="off"
                      />
                      {selectedContactId && (
                        <button
                          type="button"
                          onClick={() => { setSelectedContactId(''); setContactSearch(''); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      {isContactDropdownOpen && !selectedContactId && (
                        <div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {contacts
                            .filter((c) => c.name.toLowerCase().includes(contactSearch.toLowerCase()))
                            .slice(0, 20)
                            .map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                                onClick={() => {
                                  setSelectedContactId(c.id);
                                  setContactSearch('');
                                  setIsContactDropdownOpen(false);
                                }}
                              >
                                <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                {c.name}
                              </button>
                            ))
                          }
                          {contactsLoaded && contacts.filter((c) => c.name.toLowerCase().includes(contactSearch.toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No contacts found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">Cancel</Button>
                    <Button type="submit" className="flex-1">Add Appointment</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ── Loading / Empty ────────────────────────────────────── */}
        {isLoading ? (
          <Card><CardContent className="pt-6"><div className="text-center py-12 text-muted-foreground">Loading appointments...</div></CardContent></Card>
        ) : appointments.length === 0 && viewMode === 'list' ? (
          <Card><CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p>No appointments scheduled yet.</p>
              <p className="text-sm mt-2">Click "Add Appointment" to create your first one.</p>
            </div>
          </CardContent></Card>
        ) : (
          <>
            {/* ── LIST VIEW ──────────────────────────────────────── */}
            {viewMode === 'list' && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {sortedAppointments.map((appointment) => {
                      const startDate = new Date(appointment.start_time);
                      const isUpcoming = startDate > new Date();
                      return (
                        <div key={appointment.id} className="flex gap-4 p-4 border border-border rounded-lg hover:bg-muted transition-colors">
                          <div className="flex flex-col items-center justify-center bg-blue-100 rounded-lg p-3 min-w-[70px]">
                            <span className="text-2xl text-blue-600">{startDate.getDate()}</span>
                            <span className="text-xs text-blue-600">{startDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-foreground">{appointment.title}</h3>
                                {appointment.description && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {(() => {
                                      const desc = appointment.description;
                                      const teamsMatch = desc.match(/https:\/\/teams\.microsoft\.com\/l\/meetup-join[^\s<]+/);
                                      const zoomMatch = desc.match(/https:\/\/[\w-]+\.zoom\.us\/j\/[^\s<]+/);
                                      const webexMatch = desc.match(/https:\/\/[\w-]+\.webex\.com\/[^\s<]+/);
                                      const meetingLink = teamsMatch?.[0] || zoomMatch?.[0] || webexMatch?.[0];
                                      if (meetingLink) {
                                        const firstLine = desc.split(/[\r\n]+/)[0].trim();
                                        const cleanDesc = firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;
                                        return (
                                          <>
                                            {cleanDesc && <p className="mb-2">{cleanDesc}</p>}
                                            <a href={meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 underline">
                                              <Video className="h-3.5 w-3.5" />Join Meeting
                                            </a>
                                          </>
                                        );
                                      }
                                      return <p>{desc.length > 150 ? desc.substring(0, 150) + '...' : desc}</p>;
                                    })()}
                                  </div>
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {canChange('appointments', user.role) && (
                                    <DropdownMenuItem onClick={() => openEditDialog(appointment)}>
                                      <Pencil className="h-4 w-4 mr-2" />Edit
                                    </DropdownMenuItem>
                                  )}
                                  {canDelete('appointments', user.role) && (
                                    <DropdownMenuItem onClick={() => handleDeleteAppointment(appointment.id)} className="text-red-600">
                                      <Trash2 className="h-4 w-4 mr-2" />Delete
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                <span>{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</span>
                              </div>
                              {appointment.location && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-4 w-4" />
                                  <span>{appointment.location}</span>
                                </div>
                              )}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {isUpcoming && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-green-100 text-green-800">Upcoming</span>}
                              {appointment.calendar_event_id && appointment.calendar_provider && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">
                                  <CalendarIcon className="h-3 w-3 mr-1" />
                                  Synced from {appointment.calendar_provider === 'google' ? 'Google' : appointment.calendar_provider === 'microsoft' ? 'Outlook' : appointment.calendar_provider}
                                </span>
                              )}
                              {appointment.attendees && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                                  {appointment.attendees.split(',').length} attendee(s)
                                </span>
                              )}
                              {appointment.contact_id && contactNameMap[appointment.contact_id] && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-800">
                                  <UserIcon className="h-3 w-3 mr-1" />
                                  {contactNameMap[appointment.contact_id]}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── MONTH VIEW ─────────────────────────────────────── */}
            {viewMode === 'month' && (
              <Card>
                <CardContent className="p-0 sm:p-2">
                  {/* Day-of-week headers */}
                  <div className="grid grid-cols-7 border-b border-border">
                    {DAY_LABELS.map((d) => (
                      <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">{d}</div>
                    ))}
                  </div>

                  {/* Date cells */}
                  <div className="grid grid-cols-7 auto-rows-[minmax(90px,1fr)]">
                    {monthGrid.map((date, i) => {
                      const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                      const isToday = isSameDay(date, new Date());
                      const dayAppts = appointmentsByDate.get(date.toDateString()) || [];
                      const maxVisible = 3;
                      const overflow = dayAppts.length - maxVisible;

                      return (
                        <div
                          key={i}
                          className={`border-b border-r border-border p-1 ${!isCurrentMonth ? 'bg-muted/60' : 'bg-background'} ${i % 7 === 0 ? 'border-l' : ''}`}
                        >
                          <div className={`text-xs font-medium mb-0.5 ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center mx-auto sm:mx-0' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {date.getDate()}
                          </div>
                          <div className="space-y-0.5">
                            {dayAppts.slice(0, maxVisible).map((a) => (
                              <AppointmentDetailPopover
                                key={a.id}
                                appointment={a}
                                formatTime={formatTime}
                                onDelete={handleDeleteAppointment}
                                onEdit={openEditDialog}
                                userRole={user.role}
                              />
                            ))}
                            {overflow > 0 && (
                              <span className="block text-[10px] text-muted-foreground pl-1.5 cursor-default">+{overflow} more</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── WEEK VIEW ──────────────────────────────────────── */}
            {viewMode === 'week' && (
              <Card>
                <CardContent className="p-0">
                  {/* Header row */}
                  <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border sticky top-0 bg-background z-10">
                    <div className="border-r border-border" /> {/* gutter */}
                    {weekDays.map((d, i) => {
                      const isToday = isSameDay(d, new Date());
                      return (
                        <div key={i} className={`py-2 px-1 text-center border-r border-border ${isToday ? 'bg-blue-50' : ''}`}>
                          <div className="text-[10px] font-semibold text-muted-foreground uppercase">{DAY_LABELS[d.getDay()]}</div>
                          <div className={`text-lg font-semibold leading-tight ${isToday ? 'text-blue-600' : 'text-foreground'}`}>{d.getDate()}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Time grid */}
                  <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
                    <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
                      {/* Hour labels + horizontal lines */}
                      {HOURS.map((h) => (
                        <div key={h} className="contents">
                          <div className="border-r border-border pr-2 text-right text-[10px] text-muted-foreground h-16 flex items-start pt-0.5 justify-end">
                            {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                          </div>
                          {weekDays.map((d, di) => {
                            const isToday = isSameDay(d, new Date());
                            const dayAppts = appointmentsByDate.get(d.toDateString()) || [];
                            const hourAppts = dayAppts.filter((a) => {
                              const sh = new Date(a.start_time).getHours();
                              return sh === h;
                            });
                            return (
                              <div
                                key={di}
                                className={`border-r border-b border-border h-16 relative ${isToday ? 'bg-blue-50/30' : ''}`}
                              >
                                {hourAppts.map((a) => {
                                  const start = new Date(a.start_time);
                                  const end = new Date(a.end_time);
                                  const startMin = start.getMinutes();
                                  const durationMin = Math.max(15, (end.getTime() - start.getTime()) / 60000);
                                  const topPx = (startMin / 60) * 64; // 64px = h-16
                                  const heightPx = Math.min((durationMin / 60) * 64, 192); // cap at 3 hours visually
                                  const color = colorForId(a.id);

                                  return (
                                    <DropdownMenu key={a.id}>
                                      <DropdownMenuTrigger
                                        className={`absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-[10px] leading-tight border-l-2 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${color.bg} ${color.border} ${color.text} text-left`}
                                        style={{ top: `${topPx}px`, height: `${heightPx}px`, zIndex: 5 }}
                                      >
                                        <div className="font-semibold truncate">{a.title}</div>
                                        <div className="truncate opacity-75">{formatTime(a.start_time)}</div>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" className="w-72 p-0">
                                        <div className="p-3 space-y-2">
                                          <h4 className="font-semibold text-sm text-foreground">{a.title}</h4>
                                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            <span>{formatTime(a.start_time)} – {formatTime(a.end_time)}</span>
                                          </div>
                                          {a.location && (
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                              <MapPin className="h-3 w-3" />
                                              <span>{a.location}</span>
                                            </div>
                                          )}
                                          {a.description && <p className="text-xs text-muted-foreground line-clamp-3">{a.description}</p>}
                                          {a.calendar_provider && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-700">
                                              <CalendarIcon className="h-2.5 w-2.5 mr-1" />
                                              {a.calendar_provider === 'google' ? 'Google' : a.calendar_provider === 'microsoft' ? 'Outlook' : a.calendar_provider}
                                            </span>
                                          )}
                                        </div>
                                        <div className="border-t" />
                                        {canChange('appointments', user.role) && (
                                          <DropdownMenuItem onClick={() => openEditDialog(a)} className="m-1">
                                            <Pencil className="h-3.5 w-3.5 mr-2" />Edit
                                          </DropdownMenuItem>
                                        )}
                                        {canDelete('appointments', user.role) && (
                                            <DropdownMenuItem onClick={() => handleDeleteAppointment(a.id)} className="text-red-600 m-1">
                                              <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                                            </DropdownMenuItem>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Edit Appointment Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-background">
            <DialogHeader>
              <DialogTitle>Edit Appointment</DialogTitle>
              <DialogDescription>Update appointment details.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditAppointment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input id="edit-title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Meeting title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea id="edit-description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} placeholder="Meeting details..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input id="edit-date" type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-startTime">Start Time</Label>
                  <Input id="edit-startTime" type="time" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-endTime">End Time</Label>
                  <Input id="edit-endTime" type="time" value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input id="edit-location" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} placeholder="Meeting location" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contact">Link to Contact <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <div className="relative">
                  <Input
                    id="edit-contact"
                    value={editContactId ? (contactNameMap[editContactId] || '') : editContactSearch}
                    onChange={(e) => {
                      setEditContactSearch(e.target.value);
                      setEditContactId('');
                      setIsEditContactDropdownOpen(true);
                    }}
                    onFocus={() => setIsEditContactDropdownOpen(true)}
                    placeholder="Search contacts..."
                    className="w-full"
                    autoComplete="off"
                  />
                  {editContactId && (
                    <button
                      type="button"
                      onClick={() => { setEditContactId(''); setEditContactSearch(''); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {isEditContactDropdownOpen && !editContactId && (
                    <div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {contacts
                        .filter((c) => c.name.toLowerCase().includes(editContactSearch.toLowerCase()))
                        .slice(0, 20)
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                            onClick={() => {
                              setEditContactId(c.id);
                              setEditContactSearch('');
                              setIsEditContactDropdownOpen(false);
                            }}
                          >
                            <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            {c.name}
                          </button>
                        ))
                      }
                      {contactsLoaded && contacts.filter((c) => c.name.toLowerCase().includes(editContactSearch.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No contacts found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1">Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Calendar setup dialog — CalendarAccountSetup has its own <Dialog> */}
        <CalendarAccountSetup
          isOpen={isCalendarSetupOpen}
          onClose={() => setIsCalendarSetupOpen(false)}
          onAccountAdded={loadCalendarAccounts}
          existingAccounts={calendarAccounts}
        />
      </div>
    </PermissionGate>
  );
}