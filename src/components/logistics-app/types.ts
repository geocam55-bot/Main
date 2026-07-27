export enum DeliveryStatus {
  REGISTERED = 'REGISTERED',
  PICKED_AND_LOADED = 'PICKED_AND_LOADED',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED'
}

export interface DeliveryRecord {
  id: string; // Barcode ID (e.g., SO-10293-A)
  invoiceNumber: string;
  epicorSalesOrder: string;
  customerName: string;
  deliveryAddress: string;
  phone: string;
  originBranch: string; // WINDMILL_DC or specific Store
  weight?: string;
  orderTotal?: string;
  destinationNotes?: string;
  status: DeliveryStatus;
  registeredAt: string;
  pickedAt?: string;
  deliveredAt?: string;
  returnedAt?: string;
  returnReason?: string;
  assignedTruck?: string;
  assignedDriver?: string;
  assignedPicker?: string;
  customerSignature?: string; // Base64 or live SVG string
  deliveryPhoto?: string; // Live image description or actual asset URL
  pdfUrl?: string; // Link to the uploaded physical invoice/receipt PDF
  documentType?: string; // E.g., 'Supplier Pickup', 'Order', 'Credit', 'RMA'
  history: HistoryEvent[];
  tenantId?: string;
}

export interface HistoryEvent {
  status: DeliveryStatus;
  timestamp: string;
  location: string;
  operator: string;
  notes?: string;
}

export interface Branch {
  id: string;
  name: string;
  type: 'STORE' | 'DC';
  address: string;
  tenantId?: string;

  // Additional Store / Depot properties
  branchCode?: string;
  branchName?: string;
  branchType?: 'STORE' | 'DC' | 'Depot' | 'Warehouse' | 'Pickup';
  address1?: string;
  address2?: string;
  city?: string;
  provinceState?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phoneNumber?: string;
  email?: string;
  managerUserId?: string;
  operatingHours?: string;
  timeZone?: string;
  loadingDockCount?: number;
  truckCapacity?: number;
  geofenceRadiusMeters?: number;
  isActive?: boolean;
  createdDate?: string;
  updatedDate?: string;
  
  // Logistics properties
  inventoryCapacity?: number;
  coldStorageAvailable?: boolean;
  crossDockFacility?: boolean;
  hazmatCertified?: boolean;
  fuelStationAvailable?: boolean;
  maintenanceFacilityAvailable?: boolean;
}

export interface Truck {
  id: string;
  name: string;
  type: string;
  driver: string;
  branchId: string; // Associated branch/DC (e.g. WINDMILL_DC or 01075_TANTALLON)
  vin?: string;
  userField1?: string;
  userField2?: string;
  registrationDueDate?: string;
  lat?: number;
  lng?: number;
  tenantId?: string;
  gpsSource?: 'mobile' | 'truck';
  gpsDeviceId?: string;
  gpsSerialNumber?: string;
  gpsDeviceName?: string;
  gpsSimIccid?: string;
  gpsStatus?: string;
  gpsLastHandshake?: string;
  gpsSpeed?: number;
  gpsIdlingMins?: number;
  gpsLat?: number;
  gpsLng?: number;

  // Commercial Logistics Tracking properties
  truckNumber?: string;
  licensePlate?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  vehicleType?: string;
  capacityWeightKg?: number;
  capacityVolumeM3?: number;
  fuelType?: string;
  fuelTankCapacity?: number;
  currentMileage?: number;
  lastServiceDate?: string;
  nextServiceDueDate?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: string;
  registrationExpiryDate?: string;
  assignedDriverId?: string;
  isRefrigerated?: boolean;
  isLiftgateEquipped?: boolean;
  isActive?: boolean;
  createdDate?: string;
  updatedDate?: string;
  fuelConsumption?: number;
  engineHours?: number;
  idleTime?: number;
  tirePressure?: string;
  oilLevel?: number;
  batteryHealth?: string;
  vehicleHealthScore?: number;
  maintenanceStatus?: string;
  safetyInspectionStatus?: string;
}

export interface ApiConnection {
  id: string;
  provider_name: string;
  connection_type: 'api_key' | 'token';
  api_url: string;
  api_key?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  client_id?: string;
  client_secret?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'Driver' | 'Picker' | 'Dispatcher' | 'User' | 'Admin' | 'SUPER_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  associatedStoreId?: string; // Links user to a dynamic store/branch
  password?: string;
  status?: 'Active' | 'Suspended' | 'Terminated' | 'Inactive';
  driverLicenseExpire?: string;
  tenantId?: string;
  lastActive?: string;
  resetRequest?: string;
  avatarUrl?: string;

  // Supabase Users Table layouts
  employeeNumber?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  mobilePhone?: string;
  alternatePhone?: string;
  passwordHash?: string;
  roleId?: string;
  branchId?: string;
  department?: string;
  jobTitle?: string;
  driverLicenseNumber?: string;
  driverLicenseClass?: string;
  driverLicenseExpiry?: string;
  hireDate?: string;
  gpsDeviceId?: string;
  lastLoginDate?: string;
  profilePhotoUrl?: string;
  preferredLanguage?: string;
  timeZone?: string;
  isAvailable?: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  createdDate?: string;
  updatedDate?: string;
  createdBy?: string;
  updatedBy?: string;

  // Modern App Features
  currentLatitude?: number;
  currentLongitude?: number;
  currentStatus?: string;
  batteryLevel?: number;
  deviceType?: string;
  mobileAppVersion?: string;
  pushNotificationToken?: string;
}

export interface Tenant {
  id: string;
  name: string;
  code: string;
  description: string;
  logoBadge: string;
  regionalFocus: string;
  primaryColor: 'blue' | 'emerald' | 'indigo' | 'slate';
}

export interface Route {
  id: string;
  truckId: string;
  driverId: string;
  routeDate: string;
  plannedDistance?: number;
  actualDistance?: number;
  estimatedDuration?: string;
  actualDuration?: string;
}

export interface RouteStop {
  id: string;
  routeId: string;
  sequenceNumber: number;
  branchId: string;
  arrivalTime?: string;
  departureTime?: string;
  status?: string;
}

export interface Geofence {
  id: string;
  name: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  branchId?: string;
}

export interface DriverBehaviour {
  id: string;
  driverId: string;
  eventTime: string;
  eventType: string; // Speeding, Harsh Braking, Rapid Acceleration, Cornering, Phone Use, Seatbelt Use
  severity?: 'Low' | 'Medium' | 'High';
  points?: number;
}

export interface VehicleMaintenance {
  id: string;
  truckId: string;
  serviceDate: string;
  serviceType: string;
  mileage?: number;
  cost?: number;
  vendor?: string;
}


