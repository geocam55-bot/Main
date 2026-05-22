import { DeckConfig, DeckMaterials, MaterialItem, DeckingMaterialType } from '../types/deck';
import {
  selectLumberLength,
  getLumberCombination,
  getLumberLengthDescription,
  getBoardsPerSpan,
  getDeckBoardSpan,
  getDeckBoardCoverageDimension,
} from './lumberLengths';

// Mapping of decking material types to search keywords for inventory lookup
const DECKING_TYPE_KEYWORDS: Record<DeckingMaterialType, string[]> = {
  'Spruce': ['spruce', 'deck board', 'decking'],
  'Treated': ['treated', 'pressure treated', 'deck board', 'decking'],
  'Cedar': ['cedar', 'deck board', 'decking'],
  'Composite': ['composite', 'deck board', 'decking', 'trex'],
};

/**
 * Calculate total deck area in square feet
 */
export function calculateDeckArea(config: DeckConfig): number {
  if (config.shape === 'rectangle') {
    return config.width * config.length;
  } else {
    // L-shape: main rectangle + extension
    const mainArea = config.width * config.length;
    const extensionArea = (config.lShapeWidth || 4) * (config.lShapeLength || 4);
    return mainArea + extensionArea;
  }
}

/**
 * Calculate railing linear footage
 * Covers complete perimeter excluding house side (back) and stair opening
 */
export function calculateRailingLength(config: DeckConfig): number {
  if (config.railingStyle === 'None') {
    return 0;
  }
  let totalLength = 0;
  
  if (config.shape === 'rectangle') {
    // Calculate perimeter excluding back (house side)
    totalLength += config.width;  // front
    totalLength += config.length; // right
    totalLength += config.length; // left
    
    // Subtract stairs if present (not on back/house side)
    if (config.hasStairs && config.stairSide !== 'back') {
      totalLength -= (config.stairWidth || 4);
    }
  } else if (config.shape === 'l-shape') {
    // L-shape: calculate complete outer perimeter excluding house side (back)
    const mainWidth = config.width;
    const mainLength = config.length;
    const lWidth = config.lShapeWidth || 4;
    const lLength = config.lShapeLength || 4;
    const lPos = config.lShapePosition || 'top-left';
    
    // Calculate outer perimeter segments based on L-shape position
    // The "back" edge (house side, z = -mainLength/2 in 3D) is always excluded
    // Interior edges where L meets main rectangle are also excluded
    
    switch (lPos) {
      case 'top-right':
        totalLength = 2 * mainLength + mainWidth + lWidth;
        break;
        
      case 'bottom-right':
        totalLength = 2 * mainLength + mainWidth + lWidth;
        break;
        
      case 'bottom-left':
        totalLength = 2 * mainLength + mainWidth + lWidth;
        break;
        
      case 'top-left':
      default:
        totalLength = 2 * mainLength + mainWidth + lWidth;
        break;
    }
    
    // Subtract stairs if present (stairs can be on any outer edge)
    if (config.hasStairs) {
      totalLength -= (config.stairWidth || 4);
    }
  }
  
  return totalLength;
}

const ALUMINUM_RAIL_LENGTHS_FT = [6, 8, 10, 12] as const;
const STAIR_PICKET_LENGTHS_FT = [3, 6] as const;
const TEMPERED_GLASS_PANEL_SIZES_IN = [6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66] as const;

function formatFeetLabel(lengthFt: number): string {
  return Number.isInteger(lengthFt) ? `${lengthFt}` : `${lengthFt.toFixed(1)}`;
}

function getRailPackageCounts(
  totalLengthFt: number,
  optionsFt: readonly number[] = ALUMINUM_RAIL_LENGTHS_FT
): Map<number, number> {
  const result = new Map<number, number>();
  if (totalLengthFt <= 0) return result;

  const lengthsIn = [...optionsFt].sort((a, b) => a - b).map((ft) => Math.round(ft * 12));
  const targetIn = Math.max(1, Math.round(totalLengthFt * 12));
  const maxLenIn = lengthsIn[lengthsIn.length - 1];
  const maxIn = targetIn + maxLenIn;

  const inf = Number.POSITIVE_INFINITY;
  const minPieces = new Array<number>(maxIn + 1).fill(inf);
  const prev = new Array<number>(maxIn + 1).fill(-1);
  const used = new Array<number>(maxIn + 1).fill(-1);
  minPieces[0] = 0;

  for (let i = 0; i <= maxIn; i++) {
    if (!Number.isFinite(minPieces[i])) continue;
    for (const len of lengthsIn) {
      const next = i + len;
      if (next > maxIn) continue;
      const candidate = minPieces[i] + 1;
      if (candidate < minPieces[next]) {
        minPieces[next] = candidate;
        prev[next] = i;
        used[next] = len;
      }
    }
  }

  let best = -1;
  for (let total = targetIn; total <= maxIn; total++) {
    if (!Number.isFinite(minPieces[total])) continue;
    if (best === -1) {
      best = total;
      continue;
    }
    const overage = total - targetIn;
    const bestOverage = best - targetIn;
    if (overage < bestOverage || (overage === bestOverage && minPieces[total] < minPieces[best])) {
      best = total;
    }
  }

  if (best === -1) return result;

  let cursor = best;
  while (cursor > 0 && prev[cursor] >= 0 && used[cursor] > 0) {
    const ft = used[cursor] / 12;
    result.set(ft, (result.get(ft) || 0) + 1);
    cursor = prev[cursor];
  }

  return result;
}

function getTemperedGlassPanelSizeForOpening(openingLengthFt: number): number {
  const targetPanelWidthIn = Math.max(6, Math.round(openingLengthFt * 12) - 6);
  let best = TEMPERED_GLASS_PANEL_SIZES_IN[0];

  for (const size of TEMPERED_GLASS_PANEL_SIZES_IN) {
    if (size <= targetPanelWidthIn) {
      best = size;
    } else {
      break;
    }
  }

  return best;
}

function getTemperedGlassPanelCounts(totalLengthFt: number): Map<number, number> {
  const counts = new Map<number, number>();
  let remaining = totalLengthFt;

  while (remaining > 0.01) {
    const opening = Math.min(remaining, 6);
    const panelSize = getTemperedGlassPanelSizeForOpening(opening);
    counts.set(panelSize, (counts.get(panelSize) || 0) + 1);
    remaining -= opening;
  }

  return counts;
}

// ---------------------------------------------------------------------------
// Helper: consolidate lumber pieces by length into a Map<length, totalCount>
// ---------------------------------------------------------------------------
function consolidatePieces(
  combo: { length: number; count: number }[],
  multiplier: number
): Map<number, number> {
  const pieces = new Map<number, number>();
  combo.forEach(({ length, count }) => {
    pieces.set(length, (pieces.get(length) || 0) + count * multiplier);
  });
  return pieces;
}

function addConsolidatedPieces(
  target: Map<number, number>,
  combo: { length: number; count: number }[],
  multiplier: number
): void {
  combo.forEach(({ length, count }) => {
    target.set(length, (target.get(length) || 0) + count * multiplier);
  });
}

/**
 * Main materials calculation function
 * 
 * Lumber lengths are automatically selected based on the deck dimensions.
 * Standard lengths: 8', 10', 12', 14', 16'.
 * Spans exceeding 16' are covered by combining boards (e.g., 24' = 16' + 8').
 */
export function calculateMaterials(config: DeckConfig): DeckMaterials {
  const deckArea = calculateDeckArea(config);
  const railingLength = calculateRailingLength(config);
  
  // FRAMING
  const framing: MaterialItem[] = [];
  
  // ---- Ledger Board ----
  // Spans the deck width, attaches to house
  const ledgerCombo = getLumberCombination(config.width);
  ledgerCombo.forEach(({ length, count }) => {
    framing.push({
      category: 'Framing',
      description: `Pressure Treated Ledger Board (${length}')`,
      quantity: count,
      unit: 'pcs',
      notes: ledgerCombo.length > 1
        ? `Attaches deck to house (${getLumberLengthDescription(config.width)} total span)`
        : 'Attaches deck to house structure',
      lumberLength: length,
    });
  });
  
  // ---- Joists ----
  // Joists span from ledger to beam (the deck's depth / length dimension)
  const joistSpacingFeet = config.joistSpacing / 12;
  const numberOfJoists = Math.ceil(config.width / joistSpacingFeet) + 1;
  const joistSpan = config.length;
  const joistCombo = getLumberCombination(joistSpan);

  joistCombo.forEach(({ length, count }) => {
    framing.push({
      category: 'Framing',
      description: `Pressure Treated Joists (${length}')`,
      quantity: numberOfJoists * count,
      unit: 'pcs',
      notes: joistCombo.length > 1
        ? `Spaced ${config.joistSpacing}\" O.C. (${getLumberLengthDescription(joistSpan)} per joist)`
        : `Spaced ${config.joistSpacing}\" on center`,
      lumberLength: length,
    });
  });
  
  // ---- Rim Joists / Band Boards ----
  // Front & back span the width; left & right span the length
  const rimPieces = new Map<number, number>();
  addConsolidatedPieces(rimPieces, getLumberCombination(config.width), 2);   // front + back
  addConsolidatedPieces(rimPieces, getLumberCombination(config.length), 2);  // left + right

  Array.from(rimPieces.entries())
    .sort((a, b) => b[0] - a[0])
    .forEach(([length, quantity]) => {
      framing.push({
        category: 'Framing',
        description: `Pressure Treated Rim Joists (${length}')`,
        quantity,
        unit: 'pcs',
        notes: 'Perimeter band boards',
        lumberLength: length,
      });
    });
  
  // ---- Beams ----
  // Beams run parallel to house (span the width), placed every 8' along the length
  const beamCount = Math.ceil(config.length / 8);
  const beamCombo = getLumberCombination(config.width);

  beamCombo.forEach(({ length, count }) => {
    framing.push({
      category: 'Framing',
      description: `Pressure Treated Beams (${length}')`,
      quantity: beamCount * count,
      unit: 'pcs',
      notes: beamCombo.length > 1
        ? `Main support beams (${getLumberLengthDescription(config.width)} per beam)`
        : 'Main support beams',
      lumberLength: length,
    });
  });
  
  // ---- Posts ----
  // Post height = deck height + 1' (buried portion / connection)
  const postCount = beamCount * Math.ceil(config.width / 8);
  const postHeight = Math.ceil(config.height + 1);
  const postLumberLength = selectLumberLength(postHeight);
  const ptSize = config.postSize || '4x4';

  framing.push({
    category: 'Framing',
    description: `${ptSize} Pressure Treated Posts (${postLumberLength}')`,
    quantity: postCount,
    unit: 'pcs',
    notes: 'Support posts with concrete footings',
    lumberLength: postLumberLength,
  });
  
  // DECKING
  const decking: MaterialItem[] = [];
  
  const deckingMaterialType = config.deckingType || 'Treated';

  // Determine deck board span based on pattern/orientation
  const deckBoardSpan = getDeckBoardSpan(config.width, config.length, config.deckingPattern);
  const deckBoardCombo = getLumberCombination(deckBoardSpan);

  // Number of rows = coverage dimension / board width (5.5")
  const coverageDimension = getDeckBoardCoverageDimension(
    config.width,
    config.length,
    config.deckingPattern
  );
  const numberOfRows = Math.ceil((coverageDimension * 12) / 5.5);
  // Add 10% waste factor
  const rowsWithWaste = Math.ceil(numberOfRows * 1.1);

  // For L-shape, add extra rows for the extension area
  let extraRows = 0;
  if (config.shape === 'l-shape') {
    const extW = config.lShapeWidth || 4;
    const extL = config.lShapeLength || 4;
    const extCoverage = getDeckBoardCoverageDimension(extW, extL, config.deckingPattern);
    extraRows = Math.ceil((extCoverage * 12) / 5.5 * 1.1);
  }
  const totalRows = rowsWithWaste + extraRows;

  deckBoardCombo.forEach(({ length, count }) => {
    decking.push({
      category: 'Decking',
      description: `5/4 x 6 ${deckingMaterialType} Deck Boards (${length}')`,
      quantity: totalRows * count,
      unit: 'pcs',
      notes: deckBoardCombo.length > 1
        ? `${getLumberLengthDescription(deckBoardSpan)} per run, covers ${deckArea.toFixed(0)} sq ft`
        : `Covers ${deckArea.toFixed(0)} sq ft (with 10% waste)`,
      lumberLength: length,
    });
  });
  
  // RAILING
  const railing: MaterialItem[] = [];
  
  // Calculate stair railing length if enabled
  let stairRailingLength = 0;
  if (config.railingStyle !== 'None' && config.hasStairs && config.stairRailing !== false) {
    const stairHeight = config.height;
    const numberOfSteps = Math.ceil(stairHeight / 0.58);
    const totalRun = numberOfSteps * (11/12); // 11 inches run
    const slopeLength = Math.sqrt(Math.pow(stairHeight, 2) + Math.pow(totalRun, 2));
    stairRailingLength = slopeLength * 2; // Both sides
  }
  const aluminumColor = config.aluminumRailingColor || 'White';
  const aluminumInfill = config.aluminumInfillType || 'Pickets';
  
  if (config.railingStyle === 'Aluminum') {
    // ALUMINUM RAILING SYSTEM (Regal-style component groups)
    const picketProfile = 'Narrow/Wide';
    const deckRailPackages = getRailPackageCounts(railingLength, ALUMINUM_RAIL_LENGTHS_FT);
    const stairRailPackages = getRailPackageCounts(stairRailingLength, ALUMINUM_RAIL_LENGTHS_FT);
    const allRailPackages = new Map<number, number>();

    Array.from(deckRailPackages.entries()).forEach(([length, qty]) => {
      allRailPackages.set(length, (allRailPackages.get(length) || 0) + qty);
    });
    Array.from(stairRailPackages.entries()).forEach(([length, qty]) => {
      allRailPackages.set(length, (allRailPackages.get(length) || 0) + qty);
    });

    let deckRailSectionCount = 0;
    let stairRailSectionCount = 0;
    let totalGlassPanels = 0;

    Array.from(deckRailPackages.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([length, qty]) => {
        deckRailSectionCount += qty;
        railing.push({
          category: 'Railing',
          description: `${aluminumColor} Aluminum Top & Bottom Rail (${formatFeetLabel(length)} ft set)`,
          quantity: qty,
          unit: 'sets',
          notes: `Cut-to-fit rail pair; nominal part family TBR${Math.round(length)}`,
        });
      });
    
    // Deck Railing
    if (deckRailSectionCount > 0) {
      if (aluminumInfill === 'Glass') {
        const deckGlassPanels = getTemperedGlassPanelCounts(railingLength);
        totalGlassPanels += Array.from(deckGlassPanels.values()).reduce((sum, qty) => sum + qty, 0);

        Array.from(deckGlassPanels.entries())
          .sort((a, b) => a[0] - b[0])
          .forEach(([size, qty]) => {
            railing.push({
              category: 'Railing',
              description: `Tempered Glass Panel (${size}")`,
              quantity: qty,
              unit: 'pcs',
              notes: `${aluminumColor} frame panel size from Regal worksheet range`,
            });
          });

        railing.push({
          category: 'Railing',
          description: 'Clear Glass Pickets (CDG-6)',
          quantity: deckRailSectionCount,
          unit: 'packs',
          notes: 'Worksheet glass picket component for glass railing system',
        });
      } else {
        railing.push({
          category: 'Railing',
          description: `${aluminumColor} ${picketProfile} Picket Packages`,
          quantity: deckRailSectionCount,
          unit: 'packs',
          notes: 'One pack per straight rail opening (field-cut rail system)',
        });
      }
      
      // Estimated posts for planning use (line + corner/end/stair mix to be finalized onsite)
      const railingPostCount = Math.max(2, Math.ceil(railingLength / 6) + 1);
      
      railing.push({
        category: 'Railing',
        description: `${aluminumColor} Aluminum Posts (Corner/Line/End/Stair mix)`,
        quantity: railingPostCount,
        unit: 'pcs',
        notes: 'Planner estimate; final post type split is layout dependent',
      });
    }
    
    // Stair Railing
    if (stairRailingLength > 0) {
      stairRailSectionCount = Array.from(stairRailPackages.values()).reduce((sum, qty) => sum + qty, 0);

      if (aluminumInfill === 'Glass') {
        railing.push({
          category: 'Railing',
          description: 'Angled Stair Glass Pickets (CAG-6)',
          quantity: stairRailSectionCount,
          unit: 'packs',
          notes: 'Worksheet angled stair glass picket component',
        });
      } else {
        const stairPicketPackages = getRailPackageCounts(stairRailingLength, STAIR_PICKET_LENGTHS_FT);
        Array.from(stairPicketPackages.entries())
          .sort((a, b) => a[0] - b[0])
          .forEach(([length, qty]) => {
            railing.push({
              category: 'Railing',
              description: `${aluminumColor} Stair ${picketProfile} Picket Package (${formatFeetLabel(length)} ft)`,
              quantity: qty,
              unit: 'packs',
              notes: 'Stair picket package family (SPS6/WPS3 equivalents)',
            });
          });
      }

      railing.push({
        category: 'Railing',
        description: `${aluminumColor} Aluminum Stair Posts`,
        quantity: 2,
        unit: 'pcs',
        notes: 'Bottom stair posts; top is typically shared with deck post',
      });
    }

  } else {
    // TREATED WOOD RAILING (Default)
    const totalRailLength = railingLength + stairRailingLength;
    
    if (totalRailLength > 0) {
      // Top and bottom rails - use standard lumber lengths
      const railLumberLength = selectLumberLength(Math.min(totalRailLength, 8)); // Rails typically max 8' sections
      const railSections = Math.ceil(totalRailLength / railLumberLength);
      
      railing.push({
        category: 'Railing',
        description: `2x4 Top Rail (${railLumberLength}')`,
        quantity: railSections,
        unit: 'pcs',
        notes: `${totalRailLength.toFixed(0)} linear feet total`,
        lumberLength: railLumberLength,
      });
      
      railing.push({
        category: 'Railing',
        description: `2x4 Bottom Rail (${railLumberLength}')`,
        quantity: railSections,
        unit: 'pcs',
        lumberLength: railLumberLength,
      });
      
      // Balusters - 4" spacing typically
      const balusterCount = Math.ceil(totalRailLength * 3); // Approx 3 per foot
      
      railing.push({
        category: 'Railing',
        description: '2x2 Balusters (42")',
        quantity: balusterCount,
        unit: 'pcs',
        notes: 'Spaced approximately 4" apart',
      });
      
      // Railing posts
      const deckPostCount = railingLength > 0 ? Math.ceil(railingLength / 6) : 0;
      const stairPostCount = stairRailingLength > 0 ? 2 : 0;
      
      railing.push({
        category: 'Railing',
        description: '4x4 Railing Posts (42")',
        quantity: deckPostCount + stairPostCount,
        unit: 'pcs',
        notes: 'Spaced 6\' on center maximum',
      });
    }
  }
  
  // STAIRS
  if (config.hasStairs) {
    const stairHeight = config.height;
    const numberOfSteps = Math.ceil(stairHeight / 0.58); // 7" risers
    const stringerRawLength = Math.ceil(stairHeight + 4);
    const stringerLumberLength = selectLumberLength(stringerRawLength);
    
    framing.push({
      category: 'Stairs',
      description: `Stair Stringers (${stringerLumberLength}')`,
      quantity: 3,
      unit: 'pcs',
      notes: `${numberOfSteps} steps with 7" rise, 11" run`,
      lumberLength: stringerLumberLength,
    });
    
    decking.push({
      category: 'Stairs',
      description: 'Stair Treads',
      quantity: numberOfSteps * 2,
      unit: 'pcs',
      notes: 'Two boards per tread',
    });
  }
  
  // HARDWARE
  const hardware: MaterialItem[] = [];
  
  // Ledger Board Hardware
  // Lag screws every 16" on center for ledger board attachment
  const lagScrewCount = Math.ceil((config.width * 12) / 16); // Convert width to inches, divide by 16" spacing
  
  hardware.push({
    category: 'Hardware',
    description: '1/2" x 4" Lag Screws with Washers',
    quantity: lagScrewCount,
    unit: 'pcs',
    notes: 'For ledger board attachment to house framing (16" O.C.)',
  });
  
  // Ledger flashing - matches ledger board width
  hardware.push({
    category: 'Hardware',
    description: `Ledger Flashing Tape (${config.width}')`,
    quantity: config.width,
    unit: 'ft',
    notes: 'Self-adhesive waterproof membrane for ledger board',
  });
  
  hardware.push({
    category: 'Hardware',
    description: 'Joist Hangers',
    quantity: numberOfJoists * 2,
    unit: 'pcs',
    notes: 'For joist-to-rim connection',
  });
  
  // Composite decking requires special hardware
  if (deckingMaterialType === 'Composite') {
    // Deck clips - 1 per square foot
    hardware.push({
      category: 'Hardware',
      description: 'Composite Deck Clips',
      quantity: Math.ceil(deckArea),
      unit: 'pcs',
      notes: 'Hidden fastening system - 1 per sq ft',
    });
    
    // Composite screws - 1 per square foot
    hardware.push({
      category: 'Hardware',
      description: 'Composite Deck Screws',
      quantity: Math.ceil(deckArea),
      unit: 'pcs',
      notes: 'Color-matched screws - 1 per sq ft',
    });
    
    // Composite plugs - 1 per square foot
    hardware.push({
      category: 'Hardware',
      description: 'Composite Deck Plugs',
      quantity: Math.ceil(deckArea),
      unit: 'pcs',
      notes: 'Color-matched plugs - 1 per sq ft',
    });
  } else {
    // Standard deck screws for non-composite decking
    hardware.push({
      category: 'Hardware',
      description: 'Deck Screws (3")',
      quantity: Math.ceil(deckArea / 10),
      unit: 'lbs',
      notes: 'For decking installation',
    });
  }
  
  hardware.push({
    category: 'Hardware',
    description: 'Structural Screws (5")',
    quantity: 5,
    unit: 'lbs',
    notes: 'For framing connections',
  });
  
  const ptSizeForHardware = config.postSize || '4x4';
  const tubeSize = config.formtubeSize || '8"';
  
  // Calculate bags based on Formtube size (4' depth)
  let concreteBagsPerFooting = 3;
  if (tubeSize === '10"') concreteBagsPerFooting = 4;
  else if (tubeSize === '12"') concreteBagsPerFooting = 6;
  else if (tubeSize === '14"') concreteBagsPerFooting = 7;
  else if (tubeSize === '16"') concreteBagsPerFooting = 9;

  hardware.push({
    category: 'Hardware',
    description: `${ptSizeForHardware} Post Anchors`,
    quantity: postCount,
    unit: 'pcs',
    notes: 'Concrete footing anchors',
  });

  // Adding Formtubes as requested
  hardware.push({
    category: 'Hardware',
    description: `${tubeSize} × 4' Formtube`,
    quantity: postCount,
    unit: 'pcs',
    notes: `Formtube cardboard casing for pouring 4' deep concrete footings`,
  });

  hardware.push({
    category: 'Hardware',
    description: 'Concrete Mix (80lb)',
    quantity: postCount * concreteBagsPerFooting,
    unit: 'bags',
    notes: `For pouring concrete footings (4' deep, using ${tubeSize} Formtubes with ~${concreteBagsPerFooting} bags per footing)`,
  });
  
  if (config.railingStyle === 'Aluminum') {
    const deckRailPackages = getRailPackageCounts(railingLength, ALUMINUM_RAIL_LENGTHS_FT);
    const stairRailPackages = getRailPackageCounts(stairRailingLength, ALUMINUM_RAIL_LENGTHS_FT);
    const deckRailSections = Array.from(deckRailPackages.values()).reduce((sum, qty) => sum + qty, 0);
    const stairRailSections = Array.from(stairRailPackages.values()).reduce((sum, qty) => sum + qty, 0);
    const totalRailSections = deckRailSections + stairRailSections;

    // Deck Railing Hardware
    if (railingLength > 0) {
      const railingPostCount = Math.max(2, Math.ceil(railingLength / 6) + 1);

      hardware.push({
        category: 'Hardware',
        description: `${aluminumColor} Post Base Plate Cover`,
        quantity: railingPostCount,
        unit: 'pcs',
        notes: 'Covers exposed lag bolts and gives finished look',
      });

      hardware.push({
        category: 'Hardware',
        description: `${aluminumColor} Decorative Post Cap`,
        quantity: railingPostCount,
        unit: 'pcs',
        notes: 'Decorative post finish',
      });
      
      hardware.push({
        category: 'Hardware',
        description: 'Universal Angle Bracket (UAB)',
        quantity: deckRailSections * 4,
        unit: 'pcs',
        notes: 'Connects rail ends to posts (horizontal or custom angle)',
      });

      if (aluminumInfill === 'Glass') {
        hardware.push({
          category: 'Hardware',
          description: 'Vinyl Insert for Glass (GVI)',
          quantity: deckRailSections * 2,
          unit: 'pcs',
          notes: 'Glass panel retention channel inserts',
        });

        hardware.push({
          category: 'Hardware',
          description: 'Rubber Blocks for Glass (GRB-10)',
          quantity: Math.max(1, Math.ceil(deckRailSections / 10)),
          unit: 'packs',
          notes: 'One pack contains blocks for up to 10 glass panels',
        });
      }

      hardware.push({
        category: 'Hardware',
        description: 'Lag Bolts (post mounting)',
        quantity: Math.max(1, Math.ceil((railingPostCount * 4) / 6)),
        unit: 'packs',
        notes: 'Approx one pack per 6 posts (4 lag bolts each)',
      });

      hardware.push({
        category: 'Hardware',
        description: 'Self Drilling Screws',
        quantity: Math.max(1, Math.ceil(deckRailSections / 5)),
        unit: 'packs',
        notes: 'Approx one pack per 4-5 rail sections',
      });
    }

    // Stair Railing Hardware
    if (stairRailingLength > 0) {
      hardware.push({
        category: 'Hardware',
        description: `${aluminumColor} Post Base Plate Cover`,
        quantity: 2,
        unit: 'pcs',
        notes: 'For stair bottom posts',
      });

      hardware.push({
        category: 'Hardware',
        description: `${aluminumColor} Decorative Post Cap`,
        quantity: 2,
        unit: 'pcs',
        notes: 'For stair bottom posts',
      });

      hardware.push({
        category: 'Hardware',
        description: 'Universal Angle Bracket (UAB)',
        quantity: stairRailSections * 4,
        unit: 'pcs',
        notes: 'Angled connectors for stairs',
      });

      if (aluminumInfill === 'Glass') {
        hardware.push({
          category: 'Hardware',
          description: 'Vinyl Insert for Glass (GVI)',
          quantity: stairRailSections * 2,
          unit: 'pcs',
          notes: 'Glass panel retention channel inserts for stair sections',
        });

        hardware.push({
          category: 'Hardware',
          description: 'Rubber Blocks for Glass (GRB-10)',
          quantity: Math.max(1, Math.ceil(stairRailSections / 10)),
          unit: 'packs',
          notes: 'One pack contains blocks for up to 10 glass panels',
        });
      }

      hardware.push({
        category: 'Hardware',
        description: 'Lag Bolts (post mounting)',
        quantity: Math.max(1, Math.ceil((2 * 4) / 6)),
        unit: 'packs',
        notes: 'Approx one pack per 6 posts (4 lag bolts each)',
      });

      hardware.push({
        category: 'Hardware',
        description: 'Self Drilling Screws',
        quantity: Math.max(1, Math.ceil(stairRailSections / 5)),
        unit: 'packs',
        notes: 'Approx one pack per 4-5 rail sections',
      });
    }

    if (totalRailSections > 0) {
      hardware.push({
        category: 'Hardware',
        description: 'Rail Support Legs (SRSL)',
        quantity: Math.max(1, Math.ceil(totalRailSections / 2)),
        unit: 'pcs',
        notes: 'Support legs for longer rail runs where required',
      });
    }
  } else if (config.railingStyle !== 'None') {
    // Wood Railing Hardware
    const totalRailLength = railingLength + stairRailingLength;
    if (totalRailLength > 0) {
      hardware.push({
        category: 'Hardware',
        description: 'Railing Brackets',
        quantity: Math.ceil(totalRailLength / 6) * 4,
        unit: 'pcs',
        notes: 'Post mounting hardware',
      });
    }
  }
  
  return {
    framing,
    decking,
    railing,
    hardware,
  };
}

/**
 * Calculate total material count for quick summary
 */
export function getMaterialsSummary(materials: DeckMaterials): {
  totalItems: number;
  categories: string[];
} {
  const allItems = [
    ...materials.framing,
    ...materials.decking,
    ...materials.railing,
    ...materials.hardware,
  ];
  
  const categories = Array.from(new Set(allItems.map(item => item.category)));
  
  return {
    totalItems: allItems.length,
    categories,
  };
}