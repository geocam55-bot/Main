import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Search,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  Filter,
  BarChart3,
  Loader2,
  Calendar,
  Plus,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { CompetitivePricingPanel } from './CompetitivePricingPanel';
import { competitivePricingAPI } from '../../utils/api';
import type {
  PricingDashboardMetrics,
  PricingDashboardItem,
  MatchConfidence,
} from '../../types/competitive-pricing';
import { PriceHistoryModal } from './PriceHistoryModal';
import { toast } from 'sonner@2.0.3';

interface CompetitivePricingDashboardProps {
  onSelectProduct?: (productId: string | number) => void;
}

export function CompetitivePricingDashboard({ onSelectProduct }: CompetitivePricingDashboardProps) {
  const [metrics, setMetrics] = useState<PricingDashboardMetrics>({
    totalMonitored: 0,
    withCompetitivePricing: 0,
    noMatch: 0,
    ronaHigher: 0,
    ronaLower: 0,
    outdatedPrices: 0,
    lastSuccessfulUpdate: null,
  });
  const [items, setItems] = useState<PricingDashboardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [varianceFilter, setVarianceFilter] = useState('all');
  const [confidenceFilter, setConfidenceFilter] = useState('all');

  // History modal state
  const [historyTarget, setHistoryTarget] = useState<PricingDashboardItem | null>(null);

  // Quick SKU check modal state
  const [isQuickCheckOpen, setIsQuickCheckOpen] = useState(false);
  const [quickCheckSku, setQuickCheckSku] = useState('');
  const [activeCheckedItem, setActiveCheckedItem] = useState<{
    productId: string;
    sku: string;
    name: string;
    description?: string;
    price: number;
  } | null>(null);

  const handleRunQuickCheck = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = quickCheckSku.trim();
    if (!query) {
      toast.error('Please enter a SKU or Product Code to check');
      return;
    }

    // Try finding in loaded items or create check request
    const existing = items.find(
      (i) => i.sku.toLowerCase() === query.toLowerCase() || String(i.productId).toLowerCase() === query.toLowerCase()
    );

    if (existing) {
      setActiveCheckedItem({
        productId: String(existing.productId),
        sku: existing.sku,
        name: existing.name,
        description: existing.description,
        price: existing.yourPrice,
      });
    } else {
      setActiveCheckedItem({
        productId: query,
        sku: query,
        name: `Product ${query}`,
        description: '',
        price: 0,
      });
    }
  };

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await competitivePricingAPI.getDashboard({
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        varianceFilter: varianceFilter !== 'all' ? varianceFilter : undefined,
        confidenceFilter: confidenceFilter !== 'all' ? confidenceFilter : undefined,
        search: searchQuery.trim() || undefined,
      });

      setMetrics(res.metrics);
      setItems(res.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load pricing dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [categoryFilter, varianceFilter, confidenceFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadDashboard();
  };

  // Extract unique categories from items
  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));

  const renderConfidenceBadge = (conf: MatchConfidence) => {
    switch (conf) {
      case 'EXACT':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[11px]">Exact</Badge>;
      case 'HIGH':
        return <Badge className="bg-cyan-50 text-cyan-700 border-cyan-300 text-[11px]">High</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-300 text-[11px]">Medium</Badge>;
      case 'LOW':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-300 text-[11px]">Review</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[11px]">None</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Global Refresh Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Competitive Pricing Intelligence Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time market price monitoring for RONA Atlantic products against regional competitors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {metrics.lastSuccessfulUpdate && (
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>
                Last sweep: {new Date(metrics.lastSuccessfulUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setQuickCheckSku('');
              setActiveCheckedItem(null);
              setIsQuickCheckOpen(true);
            }}
            className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Check SKU Price
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboard}
            disabled={isLoading}
            className="h-8 gap-1.5 text-xs text-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* KPI Metric Summary Cards (Section 12.3) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Products Monitored */}
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Monitored
            </span>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {metrics.totalMonitored.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Catalog Items</span>
          </CardContent>
        </Card>

        {/* Products with Competitive Pricing */}
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Matched
            </span>
            <div className="mt-1 text-2xl font-bold text-emerald-700">
              {metrics.withCompetitivePricing.toLocaleString()}
            </div>
            <span className="text-[11px] text-emerald-600 mt-0.5 block">
              {metrics.totalMonitored > 0
                ? `${Math.round((metrics.withCompetitivePricing / metrics.totalMonitored) * 100)}% coverage`
                : '0% coverage'}
            </span>
          </CardContent>
        </Card>

        {/* Products with No Match */}
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Unmatched
            </span>
            <div className="mt-1 text-2xl font-bold text-slate-600">
              {metrics.noMatch.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Pending sweep</span>
          </CardContent>
        </Card>

        {/* Products where RONA is Lower */}
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              RONA Cheaper
            </span>
            <div className="mt-1 text-2xl font-bold text-emerald-600 flex items-center gap-1">
              <TrendingDown className="h-5 w-5" />
              {metrics.ronaLower.toLocaleString()}
            </div>
            <span className="text-[11px] text-emerald-700 mt-0.5 block">Competitive advantage</span>
          </CardContent>
        </Card>

        {/* Products where RONA is Higher */}
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              RONA Higher
            </span>
            <div className="mt-1 text-2xl font-bold text-amber-600 flex items-center gap-1">
              <TrendingUp className="h-5 w-5" />
              {metrics.ronaHigher.toLocaleString()}
            </div>
            <span className="text-[11px] text-amber-700 mt-0.5 block">Margin / price review</span>
          </CardContent>
        </Card>

        {/* Outdated Prices */}
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Outdated (&gt;7d)
            </span>
            <div className="mt-1 text-2xl font-bold text-rose-600 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              {metrics.outdatedPrices.toLocaleString()}
            </div>
            <span className="text-[11px] text-rose-600 mt-0.5 block">Needs refresh</span>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by SKU, product description, or competitor..."
                className="pl-9 h-9 text-xs"
              />
            </form>

            {/* Category Filter */}
            <div className="w-full md:w-48">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Variance Filter */}
            <div className="w-full md:w-48">
              <Select value={varianceFilter} onValueChange={setVarianceFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Price Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Price States</SelectItem>
                  <SelectItem value="higher">RONA Higher (+)</SelectItem>
                  <SelectItem value="lower">RONA Lower (-)</SelectItem>
                  <SelectItem value="no_match">No Match</SelectItem>
                  <SelectItem value="outdated">Outdated (&gt;7d)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Confidence Filter */}
            <div className="w-full md:w-44">
              <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Confidence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Confidences</SelectItem>
                  <SelectItem value="EXACT">Exact Match</SelectItem>
                  <SelectItem value="HIGH">High Confidence</SelectItem>
                  <SelectItem value="MEDIUM">Medium Confidence</SelectItem>
                  <SelectItem value="LOW">Review Needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Data Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-200 py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-800">
              Pricing Comparison Matrix ({items.length} products displayed)
            </CardTitle>
            <span className="text-xs text-slate-500">
              Prices normalized to per-unit comparison
            </span>
          </div>
        </CardHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600 mb-2" />
            <span className="text-xs">Loading comparison matrix...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-red-600 bg-red-50">
            <p className="font-semibold mb-1">Failed to load competitive pricing data</p>
            <p className="text-xs">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Calendar className="h-10 w-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">No Matching Products Found</p>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search criteria or filter selections.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/75 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">SKU / Code</th>
                  <th className="py-2.5 px-3 font-semibold">Product Description</th>
                  <th className="py-2.5 px-3 font-semibold">Category</th>
                  <th className="py-2.5 px-3 font-semibold text-right">RONA Retail</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Lowest Competitor</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Variance ($ / %)</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Confidence</th>
                  <th className="py-2.5 px-3 font-semibold">Freshness</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {items.map((item) => {
                  const hasLowest = item.lowestCompetitorPrice !== null && item.lowestCompetitorPrice > 0;
                  const diff = item.priceDifference;
                  const varPct = item.variancePct;

                  return (
                    <tr key={item.productId} className="hover:bg-slate-50 transition-colors">
                      {/* SKU */}
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900 whitespace-nowrap">
                        {item.sku}
                      </td>

                      {/* Product Name & Description (identical to Inventory Table) */}
                      <td className="py-2.5 px-3 max-w-sm">
                        <div className="font-semibold text-slate-900 truncate" title={item.name}>
                          {item.name}
                        </div>
                        {item.description && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5" title={item.description}>
                            {item.description}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {item.category || 'Uncategorized'}
                      </td>

                      {/* RONA Price */}
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                        ${item.yourPrice.toFixed(2)}
                      </td>

                      {/* Lowest Competitor */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {hasLowest ? (
                          <div>
                            <span className="font-semibold text-slate-800">
                              ${item.lowestCompetitorPrice!.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {item.lowestCompetitorName || 'Competitor'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No match</span>
                        )}
                      </td>

                      {/* Variance */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {diff !== null ? (
                          diff > 0 ? (
                            <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                              +${diff.toFixed(2)} (+{varPct}%)
                            </span>
                          ) : diff < 0 ? (
                            <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                              -${Math.abs(diff).toFixed(2)} ({varPct}%)
                            </span>
                          ) : (
                            <span className="font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                              $0.00
                            </span>
                          )
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Match Confidence */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {renderConfidenceBadge(item.matchConfidence)}
                      </td>

                      {/* Freshness */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {item.lastCheckedAt ? (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <span>
                              {new Date(item.lastCheckedAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            {item.isOutdated && (
                              <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1 rounded">
                                Stale
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Never</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setHistoryTarget(item)}
                            className="h-7 px-2 text-[11px] text-slate-600 hover:text-blue-600"
                            title="View price history chart"
                          >
                            History
                          </Button>
                          {onSelectProduct && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onSelectProduct(item.productId)}
                              className="h-7 px-2 text-[11px] text-blue-600 hover:bg-blue-50"
                            >
                              Inspect
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* History modal */}
      {historyTarget && (
        <PriceHistoryModal
          open={!!historyTarget}
          onOpenChange={(open) => !open && setHistoryTarget(null)}
          productId={historyTarget.productId}
          productName={historyTarget.name}
          description={historyTarget.description}
          sku={historyTarget.sku}
          yourPrice={historyTarget.yourPrice}
        />
      )}

      {/* Quick Check SKU Modal */}
      <Dialog open={isQuickCheckOpen} onOpenChange={setIsQuickCheckOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Search className="h-5 w-5 text-blue-600" />
              Quick SKU Competitor Price Check
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Enter any RONA SKU, Product Code, or Manufacturer Part Number to inspect competitive pricing against KENT and The Home Depot.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <form onSubmit={handleRunQuickCheck} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={quickCheckSku}
                  onChange={(e) => setQuickCheckSku(e.target.value)}
                  placeholder="Enter SKU (e.g. 00275076, 2x4-SPF-8, or Part #)..."
                  className="pl-9 text-xs"
                  autoFocus
                />
              </div>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4">
                Lookup
              </Button>
            </form>

            {/* If quick item resolved */}
            {activeCheckedItem && (
              <div className="pt-2">
                <CompetitivePricingPanel
                  productId={activeCheckedItem.productId}
                  sku={activeCheckedItem.sku}
                  productName={activeCheckedItem.name}
                  description={activeCheckedItem.description}
                  currentPrice={activeCheckedItem.price}
                  unitOfMeasure="EA"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
