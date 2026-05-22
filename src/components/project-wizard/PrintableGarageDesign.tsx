import React from 'react';
import { GarageConfig } from '../../types/garage';
import { GarageCanvas } from '../garage/GarageCanvas';
import { GarageMaterialsList } from '../garage/GarageMaterialsList';
import { GarageMaterials } from '../../types/garage';

interface PrintableGarageDesignProps {
  config: GarageConfig;
  materials: GarageMaterials;
  totalCost: number;
  customerName?: string;
  customerCompany?: string;
  description?: string;
  designName?: string;
}

export function PrintableGarageDesign({
  config,
  materials,
  totalCost,
  customerName,
  customerCompany,
  description,
  designName,
}: PrintableGarageDesignProps) {
  // Materials tracked for print rendering
  const _debugCounts = {
    foundation: materials.foundation?.length || 0,
    framing: materials.framing?.length || 0,
    roofing: materials.roofing?.length || 0,
    siding: materials.siding?.length || 0,
    doors: materials.doors?.length || 0,
    windows: materials.windows?.length || 0,
    hardware: materials.hardware?.length || 0,
    electrical: materials.electrical?.length || 0,
    insulation: materials.insulation?.length || 0,
    totalCost,
  };

  return (
    <div className="hidden print:block print:pt-8">
      {/* Header */}
      <div className="border-b-2 border-black pb-4 mb-6 print:mt-8">
        <h1 className="text-3xl font-bold mb-2">Garage Plan & Materials List</h1>
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
            <p className="font-semibold text-foreground">Foundation:</p>
            <p className="text-foreground capitalize">{config.foundationType?.replace('-', ' ') || 'N/A'}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Bays:</p>
            <p className="text-foreground">{config.bays}</p>
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
            {config.hasWindows && <p className="text-foreground">✓ Windows</p>}
            {config.hasServiceDoor && <p className="text-foreground">✓ Service Door</p>}
            {config.hasElectrical && <p className="text-foreground">✓ Electrical Package</p>}
            {config.hasInsulation && <p className="text-foreground">✓ Insulation</p>}
            {config.hasCeilingFinish && <p className="text-foreground">✓ Ceiling Finish</p>}
            {config.hasAtticStorage && <p className="text-foreground">✓ Attic Storage</p>}
          </div>
        </div>
      </div>

      {/* Plan View & Elevation */}
      <div className="mb-6">
        <div className="w-full">
          <GarageCanvas config={config} />
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
          <GarageMaterialsList materials={materials} compact={false} />
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