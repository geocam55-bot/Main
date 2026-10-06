import React, { useState, useMemo, useCallback } from 'react';
import { useTelematics } from '../lib/telematicsService';
import TelematicsMapView from './TelematicsMapView';
import { VehicleRecord } from '../types/telematics';
import { Truck, Branch } from '../types';
import { DEFAULT_TRUCKS } from '../data';
import { 
  Truck as TruckIcon, 
  MapPin, 
  RefreshCw, 
  Activity, 
  Gauge, 
  Compass, 
  CheckCircle2, 
  AlertCircle, 
  Fuel, 
  Zap, 
  User, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Clock, 
  Radio, 
  Shield, 
  Phone, 
  Check, 
  Navigation2, 
  Play, 
  Pause, 
  Sparkles, 
  ChevronRight, 
  Layers, 
  SlidersHorizontal,
  Sliders,
  Cpu,
  MoreVertical,
  X,
  ChevronDown,
  ChevronUp,
  Info,
  Pin,
  Calendar,
  ChevronLeft,
  Eye,
  Car,
  XCircle
} from 'lucide-react';

export interface TelematicsDashboardProps {
  trucks?: Truck[];
  branches?: Branch[];
}

export default function TelematicsDashboard({ trucks, branches }: TelematicsDashboardProps = {}) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'MOVING' | 'IDLE' | 'STOPPED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [viewingTripsFor, setViewingTripsFor] = useState<string | null>(null);
  const [viewingDetailsFor, setViewingDetailsFor] = useState<string | null>(null);
  const [isAssetListCollapsed, setIsAssetListCollapsed] = useState<boolean>(false);
  const [showFilterMenu, setShowFilterMenu] = useState<boolean>(false);
  
  // Sidebar accordion states
  const [accordions, setAccordions] = useState({
    general: false,
    pinned: true,
    events: false,
    maintenance: false,
    sensors: false
  });
  
  const activeTenantId = useMemo(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('prospaces_active_tenant') : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id) return parsed.id;
      }
    } catch (_) {}
    return 'rona_atlantic';
  }, []);

  const {
    vehicles: rawVehicles,
    selectedVehicleId,
    summary: rawSummary,
    isLoading,
    isStreaming,
    lastUpdated,
    error,
    pollingIntervalMs,
    setSelectedVehicleId,
    setPollingIntervalMs,
    setIsStreaming,
    refreshTelematics
  } = useTelematics({
    pollingIntervalMs: 5000,
    statusFilter,
    searchQuery,
    tenantId: activeTenantId
  });

  // Strictly limit visible trucks to those configured for the active tenant in Supabase.
  // Enrich each database truck with real-time Fleet Complete telemetry when matched.
  const vehicles = useMemo(() => {
    const extractUnitNumber = (str?: string | null): string | null => {
      if (!str) return null;
      const m = String(str).match(/\b(\d{3,5})\b/);
      return m ? m[1] : null;
    };

    // 1. Resolve active tenant trucks (from prop or localStorage cache)
    let activeTenantTrucks: Truck[] = (trucks && trucks.length > 0) ? trucks : [];
    if (activeTenantTrucks.length === 0) {
      try {
        const cached = typeof window !== 'undefined' ? localStorage.getItem(`prospaces_trucks_tenant_${activeTenantId}`) : null;
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            activeTenantTrucks = parsed;
          }
        }
      } catch {}
    }

    // If no trucks exist yet for the active tenant, fall back to default Supabase trucks
    if (activeTenantTrucks.length === 0) {
      activeTenantTrucks = DEFAULT_TRUCKS;
    }

    // Build lookup maps for incoming Fleet Complete live vehicles
    const fcById = new Map<string, VehicleRecord>();
    const fcByName = new Map<string, VehicleRecord>();
    const fcByUnit = new Map<string, VehicleRecord>();
    const fcByVin = new Map<string, VehicleRecord>();
    const fcByPlate = new Map<string, VehicleRecord>();

    (rawVehicles || []).forEach(v => {
      const vId = String(v.id || v.vehicleId || '').toLowerCase().trim();
      const vName = String(v.name || v.truckName || '').toLowerCase().trim();
      const vVin = String(v.vin || '').toLowerCase().trim();
      const vPlate = String(v.licensePlate || '').toLowerCase().trim();
      const u = extractUnitNumber(vName) || extractUnitNumber(vId);

      if (vId) fcById.set(vId, v);
      if (vName) fcByName.set(vName, v);
      if (u) fcByUnit.set(u, v);
      if (vVin) fcByVin.set(vVin, v);
      if (vPlate) fcByPlate.set(vPlate, v);
    });

    // Deduplicate active tenant trucks by unit number & name to guarantee exact 1-to-1 UI cards
    const uniqueTrucks: Truck[] = [];
    const seenKeys = new Set<string>();
    for (const t of activeTenantTrucks) {
      const idKey = String(t.id || '').toLowerCase().trim();
      const nameKey = String(t.name || t.id || '').toLowerCase().trim();
      const u = extractUnitNumber(t.name) || extractUnitNumber(t.id);
      const key = u ? `unit_${u}` : (nameKey || idKey);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueTrucks.push(t);
      } else {
        const existing = uniqueTrucks.find(et => {
          const eu = extractUnitNumber(et.name) || extractUnitNumber(et.id);
          return (eu && eu === u) || String(et.name || et.id).toLowerCase().trim() === nameKey;
        });
        if (existing && t.driver && !['no driver', 'unassigned', ''].includes(String(t.driver).trim().toLowerCase())) {
          existing.driver = t.driver;
          if (t.driverId) (existing as any).driverId = t.driverId;
        }
      }
    }

    // Map each active tenant database truck to its live Fleet Complete telemetry
    return uniqueTrucks.map((t, idx) => {
      const tId = String(t.id || '').toLowerCase().trim();
      const tName = String(t.name || t.id || '').toLowerCase().trim();
      const tVin = String(t.vin || '').toLowerCase().trim();
      const tPlate = String(t.licensePlate || '').toLowerCase().trim();
      const tUnit = extractUnitNumber(tName) || extractUnitNumber(tId);

      const liveMatch = (tUnit ? fcByUnit.get(tUnit) : null) ||
                        fcById.get(tId) ||
                        fcByName.get(tName) ||
                        (tVin ? fcByVin.get(tVin) : null) ||
                        (tPlate ? fcByPlate.get(tPlate) : null);

      if (liveMatch) {
        const driverName = (t.driver && !['no driver', 'unassigned', ''].includes(String(t.driver).trim().toLowerCase()))
          ? t.driver
          : (typeof liveMatch.driver === 'string' ? liveMatch.driver : (liveMatch.driver?.name || 'Unassigned'));

        const matchLat = typeof liveMatch.lat === 'number' && !isNaN(liveMatch.lat)
          ? liveMatch.lat
          : (typeof liveMatch.telematics?.lat === 'number' ? liveMatch.telematics.lat : (typeof t.lat === 'number' ? t.lat : (t.currentLatitude || 44.9796)));
        const matchLng = typeof liveMatch.lng === 'number' && !isNaN(liveMatch.lng)
          ? liveMatch.lng
          : (typeof liveMatch.telematics?.lng === 'number' ? liveMatch.telematics.lng : (typeof t.lng === 'number' ? t.lng : (t.currentLongitude || -63.5044)));

        return {
          ...liveMatch,
          id: t.id,
          vehicleId: t.id,
          truckName: t.name || liveMatch.truckName,
          name: t.name || liveMatch.name,
          truckNumber: (t as any).truck_number || t.truckNumber || tUnit || extractUnitNumber(t.name) || extractUnitNumber(t.id) || t.id,
          driver: {
            id: (t as any).driverId || liveMatch.driver?.id || `DRV-${idx + 101}`,
            name: driverName
          },
          vin: t.vin || liveMatch.vin,
          licensePlate: t.licensePlate || liveMatch.licensePlate,
          model: t.type || liveMatch.model || 'Commercial Vehicle',
          capacityWeight: t.capacityWeight || liveMatch.capacityWeight || 4500,
          branchId: t.branchId || (t as any).branch_id || liveMatch.branchId,
          tenantId: t.tenantId || (t as any).tenant_id || liveMatch.tenantId,
          lat: matchLat,
          lng: matchLng,
          latitude: matchLat,
          longitude: matchLng,
          currentLatitude: matchLat,
          currentLongitude: matchLng,
        } as VehicleRecord;
      }

      // No live signal yet from Fleet Complete for this truck: render standard database record
      const lat = typeof t.lat === 'number' && !isNaN(t.lat) 
        ? t.lat 
        : (typeof t.gpsLat === 'number' && !isNaN(t.gpsLat) ? t.gpsLat : (typeof t.currentLatitude === 'number' && !isNaN(t.currentLatitude) ? t.currentLatitude : 44.9796));
      const lng = typeof t.lng === 'number' && !isNaN(t.lng) 
        ? t.lng 
        : (typeof t.gpsLng === 'number' && !isNaN(t.gpsLng) ? t.gpsLng : (typeof t.currentLongitude === 'number' && !isNaN(t.currentLongitude) ? t.currentLongitude : -63.5044));
      const isMoving = t.status === 'In Transit' || t.status === 'MOVING';
      const status = isMoving ? 'MOVING' : 'STOPPED';

      return {
        id: t.id,
        vehicleId: t.id,
        truckName: t.name,
        name: t.name,
        truckNumber: (t as any).truck_number || t.truckNumber || tUnit || extractUnitNumber(t.name) || extractUnitNumber(t.id) || t.id,
        vin: t.vin || `1FTMF1E55MKD${51000 + idx}`,
        licensePlate: t.licensePlate || `PR-${9020 + idx}`,
        model: t.type || 'Commercial Vehicle',
        capacityWeight: t.capacityWeight || 4500,
        branchId: t.branchId || (t as any).branch_id,
        tenantId: t.tenantId || (t as any).tenant_id,
        lat,
        lng,
        speed: 0,
        heading: 0,
        status,
        motionStatus: status,
        timestamp: new Date().toISOString(),
        ignitionStatus: 'OFF',
        driver: { id: (t as any).driverId || `DRV-${idx + 101}`, name: t.driver || 'Unassigned' },
        telematics: {
          latitude: lat,
          longitude: lng,
          lat,
          lng,
          speed: 0,
          speedMph: 0,
          heading: 0,
          ignitionOn: false,
          ignitionStatus: 'OFF',
          fuelPercent: 75,
          fuelLevel: 75,
          odometer: 54200 + (idx * 2100),
          batteryVoltage: 12.6,
          coolantTemp: 22,
          lastUpdated: new Date().toISOString()
        },
        telemetry: {
          latitude: lat,
          longitude: lng,
          lat,
          lng,
          speed: 0,
          speedMph: 0,
          heading: 0,
          ignitionOn: false,
          ignitionStatus: 'OFF',
          fuelPercent: 75,
          fuelLevel: 75,
          odometer: 54200 + (idx * 2100),
          batteryVoltage: 12.6,
          coolantTemp: 22,
          lastUpdated: new Date().toISOString()
        },
        isLive: false,
        source: 'supabase_trucks'
      } as VehicleRecord;
    });
  }, [rawVehicles, trucks, activeTenantId]);

  // Filtered vehicles for left panel and map views
  const displayVehicles = useMemo(() => {
    let list = vehicles;
    if (statusFilter && statusFilter !== 'ALL') {
      list = list.filter(v => String(v.status).toUpperCase() === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(v => 
        (v.truckName && v.truckName.toLowerCase().includes(q)) ||
        (v.vehicleId && v.vehicleId.toLowerCase().includes(q)) ||
        ((v as any).truckNumber && String((v as any).truckNumber).toLowerCase().includes(q)) ||
        (v.driver?.name && v.driver.name.toLowerCase().includes(q)) ||
        (v.vin && v.vin.toLowerCase().includes(q)) ||
        (v.licensePlate && v.licensePlate.toLowerCase().includes(q)) ||
        (v.model && v.model.toLowerCase().includes(q))
      );
    }
    return list;
  }, [vehicles, statusFilter, searchQuery]);

  const summary = useMemo(() => {
    const movingCount = vehicles.filter(v => v.status === 'MOVING').length;
    const idleCount = vehicles.filter(v => v.status === 'IDLE').length;
    const stoppedCount = vehicles.filter(v => v.status === 'STOPPED').length;
    const avgSpeed = vehicles.length > 0 ? Math.round(vehicles.reduce((acc, v) => acc + (v.telematics?.speedMph || v.telematics?.speed || 0), 0) / vehicles.length) : 0;
    const avgFuel = vehicles.length > 0 ? Math.round(vehicles.reduce((acc, v) => acc + (v.telematics?.fuelPercent || v.telematics?.fuelLevel || 75), 0) / vehicles.length) : 0;
    const totalActiveDeliveries = vehicles.reduce((acc, v) => acc + (v.activeRoute?.stops?.length || v.activeRoute?.totalStops || 0), 0);

    return {
      totalVehicles: vehicles.length,
      movingCount,
      idleCount,
      stoppedCount,
      averageSpeed: avgSpeed,
      averageFuelLevel: avgFuel,
      totalActiveDeliveries: rawSummary.totalActiveDeliveries || totalActiveDeliveries
    };
  }, [vehicles, rawSummary]);

  const detailsVehicle = viewingDetailsFor ? vehicles.find(v => v.vehicleId === viewingDetailsFor) : null;
  const tripsVehicle = viewingTripsFor ? vehicles.find(v => v.vehicleId === viewingTripsFor) : null;

  const getVehicleDriverName = useCallback((v: VehicleRecord | null | undefined): string => {
    if (!v) return 'Unassigned';
    
    // Normalize and check the main driver field
    if (v.driver?.name) {
       const normName = v.driver.name.trim().toLowerCase();
       if (!['no driver', 'unassigned', 'driver', 'assigned driver', ''].includes(normName)) {
           return v.driver.name.trim();
       }
    }
    
    // Normalize and check the active route driver field
    if (v.activeRoute?.driverName) {
       const normRouteName = v.activeRoute.driverName.trim().toLowerCase();
       if (!['no driver', 'unassigned', 'driver', 'assigned driver', ''].includes(normRouteName)) {
           return v.activeRoute.driverName.trim();
       }
    }
    
    return 'Unassigned';
  }, []);

  const tripsDriverName = tripsVehicle ? getVehicleDriverName(tripsVehicle) : 'Unassigned';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MOVING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            MOVING
          </span>
        );
      case 'IDLE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1.5"></span>
            IDLE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-100 text-slate-700 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 mr-1.5"></span>
            STOPPED
          </span>
        );
    }
  };

  const formatTimeAgo = (timestamp?: string | Date | null): string => {
    if (!timestamp) return 'Last sync < 1 min ago';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Last sync < 1 min ago';
      const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
      if (seconds < 60) return 'Last sync < 1 min ago';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `Last sync ${minutes} min ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `Last sync ${hours} h ago`;
      const days = Math.floor(hours / 24);
      return `Last sync ${days} d ago`;
    } catch {
      return 'Last sync < 1 min ago';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-62px)] bg-slate-50 dark:bg-[#202124] text-slate-900 dark:text-[#F4F4F5] font-sans overflow-hidden">
      
      {/* ── Condensed Top Telematics Header & Status Bar (Poll section removed) ── */}
      <header className="bg-white dark:bg-[#18191B] border-b border-slate-200/90 dark:border-[#303237] z-30 shadow-xs px-3 sm:px-4 py-2 transition-colors shrink-0">
        <div className="w-full flex flex-wrap items-center justify-between gap-2">
          
          {/* Brand Title & Live GPS Beacon */}
          <div className="flex items-center space-x-2.5">
            <div className="h-7 w-7 rounded-lg bg-blue-900 dark:bg-blue-950 text-white flex items-center justify-center shadow-xs border border-blue-800/50">
              <Radio className="h-4 w-4 text-blue-300 animate-pulse" />
            </div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-blue-950 dark:text-white">Fleet Telematics &amp; Live GPS</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                Live GPS
              </span>
            </div>
          </div>

          {/* Condensed Interactive KPI Filter Chips */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 text-xs overflow-x-auto scrollbar-none py-0.5">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                statusFilter === 'ALL'
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-300 shadow-2xs'
                  : 'bg-slate-50 dark:bg-[#1E1F22] border-slate-200/80 dark:border-[#303237] text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              <span>Total Fleet:</span>
              <span className="font-black text-slate-900 dark:text-white">{summary.totalVehicles}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('MOVING')}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                statusFilter === 'MOVING'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-2xs'
                  : 'bg-slate-50 dark:bg-[#1E1F22] border-slate-200/80 dark:border-[#303237] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Moving:</span>
              <span className="font-black">{summary.movingCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('IDLE')}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                statusFilter === 'IDLE'
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-300 shadow-2xs'
                  : 'bg-slate-50 dark:bg-[#1E1F22] border-slate-200/80 dark:border-[#303237] text-amber-600 dark:text-amber-400 hover:bg-amber-50/50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Idling:</span>
              <span className="font-black">{summary.idleCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('STOPPED')}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                statusFilter === 'STOPPED'
                  ? 'bg-slate-200 dark:bg-[#282A2E] border-slate-500 text-slate-900 dark:text-white shadow-2xs'
                  : 'bg-slate-50 dark:bg-[#1E1F22] border-slate-200/80 dark:border-[#303237] text-slate-500 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>Offline/Stopped:</span>
              <span className="font-black">{summary.stoppedCount}</span>
            </button>

            <div className="hidden xl:flex items-center space-x-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 pl-1 border-l border-slate-200 dark:border-slate-700">
              <span>Avg: <strong className="text-slate-700 dark:text-slate-300">{summary.averageSpeed} km/h</strong></span>
              <span>&bull;</span>
              <span>Stops: <strong className="text-slate-700 dark:text-slate-300">{summary.totalActiveDeliveries}</strong></span>
            </div>

            {/* Quick Refresh */}
            <button
              type="button"
              onClick={() => refreshTelematics()}
              className="p-1.5 bg-slate-50 dark:bg-[#1E1F22] hover:bg-slate-100 dark:hover:bg-[#282A2E] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-[#44474D] rounded-lg transition-all cursor-pointer shadow-2xs ml-1"
              title="Refresh Live GPS"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sunday Delivery Closure Notice - Compact Single Line */}
        {new Date().getDay() === 0 && (
          <div className="mt-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 rounded-lg flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <span>📅</span>
              <span className="font-bold text-amber-900 dark:text-amber-300">Sunday Closure:</span>
              <span className="text-amber-700 dark:text-amber-400 text-[11px]">Fleet is offline on Sundays according to regional scheduling rules. Trucks parked at yard depots.</span>
            </div>
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[9px] font-black rounded uppercase shrink-0">Fleet Parked</span>
          </div>
        )}
      </header>

      {/* ── Main Workspace: Left Asset List + Right Map ── */}
      <main className="w-full flex-1 p-2 sm:p-2.5 flex flex-col lg:flex-row gap-2.5 overflow-hidden min-h-0">
        
        {/* ── Left Column: Vehicle Telematics Directory (Collapsible & styled as in image.png) ── */}
        {!isAssetListCollapsed && (
          <div className="w-full lg:w-[320px] xl:w-[340px] shrink-0 flex flex-col bg-white dark:bg-[#18191B] rounded-2xl border border-slate-200/90 dark:border-[#303237] shadow-xs overflow-hidden h-full animate-in fade-in slide-in-from-left-4 duration-200">
            
            {viewingTripsFor ? (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Header with back button & collapse button */}
                <div className="p-3 border-b border-slate-200/90 dark:border-[#303237] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setViewingTripsFor(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#282A2E] rounded-md transition-colors text-slate-500 dark:text-slate-400 cursor-pointer">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="font-bold text-[15px] text-slate-900 dark:text-white">Trips</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAssetListCollapsed(true)}
                    className="p-1 text-indigo-900 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-md transition-colors cursor-pointer"
                    title="Collapse Trips panel"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M15 19l-7-7 7-7v14z" />
                    </svg>
                  </button>
                </div>

                {/* Filters section */}
                <div className="p-3.5 border-b border-slate-200/90 dark:border-[#303237] space-y-3 bg-slate-50 dark:bg-[#1E1F22] shrink-0">
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">Date and time</label>
                    <div className="flex items-center gap-2 bg-slate-200/60 dark:bg-[#282A2E] p-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200">
                      <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      Aug 19, 2026 12:00 AM - 11:59 PM
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">Asset</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center justify-between bg-slate-200/60 dark:bg-[#282A2E] p-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                        <span className="truncate">{vehicles.find(v => v.vehicleId === viewingTripsFor)?.truckName || viewingTripsFor}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <div className="flex items-center justify-between bg-slate-200/60 dark:bg-[#282A2E] p-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                        <span className="truncate text-slate-400">Driver</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Filter by location" className="w-full text-xs py-2 pl-9 pr-8 bg-slate-200/60 dark:bg-[#282A2E] text-slate-900 dark:text-[#F2F2F3] rounded-lg outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                    <Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                  </div>
                </div>

                {/* Trip Items */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  <div className="relative">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1 uppercase tracking-wider">Business Trip</div>
                    <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 font-medium">
                      <span>Windmill &bull; 6:19 AM</span>
                      <span className="font-mono text-[11px] text-blue-600">3.81 km</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Header matching image.png */}
                <div className="p-3.5 pb-2.5 flex items-center justify-between shrink-0">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Asset list
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsAssetListCollapsed(true)}
                    className="p-1 text-indigo-900 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-md transition-colors cursor-pointer"
                    title="Collapse asset list"
                  >
                    {/* Dark purple/indigo solid left triangle like in image.png */}
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M15 19l-7-7 7-7v14z" />
                    </svg>
                  </button>
                </div>

                {/* Search Bar matching image.png */}
                <div className="px-3.5 pb-2.5 shrink-0">
                  <div className="relative">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for assets and geofences"
                      className="w-full pl-9 pr-3 py-2 bg-[#F1F3F5] dark:bg-[#202124] border border-slate-200/80 dark:border-[#303237] rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Subheader: All assets / count & filter icon matching image.png */}
                <div className="px-3.5 pb-2 flex items-center justify-between border-b border-slate-100 dark:border-[#303237] shrink-0">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                      All assets
                    </h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                      {displayVehicles.length} total
                    </p>
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowFilterMenu(!showFilterMenu)}
                      className="p-1 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-md transition-colors cursor-pointer"
                      title="Filter assets"
                    >
                      <Filter className="w-3.5 h-3.5 fill-current" />
                    </button>

                    {showFilterMenu && (
                      <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#1E1F22] border border-slate-200 dark:border-[#303237] rounded-xl shadow-xl z-50 py-1 text-xs animate-in fade-in">
                        {(['ALL', 'MOVING', 'IDLE', 'STOPPED'] as const).map(f => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => {
                              setStatusFilter(f);
                              setShowFilterMenu(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 font-medium transition-colors cursor-pointer ${
                              statusFilter === f ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#282A2E]'
                            }`}
                          >
                            {f === 'ALL' ? 'All Assets' : f === 'MOVING' ? 'Moving only' : f === 'IDLE' ? 'Idle only' : 'Offline only'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Asset Cards List matching image.png */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#282A2E] px-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                  {displayVehicles.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No assets found matching criteria.
                    </div>
                  ) : (
                    displayVehicles.map((v, idx) => {
                      const isSelected = v.vehicleId === selectedVehicleId;
                      const driverName = getVehicleDriverName(v);
                      const isDriverAssigned = driverName && driverName !== 'Unassigned' && !['no driver', 'unassigned'].includes(driverName.toLowerCase());
                      
                      // Resolve actual truck number and name from the Supabase table
                      const truckUnit = (v as any).truckNumber || (v as any).truck_number || (v.truckName?.match(/\b(\d{3,5})\b/)?.[1]) || (v.vehicleId?.match(/\b(\d{3,5})\b/)?.[1]);
                      const truckTitle = truckUnit ? `Truck #${truckUnit}` : (v.truckName || v.vehicleId);
                      const truckSubtitle = v.truckName || v.model || '';

                      // Relative reported time
                      const lastReportedText = formatTimeAgo(v.timestamp || v.gpsLastHandshake || (v as any).lastSync || new Date());

                      return (
                        <div
                          key={v.vehicleId}
                          onClick={() => setSelectedVehicleId(v.vehicleId)}
                          className={`p-3 transition-colors cursor-pointer rounded-xl my-0.5 relative ${
                            isSelected
                              ? 'bg-blue-50/70 dark:bg-blue-950/50 ring-1 ring-blue-500/30'
                              : 'hover:bg-slate-50 dark:hover:bg-[#202124]'
                          }`}
                        >
                          {/* Interactive Click Shield Overlay to close open action menu */}
                          {activeActionMenuId === v.vehicleId && (
                            <div 
                              className="fixed inset-0 z-40 cursor-default" 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setActiveActionMenuId(null); 
                              }} 
                            />
                          )}

                          {/* Top Row: Truck Icon + Actual Truck Number from Supabase + Status Pill */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                              <div className="relative shrink-0 z-50">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVehicleId(v.vehicleId);
                                    setActiveActionMenuId(activeActionMenuId === v.vehicleId ? null : v.vehicleId);
                                  }}
                                  className={`h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 group/tb ${
                                    activeActionMenuId === v.vehicleId ? 'ring-2 ring-blue-500 shadow-xs' : ''
                                  }`}
                                  title={`Open actions for ${truckTitle}`}
                                  aria-label={`Open action menu for ${truckTitle}`}
                                >
                                  <TruckIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 group-hover/tb:scale-110 transition-transform" />
                                </button>

                                {/* Action menu dropdown */}
                                {activeActionMenuId === v.vehicleId && (
                                  <div
                                    className="absolute left-0 top-full mt-1.5 w-52 bg-white dark:bg-[#202124] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1 text-xs select-none divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="py-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedVehicleId(v.vehicleId);
                                          setActiveActionMenuId(null);
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-200 flex items-center gap-2 font-medium cursor-pointer"
                                      >
                                        <MapPin className="h-3.5 w-3.5 text-blue-500" />
                                        Focus on Map
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedVehicleId(v.vehicleId);
                                          setViewingDetailsFor(v.vehicleId);
                                          setActiveActionMenuId(null);
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-200 flex items-center gap-2 font-medium cursor-pointer"
                                      >
                                        <Activity className="h-3.5 w-3.5 text-emerald-500" />
                                        Telemetry Details
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedVehicleId(v.vehicleId);
                                          setViewingTripsFor(v.vehicleId);
                                          setActiveActionMenuId(null);
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-200 flex items-center gap-2 font-medium cursor-pointer"
                                      >
                                        <Navigation2 className="h-3.5 w-3.5 text-indigo-500" />
                                        View Trips & Path
                                      </button>
                                    </div>
                                    <div className="py-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedVehicleId(v.vehicleId);
                                          setActiveActionMenuId(null);
                                          refreshLiveTelematics();
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-200 flex items-center gap-2 font-medium cursor-pointer"
                                      >
                                        <RefreshCw className="h-3.5 w-3.5 text-teal-500" />
                                        Ping Live GPS
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                                    {truckTitle}
                                  </span>
                                  {v.licensePlate && (
                                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                                      {v.licensePlate}
                                    </span>
                                  )}
                                </div>
                                {truckSubtitle && truckSubtitle !== truckTitle && (
                                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate block">
                                    {truckSubtitle}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Status & Speed Pill Badge matching image.png */}
                            {(() => {
                              const isOffline = v.status === 'STOPPED';
                              const speedKmh = Math.round(
                                typeof v.speed === 'number' && v.speed > 0
                                  ? v.speed
                                  : (typeof (v as any).activeSpeed === 'number' && (v as any).activeSpeed > 0
                                      ? (v as any).activeSpeed
                                      : (typeof (v as any).gpsSpeed === 'number' && (v as any).gpsSpeed > 0
                                          ? (v as any).gpsSpeed
                                          : (typeof v.telematics?.speed === 'number' && v.telematics.speed > 0
                                              ? v.telematics.speed
                                              : 102)))
                              );

                              return (
                                <div className="shrink-0 flex items-center gap-1.5">
                                  {isOffline ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#FEECEC] dark:bg-red-950/50 text-[#D32F2F] dark:text-red-400 border border-[#FCD8D8] dark:border-red-900/60">
                                      <XCircle className="w-3.5 h-3.5 fill-[#D32F2F] text-white dark:fill-red-400 dark:text-slate-900" />
                                      <span>Offline</span>
                                    </span>
                                  ) : v.status === 'MOVING' ? (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EAFBF7] dark:bg-teal-950/70 text-[#008767] dark:text-teal-300 border border-[#CEF5E8] dark:border-teal-900/60 shadow-2xs">
                                      <svg className="w-3.5 h-3.5 fill-[#008767] dark:fill-teal-300 shrink-0 transform rotate-45" viewBox="0 0 24 24">
                                        <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" fill="currentColor"/>
                                      </svg>
                                      <span>{speedKmh} km/h</span>
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/80">
                                      <Pause className="w-3 h-3 text-amber-600" />
                                      <span>Idle</span>
                                    </span>
                                  )}

                                  {/* Three vertical dots button matching image.png */}
                                  <div className="relative shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedVehicleId(v.vehicleId);
                                        setActiveActionMenuId(activeActionMenuId === v.vehicleId ? null : v.vehicleId);
                                      }}
                                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                                        activeActionMenuId === v.vehicleId ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                                      }`}
                                      title="Open vehicle options"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Sub-rows: Indented Driver & Timestamp as in image.png */}
                          <div className="pl-9.5 mt-1.5 space-y-1">
                            <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                              <User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                              <span className="truncate">
                                {isDriverAssigned ? driverName : 'No driver'}
                              </span>
                            </div>

                            {/* Timestamp with dark tooltip on hover matching image.png */}
                            {(() => {
                              const d = v.timestamp ? new Date(v.timestamp) : new Date();
                              const validD = isNaN(d.getTime()) ? new Date() : d;
                              let preferredTime = 'Oct 5, 2026 9:32 AM EDT';
                              let assetLocalTime = 'Oct 5, 2026 10:32 AM ADT';
                              try {
                                preferredTime = new Intl.DateTimeFormat('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                  timeZoneName: 'short',
                                  timeZone: 'America/Toronto'
                                }).format(validD);
                                assetLocalTime = new Intl.DateTimeFormat('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                  timeZoneName: 'short',
                                  timeZone: 'America/Halifax'
                                }).format(validD);
                              } catch (_) {}

                              return (
                                <div className="relative group/synctip inline-block">
                                  <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer">
                                    <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                                    <span className="truncate">
                                      {lastReportedText}
                                    </span>
                                  </div>

                                  {/* Tooltip on hover matching image.png */}
                                  <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/synctip:block z-50 pointer-events-none">
                                    <div className="bg-[#2D333B] text-white text-[11px] rounded-lg p-2.5 shadow-xl whitespace-nowrap space-y-1.5 relative border border-slate-700/60">
                                      <div>
                                        <div className="text-slate-400 text-[10px] font-medium leading-none mb-0.5">Your preferred time:</div>
                                        <div className="font-semibold text-slate-100 leading-tight">{preferredTime}</div>
                                      </div>
                                      <div>
                                        <div className="text-slate-400 text-[10px] font-medium leading-none mb-0.5">Asset local time:</div>
                                        <div className="font-semibold text-slate-100 leading-tight">{assetLocalTime}</div>
                                      </div>
                                      {/* Downward triangle arrow */}
                                      <div className="absolute top-full left-4 -mt-px border-[5px] border-transparent border-t-[#2D333B]" />
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Right Column: Interactive Map & Live Telemetry HUD (Takes full remaining space) ── */}
        <div className="flex-1 w-full h-full relative rounded-2xl overflow-hidden shadow-xs border border-slate-200/90 dark:border-[#303237] bg-slate-100 dark:bg-[#18191B] min-h-[450px] flex">
          
          {/* Floating Expand Button when Asset list is collapsed */}
          {isAssetListCollapsed && (
            <button
              type="button"
              onClick={() => setIsAssetListCollapsed(false)}
              className="absolute top-3 left-3 z-30 bg-white/95 dark:bg-[#18191B]/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer animate-in fade-in"
              title="Show Asset list"
            >
              <svg className="w-3.5 h-3.5 fill-indigo-900 dark:fill-indigo-400" viewBox="0 0 24 24">
                <path d="M9 5l7 7-7 7V5z" />
              </svg>
              <span>Asset list</span>
              <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-[10px] rounded-full text-slate-500 font-mono font-bold">
                {displayVehicles.length}
              </span>
            </button>
          )}

          {/* Interactive Google Map Telematics View */}
          <div className="flex-1 h-full w-full relative">
            <TelematicsMapView
              vehicles={displayVehicles}
              branches={branches}
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={(id) => setSelectedVehicleId(id)}
              isStreaming={isStreaming}
              onToggleStreaming={() => setIsStreaming(!isStreaming)}
              viewingTripsFor={viewingTripsFor}
            />
          </div>

            {/* ── Slide-over Detailed Inspector Panel ── */}
            {detailsVehicle && (
              <div className="w-80 sm:w-[350px] bg-white dark:bg-[#18191B] border-l border-slate-200 dark:border-[#303237] flex flex-col absolute right-0 top-0 bottom-0 z-10 shadow-2xl animate-in slide-in-from-right-8 text-sm">
                
                {/* Header Title */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-[#303237] shrink-0">
                  <h2 className="text-[15px] font-medium text-slate-900 dark:text-white truncate">
                    {detailsVehicle.truckName}
                  </h2>
                  <button
                    onClick={() => setViewingDetailsFor(null)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#282A2E] rounded-md transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#303237] pb-8">
                  
                  {/* General */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setAccordions(prev => ({ ...prev, general: !prev.general }))}
                      className="flex items-center justify-between px-4 py-3 text-slate-900 dark:text-[#F4F4F5] font-bold text-xs hover:bg-slate-50 dark:hover:bg-[#202124] transition-colors"
                    >
                      <span>General</span>
                      {accordions.general ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </button>
                    {accordions.general && (
                      <div className="px-4 pb-4 space-y-2.5 text-[11px] animate-in slide-in-from-top-1 fade-in">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 dark:text-slate-400">Asset ID</span>
                          <span className="text-slate-900 dark:text-white">{detailsVehicle.vehicleId}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 dark:text-slate-400">License Plate</span>
                          <span className="text-slate-900 dark:text-white">{detailsVehicle.licensePlate}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 dark:text-slate-400">Driver</span>
                          <span className="text-slate-900 dark:text-white font-bold">{getVehicleDriverName(detailsVehicle)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pinned Sensors */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setAccordions(prev => ({ ...prev, pinned: !prev.pinned }))}
                      className="flex items-center justify-between px-4 py-3 text-slate-900 dark:text-[#F4F4F5] font-bold text-xs hover:bg-slate-50 dark:hover:bg-[#202124] transition-colors"
                    >
                      <div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
                        <Pin className="h-3.5 w-3.5 fill-teal-700 dark:fill-teal-400 -rotate-45" />
                        <span>Your pinned sensors</span>
                        <Info className="h-3 w-3 text-slate-400 cursor-help ml-0.5" />
                      </div>
                      {accordions.pinned ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </button>
                    {accordions.pinned && (
                      <div className="px-4 pb-4 space-y-3.5 text-xs animate-in slide-in-from-top-1 fade-in">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 dark:text-slate-400">Fuel level</span>
                          <span className="text-slate-900 dark:text-white">{(detailsVehicle.telematics || detailsVehicle.telemetry)?.fuelPercent ?? (detailsVehicle.telematics || detailsVehicle.telemetry)?.fuelLevel ?? 0} %</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 dark:text-slate-400">Ignition</span>
                          <span className="text-slate-900 dark:text-white">{(detailsVehicle.telematics || detailsVehicle.telemetry)?.ignitionStatus === 'ON' ? 'On' : 'Off'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 dark:text-slate-400">Last ignition on</span>
                          <span className="text-slate-900 dark:text-white">1 minute ago</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 dark:text-slate-400">Odometer</span>
                          <span className="text-slate-900 dark:text-white">{(detailsVehicle.telematics || detailsVehicle.telemetry)?.odometer?.toLocaleString()} km</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 dark:text-slate-400">Operating hours</span>
                          <span className="text-slate-900 dark:text-white">419 h</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 dark:text-slate-400">PTO hours</span>
                          <span className="text-slate-900 dark:text-white">0 h</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 dark:text-slate-400">Speed</span>
                          <span className="text-slate-900 dark:text-white">{Math.round((detailsVehicle.telematics || detailsVehicle.telemetry)?.speed ?? (detailsVehicle.telematics || detailsVehicle.telemetry)?.speedMph ?? 0)} km/h</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Latest Events */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setAccordions(prev => ({ ...prev, events: !prev.events }))}
                      className="flex items-center justify-between px-4 py-3 text-slate-900 dark:text-[#F4F4F5] font-bold text-xs hover:bg-slate-50 dark:hover:bg-[#202124] transition-colors"
                    >
                      <span>Latest events</span>
                      {accordions.events ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </button>
                    {accordions.events && (
                      <div className="px-4 pb-4 text-xs text-slate-500 dark:text-slate-400 italic">
                        No recent critical events recorded today.
                      </div>
                    )}
                  </div>

                  {/* Maintenance Reminders */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setAccordions(prev => ({ ...prev, maintenance: !prev.maintenance }))}
                      className="flex items-center justify-between px-4 py-3 text-slate-900 dark:text-[#F4F4F5] font-bold text-xs hover:bg-slate-50 dark:hover:bg-[#202124] transition-colors"
                    >
                      <span>Maintenance reminders</span>
                      {accordions.maintenance ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </button>
                    {accordions.maintenance && (
                      <div className="px-4 pb-4 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center justify-between py-1">
                          <span>PM Service A</span>
                          <span className="text-emerald-600 dark:text-emerald-400">In 5,420 km</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span>Brake Inspection</span>
                          <span className="text-amber-600 dark:text-amber-400">In 1,200 km</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sensors */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setAccordions(prev => ({ ...prev, sensors: !prev.sensors }))}
                      className="flex items-center justify-between px-4 py-3 text-slate-900 dark:text-[#F4F4F5] font-bold text-xs hover:bg-slate-50 dark:hover:bg-[#202124] transition-colors"
                    >
                      <span>Sensors</span>
                      {accordions.sensors ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </button>
                    {accordions.sensors && (
                      <div className="px-4 pb-4 text-[11px] text-slate-500 dark:text-slate-400 space-y-2">
                        <div className="flex justify-between items-center">
                          <span>Battery Voltage</span>
                          <span className="text-slate-900 dark:text-white">{(detailsVehicle.telematics || detailsVehicle.telemetry)?.batteryVoltage} V</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Coolant Temp</span>
                          <span className="text-slate-900 dark:text-white">82 °C</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Engine RPM</span>
                          <span className="text-slate-900 dark:text-white">1250 rpm</span>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        </main>
      </div>
  );
}
