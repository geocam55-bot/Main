import React, { useState, useEffect, useRef } from 'react';
import { Truck, Branch, User } from '../types';
import { Truck as TruckIcon, Plus, Trash2, Edit2, Shield, Info, ChevronRight, FileCheck, AlertTriangle, Calendar, Upload, Image as ImageIcon, Camera, Check, X, Database } from 'lucide-react';
import { isTruckAssignedToBranch } from './Dashboard';
import { TRUCK_IMAGE_PRESETS, getTruckImage } from '../lib/truckImages';

interface FleetSetupProps {
  trucks: Truck[];
  branches: Branch[];
  users?: User[];
  onAddTruck: (truck: Truck) => void;
  onUpdateTruck: (truck: Truck) => void;
  onDeleteTruck: (id: string) => void;
  readOnly?: boolean;
}

export default function FleetSetup({
  trucks,
  branches,
  users,
  onAddTruck,
  onUpdateTruck,
  onDeleteTruck,
  readOnly
}: FleetSetupProps) {
  // Gracefully default to the first available branch
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  useEffect(() => {
    if (branches.length > 0) {
      if (!selectedBranchId || !branches.some(b => b.id === selectedBranchId)) {
        setSelectedBranchId(branches[0].id);
      }
    }
  }, [branches, selectedBranchId]);

  const [isAdding, setIsAdding] = useState(false);
  const [editingTruckId, setEditingTruckId] = useState<string | null>(null);
  const [showDeleteConfirmId, setShowDeleteConfirmId] = useState<string | null>(null);

  // Form Inputs
  const [truckId, setTruckId] = useState('');
  const [truckName, setTruckName] = useState('');
  const [truckType, setTruckType] = useState('Flatbed Boom Truck');
  const [driverName, setDriverName] = useState('');
  const [targetBranchId, setTargetBranchId] = useState('');
  const [registrationDueDate, setRegistrationDueDate] = useState('');
  const [vin, setVin] = useState('');
  const [userField1, setUserField1] = useState('');
  const [userField2, setUserField2] = useState('');

  // Commercial Logistics Fields
  const [truckNumber, setTruckNumber] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [capacityWeightKg, setCapacityWeightKg] = useState('');
  const [capacityVolumeM3, setCapacityVolumeM3] = useState('');
  const [fuelType, setFuelType] = useState('Diesel');
  const [currentMileage, setCurrentMileage] = useState('');
  const [lastServiceDate, setLastServiceDate] = useState('');
  const [nextServiceDueDate, setNextServiceDueDate] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState('');
  const [truckImageUrl, setTruckImageUrl] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Selected image file size is too large. Please select an image under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setTruckImageUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Get trucks assigned to the currently selected branch
  const isAll = selectedBranchId === 'ALL' || !selectedBranchId;
  const selectedBranch = isAll ? null : branches.find(b => b.id === selectedBranchId);
  const filteredTrucks = isAll
    ? trucks
    : trucks.filter(t => selectedBranch ? isTruckAssignedToBranch(t, selectedBranch) : t.branchId === selectedBranchId);

  // Filter registered users with Driver role
  const driversList = (users || []).filter(u => u.role?.toLowerCase() === 'driver');

  // Pre-configured truck models for easy selection
  const TRUCK_TYPES = [
    'Flatbed Boom Truck',
    'Medium-Duty Flatbed',
    'Heavy-Duty Flatbed',
    '24ft Closed Box Truck',
    'Fleet Pickup Truck 4x4',
    'Curtain-side Flatbed'
  ];

  const handleStartAdd = () => {
    const nextNum = Math.floor(100 + Math.random() * 900);
    const uniqueSuffix = Date.now().toString().slice(-4);
    setTruckId(`TRUCK-${uniqueSuffix}-${nextNum}`);
    setTruckName(`Truck-${filteredTrucks.length + 1}`);
    setTruckType('Flatbed Boom Truck');
    setDriverName('');
    setRegistrationDueDate('');
    setVin('');
    setUserField1('');
    setUserField2('');
    
    // Reset Commercial details
    setTruckNumber('');
    setLicensePlate('');
    setMake('');
    setModel('');
    setYear('');
    setColor('');
    setCapacityWeightKg('');
    setCapacityVolumeM3('');
    setFuelType('Diesel');
    setCurrentMileage('');
    setLastServiceDate('');
    setNextServiceDueDate('');
    setInsurancePolicyNumber('');
    setInsuranceExpiryDate('');
    setTruckImageUrl('');
    
    setTargetBranchId(selectedBranchId === 'ALL' ? (branches[0]?.id || '') : (selectedBranchId || branches[0]?.id || ''));
    setIsAdding(true);
    setEditingTruckId(null);
  };

  const handleStartEdit = (truck: Truck) => {
    setTruckId(truck.id);
    setTruckName(truck.name);
    setTruckType(truck.type);
    setDriverName(truck.driver);
    setTargetBranchId(truck.branchId);
    setRegistrationDueDate(truck.registrationDueDate || '');
    setVin(truck.vin || '');
    setUserField1(truck.userField1 || '');
    setUserField2(truck.userField2 || '');
    setTruckImageUrl(truck.imageUrl || '');
    
    // Set Commercial details
    setTruckNumber(truck.truckNumber || '');
    setLicensePlate(truck.licensePlate || '');
    setMake(truck.make || '');
    setModel(truck.model || '');
    setYear(truck.year ? String(truck.year) : '');
    setColor(truck.color || '');
    setCapacityWeightKg(truck.capacityWeightKg ? String(truck.capacityWeightKg) : '');
    setCapacityVolumeM3(truck.capacityVolumeM3 ? String(truck.capacityVolumeM3) : '');
    setFuelType(truck.fuelType || 'Diesel');
    setCurrentMileage(truck.currentMileage ? String(truck.currentMileage) : '');
    setLastServiceDate(truck.lastServiceDate || '');
    setNextServiceDueDate(truck.nextServiceDueDate || '');
    setInsurancePolicyNumber(truck.insurancePolicyNumber || '');
    setInsuranceExpiryDate(truck.insuranceExpiryDate || '');

    setEditingTruckId(truck.id);
    setIsAdding(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!truckName.trim() || !driverName.trim() || !targetBranchId) {
      alert('Please fill in Truck Name, Driver, and tag it to a Store branch.');
      return;
    }

    const existingTruck = trucks.find(t => t.id === truckId);
    
    const payload: Truck = {
      ...(existingTruck || {}),
      id: truckId,
      name: truckName.trim(),
      type: truckType,
      driver: driverName.trim(),
      branchId: targetBranchId,
      registrationDueDate: registrationDueDate || undefined,
      vin: vin.trim() || undefined,
      userField1: userField1.trim() || undefined,
      userField2: userField2.trim() || undefined,
      imageUrl: truckImageUrl.trim() || undefined,
      
      // Commercial Logistics
      truckNumber: truckNumber.trim() || undefined,
      licensePlate: licensePlate.trim() || undefined,
      make: make.trim() || undefined,
      model: model.trim() || undefined,
      year: year ? parseInt(year, 10) : undefined,
      color: color.trim() || undefined,
      capacityWeightKg: capacityWeightKg ? parseFloat(capacityWeightKg) : undefined,
      capacityVolumeM3: capacityVolumeM3 ? parseFloat(capacityVolumeM3) : undefined,
      fuelType: fuelType,
      currentMileage: currentMileage ? parseInt(currentMileage, 10) : undefined,
      lastServiceDate: lastServiceDate || undefined,
      nextServiceDueDate: nextServiceDueDate || undefined,
      insurancePolicyNumber: insurancePolicyNumber.trim() || undefined,
      insuranceExpiryDate: insuranceExpiryDate || undefined,
      registrationExpiryDate: registrationDueDate || undefined // Keep synced
    };

    if (editingTruckId) {
      onUpdateTruck(payload);
      setEditingTruckId(null);
    } else {
      let finalId = (truckId || '').trim();
      if (!finalId || trucks.some(t => t.id === finalId)) {
        finalId = `TRUCK-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;
      }
      payload.id = finalId;
      onAddTruck(payload);
      setIsAdding(false);
    }

    // Reset Form
    setTruckName('');
    setDriverName('');
    setRegistrationDueDate('');
    setVin('');
    setUserField1('');
    setUserField2('');
    
    setTruckNumber('');
    setLicensePlate('');
    setMake('');
    setModel('');
    setYear('');
    setColor('');
    setCapacityWeightKg('');
    setCapacityVolumeM3('');
    setFuelType('Diesel');
    setCurrentMileage('');
    setLastServiceDate('');
    setNextServiceDueDate('');
    setInsurancePolicyNumber('');
    setInsuranceExpiryDate('');
  };

  const handleDelete = (id: string) => {
    setShowDeleteConfirmId(id);
  };

  if (branches.length === 0) {
    return (
      <div className="bg-white border border-slate-100 p-8 rounded-xl shadow-sm text-center space-y-3" id="fleet-setup-view">
        <TruckIcon className="h-10 w-10 text-slate-300 mx-auto" />
        <h4 className="font-sans font-bold text-gray-900 text-base">No Stores Available</h4>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          Please add and register a Store first in the Stores tab before setting up delivery vehicle fleets.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" id="fleet-setup-view">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h4 className="font-sans font-bold text-gray-900 tracking-tight text-xl">Fleet Logistics Registry (Trucks)</h4>
          <p className="text-xs text-gray-500">
            Decommission, register, and tag flatbeds, boom cranes, or transport vehicles to specific physical store footprints
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Hand: Branch / Store Selection Deck */}
        <div className="lg:col-span-4 bg-white border border-slate-100 p-4 rounded-xl shadow-sm space-y-4">
          <h5 className="text-xs font-bold text-gray-700 uppercase tracking-widest font-mono">Select Store View</h5>
          <div className="space-y-1.5">
            {/* All Stores option */}
            <button
              onClick={() => {
                setSelectedBranchId('ALL');
                setIsAdding(false);
                setEditingTruckId(null);
              }}
              className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between ${
                selectedBranchId === 'ALL'
                  ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold shadow-sm'
                  : 'border-slate-100 hover:bg-slate-50 text-gray-700'
              }`}
            >
              <div className="truncate pr-2">
                <span className="block truncate font-bold">All Stores & Depots</span>
                <span className="text-[10px] text-gray-400 font-mono block truncate mt-0.5">Complete Fleet Directory</span>
              </div>
              <div className="flex items-center space-x-1 shrink-0">
                <span className={`text-[9px] px-1.5 py-0.25 rounded font-mono font-bold ${
                  trucks.length > 0 
                    ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {trucks.length} {trucks.length === 1 ? 'Truck' : 'Trucks'}
                </span>
                <ChevronRight className={`h-3 w-3 ${selectedBranchId === 'ALL' ? 'text-blue-600' : 'text-slate-400'}`} />
              </div>
            </button>

            {branches.map(branch => {
              const count = trucks.filter(t => {
                if (t.branchId === branch.id) return true;
                if (branch.id === '01070' && (t.branchId === 'DC-ELMSDALE' || t.branchId === 'ELMSDALE')) return true;
                if (branch.id === 'DC-ELMSDALE' && t.branchId === '01070') return true;
                if (branch.id === 'DC-WINAMILL' && (t.branchId === '500' || t.branchId === 'WINAMILL')) return true;
                return false;
              }).length;
              return (
                <button
                  key={branch.id}
                  onClick={() => {
                    setSelectedBranchId(branch.id);
                    setIsAdding(false);
                    setEditingTruckId(null);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between ${
                    selectedBranchId === branch.id
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold shadow-sm'
                      : 'border-slate-100 hover:bg-slate-50 text-gray-700'
                  }`}
                >
                  <div className="truncate pr-2">
                    <span className="block truncate">{branch.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono block truncate mt-0.5">{branch.address}</span>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <span className={`text-[9px] px-1.5 py-0.25 rounded font-mono font-bold ${
                      count > 0 
                        ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {count} {count === 1 ? 'Truck' : 'Trucks'}
                    </span>
                    <ChevronRight className={`h-3 w-3 ${selectedBranchId === branch.id ? 'text-blue-600' : 'text-slate-400'}`} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-[11px] text-gray-500 space-y-1.5">
            <p className="font-semibold flex items-center text-gray-800 text-xs">
              <Info className="h-3.5 w-3.5 mr-1 text-blue-500" /> Stores vs DC Routing Rule
            </p>
            <p>
              Each truck must be explicitly tagged to a store. Deleting a store requires re-tagging its vehicles first so that barcodes remain scannable.
            </p>
          </div>
        </div>

        {/* Right Hand: Active Store's Fleet & Setup Form */}
        <div className="lg:col-span-8 bg-white border border-slate-100 p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            
            {/* Store title & action */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h4 className="font-sans font-bold text-gray-900 tracking-tight text-base">
                  {isAll ? 'All Stores & Depots' : (selectedBranch?.name || 'Selected Store')} Fleet
                </h4>
                <p className="text-xs text-gray-500">
                  {isAll ? 'Complete Regional Vehicle Fleet' : (selectedBranch?.type === 'DC' ? 'Bulk Distribution Hub' : 'Retailer Storefront Logistics')} &bull; NS Region
                </p>
              </div>
              
              {!isAdding && !editingTruckId && !readOnly && (
                <button
                  onClick={handleStartAdd}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-3 rounded-lg flex items-center space-x-1 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Truck</span>
                </button>
              )}
            </div>

            {readOnly && (
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs text-slate-500 mb-4 flex items-center space-x-2">
                <Info className="h-4 w-4 text-slate-400 shrink-0" />
                <span>As a Dispatcher, you have view-only access to physical transportation models. Registering or altering vehicles is restricted.</span>
              </div>
            )}

            {/* Display Mode: Either Form or Truck Card List */}
            {(isAdding || editingTruckId) ? (
              <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-100 p-4 rounded-xl mb-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-blue-900 uppercase tracking-wider font-sans flex items-center">
                    <TruckIcon className="h-4 w-4 mr-1 text-blue-600" />
                    {editingTruckId ? 'Update Truck Details' : 'Register New Flatbed/Cranes'}
                  </h5>
                  <button 
                    type="button" 
                    onClick={() => { setIsAdding(false); setEditingTruckId(null); }}
                    className="text-gray-400 hover:text-gray-600 text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Truck Registry Code</label>
                    <input 
                      type="text" 
                      value={truckId}
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 px-3 py-1.5 rounded text-xs font-mono text-gray-500"
                    />
                    <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">Generated unique vehicle ID</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Truck Designation Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Truck-1 Boom"
                      value={truckName}
                      onChange={(e) => setTruckName(e.target.value)}
                      className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Truck Model & Hardware</label>
                    <select
                      value={truckType}
                      onChange={(e) => setTruckType(e.target.value)}
                      className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded text-xs text-gray-800 font-medium"
                    >
                      {TRUCK_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Tag/Assign to Store</label>
                    <select
                      value={targetBranchId}
                      onChange={(e) => setTargetBranchId(e.target.value)}
                      className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Assigned Logistics Driver</label>
                    <select
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      required
                      className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    >
                      <option value="">-- Select a Driver --</option>
                      {driversList.map(u => (
                        <option key={u.id} value={u.name}>
                          {u.name} ({u.email || 'No email'})
                        </option>
                      ))}
                      {driversList.length === 0 && (
                        <option disabled value="">
                          ⚠️ No registered Driver accounts found. Please add a user with the role "Driver" first.
                        </option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Registration Due Date</label>
                    <input 
                      type="date" 
                      value={registrationDueDate}
                      onChange={(e) => setRegistrationDueDate(e.target.value)}
                      className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">VIN #</label>
                    <input 
                      type="text" 
                      placeholder="Vehicle Identification Number"
                      value={vin}
                      onChange={(e) => setVin(e.target.value)}
                      className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded text-xs font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">User Field 1</label>
                    <input 
                      type="text" 
                      placeholder="Optional custom data"
                      value={userField1}
                      onChange={(e) => setUserField1(e.target.value)}
                      className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">User Field 2</label>
                    <input 
                      type="text" 
                      placeholder="Optional custom data"
                      value={userField2}
                      onChange={(e) => setUserField2(e.target.value)}
                      className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Expanded Commercial Specifications */}
                <div className="pt-3 border-t border-slate-200 space-y-3 bg-slate-100/50 p-3.5 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Commercial Registry & Service Records</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Truck #</label>
                      <input
                        type="text"
                        placeholder="e.g. TR-204"
                        value={truckNumber}
                        onChange={(e) => setTruckNumber(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2.5 py-1 rounded text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">License Plate</label>
                      <input
                        type="text"
                        placeholder="e.g. GST-871"
                        value={licensePlate}
                        onChange={(e) => setLicensePlate(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2.5 py-1 rounded text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Make</label>
                      <input
                        type="text"
                        placeholder="e.g. Hino"
                        value={make}
                        onChange={(e) => setMake(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2.5 py-1 rounded text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Model</label>
                      <input
                        type="text"
                        placeholder="e.g. 268"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2.5 py-1 rounded text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Year</label>
                      <input
                        type="number"
                        placeholder="2022"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2.5 py-1 rounded text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Color</label>
                      <input
                        type="text"
                        placeholder="e.g. White"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2.5 py-1 rounded text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Fuel Type</label>
                      <select
                        value={fuelType}
                        onChange={(e) => setFuelType(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-xs text-slate-800 focus:outline-none"
                      >
                        <option value="Diesel">Diesel</option>
                        <option value="Regular Unleaded">Regular Unleaded</option>
                        <option value="Electric">Electric</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Mileage (km)</label>
                      <input
                        type="number"
                        placeholder="145200"
                        value={currentMileage}
                        onChange={(e) => setCurrentMileage(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2.5 py-1 rounded text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Max Payload (Kg)</label>
                      <input
                        type="number"
                        placeholder="e.g. 5000"
                        value={capacityWeightKg}
                        onChange={(e) => setCapacityWeightKg(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2.5 py-1 rounded text-xs text-slate-800 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Cargo Vol (M³)</label>
                      <input
                        type="number"
                        placeholder="e.g. 15.4"
                        value={capacityVolumeM3}
                        onChange={(e) => setCapacityVolumeM3(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2.5 py-1 rounded text-xs text-slate-800 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Last Service Date</label>
                      <input
                        type="date"
                        value={lastServiceDate}
                        onChange={(e) => setLastServiceDate(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Next Service Due</label>
                      <input
                        type="date"
                        value={nextServiceDueDate}
                        onChange={(e) => setNextServiceDueDate(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-slate-200/40 pt-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Insurance Policy #</label>
                      <input
                        type="text"
                        placeholder="Policy number"
                        value={insurancePolicyNumber}
                        onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2.5 py-1 rounded text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Insurance Expiry</label>
                      <input
                        type="date"
                        value={insuranceExpiryDate}
                        onChange={(e) => setInsuranceExpiryDate(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Truck Vehicle Image & Preset Graphic Selector */}
                <div className="p-3.5 bg-slate-100/70 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Truck Image & Vehicle Photo</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">Select fleet preset graphic, upload photo file, or paste image URL</span>
                  </div>

                  {/* Live Image Preview & Selector Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Preview Box */}
                    <div className="sm:col-span-4 relative bg-white rounded-lg overflow-hidden border border-slate-300 aspect-[16/9] flex items-center justify-center p-2 group shadow-sm">
                      <img 
                        src={truckImageUrl ? truckImageUrl : getTruckImage({ type: truckType, name: truckName })} 
                        alt="Truck Preview" 
                        className="w-full h-full object-contain scale-110"
                      />
                      {truckImageUrl && (
                        <button
                          type="button"
                          onClick={() => setTruckImageUrl('')}
                          className="absolute top-1.5 right-1.5 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors cursor-pointer shadow-md"
                          title="Clear custom image (reset to auto preset)"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      <div className="absolute bottom-1 left-1.5 px-1.5 py-0.5 bg-slate-900/80 rounded text-[9px] font-mono text-slate-200 border border-white/10">
                        {truckImageUrl ? 'Custom Image' : 'Preset Category'}
                      </div>
                    </div>

                    {/* Presets & Custom File Upload */}
                    <div className="sm:col-span-8 space-y-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Fleet Category Presets:</label>
                        <div className="grid grid-cols-5 gap-1.5">
                          {TRUCK_IMAGE_PRESETS.map((preset) => {
                            const isSelected = truckImageUrl === preset.svgDataUri || (!truckImageUrl && getTruckImage({ type: truckType, name: truckName }) === preset.svgDataUri);
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => setTruckImageUrl(preset.svgDataUri)}
                                className={`p-1 rounded-lg border text-left transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                  isSelected 
                                    ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500/30' 
                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100'
                                }`}
                                title={preset.description}
                              >
                                <div className="w-full aspect-[4/3] bg-white rounded border border-slate-200 overflow-hidden p-0.5 flex items-center justify-center">
                                  <img src={preset.svgDataUri} alt={preset.name} className="w-full h-full object-contain scale-110" />
                                </div>
                                <span className="text-[9px] font-bold text-slate-800 truncate w-full text-center">{preset.name.split(' ')[0]}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          accept="image/*" 
                          onChange={handleImageFileUpload} 
                          className="hidden" 
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        >
                          <Upload className="w-3.5 h-3.5 text-blue-400" />
                          <span>Upload Image...</span>
                        </button>

                        <div className="flex-1">
                          <input 
                            type="text" 
                            placeholder="Or paste image URL (https://...)" 
                            value={truckImageUrl.startsWith('data:') ? '' : truckImageUrl} 
                            onChange={(e) => setTruckImageUrl(e.target.value)}
                            className="w-full border bg-white border-slate-200 px-2.5 py-1.5 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2 pt-1.5 border-t border-slate-200/50">
                  <button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-4 rounded-lg flex items-center space-x-1 shadow-sm"
                  >
                    <FileCheck className="h-3.5 w-3.5" />
                    <span>Save Vehicle Listing</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setIsAdding(false); setEditingTruckId(null); }}
                    className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-gray-700 text-xs font-medium rounded-lg"
                  >
                    Discard Changes
                  </button>
                </div>
              </form>
            ) : null}

            {/* List of Registered Fleet Trucks */}
            <div className="space-y-2.5">
              {filteredTrucks.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl py-12 text-center text-gray-400 space-y-2">
                  <TruckIcon className="h-8 w-8 text-slate-300 mx-auto" />
                  <div>
                    <p className="text-xs font-bold text-gray-700">No trucks assigned to this branch storefront</p>
                    <p className="text-[11px]">Deploy flatbeds, boom cranes, or trucks to this storefront to facilitate dispatching.</p>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={handleStartAdd}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center justify-center space-x-0.5 mx-auto"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Deploy first vehicle now</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredTrucks.map(truck => (
                  <div 
                    key={truck.id} 
                    className="border border-slate-100 rounded-xl p-3.5 bg-white flex items-center justify-between gap-4 shadow-sm hover:border-slate-200/80 transition-all"
                  >
                    <div className="flex items-center space-x-3.5">
                      {/* Truck Image Thumbnail */}
                      <div className="w-16 h-12 bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                        <img 
                          src={getTruckImage(truck)} 
                          alt={truck.name} 
                          className="w-full h-full object-contain scale-110" 
                        />
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-sans font-bold text-gray-900 text-sm">{truck.name}</span>
                          <span className="text-[9px] px-1.5 py-0.25 bg-slate-100 text-slate-600 font-mono font-bold rounded">
                            {truck.id}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 mt-1">
                          <span className="font-semibold text-slate-700">{truck.type}</span>
                          <span className="text-gray-300">&bull;</span>
                          <span className="flex items-center text-[11px]">
                            Driver: <strong className="text-slate-800 ml-1">{truck.driver}</strong>
                          </span>
                          {truck.registrationDueDate && (
                            <>
                              <span className="text-gray-300">&bull;</span>
                              <span className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] border ${
                                (() => {
                                  const expDate = new Date(truck.registrationDueDate);
                                  const now = new Date();
                                  return expDate < now;
                                })() 
                                  ? 'bg-red-50 text-red-700 border-red-200' 
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
                              }`}>
                                <Calendar className="h-3 w-3 shrink-0" />
                                <span>Reg Due: <strong className="font-mono">{truck.registrationDueDate}</strong></span>
                                {(() => {
                                  const expDate = new Date(truck.registrationDueDate);
                                  const now = new Date();
                                  return expDate < now;
                                })() && (
                                  <span className="text-red-600 font-extrabold uppercase text-[8px] tracking-wider animate-pulse ml-1">(! OVERDUE)</span>
                                )}
                              </span>
                            </>
                          )}
                        </div>
                                            {/* Custom Fields Row */}
                        {(truck.vin || truck.userField1 || truck.userField2 || truck.truckNumber || truck.licensePlate || truck.make || truck.model || truck.year || truck.color || truck.fuelType || truck.currentMileage || truck.lastServiceDate || truck.nextServiceDueDate || truck.insurancePolicyNumber || truck.insuranceExpiryDate) && (
                          <div className="flex flex-col gap-1 text-[10px] text-gray-500 mt-1.5 bg-slate-50 p-2.5 rounded border border-slate-100">
                            
                            {/* Line 1: Commercial details */}
                            {(truck.truckNumber || truck.licensePlate || truck.make || truck.model || truck.year || truck.color) && (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="font-bold text-slate-400 font-mono">SPEC:</span>
                                {truck.truckNumber && <span className="bg-slate-200 px-1 py-0.25 rounded font-mono text-slate-800">No.{truck.truckNumber}</span>}
                                {truck.licensePlate && <span className="bg-blue-105 border border-blue-200 text-blue-800 px-1 py-0.25 rounded font-mono font-bold">Plate: {truck.licensePlate}</span>}
                                {(truck.make || truck.model || truck.year) && (
                                  <span className="text-slate-700">
                                    {truck.year} {truck.make} {truck.model} {truck.color ? `(${truck.color})` : ''}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Line 2: Mileage & Fuel */}
                            {(truck.currentMileage || truck.fuelType) && (
                              <div className="flex flex-wrap items-center gap-1 pt-0.5 border-t border-slate-200/40">
                                <span className="font-bold text-slate-400 font-mono">FUEL/ODO:</span>
                                {truck.fuelType && <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1 py-0.25 rounded font-bold">{truck.fuelType}</span>}
                                {truck.currentMileage !== undefined && <span className="text-slate-700"><strong className="font-mono">{truck.currentMileage.toLocaleString()}</strong> km</span>}
                              </div>
                            )}

                            {/* Line 3: Servicing & Insurance */}
                            {(truck.lastServiceDate || truck.nextServiceDueDate || truck.insurancePolicyNumber || truck.insuranceExpiryDate) && (
                              <div className="flex flex-wrap items-center gap-1 pt-0.5 border-t border-slate-200/40 leading-tight">
                                <span className="font-bold text-slate-400 font-mono">SERVICE:</span>
                                {truck.lastServiceDate && <span>Last: <strong className="font-mono text-slate-600">{truck.lastServiceDate}</strong></span>}
                                {truck.nextServiceDueDate && (
                                  <span className={`px-1 rounded ${
                                    new Date(truck.nextServiceDueDate) < new Date() ? 'bg-rose-50 text-rose-700 font-bold' : 'text-slate-600'
                                  }`}>Next: <strong className="font-mono">{truck.nextServiceDueDate}</strong></span>
                                )}
                                {truck.insurancePolicyNumber && (
                                  <span className="text-slate-600">Ins: <strong className="font-mono text-slate-700">{truck.insurancePolicyNumber}</strong></span>
                                )}
                              </div>
                            )}

                            {/* Line 4: Payload capacities */}
                            {(truck.capacityWeightKg || truck.capacityVolumeM3) && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5 border-t border-slate-200/40">
                                <span className="font-bold text-slate-400 font-mono">LOAD:</span>
                                {truck.capacityWeightKg && <span>Max Weight: <strong className="font-mono text-slate-700">{truck.capacityWeightKg}</strong> kg</span>}
                                {truck.capacityVolumeM3 && <span>Volume: <strong className="font-mono text-slate-700">{truck.capacityVolumeM3}</strong> m³</span>}
                              </div>
                            )}

                            {/* Legacy custom fields */}
                            {(truck.vin || truck.userField1 || truck.userField2) && (
                              <div className="flex flex-wrap items-center gap-1 pt-0.5 border-t border-slate-200/40">
                                {truck.vin && (
                                  <span className="flex items-center">
                                    <span className="font-semibold text-slate-400 mr-1">VIN:</span>
                                    <span className="font-mono text-slate-700">{truck.vin}</span>
                                  </span>
                                )}
                                {truck.vin && (truck.userField1 || truck.userField2) && <span className="text-gray-300">&bull;</span>}
                                {truck.userField1 && (
                                  <span className="flex items-center">
                                    <span className="font-semibold text-slate-400 mr-1">F1:</span>
                                    <span className="text-slate-700">{truck.userField1}</span>
                                  </span>
                                )}
                                {truck.userField1 && truck.userField2 && <span className="text-gray-300">&bull;</span>}
                                {truck.userField2 && (
                                  <span className="flex items-center">
                                    <span className="font-semibold text-slate-400 mr-1">F2:</span>
                                    <span className="text-slate-700">{truck.userField2}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    {!readOnly && (
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => handleStartEdit(truck)}
                          aria-label="Edit truck"
                          className="p-1.5 hover:bg-slate-50 border border-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(truck.id)}
                          aria-label="Delete truck"
                          className="p-1.5 hover:bg-red-50 border border-red-50 rounded-lg text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center">
              <Shield className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Active Local Registry persistence
            </span>
            <span>Total Region Fleet: <strong>{trucks.length} Trucks</strong></span>
          </div>

        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-55 backdrop-blur-xs">
          <div 
            className="fixed inset-0" 
            onClick={() => setShowDeleteConfirmId(null)}
          />
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full relative z-10 animate-in fade-in zoom-in duration-150 p-6">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h4 className="font-sans font-bold text-slate-900 text-lg">
                Decommission Vehicle
              </h4>
            </div>
            
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Are you sure you want to permanently decommission vehicle <strong className="text-slate-900 font-semibold">{showDeleteConfirmId}</strong>? This action cannot be undone and will remove the vehicle from active fleets.
            </p>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700 hover:bg-slate-200 transition-colors font-semibold cursor-pointer text-xs"
              >
                Cancel, Keep Vehicle
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTruck(showDeleteConfirmId);
                  setShowDeleteConfirmId(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm transition-colors font-bold cursor-pointer text-xs flex items-center space-x-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Decommission</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
