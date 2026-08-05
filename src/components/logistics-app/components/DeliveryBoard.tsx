import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Store, 
  Truck as TruckIcon, 
  Lock, 
  Unlock, 
  Plus, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Package, 
  MapPin, 
  Filter, 
  Trash2, 
  ArrowLeft,
  ChevronRight as ChevronRightIcon,
  ChevronUp,
  ChevronDown,
  Layers,
  Shield,
  UserCheck,
  GripVertical,
  Move,
  RotateCcw,
  User as UserIcon
} from 'lucide-react';
import { 
  DeliveryRecord, 
  DeliveryStatus, 
  Branch, 
  Truck, 
  User, 
  StoreDeliveryConfig, 
  SlotClosureRule, 
  ClosureType 
} from '../types';
import { isTruckAssignedToBranch } from './Dashboard';

// Helper to calculate truck max capacity in lbs
function getTruckMaxCapacityLbs(truck: Truck): number {
  if (!truck) return 8000;

  // 1. Check capacityWeightKg from truck table
  if (truck.capacityWeightKg && truck.capacityWeightKg > 0) {
    if (truck.capacityWeightKg >= 2000) return Math.round(truck.capacityWeightKg);
    return Math.round(truck.capacityWeightKg * 2.20462);
  }

  // 2. Check userField1 / userField2 from truck table
  if (truck.userField1) {
    const val = parseFloat(truck.userField1.replace(/[^0-9.]/g, ''));
    if (!isNaN(val) && val > 0) return val < 2000 ? Math.round(val * 2.20462) : Math.round(val);
  }
  if (truck.userField2) {
    const val = parseFloat(truck.userField2.replace(/[^0-9.]/g, ''));
    if (!isNaN(val) && val > 0) return val < 2000 ? Math.round(val * 2.20462) : Math.round(val);
  }

  // 3. Check custom properties
  if ((truck as any).capacityLbs && Number((truck as any).capacityLbs) > 0) {
    return Math.round(Number((truck as any).capacityLbs));
  }
  if ((truck as any).truckCapacity && Number((truck as any).truckCapacity) > 0) {
    const cap = Number((truck as any).truckCapacity);
    return cap < 2000 ? Math.round(cap * 2.20462) : Math.round(cap);
  }

  // 4. Model / type keyword fallback
  const nameLower = ((truck.name || '') + ' ' + (truck.type || '') + ' ' + (truck.model || '')).toLowerCase();
  if (nameLower.includes('boom') || nameLower.includes('crane') || nameLower.includes('western star')) return 12000;
  if (nameLower.includes('flatdeck') || nameLower.includes('flatbed') || nameLower.includes('heavy') || nameLower.includes('curtain') || nameLower.includes('hauler') || nameLower.includes('tandem')) return 10000;
  if (nameLower.includes('f550') || nameLower.includes('f-550') || nameLower.includes('window') || nameLower.includes('glass')) return 6000;
  if (nameLower.includes('f150') || nameLower.includes('f-150') || nameLower.includes('ranger') || nameLower.includes('pickup')) return 3500;
  if (nameLower.includes('reefer') || nameLower.includes('dry van') || nameLower.includes('box')) return 8000;
  return 8000;
}

// Helper to parse weight string (e.g. "1,200 lbs" -> 1200)
function parseWeightLbs(weightStr?: string | number): number {
  if (!weightStr) return 850;
  if (typeof weightStr === 'number') return weightStr;
  const num = parseFloat(weightStr.replace(/[^0-9.]/g, ''));
  return isNaN(num) || num <= 0 ? 850 : Math.round(num);
}

// Vector SVG Truck Graphic showing cab, trailer, wheels, and cargo fill level
function TruckGraphic({ fillPct, isFull, truckId }: { fillPct: number; isFull: boolean; truckId: string }) {
  const patternId = `hazardPattern_db_${truckId.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const innerY = 10;
  const innerH = 38;
  const fillH = Math.max(0, Math.round((innerH * fillPct) / 100));
  const fillY = innerY + (innerH - fillH);

  return (
    <div className="relative w-full max-w-[180px] py-1 select-none">
      <svg viewBox="0 0 210 68" className="w-full h-auto filter drop-shadow-xs overflow-visible">
        <defs>
          <pattern id={patternId} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="16" fill="#f59e0b" />
            <rect x="8" width="8" height="16" fill="#b45309" />
          </pattern>
        </defs>

        {/* Truck Front Cab */}
        <rect x="8" y="14" width="38" height="34" rx="6" fill="#334155" stroke="#1e293b" strokeWidth="1.5" />
        <rect x="22" y="18" width="18" height="15" rx="3" fill="#38bdf8" />
        <path d="M 22 18 L 34 18 C 37 18, 39 20, 39 23 L 39 31 C 39 33, 37 33, 34 33 L 22 33 Z" fill="#7dd3fc" opacity="0.8" />

        {/* Trailer Container Frame */}
        <rect x="52" y="8" width="146" height="42" rx="7" fill="#1e293b" stroke="#475569" strokeWidth="2.5" />

        {/* Trailer Cargo Fill */}
        {isFull ? (
          <rect x="55" y="11" width="140" height="36" rx="5" fill={`url(#${patternId})`} />
        ) : fillPct > 0 ? (
          <rect x="55" y={fillY + 1} width="140" height={Math.max(3, fillH - 2)} rx={fillPct >= 90 ? 5 : 2} fill="#f59e0b" />
        ) : (
          <rect x="55" y={innerY + innerH - 4} width="140" height="4" rx="2" fill="#06b6d4" />
        )}

        {/* Wheels & Tires */}
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

interface DeliveryBoardProps {
  deliveries: DeliveryRecord[];
  branches: Branch[];
  trucks: Truck[];
  users: User[];
  currentUser: User | null;
  currentTenant: any;
  onUpdateDelivery: (delivery: DeliveryRecord) => void;
  onAddDelivery?: (delivery: Partial<DeliveryRecord>) => void;
  onUpdateClosureRules?: (rules: SlotClosureRule[]) => void;
  onUpdateStoreConfigs?: (configs: Record<string, StoreDeliveryConfig>) => void;
  initialClosureRules?: SlotClosureRule[];
  manualFullTrucks?: Record<string, boolean>;
  onUpdateManualFullTrucks?: (updated: Record<string, boolean>) => void;
}

const DEFAULT_DAYS: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const DEFAULT_STORE_CONFIG: StoreDeliveryConfig = {
  branchId: 'ALL',
  deliveryDays: DEFAULT_DAYS,
  amTimeRange: '07:00 AM - 12:00 PM',
  pmTimeRange: '12:00 PM - 05:00 PM',
  amMaxCap: 6,
  pmMaxCap: 6,
  cutoffTime: '16:00',
  allowOverbooking: false,
};

export function DeliveryBoard({
  deliveries,
  branches,
  trucks,
  users,
  currentUser,
  currentTenant,
  onUpdateDelivery,
  onAddDelivery,
  onUpdateClosureRules,
  onUpdateStoreConfigs,
  initialClosureRules,
  manualFullTrucks,
  onUpdateManualFullTrucks
}: DeliveryBoardProps) {
  // Role checks
  const isDispatcherOrAdmin = ['Dispatcher', 'Admin', 'SUPER_ADMIN'].includes(currentUser?.role || '');

  // View state: 'week' | 'day'
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  
  // Drag and Drop State
  const [draggedFreightId, setDraggedFreightId] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);

  // Manual Full Truck overrides and Expanded Truck Manifest slots
  const [localManualFullTrucks, setLocalManualFullTrucks] = useState<Record<string, boolean>>({});
  const effectiveManualFullTrucks = manualFullTrucks !== undefined ? manualFullTrucks : localManualFullTrucks;
  const [expandedTruckSlots, setExpandedTruckSlots] = useState<Record<string, boolean>>({});
  
  // Selected Store filter: 'ALL' or branchId
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

  // Selected date reference
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Store delivery configs state
  const [storeConfigs, setStoreConfigs] = useState<Record<string, StoreDeliveryConfig>>(() => {
    try {
      if (currentTenant?.id) {
        const tenantSaved = localStorage.getItem(`prospaces_store_configs_${currentTenant.id}`);
        if (tenantSaved) return JSON.parse(tenantSaved);
      }
      const saved = localStorage.getItem('prospaces_delivery_board_configs');
      return saved ? JSON.parse(saved) : { ALL: DEFAULT_STORE_CONFIG };
    } catch {
      return { ALL: DEFAULT_STORE_CONFIG };
    }
  });

  // Slot closure rules state
  const [closureRules, setClosureRules] = useState<SlotClosureRule[]>(() => {
    if (initialClosureRules && initialClosureRules.length > 0) return initialClosureRules;
    try {
      if (currentTenant?.id) {
        const tenantSaved = localStorage.getItem(`prospaces_closure_rules_${currentTenant.id}`);
        if (tenantSaved) return JSON.parse(tenantSaved);
      }
      const saved = localStorage.getItem('prospaces_delivery_board_closures');
      return saved ? JSON.parse(saved) : [
        {
          id: 'closure-1',
          branchId: 'ALL',
          date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          slot: 'PM',
          closureType: 'CLOSED_RETAIL',
          reason: 'Restricted for Pro Construction Orders',
          closedBy: 'Dispatcher Center'
        }
      ];
    } catch {
      return [];
    }
  });

  // Sync branches metadata into state if loaded from Supabase or tenant cache
  useEffect(() => {
    let rulesUpdated = false;
    let configsUpdated = false;
    const mergedRules = [...closureRules];
    const mergedConfigs = { ...storeConfigs };

    if (currentTenant?.id) {
      try {
        const tenantRules = localStorage.getItem(`prospaces_closure_rules_${currentTenant.id}`);
        if (tenantRules) {
          const parsed = JSON.parse(tenantRules);
          if (Array.isArray(parsed)) {
            parsed.forEach((r: SlotClosureRule) => {
              if (!mergedRules.some(existing => existing.id === r.id)) {
                mergedRules.push(r);
                rulesUpdated = true;
              }
            });
          }
        }
        const tenantConfigs = localStorage.getItem(`prospaces_store_configs_${currentTenant.id}`);
        if (tenantConfigs) {
          const parsed = JSON.parse(tenantConfigs);
          Object.assign(mergedConfigs, parsed);
          configsUpdated = true;
        }
      } catch (e) {}
    }

    (branches || []).forEach(b => {
      if (b.closureRules && Array.isArray(b.closureRules)) {
        b.closureRules.forEach((r: SlotClosureRule) => {
          if (!mergedRules.some(existing => existing.id === r.id || (existing.date === r.date && existing.slot === r.slot && existing.branchId === r.branchId))) {
            mergedRules.push(r);
            rulesUpdated = true;
          }
        });
      }
      if (b.deliveryBoardConfig) {
        mergedConfigs[b.id] = b.deliveryBoardConfig;
        configsUpdated = true;
      }
    });

    if (rulesUpdated) setClosureRules(mergedRules);
    if (configsUpdated) setStoreConfigs(mergedConfigs);
  }, [branches, currentTenant]);

  // Active Modals & Sidebars
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [showClosureModal, setShowClosureModal] = useState<{ date: string; slot: 'AM' | 'PM' | 'ALL_DAY' } | null>(null);
  const [showFreightPool, setShowFreightPool] = useState<boolean>(false);
  const [showScheduleModal, setShowScheduleModal] = useState<{ freight: DeliveryRecord; date: string; slot: 'AM' | 'PM' } | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  const [selectedTruckSummary, setSelectedTruckSummary] = useState<{
    truckName: string;
    driverName: string;
    slot: 'AM' | 'PM';
    dateStr: string;
    deliveries: DeliveryRecord[];
  } | null>(null);

  // Form states for Admin Config Modal
  const [configBranchTarget, setConfigBranchTarget] = useState<string>('ALL');
  const [formDeliveryDays, setFormDeliveryDays] = useState<('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[]>(DEFAULT_DAYS);
  const [formAmRange, setFormAmRange] = useState('07:00 AM - 12:00 PM');
  const [formPmRange, setFormPmRange] = useState('12:00 PM - 05:00 PM');
  const [formAmCap, setFormAmCap] = useState(6);
  const [formPmCap, setFormPmCap] = useState(6);

  // Form states for Slot Closure Modal
  const [closureTypeForm, setClosureTypeForm] = useState<ClosureType>('CLOSED_ALL');
  const [closureReasonForm, setClosureReasonForm] = useState<string>('');

  // Pre-populate Closure Modal form when opened
  useEffect(() => {
    if (showClosureModal) {
      const { date, slot } = showClosureModal;
      const targetSlot = slot === 'ALL_DAY' ? 'AM' : slot;
      const existing = closureRules.find(r =>
        (r.branchId === 'ALL' || r.branchId === selectedBranchId) &&
        r.date === date &&
        (r.slot === 'ALL_DAY' || r.slot === targetSlot) &&
        r.closureType !== 'NONE'
      );
      if (existing) {
        setClosureTypeForm(existing.closureType);
        setClosureReasonForm(existing.reason || '');
      } else {
        setClosureTypeForm('CLOSED_ALL');
        setClosureReasonForm('');
      }
    }
  }, [showClosureModal, selectedBranchId, closureRules]);

  // Form states for Scheduling Freight onto Board
  const [schedDepotForm, setSchedDepotForm] = useState<string>('Windmill DC');
  const [schedCategoryForm, setSchedCategoryForm] = useState<'Retail' | 'Pro' | 'Transfer'>('Retail');
  const [schedTruckForm, setSchedTruckForm] = useState<string>('');
  const [schedDriverForm, setSchedDriverForm] = useState<string>('');
  const [schedPickerForm, setSchedPickerForm] = useState<string>('');

  // Sync form state when schedule modal opens
  useEffect(() => {
    if (showScheduleModal?.freight) {
      const f = showScheduleModal.freight;
      setSchedCategoryForm(f.deliveryCategory || 'Retail');
      const matchedTruck = trucks.find(t => t.id === f.assignedTruck || t.name === f.assignedTruck || t.truckNumber === f.assignedTruck) || trucks[0];
      const initialTruck = f.assignedTruck || matchedTruck?.name || matchedTruck?.id || '';
      setSchedTruckForm(initialTruck);
      
      const initialDriver = (f.assignedDriver && f.assignedDriver !== 'unassigned') 
        ? f.assignedDriver 
        : ((matchedTruck?.driver && matchedTruck.driver.toLowerCase() !== 'no driver' && matchedTruck.driver.toLowerCase() !== 'unassigned') ? matchedTruck.driver : '');
      setSchedDriverForm(initialDriver);

      const matchedBranch = branches.find(b => b.id === f.originBranch || b.name === f.originBranch);
      setSchedDepotForm(matchedBranch?.name || f.originBranch || selectedBranchId !== 'ALL' ? selectedBranchId : 'Windmill DC');
      setSchedPickerForm(f.assignedPicker || '');
    }
  }, [showScheduleModal, trucks, users, branches, selectedBranchId]);

  // Save configs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('prospaces_delivery_board_configs', JSON.stringify(storeConfigs));
    } catch (e) {
      console.error(e);
    }
  }, [storeConfigs]);

  // Save closure rules to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('prospaces_delivery_board_closures', JSON.stringify(closureRules));
    } catch (e) {
      console.error(e);
    }
  }, [closureRules]);

  // Active Store Config for current filter
  const activeConfig: StoreDeliveryConfig = storeConfigs[selectedBranchId] || storeConfigs['ALL'] || DEFAULT_STORE_CONFIG;

  // Date utilities
  const formatDateStr = (d: Date) => d.toISOString().split('T')[0];

  const getWeekDays = (refDate: Date) => {
    const start = new Date(refDate);
    const day = start.getDay();
    // Normalize to Monday start
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

  const currentWeekDays = getWeekDays(currentDate);

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') next.setDate(next.getDate() - 1);
    else if (viewMode === 'week') next.setDate(next.getDate() - 7);
    else if (viewMode === 'month') next.setMonth(next.getMonth() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') next.setDate(next.getDate() + 1);
    else if (viewMode === 'week') next.setDate(next.getDate() + 7);
    else if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  // Filter deliveries by selected store
  const filteredDeliveries = deliveries.filter(d => {
    if (selectedBranchId !== 'ALL') {
      const selectedBranch = branches.find(b => b.id === selectedBranchId || b.name === selectedBranchId);
      const branchName = selectedBranch?.name;
      const branchId = selectedBranch?.id || selectedBranchId;

      const matchesId = d.originBranch === branchId;
      const matchesName = branchName ? (d.originBranch === branchName || d.originBranch?.toLowerCase() === branchName.toLowerCase()) : false;
      const matchesRaw = d.originBranch === selectedBranchId;
      if (!matchesId && !matchesName && !matchesRaw) {
        return false;
      }
    }
    return true;
  });

  // Unassigned freight pool waiting to be scheduled into Delivery Board slots
  const unassignedFreight = useMemo(() => {
    return deliveries.filter(d => {
      // 1. Exclude delivered or returned
      if (d.status === DeliveryStatus.DELIVERED || d.status === DeliveryStatus.RETURNED) {
        return false;
      }

      // 2. Unassigned truck check
      const trk = (d.assignedTruck || '').trim().toLowerCase();
      const isUnassignedTruck = !trk || trk === 'unassigned' || trk === 'no truck' || trk === 'none';

      // 3. If assigned to a valid truck AND scheduled, it's not unassigned
      if (!isUnassignedTruck && d.scheduledDate && d.assignedTruck) {
        return false;
      }

      // 4. Store filter check (only filter out if selected store is strictly set AND delivery origin mismatch)
      if (selectedBranchId !== 'ALL') {
        const selectedBranch = branches.find(b => b.id === selectedBranchId || b.name === selectedBranchId);
        const branchName = selectedBranch?.name?.toLowerCase();
        const branchId = selectedBranch?.id?.toLowerCase() || selectedBranchId.toLowerCase();
        const dOrigin = (d.originBranch || '').toLowerCase();

        if (dOrigin && dOrigin !== branchId && dOrigin !== branchName && dOrigin !== selectedBranchId.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [deliveries, selectedBranchId, branches]);

  // Unload single delivery back to Unassigned Freight Pool
  const handleUnloadDelivery = (delivery: DeliveryRecord) => {
    const updated: DeliveryRecord = {
      ...delivery,
      assignedTruck: 'unassigned',
      status: DeliveryStatus.REGISTERED,
      scheduledDate: undefined,
      scheduledSlot: undefined,
      history: [
        ...(delivery.history || []),
        {
          status: DeliveryStatus.REGISTERED,
          timestamp: new Date().toISOString(),
          location: delivery.originBranch || 'Store Dispatch',
          operator: currentUser?.name || 'Dispatcher',
          notes: `Unloaded cargo from truck and returned to Unassigned Freight Pool`
        }
      ]
    };
    onUpdateDelivery(updated);
  };

  // Unload all cargo from a truck for a given date and slot
  const handleUnloadTruckSlot = (truck: Truck, dateStr: string, slot: 'AM' | 'PM') => {
    const trkName = (truck.name || '').toLowerCase();
    const trkId = (truck.id || '').toLowerCase();
    const trkNum = (truck.truckNumber || '').toLowerCase();

    const toUnload = deliveries.filter(d => {
      const dDate = d.scheduledDate ? d.scheduledDate.split('T')[0] : '';
      const dSlot = d.scheduledSlot || 'AM';
      const dTrk = (d.assignedTruck || '').toLowerCase();
      const matchesTruck = dTrk === trkId || dTrk === trkName || dTrk === trkNum;
      return matchesTruck && dDate === dateStr && dSlot === slot;
    });

    toUnload.forEach(d => {
      handleUnloadDelivery(d);
    });
  };

  // Drag and drop assignment onto a truck slot
  const handleDropOnTruck = (deliveryId: string, truck: Truck, dateStr: string, slot: 'AM' | 'PM') => {
    const freight = deliveries.find(d => d.id === deliveryId);
    if (!freight) return;

    const updated: DeliveryRecord = {
      ...freight,
      assignedTruck: truck.name || truck.id,
      assignedDriver: (truck.driver && truck.driver.toLowerCase() !== 'no driver' && truck.driver.toLowerCase() !== 'unassigned') ? truck.driver : freight.assignedDriver,
      originBranch: freight.originBranch || truck.branchId || 'Windmill DC',
      scheduledDate: dateStr,
      scheduledSlot: slot,
      status: DeliveryStatus.PICKED_AND_LOADED,
      history: [
        ...(freight.history || []),
        {
          status: DeliveryStatus.PICKED_AND_LOADED,
          timestamp: new Date().toISOString(),
          location: freight.originBranch || 'Store Dispatch',
          operator: currentUser?.name || 'Dispatcher',
          notes: `Assigned & loaded onto truck ${truck.name || truck.id} for ${dateStr} (${slot} block)`
        }
      ]
    };
    onUpdateDelivery(updated);
  };

  // Get closure rule for date & slot
  const getClosureRule = (dateStr: string, slot: 'AM' | 'PM') => {
    return closureRules.find(r => 
      (r.branchId === 'ALL' || r.branchId === selectedBranchId) &&
      r.date === dateStr &&
      (r.slot === 'ALL_DAY' || r.slot === slot) &&
      r.closureType !== 'NONE'
    );
  };

  // Check if a date is an available delivery day for the active store configuration
  const isAvailableDeliveryDay = (targetDateStr: string) => {
    const targetDate = new Date(targetDateStr + 'T00:00:00');
    const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'short' });

    // Check if day is in active store's delivery days
    if (!activeConfig.deliveryDays.includes(dayName as any)) {
      return false;
    }

    // Check if date has full day closure rule
    const allDayRule = closureRules.find(r => 
      (r.branchId === 'ALL' || r.branchId === selectedBranchId) &&
      r.date === targetDateStr &&
      r.slot === 'ALL_DAY' &&
      r.closureType === 'CLOSED_ALL'
    );
    if (allDayRule) return false;

    const amRule = getClosureRule(targetDateStr, 'AM');
    const pmRule = getClosureRule(targetDateStr, 'PM');
    if (amRule?.closureType === 'CLOSED_ALL' && pmRule?.closureType === 'CLOSED_ALL') {
      return false;
    }

    return true;
  };

  // Find the next available delivery day starting on or after startSearchDateStr
  const getNextAvailableDeliveryDay = (startSearchDateStr: string): string => {
    if (!startSearchDateStr) return formatDateStr(new Date());
    let curr = new Date(startSearchDateStr + 'T00:00:00');
    for (let i = 0; i < 60; i++) {
      const candidateStr = formatDateStr(curr);
      if (isAvailableDeliveryDay(candidateStr)) {
        return candidateStr;
      }
      curr.setDate(curr.getDate() + 1);
    }
    return startSearchDateStr;
  };

  // Get deliveries for specific date & slot
  const getSlotDeliveries = (dateStr: string, slot: 'AM' | 'PM') => {
    const todayStr = formatDateStr(new Date());

    return filteredDeliveries.filter(d => {
      let effectiveDate = '';
      const isCompleted = d.status === DeliveryStatus.DELIVERED || d.status === DeliveryStatus.RETURNED;

      if (isCompleted) {
        // Completed or returned deliveries stay on their completion / scheduled / registered date
        if (d.deliveredAt) {
          effectiveDate = d.deliveredAt.split('T')[0];
        } else if (d.scheduledDate) {
          effectiveDate = d.scheduledDate.split('T')[0];
        } else if (d.registeredAt) {
          effectiveDate = d.registeredAt.split('T')[0];
        }
      } else {
        // Incomplete / active deliveries:
        // Original date is scheduledDate or registeredAt date
        const origDate = d.scheduledDate 
          ? d.scheduledDate.split('T')[0] 
          : (d.registeredAt ? d.registeredAt.split('T')[0] : '');

        if (origDate) {
          // If the delivery was not completed on its registered/scheduled date, or if its original date was closed,
          // automatically roll forward to the Next Available Delivery Day on or after max(origDate, todayStr)
          const startSearchDate = origDate < todayStr ? todayStr : origDate;
          effectiveDate = getNextAvailableDeliveryDay(startSearchDate);
        }
      }

      if (effectiveDate !== dateStr) return false;

      // Determine slot
      if (d.scheduledSlot) {
        return d.scheduledSlot === slot;
      }
      const hour = new Date(d.registeredAt || Date.now()).getHours();
      return slot === 'AM' ? hour < 12 : hour >= 12;
    });
  };

  // Save Store Config Handler
  const handleSaveConfig = () => {
    const updated: StoreDeliveryConfig = {
      branchId: configBranchTarget,
      deliveryDays: formDeliveryDays,
      amTimeRange: formAmRange,
      pmTimeRange: formPmRange,
      amMaxCap: formAmCap,
      pmMaxCap: formPmCap,
      cutoffTime: '16:00',
      allowOverbooking: false,
    };
    const newConfigs = {
      ...storeConfigs,
      [configBranchTarget]: updated
    };
    setStoreConfigs(newConfigs);
    try {
      localStorage.setItem('prospaces_delivery_board_configs', JSON.stringify(newConfigs));
    } catch (e) {}
    if (onUpdateStoreConfigs) {
      onUpdateStoreConfigs(newConfigs);
    }
    setShowConfigModal(false);
  };

  // Save Closure Rule
  const handleSaveClosureRule = () => {
    if (!showClosureModal) return;
    const { date, slot } = showClosureModal;

    const filtered = closureRules.filter(r => !(r.date === date && (r.slot === slot || slot === 'ALL_DAY')));

    let newRules: SlotClosureRule[];
    if (closureTypeForm !== 'NONE') {
      const newRule: SlotClosureRule = {
        id: `rule-${Date.now()}`,
        branchId: selectedBranchId,
        date,
        slot,
        closureType: closureTypeForm,
        reason: closureReasonForm,
        closedBy: currentUser?.name || 'Dispatcher',
        createdAt: new Date().toISOString()
      };
      newRules = [...filtered, newRule];
    } else {
      newRules = filtered;
    }
    setClosureRules(newRules);
    try {
      localStorage.setItem('prospaces_delivery_board_closures', JSON.stringify(newRules));
    } catch (e) {}
    if (onUpdateClosureRules) {
      onUpdateClosureRules(newRules);
    }
    setShowClosureModal(null);
  };

  // Schedule Delivery onto Slot
  const handleConfirmSchedule = () => {
    if (!showScheduleModal) return;
    const { freight, date, slot } = showScheduleModal;

    // Check non-delivery day
    const dayName = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
    if (!activeConfig.deliveryDays.includes(dayName as any)) {
      alert(`Cannot schedule: ${date} (${dayName}) is configured as a Non-Delivery Day in Store Setup.`);
      return;
    }

    // Check slot closure rule
    const rule = getClosureRule(date, slot);
    if (rule) {
      if (rule.closureType === 'CLOSED_ALL') {
        alert(`Cannot schedule: ${date} (${slot}) is CLOSED to ALL deliveries.\nReason: ${rule.reason || 'Operational restriction'}`);
        return;
      }
      if (rule.closureType === 'CLOSED_RETAIL' && schedCategoryForm === 'Retail') {
        alert(`Cannot schedule: ${date} (${slot}) is CLOSED to Retail Deliveries.\nReason: ${rule.reason || 'Pro freight priority'}`);
        return;
      }
      if (rule.closureType === 'CLOSED_PRO' && schedCategoryForm === 'Pro') {
        alert(`Cannot schedule: ${date} (${slot}) is CLOSED to Pro Deliveries.\nReason: ${rule.reason || 'Retail capacity restriction'}`);
        return;
      }
    }

    const updated: DeliveryRecord = {
      ...freight,
      originBranch: schedDepotForm || freight.originBranch || 'Windmill DC',
      scheduledDate: date,
      scheduledSlot: slot,
      deliveryCategory: schedCategoryForm,
      assignedTruck: schedTruckForm || freight.assignedTruck,
      assignedDriver: schedDriverForm || freight.assignedDriver,
      assignedPicker: schedPickerForm.trim() || freight.assignedPicker || 'Unassigned',
      status: DeliveryStatus.PICKED_AND_LOADED,
      history: [
        ...(freight.history || []),
        {
          status: DeliveryStatus.PICKED_AND_LOADED,
          timestamp: new Date().toISOString(),
          location: schedDepotForm || freight.originBranch || 'Store Dispatch',
          operator: schedPickerForm.trim() || currentUser?.name || 'Dispatcher',
          notes: `Scheduled on Delivery Board for ${date} (${slot} Slot) at ${schedDepotForm || 'Depot'}. Truck: ${schedTruckForm || 'Unassigned'}, Picker: ${schedPickerForm.trim() || 'Unassigned'}`
        }
      ]
    };

    onUpdateDelivery(updated);
    setShowScheduleModal(null);
  };

  // Unschedule Delivery
  const handleUnscheduleDelivery = (del: DeliveryRecord) => {
    const updated: DeliveryRecord = {
      ...del,
      scheduledDate: undefined,
      scheduledSlot: undefined,
      status: DeliveryStatus.REGISTERED,
      history: [
        ...(del.history || []),
        {
          status: DeliveryStatus.REGISTERED,
          timestamp: new Date().toISOString(),
          location: del.originBranch || 'Store Dispatch',
          operator: currentUser?.name || 'Dispatcher',
          notes: 'Removed from Delivery Board back to Freight Pool'
        }
      ]
    };
    onUpdateDelivery(updated);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-800 min-h-screen font-sans">
      
      {/* TOP BAR / CONTROL HEADER */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 sticky top-0 z-30 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5 max-w-5xl mx-auto">
          
          {/* Title & View Mode Switcher */}
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 sm:p-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 shrink-0">
              <CalendarIcon className="h-4 sm:h-5 w-4 sm:w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900">Delivery Board</h1>
                <span className="bg-blue-100 text-blue-800 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full uppercase">
                  ProSpaces
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 hidden sm:block">
                Visual slot capacity & scheduling per store
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            
            {/* Store Picker Dropdown */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl px-2 py-1.5 sm:px-2.5">
              <Store className="h-3.5 w-3.5 text-slate-500 mr-1 shrink-0" />
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent text-[11px] sm:text-xs font-bold text-slate-700 focus:outline-none cursor-pointer pr-1"
              >
                <option value="ALL">All Stores</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name || b.branchName}
                  </option>
                ))}
              </select>
            </div>

            {/* View Modes */}
            <div className="flex bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('week')}
                className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold rounded-lg transition-all min-h-[32px] ${
                  viewMode === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold rounded-lg transition-all min-h-[32px] ${
                  viewMode === 'day' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Day
              </button>
            </div>

            {/* Admin Store Setup */}
            {isDispatcherOrAdmin && (
              <button
                onClick={() => {
                  setConfigBranchTarget(selectedBranchId);
                  setFormDeliveryDays(activeConfig.deliveryDays);
                  setFormAmRange(activeConfig.amTimeRange);
                  setFormPmRange(activeConfig.pmTimeRange);
                  setFormAmCap(activeConfig.amMaxCap);
                  setFormPmCap(activeConfig.pmMaxCap);
                  setShowConfigModal(true);
                }}
                className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-[11px] sm:text-xs font-bold transition-all min-h-[32px]"
              >
                <Settings className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Store Setup</span>
              </button>
            )}

            {/* Unassigned Freight Drawer Toggle */}
            <button
              onClick={() => setShowFreightPool(!showFreightPool)}
              className={`relative flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all border min-h-[32px] ${
                showFreightPool
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <Package className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>Freight</span>
              {unassignedFreight.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {unassignedFreight.length}
                </span>
              )}
            </button>

          </div>

        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-2.5 sm:p-4 flex flex-col md:flex-row gap-4 overflow-x-hidden overflow-y-auto">
        
        {/* BOARD VIEW CANVAS */}
        <div className="flex-1 space-y-4 min-w-0">

          {/* ==================== WEEK SUMMARY VIEW (MOCKUP 1 EXACT RECREATION) ==================== */}
          {viewMode === 'week' && (
            <div className="space-y-3">
              
              {/* Date Header with Arrows & Filter */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <button
                    onClick={handlePrev}
                    className="p-2 sm:p-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-2xs cursor-pointer active:scale-95 min-h-[36px] min-w-[36px] flex items-center justify-center"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 px-0.5 sm:px-1">
                    Week of {currentWeekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {currentWeekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <button
                    onClick={handleNext}
                    className="p-2 sm:p-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-2xs cursor-pointer active:scale-95 min-h-[36px] min-w-[36px] flex items-center justify-center"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs min-h-[36px]"
                  >
                    <Filter className="h-3.5 w-3.5 text-slate-500" />
                    <span>Filter</span>
                  </button>

                  {showFilterDropdown && (
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-20 space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 px-2 uppercase">Filter by Store</div>
                      <button
                        onClick={() => { setSelectedBranchId('ALL'); setShowFilterDropdown(false); }}
                        className={`w-full text-left px-2 py-1.5 text-xs rounded-lg font-medium ${selectedBranchId === 'ALL' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}
                      >
                        All Stores
                      </button>
                      {branches.map(b => (
                        <button
                          key={b.id}
                          onClick={() => { setSelectedBranchId(b.id); setShowFilterDropdown(false); }}
                          className={`w-full text-left px-2 py-1.5 text-xs rounded-lg font-medium ${selectedBranchId === b.id ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}
                        >
                          {b.name || b.branchName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Day Cards List (Matching Mockup 1) */}
              <div className="space-y-2.5">
                {currentWeekDays.map(dayDate => {
                  const dateStr = formatDateStr(dayDate);
                  const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
                  const monthDay = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                  const isDeliveryDay = activeConfig.deliveryDays.includes(dayName as any);

                  const amDeliveries = getSlotDeliveries(dateStr, 'AM');
                  const pmDeliveries = getSlotDeliveries(dateStr, 'PM');

                  const amRule = getClosureRule(dateStr, 'AM');
                  const pmRule = getClosureRule(dateStr, 'PM');

                  const amCap = activeConfig.amMaxCap;
                  const pmCap = activeConfig.pmMaxCap;

                  return (
                    <div
                      key={dateStr}
                      onClick={() => {
                        setCurrentDate(dayDate);
                        setViewMode('day');
                      }}
                      className={`bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 group ${
                        !isDeliveryDay ? 'bg-slate-50/50' : ''
                      }`}
                    >
                      {/* Left: Day Label */}
                      <div className="w-full sm:w-20 shrink-0 flex sm:flex-col items-center sm:items-start justify-between">
                        <div className="flex items-baseline space-x-1.5 sm:space-x-0 sm:block">
                          <div className={`text-sm font-black ${isDeliveryDay ? 'text-slate-900' : 'text-slate-500'}`}>{dayName}</div>
                          <div className="text-xs text-slate-400 font-medium">{monthDay}</div>
                        </div>
                        <div className="sm:hidden text-xs font-bold text-blue-600 flex items-center space-x-1">
                          <span>View Detail</span>
                          <ChevronRightIcon className="h-3.5 w-3.5" />
                        </div>
                      </div>

                      {/* Middle: AM & PM Progress Rows */}
                      <div className="flex-1 w-full mx-0 sm:mx-2 space-y-2">
                        
                        {/* AM Row */}
                        <div className="flex items-center space-x-2.5 sm:space-x-3">
                          <span className="text-xs font-extrabold text-slate-400 w-6 shrink-0">AM</span>
                          {!isDeliveryDay ? (
                            <div className="flex items-center space-x-2">
                              <span className="text-[11px] font-black px-2 py-0.5 rounded-md border flex items-center space-x-1 shadow-2xs bg-slate-100 text-slate-600 border-slate-300">
                                <Lock className="h-3 w-3 shrink-0 text-slate-400" />
                                <span>Closed (Non-Delivery Day)</span>
                              </span>
                            </div>
                          ) : amRule ? (
                            <div className="flex items-center space-x-2">
                              <span className={`text-[11px] font-black px-2 py-0.5 rounded-md border flex items-center space-x-1 shadow-2xs ${
                                amRule.closureType === 'CLOSED_RETAIL'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : amRule.closureType === 'CLOSED_PRO'
                                  ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                                  : 'bg-rose-100 text-rose-800 border-rose-200'
                              }`}>
                                <Lock className="h-3 w-3 shrink-0" />
                                <span>
                                  {amRule.closureType === 'CLOSED_RETAIL'
                                    ? 'Closed for Retail'
                                    : amRule.closureType === 'CLOSED_PRO'
                                    ? 'Closed for Pro'
                                    : 'Closed'}
                                </span>
                              </span>
                              {amDeliveries.length > 0 && (
                                <span className="text-[10px] font-bold text-slate-500">
                                  ({amDeliveries.length} booked)
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-[#1e40af] h-full rounded-full transition-all"
                                style={{ width: `${Math.min((amDeliveries.length / amCap) * 100, 100)}%` }}
                              ></div>
                            </div>
                          )}
                        </div>

                        {/* PM Row */}
                        <div className="flex items-center space-x-2.5 sm:space-x-3">
                          <span className="text-xs font-extrabold text-slate-400 w-6 shrink-0">PM</span>
                          {!isDeliveryDay ? (
                            <div className="flex items-center space-x-2">
                              <span className="text-[11px] font-black px-2 py-0.5 rounded-md border flex items-center space-x-1 shadow-2xs bg-slate-100 text-slate-600 border-slate-300">
                                <Lock className="h-3 w-3 shrink-0 text-slate-400" />
                                <span>Closed (Non-Delivery Day)</span>
                              </span>
                            </div>
                          ) : pmRule ? (
                            <div className="flex items-center space-x-2">
                              <span className={`text-[11px] font-black px-2 py-0.5 rounded-md border flex items-center space-x-1 shadow-2xs ${
                                pmRule.closureType === 'CLOSED_RETAIL'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : pmRule.closureType === 'CLOSED_PRO'
                                  ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                                  : 'bg-rose-100 text-rose-800 border-rose-200'
                              }`}>
                                <Lock className="h-3 w-3 shrink-0" />
                                <span>
                                  {pmRule.closureType === 'CLOSED_RETAIL'
                                    ? 'Closed for Retail'
                                    : pmRule.closureType === 'CLOSED_PRO'
                                    ? 'Closed for Pro'
                                    : 'Closed'}
                                </span>
                              </span>
                              {pmDeliveries.length > 0 && (
                                <span className="text-[10px] font-bold text-slate-500">
                                  ({pmDeliveries.length} booked)
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  pmDeliveries.length === 0 ? 'bg-[#86efac]' : pmDeliveries.length >= pmCap ? 'bg-[#1e40af]' : 'bg-[#15803d]'
                                }`}
                                style={{ width: `${Math.min((pmDeliveries.length / pmCap) * 100, 100)}%` }}
                              ></div>
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Right: Slot Counts & Chevron */}
                      <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-left sm:text-right text-xs font-bold flex sm:block space-x-3 sm:space-x-0 space-y-0 sm:space-y-1">
                          <div>
                            <span className="text-[10px] font-normal text-slate-400 inline sm:hidden mr-1">AM:</span>
                            {!isDeliveryDay || (amRule && amRule.closureType === 'CLOSED_ALL') ? (
                              <span className="text-slate-400 font-extrabold">--</span>
                            ) : (
                              <span className="text-[#2563eb]">{amDeliveries.length}/{amCap}</span>
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] font-normal text-slate-400 inline sm:hidden mr-1">PM:</span>
                            {!isDeliveryDay || (pmRule && pmRule.closureType === 'CLOSED_ALL') ? (
                              <span className="text-slate-400 font-extrabold">--</span>
                            ) : (
                              <span className={pmDeliveries.length === 0 ? 'text-[#15803d]' : 'text-[#2563eb]'}>
                                {pmDeliveries.length}/{pmCap}
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronRightIcon className="hidden sm:block h-4 w-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* ==================== DAY DETAIL VIEW (MOCKUP 2 EXACT RECREATION) ==================== */}
          {viewMode === 'day' && (
            <div className="space-y-4">
              
              {/* Day Header with Back Arrow */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setViewMode('week')}
                  className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 transition-all shadow-2xs"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {getSlotDeliveries(formatDateStr(currentDate), 'AM').length + getSlotDeliveries(formatDateStr(currentDate), 'PM').length} deliveries scheduled
                  </p>
                </div>
              </div>

              {(() => {
                const dateStr = formatDateStr(currentDate);
                const amDeliveries = getSlotDeliveries(dateStr, 'AM');
                const pmDeliveries = getSlotDeliveries(dateStr, 'PM');
                const amRule = getClosureRule(dateStr, 'AM');
                const pmRule = getClosureRule(dateStr, 'PM');
                const amCap = activeConfig.amMaxCap;
                const pmCap = activeConfig.pmMaxCap;

                const amOpenSlots = amCap - amDeliveries.length;
                const pmOpenSlots = pmCap - pmDeliveries.length;

                const selectedBranchObj = selectedBranchId === 'ALL'
                  ? null
                  : (branches || []).find(b => b.id === selectedBranchId || b.name === selectedBranchId) || { id: selectedBranchId, name: selectedBranchId };

                const displayTrucks = selectedBranchId === 'ALL'
                  ? trucks.filter(t => t.isActive !== false)
                  : trucks.filter(t => t.isActive !== false && isTruckAssignedToBranch(t, selectedBranchObj));

                const fleet = displayTrucks;

                return (
                  <div className="space-y-6">
                    
                    {/* AM SECTION */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-extrabold text-slate-900">AM Morning Delivery Fleet</h3>
                            {isDispatcherOrAdmin && (
                              <button
                                onClick={() => setShowClosureModal({ date: dateStr, slot: 'AM' })}
                                className="text-[11px] font-bold text-slate-400 hover:text-slate-700 underline ml-2"
                              >
                                {amRule ? 'Edit Restriction' : 'Close Slot'}
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">morning block ({activeConfig.amTimeRange})</p>
                        </div>

                        {amRule ? (
                          <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-1 rounded-full border border-rose-200">
                            {amRule.closureType === 'CLOSED_ALL' ? 'Closed' : amRule.closureType === 'CLOSED_RETAIL' ? 'Pro Only' : 'Retail Only'}
                          </span>
                        ) : amOpenSlots <= 0 ? (
                          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">
                            Fully booked
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                            {amOpenSlots} slots open
                          </span>
                        )}
                      </div>

                      {/* Top Accent Bar */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#15803d] h-full rounded-full transition-all"
                          style={{ width: `${Math.min((amDeliveries.length / amCap) * 100, 100)}%` }}
                        ></div>
                      </div>

                      {/* Fleet Capacity Truck Cards */}
                      <div className="space-y-3">
                        {fleet.length === 0 ? (
                          <div className="p-4 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 font-medium">
                            No registered vehicles available in fleet.
                          </div>
                        ) : (
                          fleet.map((truck) => {
                            const trkId = (truck.id || '').toLowerCase();
                            const trkName = (truck.name || '').toLowerCase();
                            const trkNum = (truck.truckNumber || '').toLowerCase();

                            const loadedDeliveries = amDeliveries.filter(d => {
                              const dTrk = (d.assignedTruck || '').toLowerCase();
                              return dTrk === trkId || dTrk === trkName || dTrk === trkNum;
                            });

                            const loadedWeight = loadedDeliveries.reduce((sum, d) => sum + parseWeightLbs(d.weight), 0);
                            const maxCapacity = getTruckMaxCapacityLbs(truck);
                            const fillPct = Math.min(100, Math.round((loadedWeight / maxCapacity) * 100));

                            const slotKey = `${truck.id}_${dateStr}_AM`;
                            const isManualFull = !!(
                              effectiveManualFullTrucks[slotKey] || 
                              effectiveManualFullTrucks[`${truck.id}_${dateStr}_ALL`] || 
                              effectiveManualFullTrucks[`${truck.id}_ALL_DATES_AM`] || 
                              effectiveManualFullTrucks[`${truck.id}_ALL_DATES_ALL`] || 
                              effectiveManualFullTrucks[truck.id]
                            );
                            const isFull = isManualFull || fillPct >= 95;
                            const isExpanded = expandedTruckSlots[slotKey] || false;

                            const driverName = (truck.driver && truck.driver.toLowerCase() !== 'no driver' && truck.driver.toLowerCase() !== 'unassigned')
                              ? truck.driver
                              : 'No Driver Assigned';

                            const branchObj = branches.find(b => b.id === truck.branchId);
                            const depotName = branchObj ? (branchObj.name || branchObj.id) : (truck.branchId || 'Windmill DC');

                            return (
                              <div
                                key={`am_${truck.id}`}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  setDragOverZone(`am_${truck.id}`);
                                }}
                                onDragLeave={() => setDragOverZone(null)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setDragOverZone(null);
                                  const delId = e.dataTransfer.getData('text/plain') || draggedFreightId;
                                  if (delId) handleDropOnTruck(delId, truck, dateStr, 'AM');
                                }}
                                className={`rounded-xl border p-3.5 transition-all ${
                                  dragOverZone === `am_${truck.id}`
                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/50 scale-[1.01]'
                                    : isFull
                                    ? 'border-amber-300 bg-amber-50/60'
                                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                  {/* SVG Truck Graphic */}
                                  <div className="shrink-0">
                                    <TruckGraphic fillPct={fillPct} isFull={isFull} truckId={`AM_${truck.id}`} />
                                  </div>

                                  {/* Truck info & driver */}
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2 truncate">
                                        <span className="font-mono font-black text-sm text-slate-900 truncate">
                                          {truck.name}
                                        </span>
                                        <span className="text-slate-400 font-mono">•</span>
                                        <span className="text-xs font-semibold text-slate-500 truncate">
                                          {truck.type || truck.model || 'Commercial Carrier'}
                                        </span>
                                      </div>

                                      {/* Status Badge */}
                                      {isFull ? (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-amber-500 text-slate-950 uppercase shadow-2xs flex items-center space-x-1 shrink-0">
                                          <Lock className="h-3 w-3" />
                                          <span>FULL</span>
                                        </span>
                                      ) : (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200 uppercase flex items-center space-x-1 shrink-0">
                                          <Unlock className="h-3 w-3 text-emerald-600" />
                                          <span>OPEN</span>
                                        </span>
                                      )}
                                    </div>

                                    <p className="text-xs text-slate-600 truncate">
                                      <span className="font-bold text-slate-800">{driverName}</span>
                                      <span className="text-slate-400 mx-1.5">•</span>
                                      <span className="text-slate-500 font-mono text-[11px]">Depot: {depotName}</span>
                                    </p>

                                    {/* Weight progress capacity */}
                                    <div className="flex items-center justify-between pt-1 font-mono text-xs">
                                      <span className="font-bold text-slate-700">
                                        {loadedWeight.toLocaleString()} / {maxCapacity.toLocaleString()} lbs
                                      </span>
                                      <span className={`font-black text-xs ${isFull ? 'text-amber-600' : 'text-slate-800'}`}>
                                        {fillPct}% Capacity
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Card Actions Row */}
                                <div className="mt-3 border-t border-slate-100 pt-2.5 flex items-center justify-between text-xs flex-wrap gap-2">
                                  <div className="flex items-center space-x-2">
                                    {/* Mark Truck Full button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const isCurrentlyFull = isManualFull;
                                        const targetVal = !isCurrentlyFull;
                                        const next = { ...effectiveManualFullTrucks };
                                        if (targetVal) {
                                          next[slotKey] = true;
                                        } else {
                                          delete next[slotKey];
                                          delete next[`${truck.id}_${dateStr}_ALL`];
                                          delete next[`${truck.id}_ALL_DATES_AM`];
                                          delete next[`${truck.id}_ALL_DATES_ALL`];
                                          delete next[truck.id];
                                        }
                                        if (onUpdateManualFullTrucks) {
                                          onUpdateManualFullTrucks(next);
                                        } else {
                                          setLocalManualFullTrucks(next);
                                        }
                                      }}
                                      className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                        isManualFull
                                          ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                          : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                                      }`}
                                    >
                                      {isManualFull ? 'Re-open Capacity' : 'Mark Truck Full'}
                                    </button>

                                    {/* Unload Capacity / Clear truck button */}
                                    {loadedDeliveries.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleUnloadTruckSlot(truck, dateStr, 'AM')}
                                        className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all flex items-center space-x-1 cursor-pointer"
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                        <span>Unload Capacity</span>
                                      </button>
                                    )}
                                  </div>

                                  {/* View Cargo toggle */}
                                  {loadedDeliveries.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedTruckSlots(prev => ({ ...prev, [slotKey]: !prev[slotKey] }))}
                                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 font-mono cursor-pointer"
                                    >
                                      <span>{isExpanded ? 'Hide Manifest' : `View Cargo (${loadedDeliveries.length})`}</span>
                                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-mono italic">Drag freight here or click + to load</span>
                                  )}
                                </div>

                                {/* Expanded Cargo Manifest */}
                                {isExpanded && loadedDeliveries.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-slate-200 bg-slate-50/80 p-3 rounded-xl space-y-2">
                                    <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                                      <span>Loaded Cargo Manifest ({loadedDeliveries.length} orders)</span>
                                      <span className="font-mono text-slate-500">{loadedWeight.toLocaleString()} lbs total</span>
                                    </div>
                                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                                      {loadedDeliveries.map(del => (
                                        <div key={del.id} className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                                          <div className="space-y-0.5 min-w-0 pr-2">
                                            <div className="flex items-center space-x-2">
                                              <span className="font-mono font-bold text-blue-700">{del.invoiceNumber || del.epicorSalesOrder || del.id}</span>
                                              <span className="font-extrabold text-slate-900 truncate">{del.customerName}</span>
                                            </div>
                                            <div className="text-[11px] text-slate-500 truncate">{del.deliveryAddress}</div>
                                          </div>
                                          <div className="flex items-center space-x-2 shrink-0">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                                              {del.weight ? `${del.weight}` : 'Std Weight'}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleUnloadDelivery(del)}
                                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                              title="Unload / Unassign Order"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}

                      </div>

                    </div>

                    {/* PM SECTION */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-extrabold text-slate-900">PM Afternoon Delivery Fleet</h3>
                            {isDispatcherOrAdmin && (
                              <button
                                onClick={() => setShowClosureModal({ date: dateStr, slot: 'PM' })}
                                className="text-[11px] font-bold text-slate-400 hover:text-slate-700 underline ml-2"
                              >
                                {pmRule ? 'Edit Restriction' : 'Close Slot'}
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">afternoon block ({activeConfig.pmTimeRange})</p>
                        </div>

                        {pmRule ? (
                          <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-1 rounded-full border border-rose-200">
                            {pmRule.closureType === 'CLOSED_ALL' ? 'Closed' : pmRule.closureType === 'CLOSED_RETAIL' ? 'Pro Only' : 'Retail Only'}
                          </span>
                        ) : pmOpenSlots <= 0 ? (
                          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">
                            Fully booked
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                            {pmOpenSlots} slots open
                          </span>
                        )}
                      </div>

                      {/* Top Accent Bar */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#1e40af] h-full rounded-full transition-all"
                          style={{ width: `${Math.min((pmDeliveries.length / pmCap) * 100, 100)}%` }}
                        ></div>
                      </div>

                      {/* Fleet Capacity Truck Cards */}
                      <div className="space-y-3">
                        {fleet.length === 0 ? (
                          <div className="p-4 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 font-medium">
                            No registered vehicles available in fleet.
                          </div>
                        ) : (
                          fleet.map((truck) => {
                            const trkId = (truck.id || '').toLowerCase();
                            const trkName = (truck.name || '').toLowerCase();
                            const trkNum = (truck.truckNumber || '').toLowerCase();

                            const loadedDeliveries = pmDeliveries.filter(d => {
                              const dTrk = (d.assignedTruck || '').toLowerCase();
                              return dTrk === trkId || dTrk === trkName || dTrk === trkNum;
                            });

                            const loadedWeight = loadedDeliveries.reduce((sum, d) => sum + parseWeightLbs(d.weight), 0);
                            const maxCapacity = getTruckMaxCapacityLbs(truck);
                            const fillPct = Math.min(100, Math.round((loadedWeight / maxCapacity) * 100));

                            const slotKey = `${truck.id}_${dateStr}_PM`;
                            const isManualFull = !!(
                              effectiveManualFullTrucks[slotKey] || 
                              effectiveManualFullTrucks[`${truck.id}_${dateStr}_ALL`] || 
                              effectiveManualFullTrucks[`${truck.id}_ALL_DATES_PM`] || 
                              effectiveManualFullTrucks[`${truck.id}_ALL_DATES_ALL`] || 
                              effectiveManualFullTrucks[truck.id]
                            );
                            const isFull = isManualFull || fillPct >= 95;
                            const isExpanded = expandedTruckSlots[slotKey] || false;

                            const driverName = (truck.driver && truck.driver.toLowerCase() !== 'no driver' && truck.driver.toLowerCase() !== 'unassigned')
                              ? truck.driver
                              : 'No Driver Assigned';

                            const branchObj = branches.find(b => b.id === truck.branchId);
                            const depotName = branchObj ? (branchObj.name || branchObj.id) : (truck.branchId || 'Windmill DC');

                            return (
                              <div
                                key={`pm_${truck.id}`}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  setDragOverZone(`pm_${truck.id}`);
                                }}
                                onDragLeave={() => setDragOverZone(null)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setDragOverZone(null);
                                  const delId = e.dataTransfer.getData('text/plain') || draggedFreightId;
                                  if (delId) handleDropOnTruck(delId, truck, dateStr, 'PM');
                                }}
                                className={`rounded-xl border p-3.5 transition-all ${
                                  dragOverZone === `pm_${truck.id}`
                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/50 scale-[1.01]'
                                    : isFull
                                    ? 'border-amber-300 bg-amber-50/60'
                                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                  {/* SVG Truck Graphic */}
                                  <div className="shrink-0">
                                    <TruckGraphic fillPct={fillPct} isFull={isFull} truckId={`PM_${truck.id}`} />
                                  </div>

                                  {/* Truck info & driver */}
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2 truncate">
                                        <span className="font-mono font-black text-sm text-slate-900 truncate">
                                          {truck.name}
                                        </span>
                                        <span className="text-slate-400 font-mono">•</span>
                                        <span className="text-xs font-semibold text-slate-500 truncate">
                                          {truck.type || truck.model || 'Commercial Carrier'}
                                        </span>
                                      </div>

                                      {/* Status Badge */}
                                      {isFull ? (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-amber-500 text-slate-950 uppercase shadow-2xs flex items-center space-x-1 shrink-0">
                                          <Lock className="h-3 w-3" />
                                          <span>FULL</span>
                                        </span>
                                      ) : (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200 uppercase flex items-center space-x-1 shrink-0">
                                          <Unlock className="h-3 w-3 text-emerald-600" />
                                          <span>OPEN</span>
                                        </span>
                                      )}
                                    </div>

                                    <p className="text-xs text-slate-600 truncate">
                                      <span className="font-bold text-slate-800">{driverName}</span>
                                      <span className="text-slate-400 mx-1.5">•</span>
                                      <span className="text-slate-500 font-mono text-[11px]">Depot: {depotName}</span>
                                    </p>

                                    {/* Weight progress capacity */}
                                    <div className="flex items-center justify-between pt-1 font-mono text-xs">
                                      <span className="font-bold text-slate-700">
                                        {loadedWeight.toLocaleString()} / {maxCapacity.toLocaleString()} lbs
                                      </span>
                                      <span className={`font-black text-xs ${isFull ? 'text-amber-600' : 'text-slate-800'}`}>
                                        {fillPct}% Capacity
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Card Actions Row */}
                                <div className="mt-3 border-t border-slate-100 pt-2.5 flex items-center justify-between text-xs flex-wrap gap-2">
                                  <div className="flex items-center space-x-2">
                                    {/* Mark Truck Full button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const isCurrentlyFull = isManualFull;
                                        const targetVal = !isCurrentlyFull;
                                        const next = { ...effectiveManualFullTrucks };
                                        if (targetVal) {
                                          next[slotKey] = true;
                                        } else {
                                          delete next[slotKey];
                                          delete next[`${truck.id}_${dateStr}_ALL`];
                                          delete next[`${truck.id}_ALL_DATES_PM`];
                                          delete next[`${truck.id}_ALL_DATES_ALL`];
                                          delete next[truck.id];
                                        }
                                        if (onUpdateManualFullTrucks) {
                                          onUpdateManualFullTrucks(next);
                                        } else {
                                          setLocalManualFullTrucks(next);
                                        }
                                      }}
                                      className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                        isManualFull
                                          ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                          : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                                      }`}
                                    >
                                      {isManualFull ? 'Re-open Capacity' : 'Mark Truck Full'}
                                    </button>

                                    {/* Unload Capacity / Clear truck button */}
                                    {loadedDeliveries.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleUnloadTruckSlot(truck, dateStr, 'PM')}
                                        className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all flex items-center space-x-1 cursor-pointer"
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                        <span>Unload Capacity</span>
                                      </button>
                                    )}
                                  </div>

                                  {/* View Cargo toggle */}
                                  {loadedDeliveries.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedTruckSlots(prev => ({ ...prev, [slotKey]: !prev[slotKey] }))}
                                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 font-mono cursor-pointer"
                                    >
                                      <span>{isExpanded ? 'Hide Manifest' : `View Cargo (${loadedDeliveries.length})`}</span>
                                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-mono italic">Drag freight here or click + to load</span>
                                  )}
                                </div>

                                {/* Expanded Cargo Manifest */}
                                {isExpanded && loadedDeliveries.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-slate-200 bg-slate-50/80 p-3 rounded-xl space-y-2">
                                    <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                                      <span>Loaded Cargo Manifest ({loadedDeliveries.length} orders)</span>
                                      <span className="font-mono text-slate-500">{loadedWeight.toLocaleString()} lbs total</span>
                                    </div>
                                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                                      {loadedDeliveries.map(del => (
                                        <div key={del.id} className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                                          <div className="space-y-0.5 min-w-0 pr-2">
                                            <div className="flex items-center space-x-2">
                                              <span className="font-mono font-bold text-blue-700">{del.invoiceNumber || del.epicorSalesOrder || del.id}</span>
                                              <span className="font-extrabold text-slate-900 truncate">{del.customerName}</span>
                                            </div>
                                            <div className="text-[11px] text-slate-500 truncate">{del.deliveryAddress}</div>
                                          </div>
                                          <div className="flex items-center space-x-2 shrink-0">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                                              {del.weight ? `${del.weight}` : 'Std Weight'}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleUnloadDelivery(del)}
                                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                              title="Unload / Unassign Order"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}

                      </div>

                    </div>

                  </div>
                );
              })()}

            </div>
          )}



        </div>

        {/* ==================== UNASSIGNED FREIGHT DRAWER ==================== */}
        {showFreightPool && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end p-2 sm:p-4 md:p-0 md:static md:z-auto md:bg-transparent md:backdrop-blur-none animate-in fade-in duration-150">
            <aside className="w-full max-w-sm md:w-80 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col shadow-2xl md:shadow-lg shrink-0 h-full max-h-[85vh] md:max-h-none md:h-fit my-auto md:my-0">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-amber-600" />
                  <h3 className="text-xs font-black text-slate-900 uppercase">Unassigned Freight</h3>
                </div>
                <button
                  onClick={() => setShowFreightPool(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg min-h-[32px] min-w-[32px] flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-[11px] text-slate-500 mb-3 shrink-0">
                Unassigned freight pool waiting to be scheduled into Delivery Board slots.
              </p>

              <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-[500px]">
                {unassignedFreight.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                    <p className="text-xs font-bold text-slate-700">All Orders Scheduled!</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">No pending orders in freight pool.</p>
                  </div>
                ) : (
                  unassignedFreight.map(freight => (
                    <div
                      key={freight.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', freight.id);
                        setDraggedFreightId(freight.id);
                      }}
                      onDragEnd={() => {
                        setDraggedFreightId(null);
                        setDragOverZone(null);
                      }}
                      className="p-3 bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-white rounded-xl space-y-2 transition-all cursor-grab active:cursor-grabbing shadow-2xs hover:shadow-md group relative"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-1.5">
                          <GripVertical className="h-4 w-4 text-slate-400 group-hover:text-blue-500 shrink-0" />
                          <div>
                            <span className="text-xs font-black text-blue-700 font-mono">{freight.invoiceNumber || freight.epicorSalesOrder || freight.id}</span>
                            <div className="text-xs font-bold text-slate-900 line-clamp-1">{freight.customerName}</div>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 shrink-0">
                          {freight.deliveryCategory || 'Retail'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center pl-5">
                        <MapPin className="h-3 w-3 mr-1 text-slate-400 shrink-0" />
                        <span className="truncate">{freight.deliveryAddress}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 pl-5 text-[10px] text-slate-500 font-medium border-t border-slate-100">
                        <span>Depot: {freight.originBranch || 'Windmill DC'}</span>
                        <span className="font-bold text-slate-700">{freight.weight ? `${freight.weight}` : 'Standard'}</span>
                      </div>

                      <button
                        onClick={() => {
                          setShowScheduleModal({
                            freight,
                            date: formatDateStr(currentDate),
                            slot: 'AM'
                          });
                        }}
                        className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center space-x-1 min-h-[32px] shadow-2xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Schedule / Drag to Board</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </aside>
          </div>
        )}

      </div>

      {/* ==================== MODALS ==================== */}

      {/* ADMIN STORE SETUP MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase">Delivery Board Setup</h3>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Store</label>
                <select
                  value={configBranchTarget}
                  onChange={(e) => setConfigBranchTarget(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  <option value="ALL">All Stores (Global Default)</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name || b.branchName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Delivery Days of Week</label>
                <div className="flex flex-wrap gap-1.5">
                  {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map(day => {
                    const active = formDeliveryDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          if (active) setFormDeliveryDays(formDeliveryDays.filter(d => d !== day));
                          else setFormDeliveryDays([...formDeliveryDays, day]);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-900">AM Slot Range & Cap</span>
                  <input
                    type="text"
                    value={formAmRange}
                    onChange={(e) => setFormAmRange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs mt-1"
                    placeholder="07:00 AM - 12:00 PM"
                  />
                  <input
                    type="number"
                    min="1"
                    value={formAmCap}
                    onChange={(e) => setFormAmCap(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs mt-1"
                  />
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-900">PM Slot Range & Cap</span>
                  <input
                    type="text"
                    value={formPmRange}
                    onChange={(e) => setFormPmRange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs mt-1"
                    placeholder="12:00 PM - 05:00 PM"
                  />
                  <input
                    type="number"
                    min="1"
                    value={formPmCap}
                    onChange={(e) => setFormPmCap(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs mt-1"
                  />
                </div>
              </div>

            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg"
              >
                Save Setup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISPATCHER SLOT CLOSURE MODAL */}
      {showClosureModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lock className="h-4 w-4 text-rose-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase">Close Slot ({showClosureModal.slot})</h3>
              </div>
              <button onClick={() => setShowClosureModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-600 font-medium">
                Select restriction type for <span className="font-bold">{showClosureModal.date} ({showClosureModal.slot})</span>:
              </p>

              <div className="space-y-1.5">
                {[
                  { id: 'NONE', label: 'Open Slot', desc: 'Allow all deliveries' },
                  { id: 'CLOSED_ALL', label: 'Close to ALL Deliveries', desc: 'Block all retail & pro orders' },
                  { id: 'CLOSED_RETAIL', label: 'Close to Retail Deliveries', desc: 'Pro accounts only' },
                  { id: 'CLOSED_PRO', label: 'Close to Pro Deliveries', desc: 'Retail orders only' },
                ].map(opt => (
                  <label key={opt.id} className="flex items-start space-x-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100">
                    <input
                      type="radio"
                      name="closureType"
                      value={opt.id}
                      checked={closureTypeForm === opt.id}
                      onChange={() => setClosureTypeForm(opt.id as ClosureType)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">{opt.label}</div>
                      <div className="text-[10px] text-slate-500">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason Note</label>
                <input
                  type="text"
                  value={closureReasonForm}
                  onChange={(e) => setClosureReasonForm(e.target.value)}
                  placeholder="e.g. Weather delay / Fleet maintenance"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => setShowClosureModal(null)}
                className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveClosureRule}
                className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg"
              >
                Apply Restriction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-0">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-600/30 border border-blue-500/30 rounded-xl text-blue-300">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Dispatch Ticket & Select Picker</h3>
                  <p className="text-[11px] text-slate-400">Assign Depot, Truck, Schedule, & Picker</p>
                </div>
              </div>
              <button 
                onClick={() => setShowScheduleModal(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Freight Info Card */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    Order #{showScheduleModal.freight.epicorSalesOrder || showScheduleModal.freight.invoiceNumber || showScheduleModal.freight.id}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    {showScheduleModal.freight.weight ? `${showScheduleModal.freight.weight}` : 'Standard Freight'}
                  </span>
                </div>
                <div className="text-xs font-extrabold text-slate-900 pt-1">{showScheduleModal.freight.customerName}</div>
                <div className="text-[11px] text-slate-500 flex items-center">
                  <MapPin className="h-3 w-3 mr-1 text-slate-400 shrink-0" />
                  <span className="truncate">{showScheduleModal.freight.deliveryAddress}</span>
                </div>
              </div>

              {/* 1) Dispatch Depot / Store */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>1) Dispatch Depot / Origin Store</span>
                  <span className="text-[10px] text-slate-400 font-normal">Fulfillment Origin</span>
                </label>
                <select
                  value={schedDepotForm}
                  onChange={(e) => setSchedDepotForm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Windmill DC">Windmill DC (Main Facility)</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.name || b.branchName}>
                      🏬 {b.name || b.branchName}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2) Target Date & Slot */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">2) Scheduled Delivery Window</label>
                <div className="text-xs font-extrabold text-slate-800 bg-blue-50/80 border border-blue-200 p-2.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4 text-blue-600" />
                    <span>{showScheduleModal.date}</span>
                  </div>
                  <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    {showScheduleModal.slot} Shift
                  </span>
                </div>
              </div>

              {/* 3) Delivery Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Category</label>
                <select
                  value={schedCategoryForm}
                  onChange={(e) => setSchedCategoryForm(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Retail">Retail Delivery</option>
                  <option value="Pro">Pro / Commercial</option>
                  <option value="Transfer">Store Transfer</option>
                </select>
              </div>

              {/* 4) Truck & Driver */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">3) Truck Designation</label>
                <select
                  value={schedTruckForm}
                  onChange={(e) => {
                    const selVal = e.target.value;
                    setSchedTruckForm(selVal);
                    const selTruck = trucks.find(t => t.id === selVal || t.name === selVal || t.truckNumber === selVal);
                    if (selTruck?.driver) {
                      setSchedDriverForm(selTruck.driver);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Select Truck Designation --</option>
                  {trucks.map(t => (
                    <option key={t.id} value={t.name || t.id}>
                      🚛 {t.name || t.truckNumber || t.id} {t.driver ? `(Driver: ${t.driver})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Logistics Driver</label>
                <select
                  value={schedDriverForm}
                  onChange={(e) => setSchedDriverForm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Select Driver --</option>
                  {users.filter(u => u.role === 'Driver' || u.role === 'Logistics' || u.role === 'Admin' || u.role === 'Dispatcher' || !u.role).map(u => (
                    <option key={u.id} value={u.name}>
                      👤 {u.name} {u.role ? `(${u.role})` : ''}
                    </option>
                  ))}
                  {Array.from(new Set(trucks.map(t => t.driver).filter(Boolean))).map(driverName => (
                    <option key={driverName} value={driverName}>
                      👤 {driverName} (Assigned Driver)
                    </option>
                  ))}
                </select>
              </div>

              {/* 5) Warehouse Picker Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>4) Assigned Warehouse Picker</span>
                  <span className="text-[10px] text-blue-600 font-bold">Required for Picking Ticket</span>
                </label>
                <select
                  value={schedPickerForm}
                  onChange={(e) => setSchedPickerForm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Select Warehouse Picker --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.name}>
                      📋 {u.name} {u.role ? `(${u.role})` : ''}
                    </option>
                  ))}
                  <option value="Dave Miller">📋 Dave Miller (Senior Picker)</option>
                  <option value="Sarah Jenkins">📋 Sarah Jenkins (Forklift Op)</option>
                  <option value="Mike Ross">📋 Mike Ross (Lumber Lead)</option>
                  <option value="Alex T.">📋 Alex T. (Staging Staff)</option>
                </select>
                
                {/* Quick select chips for Picker */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['Dave Miller', 'Sarah Jenkins', 'Mike Ross', 'Alex T.'].map(pName => (
                    <button
                      key={pName}
                      type="button"
                      onClick={() => setSchedPickerForm(pName)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                        schedPickerForm === pName 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' 
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      + {pName}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => setShowScheduleModal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSchedule}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm Dispatch & Schedule</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRUCK ORDERS SUMMARY MODAL */}
      {selectedTruckSummary && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                <div className="p-2 sm:p-2.5 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-300 shrink-0">
                  <TruckIcon className="h-4 sm:h-5 w-4 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-extrabold text-white truncate">{selectedTruckSummary.truckName} Manifest</h3>
                    <span className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      {selectedTruckSummary.slot} Block
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-300 font-medium flex items-center space-x-2 mt-0.5 truncate">
                    <span>Driver: <strong className="text-white">{selectedTruckSummary.driverName}</strong></span>
                    <span>•</span>
                    <span>{selectedTruckSummary.dateStr}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTruckSummary(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Summary KPI Strip */}
            <div className="bg-slate-50 border-b border-slate-200 p-2.5 sm:p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 shrink-0">
              <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Orders / Stops</span>
                <span className="text-sm sm:text-base font-black text-slate-900">{selectedTruckSummary.deliveries.length}</span>
              </div>
              <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Category Mix</span>
                <span className="text-xs font-bold text-slate-700">
                  {selectedTruckSummary.deliveries.filter(d => d.deliveryCategory === 'Retail').length} Retail / {selectedTruckSummary.deliveries.filter(d => d.deliveryCategory === 'Pro').length} Pro
                </span>
              </div>
              <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Est. Total Weight</span>
                <span className="text-xs font-bold text-slate-700">
                  {selectedTruckSummary.deliveries.reduce((sum, d) => sum + (parseFloat((d.weight || '').replace(/[^0-9.]/g, '')) || 0), 0) > 0
                    ? `${selectedTruckSummary.deliveries.reduce((sum, d) => sum + (parseFloat((d.weight || '').replace(/[^0-9.]/g, '')) || 0), 0).toLocaleString()} lbs`
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* Orders List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Assigned Orders ({selectedTruckSummary.deliveries.length})
                </h4>
              </div>

              {selectedTruckSummary.deliveries.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-medium">
                  No orders assigned to this truck for {selectedTruckSummary.slot} block.
                </div>
              ) : (
                selectedTruckSummary.deliveries.map((ord, idx) => (
                  <div
                    key={ord.id || idx}
                    className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-3.5 shadow-2xs transition-all space-y-2.5"
                  >
                    {/* Order Top Bar */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md font-mono border border-slate-200">
                          Order #{ord.epicorSalesOrder || ord.invoiceNumber || ord.id}
                        </span>
                        {ord.deliveryCategory && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                            ord.deliveryCategory === 'Pro'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : ord.deliveryCategory === 'Transfer'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {ord.deliveryCategory}
                          </span>
                        )}
                      </div>

                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        ord.status === DeliveryStatus.DELIVERED
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : ord.status === DeliveryStatus.PICKED_AND_LOADED
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Customer & Address Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Ship To / Customer</span>
                        <span className="font-extrabold text-slate-800">{ord.customerName}</span>
                        {ord.phone && <span className="text-[11px] text-slate-500 block">📞 {ord.phone}</span>}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Ship To Address</span>
                        <span className="font-semibold text-slate-700 line-clamp-2">{ord.deliveryAddress}</span>
                      </div>
                    </div>

                    {/* Order Meta details (Origin, Weight, Total, Notes) */}
                    <div className="bg-slate-50/80 rounded-lg p-2 text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600 border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[9px] font-bold uppercase">Origin</span>
                        <span className="font-bold text-slate-700">{ord.originBranch || 'Main DC'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] font-bold uppercase">Weight</span>
                        <span className="font-bold text-slate-700">{ord.weight || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] font-bold uppercase">Order Total</span>
                        <span className="font-bold text-slate-700">{ord.orderTotal || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] font-bold uppercase">Slot / Window</span>
                        <span className="font-bold text-slate-700">{ord.scheduledSlot || selectedTruckSummary.slot} Block</span>
                      </div>
                    </div>

                    {ord.destinationNotes && (
                      <div className="text-[11px] bg-amber-50/60 text-amber-900 border border-amber-200/60 rounded-lg px-2.5 py-1.5 font-medium">
                        📝 <strong className="font-bold">Notes:</strong> {ord.destinationNotes}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                {selectedTruckSummary.deliveries.length} total stops on {selectedTruckSummary.truckName}
              </span>
              <button
                onClick={() => setSelectedTruckSummary(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
