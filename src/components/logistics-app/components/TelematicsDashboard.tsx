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
  Eye
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
  
  // Sidebar accordion states
  const [accordions, setAccordions] = useState({
    general: false,
    pinned: true,
    events: false,
    maintenance: false,
    sensors: false
  });
  
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
    searchQuery
  });
  // Filter vehicles to strictly match Supabase trucks (16 units)
  const vehicles = useMemo(() => {
    const baseTrucks = (trucks && trucks.length > 0) ? trucks : DEFAULT_TRUCKS;

    return baseTrucks.map((t, index) => {
      const tId = (t.id || "").toLowerCase();
      const tName = (t.name || "").toLowerCase();
      const tVin = (t.vin || "").toLowerCase();
      const tGpsId = (t.gpsDeviceId || "").toLowerCase();
      const tGpsName = (t.gpsDeviceName || "").toLowerCase();

      const tUnitMatch = tName.match(/\d+/) || tId.match(/\d+/);
      const tUnitNum = tUnitMatch ? tUnitMatch[0] : null;

      // Find matching live vehicle in rawVehicles
      const matchedRaw = rawVehicles.find(v => {
        const vId = (v.vehicleId || "").toLowerCase();
        const vName = (v.truckName || "").toLowerCase();
        const vVin = (v.vin || "").toLowerCase();
        const vUnitMatch = vName.match(/\d+/) || vId.match(/\d+/);
        const vUnitNum = vUnitMatch ? vUnitMatch[0] : null;

        return (
          tId === vId ||
          tName === vName ||
          (tVin && vVin && tVin === vVin) ||
          (tGpsId && tGpsId === vId) ||
          (tGpsName && tGpsName === vName) ||
          (vUnitNum && tUnitNum && vUnitNum === tUnitNum)
        );
      });

      const effectiveDriverName = (t.driver && !['no driver', 'unassigned', 'driver', 'assigned driver', ''].includes(t.driver.trim().toLowerCase()))
        ? t.driver.trim()
        : (matchedRaw?.driver?.name || 'Unassigned');

      if (matchedRaw) {
        return {
          ...matchedRaw,
          vehicleId: t.id,
          truckName: t.name,
          vin: t.vin || matchedRaw.vin,
          licensePlate: t.licensePlate || matchedRaw.licensePlate,
          model: t.type || matchedRaw.model,
          driver: {
            id: t.driverId || matchedRaw.driver?.id || `DRV-${index + 101}`,
            name: effectiveDriverName
          },
          activeRoute: matchedRaw.activeRoute ? {
            ...matchedRaw.activeRoute,
            driverName: effectiveDriverName
          } : undefined
        };
      }

      // If not in raw telemetry, construct valid VehicleRecord from truck
      const lat = (typeof t.lat === 'number' && !isNaN(t.lat)) ? t.lat : ((typeof t.gpsLat === 'number' && !isNaN(t.gpsLat)) ? t.gpsLat : (typeof t.currentLatitude === 'number' && !isNaN(t.currentLatitude) ? t.currentLatitude : (44.69098 + (index * 0.012))));
      const lng = (typeof t.lng === 'number' && !isNaN(t.lng)) ? t.lng : ((typeof t.gpsLng === 'number' && !isNaN(t.gpsLng)) ? t.gpsLng : (typeof t.currentLongitude === 'number' && !isNaN(t.currentLongitude) ? t.currentLongitude : (-63.59854 + (index * 0.008))));
      const isMoving = t.status === 'In Transit';
      const isIdle = t.status === 'Idling';
      const status: 'MOVING' | 'IDLE' | 'STOPPED' = isMoving ? 'MOVING' : (isIdle ? 'IDLE' : 'STOPPED');

      const telemetryObj = {
        latitude: lat,
        longitude: lng,
        lat,
        lng,
        speed: isMoving ? 48 : 0,
        speedMph: isMoving ? 48 : 0,
        heading: (index * 45) % 360,
        ignitionOn: status !== 'STOPPED',
        ignitionStatus: isMoving ? 'ON' : (isIdle ? 'IDLE' : 'OFF'),
        fuelPercent: 85,
        fuelLevel: 85,
        odometer: 54200 + index * 2100,
        batteryVoltage: 13.8,
        coolantTemp: 88,
        lastUpdated: new Date().toISOString()
      };

      return {
        vehicleId: t.id,
        truckName: t.name,
        vin: t.vin || `1FTMF1E55MKD${51000 + index}`,
        licensePlate: t.licensePlate || `PR-${9020 + index}`,
        model: t.type || 'Commercial Vehicle',
        capacityWeight: 4500,
        status,
        driver: {
          id: t.driverId || `DRV-${index + 101}`,
          name: effectiveDriverName
        },
        telematics: telemetryObj,
        telemetry: telemetryObj,
        activeRoute: undefined
      };
    });
  }, [trucks, rawVehicles]);

  // Filtered vehicles for left panel and map views
  const displayVehicles = useMemo(() => {
    let list = vehicles;
    if (statusFilter && statusFilter !== 'ALL') {
      list = list.filter(v => v.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(v => 
        (v.truckName && v.truckName.toLowerCase().includes(q)) ||
        (v.vehicleId && v.vehicleId.toLowerCase().includes(q)) ||
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
      totalActiveDeliveries
    };
  }, [vehicles]);

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

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* ── Top Telematics Header & KPI Summary Ribbon ── */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Brand Title & Live Beacon */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-900 text-white flex items-center justify-center shadow-md">
              <Radio className="h-5 w-5 text-blue-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black tracking-tight text-blue-950">Fleet Telematics & Live GPS</h1>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-mono font-bold rounded-md border border-blue-200">
                  REST v1
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Real-time Unity / Fleet Complete vehicle stream & automated route progression
              </p>
            </div>
          </div>

          {/* Polling Controls & Stream Engine */}
          <div className="flex items-center space-x-2 self-start md:self-auto">
            {/* Interval Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
              <span className="px-2 text-[10px] uppercase text-slate-400 font-bold">Poll</span>
              {[3000, 5000, 15000].map((ms) => (
                <button
                  key={ms}
                  type="button"
                  onClick={() => setPollingIntervalMs(ms)}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    pollingIntervalMs === ms 
                      ? 'bg-white text-blue-900 shadow-xs font-black' 
                      : 'hover:text-slate-900'
                  }`}
                >
                  {ms / 1000}s
                </button>
              ))}
            </div>

            {/* Manual Refresh */}
            <button
              type="button"
              onClick={() => refreshTelematics()}
              className="p-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-xs"
              title="Manual Sync"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Interactive KPI Filter Ribbon Bar ── */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                : 'bg-slate-50/80 hover:bg-slate-100/80 border-slate-200/70'
            }`}
          >
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Fleet</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-lg font-black text-slate-900">{summary.totalVehicles}</span>
              <span className="text-[11px] text-slate-500 font-medium">units</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('MOVING')}
            className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'MOVING'
                ? 'bg-emerald-100/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-emerald-50/50 hover:bg-emerald-100/50 border-emerald-200/60'
            }`}
          >
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Moving (Active)</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-lg font-black text-emerald-700">{summary.movingCount}</span>
              <span className="text-[11px] text-emerald-600 font-medium">in transit</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('IDLE')}
            className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'IDLE'
                ? 'bg-amber-100/70 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-amber-50/50 hover:bg-amber-100/50 border-amber-200/60'
            }`}
          >
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Idling Engine</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-lg font-black text-amber-700">{summary.idleCount}</span>
              <span className="text-[11px] text-amber-600 font-medium">stationary</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('STOPPED')}
            className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'STOPPED'
                ? 'bg-slate-200 border-slate-500 ring-2 ring-slate-500/20 shadow-xs'
                : 'bg-slate-100/60 hover:bg-slate-200/60 border-slate-200/70'
            }`}
          >
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Stopped / Off</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-lg font-black text-slate-700">{summary.stoppedCount}</span>
              <span className="text-[11px] text-slate-500 font-medium">parked</span>
            </div>
          </button>

          <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-200/60">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Fleet Avg Speed</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-lg font-black text-blue-900">{summary.averageSpeed}</span>
              <span className="text-[11px] text-blue-700 font-medium">km/h</span>
            </div>
          </div>

          <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Stops</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-lg font-black text-slate-900">{summary.totalActiveDeliveries}</span>
              <span className="text-[11px] text-slate-500 font-medium">stops</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Two-Column Telematics Layout ── */}
      <main className="w-full flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ── Left Column: Vehicle Telematics Directory (aligned to left edge) ── */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col space-y-4">
          
          {viewingTripsFor ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col max-h-[calc(100vh-320px)] lg:max-h-[660px] xl:max-h-[740px] overflow-hidden">
                {/* Header with back button */}
                <div className="p-3 border-b border-slate-200/90 flex items-center gap-2 shrink-0">
                    <button onClick={() => setViewingTripsFor(null)} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-500">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="font-medium text-[15px] text-slate-900">Trips</h2>
                </div>

                {/* Filters section */}
                <div className="p-4 border-b border-slate-200/90 space-y-4 bg-slate-50 shrink-0">
                    <div>
                        <label className="text-[11px] text-slate-500 mb-1.5 block">Date and time</label>
                        <div className="flex items-center gap-2 bg-slate-200/60 p-2.5 rounded-lg text-xs font-medium text-slate-700">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            Aug 19, 2026 12:00 AM - 11:59 PM
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-[11px] text-slate-500 mb-1.5 block">Asset</label>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center justify-between bg-slate-200/60 p-2.5 rounded-lg text-xs font-medium text-slate-700 cursor-pointer">
                                <span className="truncate">{vehicles.find(v => v.vehicleId === viewingTripsFor)?.truckName || viewingTripsFor}</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <div className="flex items-center justify-between bg-slate-200/60 p-2.5 rounded-lg text-xs font-medium text-slate-700 cursor-pointer">
                                <span className="truncate text-slate-400">Driver</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Filter by location" className="w-full text-xs py-2.5 pl-9 pr-8 bg-slate-200/60 rounded-lg outline-none placeholder:text-slate-400" />
                        <Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-600" />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 pt-3 border-t border-slate-200/70">
                        <div className="flex items-center gap-1" title="Trips">
                            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" /> 13
                        </div>
                        <div className="flex items-center gap-1" title="Distance">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" /> 249.3km
                        </div>
                        <div className="flex items-center gap-1" title="Driving Time">
                            <Clock className="w-3.5 h-3.5 text-slate-400" /> 3h 44m
                        </div>
                        <div className="flex items-center gap-1" title="Idle Time">
                            <Pause className="w-3.5 h-3.5 text-slate-400" /> 46m
                        </div>
                        <div className="flex items-center gap-1 text-red-600 font-bold" title="Alerts">
                            <AlertCircle className="w-3.5 h-3.5" /> 15
                        </div>
                    </div>
                </div>
                
                {/* Banner */}
                <div className="p-3 bg-blue-50/50 border-b border-blue-100/50 flex gap-2.5 items-start shrink-0">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-blue-800 font-medium">For more details of all the assets data points please go to <a href="#" className="underline text-blue-700">Track & Events</a></span>
                </div>

                {/* Date Accordion & Scrollable Trips */}
                <div className="flex-1 overflow-y-auto">
                    <div className="flex items-center justify-between p-3.5 bg-slate-50/80 border-b border-slate-200/80 font-bold text-slate-900 text-xs shrink-0">
                        <div className="flex items-center gap-2.5">
                            <Eye className="w-4 h-4 text-slate-500" />
                            Wed, Aug 19, 2026
                        </div>
                        <div className="flex items-center gap-3.5 text-[11px] text-slate-600">
                            <div className="flex items-center gap-1.5 font-mono font-medium">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" /> 249.3km
                            </div>
                            <div className="flex items-center gap-1 text-red-600 font-bold">
                                <AlertCircle className="w-3.5 h-3.5" /> 15
                            </div>
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                        </div>
                    </div>

                    {/* Trip Items */}
                    <div className="p-4 space-y-3">
                        {/* Trip 1 */}
                        <div className="relative">
                            <div className="absolute left-1.5 top-9 bottom-4 w-px bg-slate-200" />
                            <div className="text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-wider">Business</div>
                            <div className="flex gap-3">
                                <div className="flex flex-col items-center shrink-0 w-3 pt-1 relative z-10">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400 outline outline-4 outline-white" />
                                </div>
                                <div className="flex-1 text-[11px]">
                                    <div className="flex gap-2">
                                        <span className="font-bold text-slate-900 w-[72px] shrink-0">6:19 AM ADT</span>
                                        <span className="text-slate-600 truncate">Windmill</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-3">
                                <div className="flex flex-col items-center shrink-0 w-3 pt-1 relative z-10">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400 outline outline-4 outline-white" />
                                </div>
                                <div className="flex-1 text-[11px]">
                                    <div className="flex gap-2">
                                        <span className="font-bold text-slate-900 w-[72px] shrink-0">6:21 AM ADT</span>
                                        <span className="text-slate-600 truncate">30 Waddell Ave, Dartmouth, NS</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-3.5 text-[10px] text-slate-500 font-medium ml-6 pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                    <User className="w-3 h-3 text-blue-600" /> {tripsDriverName}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1" title="Distance"><MapPin className="w-3 h-3" /> 0.21km</div>
                                    <div className="flex items-center gap-1" title="Driving Time"><Clock className="w-3 h-3" /> 1m</div>
                                    <div className="flex items-center gap-1" title="Idle Time"><Pause className="w-3 h-3" /> 1m</div>
                                    <div className="flex items-center gap-1" title="Alerts"><AlertCircle className="w-3 h-3 text-slate-300" /> 0</div>
                                </div>
                            </div>
                        </div>

                        {/* Pause separator */}
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold bg-slate-100/80 border border-slate-200/60 w-fit px-2.5 py-1 rounded-md ml-1 my-1">
                            <Pause className="w-3 h-3" /> Pause 1m
                        </div>

                        {/* Trip 2 */}
                        <div className="relative mt-2">
                            <div className="absolute left-1.5 top-9 bottom-4 w-px bg-slate-200" />
                            <div className="text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-wider">Business</div>
                            <div className="flex gap-3">
                                <div className="flex flex-col items-center shrink-0 w-3 pt-1 relative z-10">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400 outline outline-4 outline-white" />
                                </div>
                                <div className="flex-1 text-[11px]">
                                    <div className="flex gap-2">
                                        <span className="font-bold text-slate-900 w-[72px] shrink-0">6:22 AM ADT</span>
                                        <span className="text-slate-600 truncate">30 Waddell Ave, Dartmouth, NS</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-3">
                                <div className="flex flex-col items-center shrink-0 w-3 pt-1 relative z-10">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400 outline outline-4 outline-white" />
                                </div>
                                <div className="flex-1 text-[11px]">
                                    <div className="flex gap-2">
                                        <span className="font-bold text-slate-900 w-[72px] shrink-0">6:26 AM ADT</span>
                                        <span className="text-slate-600 truncate">500 Windmill Rd, Dartmouth, NS</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-3.5 text-[10px] text-slate-500 font-medium ml-6 pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                    <User className="w-3 h-3 text-blue-600" /> {tripsDriverName}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1" title="Distance"><MapPin className="w-3 h-3" /> 0.99km</div>
                                    <div className="flex items-center gap-1" title="Driving Time"><Clock className="w-3 h-3" /> 3m</div>
                                    <div className="flex items-center gap-1" title="Idle Time"><Pause className="w-3 h-3" /> 3m</div>
                                    <div className="flex items-center gap-1" title="Alerts"><AlertCircle className="w-3 h-3 text-slate-300" /> 0</div>
                                </div>
                            </div>
                        </div>

                        {/* Pause separator */}
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold bg-slate-100/80 border border-slate-200/60 w-fit px-2.5 py-1 rounded-md ml-1 my-1">
                            <Pause className="w-3 h-3" /> Pause 42m
                        </div>

                        {/* Trip 3 */}
                        <div className="relative mt-2">
                            <div className="absolute left-1.5 top-9 bottom-4 w-px bg-slate-200" />
                            <div className="text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-wider">Business</div>
                            <div className="flex gap-3">
                                <div className="flex flex-col items-center shrink-0 w-3 pt-1 relative z-10">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400 outline outline-4 outline-white" />
                                </div>
                                <div className="flex-1 text-[11px]">
                                    <div className="flex gap-2">
                                        <span className="font-bold text-slate-900 w-[72px] shrink-0">7:08 AM ADT</span>
                                        <span className="text-slate-600 truncate">500 Windmill Rd, Dartmouth, NS</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-3">
                                <div className="flex flex-col items-center shrink-0 w-3 pt-1 relative z-10">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400 outline outline-4 outline-white" />
                                </div>
                                <div className="flex-1 text-[11px]">
                                    <div className="flex gap-2">
                                        <span className="font-bold text-slate-900 w-[72px] shrink-0">7:20 AM ADT</span>
                                        <span className="text-slate-600 truncate">500 Windmill Rd, Dartmouth, NS</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-3.5 text-[10px] text-slate-500 font-medium ml-6 pb-4">
                                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                    <User className="w-3 h-3 text-blue-600" /> {tripsDriverName}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1" title="Distance"><MapPin className="w-3 h-3" /> 3.81km</div>
                                    <div className="flex items-center gap-1" title="Driving Time"><Clock className="w-3 h-3" /> 11m</div>
                                    <div className="flex items-center gap-1" title="Idle Time"><Pause className="w-3 h-3" /> 6m</div>
                                    <div className="flex items-center gap-1" title="Alerts"><AlertCircle className="w-3 h-3 text-slate-300" /> 0</div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
          ) : (
            <>
              {/* Search & Status Filter Bar */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search truck, VIN, plate, or driver..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  {(['ALL', 'MOVING', 'IDLE', 'STOPPED'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setStatusFilter(tab)}
                      className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                        statusFilter === tab
                          ? 'bg-white text-blue-900 shadow-xs font-black'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vehicle List */}
              <div className="space-y-2.5 max-h-[calc(100vh-320px)] lg:max-h-[660px] xl:max-h-[740px] overflow-y-auto pr-1">
                {displayVehicles.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500">
                    <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-bold">No telemetry records match your filters.</p>
                  </div>
                ) : (
                  displayVehicles.map((v) => {
                    const isSelected = v.vehicleId === selectedVehicleId;
                    const stops = v.activeRoute?.stops || [];
                    const completed = v.activeRoute?.completedStops || 0;
                    const driverName = getVehicleDriverName(v);
                    const unitMatch = v.truckName.match(/\d+/) || v.vehicleId.match(/\d+/);
                    const unitBadge = unitMatch ? `#${unitMatch[0]}` : `#${v.vehicleId.slice(-3)}`;

                    return (
                      <div
                        key={v.vehicleId}
                        onClick={() => setSelectedVehicleId(v.vehicleId)}
                        className={`bg-white rounded-2xl p-3.5 border transition-all cursor-pointer shadow-xs hover:border-blue-300 ${
                          isSelected 
                            ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20' 
                            : 'border-slate-200/90 hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Header: Name & Status */}
                        <div className="flex items-start justify-between relative">
                          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                            <div className="h-9 w-9 rounded-xl bg-blue-100/90 text-blue-800 border border-blue-200/80 flex items-center justify-center font-mono font-black text-xs shrink-0 shadow-2xs">
                              {unitBadge}
                            </div>
                            <div className="min-w-0 pr-2 flex-1">
                              <h3 className="text-xs font-black text-slate-900 leading-snug truncate">{v.truckName}</h3>
                              <p className="text-[11px] text-slate-500 font-mono truncate">{v.licensePlate} &bull; {v.model}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0 z-10">
                            {getStatusBadge(v.status)}
                            
                            <div className="relative ml-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveActionMenuId(activeActionMenuId === v.vehicleId ? null : v.vehicleId);
                                }}
                                className={`p-1.5 hover:bg-slate-200/50 rounded-md transition-colors cursor-pointer ${
                                  activeActionMenuId === v.vehicleId ? 'text-teal-600 bg-teal-50' : 'text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {activeActionMenuId === v.vehicleId && (
                                <div 
                                  className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] text-slate-700 py-1 text-[11px] select-none font-sans divide-y divide-slate-100 animate-in fade-in"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="py-1">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        setActiveActionMenuId(null);
                                        try {
                                          await fetch('/api/telematics/ping', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ truckId: v.vehicleId, name: v.truckName })
                                          });
                                        } catch (e) {}
                                      }}
                                      className="w-full text-left px-3 py-1.5 hover:bg-teal-50 hover:text-teal-800 transition-colors flex items-center font-bold text-teal-700"
                                    >
                                      <span className="w-2 h-2 rounded-full bg-teal-500 mr-2 animate-pulse" />
                                      Ping Live GPS
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        setViewingDetailsFor(v.vehicleId);
                                        setViewingTripsFor(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium text-slate-700"
                                    >
                                      Details & Specs
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        setViewingTripsFor(v.vehicleId);
                                        setViewingDetailsFor(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium text-slate-700"
                                    >
                                      Trips
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        setSelectedVehicleId(v.vehicleId);
                                      }}
                                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium text-slate-700"
                                    >
                                      Track & Events
                                    </button>
                                  </div>
                                  <div className="py-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        const coords = `${(v.telematics || v.telemetry)?.lat ?? 0}, ${(v.telematics || v.telemetry)?.lng ?? 0}`;
                                        navigator.clipboard.writeText(coords);
                                      }}
                                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-slate-900 transition-colors text-slate-700"
                                    >
                                      Copy Coordinates
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        navigator.clipboard.writeText(`https://prospaces.ca/track/${v.vehicleId}`);
                                      }}
                                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-slate-900 transition-colors text-slate-700"
                                    >
                                      Live Share Link
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Prominent Driver Information Area */}
                        <div className="mt-2.5 flex items-center justify-between bg-slate-50/90 px-2.5 py-1.5 rounded-xl border border-slate-200/70">
                          <div className="flex items-center space-x-2 truncate">
                            <div className="h-6 w-6 rounded-lg bg-blue-100/80 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
                              <User className="h-3.5 w-3.5" />
                            </div>
                            <div className="truncate">
                              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block leading-none">Driver</span>
                              <span className="text-xs font-bold text-slate-850 truncate leading-tight block">{driverName}</span>
                            </div>
                          </div>
                          {v.activeRoute && (
                            <span className="font-mono text-[10.5px] text-slate-600 shrink-0 ml-2 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
                              {completed}/{stops.length || v.activeRoute.totalStops || 0} Stops
                            </span>
                          )}
                        </div>

                        {/* Next stop ETA if available */}
                        {v.activeRoute?.nextStop && (
                          <div className="mt-1.5 px-2.5 py-1 bg-blue-50/50 rounded-lg border border-blue-100/80 flex items-center justify-between text-[10px] text-slate-600">
                            <span className="truncate pr-2 font-mono text-slate-600 font-medium">
                              Next: {v.activeRoute.nextStop}
                            </span>
                            <span className="font-mono text-blue-700 font-bold shrink-0">
                              ETA {v.activeRoute.eta || v.activeRoute.scheduledETA}
                            </span>
                          </div>
                        )}

                        {/* Telemetry Metrics Bar */}
                        <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2 border-t border-slate-100 text-center">
                          <div className="bg-slate-50 py-1 rounded-lg">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Speed</span>
                            <span className="text-xs font-mono font-black text-blue-700">
                              {Math.round((v.telematics || v.telemetry)?.speed ?? (v.telematics || v.telemetry)?.speedMph ?? 0)} km/h
                            </span>
                          </div>
                          <div className="bg-slate-50 py-1 rounded-lg">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Heading</span>
                            <span className="text-xs font-mono font-bold text-slate-700">
                              {(v.telematics || v.telemetry)?.heading ?? 0}&deg;
                            </span>
                          </div>
                          <div className="bg-slate-50 py-1 rounded-lg">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Fuel</span>
                            <span className="text-xs font-mono font-bold text-emerald-600">
                              {(v.telematics || v.telemetry)?.fuelPercent ?? (v.telematics || v.telemetry)?.fuelLevel ?? 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Right Column: Interactive Map & Live Telemetry HUD ── */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col h-full relative">
          
          {/* Interactive Google Map Telematics View */}
          <div className="flex-1 w-full rounded-2xl overflow-hidden shadow-xs border border-slate-200/90 relative flex bg-slate-100 min-h-[540px] lg:min-h-0">
            <div className="flex-1 h-full relative">
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
              <div className="w-80 sm:w-[350px] bg-white border-l border-slate-200 flex flex-col absolute right-0 top-0 bottom-0 z-10 shadow-2xl animate-in slide-in-from-right-8 text-sm">
                
                {/* Header Title */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 shrink-0">
                  <h2 className="text-[15px] font-medium text-slate-900 truncate">
                    {detailsVehicle.truckName}
                  </h2>
                  <button
                    onClick={() => setViewingDetailsFor(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-slate-900 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pb-8">
                  
                  {/* General */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setAccordions(prev => ({ ...prev, general: !prev.general }))}
                      className="flex items-center justify-between px-4 py-3 text-slate-900 font-bold text-xs hover:bg-slate-50 transition-colors"
                    >
                      <span>General</span>
                      {accordions.general ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </button>
                    {accordions.general && (
                      <div className="px-4 pb-4 space-y-2.5 text-[11px] animate-in slide-in-from-top-1 fade-in">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Asset ID</span>
                          <span className="text-slate-900">{detailsVehicle.vehicleId}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">License Plate</span>
                          <span className="text-slate-900">{detailsVehicle.licensePlate}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Driver</span>
                          <span className="text-slate-900 font-bold">{getVehicleDriverName(detailsVehicle)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pinned Sensors */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setAccordions(prev => ({ ...prev, pinned: !prev.pinned }))}
                      className="flex items-center justify-between px-4 py-3 text-slate-900 font-bold text-xs hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 text-teal-700">
                        <Pin className="h-3.5 w-3.5 fill-teal-700 -rotate-45" />
                        <span>Your pinned sensors</span>
                        <Info className="h-3 w-3 text-slate-400 cursor-help ml-0.5" />
                      </div>
                      {accordions.pinned ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </button>
                    {accordions.pinned && (
                      <div className="px-4 pb-4 space-y-3.5 text-xs animate-in slide-in-from-top-1 fade-in">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Fuel level</span>
                          <span className="text-slate-900">{(detailsVehicle.telematics || detailsVehicle.telemetry)?.fuelPercent ?? (detailsVehicle.telematics || detailsVehicle.telemetry)?.fuelLevel ?? 0} %</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Ignition</span>
                          <span className="text-slate-900">{(detailsVehicle.telematics || detailsVehicle.telemetry)?.ignitionStatus === 'ON' ? 'On' : 'Off'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Last ignition on</span>
                          <span className="text-slate-900">1 minute ago</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Odometer</span>
                          <span className="text-slate-900">{(detailsVehicle.telematics || detailsVehicle.telemetry)?.odometer?.toLocaleString()} km</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Operating hours</span>
                          <span className="text-slate-900">419 h</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">PTO hours</span>
                          <span className="text-slate-900">0 h</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Speed</span>
                          <span className="text-slate-900">{Math.round((detailsVehicle.telematics || detailsVehicle.telemetry)?.speed ?? (detailsVehicle.telematics || detailsVehicle.telemetry)?.speedMph ?? 0)} km/h</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Latest Events */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setAccordions(prev => ({ ...prev, events: !prev.events }))}
                      className="flex items-center justify-between px-4 py-3 text-slate-900 font-bold text-xs hover:bg-slate-50 transition-colors"
                    >
                      <span>Latest events</span>
                      {accordions.events ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </button>
                    {accordions.events && (
                      <div className="px-4 pb-4 text-xs text-slate-500 italic">
                        No recent critical events recorded today.
                      </div>
                    )}
                  </div>

                  {/* Maintenance Reminders */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setAccordions(prev => ({ ...prev, maintenance: !prev.maintenance }))}
                      className="flex items-center justify-between px-4 py-3 text-slate-900 font-bold text-xs hover:bg-slate-50 transition-colors"
                    >
                      <span>Maintenance reminders</span>
                      {accordions.maintenance ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </button>
                    {accordions.maintenance && (
                      <div className="px-4 pb-4 text-xs text-slate-500">
                        <div className="flex items-center justify-between py-1">
                          <span>PM Service A</span>
                          <span className="text-emerald-600">In 5,420 km</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span>Brake Inspection</span>
                          <span className="text-amber-600">In 1,200 km</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sensors */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setAccordions(prev => ({ ...prev, sensors: !prev.sensors }))}
                      className="flex items-center justify-between px-4 py-3 text-slate-900 font-bold text-xs hover:bg-slate-50 transition-colors"
                    >
                      <span>Sensors</span>
                      {accordions.sensors ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </button>
                    {accordions.sensors && (
                      <div className="px-4 pb-4 text-[11px] text-slate-500 space-y-2">
                        <div className="flex justify-between items-center">
                          <span>Battery Voltage</span>
                          <span className="text-slate-900">{(detailsVehicle.telematics || detailsVehicle.telemetry)?.batteryVoltage} V</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Coolant Temp</span>
                          <span className="text-slate-900">82 °C</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Engine RPM</span>
                          <span className="text-slate-900">1250 rpm</span>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
