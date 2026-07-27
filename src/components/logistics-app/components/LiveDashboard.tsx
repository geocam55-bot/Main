import React, { useState, useMemo } from 'react';
import { 
  Truck as TruckIcon, 
  MapPin, 
  RefreshCw, 
  Activity, 
  TrendingUp, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Search,
  Filter,
  ArrowUpRight,
  Info,
  Calendar,
  Sparkles,
  Wifi,
  Bell
} from 'lucide-react';
import { DeliveryStatus, DeliveryRecord, Truck, Branch, User } from '../types';

interface LiveDashboardProps {
  deliveries: DeliveryRecord[];
  trucks: Truck[];
  branches: Branch[];
  users: User[];
}

export default function LiveDashboard({ 
  deliveries = [], 
  trucks = [], 
  branches = [], 
  users = [] 
}: LiveDashboardProps) {
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<{branch: string, month: string, val: number} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('All');

  // 1. Helper to determine if a specific DeliveryRecord is late
  const isDeliveryLate = (d: DeliveryRecord): boolean => {
    if (d.status === DeliveryStatus.RETURNED) return true; // returned/failed deliveries are flagged
    if (d.deliveredAt && d.registeredAt) {
      try {
        const reg = new Date(d.registeredAt).getTime();
        const del = new Date(d.deliveredAt).getTime();
        // If it took more than 3 hours to deliver, consider it late
        return (del - reg) > 3 * 60 * 60 * 1000;
      } catch {
        return false;
      }
    }
    // If registered but not delivered, and registered > 4 hours ago, consider it late
    if (d.status !== DeliveryStatus.DELIVERED && d.registeredAt) {
      try {
        const reg = new Date(d.registeredAt).getTime();
        const now = Date.now();
        return (now - reg) > 4 * 60 * 60 * 1000;
      } catch {
        return false;
      }
    }
    return false;
  };

  // 2. Compute Active Vehicles Count
  const vehiclesActiveVal = useMemo(() => {
    return trucks.filter(t => 
      t.gpsStatus === 'Connected' || 
      (t.driver && t.driver.trim().length > 0) ||
      deliveries.some(d => d.assignedTruck === t.id && d.status !== DeliveryStatus.DELIVERED)
    ).length;
  }, [trucks, deliveries]);

  const capacityDeployedPercent = useMemo(() => {
    const total = trucks.length;
    return total > 0 ? Math.round((vehiclesActiveVal / total) * 100) : 100;
  }, [trucks.length, vehiclesActiveVal]);

  // 3. Compute On-Time Percentage
  const onTimePercentVal = useMemo(() => {
    const total = deliveries.length;
    if (total === 0) return 100;
    const lateCount = deliveries.filter(isDeliveryLate).length;
    return Math.round(((total - lateCount) / total) * 100);
  }, [deliveries]);

  // 4. Compute Deliveries Today
  const deliveriesTodayList = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return deliveries.filter(d => {
      if (d.registeredAt && d.registeredAt.startsWith(todayStr)) return true;
      if (d.deliveredAt && d.deliveredAt.startsWith(todayStr)) return true;
      // In-progress is also counted as today's schedule
      if (d.status === DeliveryStatus.REGISTERED || d.status === DeliveryStatus.PICKED_AND_LOADED) return true;
      return false;
    });
  }, [deliveries]);

  const deliveriesTodayCount = deliveriesTodayList.length;

  const inStagingCount = useMemo(() => {
    return deliveries.filter(d => d.status === DeliveryStatus.REGISTERED && !d.assignedTruck).length;
  }, [deliveries]);

  const pendingLoadCount = useMemo(() => {
    return deliveries.filter(d => d.status === DeliveryStatus.REGISTERED && d.assignedTruck).length;
  }, [deliveries]);

  // 5. Compute Heat Map
  const monthsList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
  
  const branchNames = useMemo(() => {
    return branches.length > 0 
      ? branches.map(b => b.name) 
      : ["Conshohocken DC", "Wilmington DC", "Tantallon Store", "Local Yard"];
  }, [branches]);

  const heatmapMatrix = useMemo(() => {
    return branchNames.map(branchName => {
      const branchObj = branches.find(b => b.name === branchName);
      const branchId = branchObj ? branchObj.id : branchName;

      const branchDeliveries = deliveries.filter(d => 
        d.originBranch === branchId || 
        d.originBranch === branchName
      );

      return monthsList.map((_, mIdx) => {
        return branchDeliveries.filter(d => {
          if (!d.registeredAt) return false;
          try {
            const date = new Date(d.registeredAt);
            return date.getMonth() === mIdx;
          } catch {
            return false;
          }
        }).length;
      });
    });
  }, [branchNames, branches, deliveries]);

  const maxVal = useMemo(() => {
    const max = Math.max(...heatmapMatrix.flat());
    return max > 0 ? max : 1;
  }, [heatmapMatrix]);

  const getDensityColor = (val: number) => {
    if (val === 0) return "bg-slate-50 hover:bg-slate-100 border border-slate-100/50";
    const ratio = val / maxVal;
    if (ratio > 0.8) return "bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs";
    if (ratio > 0.5) return "bg-emerald-400 text-slate-900 hover:bg-emerald-300";
    if (ratio > 0.2) return "bg-emerald-200 text-slate-800 hover:bg-emerald-100";
    return "bg-emerald-50 text-slate-700 hover:bg-emerald-100/80";
  };

  // 6. Compute Real-Time Operations Logs
  const opsLogs = useMemo(() => {
    const logsList: Array<{ id: string; time: string; text: string; type: 'info' | 'success' | 'warning' | 'dispatch' }> = [];

    deliveries.forEach(d => {
      if (d.history && Array.isArray(d.history)) {
        d.history.forEach((h, hIdx) => {
          let type: 'info' | 'success' | 'warning' | 'dispatch' = 'info';
          let actionText = '';

          if (h.status === DeliveryStatus.REGISTERED) {
            type = 'info';
            actionText = `Ticket #${d.id} registered at ${h.location || d.originBranch || 'HQ'} by ${h.operator || 'System'}`;
          } else if (h.status === DeliveryStatus.PICKED_AND_LOADED) {
            type = 'dispatch';
            actionText = `Ticket #${d.id} picked and loaded onto ${d.assignedTruck || 'truck'} by ${h.operator || 'Picker'}`;
          } else if (h.status === DeliveryStatus.DELIVERED) {
            type = 'success';
            actionText = `Ticket #${d.id} successfully delivered to ${d.customerName} signed by ${d.customerSignature ? 'Customer' : 'Driver'}`;
          } else if (h.status === DeliveryStatus.RETURNED) {
            type = 'warning';
            actionText = `Ticket #${d.id} returned to yard. Reason: ${d.returnReason || 'Delivery rejected'}`;
          }

          let timeStr = '12:00:00';
          try {
            if (h.timestamp) {
              const dt = new Date(h.timestamp);
              timeStr = dt.toTimeString().split(' ')[0];
            }
          } catch {}

          logsList.push({
            id: `${d.id}-${h.status}-${hIdx}`,
            time: timeStr,
            text: actionText,
            type
          });
        });
      }

      if (!d.history || d.history.length === 0) {
        let timeStr = '12:00:00';
        try {
          if (d.registeredAt) {
            timeStr = new Date(d.registeredAt).toTimeString().split(' ')[0];
          }
        } catch {}

        logsList.push({
          id: `${d.id}-reg-fallback`,
          time: timeStr,
          text: `Ticket #${d.id} registered for ${d.customerName} (${d.originBranch || 'HQ'})`,
          type: 'info'
        });

        if (d.pickedAt) {
          let pickTime = '13:00:00';
          try {
            pickTime = new Date(d.pickedAt).toTimeString().split(' ')[0];
          } catch {}
          logsList.push({
            id: `${d.id}-pick-fallback`,
            time: pickTime,
            text: `Ticket #${d.id} picked and loaded onto Truck ${d.assignedTruck || ''}`,
            type: 'dispatch'
          });
        }

        if (d.deliveredAt) {
          let delTime = '14:00:00';
          try {
            delTime = new Date(d.deliveredAt).toTimeString().split(' ')[0];
          } catch {}
          logsList.push({
            id: `${d.id}-del-fallback`,
            time: delTime,
            text: `Ticket #${d.id} successfully delivered to ${d.customerName}`,
            type: 'success'
          });
        }
      }
    });

    trucks.forEach(t => {
      if (t.gpsStatus === 'Connected') {
        let handTime = '12:00:00';
        try {
          if (t.gpsLastHandshake) {
            handTime = new Date(t.gpsLastHandshake).toTimeString().split(' ')[0];
          } else {
            handTime = new Date().toTimeString().split(' ')[0];
          }
        } catch {}

        logsList.push({
          id: `${t.id}-gps-connected`,
          time: handTime,
          text: `GPS telemetry verified for ${t.name} (${t.gpsDeviceName || 'Active GPS OBD'})`,
          type: 'success'
        });
      }
    });

    // Sort by descending time so latest events are on top
    return logsList.sort((a, b) => b.time.localeCompare(a.time));
  }, [deliveries, trucks]);

  // Compute CRM metrics
  const crmStats = useMemo(() => {
    const totalDelivered = deliveries.filter(d => d.status === DeliveryStatus.DELIVERED).length;
    const totalReturned = deliveries.filter(d => d.status === DeliveryStatus.RETURNED).length;
    const totalTickets = deliveries.length;
    
    const perfectCount = totalDelivered - totalReturned;
    const perfectRate = totalDelivered > 0 
      ? ((perfectCount / totalDelivered) * 100).toFixed(1)
      : "100";

    return {
      perfectRate,
      totalTickets,
      activeTrucks: vehiclesActiveVal
    };
  }, [deliveries, vehiclesActiveVal]);

  // Filter deliveries for custom search if needed
  const filteredDeliveries = deliveries.filter(d => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = 
      d.customerName?.toLowerCase().includes(term) ||
      d.id?.toLowerCase().includes(term) ||
      d.deliveryAddress?.toLowerCase().includes(term);
    
    if (selectedBranchFilter === 'All') return matchesSearch;
    return matchesSearch && d.originBranch === selectedBranchFilter;
  });

  return (
    <div className="space-y-6" id="hq-live-dashboard-view">
      
      {/* 1. Header live status bar - MATCHING screenshot exactly */}
      <div className="bg-[#0B1222] text-white px-6 py-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20" />
          <div className="flex flex-col text-left">
            <span className="font-mono text-xs font-black tracking-widest text-slate-300">HQ LOGISTICS LIVE DASHBOARD</span>
            <span className="text-[10px] text-slate-500 font-bold font-mono">PROSPACES PLATFORM TELEMETRY FEED</span>
          </div>
        </div>
        <div className="flex items-center space-x-2.5">
          <span className="text-[10px] bg-slate-800 text-slate-300 font-mono font-black px-3 py-1.5 rounded-lg border border-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />
            REFRESH RATE: 5S (AUTO)
          </span>
          <span className="text-[10px] bg-blue-900/60 text-blue-200 font-mono font-black px-3 py-1.5 rounded-lg border border-blue-800 uppercase tracking-wider flex items-center gap-1.5">
            <Wifi className="h-3 w-3 text-blue-400 animate-pulse" />
            REAL-TIME SYNC ENGINE ONLINE
          </span>
        </div>
      </div>

      {/* 2. Three Big Metrics cards - MATCHING screenshot layout exactly */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Vehicles Active */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="text-left space-y-1">
            <span className="text-[10px] text-slate-400 font-mono font-extrabold uppercase tracking-widest block">VEHICLES ACTIVE</span>
            <span className="font-sans font-black text-slate-900 text-4xl block tracking-tight leading-none">
              {vehiclesActiveVal}
            </span>
            <span className="text-[11px] text-emerald-600 font-mono font-bold flex items-center gap-1 pt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {capacityDeployedPercent}% capacity deployed
            </span>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <TruckIcon className="h-7 w-7" />
          </div>
        </div>

        {/* Card 2: On-Time Percentage (with actual animated SVG ring) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="text-left space-y-1">
            <span className="text-[10px] text-slate-400 font-mono font-extrabold uppercase tracking-widest block">ON-TIME PERCENTAGE</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="font-sans font-black text-slate-900 text-4xl block tracking-tight leading-none">
                {onTimePercentVal}%
              </span>
              <span className="text-xs text-slate-500 font-bold font-mono">On-Time</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-mono font-bold block pt-1">
              Based on actual deliveries
            </span>
          </div>
          
          {/* Dynamic SVG Circle Gauge matching screenshot */}
          <div className="relative h-16 w-16 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="26" className="stroke-slate-100 fill-none" strokeWidth="5.5" />
              <circle 
                cx="32" 
                cy="32" 
                r="26" 
                className="stroke-emerald-500 fill-none transition-all duration-1000" 
                strokeWidth="5.5" 
                strokeDasharray="163" 
                strokeDashoffset={163 - (163 * onTimePercentVal) / 100} 
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[11px] font-mono font-black text-slate-700">{onTimePercentVal}%</span>
          </div>
        </div>

        {/* Card 3: Deliveries Today */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="text-left space-y-1">
            <span className="text-[10px] text-slate-400 font-mono font-extrabold uppercase tracking-widest block">DELIVERIES TODAY</span>
            <span className="font-sans font-black text-slate-900 text-4xl block tracking-tight leading-none">
              {deliveriesTodayCount}
            </span>
            <span className="text-[11px] text-slate-500 font-mono font-bold block pt-1">
              {inStagingCount} in staging queue &bull; {pendingLoadCount} pending load
            </span>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center">
            <MapPin className="h-7 w-7" />
          </div>
        </div>

      </div>

      {/* 3. Delivery Density & Cargo Heat Map - MATCHING screenshot exactly */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/60 text-left space-y-6">
        
        {/* Title / Legend Row */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 flex-wrap gap-4">
          <div className="space-y-1">
            <h3 className="text-slate-900 font-sans font-black text-lg tracking-tight">Delivery Density &amp; Cargo Heat Map</h3>
            <p className="text-xs text-slate-400 font-medium">Monthly logistics volume across regional dispatch branches</p>
          </div>
          <div className="flex items-center space-x-3 text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest">
            <span className="flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-50" />
              <span>Low</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-200" />
              <span>Medium</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              <span>Heavy Staging</span>
            </span>
          </div>
        </div>

        {/* Heat Map Scroller wrapper */}
        <div className="overflow-x-auto scrollbar-none pb-2">
          <div className="min-w-[700px] space-y-3">
            
            {/* Months Header Column Row */}
            <div className="flex items-center font-mono text-[10px] font-black tracking-wider text-slate-400 pb-1.5">
              <div className="w-40 shrink-0 uppercase">Branch</div>
              <div className="flex-1 grid grid-cols-10 gap-2.5 text-center">
                {monthsList.map(m => <div key={m}>{m}</div>)}
              </div>
            </div>

            {/* Matrix rows matching branchNames */}
            {branchNames.map((branch, idx) => {
              const rowValues = heatmapMatrix[idx] || [];
              return (
                <div key={branch} className="flex items-center group/row py-1 rounded-xl hover:bg-slate-50/50 transition-colors">
                  <div className="w-40 shrink-0 font-sans text-xs font-black text-slate-800 leading-none truncate pr-3 group-hover/row:text-[#FF5A1F] transition-colors">
                    {branch}
                  </div>
                  <div className="flex-1 grid grid-cols-10 gap-2.5">
                    {rowValues.map((val, mIdx) => (
                      <div 
                        key={mIdx}
                        onClick={() => setSelectedHeatmapCell({
                          branch,
                          month: monthsList[mIdx],
                          val
                        })}
                        className={`aspect-square sm:aspect-auto sm:h-9 rounded-lg transition-all duration-300 cursor-pointer ${getDensityColor(val)} flex items-center justify-center hover:scale-105 hover:ring-2 hover:ring-emerald-500/10 active:scale-95`}
                        title={`${branch} - ${monthsList[mIdx]}: ${val} loads processed`}
                      >
                        <span className="text-[9px] font-mono font-bold text-slate-600 opacity-0 hover:opacity-100 transition-opacity">
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

          </div>
        </div>

        {/* Selected Heatmap Cell Popover Info box */}
        {selectedHeatmapCell && (
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 text-xs text-slate-700 flex items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center space-x-2.5 text-left">
              <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <span className="font-mono text-[10px] text-slate-400 font-extrabold block uppercase">LOGS DECRYPTION DETAIL</span>
                <span className="text-slate-800 font-sans font-medium text-xs">
                  <strong className="text-slate-900 font-black">{selectedHeatmapCell.branch}</strong> branch processed <strong className="text-emerald-700 font-black">{selectedHeatmapCell.val} lumber loads</strong> in <strong className="text-slate-900 font-bold">{selectedHeatmapCell.month}</strong>. Average staging turnaround: <strong className="text-slate-900 font-semibold">14.2 mins</strong>.
                </span>
              </div>
            </div>
            <button 
              onClick={() => setSelectedHeatmapCell(null)}
              className="text-emerald-800 hover:text-emerald-950 font-mono text-xs font-black cursor-pointer px-3 py-1 bg-white rounded-lg border border-emerald-100 shadow-xs shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

      </div>

      {/* 4. Live Operations Telemetry Stream log list & CRM integration overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Live operations terminal */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 text-left space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-[#FF5A1F]" />
              <span className="font-sans font-black text-slate-900 text-sm tracking-tight">Ecosystem Operations Feed</span>
            </div>
            <span className="text-[10px] font-mono bg-orange-50 text-orange-700 border border-orange-100 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
              ● Live Stream
            </span>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {opsLogs.map((log) => (
              <div key={log.id} className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-55 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <span className="text-[10px] font-mono text-slate-400 font-semibold shrink-0 pt-0.5">
                  [{log.time}]
                </span>
                <p className="text-xs text-slate-700 flex-1 font-sans">
                  {log.text}
                </p>
                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                  log.type === 'success' ? 'bg-emerald-100 border border-emerald-200 text-emerald-800' :
                  log.type === 'warning' ? 'bg-amber-100 border border-amber-200 text-amber-800' :
                  log.type === 'dispatch' ? 'bg-blue-100 border border-blue-200 text-blue-800' :
                  'bg-slate-100 border border-slate-200 text-slate-700'
                }`}>
                  {log.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: CRM Sync Overview */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 text-left space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-[9px] font-mono bg-blue-50 text-blue-700 border border-blue-100 px-2 rounded-full font-bold py-0.5">
              AUTO-INTEGRATED
            </span>
            <h4 className="font-sans font-black text-slate-900 text-sm tracking-tight">ProSpaces Sync Statistics</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Logistics telemetry links directly into your customer directory. Physical pick lists are staged, verified, and mapped instantly.
            </p>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs border-b border-slate-100 py-1.5">
                <span className="text-slate-500 font-medium">Staged &amp; Loaded Checks</span>
                <span className="font-mono font-black text-emerald-600">{crmStats.perfectRate}% Perfect</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-100 py-1.5">
                <span className="text-slate-500 font-medium">Total Tracked Tickets</span>
                <span className="font-mono font-black text-slate-800">{crmStats.totalTickets} Dispatched</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5">
                <span className="text-slate-500 font-medium">Active Fleet Assets</span>
                <span className="font-mono font-black text-blue-600">{crmStats.activeTrucks} Active</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100/50 flex items-center justify-between text-xs mt-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-slate-700 font-medium">Sync Turnaround</span>
            </div>
            <strong className="text-slate-900 font-bold">&lt; 150ms latency</strong>
          </div>
        </div>

      </div>

    </div>
  );
}
