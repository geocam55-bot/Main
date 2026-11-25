import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Sparkles, TrendingUp, Target, AlertTriangle, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { runCRMIntelligence, type SalesAnalysisResponse } from '../../utils/ai-client';

interface AISalesAnalysisCardProps {
  showCost: boolean;
}

export function AISalesAnalysisCard({ showCost }: AISalesAnalysisCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SalesAnalysisResponse | null>(null);

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await runCRMIntelligence<SalesAnalysisResponse>({
        mode: 'sales-analysis',
        scope: 'team',
        includeCostData: showCost,
      });
      setAnalysis(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate AI sales analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatMoney = (val?: number) => {
    if (typeof val !== 'number' || Number.isNaN(val)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/70 via-white to-emerald-50/40 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                AI Sales Analysis &amp; Revenue Opportunities
              </CardTitle>
              <p className="text-xs text-slate-500">
                Identify sales trends, purchasing behavior shifts, and pipeline growth targets
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleRunAnalysis}
            disabled={isLoading}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analyzing Sales...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                {analysis ? 'Refresh AI Analysis' : 'Run AI Sales Analysis'}
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {(error || analysis) && (
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {analysis && (
            <>
              {analysis.totals && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">YTD Sales</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{formatMoney(analysis.totals.totalYtdSales)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Last Year Sales</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{formatMoney(analysis.totals.totalLyrSales)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Open Pipeline</p>
                    <p className="mt-1 text-lg font-bold text-emerald-700">{formatMoney(analysis.totals.totalOpenPipelineValue)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Inactive &gt;30d</p>
                    <p className="mt-1 text-lg font-bold text-amber-700">{analysis.totals.inactiveOver30DaysCount} accounts</p>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-indigo-100 bg-white p-4">
                <p className="text-sm font-medium text-slate-800">{analysis.executiveSummary}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                    Sales Trends
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {analysis.trends?.map((t, i) => (
                      <li key={i}>• {t}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                    <Target className="h-3.5 w-3.5 text-emerald-600" />
                    Revenue Opportunities
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {analysis.revenueOpportunities?.map((t, i) => (
                      <li key={i}>• {t}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    At-Risk Revenue
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {analysis.atRiskRevenue?.map((t, i) => (
                      <li key={i}>• {t}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                    Next Actions
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {analysis.recommendedActions?.map((t, i) => (
                      <li key={i}>• {t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
