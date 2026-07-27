import React, { useState } from 'react';
import { formatPhoneNumber } from '../lib/formatters';
import { Branch } from '../types';
import { Store, Plus, Edit2, Trash2, Shield, Info, MapPin, Building, CheckCircle, AlertTriangle } from 'lucide-react';

interface StoresSetupProps {
  branches: Branch[];
  onAddBranch: (branch: Branch) => void;
  onUpdateBranch: (branch: Branch) => void;
  onDeleteBranch: (id: string) => void;
  truckCountByBranch: Record<string, number>;
  readOnly?: boolean;
}

export default function StoresSetup({
  branches,
  onAddBranch,
  onUpdateBranch,
  onDeleteBranch,
  truckCountByBranch,
  readOnly
}: StoresSetupProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);

  // Form Inputs
  const [storeId, setStoreId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeType, setStoreType] = useState<'STORE' | 'DC'>('STORE');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeLat, setStoreLat] = useState('');
  const [storeLng, setStoreLng] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string, name: string } | null>(null);

  // New Branch Properties
  const [branchCode, setBranchCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchType, setBranchType] = useState<'STORE' | 'DC' | 'Depot' | 'Warehouse' | 'Pickup'>('STORE');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [provinceState, setProvinceState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');

  const cleanAddressText = (address: string | undefined): string => {
    if (!address) return '';
    return address
      .replace(/\|\|lat:\s*(-?\d+(?:\.\d+)?)/gi, '')
      .replace(/\|\|lng:\s*(-?\d+(?:\.\d+)?)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleStartAdd = () => {
    setStoreId(`STORE-${Math.floor(1000 + Math.random() * 9000)}`);
    setStoreName('');
    setStoreType('STORE');
    setStoreAddress('');
    setStoreLat('');
    setStoreLng('');
    
    // Reset properties
    setBranchCode('');
    setBranchName('');
    setBranchType('STORE');
    setAddress1('');
    setAddress2('');
    setCity('');
    setProvinceState('');
    setPostalCode('');
    setCountry('');
    setPhoneNumber('');
    setEmail('');

    setIsAdding(true);
    setEditingBranchId(null);
  };

  const handleStartEdit = (branch: Branch) => {
    const addr = branch.address || '';
    const latMatch = addr.match(/\|\|lat:\s*(-?\d+(?:\.\d+)?)/i);
    const lngMatch = addr.match(/\|\|lng:\s*(-?\d+(?:\.\d+)?)/i);
    
    let cleanAddress = addr;
    if (latMatch) cleanAddress = cleanAddress.replace(/\|\|lat:[^\s|]+/, '');
    if (lngMatch) cleanAddress = cleanAddress.replace(/\|\|lng:[^\s|]+/, '');
    cleanAddress = cleanAddress.replace(/\s+/g, ' ').trim();

    setStoreId(branch.id);
    setStoreName(branch.name);
    setStoreType(branch.type);
    setStoreAddress(cleanAddress);
    setStoreLat(latMatch ? latMatch[1] : '');
    setStoreLng(lngMatch ? lngMatch[1] : '');
    
    // Load properties
    setBranchCode(branch.branchCode || '');
    setBranchName(branch.branchName || branch.name);
    setBranchType(branch.branchType || (branch.type as any) || 'STORE');
    setAddress1(branch.address1 || '');
    setAddress2(branch.address2 || '');
    setCity(branch.city || '');
    setProvinceState(branch.provinceState || '');
    setPostalCode(branch.postalCode || '');
    setCountry(branch.country || '');
    setPhoneNumber(branch.phoneNumber || '');
    setEmail(branch.email || '');

    setEditingBranchId(branch.id);
    setIsAdding(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !storeAddress.trim()) {
      alert('Please fill in both the Store Name and Address.');
      return;
    }

    let finalAddress = storeAddress.trim();
    if (storeLat.trim() && storeLng.trim()) {
      finalAddress += ` ||lat:${storeLat.trim()} ||lng:${storeLng.trim()}`;
    }

    const payload: Branch = {
      id: storeId,
      name: storeName.trim(),
      type: storeType,
      address: finalAddress,
      
      // New properties
      branchCode: branchCode.trim() || storeId,
      branchName: branchName.trim() || storeName.trim(),
      branchType: branchType,
      address1: address1.trim() || storeAddress.trim(),
      address2: address2.trim() || undefined,
      city: city.trim() || undefined,
      provinceState: provinceState.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
      country: country.trim() || undefined,
      latitude: storeLat ? parseFloat(storeLat) : undefined,
      longitude: storeLng ? parseFloat(storeLng) : undefined,
      phoneNumber: phoneNumber.trim() || undefined,
      email: email.trim() || undefined
    };

    if (editingBranchId) {
      onUpdateBranch(payload);
      setEditingBranchId(null);
      showFeedback('Store information updated successfully.');
    } else {
      // Check if ID is unique
      if (branches.some(b => b.id === storeId)) {
        payload.id = `STORE-${Math.floor(10000 + Math.random() * 89999)}`;
      }
      onAddBranch(payload);
      setIsAdding(false);
      showFeedback('New store branch registered successfully.');
    }

    // Reset Form
    setStoreName('');
    setStoreAddress('');
    setStoreLat('');
    setStoreLng('');
    
    setBranchCode('');
    setBranchName('');
    setBranchType('STORE');
    setAddress1('');
    setAddress2('');
    setCity('');
    setProvinceState('');
    setPostalCode('');
    setCountry('');
    setPhoneNumber('');
    setEmail('');
  };

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleDelete = (id: string, name: string) => {
    const activeTrucks = truckCountByBranch[id] || 0;
    if (activeTrucks > 0) {
      alert(`Cannot delete store "${name}" because it still has ${activeTrucks} truck(s) assigned to its fleet. Please re-assign or decommission the trucks first.`);
      return;
    }
    setShowDeleteConfirm({ id, name });
  };

  return (
    <div className="space-y-6 animate-fade-in" id="stores-setup-view">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h4 className="font-sans font-bold text-gray-900 tracking-tight text-xl">Store Branches Management</h4>
          <p className="text-xs text-gray-500">
            Configure ProSpaces physical retail store locations and bulk distributions within the regional dispatch ecosystem
          </p>
        </div>
      </div>

      {feedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center space-x-2 shadow-sm">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Add/Edit Form */}
        <div className="lg:col-span-4 space-y-4">
          {readOnly ? (
            <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-xl text-center space-y-4">
              <div className="w-12 h-12 bg-slate-150/80 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-200/40">
                <Info className="h-6 w-6" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-700">View Only Mode</h5>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  As a Dispatcher, you have authorization rules to observe depots and storefront locations, but modifying them is restricted.
                </p>
              </div>
            </div>
          ) : (!isAdding && !editingBranchId) ? (
            <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-sm text-center space-y-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-gray-900">Add New Branch Location</h5>
                <p className="text-xs text-gray-500 mt-1">
                  Expand the logistics fleet coverage by appending retail stores or distribution nodes.
                </p>
              </div>
              <button
                onClick={handleStartAdd}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-lg flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Register Store</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white border border-slate-100 p-5 rounded-xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h5 className="text-xs font-bold text-blue-900 uppercase tracking-wider font-mono flex items-center">
                  <Building className="h-4 w-4 mr-1 text-blue-600" />
                  {editingBranchId ? 'Edit Store Details' : 'Register Store'}
                </h5>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingBranchId(null); }}
                  className="text-gray-400 hover:text-gray-600 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Store / DC Identifier</label>
                  <input
                    type="text"
                    value={storeId}
                    onChange={(e) => {
                      if (!editingBranchId) {
                        setStoreId(e.target.value.toUpperCase().replace(/\s+/g, '_'));
                      }
                    }}
                    disabled={!!editingBranchId}
                    required
                    placeholder="e.g. 01080_SACKVILLE"
                    className="w-full border bg-slate-50 border-slate-200 px-3 py-1.5 rounded text-xs font-mono text-gray-800 disabled:opacity-75 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {!editingBranchId && (
                    <span className="text-[9px] text-gray-400 mt-0.5 block">Unique database code (use uppercase & underscores)</span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Corporate Store Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 01080 - Lower Sackville ProSpaces"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Logistics NodeType</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setStoreType('STORE')}
                      className={`py-1.5 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                        storeType === 'STORE'
                          ? 'bg-blue-50 border-blue-600 text-blue-900 font-bold shadow-sm'
                          : 'border-slate-200 hover:bg-slate-50 text-gray-600'
                      }`}
                    >
                      🏪 Retail Store
                    </button>
                    <button
                      type="button"
                      onClick={() => setStoreType('DC')}
                      className={`py-1.5 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                        storeType === 'DC'
                          ? 'bg-red-50 border-red-600 text-red-900 font-bold shadow-sm'
                          : 'border-slate-200 hover:bg-slate-50 text-gray-600'
                      }`}
                    >
                      🏭 Bulk DC Hub
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Physical Postal Address</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. 15 Cobequid Rd, Lower Sackville, NS B4C 2M9"
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">Latitude (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 44.7642"
                      value={storeLat}
                      onChange={(e) => setStoreLat(e.target.value)}
                      className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded text-xs font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">Longitude (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. -63.6823"
                      value={storeLng}
                      onChange={(e) => setStoreLng(e.target.value)}
                      className="w-full border bg-white border-slate-200 px-3 py-1.5 rounded text-xs font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Expanded Branch Specifics */}
                <div className="pt-3 border-t border-slate-200 space-y-2 bg-slate-50 p-3.5 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Logistics Registry Details</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Branch Code</label>
                      <input
                        type="text"
                        placeholder="e.g. BR-1080"
                        value={branchCode}
                        onChange={(e) => setBranchCode(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2.5 py-1 rounded text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Branch Type</label>
                      <select
                        value={branchType}
                        onChange={(e) => setBranchType(e.target.value as any)}
                        className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-xs text-slate-800 focus:outline-none font-medium"
                      >
                        <option value="STORE">Store</option>
                        <option value="DC">DC (Distribution Center)</option>
                        <option value="Depot">Depot</option>
                        <option value="Warehouse">Warehouse</option>
                        <option value="Pickup">Pickup Point</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Alternative Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Lower Sackville Depot"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      className="w-full border bg-white border-slate-200 px-2.5 py-1 rounded text-xs text-slate-800 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 border-t border-slate-200/40 pt-1.5">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Formatted Address Components</span>
                    
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        placeholder="Address Line 1"
                        value={address1}
                        onChange={(e) => setAddress1(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-[11px] text-slate-800 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Address Line 2 (Optional)"
                        value={address2}
                        onChange={(e) => setAddress2(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-[11px] text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        placeholder="City"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-[11px] text-slate-800 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Province / State"
                        value={provinceState}
                        onChange={(e) => setProvinceState(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-[11px] text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        placeholder="Postal / ZIP Code"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-[11px] text-slate-800 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-[11px] text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 border-t border-slate-200/40 pt-1.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Contact Phone</label>
                      <input
                        type="text"
                        placeholder="Branch line"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                        className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">Contact Email</label>
                      <input
                        type="email"
                        placeholder="Branch inbox"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border bg-white border-slate-200 px-2 py-1 rounded text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg text-center font-sans tracking-tight"
                >
                  {editingBranchId ? 'Update Store' : 'Register Location'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingBranchId(null); }}
                  className="px-3 bg-slate-100 hover:bg-slate-200 text-gray-600 text-xs font-medium rounded-lg"
                >
                  Dismiss
                </button>
              </div>
            </form>
          )}

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-[11px] text-gray-500 space-y-2">
            <p className="font-semibold flex items-center text-gray-800 text-xs">
              <Info className="h-3.5 w-3.5 mr-1 text-blue-500" /> Operational Policies
            </p>
            <p>
              Stores act as regional order hubs. Deleting a store requires all assigned delivery trucks to be reassigned to other branches or decommissioned first, protecting ongoing runs from data errors.
            </p>
          </div>
        </div>

        {/* Right column: Store list */}
        <div className="lg:col-span-8 bg-white border border-slate-100 p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-sans font-bold text-gray-900 text-base">Registered Stores Registry</h4>
                <p className="text-xs text-gray-500 font-medium">Currently servicing {branches.length} active terminals in Nova Scotia</p>
              </div>
            </div>

            <div className="space-y-3">
              {branches.map(branch => {
                const assignedTrucks = truckCountByBranch[branch.id] || 0;
                const isDc = branch.type === 'DC';

                return (
                  <div
                    key={branch.id}
                    className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-all bg-white relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-start space-x-3.5">
                      <div className={`p-2.5 rounded-lg border shrink-0 ${
                        isDc 
                          ? 'bg-red-50 text-red-600 border-red-100' 
                          : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {isDc ? <Building className="h-5 w-5" /> : <Store className="h-5 w-5" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h5 className="font-sans font-bold text-gray-900 text-sm">{branch.name}</h5>
                          <span className={`text-[8px] px-1.5 py-0.5 font-bold uppercase rounded leading-none ${
                            isDc 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {branch.branchType || (isDc ? 'Bulk DC' : 'Retailer')}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500 font-mono">
                          <span className="bg-slate-50 px-1.5 py-0.5 rounded">ID: {branch.id}</span>
                          {branch.branchCode && <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">Code: {branch.branchCode}</span>}
                        </div>
                        <div className="flex flex-col text-xs text-gray-500 space-y-0.5 pt-1">
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-sm sm:max-w-md font-medium text-slate-700" title={cleanAddressText(branch.address)}>
                              {branch.address1 || cleanAddressText(branch.address)}
                              {branch.address2 && `, ${branch.address2}`}
                              {(branch.city || branch.provinceState || branch.postalCode) && (
                                <span className="text-slate-500 ml-1">
                                  ({[branch.city, branch.provinceState, branch.postalCode, branch.country].filter(Boolean).join(', ')})
                                </span>
                              )}
                            </span>
                            {(() => {
                              const latMatch = (branch.address || '').match(/\|\|lat:\s*(-?\d+(?:\.\d+)?)/i);
                              const lngMatch = (branch.address || '').match(/\|\|lng:\s*(-?\d+(?:\.\d+)?)/i);
                              if (latMatch && lngMatch) {
                                return (
                                  <span className="ml-1 font-mono text-[9px] text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                                    📍 {parseFloat(latMatch[1]).toFixed(4)}, {parseFloat(lngMatch[1]).toFixed(4)}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          {(branch.phoneNumber || branch.email) && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500 border-t border-slate-100/60">
                              {branch.phoneNumber && (
                                <span>📞 <strong className="text-slate-700 font-mono">{branch.phoneNumber}</strong></span>
                              )}
                              {branch.phoneNumber && branch.email && <span className="text-slate-300">&bull;</span>}
                              {branch.email && (
                                <span>✉️ <span className="text-blue-600 font-mono">{branch.email}</span></span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-50">
                      <span className={`text-[10px] font-mono px-2 py-1 rounded font-bold border ${
                        assignedTrucks > 0
                          ? 'bg-blue-50 text-blue-800 border-blue-100'
                          : 'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>
                        {assignedTrucks} {assignedTrucks === 1 ? 'Truck Assigned' : 'Trucks Assigned'}
                      </span>

                      {!readOnly && (
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            onClick={() => handleStartEdit(branch)}
                            className="p-1.5 hover:bg-slate-50 border border-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                            title="Edit Store"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(branch.id, branch.name)}
                            className="p-1.5 hover:bg-red-50 border border-red-50 rounded-lg text-red-500 hover:text-red-700 transition-colors"
                            title="Delete Store"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center">
              <Shield className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Authorized Storefront Access Role
            </span>
            <span>Total Operational Depots: <strong>{branches.length}</strong></span>
          </div>
        </div>
      </div>
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-55 backdrop-blur-xs">
          <div 
            className="fixed inset-0" 
            onClick={() => setShowDeleteConfirm(null)}
          />
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full relative z-10 animate-in fade-in zoom-in duration-150 p-6">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h4 className="font-sans font-bold text-slate-900 text-lg">
                Remove Store Depot
              </h4>
            </div>
            
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Are you sure you want to delete and permanently remove active store storefront: <strong className="text-slate-900 font-semibold">{showDeleteConfirm.name}</strong> ({showDeleteConfirm.id})? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700 hover:bg-slate-200 transition-colors font-semibold cursor-pointer text-xs"
              >
                Cancel, Keep Store
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteBranch(showDeleteConfirm.id);
                  showFeedback('Store branch discarded successfully.');
                  setShowDeleteConfirm(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm transition-colors font-bold cursor-pointer text-xs flex items-center space-x-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Store</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
