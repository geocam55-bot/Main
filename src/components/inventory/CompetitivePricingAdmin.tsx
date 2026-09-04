import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import {
  Globe,
  Settings,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ExternalLink,
  Shield,
  Loader2,
} from 'lucide-react';
import { competitivePricingAPI } from '../../utils/api';
import type { CompetitorConfig } from '../../types/competitive-pricing';
import { toast } from 'sonner@2.0.3';

export function CompetitivePricingAdmin() {
  const [competitors, setCompetitors] = useState<CompetitorConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);

  const loadCompetitors = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await competitivePricingAPI.getCompetitors();
      setCompetitors(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load competitor configurations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompetitors();
  }, []);

  const handleToggleActive = async (comp: CompetitorConfig) => {
    try {
      setUpdatingId(comp.id);
      const updated = await competitivePricingAPI.updateCompetitor(comp.id, {
        active: !comp.active,
      });
      setCompetitors((prev) =>
        prev.map((c) => (c.id === comp.id ? { ...c, active: updated.active } : c))
      );
      toast.success(`${comp.name} status updated to ${updated.active ? 'Active' : 'Inactive'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update competitor status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Competitor Scraper & Matching Administration
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure regional competitors, Playwright scraping rules, and view background worker health.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadCompetitors}
          disabled={isLoading}
          className="h-8 gap-1.5 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>

      {/* Competitor Configuration Cards */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="bg-slate-50 py-3 px-4 border-b border-slate-200">
          <CardTitle className="text-sm font-semibold text-slate-800">
            Monitored Competitor Websites
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-xs">Loading competitor rules...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-xs text-red-600 bg-red-50">{error}</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {competitors.map((comp) => (
                <div key={comp.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-600" />
                      <h4 className="text-sm font-semibold text-slate-900">{comp.name}</h4>
                      <a
                        href={comp.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-600"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    <div className="text-xs text-slate-500">
                      <span>URL: </span>
                      <span className="font-mono text-[11px] text-slate-700">{comp.websiteUrl}</span>
                    </div>
                    {comp.scrapingMethod && (
                      <div className="text-[11px] text-slate-400">
                        Method: <span className="font-mono">{comp.scrapingMethod}</span>
                      </div>
                    )}
                  </div>

                  {/* Status and Health */}
                  <div className="flex items-center gap-6">
                    <div className="text-right text-xs">
                      {comp.lastSuccessfulCheck ? (
                        <div className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Last success: {new Date(comp.lastSuccessfulCheck).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">No successful checks yet</span>
                      )}

                      {comp.lastError && (
                        <div className="text-rose-600 flex items-center gap-1 text-[11px] mt-0.5">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span className="max-w-xs truncate" title={comp.lastError}>
                            {comp.lastError}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                      <span className="text-xs font-medium text-slate-600">
                        {comp.active ? 'Active' : 'Disabled'}
                      </span>
                      <Switch
                        checked={comp.active}
                        disabled={updatingId === comp.id}
                        onCheckedChange={() => handleToggleActive(comp)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Matching Priorities & Rules Guide (Section 7) */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200">
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600" />
            Standard Product Matching Hierarchy & Confidence Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3 text-xs text-slate-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-800 block">Level 1: Exact Manufacturer Part Number</span>
              <p className="text-slate-600">
                Matched when the manufacturer part number on RONA equals the competitor part number exactly (Match Confidence: <strong className="text-emerald-700">EXACT</strong>).
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-800 block">Level 2: Exact UPC / Barcode</span>
              <p className="text-slate-600">
                Matched when the 12-digit UPC/EAN code matches exactly (Match Confidence: <strong className="text-emerald-700">EXACT</strong>).
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-800 block">Level 3: Manufacturer + Model Number</span>
              <p className="text-slate-600">
                Brand and model number match exactly (Match Confidence: <strong className="text-cyan-700">HIGH</strong>).
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-800 block">Level 4: Product Description & Spec Matrix</span>
              <p className="text-slate-600">
                Dimensions, grade, material, and unit of measure are matched with normalization (Match Confidence: <strong className="text-amber-700">MEDIUM / REVIEW</strong>).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
