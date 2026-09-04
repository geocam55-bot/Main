import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, TrendingUp, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { competitivePricingAPI } from '../../utils/api';
import type { PriceHistoryRecord } from '../../types/competitive-pricing';

interface PriceHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | number;
  productName: string;
  description?: string;
  sku: string;
  yourPrice: number;
}

export function PriceHistoryModal({
  open,
  onOpenChange,
  productId,
  productName,
  description,
  sku,
  yourPrice,
}: PriceHistoryModalProps) {
  const [history, setHistory] = useState<PriceHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !productId) return;
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    competitivePricingAPI
      .getPriceHistory(productId)
      .then((data) => {
        if (isMounted) setHistory(data || []);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to load historical pricing data');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, productId]);

  // Transform records into charting series aggregated by check date
  const chartData = (() => {
    const map = new Map<string, any>();
    // Sort chronological
    const sorted = [...history].sort(
      (a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime()
    );

    sorted.forEach((rec) => {
      const dateKey = new Date(rec.checkedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      if (!map.has(dateKey)) {
        map.set(dateKey, {
          date: dateKey,
          'Your Price': yourPrice,
        });
      }
      const entry = map.get(dateKey);
      entry[rec.competitorName] = rec.normalizedUnitPrice || rec.price;
    });

    return Array.from(map.values());
  })();

  const uniqueCompetitors = Array.from(new Set(history.map((h) => h.competitorName)));
  const competitorColors: Record<string, string> = {
    'KENT Building Supplies': '#d97706',
    'The Home Depot': '#dc2626',
    Kent: '#d97706',
    'Home Depot': '#dc2626',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <DialogTitle className="text-xl font-semibold text-slate-900">
              Price History & Trend Analysis
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-slate-600 space-y-0.5">
            <div>
              Historical pricing comparisons for <span className="font-semibold text-slate-800">{productName}</span> (SKU: {sku})
            </div>
            {description && (
              <div className="text-xs text-slate-500 font-medium">
                {description}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
            <p className="text-sm">Loading historical price records...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-3 my-4">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">Unable to fetch pricing history</p>
              <p>{error}</p>
            </div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200 my-4">
            <Calendar className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No Historical Records Recorded Yet</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Historical prices are logged automatically each time scheduled background checks run or when a manual refresh is completed.
            </p>
          </div>
        ) : (
          <div className="space-y-6 my-2">
            {/* Chart Container */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-slate-800">
                  Normalized Unit Price Trend (CAD)
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600"></span> Your Retail: ${yourPrice.toFixed(2)}
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis
                      domain={['auto', 'auto']}
                      tickFormatter={(val) => `$${val}`}
                      tick={{ fontSize: 12, fill: '#64748b' }}
                    />
                    <Tooltip
                      formatter={(val: any) => [`$${Number(val).toFixed(2)} CAD`, '']}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, borderColor: '#e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="Your Price"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    {uniqueCompetitors.map((comp, idx) => (
                      <Line
                        key={comp}
                        type="monotone"
                        dataKey={comp}
                        stroke={competitorColors[comp] || ['#10b981', '#8b5cf6', '#f59e0b'][idx % 3]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Check History Log ({history.length} checks)
                </h4>
              </div>
              <div className="max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 font-medium">Checked Date</th>
                      <th className="py-2 px-3 font-medium">Competitor</th>
                      <th className="py-2 px-3 font-medium">Recorded Price</th>
                      <th className="py-2 px-3 font-medium">Normalized Unit</th>
                      <th className="py-2 px-3 font-medium">Stock Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {history.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 whitespace-nowrap">
                          {new Date(record.checkedAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800 whitespace-nowrap">
                          {record.competitorName}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          ${record.price.toFixed(2)} {record.currency}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">
                          ${record.normalizedUnitPrice.toFixed(2)} {record.currency}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={
                              record.availability === 'IN_STOCK'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }
                          >
                            {record.availability || 'IN_STOCK'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-200">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
