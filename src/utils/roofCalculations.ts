import type { RoofConfig, RoofMaterials, MaterialItem } from '../types/roof';

/**
 * Calculate roof pitch multiplier based on pitch ratio
 * This converts flat roof area to sloped roof area
 */
function getPitchMultiplier(pitch: string): number {
  const pitchMap: Record<string, number> = {
    '2/12': 1.014,
    '3/12': 1.031,
    '4/12': 1.054,
    '5/12': 1.083,
    '6/12': 1.118,
    '7/12': 1.158,
    '8/12': 1.202,
    '9/12': 1.250,
    '10/12': 1.302,
    '12/12': 1.414,
  };
  return pitchMap[pitch] || 1.118; // Default to 6/12 if not found
}

/**
 * Calculate the actual roof surface area based on building dimensions and style
 */
function calculateRoofArea(config: RoofConfig): number {
  const { length, width, style, pitch, eaveOverhang, rakeOverhang } = config;
  
  // Add overhangs to dimensions
  const totalLength = length + (2 * rakeOverhang);
  const totalWidth = width + (2 * eaveOverhang);
  
  // Get pitch multiplier
  const multiplier = getPitchMultiplier(pitch);
  
  let roofArea = 0;
  
  switch (style) {
    case 'gable':
      // Two rectangular slopes
      roofArea = totalLength * (totalWidth / 2) * multiplier * 2;
      break;
      
    case 'hip':
      // Four triangular/trapezoidal slopes - slightly more complex
      // Hip roofs have approximately 10% more surface area than gable
      roofArea = totalLength * totalWidth * multiplier * 1.1;
      break;
      
    case 'gambrel':
      // Barn-style roof with two slopes on each side
      // Upper slope is steeper, lower slope is flatter
      // Approximate as 1.15x a standard gable
      roofArea = totalLength * (totalWidth / 2) * multiplier * 2 * 1.15;
      break;
      
    case 'shed':
      // Single slope
      roofArea = totalLength * totalWidth * multiplier;
      break;
      
    case 'mansard':
      // Four-sided gambrel-style roof
      // Complex calculation - approximate as 1.3x gable
      roofArea = totalLength * (totalWidth / 2) * multiplier * 2 * 1.3;
      break;
      
    case 'flat':
      // Minimal slope for drainage
      roofArea = totalLength * totalWidth * 1.02; // 2% slope
      break;
      
    case 'l-shaped': {
      // L-shaped roof: divide into two rectangles (main section + wing)
      const mainArea = totalLength * (totalWidth / 2) * multiplier * 2;
      
      if (config.lShapeConfig) {
        const wing = config.lShapeConfig;
        const wingTotalLength = wing.wingLength + (2 * rakeOverhang);
        const wingTotalWidth = wing.wingWidth + (2 * eaveOverhang);
        
        let wingArea = 0;
        if (wing.wingRoofStyle === 'hip') {
          wingArea = wingTotalLength * wingTotalWidth * multiplier * 1.1;
        } else {
          wingArea = wingTotalLength * (wingTotalWidth / 2) * multiplier * 2;
        }
        
        roofArea = mainArea + wingArea;
      } else {
        roofArea = mainArea;
      }
      break;
    }

    case 't-shaped': {
      const mainArea = totalLength * (totalWidth / 2) * multiplier * 2;
      
      if (config.tShapeConfig) {
        const wing = config.tShapeConfig;
        const wingTotalLength = wing.wingLength + (2 * rakeOverhang);
        const wingTotalWidth = wing.wingWidth + (2 * eaveOverhang);
        
        let wingArea = 0;
        if (wing.wingRoofStyle === 'hip') {
          wingArea = wingTotalLength * wingTotalWidth * multiplier * 1.1;
        } else {
          wingArea = wingTotalLength * (wingTotalWidth / 2) * multiplier * 2;
        }
        
        roofArea = mainArea + wingArea;
      } else {
        roofArea = mainArea;
      }
      break;
    }

    case 'u-shaped': {
      const mainArea = totalLength * (totalWidth / 2) * multiplier * 2;
      
      if (config.uShapeConfig) {
        const wing = config.uShapeConfig;
        const wingTotalLength = wing.wingLength + (2 * rakeOverhang);
        const wingTotalWidth = wing.wingWidth + (2 * eaveOverhang);
        
        let singleWingArea = 0;
        if (wing.wingRoofStyle === 'hip') {
          singleWingArea = wingTotalLength * wingTotalWidth * multiplier * 1.1;
        } else {
          singleWingArea = wingTotalLength * (wingTotalWidth / 2) * multiplier * 2;
        }
        
        roofArea = mainArea + singleWingArea * 2;
      } else {
        roofArea = mainArea;
      }
      break;
    }
      
    default:
      roofArea = totalLength * totalWidth * multiplier;
  }
  
  // Add dormer roof area
  if (config.hasDormers && config.dormers && config.dormers.length > 0) {
    for (const dormer of config.dormers) {
      roofArea += dormer.width * dormer.depth * multiplier;
    }
  }
  
  return roofArea;
}

/**
 * Calculate materials needed for the roof
 */
export function calculateMaterials(config: RoofConfig): RoofMaterials {
  const roofArea = calculateRoofArea(config);
  const roofSquares = roofArea / 100; // 1 square = 100 sq ft
  const { length, width, style, shingleType, underlaymentType, wasteFactor } = config;
  
  // Add waste factor
  const totalSquares = roofSquares * (1 + wasteFactor);
  
  // Calculate perimeter for drip edge and starter shingles
  const totalLength = length + (2 * config.rakeOverhang);
  const totalWidth = width + (2 * config.eaveOverhang);
  let perimeter = (totalLength + totalWidth) * 2;
  
  // For L-shaped roofs, calculate combined perimeter of both sections
  if (style === 'l-shaped' && config.lShapeConfig) {
    const wing = config.lShapeConfig;
    const wingTL = wing.wingLength + (2 * config.rakeOverhang);
    const wingTW = wing.wingWidth + (2 * config.eaveOverhang);
    // L-shape perimeter: main perimeter + wing perimeter - 2 × shared edge
    // Shared edge is approximately the wing width
    perimeter = (totalLength + totalWidth) * 2 + (wingTL + wingTW) * 2 - 2 * wingTW;
  }
  
  // Calculate ridge length based on style
  let ridgeLength = 0;
  let hipLength = 0;
  
  switch (style) {
    case 'gable':
      ridgeLength = totalLength;
      break;
    case 'hip':
      ridgeLength = totalLength;
      hipLength = totalWidth * getPitchMultiplier(config.pitch) * 2; // Approximate hip length
      break;
    case 'gambrel':
      ridgeLength = totalLength * 1.5; // Multiple ridges
      break;
    case 'shed':
      ridgeLength = 0; // No ridge
      break;
    case 'mansard':
      ridgeLength = (totalLength + totalWidth) * 2;
      break;
    case 'flat':
      ridgeLength = 0;
      break;
    case 'l-shaped': {
      ridgeLength = totalLength;
      if (config.lShapeConfig) {
        const wingTL = config.lShapeConfig.wingLength + (2 * config.rakeOverhang);
        ridgeLength += wingTL;
        hipLength = width * getPitchMultiplier(config.pitch) * 2;
      }
      break;
    }
    case 't-shaped': {
      ridgeLength = totalLength;
      if (config.tShapeConfig) {
        const wingTL = config.tShapeConfig.wingLength + (2 * config.rakeOverhang);
        ridgeLength += wingTL;
        hipLength = width * getPitchMultiplier(config.pitch) * 2;
      }
      break;
    }
    case 'u-shaped': {
      ridgeLength = totalLength;
      if (config.uShapeConfig) {
        const wingTL = config.uShapeConfig.wingLength + (2 * config.rakeOverhang);
        ridgeLength += wingTL * 2;
        hipLength = width * getPitchMultiplier(config.pitch) * 4;
      }
      break;
    }
  }

  // T-shaped and U-shaped perimeter adjustments
  if (style === 't-shaped' && config.tShapeConfig) {
    const wing = config.tShapeConfig;
    const wingTL = wing.wingLength + (2 * config.rakeOverhang);
    const wingTW = wing.wingWidth + (2 * config.eaveOverhang);
    perimeter = (totalLength + totalWidth) * 2 + (wingTL + wingTW) * 2 - 2 * wingTW;
  }
  if (style === 'u-shaped' && config.uShapeConfig) {
    const wing = config.uShapeConfig;
    const wingTL = wing.wingLength + (2 * config.rakeOverhang);
    const wingTW = wing.wingWidth + (2 * config.eaveOverhang);
    perimeter = (totalLength + totalWidth) * 2 + ((wingTL + wingTW) * 2 - 2 * wingTW) * 2;
  }
  
  const totalRidgeAndHipLength = ridgeLength + hipLength;
  
  // 1. ROOF DECK MATERIALS
  const roofDeck: MaterialItem[] = [];
  
  // OSB or plywood sheathing (sheets are 4x8 = 32 sq ft)
  const sheathingSheets = Math.ceil((roofArea * 1.1) / 32); // 10% waste for cuts
  roofDeck.push({
    category: 'Roof Deck',
    description: '7/16" OSB Roof Sheathing (4\'x8\' sheets)',
    quantity: sheathingSheets,
    unit: 'sheets',
    notes: 'Covers entire roof surface with 10% waste factor',
  });
  
  // Nails for sheathing
  const sheathingNailBoxes = Math.ceil(sheathingSheets / 50); // ~50 sheets per box of nails
  roofDeck.push({
    category: 'Roof Deck',
    description: '8d Ring Shank Nails for Sheathing (5 lb box)',
    quantity: sheathingNailBoxes,
    unit: 'boxes',
    notes: 'For fastening OSB to rafters',
  });
  
  // 2. UNDERLAYMENT
  const underlayment: MaterialItem[] = [];
  
  // Felt or synthetic underlayment (rolls cover ~400 sq ft)
  const underlaymentRolls = Math.ceil((roofArea * 1.15) / 400); // 15% overlap
  
  let underlaymentDesc = '';
  switch (underlaymentType) {
    case 'felt-15':
      underlaymentDesc = '#15 Felt Underlayment (400 sq ft roll)';
      break;
    case 'felt-30':
      underlaymentDesc = '#30 Felt Underlayment (400 sq ft roll)';
      break;
    case 'synthetic':
      underlaymentDesc = 'Synthetic Underlayment (1000 sq ft roll)';
      break;
    case 'ice-and-water':
      underlaymentDesc = 'Ice & Water Shield (200 sq ft roll)';
      break;
  }
  
  const rollCoverage = underlaymentType === 'synthetic' ? 1000 : underlaymentType === 'ice-and-water' ? 200 : 400;
  const actualRolls = Math.ceil((roofArea * 1.15) / rollCoverage);
  
  underlayment.push({
    category: 'Underlayment',
    description: underlaymentDesc,
    quantity: actualRolls,
    unit: 'rolls',
    notes: 'Provides waterproof barrier under shingles',
  });
  
  // Ice and water shield for eaves (if not primary underlayment)
  if (underlaymentType !== 'ice-and-water') {
    const eaveLength = totalLength * 2; // Both eaves
    const iceWaterRolls = Math.ceil((eaveLength * 3) / 200); // 3 ft up from eave, 200 sq ft per roll
    underlayment.push({
      category: 'Underlayment',
      description: 'Ice & Water Shield for Eaves (200 sq ft roll)',
      quantity: iceWaterRolls,
      unit: 'rolls',
      notes: '3 ft strip along all eaves for ice dam protection',
    });
  }
  
  // 3. SHINGLES
  const shingles: MaterialItem[] = [];
  
  // Main shingles (sold by the square or bundle)
  // Typically 3 bundles per square
  let shingleDescription = '';
  let bundlesPerSquare = 3;
  
  switch (shingleType) {
    case 'architectural':
      shingleDescription = 'Architectural Shingles (Lifetime Warranty)';
      bundlesPerSquare = 3;
      break;
    case '3-tab':
      shingleDescription = '3-Tab Asphalt Shingles (25-year)';
      bundlesPerSquare = 3;
      break;
    case 'designer':
      shingleDescription = 'Designer Shingles (Premium)';
      bundlesPerSquare = 4;
      break;
    case 'metal':
      shingleDescription = 'Metal Roofing Panels';
      bundlesPerSquare = 1; // Metal sold differently
      break;
    case 'cedar-shake':
      shingleDescription = 'Cedar Shake Shingles';
      bundlesPerSquare = 5;
      break;
  }
  
  if (shingleType === 'metal') {
    // Metal roofing in panels
    const panelLength = 12; // 12 ft panels typical
    const panelWidth = 3; // 3 ft coverage
    const panelsNeeded = Math.ceil((roofArea * 1.1) / (panelLength * panelWidth));
    shingles.push({
      category: 'Roofing',
      description: `${shingleDescription} (12\' x 3\' panels)`,
      quantity: panelsNeeded,
      unit: 'panels',
      notes: `Covers ${totalSquares.toFixed(1)} squares with waste factor`,
    });
  } else {
    // Traditional shingles
    const totalBundles = Math.ceil(totalSquares * bundlesPerSquare);
    shingles.push({
      category: 'Roofing',
      description: `${shingleDescription}`,
      quantity: totalBundles,
      unit: 'bundles',
      notes: `${totalSquares.toFixed(1)} squares total (${bundlesPerSquare} bundles per square)`,
    });
  }
  
  // Starter strips
  const starterStripLinearFeet = perimeter * 1.1;
  const starterStripBundles = Math.ceil(starterStripLinearFeet / 100); // ~100 LF per bundle
  shingles.push({
    category: 'Roofing',
    description: 'Starter Strip Shingles',
    quantity: starterStripBundles,
    unit: 'bundles',
    notes: `${Math.round(starterStripLinearFeet)} linear feet along eaves and rakes`,
  });
  
  // Roofing nails
  const nailBoxes = Math.ceil(totalSquares * 0.5); // ~2 boxes per square
  shingles.push({
    category: 'Roofing',
    description: '1-1/4" Roofing Nails (5 lb box)',
    quantity: nailBoxes,
    unit: 'boxes',
    notes: 'For fastening shingles to deck',
  });
  
  // 4. RIDGE AND HIP CAP
  const ridgeAndHip: MaterialItem[] = [];
  
  if (totalRidgeAndHipLength > 0) {
    // Ridge cap shingles (covers ~35 LF per bundle)
    const ridgeCapBundles = Math.ceil(totalRidgeAndHipLength / 35);
    ridgeAndHip.push({
      category: 'Ridge & Hip',
      description: 'Ridge Cap Shingles',
      quantity: ridgeCapBundles,
      unit: 'bundles',
      notes: `${Math.round(totalRidgeAndHipLength)} linear feet of ridge and hip`,
    });
    
    // Ridge vent (if applicable)
    if (style !== 'flat' && style !== 'shed') {
      const ridgeVentPieces = Math.ceil(ridgeLength / 4); // 4 ft sections
      ridgeAndHip.push({
        category: 'Ridge & Hip',
        description: 'Ridge Vent (4\' sections)',
        quantity: ridgeVentPieces,
        unit: 'pieces',
        notes: `${Math.round(ridgeLength)} linear feet of ridge ventilation`,
      });
    }
  }
  
  // 5. FLASHING
  const flashing: MaterialItem[] = [];
  
  // Drip edge
  const dripEdgeLinearFeet = perimeter;
  const dripEdgePieces = Math.ceil(dripEdgeLinearFeet / 10); // 10 ft pieces
  flashing.push({
    category: 'Flashing',
    description: 'Drip Edge (10\' pieces)',
    quantity: dripEdgePieces,
    unit: 'pieces',
    notes: `${Math.round(dripEdgeLinearFeet)} linear feet around perimeter`,
  });
  
  // Valley flashing (if applicable)
  if (config.hasValleys && config.valleyCount) {
    const valleyLength = width * getPitchMultiplier(config.pitch) * config.valleyCount;
    const valleyFlashingPieces = Math.ceil(valleyLength / 10);
    flashing.push({
      category: 'Flashing',
      description: 'Valley Flashing (10\' pieces)',
      quantity: valleyFlashingPieces,
      unit: 'pieces',
      notes: `${Math.round(valleyLength)} linear feet for ${config.valleyCount} valleys`,
    });
  }

  // Multi-section intersection valley flashing
  if (style === 'l-shaped' && config.lShapeConfig) {
    const lValleyLength = width * getPitchMultiplier(config.pitch) * 2;
    const lValleyPieces = Math.ceil(lValleyLength / 10);
    flashing.push({
      category: 'Flashing',
      description: 'Valley Flashing at L-Shape Intersection (10\' pieces)',
      quantity: lValleyPieces,
      unit: 'pieces',
      notes: `${Math.round(lValleyLength)} linear feet for L-shape junction valleys`,
    });
  }
  if (style === 't-shaped' && config.tShapeConfig) {
    const tValleyLength = width * getPitchMultiplier(config.pitch) * 2;
    const tValleyPieces = Math.ceil(tValleyLength / 10);
    flashing.push({
      category: 'Flashing',
      description: 'Valley Flashing at T-Shape Intersection (10\' pieces)',
      quantity: tValleyPieces,
      unit: 'pieces',
      notes: `${Math.round(tValleyLength)} linear feet for T-shape junction valleys`,
    });
  }
  if (style === 'u-shaped' && config.uShapeConfig) {
    const uValleyLength = width * getPitchMultiplier(config.pitch) * 4;
    const uValleyPieces = Math.ceil(uValleyLength / 10);
    flashing.push({
      category: 'Flashing',
      description: 'Valley Flashing at U-Shape Intersections (10\' pieces)',
      quantity: uValleyPieces,
      unit: 'pieces',
      notes: `${Math.round(uValleyLength)} linear feet for U-shape junction valleys (4 valleys)`,
    });
  }
  
  // Chimney flashing (if applicable)
  if (config.hasChimney && config.chimneyCount) {
    flashing.push({
      category: 'Flashing',
      description: 'Chimney Flashing Kit',
      quantity: config.chimneyCount,
      unit: 'kits',
      notes: 'Step flashing and counter flashing for chimney',
    });
  }
  
  // Skylight flashing (if applicable)
  if (config.hasSkylight && config.skylightCount) {
    flashing.push({
      category: 'Flashing',
      description: 'Skylight Flashing Kit',
      quantity: config.skylightCount,
      unit: 'kits',
      notes: 'Pre-formed flashing kit for skylight installation',
    });
  }
  
  // Pipe boot flashing (typical installations have 2-4)
  flashing.push({
    category: 'Flashing',
    description: 'Pipe Boot Flashing (3" diameter)',
    quantity: 3,
    unit: 'pieces',
    notes: 'For plumbing vent pipes',
  });

  // Dormer flashing and additional materials
  if (config.hasDormers && config.dormers && config.dormers.length > 0) {
    const dormerCount = config.dormers.length;
    
    // Step flashing for dormer side walls (each dormer has 2 sides)
    const totalDormerSideLength = config.dormers.reduce((sum, d) => sum + d.depth * 2, 0);
    const stepFlashingPieces = Math.ceil(totalDormerSideLength / 0.5); // ~6" per piece
    flashing.push({
      category: 'Flashing',
      description: 'Step Flashing for Dormers (6" pieces)',
      quantity: stepFlashingPieces,
      unit: 'pieces',
      notes: `${dormerCount} dormer(s) — step flashing along ${totalDormerSideLength.toFixed(0)} linear feet of side walls`,
    });

    // Counter flashing for dormer faces
    const totalDormerFaceWidth = config.dormers.reduce((sum, d) => sum + d.width, 0);
    const counterFlashingPieces = Math.ceil(totalDormerFaceWidth / 10);
    flashing.push({
      category: 'Flashing',
      description: 'Counter Flashing for Dormer Faces (10\' pieces)',
      quantity: counterFlashingPieces,
      unit: 'pieces',
      notes: `${totalDormerFaceWidth.toFixed(0)} linear feet across dormer front walls`,
    });

    // Window units for dormers that have windows
    const windowDormers = config.dormers.filter(d => d.hasWindow);
    if (windowDormers.length > 0) {
      // Window flashing/drip cap
      flashing.push({
        category: 'Flashing',
        description: 'Window Drip Cap Flashing',
        quantity: windowDormers.length,
        unit: 'pieces',
        notes: 'Head flashing above each dormer window',
      });
    }

    // Additional sheathing for dormer cheek walls and roof
    const dormerSheathingArea = config.dormers.reduce((sum, d) => {
      // Two cheek walls + dormer roof surface
      const cheekArea = d.depth * d.height * 2;
      const roofArea = d.width * d.depth * 1.2; // ~20% extra for pitch
      return sum + cheekArea + roofArea;
    }, 0);
    const dormerSheathingSheets = Math.ceil(dormerSheathingArea / 32);
    if (dormerSheathingSheets > 0) {
      roofDeck.push({
        category: 'Roof Deck',
        description: '7/16" OSB Sheathing for Dormers (4\'x8\' sheets)',
        quantity: dormerSheathingSheets,
        unit: 'sheets',
        notes: `Sheathing for ${dormerCount} dormer cheek walls and roofs (${dormerSheathingArea.toFixed(0)} sq ft)`,
      });
    }

    // Additional shingles for dormer roofs
    const dormerRoofSquares = config.dormers.reduce((sum, d) => {
      return sum + (d.width * d.depth * getPitchMultiplier(config.pitch)) / 100;
    }, 0);
    if (dormerRoofSquares > 0) {
      const bundlesPerSq = shingleType === 'metal' ? 1 : shingleType === 'designer' ? 4 : shingleType === 'cedar-shake' ? 5 : 3;
      const dormerBundles = Math.ceil(dormerRoofSquares * bundlesPerSq * 1.15); // 15% waste for small areas
      shingles.push({
        category: 'Roofing',
        description: `Additional ${shingleType === 'metal' ? 'Metal Panels' : 'Shingles'} for Dormers`,
        quantity: dormerBundles,
        unit: shingleType === 'metal' ? 'panels' : 'bundles',
        notes: `${dormerRoofSquares.toFixed(2)} squares for ${dormerCount} dormer roof(s) with 15% waste`,
      });
    }

    // Dormer ridge cap (for gable and hip dormers)
    const ridgeDormers = config.dormers.filter(d => d.style === 'gable' || d.style === 'hip');
    if (ridgeDormers.length > 0) {
      const dormerRidgeLength = ridgeDormers.reduce((sum, d) => sum + d.depth, 0);
      const dormerRidgeBundles = Math.ceil(dormerRidgeLength / 35);
      ridgeAndHip.push({
        category: 'Ridge & Hip',
        description: 'Ridge Cap for Dormers',
        quantity: Math.max(1, dormerRidgeBundles),
        unit: 'bundles',
        notes: `${dormerRidgeLength.toFixed(0)} linear feet of dormer ridge`,
      });
    }
  }
  
  // 6. VENTILATION
  const ventilation: MaterialItem[] = [];
  
  // Calculate ventilation needs (1 sq ft vent per 150 sq ft attic)
  const atticArea = length * width;
  const ventilationNeeded = atticArea / 150;
  
  // Box vents or gable vents
  if (style !== 'flat') {
    const boxVents = Math.ceil(ventilationNeeded / 1.5); // Each box vent ~50 sq in
    ventilation.push({
      category: 'Ventilation',
      description: 'Box Roof Vent (50 sq in)',
      quantity: boxVents,
      unit: 'pieces',
      notes: `${ventilationNeeded.toFixed(1)} sq ft of ventilation required`,
    });
  }
  
  // Soffit vents for intake (if eaves)
  const soffitVentLinearFeet = (totalLength + totalWidth) * 2;
  const soffitVents = Math.ceil(soffitVentLinearFeet / 8); // 8" wide vents
  ventilation.push({
    category: 'Ventilation',
    description: 'Continuous Soffit Vent (8" wide)',
    quantity: soffitVents,
    unit: 'pieces',
    notes: `${Math.round(soffitVentLinearFeet)} linear feet of soffit intake ventilation`,
  });
  
  // 7. HARDWARE & ACCESSORIES
  const hardware: MaterialItem[] = [];
  
  // Roofing cement/sealant
  hardware.push({
    category: 'Hardware',
    description: 'Roofing Cement (10 oz tubes)',
    quantity: 6,
    unit: 'tubes',
    notes: 'For sealing flashing and penetrations',
  });
  
  // Roof deck protection tape
  hardware.push({
    category: 'Hardware',
    description: 'Roof Deck Protection Tape',
    quantity: 2,
    unit: 'rolls',
    notes: 'For sealing seams in underlayment',
  });
  
  // Caulk for flashing
  hardware.push({
    category: 'Hardware',
    description: 'Exterior Caulk (10 oz tubes)',
    quantity: 4,
    unit: 'tubes',
    notes: 'For sealing around flashing and penetrations',
  });

  // Dormer hardware and framing materials
  if (config.hasDormers && config.dormers && config.dormers.length > 0) {
    const dormerCount = config.dormers.length;

    // Dormer framing lumber (headers, cheeks, ridge board)
    hardware.push({
      category: 'Hardware',
      description: 'Dormer Framing Kit (2x6 headers, jack rafters, cripple studs)',
      quantity: dormerCount,
      unit: 'kits',
      notes: `Framing package for ${dormerCount} dormer(s) — includes headers, trimmer rafters, and face studs`,
    });

    // Window units for dormers that have windows
    const windowDormers = config.dormers.filter(d => d.hasWindow);
    if (windowDormers.length > 0) {
      hardware.push({
        category: 'Hardware',
        description: 'Dormer Window Unit (pre-hung, double-hung)',
        quantity: windowDormers.length,
        unit: 'units',
        notes: `Pre-hung window units for ${windowDormers.length} dormer(s)`,
      });
    }
  }
  
  return {
    roofDeck,
    underlayment,
    shingles,
    ridgeAndHip,
    flashing,
    ventilation,
    hardware,
  };
}

/**
 * Calculate total cost if materials have pricing
 */
export function calculateTotalCost(materials: RoofMaterials): number {
  let total = 0;
  
  Object.values(materials).forEach((category) => {
    if (Array.isArray(category)) {
      category.forEach((item) => {
        if (item.totalCost) {
          total += item.totalCost;
        }
      });
    }
  });
  
  return total;
}

/**
 * Format roof area for display
 */
export function formatRoofArea(config: RoofConfig): string {
  const area = calculateRoofArea(config);
  const squares = area / 100;
  return `${area.toFixed(0)} sq ft (${squares.toFixed(1)} squares)`;
}

/**
 * Get roof pitch description
 */
export function getPitchDescription(pitch: string): string {
  const [rise, run] = pitch.split('/').map(Number);
  const angle = Math.atan(rise / run) * (180 / Math.PI);
  return `${pitch} pitch (${angle.toFixed(1)}° angle)`;
}