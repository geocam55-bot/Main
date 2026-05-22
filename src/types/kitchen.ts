import fillerImage from 'figma:asset/f99d25ddb222762681abcb651c10ad4a23a854fb.png';

export type CabinetType = 'base' | 'wall' | 'tall' | 'corner-base' | 'corner-wall' | 'island' | 'peninsula';
export type CabinetFinish = 'White' | 'Oak' | 'Walnut' | 'Gray' | 'Black' | 'Cherry' | 'Maple';
export type CountertopMaterial = 'Laminate' | 'Granite' | 'Quartz' | 'Marble' | 'Butcher Block' | 'Concrete';
export type ApplianceType = 'refrigerator' | 'stove' | 'oven' | 'dishwasher' | 'microwave' | 'sink';
export type OpeningType = 'window' | 'door' | 'passthrough';

export interface CabinetItem {
  id: string;
  type: CabinetType;
  name: string;
  width: number; // in inches
  height: number; // in inches
  depth: number; // in inches
  finish?: CabinetFinish;
  hasDrawers?: boolean;
  numberOfDrawers?: number;
  hasDoors?: boolean;
  numberOfDoors?: number;
  price?: number;
  image?: string; // Preview image
  modelUrl?: string; // URL to OBJ model file
}

export interface PlacedCabinet extends CabinetItem {
  x: number; // position on canvas
  y: number; // position on canvas
  rotation: number; // 0, 90, 180, 270
  wall: 'north' | 'south' | 'east' | 'west' | 'island'; // which wall it's attached to
}

export interface Appliance {
  id: string;
  type: ApplianceType;
  name: string;
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  rotation: number;
  price?: number;
}

export interface Countertop {
  id: string;
  material: CountertopMaterial;
  segments: {
    x: number;
    y: number;
    width: number;
    depth: number;
  }[];
  thickness: number; // in inches
  price?: number;
}

export interface KitchenConfig {
  name?: string;
  description?: string;
  
  // Room dimensions
  roomWidth: number; // in feet
  roomLength: number; // in feet
  roomHeight: number; // in feet (ceiling height)
  
  // Layout
  layoutStyle: 'L-shape' | 'U-shape' | 'galley' | 'island' | 'one-wall' | 'custom';
  
  // Cabinets
  cabinets: PlacedCabinet[];
  cabinetFinish: CabinetFinish;
  
  // Countertops
  countertops: Countertop[];
  countertopMaterial: CountertopMaterial;
  
  // Appliances
  appliances: Appliance[];
  
  // Features
  hasIsland: boolean;
  hasPantry: boolean;
  hasBacksplash: boolean;
  
  // Grid settings
  gridSize: number; // in inches for snapping
  showGrid: boolean;
  snapToGrid?: boolean; // New: Enable snap-to-grid functionality
  
  // View settings
  viewMode: '2D' | '3D';
  unit: 'feet' | 'inches';
}

export interface KitchenMaterials {
  cabinets: {
    description: string;
    quantity: number;
    unit: string;
    category: 'Base Cabinets' | 'Wall Cabinets' | 'Tall Cabinets' | 'Corner Cabinets';
    unitPrice?: number;
    totalPrice?: number;
  }[];
  countertops: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice?: number;
    totalPrice?: number;
  }[];
  appliances: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice?: number;
    totalPrice?: number;
  }[];
  hardware: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice?: number;
    totalPrice?: number;
  }[];
  installation: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice?: number;
    totalPrice?: number;
  }[];
}

// Predefined cabinet catalog
export const CABINET_CATALOG: CabinetItem[] = [
  // Base Cabinets
  { id: 'base-12', type: 'base', name: 'Base Cabinet 12"', width: 12, height: 34.5, depth: 24, hasDrawers: true, numberOfDrawers: 3, modelUrl: 'base-cabinet.obj' },
  { id: 'base-15', type: 'base', name: 'Base Cabinet 15"', width: 15, height: 34.5, depth: 24, hasDrawers: true, numberOfDrawers: 3, modelUrl: 'base-cabinet.obj' },
  { id: 'base-18', type: 'base', name: 'Base Cabinet 18"', width: 18, height: 34.5, depth: 24, hasDoors: true, numberOfDoors: 1, modelUrl: 'base-cabinet.obj' },
  { id: 'base-21', type: 'base', name: 'Base Cabinet 21"', width: 21, height: 34.5, depth: 24, hasDoors: true, numberOfDoors: 1, modelUrl: 'base-cabinet.obj' },
  { id: 'base-24', type: 'base', name: 'Base Cabinet 24"', width: 24, height: 34.5, depth: 24, hasDoors: true, numberOfDoors: 2, modelUrl: 'base-cabinet.obj' },
  { id: 'base-30', type: 'base', name: 'Base Cabinet 30"', width: 30, height: 34.5, depth: 24, hasDoors: true, numberOfDoors: 2, modelUrl: 'base-cabinet.obj' },
  { id: 'base-36', type: 'base', name: 'Base Cabinet 36"', width: 36, height: 34.5, depth: 24, hasDoors: true, numberOfDoors: 2, modelUrl: 'base-cabinet.obj' },
  { id: 'base-filler-1', type: 'base', name: 'Base Filler 1"', width: 1, height: 34.5, depth: 24, hasDoors: false, hasDrawers: false, image: fillerImage, modelUrl: 'base-cabinet.obj' },
  { id: 'base-filler-1.5', type: 'base', name: 'Base Filler 1.5"', width: 1.5, height: 34.5, depth: 24, hasDoors: false, hasDrawers: false, image: fillerImage, modelUrl: 'base-cabinet.obj' },
  { id: 'base-filler-2', type: 'base', name: 'Base Filler 2"', width: 2, height: 34.5, depth: 24, hasDoors: false, hasDrawers: false, image: fillerImage, modelUrl: 'base-cabinet.obj' },
  { id: 'base-filler-2.5', type: 'base', name: 'Base Filler 2.5"', width: 2.5, height: 34.5, depth: 24, hasDoors: false, hasDrawers: false, image: fillerImage, modelUrl: 'base-cabinet.obj' },
  { id: 'base-filler-3', type: 'base', name: 'Base Filler 3"', width: 3, height: 34.5, depth: 24, hasDoors: false, hasDrawers: false, image: fillerImage, modelUrl: 'base-cabinet.obj' },
  { id: 'base-filler-3.5', type: 'base', name: 'Base Filler 3.5"', width: 3.5, height: 34.5, depth: 24, hasDoors: false, hasDrawers: false, image: fillerImage, modelUrl: 'base-cabinet.obj' },
  { id: 'base-filler-4', type: 'base', name: 'Base Filler 4"', width: 4, height: 34.5, depth: 24, hasDoors: false, hasDrawers: false, image: fillerImage, modelUrl: 'base-cabinet.obj' },
  { id: 'base-filler-4.5', type: 'base', name: 'Base Filler 4.5"', width: 4.5, height: 34.5, depth: 24, hasDoors: false, hasDrawers: false, image: fillerImage, modelUrl: 'base-cabinet.obj' },
  { id: 'base-filler-5', type: 'base', name: 'Base Filler 5"', width: 5, height: 34.5, depth: 24, hasDoors: false, hasDrawers: false, image: fillerImage, modelUrl: 'base-cabinet.obj' },
  { id: 'base-filler-5.5', type: 'base', name: 'Base Filler 5.5"', width: 5.5, height: 34.5, depth: 24, hasDoors: false, hasDrawers: false, image: fillerImage, modelUrl: 'base-cabinet.obj' },
  { id: 'base-filler-6', type: 'base', name: 'Base Filler 6"', width: 6, height: 34.5, depth: 24, hasDoors: false, hasDrawers: false, image: fillerImage, modelUrl: 'base-cabinet.obj' },
  
  // Wall Cabinets
  { id: 'wall-12', type: 'wall', name: 'Wall Cabinet 12"', width: 12, height: 30, depth: 12, hasDoors: true, numberOfDoors: 1, modelUrl: 'wall-cabinet.obj' },
  { id: 'wall-15', type: 'wall', name: 'Wall Cabinet 15"', width: 15, height: 30, depth: 12, hasDoors: true, numberOfDoors: 1, modelUrl: 'wall-cabinet.obj' },
  { id: 'wall-18', type: 'wall', name: 'Wall Cabinet 18"', width: 18, height: 30, depth: 12, hasDoors: true, numberOfDoors: 1, modelUrl: 'wall-cabinet.obj' },
  { id: 'wall-21', type: 'wall', name: 'Wall Cabinet 21"', width: 21, height: 30, depth: 12, hasDoors: true, numberOfDoors: 1, modelUrl: 'wall-cabinet.obj' },
  { id: 'wall-24', type: 'wall', name: 'Wall Cabinet 24"', width: 24, height: 30, depth: 12, hasDoors: true, numberOfDoors: 2, modelUrl: 'wall-cabinet.obj' },
  { id: 'wall-30', type: 'wall', name: 'Wall Cabinet 30"', width: 30, height: 30, depth: 12, hasDoors: true, numberOfDoors: 2, modelUrl: 'wall-cabinet.obj' },
  { id: 'wall-36', type: 'wall', name: 'Wall Cabinet 36"', width: 36, height: 30, depth: 12, hasDoors: true, numberOfDoors: 2, modelUrl: 'wall-cabinet.obj' },
  { id: 'wall-filler-1', type: 'wall', name: 'Wall Filler 1"', width: 1, height: 30, depth: 12, hasDoors: false, image: fillerImage, modelUrl: 'wall-cabinet.obj' },
  { id: 'wall-filler-1.5', type: 'wall', name: 'Wall Filler 1.5"', width: 1.5, height: 30, depth: 12, hasDoors: false, image: fillerImage, modelUrl: 'wall-cabinet.obj' },
  { id: 'wall-filler-2', type: 'wall', name: 'Wall Filler 2"', width: 2, height: 30, depth: 12, hasDoors: false, image: fillerImage, modelUrl: 'wall-cabinet.obj' },
  { id: 'wall-filler-2.5', type: 'wall', name: 'Wall Filler 2.5"', width: 2.5, height: 30, depth: 12, hasDoors: false, image: fillerImage, modelUrl: 'wall-cabinet.obj' },
  { id: 'wall-filler-3', type: 'wall', name: 'Wall Filler 3"', width: 3, height: 30, depth: 12, hasDoors: false, image: fillerImage, modelUrl: 'wall-cabinet.obj' },
  { id: 'wall-filler-3.5', type: 'wall', name: 'Wall Filler 3.5"', width: 3.5, height: 30, depth: 12, hasDoors: false, image: fillerImage, modelUrl: 'wall-cabinet.obj' },
  { id: 'wall-filler-4', type: 'wall', name: 'Wall Filler 4"', width: 4, height: 30, depth: 12, hasDoors: false, image: fillerImage, modelUrl: 'wall-cabinet.obj' },
  { id: 'wall-filler-4.5', type: 'wall', name: 'Wall Filler 4.5"', width: 4.5, height: 30, depth: 12, hasDoors: false, image: fillerImage, modelUrl: 'wall-cabinet.obj' },
  { id: 'wall-filler-5', type: 'wall', name: 'Wall Filler 5"', width: 5, height: 30, depth: 12, hasDoors: false, image: fillerImage, modelUrl: 'wall-cabinet.obj' },
  { id: 'wall-filler-5.5', type: 'wall', name: 'Wall Filler 5.5"', width: 5.5, height: 30, depth: 12, hasDoors: false, image: fillerImage, modelUrl: 'wall-cabinet.obj' },
  { id: 'wall-filler-6', type: 'wall', name: 'Wall Filler 6"', width: 6, height: 30, depth: 12, hasDoors: false, image: fillerImage, modelUrl: 'wall-cabinet.obj' },
  
  // Tall Cabinets
  { id: 'tall-18', type: 'tall', name: 'Pantry Cabinet 18"', width: 18, height: 84, depth: 24, hasDoors: true, numberOfDoors: 2, modelUrl: 'tall-cabinet.obj' },
  { id: 'tall-24', type: 'tall', name: 'Pantry Cabinet 24"', width: 24, height: 84, depth: 24, hasDoors: true, numberOfDoors: 2, modelUrl: 'tall-cabinet.obj' },
  { id: 'tall-30', type: 'tall', name: 'Pantry Cabinet 30"', width: 30, height: 84, depth: 24, hasDoors: true, numberOfDoors: 2, modelUrl: 'tall-cabinet.obj' },
  { id: 'tall-filler-1', type: 'tall', name: 'Tall Filler 1"', width: 1, height: 84, depth: 24, hasDoors: false, image: fillerImage, modelUrl: 'tall-cabinet.obj' },
  { id: 'tall-filler-1.5', type: 'tall', name: 'Tall Filler 1.5"', width: 1.5, height: 84, depth: 24, hasDoors: false, image: fillerImage, modelUrl: 'tall-cabinet.obj' },
  { id: 'tall-filler-2', type: 'tall', name: 'Tall Filler 2"', width: 2, height: 84, depth: 24, hasDoors: false, image: fillerImage, modelUrl: 'tall-cabinet.obj' },
  { id: 'tall-filler-2.5', type: 'tall', name: 'Tall Filler 2.5"', width: 2.5, height: 84, depth: 24, hasDoors: false, image: fillerImage, modelUrl: 'tall-cabinet.obj' },
  { id: 'tall-filler-3', type: 'tall', name: 'Tall Filler 3"', width: 3, height: 84, depth: 24, hasDoors: false, image: fillerImage, modelUrl: 'tall-cabinet.obj' },
  { id: 'tall-filler-3.5', type: 'tall', name: 'Tall Filler 3.5"', width: 3.5, height: 84, depth: 24, hasDoors: false, image: fillerImage, modelUrl: 'tall-cabinet.obj' },
  { id: 'tall-filler-4', type: 'tall', name: 'Tall Filler 4"', width: 4, height: 84, depth: 24, hasDoors: false, image: fillerImage, modelUrl: 'tall-cabinet.obj' },
  { id: 'tall-filler-4.5', type: 'tall', name: 'Tall Filler 4.5"', width: 4.5, height: 84, depth: 24, hasDoors: false, image: fillerImage, modelUrl: 'tall-cabinet.obj' },
  { id: 'tall-filler-5', type: 'tall', name: 'Tall Filler 5"', width: 5, height: 84, depth: 24, hasDoors: false, image: fillerImage, modelUrl: 'tall-cabinet.obj' },
  { id: 'tall-filler-5.5', type: 'tall', name: 'Tall Filler 5.5"', width: 5.5, height: 84, depth: 24, hasDoors: false, image: fillerImage, modelUrl: 'tall-cabinet.obj' },
  { id: 'tall-filler-6', type: 'tall', name: 'Tall Filler 6"', width: 6, height: 84, depth: 24, hasDoors: false, image: fillerImage, modelUrl: 'tall-cabinet.obj' },
  
  // Corner Cabinets
  { id: 'corner-base-36', type: 'corner-base', name: 'Corner Base Cabinet', width: 36, height: 34.5, depth: 36, hasDoors: true, numberOfDoors: 2, modelUrl: 'corner-base.obj' },
  { id: 'corner-wall-24', type: 'corner-wall', name: 'Corner Wall Cabinet', width: 24, height: 30, depth: 24, hasDoors: true, numberOfDoors: 2, modelUrl: 'corner-wall.obj' },
  
  // Island Cabinets
  { id: 'island-36x36', type: 'island', name: 'Island Base 36"x36"', width: 36, height: 34.5, depth: 36, hasDoors: true, numberOfDoors: 4, modelUrl: 'island-cabinet.obj' },
  { id: 'island-48x36', type: 'island', name: 'Island Base 48"x36"', width: 48, height: 34.5, depth: 36, hasDoors: true, numberOfDoors: 6, modelUrl: 'island-cabinet.obj' },
];