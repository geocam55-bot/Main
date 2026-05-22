export type ShedStyle = 'gable' | 'barn' | 'lean-to' | 'saltbox' | 'quaker';
export type SidingType = 'vinyl' | 'wood' | 'metal' | 't1-11';
export type FoundationType = 'skids' | 'concrete-blocks' | 'gravel-pad' | 'concrete-slab';
export type DoorType = 'single' | 'double' | 'sliding-barn';
export type Unit = 'feet' | 'meters';

export interface Window {
  id: string;
  width: number; // feet
  height: number;
  position: 'front' | 'back' | 'left' | 'right';
  offsetFromLeft?: number; // distance from left edge of wall
  offsetFromFloor?: number; // height from floor
}

export interface ShedConfig {
  // Basic dimensions
  width: number; // in feet or meters
  length: number; // depth
  wallHeight: number; // sidewall height (6, 7, 8 ft typical)
  
  // Style
  style: ShedStyle;
  roofPitch: number; // 4/12, 6/12, 8/12, 10/12, 12/12
  
  // Foundation
  foundationType: FoundationType;
  
  // Door
  doorType: DoorType;
  doorWidth: number; // feet (3, 4, 5, 6 for double)
  doorHeight: number; // feet (6, 6.5, 7)
  doorPosition: 'front' | 'gable-end';
  
  // Windows
  windows: Window[];
  
  // Features
  hasLoft: boolean;
  hasFloor: boolean; // wooden floor vs. dirt/gravel
  hasShutters: boolean;
  hasFlowerBox: boolean;
  
  // Materials
  sidingType: SidingType;
  roofingMaterial: 'asphalt-shingle' | 'metal' | 'architectural-shingle';
  trimColor?: string;
  
  // Options
  hasElectrical: boolean;
  hasShelvingPackage: boolean;
  
  // Unit
  unit: Unit;
  
  // Optional metadata
  name?: string;
  notes?: string;
  customerId?: string;
  projectId?: string;
}

export interface MaterialItem {
  category: string;
  description: string;
  quantity: number;
  unit: string;
  notes?: string;
  sku?: string;
  cost?: number;
  unitPrice?: number;
  totalCost?: number;
  /** Standard lumber length in feet (8, 10, 12, 14, 16) for length-aware SKU matching */
  lumberLength?: number;
}

export interface ShedMaterials {
  foundation: MaterialItem[];
  framing: MaterialItem[];
  flooring?: MaterialItem[];
  roofing: MaterialItem[];
  siding: MaterialItem[];
  doors: MaterialItem[];
  windows: MaterialItem[];
  trim: MaterialItem[];
  hardware: MaterialItem[];
  electrical?: MaterialItem[];
  accessories?: MaterialItem[];
  totalEstimatedCost?: number;
}

export interface SavedShedDesign {
  id: string;
  name: string;
  config: ShedConfig;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
}