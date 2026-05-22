import React from 'react';
import { RoofConfig, RoofMaterials } from '../../types/roof';
import { RoofCanvas } from '../roof/RoofCanvas';
import { formatRoofArea, getPitchDescription } from '../../utils/roofCalculations';

interface PrintableRoofDesignProps {
  config: RoofConfig;
  materials: RoofMaterials;
  totalCost?: number;
  designName?: string;
  description?: string;
  customerName?: string;
  customerCompany?: string;
}

export function PrintableRoofDesign({
  config,
  materials,
  totalCost,
  designName,
  description,
  customerName,
  customerCompany,
}: PrintableRoofDesignProps) {
  return (
    <div className="hidden print:block print:pt-8">
      {/* Header */}
      <div className="border-b-2 border-black pb-4 mb-6 print:mt-8">
        <h1 className="text-3xl font-bold mb-2">Roof Plan & Materials List</h1>
        {designName && <h2 className="text-xl mb-2">{designName}</h2>}
        {customerName && (
          <div className="text-sm">
            <p><strong>Customer:</strong> {customerName}</p>
            {customerCompany && <p><strong>Company:</strong> {customerCompany}</p>}
          </div>
        )}
        {description && (
          <p className="text-sm mt-2 text-foreground">{description}</p>
        )}
        <p className="text-sm mt-2">
          <strong>Date:</strong> {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Roof Specifications */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-3 border-b border-black">Roof Specifications</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Building Length:</strong> {config.length} ft</p>
            <p><strong>Building Width:</strong> {config.width} ft</p>
            <p><strong>Roof Style:</strong> {config.style.charAt(0).toUpperCase() + config.style.slice(1).replace('-', ' ')}</p>
            <p><strong>Roof Pitch:</strong> {getPitchDescription(config.pitch)}</p>
          </div>
          <div>
            <p><strong>Total Roof Area:</strong> {formatRoofArea(config)}</p>
            <p><strong>Eave Overhang:</strong> {config.eaveOverhang} ft</p>
            <p><strong>Rake Overhang:</strong> {config.rakeOverhang} ft</p>
            <p><strong>Waste Factor:</strong> {(config.wasteFactor * 100).toFixed(0)}%</p>
          </div>
        </div>
        <div className="mt-3 text-sm">
          <p><strong>Shingle Type:</strong> {config.shingleType.replace('-', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</p>
          <p><strong>Underlayment:</strong> {config.underlaymentType.replace('-', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</p>
          {config.hasValleys && <p><strong>Valleys:</strong> {config.valleyCount}</p>}
          {config.hasSkylight && <p><strong>Skylights:</strong> {config.skylightCount}</p>}
          {config.hasChimney && <p><strong>Chimneys:</strong> {config.chimneyCount}</p>}
        </div>
        {/* L-Shaped Wing Details */}
        {config.style === 'l-shaped' && config.lShapeConfig && (
          <div className="mt-3 text-sm border-t border-border pt-2">
            <p className="font-bold mb-1">L-Shape Wing:</p>
            <p><strong>Wing Dimensions:</strong> {config.lShapeConfig.wingLength}' x {config.lShapeConfig.wingWidth}'</p>
            <p><strong>Wing Position:</strong> {config.lShapeConfig.wingPosition.replace('-', ' ')}</p>
            <p><strong>Wing Roof Style:</strong> {config.lShapeConfig.wingRoofStyle}</p>
          </div>
        )}
        {/* T-Shaped Wing Details */}
        {config.style === 't-shaped' && config.tShapeConfig && (
          <div className="mt-3 text-sm border-t border-border pt-2">
            <p className="font-bold mb-1">T-Shape Wing:</p>
            <p><strong>Wing Dimensions:</strong> {config.tShapeConfig.wingLength}' x {config.tShapeConfig.wingWidth}'</p>
            <p><strong>Wing Side:</strong> {config.tShapeConfig.wingSide}</p>
            <p><strong>Wing Roof Style:</strong> {config.tShapeConfig.wingRoofStyle}</p>
          </div>
        )}
        {/* U-Shaped Wing Details */}
        {config.style === 'u-shaped' && config.uShapeConfig && (
          <div className="mt-3 text-sm border-t border-border pt-2">
            <p className="font-bold mb-1">U-Shape Wings (x2):</p>
            <p><strong>Wing Dimensions:</strong> {config.uShapeConfig.wingLength}' x {config.uShapeConfig.wingWidth}' each</p>
            <p><strong>Wing Side:</strong> {config.uShapeConfig.wingSide}</p>
            <p><strong>Wing Roof Style:</strong> {config.uShapeConfig.wingRoofStyle}</p>
          </div>
        )}
        {/* Dormer Details */}
        {config.hasDormers && config.dormers && config.dormers.length > 0 && (
          <div className="mt-3 text-sm border-t border-border pt-2">
            <p className="font-bold mb-1">Dormers ({config.dormers.length}):</p>
            <table className="w-full text-xs border-collapse mt-1">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-1 text-left">#</th>
                  <th className="border border-border p-1 text-left">Style</th>
                  <th className="border border-border p-1 text-left">Size (W x H x D)</th>
                  <th className="border border-border p-1 text-left">Position</th>
                  <th className="border border-border p-1 text-left">Side</th>
                  <th className="border border-border p-1 text-left">Window</th>
                </tr>
              </thead>
              <tbody>
                {config.dormers.map((d, i) => (
                  <tr key={d.id}>
                    <td className="border border-border p-1">{i + 1}</td>
                    <td className="border border-border p-1 capitalize">{d.style}</td>
                    <td className="border border-border p-1">{d.width}' x {d.height}' x {d.depth}'</td>
                    <td className="border border-border p-1 capitalize">{d.horizontalPosition}</td>
                    <td className="border border-border p-1 capitalize">{d.side}</td>
                    <td className="border border-border p-1">{d.hasWindow ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Roof Plan */}
      <div className="mb-6">
        <div className="w-full">
          <RoofCanvas config={config} />
        </div>
      </div>

      {/* Materials List */}
      <div className="mb-6 print:break-before-page">
        <h2 className="text-xl font-bold mb-3 border-b border-black">Materials List</h2>
        
        {/* Roof Deck */}
        {materials.roofDeck.length > 0 && (
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-2">1. ROOF DECK</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-1 text-left">Description</th>
                  <th className="border border-border p-1 text-right">Qty</th>
                  <th className="border border-border p-1 text-left">Unit</th>
                  {totalCost ? <th className="border border-border p-1 text-right">Cost</th> : null}
                </tr>
              </thead>
              <tbody>
                {materials.roofDeck.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-border p-1">{item.description}</td>
                    <td className="border border-border p-1 text-right">{item.quantity}</td>
                    <td className="border border-border p-1">{item.unit}</td>
                    {totalCost ? <td className="border border-border p-1 text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '-'}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Underlayment */}
        {materials.underlayment.length > 0 && (
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-2">2. UNDERLAYMENT</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-1 text-left">Description</th>
                  <th className="border border-border p-1 text-right">Qty</th>
                  <th className="border border-border p-1 text-left">Unit</th>
                  {totalCost ? <th className="border border-border p-1 text-right">Cost</th> : null}
                </tr>
              </thead>
              <tbody>
                {materials.underlayment.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-border p-1">{item.description}</td>
                    <td className="border border-border p-1 text-right">{item.quantity}</td>
                    <td className="border border-border p-1">{item.unit}</td>
                    {totalCost ? <td className="border border-border p-1 text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '-'}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Shingles */}
        {materials.shingles.length > 0 && (
          <div className="mb-4 print:break-inside-avoid">
            <h3 className="font-bold text-sm mb-2">3. SHINGLES</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-1 text-left">Description</th>
                  <th className="border border-border p-1 text-right">Qty</th>
                  <th className="border border-border p-1 text-left">Unit</th>
                  {totalCost ? <th className="border border-border p-1 text-right">Cost</th> : null}
                </tr>
              </thead>
              <tbody>
                {materials.shingles.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-border p-1">{item.description}</td>
                    <td className="border border-border p-1 text-right">{item.quantity}</td>
                    <td className="border border-border p-1">{item.unit}</td>
                    {totalCost ? <td className="border border-border p-1 text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '-'}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Ridge & Hip */}
        {materials.ridgeAndHip.length > 0 && (
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-2">4. RIDGE & HIP</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-1 text-left">Description</th>
                  <th className="border border-border p-1 text-right">Qty</th>
                  <th className="border border-border p-1 text-left">Unit</th>
                  {totalCost ? <th className="border border-border p-1 text-right">Cost</th> : null}
                </tr>
              </thead>
              <tbody>
                {materials.ridgeAndHip.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-border p-1">{item.description}</td>
                    <td className="border border-border p-1 text-right">{item.quantity}</td>
                    <td className="border border-border p-1">{item.unit}</td>
                    {totalCost ? <td className="border border-border p-1 text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '-'}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Flashing */}
        {materials.flashing.length > 0 && (
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-2">5. FLASHING</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-1 text-left">Description</th>
                  <th className="border border-border p-1 text-right">Qty</th>
                  <th className="border border-border p-1 text-left">Unit</th>
                  {totalCost ? <th className="border border-border p-1 text-right">Cost</th> : null}
                </tr>
              </thead>
              <tbody>
                {materials.flashing.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-border p-1">{item.description}</td>
                    <td className="border border-border p-1 text-right">{item.quantity}</td>
                    <td className="border border-border p-1">{item.unit}</td>
                    {totalCost ? <td className="border border-border p-1 text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '-'}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Ventilation */}
        {materials.ventilation.length > 0 && (
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-2">6. VENTILATION</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-1 text-left">Description</th>
                  <th className="border border-border p-1 text-right">Qty</th>
                  <th className="border border-border p-1 text-left">Unit</th>
                  {totalCost ? <th className="border border-border p-1 text-right">Cost</th> : null}
                </tr>
              </thead>
              <tbody>
                {materials.ventilation.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-border p-1">{item.description}</td>
                    <td className="border border-border p-1 text-right">{item.quantity}</td>
                    <td className="border border-border p-1">{item.unit}</td>
                    {totalCost ? <td className="border border-border p-1 text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '-'}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Hardware */}
        {materials.hardware.length > 0 && (
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-2">7. HARDWARE & ACCESSORIES</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-1 text-left">Description</th>
                  <th className="border border-border p-1 text-right">Qty</th>
                  <th className="border border-border p-1 text-left">Unit</th>
                  {totalCost ? <th className="border border-border p-1 text-right">Cost</th> : null}
                </tr>
              </thead>
              <tbody>
                {materials.hardware.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-border p-1">{item.description}</td>
                    <td className="border border-border p-1 text-right">{item.quantity}</td>
                    <td className="border border-border p-1">{item.unit}</td>
                    {totalCost ? <td className="border border-border p-1 text-right">{item.totalCost ? `$${item.totalCost.toFixed(2)}` : '-'}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Total Cost */}
      {totalCost && totalCost > 0 && (
        <div className="border-t-2 border-black pt-4 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">ESTIMATED TOTAL COST</h2>
            <p className="text-2xl font-bold">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      )}

      {/* Footer Notes */}
      <div className="mt-6 border-t border-border pt-4 text-xs">
        <p className="font-bold mb-2">IMPORTANT NOTES:</p>
        <ul className="list-disc list-inside space-y-1 text-foreground">
          <li>This is an estimate only. Verify all measurements before ordering materials.</li>
          <li>Additional materials may be needed for complex roof designs or repairs.</li>
          <li>Check local building codes for specific requirements and permits.</li>
          <li>Professional installation is strongly recommended for safety.</li>
          <li>Prices subject to change. Confirm costs with supplier before ordering.</li>
          <li>Waste factor of {(config.wasteFactor * 100).toFixed(0)}% has been included in calculations.</li>
        </ul>
        <p className="mt-4 text-center text-muted-foreground">
          Generated by Roof Planner • For estimation purposes only
        </p>
      </div>
    </div>
  );
}