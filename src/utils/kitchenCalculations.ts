import { KitchenConfig, KitchenMaterials } from '../types/kitchen';

export function calculateKitchenMaterials(config: KitchenConfig): KitchenMaterials {
  const materials: KitchenMaterials = {
    cabinets: [],
    countertops: [],
    appliances: [],
    hardware: [],
    installation: [],
  };

  // Calculate cabinets
  const cabinetsByCategory = {
    'Base Cabinets': config.cabinets.filter(c => c.type === 'base' || c.type === 'corner-base' || c.type === 'island'),
    'Wall Cabinets': config.cabinets.filter(c => c.type === 'wall' || c.type === 'corner-wall'),
    'Tall Cabinets': config.cabinets.filter(c => c.type === 'tall'),
  };

  Object.entries(cabinetsByCategory).forEach(([category, cabinets]) => {
    // Group by size
    const grouped = cabinets.reduce((acc, cab) => {
      const key = `${cab.name} (${cab.width}"W)`;
      if (!acc[key]) {
        acc[key] = { cabinet: cab, count: 0 };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, { cabinet: any; count: number }>);

    Object.values(grouped).forEach(({ cabinet, count }) => {
      materials.cabinets.push({
        description: `${cabinet.name} - ${config.cabinetFinish} Finish`,
        quantity: count,
        unit: 'ea',
        category: category as any,
      });
    });
  });

  // Calculate countertop square footage
  const totalCountertopArea = calculateCountertopArea(config);
  if (totalCountertopArea > 0) {
    materials.countertops.push({
      description: `${config.countertopMaterial} Countertop`,
      quantity: Math.ceil(totalCountertopArea),
      unit: 'sq ft',
    });
    
    // Add edge finishing
    const edgeLength = calculateCountertopEdgeLength(config);
    materials.countertops.push({
      description: 'Countertop Edge Finishing',
      quantity: Math.ceil(edgeLength),
      unit: 'linear ft',
    });
  }

  // Calculate backsplash
  if (config.hasBacksplash) {
    const backsplashArea = calculateBacksplashArea(config);
    materials.countertops.push({
      description: 'Tile Backsplash (Ceramic)',
      quantity: Math.ceil(backsplashArea),
      unit: 'sq ft',
    });
  }

  // Appliances
  config.appliances.forEach(appliance => {
    materials.appliances.push({
      description: `${appliance.name}`,
      quantity: 1,
      unit: 'ea',
    });
  });

  // Hardware
  const totalCabinets = config.cabinets.length;
  if (totalCabinets > 0) {
    // Calculate knobs/pulls needed
    const totalDoors = config.cabinets.reduce((sum, cab) => sum + (cab.numberOfDoors || 0), 0);
    const totalDrawers = config.cabinets.reduce((sum, cab) => sum + (cab.numberOfDrawers || 0), 0);
    
    materials.hardware.push({
      description: 'Cabinet Knobs/Pulls',
      quantity: totalDoors + totalDrawers,
      unit: 'ea',
    });
    
    materials.hardware.push({
      description: 'Cabinet Hinges',
      quantity: totalDoors * 2, // 2 hinges per door
      unit: 'ea',
    });
    
    if (totalDrawers > 0) {
      materials.hardware.push({
        description: 'Drawer Slides',
        quantity: totalDrawers,
        unit: 'pair',
      });
    }
  }

  // Installation materials
  if (totalCabinets > 0) {
    materials.installation.push({
      description: 'Cabinet Installation Labor',
      quantity: totalCabinets,
      unit: 'ea',
    });
    
    materials.installation.push({
      description: 'Shims and Leveling Materials',
      quantity: 1,
      unit: 'set',
    });
    
    materials.installation.push({
      description: 'Cabinet Mounting Hardware',
      quantity: 1,
      unit: 'set',
    });
  }

  if (totalCountertopArea > 0) {
    materials.installation.push({
      description: 'Countertop Installation Labor',
      quantity: Math.ceil(totalCountertopArea / 20), // Per 20 sq ft section
      unit: 'section',
    });
  }

  return materials;
}

function calculateCountertopArea(config: KitchenConfig): number {
  // For now, estimate based on base cabinets
  // In a real implementation, this would calculate actual countertop segments
  const baseCabinets = config.cabinets.filter(c => 
    c.type === 'base' || c.type === 'corner-base' || c.type === 'island'
  );
  
  let totalArea = 0;
  baseCabinets.forEach(cab => {
    // Standard countertop is 25" deep for base cabinets
    const depth = cab.type === 'island' ? 36 : 25;
    totalArea += (cab.width * depth) / 144; // Convert to sq ft
  });
  
  return totalArea;
}

function calculateCountertopEdgeLength(config: KitchenConfig): number {
  // Estimate perimeter of countertops
  const baseCabinets = config.cabinets.filter(c => 
    c.type === 'base' || c.type === 'corner-base' || c.type === 'island'
  );
  
  let totalLength = 0;
  baseCabinets.forEach(cab => {
    // Add exposed edges (front + 2 sides typically)
    totalLength += cab.width / 12; // Convert to feet
  });
  
  return totalLength * 1.5; // Factor for exposed edges
}

function calculateBacksplashArea(config: KitchenConfig): number {
  // Standard backsplash is 18" high
  const baseCabinets = config.cabinets.filter(c => c.type === 'base');
  
  let totalLength = 0;
  baseCabinets.forEach(cab => {
    totalLength += cab.width / 12; // Convert to feet
  });
  
  return totalLength * 1.5; // 1.5 feet high backsplash
}

export function validateKitchenDesign(config: KitchenConfig): string[] {
  const warnings: string[] = [];
  
  // Check if cabinets are within room bounds
  const roomWidthInches = config.roomWidth * 12;
  const roomLengthInches = config.roomLength * 12;
  
  config.cabinets.forEach(cab => {
    if (cab.x < 0 || cab.y < 0) {
      warnings.push(`Cabinet "${cab.name}" is positioned outside the room`);
    }
    if (cab.x + cab.width > roomWidthInches || cab.y + cab.depth > roomLengthInches) {
      warnings.push(`Cabinet "${cab.name}" extends beyond room boundaries`);
    }
  });
  
  // Check for overlapping cabinets
  for (let i = 0; i < config.cabinets.length; i++) {
    for (let j = i + 1; j < config.cabinets.length; j++) {
      if (cabinetsOverlap(config.cabinets[i], config.cabinets[j])) {
        warnings.push(`Cabinets overlap: "${config.cabinets[i].name}" and "${config.cabinets[j].name}"`);
      }
    }
  }
  
  return warnings;
}

function cabinetsOverlap(cab1: any, cab2: any): boolean {
  // Check if rectangles overlap on the same wall
  if (cab1.wall !== cab2.wall) return false;
  
  return !(
    cab1.x + cab1.width < cab2.x ||
    cab2.x + cab2.width < cab1.x ||
    cab1.y + cab1.depth < cab2.y ||
    cab2.y + cab2.depth < cab1.y
  );
}
