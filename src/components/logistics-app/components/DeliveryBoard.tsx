import React, { useState, useEffect } from 'react';
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
  Layers,
  Shield,
  UserCheck
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
  initialClosureRules
}: DeliveryBoardProps) {
  // Role checks
  const isDispatcherOrAdmin = ['Dispatcher', 'Admin', 'SUPER_ADMIN'].includes(currentUser?.role || '');

  // View state: 'week' | 'day' | 'month'
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'month'>('week');
  
  // Selected Store filter: 'ALL' or branchId
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

  // Selected date reference
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Store delivery configs state
  const [storeConfigs, setStoreConfigs] = useState<Record<string, StoreDeliveryConfig>>(() => {
    try {
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

  // Sync branches metadata into state if loaded from Supabase
  useEffect(() => {
    let rulesUpdated = false;
    let configsUpdated = false;
    const mergedRules = [...closureRules];
    const mergedConfigs = { ...storeConfigs };

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
  }, [branches]);

  // Active Modals & Sidebars
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [showClosureModal, setShowClosureModal] = useState<{ date: string; slot: 'AM' | 'PM' | 'ALL_DAY' } | null>(null);
  const [showFreightPool, setShowFreightPool] = useState<boolean>(false);
  const [showScheduleModal, setShowScheduleModal] = useState<{ freight: DeliveryRecord; date: string; slot: 'AM' | 'PM' } | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);

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
  const [schedCategoryForm, setSchedCategoryForm] = useState<'Retail' | 'Pro' | 'Transfer'>('Retail');
  const [schedTruckForm, setSchedTruckForm] = useState<string>('');
  const [schedDriverForm, setSchedDriverForm] = useState<string>('');

  // Sync form state when schedule modal opens
  useEffect(() => {
    if (showScheduleModal?.freight) {
      const f = showScheduleModal.freight;
      setSchedCategoryForm(f.deliveryCategory || 'Retail');
      const matchedTruck = trucks.find(t => t.id === f.assignedTruck || t.name === f.assignedTruck || t.truckNumber === f.assignedTruck) || trucks[0];
      const initialTruck = f.assignedTruck || matchedTruck?.name || matchedTruck?.id || '';
      setSchedTruckForm(initialTruck);
      
      const initialDriver = f.assignedDriver || matchedTruck?.driver || users.find(u => u.role === 'Driver' || u.role === 'Logistics')?.name || '';
      setSchedDriverForm(initialDriver);
    }
  }, [showScheduleModal, trucks, users]);

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
    if (selectedBranchId !== 'ALL' && d.originBranch !== selectedBranchId) {
      return false;
    }
    return true;
  });

  // Unassigned freight for scheduling
  const unassignedFreight = filteredDeliveries.filter(d => !d.scheduledDate || d.status === DeliveryStatus.REGISTERED);

  // Get closure rule for date & slot
  const getClosureRule = (dateStr: string, slot: 'AM' | 'PM') => {
    return closureRules.find(r => 
      (r.branchId === 'ALL' || r.branchId === selectedBranchId) &&
      r.date === dateStr &&
      (r.slot === 'ALL_DAY' || r.slot === slot) &&
      r.closureType !== 'NONE'
    );
  };

  // Get deliveries for specific date & slot
  const getSlotDeliveries = (dateStr: string, slot: 'AM' | 'PM') => {
    return filteredDeliveries.filter(d => {
      const dateMatch = d.scheduledDate ? d.scheduledDate === dateStr : d.registeredAt?.startsWith(dateStr);
      if (!dateMatch) return false;

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
      scheduledDate: date,
      scheduledSlot: slot,
      deliveryCategory: schedCategoryForm,
      assignedTruck: schedTruckForm || freight.assignedTruck,
      assignedDriver: schedDriverForm || freight.assignedDriver,
      status: freight.status === DeliveryStatus.REGISTERED ? DeliveryStatus.PICKED_AND_LOADED : freight.status,
      history: [
        ...(freight.history || []),
        {
          status: freight.status,
          timestamp: new Date().toISOString(),
          location: freight.originBranch || 'Store Dispatch',
          operator: currentUser?.name || 'Dispatcher',
          notes: `Scheduled on Delivery Board for ${date} (${slot} Slot)`
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
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 max-w-5xl mx-auto">
          
          {/* Title & View Mode Switcher */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-700">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-extrabold text-slate-900">Delivery Board</h1>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  ProSpaces Logistics
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Visual slot capacity & scheduling per store
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            
            {/* Store Picker Dropdown */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Store className="h-3.5 w-3.5 text-slate-500 mr-1.5" />
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer pr-1"
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
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Week View
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'day' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Day Detail
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
                className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Store Setup</span>
              </button>
            )}

            {/* Unassigned Freight Drawer Toggle */}
            <button
              onClick={() => setShowFreightPool(!showFreightPool)}
              className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                showFreightPool
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <Package className="h-3.5 w-3.5 text-amber-600" />
              <span>Freight Pool</span>
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
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 flex gap-4 overflow-hidden">
        
        {/* BOARD VIEW CANVAS */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">

          {/* ==================== WEEK SUMMARY VIEW (MOCKUP 1 EXACT RECREATION) ==================== */}
          {viewMode === 'week' && (
            <div className="space-y-3">
              
              {/* Date Header with Arrows & Filter */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrev}
                    className="p-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-2xs cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-extrabold text-slate-900 px-1">
                    Week of {currentWeekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {currentWeekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <button
                    onClick={handleNext}
                    className="p-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-2xs cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
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
                      className={`bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between group ${
                        !isDeliveryDay ? 'bg-slate-50/50' : ''
                      }`}
                    >
                      {/* Left: Day Label */}
                      <div className="w-20 shrink-0">
                        <div className={`text-sm font-black ${isDeliveryDay ? 'text-slate-900' : 'text-slate-500'}`}>{dayName}</div>
                        <div className="text-xs text-slate-400 font-medium">{monthDay}</div>
                      </div>

                      {/* Middle: AM & PM Progress Rows */}
                      <div className="flex-1 mx-4 space-y-2">
                        
                        {/* AM Row */}
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-extrabold text-slate-400 w-6">AM</span>
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
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-extrabold text-slate-400 w-6">PM</span>
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
                      <div className="flex items-center space-x-3 shrink-0">
                        <div className="text-right text-xs font-bold space-y-1">
                          <div>
                            {!isDeliveryDay || (amRule && amRule.closureType === 'CLOSED_ALL') ? (
                              <span className="text-slate-400 font-extrabold">--</span>
                            ) : (
                              <span className="text-[#2563eb]">{amDeliveries.length}/{amCap}</span>
                            )}
                          </div>
                          <div>
                            {!isDeliveryDay || (pmRule && pmRule.closureType === 'CLOSED_ALL') ? (
                              <span className="text-slate-400 font-extrabold">--</span>
                            ) : (
                              <span className={pmDeliveries.length === 0 ? 'text-[#15803d]' : 'text-[#2563eb]'}>
                                {pmDeliveries.length}/{pmCap}
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronRightIcon className="h-4 w-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
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

                // Group deliveries by actual Truck Designation Name and Assigned Logistics Driver
                const groupDeliveriesByTruck = (dels: DeliveryRecord[]) => {
                  const map: Record<string, { truckName: string; driverName: string; stops: number }> = {};
                  
                  if (dels.length === 0) return [];

                  dels.forEach((d, idx) => {
                    // Match real truck from trucks list
                    const matchedTruck = trucks.find(t => 
                      t.id === d.assignedTruck || 
                      t.name === d.assignedTruck || 
                      t.truckNumber === d.assignedTruck
                    );

                    // Real Truck Designation Name
                    const truckName = matchedTruck?.name || d.assignedTruck || matchedTruck?.truckNumber || (trucks[idx % (trucks.length || 1)]?.name) || `Truck ${idx + 1}`;

                    // Real Assigned Logistics Driver
                    const matchedUser = users.find(u => u.name === d.assignedDriver || u.id === d.assignedDriver);
                    const driverName = d.assignedDriver || matchedUser?.name || matchedTruck?.driver || (users.find(u => u.role === 'Driver' || u.role === 'Logistics')?.name) || 'Unassigned Driver';

                    const truckKey = matchedTruck?.id || d.assignedTruck || truckName;

                    if (!map[truckKey]) {
                      map[truckKey] = { truckName, driverName, stops: 0 };
                    }
                    map[truckKey].stops += 1;
                  });

                  return Object.values(map);
                };

                const amTrucks = groupDeliveriesByTruck(amDeliveries);
                const pmTrucks = groupDeliveriesByTruck(pmDeliveries);

                return (
                  <div className="space-y-6">
                    
                    {/* AM SECTION */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-extrabold text-slate-900">AM</h3>
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

                      {/* Top Accent Bar (Green / Blue) */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#15803d] h-full rounded-full transition-all"
                          style={{ width: `${Math.min((amDeliveries.length / amCap) * 100, 100)}%` }}
                        ></div>
                      </div>

                      {/* Truck Cards List */}
                      <div className="space-y-2">
                        {amTrucks.length === 0 ? (
                          <div className="p-4 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 font-medium">
                            No trucks loaded for morning block yet.
                          </div>
                        ) : (
                          amTrucks.map((t, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                                  <TruckIcon className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-slate-900">{t.truckName}</div>
                                  <div className="text-[11px] text-slate-500">{t.driverName}</div>
                                </div>
                              </div>
                              <span className="text-xs font-bold text-slate-600">{t.stops} {t.stops === 1 ? 'stop' : 'stops'}</span>
                            </div>
                          ))
                        )}

                        {/* + Book AM Slot Action Button */}
                        <button
                          onClick={() => {
                            if (unassignedFreight.length > 0) {
                              setShowScheduleModal({
                                freight: unassignedFreight[0],
                                date: dateStr,
                                slot: 'AM'
                              });
                            } else {
                              setShowFreightPool(true);
                            }
                          }}
                          disabled={amRule?.closureType === 'CLOSED_ALL'}
                          className="w-full py-2.5 border border-dashed border-slate-300 hover:border-slate-400 rounded-xl text-xs font-extrabold text-slate-700 flex items-center justify-center space-x-1.5 transition-all hover:bg-slate-50 disabled:opacity-40"
                        >
                          <Plus className="h-4 w-4 text-emerald-600" />
                          <span>+ Book AM slot</span>
                        </button>
                      </div>

                    </div>

                    {/* PM SECTION */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-extrabold text-slate-900">PM</h3>
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

                      {/* Top Accent Bar (Blue) */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#1e40af] h-full rounded-full transition-all"
                          style={{ width: `${Math.min((pmDeliveries.length / pmCap) * 100, 100)}%` }}
                        ></div>
                      </div>

                      {/* Truck Cards List */}
                      <div className="space-y-2">
                        {pmTrucks.length === 0 ? (
                          <div className="p-4 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 font-medium">
                            No trucks loaded for afternoon block yet.
                          </div>
                        ) : (
                          pmTrucks.map((t, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                                  <TruckIcon className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-slate-900">{t.truckName}</div>
                                  <div className="text-[11px] text-slate-500">{t.driverName}</div>
                                </div>
                              </div>
                              <span className="text-xs font-bold text-slate-600">{t.stops} {t.stops === 1 ? 'stop' : 'stops'}</span>
                            </div>
                          ))
                        )}

                        {/* + Book PM Slot Action Button */}
                        <button
                          onClick={() => {
                            if (unassignedFreight.length > 0) {
                              setShowScheduleModal({
                                freight: unassignedFreight[0],
                                date: dateStr,
                                slot: 'PM'
                              });
                            } else {
                              setShowFreightPool(true);
                            }
                          }}
                          disabled={pmRule?.closureType === 'CLOSED_ALL'}
                          className="w-full py-2.5 border border-dashed border-slate-300 hover:border-slate-400 rounded-xl text-xs font-extrabold text-slate-700 flex items-center justify-center space-x-1.5 transition-all hover:bg-slate-50 disabled:opacity-40"
                        >
                          <Plus className="h-4 w-4 text-blue-600" />
                          <span>+ Book PM slot</span>
                        </button>
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
          <aside className="w-80 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col shadow-lg shrink-0 h-fit">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-amber-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase">Unassigned Freight</h3>
              </div>
              <button
                onClick={() => setShowFreightPool(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mb-3">
              Unassigned freight pool waiting to be scheduled into Delivery Board slots.
            </p>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
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
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 hover:border-amber-400 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-black text-amber-800 font-mono">{freight.invoiceNumber || freight.id}</span>
                        <div className="text-xs font-bold text-slate-900">{freight.customerName}</div>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                        {freight.deliveryCategory || 'Retail'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center">
                      <MapPin className="h-3 w-3 mr-1 text-slate-400 shrink-0" />
                      <span className="truncate">{freight.deliveryAddress}</span>
                    </div>

                    <button
                      onClick={() => {
                        setShowScheduleModal({
                          freight,
                          date: formatDateStr(currentDate),
                          slot: 'AM'
                        });
                      }}
                      className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center space-x-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Assign to Board</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-amber-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase">Schedule to Board</h3>
              </div>
              <button onClick={() => setShowScheduleModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-900">{showScheduleModal.freight.customerName}</div>
                <div className="text-[11px] text-slate-500">{showScheduleModal.freight.deliveryAddress}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Slot</label>
                <div className="text-xs font-bold text-slate-800 bg-slate-100 p-2 rounded-lg">
                  {showScheduleModal.date} ({showScheduleModal.slot} Block)
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Category</label>
                <select
                  value={schedCategoryForm}
                  onChange={(e) => setSchedCategoryForm(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value="Retail">Retail Delivery</option>
                  <option value="Pro">Pro / Commercial</option>
                  <option value="Transfer">Store Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Truck Designation Name</label>
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value="">-- Select Truck Designation --</option>
                  {trucks.map(t => (
                    <option key={t.id} value={t.name || t.id}>
                      🚛 {t.name || t.truckNumber || t.id} {t.driver ? `(${t.driver})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Logistics Driver</label>
                <select
                  value={schedDriverForm}
                  onChange={(e) => setSchedDriverForm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
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
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => setShowScheduleModal(null)}
                className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSchedule}
                className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg"
              >
                Confirm Scheduling
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
