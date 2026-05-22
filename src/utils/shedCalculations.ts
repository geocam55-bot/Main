import { ShedConfig, ShedMaterials, MaterialItem } from '../types/shed';
import {
  selectLumberLength,
  getLumberCombination,
  getLumberLengthDescription,
} from './lumberLengths';

export function calculateMaterials(config: ShedConfig): ShedMaterials {
  const foundation = calculateFoundation(config);
  const framing = calculateFraming(config);
  const flooring = config.hasFloor ? calculateFlooring(config) : undefined;
  const roofing = calculateRoofing(config);
  const siding = calculateSiding(config);
  const doors = calculateDoors(config);
  const windows = calculateWindows(config);
  const trim = calculateTrim(config);
  const hardware = calculateHardware(config);
  const electrical = config.hasElectrical ? calculateElectrical(config) : undefined;
  const accessories = calculateAccessories(config);

  return {
    foundation,
    framing,
    flooring: flooring && flooring.length > 0 ? flooring : undefined,
    roofing,
    siding,
    doors,
    windows,
    trim,
    hardware,
    electrical: electrical && electrical.length > 0 ? electrical : undefined,
    accessories: accessories && accessories.length > 0 ? accessories : undefined,
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

function calculateFoundation(config: ShedConfig): MaterialItem[] {
  const { width, length, foundationType } = config;
  const materials: MaterialItem[] = [];

  switch (foundationType) {
    case 'skids': {
      const skidLumberLength = selectLumberLength(length);
      materials.push(
        {
          category: 'Foundation',
          description: `4x6 Pressure Treated Skids (${skidLumberLength}')`,
          quantity: 3,
          unit: 'piece',
          notes: `${length}' span`,
          lumberLength: skidLumberLength,
        },
        {
          category: 'Foundation',
          description: 'Gravel Base (4" depth)',
          quantity: Math.ceil((width * length * 0.33) / 27),
          unit: 'cu yd',
          notes: 'For leveling',
        }
      );
      break;
    }

    case 'concrete-blocks': {
      const numBlocks = Math.ceil((width + length) / 2) * 2;
      const runnerLumberLength = selectLumberLength(length);
      materials.push(
        {
          category: 'Foundation',
          description: '8x8x16 Solid Concrete Blocks',
          quantity: numBlocks,
          unit: 'block',
          notes: '2 ft spacing, perimeter support',
        },
        {
          category: 'Foundation',
          description: `4x4 Pressure Treated Runners (${runnerLumberLength}')`,
          quantity: 2,
          unit: 'piece',
          notes: `${length}' span`,
          lumberLength: runnerLumberLength,
        },
        {
          category: 'Foundation',
          description: 'Gravel Base',
          quantity: Math.ceil((width * length * 0.33) / 27),
          unit: 'cu yd',
        }
      );
      break;
    }

    case 'gravel-pad': {
      const borderLumberLength = selectLumberLength(Math.max(width, length));
      materials.push(
        {
          category: 'Foundation',
          description: 'Crushed Gravel (6" compacted)',
          quantity: Math.ceil((width * length * 0.5) / 27),
          unit: 'cu yd',
        },
        {
          category: 'Foundation',
          description: 'Landscape Fabric',
          quantity: Math.ceil((width * length) / 100),
          unit: 'roll',
          notes: '100 sq ft per roll',
        },
        {
          category: 'Foundation',
          description: `4x4 Pressure Treated Border (${borderLumberLength}')`,
          quantity: Math.ceil((width + length) * 2 / borderLumberLength),
          unit: 'piece',
          notes: 'Perimeter border',
          lumberLength: borderLumberLength,
        }
      );
      break;
    }

    case 'concrete-slab':
      materials.push(
        {
          category: 'Foundation',
          description: '4" Concrete Slab',
          quantity: Math.ceil((width * length * 0.33) / 27),
          unit: 'cu yd',
        },
        {
          category: 'Foundation',
          description: 'Gravel Base (4" compacted)',
          quantity: Math.ceil((width * length * 0.33) / 27),
          unit: 'cu yd',
        },
        {
          category: 'Foundation',
          description: 'Wire Mesh Reinforcement',
          quantity: Math.ceil((width * length) / 150),
          unit: 'roll',
        },
        {
          category: 'Foundation',
          description: '6mil Vapor Barrier',
          quantity: Math.ceil((width * length) / 100),
          unit: 'roll',
        }
      );
      break;
  }

  return materials;
}

function calculateFraming(config: ShedConfig): MaterialItem[] {
  const { width, length, wallHeight, style, hasLoft } = config;
  const materials: MaterialItem[] = [];

  // ---- Floor Framing ----
  if (config.hasFloor) {
    const numJoists = Math.ceil(width / 1.33) + 1; // 16" o.c.
    // Floor joists span the width
    const floorJoistLength = selectLumberLength(width);
    materials.push({
      category: 'Framing',
      description: `2x6 x ${floorJoistLength}' Floor Joists`,
      quantity: numJoists,
      unit: 'piece',
      notes: `16" on center (${width}' span)`,
      lumberLength: floorJoistLength,
    });

    // Rim joists span the length
    const rimJoistCombo = getLumberCombination(length);
    rimJoistCombo.forEach(({ length: len, count }) => {
      materials.push({
        category: 'Framing',
        description: `2x6 x ${len}' Rim Joists`,
        quantity: 2 * count,
        unit: 'piece',
        notes: rimJoistCombo.length > 1
          ? `Floor perimeter (${getLumberLengthDescription(length)} per side)`
          : 'Floor perimeter',
        lumberLength: len,
      });
    });
  }

  // ---- Wall Framing ----
  const perimeterFeet = (width + length) * 2;
  const wallStuds = Math.ceil(perimeterFeet * 0.75); // 16" o.c.
  const studLumberLength = selectLumberLength(wallHeight);

  materials.push({
    category: 'Framing',
    description: `2x4 x ${studLumberLength}' Wall Studs`,
    quantity: wallStuds,
    unit: 'piece',
    notes: `Pre-cut studs @ 16" o.c. (${wallHeight}' walls)`,
    lumberLength: studLumberLength,
  });

  // ---- Wall Plates ----
  // Top and bottom plates run perimeter
  const platePieces = new Map<number, number>();
  addConsolidatedPieces(platePieces, getLumberCombination(width), 2 * 2); // 2 width walls × 2 plates
  addConsolidatedPieces(platePieces, getLumberCombination(length), 2 * 2); // 2 length walls × 2 plates

  Array.from(platePieces.entries())
    .sort((a, b) => b[0] - a[0])
    .forEach(([len, qty]) => {
      materials.push({
        category: 'Framing',
        description: `2x4 x ${len}' Plates`,
        quantity: qty,
        unit: 'piece',
        notes: 'Top and bottom plates',
        lumberLength: len,
      });
    });

  // ---- Headers ----
  const headerSpan = Math.max(config.doorWidth + 1, 4);
  const headerLumberLength = selectLumberLength(headerSpan);
  materials.push({
    category: 'Framing',
    description: `2x6 x ${headerLumberLength}' Headers`,
    quantity: 3,
    unit: 'piece',
    notes: `For door and window openings (${headerSpan}' span)`,
    lumberLength: headerLumberLength,
  });

  // ---- Roof Framing ----
  const numRafters = Math.ceil(length / 2) + 1;

  if (style === 'barn') {
    materials.push({
      category: 'Framing',
      description: `${width}' Gambrel Roof Trusses`,
      quantity: numRafters,
      unit: 'piece',
      notes: 'Pre-built barn-style trusses',
    });
  } else {
    // Calculate rafter length based on roof geometry
    const run = style === 'lean-to' ? width : width / 2;
    const rise = (config.roofPitch / 12) * run;
    const rafterRawLength = Math.ceil(Math.sqrt(run * run + rise * rise) + 1); // +1' for overhang
    const rafterLumberLength = selectLumberLength(rafterRawLength);

    materials.push({
      category: 'Framing',
      description: `2x4 x ${rafterLumberLength}' Rafters`,
      quantity: numRafters * (style === 'lean-to' ? 1 : 2),
      unit: 'piece',
      notes: `${config.roofPitch}/12 pitch (${rafterRawLength}' length)`,
      lumberLength: rafterLumberLength,
    });

    // Collar ties
    const collarTieLength = selectLumberLength(Math.ceil(width * 0.6));
    materials.push({
      category: 'Framing',
      description: `2x4 x ${collarTieLength}' Collar Ties`,
      quantity: Math.ceil(numRafters / 2),
      unit: 'piece',
      notes: 'Rafter bracing',
      lumberLength: collarTieLength,
    });
  }

  // ---- Ridge Board ----
  const ridgeCombo = getLumberCombination(length);
  ridgeCombo.forEach(({ length: len, count }) => {
    materials.push({
      category: 'Framing',
      description: `2x4 x ${len}' Ridge Board`,
      quantity: count,
      unit: 'piece',
      notes: ridgeCombo.length > 1
        ? `Ridge (${getLumberLengthDescription(length)} total span)`
        : 'Ridge board',
      lumberLength: len,
    });
  });

  // ---- Loft Framing ----
  if (hasLoft) {
    const loftJoists = Math.ceil(width / 1.33);
    const loftJoistLength = selectLumberLength(width);
    materials.push({
      category: 'Framing',
      description: `2x6 x ${loftJoistLength}' Loft Joists`,
      quantity: loftJoists,
      unit: 'piece',
      notes: `Storage loft framing (${width}' span)`,
      lumberLength: loftJoistLength,
    });
  }

  // ---- Sheathing ----
  const wallArea = perimeterFeet * wallHeight;
  const roofArea = calculateRoofArea(config);

  materials.push(
    {
      category: 'Framing',
      description: '7/16" OSB Wall Sheathing',
      quantity: Math.ceil(wallArea / 32),
      unit: 'sheet',
      notes: '4x8 sheets',
    },
    {
      category: 'Framing',
      description: '1/2" OSB Roof Sheathing',
      quantity: Math.ceil(roofArea / 32),
      unit: 'sheet',
      notes: '4x8 sheets',
    }
  );

  return materials;
}

function calculateFlooring(config: ShedConfig): MaterialItem[] {
  const { width, length } = config;
  const areaSquareFeet = width * length;

  return [
    {
      category: 'Flooring',
      description: '3/4" Tongue & Groove Plywood',
      quantity: Math.ceil(areaSquareFeet / 32),
      unit: 'sheet',
      notes: '4x8 sheets, advantech or similar',
    },
    {
      category: 'Flooring',
      description: 'Construction Adhesive',
      quantity: Math.ceil(areaSquareFeet / 150),
      unit: 'tube',
    },
  ];
}

function calculateRoofing(config: ShedConfig): MaterialItem[] {
  const { roofingMaterial, length, width } = config;
  const roofArea = calculateRoofArea(config);
  const squares = roofArea / 100;
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
        description: '3-Tab Asphalt Shingles',
        quantity: Math.ceil(squares),
        unit: 'square',
        notes: `${roofArea.toFixed(0)} sq ft total`,
      });
      break;
    case 'architectural-shingle':
      materials.push({
        category: 'Roofing',
        description: 'Architectural Shingles',
        quantity: Math.ceil(squares),
        unit: 'square',
      });
      break;
    case 'metal':
      materials.push({
        category: 'Roofing',
        description: 'Corrugated Metal Roofing Panels',
        quantity: Math.ceil(roofArea / 25),
        unit: 'panel',
        notes: '3 ft wide x various lengths',
      });
      break;
  }

  // Ridge cap
  materials.push({
    category: 'Roofing',
    description: 'Ridge Cap Shingles',
    quantity: Math.ceil(length / 3),
    unit: 'bundle',
  });

  // Drip edge
  materials.push({
    category: 'Roofing',
    description: 'Drip Edge',
    quantity: Math.ceil((width + length) * 2 / 10),
    unit: 'piece',
    notes: '10 ft lengths',
  });

  // Nails
  materials.push({
    category: 'Roofing',
    description: 'Roofing Nails (1-1/4")',
    quantity: Math.ceil(squares * 2),
    unit: 'lb',
  });

  return materials;
}

function calculateRoofArea(config: ShedConfig): number {
  const { width, length, roofPitch, style } = config;
  const run = width / 2;
  const rise = (roofPitch / 12) * run;
  const slopeLength = Math.sqrt(run * run + rise * rise);
  
  switch (style) {
    case 'barn':
      // Gambrel has more complex calculation
      return slopeLength * length * 2.4; // Approximation with waste
    case 'lean-to':
      return slopeLength * length * 1.1;
    case 'saltbox':
      const shortSlope = slopeLength * 0.6;
      const longSlope = slopeLength * 1.4;
      return (shortSlope + longSlope) * length * 1.1;
    default: // gable, quaker
      return slopeLength * 2 * length * 1.1;
  }
}

function calculateSiding(config: ShedConfig): MaterialItem[] {
  const { width, length, wallHeight, sidingType } = config;
  const perimeterFeet = (width + length) * 2;
  const wallArea = perimeterFeet * wallHeight;
  
  // Subtract door and window areas (approximate)
  let openingArea = config.doorWidth * config.doorHeight;
  config.windows.forEach(window => {
    openingArea += window.width * window.height;
  });
  
  const netWallArea = wallArea - openingArea;
  const materials: MaterialItem[] = [];

  // House wrap
  materials.push({
    category: 'Siding',
    description: 'House Wrap',
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
      });
      break;
    case 'wood':
      materials.push({
        category: 'Siding',
        description: 'Wood Lap Siding',
        quantity: Math.ceil(netWallArea / 100),
        unit: 'square',
      });
      break;
    case 'metal':
      materials.push({
        category: 'Siding',
        description: 'Metal Siding Panels',
        quantity: Math.ceil(netWallArea / 25),
        unit: 'panel',
        notes: '3 ft wide panels',
      });
      break;
    case 't1-11':
      materials.push({
        category: 'Siding',
        description: 'T1-11 Siding Panels',
        quantity: Math.ceil(netWallArea / 32),
        unit: 'sheet',
        notes: '4x8 sheets',
      });
      break;
  }

  return materials;
}

function calculateDoors(config: ShedConfig): MaterialItem[] {
  const materials: MaterialItem[] = [];

  switch (config.doorType) {
    case 'single':
      materials.push({
        category: 'Doors',
        description: `${config.doorWidth}' x ${config.doorHeight}' Single Door`,
        quantity: 1,
        unit: 'each',
        notes: 'Pre-hung or custom built',
      });
      break;
    case 'double':
      materials.push({
        category: 'Doors',
        description: `${config.doorWidth}' x ${config.doorHeight}' Double Doors`,
        quantity: 1,
        unit: 'set',
        notes: 'Two doors, hinged on sides',
      });
      break;
    case 'sliding-barn':
      materials.push({
        category: 'Doors',
        description: `${config.doorWidth}' x ${config.doorHeight}' Sliding Barn Door`,
        quantity: 1,
        unit: 'each',
      });
      materials.push({
        category: 'Doors',
        description: 'Barn Door Hardware Kit',
        quantity: 1,
        unit: 'kit',
        notes: 'Track and rollers',
      });
      break;
  }

  // Door hardware
  materials.push(
    {
      category: 'Doors',
      description: 'Door Hinges (Heavy Duty)',
      quantity: config.doorType === 'double' ? 6 : 3,
      unit: 'piece',
    },
    {
      category: 'Doors',
      description: 'Door Handle/Latch',
      quantity: 1,
      unit: 'set',
    }
  );

  return materials;
}

function calculateWindows(config: ShedConfig): MaterialItem[] {
  const materials: MaterialItem[] = [];

  config.windows.forEach((window, index) => {
    materials.push({
      category: 'Windows',
      description: `${window.width}'x${window.height}' Shed Window`,
      quantity: 1,
      unit: 'each',
      notes: `Window #${index + 1} - ${window.position} wall`,
    });
  });

  if (config.hasShutters && config.windows.length > 0) {
    materials.push({
      category: 'Windows',
      description: 'Decorative Shutters',
      quantity: config.windows.length * 2,
      unit: 'piece',
      notes: 'One pair per window',
    });
  }

  return materials;
}

function calculateTrim(config: ShedConfig): MaterialItem[] {
  const { width, length, wallHeight } = config;
  const perimeterFeet = (width + length) * 2;

  // Corner trim - extends wall height + small overhang
  const cornerTrimLength = selectLumberLength(Math.ceil(wallHeight + 1));
  const materials: MaterialItem[] = [
    {
      category: 'Trim',
      description: `1x4 Corner Trim (${cornerTrimLength}')`,
      quantity: 4,
      unit: 'piece',
      notes: `${wallHeight + 1}' needed`,
      lumberLength: cornerTrimLength,
    },
  ];

  // Fascia boards
  const fasciaPieces = new Map<number, number>();
  addConsolidatedPieces(fasciaPieces, getLumberCombination(width), 2);
  addConsolidatedPieces(fasciaPieces, getLumberCombination(length), 2);

  Array.from(fasciaPieces.entries())
    .sort((a, b) => b[0] - a[0])
    .forEach(([len, qty]) => {
      materials.push({
        category: 'Trim',
        description: `1x6 Fascia Boards (${len}')`,
        quantity: qty,
        unit: 'piece',
        notes: 'Roof edge fascia',
        lumberLength: len,
      });
    });

  // Door/Window trim
  const doorWindowTrimLength = selectLumberLength(Math.ceil(Math.max(config.doorHeight + 1, 8)));
  materials.push({
    category: 'Trim',
    description: `1x4 Door/Window Trim (${doorWindowTrimLength}')`,
    quantity: Math.ceil((config.windows.length + 1) * 4),
    unit: 'piece',
    notes: 'Around openings',
    lumberLength: doorWindowTrimLength,
  });

  if (config.hasFlowerBox) {
    materials.push({
      category: 'Trim',
      description: 'Window Flower Box Kit',
      quantity: 1,
      unit: 'each',
      notes: 'Decorative accent',
    });
  }

  return materials;
}

function calculateHardware(config: ShedConfig): MaterialItem[] {
  return [
    {
      category: 'Hardware',
      description: '16d Common Nails',
      quantity: 5,
      unit: 'lb',
      notes: 'Framing',
    },
    {
      category: 'Hardware',
      description: '8d Box Nails',
      quantity: 3,
      unit: 'lb',
      notes: 'Sheathing and siding',
    },
    {
      category: 'Hardware',
      description: '3" Deck Screws',
      quantity: 1,
      unit: 'box',
      notes: '1 lb box',
    },
    {
      category: 'Hardware',
      description: 'Hurricane Ties',
      quantity: Math.ceil(config.length / 2),
      unit: 'piece',
      notes: 'Rafter connections',
    },
    {
      category: 'Hardware',
      description: 'Construction Adhesive',
      quantity: 3,
      unit: 'tube',
    },
  ];
}

function calculateElectrical(config: ShedConfig): MaterialItem[] {
  return [
    {
      category: 'Electrical',
      description: 'Exterior-Rated Wire (12/2)',
      quantity: 1,
      unit: 'roll',
      notes: '50 ft roll from main panel',
    },
    {
      category: 'Electrical',
      description: 'LED Ceiling Light Fixture',
      quantity: 1,
      unit: 'each',
    },
    {
      category: 'Electrical',
      description: 'Outdoor Outlet (GFCI)',
      quantity: 1,
      unit: 'each',
    },
    {
      category: 'Electrical',
      description: 'Light Switch',
      quantity: 1,
      unit: 'each',
    },
    {
      category: 'Electrical',
      description: 'Junction Box',
      quantity: 2,
      unit: 'each',
    },
  ];
}

function calculateAccessories(config: ShedConfig): MaterialItem[] {
  const materials: MaterialItem[] = [];

  if (config.hasShelvingPackage) {
    const shelfSupportLength = selectLumberLength(8);
    materials.push(
      {
        category: 'Accessories',
        description: `2x4 Shelf Supports (${shelfSupportLength}')`,
        quantity: 8,
        unit: 'piece',
        notes: 'Vertical supports',
        lumberLength: shelfSupportLength,
      },
      {
        category: 'Accessories',
        description: '3/4" Plywood Shelving',
        quantity: 2,
        unit: 'sheet',
        notes: '4x8 sheets',
      },
      {
        category: 'Accessories',
        description: 'Shelf Brackets',
        quantity: 16,
        unit: 'piece',
      }
    );
  }

  return materials;
}
