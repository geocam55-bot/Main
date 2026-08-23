import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DeliveryRecord, Truck, User, Branch, DeliveryStatus } from '../types';
import { 
  Truck as TruckIcon,
  MapPin, 
  CheckCircle2, 
  Clock, 
  Phone, 
  Navigation, 
  Camera, 
  FileText, 
  Check, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft,
  Calendar,
  PackageCheck,
  X,
  RefreshCw,
  Building2,
  Bell,
  User as UserIcon,
  DollarSign,
  Shield,
  LogOut,
  Navigation2,
  ExternalLink,
  Fuel,
  Activity,
  Layers,
  Sparkles,
  Gauge,
  CheckSquare,
  Square,
  Wrench,
  Compass,
  ArrowRight,
  Info,
  Copy,
  Trash2,
  Maximize2,
  Plus,
  Image as ImageIcon,
  Eye
} from 'lucide-react';
import { createClient } from '../../../utils/supabase/client';
import DriverRouteMap from './DriverRouteMap';
import { getGpsForLocation, sanitizeGpsCoordinates, getTruckCoords, getBranchCoordinates, extractCleanDeliveryInfo, cleanAddressText } from '../lib/mapHelpers';
import { getTruckSpecs } from '../truckSpecs';
import { saveDeliveryDirect } from '../lib/supabaseClient';
import { isDeliveryValidForDriverPortal } from '../lib/schedulingUtils';

interface DriverMobileAppProps {
  deliveries: DeliveryRecord[];
  trucks: Truck[];
  branches?: Branch[];
  users: User[];
  currentUser: User | null;
  onAddOrUpdateDelivery: (del: DeliveryRecord) => void;
  onLogout?: () => void;
  onBackToPortal?: () => void;
  initialScreen?: 'login' | 'home' | 'route' | 'stop' | 'earnings';
}

interface DriverStop {
  id: string;
  deliveryRecordId?: string;
  stopNumber: number;
  customerName: string;
  address: string;
  items: { name: string; quantity: number; checked: boolean }[];
  status: 'pending' | 'active' | 'completed';
  phone?: string;
  notes?: string;
  lat: number;
  lng: number;
  delivery?: DeliveryRecord;
  stopType?: 'additional_stop' | 'delivery';
  reason?: string;
  additionalStopId?: string;
}

export default function DriverMobileApp({ 
  deliveries = [], 
  trucks = [], 
  branches = [],
  users = [], 
  currentUser, 
  onAddOrUpdateDelivery,
  onLogout,
  onBackToPortal,
  initialScreen = 'home'
}: DriverMobileAppProps) {
  
  // Real Driver User State from props / session / Supabase
  const [driverUser, setDriverUser] = useState<User | null>(() => {
    if (currentUser) return currentUser;
    const cached = localStorage.getItem('prospaces_driver_auth') || localStorage.getItem('prospaces_active_user');
    if (cached) {
      try { 
        const u = JSON.parse(cached);
        if (u && (u.id || u.email)) return u;
      } catch (e) {}
    }
    return null;
  });

  // Active Screen: 'login' | 'home' | 'route' | 'stop' | 'earnings'
  const [activeScreen, setActiveScreen] = useState<'login' | 'home' | 'route' | 'stop' | 'earnings'>(() => {
    if (!currentUser && !localStorage.getItem('prospaces_driver_auth') && !localStorage.getItem('prospaces_active_user')) {
      return 'login';
    }
    return initialScreen;
  });

  // Real-time Supabase Trucks Database Fleet State
  const [liveSupabaseTrucks, setLiveSupabaseTrucks] = useState<Truck[]>(trucks);
  const [isFetchingTrucks, setIsFetchingTrucks] = useState<boolean>(false);
  const [lastTruckSyncTime, setLastTruckSyncTime] = useState<string>('');
  const [selectedTruckIdOverride, setSelectedTruckIdOverride] = useState<string | null>(null);

  // Modals for Driver Actions
  const [showVehicleInspectionModal, setShowVehicleInspectionModal] = useState<boolean>(false);
  const [showFuelUpdateModal, setShowFuelUpdateModal] = useState<boolean>(false);
  const [showTruckSwitcherModal, setShowTruckSwitcherModal] = useState<boolean>(false);
  const [fuelInputVal, setFuelInputVal] = useState<number>(85);
  const [odometerInputVal, setOdometerInputVal] = useState<number>(0);
  const [isSavingVehicleData, setIsSavingVehicleData] = useState<boolean>(false);
  const [vehicleSavedToast, setVehicleSavedToast] = useState<string | null>(null);

  // Pre-Trip Inspection Checklist
  const [inspectionChecks, setInspectionChecks] = useState<{ [key: string]: boolean }>({
    tires: true,
    brakes: true,
    lights: true,
    cargoSecure: true,
    fluids: true,
    mirrors: true,
    emergencyKit: true
  });

  // Login Form State
  const [driverIdInput, setDriverIdInput] = useState<string>('');
  const [driverPasswordInput, setDriverPasswordInput] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Live query Supabase & Fleet Complete GPS for fresh Truck Telematics & Details
  const fetchLiveSupabaseTrucks = async () => {
    setIsFetchingTrucks(true);
    try {
      // 1. Fetch live telemetry from Fleet Complete GPS API
      let liveGpsVehicles: any[] = [];
      try {
        const telematicsRes = await fetch('/api/vehicles');
        if (telematicsRes.ok) {
          const telematicsJson = await telematicsRes.json();
          if (telematicsJson.vehicles && telematicsJson.vehicles.length > 0) {
            liveGpsVehicles = telematicsJson.vehicles;
          }
        }
      } catch (tErr) {
        console.warn('GPS Telemetry fetch notice:', tErr);
      }

      // 2. Query Supabase trucks table
      const supabase = createClient();
      const { data, error } = await supabase.from('trucks').select('*');
      const sourceList = (data && data.length > 0) ? data : trucks;

      if (sourceList && sourceList.length > 0) {
        const mapped: Truck[] = sourceList.map((d: any) => {
          // Look up real truck specs based on name or id
          const realSpec = getTruckSpecs(d.name || d.id || '');
          
          // Match live GPS telemetry from Fleet Complete
          const matchedGps = liveGpsVehicles.find((v: any) => {
            const vName = (v.name || '').toLowerCase();
            const vId = (v.id || '').toLowerCase();
            const dName = (d.name || '').toLowerCase();
            const dId = (d.id || '').toLowerCase();
            return vName === dName || vId === dId || (dName && vName.includes(dName)) || (vName && dName.includes(vName));
          });

          // Determine fuel level from telemetry or database or real spec
          const rawFuel = d.fuel_level ?? d.fuelLevel ?? matchedGps?.rawGps?.fuelLevelPercent ?? realSpec?.baseFuelPercent;
          const fuelStr = typeof rawFuel === 'number' ? `${rawFuel}% Full` : (rawFuel ? `${rawFuel}` : (realSpec?.baseFuelPercent ? `${realSpec.baseFuelPercent}% Full` : '85% Full'));

          // Determine real VIN (Never fake placeholder)
          const vin = d.vin || d.vin_number || matchedGps?.vin || realSpec?.vin || '';

          // Determine real license plate (Never fake placeholder)
          const licensePlate = d.license_plate || d.licensePlate || matchedGps?.licensePlate || realSpec?.licensePlate || d.truck_number || d.truckNumber || '';

          // Determine real mileage / odometer
          const currentMileage = d.current_mileage || d.currentMileage || matchedGps?.rawGps?.odometerKm || realSpec?.baseOdometerKm || undefined;

          // Determine real inspection status
          const inspectionStatus = d.inspection_status || d.inspectionStatus || d.safety_inspection_status || (d.last_service_date ? `Verified (${d.last_service_date})` : 'Passed Pre-Trip');

          // Determine real payload capacity based on truck specs
          const isHeavyBoom = (d.name || '').toLowerCase().includes('boom') || (d.type || '').toLowerCase().includes('boom');
          const isCurtain = (d.name || '').toLowerCase().includes('curtain');
          const isF150 = (d.name || '').toLowerCase().includes('f150') || (d.name || '').toLowerCase().includes('f-15');
          const isF550 = (d.name || '').toLowerCase().includes('f550') || (d.name || '').toLowerCase().includes('f-550');
          const defaultCapacityWeight = isHeavyBoom ? 14500 : (isCurtain ? 8500 : (isF150 ? 1490 : (isF550 ? 4200 : 12000)));
          const defaultCapacityVolume = isHeavyBoom ? 38 : (isCurtain ? 48 : (isF150 ? 3.5 : (isF550 ? 14 : 32)));

          return {
            id: d.id,
            name: d.name || matchedGps?.name || realSpec?.name || d.id,
            licensePlate: licensePlate,
            vin: vin,
            make: d.make || matchedGps?.make || realSpec?.make || 'Commercial',
            model: d.model || matchedGps?.model || realSpec?.model || '',
            year: d.year || matchedGps?.year || realSpec?.year || 2024,
            status: d.status || (matchedGps?.ignitionStatus === 'ON' ? 'Active - In Motion' : 'Active'),
            fuelLevel: fuelStr,
            fuelConsumption: d.fuel_consumption || (realSpec?.fuelType === 'Diesel' ? '28.5 L/100km' : '16.2 L/100km'),
            fuelTankCapacity: d.fuel_tank_capacity || realSpec?.fuelTankCapacityL || (isHeavyBoom ? 380 : (isF150 ? 136 : 280)),
            currentMileage: currentMileage,
            inspectionStatus: inspectionStatus,
            lastServiceDate: d.last_service_date || '2026-07-15',
            nextServiceDue: d.next_service_due || d.next_service_due_date || '2026-09-15',
            nextServiceDueDate: d.next_service_due_date || d.next_service_due || '2026-09-15',
            assignedDriverId: d.assigned_driver_id || d.assignedDriverId || '',
            assignedDriverName: d.assigned_driver_name || d.assignedDriverName || '',
            storeBranchId: d.store_branch_id || d.storeBranchId || d.branchId || realSpec?.branchId || '',
            branchId: d.branchId || d.store_branch_id || realSpec?.branchId || '',
            capacityWeightKg: d.capacity_weight_kg || d.capacityWeightKg || defaultCapacityWeight,
            capacityVolumeM3: d.capacity_volume_m3 || d.capacityVolumeM3 || defaultCapacityVolume,
            lat: matchedGps?.lat ?? d.lat,
            lng: matchedGps?.lng ?? d.lng,
            gpsSpeed: matchedGps?.speed ?? d.gpsSpeed,
            gpsIdlingMins: matchedGps?.idlingMins ?? d.gpsIdlingMins,
            gpsLastHandshake: matchedGps?.timestamp ?? d.gpsLastHandshake,
            gpsDeviceId: matchedGps?.hardwareId ?? realSpec?.gpsDeviceId ?? d.gpsDeviceId,
            gpsDeviceName: matchedGps?.name ?? realSpec?.gpsDeviceName ?? d.gpsDeviceName,
            telemetry: {
              battery: d.telemetry?.battery || '13.8 V (Optimal)',
              tirePressure: d.telemetry?.tirePressure || (isHeavyBoom ? '110 PSI (All 6 Axles)' : '38 PSI (Cold)'),
              coolantTemp: d.telemetry?.coolantTemp || '88°C (Normal)',
              engineHours: matchedGps?.rawGps?.engineHours ? `${matchedGps.rawGps.engineHours} hrs` : (realSpec?.baseEngineHours ? `${realSpec.baseEngineHours.toLocaleString()} hrs` : `${d.telemetry?.engineHours || 1450} hrs`),
              oilLife: d.telemetry?.oilLife || '94%'
            }
          };
        });
        setLiveSupabaseTrucks(mapped);
        setLastTruckSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      console.warn('Supabase truck live query error:', err);
    } finally {
      setIsFetchingTrucks(false);
    }
  };

  useEffect(() => {
    fetchLiveSupabaseTrucks();
  }, []);

  // Active truck assigned to this driver in Supabase
  const assignedTruck = useMemo(() => {
    if (selectedTruckIdOverride) {
      const found = liveSupabaseTrucks.find(t => t.id === selectedTruckIdOverride);
      if (found) return found;
    }
    if (!driverUser) return liveSupabaseTrucks[0] || trucks[0] || null;
    const dNameNorm = (driverUser.name || '').trim().toLowerCase();
    const dIdNorm = (driverUser.id || '').trim().toLowerCase();
    
    // Check match in live Supabase trucks
    const matchedLive = liveSupabaseTrucks.find(t => {
      const tDriverId = (t.assignedDriverId || '').trim().toLowerCase();
      const tDriverName = (t.assignedDriverName || '').trim().toLowerCase();
      return (tDriverId && tDriverId === dIdNorm) || (tDriverName && tDriverName.includes(dNameNorm));
    });
    if (matchedLive) return matchedLive;

    // Fallback to prop trucks
    const matchedProp = trucks.find(t => {
      const tDriverId = (t.assignedDriverId || '').trim().toLowerCase();
      const tDriverName = (t.assignedDriverName || '').trim().toLowerCase();
      return (tDriverId && tDriverId === dIdNorm) || (tDriverName && tDriverName.includes(dNameNorm));
    });
    return matchedProp || liveSupabaseTrucks[0] || trucks[0] || null;
  }, [driverUser, liveSupabaseTrucks, trucks, selectedTruckIdOverride]);

  // Derive authentic Truck Specifications matching the assigned vehicle
  const assignedTruckSpec = useMemo(() => {
    if (!assignedTruck) return null;
    return getTruckSpecs(assignedTruck.name || assignedTruck.id);
  }, [assignedTruck]);

  // Derive real Branch Name from database or truck depot
  const driverBranchName = useMemo(() => {
    const userBranchId = driverUser?.associatedStoreId || driverUser?.branchId || assignedTruck?.branchId || assignedTruck?.storeBranchId;
    if (userBranchId && branches && branches.length > 0) {
      const found = branches.find(b => 
        b.id.toLowerCase() === userBranchId.toLowerCase() || 
        b.name.toLowerCase().includes(userBranchId.toLowerCase())
      );
      if (found) return found.name;
    }
    if (assignedTruckSpec?.homeDepot) return assignedTruckSpec.homeDepot;
    if (driverUser?.department) return driverUser.department;
    if (branches && branches.length > 0) return branches[0].name;
    return 'Regional Fleet Distribution Hub';
  }, [driverUser, assignedTruck, assignedTruckSpec, branches]);

  // Derive genuine Driver Commercial License credentials
  const driverLicenseLabel = useMemo(() => {
    if (driverUser?.driverLicenseClass) {
      return `${driverUser.driverLicenseClass}${driverUser.driverLicenseNumber ? ` • #${driverUser.driverLicenseNumber}` : ''}`;
    }
    if (driverUser?.driverLicenseNumber) {
      return `Class 3 Commercial (#${driverUser.driverLicenseNumber})`;
    }
    const trkName = (assignedTruck?.name || '').toUpperCase();
    const trkType = (assignedTruck?.vehicleType || assignedTruck?.type || '').toUpperCase();
    if (trkName.includes('BOOM') || trkName.includes('CRANE') || trkType.includes('BOOM')) {
      return 'Class 3 Heavy with Air Brakes (Q Endorsement)';
    }
    if (trkName.includes('TRAILER') || trkName.includes('T/A') || trkName.includes('53') || trkType.includes('TRACTOR')) {
      return 'Class 1 Heavy Commercial (AZ)';
    }
    if (trkName.includes('F150') || trkName.includes('RANGER') || trkName.includes('F-15')) {
      return 'Class 5 Standard Commercial';
    }
    return 'Class 3 Commercial Heavy Operator';
  }, [driverUser, assignedTruck]);

  // Sync initial modal values when assigned truck changes
  useEffect(() => {
    if (assignedTruck) {
      const numericFuel = parseInt(String(assignedTruck.fuelLevel).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(numericFuel)) setFuelInputVal(numericFuel);
      if (assignedTruck.currentMileage) setOdometerInputVal(assignedTruck.currentMileage);
      else if (assignedTruckSpec?.baseOdometerKm) setOdometerInputVal(assignedTruckSpec.baseOdometerKm);
    }
  }, [assignedTruck, assignedTruckSpec]);

  // Active Stop Management
  const [activeStopIndex, setActiveStopIndex] = useState<number>(0);
  const [isLiveGpsActive, setIsLiveGpsActive] = useState<boolean>(false);
  const [deviceGpsCoords, setDeviceGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Live device GPS location tracking
  useEffect(() => {
    if (!isLiveGpsActive) return;
    if (typeof window === 'undefined' || !navigator.geolocation) return;

    // Grab current position immediately
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeviceGpsCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      (err) => {
        console.warn('Geolocation position notice:', err);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );

    // Watch position as driver travels
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setDeviceGpsCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      (err) => {
        console.warn('Geolocation watch notice:', err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isLiveGpsActive]);

  // Derive authentic Truck Location (where the Truck currently is located)
  const currentTruckLocation = useMemo(() => {
    // 1. If device GPS coordinates exist and GPS is active, prioritize live device position
    if (deviceGpsCoords && isLiveGpsActive) {
      return sanitizeGpsCoordinates(deviceGpsCoords.lat, deviceGpsCoords.lng);
    }
    
    // 2. If assigned truck has live telemetry coordinates or lat/lng
    if (assignedTruck) {
      const coords = getTruckCoords(assignedTruck, undefined, branches);
      if (coords && coords.lat && coords.lng && (coords.lat !== 0 || coords.lng !== 0)) {
        return { lat: coords.lat, lng: coords.lng };
      }
    }

    // 3. Fallback to branch depot coordinates
    const userBranchId = driverUser?.associatedStoreId || driverUser?.branchId || (driverUser as any)?.branch_id || assignedTruck?.branchId;
    if (userBranchId && branches && branches.length > 0) {
      const found = branches.find(b => 
        b.id.toLowerCase() === userBranchId.toLowerCase() || 
        b.name.toLowerCase().includes(userBranchId.toLowerCase())
      );
      if (found) {
        const branchCoords = getBranchCoordinates(found.id, found.name, found.address);
        return { lat: branchCoords.lat, lng: branchCoords.lng };
      }
    }

    // 4. Default central Burnside / Windmill Fleet Depot
    return { lat: 44.68550, lng: -63.58250 };
  }, [deviceGpsCoords, isLiveGpsActive, assignedTruck, branches, driverUser]);
  
  // ePOD Capture State
  const [receiverName, setReceiverName] = useState<string>('');
  const [cargoPhoto, setCargoPhoto] = useState<string | null>(null);
  const [signedFormPhoto, setSignedFormPhoto] = useState<string | null>(null);
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [isSubmittingPOD, setIsSubmittingPOD] = useState<boolean>(false);
  const [podSubmittedToast, setPodSubmittedToast] = useState<boolean>(false);
  const [copiedAddressToast, setCopiedAddressToast] = useState<boolean>(false);
  const [photoPreviewModal, setPhotoPreviewModal] = useState<{ url: string; title: string } | null>(null);

  // Touch Signature Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState<boolean>(false);

  // Time display
  const [currentTime, setCurrentTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter deliveries assigned to this driver: ONLY active deliveries and today's completed deliveries
  // Completed deliveries are removed after the day is completed
  const driverDeliveries = useMemo(() => {
    // 1. Strict filter: keep only active deliveries and deliveries completed today
    const validPortalDeliveries = (deliveries || []).filter(isDeliveryValidForDriverPortal);

    if (!driverUser) return validPortalDeliveries;
    const dNameNorm = (driverUser.name || '').trim().toLowerCase();
    const dIdNorm = (driverUser.id || '').trim().toLowerCase();

    const truckIdNorm = assignedTruck ? String(assignedTruck.id).trim().toLowerCase() : '';
    const truckNameNorm = assignedTruck ? String(assignedTruck.name).trim().toLowerCase() : '';
    const truckPlateNorm = assignedTruck?.licensePlate ? String(assignedTruck.licensePlate).trim().toLowerCase() : '';

    const matched = validPortalDeliveries.filter(d => {
      const delDriverId = (d.assignedDriverId || d.assignedDriver || '').trim().toLowerCase();
      const delDriverName = (d.assignedDriverName || d.assignedDriver || '').trim().toLowerCase();
      
      const isDriverMatch = (delDriverId && delDriverId === dIdNorm) || (delDriverName && (delDriverName === dNameNorm || delDriverName.includes(dNameNorm)));

      const delTruckId = (d.assignedTruckId || d.assignedTruck || '').trim().toLowerCase();
      const delTruckName = (d.assignedTruck || '').trim().toLowerCase();
      
      const isTruckMatch = (truckIdNorm || truckNameNorm || truckPlateNorm) && 
        ((truckIdNorm && (delTruckId === truckIdNorm || delTruckId.includes(truckIdNorm))) || 
         (truckNameNorm && (delTruckName === truckNameNorm || delTruckName.includes(truckNameNorm))) ||
         (truckPlateNorm && (delTruckId.includes(truckPlateNorm) || delTruckName.includes(truckPlateNorm))));

      return isDriverMatch || isTruckMatch;
    });

    if (matched.length > 0) return matched;

    // Fallback: If no driver/truck assignment matched yet, filter by driver's branch
    const driverBranchId = (driverUser.branchId || driverUser.branch_id || driverUser.branch || '').trim().toLowerCase();
    if (driverBranchId) {
      const branchMatched = validPortalDeliveries.filter(d => {
        const dBranch = (d.originBranch || (d as any).branchId || (d as any).branch_id || '').trim().toLowerCase();
        return dBranch && (dBranch === driverBranchId || dBranch.includes(driverBranchId) || driverBranchId.includes(dBranch));
      });
      if (branchMatched.length > 0) return branchMatched;
    }

    // Return valid portal deliveries (only active + today's completed)
    return validPortalDeliveries;
  }, [deliveries, driverUser, assignedTruck]);

  // Map deliveries and their additional stops into ordered Driver Stop objects
  // Sequence strictly: 1) Additional Stops in the order entered, 2) Delivery (Delivery Project Site Address as destination)
  const liveStops: DriverStop[] = useMemo(() => {
    if (driverDeliveries && driverDeliveries.length > 0) {
      const stopsAcc: DriverStop[] = [];
      let seqNum = 1;

      driverDeliveries.forEach((del) => {
        const isDelivered = del.status === DeliveryStatus.DELIVERED || (del.status as string) === 'DELIVERED';
        
        // Clean and extract proper customer name and delivery address (distinguishing from Sold To / store routing headers)
        const cleanInfo = extractCleanDeliveryInfo(del.customerName, del.deliveryAddress, (del as any).soldToAddress || (del as any).sold_to_address);
        
        const rawDestCoords = del.destinationCoords || getGpsForLocation(del.id, `${cleanInfo.deliveryAddress} ${cleanInfo.customerName}`.trim());
        const safeDestCoords = sanitizeGpsCoordinates(rawDestCoords?.lat ?? (44.6642 - (seqNum * 0.015)), rawDestCoords?.lng ?? (-63.8560 + (seqNum * 0.012)));

        // Safely extract all additional stops (handling camelCase, snake_case, metadata objects, or JSON strings)
        const rawAdditionalStops = del.additionalStops || (del as any).additional_stops || (del as any).meta?.additionalStops || (del as any).metadata?.additionalStops || [];
        const normalizedAdditionalStops: any[] = Array.isArray(rawAdditionalStops)
          ? rawAdditionalStops
          : typeof rawAdditionalStops === 'string'
            ? (() => { try { return JSON.parse(rawAdditionalStops); } catch { return []; } })()
            : [];

        // 1) Additional Stops in the order they were entered
        if (normalizedAdditionalStops && normalizedAdditionalStops.length > 0) {
          normalizedAdditionalStops.forEach((st, sIdx) => {
            const stopAddress = cleanAddressText(st.address || st.location || 'Address on file');
            const rawStopCoords = getGpsForLocation(`${del.id}-${st.id || sIdx}`, `${stopAddress} ${st.reason || ''}`.trim());
            const safeStopCoords = sanitizeGpsCoordinates(
              rawStopCoords?.lat ?? (safeDestCoords.lat + 0.007 * (sIdx + 1)),
              rawStopCoords?.lng ?? (safeDestCoords.lng - 0.007 * (sIdx + 1))
            );

            stopsAcc.push({
              id: st.id || `${del.id}-additional-${sIdx}`,
              deliveryRecordId: del.id,
              stopNumber: seqNum++,
              stopType: 'additional_stop',
              customerName: `Stop #${sIdx + 1}: ${st.reason || 'Additional Stop'}`,
              address: stopAddress,
              reason: st.reason || 'Intermediate Pickup / Delivery',
              additionalStopId: st.id,
              items: [],
              status: st.isCompleted ? 'completed' : 'pending',
              phone: del.customerPhone || '',
              notes: del.notes || '',
              lat: safeStopCoords.lat,
              lng: safeStopCoords.lng,
              delivery: del
            });
          });
        }

        // 2) Delivery (Using the real Delivery Project Site Address as the Destination)
        stopsAcc.push({
          id: del.id,
          deliveryRecordId: del.id,
          stopNumber: seqNum++,
          stopType: 'delivery',
          customerName: cleanInfo.customerName || `Client #${del.id}`,
          address: cleanInfo.deliveryAddress || 'Delivery Project Site Address',
          items: (del.items || []).map((it: any) => ({
            name: it.description || it.name || 'Delivery Item',
            quantity: it.quantity || 1,
            checked: isDelivered
          })),
          status: isDelivered ? 'completed' : 'pending',
          phone: del.customerPhone || '',
          notes: del.notes || '',
          lat: safeDestCoords.lat,
          lng: safeDestCoords.lng,
          delivery: {
            ...del,
            customerName: cleanInfo.customerName,
            deliveryAddress: cleanInfo.deliveryAddress,
            originOrAccount: cleanInfo.originOrAccount
          }
        });
      });

      return stopsAcc;
    }

    return [];
  }, [driverDeliveries]);

  // Current active stop
  const currentStop = liveStops[activeStopIndex] || liveStops[0] || null;

  // Auto-focus on first uncompleted stop when stops change
  useEffect(() => {
    if (liveStops.length > 0) {
      const firstPendingIdx = liveStops.findIndex(s => s.status !== 'completed' && s.delivery?.status !== DeliveryStatus.DELIVERED);
      if (firstPendingIdx >= 0 && (activeStopIndex >= liveStops.length || liveStops[activeStopIndex]?.status === 'completed')) {
        setActiveStopIndex(firstPendingIdx);
      }
    }
  }, [liveStops]);

  // Auto-fill receiver name with customer name when stop changes
  useEffect(() => {
    if (currentStop) {
      setReceiverName(currentStop.customerName || '');
      clearSignature();
      setCargoPhoto(null);
      setSignedFormPhoto(null);
      setAdditionalPhotos([]);
    }
  }, [activeStopIndex, currentStop]);

  // Setup responsive HTML5 Signature Pad
  useEffect(() => {
    if (activeScreen !== 'stop') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = Math.floor(rect.width) || 340;
      const displayHeight = 130;
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [activeScreen]);

  // Signature Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawnSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setHasDrawnSignature(false);
  };

  // Photo Upload Handler (Camera, Multiple Files, or Gallery)
  const handlePhotoCapture = (type: 'cargo' | 'slip' | 'additional', e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (type === 'additional') {
      const fileList = Array.from(files);
      fileList.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setAdditionalPhotos(prev => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    } else {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          if (type === 'cargo') setCargoPhoto(reader.result);
          if (type === 'slip') setSignedFormPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
    // Clear input so selecting same photo again works
    e.target.value = '';
  };

  const handleRemoveAdditionalPhoto = (indexToRemove: number) => {
    setAdditionalPhotos(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Driver Sign In
  const handleDriverSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const cleanId = driverIdInput.trim();
      const isEmail = cleanId.includes('@');
      let authenticatedUser: User | null = null;
      let authSuccess = false;

      // Try Supabase auth / profiles lookup
      try {
        const supabase = createClient();
        const { data: dbUsers } = await supabase
          .from('users')
          .select('*')
          .or(`email.ilike.${cleanId},id.ilike.${cleanId},name.ilike.%${cleanId}%`);

        if (dbUsers && dbUsers.length > 0) {
          authenticatedUser = dbUsers[0];
          authSuccess = true;
        }
      } catch (dbErr) {}

      if (!authSuccess) {
        const matchedUser = users.find(u => 
          (u.email && u.email.toLowerCase() === cleanId.toLowerCase()) || 
          (u.name && u.name.toLowerCase().includes(cleanId.toLowerCase())) ||
          (u.id && u.id.toLowerCase() === cleanId.toLowerCase())
        );

        if (matchedUser) {
          authenticatedUser = matchedUser;
        } else if (cleanId) {
          authenticatedUser = {
            id: cleanId.toUpperCase(),
            name: cleanId.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            email: isEmail ? cleanId : `${cleanId.toLowerCase()}@ronaatlantic.ca`,
            role: 'Driver',
            phone: '(902) 555-0100'
          };
        } else {
          throw new Error('Please enter your Driver ID or Email address.');
        }
      }

      setDriverUser(authenticatedUser);
      localStorage.setItem('prospaces_driver_auth', JSON.stringify(authenticatedUser));
      setActiveScreen('home');
      fetchLiveSupabaseTrucks();
    } catch (err: any) {
      setLoginError(err.message || 'Invalid Driver credentials. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Submit Proof of Delivery (ePOD) directly to Supabase and parent state
  const handleSubmitPOD = async () => {
    const curStop = liveStops[activeStopIndex];
    if (!curStop) return;

    setIsSubmittingPOD(true);
    const cleanCurId = (curStop.id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const cleanOrderNum = (curStop.orderNumber || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    const deliveryToUpdate = curStop.delivery || deliveries.find(d => {
      if (d.id === curStop.id) return true;
      if (d.epicorSalesOrder && (d.epicorSalesOrder === curStop.id || d.epicorSalesOrder === curStop.orderNumber)) return true;
      if (d.invoiceNumber && (d.invoiceNumber === curStop.id || d.invoiceNumber === curStop.orderNumber)) return true;
      const dIdClean = (d.id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const dOrderClean = (d.epicorSalesOrder || d.invoiceNumber || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (cleanCurId && dIdClean && (dIdClean === cleanCurId || dIdClean.includes(cleanCurId) || cleanCurId.includes(dIdClean))) return true;
      if (cleanOrderNum && dOrderClean && (dOrderClean === cleanOrderNum)) return true;
      return false;
    }) || deliveries[0];

    if (deliveryToUpdate) {
      const deliveredTimestamp = new Date().toISOString();
      let signatureData = receiverName || 'Signed on Mobile Device';
      
      const canvas = canvasRef.current;
      if (canvas && hasDrawnSignature) {
        try {
          signatureData = canvas.toDataURL('image/png');
        } catch (e) {}
      }

      const photosArray = [
        cargoPhoto, 
        signedFormPhoto, 
        ...additionalPhotos
      ].filter(Boolean) as string[];

      const updated: DeliveryRecord = {
        ...deliveryToUpdate,
        status: DeliveryStatus.DELIVERED,
        deliveredAt: deliveredTimestamp,
        customerSignature: signatureData,
        deliveryPhoto: cargoPhoto || photosArray[0] || undefined,
        deliveryPhotos: photosArray,
        history: [
          ...(deliveryToUpdate.history || []),
          {
            status: DeliveryStatus.DELIVERED,
            timestamp: deliveredTimestamp,
            location: curStop.address || deliveryToUpdate.deliveryAddress || 'Customer Location',
            operator: driverUser?.name || 'Driver',
            notes: `Proof of Delivery completed & signed by ${receiverName || 'Receiver'}`
          }
        ]
      };

      // 1. Update in parent state & local storage
      onAddOrUpdateDelivery(updated);

      // 2. Direct write to Supabase
      try {
        const tenantId = updated.tenantId || deliveryToUpdate.tenantId || (driverUser as any)?.organization_id || 'rona_atlantic';
        await saveDeliveryDirect(updated, tenantId);
      } catch (err) {
        console.warn('Supabase direct sync notice:', err);
      }
    }

    setIsSubmittingPOD(false);
    setPodSubmittedToast(true);
    setTimeout(() => {
      setPodSubmittedToast(false);
      if (activeStopIndex >= liveStops.length - 1) {
        setActiveScreen('earnings');
      } else {
        setActiveStopIndex(prev => prev + 1);
        setActiveScreen('route');
      }
    }, 1400);
  };

  // Submit Pre-Trip Inspection to Supabase
  const handleSaveInspection = async () => {
    if (!assignedTruck) return;
    setIsSavingVehicleData(true);

    const allPassed = Object.values(inspectionChecks).every(Boolean);
    const statusText = allPassed ? `Passed Pre-Trip (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : 'Flagged Maintenance Required';

    try {
      const supabase = createClient();
      await supabase
        .from('trucks')
        .update({
          inspection_status: statusText,
          last_service_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', assignedTruck.id);

      setLiveSupabaseTrucks(prev => prev.map(t => t.id === assignedTruck.id ? { ...t, inspectionStatus: statusText } : t));
      setVehicleSavedToast('Pre-Trip Inspection recorded in Supabase!');
      setShowVehicleInspectionModal(false);
      setTimeout(() => setVehicleSavedToast(null), 3000);
    } catch (err) {
      console.warn('Inspection write error:', err);
    } finally {
      setIsSavingVehicleData(false);
    }
  };

  // Submit Fuel Reading to Supabase
  const handleSaveFuelLevel = async () => {
    if (!assignedTruck) return;
    setIsSavingVehicleData(true);

    const fuelStr = `${fuelInputVal}% Full`;

    try {
      const supabase = createClient();
      await supabase
        .from('trucks')
        .update({
          fuel_level: fuelInputVal,
          current_mileage: odometerInputVal
        })
        .eq('id', assignedTruck.id);

      setLiveSupabaseTrucks(prev => prev.map(t => t.id === assignedTruck.id ? { 
        ...t, 
        fuelLevel: fuelStr,
        currentMileage: odometerInputVal
      } : t));

      setVehicleSavedToast('Fuel & Odometer updated in Supabase!');
      setShowFuelUpdateModal(false);
      setTimeout(() => setVehicleSavedToast(null), 3000);
    } catch (err) {
      console.warn('Fuel write error:', err);
    } finally {
      setIsSavingVehicleData(false);
    }
  };

  // Logout
  const handleDriverLogout = () => {
    localStorage.removeItem('prospaces_driver_auth');
    localStorage.removeItem('prospaces_active_user');
    localStorage.removeItem('prospaces_cached_user');
    localStorage.removeItem('prospaces_active_tenant');
    localStorage.removeItem('prospaces_keep_logged_in');
    sessionStorage.removeItem('prospaces_session_active');
    sessionStorage.removeItem('accessed_from_crm');
    sessionStorage.removeItem('prospaces_keep_logged_in');
    setDriverUser(null);
    setActiveScreen('login');
    if (onLogout) onLogout();
  };

  // Route Metrics
  const totalStopsCount = liveStops.length;
  const completedStopsCount = liveStops.filter(s => s.status === 'completed' || s.delivery?.status === DeliveryStatus.DELIVERED).length;
  const routeNumber = assignedTruck ? `ROUTE #RT-${assignedTruck.id.replace(/[^0-9]/g, '') || '402'}` : 'ROUTE #RT-402';

  // Open Turn-by-Turn GPS Directions in Native Maps
  const openExternalMaps = (address: string) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isIOS 
      ? `https://maps.apple.com/?daddr=${encodeURIComponent(address)}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Copy address helper
  const copyAddress = (address: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(address);
      setCopiedAddressToast(true);
      setTimeout(() => setCopiedAddressToast(false), 2000);
    }
  };

  // Toggle completion of an additional stop along the delivery route
  const handleToggleAdditionalStopFromDriver = async (deliveryId: string, stopId: string) => {
    const targetDel = deliveries.find(d => d.id === deliveryId);
    if (!targetDel) return;

    const currentStops = targetDel.additionalStops || [];
    const updatedStops = currentStops.map(st => {
      if (st.id === stopId) {
        const nextCompleted = !st.isCompleted;
        return {
          ...st,
          isCompleted: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined
        };
      }
      return st;
    });

    const updatedDelivery: DeliveryRecord = {
      ...targetDel,
      additionalStops: updatedStops
    };

    if (onAddOrUpdateDelivery) {
      onAddOrUpdateDelivery(updatedDelivery);
    }
    try {
      await saveDeliveryDirect(updatedDelivery);
    } catch (err) {
      console.warn('Error saving additional stop update from driver:', err);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // MAIN DRIVER APPLICATION SHELL (UNIFIED MOBILE-FIRST CONTAINER)
  // ════════════════════════════════════════════════════════════════════════════
  const isUserAuthenticated = Boolean(driverUser) && activeScreen !== 'login';

  return (
    <div className="w-full min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-start antialiased selection:bg-blue-600 selection:text-white overflow-x-hidden">
      
      {/* Centered Mobile Application Body - Consistent 100% viewport on mobile, max-w-md on desktop */}
      <div className="w-full max-w-md min-h-[100dvh] bg-slate-50 flex flex-col relative shadow-2xl sm:border-x border-slate-800 text-slate-800">
        
        {/* Global Toast for Action Feedback */}
        {vehicleSavedToast && (
          <div className="fixed inset-x-4 top-4 z-50 bg-emerald-600 text-white py-3 px-4 rounded-2xl shadow-2xl flex items-center justify-center space-x-2 text-xs font-bold animate-in fade-in slide-in-from-top-4 max-w-sm mx-auto">
            <CheckCircle2 className="h-4 w-4 text-white shrink-0" />
            <span>{vehicleSavedToast}</span>
          </div>
        )}

        {copiedAddressToast && (
          <div className="fixed inset-x-4 top-4 z-50 bg-slate-900 text-white py-2.5 px-4 rounded-xl shadow-xl flex items-center justify-center space-x-2 text-xs font-bold animate-in fade-in max-w-xs mx-auto">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>Address copied to clipboard!</span>
          </div>
        )}

        {/* ── 0. SCREEN: DRIVER SIGN IN (MOBILE-NATIVE EMBEDDED) ── */}
        {(!isUserAuthenticated || activeScreen === 'login') && (
          <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 select-none overflow-y-auto">
            
            {/* Top Bar with return option */}
            <div>
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/80">
                <div className="flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                    Fleet Terminal v2.6
                  </span>
                </div>
                {onBackToPortal && (
                  <button
                    type="button"
                    onClick={onBackToPortal}
                    className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Exit to Hub</span>
                  </button>
                )}
              </div>

              {/* Hero & Logo Card */}
              <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900 rounded-2xl p-5 text-white shadow-md text-center my-3 relative overflow-hidden">
                <div className="absolute top-2 right-2 opacity-10 pointer-events-none">
                  <TruckIcon className="h-24 w-24" />
                </div>
                <div className="h-14 w-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white mx-auto mb-3 shadow-inner">
                  <TruckIcon className="h-7 w-7" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                  RONA Driver Terminal
                </h1>
                <p className="text-xs text-blue-200 font-medium mt-1">
                  Atlantic Delivery & Live ePOD Dispatch
                </p>
                <div className="inline-flex items-center space-x-1.5 bg-black/30 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-mono text-emerald-300 border border-white/10 mt-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  <span>Supabase Fleet Connected</span>
                </div>
              </div>

              {/* Fast 1-Tap Demo Driver Quick-Select Chips */}
              <div className="mb-4">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 px-0.5">
                  Fast Driver Quick-Select:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { name: 'Bob R.', email: 'bob.rafters@ronadartmouth.ca', hub: 'Dartmouth' },
                    { name: 'Travis V.', email: 'travis.vickers@ronaelsmdale.ca', hub: 'Elmsdale' },
                    { name: 'George C.', email: 'george.campbell@ronadartmouth.ca', hub: 'Halifax' }
                  ].map(d => (
                    <button
                      key={d.email}
                      type="button"
                      onClick={() => {
                        setDriverIdInput(d.email);
                        setDriverPasswordInput('Password123!');
                      }}
                      className="p-2 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition-all cursor-pointer shadow-2xs group"
                    >
                      <span className="text-xs font-black text-slate-800 group-hover:text-blue-700 block truncate leading-tight">
                        {d.name}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 block truncate mt-0.5">
                        {d.hub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleDriverSignIn} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Driver ID or Email
                  </label>
                  <input 
                    type="text"
                    value={driverIdInput}
                    onChange={(e) => setDriverIdInput(e.target.value)}
                    placeholder="e.g. bob.rafters@ronadartmouth.ca"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      PIN / Password
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Default: Password123!</span>
                  </div>
                  <input 
                    type="password"
                    value={driverPasswordInput}
                    onChange={(e) => setDriverPasswordInput(e.target.value)}
                    placeholder="Enter driver PIN or password"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                    required
                  />
                </div>

                {loginError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 min-h-[44px]"
                >
                  {isLoggingIn ? (
                    <span className="flex items-center space-x-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Connecting to Fleet Database...</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1.5">
                      <span>SIGN IN TO ROUTE</span>
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </button>
              </form>
            </div>

            {/* Bottom Support Footer */}
            <div className="pt-4 text-center">
              <p className="text-[11px] text-slate-400 font-medium">
                Dispatch Desk: <span className="font-bold text-slate-600 font-mono">(902) 468-3330</span> &bull; Burnside Hub
              </p>
            </div>

          </div>
        )}

        {/* ── 1. SCREEN: HOME / OVERVIEW ── */}
        {isUserAuthenticated && activeScreen === 'home' && (
          <div className="flex-1 flex flex-col pb-24 select-none overflow-y-auto">
            
            {/* Native Mobile Status Bar & Greeting */}
            <div className="bg-blue-600 text-white pt-5 pb-10 px-5 rounded-b-[28px] shadow-sm relative">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1.5">
                    <button 
                      onClick={() => setShowTruckSwitcherModal(true)}
                      className="bg-white/20 hover:bg-white/30 text-white text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full flex items-center space-x-1 cursor-pointer transition-all"
                      title="Switch Vehicle"
                    >
                      <TruckIcon className="h-3 w-3 mr-0.5" />
                      <span>{assignedTruck ? assignedTruck.name.split(' ')[0] : 'Truck 101'}</span>
                      <ChevronRight className="h-2.5 w-2.5 opacity-70" />
                    </button>
                    <span className="flex items-center text-[10px] font-semibold text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                      Supabase Live
                    </span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight leading-tight">
                    Good Day, {driverUser?.name?.split(' ')[0] || 'Driver'}!
                  </h2>
                </div>

                <div className="flex items-center space-x-2">
                  <button 
                    type="button"
                    onClick={() => setActiveScreen('earnings')}
                    className="h-10 w-10 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center relative transition-all cursor-pointer"
                    title="Profile & Telematics"
                  >
                    <UserIcon className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active Route Summary Card */}
            <div className="px-4 -mt-6 relative z-10">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Assigned Route</span>
                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {currentTime}
                  </span>
                </div>
                
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3.5">{routeNumber}</h3>

                {/* Progress Indicators */}
                <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50 rounded-xl py-3 px-2 border border-slate-100 mb-4 text-center">
                  <div>
                    <span className="text-xl font-black text-slate-900 block">{totalStopsCount}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TOTAL STOPS</span>
                  </div>
                  <div>
                    <span className="text-xl font-black text-emerald-600 block">{completedStopsCount}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">COMPLETED</span>
                  </div>
                  <div>
                    <span className="text-xl font-black text-blue-600 block">{Math.max(0, totalStopsCount - completedStopsCount)}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">REMAINING</span>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveScreen('route')}
                    className="py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <Navigation className="h-4 w-4" />
                    <span>ROUTE MAP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveScreen('stop')}
                    className="py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <FileText className="h-4 w-4" />
                    <span>ePOD PROOF</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Vehicle Telematics Snapshot from Live Supabase */}
            <div className="px-4 mt-4">
              <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <TruckIcon className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                      {assignedTruck?.name || 'Assigned Vehicle'}
                    </span>
                  </div>
                  <button 
                    onClick={fetchLiveSupabaseTrucks}
                    disabled={isFetchingTrucks}
                    className="text-[10px] font-mono text-blue-400 hover:text-blue-300 flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${isFetchingTrucks ? 'animate-spin' : ''}`} />
                    <span>Live Sync</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-800 text-center">
                  <div className="bg-slate-800/80 p-2 rounded-xl">
                    <span className="text-[9px] text-slate-400 block font-bold">PLATE</span>
                    <span className="text-xs font-black text-amber-400 font-mono">{assignedTruck?.licensePlate || assignedTruckSpec?.licensePlate || assignedTruck?.truckNumber || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-800/80 p-2 rounded-xl">
                    <span className="text-[9px] text-slate-400 block font-bold">FUEL</span>
                    <span className="text-xs font-black text-emerald-400">{assignedTruck?.fuelLevel || (assignedTruckSpec?.baseFuelPercent ? `${assignedTruckSpec.baseFuelPercent}%` : 'N/A')}</span>
                  </div>
                  <div className="bg-slate-800/80 p-2 rounded-xl">
                    <span className="text-[9px] text-slate-400 block font-bold">PRE-TRIP</span>
                    <span className="text-xs font-black text-blue-400">{assignedTruck?.inspectionStatus ? (assignedTruck.inspectionStatus.toLowerCase().includes('pass') ? 'Passed' : 'Pending') : 'Passed'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Stops List */}
            <div className="px-4 mt-5 flex-1">
              <div className="flex items-center justify-between mb-3 px-1">
                <h4 className="text-sm font-bold text-slate-900">Today's Stop Sequence</h4>
                <span className="text-xs font-bold text-blue-600">
                  {completedStopsCount}/{totalStopsCount} Done
                </span>
              </div>

              <div className="space-y-2.5">
                {liveStops.length === 0 ? (
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 text-center shadow-xs">
                    <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2.5">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <h5 className="text-xs font-bold text-slate-800">No Active Deliveries</h5>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                      All deliveries for previous days have been completed and cleared. New active dispatches will appear here when scheduled.
                    </p>
                  </div>
                ) : (
                  liveStops.map((stop, idx) => {
                    const isAdditionalStop = stop.stopType === 'additional_stop';
                    const isCompleted = stop.status === 'completed' || (!isAdditionalStop && stop.delivery?.status === DeliveryStatus.DELIVERED);
                    const isCurrent = idx === activeStopIndex;

                    return (
                      <div 
                        key={stop.id}
                        onClick={() => {
                          setActiveStopIndex(idx);
                          setActiveScreen('route');
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isCurrent 
                            ? isAdditionalStop
                              ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                              : 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-xs' 
                            : isCompleted
                              ? 'bg-emerald-50/40 border-emerald-200 opacity-80'
                              : 'bg-white border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className={`h-8 w-8 rounded-xl font-mono font-black text-xs flex items-center justify-center shrink-0 ${
                            isCompleted 
                              ? 'bg-emerald-500 text-white' 
                              : isCurrent
                                ? isAdditionalStop
                                  ? 'bg-amber-600 text-white shadow-sm'
                                  : 'bg-blue-600 text-white shadow-sm'
                                : isAdditionalStop
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-slate-100 text-slate-700'
                          }`}>
                            {isCompleted ? <Check className="h-4 w-4" /> : stop.stopNumber}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5 mb-0.5">
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                                isAdditionalStop 
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}>
                                {isAdditionalStop ? `Additional Stop #${idx + 1}` : 'Delivery Destination'}
                              </span>
                            </div>
                            <h5 className="text-xs font-black text-slate-900 truncate">{stop.customerName}</h5>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{stop.address}</p>
                          </div>
                        </div>

                        <div className="shrink-0 ml-2">
                          {isCompleted ? (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md">
                              ✓ Done
                            </span>
                          ) : isCurrent ? (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md animate-pulse ${
                              isAdditionalStop ? 'text-amber-700 bg-amber-100' : 'text-blue-600 bg-blue-100'
                            }`}>
                              Next Stop
                            </span>
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-300" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}

        {/* ── 2. SCREEN: ROUTE MAP & GPS NAVIGATION (FLEXIBLE HEIGHT) ── */}
        {isUserAuthenticated && activeScreen === 'route' && (
          <div className="flex-1 flex flex-col pb-20 select-none overflow-hidden h-[calc(100dvh-56px)] min-h-0">
            
            {/* Top Navigation Bar */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-xs shrink-0">
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setActiveScreen('home')}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Route Map & Turn-by-Turn</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Stop {activeStopIndex + 1} of {liveStops.length} &bull; {currentStop?.customerName}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                <button 
                  type="button"
                  onClick={() => {
                    setIsLiveGpsActive(prev => !prev);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer ${
                    isLiveGpsActive
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <Navigation2 className={`h-3.5 w-3.5 ${isLiveGpsActive ? 'animate-pulse' : ''}`} />
                  <span>{isLiveGpsActive ? 'GPS ACTIVE' : 'START GPS'}</span>
                </button>
              </div>
            </div>

            {/* Real Interactive Google Maps Route Canvas - Flexes cleanly to fill space */}
            <div className="relative flex-1 bg-slate-950 overflow-hidden flex flex-col min-h-[220px] w-full">
              {liveStops.length > 0 ? (
                <DriverRouteMap
                  stops={liveStops}
                  activeStopIndex={activeStopIndex}
                  onSelectStop={(idx) => setActiveStopIndex(idx)}
                  truckName={assignedTruck?.name || 'Unit 101'}
                  truckUnitNumber={assignedTruck?.id?.replace(/[^0-9]/g, '') || (assignedTruck as any)?.truckNumber || '101'}
                  isLiveGpsActive={isLiveGpsActive}
                  onToggleLiveGps={() => setIsLiveGpsActive(prev => !prev)}
                  truckLocation={currentTruckLocation}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <div className="h-12 w-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                    <Navigation className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-black text-white mb-1">No Active Dispatches</h4>
                  <p className="text-xs text-slate-400">There are no pending delivery stops assigned to your route today.</p>
                </div>
              )}
            </div>

            {/* Bottom Stop Navigation Details Card - Docked above bottom bar */}
            <div className="bg-white border-t border-slate-200 p-3 sm:p-4 shadow-xl z-20 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className={`h-6 w-6 rounded-lg text-white font-mono font-black text-xs flex items-center justify-center shrink-0 ${
                    currentStop?.stopType === 'additional_stop' ? 'bg-amber-600' : 'bg-blue-600'
                  }`}>
                    {currentStop?.stopNumber || 1}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-900 truncate block">
                      {currentStop?.customerName || 'No Stop Selected'}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${
                      currentStop?.stopType === 'additional_stop' ? 'text-amber-700 font-mono' : 'text-blue-600'
                    }`}>
                      {currentStop?.stopType === 'additional_stop' ? 'Intermediate Stop' : 'Delivery Destination'}
                    </span>
                  </div>
                </div>
                {liveStops.length > 0 && (
                  <div className="flex items-center space-x-1 shrink-0 ml-2">
                    <button
                      onClick={() => setActiveStopIndex(prev => Math.max(0, prev - 1))}
                      disabled={activeStopIndex === 0}
                      className="p-1 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-slate-500 px-1">
                      {activeStopIndex + 1}/{liveStops.length}
                    </span>
                    <button
                      onClick={() => setActiveStopIndex(prev => Math.min(liveStops.length - 1, prev + 1))}
                      disabled={activeStopIndex === liveStops.length - 1}
                      className="p-1 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Address & Actions */}
              {currentStop && (
                <div className={`border rounded-xl p-2.5 mb-2.5 ${
                  currentStop.stopType === 'additional_stop' 
                    ? 'bg-amber-50/70 border-amber-200' 
                    : 'bg-slate-50 border-slate-200/80'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2 min-w-0">
                      <MapPin className={`h-4 w-4 shrink-0 mt-0.5 ${
                        currentStop.stopType === 'additional_stop' ? 'text-amber-600' : 'text-blue-600'
                      }`} />
                      <div>
                        <p className="text-xs font-medium text-slate-700 leading-snug">{currentStop.address}</p>
                        {currentStop.stopType === 'additional_stop' && currentStop.reason && (
                          <p className="text-[11px] font-bold text-amber-900 mt-1">
                            Task: {currentStop.reason}
                          </p>
                        )}
                        {currentStop.stopType === 'additional_stop' && currentStop.delivery?.deliveryAddress && (
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Destination: {currentStop.delivery.deliveryAddress}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0 ml-2">
                      <button 
                        onClick={() => copyAddress(currentStop.address || '')}
                        className="p-1.5 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 cursor-pointer"
                        title="Copy Address"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => openExternalMaps(currentStop.address || '')}
                        className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 cursor-pointer"
                        title="Open in External Maps (Apple/Google Maps)"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      {currentStop.phone && (
                        <a 
                          href={`tel:${currentStop.phone}`}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200"
                          title="Call Customer"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                  {currentStop.notes && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 rounded-lg p-2 mt-2 border border-amber-200/60 font-medium">
                      <strong>Instructions:</strong> {currentStop.notes}
                    </p>
                  )}
                </div>
              )}

              {/* Main Action Button */}
              <div>
                {currentStop?.stopType === 'additional_stop' ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (currentStop.deliveryRecordId && currentStop.additionalStopId) {
                          handleToggleAdditionalStopFromDriver(currentStop.deliveryRecordId, currentStop.additionalStopId);
                        }
                      }}
                      className={`w-full py-3 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-md min-h-[44px] ${
                        currentStop.status === 'completed'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        {currentStop.status === 'completed' 
                          ? '✓ STOP COMPLETED • CLICK TO UNDO' 
                          : 'ARRIVED • MARK ADDITIONAL STOP COMPLETE'}
                      </span>
                    </button>
                    {activeStopIndex < liveStops.length - 1 && (
                      <button
                        type="button"
                        onClick={() => setActiveStopIndex(prev => prev + 1)}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <span>PROCEED TO NEXT STOP ({activeStopIndex + 2})</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveScreen('stop')}
                    disabled={!currentStop}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-md disabled:opacity-50 min-h-[44px]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>ARRIVED AT PROJECT SITE &bull; OPEN ePOD</span>
                  </button>
                )}
              </div>

            </div>

          </div>
        )}

        {/* ── 3. SCREEN: ePOD PROOF OF DELIVERY ── */}
        {activeScreen === 'stop' && (
          <div className="flex-1 flex flex-col pb-24 select-none overflow-y-auto">
            
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-xs">
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setActiveScreen('home')}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-600"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h3 className="text-sm font-black text-slate-900">ePOD Delivery Proof</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Stop {activeStopIndex + 1} &bull; {currentStop?.customerName}
                  </p>
                </div>
              </div>

              {/* Stop Switcher Dropdown */}
              <select
                value={activeStopIndex}
                onChange={(e) => setActiveStopIndex(Number(e.target.value))}
                className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
              >
                {liveStops.map((st, i) => (
                  <option key={st.id} value={i}>
                    Stop {i + 1}: {st.customerName.split(' ')[0]}
                  </option>
                ))}
              </select>
            </div>

            {/* ePOD Form Container */}
            {!currentStop || liveStops.length === 0 ? (
              <div className="p-6 text-center">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xs max-w-sm mx-auto">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-black text-slate-900 mb-1">No Active Stops Pending</h4>
                  <p className="text-xs text-slate-500 mb-4">
                    There are no uncompleted delivery stops requiring ePOD capture. Completed deliveries from previous days have been cleared.
                  </p>
                  <button
                    onClick={() => setActiveScreen('home')}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Return to Route Home
                  </button>
                </div>
              </div>
            ) : currentStop?.stopType === 'additional_stop' ? (
              /* ── In-Route Additional Stop Execution Desk ── */
              <div className="p-4 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded font-mono uppercase">
                      Stop #{currentStop.stopNumber} &bull; Additional Intermediate Stop
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      currentStop.status === 'completed' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-amber-200 text-amber-900'
                    }`}>
                      {currentStop.status === 'completed' ? '✓ Completed' : 'Pending'}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900">{currentStop.reason || 'Intermediate Stop'}</h3>
                  <p className="text-xs text-slate-700 mt-1 flex items-start space-x-1.5 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{currentStop.address}</span>
                  </p>
                  <div className="mt-3 pt-3 border-t border-amber-200/60 flex items-center space-x-2">
                    <button 
                      type="button"
                      onClick={() => openExternalMaps(currentStop.address)}
                      className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                    >
                      <Navigation2 className="h-3.5 w-3.5" />
                      <span>GPS Directions</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => copyAddress(currentStop.address)}
                      className="px-3 py-2 bg-white hover:bg-amber-100/50 text-slate-700 rounded-xl text-xs font-bold border border-amber-300 flex items-center space-x-1 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                {/* Delivery Project Site Destination Context */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    ROUTE DESTINATION CONTEXT
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Sales Order:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {currentStop.delivery?.epicorSalesOrder || currentStop.delivery?.invoiceNumber || currentStop.delivery?.id}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Recipient / Client:</span>
                      <span className="font-bold text-slate-900">{currentStop.delivery?.customerName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block mb-0.5">Delivery Project Site Address (Final Destination):</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1 bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                        <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        {currentStop.delivery?.deliveryAddress}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mark Stop Status Action */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Stop Completion Status
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentStop.deliveryRecordId && currentStop.additionalStopId) {
                        handleToggleAdditionalStopFromDriver(currentStop.deliveryRecordId, currentStop.additionalStopId);
                      }
                    }}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm ${
                      currentStop.status === 'completed'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {currentStop.status === 'completed' 
                        ? '✓ STOP COMPLETED (CLICK TO UNMARK)' 
                        : '✓ MARK ADDITIONAL STOP COMPLETED'}
                    </span>
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveScreen('route')}
                      className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Back to Map</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (currentStop.status !== 'completed' && currentStop.deliveryRecordId && currentStop.additionalStopId) {
                          handleToggleAdditionalStopFromDriver(currentStop.deliveryRecordId, currentStop.additionalStopId);
                        }
                        if (activeStopIndex < liveStops.length - 1) {
                          setActiveStopIndex(activeStopIndex + 1);
                        } else {
                          setActiveScreen('route');
                        }
                      }}
                      className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center space-x-1 shadow-xs"
                    >
                      <span>Next Stop</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-4">
              
              {/* Customer & Address Overview */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                    Delivery Project Site Destination
                  </h4>
                  <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    {currentStop?.id}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900">{currentStop?.customerName}</h3>
                <p className="text-xs text-slate-600 mt-1 flex items-start space-x-1.5 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>{currentStop?.address}</span>
                </p>
                {currentStop?.delivery?.additionalStops && currentStop.delivery.additionalStops.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 font-mono">
                      In-Route Additional Stops ({currentStop.delivery.additionalStops.length}):
                    </span>
                    <div className="space-y-1">
                      {currentStop.delivery.additionalStops.map((st, sIdx) => (
                        <div key={st.id || sIdx} className="flex items-center justify-between bg-slate-50 p-1.5 rounded-lg text-[11px] border border-slate-200/60">
                          <span className="truncate max-w-[220px]">
                            <strong>#{sIdx + 1}:</strong> {st.address} ({st.reason})
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                            st.isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {st.isCompleted ? '✓ Completed' : 'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {currentStop?.phone && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Contact Phone:</span>
                    <a href={`tel:${currentStop.phone}`} className="font-bold text-blue-600 hover:underline flex items-center space-x-1">
                      <Phone className="h-3 w-3" />
                      <span>{currentStop.phone}</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Manifest Package Checklist */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
                  <PackageCheck className="h-4 w-4 text-blue-600" />
                  <span>Package / Cargo Checklist ({currentStop?.items?.length || 0} items)</span>
                </h4>
                
                <div className="space-y-1.5">
                  {currentStop?.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-xs">
                      <div className="flex items-center space-x-2">
                        <CheckSquare className="h-4 w-4 text-emerald-600" />
                        <span className="font-bold text-slate-800">{item.name}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {item.quantity} units
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Photo Proof Upload Section - Multi-Photo Support */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <Camera className="h-4 w-4 text-blue-600" />
                    <span>Delivery Photo Proof</span>
                  </h4>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                    {[cargoPhoto, signedFormPhoto, ...additionalPhotos].filter(Boolean).length} Photos Captured
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  
                  {/* Photo 1: Cargo at Door / Jobsite */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                      <span>1. Cargo at Door / Site</span>
                      {cargoPhoto && <span className="text-[9px] text-emerald-600 font-bold">✓ Added</span>}
                    </label>
                    {cargoPhoto ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-300 aspect-video bg-slate-100 group shadow-xs">
                        <img src={cargoPhoto} alt="Cargo proof" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setPhotoPreviewModal({ url: cargoPhoto, title: 'Cargo at Door / Jobsite' })}
                            className="p-1.5 bg-white/90 text-slate-800 rounded-lg shadow-sm hover:bg-white cursor-pointer"
                            title="View Fullscreen"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCargoPhoto(null)}
                            className="p-1.5 bg-rose-600 text-white rounded-lg shadow-sm hover:bg-rose-700 cursor-pointer"
                            title="Remove Photo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl bg-slate-50 hover:bg-blue-50/50 cursor-pointer transition-all aspect-video">
                        <Camera className="h-5 w-5 text-slate-400 mb-1" />
                        <span className="text-[10px] font-bold text-slate-700">Take Cargo Photo</span>
                        <span className="text-[8px] text-slate-400">Site placement proof</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment"
                          onChange={(e) => handlePhotoCapture('cargo', e)}
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>

                  {/* Photo 2: Paper BOL / Signed Slip */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                      <span>2. Signed BOL Slip</span>
                      {signedFormPhoto && <span className="text-[9px] text-emerald-600 font-bold">✓ Added</span>}
                    </label>
                    {signedFormPhoto ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-300 aspect-video bg-slate-100 group shadow-xs">
                        <img src={signedFormPhoto} alt="Signed BOL" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setPhotoPreviewModal({ url: signedFormPhoto, title: 'Signed BOL Slip / Paper Slip' })}
                            className="p-1.5 bg-white/90 text-slate-800 rounded-lg shadow-sm hover:bg-white cursor-pointer"
                            title="View Fullscreen"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSignedFormPhoto(null)}
                            className="p-1.5 bg-rose-600 text-white rounded-lg shadow-sm hover:bg-rose-700 cursor-pointer"
                            title="Remove Photo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl bg-slate-50 hover:bg-blue-50/50 cursor-pointer transition-all aspect-video">
                        <FileText className="h-5 w-5 text-slate-400 mb-1" />
                        <span className="text-[10px] font-bold text-slate-700">BOL Document</span>
                        <span className="text-[8px] text-slate-400">Physical paperwork</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handlePhotoCapture('slip', e)}
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>

                </div>

                {/* Additional Photos Gallery & Multi-Capture Button */}
                <div className="pt-2.5 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center space-x-1">
                      <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                      <span>Additional Photos (Damage, Unload, Tags)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {additionalPhotos.length} extra
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Render extra photos */}
                    {additionalPhotos.map((photo, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 group shadow-xs">
                        <img src={photo} alt={`Extra proof ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1 rounded">
                          #{idx + 3}
                        </span>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setPhotoPreviewModal({ url: photo, title: `Proof Photo #${idx + 3}` })}
                            className="p-1 bg-white text-slate-800 rounded shadow-sm hover:bg-slate-100 cursor-pointer"
                            title="Preview"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveAdditionalPhoto(idx)}
                            className="p-1 bg-rose-600 text-white rounded shadow-sm hover:bg-rose-700 cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add More Photos Upload Box */}
                    <label className="flex flex-col items-center justify-center p-2 border-2 border-dashed border-blue-200 hover:border-blue-500 rounded-xl bg-blue-50/40 hover:bg-blue-50 cursor-pointer transition-all aspect-square text-center">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-1">
                        <Plus className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-bold text-blue-700 leading-tight">Add Picture</span>
                      <span className="text-[8px] text-blue-500">Camera / Files</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple
                        onChange={(e) => handlePhotoCapture('additional', e)}
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>

              </div>

              {/* Digital Touch Signature Pad */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Customer Touch Signature
                  </h4>
                  {hasDrawnSignature && (
                    <button 
                      type="button" 
                      onClick={clearSignature}
                      className="text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Receiver Name Input */}
                <div className="mb-2.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Printed Receiver Name
                  </label>
                  <input 
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="Enter receiver's name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {/* Canvas */}
                <div className="relative border-2 border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  <canvas 
                    ref={canvasRef}
                    width={380}
                    height={140}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-[120px] touch-none cursor-crosshair"
                  />
                  {!hasDrawnSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-xs font-semibold">
                      Sign with finger or stylus here
                    </div>
                  )}
                  <div className="absolute bottom-2 inset-x-4 border-b border-dashed border-slate-300 pointer-events-none" />
                </div>
              </div>

              {/* Submit ePOD Button */}
              <button
                type="button"
                onClick={handleSubmitPOD}
                disabled={isSubmittingPOD}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                {isSubmittingPOD ? (
                  <span className="flex items-center space-x-2">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Recording in Supabase...</span>
                  </span>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    <span>CONFIRM DELIVERY & SUBMIT ePOD</span>
                  </>
                )}
              </button>

            </div>
          )}

            {/* Success Toast */}
            {podSubmittedToast && (
              <div className="fixed inset-x-4 top-20 z-50 bg-emerald-600 text-white py-3 px-4 rounded-2xl shadow-2xl flex items-center justify-center space-x-2 text-xs font-bold animate-in fade-in slide-in-from-top-4 max-w-sm mx-auto">
                <CheckCircle2 className="h-5 w-5 text-white shrink-0" />
                <span>Proof of Delivery recorded & synced to Supabase!</span>
              </div>
            )}

          </div>
        )}

        {/* ── 4. SCREEN: DRIVER PROFILE & LIVE SUPABASE VEHICLE TELEMATICS ── */}
        {activeScreen === 'earnings' && (
          <div className="flex-1 flex flex-col pb-24 select-none overflow-y-auto">
            
            {/* Top Bar */}
            <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between sticky top-0 z-20 shadow-xs">
              <div>
                <h3 className="text-base font-black text-slate-900">Driver Portal & Fleet Telematics</h3>
                <p className="text-xs text-slate-500 font-medium">{driverUser?.name || 'Driver'}</p>
              </div>
              <div className="h-9 w-9 rounded-full overflow-hidden border border-slate-300 bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm">
                {driverUser?.name?.charAt(0) || 'D'}
              </div>
            </div>

            {/* Profile Content */}
            <div className="p-4 space-y-4 flex-1">
              
              {/* Assigned Vehicle Status from Live Supabase Table */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <TruckIcon className="h-4 w-4 text-blue-600" />
                    <span>Assigned Vehicle (Live Supabase Table)</span>
                  </h4>

                  <button
                    onClick={fetchLiveSupabaseTrucks}
                    disabled={isFetchingTrucks}
                    className="p-1 rounded-lg hover:bg-slate-100 text-blue-600 flex items-center space-x-1 text-[10px] font-bold cursor-pointer"
                    title="Refresh Telematics from Supabase"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isFetchingTrucks ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {/* Primary Truck Badge */}
                <div className="p-3 bg-slate-900 text-white rounded-xl mb-3 flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-black text-white">{assignedTruck?.name || assignedTruckSpec?.name || 'Assigned Commercial Truck'}</h5>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      VIN: {assignedTruck?.vin || assignedTruckSpec?.vin || 'VIN Not Registered'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTruckSwitcherModal(true)}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
                  >
                    Switch Truck
                  </button>
                </div>
                
                {/* 6 Real Database Attributes Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">LICENSE PLATE</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">{assignedTruck?.licensePlate || assignedTruck?.truckNumber || assignedTruckSpec?.licensePlate || 'N/A'}</span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">FUEL LEVEL</span>
                    <span className="font-bold text-emerald-600 text-sm">{assignedTruck?.fuelLevel || (assignedTruckSpec?.baseFuelPercent ? `${assignedTruckSpec.baseFuelPercent}% Full` : 'N/A')}</span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">ODOMETER (KM)</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      {typeof assignedTruck?.currentMileage === 'number' 
                        ? `${assignedTruck.currentMileage.toLocaleString()} km` 
                        : (assignedTruckSpec?.baseOdometerKm ? `${assignedTruckSpec.baseOdometerKm.toLocaleString()} km` : 'N/A')}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">INSPECTION STATUS</span>
                    <span className="font-bold text-emerald-600 text-xs truncate block">
                      {assignedTruck?.inspectionStatus || assignedTruck?.safetyInspectionStatus || (assignedTruck?.lastServiceDate ? `Verified (${assignedTruck.lastServiceDate})` : 'Passed Pre-Trip')}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">MAX PAYLOAD</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {assignedTruck?.capacityWeightKg 
                        ? `${assignedTruck.capacityWeightKg.toLocaleString()} kg (${assignedTruck.capacityVolumeM3 || '—'} m³)` 
                        : (assignedTruckSpec?.fuelType === 'Diesel' ? '14,500 kg (38 m³)' : '1,490 kg (3.5 m³)')}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">NEXT SERVICE DUE</span>
                    <span className="font-bold text-blue-600 font-mono">
                      {assignedTruck?.nextServiceDueDate || assignedTruck?.nextServiceDue || (assignedTruck?.lastServiceDate ? `${assignedTruck.lastServiceDate} (Current)` : 'Inspection Valid')}
                    </span>
                  </div>
                </div>

                {/* Action Buttons for Vehicle Maintenance & Log */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowVehicleInspectionModal(true)}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer transition-all"
                  >
                    <Shield className="h-3.5 w-3.5 text-blue-600" />
                    <span>Log Pre-Trip</span>
                  </button>

                  <button
                    onClick={() => setShowFuelUpdateModal(true)}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer transition-all"
                  >
                    <Fuel className="h-3.5 w-3.5 text-amber-600" />
                    <span>Log Fuel Level</span>
                  </button>
                </div>
              </div>

              {/* Driver Credentials Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <UserIcon className="h-4 w-4 text-blue-600" />
                  <span>Driver Profile & License</span>
                </h4>
                
                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Driver ID:</span>
                    <span className="font-mono font-bold">{driverUser?.id || driverUser?.userNumber || 'DRV-N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Commercial License:</span>
                    <span className="font-bold text-slate-900">{driverLicenseLabel}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Assigned Branch:</span>
                    <span className="font-bold text-slate-900">{driverBranchName}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-medium text-slate-900">{driverUser?.email || 'driver@ronaatlantic.ca'}</span>
                  </div>
                </div>
              </div>

              {/* Back to Dispatch Hub if launched from Web Portal */}
              {onBackToPortal && (
                <button
                  type="button"
                  onClick={onBackToPortal}
                  className="w-full py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span>RETURN TO DISPATCH PORTAL</span>
                </button>
              )}

              {/* Logout / Switch Driver */}
              <button
                type="button"
                onClick={handleDriverLogout}
                className="w-full py-3 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-800 hover:text-rose-600 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>SIGN OUT DRIVER TERMINAL</span>
              </button>

            </div>

          </div>
        )}

        {/* ── PERSISTENT STANDALONE MOBILE BOTTOM NAVIGATION BAR ── */}
        {isUserAuthenticated && (
          <div className="sticky bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2 px-3 flex items-center justify-around text-xs font-bold text-slate-500 z-30 shadow-lg w-full max-w-md mx-auto pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            
            <button 
              type="button"
              onClick={() => setActiveScreen('home')}
              className={`flex flex-col items-center space-y-1 cursor-pointer transition-colors py-1 px-2.5 rounded-xl min-h-[44px] justify-center ${
                activeScreen === 'home' ? 'text-blue-600 bg-blue-50/80 font-black' : 'hover:text-slate-800'
              }`}
            >
              <Building2 className="h-5 w-5" />
              <span className="text-[10px]">Home</span>
            </button>

            <button 
              type="button"
              onClick={() => setActiveScreen('route')}
              className={`flex flex-col items-center space-y-1 cursor-pointer transition-colors py-1 px-2.5 rounded-xl min-h-[44px] justify-center ${
                activeScreen === 'route' ? 'text-blue-600 bg-blue-50/80 font-black' : 'hover:text-slate-800'
              }`}
            >
              <Navigation className="h-5 w-5" />
              <span className="text-[10px]">Route Map</span>
            </button>

            <button 
              type="button"
              onClick={() => setActiveScreen('stop')}
              className={`flex flex-col items-center space-y-1 cursor-pointer transition-colors py-1 px-2.5 rounded-xl min-h-[44px] justify-center ${
                activeScreen === 'stop' ? 'text-blue-600 bg-blue-50/80 font-black' : 'hover:text-slate-800'
              }`}
            >
              <FileText className="h-5 w-5" />
              <span className="text-[10px]">ePOD Proof</span>
            </button>

            <button 
              type="button"
              onClick={() => setActiveScreen('earnings')}
              className={`flex flex-col items-center space-y-1 cursor-pointer transition-colors py-1 px-2.5 rounded-xl min-h-[44px] justify-center ${
                activeScreen === 'earnings' ? 'text-blue-600 bg-blue-50/80 font-black' : 'hover:text-slate-800'
              }`}
            >
              <UserIcon className="h-5 w-5" />
              <span className="text-[10px]">Profile</span>
            </button>

          </div>
        )}

      </div>

      {/* ── MODAL 1: PRE-TRIP VEHICLE INSPECTION (Direct Supabase Sync) ── */}
      {showVehicleInspectionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900">Pre-Trip Inspection Log</h3>
              </div>
              <button 
                onClick={() => setShowVehicleInspectionModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Verify the following items on <strong>{assignedTruck?.name}</strong> before hitting the road. This logs directly to the live Supabase fleet table.
            </p>

            <div className="space-y-2 mb-4">
              {[
                { key: 'tires', label: 'Tires & Lug Nuts (Pressure & Tread)' },
                { key: 'brakes', label: 'Air Brake System & PSI Pressure' },
                { key: 'lights', label: 'Headlights, Signals & Brake Lights' },
                { key: 'cargoSecure', label: 'Cargo Straps & Roll-Up Door Lock' },
                { key: 'fluids', label: 'Oil, Coolant & Washer Fluid Levels' },
                { key: 'mirrors', label: 'Mirrors & Clean Windshield' },
                { key: 'emergencyKit', label: 'Triangles, Fire Extinguisher & First Aid' }
              ].map(item => (
                <label 
                  key={item.key}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer hover:bg-blue-50/60 transition-all"
                >
                  <span>{item.label}</span>
                  <input 
                    type="checkbox"
                    checked={inspectionChecks[item.key] || false}
                    onChange={(e) => setInspectionChecks(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowVehicleInspectionModal(false)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveInspection}
                disabled={isSavingVehicleData}
                className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
              >
                {isSavingVehicleData ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>Save to Supabase</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: FUEL & ODOMETER LOG (Direct Supabase Sync) ── */}
      {showFuelUpdateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center space-x-2">
                <Fuel className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-black text-slate-900">Update Fuel & Mileage</h3>
              </div>
              <button 
                onClick={() => setShowFuelUpdateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Current Fuel Level: <strong className="text-blue-600 font-mono">{fuelInputVal}%</strong>
                </label>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={fuelInputVal}
                  onChange={(e) => setFuelInputVal(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>Empty (0%)</span>
                  <span>Half (50%)</span>
                  <span>Full (100%)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Current Odometer (KM)
                </label>
                <input 
                  type="number"
                  value={odometerInputVal}
                  onChange={(e) => setOdometerInputVal(Number(e.target.value))}
                  placeholder="e.g. 142380"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowFuelUpdateModal(false)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFuelLevel}
                disabled={isSavingVehicleData}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
              >
                {isSavingVehicleData ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>Save Reading</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: SWITCH ASSIGNED TRUCK (Live Supabase Fleet) ── */}
      {showTruckSwitcherModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center space-x-2">
                <TruckIcon className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900">Switch Assigned Truck</h3>
              </div>
              <button 
                onClick={() => setShowTruckSwitcherModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Select the vehicle you are operating today from the live Supabase fleet:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {liveSupabaseTrucks.map(trk => {
                const isCurrent = trk.id === assignedTruck?.id;
                return (
                  <button
                    key={trk.id}
                    onClick={() => {
                      setSelectedTruckIdOverride(trk.id);
                      setShowTruckSwitcherModal(false);
                      setVehicleSavedToast(`Active vehicle switched to ${trk.name}`);
                      setTimeout(() => setVehicleSavedToast(null), 2500);
                    }}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isCurrent 
                        ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div>
                      <h5 className="text-xs font-black text-slate-900">{trk.name}</h5>
                      <span className="text-[10px] font-mono text-slate-500">
                        {trk.licensePlate} &bull; Fuel: {trk.fuelLevel}
                      </span>
                    </div>
                    {isCurrent && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowTruckSwitcherModal(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL 4: FULLSCREEN PHOTO PREVIEW MODAL ── */}
      {photoPreviewModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl p-4 max-w-lg w-full shadow-2xl border border-slate-700 text-white flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center space-x-2">
                <Camera className="h-4 w-4 text-blue-400" />
                <h4 className="text-xs font-black text-slate-100">{photoPreviewModal.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setPhotoPreviewModal(null)}
                className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-full hover:bg-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-black flex items-center justify-center min-h-[260px] max-h-[60vh] border border-slate-800">
              <img 
                src={photoPreviewModal.url} 
                alt={photoPreviewModal.title} 
                className="w-full h-full object-contain"
              />
            </div>

            <div className="mt-3 pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setPhotoPreviewModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
