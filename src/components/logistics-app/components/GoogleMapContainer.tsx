import React, { useEffect, useRef, useState, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { Branch, DeliveryRecord, Truck, DeliveryStatus } from '../types';
import { Activity, Settings, MapPin, Truck as TruckIcon, User, Clock, Users, MoreVertical, X, Car, Store as StoreIcon, Warehouse as WarehouseIcon, Building } from 'lucide-react';
import { 
  getBranchCoordinates, 
  getDeliveryCoordinates, 
  getTruckCoords, 
  cleanAddressText,
  isTruckAssignedToBranch,
  getTruckStoreInfo,
  STORE_COLOR_MAP
} from '../lib/mapHelpers';

// Custom Polyline component for Google Maps
function MapPolyline({ 
  path, 
  color, 
  weight, 
  opacity, 
  dashed 
}: { 
  path: { lat: number; lng: number }[]; 
  color: string; 
  weight: number; 
  opacity: number; 
  dashed?: boolean; 
  key?: string | number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || path.length < 2) return;

    const lineSymbol = dashed ? {
      path: 'M 0,-1 0,1',
      strokeOpacity: 1,
      scale: 2
    } : null;

    const polyline = new google.maps.Polyline({
      path,
      strokeColor: color,
      strokeOpacity: dashed ? 0 : opacity,
      strokeWeight: weight,
      icons: dashed && lineSymbol ? [{
        icon: lineSymbol,
        offset: '0',
        repeat: '12px'
      }] : [],
      map
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, path, color, weight, opacity, dashed]);

  return null;
}

// Native Google Maps Traffic Layer
function TrafficLayer({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !active) return;
    const trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(map);
    return () => {
      trafficLayer.setMap(null);
    };
  }, [map, active]);
  return null;
}

interface GoogleMapContainerProps {
  hqCoords: { lat: number; lng: number };
  activeBranches: Branch[];
  displayDeliveries: DeliveryRecord[];
  displayTrucks: Truck[];
  simProgress: Record<string, number>;
  selectedTrackTruckId: string | null;
  setSelectedTrackTruckId: (id: string | null) => void;
  isPlayingSimulation: boolean;
  isWatchingGps: boolean;
  mapTheme: string;
  isTruckOnline: (truck: any) => boolean;
  setHqCoords: React.Dispatch<React.SetStateAction<{ lat: number; lng: number }>>;
  setSysLogs: React.Dispatch<React.SetStateAction<string[]>>;
  setViewingDetailsTruckId?: (id: string | null) => void;
  setViewingTripsTruckId?: (id: string | null) => void;
  viewingTrackEventsTruckId?: string | null;
  setViewingTrackEventsTruckId?: (id: string | null) => void;
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

export default function GoogleMapContainer({
  hqCoords,
  activeBranches,
  displayDeliveries,
  displayTrucks,
  simProgress,
  selectedTrackTruckId,
  setSelectedTrackTruckId,
  isPlayingSimulation,
  isWatchingGps,
  mapTheme,
  isTruckOnline,
  setHqCoords,
  setSysLogs,
  setViewingDetailsTruckId,
  setViewingTripsTruckId,
  viewingTrackEventsTruckId,
  setViewingTrackEventsTruckId,
}: GoogleMapContainerProps) {
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
  const [copied, setCopied] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [inputKey, setInputKey] = useState<string>('');

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputKey.trim();
    if (trimmed) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('GOOGLE_MAPS_PLATFORM_KEY', trimmed);
      }
      setApiKey(trimmed);
      setMapAuthError(false);
    }
  };

  useEffect(() => {
    let info = `Static key: ${API_KEY_STATIC ? 'Found (len ' + API_KEY_STATIC.length + ')' : 'None'}\n`;
    info += `Global key: ${(globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ? 'Found (len ' + (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY.length + ')' : 'None'}\n`;
    
    if (!apiKey) {
      info += `Fetching from /api/maps-key...\n`;
      setDebugInfo(info);
      fetch('/api/maps-key')
        .then(res => {
          info += `Fetch status: ${res.status} ${res.statusText}\n`;
          setDebugInfo(info);
          return res.json();
        })
        .then(data => {
          info += `JSON received: ${data ? JSON.stringify(data).substring(0, 50) : 'none'}\n`;
          if (data?.key && data.key !== 'YOUR_API_KEY') {
            setApiKey(data.key);
            info += `Successfully set API key!\n`;
          } else {
            info += `API key is missing or is placeholder in response\n`;
          }
          setDebugInfo(info);
        })
        .catch(err => {
          info += `Fetch error: ${err.message || err}\n`;
          console.error('Failed to load dynamic maps API key:', err);
          setDebugInfo(info);
        })
        .finally(() => {
          setIsLoadingKey(false);
        });
    } else {
      info += `API Key active: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}\n`;
      setDebugInfo(info);
      setIsLoadingKey(false);
    }
  }, [apiKey]);

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

  const handleCopyUrl = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.origin + '/*');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoadingKey) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-6 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 text-center font-sans">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Loading Map Configuration...</p>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-6 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 text-center font-sans overflow-y-auto">
        <div className="max-w-md w-full space-y-5 my-auto">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-amber-400">Google Maps API Key Required</h2>
            <p className="text-sm text-slate-300">
              The Google Maps component requires a valid Maps API Key to load.
            </p>
          </div>

          {/* Option A: Manual Entry for Shared / Live Preview */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 text-left space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/25 text-emerald-400 text-xs font-bold">1</span>
              <p className="text-sm font-semibold text-white">For Shared / Live Builds (Quick Access):</p>
            </div>
            <p className="text-xs text-slate-400 leading-normal">
              Because AI Studio environment secrets are kept secure and hidden on public Shared/Live builds, you can paste your Google Maps API key here. It is saved only in your local browser storage:
            </p>
            <form onSubmit={handleSaveKey} className="flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-teal-500 text-white rounded px-2.5 py-1.5 text-xs font-mono outline-none placeholder:text-slate-700 transition-colors"
                autoComplete="off"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-slate-950 text-xs font-bold rounded transition-colors cursor-pointer shrink-0"
              >
                Save Key
              </button>
            </form>
          </div>

          {/* Option B: Editor Secrets (For Developers) */}
          <div className="bg-slate-950/20 p-4 rounded-xl border border-slate-850/80 text-left space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-slate-400 text-xs font-bold">2</span>
              <p className="text-sm font-semibold text-slate-200">For Developers (AI Studio Editor):</p>
            </div>
            <p className="text-xs text-slate-300">
              <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-350">Get an API Key</a> and set it up globally:
            </p>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-5 leading-normal">
              <li>Open <strong>Settings</strong> (⚙️ gear icon, <strong>top-right corner</strong>)</li>
              <li>Select <strong>Secrets</strong></li>
              <li>Type <code>GOOGLE_MAPS_PLATFORM_KEY</code> as the secret name, press <strong>Enter</strong></li>
              <li>Paste your API key as the value, press <strong>Enter</strong></li>
            </ul>
          </div>

          {debugInfo && (
            <div className="p-3 bg-slate-950 text-left rounded-lg border border-slate-800 font-mono text-[10px] text-slate-400 max-w-full overflow-x-auto whitespace-pre">
              <p className="text-teal-400 font-bold mb-1 border-b border-slate-800 pb-1">🔍 DIAGNOSTICS:</p>
              {debugInfo}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mapAuthError) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-6 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 text-center font-sans overflow-y-auto">
        <div className="max-w-md space-y-4 my-auto">
          <div className="inline-flex p-3 bg-red-500/10 rounded-full text-red-400 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-red-400">Google Maps Authorization Failed</h2>
          <p className="text-sm text-slate-300">
            Your Google Maps API Key was loaded, but the API request was rejected because of **HTTP Referrer Restrictions** (<code>RefererNotAllowedMapError</code>).
          </p>
          
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-left space-y-3">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">How to Resolve This:</p>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal pl-4">
              <li>Open the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">Google Cloud Console Credentials Page</a>.</li>
              <li>Click on your API key to open its settings.</li>
              <li>Under <strong>Website restrictions</strong>, either select <strong>None</strong> (recommended for easy development testing), or authorize this workspace domain:</li>
            </ol>
            
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded border border-slate-800">
              <code className="text-emerald-400 text-[11px] font-mono select-all truncate flex-1">
                {typeof window !== 'undefined' ? window.location.origin : ''}/*
              </code>
              <button
                onClick={handleCopyUrl}
                className="px-2.5 py-1 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded text-slate-200 transition-colors shrink-0"
              >
                {copied ? 'Copied! ✅' : 'Copy'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-normal">
              Remember to append the wildcard <code>/*</code> to the URL in Google Cloud Console. Note that Google Maps updates may take up to 5 minutes to propagate.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Determine center based on branches
  const hasCaliforniaBranch = activeBranches.some(b => {
    const addr = (b.address || '').toUpperCase();
    const name = (b.name || '').toUpperCase();
    const isCal = (addr.includes('CALIFORNIA') || name.includes('CALIFORNIA') || addr.includes('SAN JOSE') || name.includes('SAN JOSE')) && !addr.includes('CANADA') && !addr.includes('NS') && !addr.includes('NOVA SCOTIA');
    return isCal;
  });

  const initialCenter = hasCaliforniaBranch
    ? { lat: 37.3382, lng: -121.8863 }
    : { lat: 44.6488, lng: -63.5880 };

  // Determine Google Maps Type ID
  let googleMapTypeId: 'roadmap' | 'satellite' | 'hybrid' | 'terrain' = 'roadmap';
  if (mapTheme === 'satellite') {
    googleMapTypeId = 'satellite';
  } else if (mapTheme === 'terrain') {
    googleMapTypeId = 'terrain';
  }

  return (
    <APIProvider apiKey={apiKey} version="weekly">
      <div className="relative w-full h-full">
        {/* Floating Reset Key Button if key is from localStorage */}
        {typeof window !== 'undefined' && localStorage.getItem('GOOGLE_MAPS_PLATFORM_KEY') && (
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear the custom Google Maps API Key and reset?')) {
                localStorage.removeItem('GOOGLE_MAPS_PLATFORM_KEY');
                setApiKey('');
                setMapAuthError(false);
              }
            }}
            className="absolute bottom-16 left-3 z-10 px-2.5 py-1 text-[10px] font-semibold bg-slate-900/95 border border-slate-700/80 hover:bg-slate-800 rounded-md text-slate-300 hover:text-white transition-all cursor-pointer shadow-lg flex items-center gap-1.5"
            title="Clear saved Google Maps API Key from your browser"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400 animate-spin-slow" />
            <span>Reset Saved Map Key</span>
          </button>
        )}
        <MapInner 
          initialCenter={initialCenter}
          googleMapTypeId={googleMapTypeId}
          hqCoords={hqCoords}
          activeBranches={activeBranches}
          displayDeliveries={displayDeliveries}
          displayTrucks={displayTrucks}
          simProgress={simProgress}
          selectedTrackTruckId={selectedTrackTruckId}
          setSelectedTrackTruckId={setSelectedTrackTruckId}
          isPlayingSimulation={isPlayingSimulation}
          isWatchingGps={isWatchingGps}
          mapTheme={mapTheme}
          isTruckOnline={isTruckOnline}
          setHqCoords={setHqCoords}
          setSysLogs={setSysLogs}
          setViewingDetailsTruckId={setViewingDetailsTruckId}
          setViewingTripsTruckId={setViewingTripsTruckId}
          viewingTrackEventsTruckId={viewingTrackEventsTruckId}
          setViewingTrackEventsTruckId={setViewingTrackEventsTruckId}
        />
      </div>
    </APIProvider>
  );
}

// Inner component to access map instance via useMap
function MapInner({
  initialCenter,
  googleMapTypeId,
  hqCoords,
  activeBranches,
  displayDeliveries,
  displayTrucks,
  simProgress,
  selectedTrackTruckId,
  setSelectedTrackTruckId,
  isPlayingSimulation,
  isWatchingGps,
  mapTheme,
  isTruckOnline,
  setHqCoords,
  setSysLogs,
  setViewingDetailsTruckId,
  setViewingTripsTruckId,
  viewingTrackEventsTruckId,
  setViewingTrackEventsTruckId,
}: any) {
  const map = useMap();
  const lastFlownTruckIdRef = useRef<string | null>(null);
  const lastBoundsKeyRef = useRef<string>('');
  const [openPopup, setOpenPopup] = useState<any>(null);
  const [popupActionMenuOpen, setPopupActionMenuOpen] = useState<boolean>(false);

  const trackEventsTruck = displayTrucks.find((t: any) => t.id === viewingTrackEventsTruckId);
  const trackWaypoints = useMemo(() => {
    if (!viewingTrackEventsTruckId) return [];

    const isTruck1903 = (trackEventsTruck?.id || "").includes("1903") || (trackEventsTruck?.name || "").includes("1903");
    const isWindmill = !isTruck1903 && (trackEventsTruck?.branchId === 'DC-WINAMILL' || (trackEventsTruck?.id || "").includes("2101"));

    const startLat = isWindmill ? 44.6855 : 44.9752;
    const startLng = isWindmill ? -63.5825 : -63.5042;
    const startLabel = isWindmill ? '500 Windmill Road Terminal Depot' : 'Elmsdale Terminal Depot';
    const endLabel = isWindmill ? '500 Windmill Road Terminal Return' : 'Elmsdale Terminal Return';

    return [
      { lat: startLat, lng: startLng, label: startLabel, type: 'start', time: '08:00 AM' },
      { lat: 44.9406, lng: -63.5358, label: 'Hwy 102 Enfield Checkpoint', type: 'arrow', dir: '↘', time: '08:12 AM', speed: '88 km/h' },
      { lat: 44.8700, lng: -63.5500, label: 'Hwy 102 Goffs Interchange', type: 'arrow', dir: '↙', time: '08:25 AM', speed: '92 km/h' },
      { lat: 44.8100, lng: -63.5900, label: 'Fall River Junction', type: 'arrow', dir: '↗', time: '08:40 AM', speed: '75 km/h' },
      { lat: 44.7500, lng: -63.5950, label: 'Waverley Road Checkpoint', type: 'arrow', dir: '↘', time: '08:52 AM', speed: '62 km/h' },
      { lat: 44.7000, lng: -63.5600, label: 'Forest Hills Connector', type: 'arrow', dir: '↘', time: '09:05 AM', speed: '70 km/h' },
      { lat: 44.6950, lng: -63.5850, label: 'Event #8 - Dartmouth Depot Stop', type: 'badge', number: '8', time: '09:20 AM', speed: '0 km/h (Ignition OFF)', status: 'Completed' },
      { lat: 44.6650, lng: -63.5700, label: 'Halifax Peninsula Link', type: 'arrow', dir: '↗', time: '09:45 AM', speed: '55 km/h' },
      { lat: 44.6400, lng: -63.6600, label: 'Beechville Hwy 103 Link', type: 'arrow', dir: '↖', time: '10:05 AM', speed: '80 km/h' },
      { lat: 44.6500, lng: -63.7200, label: 'Lakeside Industrial Park', type: 'arrow', dir: '↗', time: '10:20 AM', speed: '65 km/h' },
      { lat: 44.6800, lng: -63.8100, label: 'Event #5 - Stillwater Lake Delivery Stop', type: 'badge', number: '5', time: '10:45 AM', speed: '0 km/h (Delivery Completed)', status: 'Delivered' },
      { lat: 44.7364, lng: -63.7854, label: 'Hammonds Plains Rd', type: 'arrow', dir: '↗', time: '11:15 AM', speed: '72 km/h' },
      { lat: 44.7303, lng: -63.6617, label: 'Event #2 - Bedford Hwy Hub', type: 'badge', number: '2', time: '11:40 AM', speed: '12 km/h (Idling)', status: 'Idling' },
      { lat: 44.7642, lng: -63.6823, label: 'Lower Sackville Connector', type: 'arrow', dir: '↖', time: '12:00 PM', speed: '85 km/h' },
      { lat: 44.8100, lng: -63.5900, label: 'Fall River Return Link', type: 'arrow', dir: '↗', time: '12:18 PM', speed: '90 km/h' },
      { lat: startLat, lng: startLng, label: endLabel, type: 'end', time: '12:45 PM' }
    ];
  }, [viewingTrackEventsTruckId, trackEventsTruck]);

  useEffect(() => {
    if (!map || !viewingTrackEventsTruckId || trackWaypoints.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    trackWaypoints.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
  }, [map, viewingTrackEventsTruckId, trackWaypoints]);
  const [popupAddress, setPopupAddress] = useState<string>('Loading address...');

  useEffect(() => {
    if (openPopup?.type === 'truck' && openPopup.position) {
      setPopupAddress('Loading address...');
      if (window.google && window.google.maps && window.google.maps.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: openPopup.position }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            setPopupAddress(results[0].formatted_address);
          } else {
            setPopupAddress('Unknown Location');
          }
        });
      }
    }
  }, [openPopup]);

  // Smoothly pan map to selected truck's active coordinates
  useEffect(() => {
    if (!map) return;

    if (!selectedTrackTruckId) {
      if (lastFlownTruckIdRef.current !== null) {
        lastFlownTruckIdRef.current = null;
        setOpenPopup((prev: any) => (prev?.type === 'truck' ? null : prev));
      }
      return;
    }

    if (lastFlownTruckIdRef.current === selectedTrackTruckId) {
      return;
    }
    lastFlownTruckIdRef.current = selectedTrackTruckId;

    const truck = displayTrucks.find((t: any) => t.id === selectedTrackTruckId);
    if (!truck) return;

    const coords = getTruckCoords(truck, simProgress, activeBranches);
    if (coords && coords.lat !== undefined && coords.lng !== undefined && !isNaN(coords.lat) && !isNaN(coords.lng)) {
      map.panTo({ lat: coords.lat, lng: coords.lng });
      map.setZoom(13.5);
      
      const isOnline = isTruckOnline(truck);
      const assignedDelivery = displayDeliveries.find((d: any) => d.assignedTruck === truck.id && d.status !== DeliveryStatus.DELIVERED);
      const isMoving = isOnline && (truck.isDriving || (truck.gpsSpeed && truck.gpsSpeed > 0) || Boolean(assignedDelivery) || truck.status === 'Driving' || truck.status === 'In Transit');
      
      const activeGpsSourceLabel = isOnline && coords.hasRealGps 
        ? `<span class="bg-blue-100 text-blue-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-200">LIVE GPS STREAM</span>`
        : `<span class="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200">ROUTING ENGINE EST.</span>`;

      const popupMessage = !isOnline
        ? `Driver Offline (Stationary)`
        : coords.hasRealGps 
          ? `Broadcasting Live Coordinates`
          : assignedDelivery
            ? `Delivering order ${assignedDelivery.invoiceNumber}`
            : 'Standby / Refueling';

      setOpenPopup({
        type: 'truck',
        position: coords,
        truck,
        isOnline,
        isMoving,
        activeGpsSourceLabel,
        popupMessage,
        coords
      });
    }
  }, [map, selectedTrackTruckId, displayTrucks, simProgress, activeBranches, displayDeliveries, isTruckOnline]);

  // Handle fitBounds dynamically when fleet / locations change
  useEffect(() => {
    if (!map) return;

    const branchesKey = activeBranches.map((b: any) => b.id).sort().join(',');
    const deliveriesCount = displayDeliveries.filter((d: any) => d.status !== DeliveryStatus.DELIVERED).length;
    const currentBoundsKey = `${branchesKey}-${deliveriesCount}-${displayTrucks.length}`;

    if (lastBoundsKeyRef.current !== currentBoundsKey) {
      lastBoundsKeyRef.current = currentBoundsKey;

      const bounds = new google.maps.LatLngBounds();
      let hasCoords = false;

      if (hqCoords && hqCoords.lat !== 0 && hqCoords.lng !== 0 && !isNaN(hqCoords.lat) && !isNaN(hqCoords.lng)) {
        bounds.extend(hqCoords);
        hasCoords = true;
      }

      activeBranches.forEach((branch: any) => {
        const coords = getBranchCoordinates(branch.id, branch.name, branch.address);
        if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
          bounds.extend(coords);
          hasCoords = true;
        }
      });

      displayDeliveries.filter((d: any) => d.status !== DeliveryStatus.DELIVERED).forEach((delivery: any) => {
        const matchedOrigBranch = activeBranches.find((b: any) => b.id === delivery.originBranch);
        const origCoords = getBranchCoordinates(delivery.originBranch, matchedOrigBranch?.name || '', matchedOrigBranch?.address);
        const destCoords = getDeliveryCoordinates(delivery.id, delivery.deliveryAddress, origCoords.x, origCoords.y);
        if (destCoords && !isNaN(destCoords.lat) && !isNaN(destCoords.lng)) {
          bounds.extend(destCoords);
          hasCoords = true;
        }
      });

      if (hasCoords) {
        map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
      }
    }
  }, [map, hqCoords, activeBranches, displayDeliveries, displayTrucks]);

  // Map shift-click relocator handler
  const handleMapClick = (e: any) => {
    if (!e.detail?.latLng) return;
    const domEvent = e.domEvent;
    const isShiftKey = domEvent && domEvent.shiftKey;
    if (!isShiftKey) return;

    const { lat, lng } = e.detail.latLng;
    if (isWatchingGps) {
      setSysLogs((prev: string[]) => [
        `[${new Date().toLocaleTimeString()}] Relocation cancelled: Device GPS Tracking is active.`,
        ...prev.slice(0, 4)
      ]);
    } else {
      setHqCoords({ lat, lng });
      setSysLogs((prev: string[]) => [
        `[${new Date().toLocaleTimeString()}] Headquarters coordinates manually relocated to GPS ${lat.toFixed(4)}N, ${lng.toFixed(4)}W.`,
        ...prev.slice(0, 4)
      ]);
    }
  };

  // Pre-calculate telemetry wires & routes
  const routesToDraw: { id: string; path: { lat: number; lng: number }[]; isSelected: boolean }[] = [];
  let activeTruckGps: { lat: number; lng: number } | null = null;

  displayTrucks.forEach((truck: any) => {
    const isOnline = isTruckOnline(truck);
    const assignedDelivery = displayDeliveries.find((d: any) => d.assignedTruck === truck.id && d.status !== DeliveryStatus.DELIVERED);
    
    let origLat: number = 0;
    let origLng: number = 0;
    let destLat: number = 0;
    let destLng: number = 0;

    if (assignedDelivery) {
      const matchedOrigBranch = activeBranches.find((b: any) => b.id === assignedDelivery.originBranch);
      const orig = getBranchCoordinates(assignedDelivery.originBranch, matchedOrigBranch?.name || '', matchedOrigBranch?.address);
      const dest = getDeliveryCoordinates(assignedDelivery.id, assignedDelivery.deliveryAddress, orig.x, orig.y);
      origLat = isNaN(orig.lat) ? 44.6488 : orig.lat;
      origLng = isNaN(orig.lng) ? -63.5880 : orig.lng;
      destLat = dest && !isNaN(dest.lat) ? dest.lat : 0;
      destLng = dest && !isNaN(dest.lng) ? dest.lng : 0;
    }

    const { lat: truckLat, lng: truckLng } = getTruckCoords(truck, simProgress, activeBranches);
    const isSelected = selectedTrackTruckId === truck.id;
    if (isSelected || (!selectedTrackTruckId && displayTrucks[0]?.id === truck.id)) {
      activeTruckGps = { lat: truckLat, lng: truckLng };
    }

    if (assignedDelivery && isOnline && origLat && origLng && destLat && destLng) {
      routesToDraw.push({
        id: truck.id,
        path: [{ lat: origLat, lng: origLng }, { lat: destLat, lng: destLng }],
        isSelected
      });
    }
  });

  return (
    <>
      <Map
        defaultCenter={initialCenter}
        defaultZoom={11}
        mapTypeId={googleMapTypeId}
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
        onClick={handleMapClick}
        gestureHandling="greedy"
      >
        {/* Native Traffic Layer Overlay */}
        <TrafficLayer active={mapTheme === 'traffic'} />

        {/* HQ Marker */}
        {hqCoords && hqCoords.lat !== 0 && hqCoords.lng !== 0 && (
          <AdvancedMarker 
            position={hqCoords} 
            title="Dispatch Headquarters"
            onClick={() => setOpenPopup({
              type: 'hq',
              position: hqCoords
            })}
          >
            <div className="relative flex items-center justify-center w-5 h-5">
              <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-blue-500 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-600 border border-white shadow-lg"></span>
            </div>
          </AdvancedMarker>
        )}

        {/* Branch Markers */}
        {activeBranches.map((branch: any) => {
          const coords = getBranchCoordinates(branch.id, branch.name, branch.address);
          const isDC = branch.type === 'DC' || branch.branchType === 'DC';
          const count = displayDeliveries.filter((d: any) => d.originBranch === branch.id && d.status !== DeliveryStatus.DELIVERED).length;

          return (
            <AdvancedMarker 
              key={branch.id} 
              position={coords}
              title={branch.name}
              onClick={() => setOpenPopup({
                type: 'branch',
                position: coords,
                branch,
                count
              })}
            >
              <div className="relative group cursor-pointer flex flex-col items-center">
                {/* Hover Tooltip - shows store name on hover */}
                <div className="absolute -top-9 z-30 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none scale-95 group-hover:scale-100 bg-slate-900/95 text-white font-sans text-xs font-semibold px-2.5 py-1 rounded-md shadow-xl border border-slate-700/80 whitespace-nowrap flex items-center gap-1.5">
                  <span>{branch.name}</span>
                  {count > 0 && (
                    <span className="bg-amber-500 text-slate-950 font-extrabold text-[10px] px-1.5 py-0.25 rounded-full">
                      {count}
                    </span>
                  )}
                </div>

                {/* Circle Marker - Same size as Truck Icon (w-9 h-9) & Just a Circle */}
                <div 
                  className={`w-9 h-9 rounded-full shadow-lg border-2 flex items-center justify-center transition-all group-hover:scale-110 ${
                    isDC 
                      ? 'bg-slate-900 border-red-500 text-red-400 ring-2 ring-red-500/30' 
                      : 'bg-slate-900 border-blue-400 text-blue-400 ring-2 ring-blue-400/30'
                  }`}
                >
                  {isDC ? <WarehouseIcon className="w-4.5 h-4.5 shrink-0" /> : <StoreIcon className="w-4.5 h-4.5 shrink-0" />}
                </div>

                {/* Badge for pending carrier loads */}
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 font-extrabold text-[9px] rounded-full flex items-center justify-center border border-slate-900 shadow">
                    {count}
                  </span>
                )}
              </div>
            </AdvancedMarker>
          );
        })}

        {/* Customer Delivery Destinations */}
        {displayDeliveries.filter((d: any) => d.status !== DeliveryStatus.DELIVERED).map((delivery: any) => {
          const isAssigned = !!delivery.assignedTruck;
          if (isAssigned) {
            const matchedTruck = displayTrucks.find((t: any) => t.id === delivery.assignedTruck);
            if (matchedTruck) {
              const online = isTruckOnline(matchedTruck);
              if (!online) return null; // Hide destination if offline
            }
          }
          const matchedOrigBranch = activeBranches.find((b: any) => b.id === delivery.originBranch);
          const origCoords = getBranchCoordinates(delivery.originBranch, matchedOrigBranch?.name || '', matchedOrigBranch?.address);
          const destCoords = getDeliveryCoordinates(delivery.id, delivery.deliveryAddress, origCoords.x, origCoords.y);
          if (!destCoords) return null; // Do not show on map if address is incomplete or not a direct match

          return (
            <AdvancedMarker
              key={delivery.id}
              position={destCoords}
              title={`Customer: ${delivery.customerName}`}
              onClick={() => setOpenPopup({
                type: 'delivery',
                position: destCoords,
                delivery,
                isAssigned
              })}
            >
              <div 
                className={`p-1 rounded-full border border-slate-900 shadow-md ${
                  isAssigned ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-100'
                } w-5 h-5 flex items-center justify-center`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
            </AdvancedMarker>
          );
        })}

        {/* Trucks / Active Drivers */}
        {displayTrucks.map((truck: any) => {
          const storeInfo = getTruckStoreInfo(truck, activeBranches);
          const isOnline = isTruckOnline(truck);
          const isNoDriver = !truck.driver || truck.driver.toLowerCase() === 'no driver' || truck.driver.toLowerCase() === 'unassigned';
          const assignedDelivery = displayDeliveries.find((d: any) => d.assignedTruck === truck.id && d.status !== DeliveryStatus.DELIVERED);

          const hasGpsSpeed = typeof truck.gpsSpeed === 'number' && truck.gpsSpeed > 0;
          const hasActiveDelivery = Boolean(assignedDelivery);
          const isExplicitDriving = truck.status === 'Driving' || truck.status === 'In Transit' || truck.status === 'En Route' || truck.status === 'Active' || truck.ignitionStatus === 'ON' || truck.isDriving === true;
          const isExplicitIdling = truck.status === 'Idling' || truck.ignitionStatus === 'IDLING' || (typeof truck.gpsIdlingMins === 'number' && truck.gpsIdlingMins > 0) || truck.isIdling === true;

          const isMoving = isOnline && (
            hasGpsSpeed ||
            isExplicitDriving ||
            (!isNoDriver && (hasActiveDelivery || (truck.status !== 'Parked' && truck.status !== 'Stationary' && truck.status !== 'Off')))
          );
          const isIdling = !isMoving && isOnline && isExplicitIdling;

          const coords = getTruckCoords(truck, simProgress, activeBranches);
          const isSelected = selectedTrackTruckId === truck.id;

          const isTruckGps = truck.gpsSource === 'truck';
          const activeGpsSourceLabel = isTruckGps 
            ? `<span class="bg-amber-100 text-amber-800 text-[9px] font-mono font-bold px-1.5 py-0.25 rounded-md border border-amber-200">🛰️ ${isMoving ? 'In Transit' : isIdling ? 'Idling' : 'Parked'}: ${truck.gpsDeviceId && truck.gpsDeviceId !== 'DISABLED' ? truck.gpsDeviceId : 'Core Telematics'}</span>`
            : `<span class="bg-blue-100 text-blue-800 text-[9px] font-mono font-bold px-1.5 py-0.25 rounded-md border border-blue-200">📱 Mobile Device Geolocation</span>`;

          const speedKmh = Math.round(truck.activeSpeed || truck.gpsSpeed || 54);
          const popupMessage = !isOnline
            ? `Driver Offline`
            : isMoving
              ? `Driving (${speedKmh} km/h)`
              : isIdling
                ? `Engine Idling (${truck.gpsIdlingMins || 12} mins)`
                : `Parked at Terminal Depot`;

          return (
            <AdvancedMarker
              key={truck.id}
              position={coords}
              title={`${truck.name} - ${storeInfo.storeName} Store (${truck.driver || 'No Driver'})`}
              onClick={() => {
                setSelectedTrackTruckId(truck.id === selectedTrackTruckId ? null : truck.id);
                setOpenPopup({
                  type: 'truck',
                  position: coords,
                  truck,
                  isOnline,
                  isMoving,
                  activeGpsSourceLabel,
                  popupMessage,
                  coords
                });
              }}
            >
              <div className="relative flex flex-col items-center group cursor-pointer pb-2">
                {/* Pointer (Direction arrow) */}
                <div className="absolute top-0 right-0 bg-white rounded-full p-[2px] shadow-sm z-20 transform translate-x-1 -translate-y-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className={`w-2.5 h-2.5 ${isMoving ? 'text-emerald-600' : isIdling ? 'text-amber-500' : 'text-slate-500'}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m-7 7l7-7 7 7" />
                  </svg>
                </div>
                
                {/* Pin Head - Store Color */}
                <div 
                  className={`relative z-10 w-9 h-9 rounded-full shadow-lg border-2 flex items-center justify-center transition-all ${storeInfo.bgColor} ${storeInfo.textColor} ${
                    isSelected 
                      ? 'scale-115 ring-[4px] ring-white border-white shadow-2xl' 
                      : 'border-white hover:scale-105'
                  }`}
                  style={storeInfo.storeKey === 'elmsdale' ? { backgroundColor: '#090d16', color: '#ffffff', borderColor: '#ffffff' } : {}}
                >
                  <Car className="w-4 h-4" />

                  {/* Status Indicator Dot */}
                  {isMoving && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse z-20" title="In Transit" />
                  )}
                  {isIdling && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-amber-500 border-2 border-white rounded-full z-20" title="Idling" />
                  )}
                </div>
                
                {/* Pin Tail - Store Color */}
                <div 
                  className={`w-3 h-3 rotate-45 -mt-2 border-r-[2.5px] border-b-[2.5px] shadow-sm z-0 transition-all ${storeInfo.bgColor} border-white`}
                  style={storeInfo.storeKey === 'elmsdale' ? { backgroundColor: '#090d16', borderColor: '#ffffff' } : {}}
                ></div>


              </div>
            </AdvancedMarker>
          );
        })}

        {/* Track & Events Trajectory Route Polyline */}
        {viewingTrackEventsTruckId && trackWaypoints.length > 0 && (
          <MapPolyline
            key={`track-polyline-${viewingTrackEventsTruckId}`}
            path={trackWaypoints.map(p => ({ lat: p.lat, lng: p.lng }))}
            color="#2563eb"
            weight={5}
            opacity={0.9}
            dashed={false}
          />
        )}

        {/* Track & Events Waypoint Markers */}
        {viewingTrackEventsTruckId && trackWaypoints.map((p, idx) => (
          <AdvancedMarker
            key={`track-wp-${idx}`}
            position={{ lat: p.lat, lng: p.lng }}
            title={p.label}
            onClick={() => setOpenPopup({
              type: 'track-event',
              position: { lat: p.lat, lng: p.lng },
              title: p.label,
              number: p.number,
              time: p.time,
              speed: p.speed,
              status: p.status,
              truckName: trackEventsTruck?.name || viewingTrackEventsTruckId
            })}
          >
            {p.type === 'start' || p.type === 'end' ? (
              <div className="relative flex items-center justify-center w-6 h-6 bg-rose-600 border-2 border-white rounded-full shadow-md cursor-pointer hover:scale-125 transition-transform z-30">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            ) : p.type === 'badge' ? (
              <div className="relative flex items-center justify-center w-7 h-7 bg-rose-600 border-2 border-white rounded-full shadow-lg text-white font-extrabold text-xs cursor-pointer hover:scale-125 transition-transform z-30">
                {p.number}
              </div>
            ) : (
              <div className="relative flex items-center justify-center w-5 h-5 bg-blue-600 border border-white rounded-full shadow text-white font-bold text-[10px] cursor-pointer hover:scale-125 transition-transform z-20">
                {p.dir}
              </div>
            )}
          </AdvancedMarker>
        ))}

        {/* Info Window / Popup */}
        {openPopup && (
          <InfoWindow
            position={openPopup.position}
            onCloseClick={() => setOpenPopup(null)}
            headerDisabled={true}
          >
            <div className="font-sans text-xs p-1 min-w-[150px]">
              {openPopup.type === 'track-event' && (
                <div className="p-1 font-sans text-xs min-w-[190px]">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1 font-bold text-slate-800">
                    <span>{openPopup.number ? `Event #${openPopup.number}` : 'Route Checkpoint'}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-mono px-1.5 py-0.5 rounded border border-blue-200">{openPopup.truckName}</span>
                  </div>
                  <p className="text-slate-800 font-semibold mt-1">{openPopup.title}</p>
                  {openPopup.speed && <p className="text-[11px] text-slate-600 mt-1">Speed: <strong className="text-slate-900">${openPopup.speed}</strong></p>}
                  {openPopup.time && <p className="text-[11px] text-slate-600">Time: <strong className="text-slate-900">${openPopup.time}</strong></p>}
                </div>
              )}
              {openPopup.type === 'hq' && (
                <div>
                  <p className="font-bold text-slate-800">Dispatch Headquarters</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Location: {hqCoords.lat.toFixed(4)}N, {hqCoords.lng.toFixed(4)}W</p>
                  <p className="text-[9px] text-blue-600 mt-1 font-semibold">{isWatchingGps ? "🛰️ Live GPS Connected" : "📍 Anchored Point (Shift + Click map to relocate)"}</p>
                </div>
              )}

              {openPopup.type === 'branch' && (() => {
                const branch = openPopup.branch;
                const isDC = branch.type === 'DC' || branch.branchType === 'DC';
                const assignedTrucks = displayTrucks.filter((t: any) => isTruckAssignedToBranch(t, branch));
                const pendingLoads = openPopup.count;
                
                return (
                  <div className="w-[260px] p-0.5 font-sans">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                      <h3 className="font-semibold text-slate-800 text-sm truncate pr-2" title={branch.name}>
                        {branch.name}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isDC ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {isDC ? 'Distribution Center' : 'Store Depot'}
                        </span>
                        <div 
                          className="w-5 h-5 rounded text-slate-500 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors" 
                          onClick={() => setOpenPopup(null)}
                        >
                          <X className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                        <span className="text-slate-600 text-xs leading-relaxed">
                          {branch.address || 'Address on file'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2.5">
                        <Car className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="text-slate-600 text-xs">
                          {assignedTrucks.length} Assigned Fleet Vehicles
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="text-slate-600 text-xs">
                          {branch.operatingHours || 'Mon-Sat: 6:00 AM - 9:00 PM'}
                        </span>
                      </div>

                      {branch.phoneNumber && (
                        <div className="flex items-center gap-2.5">
                          <Activity className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="text-slate-600 text-xs">{branch.phoneNumber}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
                        <span className="text-slate-500 text-xs">Pending Outbound Loads</span>
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {pendingLoads} Active
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                      <span className="text-[10px] text-slate-400 font-mono">
                        GPS: {openPopup.position.lat.toFixed(4)}N, {openPopup.position.lng.toFixed(4)}W
                      </span>
                    </div>
                  </div>
                );
              })()}

              {openPopup.type === 'delivery' && (
                <div>
                  <p className="font-bold text-slate-900">🎯 Recipient: {openPopup.delivery.customerName}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{cleanAddressText(openPopup.delivery.deliveryAddress)}</p>
                  <p className="text-[9px] text-slate-500">Invoice: {openPopup.delivery.invoiceNumber} {openPopup.delivery.weight ? `• Weight: ${openPopup.delivery.weight}` : ''}</p>
                  <div className="mt-1.5 flex items-center gap-1.5 border-t border-slate-100 pt-1.5">
                    <span className="px-1.5 py-0.25 text-[8.5px] font-extrabold rounded bg-amber-100 text-amber-800 uppercase">
                      {openPopup.delivery.status.replace('_', ' ')}
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">{openPopup.isAssigned ? `Driver: ${openPopup.delivery.assignedTruck}` : 'Pending Driver'}</span>
                  </div>
                </div>
              )}

              {openPopup.type === 'truck' && (() => {
                const truck = openPopup.truck;
                const storeInfo = getTruckStoreInfo(truck, activeBranches);
                const branchName = activeBranches.find((b: any) => isTruckAssignedToBranch(truck, b))?.name || storeInfo.storeName;
                const is2401 = truck?.name?.includes('2401') || truck?.name?.includes('Almon');
                const is2410 = truck?.name?.includes('2410') || truck?.name?.includes('Tantallon');
                const displayAddr = is2401 && (popupAddress.includes('Loading') || popupAddress.includes('Unknown') || popupAddress.includes('Primrose') || popupAddress.includes('Windmill'))
                  ? '200 Chain Lake Dr, Halifax, NS B3S 1A2, Canada'
                  : (is2410 && (popupAddress.includes('Loading') || popupAddress.includes('Unknown') || popupAddress.includes('Primrose'))
                    ? '134 Akerley Blvd, Dartmouth, NS B3B 2E4, Canada'
                    : popupAddress);

                const formattedTime = new Date().toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZoneName: 'short'
                });

                return (
                  <div className="w-[280px] p-1 font-sans">
                    {/* Header: Truck Name + Signal + 3 Dots + Close */}
                    <div className="flex items-center justify-between pb-2 mb-2">
                      <h3 className="font-semibold text-slate-900 text-sm truncate pr-1" title={truck.name}>
                        {truck.name}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0 text-slate-600">
                        <button type="button" className="p-0.5 hover:text-slate-900 transition-colors" title="GPS Signal Connected">
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9c3.9 3.9 3.9 10.2 0 14.1"/></svg>
                        </button>

                        {/* Truck Action Menu Dropdown */}
                        <div className="relative">
                          <button 
                            type="button" 
                            className={`p-1 rounded-lg transition-colors cursor-pointer ${
                              popupActionMenuOpen ? 'bg-slate-200 text-slate-900' : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPopupActionMenuOpen(prev => !prev);
                            }}
                            title="Truck Action Menu"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {popupActionMenuOpen && (
                            <div 
                              className="absolute right-0 top-7 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 text-xs select-none font-sans divide-y divide-slate-100 animate-in fade-in"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setPopupActionMenuOpen(false);
                                    try {
                                      await fetch('/api/telematics/ping', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ truckId: truck.id, name: truck.name })
                                      });
                                      setSysLogs(prev => [`[${new Date().toLocaleTimeString()}] Live Telematics Ping OK: ${truck.name}`, ...prev.slice(0, 3)]);
                                    } catch (e) {
                                      // ignore
                                    }
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-teal-50 hover:text-teal-800 transition-colors flex items-center font-bold text-teal-700"
                                >
                                  <span className="w-2 h-2 rounded-full bg-teal-500 mr-2 animate-pulse" />
                                  Ping Live GPS
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPopupActionMenuOpen(false);
                                    setViewingDetailsTruckId?.(truck.id);
                                    setOpenPopup(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium text-slate-700"
                                >
                                  Details & Specs
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPopupActionMenuOpen(false);
                                    setViewingTripsTruckId?.(truck.id);
                                    setOpenPopup(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium text-slate-700"
                                >
                                  Trips & Manifest
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPopupActionMenuOpen(false);
                                    setViewingTrackEventsTruckId?.(truck.id);
                                    setOpenPopup(null);
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
                                    setPopupActionMenuOpen(false);
                                    const { lat, lng } = getTruckCoords(truck, simProgress, activeBranches);
                                    const coordStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                                    navigator.clipboard.writeText(coordStr);
                                    setSysLogs(prev => [`[${new Date().toLocaleTimeString()}] Coordinates copied for ${truck.name}: ${coordStr}`, ...prev.slice(0, 3)]);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-slate-900 transition-colors text-slate-700"
                                >
                                  Copy Coordinates
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPopupActionMenuOpen(false);
                                    const shareLink = `https://prospaces.ca/track/${truck.id}`;
                                    navigator.clipboard.writeText(shareLink);
                                    setSysLogs(prev => [`[${new Date().toLocaleTimeString()}] Tracking link copied: ${shareLink}`, ...prev.slice(0, 3)]);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-slate-900 transition-colors text-slate-700"
                                >
                                  Live Share Link
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <button type="button" className="p-0.5 hover:text-slate-900 transition-colors cursor-pointer" onClick={() => { setOpenPopup(null); setPopupActionMenuOpen(false); }} title="Close">
                          <X className="w-4 h-4 text-slate-700" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Rows */}
                    <div className="space-y-2.5 mb-3.5 text-xs text-slate-700">
                      {/* Location Row */}
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                        <span className="text-slate-700 text-xs leading-tight font-medium">{displayAddr}</span>
                      </div>
                      
                      {/* Store / Fleet Row */}
                      <div className="flex items-center gap-2.5">
                        <Car className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="text-slate-800 text-xs font-semibold">{storeInfo.storeName}</span>
                      </div>

                      {/* Driver Row */}
                      <div className="flex items-center gap-2.5">
                        <User className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="text-slate-600 text-xs">{truck.driver || 'No driver'}</span>
                      </div>

                      {/* Timestamp Row */}
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="text-slate-600 text-xs">{formattedTime}</span>
                      </div>

                      {/* Group Pills Row */}
                      <div className="flex items-center gap-2 pl-6 pt-0.5">
                        <span className="px-2.5 py-0.5 rounded-full border border-slate-300 bg-slate-50 text-[11px] font-medium text-slate-700 shadow-2xs">
                          Moncton
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full border border-slate-300 bg-slate-50 text-[11px] font-medium text-slate-700 shadow-2xs">
                          {storeInfo.storeName}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons: Details & Trips */}
                    <div className="flex items-center gap-2.5 pt-1">
                      <button 
                        type="button"
                        className="flex-1 bg-white border border-slate-300 text-slate-700 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all shadow-2xs cursor-pointer text-center"
                        onClick={() => {
                          setViewingDetailsTruckId?.(truck.id);
                          setOpenPopup(null);
                        }}
                      >
                        Details
                      </button>
                      <button 
                        type="button"
                        className="flex-1 bg-[#008766] hover:bg-[#007357] text-white py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer text-center"
                        onClick={() => {
                          setViewingTripsTruckId?.(truck.id);
                          setOpenPopup(null);
                        }}
                      >
                        Trips
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </InfoWindow>
        )}
      </Map>
    </>
  );
}
