export function extractVehicleNumber(str: string | undefined | null): string | null {
  if (!str) return null;
  const trimmed = String(str).trim();
  if (trimmed.length > 30 || /^[0-9a-f]{8}-/i.test(trimmed)) return null;
  const prefixMatch = trimmed.match(/^(\d{3,5})\b/);
  if (prefixMatch) return prefixMatch[1];
  const unitMatch = trimmed.match(/(?:truck|unit|vehicle|#)\s*(\d{3,5})\b/i);
  if (unitMatch) return unitMatch[1];
  return null;
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
  if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return { lat: 44.68550, lng: -63.58250 };

  // If valid coordinates within global geographic range, return authentic coordinates
  if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    return { lat, lng };
  }

  return { lat: 44.68550, lng: -63.58250 };
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

export interface StoreColorInfo {
  storeKey: 'halifax' | 'elmsdale' | 'tantallon' | 'windmill';
  storeName: string;
  bgColor: string;         // Tailwind bg class for marker pin
  textColor: string;       // Tailwind text color for icon
  borderColor: string;     // Tailwind border color for marker
  ringColor: string;       // Tailwind ring color for selected state
  badgeBg: string;         // Tailwind bg class for store badge
  badgeText: string;       // Tailwind text class for store badge
  hexColor: string;        // Hex color for canvas / map markers
  tailColor: string;       // Tail class or hex
}

export const STORE_COLOR_MAP: Record<'halifax' | 'elmsdale' | 'tantallon' | 'windmill', StoreColorInfo> = {
  halifax: {
    storeKey: 'halifax',
    storeName: 'Halifax',
    bgColor: 'bg-yellow-400',
    textColor: 'text-slate-950 font-bold',
    borderColor: 'border-yellow-200',
    ringColor: 'ring-yellow-400',
    badgeBg: 'bg-yellow-400 text-slate-950 font-bold',
    badgeText: 'text-slate-950',
    hexColor: '#facc15', // Yellow
    tailColor: 'bg-yellow-400'
  },
  elmsdale: {
    storeKey: 'elmsdale',
    storeName: 'Elmsdale',
    bgColor: 'bg-slate-950',
    textColor: 'text-white font-bold',
    borderColor: 'border-slate-700',
    ringColor: 'ring-slate-900',
    badgeBg: 'bg-slate-950 text-white font-bold',
    badgeText: 'text-white',
    hexColor: '#090d16', // Black
    tailColor: 'bg-slate-950'
  },
  tantallon: {
    storeKey: 'tantallon',
    storeName: 'Tantallon',
    bgColor: 'bg-red-600',
    textColor: 'text-white font-bold',
    borderColor: 'border-red-300',
    ringColor: 'ring-red-500',
    badgeBg: 'bg-red-600 text-white font-bold',
    badgeText: 'text-white',
    hexColor: '#dc2626', // Red
    tailColor: 'bg-red-600'
  },
  windmill: {
    storeKey: 'windmill',
    storeName: 'Windmill',
    bgColor: 'bg-blue-600',
    textColor: 'text-white font-bold',
    borderColor: 'border-blue-300',
    ringColor: 'ring-blue-500',
    badgeBg: 'bg-blue-600 text-white font-bold',
    badgeText: 'text-white',
    hexColor: '#2563eb', // Blue
    tailColor: 'bg-blue-600'
  }
};

export const getTruckStoreInfo = (truck: any, branches: any[] = []): StoreColorInfo => {
  if (!truck) return STORE_COLOR_MAP.windmill;

  // 1. Try finding matched branch in active branches array
  const matchedBranch = Array.isArray(branches) ? branches.find(b => isTruckAssignedToBranch(truck, b)) : null;

  const strToTest = (
    (truck.id || '') + ' ' +
    (truck.name || '') + ' ' +
    (truck.type || '') + ' ' +
    (truck.branchId || '') + ' ' +
    (truck.homeDepot || '') + ' ' +
    (truck.assignedStore || '') + ' ' +
    (matchedBranch ? `${matchedBranch.id} ${matchedBranch.name} ${matchedBranch.branchCode || ''} ${matchedBranch.address || ''}` : '')
  ).toLowerCase();

  // 2. Halifax Store matching
  if (
    strToTest.includes('halifax') ||
    strToTest.includes('almon') ||
    strToTest.includes('3300') ||
    strToTest.includes('chain') ||
    strToTest.includes('03480') ||
    strToTest.includes('peninsula')
  ) {
    return STORE_COLOR_MAP.halifax;
  }

  // 3. Elmsdale Store matching
  if (
    strToTest.includes('elmsdale') ||
    strToTest.includes('01070') ||
    strToTest.includes('03485') ||
    strToTest.includes('1903') ||
    strToTest.includes('2409')
  ) {
    return STORE_COLOR_MAP.elmsdale;
  }

  // 4. Tantallon Store matching
  if (
    strToTest.includes('tantallon') ||
    strToTest.includes('01075')
  ) {
    return STORE_COLOR_MAP.tantallon;
  }

  // 5. Windmill / Dartmouth Store matching
  if (
    strToTest.includes('windmill') ||
    strToTest.includes('dartmouth') ||
    strToTest.includes('dc-winamill') ||
    strToTest.includes('500') ||
    strToTest.includes('2101') ||
    strToTest.includes('2412') ||
    strToTest.includes('2408')
  ) {
    return STORE_COLOR_MAP.windmill;
  }

  // Fallback: check if matched branch has an id/name or default to Windmill
  if (matchedBranch?.name) {
    const bName = matchedBranch.name.toLowerCase();
    if (bName.includes('halifax')) return STORE_COLOR_MAP.halifax;
    if (bName.includes('elmsdale')) return STORE_COLOR_MAP.elmsdale;
    if (bName.includes('tantallon')) return STORE_COLOR_MAP.tantallon;
    if (bName.includes('windmill') || bName.includes('dartmouth')) return STORE_COLOR_MAP.windmill;
  }

  return STORE_COLOR_MAP.windmill;
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

export const HIGHWAY_102_ROUTE = [
  { lat: 44.9792, lng: -63.5042 }, // RONA Elmsdale Depot
  { lat: 44.9450, lng: -63.5350 }, // Hwy 102 Enfield
  { lat: 44.8780, lng: -63.5620 }, // Hwy 102 Goffs / Aerotech
  { lat: 44.8350, lng: -63.5980 }, // Hwy 102 Fall River
  { lat: 44.7720, lng: -63.6380 }, // Hwy 102 Waverley
  { lat: 44.7311, lng: -63.6620 }, // Hwy 102 Bedford / Sackville
  { lat: 44.6980, lng: -63.6420 }, // Hwy 102 Rockingham / Bicentennial
  { lat: 44.6568, lng: -63.6003 }, // RONA Halifax (Almon St)
  { lat: 44.6980, lng: -63.6420 },
  { lat: 44.7311, lng: -63.6620 },
  { lat: 44.7720, lng: -63.6380 },
  { lat: 44.8350, lng: -63.5980 },
  { lat: 44.8780, lng: -63.5620 },
  { lat: 44.9450, lng: -63.5350 },
  { lat: 44.9792, lng: -63.5042 },
];

export const HIGHWAY_111_ROUTE = [
  { lat: 44.6855, lng: -63.5825 }, // RONA Windmill Burnside HQ
  { lat: 44.7080, lng: -63.5852 }, // Akerley Blvd / Hwy 111
  { lat: 44.7280, lng: -63.6250 }, // Magazine Hill / Hwy 101
  { lat: 44.7311, lng: -63.6620 }, // Bedford Hwy 102 Junction
  { lat: 44.6980, lng: -63.6420 },
  { lat: 44.6568, lng: -63.6003 }, // RONA Halifax
  { lat: 44.6710, lng: -63.5850 }, // Dartmouth Crossing
  { lat: 44.6855, lng: -63.5825 },
];

export const HIGHWAY_103_ROUTE = [
  { lat: 44.7030, lng: -63.8571 }, // RONA Tantallon Depot
  { lat: 44.6880, lng: -63.8115 }, // Hubley Hwy 103
  { lat: 44.6650, lng: -63.7250 }, // Timberlea / Beechville
  { lat: 44.6488, lng: -63.6352 }, // Joseph Howe Hwy 103 Exit
  { lat: 44.6568, lng: -63.6003 }, // RONA Halifax
  { lat: 44.6488, lng: -63.6352 },
  { lat: 44.6650, lng: -63.7250 },
  { lat: 44.6880, lng: -63.8115 },
  { lat: 44.7030, lng: -63.8571 },
];

export const getTruckCoords = (truck: any, simProgress?: Record<string, number>, branches: any[] = []) => {
  const isTruckGps = truck?.gpsSource === 'truck';

  const rawLat = truck?.gpsLat ?? truck?.lat ?? truck?.latitude ?? truck?.current_latitude;
  const rawLng = truck?.gpsLng ?? truck?.lng ?? truck?.longitude ?? truck?.current_longitude;
  const numLat = typeof rawLat === 'number' ? rawLat : (typeof rawLat === 'string' ? parseFloat(rawLat) : NaN);
  const numLng = typeof rawLng === 'number' ? rawLng : (typeof rawLng === 'string' ? parseFloat(rawLng) : NaN);
  const hasValidStaticGps = !isNaN(numLat) && !isNaN(numLng) && numLat !== 0 && numLng !== 0;

  // Fallback to recorded lat/lng or home branch depot
  let baseLat = hasValidStaticGps ? numLat : 44.68550;
  let baseLng = hasValidStaticGps ? numLng : -63.58250;

  if (!hasValidStaticGps && Array.isArray(branches)) {
    const homeBranch = branches.find(b => isTruckAssignedToBranch(truck, b));
    if (homeBranch) {
      const branchCoords = getBranchCoordinates(homeBranch.id, homeBranch.name, homeBranch.address);
      baseLat = branchCoords.lat;
      baseLng = branchCoords.lng;
    }
  }

  const sanitizedBase = sanitizeGpsCoordinates(baseLat, baseLng);

  return { lat: sanitizedBase.lat, lng: sanitizedBase.lng, hasRealGps: hasValidStaticGps, isTruckGps };
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
