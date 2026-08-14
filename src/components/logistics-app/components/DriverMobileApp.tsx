import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DeliveryRecord, Truck, User, DeliveryStatus, HistoryEvent, getDeliveryPhotos } from '../types';
import { 
  Truck as TruckIcon,
  MapPin, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  Phone, 
  Navigation, 
  Camera, 
  Upload, 
  FileText, 
  Printer, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  UserCheck, 
  ChevronRight, 
  Layers, 
  Smartphone, 
  Monitor, 
  ShieldCheck, 
  Copy, 
  ExternalLink,
  Sparkles,
  Calendar,
  PackageCheck,
  Eye,
  X,
  RefreshCw,
  Send,
  Building2
} from 'lucide-react';

interface DriverMobileAppProps {
  deliveries: DeliveryRecord[];
  trucks: Truck[];
  users: User[];
  currentUser: User | null;
  onAddOrUpdateDelivery: (del: DeliveryRecord) => void;
}

export default function DriverMobileApp({ 
  deliveries, 
  trucks, 
  users, 
  currentUser, 
  onAddOrUpdateDelivery 
}: DriverMobileAppProps) {
  // Filters & Selection
  const [selectedDriverId, setSelectedDriverId] = useState<string>(() => {
    if (currentUser?.role === 'Driver') return currentUser.id;
    return 'all';
  });
  const [selectedTruckId, setSelectedTruckId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'delivered'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Selected Delivery for ePOD Action
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);

  // Workstation View Mode: 'desktop' (Split-pane command center) vs 'handheld' (Mobile/Tablet single column)
  const [layoutMode, setLayoutMode] = useState<'desktop' | 'handheld'>('desktop');

  // Real-time clock for live tracking
  const [currentTime, setCurrentTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter live deliveries strictly from real props.deliveries
  const filteredDeliveries = useMemo(() => {
    let list = Array.isArray(deliveries) ? deliveries : [];

    // Filter by Driver
    if (selectedDriverId !== 'all') {
      const selectedUser = users.find(u => u.id === selectedDriverId);
      const driverName = (selectedUser?.name || '').toLowerCase().trim();
      list = list.filter(d => {
        const assigned = (d.assignedDriver || '').toLowerCase().trim();
        return (
          d.assignedDriver === selectedDriverId ||
          (driverName && (assigned.includes(driverName) || driverName.includes(assigned)))
        );
      });
    }

    // Filter by Truck
    if (selectedTruckId !== 'all') {
      list = list.filter(d => d.assignedTruck === selectedTruckId);
    }

    // Filter by Status
    if (statusFilter === 'pending') {
      list = list.filter(d => d.status !== DeliveryStatus.DELIVERED);
    } else if (statusFilter === 'delivered') {
      list = list.filter(d => d.status === DeliveryStatus.DELIVERED);
    }

    // Search Query (Sales Order, Invoice, Customer, Address)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(d => 
        (d.customerName || '').toLowerCase().includes(q) ||
        (d.deliveryAddress || '').toLowerCase().includes(q) ||
        (d.epicorSalesOrder || '').toLowerCase().includes(q) ||
        (d.invoiceNumber || '').toLowerCase().includes(q) ||
        (d.id || '').toLowerCase().includes(q) ||
        (d.phone || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [deliveries, selectedDriverId, selectedTruckId, statusFilter, searchQuery, users]);

  // Keep first stop selected if none currently selected
  useEffect(() => {
    if (filteredDeliveries.length > 0) {
      if (!selectedDeliveryId || !filteredDeliveries.some(d => d.id === selectedDeliveryId)) {
        setSelectedDeliveryId(filteredDeliveries[0].id);
      }
    } else {
      setSelectedDeliveryId(null);
    }
  }, [filteredDeliveries, selectedDeliveryId]);

  const activeDelivery = useMemo(() => {
    return filteredDeliveries.find(d => d.id === selectedDeliveryId) || null;
  }, [filteredDeliveries, selectedDeliveryId]);

  // Form State for ePOD Capture
  const [signatureName, setSignatureName] = useState<string>('');
  const [hasDrawnSignature, setHasDrawnSignature] = useState<boolean>(false);
  const [deliveryNote, setDeliveryNote] = useState<string>('');
  const [quickNoteTag, setQuickNoteTag] = useState<string>('');
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Sync active delivery into form
  useEffect(() => {
    if (activeDelivery) {
      setSignatureName(activeDelivery.customerSignature && !activeDelivery.customerSignature.startsWith('data:') ? activeDelivery.customerSignature : activeDelivery.customerName || '');
      setDeliveryNote('');
      setQuickNoteTag('');
      setCapturedPhotos(getDeliveryPhotos(activeDelivery));
      setHasDrawnSignature(!!(activeDelivery.customerSignature && activeDelivery.customerSignature.startsWith('data:')));
      clearCanvas();
    }
  }, [activeDelivery?.id]);

  // Canvas Signature Handling
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasDrawnSignature(false);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    setHasDrawnSignature(true);

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0F172A';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  // Photo Upload Handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          const result = uploadEvent.target.result as string;
          setCapturedPhotos(prev => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Submit Proof of Delivery (ePOD)
  const handleSubmitEpod = async () => {
    if (!activeDelivery) return;
    setIsSubmitting(true);

    try {
      let signatureOutput = signatureName.trim() || activeDelivery.customerName || 'Authorized Signee';
      if (canvasRef.current && hasDrawnSignature) {
        try {
          signatureOutput = canvasRef.current.toDataURL('image/png');
        } catch (e) {
          console.warn("Canvas export fallback:", e);
        }
      }

      const timestamp = new Date().toISOString();
      const combinedNotes = [quickNoteTag, deliveryNote.trim()].filter(Boolean).join(' - ') || 'Delivered & verified in good order.';

      const updatedRecord: DeliveryRecord = {
        ...activeDelivery,
        status: DeliveryStatus.DELIVERED,
        deliveredAt: timestamp,
        customerSignature: signatureOutput,
        deliveryPhoto: capturedPhotos[0] || activeDelivery.deliveryPhoto,
        deliveryPhotos: capturedPhotos.length > 0 ? capturedPhotos : (activeDelivery.deliveryPhotos || []),
        destinationNotes: activeDelivery.destinationNotes 
          ? `${activeDelivery.destinationNotes} | Driver POD Note: ${combinedNotes}` 
          : combinedNotes,
        history: [
          ...(activeDelivery.history || []),
          {
            status: DeliveryStatus.DELIVERED,
            timestamp: timestamp,
            location: activeDelivery.deliveryAddress || 'Customer Drop-off Location',
            operator: currentUser?.name || 'Assigned Driver',
            notes: combinedNotes,
            customerSignature: signatureOutput,
            deliveryPhotos: capturedPhotos
          }
        ]
      };

      onAddOrUpdateDelivery(updatedRecord);
      setSuccessToast(`Proof of Delivery recorded for ${activeDelivery.customerName || activeDelivery.id}!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error("Error submitting ePOD:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Status Transition (e.g. Mark Picked/Loaded or En Route)
  const handleQuickStatusChange = (newStatus: DeliveryStatus) => {
    if (!activeDelivery) return;

    const timestamp = new Date().toISOString();
    const updatedRecord: DeliveryRecord = {
      ...activeDelivery,
      status: newStatus,
      pickedAt: newStatus === DeliveryStatus.PICKED_AND_LOADED ? timestamp : activeDelivery.pickedAt,
      history: [
        ...(activeDelivery.history || []),
        {
          status: newStatus,
          timestamp: timestamp,
          location: activeDelivery.originBranch || 'Depot',
          operator: currentUser?.name || 'Assigned Driver',
          notes: `Status updated to ${newStatus}`
        }
      ]
    };

    onAddOrUpdateDelivery(updatedRecord);
    setSuccessToast(`Status updated to ${newStatus.replace(/_/g, ' ')}!`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Metrics calculation
  const totalDeliveries = deliveries.length;
  const completedCount = deliveries.filter(d => d.status === DeliveryStatus.DELIVERED).length;
  const pendingCount = deliveries.filter(d => d.status !== DeliveryStatus.DELIVERED).length;
  const routeCompletionPct = totalDeliveries > 0 ? Math.round((completedCount / totalDeliveries) * 100) : 0;

  return (
    <div className="w-full min-h-[calc(100vh-140px)] bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8 font-sans antialiased">
      
      {/* ── TOP DESKTOP COMMAND BAR ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Title & Live Status */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <TruckIcon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Driver ePOD & Route Dispatch</span>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Data
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  Electronic Proof of Delivery, Real-time Customer Signatures & Route Stop Progression
                </p>
              </div>
            </div>
          </div>

          {/* Route Metrics Pill Group */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 flex items-center gap-3 text-xs">
              <div className="text-slate-600">
                <span className="font-medium">Route Progress:</span>
                <span className="ml-1.5 font-bold text-slate-900">{completedCount}/{totalDeliveries} Stops</span>
              </div>
              <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                  style={{ width: `${routeCompletionPct}%` }}
                ></div>
              </div>
              <span className="font-mono font-bold text-emerald-600">{routeCompletionPct}%</span>
            </div>

            {/* Layout Toggle (Desktop Workstation vs Handheld Companion) */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setLayoutMode('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  layoutMode === 'desktop' 
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Full-width Desktop Dispatch Station"
              >
                <Monitor className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Desktop Workstation</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('handheld')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  layoutMode === 'handheld' 
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Single-column Driver Handheld View"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Handheld View</span>
              </button>
            </div>

            <div className="text-xs font-mono bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-700">
              <Clock className="h-3.5 w-3.5 inline mr-1.5 text-blue-600" />
              {currentTime || '12:00 PM'}
            </div>
          </div>
        </div>

        {/* ── SECONDARY FILTER & SEARCH BAR ── */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by customer, invoice #, sales order, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Driver Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Driver:</span>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Fleet Drivers ({deliveries.length} Total)</option>
                {users.filter(u => u.role === 'Driver' || u.role === 'Logistics').map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} {currentUser?.id === u.id ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Truck Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Truck:</span>
              <select
                value={selectedTruckId}
                onChange={(e) => setSelectedTruckId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Vehicles</option>
                {trucks.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.id} {t.truckNumber ? `(#${t.truckNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Pills */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({deliveries.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'pending' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('delivered')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'delivered' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Delivered ({completedCount})
              </button>
            </div>

          </div>

          {/* Quick Clear Filter */}
          {(searchQuery || selectedDriverId !== 'all' || selectedTruckId !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedDriverId('all');
                setSelectedTruckId('all');
                setStatusFilter('all');
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Filters
            </button>
          )}

        </div>

      </div>

      {/* Success Notification Toast */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-bold border border-emerald-500 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-100" />
          <span>{successToast}</span>
        </div>
      )}

      {/* ── WORKSTATION CONTENT AREA ── */}
      {filteredDeliveries.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-2xl mx-auto my-12 shadow-sm">
          <div className="h-16 w-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mx-auto text-blue-600 mb-4">
            <PackageCheck className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Live Deliveries Found</h3>
          <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            {deliveries.length === 0
              ? 'No live deliveries have been dispatched in the database yet. Dispatched deliveries from your sales orders or loading scanner will appear here.'
              : 'No deliveries match your current driver or search filters. Try clearing your filters above.'}
          </p>
          {(searchQuery || selectedDriverId !== 'all' || selectedTruckId !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedDriverId('all');
                setSelectedTruckId('all');
                setStatusFilter('all');
              }}
              className="mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Show All Deliveries ({deliveries.length})
            </button>
          )}
        </div>
      ) : (
        /* Workstation Split View (Desktop or Handheld Mode) */
        <div className={`grid gap-6 ${layoutMode === 'desktop' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1 max-w-xl mx-auto'}`}>
          
          {/* ══════════════════════════════════════════════════════════════
              LEFT PANE: LIVE ROUTE STOP QUEUE (40% Width on Desktop)
             ══════════════════════════════════════════════════════════════ */}
          <div className={`${layoutMode === 'desktop' ? 'lg:col-span-5' : 'col-span-1'} flex flex-col gap-3`}>
            
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <span>Route Stops ({filteredDeliveries.length})</span>
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">Click stop to inspect & sign</span>
            </div>

            {/* List of Deliveries */}
            <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              {filteredDeliveries.map((del, idx) => {
                const isSelected = del.id === activeDelivery?.id;
                const isDelivered = del.status === DeliveryStatus.DELIVERED;
                const isPicked = del.status === DeliveryStatus.PICKED_AND_LOADED;

                return (
                  <div
                    key={del.id}
                    onClick={() => setSelectedDeliveryId(del.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    {/* Top Row: Stop Badge & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`h-7 w-7 rounded-xl font-mono font-black text-xs flex items-center justify-center ${
                          isDelivered 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : isPicked
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 leading-tight">
                            {del.customerName || 'Customer Stop'}
                          </h3>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                            <span>{del.epicorSalesOrder || del.id}</span>
                            {del.invoiceNumber && <span>• {del.invoiceNumber}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        isDelivered 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : isPicked
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {isDelivered ? 'Delivered' : isPicked ? 'Loaded / In Transit' : 'Registered'}
                      </span>
                    </div>

                    {/* Address Line */}
                    <div className="mt-2.5 flex items-start gap-1.5 text-xs text-slate-600">
                      <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{del.deliveryAddress || 'No address provided'}</span>
                    </div>

                    {/* Footer Details: Slot, Driver, Pod Pill */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-2">
                        {del.scheduledSlot && (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold">
                            {del.scheduledSlot} Slot
                          </span>
                        )}
                        {del.assignedDriver && (
                          <span className="truncate max-w-[110px]">
                            Driver: {del.assignedDriver}
                          </span>
                        )}
                      </div>

                      {isDelivered && (
                        <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                          <Check className="h-3 w-3" />
                          Signed & Completed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* ══════════════════════════════════════════════════════════════
              RIGHT PANE: ePOD VERIFICATION & SIGN-OFF TERMINAL (60% Width)
             ══════════════════════════════════════════════════════════════ */}
          <div className={`${layoutMode === 'desktop' ? 'lg:col-span-7' : 'col-span-1'} flex flex-col gap-4`}>
            
            {activeDelivery ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
                
                {/* Active Stop Header & Quick Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-blue-600 text-white rounded-lg text-xs font-mono font-bold">
                        Stop #{filteredDeliveries.findIndex(d => d.id === activeDelivery.id) + 1}
                      </span>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900">
                        {activeDelivery.customerName || 'Customer'}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                      <span>Order: {activeDelivery.epicorSalesOrder || activeDelivery.id}</span>
                      {activeDelivery.invoiceNumber && <span>• Invoice: {activeDelivery.invoiceNumber}</span>}
                      {activeDelivery.originBranch && <span>• Hub: {activeDelivery.originBranch}</span>}
                    </div>
                  </div>

                  {/* Quick Action Trigger Buttons */}
                  <div className="flex items-center gap-2">
                    {activeDelivery.phone && (
                      <a
                        href={`tel:${activeDelivery.phone}`}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                        title="Call Customer"
                      >
                        <Phone className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{activeDelivery.phone}</span>
                      </a>
                    )}
                    {activeDelivery.deliveryAddress && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeDelivery.deliveryAddress)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                        title="Open in Google Maps"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        <span>Navigate</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Delivery Location & Special Notes Banner */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] block">
                      Delivery Destination
                    </span>
                    <p className="text-slate-800 font-medium leading-relaxed flex items-start gap-1.5">
                      <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{activeDelivery.deliveryAddress || 'Address on file'}</span>
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] block">
                      Dispatch Instructions / Notes
                    </span>
                    <p className="text-slate-700 italic">
                      {activeDelivery.destinationNotes || 'Standard curbside drop-off. Verify customer sign-off.'}
                    </p>
                  </div>
                </div>

                {/* Status Stepper / Stage Controls */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-slate-600 font-semibold">Workflow Stage:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickStatusChange(DeliveryStatus.REGISTERED)}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        activeDelivery.status === DeliveryStatus.REGISTERED
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      1. Registered
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickStatusChange(DeliveryStatus.PICKED_AND_LOADED)}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        activeDelivery.status === DeliveryStatus.PICKED_AND_LOADED
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      2. Loaded & En Route
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeDelivery.status !== DeliveryStatus.DELIVERED) {
                          handleSubmitEpod();
                        }
                      }}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        activeDelivery.status === DeliveryStatus.DELIVERED
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      3. Completed (ePOD)
                    </button>
                  </div>
                </div>

                {/* ── ELECTRONIC PROOF OF DELIVERY CAPTURE SECTION ── */}
                {activeDelivery.status === DeliveryStatus.DELIVERED ? (
                  /* Already Delivered - Audit & Inspection View */
                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-800">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <h3 className="text-sm font-bold text-slate-900">Delivery Completed & Verified</h3>
                      </div>
                      <span className="text-xs text-emerald-700 font-mono font-medium">
                        {activeDelivery.deliveredAt ? new Date(activeDelivery.deliveredAt).toLocaleString() : 'Delivered'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {/* Customer Signature View */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-xs">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Recorded Signature
                        </span>
                        {activeDelivery.customerSignature && activeDelivery.customerSignature.startsWith('data:') ? (
                          <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex items-center justify-center h-28">
                            <img 
                              src={activeDelivery.customerSignature} 
                              alt="Customer Signature" 
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="bg-slate-50 rounded-lg p-4 text-center font-serif text-lg text-slate-700 italic border border-slate-200">
                            "{activeDelivery.customerSignature || activeDelivery.customerName || 'Signed on File'}"
                          </div>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono block text-center">
                          Signee: {activeDelivery.customerName}
                        </span>
                      </div>

                      {/* Delivery Photo View */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-xs">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Drop-off Verification Photo
                        </span>
                        {capturedPhotos.length > 0 ? (
                          <div className="flex gap-2 overflow-x-auto py-1">
                            {capturedPhotos.map((photo, pIdx) => (
                              <img
                                key={pIdx}
                                src={photo}
                                alt={`Proof of Delivery ${pIdx + 1}`}
                                className="h-28 w-28 object-cover rounded-lg border border-slate-200 shrink-0"
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="h-28 bg-slate-50 rounded-lg flex items-center justify-center text-xs text-slate-400 italic border border-slate-200">
                            No photo attached
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => handleQuickStatusChange(DeliveryStatus.PICKED_AND_LOADED)}
                        className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reopen Delivery Sign-off
                      </button>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer border border-slate-200 shadow-xs"
                      >
                        <Printer className="h-4 w-4 text-blue-600" />
                        Print ePOD Slip
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Active Capture Form */
                  <div className="space-y-5">
                    
                    {/* 1. Digital Signature Pad */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span>Customer Digital Signature</span>
                        </label>
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Clear Signature
                        </button>
                      </div>

                      {/* Signature Canvas Box */}
                      <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 relative overflow-hidden shadow-inner h-36">
                        <canvas
                          ref={canvasRef}
                          width={600}
                          height={144}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full h-full cursor-crosshair touch-none"
                        />
                        {!hasDrawnSignature && (
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-xs font-medium">
                            <span>Draw customer signature here with mouse or stylus...</span>
                          </div>
                        )}
                      </div>

                      {/* Signee Name Input */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 font-semibold shrink-0">Signee Name:</span>
                        <input
                          type="text"
                          placeholder="Recipient / Customer Name"
                          value={signatureName}
                          onChange={(e) => setSignatureName(e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    {/* 2. Photo Proof of Delivery */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Camera className="h-4 w-4 text-emerald-600" />
                          <span>Drop-off Photo Verification</span>
                        </label>
                        <span className="text-[11px] text-slate-500 font-mono">{capturedPhotos.length} photo(s)</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {/* Upload Button */}
                        <label className="h-24 w-28 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-white rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer text-slate-500 hover:text-blue-600 transition-all shadow-xs">
                          <Upload className="h-5 w-5 text-blue-600" />
                          <span className="text-[10px] font-bold">Upload Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>

                        {/* Photo Previews */}
                        {capturedPhotos.map((img, idx) => (
                          <div key={idx} className="relative group h-24 w-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-xs">
                            <img src={img} alt={`Proof ${idx + 1}`} className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setCapturedPhotos(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 3. Driver Drop-off Notes & Quick Tags */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Driver Drop-off Notes & Location Tags
                      </label>

                      {/* Quick Tags */}
                      <div className="flex flex-wrap gap-2">
                        {[
                          'Left on front porch',
                          'Handed directly to customer',
                          'Placed in garage / carport',
                          'Delivered to warehouse dock',
                          'Signed by job site superintendent'
                        ].map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setQuickNoteTag(prev => prev === tag ? '' : tag)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              quickNoteTag === tag
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>

                      <textarea
                        rows={2}
                        placeholder="Additional drop-off notes or verification details..."
                        value={deliveryNote}
                        onChange={(e) => setDeliveryNote(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                    </div>

                    {/* 4. Complete Delivery Action Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleSubmitEpod}
                        className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-black text-sm rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Recording Electronic Proof of Delivery...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-5 w-5" />
                            <span>Confirm & Submit Electronic Proof of Delivery</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                )}

              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
                <PackageCheck className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">Select a Stop to Begin ePOD Sign-Off</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Choose any delivery from the left queue to view customer details, sign electronically, and attach drop-off photos.
                </p>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
