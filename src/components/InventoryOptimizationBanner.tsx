import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Zap, X, Info, Database, Clock } from 'lucide-react';
import { getInventoryPerformanceMetrics, getDatabaseOptimizationInstructions } from '../utils/inventory-optimization';
import { copyToClipboard } from '../utils/clipboard';

interface InventoryOptimizationBannerProps {
  organizationId: string;
  itemCount: number;
  loadTimeMs: number;
}

export function InventoryOptimizationBanner({ organizationId, itemCount, loadTimeMs }: InventoryOptimizationBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show banner if load time is >3 seconds and has significant data
    const needsOptimization = loadTimeMs > 3000 && itemCount > 1000;
    
    // Check if user has dismissed this banner
    const dismissedKey = `inventory-optimization-dismissed-${organizationId}`;
    const wasDismissed = localStorage.getItem(dismissedKey) === 'true';
    
    if (needsOptimization && !wasDismissed) {
      setShowBanner(true);
      
      // Load performance metrics
      getInventoryPerformanceMetrics(organizationId)
        .then(m => setMetrics(m))
        .catch(_err => { /* Failed to load metrics */ });
    }
  }, [loadTimeMs, itemCount, organizationId]);

  const handleDismiss = () => {
    const dismissedKey = `inventory-optimization-dismissed-${organizationId}`;
    localStorage.setItem(dismissedKey, 'true');
    setShowBanner(false);
    setDismissed(true);
  };

  const handleShowInstructions = () => {
    setShowInstructions(true);
  };

  if (!showBanner || dismissed) {
    return null;
  }

  return (
    <>
      <Alert className="mb-4 border-yellow-500 bg-yellow-50">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-yellow-900">Slow Inventory Performance Detected</span>
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-700">{(loadTimeMs / 1000).toFixed(1)}s load time</span>
            </div>
            <AlertDescription className="text-yellow-800">
              Your inventory has {itemCount.toLocaleString()} items and queries are taking {(loadTimeMs / 1000).toFixed(1)} seconds. 
              Adding database indexes can speed this up to under 1 second (10-30x faster). 
              <button 
                onClick={handleShowInstructions}
                className="underline font-medium ml-1 hover:text-yellow-900"
              >
                Click here for quick setup instructions
              </button>
            </AlertDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-yellow-700 hover:text-yellow-900 hover:bg-yellow-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Speed Up Your Inventory (10-30x Faster)
            </DialogTitle>
            <DialogDescription>
              Follow these steps to add database indexes and dramatically improve performance
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Performance Metrics */}
            {metrics && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Current Performance</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-blue-700">Total Items:</span>
                    <span className="ml-2 font-medium">{metrics.totalItems.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">First Page Load:</span>
                    <span className="ml-2 font-medium">{metrics.firstPageQueryMs.toFixed(0)}ms</span>
                  </div>
                  {metrics.needsOptimization && (
                    <div className="col-span-2">
                      <span className="text-red-600 font-medium">⚠️ Performance needs optimization</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 1 */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                Access Supabase SQL Editor
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-sm ml-8">
                <li>Go to <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Supabase Dashboard</a></li>
                <li>Select your ProSpaces CRM project</li>
                <li>Click "SQL Editor" in the left sidebar</li>
              </ol>
            </div>

            {/* Step 2 */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                Run This SQL Code
              </h3>
              <p className="text-sm ml-8 mb-2">Copy and paste this into the SQL editor and click "RUN":</p>
              <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto ml-8">
                <pre>{`-- Enable trigram extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index on organization_id (CRITICAL - speeds up filtering)
CREATE INDEX IF NOT EXISTS idx_inventory_organization_id 
ON inventory(organization_id);

-- Composite index (speeds up sorted queries)
CREATE INDEX IF NOT EXISTS idx_inventory_org_name 
ON inventory(organization_id, name);

-- Index on SKU for fast lookups
CREATE INDEX IF NOT EXISTS idx_inventory_sku 
ON inventory(sku);

-- Trigram indexes for fast text search
CREATE INDEX IF NOT EXISTS idx_inventory_name_trgm 
ON inventory USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_inventory_description_trgm 
ON inventory USING gin(description gin_trgm_ops);

-- Update statistics
ANALYZE inventory;`}</pre>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-8"
                onClick={() => {
                  const sql = `-- Enable trigram extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index on organization_id (CRITICAL - speeds up filtering)
CREATE INDEX IF NOT EXISTS idx_inventory_organization_id 
ON inventory(organization_id);

-- Composite index (speeds up sorted queries)
CREATE INDEX IF NOT EXISTS idx_inventory_org_name 
ON inventory(organization_id, name);

-- Index on SKU for fast lookups
CREATE INDEX IF NOT EXISTS idx_inventory_sku 
ON inventory(sku);

-- Trigram indexes for fast text search
CREATE INDEX IF NOT EXISTS idx_inventory_name_trgm 
ON inventory USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_inventory_description_trgm 
ON inventory USING gin(description gin_trgm_ops);

-- Update statistics
ANALYZE inventory;`;
                  copyToClipboard(sql);
                }}
              >
                📋 Copy SQL to Clipboard
              </Button>
            </div>

            {/* Step 3 */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                Verify & Test
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-sm ml-8">
                <li>You should see "Success. No rows returned" message</li>
                <li>Refresh this inventory page</li>
                <li>Load time should drop from {(loadTimeMs / 1000).toFixed(1)}s to under 1 second</li>
              </ol>
            </div>

            {/* Expected Results */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">✅ Expected Results</h3>
              <ul className="space-y-1 text-sm text-green-800">
                <li>• Initial load: {(loadTimeMs / 1000).toFixed(1)}s → 0.5-1s (10-30x faster)</li>
                <li>• Search queries: Much faster response</li>
                <li>• Scalability: Handles 100k+ items efficiently</li>
                <li>• No code changes needed - indexes work automatically</li>
              </ul>
            </div>

            {/* Why This Works */}
            <div className="text-sm text-muted-foreground border-t pt-4">
              <p className="font-medium mb-1">💡 Why This Works:</p>
              <p>
                Without indexes, PostgreSQL scans all {itemCount.toLocaleString()} rows one by one. 
                Indexes create fast lookup structures (like a book's index), allowing the database 
                to find your organization's {itemCount.toLocaleString()} items in milliseconds instead of seconds.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setShowInstructions(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                window.open('https://app.supabase.com', '_blank');
              }}
            >
              <Database className="h-4 w-4 mr-2" />
              Open Supabase Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}