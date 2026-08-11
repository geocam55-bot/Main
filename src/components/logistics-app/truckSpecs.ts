export interface TruckSpec {
  id: string;
  name: string;
  vehicleModel: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  licensePlate: string;
  homeDepot: string;
  branchId: string;
  fuelType: 'Gasoline' | 'Diesel';
  fuelTankCapacityL: number;
  baseOdometerKm: number;
  baseEngineHours: number;
  basePtoHours: number;
  baseFuelPercent: number;
  gpsDeviceName: string;
  gpsDeviceId: string;
}

export const FLEET_COMPLETE_TRUCKS: TruckSpec[] = [
  {
    id: '2401 ALMON F-15',
    name: '2401 ALMON F-15',
    vehicleModel: '2024 Ford F-150 SuperCrew 4x4 (Almon OSR)',
    make: 'Ford',
    model: 'F-150',
    year: 2024,
    vin: '1FTFW1ED4RF240199',
    licensePlate: 'NS-F2401-NS',
    homeDepot: '500 Windmill Road Terminal Depot',
    branchId: 'DC-WINAMILL',
    fuelType: 'Gasoline',
    fuelTankCapacityL: 136,
    baseOdometerKm: 48210,
    baseEngineHours: 1240,
    basePtoHours: 0,
    baseFuelPercent: 78,
    gpsDeviceName: 'Fleet Complete MGS800 OBD-II',
    gpsDeviceId: 'FC-2401-OBD'
  },
  {
    id: '2409 - Elmsdale F150',
    name: '2409 - Elmsdale F150',
    vehicleModel: '2024 Ford F-150 XLT 4x4',
    make: 'Ford',
    model: 'F-150',
    year: 2024,
    vin: '1FTFW1ED8RF240988',
    licensePlate: 'NS-F2409-NS',
    homeDepot: 'RONA - Elmsdale',
    branchId: 'DC-ELMSDALE',
    fuelType: 'Gasoline',
    fuelTankCapacityL: 136,
    baseOdometerKm: 52430,
    baseEngineHours: 1380,
    basePtoHours: 0,
    baseFuelPercent: 82,
    gpsDeviceName: 'Fleet Complete MGS800 OBD-II',
    gpsDeviceId: 'FC-2409-OBD'
  },
  {
    id: '2412 - MTN RANGER',
    name: '2412 - MTN RANGER',
    vehicleModel: '2024 Ford Ranger XLT 4x4 (Mountain Depot)',
    make: 'Ford',
    model: 'Ranger',
    year: 2024,
    vin: '1FTER4FH9RR241277',
    licensePlate: 'NS-R2412-NS',
    homeDepot: 'RONA - WINDMILL',
    branchId: 'DC-WINAMILL',
    fuelType: 'Gasoline',
    fuelTankCapacityL: 80,
    baseOdometerKm: 39180,
    baseEngineHours: 980,
    basePtoHours: 0,
    baseFuelPercent: 65,
    gpsDeviceName: 'Fleet Complete MGS800 OBD-II',
    gpsDeviceId: 'FC-2412-OBD'
  },
  {
    id: '2408 - MTN F150 OSR',
    name: '2408 - MTN F150 OSR',
    vehicleModel: '2024 Ford F-150 XL 4x4 (Mountain OSR)',
    make: 'Ford',
    model: 'F-150',
    year: 2024,
    vin: '1FTFW1E87RF240866',
    licensePlate: 'NS-F2408-NS',
    homeDepot: 'RONA - WINDMILL',
    branchId: 'DC-WINAMILL',
    fuelType: 'Gasoline',
    fuelTankCapacityL: 136,
    baseOdometerKm: 61200,
    baseEngineHours: 1540,
    basePtoHours: 0,
    baseFuelPercent: 74,
    gpsDeviceName: 'Fleet Complete MGS800 OBD-II',
    gpsDeviceId: 'FC-2408-OBD'
  },
  {
    id: '2101 - Windmill F150',
    name: '2101 - Windmill F150',
    vehicleModel: '2021 Ford F-150 XL 4x4',
    make: 'Ford',
    model: 'F-150',
    year: 2021,
    vin: '1FTFW1E84MK210155',
    licensePlate: 'NS-F2101-NS',
    homeDepot: 'RONA - WINDMILL',
    branchId: 'DC-WINAMILL',
    fuelType: 'Gasoline',
    fuelTankCapacityL: 136,
    baseOdometerKm: 118450,
    baseEngineHours: 3210,
    basePtoHours: 0,
    baseFuelPercent: 58,
    gpsDeviceName: 'Fleet Complete MGS800 OBD-II',
    gpsDeviceId: 'FC-2101-OBD'
  },
  {
    id: '2404 - MTN 6X WesternStar Boom',
    name: '2404 - MTN 6X WesternStar Boom',
    vehicleModel: '2024 Western Star 4700 6x4 Heavy Boom Crane',
    make: 'Western Star',
    model: '4700',
    year: 2024,
    vin: '5KJACWDD6RP240411',
    licensePlate: 'NS-B2404-NS',
    homeDepot: 'RONA - WINDMILL',
    branchId: 'DC-WINAMILL',
    fuelType: 'Diesel',
    fuelTankCapacityL: 380,
    baseOdometerKm: 74320,
    baseEngineHours: 2890,
    basePtoHours: 642,
    baseFuelPercent: 70,
    gpsDeviceName: 'Fleet Complete FT1 Telematics',
    gpsDeviceId: 'FC-2404-FT1'
  },
  {
    id: '2501 - Elmsdale 6X Boom',
    name: '2501 - Elmsdale 6X Boom',
    vehicleModel: '2025 Western Star 47X 6x4 Heavy Boom Crane',
    make: 'Western Star',
    model: '47X',
    year: 2025,
    vin: '5KJACWEE2SP250122',
    licensePlate: 'NS-B2501-NS',
    homeDepot: 'RONA - Elmsdale',
    branchId: 'DC-ELMSDALE',
    fuelType: 'Diesel',
    fuelTankCapacityL: 380,
    baseOdometerKm: 28900,
    baseEngineHours: 1120,
    basePtoHours: 285,
    baseFuelPercent: 85,
    gpsDeviceName: 'Fleet Complete FT1 Telematics',
    gpsDeviceId: 'FC-2501-FT1'
  },
  {
    id: '2502 - Elmsdale 4X Boom',
    name: '2502 - Elmsdale 4X Boom',
    vehicleModel: '2025 Freightliner M2 106 4x2 Boom Truck',
    make: 'Freightliner',
    model: 'M2 106',
    year: 2025,
    vin: '1FVACWFC4SH250233',
    licensePlate: 'NS-B2502-NS',
    homeDepot: 'RONA - Elmsdale',
    branchId: 'DC-ELMSDALE',
    fuelType: 'Diesel',
    fuelTankCapacityL: 280,
    baseOdometerKm: 31400,
    baseEngineHours: 1210,
    basePtoHours: 210,
    baseFuelPercent: 68,
    gpsDeviceName: 'Fleet Complete FT1 Telematics',
    gpsDeviceId: 'FC-2502-FT1'
  },
  {
    id: '2503 - Elmsdale 6X Boom',
    name: '2503 - Elmsdale 6X Boom',
    vehicleModel: '2025 Western Star 47X 6x4 Heavy Boom Crane',
    make: 'Western Star',
    model: '47X',
    year: 2025,
    vin: '5KJACWEE5SP250344',
    licensePlate: 'NS-B2503-NS',
    homeDepot: 'RONA - Elmsdale',
    branchId: 'DC-ELMSDALE',
    fuelType: 'Diesel',
    fuelTankCapacityL: 380,
    baseOdometerKm: 22100,
    baseEngineHours: 890,
    basePtoHours: 195,
    baseFuelPercent: 90,
    gpsDeviceName: 'Fleet Complete FT1 Telematics',
    gpsDeviceId: 'FC-2503-FT1'
  },
  {
    id: '2504 - Elmsdale 6X Boom',
    name: '2504 - Elmsdale 6X Boom',
    vehicleModel: '2025 Western Star 47X 6x4 Heavy Boom Crane',
    make: 'Western Star',
    model: '47X',
    year: 2025,
    vin: '5KJACWEE8SP250455',
    licensePlate: 'NS-B2504-NS',
    homeDepot: 'RONA - Elmsdale',
    branchId: 'DC-ELMSDALE',
    fuelType: 'Diesel',
    fuelTankCapacityL: 380,
    baseOdometerKm: 18750,
    baseEngineHours: 740,
    basePtoHours: 160,
    baseFuelPercent: 72,
    gpsDeviceName: 'Fleet Complete FT1 Telematics',
    gpsDeviceId: 'FC-2504-FT1'
  },
  {
    id: '1802 - Elmsdale 4X Boom',
    name: '1802 - Elmsdale 4X Boom',
    vehicleModel: '2018 Freightliner M2 106 4x2 Boom Crane',
    make: 'Freightliner',
    model: 'M2 106',
    year: 2018,
    vin: '1FVACWFC9JH180266',
    licensePlate: 'NS-B1802-NS',
    homeDepot: 'RONA - Elmsdale',
    branchId: 'DC-ELMSDALE',
    fuelType: 'Diesel',
    fuelTankCapacityL: 280,
    baseOdometerKm: 168900,
    baseEngineHours: 5420,
    basePtoHours: 890,
    baseFuelPercent: 55,
    gpsDeviceName: 'Fleet Complete FT1 Telematics',
    gpsDeviceId: 'FC-1802-FT1'
  },
  {
    id: '1701 - MTN 4X Mac Boom',
    name: '1701 - MTN 4X Mac Boom',
    vehicleModel: '2017 Mack Granite 4x2 Boom Crane',
    make: 'Mack',
    model: 'Granite',
    year: 2017,
    vin: '1M2AG18C3HM170177',
    licensePlate: 'NS-B1701-NS',
    homeDepot: 'RONA - WINDMILL',
    branchId: 'DC-WINAMILL',
    fuelType: 'Diesel',
    fuelTankCapacityL: 320,
    baseOdometerKm: 184200,
    baseEngineHours: 6150,
    basePtoHours: 1040,
    baseFuelPercent: 62,
    gpsDeviceName: 'Fleet Complete FT1 Telematics',
    gpsDeviceId: 'FC-1701-FT1'
  },
  {
    id: '1803 - Elmsdale S/A Curtain',
    name: '1803 - Elmsdale S/A Curtain',
    vehicleModel: '2018 International MV607 Single Axle Curtain-side',
    make: 'International',
    model: 'MV607',
    year: 2018,
    vin: '1HTMMSMM2JH180388',
    licensePlate: 'NS-C1803-NS',
    homeDepot: 'RONA - Elmsdale',
    branchId: 'DC-ELMSDALE',
    fuelType: 'Diesel',
    fuelTankCapacityL: 260,
    baseOdometerKm: 142800,
    baseEngineHours: 4320,
    basePtoHours: 120,
    baseFuelPercent: 76,
    gpsDeviceName: 'Fleet Complete FT1 Telematics',
    gpsDeviceId: 'FC-1803-FT1'
  },
  {
    id: '1804 - MTN S/A Curtain',
    name: '1804 - MTN S/A Curtain',
    vehicleModel: '2018 International MV607 Single Axle Curtain-side',
    make: 'International',
    model: 'MV607',
    year: 2018,
    vin: '1HTMMSMM5JH180499',
    licensePlate: 'NS-C1804-NS',
    homeDepot: 'RONA - WINDMILL',
    branchId: 'DC-WINAMILL',
    fuelType: 'Diesel',
    fuelTankCapacityL: 260,
    baseOdometerKm: 151300,
    baseEngineHours: 4580,
    basePtoHours: 140,
    baseFuelPercent: 64,
    gpsDeviceName: 'Fleet Complete FT1 Telematics',
    gpsDeviceId: 'FC-1804-FT1'
  },
  {
    id: '1901 - Elmsdale HH',
    name: '1901 - Elmsdale HH',
    vehicleModel: '2019 Freightliner M2 106 Highway Hauler',
    make: 'Freightliner',
    model: 'M2 106',
    year: 2019,
    vin: '1FVACWFC8KH190111',
    licensePlate: 'NS-H1901-NS',
    homeDepot: 'RONA - Elmsdale',
    branchId: 'DC-ELMSDALE',
    fuelType: 'Diesel',
    fuelTankCapacityL: 300,
    baseOdometerKm: 135400,
    baseEngineHours: 3980,
    basePtoHours: 80,
    baseFuelPercent: 80,
    gpsDeviceName: 'Fleet Complete FT1 Telematics',
    gpsDeviceId: 'FC-1901-FT1'
  },
  {
    id: '1902 - MTN HH',
    name: '1902 - MTN HH',
    vehicleModel: '2019 Freightliner M2 106 Highway Hauler',
    make: 'Freightliner',
    model: 'M2 106',
    year: 2019,
    vin: '1FVACWFC2KH190222',
    licensePlate: 'NS-H1902-NS',
    homeDepot: 'RONA - WINDMILL',
    branchId: 'DC-WINAMILL',
    fuelType: 'Diesel',
    fuelTankCapacityL: 300,
    baseOdometerKm: 129600,
    baseEngineHours: 3810,
    basePtoHours: 75,
    baseFuelPercent: 59,
    gpsDeviceName: 'Fleet Complete FT1 Telematics',
    gpsDeviceId: 'FC-1902-FT1'
  },
  {
    id: '1702 - Elmsdale HH',
    name: '1702 - Elmsdale HH',
    vehicleModel: '2017 Freightliner M2 106 Heavy Hauler',
    make: 'Freightliner',
    model: 'M2 106',
    year: 2017,
    vin: '1FVACWFC6HH170233',
    licensePlate: 'NS-H1702-NS',
    homeDepot: 'RONA - Elmsdale',
    branchId: 'DC-ELMSDALE',
    fuelType: 'Diesel',
    fuelTankCapacityL: 300,
    baseOdometerKm: 176100,
    baseEngineHours: 5740,
    basePtoHours: 110,
    baseFuelPercent: 71,
    gpsDeviceName: 'Fleet Complete FT1 Telematics',
    gpsDeviceId: 'FC-1702-FT1'
  },
  {
    id: '701 - Elmsdale T/A Flatdeck',
    name: '701 - Elmsdale T/A Flatdeck',
    vehicleModel: '2020 Peterbilt 337 Tandem-Axle Flatbed',
    make: 'Peterbilt',
    model: '337',
    year: 2020,
    vin: '1XPAD49X4LD070144',
    licensePlate: 'NS-F0701-NS',
    homeDepot: 'RONA - Elmsdale',
    branchId: 'DC-ELMSDALE',
    fuelType: 'Diesel',
    fuelTankCapacityL: 320,
    baseOdometerKm: 112800,
    baseEngineHours: 3420,
    basePtoHours: 310,
    baseFuelPercent: 83,
    gpsDeviceName: 'Fleet Complete FT1 Telematics',
    gpsDeviceId: 'FC-701-FT1'
  },
  {
    id: '1903 - Elmsdale Windows',
    name: '1903 - Elmsdale Windows',
    vehicleModel: '2019 Ford F-550 Glass & Window Transport Rack',
    make: 'Ford',
    model: 'F-550',
    year: 2019,
    vin: '1FDOW5HT7KEA190399',
    licensePlate: 'NS-W1903-NS',
    homeDepot: 'RONA Elmsdale #03485',
    branchId: '03485',
    fuelType: 'Diesel',
    fuelTankCapacityL: 150,
    baseOdometerKm: 107269,
    baseEngineHours: 3064,
    basePtoHours: 337,
    baseFuelPercent: 61,
    gpsDeviceName: 'Fleet Complete FT1 Telematics',
    gpsDeviceId: 'FC-1903-FT1'
  },
  {
    id: 'PEI F550 Box',
    name: 'PEI F550 Box',
    vehicleModel: '2022 Ford F-550 Super Duty 16ft Box Truck',
    make: 'Ford',
    model: 'F-550',
    year: 2022,
    vin: '1FDOW5HT1NEA55055',
    licensePlate: 'PEI-B550-PE',
    homeDepot: 'RONA - PEI',
    branchId: '01075',
    fuelType: 'Diesel',
    fuelTankCapacityL: 150,
    baseOdometerKm: 88400,
    baseEngineHours: 2650,
    basePtoHours: 95,
    baseFuelPercent: 69,
    gpsDeviceName: 'Fleet Complete FT1 Telematics',
    gpsDeviceId: 'FC-PEI-550'
  },
  {
    id: 'PEI WS BOOM',
    name: 'PEI WS BOOM',
    vehicleModel: '2023 Western Star 4700 6x4 Heavy Boom Crane',
    make: 'Western Star',
    model: '4700',
    year: 2023,
    vin: '5KJACWDD8PP55066',
    licensePlate: 'PEI-B990-PE',
    homeDepot: 'RONA - PEI',
    branchId: '01075',
    fuelType: 'Diesel',
    fuelTankCapacityL: 380,
    baseOdometerKm: 64100,
    baseEngineHours: 2310,
    basePtoHours: 520,
    baseFuelPercent: 77,
    gpsDeviceName: 'Fleet Complete FT1 Telematics',
    gpsDeviceId: 'FC-PEI-BOOM'
  }
];

export function getTruckSpecs(idOrName?: string | null): TruckSpec {
  if (!idOrName) {
    return FLEET_COMPLETE_TRUCKS[0];
  }

  const clean = idOrName.trim();
  const upper = clean.toUpperCase();

  // 1. Direct ID or Name match
  const exact = FLEET_COMPLETE_TRUCKS.find(
    t => t.id.toUpperCase() === upper || t.name.toUpperCase() === upper
  );
  if (exact) return exact;

  // 2. Contains primary unit number check (e.g., "2401", "2409", "2412", "1903", etc.)
  const digits = clean.match(/\d+/)?.[0];
  if (digits) {
    const matchByNum = FLEET_COMPLETE_TRUCKS.find(t => {
      const specDigits = t.id.match(/\d+/)?.[0];
      return specDigits === digits;
    });
    if (matchByNum) return matchByNum;
  }

  // 3. Fallback dynamically generated spec for any new/custom truck
  const idHash = clean.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const isBoom = upper.includes('BOOM') || upper.includes('CRANE');
  const isF150 = upper.includes('F150') || upper.includes('F-15') || upper.includes('RANGER');
  
  const unitNum = digits || `${100 + (idHash % 899)}`;
  const year = 2020 + (idHash % 5);
  const make = isF150 ? 'Ford' : (isBoom ? 'Western Star' : 'Freightliner');
  const model = isF150 ? (upper.includes('RANGER') ? 'Ranger' : 'F-150') : (isBoom ? '4700 6x4 Boom' : 'M2 106');

  return {
    id: clean,
    name: clean,
    vehicleModel: `${year} ${make} ${model} Commercial Carrier`,
    make,
    model,
    year,
    vin: `1FTFW1E${(idHash % 9)}${idHash.toString(16).toUpperCase().padStart(4, '0')}${unitNum.padStart(4, '0')}`,
    licensePlate: `NS-${unitNum}-NS`,
    homeDepot: 'RONA Fleet Depot',
    branchId: 'DC-WINAMILL',
    fuelType: isF150 ? 'Gasoline' : 'Diesel',
    fuelTankCapacityL: isF150 ? 136 : 300,
    baseOdometerKm: 45000 + (idHash * 127 % 95000),
    baseEngineHours: 1200 + (idHash * 13 % 3000),
    basePtoHours: isBoom ? 200 + (idHash % 400) : 0,
    baseFuelPercent: 50 + (idHash % 45),
    gpsDeviceName: isF150 ? 'Fleet Complete MGS800 OBD-II' : 'Fleet Complete FT1 Telematics',
    gpsDeviceId: `FC-${unitNum}-GPS`
  };
}
