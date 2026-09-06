import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  ExternalLink,
  RefreshCw,
  Clock,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  History,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Package,
} from 'lucide-react';
import { competitivePricingAPI } from '../../utils/api';
import type {
  ProductCompetitivePricing,
  CompetitorPriceEntry,
  MatchConfidence,
  PricingJobStatus,
} from '../../types/competitive-pricing';
import { PriceHistoryModal } from './PriceHistoryModal';
import { toast } from 'sonner@2.0.3';

interface CompetitivePricingPanelProps {
  productId: string | number;
  sku: string;
  productName: string;
  description?: string;
  currentPrice: number;
  unitOfMeasure?: string;
  category?: string;
  manufacturerPartNumber?: string;
  upc?: string;
  className?: string;
}

export function CompetitivePricingPanel({
  productId,
  sku,
  productName,
  description,
  currentPrice,
  unitOfMeasure = 'EA',
  category,
  manufacturerPartNumber,
  upc,
  className = '',
}: CompetitivePricingPanelProps) {
  const [data, setData] = useState<ProductCompetitivePricing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [jobStatus, setJobStatus] = useState<PricingJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Load existing pricing data
  const loadPricing = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await competitivePricingAPI.getPricing(productId);
      setData(res);
    } catch (err: any) {
      // If 404 or not found, we provide a clean initial state with 0 matches
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        setData({
          productId,
          sku,
          productName,
          yourPrice: currentPrice,
          currency: 'CAD',
          unitOfMeasure,
          competitors: [],
        });
      } else {
        setError(err.message || 'Failed to load competitor pricing');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      loadPricing();
    }
  }, [productId]);

  // Request manual background refresh via Playwright worker
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setJobStatus('QUEUED');
      toast.info('Queuing background pricing check across competitor websites...');

      const { jobId } = await competitivePricingAPI.requestRefresh(productId, {
        upc: upc || (data as any)?.upc,
        mfgPartNumber: manufacturerPartNumber || (data as any)?.mfgPartNumber,
        description: description || data?.description,
        name: productName || data?.productName,
      });

      // Poll background worker until completed
      await competitivePricingAPI.pollJobUntilComplete(
        jobId,
        (job) => {
          setJobStatus(job.status);
        },
        60000 // 60s max
      );

      toast.success('Competitor prices refreshed successfully!');
      await loadPricing();
    } catch (err: any) {
      toast.error(err.message || 'Pricing refresh failed');
      setError(err.message);
    } finally {
      setIsRefreshing(false);
      setJobStatus(null);
    }
  };

  // Helper for relative time
  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return 'Never checked';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Never checked';

    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
    const days = Math.floor(diffSec / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const isPriceOutdated = (isoString?: string) => {
    if (!isoString) return true;
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return true;
    const diffDays = (Date.now() - date.getTime()) / (1000 * 3600 * 24);
    return diffDays >= 7; // Outdated if >= 7 days
  };

  // Compute lowest competitor price
  const validCompetitors = (data?.competitors || []).filter(
    (c) => c.normalizedUnitPrice > 0 && c.matchConfidence !== 'UNMATCHED'
  );

  const lowestCompetitor = validCompetitors.reduce<CompetitorPriceEntry | null>((lowest, curr) => {
    if (!lowest || curr.normalizedUnitPrice < lowest.normalizedUnitPrice) {
      return curr;
    }
    return lowest;
  }, null);

  const yourPrice = currentPrice || data?.yourPrice || 0;
  const lowestPrice = lowestCompetitor ? lowestCompetitor.normalizedUnitPrice : null;
  const priceDifference = lowestPrice !== null ? Number((yourPrice - lowestPrice).toFixed(2)) : null;
  const variancePct =
    lowestPrice !== null && lowestPrice > 0
      ? Number(((priceDifference! / lowestPrice) * 100).toFixed(1))
      : null;

  // Render match confidence badge
  const renderConfidenceBadge = (confidence: MatchConfidence, method?: string) => {
    switch (confidence) {
      case 'EXACT':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 gap-1 font-medium text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Exact Match ({method || 'UPC / Part #'})
          </Badge>
        );
      case 'HIGH':
        return (
          <Badge className="bg-cyan-50 text-cyan-800 border-cyan-300 gap-1 font-medium text-xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-600" />
            High Confidence ({method || 'Mfg & Model'})
          </Badge>
        );
      case 'MEDIUM':
        return (
          <Badge className="bg-amber-50 text-amber-800 border-amber-300 gap-1 font-medium text-xs">
            <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
            Medium (Spec Match)
          </Badge>
        );
      case 'LOW':
        return (
          <Badge className="bg-rose-50 text-rose-800 border-rose-300 gap-1 font-medium text-xs">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
            Low (Review Required)
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-300 gap-1 font-medium text-xs">
            Unmatched
          </Badge>
        );
    }
  };

  return (
    <Card className={`border-slate-200 shadow-xs ${className}`}>
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold text-slate-900">
                Competitive Pricing Intelligence
              </CardTitle>
              <Badge variant="outline" className="text-xs text-slate-600 bg-slate-50 border-slate-200">
                RONA Atlantic vs Market
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live market pricing retrieved via automated background checks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistoryModal(true)}
              className="h-8 text-xs text-slate-700 gap-1.5"
            >
              <History className="h-3.5 w-3.5 text-slate-500" />
              History
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing
                ? jobStatus === 'RUNNING'
                  ? 'Worker Scraping...'
                  : 'Queued in Worker...'
                : 'Refresh Prices'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-500 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-xs">Fetching competitor records...</span>
          </div>
        ) : error ? (
          <Alert className="border-red-200 bg-red-50 text-red-800 text-xs">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadPricing}
                className="h-6 text-xs text-red-700 hover:text-red-900 underline"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Active Product Identity Header & Matching Criteria Verification */}
            <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                  {data?.productName || productName}
                </h4>
                <Badge variant="outline" className="text-[10px] font-mono font-medium px-2 py-0 bg-white text-slate-700 border-slate-300">
                  SKU: {data?.sku || sku}
                </Badge>
              </div>
              {(data?.description || description) && (
                <p className="text-xs text-slate-500 font-medium line-clamp-2">
                  {data?.description || description}
                </p>
              )}
              {/* Active Matching Criteria Badges */}
              <div className="mt-1 pt-1.5 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="font-semibold text-slate-500 uppercase tracking-wider">Matching Criteria:</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-medium">
                  UPC: {upc || (data as any)?.upc || 'N/A'}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono font-medium">
                  Supplier SKU (MFG #): {manufacturerPartNumber || (data as any)?.mfgPartNumber || 'N/A'}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-medium truncate max-w-[240px]">
                  Description: {data?.description || description || productName}
                </span>
              </div>
            </div>

            {/* Top Pricing Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              {/* Your Price */}
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                  Your Selling Price (RONA)
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-900">
                    ${yourPrice.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500">CAD / {unitOfMeasure}</span>
                </div>
              </div>

              {/* Lowest Market Price */}
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                  Lowest Competitor Price
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  {lowestPrice !== null ? (
                    <>
                      <span className="text-2xl font-bold text-slate-900">
                        ${lowestPrice.toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-500">
                        CAD ({lowestCompetitor?.competitorName})
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-slate-400">No active match</span>
                  )}
                </div>
              </div>

              {/* Difference / Variance */}
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                  Market Variance
                </span>
                <div className="mt-1 flex items-center gap-1.5">
                  {priceDifference !== null ? (
                    priceDifference > 0 ? (
                      <div className="flex items-center gap-1 text-amber-700 font-semibold text-sm">
                        <TrendingUp className="h-4 w-4 text-amber-600" />
                        <span>+${priceDifference.toFixed(2)} (+{variancePct}%)</span>
                        <span className="text-xs font-normal text-slate-500 ml-1">(RONA Higher)</span>
                      </div>
                    ) : priceDifference < 0 ? (
                      <div className="flex items-center gap-1 text-emerald-700 font-semibold text-sm">
                        <TrendingDown className="h-4 w-4 text-emerald-600" />
                        <span>-${Math.abs(priceDifference).toFixed(2)} ({variancePct}%)</span>
                        <span className="text-xs font-normal text-slate-500 ml-1">(RONA Lower)</span>
                      </div>
                    ) : (
                      <div className="text-slate-700 font-semibold text-sm">
                        <span>$0.00 (Matching Market)</span>
                      </div>
                    )
                  ) : (
                    <span className="text-xs text-slate-400">Awaiting competitor check</span>
                  )}
                </div>
              </div>
            </div>

            {/* Competitor Cards List */}
            {data && data.competitors && data.competitors.length > 0 ? (
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                  Monitored Competitors ({data.competitors.length})
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.competitors.map((comp) => {
                    const outdated = isPriceOutdated(comp.checkedAt);
                    const isLowConfidence =
                      comp.matchConfidence === 'LOW' || comp.matchConfidence === 'UNMATCHED';

                    return (
                      <div
                        key={comp.competitorId}
                        className={`p-3.5 rounded-lg border transition-all ${
                          isLowConfidence
                            ? 'border-amber-200 bg-amber-50/40'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {/* Competitor Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-semibold text-sm text-slate-900">
                                {comp.competitorName}
                              </h4>
                              {comp.productUrl && (
                                <a
                                  href={comp.productUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800"
                                  title="View on competitor website"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-1 mt-0.5" title={comp.productName}>
                              {comp.productName || 'Equivalent product matched'}
                            </p>
                          </div>

                          <Badge
                            variant="outline"
                            className={`text-xs capitalize ${
                              comp.availability === 'IN_STOCK'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {comp.availability === 'IN_STOCK' ? 'In Stock' : comp.availability.replace('_', ' ').toLowerCase()}
                          </Badge>
                        </div>

                        {/* Pricing & Normalization Display */}
                        <div className="py-2 px-2.5 bg-slate-50/80 rounded border border-slate-100 mb-2.5">
                          <div className="flex items-baseline justify-between">
                            <div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold text-slate-900">
                                  ${comp.price.toFixed(2)}
                                </span>
                                <span className="text-xs text-slate-500">{comp.currency}</span>
                                {comp.salePrice && comp.regularPrice && (
                                  <span className="text-xs text-slate-400 line-through ml-1">
                                    ${comp.regularPrice.toFixed(2)}
                                  </span>
                                )}
                              </div>

                              {/* Pack quantity normalization callout */}
                              {comp.packQuantity && comp.packQuantity > 1 ? (
                                <div className="text-xs text-blue-700 font-medium mt-0.5 flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  <span>
                                    Pack of {comp.packQuantity} → Normalized to $
                                    {comp.normalizedUnitPrice.toFixed(2)} / {unitOfMeasure}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500">
                                  Per {comp.unitOfMeasure || unitOfMeasure}
                                </span>
                              )}
                            </div>

                            {/* Price difference vs RONA */}
                            {comp.normalizedUnitPrice > 0 && (
                              <div className="text-right">
                                {comp.normalizedUnitPrice < yourPrice ? (
                                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    -${(yourPrice - comp.normalizedUnitPrice).toFixed(2)} (Competitor Lower)
                                  </span>
                                ) : comp.normalizedUnitPrice > yourPrice ? (
                                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                    +${(comp.normalizedUnitPrice - yourPrice).toFixed(2)} (Competitor Higher)
                                  </span>
                                ) : (
                                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                    Matches RONA
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Match Confidence & Last Checked Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                          <div>
                            {renderConfidenceBadge(comp.matchConfidence, comp.matchMethod)}
                          </div>

                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>{formatTimeAgo(comp.checkedAt)}</span>
                            {outdated && (
                              <span className="ml-1 text-xs font-medium text-amber-600 bg-amber-100 px-1 rounded">
                                Outdated
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Low confidence warning message */}
                        {isLowConfidence && (
                          <p className="text-[11px] text-amber-800 mt-2 bg-amber-100/60 p-1.5 rounded flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />
                            <span>Verify specifications before relying on this pricing match.</span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <Package className="h-8 w-8 text-slate-400 mx-auto mb-1.5" />
                <p className="text-sm font-medium text-slate-700">No Competitor Pricing Stored Yet</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Click &ldquo;Refresh Prices&rdquo; to launch a Playwright check across Kent and The Home Depot for this product.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Historical Price Analysis Modal */}
      <PriceHistoryModal
        open={showHistoryModal}
        onOpenChange={setShowHistoryModal}
        productId={productId}
        productName={productName}
        sku={sku}
        yourPrice={yourPrice}
      />
    </Card>
  );
}
