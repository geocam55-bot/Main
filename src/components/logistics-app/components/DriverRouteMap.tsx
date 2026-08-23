import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Truck as TruckIcon, MapPin, Check, Navigation2, Layers, AlertTriangle, Key, ZoomIn, ZoomOut, LocateFixed, RefreshCw, X, ShieldAlert, Sparkles } from 'lucide-react';
import { TeardropTruckMarker } from './TeardropTruckMarker';
import { DeliveryStatus } from '../types';
import { sanitizeGpsCoordinates } from '../lib/mapHelpers';

export interface DriverStop {
  id: string;
  deliveryRecordId?: string;
  stopNumber: number;
  customerName: string;
  address: string;
  items?: { name: string; quantity: number; checked: boolean }[];
  status: 'pending' | 'active' | 'completed';
  phone?: string;
  notes?: string;
  lat: number;
  lng: number;
  delivery?: any;
  stopType?: 'additional_stop' | 'delivery';
  reason?: string;
  additionalStopId?: string;
}

interface DriverRouteMapProps {
  stops: DriverStop[];
  activeStopIndex: number;
  onSelectStop: (index: number) => void;
  truckName?: string;
  truckUnitNumber?: string;
  isLiveGpsActive?: boolean;
  onToggleLiveGps?: () => void;
  truckLocation?: { lat: number; lng: number };
}

export interface RouteStats {
  distanceText: string;
  durationText: string;
  nextInstruction: string;
  summary: string;
  distanceKm?: number;
  durationMinutes?: number;
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
  (import.meta as any).env?.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_API_KEY ||
  '';

// Depot Coordinates fallback (e.g. Dartmouth / Burnside Depot)
const DEPOT_COORDS = { lat: 44.68550, lng: -63.58250 };

// ════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: GOOGLE MAPS ROUTE & DIRECTIONS OVERLAY
// ════════════════════════════════════════════════════════════════════════════
function DriverRouteOverlay({
  stops,
  activeStopIndex,
  truckLocation,
  isLiveGpsActive,
  viewMode,
  onRouteStatsCalculated,
}: {
  stops: DriverStop[];
  activeStopIndex: number;
  truckLocation: { lat: number; lng: number };
  isLiveGpsActive?: boolean;
  viewMode?: 'follow-truck' | 'overview';
  onRouteStatsCalculated?: (stats: RouteStats) => void;
}) {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const onwardDirectionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  // Calculate and draw route polylines strictly sticking to roads from current truck position to active stop & onward stops
  useEffect(() => {
    if (!map || stops.length === 0 || typeof window === 'undefined' || !window.google?.maps) return;

    // Clean up previous polylines & directions renderers
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    if (onwardDirectionsRendererRef.current) {
      onwardDirectionsRendererRef.current.setMap(null);
      onwardDirectionsRendererRef.current = null;
    }

    const activeStop = stops[activeStopIndex] || stops[0];
    if (!activeStop || !activeStop.lat || !activeStop.lng) return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(truckLocation);
    bounds.extend({ lat: activeStop.lat, lng: activeStop.lng });
    stops.forEach(s => {
      if (s.lat && s.lng) bounds.extend({ lat: s.lat, lng: s.lng });
    });

    // Helper fallback distance estimator from truck location to destination delivery
    const calcApproxStats = () => {
      const dLat = (activeStop.lat - truckLocation.lat) * 111;
      const dLng = (activeStop.lng - truckLocation.lng) * 85;
      const distKm = Math.max(0.4, Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 10) / 10);
      const mins = Math.max(2, Math.round(distKm * 1.8));
      onRouteStatsCalculated?.({
        distanceText: `${distKm} km`,
        durationText: `${mins} min`,
        nextInstruction: `Follow designated road route to ${activeStop.address || activeStop.customerName}`,
        summary: activeStop.customerName,
        distanceKm: distKm,
        durationMinutes: mins,
      });
    };

    function drawFallbackPolyline() {
      // Primary driving line from truck location to active delivery
      const primaryPath = [truckLocation, { lat: activeStop.lat, lng: activeStop.lng }];
      const primaryPolyline = new window.google.maps.Polyline({
        path: primaryPath,
        strokeColor: '#2563eb',
        strokeOpacity: 0.95,
        strokeWeight: 6,
        map
      });

      // Onward route line for remaining sequence of stops
      const subsequentStops = stops.slice(activeStopIndex);
      if (subsequentStops.length > 1) {
        const onwardPath = subsequentStops.map(s => ({ lat: s.lat, lng: s.lng }));
        const onwardPolyline = new window.google.maps.Polyline({
          path: onwardPath,
          strokeColor: '#64748b',
          strokeOpacity: 0.6,
          strokeWeight: 4,
          map
        });
        polylinesRef.current = [primaryPolyline, onwardPolyline];
      } else {
        polylinesRef.current = [primaryPolyline];
      }
      calcApproxStats();
    }

    // Use Google Maps DirectionsService with DRIVING travel mode to stick strictly to roads
    if (window.google.maps.DirectionsService) {
      const directionsService = new window.google.maps.DirectionsService();
      
      const origin = truckLocation;
      const destination = { lat: activeStop.lat, lng: activeStop.lng };

      // 1. Primary Active Leg: Truck -> Active Stop (DRIVING strictly along road network)
      directionsService.route(
        {
          origin,
          destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false,
          provideRouteAlternatives: false,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK && result) {
            const renderer = new window.google.maps.DirectionsRenderer({
              map,
              directions: result,
              suppressMarkers: true, // Render our own rich custom markers
              polylineOptions: {
                strokeColor: '#2563eb',
                strokeWeight: 6,
                strokeOpacity: 0.95,
                zIndex: 20
              },
            });
            directionsRendererRef.current = renderer;

            // Extract leg details for turn-by-turn HUD (from truck location to active stop)
            const firstLeg = result.routes[0]?.legs[0];
            if (firstLeg) {
              const rawStep = firstLeg.steps?.[0]?.instructions?.replace(/<[^>]*>?/gm, '') || `Proceed towards ${activeStop?.address || activeStop?.customerName}`;
              onRouteStatsCalculated?.({
                distanceText: firstLeg.distance?.text || '3.2 km',
                durationText: firstLeg.duration?.text || '6 min',
                nextInstruction: rawStep,
                summary: result.routes[0]?.summary || activeStop.customerName,
                distanceKm: (firstLeg.distance?.value || 3000) / 1000,
                durationMinutes: Math.round((firstLeg.duration?.value || 360) / 60),
              });
            }

            // 2. Onward Legs: Route all subsequent stops strictly on roads via DirectionsService
            const subsequentStops = stops.slice(activeStopIndex);
            if (subsequentStops.length > 1) {
              const onwardOrigin = { lat: activeStop.lat, lng: activeStop.lng };
              const onwardDest = { lat: subsequentStops[subsequentStops.length - 1].lat, lng: subsequentStops[subsequentStops.length - 1].lng };
              const waypoints = subsequentStops.slice(1, -1).map(st => ({
                location: new window.google.maps.LatLng(st.lat, st.lng),
                stopover: true,
              }));

              directionsService.route(
                {
                  origin: onwardOrigin,
                  destination: onwardDest,
                  waypoints,
                  travelMode: window.google.maps.TravelMode.DRIVING,
                  optimizeWaypoints: false,
                },
                (onwardResult, onwardStatus) => {
                  if (onwardStatus === window.google.maps.DirectionsStatus.OK && onwardResult) {
                    const onwardRenderer = new window.google.maps.DirectionsRenderer({
                      map,
                      directions: onwardResult,
                      suppressMarkers: true,
                      polylineOptions: {
                        strokeColor: '#64748b',
                        strokeWeight: 4,
                        strokeOpacity: 0.75,
                        zIndex: 10
                      },
                    });
                    onwardDirectionsRendererRef.current = onwardRenderer;
                  }
                }
              );
            }
          } else {
            // Fallback: draw polyline connecting points
            drawFallbackPolyline();
          }
        }
      );
    } else {
      drawFallbackPolyline();
    }

    // Camera view adjustment based on isLiveGpsActive and viewMode
    if (isLiveGpsActive && viewMode === 'follow-truck') {
      map.setCenter(truckLocation);
      map.setZoom(16);
    } else {
      try {
        map.fitBounds(bounds, { top: 60, bottom: 60, left: 40, right: 40 });
      } catch {
        map.setCenter(truckLocation);
        map.setZoom(13);
      }
    }

    return () => {
      polylinesRef.current.forEach(p => p.setMap(null));
      polylinesRef.current = [];
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      if (onwardDirectionsRendererRef.current) {
        onwardDirectionsRendererRef.current.setMap(null);
        onwardDirectionsRendererRef.current = null;
      }
    };
  }, [map, stops, truckLocation, activeStopIndex, isLiveGpsActive, viewMode]);

  // When active stop changes, smoothly pan to it if overview or not follow mode
  useEffect(() => {
    if (!map || stops.length === 0) return;
    if (viewMode === 'follow-truck') {
      map.panTo(truckLocation);
    } else {
      const target = stops[activeStopIndex] || stops[0];
      if (target && target.lat && target.lng) {
        map.panTo({ lat: target.lat, lng: target.lng });
      }
    }
  }, [map, activeStopIndex, stops, viewMode, truckLocation]);

  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: INTERACTIVE STANDALONE / OPENSTREETMAP ROUTE MAP FALLBACK
// ════════════════════════════════════════════════════════════════════════════
function StandaloneRouteMap({
  stops,
  activeStopIndex,
  onSelectStop,
  truckLocation,
  truckUnitNumber,
  onOpenKeyModal
}: {
  stops: DriverStop[];
  activeStopIndex: number;
  onSelectStop: (index: number) => void;
  truckLocation: { lat: number; lng: number };
  truckUnitNumber: string;
  onOpenKeyModal: () => void;
}) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Calculate bounding box for geographic normalization
  const bounds = useMemo(() => {
    const lats = [truckLocation.lat, ...stops.map(s => s.lat).filter(Boolean)];
    const lngs = [truckLocation.lng, ...stops.map(s => s.lng).filter(Boolean)];
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latSpan = Math.max(maxLat - minLat, 0.04);
    const lngSpan = Math.max(maxLng - minLng, 0.04);

    return {
      minLat: minLat - latSpan * 0.15,
      maxLat: maxLat + latSpan * 0.15,
      minLng: minLng - lngSpan * 0.15,
      maxLng: maxLng + lngSpan * 0.15,
      latSpan: latSpan * 1.3,
      lngSpan: lngSpan * 1.3
    };
  }, [stops, truckLocation]);

  // Project lat/lng to percentage coordinates within container
  const project = useCallback((lat: number, lng: number) => {
    const x = ((lng - bounds.minLng) / bounds.lngSpan) * 100;
    const y = ((bounds.maxLat - lat) / bounds.latSpan) * 100;
    return {
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(8, Math.min(92, y))
    };
  }, [bounds]);

  const truckPos = project(truckLocation.lat, truckLocation.lng);
  const stopPoints = stops.map(s => ({
    ...s,
    pos: project(s.lat, s.lng)
  }));

  // Pan & Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const activeStop = stops[activeStopIndex] || stops[0];
  const activeStopPoint = stopPoints[activeStopIndex] || stopPoints[0];
  const subsequentStopPoints = stopPoints.slice(activeStopIndex);

  // Compute calculated approximate distance between truck location and current delivery
  const approxDistanceKm = useMemo(() => {
    if (!activeStop || !activeStop.lat || !activeStop.lng) return 4.2;
    const dLat = (activeStop.lat - truckLocation.lat) * 111;
    const dLng = (activeStop.lng - truckLocation.lng) * 85;
    return Math.max(0.3, Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 10) / 10);
  }, [activeStop, truckLocation]);
  const approxDurationMins = Math.max(2, Math.round(approxDistanceKm * 1.8));

  return (
    <div 
      className="relative w-full h-full min-h-[340px] bg-slate-950 overflow-hidden select-none cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Background Interactive Geospatial Grid / Dark Map Base */}
      <div 
        className="absolute inset-0 transition-transform duration-100 ease-out origin-center"
        style={{
          transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`
        }}
      >
        {/* Dark Grid Background with Roadway Vectors */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
        
        {/* Subtle Map Highways & Maritime Coastline Simulation */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Regional Highway Arteries */}
          <path
            d={`M ${truckPos.x * 3.5} 0 Q ${truckPos.x * 3.5 + 50} 200, 380 400`}
            stroke="#1e293b"
            strokeWidth="8"
            fill="none"
            strokeDasharray="4 8"
            className="opacity-50"
          />

          {/* Live Driving Route Path Line from Truck Location to Delivery */}
          {activeStopPoint && (
            <>
              {/* Onward route path for subsequent stops */}
              {subsequentStopPoints.length > 1 && (
                <polyline
                  points={subsequentStopPoints.map(p => `${p.pos.x}%,${p.pos.y}%`).join(' ')}
                  fill="none"
                  stroke="#475569"
                  strokeWidth="3"
                  strokeDasharray="4 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity="0.7"
                />
              )}

              {/* Glowing Outer Route Halo from Truck to Active Delivery */}
              <line
                x1={`${truckPos.x}%`}
                y1={`${truckPos.y}%`}
                x2={`${activeStopPoint.pos.x}%`}
                y2={`${activeStopPoint.pos.y}%`}
                stroke="#2563eb"
                strokeWidth="8"
                strokeLinecap="round"
                strokeOpacity="0.4"
                filter="url(#glow)"
              />
              {/* Primary Active Route Line from Truck to Active Delivery */}
              <line
                x1={`${truckPos.x}%`}
                y1={`${truckPos.y}%`}
                x2={`${activeStopPoint.pos.x}%`}
                y2={`${activeStopPoint.pos.y}%`}
                stroke="url(#routeGradient)"
                strokeWidth="5"
                strokeLinecap="round"
              />
              {/* Directional Dash Animation from Truck to Active Delivery */}
              <line
                x1={`${truckPos.x}%`}
                y1={`${truckPos.y}%`}
                x2={`${activeStopPoint.pos.x}%`}
                y2={`${activeStopPoint.pos.y}%`}
                stroke="#93c5fd"
                strokeWidth="2.5"
                strokeDasharray="6 10"
                strokeLinecap="round"
                className="animate-pulse"
              />
            </>
          )}
        </svg>

        {/* Delivery Stop Markers */}
        {stopPoints.map((stop, idx) => {
          const isSelected = idx === activeStopIndex;
          const isCompleted = stop.status === 'completed' || (stop.stopType === 'delivery' && stop.delivery?.status === DeliveryStatus.DELIVERED);
          const isAdditionalStop = stop.stopType === 'additional_stop';

          return (
            <div
              key={stop.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectStop(idx);
              }}
              style={{
                left: `${stop.pos.x}%`,
                top: `${stop.pos.y}%`,
                transform: 'translate(-50%, -100%)'
              }}
              className={`absolute cursor-pointer transition-all duration-300 ${
                isSelected ? 'scale-110 z-30' : 'hover:scale-105 z-20'
              }`}
            >
              <div className="flex flex-col items-center group">
                <div
                  className={`h-9 w-9 rounded-2xl flex items-center justify-center font-mono font-black text-xs shadow-2xl border-2 transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 border-white text-white shadow-emerald-900/50'
                      : isSelected
                        ? isAdditionalStop
                          ? 'bg-amber-500 border-white text-slate-950 ring-4 ring-amber-400/50 shadow-amber-500/50 scale-110 font-black'
                          : 'bg-blue-600 border-white text-white ring-4 ring-blue-500/40 shadow-blue-500/50 scale-110'
                        : isAdditionalStop
                          ? 'bg-amber-600/90 border-amber-400 text-white hover:bg-amber-500'
                          : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : stop.stopNumber}
                </div>
                <div className={`mt-1 px-2 py-0.5 backdrop-blur-xs border rounded-md text-[10px] font-bold shadow-lg max-w-[130px] truncate text-center pointer-events-none ${
                  isAdditionalStop
                    ? 'bg-amber-950/95 border-amber-700/80 text-amber-200'
                    : 'bg-slate-900/95 border-slate-700/80 text-white'
                }`}>
                  {isAdditionalStop ? `Stop ${stop.stopNumber}: ${stop.reason || 'Pickup'}` : stop.customerName.split(' ')[0]}
                </div>
              </div>
            </div>
          );
        })}

        {/* Live Truck GPS Unit Marker */}
        <div
          style={{
            left: `${truckPos.x}%`,
            top: `${truckPos.y}%`,
            transform: 'translate(-50%, -100%)'
          }}
          className="absolute pointer-events-none z-40 transition-all duration-500"
        >
          <TeardropTruckMarker
            color="#f59e0b"
            isMoving={true}
            label={`You • Unit #${truckUnitNumber}`}
            size="md"
          />
        </div>
      </div>

      {/* Top Floating Status Overlay */}
      <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
        <div className="bg-slate-950/90 backdrop-blur-md text-slate-200 text-[10px] font-mono font-bold px-3 py-1.5 rounded-full border border-slate-800 shadow-xl flex items-center space-x-1.5 pointer-events-auto">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>GPS Navigator &bull; Unit #{truckUnitNumber}</span>
        </div>
        <div className="bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-xl pointer-events-auto">
          Stop {activeStopIndex + 1} of {stops.length}
        </div>
      </div>

      {/* Floating Map Navigation Controls */}
      <div className="absolute bottom-4 right-3 flex flex-col space-y-1.5 z-20">
        <button
          type="button"
          onClick={() => setZoomLevel(prev => Math.min(prev + 0.3, 2.5))}
          className="h-8 w-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 shadow-lg flex items-center justify-center transition-all cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoomLevel(prev => Math.max(prev - 0.3, 0.7))}
          className="h-8 w-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 shadow-lg flex items-center justify-center transition-all cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="h-8 w-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-blue-400 border border-slate-700/80 shadow-lg flex items-center justify-center transition-all cursor-pointer"
          title="Recenter Map"
        >
          <LocateFixed className="h-4 w-4" />
        </button>
      </div>

      {/* Subtle Bottom Key Configure Badge */}
      <div className="absolute bottom-4 left-3 z-20">
        <button
          type="button"
          onClick={onOpenKeyModal}
          className="px-2.5 py-1 text-[10px] font-semibold bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer shadow-lg flex items-center space-x-1.5"
          title="Configure Google Maps API Key"
        >
          <Key className="h-3 w-3 text-amber-400" />
          <span>Maps Key</span>
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: DRIVER ROUTE MAP
// ════════════════════════════════════════════════════════════════════════════
export default function DriverRouteMap({
  stops,
  activeStopIndex,
  onSelectStop,
  truckName = 'Fleet Unit #101',
  truckUnitNumber = '101',
  isLiveGpsActive = false,
  onToggleLiveGps,
  truckLocation: truckLocationProp,
}: DriverRouteMapProps) {
  const [apiKey, setApiKey] = useState<string>(() => {
    if (API_KEY_STATIC && API_KEY_STATIC !== 'YOUR_API_KEY') {
      return API_KEY_STATIC;
    }
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('GOOGLE_MAPS_PLATFORM_KEY');
      if (stored && stored !== 'YOUR_API_KEY') {
        return stored;
      }
    }
    return '';
  });

  const [isLoadingKey, setIsLoadingKey] = useState<boolean>(() => {
    if (API_KEY_STATIC && API_KEY_STATIC !== 'YOUR_API_KEY') {
      return false;
    }
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('GOOGLE_MAPS_PLATFORM_KEY');
      if (stored && stored !== 'YOUR_API_KEY') {
        return false;
      }
    }
    return true;
  });

  const [mapAuthError, setMapAuthError] = useState<boolean>(false);
  const [mapTypeId, setMapTypeId] = useState<string>('roadmap');
  const [manualKeyInput, setManualKeyInput] = useState<string>('');
  const [showKeyInputModal, setShowKeyInputModal] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'follow-truck' | 'overview'>('overview');
  const [routeStats, setRouteStats] = useState<RouteStats | null>(null);

  // When live GPS is toggled on, default to follow-truck perspective
  useEffect(() => {
    if (isLiveGpsActive) {
      setViewMode('follow-truck');
    }
  }, [isLiveGpsActive]);

  // Fallback key discovery & API endpoint lookup
  useEffect(() => {
    if (!apiKey) {
      fetch('/api/maps-key')
        .then(res => res.json())
        .then(data => {
          if (data?.key && data.key !== 'YOUR_API_KEY' && data.key.trim().length > 10) {
            setApiKey(data.key.trim());
          }
        })
        .catch(err => {
          console.warn('Google Maps key fetch notice:', err);
        })
        .finally(() => {
          setIsLoadingKey(false);
        });
    } else {
      setIsLoadingKey(false);
    }
  }, [apiKey]);

  // Catch Maps authentication failure
  useEffect(() => {
    const originalAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      setMapAuthError(true);
      if (originalAuthFailure) {
        originalAuthFailure();
      }
    };
    return () => {
      (window as any).gm_authFailure = originalAuthFailure;
    };
  }, []);

  const handleSaveManualKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualKeyInput.trim();
    if (trimmed) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('GOOGLE_MAPS_PLATFORM_KEY', trimmed);
      }
      setApiKey(trimmed);
      setMapAuthError(false);
      setShowKeyInputModal(false);
    }
  };

  const handleClearKey = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('GOOGLE_MAPS_PLATFORM_KEY');
    }
    setApiKey('');
    setMapAuthError(false);
    setShowKeyInputModal(false);
  };

  // Actual Truck Location (from props, telematics, GPS, or home depot)
  const truckLocation = useMemo(() => {
    if (truckLocationProp && typeof truckLocationProp.lat === 'number' && typeof truckLocationProp.lng === 'number' && !isNaN(truckLocationProp.lat) && !isNaN(truckLocationProp.lng) && (truckLocationProp.lat !== 0 || truckLocationProp.lng !== 0)) {
      return sanitizeGpsCoordinates(truckLocationProp.lat, truckLocationProp.lng);
    }
    return DEPOT_COORDS;
  }, [truckLocationProp]);

  // Compute default center (focused around the truck and current delivery destination)
  const defaultCenter = useMemo(() => {
    if (truckLocation && truckLocation.lat && truckLocation.lng) {
      return truckLocation;
    }
    if (stops.length > 0 && stops[0].lat && stops[0].lng) {
      return { lat: stops[0].lat, lng: stops[0].lng };
    }
    return DEPOT_COORDS;
  }, [truckLocation, stops]);

  const activeStop = stops[activeStopIndex] || stops[0];

  // If no Google Maps key or auth error, render the Standalone Navigator so no black screen appears
  const useFallbackMap = !apiKey || mapAuthError;

  return (
    <div id="driver-route-map-container" className="relative w-full h-full min-h-[360px] bg-slate-950 overflow-hidden select-none flex flex-col">
      
      {/* ── Key Input / API Configuration Modal ── */}
      {showKeyInputModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-9 w-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Key className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-black">Google Maps Platform Key</h4>
              </div>
              <button 
                onClick={() => setShowKeyInputModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Enter an active Google Maps Platform API key with Maps JavaScript & Directions API enabled to switch between satellite and street views.
            </p>

            <form onSubmit={handleSaveManualKey} className="space-y-3">
              <input
                type="text"
                value={manualKeyInput}
                onChange={(e) => setManualKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <div className="flex items-center space-x-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Save API Key
                </button>
                {apiKey && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MAP RENDERING: GOOGLE MAPS OR STANDALONE NAVIGATOR ── */}
      {useFallbackMap ? (
        <StandaloneRouteMap
          stops={stops}
          activeStopIndex={activeStopIndex}
          onSelectStop={onSelectStop}
          truckLocation={truckLocation}
          truckUnitNumber={truckUnitNumber}
          onOpenKeyModal={() => setShowKeyInputModal(true)}
        />
      ) : (
        <APIProvider apiKey={apiKey} version="weekly">
          <div className="relative w-full h-full min-h-[360px] bg-slate-950 overflow-hidden">
            {/* Google Map View */}
            <Map
              defaultCenter={defaultCenter}
              defaultZoom={13}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              gestureHandling="greedy"
              disableDefaultUI={true}
              mapTypeId={mapTypeId}
              style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            >
              {/* Route Overlay & Polyline Calculator */}
              <DriverRouteOverlay
                stops={stops}
                activeStopIndex={activeStopIndex}
                truckLocation={truckLocation}
                isLiveGpsActive={isLiveGpsActive}
                viewMode={viewMode}
                onRouteStatsCalculated={(stats) => setRouteStats(stats)}
              />

              {/* Delivery Stop Advanced Markers */}
              {stops.map((stop, idx) => {
                const isSelected = idx === activeStopIndex;
                const isCompleted = stop.status === 'completed' || (stop.stopType === 'delivery' && stop.delivery?.status === DeliveryStatus.DELIVERED);
                const isAdditionalStop = stop.stopType === 'additional_stop';

                return (
                  <AdvancedMarker
                    key={stop.id}
                    position={{ lat: stop.lat, lng: stop.lng }}
                    title={`${stop.stopNumber}. ${stop.customerName} (${stop.address})`}
                    onClick={() => onSelectStop(idx)}
                  >
                    <div 
                      className={`flex flex-col items-center cursor-pointer transition-all duration-300 ${
                        isSelected ? 'scale-125 z-30' : 'hover:scale-110 z-10'
                      }`}
                    >
                      <div
                        className={`h-9 w-9 rounded-2xl flex items-center justify-center font-mono font-black text-xs shadow-2xl border-2 transition-all ${
                          isCompleted
                            ? 'bg-emerald-600 border-white text-white'
                            : isSelected
                              ? isAdditionalStop
                                ? 'bg-amber-500 border-white text-slate-950 ring-4 ring-amber-400/50 shadow-amber-500/50 font-black'
                                : 'bg-blue-600 border-white text-white ring-4 ring-blue-500/40 shadow-blue-500/50'
                              : isAdditionalStop
                                ? 'bg-amber-600 border-amber-400 text-white hover:bg-amber-500'
                                : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {isCompleted ? <Check className="h-4 w-4" /> : stop.stopNumber}
                      </div>
                      <div className={`mt-1 px-2 py-0.5 backdrop-blur-xs border rounded-md text-[10px] font-bold shadow-md max-w-[130px] truncate text-center ${
                        isAdditionalStop 
                          ? 'bg-amber-950/90 border-amber-700/80 text-amber-200' 
                          : 'bg-slate-900/90 border-slate-800 text-white'
                      }`}>
                        {isAdditionalStop ? `Stop ${stop.stopNumber}: ${stop.reason || 'Pickup'}` : stop.customerName.split(' ')[0]}
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              })}

              {/* Driver Truck Advanced Marker */}
              {truckLocation && (
                <AdvancedMarker
                  position={truckLocation}
                  title={`Driver Truck: ${truckName}`}
                >
                  <TeardropTruckMarker
                    color="#f59e0b"
                    isMoving={true}
                    label={`You • Unit #${truckUnitNumber}`}
                    size="md"
                  />
                </AdvancedMarker>
              )}
            </Map>

            {/* Top Navigation HUD Card */}
            <div className="absolute top-3 inset-x-3 flex flex-col space-y-2 pointer-events-none z-10">
              <div className="flex items-center justify-between pointer-events-auto">
                <div className={`backdrop-blur-md text-white text-[10px] font-mono font-bold px-3 py-1.5 rounded-full border shadow-xl flex items-center space-x-1.5 transition-all ${
                  isLiveGpsActive ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300' : 'bg-slate-950/85 border-slate-800 text-slate-200'
                }`}>
                  <span className={`h-2 w-2 rounded-full ${isLiveGpsActive ? 'bg-emerald-400 animate-ping' : 'bg-blue-400'}`}></span>
                  <span>{isLiveGpsActive ? 'Live GPS Active' : 'Route Ready'} &bull; Unit #{truckUnitNumber}</span>
                </div>
                <div className="bg-blue-600/95 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-xl flex items-center space-x-1">
                  <span>Stop {activeStopIndex + 1} of {stops.length}</span>
                </div>
              </div>

              {/* Turn-by-Turn Dynamic Navigation Ribbon */}
              {activeStop && (
                <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2.5 text-white shadow-2xl pointer-events-auto flex items-center justify-between space-x-3">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                      <Navigation2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-[11px] font-black text-white truncate">
                          {activeStop.customerName}
                        </p>
                        {routeStats && (
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded-md border border-emerald-800/60 shrink-0">
                            {routeStats.distanceText} &bull; {routeStats.durationText}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-300 truncate">
                        {routeStats?.nextInstruction || activeStop.address}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode(prev => prev === 'follow-truck' ? 'overview' : 'follow-truck')}
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        viewMode === 'follow-truck'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                      }`}
                      title="Toggle Follow Truck / Full Route View"
                    >
                      {viewMode === 'follow-truck' ? 'Following' : 'Overview'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Left Floating Map Controls */}
            <div className="absolute bottom-3 left-3 flex items-center space-x-2 z-10">
              <button
                type="button"
                onClick={() => setMapTypeId(prev => prev === 'roadmap' ? 'hybrid' : 'roadmap')}
                className="px-2.5 py-1 text-[10px] font-semibold bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer shadow-lg flex items-center space-x-1"
                title="Toggle Satellite / Roadmap"
              >
                <Layers className="h-3 w-3 text-blue-400" />
                <span className="capitalize">{mapTypeId}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowKeyInputModal(true)}
                className="p-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer shadow-lg"
                title="Google Maps Key Settings"
              >
                <Key className="h-3 w-3 text-amber-400" />
              </button>
            </div>
          </div>
        </APIProvider>
      )}
    </div>
  );
}
