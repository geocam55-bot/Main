import { Tenant, Branch, Truck, User, DeliveryRecord } from './types';

export const TENANTS: Tenant[] = [
  {
    id: 'rona_atlantic',
    name: 'RONA Atlantic Logistics',
    code: 'RONA',
    description: 'Corporate logistics tracking for RONA distributor and dealer stores in Atlantic Canada.',
    logoBadge: '🏢',
    regionalFocus: 'Atlantic Canada (Dartmouth, Tantallon, Halifax, PEI)',
    primaryColor: 'blue'
  }
];

export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'RONA-03490',
    tenantId: 'rona_atlantic',
    name: 'RONA Tantallon',
    code: 'RONA-03490',
    type: 'STORE',
    address: "1687 St. Margaret's Bay Rd, Tantallon, NS",
    phone: '(902) 826-2180',
    managerName: 'Store Manager',
    latitude: 44.6854,
    longitude: -63.8824,
    geofenceRadiusMeters: 100,
    isActive: true
  },
  {
    id: 'RONA-03480',
    tenantId: 'rona_atlantic',
    name: 'RONA Halifax',
    code: 'RONA-03480',
    type: 'STORE',
    address: '500 Windmill Rd, Dartmouth / Halifax, NS',
    phone: '(902) 468-3330',
    managerName: 'Store Manager',
    latitude: 44.6896,
    longitude: -63.5976,
    geofenceRadiusMeters: 100,
    isActive: true
  },
  {
    id: 'RONA-03485',
    tenantId: 'rona_atlantic',
    name: 'RONA Elmsdale',
    code: 'RONA-03485',
    type: 'STORE',
    address: '260 Hwy 214, Elmsdale, NS',
    phone: '(902) 883-2281',
    managerName: 'Store Manager',
    latitude: 44.9796,
    longitude: -63.5044,
    geofenceRadiusMeters: 100,
    isActive: true
  },
  {
    id: 'RONA-03510',
    tenantId: 'rona_atlantic',
    name: 'RONA Dartmouth',
    code: 'RONA-03510',
    type: 'STORE',
    address: '500 Windmill Road, Dartmouth, NS',
    phone: '(902) 468-1234',
    managerName: 'Store Manager',
    latitude: 44.6909,
    longitude: -63.5985,
    geofenceRadiusMeters: 100,
    isActive: true
  }
];

export const DEFAULT_TRUCKS: Truck[] = [
  { id: '2501 - Elmsdale 6X Boom', name: '2501 - Elmsdale 6X Boom', type: '2025 Western Star 47X 6x4 Heavy Boom Crane', driver: 'Steve Conrad', branchId: 'RONA-03485', tenantId: 'rona_atlantic', isActive: true, status: 'In Transit', currentLatitude: 44.9796, currentLongitude: -63.5044 },
  { id: '2502 - Elmsdale 4X Boom', name: '2502 - Elmsdale 4X Boom', type: '2025 Freightliner M2 106 4x2 Boom Truck', driver: 'No Driver', branchId: 'RONA-03485', tenantId: 'rona_atlantic', isActive: true, status: 'Parked', currentLatitude: 44.9810, currentLongitude: -63.5060 },
  { id: '2503 - Elmsdale 6X Boom', name: '2503 - Elmsdale 6X Boom', type: '2025 Kenworth T880 6x4 Heavy Boom Crane', driver: 'Erik Nielsen', branchId: 'RONA-03485', tenantId: 'rona_atlantic', isActive: true, status: 'In Transit', currentLatitude: 44.9790, currentLongitude: -63.5030 },
  { id: '2504 - Elmsdale 6X Boom', name: '2504 - Elmsdale 6X Boom', type: '2025 Western Star 47X 6x4 Heavy Boom Crane', driver: 'Erik Nielsen', branchId: 'RONA-03485', tenantId: 'rona_atlantic', isActive: true, status: 'Idling', currentLatitude: 44.9820, currentLongitude: -63.5080 },
  { id: '1802 - Elmsdale 4X Boom', name: '1802 - Elmsdale 4X Boom', type: '2018 Freightliner M2 106 4x2 Boom Crane', driver: 'No Driver', branchId: 'RONA-03485', tenantId: 'rona_atlantic', isActive: true, status: 'Parked', currentLatitude: 44.9830, currentLongitude: -63.5020 },
  { id: '1803 - Elmsdale S/A Curtain', name: '1803 - Elmsdale S/A Curtain', type: '2018 International MV607 Single Axle Curtain-side', driver: 'No Driver', branchId: 'RONA-03485', tenantId: 'rona_atlantic', isActive: true, status: 'Parked', currentLatitude: 44.9800, currentLongitude: -63.5050 },
  { id: '1901 - Elmsdale HH', name: '1901 - Elmsdale HH', type: 'Heavy-Duty Flatbed', driver: 'No Driver', branchId: 'RONA-03485', tenantId: 'rona_atlantic', isActive: true, status: 'Parked', currentLatitude: 44.9780, currentLongitude: -63.5070 },
  { id: '1702 - Elmsdale HH', name: '1702 - Elmsdale HH', type: 'Heavy-Duty Flatbed', driver: 'Chris Fraser', branchId: 'RONA-03485', tenantId: 'rona_atlantic', isActive: true, status: 'In Transit', currentLatitude: 44.9815, currentLongitude: -63.5035 },
  { id: '701 - Elmsdale T/A Flatdeck', name: '701 - Elmsdale T/A Flatdeck', type: '2020 Peterbilt 337 Tandem-Axle Flatbed', driver: 'Dave Higgins', branchId: 'RONA-03485', tenantId: 'rona_atlantic', isActive: true, status: 'In Transit', currentLatitude: 44.9792, currentLongitude: -63.5048 },
  { id: '1903 - Elmsdale Windows', name: '1903 - Elmsdale Windows', type: 'Curtain-side Flatbed', driver: 'Travis Vickers', branchId: 'RONA-03485', tenantId: 'rona_atlantic', isActive: true, status: 'In Transit', currentLatitude: 44.9805, currentLongitude: -63.5055 },
  { id: '2409 - Elmsdale F150', name: '2409 - Elmsdale F150', type: '2024 Ford F-150 XLT 4x4', driver: 'Mike MacDonald', branchId: 'RONA-03485', tenantId: 'rona_atlantic', isActive: true, status: 'In Transit', currentLatitude: 44.9798, currentLongitude: -63.5042 },
  { id: '2101 - Dartmouth F150', name: '2101 - Dartmouth F150', type: 'Fleet Pickup Truck 4x4', driver: 'Bob Rafters', branchId: 'RONA-03510', tenantId: 'rona_atlantic', isActive: true, status: 'In Transit', currentLatitude: 44.6909, currentLongitude: -63.5985 },
  { id: '2401 - Halifax F150', name: '2401 - Halifax F150', type: '2024 Ford F-150 SuperCrew 4x4 (Almon OSR)', driver: 'No Driver', branchId: 'RONA-03480', tenantId: 'rona_atlantic', isActive: true, status: 'Parked', currentLatitude: 44.6896, currentLongitude: -63.5976 },
  { id: '2408 - Halifax F150 OSR', name: '2408 - Halifax F150 OSR', type: '2024 Ford F-150 XL 4x4 (Halifax OSR)', driver: 'No Driver', branchId: 'RONA-03480', tenantId: 'rona_atlantic', isActive: true, status: 'Parked', currentLatitude: 44.6890, currentLongitude: -63.5970 },
  { id: '2410 - Tantallon F150', name: '2410 - Tantallon F150', type: 'Fleet Pickup Truck 4x4', driver: 'No Driver', branchId: 'RONA-03490', tenantId: 'rona_atlantic', isActive: true, status: 'Parked', currentLatitude: 44.6854, currentLongitude: -63.8824 },
  { id: '2412 - Tantallon Ranger', name: '2412 - Tantallon Ranger', type: '2024 Ford Ranger XLT 4x4', driver: 'No Driver', branchId: 'RONA-03490', tenantId: 'rona_atlantic', isActive: true, status: 'Parked', currentLatitude: 44.6860, currentLongitude: -63.8830 }
];

export const DEFAULT_USERS: User[] = [
  {
    id: 'USR-10524',
    tenantId: 'rona_atlantic',
    name: 'George Campbell',
    email: 'george.campbell@ronadartmouth.ca',
    role: 'Admin',
    phone: '',
    associatedStoreId: 'RONA-03510',
    password: 'Password123!',
    status: 'Active'
  },
  {
    id: 'USR-75341',
    tenantId: 'rona_atlantic',
    name: 'Bob Rafters',
    email: 'bob.rafters@ronadartmouth.ca',
    role: 'Driver',
    phone: '',
    associatedStoreId: 'RONA-03510',
    password: 'Password123!',
    status: 'Active'
  },
  {
    id: 'USR-1112',
    tenantId: 'rona_atlantic',
    name: 'Travis Vickers',
    email: 'travis.vickers@ronaelsmdale.ca',
    role: 'Driver',
    phone: '',
    associatedStoreId: 'RONA-03485',
    password: 'Password123!',
    status: 'Active'
  }
];

export const DEFAULT_DELIVERIES: DeliveryRecord[] = [
  {
    id: 'DEL-300908',
    tenantId: 'rona_atlantic',
    orderNumber: '300908',
    customerName: 'GEORGE CAMPBELL',
    customerPhone: '902-476-8800',
    deliveryAddress: '17 SPARROW LANE  HUBLEY   NS B3Z 1A3',
    originBranch: 'RONA-03510',
    assignedTruck: '2503 - Elmsdale 6X Boom',
    assignedDriver: 'No Driver',
    status: 'DELIVERED',
    priority: 'Medium',
    scheduledDate: '2026-08-17',
    scheduledSlot: 'AM',
    deliveryCategory: 'Retail',
    items: [
      {
        sku: 'R-709',
        description: '2x4x8 SPF Premium Lumber',
        quantity: 120,
        weightKg: 450,
        volumeM3: 1.8,
        isHazardous: false
      }
    ],
    history: [
      {
        status: 'REGISTERED',
        timestamp: '2026-08-17T10:18:53.214Z',
        location: 'RONA Dartmouth',
        operator: 'Azure OCR Automate Stream',
        notes: 'Ingested automatically into logistics. Ready for truck pre-allocation or dispatch.'
      },
      {
        status: 'DELIVERED',
        timestamp: '2026-08-17T13:24:25.469Z',
        location: '17 SPARROW LANE HUBLEY NS B3Z 1A3',
        operator: 'Bob Rafters',
        notes: 'Proof of Delivery completed & signed by George Campbell'
      }
    ]
  }
];

