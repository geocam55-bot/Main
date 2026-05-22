import { GarageConfig, GarageMaterials, MaterialItem } from '../types/garage';
import {
  selectLumberLength,
  getLumberCombination,
  getLumberLengthDescription,
} from './lumberLengths';

export function calculateMaterials(config: GarageConfig): GarageMaterials {
  const foundation = calculateFoundation(config);
  const framing = calculateFraming(config);
  const roofing = calculateRoofing(config);
  const siding = calculateSiding(config);
  const doors = calculateDoors(config);
  const windows = calculateWindows(config);
  const hardware = calculateHardware(config);
  const electrical = config.hasElectrical ? calculateElectrical(config) : [];
  const insulation = config.isInsulated ? calculateInsulation(config) : [];

  return {
    foundation,
    framing,
    roofing,
    siding,
    doors,
    windows,
    hardware,
    electrical: electrical.length > 0 ? electrical : undefined,
    insulation: insulation.length > 0 ? insulation : undefined,
  };
}

// ---------------------------------------------------------------------------
// Helper: consolidate lumber pieces by length into a Map<length, totalCount>
// ---------------------------------------------------------------------------
function addConsolidatedPieces(
  target: Map<number, number>,
  combo: { length: number; count: number }[],
  multiplier: number
): void {
  combo.forEach(({ length, count }) => {
    target.set(length, (target.get(length) || 0) + count * multiplier);
  });
}

function calculateFoundation(config: GarageConfig): MaterialItem[] {
  const { width, length } = config;
  const areaSquareFeet = width * length;

  return [
    {
      category: 'Foundation',
      description: '4" Concrete Slab',
      quantity: Math.ceil(areaSquareFeet / 80), // cubic yards (4" thick)
      unit: 'cu yd',
      notes: `${areaSquareFeet.toFixed(0)} sq ft @ 4" thick`,
    },
    {
      category: 'Foundation',
      description: '6mil Vapor Barrier',
      quantity: Math.ceil(areaSquareFeet / 100),
      unit: 'roll',
      notes: '100 sq ft per roll',
    },
    {
      category: 'Foundation',
      description: 'Gravel Base (4" compacted)',
      quantity: Math.ceil(areaSquareFeet / 80),
      unit: 'cu yd',
    },
    {
      category: 'Foundation',
      description: 'Rebar #4 @ 18" o.c.',
      quantity: Math.ceil((width + length) * 2.5 / 20),
      unit: 'piece',
      notes: '20 ft lengths',
    },
    {
      category: 'Foundation',
      description: 'Wire Mesh (6x6 W1.4xW1.4)',
      quantity: Math.ceil(areaSquareFeet / 150),
      unit: 'roll',
      notes: '5x150 ft rolls',
    },
  ];
}

function calculateFraming(config: GarageConfig): MaterialItem[] {
  const { width, length, height, wallFraming, hasAtticTrusses } = config;
  const perimeterFeet = (width + length) * 2;
  const wallStuds = Math.ceil(perimeterFeet * 0.75); // 16" o.c. spacing

  const materials: MaterialItem[] = [];

  // ---- Wall Studs ----
  // Stud length depends on wall height
  const studLumberLength = selectLumberLength(height);
  materials.push({
    category: 'Framing',
    description: `${wallFraming} x ${studLumberLength}' Studs`,
    quantity: wallStuds,
    unit: 'piece',
    notes: `Wall studs @ 16" o.c. (${height}' walls)`,
    lumberLength: studLumberLength,
  });

  // ---- Plates (Top/Bottom) ----
  // Plates run the perimeter. Width walls and length walls need separate combinations.
  // Double top plate + single bottom plate = 3 runs around perimeter
  const platePieces = new Map<number, number>();
  // Two width walls × 3 plate runs each
  addConsolidatedPieces(platePieces, getLumberCombination(width), 2 * 3);
  // Two length walls × 3 plate runs each
  addConsolidatedPieces(platePieces, getLumberCombination(length), 2 * 3);

  Array.from(platePieces.entries())
    .sort((a, b) => b[0] - a[0])
    .forEach(([len, qty]) => {
      materials.push({
        category: 'Framing',
        description: `${wallFraming} x ${len}' Plates (Top/Bottom)`,
        quantity: qty,
        unit: 'piece',
        notes: 'Bottom plate and double top plate',
        lumberLength: len,
      });
    });

  // ---- Headers ----
  // Headers span door and window openings. Use the widest door width as reference.
  const maxDoorWidth = config.doors.reduce((max, d) => Math.max(max, d.width), 0);
  const headerSpan = Math.max(maxDoorWidth + 1, 4); // +1' for jack studs on each side
  const headerLumberLength = selectLumberLength(headerSpan);
  materials.push({
    category: 'Framing',
    description: `${wallFraming} x ${headerLumberLength}' Headers`,
    quantity: config.doors.length + 2,
    unit: 'piece',
    notes: `For door and window openings (${headerSpan}' span)`,
    lumberLength: headerLumberLength,
  });

  // ---- Blocking / Bracing ----
  const blockingLength = selectLumberLength(Math.min(height, 8));
  materials.push({
    category: 'Framing',
    description: `2x4 x ${blockingLength}' Blocking/Bracing`,
    quantity: Math.ceil(perimeterFeet / 4),
    unit: 'piece',
    notes: 'Fire blocking and lateral bracing',
    lumberLength: blockingLength,
  });

  // ---- Roof Trusses ----
  const trusSpacing = 2; // 24" o.c.
  const numTrusses = Math.ceil(length / trusSpacing) + 1;
  
  if (hasAtticTrusses) {
    materials.push({
      category: 'Framing',
      description: `${width}' Attic Trusses`,
      quantity: numTrusses,
      unit: 'piece',
      notes: 'Engineered trusses with storage space',
    });
  } else {
    materials.push({
      category: 'Framing',
      description: `${width}' Standard Roof Trusses`,
      quantity: numTrusses,
      unit: 'piece',
      notes: `${config.roofPitch}/12 pitch`,
    });
  }

  // ---- Sheathing ----
  const wallArea = perimeterFeet * height;
  const roofArea = calculateRoofArea(config);

  materials.push(
    {
      category: 'Framing',
      description: '7/16" OSB Wall Sheathing',
      quantity: Math.ceil(wallArea / 32), // 4x8 sheets
      unit: 'sheet',
      notes: `${Math.ceil(wallArea)} sq ft`,
    },
    {
      category: 'Framing',
      description: '7/16" OSB Roof Sheathing',
      quantity: Math.ceil(roofArea / 32),
      unit: 'sheet',
      notes: `${Math.ceil(roofArea)} sq ft`,
    }
  );

  return materials;
}

function calculateRoofArea(config: GarageConfig): number {
  const { width, length, roofPitch, roofStyle } = config;
  
  // Calculate roof run (half the width for gable)
  const run = width / 2;
  const rise = (roofPitch / 12) * run;
  const slopeLength = Math.sqrt(run * run + rise * rise);
  
  switch (roofStyle) {
    case 'gable':
      return slopeLength * 2 * length * 1.1; // 10% waste
    case 'hip':
      return slopeLength * 2 * length * 1.15; // 15% waste for hips
    case 'gambrel':
      return slopeLength * 2 * length * 1.12; // 12% waste
    case 'flat':
      return width * length * 1.05; // 5% waste
    default:
      return width * length * 1.1;
  }
}

function calculateRoofing(config: GarageConfig): MaterialItem[] {
  const { roofingMaterial } = config;
  const roofArea = calculateRoofArea(config);
  const squares = roofArea / 100; // roofing is sold by the square (100 sq ft)

  const materials: MaterialItem[] = [];

  // Underlayment
  materials.push({
    category: 'Roofing',
    description: '15# Felt Underlayment',
    quantity: Math.ceil(roofArea / 400),
    unit: 'roll',
    notes: '400 sq ft per roll',
  });

  // Roofing material
  switch (roofingMaterial) {
    case 'asphalt-shingle':
      materials.push({
        category: 'Roofing',
        description: 'Architectural Shingles',
        quantity: Math.ceil(squares),
        unit: 'square',
        notes: `${roofArea.toFixed(0)} sq ft total`,
      });
      break;
    case 'metal':
      materials.push({
        category: 'Roofing',
        description: 'Metal Roofing Panels',
        quantity: Math.ceil(roofArea),
        unit: 'sq ft',
        notes: '3 ft wide panels',
      });
      break;
    case 'rubber':
      materials.push({
        category: 'Roofing',
        description: 'EPDM Rubber Membrane',
        quantity: Math.ceil(squares),
        unit: 'square',
      });
      break;
  }

  // Ridge cap
  materials.push({
    category: 'Roofing',
    description: 'Ridge Cap',
    quantity: Math.ceil(config.length / 3),
    unit: 'bundle',
    notes: '3 ft coverage per bundle',
  });

  // Drip edge
  materials.push({
    category: 'Roofing',
    description: 'Drip Edge',
    quantity: Math.ceil((config.width + config.length) * 2 / 10),
    unit: 'piece',
    notes: '10 ft lengths',
  });

  // Nails
  materials.push({
    category: 'Roofing',
    description: 'Roofing Nails (1-1/4")',
    quantity: Math.ceil(squares),
    unit: 'box',
    notes: '1 box per square',
  });

  return materials;
}

function calculateSiding(config: GarageConfig): MaterialItem[] {
  const { width, length, height, sidingType } = config;
  const perimeterFeet = (width + length) * 2;
  const wallArea = perimeterFeet * height;
  
  // Subtract door and window areas
  let openingArea = 0;
  config.doors.forEach(door => {
    openingArea += door.width * door.height;
  });
  config.windows.forEach(window => {
    openingArea += window.width * window.height;
  });
  
  const netWallArea = wallArea - openingArea;

  const materials: MaterialItem[] = [];

  // House wrap
  materials.push({
    category: 'Siding',
    description: 'House Wrap (Tyvek)',
    quantity: Math.ceil(wallArea / 200),
    unit: 'roll',
    notes: '200 sq ft per roll',
  });

  // Siding
  switch (sidingType) {
    case 'vinyl':
      materials.push({
        category: 'Siding',
        description: 'Vinyl Siding',
        quantity: Math.ceil(netWallArea / 100),
        unit: 'square',
        notes: `${netWallArea.toFixed(0)} sq ft`,
      });
      break;
    case 'wood':
      materials.push({
        category: 'Siding',
        description: 'LP SmartSide Panels',
        quantity: Math.ceil(netWallArea / 32),
        unit: 'sheet',
        notes: '4x8 sheets',
      });
      break;
    case 'metal':
      materials.push({
        category: 'Siding',
        description: 'Metal Siding Panels',
        quantity: Math.ceil(netWallArea),
        unit: 'sq ft',
      });
      break;
    case 'fiber-cement':
      materials.push({
        category: 'Siding',
        description: 'Fiber Cement Siding',
        quantity: Math.ceil(netWallArea / 100),
        unit: 'square',
      });
      break;
  }

  // ---- Trim Boards ----
  const trimLumberLength = selectLumberLength(Math.min(height + 1, 12));
  materials.push({
    category: 'Siding',
    description: `1x4 Trim Boards (${trimLumberLength}')`,
    quantity: Math.ceil(perimeterFeet * 2 / trimLumberLength),
    unit: 'piece',
    notes: `For corners and openings`,
    lumberLength: trimLumberLength,
  });

  // ---- Fascia Boards ----
  const fasciaPieces = new Map<number, number>();
  addConsolidatedPieces(fasciaPieces, getLumberCombination(width), 2);
  addConsolidatedPieces(fasciaPieces, getLumberCombination(length), 2);

  Array.from(fasciaPieces.entries())
    .sort((a, b) => b[0] - a[0])
    .forEach(([len, qty]) => {
      materials.push({
        category: 'Siding',
        description: `1x6 Fascia Boards (${len}')`,
        quantity: qty,
        unit: 'piece',
        notes: 'Roof edge fascia',
        lumberLength: len,
      });
    });

  return materials;
}

function calculateDoors(config: GarageConfig): MaterialItem[] {
  const materials: MaterialItem[] = [];

  // Overhead doors
  config.doors.forEach((door, index) => {
    if (door.type === 'overhead') {
      materials.push({
        category: 'Doors',
        description: `${door.width}'x${door.height}' Overhead Garage Door`,
        quantity: 1,
        unit: 'each',
        notes: `Door #${index + 1} - ${door.position} wall`,
      });
      
      materials.push({
        category: 'Doors',
        description: `Garage Door Opener`,
        quantity: 1,
        unit: 'each',
        notes: `For ${door.width}' door`,
      });
    }
  });

  // Walk door
  if (config.hasWalkDoor) {
    materials.push({
      category: 'Doors',
      description: '3\' x 6\'8" Steel Walk Door',
      quantity: 1,
      unit: 'each',
      notes: 'Pre-hung with frame',
    });
  }

  return materials;
}

function calculateWindows(config: GarageConfig): MaterialItem[] {
  const materials: MaterialItem[] = [];

  config.windows.forEach((window, index) => {
    materials.push({
      category: 'Windows',
      description: `${window.width}'x${window.height}' Vinyl Window`,
      quantity: 1,
      unit: 'each',
      notes: `Window #${index + 1} - ${window.position} wall`,
    });
  });

  return materials;
}

function calculateHardware(config: GarageConfig): MaterialItem[] {
  return [
    {
      category: 'Hardware',
      description: '16d Common Nails',
      quantity: 5,
      unit: 'lb',
      notes: 'Framing nails',
    },
    {
      category: 'Hardware',
      description: '8d Common Nails',
      quantity: 3,
      unit: 'lb',
      notes: 'Sheathing nails',
    },
    {
      category: 'Hardware',
      description: 'Joist Hangers',
      quantity: 24,
      unit: 'piece',
      notes: 'For blocking',
    },
    {
      category: 'Hardware',
      description: 'Hurricane Ties',
      quantity: Math.ceil(config.length / 2),
      unit: 'piece',
      notes: 'Truss-to-wall connections',
    },
    {
      category: 'Hardware',
      description: 'Construction Adhesive',
      quantity: 6,
      unit: 'tube',
    },
    {
      category: 'Hardware',
      description: 'Anchor Bolts (1/2" x 10")',
      quantity: Math.ceil((config.width + config.length) * 2 / 4),
      unit: 'piece',
      notes: '4 ft spacing max',
    },
  ];
}

function calculateElectrical(config: GarageConfig): MaterialItem[] {
  const { width, length } = config;
  const areaSquareFeet = width * length;

  return [
    {
      category: 'Electrical',
      description: '100A Sub-Panel',
      quantity: 1,
      unit: 'each',
      notes: '8-12 circuit capacity',
    },
    {
      category: 'Electrical',
      description: '14/2 Romex Wire',
      quantity: Math.ceil(areaSquareFeet / 50),
      unit: 'roll',
      notes: '250 ft per roll',
    },
    {
      category: 'Electrical',
      description: 'LED Shop Lights (4ft)',
      quantity: Math.ceil(areaSquareFeet / 100),
      unit: 'fixture',
      notes: '1 per 100 sq ft',
    },
    {
      category: 'Electrical',
      description: 'Outlets (GFCI)',
      quantity: 4,
      unit: 'each',
      notes: 'Duplex receptacles',
    },
    {
      category: 'Electrical',
      description: 'Light Switches',
      quantity: 2,
      unit: 'each',
    },
    {
      category: 'Electrical',
      description: 'Junction Boxes',
      quantity: 8,
      unit: 'each',
    },
  ];
}

function calculateInsulation(config: GarageConfig): MaterialItem[] {
  const { width, length, height } = config;
  const wallArea = (width + length) * 2 * height;
  const roofArea = calculateRoofArea(config);

  return [
    {
      category: 'Insulation',
      description: 'R-13 Fiberglass Batts (Walls)',
      quantity: Math.ceil(wallArea / 100),
      unit: 'bag',
      notes: '100 sq ft per bag',
    },
    {
      category: 'Insulation',
      description: 'R-30 Fiberglass Batts (Ceiling)',
      quantity: Math.ceil(roofArea / 100),
      unit: 'bag',
      notes: '100 sq ft per bag',
    },
    {
      category: 'Insulation',
      description: 'Vapor Barrier (6mil)',
      quantity: Math.ceil((wallArea + roofArea) / 200),
      unit: 'roll',
      notes: '200 sq ft per roll',
    },
  ];
}
