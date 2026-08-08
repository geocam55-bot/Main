import React, { useState, useMemo } from 'react';
import type { DeliveryRecord, Truck, Branch, User as AppUser } from '../types';
import { DeliveryStatus } from '../types';
import { 
  Truck as TruckIcon, Package, Search, Filter, CheckCircle2, 
  AlertTriangle, Lock, Unlock, ArrowRight, RotateCcw, Plus, X, 
  ChevronDown, ChevronUp, Layers, Sparkles, MapPin, User, Clock, ShieldCheck, Check,
  Calendar, Sun, Moon, ChevronLeft, ChevronRight, BarChart3, Zap, Store, Maximize2, Eye, Camera, Info, ExternalLink
} from 'lucide-react';
import { isTruckAssignedToBranch } from './Dashboard';
import { rolloverUncompletedDeliveries, DEFAULT_STORE_CONFIG } from '../lib/schedulingUtils';
import { getTruckImage } from '../lib/truckImages';

interface DragDropFreightBoardProps {
  deliveries: DeliveryRecord[];
  trucks: Truck[];
  onAddOrUpdateDelivery: (record: DeliveryRecord) => void;
  branches?: Branch[];
  users?: AppUser[];
  onCloseModal?: () => void;
  manualFullTrucks?: Record<string, boolean>;
  onUpdateManualFullTrucks?: (updated: Record<string, boolean>) => void;
  isViewOnly?: boolean;
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
  if (!truck) return 8000;

  // 1. Direct capacityWeightKg field from truck table
  if (truck.capacityWeightKg && truck.capacityWeightKg > 0) {
    if (truck.capacityWeightKg >= 2000) {
      return Math.round(truck.capacityWeightKg);
    }
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

  // 3. Check custom properties if attached
  if ((truck as any).capacityLbs && Number((truck as any).capacityLbs) > 0) {
    return Math.round(Number((truck as any).capacityLbs));
  }
  if ((truck as any).truckCapacity && Number((truck as any).truckCapacity) > 0) {
    const cap = Number((truck as any).truckCapacity);
    return cap < 2000 ? Math.round(cap * 2.20462) : Math.round(cap);
  }

  // 4. Model/type based fallback if table entry is unset
  const nameLower = ((truck.name || '') + ' ' + (truck.type || '') + ' ' + (truck.model || '')).toLowerCase();
  if (nameLower.includes('boom') || nameLower.includes('crane') || nameLower.includes('western star')) return 12000;
  if (nameLower.includes('flatdeck') || nameLower.includes('flatbed') || nameLower.includes('heavy') || nameLower.includes('curtain') || nameLower.includes('hauler') || nameLower.includes('tandem')) return 10000;
  if (nameLower.includes('f550') || nameLower.includes('f-550') || nameLower.includes('window') || nameLower.includes('glass')) return 6000;
  if (nameLower.includes('f150') || nameLower.includes('f-150') || nameLower.includes('ranger') || nameLower.includes('pickup')) return 3500;
  if (nameLower.includes('reefer') || nameLower.includes('dry van') || nameLower.includes('box')) return 8000;
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

// Helper to resolve truck current GPS location & coordinates display
export function getTruckGpsInfo(truck: Truck, branches: Branch[] = []) {
  const branchObj = branches.find(b => b.id === truck.branchId);
  const depotName = branchObj ? formatBranchDisplayName(branchObj, branches) : formatBranchDisplayName(truck.branchId || 'Depot', branches);

  const idOrName = ((truck.id || '') + ' ' + (truck.name || '') + ' ' + (truck.type || '') + ' ' + (truck.homeDepot || '')).toLowerCase();
  const isAlmon = idOrName.includes('2401') || idOrName.includes('almon');
  const is1903 = idOrName.includes('1903');
  const isElmsdale = !isAlmon && (is1903 || idOrName.includes('elmsdale') || idOrName.includes('03485'));
  const isWindmill = idOrName.includes('2101') || idOrName.includes('windmill');
  const isChainMtn = idOrName.includes('chain') || idOrName.includes('mountain') || idOrName.includes('2412') || idOrName.includes('2408') || idOrName.includes('2404') || idOrName.includes('1701') || idOrName.includes('1804') || idOrName.includes('1902');
  const isPei = idOrName.includes('pei') || idOrName.includes('charlottetown') || idOrName.includes('01075');
  const isTantallon = idOrName.includes('tantallon');

  let lat = truck.gpsLat ?? truck.lat;
  let lng = truck.gpsLng ?? truck.lng;

  if (isAlmon) {
    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng) || lat === 44.9792 || lat === 44.6536) {
      lat = 44.6855;
      lng = -63.5825;
    }
  } else if (is1903 || isElmsdale) {
    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng) || lat === 44.6855 || lat === 44.6536) {
      lat = 44.9792;
      lng = -63.5042;
    }
  } else if (isWindmill) {
    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng) || lat === 44.9792) {
      lat = 44.6855;
      lng = -63.5825;
    }
  } else if (isChainMtn) {
    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng) || lat === 44.9792 || lat === 44.6855) {
      lat = 44.6295;
      lng = -63.6651;
    }
  } else if (isPei) {
    lat = 46.2382;
    lng = -63.1311;
  } else if (isTantallon) {
    lat = 44.7042;
    lng = -63.8581;
  } else if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
    if (branchObj?.latitude && branchObj?.longitude) {
      lat = branchObj.latitude;
      lng = branchObj.longitude;
    } else {
      lat = 44.6855;
      lng = -63.5825;
    }
  }

  const latStr = `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(4)}°${lng < 0 ? 'W' : 'E'}`;
  const coordinatesText = `${latStr}, ${lngStr}`;

  let locationName = '';

  if (truck.userField1 && truck.userField1.toLowerCase().includes('loc:')) {
    locationName = truck.userField1.replace(/loc:/i, '').trim();
  } else if (is1903) {
    locationName = 'XFGW+38 Elmsdale, NS (RONA Elmsdale #03485)';
  } else if (isElmsdale) {
    locationName = 'RONA Elmsdale Store Yard';
  } else if (isAlmon) {
    locationName = '500 Windmill Road Terminal Depot (Dartmouth)';
  } else if (isWindmill) {
    locationName = '500 Windmill Rd Depot';
  } else if (isChainMtn) {
    locationName = 'Chain Lake / Mountain Depot Yard';
  } else if (isPei) {
    locationName = 'Charlottetown Store Yard';
  } else if (isTantallon) {
    locationName = 'Tantallon Store Yard';
  } else if (depotName && depotName !== 'Depot') {
    locationName = `${depotName} Yard`;
  } else {
    locationName = 'Terminal Yard';
  }

  return {
    lat,
    lng,
    coordinatesText,
    locationName,
    speedText: truck.gpsSpeed && truck.gpsSpeed > 0 ? `${truck.gpsSpeed} km/h` : null
  };
}

// Truck Display Graphic Component showing fleet vehicle image/preset with live cargo fill level
function TruckGraphic({ 
  fillPct, 
  isFull, 
  truckId, 
  truck, 
  onPreviewImage 
}: { 
  fillPct: number; 
  isFull: boolean; 
  truckId: string; 
  truck?: Truck; 
  onPreviewImage?: (truck: Truck) => void;
}) {
  const patternId = `hazardPattern_${truckId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  if (truck) {
    const imageSrc = getTruckImage(truck);
    return (
      <div 
        onClick={() => onPreviewImage?.(truck)}
        className="relative group rounded-xl overflow-hidden bg-white border border-slate-300 w-full sm:w-52 aspect-[16/9] flex flex-col justify-between p-1 shadow-sm hover:border-blue-500 hover:shadow-md transition-all cursor-pointer select-none"
        title="Click to view high-res truck vehicle photo & specs"
      >
        {/* Truck Photo / Preset Vector SVG */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden p-1 bg-white">
          <img 
            src={imageSrc} 
            alt={truck.name || 'Truck'} 
            className="w-full h-full object-contain filter drop-shadow-sm scale-110 transition-transform duration-300 group-hover:scale-115"
          />

          {/* Top Floating Equipment Category Tag */}
          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-700 text-[9px] font-mono font-bold text-slate-100 flex items-center gap-1 shadow-xs">
            <TruckIcon className="w-2.5 h-2.5 text-emerald-400" />
            <span className="truncate max-w-[85px]">{truck.type || 'Fleet Vehicle'}</span>
          </div>

          {/* Hover Overlay Action */}
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-[11px] font-bold backdrop-blur-[1px]">
            <Maximize2 className="w-3.5 h-3.5 text-blue-300" />
            <span>View Image</span>
          </div>
        </div>

        {/* Integrated Bottom Cargo Fill Bar */}
        <div className="w-full bg-slate-900/90 rounded-md p-1 border border-slate-800 flex items-center gap-1.5 shrink-0">
          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden relative">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                isFull 
                  ? 'bg-amber-500 bg-[linear-gradient(45deg,rgba(0,0,0,0.15)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.15)_50%,rgba(0,0,0,0.15)_75%,transparent_75%,transparent)] bg-[length:12px_12px]' 
                  : fillPct > 80 
                  ? 'bg-amber-500' 
                  : fillPct > 0 
                  ? 'bg-emerald-500' 
                  : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(isFull ? 100 : 5, fillPct))}%` }}
            />
          </div>
          <span className={`text-[9px] font-mono font-black shrink-0 ${isFull ? 'text-amber-400' : 'text-slate-300'}`}>
            {isFull ? '100% FULL' : `${fillPct}%`}
          </span>
        </div>
      </div>
    );
  }

  // Fallback Vector SVG Truck Graphic
  const innerY = 10;
  const innerH = 38;
  const fillH = Math.max(0, Math.round((innerH * fillPct) / 100));
  const fillY = innerY + (innerH - fillH);

  return (
    <div className="relative w-full max-w-[220px] py-1 select-none">
      <svg viewBox="0 0 210 68" className="w-full h-auto filter drop-shadow-xs overflow-visible">
        <defs>
          <pattern id={patternId} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="16" fill="#f59e0b" />
            <rect x="8" width="8" height="16" fill="#b45309" />
          </pattern>
        </defs>

        <rect x="8" y="14" width="38" height="34" rx="6" fill="#334155" stroke="#1e293b" strokeWidth="1.5" />
        <rect x="22" y="18" width="18" height="15" rx="3" fill="#38bdf8" />
        <path d="M 22 18 L 34 18 C 37 18, 39 20, 39 23 L 39 31 C 39 33, 37 33, 34 33 L 22 33 Z" fill="#7dd3fc" opacity="0.8" />

        <rect x="52" y="8" width="146" height="42" rx="7" fill="#1e293b" stroke="#475569" strokeWidth="2.5" />

        {isFull ? (
          <rect x="55" y="11" width="140" height="36" rx="5" fill={`url(#${patternId})`} />
        ) : fillPct > 0 ? (
          <rect x="55" y={fillY + 1} width="140" height={Math.max(3, fillH - 2)} rx={fillPct >= 90 ? 5 : 2} fill="#f59e0b" />
        ) : (
          <rect x="55" y={innerY + innerH - 4} width="140" height="4" rx="2" fill="#06b6d4" />
        )}

        <circle cx="26" cy="52" r="8" fill="#0f172a" stroke="#475569" strokeWidth="2.5" />
        <circle cx="26" cy="52" r="3" fill="#cbd5e1" />
        <circle cx="82" cy="52" r="8" fill="#0f172a" stroke="#475569" strokeWidth="2.5" />
        <circle cx="82" cy="52" r="3" fill="#cbd5e1" />
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
  users = [],
  manualFullTrucks,
  onUpdateManualFullTrucks,
  isViewOnly = false
}: DragDropFreightBoardProps) {
  // Manual FULL trucks from parent or local fallback
  const [localFullTruckIds, setLocalFullTruckIds] = useState<Record<string, boolean>>({});
  const fullTruckIds = manualFullTrucks !== undefined ? manualFullTrucks : localFullTruckIds;
  
  // Drag over target truck ID
  const [dragOverTruckId, setDragOverTruckId] = useState<string | null>(null);
  
  // Currently dragged delivery ID
  const [draggedDeliveryId, setDraggedDeliveryId] = useState<string | null>(null);

  // Selected store / branch filter (applies to BOTH trucks and deliveries)
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('ALL');

  // Date selection state for loading multiple days
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [showAllDates, setShowAllDates] = useState<boolean>(false);

  // Shift selection state (ALL | AM | PM)
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<'ALL' | 'AM' | 'PM'>('ALL');

  // Drag over state for unassigned shift drop targets
  const [dragOverUnassignedSlot, setDragOverUnassignedSlot] = useState<'AM' | 'PM' | 'GENERAL' | null>(null);

  // Search filter for deliveries
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mobile/Click assign modal state
  const [assigningDelivery, setAssigningDelivery] = useState<DeliveryRecord | null>(null);

  // High-res Truck Image & Specs Lightbox Modal state
  const [previewTruck, setPreviewTruck] = useState<Truck | null>(null);

  // Assign & Picker Prompt Modal state
  const [assignPrompt, setAssignPrompt] = useState<{
    delivery: DeliveryRecord;
    truck: Truck;
    depot: string;
    date: string;
    slot: 'AM' | 'PM';
    picker: string;
  } | null>(null);

  // Override to show ALL unassigned pool across all dates & stores
  const [showAllUnassigned, setShowAllUnassigned] = useState<boolean>(false);

  // Expanded truck details ID
  const [expandedTruckId, setExpandedTruckId] = useState<string | null>(null);

  // Date navigation handlers
  const handlePrevDay = () => {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() - 1);
    setSelectedDate(current.toISOString().split('T')[0]);
    setShowAllDates(false);
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + 1);
    setSelectedDate(current.toISOString().split('T')[0]);
    setShowAllDates(false);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setShowAllDates(false);
  };

  // View mode state: 'day' | 'week'
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  // Week view anchor date
  const [weekAnchorDate, setWeekAnchorDate] = useState<Date>(() => new Date());

  // Rollover notification notice
  const [rolloverNotice, setRolloverNotice] = useState<string | null>(null);

  // Compute 7 days of the week (Monday start)
  const getWeekDays = (refDate: Date) => {
    const start = new Date(refDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const next = new Date(start);
      next.setDate(start.getDate() + i);
      days.push(next);
    }
    return days;
  };

  const currentWeekDays = useMemo(() => getWeekDays(weekAnchorDate), [weekAnchorDate]);

  const handlePrevWeek = () => {
    const next = new Date(weekAnchorDate);
    next.setDate(next.getDate() - 7);
    setWeekAnchorDate(next);
  };

  const handleNextWeek = () => {
    const next = new Date(weekAnchorDate);
    next.setDate(next.getDate() + 7);
    setWeekAnchorDate(next);
  };

  const handleThisWeek = () => {
    setWeekAnchorDate(new Date());
  };

  // Trigger manual auto-rollover of uncompleted past deliveries to first available slot in next day
  const handleTriggerRollover = () => {
    const { updatedDeliveries, movedCount } = rolloverUncompletedDeliveries(deliveries, branches || []);
    if (movedCount > 0) {
      updatedDeliveries.forEach(d => {
        onAddOrUpdateDelivery(d);
      });
      setRolloverNotice(`⚡ Moved ${movedCount} uncompleted delivery order(s) to the first available slot in the next day.`);
    } else {
      setRolloverNotice('✓ All uncompleted deliveries are already scheduled in valid upcoming slots.');
    }
    setTimeout(() => setRolloverNotice(null), 6000);
  };

  // Formatted display string for selected date
  const formattedDateLabel = useMemo(() => {
    if (showAllDates) return 'All Delivery Dates';
    if (!selectedDate) return 'All Dates';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }, [selectedDate, showAllDates]);

  // Extract unique tenant store list from tenant branches & deliveries
  const tenantStores = useMemo(() => {
    // 1. If tenant branches exist, use them as the primary source of truth for Stores and DCs
    if (branches && branches.length > 0) {
      const storeMap = new Map<string, { id: string; name: string }>();
      branches.forEach(b => {
        const displayName = formatBranchDisplayName(b, branches);
        const key = displayName.toUpperCase();
        if (!storeMap.has(key)) {
          storeMap.set(key, { id: b.id, name: displayName });
        }
      });
      return Array.from(storeMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }

    // 2. Fallback only if branches list is not loaded yet or empty
    const storeMap = new Map<string, { id: string; name: string }>();
    deliveries.forEach(d => {
      if (d.originBranch) {
        const displayName = formatBranchDisplayName(d.originBranch, branches);
        const key = displayName.toUpperCase();
        if (!storeMap.has(key)) {
          storeMap.set(key, { id: d.originBranch, name: displayName });
        }
      }
    });

    return Array.from(storeMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [branches, deliveries]);

  // Filter trucks by active status and selected store filter (applies to BOTH trucks and deliveries)
  const activeTrucks = useMemo(() => {
    let list = trucks.filter(t => t.isActive !== false);

    if (selectedStoreFilter !== 'ALL') {
      const storeObj = (branches || []).find(b =>
        b.id === selectedStoreFilter ||
        b.name === selectedStoreFilter ||
        b.id.toUpperCase() === selectedStoreFilter.toUpperCase() ||
        b.name.toUpperCase() === selectedStoreFilter.toUpperCase()
      ) || { id: selectedStoreFilter, name: selectedStoreFilter };

      list = list.filter(t => isTruckAssignedToBranch(t, storeObj));
    }

    return list;
  }, [trucks, selectedStoreFilter, branches]);

  // Total System Unassigned Orders across all dates & stores (excluding DELIVERED / RETURNED)
  const totalSystemUnassigned = useMemo(() => {
    return deliveries.filter(d => {
      const trk = (d.assignedTruck || '').trim().toLowerCase();
      const isUnassigned = !trk || trk === 'unassigned' || trk === 'no truck' || trk === 'none';
      return isUnassigned && d.status !== DeliveryStatus.DELIVERED && d.status !== DeliveryStatus.RETURNED;
    });
  }, [deliveries]);

  // Unassigned deliveries filtered by Store, Date, Shift, and Search query (with Show All override)
  const unassignedDeliveries = useMemo(() => {
    return deliveries.filter(d => {
      const trk = (d.assignedTruck || '').trim().toLowerCase();
      const isUnassigned = !trk || trk === 'unassigned' || trk === 'no truck' || trk === 'none';
      if (!isUnassigned) return false;

      // Filter out completed delivered/returned
      if (d.status === DeliveryStatus.DELIVERED || d.status === DeliveryStatus.RETURNED) return false;

      // Search query filter (always active if typed)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = d.id.toLowerCase().includes(q);
        const matchesCustomer = (d.customerName || '').toLowerCase().includes(q);
        const matchesInv = (d.invoiceNumber || '').toLowerCase().includes(q);
        const matchesAddress = (d.deliveryAddress || '').toLowerCase().includes(q);
        if (!matchesId && !matchesCustomer && !matchesInv && !matchesAddress) return false;
      }

      // If user toggled "Show All Unassigned Pool", show all unassigned items regardless of date/store
      if (showAllUnassigned) return true;

      // 1. Store filter (applies to BOTH trucks and deliveries)
      if (selectedStoreFilter !== 'ALL') {
        const targetStoreUpper = selectedStoreFilter.toUpperCase();
        const storeObj = branches.find(b => b.id === selectedStoreFilter || b.name === selectedStoreFilter);
        const targetId = storeObj ? storeObj.id : selectedStoreFilter;
        const targetNameUpper = storeObj ? storeObj.name.toUpperCase() : targetStoreUpper;

        const originBranchObj = branches.find(b => b.id === d.originBranch || b.name === d.originBranch);
        const originId = originBranchObj ? originBranchObj.id : d.originBranch;
        const originNameUpper = originBranchObj ? originBranchObj.name.toUpperCase() : formatBranchDisplayName(d.originBranch || '', branches).toUpperCase();
        const addrUpper = (d.deliveryAddress || '').toUpperCase();

        const matchesBranchId = originId === targetId;
        const matchesOriginName = originNameUpper.includes(targetNameUpper) || targetNameUpper.includes(originNameUpper) || originNameUpper.includes(targetStoreUpper);
        const matchesAddress = addrUpper.includes(targetNameUpper) || addrUpper.includes(targetStoreUpper);

        if (!matchesBranchId && !matchesOriginName && !matchesAddress) return false;
      }

      // 2. Date filter (unless showAllDates is toggled)
      if (!showAllDates && selectedDate) {
        const dDate = d.scheduledDate || (d.registeredAt ? d.registeredAt.split('T')[0] : '');
        // Keep delivery if date matches selectedDate OR if date is empty
        if (dDate && dDate !== selectedDate) {
          return false;
        }
      }

      // 3. Shift filter (ALL / AM / PM)
      if (selectedShiftFilter !== 'ALL') {
        const slot = (d.scheduledSlot || 'AM').toUpperCase();
        if (selectedShiftFilter === 'AM' && slot !== 'AM' && slot !== 'MORNING') return false;
        if (selectedShiftFilter === 'PM' && slot !== 'PM' && slot !== 'AFTERNOON') return false;
      }

      return true;
    });
  }, [deliveries, selectedStoreFilter, selectedDate, showAllDates, selectedShiftFilter, searchQuery, branches, showAllUnassigned]);

  // Deliveries grouped by truck
  const deliveriesByTruck = useMemo(() => {
    const map: Record<string, DeliveryRecord[]> = {};
    activeTrucks.forEach(t => {
      map[t.id] = [];
    });

    deliveries.forEach(d => {
      const trk = (d.assignedTruck || '').trim().toLowerCase();
      if (!trk || trk === 'unassigned' || trk === 'no truck' || trk === 'none') return;
      if (d.status === DeliveryStatus.DELIVERED || d.status === DeliveryStatus.RETURNED) return;

      // 1. Date filter (unless showAllDates is toggled)
      if (!showAllDates && selectedDate) {
        const dDate = d.scheduledDate || (d.registeredAt ? d.registeredAt.split('T')[0] : '');
        if (dDate && dDate !== selectedDate) {
          return;
        }
      }

      // 2. Shift filter (ALL / AM / PM)
      if (selectedShiftFilter !== 'ALL') {
        const slot = (d.scheduledSlot || 'AM').toUpperCase();
        if (selectedShiftFilter === 'AM' && slot !== 'AM' && slot !== 'MORNING') return;
        if (selectedShiftFilter === 'PM' && slot !== 'PM' && slot !== 'AFTERNOON') return;
      }

      // Match by truck ID or truck Name
      const matchedTruck = activeTrucks.find(t => 
        t.id.toLowerCase().trim() === trk ||
        t.name.toLowerCase().trim() === trk ||
        (t.truckNumber && t.truckNumber.toLowerCase().trim() === trk)
      );

      if (matchedTruck) {
        map[matchedTruck.id] = map[matchedTruck.id] || [];
        map[matchedTruck.id].push(d);
      }
    });

    return map;
  }, [deliveries, activeTrucks, selectedDate, showAllDates, selectedShiftFilter]);

  // Group unassigned deliveries by Shift (AM / PM)
  const amDeliveries = useMemo(() => {
    return unassignedDeliveries.filter(d => {
      const slotRaw = (d.scheduledSlot || (d as any).scheduled_slot || (d as any).shift || '').toString().toUpperCase();
      if (slotRaw === 'PM' || slotRaw.includes('AFTERNOON')) return false;
      return true;
    });
  }, [unassignedDeliveries]);

  const pmDeliveries = useMemo(() => {
    return unassignedDeliveries.filter(d => {
      const slotRaw = (d.scheduledSlot || (d as any).scheduled_slot || (d as any).shift || '').toString().toUpperCase();
      return slotRaw === 'PM' || slotRaw.includes('AFTERNOON');
    });
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
    setDragOverUnassignedSlot(null);
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

  // Move or unload a delivery to the Unassigned Freight Pool (optionally targeting AM or PM)
  const handleUnassignDrop = (deliveryId: string, targetSlot?: 'AM' | 'PM') => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;

    const slotRaw = (
      delivery.scheduledSlot || 
      (delivery as any).scheduled_slot || 
      (delivery as any).shift || 
      ''
    ).toString().toUpperCase();

    let finalSlot: 'AM' | 'PM' = 'AM';
    if (targetSlot) {
      finalSlot = targetSlot;
    } else if (slotRaw.includes('PM') || slotRaw.includes('AFTERNOON') || slotRaw === 'PM') {
      finalSlot = 'PM';
    } else if (selectedShiftFilter === 'PM') {
      finalSlot = 'PM';
    } else {
      finalSlot = 'AM';
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const finalDate = (selectedDate && selectedDate >= todayStr) 
      ? selectedDate 
      : ((delivery.scheduledDate && delivery.scheduledDate.split('T')[0] >= todayStr) ? delivery.scheduledDate : todayStr);

    const updated: DeliveryRecord = {
      ...delivery,
      assignedTruck: 'unassigned',
      assignedDriver: '',
      status: DeliveryStatus.REGISTERED,
      scheduledDate: finalDate,
      scheduledSlot: finalSlot,
      history: [
        ...(delivery.history || []),
        {
          status: DeliveryStatus.REGISTERED,
          timestamp: new Date().toISOString(),
          location: delivery.originBranch || 'Depot',
          operator: 'Dispatcher',
          notes: `Moved to Unassigned Freight Pool (${finalSlot} Shift) for ${selectedDate || 'Dispatch'}`
        }
      ]
    };

    onAddOrUpdateDelivery(updated);
    setDraggedDeliveryId(null);
    setDragOverTruckId(null);
    setDragOverUnassignedSlot(null);
  };

  // Toggle delivery shift slot between AM and PM
  const handleToggleShiftSlot = (delivery: DeliveryRecord) => {
    const currentSlot = (
      delivery.scheduledSlot || 
      (delivery as any).scheduled_slot || 
      (delivery as any).shift || 
      ''
    ).toString().toUpperCase();

    const newSlot: 'AM' | 'PM' = (currentSlot === 'PM' || currentSlot === 'AFTERNOON') ? 'AM' : 'PM';
    
    const todayStr = new Date().toISOString().split('T')[0];
    const finalDate = (selectedDate && selectedDate >= todayStr) 
      ? selectedDate 
      : ((delivery.scheduledDate && delivery.scheduledDate.split('T')[0] >= todayStr) ? delivery.scheduledDate : todayStr);

    const updated: DeliveryRecord = {
      ...delivery,
      scheduledDate: finalDate,
      scheduledSlot: newSlot,
      history: [
        ...(delivery.history || []),
        {
          status: delivery.status || DeliveryStatus.REGISTERED,
          timestamp: new Date().toISOString(),
          location: delivery.originBranch || 'Depot',
          operator: 'Dispatcher',
          notes: `Shift slot changed to ${newSlot}`
        }
      ]
    };

    onAddOrUpdateDelivery(updated);
  };

  // Automatic Drag & Drop Assignment directly to Truck
  const handleAutoDropAssign = (deliveryId: string, truck: Truck, targetDate?: string) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;

    // Preserve delivery's explicit shift slot if set (PM vs AM), otherwise check shift filter
    const slotRaw = (
      delivery.scheduledSlot || 
      (delivery as any).scheduled_slot || 
      (delivery as any).shift || 
      ''
    ).toString().toUpperCase();

    let finalSlot: 'AM' | 'PM' = 'AM';
    if (slotRaw.includes('PM') || slotRaw.includes('AFTERNOON') || slotRaw === 'PM') {
      finalSlot = 'PM';
    } else if (slotRaw.includes('AM') || slotRaw.includes('MORNING') || slotRaw === 'AM') {
      finalSlot = 'AM';
    } else if (selectedShiftFilter === 'PM') {
      finalSlot = 'PM';
    } else {
      finalSlot = 'AM';
    }

    const truckBranchObj = branches.find(b => b.id === truck.branchId || b.name === truck.branchId);
    const finalDepot = truckBranchObj 
      ? truckBranchObj.name 
      : (formatBranchDisplayName(truck.branchId || '', branches) || delivery.originBranch || 'Windmill DC');

    const todayStr = new Date().toISOString().split('T')[0];
    let finalDate = targetDate || selectedDate || delivery.scheduledDate || todayStr;
    if (finalDate < todayStr) finalDate = todayStr;

    const updatedDriver = (truck.driver && truck.driver.toLowerCase() !== 'no driver' && truck.driver.toLowerCase() !== 'unassigned') 
      ? truck.driver 
      : (delivery.assignedDriver || 'Unassigned');

    const updated: DeliveryRecord = {
      ...delivery,
      originBranch: finalDepot,
      assignedTruck: truck.name || truck.id,
      assignedDriver: updatedDriver,
      scheduledDate: finalDate,
      scheduledSlot: finalSlot,
      status: DeliveryStatus.PICKED_AND_LOADED,
      history: [
        ...(delivery.history || []),
        {
          status: DeliveryStatus.PICKED_AND_LOADED,
          timestamp: new Date().toISOString(),
          location: finalDepot,
          operator: 'Dispatcher',
          notes: `Assigned & loaded onto ${truck.name} for ${finalDate} (${finalSlot}) at ${finalDepot}.`
        }
      ]
    };

    onAddOrUpdateDelivery(updated);
    setDraggedDeliveryId(null);
    setDragOverTruckId(null);
  };

  // Step 1: Initiate assignment flow -> Prompts for Depot, Truck, Schedule, & Picker
  const initiateAssignment = (deliveryId: string, truck: Truck) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;

    // Derive default depot from truck branch or delivery origin
    const truckBranchObj = branches.find(b => b.id === truck.branchId || b.name === truck.branchId);
    const defaultDepot = truckBranchObj 
      ? truckBranchObj.name 
      : (formatBranchDisplayName(truck.branchId || '', branches) || delivery.originBranch || 'Windmill DC');

    const todayStr = new Date().toISOString().split('T')[0];
    let defaultDate = selectedDate || delivery.scheduledDate || todayStr;
    if (defaultDate < todayStr) defaultDate = todayStr;
    
    const currentSlot = (delivery.scheduledSlot as string)?.toUpperCase();
    let defaultSlot: 'AM' | 'PM' = 'AM';
    if (currentSlot === 'PM' || currentSlot === 'AFTERNOON') {
      defaultSlot = 'PM';
    } else if (currentSlot === 'AM' || currentSlot === 'MORNING') {
      defaultSlot = 'AM';
    } else if (selectedShiftFilter === 'PM') {
      defaultSlot = 'PM';
    } else {
      defaultSlot = 'AM';
    }

    const defaultPicker = delivery.assignedPicker || '';

    setAssignPrompt({
      delivery,
      truck,
      depot: defaultDepot,
      date: defaultDate,
      slot: defaultSlot,
      picker: defaultPicker
    });
  };

  // Step 2: Confirm assignment with Depot, Truck, Schedule, & Picker updated
  const confirmAssignment = () => {
    if (!assignPrompt) return;
    const { delivery, truck, depot, date, slot, picker } = assignPrompt;

    const updatedDriver = (truck.driver && truck.driver.toLowerCase() !== 'no driver' && truck.driver.toLowerCase() !== 'unassigned') 
      ? truck.driver 
      : (delivery.assignedDriver || 'Unassigned');

    const matchedBranch = branches.find(b => b.name.toUpperCase() === depot.toUpperCase() || b.id === depot);
    const finalDepot = matchedBranch ? matchedBranch.name : depot;

    const updated: DeliveryRecord = {
      ...delivery,
      originBranch: finalDepot, // 1) Depot updated!
      assignedTruck: truck.name || truck.id, // 2) Truck updated!
      assignedDriver: updatedDriver,
      scheduledDate: date, // 3) Delivery Board Date updated!
      scheduledSlot: slot, // 3) Delivery Board AM/PM Slot updated!
      assignedPicker: picker.trim() || 'Unassigned', // 4) Picker updated!
      status: DeliveryStatus.PICKED_AND_LOADED,
      history: [
        ...(delivery.history || []),
        {
          status: DeliveryStatus.PICKED_AND_LOADED,
          timestamp: new Date().toISOString(),
          location: finalDepot,
          operator: picker.trim() || 'Dispatcher',
          notes: `Assigned & loaded onto ${truck.name} for ${date} (${slot}) at ${finalDepot}. Picker: ${picker.trim() || 'Unassigned'}`
        }
      ]
    };

    onAddOrUpdateDelivery(updated);
    setAssignPrompt(null);
    setAssigningDelivery(null);
    setDraggedDeliveryId(null);
    setDragOverTruckId(null);
  };

  // Unload / Remove delivery from truck back to unassigned freight pool
  const unloadDelivery = (delivery: DeliveryRecord) => {
    const updated: DeliveryRecord = {
      ...delivery,
      assignedTruck: 'unassigned',
      assignedDriver: '',
      status: DeliveryStatus.REGISTERED,
      scheduledDate: selectedDate || delivery.scheduledDate, // Set date to currently selected board date so it remains visible immediately!
      history: [
        ...(delivery.history || []),
        {
          status: DeliveryStatus.REGISTERED,
          timestamp: new Date().toISOString(),
          location: delivery.originBranch || 'Depot',
          operator: 'Dispatcher',
          notes: `Unloaded from truck back to Unassigned Freight Pool for ${selectedDate || 'Dispatch'}`
        }
      ]
    };

    onAddOrUpdateDelivery(updated);
  };

  // Check if a truck is manually marked FULL for current date and active shift filter (AM / PM / ALL)
  const isTruckManuallyFull = (truckId: string): boolean => {
    const dateKey = showAllDates ? 'ALL_DATES' : (selectedDate || 'TODAY');
    
    if (selectedShiftFilter === 'ALL') {
      return !!(
        fullTruckIds[`${truckId}_${dateKey}_ALL`] ||
        (fullTruckIds[`${truckId}_${dateKey}_AM`] && fullTruckIds[`${truckId}_${dateKey}_PM`]) ||
        fullTruckIds[truckId]
      );
    } else if (selectedShiftFilter === 'AM') {
      return !!(
        fullTruckIds[`${truckId}_${dateKey}_AM`] ||
        fullTruckIds[`${truckId}_${dateKey}_ALL`]
      );
    } else { // 'PM'
      return !!(
        fullTruckIds[`${truckId}_${dateKey}_PM`] ||
        fullTruckIds[`${truckId}_${dateKey}_ALL`]
      );
    }
  };

  // Toggle truck manual FULL status scoped by shift (AM / PM / ALL) and date
  const toggleTruckFullStatus = (truckId: string) => {
    const dateKey = showAllDates ? 'ALL_DATES' : (selectedDate || 'TODAY');
    const shiftKey = selectedShiftFilter;
    const isCurrentlyFull = isTruckManuallyFull(truckId);
    const targetVal = !isCurrentlyFull;

    const next = { ...fullTruckIds };
    if (shiftKey === 'ALL') {
      next[`${truckId}_${dateKey}_ALL`] = targetVal;
      next[`${truckId}_${dateKey}_AM`] = targetVal;
      next[`${truckId}_${dateKey}_PM`] = targetVal;
      if (targetVal) {
        next[truckId] = true;
      } else {
        delete next[truckId];
        delete next[`${truckId}_${dateKey}_ALL`];
        delete next[`${truckId}_${dateKey}_AM`];
        delete next[`${truckId}_${dateKey}_PM`];
      }
    } else {
      next[`${truckId}_${dateKey}_${shiftKey}`] = targetVal;
      if (!targetVal) {
        delete next[`${truckId}_${dateKey}_${shiftKey}`];
        delete next[`${truckId}_${dateKey}_ALL`];
        delete next[truckId];
      }
    }

    if (onUpdateManualFullTrucks) {
      onUpdateManualFullTrucks(next);
    } else {
      setLocalFullTruckIds(next);
    }
  };

  // Week View Renderer for Freight Board
  const renderWeekView = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const firstWeekDay = currentWeekDays[0];
    const lastWeekDay = currentWeekDays[6];

    const weekRangeLabel = `Week of ${firstWeekDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${lastWeekDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    // Helper functions for week view filtering
    const isMatchingWeekStore = (d: DeliveryRecord) => {
      if (selectedStoreFilter === 'ALL') return true;
      const targetStoreUpper = selectedStoreFilter.toUpperCase();
      const storeObj = branches.find(b => b.id === selectedStoreFilter || b.name === selectedStoreFilter);
      const targetId = storeObj ? storeObj.id : selectedStoreFilter;
      const targetNameUpper = storeObj ? storeObj.name.toUpperCase() : targetStoreUpper;

      const originBranchObj = branches.find(b => b.id === d.originBranch || b.name === d.originBranch);
      const originId = originBranchObj ? originBranchObj.id : d.originBranch;
      const originNameUpper = originBranchObj ? originBranchObj.name.toUpperCase() : formatBranchDisplayName(d.originBranch || '', branches).toUpperCase();
      const addrUpper = (d.deliveryAddress || '').toUpperCase();

      const matchesBranchId = originId === targetId;
      const matchesOriginName = originNameUpper.includes(targetNameUpper) || targetNameUpper.includes(originNameUpper) || originNameUpper.includes(targetStoreUpper);
      const matchesAddress = addrUpper.includes(targetNameUpper) || addrUpper.includes(targetStoreUpper);

      return matchesBranchId || matchesOriginName || matchesAddress;
    };

    const isMatchingWeekShift = (d: DeliveryRecord) => {
      if (selectedShiftFilter === 'ALL') return true;
      const slot = (d.scheduledSlot || 'AM').toUpperCase();
      if (selectedShiftFilter === 'AM') return slot === 'AM' || slot === 'MORNING';
      if (selectedShiftFilter === 'PM') return slot === 'PM' || slot === 'AFTERNOON';
      return true;
    };

    return (
      <div className="space-y-6">
        {/* Week View Controls & Navigation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-4 font-sans">
          
          {/* Row 1: Week Date Navigation */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrevWeek}
                className="p-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl transition-all cursor-pointer"
                title="Previous Week"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="px-4 py-2 bg-slate-900 text-white rounded-xl font-mono text-xs font-black tracking-wide flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-amber-400" />
                <span>{weekRangeLabel}</span>
              </div>

              <button
                type="button"
                onClick={handleNextWeek}
                className="p-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl transition-all cursor-pointer"
                title="Next Week"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleThisWeek}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 rounded-xl text-xs font-black font-mono tracking-wider transition-all cursor-pointer shadow-2xs"
              >
                THIS WEEK
              </button>
            </div>

            {/* Quick Summary Pill */}
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-600">
              <span className="px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">
                Store: <strong className="text-slate-900">{selectedStoreFilter === 'ALL' ? 'All Depot Stations' : selectedStoreFilter}</strong>
              </span>
              <span className="px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">
                Shift: <strong className="text-slate-900">{selectedShiftFilter === 'ALL' ? 'All Shifts (AM+PM)' : `${selectedShiftFilter} Shift`}</strong>
              </span>
            </div>
          </div>

          {/* Row 2: Quick Switchers for 1) STORES and 2) AM/PM SHIFT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
            
            {/* 1) STORES QUICK SWITCHER */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black font-mono text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <Store className="h-3.5 w-3.5 text-amber-500" />
                  <span>1) QUICK SWITCH STORE / DEPOT</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono font-semibold">
                  {tenantStores.length} Stores Available
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {/* Store Dropdown Select */}
                <select
                  value={selectedStoreFilter}
                  onChange={(e) => setSelectedStoreFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-900 text-xs font-mono font-bold rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 min-w-[160px]"
                >
                  <option value="ALL">All Depot Stations ({tenantStores.length})</option>
                  {tenantStores.map(st => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>

                {/* Quick Store Pill Buttons (Scrollable) */}
                <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-thin py-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedStoreFilter('ALL')}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedStoreFilter === 'ALL'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    ALL DEPOTS
                  </button>
                  {tenantStores.map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStoreFilter(st.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                        selectedStoreFilter === st.id || selectedStoreFilter === st.name
                          ? 'bg-slate-900 text-white font-black shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {st.name.replace(/^(DC|Depot|Store)\s*/i, '')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2) AM/PM SHIFT QUICK SWITCHER */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black font-mono text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                  <span>2) QUICK SWITCH SHIFT (AM / PM)</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono font-semibold">
                  Shift Capacity Filter
                </span>
              </div>

              {/* Segmented AM/PM Switcher Buttons */}
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedShiftFilter('ALL')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer active:scale-95 ${
                    selectedShiftFilter === 'ALL'
                      ? 'bg-slate-900 text-white font-extrabold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5 text-slate-300" />
                  <span>ALL SHIFTS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedShiftFilter('AM')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer active:scale-95 ${
                    selectedShiftFilter === 'AM'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-amber-50/50'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5 text-amber-600" />
                  <span>AM SHIFT</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedShiftFilter('PM')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer active:scale-95 ${
                    selectedShiftFilter === 'PM'
                      ? 'bg-indigo-600 text-white font-black shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-indigo-50/50'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5 text-indigo-300" />
                  <span>PM SHIFT</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* 7-Day Columns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {currentWeekDays.map((dayObj) => {
            const dateStr = dayObj.toISOString().split('T')[0];
            const isToday = dateStr === todayStr;
            const dayName = dayObj.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = dayObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            // Deliveries scheduled on dateStr matching selected store & shift
            const dayDeliveries = deliveries.filter(d => {
              if (!isMatchingWeekStore(d)) return false;
              if (!isMatchingWeekShift(d)) return false;
              const dDate = d.scheduledDate ? d.scheduledDate.split('T')[0] : (d.registeredAt ? d.registeredAt.split('T')[0] : '');
              return dDate === dateStr;
            });

            const unassignedForDay = dayDeliveries.filter(d => !d.assignedTruck || d.assignedTruck === 'UNASSIGNED' || d.assignedTruck === 'NONE');
            const assignedForDay = dayDeliveries.filter(d => d.assignedTruck && d.assignedTruck !== 'UNASSIGNED' && d.assignedTruck !== 'NONE');

            // Unique trucks loaded on this day
            const trucksForDay = Array.from(new Set(assignedForDay.map(d => d.assignedTruck)));

            return (
              <div 
                key={dateStr}
                className={`bg-white border rounded-2xl p-3.5 flex flex-col justify-between space-y-3 transition-all ${
                  isToday 
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 shadow-md' 
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                {/* Day Header */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black font-mono text-slate-800 uppercase tracking-wider">
                      {dayName}
                    </span>
                    {isToday && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-black font-mono bg-blue-600 text-white uppercase tracking-widest">
                        TODAY
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {dayNum}
                  </div>

                  {/* Summary Badges */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5 font-mono text-[10px]">
                    <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-200/80 font-bold">
                      Unassigned: {unassignedForDay.length}
                    </span>
                    <span className="px-2 py-1 rounded-md bg-blue-100 text-blue-800 border border-blue-200/80 font-bold">
                      Assigned: {assignedForDay.length}
                    </span>
                  </div>
                </div>

                {/* Trucks Loaded on this day */}
                <div className="space-y-2 border-t border-slate-100 pt-2.5 flex-1">
                  <div className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-wider">
                    FLEET TRUCKS ({trucksForDay.length})
                  </div>

                  {trucksForDay.length === 0 ? (
                    <div className="text-[11px] text-slate-400 font-mono italic py-2">
                      No trucks scheduled
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto scrollbar-thin">
                      {trucksForDay.map(truckId => {
                        const truckObj = trucks.find(t => t.id === truckId);
                        const truckName = truckObj ? truckObj.name : truckId;
                        const truckDelivs = assignedForDay.filter(d => d.assignedTruck === truckId);
                        const totalWeight = truckDelivs.reduce((sum, d) => sum + parseDeliveryWeightLbs(d), 0);

                        return (
                          <div key={truckId} className="bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono text-[11px] space-y-1">
                            <div className="flex items-center justify-between font-extrabold text-slate-800">
                              <span className="truncate">{truckName}</span>
                              <span className="text-blue-600">{truckDelivs.length} delivs</span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center justify-between">
                              <span>{totalWeight.toLocaleString()} lbs</span>
                              <span className="text-emerald-600 font-bold">LOADED</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Deliveries Preview */}
                <div className="border-t border-slate-100 pt-2 space-y-1">
                  <div className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-wider">
                    TOTAL ORDERS ({dayDeliveries.length})
                  </div>
                  {dayDeliveries.length > 0 && (
                    <div className="space-y-1 max-h-[120px] overflow-y-auto scrollbar-thin">
                      {dayDeliveries.slice(0, 4).map(d => (
                        <div key={d.id} className="text-[10px] bg-white border border-slate-200 rounded-lg p-1.5 truncate text-slate-700 font-mono">
                          <span className="font-bold text-blue-600 mr-1">#{d.epicorSalesOrder || d.id}</span>
                          <span>{d.customerName || d.deliveryAddress || 'Delivery Item'}</span>
                        </div>
                      ))}
                      {dayDeliveries.length > 4 && (
                        <div className="text-[10px] text-slate-500 font-mono text-center pt-0.5">
                          +{dayDeliveries.length - 4} more orders...
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action button to switch to Day View for this date */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(dateStr);
                    setViewMode('day');
                  }}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 active:bg-black text-white rounded-xl text-xs font-bold font-mono uppercase transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center space-x-1.5"
                >
                  <span>INSPECT / DISPATCH DAY</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Fleet Weekly Dispatch Matrix */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black font-mono text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <TruckIcon className="h-4 w-4 text-blue-600" />
              <span>FLEET WEEKLY DISPATCH MATRIX</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Filtered by: {selectedStoreFilter === 'ALL' ? 'All Stores' : selectedStoreFilter} • {selectedShiftFilter === 'ALL' ? 'All Shifts' : `${selectedShiftFilter} Shift`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider">
                  <th className="p-3 font-black">VEHICLE / TRUCK</th>
                  {currentWeekDays.map(d => {
                    const dateStr = d.toISOString().split('T')[0];
                    const isToday = dateStr === todayStr;
                    return (
                      <th key={dateStr} className={`p-3 font-black text-center ${isToday ? 'bg-blue-100 text-blue-900' : ''}`}>
                        {d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeTrucks.map(truck => (
                  <tr key={truck.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap border-r border-slate-100">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="font-extrabold">{truck.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">{truck.driverName || 'Unassigned Driver'}</div>
                    </td>

                    {currentWeekDays.map(d => {
                      const dateStr = d.toISOString().split('T')[0];
                      const isToday = dateStr === todayStr;

                      const truckDayDelivs = deliveries.filter(deliv => {
                        if (!isMatchingWeekStore(deliv)) return false;
                        if (!isMatchingWeekShift(deliv)) return false;
                        const delivDate = deliv.scheduledDate ? deliv.scheduledDate.split('T')[0] : (deliv.registeredAt ? deliv.registeredAt.split('T')[0] : '');
                        return deliv.assignedTruck === truck.id && delivDate === dateStr;
                      });

                      const totalWeight = truckDayDelivs.reduce((sum, deliv) => sum + parseDeliveryWeightLbs(deliv), 0);

                      return (
                        <td 
                          key={dateStr}
                          onClick={() => {
                            setSelectedDate(dateStr);
                            setViewMode('day');
                          }}
                          className={`p-3 text-center cursor-pointer transition-colors border-r border-slate-100 hover:bg-blue-50/60 ${
                            isToday ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          {truckDayDelivs.length > 0 ? (
                            <div className="inline-flex flex-col items-center bg-blue-100 text-blue-900 border border-blue-200 px-2.5 py-1 rounded-xl text-[11px] font-black shadow-2xs">
                              <span>{truckDayDelivs.length} delivs</span>
                              <span className="text-[9px] font-normal text-blue-700">{totalWeight.toLocaleString()} lbs</span>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
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
            Drag a delivery onto a truck to load it or switch to Week View to analyze upcoming capacity
          </p>
        </div>

        {/* Header Controls: View Mode Switcher & Rollover Action */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Day / Week View Mode Segmented Controls */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95 ${
                viewMode === 'day'
                  ? 'bg-slate-900 text-white shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>DAY VIEW</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95 ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="h-3.5 w-3.5 text-blue-200" />
              <span>WEEK VIEW</span>
            </button>
          </div>

          {/* Auto-Rollover Button */}
          <button
            type="button"
            onClick={handleTriggerRollover}
            className="px-3.5 py-2 rounded-xl text-xs font-black font-mono bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 border border-amber-600 transition-all cursor-pointer shadow-xs active:scale-95 flex items-center space-x-1.5"
            title="Move uncompleted past deliveries to the first available slot in the next day"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>⚡ ROLL OVER INCOMPLETE</span>
          </button>

          {/* Counter Summary Stats */}
          <div className="hidden sm:flex items-center space-x-4 bg-white border border-slate-200/90 px-3.5 py-1.5 rounded-xl font-mono shadow-2xs">
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TRUCKS</span>
              <span className="text-base font-black text-blue-600">{activeTrucks.length}</span>
            </div>
            <div className="h-3.5 w-px bg-slate-200"></div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">UNASSIGNED</span>
              <span className="text-base font-black text-amber-600">{unassignedDeliveries.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rollover Banner Notification */}
      {rolloverNotice && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-3 text-xs font-mono font-bold flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{rolloverNotice}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setRolloverNotice(null)}
            className="text-amber-700 hover:text-amber-900 font-black px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Board View: Week View vs Day View */}
      {viewMode === 'week' ? (
        renderWeekView()
      ) : (
        <>
          {/* Dispatch Board Controls Bar: Store Filter, Date Picker, AM/PM Shift Filter */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3 font-sans">
        
        {/* Row 1: Store & DC Selection (Filters BOTH Trucks and Deliveries) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-xs font-black font-mono text-slate-700 uppercase tracking-wider">
              STORE / DC FILTER:
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
              (Filters both Fleet Vehicles & Freight Pool)
            </span>
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto touch-pan-x pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSelectedStoreFilter('ALL')}
              className={`px-3 py-1.5 min-h-[34px] rounded-full text-[10px] font-black font-mono uppercase transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                selectedStoreFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              ALL STORES ({tenantStores.length || 4})
            </button>
            {tenantStores.map(store => (
              <button
                key={store.id}
                type="button"
                onClick={() => setSelectedStoreFilter(store.name)}
                className={`px-3 py-1.5 min-h-[34px] rounded-full text-[10px] font-black font-mono uppercase transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  selectedStoreFilter.toUpperCase() === store.name.toUpperCase()
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {store.name}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Date Selector (Multi-Day Loading) & Shift Filter (AM/PM) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Date Selector Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl">
              <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="text-[11px] font-bold font-mono text-slate-700 uppercase">
                LOAD DATE:
              </span>
            </div>

            {/* Date Nav Buttons */}
            <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevDay}
                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                title="Previous Day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setShowAllDates(false);
                }}
                className="bg-transparent text-xs font-bold font-mono text-slate-900 focus:outline-none cursor-pointer px-1"
              />

              <button
                type="button"
                onClick={handleNextDay}
                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                title="Next Day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => setShowAllDates(!showAllDates)}
              className={`px-3 py-1 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                showAllDates
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              {showAllDates ? '★ Showing All Dates' : 'Show All Dates'}
            </button>

            <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl">
              {formattedDateLabel}
            </span>
          </div>

          {/* AM/PM Shift Filter Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <span className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wider shrink-0 flex items-center space-x-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>SHIFT:</span>
            </span>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto overflow-x-auto touch-pan-x scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedShiftFilter('ALL')}
                className={`px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-bold font-mono transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  selectedShiftFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ALL SHIFTS
              </button>

              <button
                type="button"
                onClick={() => setSelectedShiftFilter('AM')}
                className={`px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap active:scale-95 ${
                  selectedShiftFilter === 'AM'
                    ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sun className="h-3.5 w-3.5 text-amber-900" />
                <span>AM MORNING</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedShiftFilter('PM')}
                className={`px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap active:scale-95 ${
                  selectedShiftFilter === 'PM'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Moon className="h-3.5 w-3.5 text-blue-200" />
                <span>PM AFTERNOON</span>
              </button>
            </div>
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

              const isManualFull = isTruckManuallyFull(truck.id);
              const isFull = isManualFull || fillPct >= 100;

              const isDragTarget = dragOverTruckId === truck.id;

              // Extract route/branch display name & driver
              const branchObj = branches.find(b => b.id === truck.branchId);
              const depotName = branchObj ? formatBranchDisplayName(branchObj) : formatBranchDisplayName(truck.branchId || 'Depot');
              const driverName = (truck.driver && truck.driver.toLowerCase() !== 'no driver' && truck.driver.toLowerCase() !== 'unassigned') 
                ? truck.driver 
                : 'No Driver Assigned';

              // Live GPS Location details
              const gpsInfo = getTruckGpsInfo(truck, branches);

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
                      handleAutoDropAssign(deliveryId, truck);
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
                    
                    {/* Vehicle Photo / Equipment Graphic Card */}
                    <div className="shrink-0">
                      <TruckGraphic 
                        fillPct={fillPct} 
                        isFull={isFull} 
                        truckId={truck.id} 
                        truck={truck} 
                        onPreviewImage={(t) => setPreviewTruck(t)} 
                      />
                    </div>

                    {/* Truck Specs & Driver info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 truncate min-w-0">
                          <span className="font-mono font-black text-sm text-slate-900 truncate">
                            {truck.name}
                          </span>
                          <span className="text-slate-400 font-mono hidden sm:inline">·</span>
                          <span className="text-xs font-semibold text-slate-500 truncate hidden sm:inline">
                            {truck.type || truck.model || 'Commercial Carrier'}
                          </span>
                        </div>

                        {/* Top Right Controls: Live GPS Badge + Status Badge */}
                        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                          {/* Live GPS Location Badge */}
                          <div 
                            className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-900 text-slate-100 rounded-lg border border-slate-700 shadow-2xs font-mono text-[10px]"
                            title={`GPS Live Telematics: ${gpsInfo.locationName} (${gpsInfo.coordinatesText})${gpsInfo.speedText ? ` · Speed: ${gpsInfo.speedText}` : ''}`}
                          >
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="font-bold text-white max-w-[120px] sm:max-w-[170px] truncate">
                              {gpsInfo.locationName}
                            </span>
                            <span className="text-slate-400 font-mono text-[9px] border-l border-slate-700 pl-1.5 hidden xl:inline">
                              {gpsInfo.coordinatesText}
                            </span>
                          </div>

                          {/* Status Badge (OPEN / FULL) */}
                          {isFull ? (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black font-mono tracking-wider bg-amber-500 text-slate-950 uppercase shadow-xs flex items-center space-x-1 shrink-0">
                              <Lock className="h-3 w-3" />
                              <span>FULL {selectedShiftFilter !== 'ALL' ? `(${selectedShiftFilter})` : ''}</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono tracking-wider bg-slate-100 text-slate-700 border border-slate-200 uppercase flex items-center space-x-1 shrink-0">
                              <Unlock className="h-3 w-3 text-emerald-600" />
                              <span>OPEN {selectedShiftFilter !== 'ALL' ? `(${selectedShiftFilter})` : ''}</span>
                            </span>
                          )}
                        </div>
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
                    {!isViewOnly ? (
                      <button
                        type="button"
                        onClick={() => toggleTruckFullStatus(truck.id)}
                        className={`text-[10px] font-bold font-mono px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                          isManualFull
                            ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                            : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                        }`}
                        title={isManualFull ? `Reopen truck for ${selectedShiftFilter !== 'ALL' ? selectedShiftFilter : 'all'} shift deliveries` : `Mark truck full for ${selectedShiftFilter !== 'ALL' ? selectedShiftFilter : 'all'} shift`}
                      >
                        {isManualFull 
                          ? `Re-open ${selectedShiftFilter !== 'ALL' ? `${selectedShiftFilter} ` : ''}Capacity` 
                          : `Mark Truck Full${selectedShiftFilter !== 'ALL' ? ` (${selectedShiftFilter})` : ''}`}
                      </button>
                    ) : (
                      <div />
                    )}

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
                            draggable={!isViewOnly}
                            onDragStart={(e) => !isViewOnly && handleDragStart(e, item.id)}
                            onDragEnd={handleDragEnd}
                            className={`bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between text-xs shadow-2xs ${
                              !isViewOnly ? 'cursor-grab active:cursor-grabbing hover:border-blue-400' : ''
                            }`}
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
          
          {/* Header & Quick Search */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest font-mono flex items-center space-x-2">
                <Package className="h-4 w-4 text-amber-500" />
                <span>UNASSIGNED DELIVERIES ({unassignedDeliveries.length})</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedShiftFilter !== 'ALL' ? `${selectedShiftFilter} Shift` : 'All Shifts'}
              </span>
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

            {/* Unassigned Pool Override Banner */}
            {totalSystemUnassigned.length > unassignedDeliveries.length && !showAllUnassigned && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between font-mono animate-fade-in shadow-2xs">
                <span className="text-[11px]">
                  ⚠️ <strong>{totalSystemUnassigned.length - unassignedDeliveries.length}</strong> unassigned orders on other dates/stores.
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllUnassigned(true)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 cursor-pointer transition-colors"
                >
                  Show All Pool ({totalSystemUnassigned.length})
                </button>
              </div>
            )}

            {showAllUnassigned && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between font-mono animate-fade-in shadow-2xs">
                <span className="text-[11px]">
                  ★ Showing <strong>ALL {unassignedDeliveries.length}</strong> system unassigned orders.
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllUnassigned(false)}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 cursor-pointer transition-colors"
                >
                  Reset Date Filter
                </button>
              </div>
            )}
          </div>

          {/* Unassigned Deliveries List Container */}
          <div className="space-y-5 max-h-[720px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300">
            
            {unassignedDeliveries.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500 space-y-2 shadow-2xs">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-mono font-bold text-slate-800">All Freight Dispatched!</p>
                <p className="text-[11px] text-slate-500">There are no unassigned delivery tickets matching the active filters.</p>
              </div>
            ) : (
              <>
                {/* ⭐ AM DELIVERIES GROUP / DROP BOARD */}
                {(selectedShiftFilter === 'ALL' || selectedShiftFilter === 'AM') && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverUnassignedSlot !== 'AM') setDragOverUnassignedSlot('AM');
                    }}
                    onDragLeave={() => setDragOverUnassignedSlot(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData('text/plain') || draggedDeliveryId;
                      if (id) handleUnassignDrop(id, 'AM');
                    }}
                    className={`space-y-2.5 p-3 rounded-2xl border transition-all duration-200 ${
                      dragOverUnassignedSlot === 'AM'
                        ? 'border-amber-500 bg-amber-50/90 ring-2 ring-amber-500/50 shadow-md'
                        : 'border-slate-200/80 bg-slate-50/50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-[11px] font-black font-mono text-amber-600 uppercase tracking-wider">
                        <span>★</span>
                        <span>AM MORNING FREIGHT BOARD ({amDeliveries.length})</span>
                      </div>
                      {dragOverUnassignedSlot === 'AM' && (
                        <span className="text-[10px] font-mono font-bold text-amber-800 animate-pulse bg-amber-200 px-2 py-0.5 rounded">
                          DROP TO MOVE TO AM
                        </span>
                      )}
                    </div>

                    {amDeliveries.length === 0 ? (
                      <div className="p-4 text-center border-2 border-dashed border-amber-200 rounded-xl bg-amber-50/40 text-amber-800 text-xs font-mono">
                        Drop freight tickets here to assign to AM Morning Shift
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {amDeliveries.map((delivery) => (
                          <UnassignedDeliveryCard
                            key={delivery.id}
                            delivery={delivery}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onAssignClick={() => setAssigningDelivery(delivery)}
                            onToggleShiftSlot={handleToggleShiftSlot}
                            isBeingDragged={draggedDeliveryId === delivery.id}
                            isViewOnly={isViewOnly}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 🌙 PM DELIVERIES GROUP / DROP BOARD */}
                {(selectedShiftFilter === 'ALL' || selectedShiftFilter === 'PM') && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverUnassignedSlot !== 'PM') setDragOverUnassignedSlot('PM');
                    }}
                    onDragLeave={() => setDragOverUnassignedSlot(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData('text/plain') || draggedDeliveryId;
                      if (id) handleUnassignDrop(id, 'PM');
                    }}
                    className={`space-y-2.5 p-3 rounded-2xl border transition-all duration-200 ${
                      dragOverUnassignedSlot === 'PM'
                        ? 'border-blue-500 bg-blue-50/90 ring-2 ring-blue-500/50 shadow-md'
                        : 'border-slate-200/80 bg-slate-50/50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-[11px] font-black font-mono text-blue-600 uppercase tracking-wider">
                        <span>☪</span>
                        <span>PM AFTERNOON FREIGHT BOARD ({pmDeliveries.length})</span>
                      </div>
                      {dragOverUnassignedSlot === 'PM' && (
                        <span className="text-[10px] font-mono font-bold text-blue-800 animate-pulse bg-blue-200 px-2 py-0.5 rounded">
                          DROP TO MOVE TO PM
                        </span>
                      )}
                    </div>

                    {pmDeliveries.length === 0 ? (
                      <div className="p-4 text-center border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/40 text-blue-800 text-xs font-mono">
                        Drop freight tickets here to assign to PM Afternoon Shift
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {pmDeliveries.map((delivery) => (
                          <UnassignedDeliveryCard
                            key={delivery.id}
                            delivery={delivery}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onAssignClick={() => setAssigningDelivery(delivery)}
                            onToggleShiftSlot={handleToggleShiftSlot}
                            isBeingDragged={draggedDeliveryId === delivery.id}
                            isViewOnly={isViewOnly}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

          </div>

        </div>

      </div>
        </>
      )}

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
                    onClick={() => initiateAssignment(assigningDelivery.id, truck)}
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
                      <span className="text-[9px] text-blue-600 font-bold">Configure & Load →</span>
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

      {/* ASSIGN FREIGHT & PICKER PROMPT MODAL */}
      {assignPrompt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[210] flex items-center justify-center p-4 animate-fade-in select-text">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                  <TruckIcon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-mono font-black text-slate-900 text-base">Dispatch Ticket & Select Picker</h4>
                  <p className="text-xs text-slate-500">
                    Assigning #{assignPrompt.delivery.id} to {assignPrompt.truck.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssignPrompt(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Delivery Overview Box */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between font-mono font-bold">
                <span className="text-blue-600">{assignPrompt.delivery.id}</span>
                <span className="text-emerald-600">{parseDeliveryWeightLbs(assignPrompt.delivery).toLocaleString()} lbs</span>
              </div>
              <p className="font-semibold text-slate-800">{assignPrompt.delivery.customerName || 'Customer'}</p>
              <p className="text-slate-500 text-[11px] truncate">{assignPrompt.delivery.deliveryAddress}</p>
            </div>

            {/* Form Fields: Depot, Date, Slot, Picker */}
            <div className="space-y-4">
              {/* 1. Depot Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 font-mono mb-1">
                  1. Dispatch Depot / Origin Store
                </label>
                <select
                  value={assignPrompt.depot}
                  onChange={(e) => setAssignPrompt({ ...assignPrompt, depot: e.target.value })}
                  className="w-full bg-white border border-slate-200 px-3 py-2 text-xs rounded-xl font-mono text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                >
                  {tenantStores.map(store => (
                    <option key={store.id} value={store.name}>
                      {store.name}
                    </option>
                  ))}
                  {branches.length === 0 && (
                    <>
                      <option value="Windmill DC">Windmill DC</option>
                      <option value="Tantallon Depot">Tantallon Depot</option>
                      <option value="Dartmouth Hub">Dartmouth Hub</option>
                    </>
                  )}
                </select>
              </div>

              {/* 2. Schedule Date & AM/PM Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 font-mono mb-1">
                    2. Scheduled Delivery Date
                  </label>
                  <input
                    type="date"
                    value={assignPrompt.date}
                    onChange={(e) => setAssignPrompt({ ...assignPrompt, date: e.target.value })}
                    className="w-full bg-white border border-slate-200 px-3 py-1.5 text-xs rounded-xl font-mono text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 font-mono mb-1">
                    Delivery Shift Slot
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setAssignPrompt({ ...assignPrompt, slot: 'AM' })}
                      className={`flex-1 py-1.5 rounded-xl font-mono font-bold text-xs border transition-all cursor-pointer ${
                        assignPrompt.slot === 'AM'
                          ? 'bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-400/30'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ★ AM Shift
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignPrompt({ ...assignPrompt, slot: 'PM' })}
                      className={`flex-1 py-1.5 rounded-xl font-mono font-bold text-xs border transition-all cursor-pointer ${
                        assignPrompt.slot === 'PM'
                          ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-400/30'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ☪ PM Shift
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Assign Picker (Prompt) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 font-mono">
                    3. Warehouse Picker Name
                  </label>
                  <span className="text-[10px] text-emerald-600 font-mono font-bold">Required / Recommended</span>
                </div>

                {/* User Dropdown Select if users exist */}
                {users && users.length > 0 && (
                  <select
                    value={assignPrompt.picker}
                    onChange={(e) => setAssignPrompt({ ...assignPrompt, picker: e.target.value })}
                    className="w-full bg-white border border-slate-200 px-3 py-2 text-xs rounded-xl font-mono text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs mb-2"
                  >
                    <option value="">-- Select Picker from Staff List --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.role || 'Warehouse'})
                      </option>
                    ))}
                  </select>
                )}

                {/* Custom Picker Text Input */}
                <input
                  type="text"
                  placeholder="Type picker name (e.g. Dave Miller)..."
                  value={assignPrompt.picker}
                  onChange={(e) => setAssignPrompt({ ...assignPrompt, picker: e.target.value })}
                  className="w-full bg-white border border-slate-200 px-3 py-2 text-xs rounded-xl font-mono text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                />

                {/* Quick Picker Preset Chips */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-slate-400 font-mono self-center mr-1">Quick Select:</span>
                  {['Dave Miller', 'Sarah Jenkins', 'Mike Ross', 'Alex T.', 'Unassigned'].map((pName) => (
                    <button
                      key={pName}
                      type="button"
                      onClick={() => setAssignPrompt({ ...assignPrompt, picker: pName })}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border cursor-pointer transition-colors ${
                        assignPrompt.picker === pName
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {pName}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAssignPrompt(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAssignment}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold font-mono flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm & Dispatch Freight</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-res Truck Vehicle Image & Specs Lightbox Modal */}
      {previewTruck && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                  <TruckIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-mono font-black text-base text-white flex items-center gap-2">
                    <span>{previewTruck.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal border border-slate-700">
                      {previewTruck.type || 'Fleet Transport'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Depot: {formatBranchDisplayName(previewTruck.branchId)} {previewTruck.vin ? `· VIN: ${previewTruck.vin}` : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewTruck(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Large Vehicle Graphic / Photo Frame */}
              <div className="bg-white border border-slate-300 rounded-xl p-4 flex items-center justify-center aspect-[16/9] relative overflow-hidden shadow-sm group">
                <img 
                  src={getTruckImage(previewTruck)} 
                  alt={previewTruck.name} 
                  className="w-full h-full object-contain filter drop-shadow-md scale-110" 
                />
                <div className="absolute top-2 right-2 px-2 py-1 rounded bg-slate-900/90 border border-slate-700 text-[10px] font-mono text-slate-300">
                  {previewTruck.imageUrl ? 'Custom Fleet Photo' : 'Equipment Category Spec'}
                </div>
              </div>

              {/* Truck Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Assigned Driver</span>
                  <span className="font-bold text-white text-sm truncate block mt-0.5">
                    {previewTruck.driver || 'Unassigned'}
                  </span>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Max Weight Cap</span>
                  <span className="font-bold text-amber-400 text-sm block mt-0.5">
                    {getTruckMaxCapacityLbs(previewTruck).toLocaleString()} lbs
                  </span>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Cargo Volume</span>
                  <span className="font-bold text-blue-400 text-sm block mt-0.5">
                    {previewTruck.capacityVolumeM3 || 'Standard'} {previewTruck.capacityVolumeM3 ? 'm³' : ''}
                  </span>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Commercial Plate</span>
                  <span className="font-bold text-emerald-400 text-sm block mt-0.5">
                    {previewTruck.licensePlate || previewTruck.truckNumber || 'PRO-FLEET'}
                  </span>
                </div>
              </div>

              {/* Vehicle User Fields & Notes if available */}
              {(previewTruck.userField1 || previewTruck.userField2) && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Equipment Custom Specifications</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 font-mono text-[11px]">
                    {previewTruck.userField1 && (
                      <div className="bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800">
                        <span className="text-slate-500 mr-1.5">Spec 1:</span>
                        <span className="font-semibold text-slate-200">{previewTruck.userField1}</span>
                      </div>
                    )}
                    {previewTruck.userField2 && (
                      <div className="bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800">
                        <span className="text-slate-500 mr-1.5">Spec 2:</span>
                        <span className="font-semibold text-slate-200">{previewTruck.userField2}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewTruck(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold font-mono transition-colors cursor-pointer"
              >
                Close Vehicle Preview
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
  onToggleShiftSlot,
  isBeingDragged,
  isViewOnly = false
}: {
  delivery: DeliveryRecord;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onAssignClick: () => void;
  onToggleShiftSlot?: (delivery: DeliveryRecord) => void;
  isBeingDragged: boolean;
  isViewOnly?: boolean;
}) {
  const weightLbs = parseDeliveryWeightLbs(delivery);
  const isUrgent = delivery.deliveryCategory === 'Pro' || delivery.destinationNotes?.toLowerCase().includes('urgent') || delivery.destinationNotes?.toLowerCase().includes('priority');
  const currentSlot = (delivery.scheduledSlot as string)?.toUpperCase();
  const slot: 'AM' | 'PM' = (currentSlot === 'PM' || currentSlot === 'AFTERNOON') ? 'PM' : 'AM';

  // Origin / dest summary
  const customerSummary = delivery.customerName || 'Customer';
  const addressCity = delivery.deliveryAddress ? delivery.deliveryAddress.split(',')[0] : 'Regional Site';
  const originDepot = formatBranchDisplayName(delivery.originBranch || 'Depot');

  return (
    <div
      draggable={!isViewOnly}
      onDragStart={(e) => !isViewOnly && onDragStart(e, delivery.id)}
      onDragEnd={onDragEnd}
      onClick={isViewOnly ? undefined : onAssignClick}
      className={`relative bg-white border rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 ${
        isViewOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing hover:scale-[1.02]'
      } shadow-2xs ${
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
        <div className="flex items-center space-x-2">
          {!isViewOnly && onToggleShiftSlot ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleShiftSlot(delivery);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                slot === 'AM'
                  ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                  : 'bg-indigo-100 text-indigo-900 border-indigo-300 hover:bg-indigo-200'
              }`}
              title="Click to toggle between AM and PM shift slot"
            >
              {slot === 'AM' ? '★ AM' : '☪ PM'}
            </button>
          ) : (
            <span className="text-[10px] font-bold text-slate-500">
              {slot === 'AM' ? '★ AM' : '☪ PM'}
            </span>
          )}
          {!isViewOnly && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAssignClick();
              }}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-[10px] font-bold font-mono tracking-wide uppercase transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center space-x-1"
              title="Tap to assign to a vehicle"
            >
              <span>Assign</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
