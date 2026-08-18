import React, { useState, useMemo } from 'react';
import { useTelematics } from '../lib/telematicsService';
import TelematicsMapView from './TelematicsMapView';
import { VehicleRecord } from '../types/telematics';
import { 
  Truck as TruckIcon, 
  MapPin, 
  RefreshCw, 
  Activity, 
  Gauge, 
  Compass, 
  CheckCircle2, 
  AlertCircle, 
  Fuel, 
  Zap, 
  User, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Clock, 
  Radio, 
  Shield, 
  Phone, 
  Check, 
  Navigation2, 
  Play, 
  Pause, 
  Sparkles, 
  ChevronRight, 
  Layers, 
  SlidersHorizontal,
  Sliders,
  Cpu
} from 'lucide-react';

export default function TelematicsDashboard() {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'MOVING' | 'IDLE' | 'STOPPED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const {
    vehicles,
    selectedVehicle,
    selectedVehicleId,
    summary,
    isLoading,
    isStreaming,
    lastUpdated,
    error,
    pollingIntervalMs,
    setSelectedVehicleId,
    setPollingIntervalMs,
    setIsStreaming,
    refreshTelematics
  } = useTelematics({
    pollingIntervalMs: 5000,
    statusFilter,
    searchQuery
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MOVING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            MOVING
          </span>
        );
      case 'IDLE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1.5"></span>
            IDLE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-100 text-slate-700 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 mr-1.5"></span>
            STOPPED
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* ── Top Telematics Header & KPI Summary Ribbon ── */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Brand Title & Live Beacon */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-900 text-white flex items-center justify-center shadow-md">
              <Radio className="h-5 w-5 text-blue-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black tracking-tight text-blue-950">Fleet Telematics & Live GPS</h1>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-mono font-bold rounded-md border border-blue-200">
                  REST v1
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Real-time Unity / Fleet Complete vehicle stream & automated route progression
              </p>
            </div>
          </div>

          {/* Polling Controls & Stream Engine */}
          <div className="flex items-center space-x-2 self-start md:self-auto">
            {/* Interval Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
              <span className="px-2 text-[10px] uppercase text-slate-400 font-bold">Poll</span>
              {[3000, 5000, 15000].map((ms) => (
                <button
                  key={ms}
                  type="button"
                  onClick={() => setPollingIntervalMs(ms)}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    pollingIntervalMs === ms 
                      ? 'bg-white text-blue-900 shadow-xs font-black' 
                      : 'hover:text-slate-900'
                  }`}
                >
                  {ms / 1000}s
                </button>
              ))}
            </div>

            {/* Manual Refresh */}
            <button
              type="button"
              onClick={() => refreshTelematics()}
              className="p-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-xs"
              title="Manual Sync"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Interactive KPI Filter Ribbon Bar ── */}
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                : 'bg-slate-50/80 hover:bg-slate-100/80 border-slate-200/70'
            }`}
          >
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Fleet</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-lg font-black text-slate-900">{summary.totalVehicles}</span>
              <span className="text-[11px] text-slate-500 font-medium">units</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('MOVING')}
            className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'MOVING'
                ? 'bg-emerald-100/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-emerald-50/50 hover:bg-emerald-100/50 border-emerald-200/60'
            }`}
          >
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Moving (Active)</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-lg font-black text-emerald-700">{summary.movingCount}</span>
              <span className="text-[11px] text-emerald-600 font-medium">in transit</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('IDLE')}
            className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'IDLE'
                ? 'bg-amber-100/70 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-amber-50/50 hover:bg-amber-100/50 border-amber-200/60'
            }`}
          >
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Idling Engine</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-lg font-black text-amber-700">{summary.idleCount}</span>
              <span className="text-[11px] text-amber-600 font-medium">stationary</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('STOPPED')}
            className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'STOPPED'
                ? 'bg-slate-200 border-slate-500 ring-2 ring-slate-500/20 shadow-xs'
                : 'bg-slate-100/60 hover:bg-slate-200/60 border-slate-200/70'
            }`}
          >
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Stopped / Off</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-lg font-black text-slate-700">{summary.stoppedCount}</span>
              <span className="text-[11px] text-slate-500 font-medium">parked</span>
            </div>
          </button>

          <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-200/60">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Fleet Avg Speed</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-lg font-black text-blue-900">{summary.averageSpeed}</span>
              <span className="text-[11px] text-blue-700 font-medium">km/h</span>
            </div>
          </div>

          <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Stops</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-lg font-black text-slate-900">{summary.totalActiveDeliveries}</span>
              <span className="text-[11px] text-slate-500 font-medium">stops</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Two-Column Telematics Layout ── */}
      <main className="max-w-7xl mx-auto w-full flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ── Left Column: Vehicle Telematics Directory (4 cols) ── */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          
          {/* Search & Status Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search truck, VIN, plate, or driver..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              {(['ALL', 'MOVING', 'IDLE', 'STOPPED'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                    statusFilter === tab
                      ? 'bg-white text-blue-900 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle List */}
          <div className="space-y-2.5 max-h-[calc(100vh-340px)] overflow-y-auto pr-1">
            {vehicles.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500">
                <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold">No telemetry records match your filters.</p>
              </div>
            ) : (
              vehicles.map((v) => {
                const isSelected = v.vehicleId === selectedVehicleId;
                const stops = v.activeRoute?.stops || [];
                const completed = v.activeRoute?.completedStops || 0;

                return (
                  <div
                    key={v.vehicleId}
                    onClick={() => setSelectedVehicleId(v.vehicleId)}
                    className={`bg-white rounded-2xl p-3.5 border transition-all cursor-pointer shadow-xs hover:border-blue-300 ${
                      isSelected 
                        ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20' 
                        : 'border-slate-200/90 hover:bg-slate-50/50'
                    }`}
                  >
                    {/* Header: Name & Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-mono font-bold text-xs">
                          #{v.vehicleId.slice(-3)}
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-slate-900 leading-snug">{v.truckName}</h3>
                          <p className="text-[11px] text-slate-500 font-mono">{v.licensePlate} &bull; {v.model}</p>
                        </div>
                      </div>
                      {getStatusBadge(v.status)}
                    </div>

                    {/* Telemetry Metrics Bar */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-100 text-center">
                      <div className="bg-slate-50 py-1 rounded-lg">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Speed</span>
                        <span className="text-xs font-mono font-black text-blue-700">
                          {Math.round(((v.telematics || v.telemetry)?.speedMph ?? (v.telematics || v.telemetry)?.speed ?? 0) * 1.60934)} km/h
                        </span>
                      </div>
                      <div className="bg-slate-50 py-1 rounded-lg">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Heading</span>
                        <span className="text-xs font-mono font-bold text-slate-700">
                          {(v.telematics || v.telemetry)?.heading ?? 0}&deg;
                        </span>
                      </div>
                      <div className="bg-slate-50 py-1 rounded-lg">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Fuel</span>
                        <span className="text-xs font-mono font-bold text-emerald-600">
                          {(v.telematics || v.telemetry)?.fuelPercent ?? (v.telematics || v.telemetry)?.fuelLevel ?? 0}%
                        </span>
                      </div>
                    </div>

                    {/* Driver & Route Progress */}
                    {v.activeRoute && (
                      <div className="mt-2.5 space-y-1 bg-slate-50/60 p-2 rounded-xl border border-slate-200/50">
                        <div className="flex items-center justify-between text-[11px] text-slate-600">
                          <div className="flex items-center space-x-1.5 truncate">
                            <User className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate font-medium">{v.driver?.name || v.activeRoute.driverName}</span>
                          </div>
                          <span className="font-mono text-slate-500 shrink-0 ml-2 font-bold">
                            {completed}/{stops.length || v.activeRoute.totalStops || 0} Stops
                          </span>
                        </div>
                        {v.activeRoute.nextStop && (
                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/40">
                            <span className="truncate pr-2 font-mono text-slate-600 font-medium">
                              Next: {v.activeRoute.nextStop}
                            </span>
                            <span className="font-mono text-blue-700 font-bold shrink-0">
                              ETA {v.activeRoute.eta || v.activeRoute.scheduledETA}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Column: Interactive Map & Live Telemetry HUD (8 cols) ── */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          
          {/* Interactive Google Map Telematics View */}
          <div className="h-[460px] sm:h-[520px] rounded-2xl overflow-hidden shadow-xs border border-slate-200/90">
            <TelematicsMapView
              vehicles={vehicles}
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={(id) => setSelectedVehicleId(id)}
              isStreaming={isStreaming}
              onToggleStreaming={() => setIsStreaming(!isStreaming)}
            />
          </div>

          {/* ── Detailed Telemetry Inspector Panel ── */}
          {selectedVehicle ? (
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-5">
              
              {/* Header Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-2xl bg-blue-900 text-white flex items-center justify-center font-black">
                    <TruckIcon className="h-5 w-5 text-blue-300" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-sm font-black text-slate-950">{selectedVehicle.truckName}</h2>
                      {getStatusBadge(selectedVehicle.status)}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Plate: {selectedVehicle.licensePlate} &bull; Driver: {selectedVehicle.driver?.name || selectedVehicle.activeRoute?.driverName || 'N/A'} &bull; Odometer: {(selectedVehicle.telematics || selectedVehicle.telemetry)?.odometer?.toLocaleString()} km
                    </p>
                  </div>
                </div>

                {selectedVehicle.activeRoute && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Next Stop ETA</span>
                    <span className="text-sm font-black text-blue-900 font-mono">{selectedVehicle.activeRoute.eta || selectedVehicle.activeRoute.scheduledETA}</span>
                  </div>
                )}
              </div>

              {/* Live Gauges & Engine Diagnostics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Speedometer Gauge */}
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 flex flex-col items-center text-center">
                  <Gauge className="h-5 w-5 text-blue-600 mb-1" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Live Speed</span>
                  <span className="text-lg font-mono font-black text-blue-950 mt-0.5">
                    {Math.round(((selectedVehicle.telematics || selectedVehicle.telemetry)?.speedMph ?? (selectedVehicle.telematics || selectedVehicle.telemetry)?.speed ?? 0) * 1.60934)} <span className="text-xs font-normal text-slate-500">km/h</span>
                  </span>
                </div>

                {/* Heading Compass */}
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 flex flex-col items-center text-center">
                  <Compass className="h-5 w-5 text-indigo-600 mb-1" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Heading Bearing</span>
                  <span className="text-lg font-mono font-black text-indigo-950 mt-0.5">
                    {(selectedVehicle.telematics || selectedVehicle.telemetry)?.heading}&deg;
                  </span>
                </div>

                {/* Fuel Level */}
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 flex flex-col items-center text-center">
                  <Fuel className="h-5 w-5 text-emerald-600 mb-1" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Fuel Level</span>
                  <span className="text-lg font-mono font-black text-emerald-700 mt-0.5">
                    {(selectedVehicle.telematics || selectedVehicle.telemetry)?.fuelPercent ?? (selectedVehicle.telematics || selectedVehicle.telemetry)?.fuelLevel}%
                  </span>
                </div>

                {/* Ignition Status & Battery */}
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 flex flex-col items-center text-center">
                  <Zap className="h-5 w-5 text-amber-600 mb-1" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Ignition & Volt</span>
                  <span className="text-lg font-mono font-black text-slate-900 mt-0.5">
                    {(selectedVehicle.telematics || selectedVehicle.telemetry)?.ignitionStatus} <span className="text-xs font-normal text-slate-500 font-mono">{(selectedVehicle.telematics || selectedVehicle.telemetry)?.batteryVoltage}V</span>
                  </span>
                </div>
              </div>

              {/* Active Route Waypoints Sequence */}
              {selectedVehicle.activeRoute && selectedVehicle.activeRoute.stops && selectedVehicle.activeRoute.stops.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <Navigation2 className="h-4 w-4 text-blue-600" />
                      <span>Active Route Sequence ({selectedVehicle.activeRoute.routeId})</span>
                    </h3>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {selectedVehicle.activeRoute.remainingDistance} remaining ({selectedVehicle.activeRoute.remainingDuration})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedVehicle.activeRoute.stops.map((stop, idx) => {
                      const isCompleted = stop.status === 'COMPLETED';
                      const isActive = stop.status === 'ACTIVE';

                      return (
                        <div
                          key={stop.id}
                          className={`flex items-start justify-between p-3 rounded-xl border text-xs transition-all ${
                            isCompleted
                              ? 'bg-emerald-50/40 border-emerald-200/70 text-slate-700'
                              : isActive
                                ? 'bg-blue-50 border-blue-300 text-blue-950 ring-2 ring-blue-500/20'
                                : 'bg-slate-50 border-slate-200/80 text-slate-600'
                          }`}
                        >
                          <div className="flex items-start space-x-2.5 min-w-0">
                            <div className={`h-6 w-6 rounded-lg flex items-center justify-center font-mono font-bold text-[11px] shrink-0 mt-0.5 ${
                              isCompleted
                                ? 'bg-emerald-600 text-white'
                                : isActive
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-200 text-slate-700'
                            }`}>
                              {isCompleted ? <Check className="h-3.5 w-3.5" /> : stop.stopNumber}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 truncate">{stop.customerName}</h4>
                              <p className="text-[11px] text-slate-500 truncate">{stop.address}</p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 ml-3 font-mono">
                            <span className="text-[11px] font-bold text-slate-700">{stop.estimatedArrival}</span>
                            <span className={`block text-[10px] font-bold uppercase ${
                              isCompleted ? 'text-emerald-600' : isActive ? 'text-blue-600' : 'text-slate-400'
                            }`}>
                              {stop.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 text-slate-500">
              <p className="text-xs font-bold">Select any vehicle from the list or click a marker on the map to inspect live diagnostics and route sequence.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
