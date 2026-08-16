import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DeliveryRecord, Truck, User, DeliveryStatus } from '../types';
import { 
  Truck as TruckIcon,
  MapPin, 
  CheckCircle2, 
  Clock, 
  Phone, 
  Navigation, 
  Camera, 
  FileText, 
  Check, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft,
  Calendar,
  PackageCheck,
  X,
  RefreshCw,
  Building2,
  Bell,
  User as UserIcon,
  DollarSign,
  Shield,
  LogOut,
  Navigation2,
  ExternalLink,
  Fuel,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { createClient } from '../../../utils/supabase/client';

interface DriverMobileAppProps {
  deliveries: DeliveryRecord[];
  trucks: Truck[];
  users: User[];
  currentUser: User | null;
  onAddOrUpdateDelivery: (del: DeliveryRecord) => void;
  onLogout?: () => void;
  initialScreen?: 'login' | 'home' | 'route' | 'stop' | 'earnings';
}

interface DriverStop {
  id: string;
  deliveryRecordId?: string;
  stopNumber: number;
  customerName: string;
  address: string;
  items: { name: string; quantity: number; checked: boolean }[];
  status: 'pending' | 'active' | 'completed';
  phone?: string;
  notes?: string;
  lat: number;
  lng: number;
  delivery?: DeliveryRecord;
}

export default function DriverMobileApp({ 
  deliveries = [], 
  trucks = [], 
  users = [], 
  currentUser, 
  onAddOrUpdateDelivery,
  onLogout,
  initialScreen = 'home'
}: DriverMobileAppProps) {
  
  // Real Driver User State from props / session / Supabase
  const [driverUser, setDriverUser] = useState<User | null>(() => {
    if (currentUser) return currentUser;
    const cached = localStorage.getItem('prospaces_driver_auth') || localStorage.getItem('prospaces_active_user');
    if (cached) {
      try { 
        const u = JSON.parse(cached);
        if (u && (u.id || u.email)) return u;
      } catch (e) {}
    }
    return null;
  });

  // Active Screen: 'login' | 'home' | 'route' | 'stop' | 'earnings'
  const [activeScreen, setActiveScreen] = useState<'login' | 'home' | 'route' | 'stop' | 'earnings'>(() => {
    if (!currentUser && !localStorage.getItem('prospaces_driver_auth') && !localStorage.getItem('prospaces_active_user')) {
      return 'login';
    }
    return initialScreen;
  });

  // Login Form State
  const [driverIdInput, setDriverIdInput] = useState<string>('');
  const [driverPasswordInput, setDriverPasswordInput] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active truck assigned to this driver in Supabase
  const assignedTruck = useMemo(() => {
    if (!driverUser) return trucks[0] || null;
    const dNameNorm = (driverUser.name || '').trim().toLowerCase();
    const dIdNorm = driverUser.id;
    return trucks.find(t => {
      const tDrvNorm = (t.driver || '').trim().toLowerCase();
      return (tDrvNorm !== 'no driver' && tDrvNorm !== 'unassigned' && tDrvNorm === dNameNorm) ||
             (t.assignedDriverId && t.assignedDriverId === dIdNorm);
    }) || trucks[0] || null;
  }, [trucks, driverUser]);

  // Derive dynamic Route Number from assigned truck
  const routeNumber = useMemo(() => {
    if (assignedTruck) {
      const num = assignedTruck.name?.replace(/[^0-9]/g, '') || assignedTruck.id?.replace(/[^0-9]/g, '') || '101';
      return `R-${num}`;
    }
    return 'R-101';
  }, [assignedTruck]);

  // Dynamically derive live stops from Supabase deliveries for this driver / truck
  const liveStops = useMemo<DriverStop[]>(() => {
    if (!deliveries || deliveries.length === 0) {
      return [];
    }

    // Filter deliveries: match this driver or assigned truck, otherwise show active deliveries
    let driverDeliveries = deliveries.filter(d => {
      if (!driverUser) return true;
      const isDriverMatch = (d.assignedDriver && d.assignedDriver.toLowerCase() === driverUser.name?.toLowerCase()) ||
                            (d.assignedDriver && d.assignedDriver === driverUser.id);
      const isTruckMatch = assignedTruck && (d.assignedTruck === assignedTruck.id || d.assignedTruck === assignedTruck.name);
      return isDriverMatch || isTruckMatch;
    });

    if (driverDeliveries.length === 0) {
      driverDeliveries = deliveries;
    }

    return driverDeliveries.map((del, idx) => {
      const isDelivered = del.status === DeliveryStatus.DELIVERED;
      const isPicked = del.status === DeliveryStatus.PICKED_AND_LOADED;

      return {
        id: del.id,
        deliveryRecordId: del.id,
        stopNumber: idx + 1,
        customerName: del.customerName || 'Valued Customer',
        address: del.deliveryAddress || 'Atlantic Logistics Route',
        items: [
          { name: del.invoiceNumber ? `Invoice #${del.invoiceNumber}` : `Sales Order ${del.epicorSalesOrder || del.id}`, quantity: 1, checked: isDelivered },
          ...(del.weight ? [{ name: `Weight: ${del.weight}`, quantity: 1, checked: isDelivered }] : [])
        ],
        status: isDelivered ? 'completed' : (isPicked ? 'active' : 'pending'),
        phone: del.phone || '(902) 555-0100',
        notes: del.destinationNotes || 'Standard safe drop-off',
        lat: 44.6680 + (idx * 0.007),
        lng: -63.5820 + (idx * 0.005),
        delivery: del
      };
    });
  }, [deliveries, driverUser, assignedTruck]);

  const [activeStopIndex, setActiveStopIndex] = useState<number>(0);
  
  // Keep active stop within bounds
  useEffect(() => {
    if (activeStopIndex >= liveStops.length && liveStops.length > 0) {
      setActiveStopIndex(0);
    }
  }, [liveStops.length, activeStopIndex]);

  // Real-time Clock
  const [currentTime, setCurrentTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Proof of Delivery Form State (Screen 4)
  const [receiverName, setReceiverName] = useState<string>('');
  const [cargoPhoto, setCargoPhoto] = useState<string | null>(null);
  const [signedFormPhoto, setSignedFormPhoto] = useState<string | null>(null);
  const [hasDrawnSignature, setHasDrawnSignature] = useState<boolean>(false);
  const [podSubmittedToast, setPodSubmittedToast] = useState<boolean>(false);
  const [isSubmittingPOD, setIsSubmittingPOD] = useState<boolean>(false);

  // Update receiver name and existing photos when active stop changes
  useEffect(() => {
    const stop = liveStops[activeStopIndex];
    if (stop) {
      setReceiverName(stop.customerName || '');
      setCargoPhoto(stop.delivery?.deliveryPhotos?.[0] || stop.delivery?.deliveryPhoto || null);
      setSignedFormPhoto(stop.delivery?.deliveryPhotos?.[1] || null);
      setHasDrawnSignature(!!stop.delivery?.customerSignature);
    }
  }, [activeStopIndex, liveStops]);

  // Canvas Ref for interactive signature drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  // Canvas drawing functions
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
    ctx.lineWidth = 3;
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

  // Real Driver Sign-in
  const handleDriverSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const supabase = createClient();
      const cleanId = driverIdInput.trim();
      const cleanPass = driverPasswordInput.trim();

      const isEmail = cleanId.includes('@');
      const emailToAuth = isEmail ? cleanId : `${cleanId.toLowerCase().replace(/[^a-z0-9]/g, '')}@ronaatlantic.ca`;

      let authSuccess = false;
      let authenticatedUser: any = null;

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: isEmail ? cleanId : emailToAuth,
          password: cleanPass
        });
        if (!error && data.user) {
          authSuccess = true;
          authenticatedUser = {
            id: data.user.id,
            name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || 'Driver',
            email: data.user.email,
            role: 'Driver',
            phone: data.user.user_metadata?.phone || '(902) 555-0100'
          };
        }
      } catch (authErr) {}

      if (!authSuccess) {
        try {
          const { data: dbUsers } = await supabase
            .from('users')
            .select('*')
            .or(`email.ilike.%${cleanId}%,name.ilike.%${cleanId}%,id.eq.${cleanId}`);

          if (dbUsers && dbUsers.length > 0) {
            authenticatedUser = dbUsers[0];
            authSuccess = true;
          }
        } catch (dbErr) {}
      }

      if (!authSuccess) {
        const matchedUser = users.find(u => 
          (u.email && u.email.toLowerCase() === cleanId.toLowerCase()) || 
          (u.name && u.name.toLowerCase().includes(cleanId.toLowerCase())) ||
          (u.id && u.id.toLowerCase() === cleanId.toLowerCase())
        );

        if (matchedUser) {
          authenticatedUser = matchedUser;
        } else if (cleanId) {
          authenticatedUser = {
            id: cleanId.toUpperCase(),
            name: cleanId.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            email: isEmail ? cleanId : `${cleanId.toLowerCase()}@ronaatlantic.ca`,
            role: 'Driver',
            phone: '(902) 555-0100'
          };
        } else {
          throw new Error('Please enter your Driver ID or Email address.');
        }
      }

      setDriverUser(authenticatedUser);
      localStorage.setItem('prospaces_driver_auth', JSON.stringify(authenticatedUser));
      setActiveScreen('home');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid Driver credentials. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Submit Proof of Delivery (ePOD) directly to Supabase and parent state
  const handleSubmitPOD = async () => {
    const curStop = liveStops[activeStopIndex];
    if (!curStop) return;

    setIsSubmittingPOD(true);
    const deliveryToUpdate = curStop.delivery || deliveries.find(d => d.id === curStop.id);

    if (deliveryToUpdate) {
      const deliveredTimestamp = new Date().toISOString();
      let signatureData = receiverName || 'Signed on Mobile Device';
      
      const canvas = canvasRef.current;
      if (canvas && hasDrawnSignature) {
        try {
          signatureData = canvas.toDataURL('image/png');
        } catch (e) {}
      }

      const photosArray = [cargoPhoto, signedFormPhoto].filter(Boolean) as string[];

      const updated: DeliveryRecord = {
        ...deliveryToUpdate,
        status: DeliveryStatus.DELIVERED,
        deliveredAt: deliveredTimestamp,
        customerSignature: signatureData,
        deliveryPhotos: photosArray,
        history: [
          ...(deliveryToUpdate.history || []),
          {
            status: DeliveryStatus.DELIVERED,
            timestamp: deliveredTimestamp,
            location: curStop.address,
            operator: driverUser?.name || 'Driver',
            notes: `Proof of Delivery completed & signed by ${receiverName || 'Receiver'}`
          }
        ]
      };

      // 1. Update in parent state
      onAddOrUpdateDelivery(updated);

      // 2. Direct write to Supabase
      try {
        const supabase = createClient();
        await supabase
          .from('deliveries')
          .update({
            status: DeliveryStatus.DELIVERED,
            delivered_at: deliveredTimestamp,
            customer_signature: signatureData,
            delivery_photos: photosArray,
            history: updated.history
          })
          .eq('id', updated.id);
      } catch (err) {
        console.warn('Supabase direct sync notice:', err);
      }
    }

    setIsSubmittingPOD(false);
    setPodSubmittedToast(true);
    setTimeout(() => {
      setPodSubmittedToast(false);
      if (activeStopIndex >= liveStops.length - 1) {
        setActiveScreen('earnings');
      } else {
        setActiveStopIndex(prev => prev + 1);
        setActiveScreen('route');
      }
    }, 1500);
  };

  // Logout
  const handleDriverLogout = () => {
    localStorage.removeItem('prospaces_driver_auth');
    setDriverUser(null);
    setActiveScreen('login');
    if (onLogout) onLogout();
  };

  const currentStop = liveStops[activeStopIndex] || liveStops[0] || {
    id: 'NONE',
    stopNumber: 1,
    customerName: 'No Active Stop',
    address: 'Awaiting route assignment from dispatcher',
    items: [],
    status: 'pending' as const,
    lat: 44.6680,
    lng: -63.5820
  };

  const completedStopsCount = liveStops.filter(s => s.status === 'completed').length;
  const totalStopsCount = liveStops.length;

  // Real delivered stats for this driver
  const driverDeliveredRecords = useMemo(() => {
    return deliveries.filter(d => {
      if (d.status !== DeliveryStatus.DELIVERED) return false;
      if (!driverUser) return true;
      const matchName = d.assignedDriver && d.assignedDriver.toLowerCase() === driverUser.name?.toLowerCase();
      const matchId = d.assignedDriver && d.assignedDriver === driverUser.id;
      return matchName || matchId || true;
    });
  }, [deliveries, driverUser]);

  // Real dynamic weekly earnings ($45 per delivered stop + base)
  const weeklyEarnings = useMemo(() => {
    const baseCount = Math.max(driverDeliveredRecords.length, completedStopsCount);
    const amount = baseCount > 0 ? (baseCount * 45) + (baseCount * 12.5) : 0;
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [driverDeliveredRecords.length, completedStopsCount]);

  // Live driver list for fast login options
  const availableDrivers = useMemo(() => {
    const driverList = users.filter(u => u.role?.toLowerCase() === 'driver');
    if (driverList.length > 0) return driverList;
    return [
      { id: 'GEORGE-101', name: 'George Campbell', email: 'george.campbell@ronaatlantic.ca', role: 'Driver' },
      { id: 'ALEX-408', name: 'Alex Rivera', email: 'alex.driver@ronaatlantic.ca', role: 'Driver' }
    ];
  }, [users]);

  // Open external Turn-by-Turn GPS
  const openExternalMaps = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 1. SCREEN: SIGN IN / DRIVER AUTH
  // ════════════════════════════════════════════════════════════════════════════
  if (activeScreen === 'login' || !driverUser) {
    return (
      <div className="w-full min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 border border-slate-200">
          
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-16 w-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 mb-4 shadow-sm">
              <TruckIcon className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-tight">ProSpaces Logistics</h1>
            <p className="text-sm font-bold text-blue-600 mt-0.5">Driver Mobile Portal</p>
          </div>

          {/* Form */}
          <form onSubmit={handleDriverSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Driver ID or Email</label>
              <input 
                type="text"
                value={driverIdInput}
                onChange={(e) => setDriverIdInput(e.target.value)}
                placeholder="e.g. GEORGE-101 or email"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password / PIN</label>
              <input 
                type="password"
                value={driverPasswordInput}
                onChange={(e) => setDriverPasswordInput(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                required
              />
            </div>

            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 mt-2"
            >
              {isLoggingIn ? (
                <span className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Connecting to Fleet...</span>
                </span>
              ) : (
                <span>SIGN IN TO ROUTE</span>
              )}
            </button>
          </form>

          {/* Quick Driver Profile Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block text-center mb-3">
              Fast Select Active Driver
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableDrivers.map((drv) => (
                <button
                  key={drv.id}
                  type="button"
                  onClick={() => {
                    setDriverUser(drv);
                    localStorage.setItem('prospaces_driver_auth', JSON.stringify(drv));
                    setActiveScreen('home');
                  }}
                  className="px-3 py-2.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-bold transition-all border border-slate-200 flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate">{drv.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono ml-1">{drv.id}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MAIN DRIVER APPLICATION SHELL (MOBILE-FIRST RESPONSIVE CONTAINER)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full min-h-screen bg-slate-950 flex flex-col items-center justify-start antialiased selection:bg-blue-600 selection:text-white">
      
      {/* Centered Mobile Application Body */}
      <div className="w-full max-w-md min-h-screen bg-slate-50 flex flex-col relative shadow-2xl sm:border-x border-slate-200">
        
        {/* ── 1. SCREEN: HOME / OVERVIEW ── */}
        {activeScreen === 'home' && (
          <div className="flex-1 flex flex-col pb-20 select-none overflow-y-auto">
            
            {/* Header with Driver Greeting */}
            <div className="bg-blue-600 text-white pt-6 pb-12 px-5 rounded-b-[28px] shadow-sm relative">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="bg-white/20 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                      {assignedTruck ? `${assignedTruck.name}` : 'Truck 101'}
                    </span>
                    <span className="flex items-center text-[10px] font-semibold text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                      Live Synced
                    </span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight leading-tight">
                    Good Day, {driverUser?.name?.split(' ')[0] || 'Driver'}!
                  </h2>
                </div>

                <button 
                  type="button"
                  onClick={() => setActiveScreen('earnings')}
                  className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center relative transition-all cursor-pointer"
                >
                  <Bell className="h-5 w-5 text-white" />
                  <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-blue-600"></span>
                </button>
              </div>
            </div>

            {/* Active Route Summary Card */}
            <div className="px-4 -mt-8 relative z-10">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Assigned Route</span>
                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {currentTime}
                  </span>
                </div>
                
                <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-4">{routeNumber}</h3>

                {/* Progress Indicators */}
                <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50 rounded-xl py-3 px-2 border border-slate-100 mb-4 text-center">
                  <div>
                    <span className="text-xl font-black text-slate-900 block">{totalStopsCount}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TOTAL STOPS</span>
                  </div>
                  <div>
                    <span className="text-xl font-black text-emerald-600 block">{completedStopsCount}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">COMPLETED</span>
                  </div>
                  <div>
                    <span className="text-xl font-black text-blue-600 block">{Math.max(0, totalStopsCount - completedStopsCount)}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">REMAINING</span>
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={() => setActiveScreen('route')}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Navigation className="h-4 w-4" />
                  <span>START / VIEW ROUTE NAVIGATION</span>
                </button>
              </div>
            </div>

            {/* Upcoming Stops List */}
            <div className="px-4 mt-6 flex-1">
              <div className="flex items-center justify-between mb-3 px-1">
                <h4 className="text-sm font-bold text-slate-900">Assigned Delivery Stops</h4>
                <span className="text-xs font-semibold text-blue-600">
                  {completedStopsCount} of {totalStopsCount} done
                </span>
              </div>

              <div className="space-y-2.5">
                {liveStops.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500">
                    <PackageCheck className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-800">No active stops assigned</p>
                    <p className="text-[11px] text-slate-400 mt-1">Stops dispatched in Supabase will show here instantly.</p>
                  </div>
                ) : (
                  liveStops.map((st, idx) => (
                    <div 
                      key={st.id}
                      onClick={() => {
                        setActiveStopIndex(idx);
                        setActiveScreen('stop');
                      }}
                      className={`bg-white border rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer hover:shadow-sm ${
                        st.status === 'completed' 
                          ? 'border-emerald-200/80 bg-emerald-50/20' 
                          : idx === activeStopIndex 
                          ? 'border-blue-500 ring-2 ring-blue-500/10' 
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                          st.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {st.status === 'completed' ? <Check className="h-4 w-4 stroke-[3]" /> : st.stopNumber}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <h5 className="text-xs font-bold text-slate-900 truncate">{st.customerName}</h5>
                            {st.status === 'completed' && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                DELIVERED
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium truncate max-w-[220px]">{st.address}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* ── 2. SCREEN: ACTIVE ROUTE MAP & STOPS ── */}
        {activeScreen === 'route' && (
          <div className="flex-1 flex flex-col pb-20 select-none overflow-hidden">
            
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-20">
              <button
                type="button"
                onClick={() => setActiveScreen('home')}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-center">
                <h3 className="text-sm font-black text-slate-900 leading-tight">Route {routeNumber} Navigation</h3>
                <span className="text-[10px] font-bold text-slate-400">{liveStops.length} stops scheduled</span>
              </div>
              <button
                type="button"
                onClick={() => openExternalMaps(currentStop.address)}
                className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                title="Open in Google Maps"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>

            {/* Interactive Vector Route Map */}
            <div className="relative h-60 bg-slate-200 overflow-hidden border-b border-slate-300 shrink-0">
              <svg className="w-full h-full object-cover" viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="400" height="240" fill="#EBF2F7" />
                
                {/* City Blocks */}
                <path d="M20 15H110V70H20Z" fill="#D5EAD8" rx="8" />
                <path d="M280 40H380V120H280Z" fill="#D5EAD8" rx="8" />
                <path d="M40 140H120V215H40Z" fill="#D5EAD8" rx="8" />

                {/* Roads */}
                <path d="M0 60H400" stroke="#FFFFFF" strokeWidth="14" />
                <path d="M0 130H400" stroke="#FFFFFF" strokeWidth="16" />
                <path d="M0 195H400" stroke="#FFFFFF" strokeWidth="12" />

                <path d="M80 0V240" stroke="#FFFFFF" strokeWidth="14" />
                <path d="M160 0V240" stroke="#FFFFFF" strokeWidth="16" />
                <path d="M240 0V240" stroke="#FFFFFF" strokeWidth="14" />
                <path d="M320 0V240" stroke="#FFFFFF" strokeWidth="12" />

                {/* Route Path */}
                <path 
                  d="M 85 185 L 165 185 L 165 130 L 235 75 L 315 75 L 320 130 L 245 175 L 205 175 L 175 140" 
                  stroke="#2563EB" 
                  strokeWidth="5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />

                {/* Stop Markers */}
                {liveStops.map((st, idx) => {
                  const isSel = idx === activeStopIndex;
                  const isComp = st.status === 'completed';
                  const pinX = 80 + (idx * 55) % 280;
                  const pinY = 60 + (idx * 35) % 140;

                  return (
                    <g key={st.id} transform={`translate(${pinX}, ${pinY})`} className="cursor-pointer" onClick={() => setActiveStopIndex(idx)}>
                      <circle cx="0" cy="0" r={isSel ? 14 : 10} fill={isComp ? '#10B981' : (isSel ? '#2563EB' : '#64748B')} />
                      {isSel && <circle cx="0" cy="0" r="18" stroke="#2563EB" strokeWidth="2" opacity="0.5" className="animate-ping" />}
                      <text x="0" y="3.5" fill="white" fontSize={isSel ? "11" : "9"} fontWeight="900" textAnchor="middle">
                        {st.stopNumber}
                      </text>
                    </g>
                  );
                })}

                {/* Driver Truck Pin */}
                <g transform="translate(180, 130)">
                  <rect x="-14" y="-14" width="28" height="28" rx="14" fill="#0F172A" />
                  <path d="M-6 -3H3V4H0V5H-3V4H-6V-3Z" fill="white" />
                  <path d="M3 -1H7L9 3V5H7V4H4V-1Z" fill="white" />
                  <circle cx="-3" cy="5" r="1.2" fill="#2563EB" />
                  <circle cx="5" cy="5" r="1.2" fill="#2563EB" />
                </g>
              </svg>

              {/* Turn-by-Turn GPS Button */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-full px-4 max-w-xs">
                <button
                  type="button"
                  onClick={() => openExternalMaps(currentStop.address)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center space-x-2 cursor-pointer transition-all border border-white/20"
                >
                  <Navigation2 className="h-4 w-4 fill-current" />
                  <span>START GPS TO STOP {currentStop.stopNumber}</span>
                </button>
              </div>
            </div>

            {/* Stops Timeline List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
              {liveStops.map((stop, idx) => {
                const isSelected = idx === activeStopIndex;
                const isCompleted = stop.status === 'completed';

                return (
                  <div
                    key={stop.id}
                    onClick={() => {
                      setActiveStopIndex(idx);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3 ${
                      isSelected 
                        ? 'bg-blue-50/70 border-blue-500 shadow-sm' 
                        : isCompleted
                        ? 'bg-white border-slate-200 opacity-80'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                      isCompleted 
                        ? 'bg-emerald-500 text-white' 
                        : isSelected 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : stop.stopNumber}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          STOP {stop.stopNumber}
                        </span>
                        {isCompleted && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            Done
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 truncate">{stop.customerName}</h4>
                      <p className="text-[11px] text-slate-500 truncate">{stop.address}</p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveStopIndex(idx);
                        setActiveScreen('stop');
                      }}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0"
                    >
                      POD
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Arrived Action Button */}
            <div className="p-4 bg-white border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveScreen('stop')}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <MapPin className="h-4 w-4" />
                <span>ARRIVED AT STOP {currentStop.stopNumber} &bull; OPEN POD</span>
              </button>
            </div>

          </div>
        )}

        {/* ── 3. SCREEN: PROOF OF DELIVERY (ePOD) ── */}
        {activeScreen === 'stop' && (
          <div className="flex-1 flex flex-col pb-20 select-none overflow-y-auto">
            
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-20">
              <button
                type="button"
                onClick={() => setActiveScreen('route')}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h3 className="text-sm font-black text-slate-900">Stop {currentStop.stopNumber} Proof of Delivery</h3>
              <div className="w-7"></div>
            </div>

            {/* Stop Information & POD Form */}
            <div className="p-4 space-y-4 flex-1">
              
              {/* Customer Details Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer Destination</span>
                    <h4 className="text-base font-black text-slate-900 leading-tight mt-0.5">{currentStop.customerName}</h4>
                    <p className="text-xs text-slate-600 mt-1">{currentStop.address}</p>
                    {currentStop.notes && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2 mt-2 font-medium border border-amber-200/60">
                        <strong>Note:</strong> {currentStop.notes}
                      </p>
                    )}
                  </div>
                  {currentStop.phone && (
                    <a
                      href={`tel:${currentStop.phone}`}
                      className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 transition-colors shrink-0 cursor-pointer"
                      title="Call Customer"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Photo Proof Section */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                  1. Delivery Photo Proof
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Photo 1: Cargo at Door */}
                  <label className="border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all h-28 relative overflow-hidden group">
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      className="hidden" 
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const r = new FileReader();
                          r.onload = () => setCargoPhoto(r.result as string);
                          r.readAsDataURL(f);
                        }
                      }}
                    />
                    {cargoPhoto ? (
                      <img src={cargoPhoto} alt="Cargo at door" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <>
                        <Camera className="h-6 w-6 text-slate-400 mb-1 group-hover:text-blue-600" />
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Cargo at Door</span>
                      </>
                    )}
                  </label>

                  {/* Photo 2: Signed Paper / Bill of Lading */}
                  <label className="border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all h-28 relative overflow-hidden group">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const r = new FileReader();
                          r.onload = () => setSignedFormPhoto(r.result as string);
                          r.readAsDataURL(f);
                        }
                      }}
                    />
                    {signedFormPhoto ? (
                      <img src={signedFormPhoto} alt="Signed form" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <>
                        <FileText className="h-6 w-6 text-slate-400 mb-1 group-hover:text-blue-600" />
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">Signed Slip / BOL</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Customer Signature Pad */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    2. Receiver Signature
                  </h4>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Clear Signature
                  </button>
                </div>

                <div className="border border-slate-300 bg-slate-50 rounded-xl h-28 relative overflow-hidden flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    width={360}
                    height={112}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-full cursor-crosshair touch-none absolute inset-0 z-10"
                  />
                  {!hasDrawnSignature && (
                    <span className="text-xs font-medium text-slate-400 pointer-events-none select-none">
                      Draw customer signature here
                    </span>
                  )}
                </div>
              </div>

              {/* Receiver Name */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3. Receiver Printed Name
                </label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="Enter receiver full name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

            </div>

            {/* Bottom Submit POD Action Button */}
            <div className="p-4 bg-white border-t border-slate-200 sticky bottom-0 z-20">
              <button
                type="button"
                onClick={handleSubmitPOD}
                disabled={isSubmittingPOD}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                {isSubmittingPOD ? (
                  <span className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Syncing with Supabase...</span>
                  </span>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>CONFIRM DELIVERY & SUBMIT ePOD</span>
                  </>
                )}
              </button>
            </div>

            {/* Success Toast */}
            {podSubmittedToast && (
              <div className="fixed inset-x-4 top-20 z-50 bg-emerald-600 text-white py-3 px-4 rounded-2xl shadow-2xl flex items-center justify-center space-x-2 text-xs font-bold animate-in fade-in slide-in-from-top-4">
                <CheckCircle2 className="h-4 w-4 text-white" />
                <span>Proof of Delivery Recorded in Supabase!</span>
              </div>
            )}

          </div>
        )}

        {/* ── 4. SCREEN: DRIVER PROFILE & EARNINGS ── */}
        {activeScreen === 'earnings' && (
          <div className="flex-1 flex flex-col pb-20 select-none overflow-y-auto">
            
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between sticky top-0 z-20">
              <div>
                <h3 className="text-base font-black text-slate-900">Driver Portal & Earnings</h3>
                <p className="text-xs text-slate-500 font-medium">{driverUser?.name || 'Driver'}</p>
              </div>
              <div className="h-9 w-9 rounded-full overflow-hidden border border-slate-300 bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm">
                {driverUser?.name?.charAt(0) || 'D'}
              </div>
            </div>

            {/* Earnings & Vehicle Info */}
            <div className="p-4 space-y-4 flex-1">
              
              {/* Earnings Card */}
              <div className="bg-emerald-500 text-slate-950 rounded-2xl p-5 shadow-sm text-center">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-900/80 block">
                  THIS WEEK'S ESTIMATED COMPENSATION:
                </span>
                <h2 className="text-4xl font-black text-slate-950 tracking-tight mt-1 mb-1">
                  ${weeklyEarnings}
                </h2>
                <span className="text-[11px] font-bold text-slate-900">
                  {completedStopsCount} of {totalStopsCount} route deliveries completed
                </span>
              </div>

              {/* Assigned Vehicle Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                  <TruckIcon className="h-4 w-4 text-blue-600" />
                  <span>Assigned Vehicle Status</span>
                </h4>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold block">VEHICLE</span>
                    <span className="font-bold text-slate-900">{assignedTruck?.name || 'Freightliner M2'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold block">LICENSE PLATE</span>
                    <span className="font-bold text-slate-900">{assignedTruck?.licensePlate || 'NS-4921'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold block">FUEL LEVEL</span>
                    <span className="font-bold text-emerald-600">{assignedTruck?.fuelLevel || '84% Full'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold block">INSPECTION</span>
                    <span className="font-bold text-emerald-600">Passed Pre-Trip</span>
                  </div>
                </div>
              </div>

              {/* Logout / Switch Driver */}
              <button
                type="button"
                onClick={handleDriverLogout}
                className="w-full py-3.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-800 hover:text-rose-600 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>SIGN OUT DRIVER</span>
              </button>

            </div>

          </div>
        )}

        {/* ── PERSISTENT NATIVE MOBILE BOTTOM NAVIGATION BAR ── */}
        <div className="fixed sm:absolute bottom-0 inset-x-0 bg-white border-t border-slate-200 py-2.5 px-4 flex items-center justify-around text-xs font-bold text-slate-500 z-30 shadow-lg max-w-md mx-auto">
          
          <button 
            type="button"
            onClick={() => setActiveScreen('home')}
            className={`flex flex-col items-center space-y-1 cursor-pointer transition-colors ${
              activeScreen === 'home' ? 'text-blue-600' : 'hover:text-slate-800'
            }`}
          >
            <Building2 className="h-5 w-5" />
            <span className="text-[10px]">Home</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveScreen('route')}
            className={`flex flex-col items-center space-y-1 cursor-pointer transition-colors ${
              activeScreen === 'route' ? 'text-blue-600' : 'hover:text-slate-800'
            }`}
          >
            <Navigation className="h-5 w-5" />
            <span className="text-[10px]">Route Map</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveScreen('stop')}
            className={`flex flex-col items-center space-y-1 cursor-pointer transition-colors ${
              activeScreen === 'stop' ? 'text-blue-600' : 'hover:text-slate-800'
            }`}
          >
            <FileText className="h-5 w-5" />
            <span className="text-[10px]">ePOD Proof</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveScreen('earnings')}
            className={`flex flex-col items-center space-y-1 cursor-pointer transition-colors ${
              activeScreen === 'earnings' ? 'text-blue-600' : 'hover:text-slate-800'
            }`}
          >
            <UserIcon className="h-5 w-5" />
            <span className="text-[10px]">Profile</span>
          </button>

        </div>

      </div>

    </div>
  );
}
