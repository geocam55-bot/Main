import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2, Save, RefreshCw, Settings, Info } from 'lucide-react';
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
} from '../utils/project-wizard-defaults-client';
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
  'Framing': ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers'],
  'Framing - Ledger Board by Length': lumberLengthEntries('Ledger Board'),
  'Framing - Joists by Length': lumberLengthEntries('Joists'),
  'Framing - Rim Joists by Length': lumberLengthEntries('Rim Joists'),
  'Framing - Beams by Length': lumberLengthEntries('Beams'),
  'Framing - Posts by Length': lumberLengthEntries('Posts'),
  'Decking': ['Decking Boards', 'Stair Treads'],
  'Decking Boards by Length': lumberLengthEntries('Decking Boards'),
  'Railing': ['Aluminum Top & Bottom Rail', 'Picket Packages', 'Clear Glass Pickets (CDG-6)', 'Angled Stair Glass Pickets (CAG-6)', 'Aluminum Posts', 'Aluminum Stair Posts'],
  'Railing - Tempered Glass Panels by Size': aluminumGlassPanelEntries(),
  'Hardware': ['Lag Screws', 'Ledger Flashing', 'Joist Hangers', 'Post Anchors', 'Concrete Mix', 'Structural Screws', 'Deck Screws', 'Post Base Plate Cover', 'Decorative Post Cap', 'Universal Angle Bracket (UAB)', 'Vinyl Insert for Glass (GVI)', 'Rubber Blocks for Glass (GRB-10)', 'Rail Support Legs (SRSL)', 'Lag Bolts (post mounting)', 'Self Drilling Screws'],
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
      'Framing': ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers'],
      'Framing - Ledger Board by Length': lumberLengthEntries('Ledger Board'),
      'Framing - Joists by Length': lumberLengthEntries('Joists'),
      'Framing - Rim Joists by Length': lumberLengthEntries('Rim Joists'),
      'Framing - Beams by Length': lumberLengthEntries('Beams'),
      'Framing - Posts by Length': lumberLengthEntries('Posts'),
      'Decking': ['Decking Boards', 'Stair Treads'],
      'Decking Boards by Length': lumberLengthEntries('Decking Boards'),
      'Railing': ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
      'Hardware': ['Lag Screws', 'Ledger Flashing', 'Joist Hangers', 'Railing Brackets', 'Post Anchors', 'Concrete Mix', 'Structural Screws', 'Deck Screws'],
    },
    treated: {
      'Framing': ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers'],
      'Framing - Ledger Board by Length': lumberLengthEntries('Ledger Board'),
      'Framing - Joists by Length': lumberLengthEntries('Joists'),
      'Framing - Rim Joists by Length': lumberLengthEntries('Rim Joists'),
      'Framing - Beams by Length': lumberLengthEntries('Beams'),
      'Framing - Posts by Length': lumberLengthEntries('Posts'),
      'Decking': ['Decking Boards', 'Stair Treads'],
      'Decking Boards by Length': lumberLengthEntries('Decking Boards'),
      'Railing': ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
      'Hardware': ['Lag Screws', 'Ledger Flashing', 'Joist Hangers', 'Railing Brackets', 'Post Anchors', 'Concrete Mix', 'Structural Screws', 'Deck Screws'],
    },
    composite: {
      'Framing': ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers'],
      'Framing - Ledger Board by Length': lumberLengthEntries('Ledger Board'),
      'Framing - Joists by Length': lumberLengthEntries('Joists'),
      'Framing - Rim Joists by Length': lumberLengthEntries('Rim Joists'),
      'Framing - Beams by Length': lumberLengthEntries('Beams'),
      'Framing - Posts by Length': lumberLengthEntries('Posts'),
      'Decking': ['Decking Boards', 'Stair Treads'],
      'Decking Boards by Length': lumberLengthEntries('Decking Boards'),
      'Railing': ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
      'Hardware': ['Lag Screws', 'Ledger Flashing', 'Deck Clips', 'Composite Screws', 'Composite Plugs', 'Joist Hangers', 'Railing Brackets', 'Post Anchors', 'Concrete Mix', 'Structural Screws'],
    },
    cedar: {
      'Framing': ['Ledger Board', 'Joists', 'Rim Joists', 'Beams', 'Posts', 'Stair Stringers'],
      'Framing - Ledger Board by Length': lumberLengthEntries('Ledger Board'),
      'Framing - Joists by Length': lumberLengthEntries('Joists'),
      'Framing - Rim Joists by Length': lumberLengthEntries('Rim Joists'),
      'Framing - Beams by Length': lumberLengthEntries('Beams'),
      'Framing - Posts by Length': lumberLengthEntries('Posts'),
      'Decking': ['Decking Boards', 'Stair Treads'],
      'Decking Boards by Length': lumberLengthEntries('Decking Boards'),
      'Railing': ['Railing Posts', 'Railing Top Rail', 'Railing Bottom Rail', 'Railing Balusters'],
      'Hardware': ['Lag Screws', 'Ledger Flashing', 'Joist Hangers', 'Railing Brackets', 'Post Anchors', 'Concrete Mix', 'Structural Screws', 'Deck Screws'],
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

export function PlannerDefaults({ organizationId, userId, plannerType, materialTypes, initialMaterialType, initialRailingType, initialAluminumColor, onDefaultsSaved }: PlannerDefaultsProps) {
  const draftStorageKey = `planner_defaults_draft_${organizationId}_${userId}_${plannerType}`;
  const hasInitializedDefaults = useRef(false);
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
    if (selectedMaterialType !== normalizedInitial) {
      setSelectedMaterialType(normalizedInitial);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMaterialType, materialTypes]);

  useEffect(() => {
    const normalized = (initialRailingType || 'Treated').toLowerCase();
    if (selectedRailingType !== normalized) {
      setSelectedRailingType(normalized);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRailingType]);

  useEffect(() => {
    const normalized = (initialAluminumColor || 'white').toLowerCase();
    if (selectedAluminumColor !== normalized) {
      setSelectedAluminumColor(normalized);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAluminumColor]);

  const isAluminumRailingColorSensitiveCategory = (materialType: string | null, categoryGroup: string, category: string): boolean => {
    return plannerType === 'deck'
      && selectedRailingType === 'aluminum'
      && (
        categoryGroup === 'Railing'
        || categoryGroup === 'Railing - Tempered Glass Panels by Size'
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
    merged['Railing - Tempered Glass Panels by Size'] = aluminumDeckCategories['Railing - Tempered Glass Panels by Size'];

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
    const key = makeDefaultsKey(plannerType, materialType, category);
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
    const key = makeDefaultsKey(plannerType, materialType, category);
    const aluminumFallbackKey = materialType?.startsWith('aluminum-') ? makeDefaultsKey(plannerType, 'aluminum', category) : null;
    const fallbackKey = makeDefaultsKey(plannerType, 'default', category);
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
    const key = makeDefaultsKey(plannerType, materialType, category);
    const aluminumFallbackKey = materialType?.startsWith('aluminum-') ? makeDefaultsKey(plannerType, 'aluminum', category) : null;
    const fallbackKey = makeDefaultsKey(plannerType, 'default', category);
    return orgDefaults[key] || (aluminumFallbackKey ? orgDefaults[aluminumFallbackKey] : undefined) || orgDefaults[fallbackKey] || 'none';
  };

  // Conversion Factor helpers — stored in userDefaults with `-cf` suffix
  const getCFKey = (materialType: string | null, category: string): string => {
    return `${makeDefaultsKey(plannerType, materialType, category)}-cf`;
  };

  // Org CF key format (no `-cf` suffix, matches ProjectWizardSettings format)
  const getOrgCFKey = (materialType: string | null, category: string): string => {
    return makeDefaultsKey(plannerType, materialType, category);
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
          {materialTypes && materialTypes.length > 0 && (
            <div className="mb-6">
              <Label>{plannerType === 'garage' ? 'Siding Type' : plannerType === 'deck' ? 'Deck Material Type' : 'Material Type'}</Label>
              <Select value={selectedMaterialType} onValueChange={setSelectedMaterialType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {materialTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {formatMaterialTypeLabel(type, plannerType)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {plannerType === 'deck' && (
            <div className="mb-6">
              <Label>Railing Type</Label>
              <Select value={selectedRailingType} onValueChange={setSelectedRailingType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="treated">Treated</SelectItem>
                  <SelectItem value="aluminum">Aluminum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {plannerType === 'deck' && selectedRailingType === 'aluminum' && (
            <div className="mb-6">
              <Label>Aluminum Color</Label>
              <Select value={selectedAluminumColor} onValueChange={setSelectedAluminumColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="black">Black</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Applies only to railing-related aluminum defaults, not framing or decking defaults.</p>
            </div>
          )}

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
                      const currentValue = getDefaultValue(matType, category);
                      const orgValue = getOrgDefaultValue(matType, category);
                      const isCustomized = currentValue !== orgValue;
                      const cfValue = showCF ? getConversionFactor(matType, category) : 1;

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
                            onChange={(value) => handleDefaultChange(matType, category, value)}
                            placeholder="Select inventory item..."
                          />
                          {showCF && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Label className="text-xs text-muted-foreground whitespace-nowrap" htmlFor={`cf-${plannerType}-${selectedMaterialType}-${category}`}>
                                CF:
                              </Label>
                              {(() => {
                                const cfKey = getCFKey(matType, category);
                                const editVal = cfEditValues[cfKey];
                                const userHasCF = hasUserCF(matType, category);
                                const orgCFVal = getOrgCF(matType, category);
                                const isInherited = !userHasCF && orgCFVal !== 1;
                                const displayVal = editVal !== undefined ? editVal : (cfValue === 1 ? '' : String(cfValue));
                                return (
                                  <>
                                    <Input
                                      id={`cf-${plannerType}-${selectedMaterialType}-${category}`}
                                      type="text"
                                      inputMode="decimal"
                                      value={displayVal}
                                      onChange={(e) => handleCFInputChange(matType, category, e.target.value)}
                                      onBlur={() => handleCFInputBlur(matType, category)}
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
        </CardContent>
      </Card>
    </div>
  );
}