import { useState } from 'react';
import {
  Sparkles,
  Send,
  Truck,
  Route,
  MessageSquare,
  AlertCircle,
  Loader2,
  X,
  Copy,
  Check,
  Wand2,
} from 'lucide-react';
import type { DeliveryRecord, Truck as TruckType, User, Tenant } from '../types';
import { runLogisticsAI, type LogisticsAIResponse } from '../../../utils/ai-client';
import { copyToClipboard } from '../../../utils/clipboard';

interface LogisticsAICopilotProps {
  deliveries: DeliveryRecord[];
  trucks: TruckType[];
  currentUser?: User;
  currentTenant?: Tenant | null;
  onHighlightDelivery?: (deliveryId: string) => void;
}

export function LogisticsAICopilot({
  deliveries,
  trucks,
  currentUser,
  currentTenant,
  onHighlightDelivery,
}: LogisticsAICopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'dispatch-qa' | 'route-optimize' | 'polish-pod'>('dispatch-qa');
  const [question, setQuestion] = useState('');
  const [rawNotes, setRawNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LogisticsAIResponse | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const logisticsAuth = {
    userId: currentUser?.id,
    userEmail: currentUser?.email,
    tenantId: currentTenant?.id,
  };

  const quickQuestions = [
    'Which active deliveries are unassigned or need a truck today?',
    'Summarize any blocked, returned, or delayed stops across depots.',
    'Which trucks currently have the heaviest workload?',
  ];

  const handleRun = async (overrideMode?: 'dispatch-qa' | 'route-optimize' | 'polish-pod', overrideQuestion?: string) => {
    const activeMode = overrideMode || mode;
    const activeQ = overrideQuestion !== undefined ? overrideQuestion : question;

    if (activeMode === 'dispatch-qa' && !activeQ.trim()) {
      setError('Enter a dispatch question or pick a quick prompt.');
      return;
    }
    if (activeMode === 'polish-pod' && !rawNotes.trim()) {
      setError('Paste raw driver notes to polish.');
      return;
    }

    setMode(activeMode);
    if (overrideQuestion !== undefined) setQuestion(overrideQuestion);
    setIsLoading(true);
    setError(null);
    try {
      const res = await runLogisticsAI(
        {
          mode: activeMode,
          question: activeQ.trim(),
          rawNotes: rawNotes.trim(),
          deliveries: deliveries.map((d) => ({
            id: d.id,
            customerName: d.customerName,
            deliveryAddress: d.deliveryAddress,
            originBranch: d.originBranch,
            status: d.status,
            assignedTruck: d.assignedTruck,
            assignedDriver: d.assignedDriver,
            scheduledDate: d.scheduledDate,
            scheduledSlot: d.scheduledSlot,
            weight: d.weight,
            documentType: d.documentType,
            deliveryCategory: d.deliveryCategory,
            returnReason: d.returnReason,
            destinationNotes: d.destinationNotes,
          })),
          trucks: trucks.map((t) => ({
            id: t.id,
            name: t.name,
            driver: t.driver,
            homeBranch: t.homeBranch,
            capacity: t.capacity,
            status: t.status,
          })),
          tenantId: currentTenant?.id,
        },
        logisticsAuth
      );
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Logistics AI Copilot request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (label: string, text: string) => {
    await copyToClipboard(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  };

  if (!isOpen) {
    return (
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-blue-950 text-white rounded-2xl p-3.5 shadow-sm border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-wide text-white">
              ProSpaces Logistics AI Dispatch Copilot
            </p>
            <p className="text-[11px] text-slate-300">
              Ask dispatch questions, balance truck loads &amp; AM/PM slots, or polish driver POD notes with Gemini
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              handleRun('route-optimize');
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Route className="h-3.5 w-3.5" />
            Optimize Assignments
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Open AI Copilot
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-indigo-200 rounded-2xl shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-bold">Logistics AI Dispatch Copilot</span>
          <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded text-indigo-200">
            {deliveries.length} stops • {trucks.length} trucks
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMode('dispatch-qa')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
              mode === 'dispatch-qa' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            Dispatch Q&amp;A
          </button>
          <button
            type="button"
            onClick={() => handleRun('route-optimize')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
              mode === 'route-optimize' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            Load &amp; Slot Optimizer
          </button>
          <button
            type="button"
            onClick={() => setMode('polish-pod')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
              mode === 'polish-pod' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            POD Note Polisher
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="ml-2 p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
            title="Minimize Copilot"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {mode === 'dispatch-qa' && (
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRun('dispatch-qa');
                }}
                placeholder="Ask about unassigned loads, truck capacity, branch backlogs, or exceptions..."
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => handleRun('dispatch-qa')}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Ask AI</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleRun('dispatch-qa', q)}
                  className="text-[11px] rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 px-2.5 py-1 transition cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'polish-pod' && (
          <div className="space-y-2.5">
            <textarea
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              rows={3}
              placeholder="Paste rough driver field notes (e.g. 'dropped 6 lifts spf by back barn spoke to dave driveway muddy couldn't get closer')..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => handleRun('polish-pod')}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              <span>Polish Proof-of-Delivery Note</span>
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-800">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Running Gemini dispatch analysis...</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {result && !isLoading && !error && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs">
            {result.answer && (
              <div className="bg-white rounded-lg border border-slate-200 p-3 text-slate-800 leading-relaxed whitespace-pre-wrap">
                {result.answer}
              </div>
            )}

            {result.summary && (
              <div className="bg-white rounded-lg border border-slate-200 p-3 text-slate-800 font-medium">
                {result.summary}
              </div>
            )}

            {result.polishedNote && (
              <div className="bg-white rounded-lg border border-emerald-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800">Polished Customer-Ready POD Note</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('pod', result.polishedNote || '')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    {copiedField === 'pod' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedField === 'pod' ? 'Copied' : 'Copy Note'}
                  </button>
                </div>
                <p className="text-slate-700 leading-relaxed">{result.polishedNote}</p>
              </div>
            )}

            {result.warnings && result.warnings.length > 0 && (
              <div className="space-y-1">
                <p className="font-bold text-amber-800 uppercase tracking-wider text-[10px]">Capacity &amp; Dispatch Warnings</p>
                <ul className="space-y-1 text-amber-900">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.recommendations && result.recommendations.length > 0 && (
              <div className="space-y-2">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Recommended Assignments</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {result.recommendations.map((rec, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onHighlightDelivery?.(rec.deliveryId)}
                          className="font-mono font-bold text-blue-700 hover:underline cursor-pointer"
                        >
                          {rec.deliveryId}
                        </button>
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[10px]">
                          <Truck className="h-3 w-3 inline mr-1" />
                          {rec.recommendedTruck} • {rec.recommendedSlot}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800">{rec.customerName}</p>
                      <p className="text-slate-600">{rec.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.recommendedActions && result.recommendedActions.length > 0 && (
              <div className="space-y-1">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Suggested Actions</p>
                <ul className="space-y-1 text-slate-700">
                  {result.recommendedActions.map((act, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.highlightedDeliveryIds && result.highlightedDeliveryIds.length > 0 && onHighlightDelivery && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase text-slate-500">Jump to ticket:</span>
                {result.highlightedDeliveryIds.slice(0, 8).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onHighlightDelivery(id)}
                    className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-mono font-bold text-[11px] border border-blue-200 cursor-pointer"
                  >
                    {id}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
