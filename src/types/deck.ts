export type DeckShape = 'rectangle' | 'l-shape' | 'u-shape' | 'custom';
export type DeckingSide = 'front' | 'back' | 'left' | 'right';
export type DeckingPattern = 'perpendicular' | 'parallel' | 'diagonal';
export type Unit = 'feet' | 'meters';
export type DeckingMaterialType = 'Spruce' | 'Treated' | 'Cedar' | 'Composite';
export type RailingStyle = 'Treated' | 'Aluminum' | 'None';
export type AluminumInfillType = 'Pickets' | 'Glass';
export type AluminumRailingColor = 'White' | 'Black';

export interface DeckConfig {
  // Basic dimensions
  width: number; // in feet or meters
  length: number;
  shape: DeckShape;
  height: number; // deck height above ground
  isDetached?: boolean;
  
  // Custom drawn shape points (in feet)
  customPoints?: { x: number; y: number }[];

  // L-shape specific (if shape is 'l-shape')
  lShapeWidth?: number;
  lShapeLength?: number;
  lShapePosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  // U-shape specific
  uShapeLeftWidth?: number;
  uShapeRightWidth?: number;
  uShapeDepth?: number;

  
  // Stairs
  hasStairs: boolean;
  stairSide?: DeckingSide;
  stairPart?: 'main' | 'l-shape' | 'u-left' | 'u-right';
  stairWidth?: number; // defaults to 4 feet
  stairOffset?: number; // Distance from the start of the side (in feet)
  stairRailing?: boolean; // defaults to true if hasStairs is true
  
  // Railings
  railingSides: DeckingSide[];
  railingStyle?: RailingStyle; // defaults to 'Treated'
  aluminumInfillType?: AluminumInfillType; // only applies when railingStyle is 'Aluminum'
  aluminumRailingColor?: AluminumRailingColor; // only applies when railingStyle is 'Aluminum'
  railingHeight?: number; // defaults to 42 inches
  
  // Construction details
  deckingPattern: DeckingPattern;
  joistSpacing: 12 | 16 | 24; // inches on center
  joistSize?: '2x8' | '2x10' | '2x12'; // Joist size options
  deckingType: DeckingMaterialType; // Material type for decking
  postSize?: '4x4' | '6x6'; // Main support post size
  formtubeSize?: '6"' | '8"' | '10"' | '12"' | '14"' | '16"'; // Formtube size for footing
  
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
  /** Conversion factor for non-lumber items (e.g., 10 means 10 units per box). Default 1. */
  conversionFactor?: number;
  /** Quantity after applying conversion factor (e.g., qty 50 lbs / CF 10 = 5 boxes) */
  convertedQuantity?: number;
  /** The purchase unit after conversion (e.g., 'boxes', 'bags') */
  convertedUnit?: string;
  /** Inventory item ID from defaults matching */
  itemId?: string;
}

export interface DeckMaterials {
  framing: MaterialItem[];
  decking: MaterialItem[];
  railing: MaterialItem[];
  hardware: MaterialItem[];
  stairs?: MaterialItem[];
  totalEstimatedCost?: number;
}

export interface SavedDesign {
  id: string;
  name: string;
  config: DeckConfig;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
}