import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertCircle, Check, X } from 'lucide-react';
import { getProjectWizardDefaults } from '../utils/project-wizard-defaults-client';
import { createClient } from '../utils/supabase/client';

interface DiagnosticPanelProps {
  organizationId: string;
  plannerType: 'deck' | 'garage' | 'shed' | 'kitchen';
  materialType?: string;
}

export function DiagnosticPanel({ organizationId, plannerType, materialType }: DiagnosticPanelProps) {
  const [defaults, setDefaults] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get defaults
      const defaultsData = await getProjectWizardDefaults(organizationId);
      setDefaults(defaultsData);

      // Get inventory items that are referenced
      const supabase = createClient();
      const inventoryIds = defaultsData
        .filter(d => d.inventory_item_id)
        .map(d => d.inventory_item_id);
      
      if (inventoryIds.length > 0) {
        const { data: inventoryData } = await supabase
          .from('inventory')
          .select('id, item_name, sku, unit_price, cost')
          .in('id', inventoryIds)
          .eq('organization_id', organizationId);
        
        setInventory(inventoryData || []);
      }
    } catch (error) {
      // Error loading diagnostic data
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [organizationId, plannerType, materialType]);

  const relevantDefaults = defaults.filter(d => 
    d.planner_type === plannerType &&
    (!materialType || !d.material_type || d.material_type.toLowerCase() === materialType.toLowerCase())
  );

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="w-5 h-5" />
          Pricing Diagnostics - {plannerType.charAt(0).toUpperCase() + plannerType.slice(1)}
          {materialType && ` (${materialType})`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={loadData} disabled={isLoading} size="sm">
          Refresh Data
        </Button>

        <div>
          <h3 className="font-semibold mb-2">Configuration Status:</h3>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              {relevantDefaults.length > 0 ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-red-600" />
              )}
              <span>Found {relevantDefaults.length} defaults for this planner type</span>
            </div>
          </div>
        </div>

        {relevantDefaults.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Configured Categories:</h3>
            <div className="space-y-2">
              {relevantDefaults.map((def, idx) => {
                const inventoryItem = inventory.find(i => i.id === def.inventory_item_id);
                const hasInventoryItem = !!inventoryItem;
                const hasT1Price = inventoryItem?.unit_price > 0;

                return (
                  <div key={idx} className="border rounded p-2 text-sm bg-muted">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{def.material_category}</div>
                        {def.material_type && (
                          <div className="text-xs text-muted-foreground">Type: {def.material_type}</div>
                        )}
                        {inventoryItem && (
                          <div className="text-xs text-muted-foreground mt-1">
                            <div>Item: {inventoryItem.item_name}</div>
                            <div>SKU: {inventoryItem.sku || 'N/A'}</div>
                            <div className={hasT1Price ? 'text-green-600' : 'text-red-600'}>
                              T1 Price: ${((inventoryItem.unit_price || 0) / 100).toFixed(2)}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {hasInventoryItem ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-red-600" />
                        )}
                        {hasT1Price ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-amber-600" title="No T1 price set" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {relevantDefaults.length === 0 && (
          <div className="text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded p-3">
            No defaults configured for this planner type. Go to Organization Settings → Project Wizard Material Defaults to configure.
          </div>
        )}

        <div className="text-xs text-muted-foreground border-t pt-3 mt-3">
          <div>Expected categories for Deck planner:</div>
          <div className="font-mono">Framing, Decking, Railing, Hardware</div>
        </div>
      </CardContent>
    </Card>
  );
}