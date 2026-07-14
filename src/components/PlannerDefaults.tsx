import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2, Save, RefreshCw, Settings, Info, ChevronDown } from 'lucide-react';
import {
  getProjectWizardDefaults,
  getUserDefaults,
  saveUserDefaults,
  deleteUserDefaults,
  migrateUserDefaultsFromLocalStorage,
  getInventoryItemsForDropdown,
  getOrgConversionFactors,
  ProjectWizardDefault,
  InventoryItem,
  upsertProjectWizardDefault,
} from '../utils/project-wizard-defaults-client';
import { parseDefaultsKey, findBestMatchingItem, getEffectiveCategoryForSize } from './ProjectWizardSettings';
import { InventoryCombobox } from './InventoryCombobox';
import { PlannerDefaultsQuickHelp } from './PlannerDefaultsQuickHelp';
import { STANDARD_LUMBER_LENGTHS } from '../utils/lumberLengths';
import { toast } from 'sonner@2.0.3';

interface PlannerDefaultsProps {
  organizationId: string;
  userId: string;
  plannerType: 'deck' | 'garage' | 'shed' | 'roof' | 'kitchen';
  materialTypes?: string[]; // Optional for planners like deck that have multiple material types
  initialMaterialType?: string;
  initialRailingType?: string;
  initialAluminumColor?: string;
  onDefaultsSaved?: () => void;
}

const normalizeMaterialType = (materialType: string | null | undefined): string =>
  (materialType || 'default').toLowerCase();

const normalizeCategoryKey = (category: string | null | undefined): string =>
  (category || '').trim().toLowerCase();

const makeDefaultsKey = (
  plannerType: string,
  materialType: string | null | undefined,
  category: string | null | undefined
): string => `${plannerType}-${normalizeMaterialType(materialType)}-${normalizeCategoryKey(category)}`;

const normalizeDefaultsKey = (key: string): string => {
  const [planner, materialType, ...rest] = key.split('-');
  if (!planner || !materialType || rest.length === 0) return key;
  return makeDefaultsKey(planner, materialType, rest.join('-'));
};

const isUuid = (value: string | null | undefined): boolean =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const mergeInventoryItemsById = (existing: InventoryItem[], incoming: InventoryItem[]): InventoryItem[] => {
  if (incoming.length === 0) return existing;
  const merged = new Map<string, InventoryItem>();
  existing.forEach((item) => merged.set(item.id, item));
  incoming.forEach((item) => merged.set(item.id, item));
  return Array.from(merged.values());
};

// Category groups that contain lumber items (no conversion factor needed)
const LUMBER_CATEGORY_GROUPS = new Set([
  'Framing',
  'Decking',
  'Railing',
  'Trim',
  'Flooring',
]);

/** Returns true if a category group contains lumber items (no CF needed) */
const isLumberGroup = (groupName: string): boolean => {
  // Check for exact match or "by Length" suffix (e.g., "Framing - Joists by Length")
  if (LUMBER_CATEGORY_GROUPS.has(groupName)) return true;
  if (groupName.includes('by Length')) return true;
  // Decking Boards by Length, etc.
  for (const lumber of LUMBER_CATEGORY_GROUPS) {
    if (groupName.startsWith(lumber)) return true;
  }
  return false;
};

// Helper: generate length-specific entries for a lumber category
const lumberLengthEntries = (baseName: string): string[] =>
  STANDARD_LUMBER_LENGTHS.map((len) => `${baseName} (${len}')`);

const aluminumGlassPanelEntries = (): string[] => [
  'Tempered Glass Panel (6")',
  'Tempered Glass Panel (9")',
  'Tempered Glass Panel (12")',
  'Tempered Glass Panel (15")',
  'Tempered Glass Panel (18")',
  'Tempered Glass Panel (21")',
  'Tempered Glass Panel (24")',
  'Tempered Glass Panel (27")',
  'Tempered Glass Panel (30")',
  'Tempered Glass Panel (33")',
  'Tempered Glass Panel (36")',
  'Tempered Glass Panel (39")',
  'Tempered Glass Panel (42")',
  'Tempered Glass Panel (45")',
  'Tempered Glass Panel (48")',
  'Tempered Glass Panel (51")',
  'Tempered Glass Panel (54")',
  'Tempered Glass Panel (57")',
  'Tempered Glass Panel (60")',
  'Tempered Glass Panel (63")',
  'Tempered Glass Panel (66")',
];

const aluminumDeckCategories = {
  'Framing': ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers', 'Blocking'],
  'Framing - Ledger Board by Length': lumberLengthEntries('Ledger Board'),
  'Framing - Joists by Length': lumberLengthEntries('Joists'),
  'Framing - Rim Joists by Length': lumberLengthEntries('Rim Joists'),
  'Framing - Beams by Length': lumberLengthEntries('Beams'),
  'Framing - Posts by Length': lumberLengthEntries('Posts'),
  'Framing - Blocking by Length': lumberLengthEntries('Blocking'),
  'Decking': ['Decking Boards', 'Stair Treads', 'Stair Risers'],
  'Decking Boards by Length': lumberLengthEntries('Decking Boards'),
  'Railing': ["6'", "8'", "10'", "12'"],
  'Spindles/Pickets': ["6'", "8'", "10'", "12'", "Stair"],
  'Posts': ["Inline", "Corner", "End", "Stair", "Angle", "Gate"],
  'Hardware': ['Lag Screws', 'Ledger Flashing', 'Formtube', 'Joist Hangers', 'Post Anchors', 'Concrete Mix', 'Structural Screws', 'Deck Screws', 'Post Base Plate Cover', 'Decorative Post Cap', 'Universal Angle Bracket (UAB)', 'Vinyl Insert for Glass (GVI)', 'Rubber Blocks for Glass (GRB-10)', 'Rail Support Legs (SRSL)', 'Lag Bolts (post mounting)', 'Self Drilling Screws'],
};

const ALUMINUM_ONLY_HARDWARE_CATEGORIES = new Set([
  'Post Base Plate Cover',
  'Decorative Post Cap',
  'Universal Angle Bracket (UAB)',
  'Vinyl Insert for Glass (GVI)',
  'Rubber Blocks for Glass (GRB-10)',
  'Rail Support Legs (SRSL)',
  'Lag Bolts (post mounting)',
  'Self Drilling Screws',
]);

const uniquifyCategory = (categoryGroup: string, category: string): string => {
  if (['Railing', 'Spindles/Pickets', 'Posts'].includes(categoryGroup)) {
    return `${categoryGroup} - ${category}`;
  }
  return category;
};

const getLengthCategoryGroup = (category: string): string | null => {
  if (category === 'Ledger Board') return 'Framing - Ledger Board by Length';
  if (category === 'Joists') return 'Framing - Joists by Length';
  if (category === 'Rim Joists') return 'Framing - Rim Joists by Length';
  if (category === 'Beams') return 'Framing - Beams by Length';
  if (category === 'Posts') return 'Framing - Posts by Length';
  if (category === 'Blocking') return 'Framing - Blocking by Length';
  if (category === 'Decking Boards') return 'Decking Boards by Length';
  return null;
};

/** Industry-standard suggested conversion factors (ft per piece → CF = 1/length).
 *  Used as final fallback when no org or user CF is set. */
const SYSTEM_CF_SUGGESTIONS: Record<string, number> = {
  // Siding Accessories (feet per piece)
  'Starter Strip': 1 / 12.5,           // 12.5 ft/piece
  'Finish Trim': 1 / 12,               // 12 ft/piece
  'Finish Trim (Soffit)': 1 / 12,
  'J-Channel': 1 / 12,
  'J-Channel (Soffit)': 1 / 12,
  'Outside Corner': 1 / 10,            // 10 ft/piece
  'Inside Corner': 1 / 10,
  'Trim Coil': 1 / 50,                 // 50 ft/roll
  'Aluminum Trim Coil': 1 / 50,
  // Soffit Accessories
  'F-Channel': 1 / 12,
  'Vinyl or Aluminum Fascia': 1 / 12,
  // Miscellaneous
  'Flashing': 1 / 10,
  'Furring Strip': 1 / 8,              // 8 ft/piece
  'Formtube': 3 / 12,                  // Sold in 12' lengths, 3' needed per footing (CF = 3/12)
};

const formatMaterialTypeLabel = (type: string, plannerType?: string): string => {
  const labels: Record<string, string> = {
    'aluminum-white': 'Aluminum - White',
    'aluminum-black': 'Aluminum - Black',
  };
  // Garage siding type labels
  const garageLabels: Record<string, string> = {
    'vinyl': 'Vinyl',
    'wood': 'Wood / LP SmartSide',
    'fiber-cement': 'Fiber Cement',
    'aluminum': 'Metal Panels',
  };
  if (plannerType === 'garage' && garageLabels[type]) return garageLabels[type];
  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
};

// Define material categories for each planner type
const PLANNER_CATEGORIES: Record<string, Record<string, Record<string, string[]>>> = {
  deck: {
    spruce: {
      'Framing': ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers', 'Blocking'],
      'Framing - Ledger Board by Length': lumberLengthEntries('Ledger Board'),
      'Framing - Joists by Length': lumberLengthEntries('Joists'),
      'Framing - Rim Joists by Length': lumberLengthEntries('Rim Joists'),
      'Framing - Beams by Length': lumberLengthEntries('Beams'),
      'Framing - Posts by Length': lumberLengthEntries('Posts'),
      'Framing - Blocking by Length': lumberLengthEntries('Blocking'),
      'Decking': ['Decking Boards', 'Stair Treads'],
      'Decking Boards by Length': lumberLengthEntries('Decking Boards'),
      'Railing': ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
      'Hardware': ['Lag Screws', 'Ledger Flashing', 'Formtube', 'Joist Hangers', 'Railing Brackets', 'Post Anchors', 'Concrete Mix', 'Structural Screws', 'Deck Screws'],
    },
    treated: {
      'Framing': ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers', 'Blocking'],
      'Framing - Ledger Board by Length': lumberLengthEntries('Ledger Board'),
      'Framing - Joists by Length': lumberLengthEntries('Joists'),
      'Framing - Rim Joists by Length': lumberLengthEntries('Rim Joists'),
      'Framing - Beams by Length': lumberLengthEntries('Beams'),
      'Framing - Posts by Length': lumberLengthEntries('Posts'),
      'Framing - Blocking by Length': lumberLengthEntries('Blocking'),
      'Decking': ['Decking Boards', 'Stair Treads', 'Stair Risers'],
      'Decking Boards by Length': lumberLengthEntries('Decking Boards'),
      'Railing': ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
      'Hardware': ['Lag Screws', 'Ledger Flashing', 'Formtube', 'Joist Hangers', 'Railing Brackets', 'Post Anchors', 'Concrete Mix', 'Structural Screws', 'Deck Screws'],
    },
    composite: {
      'Framing': ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers', 'Blocking'],
      'Framing - Ledger Board by Length': lumberLengthEntries('Ledger Board'),
      'Framing - Joists by Length': lumberLengthEntries('Joists'),
      'Framing - Rim Joists by Length': lumberLengthEntries('Rim Joists'),
      'Framing - Beams by Length': lumberLengthEntries('Beams'),
      'Framing - Posts by Length': lumberLengthEntries('Posts'),
      'Framing - Blocking by Length': lumberLengthEntries('Blocking'),
      'Decking': ['Decking Boards', 'Stair Treads'],
      'Decking Boards by Length': lumberLengthEntries('Decking Boards'),
      'Railing': ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
      'Hardware': ['Lag Screws', 'Ledger Flashing', 'Formtube', 'Deck Clips', 'Composite Screws', 'Composite Plugs', 'Joist Hangers', 'Railing Brackets', 'Post Anchors', 'Concrete Mix', 'Structural Screws'],
    },
    cedar: {
      'Framing': ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers', 'Blocking'],
      'Framing - Ledger Board by Length': lumberLengthEntries('Ledger Board'),
      'Framing - Joists by Length': lumberLengthEntries('Joists'),
      'Framing - Rim Joists by Length': lumberLengthEntries('Rim Joists'),
      'Framing - Beams by Length': lumberLengthEntries('Beams'),
      'Framing - Posts by Length': lumberLengthEntries('Posts'),
      'Framing - Blocking by Length': lumberLengthEntries('Blocking'),
      'Decking': ['Decking Boards', 'Stair Treads'],
      'Decking Boards by Length': lumberLengthEntries('Decking Boards'),
      'Railing': ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
      'Hardware': ['Lag Screws', 'Ledger Flashing', 'Formtube', 'Joist Hangers', 'Railing Brackets', 'Post Anchors', 'Concrete Mix', 'Structural Screws', 'Deck Screws'],
    },
    aluminum: aluminumDeckCategories,
    'aluminum-white': aluminumDeckCategories,
    'aluminum-black': aluminumDeckCategories,
  },
  garage: {
    default: {
      'Foundation': ['Concrete Slab', 'Vapor Barrier', 'Gravel Base', 'Rebar', 'Wire Mesh'],
      'Framing': ['Wall Studs', 'Plates', 'Headers', 'Blocking/Bracing', 'Roof Trusses', 'Wall Sheathing', 'Roof Sheathing'],
      'Framing - Wall Studs by Length': lumberLengthEntries('Wall Studs'),
      'Framing - Plates by Length': lumberLengthEntries('Plates'),
      'Framing - Headers by Length': lumberLengthEntries('Headers'),
      'Roofing': ['Felt Underlayment', 'Roof Shingles', 'Ridge Cap', 'Drip Edge', 'Roofing Nails'],
      'Siding': ['House Wrap', 'Siding', 'Trim Boards', 'Fascia Boards'],
      'Siding - Fascia Boards by Length': lumberLengthEntries('Fascia Boards'),
      'Doors': ['Garage Door', 'Garage Door Opener', 'Entry Door'],
      'Windows': ['Windows'],
      'Hardware': ['16d Common Nails', '8d Common Nails', 'Joist Hangers', 'Hurricane Ties', 'Construction Adhesive', 'Anchor Bolts'],
      'Electrical': ['Sub-Panel', 'Romex Wire', 'LED Shop Lights', 'Outlets (GFCI)', 'Light Switches', 'Junction Boxes'],
      'Insulation': ['Insulation (Walls)', 'Insulation (Ceiling)', 'Vapor Barrier (Insulation)'],
    },
    vinyl: {
      'Foundation': ['Concrete Slab', 'Vapor Barrier', 'Gravel Base', 'Rebar', 'Wire Mesh'],
      'Framing': ['Wall Studs', 'Plates', 'Headers', 'Blocking/Bracing', 'Roof Trusses', 'Wall Sheathing', 'Roof Sheathing'],
      'Framing - Wall Studs by Length': lumberLengthEntries('Wall Studs'),
      'Framing - Plates by Length': lumberLengthEntries('Plates'),
      'Framing - Headers by Length': lumberLengthEntries('Headers'),
      'Roofing': ['Felt Underlayment', 'Roof Shingles', 'Ridge Cap', 'Drip Edge', 'Roofing Nails'],
      'Siding - Fascia Boards by Length': lumberLengthEntries('Fascia Boards'),
      'Siding Accessories': ['Starter Strip', 'Finish Trim', 'J-Channel', 'Outside Corner', 'Inside Corner', 'Trim Coil', 'Trim Nails'],
      'Soffit Accessories': ['F-Channel', 'J-Channel (Soffit)', 'Vinyl or Aluminum Fascia', 'Aluminum Trim Coil', 'Finish Trim (Soffit)'],
      'Miscellaneous': ['Backer Board / House Wrap', 'Flashing', 'Caulk', 'Sealing Tape (Windows/Doors)', 'Siding Nails', 'Furring Strip'],
      'Finishing Touches': ['Mounting Blocks', 'Surface Mounts', 'Dryerhood', 'Exhaust Vents', 'Gable Vents', 'Gutters'],
      'Doors': ['Garage Door', 'Garage Door Opener', 'Entry Door'],
      'Windows': ['Windows'],
      'Hardware': ['16d Common Nails', '8d Common Nails', 'Joist Hangers', 'Hurricane Ties', 'Construction Adhesive', 'Anchor Bolts'],
      'Electrical': ['Sub-Panel', 'Romex Wire', 'LED Shop Lights', 'Outlets (GFCI)', 'Light Switches', 'Junction Boxes'],
      'Insulation': ['Insulation (Walls)', 'Insulation (Ceiling)', 'Vapor Barrier (Insulation)'],
    },
  },
  shed: {
    default: {
      'Foundation': ['Foundation Skids', 'Concrete Blocks', 'Runners', 'Gravel', 'Landscape Fabric', 'Border', 'Concrete Slab', 'Wire Mesh', 'Vapor Barrier'],
      'Framing': ['Floor Joists', 'Rim Joists', 'Wall Studs', 'Plates', 'Headers', 'Rafters', 'Roof Trusses', 'Collar Ties', 'Ridge Board', 'Loft Joists', 'Wall Sheathing', 'Roof Sheathing'],
      'Framing - Floor Joists by Length': lumberLengthEntries('Floor Joists'),
      'Framing - Rim Joists by Length': lumberLengthEntries('Rim Joists'),
      'Framing - Wall Studs by Length': lumberLengthEntries('Wall Studs'),
      'Framing - Plates by Length': lumberLengthEntries('Plates'),
      'Framing - Rafters by Length': lumberLengthEntries('Rafters'),
      'Framing - Ridge Board by Length': lumberLengthEntries('Ridge Board'),
      'Framing - Loft Joists by Length': lumberLengthEntries('Loft Joists'),
      'Flooring': ['Floor Decking'],
      'Roofing': ['Felt Underlayment', 'Roof Shingles', 'Ridge Cap', 'Drip Edge', 'Roofing Nails'],
      'Siding': ['House Wrap', 'Siding'],
      'Doors': ['Door', 'Door Hardware', 'Hinges', 'Handle/Latch'],
      'Windows': ['Windows', 'Shutters'],
      'Trim': ['Corner Trim', 'Fascia Boards', 'Door/Window Trim', 'Flower Box Kit'],
      'Trim - Fascia Boards by Length': lumberLengthEntries('Fascia Boards'),
      'Hardware': ['16d Common Nails', '8d Box Nails', 'Deck Screws', 'Hurricane Ties', 'Construction Adhesive'],
      'Electrical': ['Electrical Wire', 'Light Fixture', 'Outlet (GFCI)', 'Light Switch', 'Junction Box'],
      'Accessories': ['Shelf Supports', 'Plywood Shelving', 'Shelf Brackets'],
    },
  },
  roof: {
    default: {
      'Roofing': ['Shingles', 'Underlayment', 'Ice & Water Shield', 'Drip Edge', 'Ridge Cap', 'Starter Shingles', 'Roofing Nails', 'Roof Sealant'],
      'Flashing': ['Step Flashing', 'Valley Flashing', 'Chimney Flashing', 'Vent Pipe Flashing', 'Skylight Flashing'],
      'Ventilation': ['Ridge Vent', 'Soffit Vents', 'Gable Vents', 'Roof Vents', 'Turbine Vents', 'Baffles'],
      'Gutters': ['Gutters', 'Downspouts', 'Gutter Hangers', 'End Caps', 'Elbows', 'Gutter Guards'],
      'Decking': ['Roof Sheathing (Plywood)', 'Roof Sheathing (OSB)', 'H-Clips'],
      'Accessories': ['Roof Jacks', 'Roof Anchors', 'Roof Brackets', 'Ridge Vent Connectors'],
    },
  },
  kitchen: {
    default: {
      'Cabinets': ['Base Cabinets', 'Wall Cabinets', 'Tall Cabinets', 'Corner Cabinets'],
      'Countertops': ['Granite', 'Quartz', 'Laminate', 'Butcher Block'],
      'Appliances': ['Refrigerator', 'Range/Oven', 'Dishwasher', 'Microwave'],
      'Fixtures': ['Sink', 'Faucet', 'Garbage Disposal'],
      'Hardware': ['Cabinet Pulls', 'Cabinet Knobs', 'Hinges'],
    },
  },
  finishing: {
    mdf: {
      'Mouldings': ['Baseboard', 'Casing', 'Crown', 'Shoe', 'Quarter Round'],
      'Doors': ['Interior Door', 'Bifold Door', 'Pocket Door'],
      'Hardware': ['Door Knobs', 'Hinges', 'Door Stops'],
      'Miscellaneous': ['Wood Filler', 'Caulk', 'Construction Adhesive']
    },
    finger_joint: {
      'Mouldings': ['Baseboard', 'Casing', 'Crown', 'Shoe', 'Quarter Round'],
      'Doors': ['Interior Door', 'Bifold Door', 'Pocket Door'],
      'Hardware': ['Door Knobs', 'Hinges', 'Door Stops'],
      'Miscellaneous': ['Wood Filler', 'Caulk', 'Construction Adhesive']
    },
    pine: {
      'Mouldings': ['Baseboard', 'Casing', 'Crown', 'Shoe', 'Quarter Round'],
      'Doors': ['Interior Door', 'Bifold Door', 'Pocket Door'],
      'Hardware': ['Door Knobs', 'Hinges', 'Door Stops'],
      'Miscellaneous': ['Wood Filler', 'Caulk', 'Construction Adhesive']
    }
  }
};

function LengthCollapsible({
  label,
  category,
  matType,
  inventoryItems,
  getDefaultValue,
  handleDefaultChange,
  getOrgDefaultValue,
  uniquifyCategory,
  plannerType
}: {
  label: string;
  category: string;
  matType: string | null;
  inventoryItems: any[];
  getDefaultValue: any;
  handleDefaultChange: any;
  getOrgDefaultValue: any;
  uniquifyCategory: any;
  plannerType: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const lengthGroup = getLengthCategoryGroup(category);
  if (!lengthGroup) return null;

  const lengths = ["8'", "10'", "12'", "14'", "16'"];

  return (
    <div className="mt-2 pl-4 border-l-2 border-muted">
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground h-6 px-1"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        <span>Configure {label} by Length</span>
      </Button>

      {isOpen && (
        <div className="mt-2 space-y-3 pl-2">
          {lengths.map((len) => {
            const displayCat = `${category} (${len})`;
            const uniqueCat = `${lengthGroup} - ${len}`;
            const currentValue = getDefaultValue(matType, uniqueCat);
            const orgValue = getOrgDefaultValue(matType, uniqueCat);
            const isCustomized = currentValue !== orgValue;
            
            return (
              <div key={len} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                    {len} Length:
                    {isCustomized && (
                      <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded font-semibold">Custom</span>
                    )}
                  </Label>
                </div>
                <InventoryCombobox
                  id={`len-${plannerType}-${matType}-${category}-${len}`}
                  items={inventoryItems}
                  value={currentValue}
                  onChange={(value) => handleDefaultChange(matType, uniqueCat, value)}
                  placeholder={`Select ${len} item...`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PlannerDefaults({ organizationId, userId, plannerType, materialTypes, initialMaterialType, initialRailingType, initialAluminumColor, onDefaultsSaved }: PlannerDefaultsProps) {
  const draftStorageKey = `planner_defaults_draft_${organizationId}_${userId}_${plannerType}`;
  const hasInitializedDefaults = useRef(false);
  const lastInitialMaterialTypeRef = useRef(initialMaterialType);
  const lastInitialRailingTypeRef = useRef(initialRailingType);
  const lastInitialAluminumColorRef = useRef(initialAluminumColor);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [userDefaults, setUserDefaults] = useState<Record<string, string>>({});
  const [orgDefaults, setOrgDefaults] = useState<Record<string, string>>({});
  const [orgCFs, setOrgCFs] = useState<Record<string, string>>({});
  const getInitialMaterialType = () => {
    if (!materialTypes || materialTypes.length === 0) return 'default';

    const storageKey = `planner_defaults_selected_type_${plannerType}_${organizationId}_${userId}`;
    const savedType = localStorage.getItem(storageKey);
    if (savedType && materialTypes.includes(savedType)) {
      return savedType;
    }

    const normalizedInitial = initialMaterialType?.toLowerCase();
    if (normalizedInitial && materialTypes.includes(normalizedInitial)) {
      return normalizedInitial;
    }

    return materialTypes[0];
  };

  const [selectedMaterialType, setSelectedMaterialType] = useState<string>(getInitialMaterialType);
  const [selectedRailingType, setSelectedRailingType] = useState<string>((initialRailingType || 'Treated').toLowerCase());
  const [selectedAluminumColor, setSelectedAluminumColor] = useState<string>((initialAluminumColor || 'white').toLowerCase());
  // Local string state for CF inputs so users can clear & type freely (e.g. "0.04")
  const [cfEditValues, setCfEditValues] = useState<Record<string, string>>({});

  // Derived modular select variables for deck planner
  const deckFramingType = userDefaults['deck-default-framing-type'] || 'treated';
  const deckDeckingType = userDefaults['deck-default-decking-type'] || 'treated';
  const deckRailingType = userDefaults['deck-default-railing-type'] || 'treated';
  const deckStairType = userDefaults['deck-default-stair-type'] || 'treated';

  const deckFramingAccType = userDefaults['deck-default-framing-accessories-type'] || 'match';
  const deckDeckingAccType = userDefaults['deck-default-decking-accessories-type'] || 'match';
  const deckRailingAccType = userDefaults['deck-default-railing-accessories-type'] || 'match';
  const deckStairAccType = userDefaults['deck-default-stair-accessories-type'] || 'match';

  const deckGlobalFasteners = userDefaults['deck-global-fasteners'] || 'galvanized';
  const deckGlobalPostSize = userDefaults['deck-global-post-size'] || '4x4';
  const deckGlobalJoistSize = userDefaults['deck-global-joist-size'] || '2x8';
  const deckGlobalDeckingSize = userDefaults['deck-global-decking-size'] || '5/4x6';
  const deckGlobalRailingHeight = userDefaults['deck-global-railing-height'] || '36';
  const deckGlobalStairWidth = userDefaults['deck-global-stair-width'] || '36';

  const handleSettingChange = (key: string, value: string) => {
    setUserDefaults((prev) => {
      const updated = { ...prev, [key]: value };

      // Auto-populate defaults for the selected material type or size
      let categories: string[] = [];
      let matType = '';

      if (key === 'deck-default-framing-type') {
        matType = value;
        categories = ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers', 'Blocking'];
      } else if (key === 'deck-global-joist-size') {
        matType = deckFramingType;
        categories = ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Stair Stringers', 'Blocking'];
      } else if (key === 'deck-global-post-size') {
        matType = deckFramingType;
        categories = ['Posts'];
      } else if (key === 'deck-default-decking-type') {
        matType = value;
        categories = ['Decking Boards', 'Stair Treads', 'Stair Risers'];
      } else if (key === 'deck-global-decking-size') {
        matType = deckDeckingType;
        categories = ['Decking Boards', 'Stair Treads', 'Stair Risers'];
      } else if (key === 'deck-default-stair-type') {
        matType = value;
        categories = ['Stair Treads', 'Stair Risers', 'Stair Stringers'];
      } else if (key === 'deck-default-railing-type') {
        matType = value;
        if (value.startsWith('aluminum')) {
          const alumRailing = ["6'", "8'", "10'", "12'"].map(c => `Railing - ${c}`);
          const alumSpindles = ["6'", "8'", "10'", "12'", "Stair"].map(c => `Spindles/Pickets - ${c}`);
          const alumPosts = ["Inline", "Corner", "End", "Stair", "Angle", "Gate"].map(c => `Posts - ${c}`);
          const alumHardware = Array.from(ALUMINUM_ONLY_HARDWARE_CATEGORIES);
          categories = [...alumRailing, ...alumSpindles, ...alumPosts, ...alumHardware];
        } else {
          categories = ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'];
        }
      }

      if (categories.length > 0) {
        categories.forEach((cat) => {
          // Resolve effective category with size
          const effectiveCat = getEffectiveCategoryForSize(cat, 'deck', updated);
          const defaultsKey = makeDefaultsKey('deck', matType, effectiveCat);
          if (!updated[defaultsKey] || updated[defaultsKey] === 'none') {
            const bestMatch = findBestMatchingItem('deck', matType, effectiveCat, inventoryItems);
            if (bestMatch) {
              updated[defaultsKey] = bestMatch.id;
            }
          }

          const lengthGroup = getLengthCategoryGroup(cat);
          if (lengthGroup) {
            ["8'", "10'", "12'", "14'", "16'"].forEach((len) => {
              const uniqueCat = `${lengthGroup} - ${len}`;
              const effectiveUniqueCat = getEffectiveCategoryForSize(uniqueCat, 'deck', updated);
              const lenDefaultsKey = makeDefaultsKey('deck', matType, effectiveUniqueCat);
              if (!updated[lenDefaultsKey] || updated[lenDefaultsKey] === 'none') {
                const searchCat = `${cat} (${len})`;
                const effectiveSearchCat = getEffectiveCategoryForSize(searchCat, 'deck', updated);
                const bestMatch = findBestMatchingItem('deck', matType, effectiveSearchCat, inventoryItems);
                if (bestMatch) {
                  updated[lenDefaultsKey] = bestMatch.id;
                }
              }
            });
          }
        });
      }

      return updated;
    });
  };

  const getResolvedMaterialType = (section: 'framing' | 'decking' | 'railing' | 'stair', accessory: boolean = false): string => {
    if (!accessory) {
      if (section === 'framing') return deckFramingType;
      if (section === 'decking') return deckDeckingType;
      if (section === 'railing') return deckRailingType;
      return deckStairType;
    } else {
      if (section === 'framing') {
        return deckFramingAccType === 'match' ? deckFramingType : deckFramingAccType;
      }
      if (section === 'decking') {
        return deckDeckingAccType === 'match' ? deckDeckingType : deckDeckingAccType;
      }
      if (section === 'railing') {
        return deckRailingAccType === 'match' ? deckRailingType : deckRailingAccType;
      }
      return deckStairAccType === 'match' ? deckStairType : deckStairAccType;
    }
  };

  useEffect(() => {
    if (organizationId) {
      loadData();
    }
  }, [organizationId, userId]);

  useEffect(() => {
    if (materialTypes && materialTypes.length > 0) {
      const storageKey = `planner_defaults_selected_type_${plannerType}_${organizationId}_${userId}`;
      localStorage.setItem(storageKey, selectedMaterialType);
    }
  }, [selectedMaterialType, materialTypes, plannerType, organizationId, userId]);

  useEffect(() => {
    if (!materialTypes || materialTypes.length === 0) return;
    const normalizedInitial = initialMaterialType?.toLowerCase();
    if (!normalizedInitial || !materialTypes.includes(normalizedInitial)) return;
    
    if (lastInitialMaterialTypeRef.current !== initialMaterialType) {
      lastInitialMaterialTypeRef.current = initialMaterialType;
      setSelectedMaterialType(normalizedInitial);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMaterialType, materialTypes]);

  useEffect(() => {
    if (lastInitialRailingTypeRef.current !== initialRailingType) {
      lastInitialRailingTypeRef.current = initialRailingType;
      const normalized = (initialRailingType || 'Treated').toLowerCase();
      setSelectedRailingType(normalized);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRailingType]);

  useEffect(() => {
    if (lastInitialAluminumColorRef.current !== initialAluminumColor) {
      lastInitialAluminumColorRef.current = initialAluminumColor;
      const normalized = (initialAluminumColor || 'white').toLowerCase();
      setSelectedAluminumColor(normalized);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAluminumColor]);

  const isAluminumRailingColorSensitiveCategory = (materialType: string | null, categoryGroup: string, category: string): boolean => {
    return plannerType === 'deck'
      && selectedRailingType === 'aluminum'
      && (
        categoryGroup === 'Railing'
        || categoryGroup === 'Spindles/Pickets'
        || categoryGroup === 'Posts'
        || (categoryGroup === 'Hardware' && ALUMINUM_ONLY_HARDWARE_CATEGORIES.has(category))
      );
  };

  const getEffectiveMaterialType = (materialType: string | null, categoryGroup: string, category: string): string | null => {
    if (isAluminumRailingColorSensitiveCategory(materialType, categoryGroup, category)) {
      return `aluminum-${selectedAluminumColor}`;
    }
    return materialType;
  };

  const getDisplayCategories = (): Record<string, string[]> => {
    const baseCategories = PLANNER_CATEGORIES[plannerType]?.[selectedMaterialType] || PLANNER_CATEGORIES[plannerType]?.default || {};
    if (!(plannerType === 'deck' && selectedRailingType === 'aluminum')) {
      return baseCategories;
    }

    const merged = { ...baseCategories };
    merged['Railing'] = aluminumDeckCategories['Railing'];
    merged['Spindles/Pickets'] = aluminumDeckCategories['Spindles/Pickets'];
    merged['Posts'] = aluminumDeckCategories['Posts'];

    const baseHardware = baseCategories['Hardware'] || [];
    const mergedHardware = [
      ...baseHardware.filter((item) => item !== 'Railing Brackets'),
      ...aluminumDeckCategories['Hardware'].filter((item) => !baseHardware.includes(item)),
    ];
    merged['Hardware'] = mergedHardware;

    return merged;
  };

  const loadData = async () => {
    setLoading(true);
    // Safety net: always clear the spinner after 12s even if a fetch hangs
    const safetyTimer = setTimeout(() => setLoading(false), 12000);
    try {
      // Fire-and-forget migration — don't let it block the UI
      migrateUserDefaultsFromLocalStorage(userId, organizationId).catch(() => {});

      // Load organization defaults from database
      const orgDefaultsData = await getProjectWizardDefaults(organizationId);
      const orgDefaultsMap: Record<string, string> = {};
      const itemIdsToFetch: string[] = [];

      // Organization defaults loaded
      orgDefaultsData.forEach((def) => {
        const key = makeDefaultsKey(def.planner_type, def.material_type, def.material_category);
        if (isUuid(def.inventory_item_id)) {
          orgDefaultsMap[key] = def.inventory_item_id;
          itemIdsToFetch.push(def.inventory_item_id);
        }
      });
      setOrgDefaults(orgDefaultsMap);
      // Org defaults map set

      // Load user-specific defaults from database
      const userDefaultsMapRaw = await getUserDefaults(userId, organizationId);
      const userDefaultsMap: Record<string, string> = {};
      Object.entries(userDefaultsMapRaw).forEach(([key, value]) => {
        userDefaultsMap[normalizeDefaultsKey(key)] = value;
      });
      let draftDefaultsMap: Record<string, string> = {};
      try {
        const draftRaw = localStorage.getItem(draftStorageKey);
        if (draftRaw) {
          const parsedDraft = JSON.parse(draftRaw);
          if (parsedDraft && typeof parsedDraft === 'object') {
            Object.entries(parsedDraft).forEach(([key, value]) => {
              if (typeof value === 'string') {
                draftDefaultsMap[normalizeDefaultsKey(key)] = value;
              }
            });
          }
        }
      } catch {
        // Ignore malformed draft defaults
      }

      setUserDefaults({ ...userDefaultsMap, ...draftDefaultsMap });
      // User defaults map set

      // Add user default item IDs to fetch list
      Object.values({ ...userDefaultsMap, ...draftDefaultsMap }).forEach((itemId) => {
        if (isUuid(itemId) && !itemIdsToFetch.includes(itemId)) {
          itemIdsToFetch.push(itemId);
        }
      });

      // Load inventory items
      if (itemIdsToFetch.length > 0) {
        // Loading inventory items
        const items = await getInventoryItemsForDropdown(organizationId, itemIdsToFetch);
        // Inventory items loaded
        setInventoryItems(items);
      }

      // Load full inventory list in background
      setTimeout(async () => {
        const allItems = await getInventoryItemsForDropdown(organizationId);
        // Background: loaded all inventory items
        if (allItems.length > 0) {
          setInventoryItems((prev) => mergeInventoryItemsById(prev, allItems));

          // Auto-heal orphaned references in both orgDefaults and userDefaults!
          const itemIdsSet = new Set(allItems.map((i) => i.id));

          // 1. Heal Org Defaults
          const healedOrg: Record<string, string> = { ...orgDefaultsMap };
          const healedOrgList: { key: string; val: string }[] = [];
          
          // First, heal any orphaned org defaults
          Object.entries(orgDefaultsMap).forEach(([key, val]) => {
            if (val && val !== 'none' && !itemIdsSet.has(val)) {
              const parsed = parseDefaultsKey(key);
              if (parsed) {
                const bestMatch = findBestMatchingItem(parsed.plannerType, parsed.materialType, parsed.category, allItems);
                if (bestMatch) {
                  healedOrg[key] = bestMatch.id;
                  healedOrgList.push({ key, val: bestMatch.id });
                }
              }
            }
          });

          // Second, auto-populate any completely missing categories in orgDefaults from PLANNER_CATEGORIES
          const currentPlannerCategories = PLANNER_CATEGORIES[plannerType] || {};
          Object.entries(currentPlannerCategories).forEach(([matType, sections]) => {
            Object.entries(sections).forEach(([sectionName, categories]) => {
              categories.forEach((category) => {
                const uniqueCategory = uniquifyCategory(sectionName, category);
                const key = makeDefaultsKey(plannerType, matType, uniqueCategory);
                if (!healedOrg[key] || healedOrg[key] === 'none') {
                  const bestMatch = findBestMatchingItem(plannerType, matType, uniqueCategory, allItems);
                  if (bestMatch) {
                    healedOrg[key] = bestMatch.id;
                    healedOrgList.push({ key, val: bestMatch.id });
                  }
                }
              });
            });
          });

          if (healedOrgList.length > 0) {
            setOrgDefaults(healedOrg);
            // Save healed org-level defaults to database in background
            const toUpsert: ProjectWizardDefault[] = healedOrgList
              .map(({ key, val }) => {
                const parsed = parseDefaultsKey(key);
                if (!parsed) return null;
                return {
                  organization_id: organizationId,
                  planner_type: parsed.plannerType as any,
                  material_type: parsed.materialType || 'default',
                  material_category: parsed.category,
                  inventory_item_id: val,
                };
              })
              .filter((config): config is ProjectWizardDefault => config !== null);

            if (toUpsert.length > 0) {
              Promise.all(toUpsert.map((config) => upsertProjectWizardDefault(config)))
                .then(() => {
                  console.log(`[auto-heal-org] Persisted ${toUpsert.length} healed/populated defaults to the database.`);
                })
                .catch((err) => {
                  console.error('[auto-heal-org] Error persisting healed/populated defaults:', err);
                });
            }
          }

          // 2. Heal User Defaults (merged from userDefaultsMap and draftDefaultsMap)
          const mergedUserDefaultKeys = { ...userDefaultsMap, ...draftDefaultsMap };
          const healedUser: Record<string, string> = { ...mergedUserDefaultKeys };
          const healedUserList: { key: string; val: string }[] = [];
          Object.entries(mergedUserDefaultKeys).forEach(([key, val]) => {
            if (val && val !== 'none' && !itemIdsSet.has(val) && !key.endsWith('-cf')) {
              const parsed = parseDefaultsKey(key);
              if (parsed) {
                const bestMatch = findBestMatchingItem(parsed.plannerType, parsed.materialType, parsed.category, allItems);
                if (bestMatch) {
                  healedUser[key] = bestMatch.id;
                  healedUserList.push({ key, val: bestMatch.id });
                }
              }
            }
          });

          if (healedUserList.length > 0) {
            setUserDefaults(healedUser);
            // Save healed user-level defaults to database in background
            saveUserDefaults(userId, organizationId, healedUser)
              .then(() => {
                console.log('[auto-heal-user] Saved healed user defaults.');
              })
              .catch((err) => {
                console.error('[auto-heal-user] Error saving healed user defaults:', err);
              });
          }
        }
      }, 100);

      // Load org-level conversion factors from KV
      try {
        const orgCFData = await getOrgConversionFactors(organizationId);
        setOrgCFs(orgCFData);
        // Org CFs loaded
      } catch (cfErr) {
        // Could not load org CFs
      }

    } catch (error) {
      // Error loading defaults
      toast.error('Failed to load defaults');
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loading) return;

    try {
      localStorage.setItem(draftStorageKey, JSON.stringify(userDefaults));
    } catch {
      // Best-effort draft cache only
    }

    if (!hasInitializedDefaults.current) {
      hasInitializedDefaults.current = true;
      return;
    }

    onDefaultsSaved?.();
  }, [userDefaults, loading, draftStorageKey, onDefaultsSaved]);

  const handleDefaultChange = (materialType: string | null, category: string, itemId: string) => {
    const effectiveCat = getEffectiveCategoryForSize(category, plannerType, userDefaults);
    const key = makeDefaultsKey(plannerType, materialType, effectiveCat);
    if (itemId === 'none') {
      setUserDefaults((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setUserDefaults((prev) => ({
        ...prev,
        [key]: itemId,
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save all user defaults to database
      const success = await saveUserDefaults(userId, organizationId, userDefaults);

      if (success) {
        toast.success('Defaults saved successfully');
        try {
          localStorage.removeItem(draftStorageKey);
        } catch {
          // Ignore draft cleanup failures
        }
      } else {
        toast.error('Could not sync defaults to server. Your changes are kept as a local draft.');
      }

      // Always notify so pricing re-enriches from the fresh localStorage cache
      onDefaultsSaved?.();
    } catch (error) {
      // Error saving defaults
      toast.error('Failed to save defaults');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreOrgDefaults = async () => {
    setSaving(true);
    try {
      // Delete user defaults from database (restore to org defaults)
      const success = await deleteUserDefaults(userId, organizationId);
      
      if (success) {
        // Reset local state to match organization defaults for this planner
        const filteredOrgDefaults: Record<string, string> = {};
        Object.entries(orgDefaults).forEach(([key, value]) => {
          if (key.startsWith(`${plannerType}-`)) {
            filteredOrgDefaults[key] = value;
          }
        });
        setUserDefaults(filteredOrgDefaults);

        try {
          localStorage.removeItem(draftStorageKey);
        } catch {
          // Ignore draft cleanup failures
        }

        onDefaultsSaved?.();
        toast.success('Defaults restored from organization settings');
      } else {
        toast.error('Failed to restore defaults');
      }
    } catch (error) {
      // Error restoring defaults
      toast.error('Failed to restore defaults');
    } finally {
      setSaving(false);
    }
  };

  const getDefaultValue = (materialType: string | null, category: string): string => {
    const effectiveCat = getEffectiveCategoryForSize(category, plannerType, userDefaults);
    const key = makeDefaultsKey(plannerType, materialType, effectiveCat);
    const aluminumFallbackKey = materialType?.startsWith('aluminum-') ? makeDefaultsKey(plannerType, 'aluminum', effectiveCat) : null;
    const fallbackKey = makeDefaultsKey(plannerType, 'default', effectiveCat);
    // First check user defaults, then fall back to org defaults.
    // If the selected material type has no explicit value, inherit "default".
    return userDefaults[key]
      || (aluminumFallbackKey ? userDefaults[aluminumFallbackKey] : undefined)
      || userDefaults[fallbackKey]
      || orgDefaults[key]
      || (aluminumFallbackKey ? orgDefaults[aluminumFallbackKey] : undefined)
      || orgDefaults[fallbackKey]
      || 'none';
  };

  const getOrgDefaultValue = (materialType: string | null, category: string): string => {
    const effectiveCat = getEffectiveCategoryForSize(category, plannerType, userDefaults);
    const key = makeDefaultsKey(plannerType, materialType, effectiveCat);
    const aluminumFallbackKey = materialType?.startsWith('aluminum-') ? makeDefaultsKey(plannerType, 'aluminum', effectiveCat) : null;
    const fallbackKey = makeDefaultsKey(plannerType, 'default', effectiveCat);
    return orgDefaults[key] || (aluminumFallbackKey ? orgDefaults[aluminumFallbackKey] : undefined) || orgDefaults[fallbackKey] || 'none';
  };

  // Conversion Factor helpers — stored in userDefaults with `-cf` suffix
  const getCFKey = (materialType: string | null, category: string): string => {
    const effectiveCat = getEffectiveCategoryForSize(category, plannerType, userDefaults);
    return `${makeDefaultsKey(plannerType, materialType, effectiveCat)}-cf`;
  };

  // Org CF key format (no `-cf` suffix, matches ProjectWizardSettings format)
  const getOrgCFKey = (materialType: string | null, category: string): string => {
    const effectiveCat = getEffectiveCategoryForSize(category, plannerType, userDefaults);
    return makeDefaultsKey(plannerType, materialType, effectiveCat);
  };

  /** Get the effective CF: user override > org default > 1 */
  const getConversionFactor = (materialType: string | null, category: string): number => {
    // 1. Check user-level CF
    const userKey = getCFKey(materialType, category);
    const userVal = userDefaults[userKey];
    if (userVal) {
      const parsed = parseFloat(userVal);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    // 2. Fall back to org-level CF
    const orgKey = getOrgCFKey(materialType, category);
    const orgVal = orgCFs[orgKey];
    if (orgVal) {
      const parsed = parseFloat(orgVal);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    if (materialType?.startsWith('aluminum-')) {
      const fallbackOrgVal = orgCFs[getOrgCFKey('aluminum', category)];
      if (fallbackOrgVal) {
        const parsed = parseFloat(fallbackOrgVal);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    // 3. Fall back to system-suggested CFs for known items
    const suggested = SYSTEM_CF_SUGGESTIONS[category];
    if (suggested) return suggested;
    return 1;
  };

  /** Check if user has their own CF set (vs inheriting from org) */
  const hasUserCF = (materialType: string | null, category: string): boolean => {
    const userKey = getCFKey(materialType, category);
    const userVal = userDefaults[userKey];
    if (!userVal) return false;
    const parsed = parseFloat(userVal);
    return !isNaN(parsed) && parsed > 0 && parsed !== 1;
  };

  /** Get the org-level CF value (for display) */
  const getOrgCF = (materialType: string | null, category: string): number => {
    const orgKey = getOrgCFKey(materialType, category);
    const orgVal = orgCFs[orgKey];
    if (orgVal) {
      const parsed = parseFloat(orgVal);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    if (materialType?.startsWith('aluminum-')) {
      const fallbackOrgVal = orgCFs[getOrgCFKey('aluminum', category)];
      if (fallbackOrgVal) {
        const parsed = parseFloat(fallbackOrgVal);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    return 1;
  };

  const handleCFInputChange = (materialType: string | null, category: string, value: string) => {
    const key = getCFKey(materialType, category);
    // Store raw string so user can type freely (e.g. "", "0.", "0.04")
    setCfEditValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleCFInputBlur = (materialType: string | null, category: string) => {
    const key = getCFKey(materialType, category);
    const raw = cfEditValues[key];
    // Clear the edit buffer
    setCfEditValues((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
    if (raw === undefined) return;
    const num = parseFloat(raw);
    if (isNaN(num) || num <= 0 || num === 1) {
      // Remove CF entry (effectively reset to 1)
      setUserDefaults((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setUserDefaults((prev) => ({
        ...prev,
        [key]: String(num),
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const categories = getDisplayCategories();

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-30 rounded-lg border bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <PlannerDefaultsQuickHelp />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              onClick={handleRestoreOrgDefaults}
              variant="outline"
              disabled={saving}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Restore Organization Defaults
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save My Defaults
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {plannerType.charAt(0).toUpperCase() + plannerType.slice(1)} Planner Defaults
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Customize your personal defaults for material selections. These will override the organization defaults.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {plannerType === 'deck' ? (
            <div className="space-y-8">
              {/* DECK PLANNER - DEFAULT MATERIALS */}
              <div>
                <h3 className="text-lg font-bold text-foreground border-b pb-2 mb-4">DECK PLANNER - DEFAULT MATERIALS</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Framing Material Card */}
                  <Card className="border border-border/80 shadow-sm">
                    <CardHeader className="pb-3 border-b border-border/40">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <CardTitle className="text-sm font-semibold text-foreground whitespace-nowrap">FRAMING MATERIAL</CardTitle>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Material:</span>
                            <Select value={deckFramingType} onValueChange={(val) => handleSettingChange('deck-default-framing-type', val)}>
                              <SelectTrigger className="h-8 w-[140px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="treated">Pressure Treated</SelectItem>
                                <SelectItem value="spruce">Spruce</SelectItem>
                                <SelectItem value="cedar">Cedar</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Size:</span>
                            <Select value={deckGlobalJoistSize} onValueChange={(val) => handleSettingChange('deck-global-joist-size', val)}>
                              <SelectTrigger className="h-8 w-[80px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="2x8">2x8</SelectItem>
                                <SelectItem value="2x10">2x10</SelectItem>
                                <SelectItem value="2x12">2x12</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="space-y-4">
                        {['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers', 'Blocking'].map((category) => {
                          const matType = getResolvedMaterialType('framing');
                          return (
                            <div key={category} className="space-y-2">
                              <Label className="text-xs font-medium text-foreground">{category}</Label>
                              <InventoryCombobox
                                id={`deck-framing-${category}`}
                                items={inventoryItems}
                                value={getDefaultValue(matType, category)}
                                onChange={(value) => handleDefaultChange(matType, category, value)}
                                placeholder={`Select ${category}...`}
                              />
                              <LengthCollapsible
                                label={category}
                                category={category}
                                matType={matType}
                                inventoryItems={inventoryItems}
                                getDefaultValue={getDefaultValue}
                                handleDefaultChange={handleDefaultChange}
                                getOrgDefaultValue={getOrgDefaultValue}
                                uniquifyCategory={uniquifyCategory}
                                plannerType="deck"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Decking Material Card */}
                  <Card className="border border-border/80 shadow-sm">
                    <CardHeader className="pb-3 border-b border-border/40">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <CardTitle className="text-sm font-semibold text-foreground whitespace-nowrap">DECKING MATERIAL</CardTitle>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Decking Type:</span>
                            <Select value={deckDeckingType} onValueChange={(val) => handleSettingChange('deck-default-decking-type', val)}>
                              <SelectTrigger className="h-8 w-[140px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="treated">Pressure Treated</SelectItem>
                                <SelectItem value="spruce">Spruce</SelectItem>
                                <SelectItem value="cedar">Cedar</SelectItem>
                                <SelectItem value="composite">Composite</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Size:</span>
                            <Select value={deckGlobalDeckingSize} onValueChange={(val) => handleSettingChange('deck-global-decking-size', val)}>
                              <SelectTrigger className="h-8 w-[80px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5/4x6">5/4x6</SelectItem>
                                <SelectItem value="2x6">2x6</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="space-y-4">
                        {['Decking Boards', 'Stair Treads', 'Stair Risers'].map((category) => {
                          const matType = getResolvedMaterialType('decking');
                          return (
                            <div key={category} className="space-y-2">
                              <Label className="text-xs font-medium text-foreground">{category}</Label>
                              <InventoryCombobox
                                id={`deck-decking-${category}`}
                                items={inventoryItems}
                                value={getDefaultValue(matType, category)}
                                onChange={(value) => handleDefaultChange(matType, category, value)}
                                placeholder={`Select ${category}...`}
                              />
                              <LengthCollapsible
                                label={category}
                                category={category}
                                matType={matType}
                                inventoryItems={inventoryItems}
                                getDefaultValue={getDefaultValue}
                                handleDefaultChange={handleDefaultChange}
                                getOrgDefaultValue={getOrgDefaultValue}
                                uniquifyCategory={uniquifyCategory}
                                plannerType="deck"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Railing Material Card */}
                  <Card className="border border-border/80 shadow-sm">
                    <CardHeader className="pb-3 border-b border-border/40">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <CardTitle className="text-sm font-semibold text-foreground whitespace-nowrap">RAILING MATERIAL</CardTitle>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Railing Material:</span>
                            <Select 
                              value={deckRailingType.startsWith('aluminum') ? 'aluminum' : deckRailingType} 
                              onValueChange={(val) => {
                                if (val === 'aluminum') {
                                  const currentColour = deckRailingType.startsWith('aluminum-') ? deckRailingType.split('-')[1] : 'black';
                                  handleSettingChange('deck-default-railing-type', `aluminum-${currentColour}`);
                                } else {
                                  handleSettingChange('deck-default-railing-type', val);
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 w-[140px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="treated">Pressure Treated</SelectItem>
                                <SelectItem value="spruce">Spruce</SelectItem>
                                <SelectItem value="cedar">Cedar</SelectItem>
                                <SelectItem value="aluminum">Aluminum</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {deckRailingType.startsWith('aluminum') && (
                            <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">Colours:</span>
                              <Select 
                                value={deckRailingType.startsWith('aluminum-') ? deckRailingType.split('-')[1] : 'black'} 
                                onValueChange={(val) => {
                                  handleSettingChange('deck-default-railing-type', `aluminum-${val}`);
                                }}
                              >
                                <SelectTrigger className="h-8 w-[95px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="black">Black</SelectItem>
                                  <SelectItem value="white">White</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="space-y-4">
                        {deckRailingType.startsWith('aluminum-') ? (
                          <>
                            {/* Render aluminum categories */}
                            {[['Railing', ["6'", "8'", "10'", "12'"]], ['Spindles/Pickets', ["6'", "8'", "10'", "12'", "Stair"]], ['Posts', ["Inline", "Corner", "End", "Stair", "Angle", "Gate"]]].map(([group, subcats]: any) => (
                              <div key={group} className="space-y-3">
                                <h4 className="text-xs font-semibold text-muted-foreground">{group}</h4>
                                {subcats.map((subcat: string) => {
                                  const uniqueCat = uniquifyCategory(group, subcat);
                                  const matType = getResolvedMaterialType('railing');
                                  return (
                                    <div key={subcat} className="space-y-1.5 pl-2 border-l border-border">
                                      <Label className="text-xs text-foreground">{subcat}</Label>
                                      <InventoryCombobox
                                        id={`deck-railing-${group}-${subcat}`}
                                        items={inventoryItems}
                                        value={getDefaultValue(matType, uniqueCat)}
                                        onChange={(value) => handleDefaultChange(matType, uniqueCat, value)}
                                        placeholder={`Select ${subcat}...`}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </>
                        ) : (
                          <>
                            {/* Render wood categories */}
                            {['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'].map((category) => {
                              const matType = getResolvedMaterialType('railing');
                              return (
                                <div key={category} className="space-y-2">
                                  <Label className="text-xs font-medium text-foreground">{category}</Label>
                                  <InventoryCombobox
                                    id={`deck-railing-${category}`}
                                    items={inventoryItems}
                                    value={getDefaultValue(matType, category)}
                                    onChange={(value) => handleDefaultChange(matType, category, value)}
                                    placeholder={`Select ${category}...`}
                                  />
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stair Material Card */}
                  <Card className="border border-border/80 shadow-sm">
                    <CardHeader className="pb-3 border-b border-border/40">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <CardTitle className="text-sm font-semibold text-foreground whitespace-nowrap">STAIR MATERIAL</CardTitle>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">Default Type:</span>
                          <Select value={deckStairType} onValueChange={(val) => handleSettingChange('deck-default-stair-type', val)}>
                            <SelectTrigger className="h-8 w-[150px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="treated">Pressure Treated</SelectItem>
                              <SelectItem value="spruce">Spruce</SelectItem>
                              <SelectItem value="cedar">Cedar</SelectItem>
                              <SelectItem value="composite">Composite</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="space-y-4">
                        {['Stair Treads', 'Stair Risers', 'Stair Stringers'].map((category) => {
                          const matType = getResolvedMaterialType('stair');
                          return (
                            <div key={category} className="space-y-2">
                              <Label className="text-xs font-medium text-foreground">{category}</Label>
                              <InventoryCombobox
                                id={`deck-stair-${category}`}
                                items={inventoryItems}
                                value={getDefaultValue(matType, category)}
                                onChange={(value) => handleDefaultChange(matType, category, value)}
                                placeholder={`Select ${category}...`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* ACCESSORIES SECTION */}
              <div>
                <h3 className="text-lg font-bold text-foreground border-b pb-2 mb-4">ACCESSORIES</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Framing Accessories Card */}
                  <Card className="border border-border/80 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        <span>Framing Accessories</span>
                        <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase">{deckFramingAccType}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Material Selection</Label>
                        <Select value={deckFramingAccType} onValueChange={(val) => handleSettingChange('deck-default-framing-accessories-type', val)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="match">Match Framing Material</SelectItem>
                            <SelectItem value="treated">Pressure Treated</SelectItem>
                            <SelectItem value="spruce">Spruce</SelectItem>
                            <SelectItem value="cedar">Cedar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-4 pt-2 border-t border-border/40">
                        {['Lag Screws', 'Ledger Flashing', 'Formtube', 'Joist Hangers', 'Post Anchors', 'Concrete Mix', 'Structural Screws'].map((category) => {
                          const matType = getResolvedMaterialType('framing', true);
                          return (
                            <div key={category} className="space-y-2">
                              <Label className="text-xs font-medium text-foreground">{category}</Label>
                              <InventoryCombobox
                                id={`deck-framing-acc-${category}`}
                                items={inventoryItems}
                                value={getDefaultValue(matType, category)}
                                onChange={(value) => handleDefaultChange(matType, category, value)}
                                placeholder={`Select ${category}...`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Decking Accessories Card */}
                  <Card className="border border-border/80 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        <span>Decking Accessories</span>
                        <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase">{deckDeckingAccType}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Material Selection</Label>
                        <Select value={deckDeckingAccType} onValueChange={(val) => handleSettingChange('deck-default-decking-accessories-type', val)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="match">Match Decking Material</SelectItem>
                            <SelectItem value="treated">Pressure Treated</SelectItem>
                            <SelectItem value="spruce">Spruce</SelectItem>
                            <SelectItem value="cedar">Cedar</SelectItem>
                            <SelectItem value="composite">Composite</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-4 pt-2 border-t border-border/40">
                        {['Deck Screws', 'Deck Clips', 'Composite Screws', 'Composite Plugs'].map((category) => {
                          const matType = getResolvedMaterialType('decking', true);
                          return (
                            <div key={category} className="space-y-2">
                              <Label className="text-xs font-medium text-foreground">{category}</Label>
                              <InventoryCombobox
                                id={`deck-decking-acc-${category}`}
                                items={inventoryItems}
                                value={getDefaultValue(matType, category)}
                                onChange={(value) => handleDefaultChange(matType, category, value)}
                                placeholder={`Select ${category}...`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Railing Accessories Card */}
                  <Card className="border border-border/80 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        <span>Railing Accessories</span>
                        <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase">{deckRailingAccType}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Material Selection</Label>
                        <Select value={deckRailingAccType} onValueChange={(val) => handleSettingChange('deck-default-railing-accessories-type', val)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="match">Match Railing Material</SelectItem>
                            <SelectItem value="treated">Pressure Treated</SelectItem>
                            <SelectItem value="spruce">Spruce</SelectItem>
                            <SelectItem value="cedar">Cedar</SelectItem>
                            <SelectItem value="aluminum-black">Aluminum (Black)</SelectItem>
                            <SelectItem value="aluminum-white">Aluminum (White)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-4 pt-2 border-t border-border/40">
                        {['Railing Brackets', 'Post Base Plate Cover', 'Decorative Post Cap', 'Universal Angle Bracket (UAB)', 'Vinyl Insert for Glass (GVI)', 'Rubber Blocks for Glass (GRB-10)', 'Rail Support Legs (SRSL)', 'Self Drilling Screws'].map((category) => {
                          const matType = getResolvedMaterialType('railing', true);
                          return (
                            <div key={category} className="space-y-2">
                              <Label className="text-xs font-medium text-foreground">{category}</Label>
                              <InventoryCombobox
                                id={`deck-railing-acc-${category}`}
                                items={inventoryItems}
                                value={getDefaultValue(matType, category)}
                                onChange={(value) => handleDefaultChange(matType, category, value)}
                                placeholder={`Select ${category}...`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stair Accessories Card */}
                  <Card className="border border-border/80 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        <span>Stair Accessories</span>
                        <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase">{deckStairAccType}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Material Selection</Label>
                        <Select value={deckStairAccType} onValueChange={(val) => handleSettingChange('deck-default-stair-accessories-type', val)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="match">Match Stair Material</SelectItem>
                            <SelectItem value="treated">Pressure Treated</SelectItem>
                            <SelectItem value="spruce">Spruce</SelectItem>
                            <SelectItem value="cedar">Cedar</SelectItem>
                            <SelectItem value="composite">Composite</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-4 pt-2 border-t border-border/40">
                        <p className="text-xs text-muted-foreground italic">Stair Accessories automatically inherit from stair material.</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* GLOBAL DEFAULTS SECTION */}
              <div>
                <h3 className="text-lg font-bold text-foreground border-b pb-2 mb-4">GLOBAL DEFAULTS</h3>
                <Card className="border border-border/80 shadow-sm">
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                    {/* Fasteners */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Fasteners</Label>
                      <Select value={deckGlobalFasteners} onValueChange={(val) => handleSettingChange('deck-global-fasteners', val)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="galvanized">Galvanized</SelectItem>
                          <SelectItem value="stainless_steel">Stainless Steel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Post Size */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Post Size</Label>
                      <Select value={deckGlobalPostSize} onValueChange={(val) => handleSettingChange('deck-global-post-size', val)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4x4">4x4</SelectItem>
                          <SelectItem value="6x6">6x6</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Joist Size */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Joist Size</Label>
                      <Select value={deckGlobalJoistSize} onValueChange={(val) => handleSettingChange('deck-global-joist-size', val)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2x8">2x8</SelectItem>
                          <SelectItem value="2x10">2x10</SelectItem>
                          <SelectItem value="2x12">2x12</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Railing Height */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Railing Height</Label>
                      <Select value={deckGlobalRailingHeight} onValueChange={(val) => handleSettingChange('deck-global-railing-height', val)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="36">36"</SelectItem>
                          <SelectItem value="42">42"</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Stair Width */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Stair Width</Label>
                      <Select value={deckGlobalStairWidth} onValueChange={(val) => handleSettingChange('deck-global-stair-width', val)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="36">36"</SelectItem>
                          <SelectItem value="42">42"</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(categories).map(([categoryGroup, items]) => {
                const showCF = !isLumberGroup(categoryGroup);

                return (
                  <div key={categoryGroup} className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <h3 className="font-semibold text-foreground">{categoryGroup}</h3>
                      {showCF && (
                        <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          Conversion Factor available
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items.map((category) => {
                        const baseMatType = selectedMaterialType === 'default' ? null : selectedMaterialType;
                        const matType = getEffectiveMaterialType(baseMatType, categoryGroup, category);
                        const uniqueCategory = uniquifyCategory(categoryGroup, category);
                        const currentValue = getDefaultValue(matType, uniqueCategory);
                        const orgValue = getOrgDefaultValue(matType, uniqueCategory);
                        const isCustomized = currentValue !== orgValue;
                        const cfValue = showCF ? getConversionFactor(matType, uniqueCategory) : 1;

                        return (
                          <div key={category} className="space-y-2">
                            <Label htmlFor={`${plannerType}-${selectedMaterialType}-${category}`} className="flex items-center gap-2 text-foreground">
                              {category}
                              {isCustomized && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Custom</span>
                              )}
                            </Label>
                            <InventoryCombobox
                              id={`${plannerType}-${selectedMaterialType}-${category}`}
                              items={inventoryItems}
                              value={currentValue}
                              onChange={(value) => handleDefaultChange(matType, uniqueCategory, value)}
                              placeholder="Select inventory item..."
                            />
                            {showCF && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <Label className="text-xs text-muted-foreground whitespace-nowrap" htmlFor={`cf-${plannerType}-${selectedMaterialType}-${category}`}>
                                  CF:
                                </Label>
                                {(() => {
                                  const cfKey = getCFKey(matType, uniqueCategory);
                                  const editVal = cfEditValues[cfKey];
                                  const userHasCF = hasUserCF(matType, uniqueCategory);
                                  const orgCFVal = getOrgCF(matType, uniqueCategory);
                                  const isInherited = !userHasCF && orgCFVal !== 1;
                                  const displayVal = editVal !== undefined ? editVal : (cfValue === 1 ? '' : String(cfValue));
                                  return (
                                    <>
                                      <Input
                                        id={`cf-${plannerType}-${selectedMaterialType}-${category}`}
                                        type="text"
                                        inputMode="decimal"
                                        value={displayVal}
                                        onChange={(e) => handleCFInputChange(matType, uniqueCategory, e.target.value)}
                                        onBlur={() => handleCFInputBlur(matType, uniqueCategory)}
                                        placeholder={orgCFVal !== 1 ? String(orgCFVal) : '1'}
                                        className={`h-7 w-24 text-xs ${isInherited ? 'border-amber-300 bg-amber-50/50' : ''}`}
                                        title="Conversion Factor: raw qty × CF = purchase qty. E.g., 25 screws/box → CF=0.04 (1÷25). Enter any decimal."
                                      />
                                      {cfValue !== 1 && editVal === undefined && (
                                        <span className="text-xs text-amber-600 font-medium">
                                          ×{cfValue}
                                        </span>
                                      )}
                                      {isInherited && (
                                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded" title="Inherited from organization settings">
                                          Org
                                        </span>
                                      )}
                                      {userHasCF && orgCFVal !== 1 && (
                                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded" title={`Overrides org CF of ${orgCFVal}`}>
                                          Override (org: {orgCFVal})
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                            {isCustomized && orgValue !== 'none' && (
                              <p className="text-xs text-muted-foreground">
                                Org default: {inventoryItems.find(i => i.id === orgValue)?.name || 'Not set'}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}