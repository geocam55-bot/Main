import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DeliveryRecord, Truck, User, DeliveryStatus, HistoryEvent } from '../types';
import { 
  Navigation2, 
  Phone, 
  Camera, 
  ArrowLeft, 
  Check, 
  RotateCcw, 
  Bell, 
  Compass, 
  MapPin, 
  ChevronRight, 
  Upload, 
  ShieldCheck, 
  Clock, 
  Layers, 
  Smartphone, 
  CheckCircle2, 
  Wifi, 
  Battery, 
  Signal, 
  ExternalLink,
  Sparkles,
  RefreshCw,
  Info,
  Calendar,
  Truck as TruckIcon,
  X
} from 'lucide-react';

interface DriverMobileAppProps {
  deliveries: DeliveryRecord[];
  trucks: Truck[];
  users: User[];
  currentUser: User | null;
  onAddOrUpdateDelivery: (del: DeliveryRecord) => void;
}

// Default Live Route Stops when DB is being initialized or filtered
const DEFAULT_ROUTE_STOPS: Partial<DeliveryRecord>[] = [
  {
    id: 'SO-10821-A',
    invoiceNumber: 'INV-88210',
    epicorSalesOrder: 'SO-10821',
    customerName: 'Blue Jay Residence',
    deliveryAddress: '142 Blue Jay Lane, Halifax, NS',
    phone: '(902) 455-8120',
    status: DeliveryStatus.DELIVERED,
    scheduledSlot: 'AM',
    destinationNotes: 'Leave on front porch. Ring bell upon drop-off.',
    registeredAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    deliveredAt: new Date(Date.now() - 3600000 * 1.5).toISOString()
  },
  {
    id: 'SO-10822-B',
    invoiceNumber: 'INV-88211',
    epicorSalesOrder: 'SO-10822',
    customerName: 'Green Leaf Landscape',
    deliveryAddress: '88 Green Leaf Way, Dartmouth, NS',
    phone: '(902) 468-2300',
    status: DeliveryStatus.PICKED_AND_LOADED,
    scheduledSlot: 'AM',
    destinationNotes: 'Arriving. Drop pallets near back garden gate.',
    registeredAt: new Date(Date.now() - 3600000 * 2.5).toISOString()
  },
  {
    id: 'SO-10823-C',
    invoiceNumber: 'INV-88212',
    epicorSalesOrder: 'SO-10823',
    customerName: 'Oak Ridge Construction',
    deliveryAddress: '56 Oak Drive, Bedford, NS',
    phone: '(902) 835-9011',
    status: DeliveryStatus.PICKED_AND_LOADED,
    scheduledSlot: 'AM',
    destinationNotes: 'Gate code #5621. Unload lumber package at driveway.',
    registeredAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'SO-10824-D',
    invoiceNumber: 'INV-88213',
    epicorSalesOrder: 'SO-10824',
    customerName: 'Atlantic Build Co',
    deliveryAddress: '210 Maple Crescent, Lower Sackville, NS',
    phone: '(902) 864-7720',
    status: DeliveryStatus.PICKED_AND_LOADED,
    scheduledSlot: 'PM',
    destinationNotes: 'Call 15 mins before arrival.',
    registeredAt: new Date(Date.now() - 3600000 * 1.5).toISOString()
  },
  {
    id: 'SO-10825-E',
    invoiceNumber: 'INV-88214',
    epicorSalesOrder: 'SO-10825',
    customerName: 'Highland Framing',
    deliveryAddress: '74 Highland Terrace, Tantallon, NS',
    phone: '(902) 826-1144',
    status: DeliveryStatus.REGISTERED,
    scheduledSlot: 'PM',
    destinationNotes: 'Verify sheetrock dry before sign-off.',
    registeredAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'SO-10826-F',
    invoiceNumber: 'DEPOT-RETURN',
    epicorSalesOrder: 'DEPOT-RTN',
    customerName: 'Windmill Logistics Hub',
    deliveryAddress: '100 Windmill Rd, Dartmouth DC, NS',
    phone: '(902) 468-5500',
    status: DeliveryStatus.REGISTERED,
    scheduledSlot: 'PM',
    destinationNotes: 'Final route stop - Post-trip inspection & refueling.',
    registeredAt: new Date().toISOString()
  }
];

export default function DriverMobileApp({ 
  deliveries, 
  trucks, 
  users, 
  currentUser, 
  onAddOrUpdateDelivery 
}: DriverMobileAppProps) {
  // Selected driver / truck filter
  const [selectedDriverId, setSelectedDriverId] = useState<string>(currentUser?.id || 'all');
  
  // Current active screen tab for interactive single-phone navigation:
  // 1 = Today's Deliveries (Map View)
  // 2 = Route Progress (Timeline Stepper)
  // 3 = Confirm Delivery (POD Photo + Signature + Notes)
  const [activeScreenTab, setActiveScreenTab] = useState<1 | 2 | 3>(1);
  
  // View mode: '3-screens' (Side-by-side workflow as in the attached mockup) or 'single' (Mobile device view)
  const [viewMode, setViewMode] = useState<'3-screens' | 'single'>('3-screens');

  // Currently focused stop index (0-indexed)
  const [activeStopIndex, setActiveStopIndex] = useState<number>(1); // Default to Stop 2 (Green Leaf)

  // Real-time clock for phone status bars
  const [currentTime, setCurrentTime] = useState<string>('10:30');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes();
      hours = hours % 12 || 12;
      const minsStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
      setCurrentTime(`${hours}:${minsStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter deliveries for the selected driver or active route
  const liveRouteStops: DeliveryRecord[] = useMemo(() => {
    let filtered = deliveries;

    if (selectedDriverId !== 'all') {
      const selectedUser = users.find(u => u.id === selectedDriverId);
      const driverName = selectedUser?.name?.toLowerCase() || '';
      filtered = deliveries.filter(d => {
        const dDrv = (d.assignedDriver || '').toLowerCase();
        return dDrv.includes(driverName) || d.assignedDriver === selectedDriverId;
      });
    }

    // If we have real DB deliveries, prioritize them
    if (filtered && filtered.length > 0) {
      // Return up to 6 stops for a clean mobile route
      return filtered.slice(0, 6);
    }

    // Fallback: If no deliveries match yet, merge DB records with realistic live route
    return DEFAULT_ROUTE_STOPS.map((s, idx) => ({
      id: s.id || `DEL-${idx + 1}`,
      invoiceNumber: s.invoiceNumber || `INV-${1000 + idx}`,
      epicorSalesOrder: s.epicorSalesOrder || `SO-${2000 + idx}`,
      customerName: s.customerName || `Customer ${idx + 1}`,
      deliveryAddress: s.deliveryAddress || `Delivery Stop ${idx + 1}`,
      phone: s.phone || '(902) 555-0100',
      originBranch: 'WINDMILL_DC',
      status: s.status || DeliveryStatus.PICKED_AND_LOADED,
      registeredAt: s.registeredAt || new Date().toISOString(),
      deliveredAt: s.deliveredAt,
      destinationNotes: s.destinationNotes || 'Standard curbside drop-off.',
      history: []
    })) as DeliveryRecord[];
  }, [deliveries, selectedDriverId, users]);

  // Current active stop record
  const currentStop = liveRouteStops[activeStopIndex] || liveRouteStops[0] || DEFAULT_ROUTE_STOPS[0];

  // Screen 3: Proof of Delivery Form States
  const [signatureText, setSignatureText] = useState<string>('Mark Miller');
  const [hasDrawnSignature, setHasDrawnSignature] = useState<boolean>(false);
  const [deliveryNotes, setDeliveryNotes] = useState<string>('Left cardboard package securely on front welcome mat. Verified undamaged.');
  const [deliveryPhotoUrl, setDeliveryPhotoUrl] = useState<string>('/doorstep_delivery_photo.jpg');
  const [isCapturingCamera, setIsCapturingCamera] = useState<boolean>(false);
  const [completionSuccessToast, setCompletionSuccessToast] = useState<string | null>(null);

  // Canvas drawing ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  // Initialize or clear signature canvas
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasDrawnSignature(false);
  };

  // Start touch / mouse drawing on signature canvas
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
    ctx.strokeStyle = '#1E293B';
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

  // Handle Mark Complete
  const handleMarkComplete = () => {
    if (!currentStop) return;

    let signatureData = signatureText;
    if (canvasRef.current && hasDrawnSignature) {
      try {
        signatureData = canvasRef.current.toDataURL('image/png');
      } catch (err) {
        console.warn('Canvas export fallback:', err);
      }
    }

    const updatedRecord: DeliveryRecord = {
      ...currentStop,
      status: DeliveryStatus.DELIVERED,
      deliveredAt: new Date().toISOString(),
      customerSignature: signatureData,
      deliveryPhoto: deliveryPhotoUrl,
      destinationNotes: `${currentStop.destinationNotes || ''} - Driver Note: ${deliveryNotes}`,
      history: [
        ...(currentStop.history || []),
        {
          status: DeliveryStatus.DELIVERED,
          timestamp: new Date().toISOString(),
          location: currentStop.deliveryAddress || 'Customer Site',
          operator: currentUser?.name || 'Driver Mark',
          notes: deliveryNotes,
          customerSignature: signatureData,
          deliveryPhoto: deliveryPhotoUrl
        }
      ]
    };

    // Save to real database
    onAddOrUpdateDelivery(updatedRecord);

    // Show confirmation feedback
    setCompletionSuccessToast(`Stop #${activeStopIndex + 1} (${currentStop.customerName}) marked as Delivered!`);
    setTimeout(() => setCompletionSuccessToast(null), 4000);

    // Advance to next stop if available
    if (activeStopIndex < liveRouteStops.length - 1) {
      setActiveStopIndex(activeStopIndex + 1);
    }
    setActiveScreenTab(2); // Go back to Route Progress
  };

  // Photo upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setDeliveryPhotoUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Calculate live completion metrics
  const completedStopsCount = liveRouteStops.filter(s => s.status === DeliveryStatus.DELIVERED).length;
  const totalStopsCount = liveRouteStops.length;
  const routeProgressPercent = totalStopsCount > 0 ? Math.round((completedStopsCount / totalStopsCount) * 100) : 0;

  // Selected stop details for Screen 1 bottom sheet
  const firstStop = liveRouteStops[0] || DEFAULT_ROUTE_STOPS[0];
  const secondStop = liveRouteStops[1] || DEFAULT_ROUTE_STOPS[1];
  const thirdStop = liveRouteStops[2] || DEFAULT_ROUTE_STOPS[2];

  return (
    <div className="min-h-screen bg-[#EBE7DF] text-slate-800 flex flex-col items-center justify-start py-8 px-4 sm:px-6 select-none font-sans">
      
      {/* ── HEADER BANNER (Matches user reference image styling) ── */}
      <div className="text-center mb-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-3xl">🚚</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2C2C2C] tracking-tight">
            Driver App: Mobile Workflow Screens
          </h1>
        </div>
        <p className="text-base sm:text-lg font-medium text-[#5F6368]">
          Light Theme UI
        </p>

        {/* Live Controls & Driver Switcher Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 bg-white/80 backdrop-blur-md p-2.5 rounded-2xl shadow-sm border border-black/5 text-xs">
          
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('3-screens')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === '3-screens' 
                  ? 'bg-white text-blue-700 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>3-Screen Overview</span>
            </button>
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'single' 
                  ? 'bg-white text-blue-700 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Interactive Phone</span>
            </button>
          </div>

          {/* Active Screen Tab Selector (When in single-phone mode) */}
          {viewMode === 'single' && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveScreenTab(1)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeScreenTab === 1 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Today's Deliveries
              </button>
              <button
                onClick={() => setActiveScreenTab(2)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeScreenTab === 2 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Route Progress
              </button>
              <button
                onClick={() => setActiveScreenTab(3)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeScreenTab === 3 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. Confirm Delivery
              </button>
            </div>
          )}

          {/* Driver Filter Selector */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <span className="font-semibold text-slate-500">Driver:</span>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Fleet Routes ({liveRouteStops.length} Stops)</option>
              {users.filter(u => u.role === 'Driver' || u.role === 'Logistics').map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} {currentUser?.id === u.id ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Live DB Status Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live DB Sync ({liveRouteStops.length} active stops)</span>
          </div>

        </div>

        {/* Real-time Toast Feedback */}
        {completionSuccessToast && (
          <div className="mt-4 inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg animate-bounce">
            <CheckCircle2 className="h-4 w-4" />
            <span>{completionSuccessToast}</span>
          </div>
        )}
      </div>

      {/* ── 3-SCREEN WORKFLOW CONTAINER ── */}
      <div className={`w-full max-w-7xl mx-auto flex items-center justify-center transition-all ${
        viewMode === '3-screens' 
          ? 'flex-col lg:flex-row items-center justify-center gap-8 lg:gap-10 xl:gap-14' 
          : 'flex-col items-center'
      }`}>

        {/* ══════════════════════════════════════════════════════════════
            SCREEN 1: TODAY'S DELIVERIES (Route Map View)
           ══════════════════════════════════════════════════════════════ */}
        {(viewMode === '3-screens' || activeScreenTab === 1) && (
          <div className="w-[340px] sm:w-[360px] h-[720px] bg-white rounded-[44px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] border-[8px] border-white ring-1 ring-black/10 overflow-hidden flex flex-col relative transition-transform hover:scale-[1.01] duration-300">
            
            {/* Phone Top Notch / Speaker Bar */}
            <div className="absolute top-0 inset-x-0 h-7 flex items-center justify-between px-6 z-30 pointer-events-none">
              <span className="text-[12px] font-bold text-slate-700 tracking-tight">{currentTime}</span>
              <div className="w-20 h-4 bg-black/5 rounded-full mx-auto"></div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Signal className="h-3 w-3" />
                <Wifi className="h-3 w-3" />
                <Battery className="h-3.5 w-3.5 fill-slate-700" />
              </div>
            </div>

            {/* Header: Today's Deliveries */}
            <div className="pt-9 pb-3 px-5 flex items-center justify-between bg-white z-20 border-b border-slate-100/80">
              <h2 className="text-lg font-black text-[#1E293B] tracking-tight">
                Today's Deliveries
              </h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => alert(`Active Route: ${liveRouteStops.length} stops loaded for today.`)}
                  className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                  title="Route Notifications"
                >
                  <Bell className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => alert('GPS Location Locked on Fleet Vehicle')}
                  className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-blue-600 transition-colors cursor-pointer"
                  title="Center on Vehicle"
                >
                  <Compass className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Map Canvas with Route Polyline and Markers */}
            <div className="flex-1 relative bg-[#EBF0F5] overflow-hidden">
              
              {/* Light Street Map Background (Vector Drawing matching screenshot) */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 360 560" preserveAspectRatio="none">
                <defs>
                  {/* Subtle Grid / Land Blocks */}
                  <pattern id="street-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                    <rect width="60" height="60" fill="#EDF2F7" />
                    <rect x="2" y="2" width="56" height="56" fill="#F8FAFC" rx="4" />
                  </pattern>
                  {/* Route Polyline Glow */}
                  <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#3B82F6" floodOpacity="0.25" />
                  </filter>
                </defs>

                {/* Base Land Fill */}
                <rect width="360" height="560" fill="url(#street-grid)" />

                {/* Road System Paths */}
                <path d="M -20 80 Q 140 120 380 90" stroke="#FFFFFF" strokeWidth="18" fill="none" />
                <path d="M -20 80 Q 140 120 380 90" stroke="#E2E8F0" strokeWidth="14" fill="none" />

                <path d="M 60 -20 L 100 240 L 40 580" stroke="#FFFFFF" strokeWidth="20" fill="none" />
                <path d="M 60 -20 L 100 240 L 40 580" stroke="#E2E8F0" strokeWidth="14" fill="none" />

                <path d="M 240 -20 L 220 280 L 320 580" stroke="#FFFFFF" strokeWidth="22" fill="none" />
                <path d="M 240 -20 L 220 280 L 320 580" stroke="#E2E8F0" strokeWidth="16" fill="none" />

                <path d="M -20 320 Q 180 300 380 340" stroke="#FFFFFF" strokeWidth="24" fill="none" />
                <path d="M -20 320 Q 180 300 380 340" stroke="#E2E8F0" strokeWidth="18" fill="none" />

                <path d="M 20 480 Q 200 460 380 500" stroke="#FFFFFF" strokeWidth="16" fill="none" />
                <path d="M 20 480 Q 200 460 380 500" stroke="#E2E8F0" strokeWidth="12" fill="none" />

                {/* Active Connected Polyline Route (Blue Vector matching screenshot) */}
                <path 
                  d="M 235 120 L 235 160 L 75 315 L 235 410 L 235 340" 
                  stroke="#4A8AF4" 
                  strokeWidth="5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  fill="none" 
                  filter="url(#routeGlow)"
                />

                {/* Route Connecting Inner Dash */}
                <path 
                  d="M 235 120 L 235 160 L 75 315 L 235 410 L 235 340" 
                  stroke="#FFFFFF" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeDasharray="4 6" 
                  fill="none" 
                />

                {/* Location Waypoint Pins matching screenshot */}
                {/* Pin 1: Top Right Stop */}
                <g transform="translate(235, 120)">
                  <circle r="14" fill="#4A8AF4" opacity="0.2" />
                  <path d="M 0 -14 C -7 -14 -12 -9 -12 -2 C -12 6 0 14 0 14 C 0 14 12 6 12 -2 C 12 -9 7 -14 0 -14 Z" fill="#4A8AF4" />
                  <circle cx="0" cy="-4" r="4" fill="#FFFFFF" />
                </g>

                {/* Pin 2: Mid-Left Stop */}
                <g transform="translate(75, 315)">
                  <circle r="14" fill="#4A8AF4" opacity="0.2" />
                  <path d="M 0 -14 C -7 -14 -12 -9 -12 -2 C -12 6 0 14 0 14 C 0 14 12 6 12 -2 C 12 -9 7 -14 0 -14 Z" fill="#4A8AF4" />
                  <circle cx="0" cy="-4" r="4" fill="#FFFFFF" />
                </g>

                {/* Pin 3: Lower-Right Stop */}
                <g transform="translate(235, 380)">
                  <circle r="14" fill="#4A8AF4" opacity="0.2" />
                  <path d="M 0 -14 C -7 -14 -12 -9 -12 -2 C -12 6 0 14 0 14 C 0 14 12 6 12 -2 C 12 -9 7 -14 0 -14 Z" fill="#4A8AF4" />
                  <circle cx="0" cy="-4" r="4" fill="#FFFFFF" />
                </g>
              </svg>

              {/* Interactive Target Recenter Button */}
              <button 
                onClick={() => {
                  setActiveStopIndex(0);
                  alert(`Target locked to Stop 1: ${firstStop.deliveryAddress}`);
                }}
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-all cursor-pointer z-10"
              >
                <Navigation2 className="h-4 w-4 text-blue-600 rotate-45" />
              </button>

              {/* ── BOTTOM FLOATING CARD (Matches image layout) ── */}
              <div className="absolute inset-x-3 bottom-4 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-[0_10px_25px_rgba(0,0,0,0.08)] border border-slate-100 z-20">
                {/* Drag Handle Indicator */}
                <div className="w-8 h-1 bg-slate-200 rounded-full mx-auto mb-3"></div>

                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-blue-600 tracking-tight">
                    1. Stop 1:
                  </h3>
                  <p className="text-sm font-bold text-slate-900 leading-tight">
                    {firstStop.deliveryAddress || '142 Blue Jay Lane'}
                  </p>
                  <p className="text-xs font-medium text-slate-500">
                    Est. 10:30 AM.
                  </p>
                </div>

                {/* START ROUTE Button */}
                <button
                  onClick={() => {
                    setActiveScreenTab(2);
                    setActiveStopIndex(1); // Advance to active Stop 2
                  }}
                  className="w-full mt-3 py-2.5 px-4 bg-[#4A8AF4] hover:bg-[#3B7AE4] active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>START ROUTE</span>
                </button>
              </div>

            </div>

            {/* Bottom Home Indicator Bar */}
            <div className="h-5 bg-white flex items-center justify-center">
              <div className="w-28 h-1 bg-slate-300 rounded-full"></div>
            </div>

          </div>
        )}


        {/* ══════════════════════════════════════════════════════════════
            SCREEN 2: ROUTE PROGRESS (Vertical Stepper & Timeline)
           ══════════════════════════════════════════════════════════════ */}
        {(viewMode === '3-screens' || activeScreenTab === 2) && (
          <div className="w-[340px] sm:w-[360px] h-[720px] bg-[#F1F4F9] rounded-[44px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] border-[8px] border-white ring-1 ring-black/10 overflow-hidden flex flex-col relative transition-transform hover:scale-[1.01] duration-300">
            
            {/* Phone Top Notch / Status Bar */}
            <div className="absolute top-0 inset-x-0 h-7 flex items-center justify-between px-6 z-30 pointer-events-none bg-[#F1F4F9]">
              <span className="text-[12px] font-bold text-slate-700 tracking-tight">12:10</span>
              <div className="w-20 h-4 bg-black/5 rounded-full mx-auto"></div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Signal className="h-3 w-3" />
                <Wifi className="h-3 w-3" />
                <Battery className="h-3.5 w-3.5 fill-slate-700" />
              </div>
            </div>

            {/* Header: Route Progress */}
            <div className="pt-9 pb-3 px-5 flex items-center justify-between bg-[#F1F4F9] z-20">
              <h2 className="text-lg font-black text-[#1E293B] tracking-tight">
                Route Progress
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono">
                {completedStopsCount}/{totalStopsCount} Done
              </span>
            </div>

            {/* Main Stepper Timeline Area */}
            <div className="flex-1 overflow-y-auto px-5 pt-2 pb-28 space-y-0 relative">
              
              {/* Vertical Connecting Progress Line */}
              <div className="absolute left-[31px] top-6 bottom-20 w-[2.5px] bg-slate-300 -z-0">
                {/* Completed Blue Segment */}
                <div className="w-full bg-[#4A8AF4] h-12"></div>
                {/* Active Green Segment */}
                <div className="w-full bg-emerald-500 h-28"></div>
              </div>

              {/* Stop 1 (Completed) */}
              <div 
                onClick={() => setActiveStopIndex(0)}
                className="relative flex items-center gap-3.5 py-3 cursor-pointer group"
              >
                <div className="h-7 w-7 rounded-full bg-[#4A8AF4] text-white text-xs font-bold flex items-center justify-center shadow-xs z-10 shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                    Stop 1
                  </span>
                  <p className="text-[11px] text-slate-400 truncate">
                    {firstStop.deliveryAddress || '142 Blue Jay Lane'}
                  </p>
                </div>
              </div>

              {/* Stop 2 (Active Highlighted Card matching screenshot) */}
              <div 
                onClick={() => {
                  setActiveStopIndex(1);
                  setActiveScreenTab(3); // Navigate to Confirm Delivery
                }}
                className="relative flex items-start gap-3.5 py-2 cursor-pointer group"
              >
                <div className="h-7 w-7 rounded-full bg-[#4A8AF4] text-white text-xs font-bold flex items-center justify-center shadow-xs z-10 shrink-0 mt-3.5">
                  2
                </div>

                {/* Expanded Highlighted Card */}
                <div className="flex-1 bg-white rounded-2xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-slate-100 hover:border-blue-300 transition-all">
                  <h4 className="text-sm font-black text-slate-900 tracking-tight">
                    {secondStop.customerName || 'Green Leaf'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Arriving. Tap to View Details.
                  </p>
                </div>
              </div>

              {/* Stop 3 */}
              <div 
                onClick={() => setActiveStopIndex(2)}
                className="relative flex items-center gap-3.5 py-3 cursor-pointer group"
              >
                <div className="h-7 w-7 rounded-full bg-slate-300 text-slate-600 text-xs font-bold flex items-center justify-center shadow-xs z-10 shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-slate-500 group-hover:text-slate-800 transition-colors">
                    Stop 3
                  </span>
                  <p className="text-[11px] text-slate-400 truncate">
                    {thirdStop.deliveryAddress || '56 Oak Drive'}
                  </p>
                </div>
              </div>

              {/* Stop 4 */}
              <div 
                onClick={() => setActiveStopIndex(3)}
                className="relative flex items-center gap-3.5 py-3 cursor-pointer group"
              >
                <div className="h-7 w-7 rounded-full bg-slate-300 text-slate-600 text-xs font-bold flex items-center justify-center shadow-xs z-10 shrink-0">
                  4
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-slate-500 group-hover:text-slate-800 transition-colors">
                    Stop 4
                  </span>
                  <p className="text-[11px] text-slate-400 truncate">
                    {liveRouteStops[3]?.deliveryAddress || '210 Maple Crescent'}
                  </p>
                </div>
              </div>

              {/* Stop 5 */}
              <div 
                onClick={() => setActiveStopIndex(4)}
                className="relative flex items-center gap-3.5 py-3 cursor-pointer group"
              >
                <div className="h-7 w-7 rounded-full bg-slate-300 text-slate-600 text-xs font-bold flex items-center justify-center shadow-xs z-10 shrink-0">
                  5
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-slate-500 group-hover:text-slate-800 transition-colors">
                    Stop 5
                  </span>
                  <p className="text-[11px] text-slate-400 truncate">
                    {liveRouteStops[4]?.deliveryAddress || '74 Highland Terrace'}
                  </p>
                </div>
              </div>

              {/* Stop 6 (Green Final Stop matching screenshot) */}
              <div 
                onClick={() => setActiveStopIndex(5)}
                className="relative flex items-center gap-3.5 py-3 cursor-pointer group"
              >
                <div className="h-7 w-7 rounded-full bg-[#34A853] text-white text-xs font-bold flex items-center justify-center shadow-xs z-10 shrink-0">
                  6
                </div>
                <div className="flex-1">
                  <span className="text-sm font-bold text-[#34A853]">
                    Stop 6
                  </span>
                  <p className="text-[11px] text-slate-400 truncate">
                    {liveRouteStops[5]?.deliveryAddress || 'Windmill Logistics Hub (Depot)'}
                  </p>
                </div>
              </div>

            </div>

            {/* ── BOTTOM FLOATING CARD (Matches image layout) ── */}
            <div className="absolute inset-x-3 bottom-3 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-[0_10px_25px_rgba(0,0,0,0.08)] border border-slate-100 z-20">
              {/* Drag Handle */}
              <div className="w-8 h-1 bg-slate-200 rounded-full mx-auto mb-2"></div>

              <div className="space-y-0.5 mb-3">
                <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                  Stop {activeStopIndex + 1}: {currentStop.deliveryAddress || '56 Oak Drive'}
                </h3>
                <p className="text-[11px] font-medium text-slate-500">
                  11:15 AM.
                </p>
              </div>

              {/* Dual Action Buttons: Nav & Contact */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    const address = encodeURIComponent(currentStop.deliveryAddress || '56 Oak Drive');
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank');
                  }}
                  className="py-2 px-3 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Navigation2 className="h-3.5 w-3.5 text-blue-600 rotate-45" />
                  <span>Nav</span>
                </button>

                <button
                  onClick={() => {
                    const tel = currentStop.phone || '(902) 468-2300';
                    window.location.href = `tel:${tel.replace(/\D/g, '')}`;
                  }}
                  className="py-2 px-3 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Phone className="h-3.5 w-3.5 text-slate-600" />
                  <span>Contact</span>
                </button>
              </div>

              {/* Direct POD Navigation Trigger */}
              <button
                onClick={() => setActiveScreenTab(3)}
                className="w-full mt-2 py-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 text-center transition-colors cursor-pointer"
              >
                Proceed to Confirm Delivery →
              </button>
            </div>

            {/* Bottom Home Indicator Bar */}
            <div className="h-5 bg-[#F1F4F9] flex items-center justify-center">
              <div className="w-28 h-1 bg-slate-300 rounded-full"></div>
            </div>

          </div>
        )}


        {/* ══════════════════════════════════════════════════════════════
            SCREEN 3: CONFIRM DELIVERY (Proof of Delivery / POD)
           ══════════════════════════════════════════════════════════════ */}
        {(viewMode === '3-screens' || activeScreenTab === 3) && (
          <div className="w-[340px] sm:w-[360px] h-[720px] bg-white rounded-[44px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] border-[8px] border-white ring-1 ring-black/10 overflow-hidden flex flex-col relative transition-transform hover:scale-[1.01] duration-300">
            
            {/* Phone Top Notch / Status Bar */}
            <div className="absolute top-0 inset-x-0 h-7 flex items-center justify-between px-6 z-30 pointer-events-none">
              <span className="text-[12px] font-bold text-white/90 drop-shadow-sm tracking-tight">12:30</span>
              <div className="w-20 h-4 bg-black/20 rounded-full mx-auto"></div>
              <div className="flex items-center gap-1.5 text-white/90 drop-shadow-sm">
                <Signal className="h-3 w-3" />
                <Wifi className="h-3 w-3" />
                <Battery className="h-3.5 w-3.5 fill-white/90" />
              </div>
            </div>

            {/* Back Button (matching screenshot) */}
            <button
              onClick={() => setActiveScreenTab(2)}
              className="absolute top-8 left-4 h-8 w-8 rounded-full bg-white/90 backdrop-blur-md shadow-md flex items-center justify-center text-slate-700 hover:bg-white transition-all cursor-pointer z-30"
              title="Back to Route Progress"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            {/* Top Photo Header: Delivery at Doorstep */}
            <div className="h-48 relative bg-slate-100 overflow-hidden shrink-0">
              <img
                src={deliveryPhotoUrl}
                alt="Doorstep Delivery Proof"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to stylized SVG placeholder if image is missing
                  e.currentTarget.src = '/doorstep_delivery_photo.jpg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20"></div>

              {/* Retake / Upload Photo Trigger */}
              <label 
                className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 cursor-pointer transition-all"
                title="Snap or upload photo"
              >
                <Camera className="h-3 w-3 text-blue-600" />
                <span>Change Photo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={handlePhotoUpload} 
                  className="hidden" 
                />
              </label>
            </div>

            {/* Form Content Area */}
            <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4 flex flex-col justify-between">
              
              <div>
                {/* Title & Subtitle */}
                <div className="text-center mb-3">
                  <h3 className="text-base font-black text-[#1E293B] tracking-tight">
                    Confirm Delivery
                  </h3>
                  <p className="text-xs text-slate-400">
                    Confirm your {currentStop.customerName || 'customer'} delivery.
                  </p>
                </div>

                {/* Signature Field */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-500">
                      Signature
                    </label>
                    <button 
                      onClick={clearSignature}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Interactive Signature Box */}
                  <div className="h-24 w-full bg-[#F0F4F8] rounded-xl relative overflow-hidden border border-slate-200/80 flex items-center justify-center">
                    <canvas
                      ref={canvasRef}
                      width={300}
                      height={96}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-full cursor-crosshair touch-none"
                    />

                    {/* Placeholder Script if untouched */}
                    {!hasDrawnSignature && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <span 
                          className="text-2xl text-slate-400/80 italic font-serif select-none"
                          style={{ fontFamily: "'Brush Script MT', 'Caveat', cursive, serif" }}
                        >
                          {signatureText}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes Field */}
                <div className="mb-2">
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    Notes
                  </label>
                  <textarea
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    rows={2}
                    placeholder="Enter site delivery notes..."
                    className="w-full bg-[#F0F4F8] rounded-xl p-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200/80 resize-none font-medium leading-relaxed"
                  />
                </div>
              </div>

              {/* MARK COMPLETE Button (Matching screenshot) */}
              <div className="pt-2">
                <button
                  onClick={handleMarkComplete}
                  className="w-full py-3 bg-[#4A8AF4] hover:bg-[#3B7AE4] active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  <span>MARK COMPLETE</span>
                </button>
              </div>

            </div>

            {/* Bottom Home Indicator Bar */}
            <div className="h-5 bg-white flex items-center justify-center">
              <div className="w-28 h-1 bg-slate-300 rounded-full"></div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
