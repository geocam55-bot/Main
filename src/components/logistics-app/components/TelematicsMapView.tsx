import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { VehicleRecord, RouteStop } from '../types/telematics';
import { TeardropTruckMarker } from './TeardropTruckMarker';
import { 
  Truck as TruckIcon, 
  MapPin, 
  Navigation2, 
  Layers, 
  Activity, 
  Gauge, 
  Compass, 
  Check, 
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
  Pause
} from 'lucide-react';

interface TelematicsMapViewProps {
  vehicles: VehicleRecord[];
  selectedVehicleId: string | null;
  onSelectVehicle: (vehicleId: string | null) => void;
  isStreaming?: boolean;
  onToggleStreaming?: () => void;
  viewingTripsFor?: string | null;
}

const API_KEY_STATIC =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  process.env.VITE_GOOGLE_MAPS_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  (import.meta as any).env?.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.GOOGLE_MAPS_API_KEY ||
  '';

// Default center: Dartmouth / Halifax Regional Logistics Corridor
const REGIONAL_CENTER = { lat: 44.69098, lng: -63.59854 };

// Helper functions to reliably extract lat/lng from various vehicle data formats
export const getVehicleLat = (v: VehicleRecord): number => {
  const tel = v.telematics || v.telemetry;
  if (tel && typeof tel.latitude === 'number' && !isNaN(tel.latitude) && tel.latitude !== 0) return tel.latitude;
  if (tel && typeof tel.lat === 'number' && !isNaN(tel.lat) && tel.lat !== 0) return tel.lat;
  if (typeof (v as any).lat === 'number' && !isNaN((v as any).lat) && (v as any).lat !== 0) return (v as any).lat;
  if (typeof (v as any).latitude === 'number' && !isNaN((v as any).latitude) && (v as any).latitude !== 0) return (v as any).latitude;
  return 44.69098;
};

export const getVehicleLng = (v: VehicleRecord): number => {
  const tel = v.telematics || v.telemetry;
  if (tel && typeof tel.longitude === 'number' && !isNaN(tel.longitude) && tel.longitude !== 0) return tel.longitude;
  if (tel && typeof tel.lng === 'number' && !isNaN(tel.lng) && tel.lng !== 0) return tel.lng;
  if (typeof (v as any).lng === 'number' && !isNaN((v as any).lng) && (v as any).lng !== 0) return (v as any).lng;
  if (typeof (v as any).longitude === 'number' && !isNaN((v as any).longitude) && (v as any).longitude !== 0) return (v as any).longitude;
  return -63.59854;
};

// ════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: DYNAMIC ROUTE POLYLINE & STOP OVERLAY
// ════════════════════════════════════════════════════════════════════════════
function ActiveRoutePolyline({
  vehicle,
  color = '#2563eb'
}: {
  vehicle: VehicleRecord | null;
  color?: string;
}) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !vehicle || !vehicle.activeRoute || !window.google?.maps) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    const stops = vehicle.activeRoute.stops || [];
    if (stops.length === 0) return;

    // Connect vehicle current live position to active stops sequence
    const vLat = getVehicleLat(vehicle);
    const vLng = getVehicleLng(vehicle);
    const path = [
      { lat: vLat, lng: vLng },
      ...stops.map(s => ({ lat: s.lat, lng: s.lng }))
    ];

    const polyline = new window.google.maps.Polyline({
      path,
      strokeColor: color,
      strokeOpacity: 0.85,
      strokeWeight: 5,
      map
    });

    polylineRef.current = polyline;

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, vehicle, color]);

  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: TRIP ROUTE POLYLINE
// ════════════════════════════════════════════════════════════════════════════
const mockTripPath = [
  { lat: 44.668, lng: -63.585, type: 'stop', label: '5' },
  { lat: 44.733, lng: -63.667, type: 'waypoint' }, // Bedford
  { lat: 44.967, lng: -63.533, type: 'waypoint' }, // Elmsdale
  { lat: 45.033, lng: -63.317, type: 'stop', label: '6' }, // Cook Brook
  { lat: 44.967, lng: -63.183, type: 'waypoint' }, // Elderbank
  { lat: 44.900, lng: -63.217, type: 'waypoint' }, // Meaghers Grant
  { lat: 44.668, lng: -63.585, type: 'waypoint' }, // Dartmouth (End)
];

function TripRoutePolyline({
  active,
  color = '#2563eb'
}: {
  active: boolean;
  color?: string;
}) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !active || !window.google?.maps) {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      return;
    }

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    const path = mockTripPath.map(p => ({ lat: p.lat, lng: p.lng }));

    const polyline = new window.google.maps.Polyline({
      path,
      strokeColor: color,
      strokeOpacity: 0.85,
      strokeWeight: 5,
      icons: [{
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 2.5,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          fillColor: color,
          fillOpacity: 1
        },
        repeat: '100px'
      }],
      map
    });

    polylineRef.current = polyline;

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, active, color]);

  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: TRAFFIC OVERLAY
// ════════════════════════════════════════════════════════════════════════════
function TrafficLayerToggle({ enabled }: { enabled: boolean }) {
  const map = useMap();
  const trafficRef = useRef<google.maps.TrafficLayer | null>(null);

  useEffect(() => {
    if (!map || !window.google?.maps) return;

    if (enabled) {
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
  }, [map, enabled]);

  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: CAMERA FOCUS CONTROLLER
// ════════════════════════════════════════════════════════════════════════════
function MapCameraController({
  vehicles,
  selectedVehicle,
  followSelected,
  fitKey,
  viewingTripsFor
}: {
  vehicles: VehicleRecord[];
  selectedVehicle: VehicleRecord | null;
  followSelected: boolean;
  fitKey?: number;
  viewingTripsFor?: string | null;
}) {
  const map = useMap();
  const initialFitDone = useRef(false);

  // Fit all vehicles into view on initial load or when manually triggered
  useEffect(() => {
    if (!map || !window.google?.maps) return;

    if (viewingTripsFor) {
      const bounds = new window.google.maps.LatLngBounds();
      mockTripPath.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(bounds, { padding: 80 });
      return;
    }

    if (selectedVehicle && followSelected) {
      const vLat = getVehicleLat(selectedVehicle);
      const vLng = getVehicleLng(selectedVehicle);
      map.panTo({
        lat: vLat,
        lng: vLng
      });
      map.setZoom(15);
    } else if ((!initialFitDone.current || fitKey) && vehicles.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      let count = 0;
      vehicles.forEach(v => {
        const lat = getVehicleLat(v);
        const lng = getVehicleLng(v);
        if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
          bounds.extend({ lat, lng });
          count++;
        }
      });

      if (count > 0) {
        map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
        initialFitDone.current = true;
      }
    }
  }, [map, selectedVehicle, followSelected, vehicles, fitKey]);

  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: ANIMATED VEHICLE MARKER
// ════════════════════════════════════════════════════════════════════════════
function AnimatedVehicleMarker({
  vehicle,
  isSelected,
  onSelect
}: {
  vehicle: VehicleRecord;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const initialLat = getVehicleLat(vehicle);
  const initialLng = getVehicleLng(vehicle);

  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng
  });

  const prevTargetRef = useRef<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng
  });

  const animFrameRef = useRef<number | null>(null);

  const targetLat = getVehicleLat(vehicle);
  const targetLng = getVehicleLng(vehicle);

  useEffect(() => {
    const startLat = prevTargetRef.current.lat;
    const startLng = prevTargetRef.current.lng;

    if (startLat !== targetLat || startLng !== targetLng) {
      const startTime = performance.now();
      const duration = 1800; // 1.8s interpolation

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

        const nextLat = startLat + (targetLat - startLat) * ease;
        const nextLng = startLng + (targetLng - startLng) * ease;

        setCurrentPos({ lat: nextLat, lng: nextLng });

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          prevTargetRef.current = { lat: targetLat, lng: targetLng };
          setCurrentPos({ lat: targetLat, lng: targetLng });
        }
      };

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      setCurrentPos({ lat: targetLat, lng: targetLng });
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [targetLat, targetLng]);

  const heading = (vehicle.telematics || vehicle.telemetry)?.heading || 0;
  const speed = (vehicle.telematics || vehicle.telemetry)?.speedMph ?? (vehicle.telematics || vehicle.telemetry)?.speed ?? 0;
  const isMoving = vehicle.status === 'MOVING';
  const isIdle = vehicle.status === 'IDLE';

  const markerColor = isMoving
    ? '#059669' // Emerald
    : isIdle
    ? '#d97706' // Amber
    : '#475569'; // Slate

  return (
    <AdvancedMarker
      position={currentPos}
      title={`${vehicle.truckName} (${vehicle.status})`}
      onClick={onSelect}
      zIndex={isSelected ? 100 : isMoving ? 50 : 20}
    >
      <TeardropTruckMarker
        color={markerColor}
        isMoving={isMoving}
        isIdling={isIdle}
        isSelected={isSelected}
        heading={heading}
        label={vehicle.truckName.split('-')[0]?.trim() || `#${vehicle.vehicleId.slice(-3)}`}
        speedText={speed > 0 ? `${Math.round(speed)}k` : undefined}
        size="md"
      />
    </AdvancedMarker>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: TELEMATICS MAP VIEW
// ════════════════════════════════════════════════════════════════════════════
export default function TelematicsMapView({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  isStreaming = true,
  onToggleStreaming,
  viewingTripsFor
}: TelematicsMapViewProps) {
  const [apiKey, setApiKey] = useState<string>(() => {
    if (API_KEY_STATIC && API_KEY_STATIC !== 'YOUR_API_KEY') return API_KEY_STATIC;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('GOOGLE_MAPS_PLATFORM_KEY');
      if (stored && stored !== 'YOUR_API_KEY') return stored;
    }
    return '';
  });

  const [mapTypeId, setMapTypeId] = useState<string>('roadmap');
  const [showTraffic, setShowTraffic] = useState<boolean>(false);
  const [followSelected, setFollowSelected] = useState<boolean>(true);
  const [fitKey, setFitKey] = useState<number>(0);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [manualKeyInput, setManualKeyInput] = useState<string>('');

  const selectedVehicle = useMemo(() => {
    return vehicles.find(v => v.vehicleId === selectedVehicleId) || null;
  }, [vehicles, selectedVehicleId]);

  // Handle manual API key saving
  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualKeyInput.trim();
    if (trimmed) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('GOOGLE_MAPS_PLATFORM_KEY', trimmed);
      }
      setApiKey(trimmed);
      setShowKeyModal(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'MOVING':
        return {
          bg: 'bg-emerald-500',
          border: 'border-emerald-400',
          text: 'text-emerald-700',
          badge: 'bg-emerald-100 text-emerald-800',
          glow: 'ring-4 ring-emerald-500/30 shadow-emerald-500/40'
        };
      case 'IDLE':
        return {
          bg: 'bg-amber-500',
          border: 'border-amber-400',
          text: 'text-amber-700',
          badge: 'bg-amber-100 text-amber-800',
          glow: 'ring-4 ring-amber-500/30 shadow-amber-500/40'
        };
      default:
        return {
          bg: 'bg-slate-700',
          border: 'border-slate-600',
          text: 'text-slate-600',
          badge: 'bg-slate-100 text-slate-700',
          glow: 'ring-2 ring-slate-400/20'
        };
    }
  };

  return (
    <div className="relative w-full h-full min-h-[480px] bg-slate-900 overflow-hidden flex flex-col select-none rounded-2xl border border-slate-200/80 shadow-xs">
      
      {/* ── Key Input / Config Modal ── */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Key className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold">Google Maps API Key</h4>
              </div>
              <button 
                onClick={() => setShowKeyModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enter your Google Maps Platform key to render live Advanced Markers, rotated truck icons, and traffic layers.
            </p>
            <form onSubmit={handleSaveKey} className="space-y-3">
              <input
                type="text"
                value={manualKeyInput}
                onChange={(e) => setManualKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <div className="flex items-center space-x-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Apply Key
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('GOOGLE_MAPS_PLATFORM_KEY');
                    setApiKey('');
                    setShowKeyModal(false);
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <APIProvider apiKey={apiKey} version="weekly">
        <div className="relative w-full h-full flex-1">
          <Map
            defaultCenter={REGIONAL_CENTER}
            defaultZoom={12}
            mapId="PROSPACES_TELEMATICS_MAP"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            gestureHandling="greedy"
            disableDefaultUI={true}
            mapTypeId={mapTypeId}
            style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
          >
            {/* Trip Route Polyline when viewing trips */}
            <TripRoutePolyline active={!!viewingTripsFor} color="#2563eb" />

            {/* Trip Waypoint Markers */}
            {!!viewingTripsFor && mockTripPath.map((stop, idx) => {
              if (stop.type === 'stop') {
                return (
                  <AdvancedMarker
                    key={`trip-stop-${idx}`}
                    position={{ lat: stop.lat, lng: stop.lng }}
                    title={`Stop ${stop.label}`}
                  >
                    <div className="flex flex-col items-center">
                      <div className="h-6 w-6 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center font-bold text-white text-[11px] shadow-md z-10">
                        {stop.label}
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              }
              if (idx === 0 || idx === mockTripPath.length - 1) {
                return (
                  <AdvancedMarker
                    key={`trip-end-${idx}`}
                    position={{ lat: stop.lat, lng: stop.lng }}
                  >
                    <div className="h-6 w-6 bg-slate-800 rounded-md border-2 border-white flex items-center justify-center shadow-md">
                      <MapPin className="h-3 w-3 text-white" />
                    </div>
                  </AdvancedMarker>
                );
              }
              return null;
            })}

            {/* Active Route Polyline for Selected Vehicle */}
            <ActiveRoutePolyline vehicle={selectedVehicle} color="#2563eb" />

            {/* Native Google Maps Live Traffic */}
            <TrafficLayerToggle enabled={showTraffic} />

            {/* Camera Focus & Pan Controller */}
            <MapCameraController 
              vehicles={vehicles} 
              selectedVehicle={selectedVehicle} 
              followSelected={followSelected} 
              fitKey={fitKey}
              viewingTripsFor={viewingTripsFor}
            />

            {/* ── Active Route Stops Pins ── */}
            {selectedVehicle?.activeRoute?.stops?.map((stop, sIdx) => {
              const isCompleted = stop.status === 'COMPLETED';
              const isActive = stop.status === 'ACTIVE';

              return (
                <AdvancedMarker
                  key={stop.id}
                  position={{ lat: stop.lat, lng: stop.lng }}
                  title={`${stop.stopNumber}. ${stop.customerName}`}
                >
                  <div className="flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-110">
                    <div 
                      className={`h-7 w-7 rounded-xl flex items-center justify-center font-mono font-black text-[11px] shadow-lg border-2 transition-all ${
                        isCompleted
                          ? 'bg-emerald-600 border-white text-white'
                          : isActive
                            ? 'bg-blue-600 border-white text-white ring-4 ring-blue-500/30 scale-110'
                            : 'bg-slate-800 border-slate-600 text-slate-200'
                      }`}
                    >
                      {isCompleted ? <Check className="h-3.5 w-3.5" /> : stop.stopNumber}
                    </div>
                    <div className="mt-1 px-1.5 py-0.5 bg-slate-900/90 text-white rounded text-[9px] font-bold shadow-md max-w-[100px] truncate">
                      {stop.customerName.split(' ')[0]}
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* ── Live Fleet Vehicle Advanced Markers with Dynamic Rotated Heading & Smooth Lat/Lng ── */}
            {vehicles.map((v) => (
              <AnimatedVehicleMarker
                key={v.vehicleId}
                vehicle={v}
                isSelected={v.vehicleId === selectedVehicleId}
                onSelect={() => onSelectVehicle(v.vehicleId)}
              />
            ))}
          </Map>

          {/* ── Top Floating Telematics Controls Ribbon ── */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
            {/* Left: Stream Status & Polling Indicator */}
            <div className="flex items-center space-x-2 pointer-events-auto">
              <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-md flex items-center space-x-2 text-slate-800 text-xs font-bold">
                <span className={`h-2.5 w-2.5 rounded-full ${isStreaming ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`}></span>
                <span className="font-mono text-[11px]">
                  {isStreaming ? 'LIVE TELEMETRY STREAM' : 'STREAM PAUSED'}
                </span>
                {onToggleStreaming && (
                  <button
                    type="button"
                    onClick={onToggleStreaming}
                    className="p-1 hover:bg-slate-100 rounded-md text-slate-600 ml-1 cursor-pointer"
                    title={isStreaming ? 'Pause Telemetry' : 'Resume Telemetry'}
                  >
                    {isStreaming ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>

              {selectedVehicle && (
                <div className="bg-blue-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-md flex items-center space-x-1.5">
                  <TruckIcon className="h-3.5 w-3.5 text-blue-300" />
                  <span>Tracking: {selectedVehicle.truckName}</span>
                </div>
              )}
            </div>

            {/* Right: Map Layers & Actions */}
            <div className="flex items-center space-x-1.5 pointer-events-auto">
              <button
                type="button"
                onClick={() => setFitKey(prev => prev + 1)}
                className="px-2.5 py-1.5 bg-white/95 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-md transition-all cursor-pointer flex items-center space-x-1"
                title="Fit All Fleet Vehicles in View"
              >
                <Maximize2 className="h-3.5 w-3.5 text-blue-600" />
                <span className="hidden sm:inline">Fit Fleet</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTraffic(prev => !prev)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-md flex items-center space-x-1 ${
                  showTraffic 
                    ? 'bg-amber-500 text-slate-950 border-amber-400' 
                    : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="Toggle Google Maps Traffic"
              >
                <Activity className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Traffic</span>
              </button>

              <button
                type="button"
                onClick={() => setMapTypeId(prev => prev === 'roadmap' ? 'hybrid' : 'roadmap')}
                className="px-2.5 py-1.5 bg-white/95 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-md transition-all cursor-pointer flex items-center space-x-1"
                title="Toggle Satellite / Street View"
              >
                <Layers className="h-3.5 w-3.5 text-blue-600" />
                <span className="capitalize hidden sm:inline">{mapTypeId}</span>
              </button>

              <button
                type="button"
                onClick={() => setFollowSelected(prev => !prev)}
                className={`p-1.5 rounded-xl border shadow-md transition-all cursor-pointer ${
                  followSelected 
                    ? 'bg-blue-600 text-white border-blue-700' 
                    : 'bg-white/95 text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title="Follow Selected Vehicle"
              >
                <LocateFixed className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowKeyModal(true)}
                className="p-1.5 bg-white/95 hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 shadow-md transition-all cursor-pointer"
                title="Configure Maps API Key"
              >
                <Key className="h-4 w-4 text-amber-500" />
              </button>
            </div>
          </div>
        </div>
      </APIProvider>
    </div>
  );
}
