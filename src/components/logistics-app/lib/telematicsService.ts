import { useState, useEffect, useRef, useCallback } from 'react';
import { VehicleRecord, TelematicsApiResponse, TelematicsFleetSummary } from '../types/telematics';

export interface UseTelematicsOptions {
  pollingIntervalMs?: number;
  autoStart?: boolean;
  statusFilter?: 'ALL' | 'MOVING' | 'IDLE' | 'STOPPED';
  searchQuery?: string;
  onVehicleUpdate?: (vehicles: VehicleRecord[]) => void;
}

export interface UseTelematicsReturn {
  vehicles: VehicleRecord[];
  selectedVehicle: VehicleRecord | null;
  selectedVehicleId: string | null;
  summary: TelematicsFleetSummary;
  isLoading: boolean;
  isStreaming: boolean;
  lastUpdated: Date | null;
  error: string | null;
  pollingIntervalMs: number;
  setSelectedVehicleId: (id: string | null) => void;
  setPollingIntervalMs: (ms: number) => void;
  setIsStreaming: (streaming: boolean) => void;
  refreshTelematics: () => Promise<void>;
}

export function useTelematics({
  pollingIntervalMs = 5000,
  autoStart = true,
  statusFilter = 'ALL',
  searchQuery = '',
  onVehicleUpdate
}: UseTelematicsOptions = {}): UseTelematicsReturn {
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStreaming, setIsStreaming] = useState<boolean>(autoStart);
  const [intervalMs, setIntervalMs] = useState<number>(pollingIntervalMs);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [summary, setSummary] = useState<TelematicsFleetSummary>({
    totalVehicles: 0,
    movingCount: 0,
    idleCount: 0,
    stoppedCount: 0,
    averageSpeed: 0,
    averageFuelLevel: 0,
    totalActiveDeliveries: 0,
  });

  const vehiclesRef = useRef<VehicleRecord[]>([]);
  vehiclesRef.current = vehicles;

  // Fetch telemetry from internal REST endpoint
  const fetchTelematics = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'ALL') {
        params.set('status', statusFilter.toLowerCase());
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/v1/telematics/vehicles${queryStr}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Telematics API returned status ${response.status}`);
      }

      const data: any = await response.json();
      if (data.success && Array.isArray(data.vehicles)) {
        const normalizedVehicles: VehicleRecord[] = data.vehicles.map((v: any, index: number) => {
          const tel = v.telematics || v.telemetry || {};
          const lat = typeof tel.latitude === 'number' ? tel.latitude : (typeof tel.lat === 'number' ? tel.lat : 44.6488);
          const lng = typeof tel.longitude === 'number' ? tel.longitude : (typeof tel.lng === 'number' ? tel.lng : -63.5752);
          const speed = typeof tel.speedMph === 'number' ? tel.speedMph : (typeof tel.speed === 'number' ? tel.speed : 0);
          const heading = typeof tel.heading === 'number' ? tel.heading : 0;
          
          let ignitionStatus: 'ON' | 'IDLE' | 'OFF' = 'OFF';
          if (tel.ignitionOn === true || tel.ignitionStatus === 'ON') {
            ignitionStatus = 'ON';
          } else if (tel.ignitionStatus === 'IDLE') {
            ignitionStatus = 'IDLE';
          } else if (tel.ignitionOn === false || tel.ignitionStatus === 'OFF') {
            ignitionStatus = 'OFF';
          } else if (speed > 0) {
            ignitionStatus = 'ON';
          }

          let status: 'MOVING' | 'IDLE' | 'STOPPED' = 'STOPPED';
          if (v.status === 'MOVING' || v.status === 'IDLE' || v.status === 'STOPPED') {
            status = v.status;
          } else if (speed > 3 || (ignitionStatus === 'ON' && speed > 0)) {
            status = 'MOVING';
          } else if (ignitionStatus === 'IDLE' || (ignitionStatus === 'ON' && speed <= 3)) {
            status = 'IDLE';
          }

          const fuelLevel = typeof tel.fuelPercent === 'number' ? tel.fuelPercent : (typeof tel.fuelLevel === 'number' ? tel.fuelLevel : 75);

          const driverInfo = v.driver ? {
            id: v.driver.id || `DRV-${index + 101}`,
            name: v.driver.name || `Driver ${index + 1}`,
            phone: v.driver.phone || '+1 (902) 555-0199'
          } : undefined;

          const activeRoute = v.activeRoute ? {
            routeId: v.activeRoute.routeId || `RT-${v.vehicleId || index + 101}`,
            driverName: v.activeRoute.driverName || driverInfo?.name || 'Assigned Driver',
            driverId: v.activeRoute.driverId || driverInfo?.id,
            scheduledETA: v.activeRoute.scheduledETA || v.activeRoute.eta || '14:35',
            eta: v.activeRoute.eta || v.activeRoute.scheduledETA || '14:35',
            nextStop: v.activeRoute.nextStop || '120 Commercial St, Depot B',
            totalStops: typeof v.activeRoute.totalStops === 'number' ? v.activeRoute.totalStops : 8,
            completedStops: typeof v.activeRoute.completedStops === 'number' ? v.activeRoute.completedStops : 3,
            remainingDistance: v.activeRoute.remainingDistance || '4.2 km',
            remainingDuration: v.activeRoute.remainingDuration || '15 min',
            stops: v.activeRoute.stops || []
          } : null;

          const telemetryObj = {
            latitude: lat,
            longitude: lng,
            lat,
            lng,
            speed,
            speedMph: speed,
            heading,
            ignitionOn: ignitionStatus === 'ON',
            ignitionStatus,
            fuelPercent: fuelLevel,
            fuelLevel,
            odometer: typeof tel.odometer === 'number' ? tel.odometer : 54200,
            batteryVoltage: tel.batteryVoltage || 13.8,
            coolantTemp: tel.coolantTemp || 88,
            lastUpdated: tel.lastUpdated || new Date().toISOString()
          };

          return {
            vehicleId: String(v.vehicleId || v.id || `TRK-${index + 101}`),
            truckName: v.truckName || v.name || `Unit #${v.vehicleId || index + 101}`,
            vin: v.vin || `1FTMF1E55MKD${51000 + index}`,
            licensePlate: v.licensePlate || `PR-${9020 + index}`,
            model: v.model || 'Freightliner Heavy Duty',
            capacityWeight: v.capacityWeight || 4500,
            status,
            driver: driverInfo,
            telematics: telemetryObj,
            telemetry: telemetryObj,
            activeRoute
          };
        });

        setVehicles(normalizedVehicles);
        if (data.summary) {
          setSummary(data.summary);
        } else {
          // Compute summary fallback
          const vList = normalizedVehicles;
          const moving = vList.filter(v => v.status === 'MOVING').length;
          const idle = vList.filter(v => v.status === 'IDLE').length;
          const stopped = vList.filter(v => v.status === 'STOPPED').length;
          const avgSpd = vList.length > 0 ? Math.round(vList.reduce((a, b) => a + (b.telematics.speedMph || b.telematics.speed), 0) / vList.length) : 0;
          const avgFuel = vList.length > 0 ? Math.round(vList.reduce((a, b) => a + (b.telematics.fuelPercent || b.telematics.fuelLevel), 0) / vList.length) : 0;
          setSummary({
            totalVehicles: vList.length,
            movingCount: moving,
            idleCount: idle,
            stoppedCount: stopped,
            averageSpeed: avgSpd,
            averageFuelLevel: avgFuel,
            totalActiveDeliveries: vList.reduce((a, b) => a + (b.activeRoute?.stops?.length || b.activeRoute?.totalStops || 0), 0)
          });
        }

        setLastUpdated(new Date());
        setError(null);
        onVehicleUpdate?.(normalizedVehicles);
      }
    } catch (err: any) {
      console.warn('[useTelematics] Fetch notice:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, onVehicleUpdate]);

  // Initial fetch
  useEffect(() => {
    fetchTelematics();
  }, [fetchTelematics]);

  // Polling stream timer
  useEffect(() => {
    if (!isStreaming || intervalMs <= 0) return;

    const timer = setInterval(() => {
      fetchTelematics();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isStreaming, intervalMs, fetchTelematics]);

  const selectedVehicle = vehicles.find(v => v.vehicleId === selectedVehicleId) || null;

  return {
    vehicles,
    selectedVehicle,
    selectedVehicleId,
    summary,
    isLoading,
    isStreaming,
    lastUpdated,
    error,
    pollingIntervalMs: intervalMs,
    setSelectedVehicleId,
    setPollingIntervalMs: setIntervalMs,
    setIsStreaming,
    refreshTelematics: fetchTelematics
  };
}
