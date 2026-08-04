import React, { useState, useMemo } from 'react';
import { DeliveryRecord, DeliveryStatus, Truck, Branch, User as AppUser } from '../types';
import { 
  Truck as TruckIcon, Package, Search, Filter, CheckCircle2, 
  AlertTriangle, Lock, Unlock, ArrowRight, RotateCcw, Plus, X, 
  ChevronDown, ChevronUp, Layers, Sparkles, MapPin, User, Clock, ShieldCheck, Check
} from 'lucide-react';

interface DragDropFreightBoardProps {
  deliveries: DeliveryRecord[];
  trucks: Truck[];
  onAddOrUpdateDelivery: (record: DeliveryRecord) => void;
  branches?: Branch[];
  users?: AppUser[];
  onCloseModal?: () => void;
}

// Helper to estimate or parse weight in lbs from string
export function parseDeliveryWeightLbs(delivery: DeliveryRecord): number {
  if (delivery.weight) {
    const numericStr = delivery.weight.replace(/[^0-9.]/g, '');
    const val = parseFloat(numericStr);
    if (!isNaN(val) && val > 0) {
      if (delivery.weight.toLowerCase().includes('ton')) {
        return Math.round(val * 2000);
      }
      if (delivery.weight.toLowerCase().includes('kg')) {
        return Math.round(val * 2.20462);
      }
      return Math.round(val);
    }
  }
  // Deterministic fallback weight based on ticket ID
  let hash = 0;
  for (let i = 0; i < delivery.id.length; i++) {
    hash = (hash * 31 + delivery.id.charCodeAt(i)) & 0x7fffffff;
  }
  return 900 + (hash % 1600); // 900 lbs to 2,500 lbs
}

// Helper to determine truck max weight capacity in lbs
export function getTruckMaxCapacityLbs(truck: Truck): number {
  // 1. Direct capacityWeightKg field from truck table
  if (truck.capacityWeightKg && truck.capacityWeightKg > 0) {
    // If entered directly in lbs (e.g. >= 2000), return as-is
    if (truck.capacityWeightKg >= 2000) {
      return Math.round(truck.capacityWeightKg);
    }
    // Otherwise convert Kg -> Lbs (1 kg = 2.20462 lbs)
    return Math.round(truck.capacityWeightKg * 2.20462);
  }

  // 2. Check custom user fields if configured
  if (truck.userField1) {
    const val = parseFloat(truck.userField1.replace(/[^0-9.]/g, ''));
    if (!isNaN(val) && val > 0) {
      return val < 2000 ? Math.round(val * 2.20462) : Math.round(val);
    }
  }
  if (truck.userField2) {
    const val = parseFloat(truck.userField2.replace(/[^0-9.]/g, ''));
    if (!isNaN(val) && val > 0) {
      return val < 2000 ? Math.round(val * 2.20462) : Math.round(val);
    }
  }

  // 3. Model/type based fallback if table entry is unset
  const nameLower = (truck.name + ' ' + truck.type + ' ' + (truck.model || '')).toLowerCase();
  if (nameLower.includes('boom') || nameLower.includes('crane')) return 12000;
  if (nameLower.includes('heavy') || nameLower.includes('flatbed') || nameLower.includes('curtain')) return 10000;
  if (nameLower.includes('f150') || nameLower.includes('pickup')) return 3500;
  if (nameLower.includes('reefer') || nameLower.includes('dry van')) return 8000;
  return 8000;
}

// Helper to format store / branch display names cleanly
export function formatBranchDisplayName(branchOrId: string | Branch, branches: Branch[] = []): string {
  if (!branchOrId) return 'Depot';
  if (typeof branchOrId === 'object') {
    return branchOrId.name || branchOrId.id || 'Depot';
  }
  const found = branches.find(b => b.id === branchOrId || b.name === branchOrId);
  if (found) return found.name;
  return branchOrId.replace(/^01075_/, '').trim() || 'Depot';
}

// Vector SVG Truck Graphic showing cab, trailer, wheels, and fluid vertical cargo fill
function TruckGraphic({ fillPct, isFull, truckId }: { fillPct: number; isFull: boolean; truckId: string }) {
  const patternId = `hazardPattern_${truckId.replace(/[^a-zA-Z0-9]/g, '_')}`;
  
  // Trailer dimensions inside SVG (viewBox="0 0 210 68")
  const innerX = 54;
  const innerY = 10;
  const innerW = 142;
  const innerH = 38;
  
  // Calculate vertical fill height from bottom
  const fillH = Math.max(0, Math.round((innerH * fillPct) / 100));
  const fillY = innerY + (innerH - fillH);

  return (
    <div className="relative w-full max-w-[220px] py-1 select-none">
      <svg viewBox="0 0 210 68" className="w-full h-auto filter drop-shadow-xs overflow-visible">
        <defs>
          {/* Diagonal Hazard Stripe Pattern for FULL trucks */}
          <pattern id={patternId} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="16" fill="#f59e0b" />
            <rect x="8" width="8" height="16" fill="#b45309" />
          </pattern>
        </defs>

        {/* Truck Front Cab */}
        <rect x="8" y="14" width="38" height="34" rx="6" fill="#334155" stroke="#1e293b" strokeWidth="1.5" />
        {/* Cab Windshield Window */}
        <rect x="22" y="18" width="18" height="15" rx="3" fill="#38bdf8" />
        <path d="M 22 18 L 34 18 C 37 18, 39 20, 39 23 L 39 31 C 39 33, 37 33, 34 33 L 22 33 Z" fill="#7dd3fc" opacity="0.8" />

        {/* Trailer Container Main Frame */}
        <rect x="52" y="8" width="146" height="42" rx="7" fill="#1e293b" stroke="#475569" strokeWidth="2.5" />

        {/* Trailer Cargo Fill */}
        {isFull ? (
          /* Full trailer with hazard diagonal warning stripes */
          <rect x="55" y="11" width="140" height="36" rx="5" fill={`url(#${patternId})`} />
        ) : fillPct > 0 ? (
          /* Partial load vertical fill level in solid amber/gold */
          <rect x="55" y={fillY + 1} width="140" height={Math.max(3, fillH - 2)} rx={fillPct >= 90 ? 5 : 2} fill="#f59e0b" />
        ) : (
          /* Empty trailer accent cyan line at bottom */
          <rect x="55" y={innerY + innerH - 4} width="140" height="4" rx="2" fill="#06b6d4" />
        )}

        {/* Wheels & Tires */}
        {/* Front Cab Wheel */}
        <circle cx="26" cy="52" r="8" fill="#0f172a" stroke="#475569" strokeWidth="2.5" />
        <circle cx="26" cy="52" r="3" fill="#cbd5e1" />

        {/* Trailer Front Wheel */}
        <circle cx="82" cy="52" r="8" fill="#0f172a" stroke="#475569" strokeWidth="2.5" />
        <circle cx="82" cy="52" r="3" fill="#cbd5e1" />

        {/* Trailer Rear Wheel */}
        <circle cx="170" cy="52" r="8" fill="#0f172a" stroke="#475569" strokeWidth="2.5" />
        <circle cx="170" cy="52" r="3" fill="#cbd5e1" />
      </svg>
    </div>
  );
}

export default function DragDropFreightBoard({
  deliveries,
  trucks,
  onAddOrUpdateDelivery,
  branches = [],
  users = []
}: DragDropFreightBoardProps) {
  // Local state for manually marked FULL trucks
  const [fullTruckIds, setFullTruckIds] = useState<Record<string, boolean>>({});
  
  // Drag over target truck ID
  const [dragOverTruckId, setDragOverTruckId] = useState<string | null>(null);
  
  // Currently dragged delivery ID
  const [draggedDeliveryId, setDraggedDeliveryId] = useState<string | null>(null);

  // Selected store / branch filter for unassigned deliveries
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('ALL');

  // Search filter for deliveries
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mobile/Click assign modal state
  const [assigningDelivery, setAssigningDelivery] = useState<DeliveryRecord | null>(null);

  // Expanded truck details ID
  const [expandedTruckId, setExpandedTruckId] = useState<string | null>(null);

  // Filter trucks (excluding deleted or inactive)
  const activeTrucks = useMemo(() => {
    return trucks.filter(t => t.isActive !== false);
  }, [trucks]);

  // Extract unique tenant store list from tenant branches & deliveries
  const tenantStores = useMemo(() => {
    const storeMap = new Map<string, { id: string; name: string }>();

    // 1. Map from tenant branches
    if (branches && branches.length > 0) {
      branches.forEach(b => {
        const displayName = formatBranchDisplayName(b);
        storeMap.set(displayName.toUpperCase(), { id: b.id, name: displayName });
      });
    }

    // 2. Map from deliveries/trucks if any additional origin branches exist
    deliveries.forEach(d => {
      if (d.originBranch) {
        const displayName = formatBranchDisplayName(d.originBranch);
        const key = displayName.toUpperCase();
        if (!storeMap.has(key)) {
          storeMap.set(key, { id: d.originBranch, name: displayName });
        }
      }
    });

    // Fallback default Nova Scotia stores if tenant store list is small
    const defaults = ['TANTALLON', 'ELMSDALE', 'HALIFAX', 'WINMILL', 'ALMON', 'HEBBVILLE', 'BRIDGEWATER'];
    defaults.forEach(d => {
      if (!storeMap.has(d)) {
        storeMap.set(d, { id: d, name: d });
      }
    });

    return Array.from(storeMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [branches, deliveries]);

  // Unassigned deliveries (no assignedTruck or assignedTruck is 'unassigned' or 'No Truck')
  const unassignedDeliveries = useMemo(() => {
    return deliveries.filter(d => {
      const isUnassigned = !d.assignedTruck || d.assignedTruck === 'unassigned' || d.assignedTruck === 'No Truck' || d.assignedTruck === '';
      if (!isUnassigned) return false;

      // Filter out completed delivered/returned
      if (d.status === DeliveryStatus.DELIVERED || d.status === DeliveryStatus.RETURNED) return false;

      // Store filter
      if (selectedStoreFilter !== 'ALL') {
        const targetUpper = selectedStoreFilter.toUpperCase();
        const originUpper = formatBranchDisplayName(d.originBranch || '').toUpperCase();
        const addrUpper = (d.deliveryAddress || '').toUpperCase();
        const matchesOrigin = originUpper.includes(targetUpper);
        const matchesAddr = addrUpper.includes(targetUpper);
        if (!matchesOrigin && !matchesAddr) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = d.id.toLowerCase().includes(q);
        const matchesCustomer = (d.customerName || '').toLowerCase().includes(q);
        const matchesInv = (d.invoiceNumber || '').toLowerCase().includes(q);
        const matchesAddress = (d.deliveryAddress || '').toLowerCase().includes(q);
        if (!matchesId && !matchesCustomer && !matchesInv && !matchesAddress) return false;
      }

      return true;
    });
  }, [deliveries, selectedStoreFilter, searchQuery]);

  // Deliveries grouped by truck
  const deliveriesByTruck = useMemo(() => {
    const map: Record<string, DeliveryRecord[]> = {};
    activeTrucks.forEach(t => {
      map[t.id] = [];
    });

    deliveries.forEach(d => {
      if (!d.assignedTruck || d.assignedTruck === 'unassigned' || d.assignedTruck === 'No Truck') return;
      if (d.status === DeliveryStatus.DELIVERED || d.status === DeliveryStatus.RETURNED) return;

      // Match by truck ID or truck Name
      const matchedTruck = activeTrucks.find(t => 
        t.id.toLowerCase().trim() === d.assignedTruck?.toLowerCase().trim() ||
        t.name.toLowerCase().trim() === d.assignedTruck?.toLowerCase().trim()
      );

      if (matchedTruck) {
        map[matchedTruck.id] = map[matchedTruck.id] || [];
        map[matchedTruck.id].push(d);
      }
    });

    return map;
  }, [deliveries, activeTrucks]);

  // Group unassigned deliveries by Shift (AM / PM)
  const amDeliveries = useMemo(() => {
    return unassignedDeliveries.filter(d => d.scheduledSlot === 'AM' || !d.scheduledSlot || d.scheduledSlot as string === 'Morning');
  }, [unassignedDeliveries]);

  const pmDeliveries = useMemo(() => {
    return unassignedDeliveries.filter(d => d.scheduledSlot === 'PM' || d.scheduledSlot as string === 'Afternoon');
  }, [unassignedDeliveries]);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, deliveryId: string) => {
    e.dataTransfer.setData('text/plain', deliveryId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedDeliveryId(deliveryId);
  };

  const handleDragEnd = () => {
    setDraggedDeliveryId(null);
    setDragOverTruckId(null);
  };

  const handleDragOver = (e: React.DragEvent, truckId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTruckId !== truckId) {
      setDragOverTruckId(truckId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, truckId: string) => {
    e.preventDefault();
    if (dragOverTruckId === truckId) {
      setDragOverTruckId(null);
    }
  };

  // Assign delivery to truck
  const assignDeliveryToTruck = (deliveryId: string, truck: Truck) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;

    const updatedDriver = (truck.driver && truck.driver.toLowerCase() !== 'no driver' && truck.driver.toLowerCase() !== 'unassigned') 
      ? truck.driver 
      : (delivery.assignedDriver || 'Unassigned');

    const updated: DeliveryRecord = {
      ...delivery,
      assignedTruck: truck.name || truck.id,
      assignedDriver: updatedDriver,
      status: DeliveryStatus.PICKED_AND_LOADED,
      history: [
        ...(delivery.history || []),
        {
          status: DeliveryStatus.PICKED_AND_LOADED,
          timestamp: new Date().toISOString(),
          location: truck.branchId || delivery.originBranch || 'Depot',
          operator: 'Dispatcher',
          notes: `Loaded onto ${truck.name} via Drag & Drop Freight Board`
        }
      ]
    };

    onAddOrUpdateDelivery(updated);
    setDragOverTruckId(null);
    setDraggedDeliveryId(null);
    setAssigningDelivery(null);
  };

  // Unload / Remove delivery from truck back to unassigned
  const unloadDelivery = (delivery: DeliveryRecord) => {
    const updated: DeliveryRecord = {
      ...delivery,
      assignedTruck: 'unassigned',
      status: DeliveryStatus.REGISTERED,
      history: [
        ...(delivery.history || []),
        {
          status: DeliveryStatus.REGISTERED,
          timestamp: new Date().toISOString(),
          location: delivery.originBranch || 'Depot',
          operator: 'Dispatcher',
          notes: 'Unloaded from truck back to Unassigned Freight Pool'
        }
      ]
    };

    onAddOrUpdateDelivery(updated);
  };

  // Toggle truck manual FULL status
  const toggleTruckFullStatus = (truckId: string) => {
    setFullTruckIds(prev => ({
      ...prev,
      [truckId]: !prev[truckId]
    }));
  };

  return (
    <div className="bg-slate-50 text-slate-900 rounded-2xl border border-slate-200/90 shadow-lg p-4 sm:p-6 select-none font-sans space-y-6">
      
      {/* Top Freight Board Header Bar (Light View Screen) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase font-mono">
              Freight board
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Drag a delivery onto a truck to load it or click a card to assign
          </p>
        </div>

        {/* Counter Summary Stats */}
        <div className="flex items-center space-x-6 bg-white border border-slate-200/90 px-4 py-2.5 rounded-xl font-mono shadow-xs">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TRUCKS</span>
            <span className="text-lg font-black text-blue-600">{activeTrucks.length}</span>
          </div>
          <div className="h-4 w-px bg-slate-200"></div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">UNASSIGNED</span>
            <span className="text-lg font-black text-amber-600">{unassignedDeliveries.length}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Registered Trucks, Right = Unassigned Deliveries */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: REGISTERED VEHICLES (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest font-mono flex items-center space-x-2">
              <TruckIcon className="h-4 w-4 text-blue-600" />
              <span>REGISTERED VEHICLES & FLEET CAPACITY</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              {activeTrucks.length} Active Units
            </span>
          </div>

          <div className="space-y-4 max-h-[820px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300">
            {activeTrucks.map((truck) => {
              const loadedDeliveries = deliveriesByTruck[truck.id] || [];
              const loadedWeight = loadedDeliveries.reduce((sum, d) => sum + parseDeliveryWeightLbs(d), 0);
              const maxCapacity = getTruckMaxCapacityLbs(truck);
              const fillPct = Math.min(100, Math.round((loadedWeight / maxCapacity) * 100));

              const isManualFull = fullTruckIds[truck.id];
              const isFull = isManualFull || fillPct >= 100;

              const isDragTarget = dragOverTruckId === truck.id;

              // Extract route/branch display name & driver
              const branchObj = branches.find(b => b.id === truck.branchId);
              const depotName = branchObj ? formatBranchDisplayName(branchObj) : formatBranchDisplayName(truck.branchId || 'Depot');
              const driverName = (truck.driver && truck.driver.toLowerCase() !== 'no driver' && truck.driver.toLowerCase() !== 'unassigned') 
                ? truck.driver 
                : 'No Driver Assigned';

              // Build route string (e.g. Hebbville → Bridgewater)
              const firstDest = loadedDeliveries.length > 0 ? (loadedDeliveries[0].deliveryAddress?.split(',')[0] || 'Destination') : 'Regional Route';
              const routeText = `${depotName} → ${firstDest}`;

              return (
                <div
                  key={truck.id}
                  onDragOver={(e) => handleDragOver(e, truck.id)}
                  onDragLeave={(e) => handleDragLeave(e, truck.id)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const deliveryId = e.dataTransfer.getData('text/plain') || draggedDeliveryId;
                    if (deliveryId) {
                      assignDeliveryToTruck(deliveryId, truck);
                    }
                  }}
                  className={`relative rounded-xl border p-4 transition-all duration-200 ${
                    isDragTarget 
                      ? 'border-emerald-500 bg-emerald-50/90 shadow-xl shadow-emerald-900/10 ring-2 ring-emerald-500/50 scale-[1.01]'
                      : isFull
                      ? 'border-amber-400 bg-amber-50/70 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs hover:shadow-sm'
                  }`}
                >
                  {/* Drag Target Overlay Message */}
                  {isDragTarget && (
                    <div className="absolute inset-0 bg-emerald-600/90 rounded-xl border-2 border-dashed border-white z-20 flex flex-col items-center justify-center pointer-events-none animate-pulse text-white">
                      <Package className="h-8 w-8 text-white mb-1" />
                      <p className="text-sm font-black font-mono uppercase">
                        DROP TO LOAD INTO {truck.name}
                      </p>
                      <p className="text-[11px] font-medium opacity-90">
                        Assigns ticket & updates status to LOADED
                      </p>
                    </div>
                  )}

                  {/* Top Graphic + Main Specs Row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    
                    {/* SVG Vector Truck Graphic */}
                    <div className="shrink-0">
                      <TruckGraphic fillPct={fillPct} isFull={isFull} truckId={truck.id} />
                    </div>

                    {/* Truck Specs & Driver info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 truncate">
                          <span className="font-mono font-black text-sm text-slate-900 truncate">
                            {truck.name}
                          </span>
                          <span className="text-slate-400 font-mono">·</span>
                          <span className="text-xs font-semibold text-slate-500 truncate">
                            {truck.type || truck.model || 'Commercial Carrier'}
                          </span>
                        </div>

                        {/* Status Badge (OPEN / FULL) */}
                        {isFull ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono tracking-wider bg-amber-500 text-slate-950 uppercase shadow-xs flex items-center space-x-1 shrink-0">
                            <Lock className="h-3 w-3" />
                            <span>FULL</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider bg-slate-100 text-slate-700 border border-slate-200 uppercase flex items-center space-x-1 shrink-0">
                            <Unlock className="h-3 w-3 text-emerald-600" />
                            <span>OPEN</span>
                          </span>
                        )}
                      </div>

                      {/* Driver & Route */}
                      <p className="text-xs text-slate-600 truncate">
                        <span className="font-bold text-slate-800">{driverName}</span>
                        <span className="text-slate-400 mx-1.5">•</span>
                        <span className="text-slate-500 font-mono text-[11px]">{routeText}</span>
                      </p>

                      {/* Weight progress capacity */}
                      <div className="flex items-center justify-between pt-1 font-mono text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-700">
                            {loadedWeight.toLocaleString()} / {maxCapacity.toLocaleString()} lbs
                          </span>
                          {truck.capacityVolumeM3 && truck.capacityVolumeM3 > 0 && (
                            <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded">
                              {truck.capacityVolumeM3} m³
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {isFull && (
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">
                              LOADED
                            </span>
                          )}
                          <span className={`font-black text-xs ${isFull ? 'text-amber-600' : 'text-slate-800'}`}>
                            {fillPct}%
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Card Bottom Actions Row */}
                  <div className="mt-3 border-t border-slate-100 pt-2.5 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => toggleTruckFullStatus(truck.id)}
                      className={`text-[10px] font-bold font-mono px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                        isManualFull
                          ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                      }`}
                      title={isManualFull ? "Reopen truck for additional deliveries" : "Mark truck full to lock capacity"}
                    >
                      {isManualFull ? 'Re-open Capacity' : 'Mark Truck Full'}
                    </button>

                    {/* Expand Loaded List Toggle */}
                    {loadedDeliveries.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setExpandedTruckId(expandedTruckId === truck.id ? null : truck.id)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 font-mono cursor-pointer"
                      >
                        <span>{expandedTruckId === truck.id ? 'Hide Manifest' : `View Cargo (${loadedDeliveries.length})`}</span>
                        {expandedTruckId === truck.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono italic">No freight loaded yet</span>
                    )}
                  </div>

                  {/* Expanded Cargo List for this Truck */}
                  {expandedTruckId === truck.id && loadedDeliveries.length > 0 && (
                    <div className="mt-3 border-t border-slate-200 pt-3 space-y-2 animate-fade-in bg-slate-50/80 p-3 rounded-lg">
                      <p className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">
                        Loaded Freight Manifest Items:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {loadedDeliveries.map(item => (
                          <div 
                            key={item.id} 
                            className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between text-xs shadow-2xs"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-mono font-bold text-blue-600 block truncate">{item.id}</span>
                              <span className="text-slate-800 font-medium truncate block">{item.customerName}</span>
                              <span className="text-[10px] text-slate-500 block truncate">{item.deliveryAddress}</span>
                            </div>
                            <div className="flex flex-col items-end shrink-0 space-y-1">
                              <span className="font-mono text-[11px] font-bold text-slate-700">
                                {parseDeliveryWeightLbs(item).toLocaleString()} lbs
                              </span>
                              <button
                                type="button"
                                onClick={() => unloadDelivery(item)}
                                className="text-[9px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded border border-red-200 cursor-pointer transition-colors"
                                title="Unload item back to unassigned freight pool"
                              >
                                Unload
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: UNASSIGNED DELIVERIES (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Header & Tenant Stores Filter Chips */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest font-mono flex items-center space-x-2">
                <Package className="h-4 w-4 text-amber-500" />
                <span>UNASSIGNED DELIVERIES ({unassignedDeliveries.length})</span>
              </h3>
            </div>

            {/* Tenant Store Filter Bar */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1.5 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedStoreFilter('ALL')}
                className={`px-3 py-1 rounded-full text-[10px] font-black font-mono uppercase transition-all cursor-pointer whitespace-nowrap ${
                  selectedStoreFilter === 'ALL'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                ALL STORES
              </button>
              {tenantStores.map(store => (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => setSelectedStoreFilter(store.name)}
                  className={`px-3 py-1 rounded-full text-[10px] font-black font-mono uppercase transition-all cursor-pointer whitespace-nowrap ${
                    selectedStoreFilter.toUpperCase() === store.name.toUpperCase()
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {store.name}
                </button>
              ))}
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket, customer or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 pl-9 pr-3 py-1.5 text-xs rounded-xl font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Unassigned Deliveries List Container */}
          <div className="space-y-5 max-h-[720px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300">
            
            {unassignedDeliveries.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500 space-y-2 shadow-2xs">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-mono font-bold text-slate-800">All Freight Dispatched!</p>
                <p className="text-[11px] text-slate-500">There are no unassigned delivery tickets for the selected store.</p>
              </div>
            ) : (
              <>
                {/* ⭐ AM DELIVERIES GROUP */}
                {amDeliveries.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center space-x-1.5 text-[11px] font-black font-mono text-amber-600 uppercase tracking-wider">
                      <span>★</span>
                      <span>AM DELIVERIES ({amDeliveries.length})</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {amDeliveries.map((delivery) => (
                        <UnassignedDeliveryCard
                          key={delivery.id}
                          delivery={delivery}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onAssignClick={() => setAssigningDelivery(delivery)}
                          isBeingDragged={draggedDeliveryId === delivery.id}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 🌙 PM DELIVERIES GROUP */}
                {pmDeliveries.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-center space-x-1.5 text-[11px] font-black font-mono text-blue-600 uppercase tracking-wider">
                      <span>☪</span>
                      <span>PM DELIVERIES ({pmDeliveries.length})</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {pmDeliveries.map((delivery) => (
                        <UnassignedDeliveryCard
                          key={delivery.id}
                          delivery={delivery}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onAssignClick={() => setAssigningDelivery(delivery)}
                          isBeingDragged={draggedDeliveryId === delivery.id}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

          </div>

        </div>

      </div>

      {/* MOBILE / TOUCH CLICK ASSIGN MODAL */}
      {assigningDelivery && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[200] flex items-center justify-center p-4 animate-fade-in select-text">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-mono font-black text-slate-900 text-base">Assign Freight to Vehicle</h4>
                <p className="text-xs text-slate-500">Select a truck to load ticket {assigningDelivery.id}</p>
              </div>
              <button
                onClick={() => setAssigningDelivery(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between font-mono">
                <span className="font-bold text-blue-600">{assigningDelivery.id}</span>
                <span className="text-amber-600 font-bold">{parseDeliveryWeightLbs(assigningDelivery).toLocaleString()} lbs</span>
              </div>
              <p className="font-semibold text-slate-800">{assigningDelivery.customerName}</p>
              <p className="text-slate-500 text-[11px]">{assigningDelivery.deliveryAddress}</p>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <p className="text-[10px] font-mono font-bold text-slate-500 uppercase">Available Vehicles:</p>
              {activeTrucks.map(truck => {
                const loadedDeliveries = deliveriesByTruck[truck.id] || [];
                const loadedWeight = loadedDeliveries.reduce((sum, d) => sum + parseDeliveryWeightLbs(d), 0);
                const maxCapacity = getTruckMaxCapacityLbs(truck);

                return (
                  <button
                    key={truck.id}
                    type="button"
                    onClick={() => assignDeliveryToTruck(assigningDelivery.id, truck)}
                    className="w-full text-left bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 p-3 rounded-xl flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <div>
                      <span className="font-mono font-bold text-slate-900 group-hover:text-blue-600 block text-xs">
                        {truck.name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {truck.driver || 'No Driver'} · {formatBranchDisplayName(truck.branchId || 'Depot')}
                      </span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        {loadedWeight.toLocaleString()} / {maxCapacity.toLocaleString()} lbs
                      </span>
                      <span className="text-[9px] text-blue-600 font-bold">Load Freight →</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setAssigningDelivery(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Single Unassigned Delivery Card Component
function UnassignedDeliveryCard({
  delivery,
  onDragStart,
  onDragEnd,
  onAssignClick,
  isBeingDragged
}: {
  delivery: DeliveryRecord;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onAssignClick: () => void;
  isBeingDragged: boolean;
}) {
  const weightLbs = parseDeliveryWeightLbs(delivery);
  const isUrgent = delivery.deliveryCategory === 'Pro' || delivery.destinationNotes?.toLowerCase().includes('urgent') || delivery.destinationNotes?.toLowerCase().includes('priority');
  const slot = delivery.scheduledSlot === 'PM' ? 'PM' : 'AM';

  // Origin / dest summary
  const customerSummary = delivery.customerName || 'Customer';
  const addressCity = delivery.deliveryAddress ? delivery.deliveryAddress.split(',')[0] : 'Regional Site';
  const originDepot = formatBranchDisplayName(delivery.originBranch || 'Depot');

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, delivery.id)}
      onDragEnd={onDragEnd}
      onClick={onAssignClick}
      className={`relative bg-white border rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 cursor-grab active:cursor-grabbing hover:scale-[1.02] shadow-2xs ${
        isBeingDragged
          ? 'opacity-40 border-amber-500 bg-amber-50'
          : isUrgent
          ? 'border-emerald-400 ring-1 ring-emerald-400/40 hover:border-emerald-500'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
      }`}
    >
      {/* Top Card Row */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-xs text-blue-600 tracking-wide">
            {delivery.id}
          </span>
          {isUrgent ? (
            <span className="px-2 py-0.5 rounded text-[9px] font-black font-mono bg-rose-100 text-rose-700 border border-rose-200 uppercase tracking-wider">
              URGENT
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-mono">
              #{delivery.epicorSalesOrder || delivery.invoiceNumber || 'ORDER'}
            </span>
          )}
        </div>

        <div className="text-xs font-semibold text-slate-800 line-clamp-1">
          {addressCity} <span className="text-slate-400 font-normal">· from {originDepot}</span>
        </div>

        <div className="text-[11px] text-slate-500 truncate">
          {customerSummary}
        </div>
      </div>

      {/* Bottom Card Specs */}
      <div className="mt-3 border-t border-slate-100 pt-2 flex items-center justify-between font-mono">
        <span className="text-xs font-extrabold text-emerald-600">
          {weightLbs.toLocaleString()} lbs
        </span>
        <span className="text-[10px] font-bold text-slate-500 flex items-center space-x-1">
          <span>{slot === 'AM' ? '★ AM' : '☪ PM'}</span>
        </span>
      </div>
    </div>
  );
}
