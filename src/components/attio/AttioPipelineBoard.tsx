import React, { useMemo } from 'react';
import {
  Users,
  Building,
  DollarSign,
  Phone,
  Mail,
  Plus,
  ArrowRight,
  MoreVertical,
  Tag,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';

interface AttioPipelineBoardProps {
  contacts: any[];
  dealValueByContactId: Record<string, number>;
  onSelectContact: (contact: any) => void;
  onOpenAddContactWithStatus?: (status: string) => void;
  onUpdateStatus?: (contactId: string, newStatus: string) => void;
}

const STAGES = [
  { id: 'Prospect', label: 'Prospects & Inquiries', dotColor: 'bg-blue-500', headerBg: 'bg-blue-50/50 dark:bg-blue-950/20', borderColor: 'border-blue-200 dark:border-blue-800/60' },
  { id: 'Lead', label: 'Warm Leads', dotColor: 'bg-purple-500', headerBg: 'bg-purple-50/50 dark:bg-purple-950/20', borderColor: 'border-purple-200 dark:border-purple-800/60' },
  { id: 'Active', label: 'Active Customers', dotColor: 'bg-emerald-500', headerBg: 'bg-emerald-50/50 dark:bg-emerald-950/20', borderColor: 'border-emerald-200 dark:border-emerald-800/60' },
  { id: 'VIP', label: 'VIP Accounts', dotColor: 'bg-amber-500', headerBg: 'bg-amber-50/50 dark:bg-amber-950/20', borderColor: 'border-amber-200 dark:border-amber-800/60' },
  { id: 'Inactive', label: 'Inactive / Archived', dotColor: 'bg-slate-400', headerBg: 'bg-slate-50 dark:bg-slate-900/40', borderColor: 'border-slate-200 dark:border-slate-800' }
];

export function AttioPipelineBoard({
  contacts,
  dealValueByContactId,
  onSelectContact,
  onOpenAddContactWithStatus,
  onUpdateStatus
}: AttioPipelineBoardProps) {
  // Group contacts by status
  const columnsData = useMemo(() => {
    return STAGES.map(stage => {
      const items = contacts.filter(c => {
        const s = (c.status || 'Prospect').trim();
        if (stage.id === 'Prospect') {
          return s === 'Prospect' || !s;
        }
        return s.toLowerCase() === stage.id.toLowerCase();
      });

      const totalValue = items.reduce((sum, c) => {
        const val = dealValueByContactId[c.id] || Number(c.ytdSales || 0);
        return sum + (Number.isFinite(val) ? val : 0);
      }, 0);

      return {
        ...stage,
        items,
        totalValue
      };
    });
  }, [contacts, dealValueByContactId]);

  return (
    <div className="w-full overflow-x-auto pb-4 select-none">
      <div className="flex gap-4 min-w-[1100px] items-start">
        {columnsData.map(col => (
          <div
            key={col.id}
            className="flex-1 min-w-[260px] max-w-[320px] bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col max-h-[calc(100vh-250px)]"
          >
            {/* Column Header */}
            <div className={`p-3.5 border-b border-slate-200/70 dark:border-slate-800 rounded-t-2xl flex items-center justify-between ${col.headerBg}`}>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${col.dotColor}`} />
                <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100">{col.label}</h3>
                <span className="px-1.5 py-0.2 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-500 font-bold">
                  {col.items.length}
                </span>
              </div>

              {onOpenAddContactWithStatus && (
                <button
                  type="button"
                  onClick={() => onOpenAddContactWithStatus(col.id)}
                  className="p-1 hover:bg-white dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                  title={`Add to ${col.label}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Total Stage Value Metric */}
            <div className="px-3.5 py-2 border-b border-slate-200/50 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/30 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Pipeline Value</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                ${col.totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>

            {/* Column Cards Container */}
            <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
              {col.items.map(contact => {
                const dealVal = dealValueByContactId[contact.id] || Number(contact.ytdSales || 0);

                return (
                  <div
                    key={contact.id}
                    onClick={() => onSelectContact(contact)}
                    className="p-3 bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 rounded-xl shadow-xs hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group flex flex-col gap-2"
                  >
                    {/* Top Row: Avatar & Name */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {(contact.name || contact.company || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {contact.name}
                          </h4>
                          <span className="text-[11px] text-slate-400 truncate block">
                            {contact.company || 'Direct Client'}
                          </span>
                        </div>
                      </div>

                      {/* Deal Value Pill */}
                      {dealVal > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 shrink-0">
                          ${dealVal.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Middle Row: Trade & Pricing Tier */}
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 flex-wrap">
                      {contact.trade && (
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700/60 rounded text-slate-600 dark:text-slate-300">
                          {contact.trade}
                        </span>
                      )}
                      {contact.priceLevel && (
                        <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded font-mono">
                          {contact.priceLevel}
                        </span>
                      )}
                    </div>

                    {/* Bottom Row: Quick Contacts & Stage Mover */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60 text-slate-400 text-[10px]">
                      <div className="flex items-center gap-2">
                        {contact.email && (
                          <span title={contact.email} className="hover:text-blue-600">
                            <Mail className="h-3 w-3" />
                          </span>
                        )}
                        {contact.phone && (
                          <span title={contact.phone} className="hover:text-emerald-600">
                            <Phone className="h-3 w-3" />
                          </span>
                        )}
                      </div>

                      {/* Quick Move Stage Select */}
                      {onUpdateStatus && (
                        <select
                          value={col.id}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(contact.id, e.target.value);
                          }}
                          className="text-[9.5px] font-medium bg-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer focus:outline-none"
                        >
                          <option value="Prospect">Move: Prospect</option>
                          <option value="Lead">Move: Lead</option>
                          <option value="Active">Move: Active</option>
                          <option value="VIP">Move: VIP</option>
                          <option value="Inactive">Move: Inactive</option>
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}

              {col.items.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  No records in {col.label}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
