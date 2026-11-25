import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Sparkles,
  TrendingUp,
  Clock,
  Target,
  AlertCircle,
  ArrowRight,
  Loader2,
  RefreshCw,
  CalendarClock,
  PhoneCall,
  Mail,
} from 'lucide-react';
import {
  runCRMIntelligence,
  type CustomerInsightsResponse,
  type FollowupAssistantResponse,
} from '../../utils/ai-client';
import type { Contact } from '../../types';

interface AICustomerInsightsPanelProps {
  contacts: Contact[];
  scope: 'personal' | 'team';
  onOpenContact: (contact: Contact) => void;
}

export function AICustomerInsightsPanel({
  contacts,
  scope,
  onOpenContact,
}: AICustomerInsightsPanelProps) {
  const [activeMode, setActiveMode] = useState<'insights' | 'followup'>('insights');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<CustomerInsightsResponse | null>(null);
  const [followups, setFollowups] = useState<FollowupAssistantResponse | null>(null);

  const loadAnalysis = async (mode: 'insights' | 'followup') => {
    setActiveMode(mode);
    setIsLoading(true);
    setError(null);
    try {
      if (mode === 'insights') {
        const res = await runCRMIntelligence<CustomerInsightsResponse>({
          mode: 'insights',
          scope,
        });
        setInsights(res);
      } else {
        const res = await runCRMIntelligence<FollowupAssistantResponse>({
          mode: 'followup',
          scope,
        });
        setFollowups(res);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to run Gemini CRM analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJumpToContact = (contactId: string) => {
    const found = contacts.find((c) => c.id === contactId);
    if (found) {
      onOpenContact(found);
    }
  };

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-white to-cyan-50/40 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Gemini Customer Intelligence
              </CardTitle>
              <p className="text-xs text-slate-500">
                Buying habits, dormant account alerts, and recommended follow-up priorities
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={activeMode === 'insights' ? 'default' : 'outline'}
              onClick={() => loadAnalysis('insights')}
              disabled={isLoading}
              className="gap-1.5"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Customer Insights
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeMode === 'followup' ? 'default' : 'outline'}
              onClick={() => loadAnalysis('followup')}
              disabled={isLoading}
              className="gap-1.5"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Follow-up Assistant
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center gap-2.5 rounded-xl border border-indigo-100 bg-white p-4 text-sm text-indigo-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Analyzing {scope === 'personal' ? 'your' : 'team'} customer records & deal pipeline with Gemini...</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">AI analysis unavailable</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {!isLoading && !error && activeMode === 'insights' && !insights && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-dashed border-indigo-200 bg-white/80 p-4">
            <p className="text-sm text-slate-600">
              Click <strong>Customer Insights</strong> or <strong>Follow-up Assistant</strong> to analyze purchasing habits, inactive accounts, and open revenue opportunities.
            </p>
            <Button size="sm" onClick={() => loadAnalysis('insights')} className="shrink-0 gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Run Insights
            </Button>
          </div>
        )}

        {!isLoading && !error && activeMode === 'insights' && insights && (
          <div className="space-y-4">
            <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Executive Brief</span>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => loadAnalysis('insights')}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>
              <p className="text-sm font-medium text-slate-800">{insights.headline}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  Buying Habits
                </h4>
                <ul className="space-y-2 text-xs text-slate-600">
                  {insights.buyingHabits?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2.5">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  Inactive Customers
                </h4>
                <div className="space-y-2">
                  {insights.inactiveCustomers?.slice(0, 4).map((cust, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50/80 p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleJumpToContact(cust.contactId)}
                          className="font-semibold text-indigo-700 hover:underline text-left truncate"
                        >
                          {cust.name}
                        </button>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {cust.daysInactive}d idle
                        </Badge>
                      </div>
                      <p className="mt-1 text-slate-600 line-clamp-2">{cust.reason}</p>
                    </div>
                  ))}
                  {(!insights.inactiveCustomers || insights.inactiveCustomers.length === 0) && (
                    <p className="text-xs text-slate-500">No dormant priority accounts detected.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2.5">
                  <Target className="h-3.5 w-3.5 text-cyan-600" />
                  Sales Opportunities
                </h4>
                <ul className="space-y-2 text-xs text-slate-600">
                  {insights.opportunities?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && activeMode === 'followup' && followups && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-white px-4 py-3">
              <p className="text-sm text-slate-700">{followups.summary}</p>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs shrink-0" onClick={() => loadAnalysis('followup')}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {followups.prioritizedFollowups?.map((item, idx) => {
                const isCritical = item.urgency?.toLowerCase() === 'critical';
                const isHigh = item.urgency?.toLowerCase() === 'high';
                return (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex flex-col justify-between gap-2.5">
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.contactName}</p>
                          {item.company && <p className="text-xs text-slate-500">{item.company}</p>}
                        </div>
                        <Badge
                          className={
                            isCritical
                              ? 'bg-red-100 text-red-700 hover:bg-red-100'
                              : isHigh
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                                : 'bg-cyan-100 text-cyan-800 hover:bg-cyan-100'
                          }
                        >
                          {item.urgency}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-700">{item.suggestedAction}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        {item.recommendedChannel?.toLowerCase().includes('call') ? (
                          <PhoneCall className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Mail className="h-3 w-3 text-indigo-600" />
                        )}
                        {item.recommendedChannel} • {item.bestTimeHint}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50"
                        onClick={() => handleJumpToContact(item.contactId)}
                      >
                        Open Contact
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
