import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Branch, DeliveryRecord, Truck, DeliveryStatus } from '../types';
import { 
  Store as StoreIcon, 
  Warehouse as WarehouseIcon, 
  Truck as TruckIcon, 
  MapPin, 
  Navigation2, 
  User, 
  Clock, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  LocateFixed, 
  AlertCircle, 
  ExternalLink, 
  Key, 
  X, 
  Maximize2,
  CheckCircle2,
  Activity,
  ArrowRight,
  ShieldCheck,
  Building,
  RefreshCw
} from 'lucide-react';
import { TeardropTruckMarker } from './TeardropTruckMarker';
import { 
  getBranchCoordinates, 
  getDeliveryCoordinates, 
  getTruckCoords, 
  cleanAddressText,
  getTruckStoreInfo,
  STORE_COLOR_MAP
} from '../lib/mapHelpers';

export interface StandaloneFleetMapProps {
  hqCoords: { lat: number; lng: number };
  activeBranches: Branch[];
  displayDeliveries: DeliveryRecord[];
  displayTrucks: Truck[];
  simProgress: Record<string, number>;
  selectedTrackTruckId: string | null;
  setSelectedTrackTruckId: (id: string | null) => void;
  isPlayingSimulation: boolean;
  isWatchingGps: boolean;
  mapTheme?: string;
  isTruckOnline: (truck: any) => boolean;
  setViewingDetailsTruckId?: (id: string | null) => void;
  setViewingTripsTruckId?: (id: string | null) => void;
  viewingTrackEventsTruckId?: string | null;
  setViewingTrackEventsTruckId?: (id: string | null) => void;
  onOpenKeyModal?: () => void;
  onSwitchToGoogleMaps?: () => void;
  mapAuthError?: boolean;
  onDismissAuthError?: () => void;
  isDevelopmentMode?: boolean;
  onRecheckBilling?: () => Promise<void> | void;
  isCheckingBilling?: boolean;
  billingMessage?: string;
}

export default function StandaloneFleetMap({
  hqCoords,
  activeBranches,
  displayDeliveries,
  displayTrucks,
  simProgress,
  selectedTrackTruckId,
  setSelectedTrackTruckId,
  isPlayingSimulation,
  isWatchingGps,
  mapTheme = 'dark',
  isTruckOnline,
  setViewingDetailsTruckId,
  setViewingTripsTruckId,
  viewingTrackEventsTruckId,
  setViewingTrackEventsTruckId,
  onOpenKeyModal,
  onSwitchToGoogleMaps,
  mapAuthError = false,
  onDismissAuthError,
  isDevelopmentMode = true,
  onRecheckBilling,
  isCheckingBilling = false,
  billingMessage
}: StandaloneFleetMapProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const [activePopup, setActivePopup] = useState<{
    type: 'truck' | 'branch' | 'delivery';
    data: any;
    coords: { lat: number; lng: number };
  } | null>(null);

  // Compute bounding box encompassing all points
  const bounds = useMemo(() => {
    const points: { lat: number; lng: number }[] = [];

    if (hqCoords && hqCoords.lat !== 0 && hqCoords.lng !== 0 && !isNaN(hqCoords.lat) && !isNaN(hqCoords.lng)) {
      points.push(hqCoords);
    }

    activeBranches.forEach((b: any) => {
      const coords = getBranchCoordinates(b.id, b.name, b.address);
      if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
        points.push(coords);
      }
    });

    displayDeliveries.filter((d: any) => d.status !== DeliveryStatus.DELIVERED).forEach((delivery: any) => {
      const orig = getBranchCoordinates(delivery.originBranch, '', '');
      const dest = getDeliveryCoordinates(delivery.id, delivery.deliveryAddress, orig.x, orig.y);
      if (dest && !isNaN(dest.lat) && !isNaN(dest.lng)) {
        points.push(dest);
      }
    });

    displayTrucks.forEach((t: any) => {
      const coords = getTruckCoords(t, simProgress, activeBranches);
      if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
        points.push(coords);
      }
    });

    if (points.length === 0) {
      return {
        minLat: 44.58,
        maxLat: 44.82,
        minLng: -63.75,
        maxLng: -63.45
      };
    }

    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;

    points.forEach(p => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    });

    // Add safe padding
    const latSpan = Math.max(maxLat - minLat, 0.05);
    const lngSpan = Math.max(maxLng - minLng, 0.05);
    const latPad = latSpan * 0.16;
    const lngPad = lngSpan * 0.16;

    return {
      minLat: minLat - latPad,
      maxLat: maxLat + latPad,
      minLng: minLng - lngPad,
      maxLng: maxLng + lngPad
    };
  }, [hqCoords, activeBranches, displayDeliveries, displayTrucks, simProgress]);

  // Project geographic coordinates into percentage offsets
  const project = useCallback((lat: number, lng: number) => {
    const latSpan = bounds.maxLat - bounds.minLat || 0.1;
    const lngSpan = bounds.maxLng - bounds.minLng || 0.1;

    const x = ((lng - bounds.minLng) / lngSpan) * 100;
    const y = ((bounds.maxLat - lat) / latSpan) * 100;

    return {
      x: Math.max(4, Math.min(96, x)),
      y: Math.max(4, Math.min(96, y))
    };
  }, [bounds]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag on canvas background
    if ((e.target as HTMLElement).closest('.map-marker-pin, .map-popup-card, button, a')) return;
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
    setActivePopup(null);
  };

  // Branch items with projected positions
  const branchItems = useMemo(() => {
    return activeBranches.map(b => {
      const coords = getBranchCoordinates(b.id, b.name, b.address);
      const isDC = b.type === 'DC' || (b as any).branchType === 'DC' || (b.name || '').toLowerCase().includes('dc');
      const pos = project(coords.lat, coords.lng);
      return { branch: b, coords, pos, isDC };
    });
  }, [activeBranches, project]);

  // Delivery items with projected positions
  const deliveryItems = useMemo(() => {
    return displayDeliveries.map((delivery, index) => {
      const orig = getBranchCoordinates(delivery.originBranch, '', '');
      const dest = getDeliveryCoordinates(delivery.id, delivery.deliveryAddress, orig.x, orig.y);
      const origPos = project(orig.lat, orig.lng);
      const destPos = project(dest.lat, dest.lng);

      const isDelivered = delivery.status === DeliveryStatus.DELIVERED;
      const isInTransit = delivery.status === DeliveryStatus.IN_TRANSIT || delivery.status === DeliveryStatus.OUT_FOR_DELIVERY;

      return {
        delivery,
        index: index + 1,
        coords: dest,
        pos: destPos,
        origPos,
        isDelivered,
        isInTransit
      };
    });
  }, [displayDeliveries, project]);

  // Truck items with projected positions
  const truckItems = useMemo(() => {
    return displayTrucks.map(truck => {
      const coords = getTruckCoords(truck, simProgress, activeBranches);
      const pos = project(coords.lat, coords.lng);
      const isOnline = isTruckOnline(truck);
      const isMoving = isOnline && (truck.isDriving || (truck.gpsSpeed && truck.gpsSpeed > 0) || truck.status === 'Driving' || truck.status === 'In Transit');
      const storeInfo = getTruckStoreInfo(truck, activeBranches);

      return {
        truck,
        coords,
        pos,
        isOnline,
        isMoving,
        storeInfo
      };
    });
  }, [displayTrucks, simProgress, activeBranches, isTruckOnline, project]);

  // Count online trucks & pending deliveries
  const onlineTrucksCount = truckItems.filter(t => t.isOnline).length;
  const activeDeliveriesCount = deliveryItems.filter(d => !d.isDelivered).length;

  return (
    <div 
      className="relative w-full h-full min-h-[420px] bg-slate-950 overflow-hidden select-none cursor-grab active:cursor-grabbing font-sans"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* ══════════════════════════════════════════════════════════════════════
          TOP BILLING NOT ENABLED DIAGNOSIS & REMEDIATION BANNER
          ══════════════════════════════════════════════════════════════════════ */}
      {(mapAuthError || isDevelopmentMode) && (
        <div className="absolute top-3 inset-x-3 z-30 bg-amber-950/95 backdrop-blur-md border border-amber-500/70 text-amber-100 text-xs p-3.5 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in select-text">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-sm">Google Maps Development Mode Detected</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-900/90 text-amber-300 font-mono text-[10.5px] font-bold border border-amber-700/60">
                  "For development purposes only"
                </span>
                <span className="px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 font-mono text-[10px] font-bold border border-blue-700/60">
                  Key Connected from Supabase
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-700/60">
                  Clean Canvas Active
                </span>
              </div>
              <p className="text-amber-200/90 text-xs mt-1 leading-relaxed">
                The Google Maps API key stored in your Supabase database (<code className="text-amber-300 font-mono text-[11px]">tenant_env_vars</code>) is connected and active. However, Google Cloud places keys in <strong>Development Mode</strong> with watermarks until an active billing account is linked to the Google Cloud project. Google includes a <strong>$200/month recurring free credit</strong> (28,500 free map loads every month).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
            <a
              href="https://console.cloud.google.com/project/_/billing/enable"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>Enable Billing in Google Cloud ↗</span>
            </a>
            {onRecheckBilling && (
              <button
                type="button"
                onClick={onRecheckBilling}
                disabled={isCheckingBilling}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors border border-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${isCheckingBilling ? 'animate-spin text-blue-400' : ''}`} />
                <span>{isCheckingBilling ? 'Checking...' : 'Recheck Status'}</span>
              </button>
            )}
            {onSwitchToGoogleMaps && (
              <button
                type="button"
                onClick={onSwitchToGoogleMaps}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition-colors border border-slate-700 cursor-pointer"
                title="Preview with Google Maps development watermark"
              >
                Preview Google Maps
              </button>
            )}
            {onOpenKeyModal && (
              <button
                type="button"
                onClick={onOpenKeyModal}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl text-xs transition-colors border border-slate-700 cursor-pointer"
              >
                Change Key
              </button>
            )}
            {onDismissAuthError && (
              <button
                type="button"
                onClick={onDismissAuthError}
                className="p-1.5 text-amber-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Dismiss banner"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          GEOSPATIAL VECTOR CANVAS (PAN & ZOOM CONTAINER)
          ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="absolute inset-0 transition-transform duration-75 ease-out origin-center"
        style={{
          transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`
        }}
      >
        {/* Dark Grid Background */}
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1.2px,transparent_1.2px)] [background-size:28px_28px] opacity-40"></div>

        {/* Real-time SVG Routes Layer */}
        {showRoutes && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="fleetRouteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="activeDeliveryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.5" />
              </linearGradient>
            </defs>

            {/* Delivery Route Lines (Origin Store -> Customer Destination) */}
            {deliveryItems.filter(d => !d.isDelivered).map((d) => (
              <line
                key={`route-${d.delivery.id}`}
                x1={`${d.origPos.x}%`}
                y1={`${d.origPos.y}%`}
                x2={`${d.pos.x}%`}
                y2={`${d.pos.y}%`}
                stroke="url(#fleetRouteGradient)"
                strokeWidth="2.5"
                strokeDasharray="6,4"
                className="transition-all"
              />
            ))}

            {/* Selected Truck Route Lines */}
            {selectedTrackTruckId && (() => {
              const selectedTruckItem = truckItems.find(t => t.truck.id === selectedTrackTruckId);
              if (!selectedTruckItem) return null;
              const assignedDels = deliveryItems.filter(d => d.delivery.assignedTruck === selectedTrackTruckId && !d.isDelivered);
              return assignedDels.map(d => (
                <line
                  key={`truck-del-line-${d.delivery.id}`}
                  x1={`${selectedTruckItem.pos.x}%`}
                  y1={`${selectedTruckItem.pos.y}%`}
                  x2={`${d.pos.x}%`}
                  y2={`${d.pos.y}%`}
                  stroke="url(#activeDeliveryGradient)"
                  strokeWidth="3.5"
                  strokeDasharray="8,5"
                  className="animate-pulse"
                />
              ));
            })()}
          </svg>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            BRANCH & STORE PINS
            ════════════════════════════════════════════════════════════════════ */}
        {branchItems.map(({ branch, pos, isDC }) => (
          <div
            key={`branch-pin-${branch.id}`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
            onClick={(e) => {
              e.stopPropagation();
              setActivePopup({
                type: 'branch',
                data: branch,
                coords: getBranchCoordinates(branch.id, branch.name, branch.address)
              });
            }}
            className="absolute map-marker-pin cursor-pointer group z-20 transition-transform duration-200 hover:scale-125"
          >
            <div className="flex flex-col items-center">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center shadow-2xl border-2 transition-all ${
                  isDC
                    ? 'bg-slate-900 border-rose-500 text-rose-400 ring-4 ring-rose-500/20'
                    : 'bg-slate-900 border-blue-400 text-blue-400 ring-4 ring-blue-500/20'
                }`}
              >
                {isDC ? <WarehouseIcon className="h-4.5 w-4.5" /> : <StoreIcon className="h-4.5 w-4.5" />}
              </div>
              <div className="mt-1 px-2 py-0.5 bg-slate-900/95 border border-slate-700/80 rounded-md text-[10px] font-bold text-white shadow-lg whitespace-nowrap max-w-[130px] truncate pointer-events-none">
                {branch.name.replace(/^RONA\s*/i, '')}
              </div>
            </div>
          </div>
        ))}

        {/* ════════════════════════════════════════════════════════════════════
            DELIVERY ORDER PINS
            ════════════════════════════════════════════════════════════════════ */}
        {deliveryItems.map(({ delivery, index, pos, isDelivered, isInTransit }) => (
          <div
            key={`delivery-pin-${delivery.id}`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -100%)'
            }}
            onClick={(e) => {
              e.stopPropagation();
              setActivePopup({
                type: 'delivery',
                data: delivery,
                coords: delivery.coords || { lat: 44.68, lng: -63.58 }
              });
            }}
            className="absolute map-marker-pin cursor-pointer group z-25 transition-transform duration-200 hover:scale-125"
          >
            <div className="flex flex-col items-center">
              <div
                className={`h-7 w-7 rounded-xl flex items-center justify-center font-mono font-black text-[11px] shadow-xl border-2 transition-all ${
                  isDelivered
                    ? 'bg-emerald-600 border-white text-white'
                    : isInTransit
                    ? 'bg-blue-600 border-white text-white ring-4 ring-blue-500/40'
                    : 'bg-amber-600 border-white text-white ring-2 ring-amber-400/30'
                }`}
              >
                {isDelivered ? <CheckCircle2 className="h-4 w-4" /> : index}
              </div>
              <div className="mt-0.5 px-1.5 py-0.5 bg-slate-900/95 border border-slate-700 text-white rounded text-[9px] font-bold shadow-md max-w-[100px] truncate pointer-events-none">
                {delivery.customerName?.split(' ')[0] || `Stop ${index}`}
              </div>
            </div>
          </div>
        ))}

        {/* ════════════════════════════════════════════════════════════════════
            FLEET TRUCK MARKERS (TEARDROP AVATARS)
            ════════════════════════════════════════════════════════════════════ */}
        {truckItems.map(({ truck, pos, isOnline, isMoving, storeInfo }) => {
          const isSelected = selectedTrackTruckId === truck.id;
          const markerColor = isMoving ? '#059669' : isOnline ? '#d97706' : '#64748b';
          const unitMatch = truck.name.match(/\d+/) || truck.id.match(/\d+/);
          const unitNumber = unitMatch ? unitMatch[0] : truck.id.slice(-3);

          return (
            <div
              key={`truck-marker-${truck.id}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -100%)'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTrackTruckId(truck.id);
                setActivePopup({
                  type: 'truck',
                  data: truck,
                  coords: getTruckCoords(truck, simProgress, activeBranches)
                });
              }}
              className={`absolute map-marker-pin cursor-pointer transition-all duration-300 ${
                isSelected ? 'scale-125 z-40' : 'hover:scale-110 z-30'
              }`}
            >
              <TeardropTruckMarker
                color={markerColor}
                isMoving={isMoving}
                isSelected={isSelected}
                label={`#${unitNumber}`}
                driverName={truck.assignedDriverName || truck.driverName || 'Driver'}
                speedText={truck.gpsSpeed ? `${Math.round(truck.gpsSpeed)}k` : undefined}
                size="md"
              />
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TOP FLOATING FLEET STATUS & CONTROLS HUD
          ══════════════════════════════════════════════════════════════════════ */}
      <div className={`absolute ${mapAuthError ? 'top-20' : 'top-3'} inset-x-3 flex items-center justify-between pointer-events-none z-20 transition-all`}>
        {/* Left: Engine & Fleet Summary */}
        <div className="flex items-center space-x-2 pointer-events-auto flex-wrap gap-y-1.5">
          <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-xl flex items-center space-x-2 text-white text-xs font-bold">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-mono text-[11px] text-slate-200">
              BUILT-IN FLEET ENGINE
            </span>
            <span className="text-slate-500">&bull;</span>
            <span className="text-emerald-400 font-mono text-[11px]">
              {onlineTrucksCount} TRUCKS ONLINE
            </span>
          </div>

          <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-xl text-slate-300 text-xs font-mono hidden md:flex items-center space-x-2">
            <span>{activeDeliveriesCount} Pending Stops</span>
            <span className="text-slate-500">&bull;</span>
            <span>{activeBranches.length} Stores/DC</span>
          </div>
        </div>

        {/* Right: View Controls */}
        <div className="flex items-center space-x-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={resetView}
            className="px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 shadow-xl transition-all cursor-pointer flex items-center space-x-1"
            title="Recenter & Fit Fleet"
          >
            <Maximize2 className="h-3.5 w-3.5 text-blue-400" />
            <span className="hidden sm:inline">Fit Fleet</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRoutes(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xl flex items-center space-x-1 ${
              showRoutes
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-900/90 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle Delivery Corridors"
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Routes</span>
          </button>

          {onSwitchToGoogleMaps && (
            <button
              type="button"
              onClick={onSwitchToGoogleMaps}
              className="px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 shadow-xl transition-all cursor-pointer flex items-center space-x-1"
              title="Switch to Google Maps Platform"
            >
              <span>Google Maps</span>
            </button>
          )}

          {onOpenKeyModal && (
            <button
              type="button"
              onClick={onOpenKeyModal}
              className="p-1.5 bg-slate-900/90 hover:bg-slate-800 text-amber-400 rounded-xl border border-slate-700 shadow-xl transition-all cursor-pointer"
              title="Configure API Key"
            >
              <Key className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          INTERACTIVE POPUP DRAWER / CARD (TRUCK, BRANCH, DELIVERY)
          ══════════════════════════════════════════════════════════════════════ */}
      {activePopup && (
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-[380px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-white z-40 animate-in fade-in slide-in-from-bottom-3 map-popup-card">
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                {activePopup.type === 'truck' ? (
                  <TruckIcon className="h-4 w-4" />
                ) : activePopup.type === 'branch' ? (
                  <StoreIcon className="h-4 w-4" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">
                  {activePopup.type === 'truck'
                    ? activePopup.data.name
                    : activePopup.type === 'branch'
                    ? activePopup.data.name
                    : `Order: ${activePopup.data.invoiceNumber || 'Delivery'}`}
                </h4>
                <p className="text-[11px] text-slate-400 capitalize">
                  {activePopup.type} Details
                </p>
              </div>
            </div>
            <button
              onClick={() => setActivePopup(null)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Details Content */}
          {activePopup.type === 'truck' && (() => {
            const truck = activePopup.data;
            const isOnline = isTruckOnline(truck);
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Driver</span>
                    <span className="font-bold text-slate-200 truncate block">
                      {truck.assignedDriverName || truck.driverName || 'Unassigned'}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Speed</span>
                    <span className="font-bold text-emerald-400 font-mono block">
                      {truck.gpsSpeed ? `${Math.round(truck.gpsSpeed)} km/h` : '0 km/h (Parked)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {setViewingDetailsTruckId && (
                    <button
                      type="button"
                      onClick={() => {
                        setViewingDetailsTruckId(truck.id);
                        setActivePopup(null);
                      }}
                      className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
                    >
                      View Details
                    </button>
                  )}
                  {setViewingTripsTruckId && (
                    <button
                      type="button"
                      onClick={() => {
                        setViewingTripsTruckId(truck.id);
                        setActivePopup(null);
                      }}
                      className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
                    >
                      Trips
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {activePopup.type === 'branch' && (() => {
            const branch = activePopup.data;
            const assignedTrucks = displayTrucks.filter(t => (t as any).branchId === branch.id || (t as any).storeId === branch.id);
            return (
              <div className="space-y-2 text-xs text-slate-300">
                <p className="text-slate-400 leading-relaxed">{branch.address || 'Address registered in system'}</p>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Assigned Fleet Units:</span>
                  <span className="font-bold text-white font-mono">{assignedTrucks.length} trucks</span>
                </div>
              </div>
            );
          })()}

          {activePopup.type === 'delivery' && (() => {
            const del = activePopup.data;
            return (
              <div className="space-y-2 text-xs">
                <p className="text-white font-bold">{del.customerName}</p>
                <p className="text-slate-400 truncate">{del.deliveryAddress}</p>
                <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-bold text-emerald-400 uppercase font-mono text-[11px]">{del.status}</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          BOTTOM RIGHT FLOATING ZOOM & PAN CONTROLS
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="absolute bottom-4 right-4 flex flex-col space-y-1.5 z-20">
        <button
          type="button"
          onClick={() => setZoomLevel(prev => Math.min(prev + 0.3, 3))}
          className="h-9 w-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 shadow-xl flex items-center justify-center transition-all cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoomLevel(prev => Math.max(prev - 0.3, 0.6))}
          className="h-9 w-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 shadow-xl flex items-center justify-center transition-all cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="h-9 w-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-blue-400 border border-slate-700 shadow-xl flex items-center justify-center transition-all cursor-pointer"
          title="Recenter Canvas"
        >
          <LocateFixed className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
