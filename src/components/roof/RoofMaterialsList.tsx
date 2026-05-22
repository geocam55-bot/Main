import React from 'react';
import { RoofMaterials } from '../../types/roof';

interface RoofMaterialsListProps {
  materials: RoofMaterials;
  compact?: boolean;
}

/** Format quantity display with conversion factor info */
function formatQty(item: any): React.ReactNode {
  if (item.conversionFactor && item.conversionFactor !== 1 && item.convertedQuantity != null) {
    const displayQty = item.convertedQuantity < 1
      ? item.convertedQuantity.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
      : item.convertedQuantity.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    return (
      <>
        <span className="text-amber-700 font-semibold">{displayQty}</span>{' '}
        <span className="text-amber-700">{item.convertedUnit || 'units'}</span>
        {item.orderQuantity != null && item.orderQuantity !== item.convertedQuantity && (
          <span className="block text-xs text-muted-foreground">
            Order: {item.orderQuantity} {item.convertedUnit || 'units'}
          </span>
        )}
        <span className="block text-xs text-amber-600">
          ({item.quantity} {item.unit} × {item.conversionFactor})
        </span>
      </>
    );
  }
  return <>{item.quantity} {item.unit}</>;
}

export function RoofMaterialsList({ materials, compact = false }: RoofMaterialsListProps) {
  const renderMaterialSection = (title: string, items: any[], colorClass: string) => {
    // Filter out items with zero quantity
    const nonZeroItems = items.filter(item => item.quantity > 0);
    if (nonZeroItems.length === 0) return null;

    return (
      <div className="mb-6 last:mb-0">
        <h3 className={`text-sm font-semibold mb-3 pb-2 border-b-2 ${colorClass}`}>
          {title}
        </h3>
        <div className="space-y-2">
          {nonZeroItems.map((item, index) => (
            <div
              key={index}
              className={`${compact ? 'py-1' : 'p-3'} bg-muted rounded-lg border border-border`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="text-sm text-foreground">
                    {item.description}
                  </div>
                  {item.notes && !compact && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {item.notes}
                    </div>
                  )}
                  {item.sku && !compact && (
                    <div className="text-xs text-muted-foreground mt-1">
                      SKU: {item.sku}
                    </div>
                  )}
                </div>
                <div className="text-right ml-4">
                  {formatQty(item)}
                  {item.unitPrice && !compact && (
                    <div className="text-xs text-muted-foreground">
                      ${item.unitPrice.toFixed(2)} / {item.conversionFactor && item.conversionFactor !== 1 ? (item.convertedUnit || 'box') : item.unit}
                    </div>
                  )}
                  {item.totalCost && (
                    <div className="text-sm font-semibold text-orange-600 mt-1">
                      ${item.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Calculate total cost if available
  const totalCost = [...materials.roofDeck, ...materials.underlayment, ...materials.shingles, ...materials.ridgeAndHip, ...materials.flashing, ...materials.ventilation, ...materials.hardware]
    .reduce((sum, item) => sum + (item.totalCost || 0), 0);

  return (
    <div className={compact ? "max-h-[600px] overflow-y-auto pr-2" : ""}>
      {totalCost > 0 && (
        <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-orange-700">Total Materials Cost</div>
              {!compact && (
                <div className="text-xs text-orange-600 mt-1">
                  Based on current pricing
                </div>
              )}
            </div>
            <div className="text-2xl font-bold text-orange-900">
              ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {renderMaterialSection('1. Roof Deck', materials.roofDeck, 'border-blue-300 text-blue-900')}
      {renderMaterialSection('2. Underlayment', materials.underlayment, 'border-purple-300 text-purple-900')}
      {renderMaterialSection('3. Shingles', materials.shingles, 'border-orange-300 text-orange-900')}
      {renderMaterialSection('4. Ridge & Hip', materials.ridgeAndHip, 'border-red-300 text-red-900')}
      {renderMaterialSection('5. Flashing', materials.flashing, 'border-yellow-300 text-yellow-900')}
      {renderMaterialSection('6. Ventilation', materials.ventilation, 'border-green-300 text-green-900')}
      {renderMaterialSection('7. Hardware & Accessories', materials.hardware, 'border-border text-foreground')}

      {!compact && (
        <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
          <h4 className="text-sm font-semibold text-foreground mb-2">
            Important Notes
          </h4>
          <ul className="text-xs text-foreground space-y-1">
            <li>• Material calculations include waste factor as configured</li>
            <li>• Verify all measurements before ordering materials</li>
            <li>• Check local building codes for specific requirements</li>
            <li>• Consider weather conditions and roof accessibility</li>
            <li>• Professional installation recommended for safety</li>
            <li>• Additional materials may be needed for repairs or special conditions</li>
          </ul>
        </div>
      )}
    </div>
  );
}