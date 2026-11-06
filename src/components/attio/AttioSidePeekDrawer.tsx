import React, { useState, useEffect } from 'react';
import {
  X,
  Maximize2,
  Mail,
  Phone,
  Building,
  DollarSign,
  Calendar,
  CheckSquare,
  Tag,
  MapPin,
  TrendingUp,
  ExternalLink,
  Edit,
  Save,
  Clock,
  Plus,
  Copy,
  Check,
  ChevronDown,
  User,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  MessageSquare
} from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { contactsAPI, bidsAPI, notesAPI } from '../../utils/api';

interface AttioSidePeekDrawerProps {
  contact: any | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenFullDetail?: (contact: any) => void;
  onUpdateContact?: (updated: any) => void;
  user: any;
}

export function AttioSidePeekDrawer({
  contact,
  isOpen,
  onClose,
  onOpenFullDetail,
  onUpdateContact,
  user
}: AttioSidePeekDrawerProps) {
  const [activeTab, setActiveTab] = useState<'attributes' | 'timeline' | 'deals'>('attributes');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [status, setStatus] = useState<string>(contact?.status || 'Prospect');
  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [deals, setDeals] = useState<any[]>([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [contactNotes, setContactNotes] = useState('');

  // Sync internal state when contact changes
  useEffect(() => {
    if (contact) {
      setStatus(contact.status || 'Prospect');
      setContactNotes(contact.notes || '');

      // Load deals for contact
      setIsLoadingDeals(true);
      bidsAPI.getAll('team')
        .then(res => {
          if (res?.bids) {
            const contactId = contact.id?.toLowerCase();
            const contactEmail = contact.email?.toLowerCase();
            const contactName = contact.name?.toLowerCase();
            const matched = res.bids.filter((b: any) => {
              const bId = (b.contactId || b.customerId || '').toLowerCase();
              const bEmail = (b.contactEmail || b.email || '').toLowerCase();
              const bName = (b.contactName || b.customerName || '').toLowerCase();
              return (contactId && bId === contactId) || (contactEmail && bEmail === contactEmail) || (contactName && bName === contactName);
            });
            setDeals(matched);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingDeals(false));
    }
  }, [contact]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !contact) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName} to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    try {
      const updated = { ...contact, status: newStatus };
      await contactsAPI.update(contact.id, { status: newStatus });
      toast.success(`Status updated to "${newStatus}"`);
      if (onUpdateContact) onUpdateContact(updated);
    } catch (err: any) {
      toast.error('Failed to update status');
      setStatus(contact.status);
    }
  };

  const handleAddQuickNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setIsAddingNote(true);
    try {
      const updatedNotes = contactNotes
        ? `${newNoteText}\n---\n${contactNotes}`
        : newNoteText;
      
      await contactsAPI.update(contact.id, { notes: updatedNotes });
      setContactNotes(updatedNotes);
      setNewNoteText('');
      toast.success('Note added to timeline');
      if (onUpdateContact) onUpdateContact({ ...contact, notes: updatedNotes });
    } catch (err) {
      toast.error('Failed to save note');
    } finally {
      setIsAddingNote(false);
    }
  };

  const statusColors: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    Active: { bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', border: 'border-emerald-200 dark:border-emerald-800' },
    Prospect: { bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500', border: 'border-blue-200 dark:border-blue-800' },
    Lead: { bg: 'bg-purple-50 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500', border: 'border-purple-200 dark:border-purple-800' },
    VIP: { bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', border: 'border-amber-200 dark:border-amber-800' },
    Inactive: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400', border: 'border-slate-200 dark:border-slate-700' }
  };

  const currentStatusTheme = statusColors[status] || statusColors.Prospect;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/40 backdrop-blur-[2px] flex justify-end animate-in fade-in duration-200 select-text">
      {/* Click outside backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Attio-Style Side Peek Panel */}
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250 ease-out">
        
        {/* ── Top Bar with Actions & Mode Switcher ── */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Contact Record</span>
            <span>/</span>
            <span className="font-mono text-[11px] text-slate-400">ID: {contact.id?.slice(0, 8)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenFullDetail && (
              <button
                type="button"
                onClick={() => onOpenFullDetail(contact)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Expand to Full Page"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Full Peek</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Attio Profile Header ── */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-800 dark:to-slate-950 text-white font-bold text-lg flex items-center justify-center shadow-md border border-slate-700/50 shrink-0">
                {(contact.name || contact.company || 'C').charAt(0).toUpperCase()}
              </div>

              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                  {contact.name}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {contact.company || 'Direct Client'}
                  </span>
                  {contact.trade && (
                    <>
                      <span>·</span>
                      <span>{contact.trade}</span>
                    </>
                  )}
                  {contact.priceLevel && (
                    <>
                      <span>·</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400">{contact.priceLevel}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Attio Status Dropdown Pill */}
            <div className="relative shrink-0">
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer appearance-none pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${currentStatusTheme.bg} ${currentStatusTheme.text} ${currentStatusTheme.border}`}
              >
                <option value="Prospect">● Prospect</option>
                <option value="Active">● Active Customer</option>
                <option value="VIP">● VIP Account</option>
                <option value="Lead">● Warm Lead</option>
                <option value="Inactive">● Inactive</option>
              </select>
              <ChevronDown className="h-3 w-3 absolute right-2.5 top-2.5 pointer-events-none opacity-60" />
            </div>
          </div>

          {/* Attio Quick Action Bar */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex-wrap">
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium shadow-xs transition-colors"
              >
                <Mail className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Email</span>
              </a>
            )}

            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium shadow-xs transition-colors"
              >
                <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Call</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => handleCopy(`${window.location.origin}/contacts?id=${contact.id}`, 'Contact Link')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium shadow-xs transition-colors cursor-pointer"
            >
              {copiedField === 'Contact Link' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
              <span>Copy Link</span>
            </button>
          </div>
        </div>

        {/* ── Attio Segmented View Tabs ── */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 text-xs font-semibold bg-white dark:bg-slate-900 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('attributes')}
            className={`py-3 relative cursor-pointer transition-colors ${
              activeTab === 'attributes'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Attributes & Info
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`py-3 relative cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'timeline'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>Timeline & Notes</span>
            {contactNotes && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deals')}
            className={`py-3 relative cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'deals'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>Deals & Quotes</span>
            {deals.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {deals.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Tab Content Container ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* 1. ATTRIBUTES TAB (Attio 2-Column Key-Value Grid) */}
          {activeTab === 'attributes' && (
            <div className="space-y-6">
              
              {/* Sales & Metric Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">YTD Sales</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {contact.ytdSales ? `$${Number(contact.ytdSales).toLocaleString()}` : '$0.00'}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">YTD GP %</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {contact.ytdGpPercent ? `${contact.ytdGpPercent}%` : '—'}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Pricing Tier</span>
                  <span className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">
                    {contact.priceLevel || 'Tier 1 Standard'}
                  </span>
                </div>
              </div>

              {/* Attio Key-Value Attributes Grid */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                
                {/* Email Attribute */}
                <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
                  <span className="text-xs text-slate-400 font-medium w-36 shrink-0 flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    <span>Email Address</span>
                  </span>
                  <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate font-mono">
                      {contact.email || '—'}
                    </span>
                    {contact.email && (
                      <button
                        type="button"
                        onClick={() => handleCopy(contact.email, 'Email')}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded transition-opacity"
                        title="Copy Email"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Phone Attribute */}
                <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
                  <span className="text-xs text-slate-400 font-medium w-36 shrink-0 flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    <span>Phone Number</span>
                  </span>
                  <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate font-mono">
                      {contact.phone || '—'}
                    </span>
                    {contact.phone && (
                      <button
                        type="button"
                        onClick={() => handleCopy(contact.phone, 'Phone')}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded transition-opacity"
                        title="Copy Phone"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Company Attribute */}
                <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <span className="text-xs text-slate-400 font-medium w-36 shrink-0 flex items-center gap-2">
                    <Building className="h-3.5 w-3.5" />
                    <span>Company Name</span>
                  </span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {contact.company || 'Direct Customer'}
                  </span>
                </div>

                {/* Trade Attribute */}
                <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <span className="text-xs text-slate-400 font-medium w-36 shrink-0 flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5" />
                    <span>Trade / Specialization</span>
                  </span>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {contact.trade || 'General Building'}
                  </span>
                </div>

                {/* Address Attribute */}
                <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <span className="text-xs text-slate-400 font-medium w-36 shrink-0 flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Location</span>
                  </span>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-right truncate max-w-[260px]">
                    {[contact.address, contact.city, contact.province, contact.postalCode].filter(Boolean).join(', ') || 'No address logged'}
                  </span>
                </div>

                {/* Account Owner */}
                <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <span className="text-xs text-slate-400 font-medium w-36 shrink-0 flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    <span>Account Owner</span>
                  </span>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
                    {contact.accountOwnerNumber || user.email || 'Unassigned'}
                  </span>
                </div>

                {/* Legacy Number */}
                <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <span className="text-xs text-slate-400 font-medium w-36 shrink-0 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Legacy ID</span>
                  </span>
                  <span className="text-xs font-medium text-slate-500 font-mono">
                    {contact.legacyNumber || '—'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. TIMELINE & NOTES TAB */}
          {activeTab === 'timeline' && (
            <div className="space-y-5">
              
              {/* Quick Note Composer */}
              <form onSubmit={handleAddQuickNote} className="space-y-2.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                  Add Activity Note
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Log a call summary, quote requirement, or client update..."
                    className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white placeholder:text-slate-400 resize-none"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      disabled={isAddingNote || !newNoteText.trim()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{isAddingNote ? 'Saving...' : 'Log Note'}</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Timeline Stream */}
              <div className="space-y-3 pt-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Activity History
                </span>

                {contactNotes ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                    {contactNotes}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No notes logged yet. Use the composer above to log the first update.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. DEALS & QUOTES TAB */}
          {activeTab === 'deals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Associated Deals & Estimates
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                  Total: ${deals.reduce((sum, d) => sum + Number(d.total || d.amount || 0), 0).toLocaleString()}
                </span>
              </div>

              {isLoadingDeals ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Loading deals pipeline...
                </div>
              ) : deals.length > 0 ? (
                <div className="space-y-2.5">
                  {deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-3.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl hover:border-blue-400 transition-colors shadow-xs flex items-center justify-between"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {deal.projectName || deal.title || 'Untitled Deal'}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{deal.date || deal.createdAt || 'Recent'}</span>
                          {deal.status && (
                            <>
                              <span>·</span>
                              <span className="text-blue-600 dark:text-blue-400 font-medium">{deal.status}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-slate-900 dark:text-white block">
                          ${Number(deal.total || deal.amount || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <DollarSign className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  <p>No active deals or estimates associated with this contact.</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Attio Footer ── */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Created: {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : 'Active'}</span>
          {onOpenFullDetail && (
            <button
              type="button"
              onClick={() => onOpenFullDetail(contact)}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Open Full Record</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
