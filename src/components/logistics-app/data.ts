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

export const DEFAULT_TRUCKS: Truck[] = [];

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

