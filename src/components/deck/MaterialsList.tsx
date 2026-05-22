import React from 'react';
import { DeckMaterials } from '../../types/deck';
import { Package, Wrench, Fence, Hammer } from 'lucide-react';

interface MaterialsListProps {
  materials: DeckMaterials;
  compact?: boolean;
}

/** Render a material quantity cell — shows converted purchase qty when CF is applied */
function QtyCell({ item }: { item: any }) {
  if (item.conversionFactor && item.conversionFactor !== 1 && item.convertedQuantity != null) {
    const displayQty = item.convertedQuantity < 1
      ? item.convertedQuantity.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
      : item.convertedQuantity.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    return (
      <div className="text-right">
        <span className="text-amber-700 font-semibold">{displayQty}</span>
        {item.orderQuantity != null && item.orderQuantity !== item.convertedQuantity && (
          <span className="block text-xs text-muted-foreground">
            Order: {item.orderQuantity} {item.convertedUnit || 'units'}
          </span>
        )}
        <span className="block text-xs text-amber-600">
          ({item.quantity} {item.unit} × {item.conversionFactor})
        </span>
      </div>
    );
  }
  return <span>{item.quantity}</span>;
}

/** Render unit cell — shows converted unit when CF applied */
function UnitCell({ item }: { item: any }) {
  if (item.conversionFactor && item.conversionFactor !== 1 && item.convertedUnit) {
    return <span className="text-amber-700 font-medium">{item.convertedUnit}</span>;
  }
  return <span>{item.unit}</span>;
}

export function MaterialsList({ materials, compact = false }: MaterialsListProps) {
  const allItems = [
    ...(materials.framing || []),
    ...(materials.decking || []),
    ...(materials.railing || []),
    ...(materials.hardware || []),
  ];

  const categoryIcons: Record<string, React.ReactNode> = {
    'Framing': <Hammer className="w-4 h-4" />,
    'Decking': <Package className="w-4 h-4" />,
    'Stairs': <Package className="w-4 h-4" />,
    'Railing': <Fence className="w-4 h-4" />,
    'Hardware': <Wrench className="w-4 h-4" />,
  };

  if (compact) {
    return (
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-foreground mb-1">
              <Hammer className="w-4 h-4" />
              <span className="text-xs">Framing</span>
            </div>
            <div className="text-foreground">{materials.framing.length} items</div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-foreground mb-1">
              <Package className="w-4 h-4" />
              <span className="text-xs">Decking</span>
            </div>
            <div className="text-foreground">{materials.decking.length} items</div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-foreground mb-1">
              <Fence className="w-4 h-4" />
              <span className="text-xs">Railing</span>
            </div>
            <div className="text-foreground">{materials.railing.length} items</div>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-foreground mb-1">
              <Wrench className="w-4 h-4" />
              <span className="text-xs">Hardware</span>
            </div>
            <div className="text-foreground">{materials.hardware.length} items</div>
          </div>
        </div>

        {/* Total Items */}
        <div className="bg-muted border border-border rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-foreground text-sm">Total Material Items:</span>
            <span className="text-foreground">{allItems.length}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-foreground">Bill of Materials</h2>
        <span className="text-sm text-muted-foreground">{allItems.length} total items</span>
      </div>

      {/* Framing */}
      {materials.framing.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Hammer className="w-5 h-5 text-blue-600" />
            <h3 className="text-foreground">Framing</h3>
          </div>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">SKU</th>
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">Description</th>
                  <th className="text-right py-2 px-3 text-sm text-muted-foreground">Qty</th>
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">Unit</th>
                  <th className="text-right py-2 px-3 text-sm text-muted-foreground">Unit Price</th>
                  <th className="text-right py-2 px-3 text-sm text-muted-foreground">Total</th>
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {materials.framing.filter(item => item.quantity > 0).map((item, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted">
                    <td className="py-2 px-3 text-muted-foreground text-sm">{item.sku || '—'}</td>
                    <td className="py-2 px-3 text-foreground">{item.description}</td>
                    <td className="py-2 px-3 text-foreground text-right"><QtyCell item={item} /></td>
                    <td className="py-2 px-3 text-muted-foreground"><UnitCell item={item} /></td>
                    <td className="py-2 px-3 text-foreground text-right">{item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '—'}</td>
                    <td className="py-2 px-3 text-foreground text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '—'}</td>
                    <td className="py-2 px-3 text-muted-foreground text-sm">{item.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Decking */}
      {materials.decking.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-green-600" />
            <h3 className="text-foreground">Decking</h3>
          </div>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">SKU</th>
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">Description</th>
                  <th className="text-right py-2 px-3 text-sm text-muted-foreground">Qty</th>
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">Unit</th>
                  <th className="text-right py-2 px-3 text-sm text-muted-foreground">Unit Price</th>
                  <th className="text-right py-2 px-3 text-sm text-muted-foreground">Total</th>
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {materials.decking.filter(item => item.quantity > 0).map((item, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted">
                    <td className="py-2 px-3 text-muted-foreground text-sm">{item.sku || '—'}</td>
                    <td className="py-2 px-3 text-foreground">{item.description}</td>
                    <td className="py-2 px-3 text-foreground text-right"><QtyCell item={item} /></td>
                    <td className="py-2 px-3 text-muted-foreground"><UnitCell item={item} /></td>
                    <td className="py-2 px-3 text-foreground text-right">{item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '—'}</td>
                    <td className="py-2 px-3 text-foreground text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '—'}</td>
                    <td className="py-2 px-3 text-muted-foreground text-sm">{item.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Railing */}
      {materials.railing.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Fence className="w-5 h-5 text-purple-600" />
            <h3 className="text-foreground">Railing</h3>
          </div>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">SKU</th>
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">Description</th>
                  <th className="text-right py-2 px-3 text-sm text-muted-foreground">Qty</th>
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">Unit</th>
                  <th className="text-right py-2 px-3 text-sm text-muted-foreground">Unit Price</th>
                  <th className="text-right py-2 px-3 text-sm text-muted-foreground">Total</th>
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {materials.railing.filter(item => item.quantity > 0).map((item, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted">
                    <td className="py-2 px-3 text-muted-foreground text-sm">{item.sku || '—'}</td>
                    <td className="py-2 px-3 text-foreground">{item.description}</td>
                    <td className="py-2 px-3 text-foreground text-right"><QtyCell item={item} /></td>
                    <td className="py-2 px-3 text-muted-foreground"><UnitCell item={item} /></td>
                    <td className="py-2 px-3 text-foreground text-right">{item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '—'}</td>
                    <td className="py-2 px-3 text-foreground text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '—'}</td>
                    <td className="py-2 px-3 text-muted-foreground text-sm">{item.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hardware */}
      {materials.hardware.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-5 h-5 text-orange-600" />
            <h3 className="text-foreground">Hardware & Fasteners</h3>
          </div>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">SKU</th>
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">Description</th>
                  <th className="text-right py-2 px-3 text-sm text-muted-foreground">Qty</th>
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">Unit</th>
                  <th className="text-right py-2 px-3 text-sm text-muted-foreground">Unit Price</th>
                  <th className="text-right py-2 px-3 text-sm text-muted-foreground">Total</th>
                  <th className="text-left py-2 px-3 text-sm text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {materials.hardware.filter(item => item.quantity > 0).map((item, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted">
                    <td className="py-2 px-3 text-muted-foreground text-sm">{item.sku || '—'}</td>
                    <td className="py-2 px-3 text-foreground">{item.description}</td>
                    <td className="py-2 px-3 text-foreground text-right"><QtyCell item={item} /></td>
                    <td className="py-2 px-3 text-muted-foreground"><UnitCell item={item} /></td>
                    <td className="py-2 px-3 text-foreground text-right">{item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '—'}</td>
                    <td className="py-2 px-3 text-foreground text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '—'}</td>
                    <td className="py-2 px-3 text-muted-foreground text-sm">{item.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Important Notes */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 print:border-2 print:border-amber-600">
        <h4 className="text-amber-900 mb-2">Important Notes</h4>
        <ul className="text-amber-800 text-sm space-y-1 list-disc list-inside">
          <li>All quantities are estimates and should be verified before ordering</li>
          <li>Material calculations include typical waste factors</li>
          <li>Ledger board must be attached to house structural framing, not just siding</li>
          <li>Install flashing properly to prevent water damage to house structure</li>
          <li>Consult local building codes for specific requirements</li>
          <li>Professional installation recommended for safety and compliance</li>
          <li>Concrete footings required for all posts (not included in list)</li>
        </ul>
      </div>
    </div>
  );
}