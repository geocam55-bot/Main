import React from 'react';
import { ShedConfig } from '../../types/shed';
import { ShedCanvas } from '../shed/ShedCanvas';
import { ShedMaterialsList } from '../shed/ShedMaterialsList';
import { ShedMaterials } from '../../types/shed';

interface PrintableShedDesignProps {
  config: ShedConfig;
  materials: ShedMaterials;
  totalCost: number;
  customerName?: string;
  customerCompany?: string;
  description?: string;
  designName?: string;
}

export function PrintableShedDesign({
  config,
  materials,
  totalCost,
  customerName,
  customerCompany,
  description,
  designName,
}: PrintableShedDesignProps) {
  // Materials tracked for print rendering
  const _debugCounts = {
    foundation: materials.foundation?.length || 0,
    framing: materials.framing?.length || 0,
    flooring: materials.flooring?.length || 0,
    roofing: materials.roofing?.length || 0,
    siding: materials.siding?.length || 0,
    doors: materials.doors?.length || 0,
    windows: materials.windows?.length || 0,
    trim: materials.trim?.length || 0,
    hardware: materials.hardware?.length || 0,
    electrical: materials.electrical?.length || 0,
    accessories: materials.accessories?.length || 0,
    totalCost,
  };

  return (
    <div className="hidden print:block print:pt-8">
      {/* Header */}
      <div className="border-b-2 border-black pb-4 mb-6 print:mt-8">
        <h1 className="text-3xl font-bold mb-2">Shed Plan & Materials List</h1>
      </div>

      {/* Customer Information (if saved design) */}
      {customerName && (
        <div className="mb-6 p-4 border border-border bg-muted">
          <h2 className="text-lg font-bold text-foreground mb-3">Customer Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-foreground">Customer Name:</p>
              <p className="text-foreground">{customerName}</p>
            </div>
            {customerCompany && (
              <div>
                <p className="font-semibold text-foreground">Company:</p>
                <p className="text-foreground">{customerCompany}</p>
              </div>
            )}
          </div>
          {description && (
            <div className="mt-3">
              <p className="font-semibold text-foreground">Description:</p>
              <p className="text-foreground mt-1">{description}</p>
            </div>
          )}
        </div>
      )}

      {/* Project Specifications */}
      <div className="mb-6 p-4 border border-border">
        <h2 className="text-lg font-bold text-foreground mb-3">Project Specifications</h2>
        <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
          <div>
            <p className="font-semibold text-foreground">Dimensions:</p>
            <p className="text-foreground">{config.width}' × {config.length}'</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Style:</p>
            <p className="text-foreground capitalize">{config.style}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Wall Height:</p>
            <p className="text-foreground">{config.wallHeight} feet</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Roof Pitch:</p>
            <p className="text-foreground">{config.roofPitch}/12</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Door Type:</p>
            <p className="text-foreground capitalize">{config.doorType}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Foundation:</p>
            <p className="text-foreground capitalize">{config.foundationType?.replace('-', ' ') || 'N/A'}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Siding:</p>
            <p className="text-foreground capitalize">{config.sidingType}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Roofing:</p>
            <p className="text-foreground capitalize">{config.roofingMaterial?.replace('-', ' ') || 'N/A'}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border">
          <p className="font-semibold text-foreground mb-2">Additional Features:</p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {config.hasFloor && <p className="text-foreground">✓ Floor</p>}
            {config.hasLoft && <p className="text-foreground">✓ Loft</p>}
            {config.hasShutters && <p className="text-foreground">✓ Shutters</p>}
            {config.hasFlowerBox && <p className="text-foreground">✓ Flower Box</p>}
            {config.hasElectrical && <p className="text-foreground">✓ Electrical Package</p>}
            {config.hasShelvingPackage && <p className="text-foreground">✓ Shelving Package</p>}
          </div>
        </div>
      </div>

      {/* Plan View & Elevation */}
      <div className="mb-6">
        <div className="w-full">
          <ShedCanvas config={config} />
        </div>
      </div>

      {/* Materials List */}
      <div className="break-before-page">
        <h2 className="text-lg font-bold text-foreground mb-3 border-b-2 border-black pb-2">
          Bill of Materials
        </h2>
        {totalCost > 0 && (
          <div className="mb-4 p-3 bg-muted border border-gray-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Total Estimated Cost:</p>
                <p className="text-xs text-muted-foreground mt-1">Based on Tier 1 Pricing</p>
              </div>
              <p className="text-2xl font-bold text-foreground">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        )}
        <div className="border border-black">
          <ShedMaterialsList materials={materials} compact={false} />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-3 border-t border-gray-400 text-xs text-muted-foreground">
        <p className="mb-1">This plan is an estimate and should be verified by a professional before construction.</p>
        <p>All dimensions and materials are subject to local building codes and regulations.</p>
      </div>
    </div>
  );
}