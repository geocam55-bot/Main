import React, { useState, useEffect } from 'react';
import { Truck, User, Tenant, Branch } from '../types';
import { FLEET_COMPLETE_TRUCKS } from '../truckSpecs';
import { 
  Truck as TruckIcon, 
  CheckCircle2, 
  X, 
  ChevronDown, 
  MapPin, 
  Sparkles, 
  UserCheck, 
  AlertCircle,
  ShieldCheck,
  Fuel,
  Info
} from 'lucide-react';

interface DriverTruckSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  trucks: Truck[];
  branches: Branch[];
  currentTenant: Tenant | null;
  onConfirmTruckAssignment: (selectedTruckId: string) => void;
}

export default function DriverTruckSelectModal({
  isOpen,
  onClose,
  currentUser,
  trucks,
  branches,
  currentTenant,
  onConfirmTruckAssignment
}: DriverTruckSelectModalProps) {
  // Build complete list of available trucks by combining props trucks with FLEET_COMPLETE_TRUCKS
  const fleetList = React.useMemo(() => {
    const map = new Map<string, Truck>();
    
    // Add trucks from props
    trucks.forEach(t => {
      if (t && t.id) {
        map.set(t.id, t);
      }
    });

    // Supplement with defaults from FLEET_COMPLETE_TRUCKS if missing
    FLEET_COMPLETE_TRUCKS.forEach(spec => {
      if (!map.has(spec.id)) {
        const matchingByName = Array.from(map.values()).find(existing => 
          existing.name && existing.name.toLowerCase().trim() === spec.name.toLowerCase().trim()
        );
        if (!matchingByName) {
          map.set(spec.id, {
            id: spec.id,
            tenantId: currentTenant?.id || 'prospaces',
            name: spec.name,
            type: spec.model.includes('Boom') ? '6X Boom Truck' : (spec.model.includes('Box') ? 'Box Truck' : 'Pickup / Flatbed'),
            status: 'Available',
            driver: 'No Driver',
            branchId: spec.branchId,
            homeDepot: spec.homeDepot,
            licensePlate: spec.licensePlate,
            lat: 44.68550,
            lng: -63.58250,
            gpsLat: 44.68550,
            gpsLng: -63.58250,
            gpsSpeed: 0,
            gpsIdlingMins: 0,
            gpsLastHandshake: new Date().toISOString()
          });
        }
      }
    });

    return Array.from(map.values());
  }, [trucks, currentTenant]);

  // Find driver's currently assigned truck
  const currentAssignedTruck = React.useMemo(() => {
    const driverNameNorm = (currentUser.name || '').trim().toLowerCase();
    const driverIdNorm = currentUser.id;

    return fleetList.find(t => {
      const tDrvNorm = (t.driver || '').trim().toLowerCase();
      const isDriverMatch = tDrvNorm !== 'no driver' && tDrvNorm !== 'unassigned' && tDrvNorm === driverNameNorm;
      const isIdMatch = t.assignedDriverId && t.assignedDriverId === driverIdNorm;
      return isDriverMatch || isIdMatch;
    });
  }, [fleetList, currentUser]);

  const [selectedTruckId, setSelectedTruckId] = useState<string>('UNASSIGNED');

  // Populate initial selection when modal opens or driver assignment changes
  useEffect(() => {
    if (isOpen) {
      if (currentAssignedTruck) {
        setSelectedTruckId(currentAssignedTruck.id);
      } else if (fleetList.length > 0) {
        setSelectedTruckId(fleetList[0].id);
      } else {
        setSelectedTruckId('UNASSIGNED');
      }
    }
  }, [isOpen, currentAssignedTruck, fleetList]);

  if (!isOpen) return null;

  const activeSelectedTruck = fleetList.find(t => t.id === selectedTruckId);

  // Check if selected truck is assigned to someone else
  const currentDriverOfSelected = activeSelectedTruck?.driver && 
    activeSelectedTruck.driver.toLowerCase() !== 'no driver' && 
    activeSelectedTruck.driver.toLowerCase() !== 'unassigned' &&
    activeSelectedTruck.driver.trim().toLowerCase() !== currentUser.name.trim().toLowerCase()
    ? activeSelectedTruck.driver
    : null;

  const handleConfirm = () => {
    onConfirmTruckAssignment(selectedTruckId);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in" id="driver-truck-modal-overlay">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-xl overflow-hidden my-auto animate-scale-up" id="driver-truck-modal-container">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white p-5 sm:p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center space-x-3.5 mb-2">
            <div className="p-2.5 bg-blue-600/90 text-white rounded-2xl shadow-lg border border-blue-400/30 shrink-0">
              <TruckIcon className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-300 font-mono bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-500/30">
                Driver Shift Check-In
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                Which truck are you driving today?
              </h2>
            </div>
          </div>
          <p className="text-xs text-blue-100/90 leading-relaxed pl-12">
            Welcome, <strong className="text-amber-300 font-extrabold">{currentUser.name}</strong>! Select your vehicle for live GPS tracking, route dispatching, and mobile EPOD operations.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5">

          {/* Current Assignment Status Banner */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-xl shrink-0 ${currentAssignedTruck ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">Current Vehicle Status</div>
                <div className="text-xs font-bold text-slate-800">
                  {currentAssignedTruck ? (
                    <span className="text-emerald-700 font-extrabold flex items-center space-x-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Assigned: {currentAssignedTruck.name}</span>
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">No truck currently checked in</span>
                  )}
                </div>
              </div>
            </div>
            {currentAssignedTruck && (
              <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-1 rounded-lg font-mono font-bold">
                {currentAssignedTruck.licensePlate || 'Active'}
              </span>
            )}
          </div>

          {/* Truck Selection Dropdown */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide">
              Select Truck from Fleet Dropdown:
            </label>
            <div className="relative">
              <select
                value={selectedTruckId}
                onChange={(e) => setSelectedTruckId(e.target.value)}
                className="w-full bg-white border-2 border-blue-600/80 hover:border-blue-700 text-slate-900 text-sm font-bold rounded-2xl p-3.5 pr-10 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer shadow-sm"
              >
                <option value="UNASSIGNED">
                  ⛔ Unassigned / No Vehicle Today (On Foot / Depot Duty)
                </option>
                <optgroup label="Available Fleet Vehicles">
                  {fleetList.map((t) => {
                    const isDriverThisUser = (t.driver || '').trim().toLowerCase() === currentUser.name.trim().toLowerCase();
                    const isAssignedOther = t.driver && t.driver.toLowerCase() !== 'no driver' && t.driver.toLowerCase() !== 'unassigned' && !isDriverThisUser;
                    
                    return (
                      <option key={t.id} value={t.id}>
                        {t.name} &bull; {t.homeDepot || 'Depot'} {isDriverThisUser ? ' (Your Current Truck)' : (isAssignedOther ? ` [Driver: ${t.driver}]` : ' [Available]')}
                      </option>
                    );
                  })}
                </optgroup>
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <ChevronDown className="h-5 w-5 text-blue-700" />
              </div>
            </div>
          </div>

          {/* Selected Truck Card Preview */}
          {activeSelectedTruck && selectedTruckId !== 'UNASSIGNED' && (
            <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 space-y-3 animate-fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 font-mono">Selected Vehicle Specs</div>
                  <div className="text-sm font-extrabold text-slate-900">{activeSelectedTruck.name}</div>
                  <div className="text-xs text-slate-600 font-medium mt-0.5">
                    {activeSelectedTruck.type || 'Commercial Freight Unit'} &bull; License: <span className="font-mono font-bold">{activeSelectedTruck.licensePlate || 'N/A'}</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-full font-mono uppercase tracking-wider shadow-xs">
                  Ready
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-blue-200/60">
                <div className="flex items-center space-x-2 text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">{activeSelectedTruck.homeDepot || 'Windmill Terminal Depot'}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-600">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>GPS Telematics Sync</span>
                </div>
              </div>

              {currentDriverOfSelected && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center space-x-2 text-amber-800 text-xs font-medium">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    Note: <strong className="font-bold">{currentDriverOfSelected}</strong> is currently listed on this vehicle. Confirming will re-assign it to you.
                  </span>
                </div>
              )}
            </div>
          )}

          {selectedTruckId === 'UNASSIGNED' && (
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 flex items-center space-x-3">
              <Info className="h-5 w-5 text-slate-400 shrink-0" />
              <span>
                You are setting your status to <strong>Unassigned / No Vehicle</strong>. You will remain logged in as a driver, but won't be linked to active vehicle GPS tracking.
              </span>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-5 sm:px-6 py-4 border-t border-slate-200/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer"
          >
            Skip for now
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2.5 text-xs font-extrabold text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 rounded-xl transition-all shadow-md flex items-center space-x-2 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <span>Confirm Truck Assignment</span>
          </button>
        </div>

      </div>
    </div>
  );
}
