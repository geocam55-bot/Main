export type RoofStyle = 'gable' | 'hip' | 'gambrel' | 'shed' | 'mansard' | 'flat' | 'l-shaped' | 't-shaped' | 'u-shaped';
export type RoofPitch = '2/12' | '3/12' | '4/12' | '5/12' | '6/12' | '7/12' | '8/12' | '9/12' | '10/12' | '12/12';
export type ShingleType = 'architectural' | '3-tab' | 'designer' | 'metal' | 'cedar-shake';
export type UnderlaymentType = 'felt-15' | 'felt-30' | 'synthetic' | 'ice-and-water';
export type Unit = 'feet' | 'meters';

export type DormerStyle = 'gable' | 'shed' | 'hip' | 'eyebrow' | 'flat';
export type DormerPosition = 'left' | 'center' | 'right';

export type LShapeWingPosition = 'front-right' | 'front-left' | 'back-right' | 'back-left';
export type TShapeWingSide = 'front' | 'back' | 'left' | 'right';
export type UShapeWingSide = 'front-back' | 'left-right';

export interface LShapeConfig {
  wingLength: number;   // Length of the wing section (feet)
  wingWidth: number;    // Width of the wing section (feet)
  wingPosition: LShapeWingPosition; // Where the wing attaches to the main section
  wingRoofStyle: 'gable' | 'hip'; // Roof style for the wing (gable or hip)
}

export interface TShapeConfig {
  wingLength: number;   // Length of the wing section (feet)
  wingWidth: number;    // Width of the wing section (feet)
  wingSide: TShapeWingSide; // Which side of the main section the wing extends from
  wingRoofStyle: 'gable' | 'hip';
}

export interface UShapeConfig {
  wingLength: number;   // Length of both wing sections (feet)
  wingWidth: number;    // Width of both wing sections (feet)
  wingSide: UShapeWingSide; // Wings extend from front & back or left & right
  wingRoofStyle: 'gable' | 'hip';
}

export interface DormerConfig {
  id: string;
  style: DormerStyle;
  width: number;       // Width of dormer face (feet), typically 3-8 ft
  height: number;      // Height from roof slope to dormer ridge (feet), typically 4-6 ft
  depth: number;       // How far dormer projects from roof slope (feet), typically 4-8 ft
  horizontalPosition: DormerPosition; // Left, Center, or Right along the building length
  side: 'front' | 'back'; // Which slope of the roof (front or back)
  hasWindow: boolean;
}

export interface RoofConfig {
  // Building dimensions
  length: number; // building length in feet or meters
  width: number; // building width
  
  // Roof style and pitch
  style: RoofStyle;
  pitch: RoofPitch;
  
  // Overhangs (eaves and rakes)
  eaveOverhang: number; // in feet, typical 1-2 feet
  rakeOverhang: number; // in feet, typical 1-2 feet
  
  // Ridge details (for certain styles)
  ridgeVentLength?: number; // calculated based on style
  
  // Valleys (for complex roofs)
  hasValleys?: boolean;
  valleyCount?: number;
  
  // Materials
  shingleType: ShingleType;
  underlaymentType: UnderlaymentType;
  
  // Additional features
  hasSkylight?: boolean;
  skylightCount?: number;
  hasChimney?: boolean;
  chimneyCount?: number;
  
  // Dormers
  hasDormers?: boolean;
  dormers?: DormerConfig[];

  // L-Shaped configuration
  lShapeConfig?: LShapeConfig;

  // T-Shaped configuration
  tShapeConfig?: TShapeConfig;

  // U-Shaped configuration
  uShapeConfig?: UShapeConfig;

  // Waste factor (typically 10-15% for shingles)
  wasteFactor: number; // as decimal (e.g., 0.10 for 10%)
  
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
}

export interface RoofMaterials {
  roofDeck: MaterialItem[];
  underlayment: MaterialItem[];
  shingles: MaterialItem[];
  ventilation: MaterialItem[];
  flashing: MaterialItem[];
  ridgeAndHip: MaterialItem[];
  hardware: MaterialItem[];
  totalEstimatedCost?: number;
}

export interface SavedRoofDesign {
  id: string;
  name: string;
  config: RoofConfig;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
}