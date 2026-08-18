export interface VehicleTelemetryData {
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
  speed: number; // km/h or mph
  speedMph?: number;
  heading: number; // degrees (0-360)
  ignitionStatus: 'ON' | 'IDLE' | 'OFF';
  ignitionOn?: boolean;
  fuelLevel: number; // percentage (0-100)
  fuelPercent?: number;
  odometer: number; // km or miles
  batteryVoltage?: number;
  coolantTemp?: number;
  lastUpdated: string;
}

export interface DriverInfo {
  id: string;
  name: string;
  phone?: string;
  avatar?: string;
}

export interface TruckMetadata {
  vehicleId: string;
  truckName: string;
  vin?: string;
  licensePlate: string;
  model?: string;
  capacityWeight?: number;
  status: 'MOVING' | 'IDLE' | 'STOPPED' | 'OFF';
  driver?: DriverInfo;
  storeId?: string;
  storeName?: string;
  colorCode?: string;
}

export interface RouteStop {
  id: string;
  stopNumber: number;
  customerName: string;
  address: string;
  lat: number;
  lng: number;
  status: 'COMPLETED' | 'ACTIVE' | 'PENDING';
  estimatedArrival?: string;
  itemsCount?: number;
  notes?: string;
}

export interface ActiveRouteInfo {
  routeId: string;
  driverName?: string;
  driverId?: string;
  driverPhone?: string;
  scheduledETA?: string;
  eta?: string;
  nextStop?: string;
  remainingDistance?: string;
  remainingDuration?: string;
  totalStops: number;
  completedStops: number;
  stops?: RouteStop[];
}

export interface VehicleRecord {
  vehicleId: string;
  truckName: string;
  vin?: string;
  licensePlate: string;
  model?: string;
  capacityWeight?: number;
  status: 'MOVING' | 'IDLE' | 'STOPPED' | 'OFF';
  driver?: DriverInfo;
  telematics: VehicleTelemetryData;
  telemetry?: VehicleTelemetryData;
  activeRoute?: ActiveRouteInfo | null;
}

export interface TelematicsFleetSummary {
  totalVehicles: number;
  movingCount: number;
  idleCount: number;
  stoppedCount: number;
  averageSpeed: number;
  averageFuelLevel: number;
  totalActiveDeliveries: number;
}

export interface TelematicsApiResponse {
  success: boolean;
  count?: number;
  timestamp: string;
  source?: 'live_telematics' | 'fleet_complete' | 'in_memory' | string;
  summary?: TelematicsFleetSummary;
  vehicles: VehicleRecord[];
}
