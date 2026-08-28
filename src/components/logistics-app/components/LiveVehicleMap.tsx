import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { VehicleRecord, TelematicsApiResponse, RouteStop } from '../types/telematics';
import { Branch } from '../types';
import { DEFAULT_BRANCHES } from '../data';
import { getBranchCoordinates } from '../lib/mapHelpers';
import { TeardropTruckMarker } from './TeardropTruckMarker';
import {
  Truck as TruckIcon,
  Navigation2,
  MapPin,
  Layers,
  Activity,
  Gauge,
  Compass,
  Clock,
  Fuel,
  Zap,
  User,
  Phone,
  Maximize2,
  Radio,
  LocateFixed,
  AlertCircle,
  Key,
  X,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Store as StoreIcon,
  Warehouse as WarehouseIcon
} from 'lucide-react';

// Google Maps API Key resolution from environment variables & localStorage
const GOOGLE_MAPS_KEY_ENV =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  process.env.VITE_GOOGLE_MAPS_API_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  (import.meta as any).env?.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.GOOGLE_MAPS_API_KEY ||
  '';

// Default center: Dartmouth / Halifax Regional Logistics Corridor
const REGIONAL_CENTER = { lat: 44.69098, lng: -63.59854 };

// ════════════════════════════════════════════════════════════════════════════
// HELPER: COMPASS HEADING CALCULATION (0° - 360° to Cardinal Direction)
// ════════════════════════════════════════════════════════════════════════════
function getCompassDirection(heading: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(((heading % 360) / 22.5)) % 16;
  return directions[index] || 'N';
}

// ════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: ANIMATED TRUCK MARKER (Smooth Lat/Lng & Heading Interpolation)
// ════════════════════════════════════════════════════════════════════════════
interface AnimatedTruckMarkerProps {
  vehicle: VehicleRecord;
  isSelected: boolean;
  onClick: () => void;
}

function AnimatedTruckMarker({ vehicle, isSelected, onClick }: AnimatedTruckMarkerProps) {
  const tel = vehicle.telematics || vehicle.telemetry || {
    lat: 44.69098,
    lng: -63.59854,
    latitude: 44.69098,
    longitude: -63.59854,
    heading: 0,
    speed: 0,
    speedMph: 0,
    ignitionStatus: 'OFF',
    fuelLevel: 80
  };

  const vLat = tel.latitude ?? tel.lat ?? 44.69098;
  const vLng = tel.longitude ?? tel.lng ?? -63.59854;

  // Current animated position state
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number }>({
    lat: vLat,
    lng: vLng
  });

  // Track previous target coordinates to animate transitions
  const prevTargetRef = useRef<{ lat: number; lng: number }>({
    lat: vLat,
    lng: vLng
  });

  const animationFrameRef = useRef<number | null>(null);

  // Smooth position interpolation when vehicle telematics updates
  useEffect(() => {
    const targetLat = vLat;
    const targetLng = vLng;

    const startLat = prevTargetRef.current.lat;
    const startLng = prevTargetRef.current.lng;

    // If position changed, animate smoothly over 1.8 seconds using cubic ease-out
    if (startLat !== targetLat || startLng !== targetLng) {
      const startTime = performance.now();
      const duration = 1800; // 1.8s interpolation

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Cubic ease-out formula: 1 - Math.pow(1 - progress, 3)
        const ease = 1 - Math.pow(1 - progress, 3);

        const nextLat = startLat + (targetLat - startLat) * ease;
        const nextLng = startLng + (targetLng - startLng) * ease;

        setCurrentPos({ lat: nextLat, lng: nextLng });

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          prevTargetRef.current = { lat: targetLat, lng: targetLng };
          setCurrentPos({ lat: targetLat, lng: targetLng });
        }
      };

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      setCurrentPos({ lat: targetLat, lng: targetLng });
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [vLat, vLng]);

  const status = vehicle.status || 'STOPPED';
  const heading = tel.heading || 0;
  const speed = tel.speedMph ?? tel.speed ?? 0;

  // Status visual styles
  const isMoving = status === 'MOVING';
  const isIdle = status === 'IDLE';

  const markerColor = isMoving
    ? '#059669' // Emerald
    : isIdle
    ? '#d97706' // Amber
    : '#475569'; // Slate

  const driverName = vehicle.driver?.name || vehicle.activeRoute?.driverName || 'Unassigned';
  const unitMatch = vehicle.truckName.match(/\d+/) || vehicle.vehicleId.match(/\d+/);
  const unitLabel = unitMatch ? `#${unitMatch[0]}` : (vehicle.truckName.split('-')[0]?.trim() || `#${vehicle.vehicleId.slice(-3)}`);

  return (
    <AdvancedMarker
      position={currentPos}
      onClick={onClick}
      zIndex={isSelected ? 100 : isMoving ? 50 : 20}
      title={`${vehicle.truckName} • Driver: ${driverName} (${status})`}
    >
      <TeardropTruckMarker
        color={markerColor}
        isMoving={isMoving}
        isIdling={isIdle}
        isSelected={isSelected}
        heading={heading}
        label={unitLabel}
        driverName={driverName}
        speedText={isMoving ? `${Math.round(speed)}k` : undefined}
        size="md"
      />
    </AdvancedMarker>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: ACTIVE ROUTE POLYLINE & STOP PINS OVERLAY
// ════════════════════════════════════════════════════════════════════════════
function ActiveRouteOverlay({ vehicle }: { vehicle: VehicleRecord | null }) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !vehicle || !vehicle.activeRoute || !window.google?.maps) {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      return;
    }

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    const stops = vehicle.activeRoute.stops || [];
    if (stops.length === 0) return;

    // Connect truck current position with active route stops
    const path = [
      { lat: vehicle.telemetry.lat, lng: vehicle.telemetry.lng },
      ...stops.map(s => ({ lat: s.lat, lng: s.lng }))
    ];

    const polyline = new window.google.maps.Polyline({
      path,
      strokeColor: '#2563eb',
      strokeOpacity: 0.85,
      strokeWeight: 4,
      geodesic: true,
      icons: [
        {
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 2.5,
            strokeColor: '#1d4ed8',
            fillColor: '#60a5fa',
            fillOpacity: 1
          },
          offset: '50%',
          repeat: '120px'
        }
      ],
      map
    });

    polylineRef.current = polyline;

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, vehicle]);

  if (!vehicle || !vehicle.activeRoute || !vehicle.activeRoute.stops) return null;

  return (
    <>
      {vehicle.activeRoute.stops.map((stop, idx) => {
        const isCompleted = stop.status === 'COMPLETED';
        const isActive = stop.status === 'ACTIVE';

        return (
          <AdvancedMarker
            key={stop.id || `stop-${idx}`}
            position={{ lat: stop.lat, lng: stop.lng }}
            zIndex={40 + idx}
            title={`Stop #${stop.stopNumber || idx + 1}: ${stop.customerName}`}
          >
            <div className="flex flex-col items-center group cursor-pointer">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-lg border-2 ${
                  isCompleted
                    ? 'bg-slate-200 text-slate-600 border-slate-400'
                    : isActive
                    ? 'bg-amber-500 text-white border-white ring-2 ring-amber-400'
                    : 'bg-blue-600 text-white border-white'
                }`}
              >
                {isCompleted ? '✓' : stop.stopNumber || idx + 1}
              </div>
              <div className="mt-0.5 px-1.5 py-0.5 bg-slate-900/90 text-white text-[9px] font-medium rounded border border-slate-700 shadow max-w-[100px] truncate">
                {stop.customerName}
              </div>
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: TRAFFIC & MAP CONTROLLER
// ════════════════════════════════════════════════════════════════════════════
function MapLayerController({
  showTraffic,
  selectedVehicle,
  followVehicle
}: {
  showTraffic: boolean;
  selectedVehicle: VehicleRecord | null;
  followVehicle: boolean;
}) {
  const map = useMap();
  const trafficRef = useRef<google.maps.TrafficLayer | null>(null);

  // Manage Google Traffic Layer
  useEffect(() => {
    if (!map || !window.google?.maps) return;

    if (showTraffic) {
      if (!trafficRef.current) {
        trafficRef.current = new window.google.maps.TrafficLayer();
      }
      trafficRef.current.setMap(map);
    } else {
      if (trafficRef.current) {
        trafficRef.current.setMap(null);
      }
    }

    return () => {
      if (trafficRef.current) {
        trafficRef.current.setMap(null);
      }
    };
  }, [map, showTraffic]);

  // Smooth camera pan when selected vehicle moves or is clicked
  useEffect(() => {
    if (!map || !selectedVehicle || !followVehicle || !window.google?.maps) return;

    const tel = selectedVehicle.telematics || selectedVehicle.telemetry;
    const vLat = tel?.latitude ?? tel?.lat;
    const vLng = tel?.longitude ?? tel?.lng;

    if (typeof vLat === 'number' && typeof vLng === 'number') {
      map.panTo({
        lat: vLat,
        lng: vLng
      });
    }
  }, [map, selectedVehicle, followVehicle]);

  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: LIVE VEHICLE MAP (ProSpaces Logistics Telematics)
// ════════════════════════════════════════════════════════════════════════════
export interface LiveVehicleMapProps {
  initialSelectedId?: string | null;
  branches?: Branch[];
  onVehicleClick?: (vehicle: VehicleRecord) => void;
  className?: string;
  pollIntervalMs?: number; // default 10000 (10s)
}

export default function LiveVehicleMap({
  initialSelectedId = null,
  branches,
  onVehicleClick,
  className = '',
  pollIntervalMs = 10000
}: LiveVehicleMapProps) {
  const activeBranches = useMemo(() => {
    if (branches && branches.length > 0) return branches;
    return DEFAULT_BRANCHES;
  }, [branches]);
  // Telematics State
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(initialSelectedId);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number>(pollIntervalMs / 1000);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Map Controls State
  const [showTraffic, setShowTraffic] = useState<boolean>(false);
  const [followVehicle, setFollowVehicle] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'MOVING' | 'IDLE' | 'STOPPED'>('ALL');
  const [mapTypeId, setMapTypeId] = useState<string>('roadmap');

  // API Key handling
  const [apiKey, setApiKey] = useState<string>(() => {
    if (GOOGLE_MAPS_KEY_ENV && GOOGLE_MAPS_KEY_ENV !== 'YOUR_API_KEY') return GOOGLE_MAPS_KEY_ENV;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('GOOGLE_MAPS_PLATFORM_KEY');
      if (stored && stored !== 'YOUR_API_KEY') return stored;
    }
    return '';
  });

  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [inputKey, setInputKey] = useState<string>('');

  // Save manual key to localStorage
  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputKey.trim();
    if (clean) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('GOOGLE_MAPS_PLATFORM_KEY', clean);
      }
      setApiKey(clean);
      setShowKeyModal(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 10-SECOND TELEMATICS POLLING ENGINE
  // ════════════════════════════════════════════════════════════════════════════
  const fetchTelematics = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch('/api/v1/telematics/vehicles');
      if (!res.ok) {
        throw new Error(`Server responded with HTTP ${res.status}`);
      }

      const data: TelematicsApiResponse = await res.json();
      if (data && Array.isArray(data.vehicles)) {
        setVehicles(data.vehicles);
        setLastSyncTime(new Date());
        setErrorMsg(null);
      }
    } catch (err: any) {
      console.warn('[LiveVehicleMap] Telematics sync notice:', err);
      setErrorMsg(err.message || 'Telematics stream connection pending');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setCountdown(pollIntervalMs / 1000);
    }
  }, [pollIntervalMs]);

  // Initial fetch on component mount
  useEffect(() => {
    fetchTelematics();
  }, [fetchTelematics]);

  // 10-Second Polling Timer and 1-Second Countdown Engine
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      fetchTelematics();
    }, pollIntervalMs);

    const countdownTimer = setInterval(() => {
      setCountdown(prev => (prev > 1 ? prev - 1 : pollIntervalMs / 1000));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdownTimer);
    };
  }, [isStreaming, pollIntervalMs, fetchTelematics]);

  // Selected vehicle reference
  const selectedVehicle = useMemo(() => {
    return vehicles.find(v => v.vehicleId === selectedVehicleId) || null;
  }, [vehicles, selectedVehicleId]);

  // Filtered vehicles based on status filter chip
  const filteredVehicles = useMemo(() => {
    if (statusFilter === 'ALL') return vehicles;
    return vehicles.filter(v => {
      if (statusFilter === 'MOVING') return v.status === 'MOVING';
      if (statusFilter === 'IDLE') return v.status === 'IDLE';
      return v.status === 'STOPPED' || v.status === 'OFF';
    });
  }, [vehicles, statusFilter]);

  // Fleet Statistics
  const stats = useMemo(() => {
    const total = vehicles.length;
    const moving = vehicles.filter(v => v.status === 'MOVING').length;
    const idle = vehicles.filter(v => v.status === 'IDLE').length;
    const stopped = vehicles.filter(v => v.status === 'STOPPED' || v.status === 'OFF').length;
    const avgSpeed = total > 0 ? Math.round(vehicles.reduce((sum, v) => sum + (v.telemetry?.speed || 0), 0) / total) : 0;
    return { total, moving, idle, stopped, avgSpeed };
  }, [vehicles]);

  const handleSelectVehicle = (v: VehicleRecord) => {
    setSelectedVehicleId(v.vehicleId);
    if (onVehicleClick) {
      onVehicleClick(v);
    }
  };

  return (
    <div className={`relative w-full h-[650px] md:h-[750px] flex flex-col bg-slate-950 text-slate-100 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl ${className}`}>
      {/* ════════════════════════════════════════════════════════════════════════
          TOP CONTROL & LIVE TELEMETRY BAR
          ════════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight text-white">Live Fleet Telematics</h3>
                <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {isStreaming ? `Live (Sync in ${countdown}s)` : 'Stream Paused'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>{stats.total} Vehicles Monitored</span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">{stats.moving} Moving</span>
                <span>•</span>
                <span className="text-amber-400 font-medium">{stats.idle} Idling</span>
              </p>
            </div>
          </div>
        </div>

        {/* Filter Chips & Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Status Filters */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'ALL' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('MOVING')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                statusFilter === 'MOVING' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Moving ({stats.moving})
            </button>
            <button
              onClick={() => setStatusFilter('IDLE')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                statusFilter === 'IDLE' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Idle ({stats.idle})
            </button>
            <button
              onClick={() => setStatusFilter('STOPPED')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                statusFilter === 'STOPPED' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Off ({stats.stopped})
            </button>
          </div>

          {/* Traffic Toggle */}
          <button
            onClick={() => setShowTraffic(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showTraffic
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle Live Traffic Flow"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Traffic</span>
          </button>

          {/* Streaming Pause/Play */}
          <button
            onClick={() => setIsStreaming(prev => !prev)}
            className={`p-1.5 rounded-xl border text-xs font-semibold transition-all ${
              isStreaming
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                : 'bg-amber-600 text-white border-amber-500'
            }`}
            title={isStreaming ? 'Pause 10s Telematics Stream' : 'Resume 10s Telematics Stream'}
          >
            {isStreaming ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Manual Refresh Trigger */}
          <button
            onClick={() => fetchTelematics(true)}
            disabled={isRefreshing}
            className="p-1.5 bg-slate-800 text-slate-300 border border-slate-700 hover:text-white rounded-xl transition-all disabled:opacity-50"
            title="Refresh GPS Coordinates Now"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          GOOGLE MAPS CANVAS CONTAINER
          ════════════════════════════════════════════════════════════════════════ */}
      <div className="relative flex-1 w-full bg-slate-900 overflow-hidden">
        {apiKey ? (
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={REGIONAL_CENTER}
              defaultZoom={11}
              mapId="prospaces-live-telematics"
              mapTypeId={mapTypeId}
              gestureHandling="greedy"
              disableDefaultUI={false}
              className="w-full h-full"
            >
              {/* Traffic Layer & Dynamic Camera Follower */}
              <MapLayerController
                showTraffic={showTraffic}
                selectedVehicle={selectedVehicle}
                followVehicle={followVehicle}
              />

              {/* Render Active Waypoints & Route Polylines for Selected Vehicle */}
              <ActiveRouteOverlay vehicle={selectedVehicle} />

              {/* ── Active Branch & Store Markers (GPS coordinates from Supabase) ── */}
              {activeBranches.map((branch) => {
                const coords = getBranchCoordinates(branch, branch.name, branch.address, branch.latitude, branch.longitude);
                const isDC = branch.type === 'DC' || (branch as any).branchType === 'DC' || (branch.name || '').toLowerCase().includes('dc');

                return (
                  <AdvancedMarker
                    key={`branch-marker-${branch.id}`}
                    position={{ lat: coords.lat, lng: coords.lng }}
                    title={`${branch.name} (${branch.id})`}
                  >
                    <div className="relative group cursor-pointer flex flex-col items-center">
                      <div className="absolute -top-9 z-30 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none scale-95 group-hover:scale-100 bg-slate-900/95 text-white font-sans text-xs font-semibold px-2.5 py-1 rounded-md shadow-xl border border-slate-700/80 whitespace-nowrap flex items-center gap-1.5">
                        <span>{branch.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-mono font-bold ${
                          isDC ? 'bg-rose-500 text-white' : 'bg-blue-600 text-white'
                        }`}>
                          {isDC ? 'DC' : 'STORE'}
                        </span>
                      </div>

                      <div
                        className={`h-9 w-9 rounded-full shadow-xl border-2 flex items-center justify-center transition-all duration-200 group-hover:scale-115 ${
                          isDC
                            ? 'bg-slate-900 border-rose-500 text-rose-400 ring-2 ring-rose-500/30'
                            : 'bg-slate-900 border-blue-400 text-blue-400 ring-2 ring-blue-400/30'
                        }`}
                      >
                        {isDC ? (
                          <WarehouseIcon className="h-4.5 w-4.5 shrink-0" />
                        ) : (
                          <StoreIcon className="h-4.5 w-4.5 shrink-0" />
                        )}
                      </div>

                      <div className="mt-1 px-1.5 py-0.5 bg-slate-900/90 text-white rounded text-[10px] font-bold shadow-md max-w-[110px] truncate border border-slate-700/50">
                        {branch.name.replace(/^RONA\s*/i, '')}
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              })}

              {/* Render Animated Smooth Rotating Truck Markers */}
              {filteredVehicles.map(v => (
                <AnimatedTruckMarker
                  key={v.vehicleId}
                  vehicle={v}
                  isSelected={selectedVehicleId === v.vehicleId}
                  onClick={() => handleSelectVehicle(v)}
                />
              ))}
            </Map>
          </APIProvider>
        ) : (
          /* Fallback: Interactive Map Interface when API Key is pending */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-900">
            <div className="p-4 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 mb-4">
              <MapPin className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Google Maps JavaScript Engine Ready</h4>
            <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
              Real-time telemetry stream is active ({vehicles.length} trucks streaming from backend). Connect your Google Maps Platform API key to render dynamic live vector tiles.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setShowKeyModal(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                <Key className="w-4 h-4" />
                Configure Google Maps Key
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            INTERACTIVE VEHICLE INFO CARD DRAWER (Appears on Marker Click)
            ════════════════════════════════════════════════════════════════════ */}
        {selectedVehicle && (
          <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-[420px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-slate-100 z-30 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header: Title & Close Button */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border font-bold text-white shadow-md ${
                    selectedVehicle.status === 'MOVING'
                      ? 'bg-emerald-600 border-emerald-400'
                      : selectedVehicle.status === 'IDLE'
                      ? 'bg-amber-600 border-amber-400'
                      : 'bg-slate-700 border-slate-500'
                  }`}
                >
                  <TruckIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-white tracking-tight leading-tight flex items-center gap-2">
                    {selectedVehicle.truckName}
                    <span className="text-blue-400 font-normal text-xs">&bull;</span>
                    <span className="text-emerald-300 font-bold text-sm flex items-center gap-1">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      {selectedVehicle.driver?.name || selectedVehicle.activeRoute?.driverName || 'Unassigned'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedVehicle.model} • Plate: {selectedVehicle.licensePlate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFollowVehicle(prev => !prev)}
                  className={`p-1.5 rounded-lg border text-xs transition-all ${
                    followVehicle
                      ? 'bg-blue-600/30 text-blue-300 border-blue-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                  title={followVehicle ? 'Camera Following Truck' : 'Free Camera'}
                >
                  <LocateFixed className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedVehicleId(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Real-time Telemetry Gauges Strip */}
            {(() => {
              const selTel = selectedVehicle.telematics || selectedVehicle.telemetry || {
                lat: 44.69098,
                lng: -63.59854,
                latitude: 44.69098,
                longitude: -63.59854,
                heading: 0,
                speed: 0,
                speedMph: 0,
                ignitionStatus: 'OFF',
                fuelLevel: 80,
                fuelPercent: 80,
                odometer: 54200
              };
              const selSpeed = selTel.speedMph ?? selTel.speed ?? 0;
              const selHeading = selTel.heading ?? 0;
              const selIgnition = selTel.ignitionStatus ?? (selTel.ignitionOn ? 'ON' : 'OFF');
              const selFuel = selTel.fuelPercent ?? selTel.fuelLevel ?? 0;
              const selLat = selTel.latitude ?? selTel.lat ?? 0;
              const selLng = selTel.longitude ?? selTel.lng ?? 0;
              const selOdo = selTel.odometer ?? 0;

              return (
                <>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {/* Velocity */}
                    <div className="bg-slate-800/70 p-2 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                        <Gauge className="w-3 h-3 text-blue-400" />
                        <span>Speed</span>
                      </div>
                      <div className="text-base font-extrabold text-white font-mono">
                        {Math.round(selSpeed)}
                        <span className="text-[10px] font-normal text-slate-400 ml-0.5">km/h</span>
                      </div>
                    </div>

                    {/* Heading & Compass */}
                    <div className="bg-slate-800/70 p-2 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                        <Compass className="w-3 h-3 text-emerald-400" />
                        <span>Heading</span>
                      </div>
                      <div className="text-sm font-bold text-white font-mono flex items-center gap-1">
                        <span>{selHeading}°</span>
                        <span className="text-[10px] text-emerald-400">
                          {getCompassDirection(selHeading)}
                        </span>
                      </div>
                    </div>

                    {/* Ignition Status */}
                    <div className="bg-slate-800/70 p-2 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>Ignition</span>
                      </div>
                      <div className="text-xs font-bold font-mono">
                        <span
                          className={
                            selIgnition === 'ON'
                              ? 'text-emerald-400'
                              : selIgnition === 'IDLE'
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }
                        >
                          {selIgnition}
                        </span>
                      </div>
                    </div>

                    {/* Fuel Level */}
                    <div className="bg-slate-800/70 p-2 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                        <Fuel className="w-3 h-3 text-rose-400" />
                        <span>Fuel</span>
                      </div>
                      <div className="text-sm font-bold text-white font-mono">
                        {selFuel}%
                      </div>
                    </div>
                  </div>

                  {/* Active Driver & Route Summary */}
                  {selectedVehicle.activeRoute ? (
                    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 mb-3">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <User className="w-3.5 h-3.5 text-blue-400" />
                          <span>{selectedVehicle.driver?.name || selectedVehicle.activeRoute.driverName || 'Driver'}</span>
                        </div>
                        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          ETA: {selectedVehicle.activeRoute.eta || selectedVehicle.activeRoute.scheduledETA || 'On Schedule'}
                        </span>
                      </div>

                      {/* Stops Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Trip Progress</span>
                          <span>
                            {selectedVehicle.activeRoute.completedStops} / {selectedVehicle.activeRoute.totalStops} Stops (
                            {selectedVehicle.activeRoute.remainingDistance || selectedVehicle.activeRoute.nextStop || 'In transit'})
                          </span>
                        </div>
                        <div className="w-full bg-slate-700/60 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${
                                selectedVehicle.activeRoute.totalStops > 0
                                  ? (selectedVehicle.activeRoute.completedStops / selectedVehicle.activeRoute.totalStops) * 100
                                  : 0
                              }%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-800 text-xs text-slate-400 flex items-center justify-between mb-3">
                      <span>Driver: {selectedVehicle.driver?.name || selectedVehicle.activeRoute?.driverName || 'Unassigned'}</span>
                      <span className="text-slate-500 font-mono">VIN: {(selectedVehicle.vin || selectedVehicle.vehicleId).slice(-6)}</span>
                    </div>
                  )}

                  {/* Coordinates & Odometer Footer */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800 font-mono">
                    <span>
                      GPS: {selLat.toFixed(5)}, {selLng.toFixed(5)}
                    </span>
                    <span>Odo: {selOdo.toLocaleString()} km</span>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          GOOGLE MAPS API KEY CONFIGURATION MODAL
          ════════════════════════════════════════════════════════════════════════ */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
                  <Key className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Google Maps Platform Key</h3>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Enter your Google Maps JavaScript API key to activate high-performance vector tiles, live traffic overlays, and satellite views.
            </p>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  API Key (AIzaSy...)
                </label>
                <input
                  type="password"
                  value={inputKey}
                  onChange={e => setInputKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all"
                >
                  Save & Initialize Map
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
