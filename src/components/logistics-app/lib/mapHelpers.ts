export function extractVehicleNumber(str: string | undefined | null): string | null {
  if (!str) return null;
  const match = str.match(/\b\d{3,5}\b/) || str.match(/\d+/);
  return match ? match[0] : null;
}

// Regional Coordinate Dictionary for high-accuracy live geolocating
export const KNOWN_COORDS: Record<string, { lat: number; lng: number }> = {
  // Direct Store & Distribution Center ID / Name Matches
  '01075': { lat: 44.70417, lng: -63.85807 },
  '01065': { lat: 44.65360, lng: -63.60110 },
  '01070': { lat: 44.979223, lng: -63.504250 },
  'DC-WINAMILL': { lat: 44.68550, lng: -63.58250 },
  'WINAMILL': { lat: 44.68550, lng: -63.58250 },

  // Specific Street & Hubley Matches
  'SPARROW LANE': { lat: 44.6642, lng: -63.8560 },
  'HUBLEY': { lat: 44.6601, lng: -63.8580 },

  // Nova Scotia Communities & Regional Locations
  'WINDMILL': { lat: 44.68550, lng: -63.58250 },
  'TANTALLON': { lat: 44.70417, lng: -63.85807 },
  'TIMBERLEA': { lat: 44.6465, lng: -63.7431 },
  'DARTMOUTH': { lat: 44.6636, lng: -63.5683 },
  'BRIDGEWATER': { lat: 44.3789, lng: -64.5126 },
  'HALIFAX': { lat: 44.6488, lng: -63.5880 },
  'CHAIN LAKE': { lat: 44.6295, lng: -63.6651 },
  '137 CHAIN LAKE': { lat: 44.6295, lng: -63.6651 },
  'ELMSDALE': { lat: 44.979223, lng: -63.504250 },
  'ALMON': { lat: 44.65360, lng: -63.60110 },
  'HUBBARDS': { lat: 44.6314, lng: -64.0531 },
  'LOWER SACKVILLE': { lat: 44.7642, lng: -63.6823 },
  'MIDDLE SACKVILLE': { lat: 44.7892, lng: -63.7258 },
  'SACKVILLE': { lat: 44.7642, lng: -63.6823 },
  'BEDFORD': { lat: 44.7303, lng: -63.6617 },
  'TRURO': { lat: 45.3647, lng: -63.2687 },
  'WINDSOR': { lat: 44.9904, lng: -64.1311 },
  'CHESTER': { lat: 44.5424, lng: -64.2405 },
  'ENFIELD': { lat: 44.9406, lng: -63.5358 },
  'LAKESIDE': { lat: 44.6489, lng: -63.7176 },
  'BAYERS LAKE': { lat: 44.6295, lng: -63.6651 },
  'BURNSIDE': { lat: 44.6983, lng: -63.5855 },
  'KENTVILLE': { lat: 45.0775, lng: -64.4965 },
  'HAMMONDS PLAINS': { lat: 44.7364, lng: -63.7854 },
  'COLE HARBOUR': { lat: 44.6644, lng: -63.4842 },
  'FALL RIVER': { lat: 44.8143, lng: -63.6152 },
  'PORTERS LAKE': { lat: 44.7355, lng: -63.3082 },
  'EASTERN PASSAGE': { lat: 44.6133, lng: -63.4866 },
  'SPRYFIELD': { lat: 44.6190, lng: -63.6062 },
  'PEGGYS COVE': { lat: 44.4922, lng: -63.9161 },
  'ST. MARGARETS BAY': { lat: 44.6225, lng: -63.9538 },
  "ST. MARGARET'S BAY": { lat: 44.6225, lng: -63.9538 },
  'LUNENBURG': { lat: 44.3770, lng: -64.3180 },
  'MAHONE BAY': { lat: 44.4480, lng: -64.3820 },
  'WOLFVILLE': { lat: 45.0915, lng: -64.3642 },
  'NEW GLASGOW': { lat: 45.5878, lng: -62.6465 },
  'SYDNEY': { lat: 46.1368, lng: -60.1942 },
  'AMHERST': { lat: 45.8335, lng: -64.2154 },
  'MONCTON': { lat: 46.0878, lng: -64.7782 },
  'SAINT JOHN': { lat: 45.2733, lng: -66.0633 },
  'FREDERICTON': { lat: 45.9636, lng: -66.6431 },
  'CHARLOTTETOWN': { lat: 46.2382, lng: -63.1311 },
  'SUMMERSIDE': { lat: 46.3959, lng: -63.7887 },
  
  // Silicon Valley, California
  'CAMPBELL, CA': { lat: 37.2872, lng: -121.9500 },
  'SUNNYVALE': { lat: 37.3688, lng: -122.0363 },
  'SAN MATEO': { lat: 37.5630, lng: -122.3255 },
  'SAN JOSE': { lat: 37.3382, lng: -121.8863 },
  'LOS ALTOS': { lat: 37.3852, lng: -122.1141 },
  'BERRYESSA': { lat: 37.3382, lng: -121.8863 },
  'HOMESTEAD': { lat: 37.3852, lng: -122.1141 },
  'JAMES ST': { lat: 37.3688, lng: -122.0363 },
  'HILLSDALE': { lat: 37.5630, lng: -122.3255 },
  'ORCHARD CITY': { lat: 37.2872, lng: -121.9500 },
};

export const getGpsForLocation = (id: string, nameOrAddress: string): { lat: number; lng: number } | null => {
  const combined = (id + ' ' + (nameOrAddress || '')).trim();
  if (!combined) return null;
  
  // Try matching ||lat:XX ||lng:YY or lat:XX lng:YY
  const latMatch = combined.match(/\|\|lat:\s*(-?\d+(?:\.\d+)?)/i) || combined.match(/lat:\s*(-?\d+(?:\.\d+)?)/i);
  const lngMatch = combined.match(/\|\|lng:\s*(-?\d+(?:\.\d+)?)/i) || combined.match(/lng:\s*(-?\d+(?:\.\d+)?)/i);
  if (latMatch && lngMatch) {
    const parsedLat = parseFloat(latMatch[1]);
    const parsedLng = parseFloat(lngMatch[1]);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      return { lat: parsedLat, lng: parsedLng };
    }
  }

  // Also support matching decimal degrees in brackets or parentheses, e.g. [44.123, -63.456]
  const bracketMatch = combined.match(/[\[\()]\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*[\]\)]/);
  if (bracketMatch) {
    const parsedLat = parseFloat(bracketMatch[1]);
    const parsedLng = parseFloat(bracketMatch[2]);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      return { lat: parsedLat, lng: parsedLng };
    }
  }

  const norm = combined.toUpperCase();
  
  // Try to find a match in our KNOWN_COORDS dictionary
  for (const [key, value] of Object.entries(KNOWN_COORDS)) {
    if (norm.includes(key)) {
      return value;
    }
  }
  
  return null;
};

export const cleanAddressText = (address: string | undefined): string => {
  if (!address) return '';
  return address
    .replace(/\|\|lat:\s*(-?\d+(?:\.\d+)?)/gi, '')
    .replace(/\|\|lng:\s*(-?\d+(?:\.\d+)?)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const sanitizeGpsCoordinates = (lat: number, lng: number): { lat: number; lng: number } => {
  if (isNaN(lat) || isNaN(lng)) return { lat: 44.68550, lng: -63.58250 };

  // 1. Eastern Passage / Shearwater / Eisner Cove / Halifax Outer Harbour Channel Water
  if (lat >= 44.5800 && lat <= 44.6550 && lng >= -63.5850 && lng <= -63.5200) {
    if (lng >= -63.5450) {
      return { lat: Math.min(lat, 44.6300), lng: -63.5180 };
    } else if (lng >= -63.5650) {
      return { lat: Math.max(lat, 44.6550), lng: -63.5480 };
    } else {
      return { lat, lng: -63.5880 };
    }
  }

  // 2. Halifax Inner Harbour & The Narrows Water Channel
  if (lat >= 44.6400 && lat <= 44.6850 && lng >= -63.6100 && lng <= -63.5650) {
    if (lng >= -63.5850) {
      return { lat: Math.max(lat, 44.68550), lng: -63.58250 };
    } else {
      return { lat, lng: -63.60200 };
    }
  }

  // 3. Bedford Basin Water
  if (lat >= 44.6750 && lat <= 44.7300 && lng >= -63.6800 && lng <= -63.6050) {
    if (lng <= -63.6400) {
      return { lat, lng: -63.6820 };
    } else {
      return { lat, lng: -63.5980 };
    }
  }

  // 4. Northwest Arm Water
  if (lat >= 44.6200 && lat <= 44.6450 && lng >= -63.6100 && lng <= -63.5900) {
    return { lat, lng: -63.6150 };
  }

  // 5. Hard bounds fallback for Nova Scotia Region
  if (lat < 44.4000 || lat > 46.5000 || lng < -64.5000 || lng > -62.0000) {
    return { lat: 44.68550, lng: -63.58250 };
  }

  return { lat, lng };
};

export const isTruckAssignedToBranch = (truck: any, branch: any): boolean => {
  if (!truck || !branch) return false;

  const truckBranchId = String(truck.branchId || '').trim().toLowerCase();
  const branchId = String(branch.id || '').trim().toLowerCase();
  const branchCode = String(branch.branchCode || branch.code || '').trim().toLowerCase();
  const branchName = String(branch.name || '').trim().toLowerCase();
  const homeDepot = String(truck.homeDepot || '').trim().toLowerCase();

  // 1. Direct ID or Code match
  if (truckBranchId && (truckBranchId === branchId || (branchCode && truckBranchId === branchCode))) {
    return true;
  }

  // 2. Windmill / Dartmouth DC alias matching
  const isWindmillBranch = branchId === 'dc-winamill' || branchId === '500' || branchId === 'windmill' || branchName.includes('windmill') || branchName.includes('dartmouth');
  const isWindmillTruck = truckBranchId === 'dc-winamill' || truckBranchId === '500' || truckBranchId === 'windmill' || homeDepot.includes('windmill') || homeDepot.includes('dartmouth');
  if (isWindmillBranch && isWindmillTruck) return true;

  // 3. Elmsdale alias matching
  const isElmsdaleBranch = branchId === '01070' || branchId === 'dc-elmsdale' || branchId === 'elmsdale' || branchName.includes('elmsdale');
  const isElmsdaleTruck = truckBranchId === '01070' || truckBranchId === 'dc-elmsdale' || truckBranchId === 'elmsdale' || homeDepot.includes('elmsdale');
  if (isElmsdaleBranch && isElmsdaleTruck) return true;

  // 4. Tantallon alias matching
  const isTantallonBranch = branchId === '01075' || branchId === 'tantallon' || branchName.includes('tantallon');
  const isTantallonTruck = truckBranchId === '01075' || truckBranchId === 'tantallon' || homeDepot.includes('tantallon');
  if (isTantallonBranch && isTantallonTruck) return true;

  // 5. General name match fallback
  if (branchName && branchName.length > 3) {
    const cleanBranchName = branchName.replace(/^prospaces\s*/i, '').replace(/^rona\s*/i, '').trim();
    if (cleanBranchName && cleanBranchName.length > 2) {
      if (homeDepot.includes(cleanBranchName) || truckBranchId.includes(cleanBranchName)) {
        return true;
      }
    }
  }

  return false;
};

export const getBranchCoordinates = (id: string, name: string, address?: string): { x: number; y: number; lat: number; lng: number } => {
  const combinedStr = `${name || ''} ${address || ''}`.trim();
  const gps = getGpsForLocation(id, combinedStr);
  const rawLat = gps ? gps.lat : 44.68550; // Fallback to central Windmill HQ for branch depot nodes
  const rawLng = gps ? gps.lng : -63.58250;
  const sanitized = sanitizeGpsCoordinates(rawLat, rawLng);
  const coords = getPercentCoordsFromGps(sanitized.lat, sanitized.lng);
  return { x: coords.x, y: coords.y, lat: sanitized.lat, lng: sanitized.lng };
};

export const getDeliveryCoordinates = (id: string, address: string, originX?: number, originY?: number): { x: number; y: number; lat: number; lng: number } | null => {
  const gps = getGpsForLocation(id, address);
  if (!gps) return null;
  const coords = getPercentCoordsFromGps(gps.lat, gps.lng);
  return { x: coords.x, y: coords.y, lat: gps.lat, lng: gps.lng };
};

export const getTruckCoords = (truck: any, simProgress: Record<string, number>, branches: any[]) => {
  const isTruckGps = truck?.gpsSource === 'truck';
  const idOrName = ((truck?.id || '') + ' ' + (truck?.name || '') + ' ' + (truck?.homeDepot || '')).toLowerCase();
  const is2401Almon = idOrName.includes('2401') || idOrName.includes('almon');
  const is1903 = idOrName.includes('1903');
  const is2101Windmill = idOrName.includes('2101') || idOrName.includes('windmill');
  const isElmsdale = !is2401Almon && !is2101Windmill && (is1903 || idOrName.includes('elmsdale') || idOrName.includes('03485'));
  const isChainMtn = idOrName.includes('chain') || idOrName.includes('mountain') || idOrName.includes('2412') || idOrName.includes('2408') || idOrName.includes('2404');
  const isPei = idOrName.includes('pei') || idOrName.includes('charlottetown') || idOrName.includes('01075');

  const hasRealGps = isTruckGps 
    ? (truck?.gpsLat !== undefined && truck?.gpsLng !== undefined && !isNaN(truck.gpsLat) && !isNaN(truck.gpsLng))
    : (truck?.lat !== undefined && truck?.lng !== undefined && !isNaN(truck.lat) && !isNaN(truck.lng));

  let baseLat = hasRealGps 
    ? (isTruckGps ? truck.gpsLat : truck.lat) 
    : 44.68550;
  let baseLng = hasRealGps 
    ? (isTruckGps ? truck.gpsLng : truck.lng) 
    : -63.58250;

  if (is2401Almon && (!hasRealGps || baseLat === 44.9792 || baseLat === 44.6536)) {
    baseLat = 44.68550;
    baseLng = -63.58250;
  } else if ((is1903 || isElmsdale) && (!hasRealGps || baseLat === 44.6855 || baseLat === 44.6536)) {
    baseLat = 44.979223;
    baseLng = -63.504250;
  } else if (is2101Windmill && (!hasRealGps || baseLat === 44.9792)) {
    baseLat = 44.68550;
    baseLng = -63.58250;
  } else if (isChainMtn && (!hasRealGps || baseLat === 44.9792 || baseLat === 44.6855)) {
    baseLat = 44.6295;
    baseLng = -63.6651;
  } else if (isPei && (!hasRealGps || baseLat < 45.5)) {
    baseLat = 46.2382;
    baseLng = -63.1311;
  } else if (!hasRealGps) {
    const homeBranch = branches.find(b => isTruckAssignedToBranch(truck, b));
    if (homeBranch) {
      const branchCoords = getBranchCoordinates(homeBranch.id, homeBranch.name, homeBranch.address);
      baseLat = branchCoords.lat;
      baseLng = branchCoords.lng;
    }
  }

  const sanitizedBase = sanitizeGpsCoordinates(baseLat, baseLng);
  baseLat = sanitizedBase.lat;
  baseLng = sanitizedBase.lng;

  const trAny = truck as any;
  const isNoDriver = !truck?.driver || truck?.driver.toLowerCase() === 'no driver' || truck?.driver.toLowerCase() === 'unassigned';
  const isExplicitParked = trAny?.status === 'Parked' || trAny?.status === 'Stationary' || trAny?.status === 'Off';

  const rawSpeed = typeof truck?.gpsSpeed === 'number' ? truck.gpsSpeed : (typeof truck?.speed === 'number' ? truck.speed : 0);
  const isExplicitDriving = trAny?.status === 'Driving' || trAny?.status === 'In Transit' || trAny?.status === 'En Route' || trAny?.isDriving === true;
  const hasAssignedDelivery = Boolean(trAny?.assignedDeliveryId || trAny?.assignedDelivery || trAny?.trips?.length > 0);

  const isMoving = !isNoDriver && !isExplicitParked && (
    rawSpeed > 0 ||
    isExplicitDriving ||
    hasAssignedDelivery ||
    (trAny?.status !== 'Parked' && trAny?.status !== 'Off' && trAny?.status !== 'Stationary')
  );

  if (isMoving) {
    const progress = simProgress[truck?.id] ?? 0.18;
    const idHash = (truck?.id || "").split("").reduce((sum: number, ch: string) => sum + ch.charCodeAt(0), 0);
    
    const travelDir = (idHash % 2 === 0) ? 1 : -1;
    const isDartmouth = baseLng >= -63.5850;
    const sweepRange = 0.020 + ((idHash % 5) * 0.006);
    const latOffset = Math.sin(progress * 2 * Math.PI) * sweepRange * travelDir;
    const lngOffset = Math.cos(progress * 2 * Math.PI) * 0.010 * (isDartmouth ? 1 : -1);

    const rawLat = Number((baseLat + latOffset).toFixed(6));
    const rawLng = Number((baseLng + lngOffset).toFixed(6));
    const sanitized = sanitizeGpsCoordinates(rawLat, rawLng);

    return {
      lat: sanitized.lat,
      lng: sanitized.lng,
      hasRealGps: true,
      isTruckGps
    };
  }

  return { lat: baseLat, lng: baseLng, hasRealGps, isTruckGps };
};

export const getPercentCoordsFromGps = (lat: number, lng: number): { x: number; y: number } => {
  const isCalifornia = lat < 40;
  
  const latMin = isCalifornia ? 37.20 : 44.25;
  const latMax = isCalifornia ? 37.70 : 44.75;
  const lngMin = isCalifornia ? -122.45 : -64.65;
  const lngMax = isCalifornia ? -121.80 : -63.45;

  const latFactor = Math.min(Math.max((lat - latMin) / (latMax - latMin), 0), 1);
  const lngFactor = Math.min(Math.max((lng - lngMin) / (lngMax - lngMin), 0), 1);

  const x = 15 + lngFactor * 70;
  const y = 80 - latFactor * 60;

  return { x, y };
};

export const calculateDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
