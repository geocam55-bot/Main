import React, { useEffect, useRef, useState, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Truck as TruckIcon, MapPin, Check, Navigation2, Layers, AlertTriangle, Key } from 'lucide-react';
import { DeliveryStatus } from '../types';

interface DriverStop {
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
}

interface DriverRouteMapProps {
  stops: DriverStop[];
  activeStopIndex: number;
  onSelectStop: (index: number) => void;
  truckName?: string;
  truckUnitNumber?: string;
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

// Sub-component to compute & draw route polylines and fit bounds
function DriverRouteOverlay({
  stops,
  activeStopIndex,
}: {
  stops: DriverStop[];
  activeStopIndex: number;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  // Calculate and draw route polylines between consecutive stops
  useEffect(() => {
    if (!map || !routesLib || stops.length === 0) return;

    // Clear existing polylines
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    const activeStop = stops[activeStopIndex] || stops[0];

    // Compute route if we have at least 2 stops
    if (stops.length >= 2) {
      const origin: google.maps.LatLngLiteral = { lat: stops[0].lat, lng: stops[0].lng };
      const destination: google.maps.LatLngLiteral = { lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng };
      
      const intermediateWaypoints = stops.slice(1, stops.length - 1).map(s => ({
        location: { lat: s.lat, lng: s.lng }
      }));

      routesLib.Route.computeRoutes({
        origin,
        destination,
        intermediates: intermediateWaypoints.length > 0 ? intermediateWaypoints : undefined,
        travelMode: 'DRIVING',
        fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
      }).then(({ routes }) => {
        if (routes?.[0]) {
          const newPolylines = routes[0].createPolylines();
          newPolylines.forEach(p => {
            p.setOptions({
              strokeColor: '#2563eb',
              strokeOpacity: 0.85,
              strokeWeight: 4,
            });
            p.setMap(map);
          });
          polylinesRef.current = newPolylines;
          if (routes[0].viewport) {
            map.fitBounds(routes[0].viewport, { top: 40, bottom: 40, left: 40, right: 40 });
          }
        }
      }).catch(err => {
        // Fallback: draw straight-line polyline connecting stops
        console.warn('Routes API computeRoutes notice (falling back to direct polyline):', err);
        const pathCoords = stops.map(s => ({ lat: s.lat, lng: s.lng }));
        const directLine = new google.maps.Polyline({
          path: pathCoords,
          strokeColor: '#3b82f6',
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map
        });
        polylinesRef.current = [directLine];
      });
    } else if (stops.length === 1) {
      map.setCenter({ lat: stops[0].lat, lng: stops[0].lng });
      map.setZoom(14);
    }

    return () => {
      polylinesRef.current.forEach(p => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [map, routesLib, stops]);

  // When active stop changes, smoothly pan to it
  useEffect(() => {
    if (!map || stops.length === 0) return;
    const target = stops[activeStopIndex];
    if (target && target.lat && target.lng) {
      map.panTo({ lat: target.lat, lng: target.lng });
    }
  }, [map, activeStopIndex, stops]);

  return null;
}

export default function DriverRouteMap({
  stops,
  activeStopIndex,
  onSelectStop,
  truckName = 'Fleet Unit #101',
  truckUnitNumber = '101'
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
  const [manualKeyInput, setManualKeyInput] = useState<string>('');
  const [showKeyInputModal, setShowKeyInputModal] = useState<boolean>(false);

  // Fallback key discovery & API endpoint lookup
  useEffect(() => {
    if (!apiKey) {
      fetch('/api/maps-key')
        .then(res => res.json())
        .then(data => {
          if (data?.key && data.key !== 'YOUR_API_KEY') {
            setApiKey(data.key);
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

  // Compute map center
  const defaultCenter = useMemo(() => {
    if (stops.length > 0 && stops[0].lat && stops[0].lng) {
      return { lat: stops[0].lat, lng: stops[0].lng };
    }
    return { lat: 44.6488, lng: -63.5752 }; // Halifax / Dartmouth center
  }, [stops]);

  // Truck live approximate location (near current active stop or depot)
  const truckLocation = useMemo(() => {
    const active = stops[activeStopIndex] || stops[0];
    if (active) {
      // Offset slightly to simulate approaching the active stop
      return {
        lat: active.lat - 0.0035,
        lng: active.lng - 0.0030
      };
    }
    return defaultCenter;
  }, [stops, activeStopIndex, defaultCenter]);

  if (isLoadingKey) {
    return (
      <div className="w-full h-full min-h-[320px] bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-300">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-bold font-mono">Initializing Google Maps...</p>
      </div>
    );
  }

  if (!apiKey || mapAuthError) {
    return (
      <div className="w-full h-full min-h-[320px] bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center font-sans">
        <div className="max-w-xs space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-black text-amber-400">
            {mapAuthError ? 'Maps Key Authorization' : 'Google Maps Key Required'}
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            {mapAuthError
              ? 'Your Google Maps API Key was restricted or rejected. Please verify allowed domains or enter an active key.'
              : 'Add your GOOGLE_MAPS_PLATFORM_KEY to view live interactive routes.'}
          </p>

          <form onSubmit={handleSaveManualKey} className="pt-2 space-y-2">
            <input
              type="text"
              value={manualKeyInput}
              onChange={(e) => setManualKeyInput(e.target.value)}
              placeholder="Paste AIZA... Google Maps Key"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Key className="h-3.5 w-3.5" />
              <span>Apply Google Maps Key</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} version="weekly">
      <div className="relative w-full h-full min-h-[320px] bg-slate-950 overflow-hidden select-none">
        
        {/* Google Map View */}
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={13}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Route Overlay & Polyline Calculator */}
          <DriverRouteOverlay stops={stops} activeStopIndex={activeStopIndex} />

          {/* Delivery Stop Advanced Markers */}
          {stops.map((stop, idx) => {
            const isSelected = idx === activeStopIndex;
            const isCompleted = stop.status === 'completed' || stop.delivery?.status === DeliveryStatus.DELIVERED;

            return (
              <AdvancedMarker
                key={stop.id}
                position={{ lat: stop.lat, lng: stop.lng }}
                title={`${stop.stopNumber}. ${stop.customerName}`}
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
                          ? 'bg-blue-600 border-white text-white ring-4 ring-blue-500/40 shadow-blue-500/50'
                          : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : stop.stopNumber}
                  </div>
                  <div className="mt-1 px-2 py-0.5 bg-slate-900/90 backdrop-blur-xs border border-slate-800 rounded-md text-[10px] font-bold text-white shadow-md max-w-[120px] truncate text-center">
                    {stop.customerName.split(' ')[0]}
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
              <div className="flex flex-col items-center pointer-events-none z-40">
                <div className="h-9 w-9 rounded-2xl bg-amber-500 border-2 border-white shadow-2xl flex items-center justify-center text-slate-950 ring-4 ring-amber-500/30 animate-pulse">
                  <TruckIcon className="h-4 w-4" />
                </div>
                <div className="mt-1 px-2 py-0.5 bg-amber-500 text-slate-950 rounded-md text-[9px] font-mono font-black shadow-md uppercase tracking-wider">
                  You &bull; Unit #{truckUnitNumber}
                </div>
              </div>
            </AdvancedMarker>
          )}
        </Map>

        {/* Top Status Header Overlay */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
          <div className="bg-slate-950/85 backdrop-blur-md text-slate-200 text-[10px] font-mono font-bold px-3 py-1.5 rounded-full border border-slate-800 shadow-xl flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Live GPS Active &bull; Unit #{truckUnitNumber}</span>
          </div>
          <div className="bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-xl">
            Stop {activeStopIndex + 1} of {stops.length}
          </div>
        </div>

      </div>
    </APIProvider>
  );
}
