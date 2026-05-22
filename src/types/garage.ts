export type GarageBays = 1 | 2 | 3;
export type RoofStyle = 'gable' | 'hip' | 'gambrel' | 'flat';
export type SidingType = 'vinyl' | 'wood' | 'metal' | 'fiber-cement';
export type DoorType = 'overhead' | 'swing';
export type WallFraming = '2x4' | '2x6';
export type Unit = 'feet' | 'meters';

export interface GarageDoor {
  id: string;
  type: DoorType;
  width: number; // feet
  height: number;
  position: 'front' | 'side' | 'back';
  offsetFromLeft?: number; // distance from left wall
}

export interface Window {
  id: string;
  width: number; // feet
  height: number;
  position: 'front' | 'back' | 'left' | 'right';
  offsetFromLeft?: number; // distance from left edge of wall
  offsetFromFloor?: number; // height from floor
}

export interface GarageConfig {
  // Basic dimensions
  width: number; // in feet or meters
  length: number; // depth
  height: number; // wall height (8, 9, 10, 12 ft typical)
  
  // Structure
  bays: GarageBays;
  roofStyle: RoofStyle;
  roofPitch: number; // 4/12, 6/12, 8/12, etc (rise over 12" run)
  wallFraming: WallFraming;
  
  // Doors & Windows
  doors: GarageDoor[];
  windows: Window[];
  hasWalkDoor: boolean;
  walkDoorPosition?: 'front' | 'side' | 'back';
  
  // Materials
  sidingType: SidingType;
  roofingMaterial: 'asphalt-shingle' | 'metal' | 'rubber';
  
  // Options
  hasAtticTrusses: boolean; // storage space above
  isInsulated: boolean;
  hasElectrical: boolean;
  
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

export interface GarageMaterials {
  foundation: MaterialItem[];
  framing: MaterialItem[];
  roofing: MaterialItem[];
  siding: MaterialItem[];
  doors: MaterialItem[];
  windows: MaterialItem[];
  hardware: MaterialItem[];
  electrical?: MaterialItem[];
  insulation?: MaterialItem[];
  totalEstimatedCost?: number;
}

export interface SavedGarageDesign {
  id: string;
  name: string;
  config: GarageConfig;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
}