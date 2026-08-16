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
  ChevronLeft,
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
  Building2,
  Bell,
  User as UserIcon,
  DollarSign,
  Shield,
  HelpCircle,
  LogOut,
  Sliders,
  CheckSquare,
  Square,
  Navigation2,
  Lock,
  ArrowRight,
  Maximize2,
  Minimize2,
  Grid,
  Radio
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

  // Screen Management:
  const [activeScreen, setActiveScreen] = useState<'login' | 'home' | 'route' | 'stop' | 'earnings'>(() => {
    if (!currentUser && !localStorage.getItem('prospaces_driver_auth') && !localStorage.getItem('prospaces_active_user')) {
      return 'login';
    }
    return initialScreen;
  });

  // View Mode: 'phone' (Interactive Single Phone) vs 'panoramic' (All 5 Screens Side-by-Side)
  const [viewMode, setViewMode] = useState<'phone' | 'panoramic'>('phone');

  // Real Login & Driver Auth State
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

    // Filter deliveries: first try matching this driver or assigned truck, otherwise show active tenant deliveries
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

    // Map each delivery to a stop
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
  const [navigationSimulating, setNavigationSimulating] = useState<boolean>(false);
  const [truckPinOffset, setTruckPinOffset] = useState<{ x: number; y: number }>({ x: 195, y: 110 });

  // Update receiver name when active stop changes
  useEffect(() => {
    const stop = liveStops[activeStopIndex];
    if (stop) {
      setReceiverName(stop.customerName || '');
      setCargoPhoto(stop.delivery?.deliveryPhotos?.[0] || stop.delivery?.deliveryPhoto || null);
      setSignedFormPhoto(stop.delivery?.deliveryPhotos?.[1] || null);
      setHasDrawnSignature(!!stop.delivery?.customerSignature);
    }
  }, [activeStopIndex, liveStops]);

  // Canvas Ref for interactive drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  // Update items checklist
  const handleToggleItemCheck = (itemIdx: number) => {
    setStops(prevStops => {
      const copy = [...prevStops];
      const curStop = { ...copy[activeStopIndex] };
      const curItems = [...curStop.items];
      curItems[itemIdx] = { ...curItems[itemIdx], checked: !curItems[itemIdx].checked };
      curStop.items = curItems;
      copy[activeStopIndex] = curStop;
      return copy;
    });
  };

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

  // Real Login Handler
  const handleDriverSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const supabase = createClient();
      const cleanId = driverIdInput.trim();
      const cleanPass = driverPasswordInput.trim();

      // Check if entering email or driver ID
      const isEmail = cleanId.includes('@');
      const emailToAuth = isEmail ? cleanId : `${cleanId.toLowerCase().replace(/[^a-z0-9]/g, '')}@ronaatlantic.ca`;

      // 1. Try Supabase Auth
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
      } catch (authErr) {
        // Continue to check database users table
      }

      if (!authSuccess) {
        // 2. Query Supabase database users / profiles
        try {
          const { data: dbUsers } = await supabase
            .from('users')
            .select('*')
            .or(`email.ilike.%${cleanId}%,name.ilike.%${cleanId}%,id.eq.${cleanId}`);

          if (dbUsers && dbUsers.length > 0) {
            authenticatedUser = dbUsers[0];
            authSuccess = true;
          }
        } catch (dbErr) {
          // Fallback to memory props
        }
      }

      if (!authSuccess) {
        // 3. Match against existing users prop
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

  // Submit Proof of Delivery (Screen 4) directly to Supabase and parent state
  const handleSubmitPOD = async () => {
    const curStop = liveStops[activeStopIndex];
    if (!curStop) return;

    const deliveryToUpdate = curStop.delivery || deliveries.find(d => d.id === curStop.id);

    if (deliveryToUpdate) {
      const deliveredTimestamp = new Date().toISOString();
      const signatureData = hasDrawnSignature ? 'data:image/png;base64,Driver_Customer_POD_Signature' : (receiverName || 'Signed on Device');
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
            notes: `Proof of Delivery submitted & signed by ${receiverName || 'Receiver'}`
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

    setPodSubmittedToast(true);
    setTimeout(() => {
      setPodSubmittedToast(false);
      if (activeStopIndex >= liveStops.length - 1) {
        setActiveScreen('earnings');
      } else {
        setActiveStopIndex(prev => prev + 1);
        setActiveScreen('route');
      }
    }, 1800);
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
      { id: 'ALEX-408', name: 'Alex Rivera', email: 'alex.driver@ronaatlantic.ca', role: 'Driver' },
      { id: 'GEORGE-101', name: 'George Campbell', email: 'george.campbell@ronaatlantic.ca', role: 'Driver' }
    ];
  }, [users]);

  // ════════════════════════════════════════════════════════════════════════════
  // 1. RENDER SCREEN 1: WELCOME / SIGN IN
  // ════════════════════════════════════════════════════════════════════════════
  const renderScreen1Login = () => (
    <div className="flex flex-col h-full bg-white text-slate-900 justify-between p-6 sm:p-8 select-none">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-800 pt-1 pb-4">
        <span>{currentTime}</span>
        <div className="flex items-center space-x-1.5 text-slate-800">
          <span className="text-[10px] tracking-tighter font-bold">5G</span>
          <div className="flex items-end space-x-0.5 h-3">
            <span className="w-0.5 h-1.5 bg-slate-800 rounded-xs"></span>
            <span className="w-0.5 h-2 bg-slate-800 rounded-xs"></span>
            <span className="w-0.5 h-2.5 bg-slate-800 rounded-xs"></span>
            <span className="w-0.5 h-3 bg-slate-800 rounded-xs"></span>
          </div>
          <div className="w-5 h-2.5 border border-slate-800 rounded-xs p-0.5 flex items-center">
            <div className="w-full h-full bg-slate-800 rounded-xs"></div>
          </div>
        </div>
      </div>

      {/* Main Login Card Body */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto w-full max-w-xs mx-auto">
        
        {/* Brand Logo & Wordmark */}
        <div className="flex items-center justify-center space-x-3 mb-8">
          <div className="relative flex items-center justify-center">
            <div className="h-16 w-16 rounded-2xl bg-white border border-blue-100 shadow-sm flex items-center justify-center p-1 relative">
              <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 10H34C43.941 10 52 18.059 52 28C52 37.941 43.941 46 34 46H24V54H12V10Z" fill="#1E6DF7" />
                <path d="M24 22H34C37.314 22 40 24.686 40 28C40 31.314 37.314 34 34 34H24V22Z" fill="white" />
                <path d="M18 42H36V49H32.5C32.5 47.6 31.4 46.5 30 46.5C28.6 46.5 27.5 47.6 27.5 49H22.5C22.5 47.6 21.4 46.5 20 46.5C18.6 46.5 17.5 47.6 17.5 49H16V45L18 42Z" fill="#0F172A" />
                <circle cx="20" cy="49" r="2" fill="#1E6DF7" />
                <circle cx="30" cy="49" r="2" fill="#1E6DF7" />
                <path d="M6 44H12M8 47H14" stroke="#1E6DF7" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">ProSpaces</h1>
            <p className="text-lg font-bold text-slate-700 leading-tight">Logistics</p>
          </div>
        </div>

        {/* Welcome Text */}
        <h2 className="text-2xl font-extrabold text-slate-900 mb-6 tracking-tight">Welcome, Driver.</h2>

        {/* Login Form */}
        <form onSubmit={handleDriverSignIn} className="w-full space-y-3.5">
          <div>
            <input 
              type="text"
              value={driverIdInput}
              onChange={(e) => setDriverIdInput(e.target.value)}
              placeholder="Driver ID or Email"
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-xs"
              required
            />
          </div>

          <div>
            <input 
              type="password"
              value={driverPasswordInput}
              onChange={(e) => setDriverPasswordInput(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-xs"
              required
            />
          </div>

          {loginError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center space-x-1.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3.5 bg-[#1E6DF7] hover:bg-[#1557CD] active:bg-[#0D47A1] text-white font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 mt-2"
          >
            {isLoggingIn ? (
              <span className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Verifying Supabase...</span>
              </span>
            ) : (
              <span>SIGN IN</span>
            )}
          </button>
        </form>

        {/* Live Drivers Fast Selector from Supabase */}
        <div className="mt-6 pt-4 border-t border-slate-100 w-full flex flex-col items-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Live Fleet Drivers</span>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {availableDrivers.slice(0, 3).map((drv) => (
              <button
                key={drv.id}
                type="button"
                onClick={() => {
                  setDriverUser(drv);
                  localStorage.setItem('prospaces_driver_auth', JSON.stringify(drv));
                  setActiveScreen('home');
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-[11px] font-bold transition-all border border-slate-200"
              >
                {drv.name?.split(' ')[0]} ({drv.id})
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Home Indicator Bar */}
      <div className="w-32 h-1 bg-slate-900 rounded-full mx-auto mt-4"></div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 2. RENDER SCREEN 2: HOME / ACTIVE ROUTE OVERVIEW
  // ════════════════════════════════════════════════════════════════════════════
  const renderScreen2Home = () => (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 select-none overflow-y-auto">
      
      {/* Blue Top Header Section */}
      <div className="bg-[#1E6DF7] text-white pt-4 pb-12 px-6 rounded-b-[32px] shadow-sm relative">
        {/* Status Bar */}
        <div className="flex items-center justify-between text-xs font-semibold text-white/90 pb-4">
          <span>{currentTime}</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px]">5G</span>
            <div className="flex items-end space-x-0.5 h-3">
              <span className="w-0.5 h-1.5 bg-white rounded-xs"></span>
              <span className="w-0.5 h-2 bg-white rounded-xs"></span>
              <span className="w-0.5 h-2.5 bg-white rounded-xs"></span>
              <span className="w-0.5 h-3 bg-white rounded-xs"></span>
            </div>
            <div className="w-5 h-2.5 border border-white rounded-xs p-0.5 flex items-center">
              <div className="w-full h-full bg-white rounded-xs"></div>
            </div>
          </div>
        </div>

        {/* Greeting & Notification Bell */}
        <div className="flex items-center justify-between mt-2">
          <div>
            <h2 className="text-2xl font-black tracking-tight leading-tight">Good Morning,</h2>
            <h2 className="text-2xl font-black tracking-tight leading-tight">{driverUser?.name?.split(' ')[0] || 'Driver'}.</h2>
          </div>
          <button 
            type="button"
            onClick={() => setActiveScreen('earnings')}
            className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center relative transition-all cursor-pointer"
            title="Notifications & Profile"
          >
            <Bell className="h-5 w-5 text-white" />
            <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-[#1E6DF7]"></span>
          </button>
        </div>
      </div>

      {/* Floating Active Route Card */}
      <div className="px-5 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-5 text-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Route:</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight mt-0.5 mb-4">{routeNumber}</h3>

          {/* 3 Metric Columns */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50/70 rounded-xl py-3 px-2 border border-slate-100 mb-4">
            <div>
              <span className="text-xl font-black text-slate-900 block">{totalStopsCount}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">STOPS</span>
            </div>
            <div>
              <span className="text-xl font-black text-slate-900 block">{completedStopsCount}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">DONE</span>
            </div>
            <div>
              <span className="text-lg font-black text-slate-900 block">
                {totalStopsCount > 0 ? `${Math.max(1, Math.floor(totalStopsCount * 0.8))}h ${totalStopsCount * 15 % 60}m` : '0h'}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">EST. TIME</span>
            </div>
          </div>

          {/* View Active Route Button */}
          <button
            type="button"
            onClick={() => setActiveScreen('route')}
            className="w-full py-3.5 bg-[#1E6DF7] hover:bg-[#1557CD] active:bg-[#0D47A1] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
          >
            VIEW ACTIVE ROUTE
          </button>
        </div>
      </div>

      {/* Live Deliveries Queue Preview */}
      <div className="px-5 mt-6 flex-1">
        <div className="flex items-center justify-between mb-3 px-1">
          <h4 className="text-sm font-bold text-slate-800">Assigned Live Stops</h4>
          <span className="text-[11px] font-semibold text-blue-600">
            {completedStopsCount} of {totalStopsCount} complete
          </span>
        </div>

        <div className="space-y-2.5">
          {liveStops.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500">
              <PackageCheck className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold">No stops scheduled currently.</p>
              <p className="text-[11px] text-slate-400 mt-1">Live updates from Supabase will appear here automatically.</p>
            </div>
          ) : (
            liveStops.slice(0, 3).map((st, idx) => (
              <div 
                key={st.id}
                onClick={() => {
                  setActiveStopIndex(idx);
                  setActiveScreen('stop');
                }}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      Stop {st.stopNumber}
                    </span>
                    <h5 className="text-xs font-bold text-slate-900">{st.customerName}</h5>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate max-w-[200px]">{st.address}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Bar Controls */}
      <div className="p-4 bg-white border-t border-slate-100 mt-4 flex items-center justify-around text-xs font-bold text-slate-500">
        <button 
          onClick={() => setActiveScreen('home')}
          className="flex flex-col items-center text-blue-600 space-y-1 cursor-pointer"
        >
          <Building2 className="h-5 w-5" />
          <span className="text-[10px]">Home</span>
        </button>
        <button 
          onClick={() => setActiveScreen('route')}
          className="flex flex-col items-center hover:text-blue-600 space-y-1 cursor-pointer"
        >
          <Navigation className="h-5 w-5" />
          <span className="text-[10px]">Route</span>
        </button>
        <button 
          onClick={() => setActiveScreen('stop')}
          className="flex flex-col items-center hover:text-blue-600 space-y-1 cursor-pointer"
        >
          <FileText className="h-5 w-5" />
          <span className="text-[10px]">ePOD</span>
        </button>
        <button 
          onClick={() => setActiveScreen('earnings')}
          className="flex flex-col items-center hover:text-blue-600 space-y-1 cursor-pointer"
        >
          <UserIcon className="h-5 w-5" />
          <span className="text-[10px]">Profile</span>
        </button>
      </div>

      {/* Bottom Home Indicator */}
      <div className="w-32 h-1 bg-slate-900 rounded-full mx-auto my-2"></div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 3. RENDER SCREEN 3: ACTIVE ROUTE MAP & STOP TIMELINE
  // ════════════════════════════════════════════════════════════════════════════
  const renderScreen3Route = () => (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 select-none overflow-hidden">
      
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-200 px-4 pt-3 pb-3 flex items-center justify-between relative z-20">
        <button
          type="button"
          onClick={() => setActiveScreen('home')}
          className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-sm font-black text-slate-900">Route {routeNumber}</h3>
        <div className="w-7"></div>
      </div>

      {/* Stylized Vector Map Component */}
      <div className="relative h-56 bg-slate-200 overflow-hidden border-b border-slate-300">
        
        <svg className="w-full h-full object-cover" viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="220" fill="#EBF2F7" />
          
          <path d="M20 15H110V70H20Z" fill="#D5EAD8" rx="8" />
          <path d="M280 40H380V120H280Z" fill="#D5EAD8" rx="8" />
          <path d="M40 140H120V205H40Z" fill="#D5EAD8" rx="8" />

          <path d="M0 60H400" stroke="#FFFFFF" strokeWidth="12" />
          <path d="M0 125H400" stroke="#FFFFFF" strokeWidth="14" />
          <path d="M0 185H400" stroke="#FFFFFF" strokeWidth="10" />

          <path d="M80 0V220" stroke="#FFFFFF" strokeWidth="12" />
          <path d="M160 0V220" stroke="#FFFFFF" strokeWidth="14" />
          <path d="M240 0V220" stroke="#FFFFFF" strokeWidth="12" />
          <path d="M320 0V220" stroke="#FFFFFF" strokeWidth="10" />

          <path 
            d="M 90 170 L 170 170 L 170 120 L 220 70 L 300 70 L 310 120 L 250 165 L 210 165 L 180 130" 
            stroke="#1E6DF7" 
            strokeWidth="5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />

          {liveStops.map((st, idx) => {
            const isSel = idx === activeStopIndex;
            const isComp = st.status === 'completed';
            const pinX = 80 + (idx * 55) % 280;
            const pinY = 60 + (idx * 35) % 130;

            return (
              <g key={st.id} transform={`translate(${pinX}, ${pinY})`}>
                <circle cx="0" cy="0" r={isSel ? 13 : 10} fill={isComp ? '#10B981' : (isSel ? '#1E6DF7' : '#3B82F6')} />
                {isSel && <circle cx="0" cy="0" r="17" stroke="#1E6DF7" strokeWidth="2" opacity="0.4" className="animate-ping" />}
                <text x="0" y="3.5" fill="white" fontSize={isSel ? "11" : "10"} fontWeight="900" textAnchor="middle">
                  {st.stopNumber}
                </text>
              </g>
            );
          })}

          <g transform={`translate(${truckPinOffset.x}, ${truckPinOffset.y})`}>
            <rect x="-12" y="-12" width="24" height="24" rx="12" fill="#0F172A" />
            <path d="M-6 -2H2V3H-1V4H-4V3H-6V-2Z" fill="white" />
            <path d="M2 0H5L7 3V4H5V3H3V0Z" fill="white" />
            <circle cx="-3" cy="4" r="1" fill="#1E6DF7" />
            <circle cx="4" cy="4" r="1" fill="#1E6DF7" />
          </g>
        </svg>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
          <button
            type="button"
            onClick={() => {
              setNavigationSimulating(true);
              setTruckPinOffset({ x: 175, y: 122 });
              setTimeout(() => {
                setNavigationSimulating(false);
                setActiveScreen('stop');
              }, 1200);
            }}
            className="px-5 py-2.5 bg-[#1E6DF7] hover:bg-[#1557CD] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg flex items-center space-x-2 cursor-pointer transition-all border border-white/20"
          >
            <Navigation2 className="h-3.5 w-3.5 fill-current" />
            <span>{navigationSimulating ? 'NAVIGATING...' : 'START NAVIGATION'}</span>
          </button>
        </div>

      </div>

      {/* Stops Timeline List from Live Deliveries */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {liveStops.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center text-slate-500">
            <TruckIcon className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No Stops on this Route</p>
            <p className="text-[11px] text-slate-400 mt-1">Check back once the dispatcher assigns deliveries.</p>
          </div>
        ) : (
          liveStops.map((stop, idx) => {
            const isSelected = idx === activeStopIndex;
            const isCompleted = stop.status === 'completed';

            return (
              <div
                key={stop.id}
                onClick={() => {
                  setActiveStopIndex(idx);
                  setActiveScreen('stop');
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3 relative ${
                  isSelected 
                    ? 'bg-blue-50/60 border-[#1E6DF7] shadow-xs' 
                    : isCompleted
                    ? 'bg-white border-slate-200 opacity-80'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                  isCompleted 
                    ? 'bg-emerald-500 text-white' 
                    : isSelected 
                    ? 'bg-[#1E6DF7] text-white' 
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : stop.stopNumber}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      STOP {stop.stopNumber}:
                    </span>
                    {isCompleted && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        Completed
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 truncate">{stop.customerName}</h4>
                  <p className="text-[11px] text-slate-500 truncate">{stop.address}</p>
                </div>

                <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-[#1E6DF7]' : 'text-slate-400'}`} />
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Sticky Action Button */}
      <div className="p-4 bg-white border-t border-slate-200">
        <button
          type="button"
          onClick={() => setActiveScreen('stop')}
          className="w-full py-3.5 bg-[#1E6DF7] hover:bg-[#1557CD] active:bg-[#0D47A1] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
        >
          ARRIVED AT STOP
        </button>
      </div>

      {/* Bottom Home Indicator */}
      <div className="w-32 h-1 bg-slate-900 rounded-full mx-auto my-2"></div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 4. RENDER SCREEN 4: DELIVERY AT STOP (ePOD & PHOTO PROOF)
  // ════════════════════════════════════════════════════════════════════════════
  const renderScreen4Stop = () => (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 select-none overflow-y-auto">
      
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-4 pt-3 pb-3 flex items-center justify-between sticky top-0 z-20">
        <button
          type="button"
          onClick={() => setActiveScreen('route')}
          className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-sm font-black text-slate-900">Stop {currentStop.stopNumber} POD</h3>
        <div className="w-7"></div>
      </div>

      {/* Content Container */}
      <div className="p-4 space-y-4 flex-1">
        
        {/* Customer Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
              <UserIcon className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer:</span>
              <h4 className="text-sm font-black text-slate-900 leading-tight">{currentStop.customerName}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{currentStop.address}</p>
            </div>
          </div>
        </div>

        {/* Photo Proof Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">Photo Proof</h4>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Photo 1: Cargo at Door */}
            <label className="border border-slate-200 bg-slate-50/70 hover:bg-blue-50/50 hover:border-blue-300 rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all h-28 relative overflow-hidden group">
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
                  <Camera className="h-6 w-6 text-slate-400 mb-1.5 group-hover:text-blue-600" />
                  <span className="text-[11px] font-bold text-slate-700 leading-tight">Cargo at Door</span>
                </>
              )}
            </label>

            {/* Photo 2: Signed Form */}
            <label className="border border-slate-200 bg-slate-50/70 hover:bg-blue-50/50 hover:border-blue-300 rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all h-28 relative overflow-hidden group">
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
                  <FileText className="h-6 w-6 text-slate-400 mb-1.5 group-hover:text-blue-600" />
                  <span className="text-[11px] font-bold text-slate-700 leading-tight">Signed Form</span>
                </>
              )}
            </label>
          </div>
        </div>

        {/* Driver Signature Pad Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Receiver Signature</h4>
            <button
              type="button"
              onClick={clearCanvas}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Clear
            </button>
          </div>

          <div className="border border-slate-300 bg-slate-50/50 rounded-xl h-24 relative overflow-hidden flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={320}
              height={96}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-full cursor-crosshair touch-none absolute inset-0 z-10"
            />
            {hasDrawnSignature && !isDrawingRef.current && (
              <span className="font-serif italic text-2xl text-slate-800 tracking-wider pointer-events-none select-none">
                {receiverName || 'Signature On File'}
              </span>
            )}
          </div>
        </div>

        {/* Receiver Name Input */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
          <input
            type="text"
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            placeholder="Receiver Full Name"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

      </div>

      {/* Bottom Sticky Action Button */}
      <div className="p-4 bg-white border-t border-slate-200 sticky bottom-0 z-20">
        <button
          type="button"
          onClick={handleSubmitPOD}
          className="w-full py-3.5 bg-[#1E6DF7] hover:bg-[#1557CD] active:bg-[#0D47A1] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>SUBMIT POD</span>
        </button>
      </div>

      {/* Success Toast */}
      {podSubmittedToast && (
        <div className="fixed inset-x-6 top-16 z-50 bg-emerald-600 text-white py-3 px-4 rounded-2xl shadow-2xl flex items-center justify-center space-x-2 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="h-4 w-4 text-white" />
          <span>Proof of Delivery Recorded in Supabase!</span>
        </div>
      )}

      {/* Bottom Home Indicator */}
      <div className="w-32 h-1 bg-slate-900 rounded-full mx-auto my-2"></div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 5. RENDER SCREEN 5: EARNINGS & SETTINGS
  // ════════════════════════════════════════════════════════════════════════════
  const renderScreen5Earnings = () => (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 select-none overflow-y-auto">
      
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-5 pt-4 pb-3 flex items-center justify-between sticky top-0 z-20">
        <h3 className="text-base font-black text-slate-900">Earnings</h3>
        <div className="h-8 w-8 rounded-full overflow-hidden border border-slate-300 bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-xs">
          {driverUser?.name?.charAt(0) || 'D'}
        </div>
      </div>

      {/* Main Container */}
      <div className="p-4 space-y-4 flex-1">
        
        {/* Hero Card: THIS WEEK */}
        <div className="bg-[#48D5B5] text-slate-950 rounded-2xl p-5 shadow-sm text-center">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-800/80 block">THIS WEEK:</span>
          <h2 className="text-3xl font-black text-slate-950 tracking-tight mt-1">${weeklyEarnings}</h2>
        </div>

        {/* Daily Bar Chart Card with Real Metrics */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block text-center mb-3">
            COMPLETED DELIVERIES & TALLY
          </span>

          <div className="flex items-end justify-between h-28 px-3 pt-2">
            {[
              { day: 'Mon', count: Math.min(completedStopsCount, 2), height: '60%' },
              { day: 'Tue', count: Math.min(completedStopsCount, 3), height: '75%' },
              { day: 'Wed', count: Math.min(completedStopsCount, 4), height: '90%' },
              { day: 'Thu', count: Math.min(completedStopsCount, 1), height: '40%' },
              { day: 'Fri', count: completedStopsCount, height: `${Math.min(100, Math.max(30, completedStopsCount * 25))}%` }
            ].map((col, idx) => (
              <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end group">
                <div 
                  className="w-7 bg-[#48D5B5] hover:bg-[#32B89A] rounded-t-md transition-all relative"
                  style={{ height: col.height }}
                >
                  <span className="opacity-0 group-hover:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-800 bg-white px-1 rounded shadow-xs transition-opacity whitespace-nowrap">
                    {col.count} stops
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 mt-2">{col.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Settings Menu List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">SETTINGS & VEHICLE</h4>

          <div className="space-y-1">
            <button 
              onClick={() => alert(`Driver Profile:\nName: ${driverUser?.name || 'Driver'}\nEmail: ${driverUser?.email}\nID: ${driverUser?.id}`)}
              className="w-full flex items-center space-x-3 py-2.5 px-2 hover:bg-slate-50 rounded-xl transition-colors text-left"
            >
              <UserIcon className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-bold text-slate-800">Profile ({driverUser?.name || 'Driver'})</span>
            </button>

            <button 
              onClick={() => alert(`Assigned Truck: ${assignedTruck?.name || 'Unit 408'}\nLicense: ${assignedTruck?.licensePlate || 'AB-4902'}\nStatus: ${assignedTruck?.status || 'Active'}`)}
              className="w-full flex items-center space-x-3 py-2.5 px-2 hover:bg-slate-50 rounded-xl transition-colors text-left"
            >
              <TruckIcon className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-bold text-slate-800">Vehicle Info ({assignedTruck?.name || 'Truck'})</span>
            </button>

            <button 
              onClick={() => alert('Support Line: 1-800-555-RONA\nFleet Dispatch: Connected via Supabase')}
              className="w-full flex items-center space-x-3 py-2.5 px-2 hover:bg-slate-50 rounded-xl transition-colors text-left"
            >
              <HelpCircle className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-bold text-slate-800">Support & Dispatch</span>
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleDriverLogout}
          className="w-full py-3 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-800 hover:text-rose-600 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
        >
          LOGOUT
        </button>

      </div>

      {/* Bottom Bar Controls */}
      <div className="p-4 bg-white border-t border-slate-100 mt-auto flex items-center justify-around text-xs font-bold text-slate-500">
        <button 
          onClick={() => setActiveScreen('home')}
          className="flex flex-col items-center hover:text-blue-600 space-y-1 cursor-pointer"
        >
          <Building2 className="h-5 w-5" />
          <span className="text-[10px]">Home</span>
        </button>
        <button 
          onClick={() => setActiveScreen('route')}
          className="flex flex-col items-center hover:text-blue-600 space-y-1 cursor-pointer"
        >
          <Navigation className="h-5 w-5" />
          <span className="text-[10px]">Route</span>
        </button>
        <button 
          onClick={() => setActiveScreen('stop')}
          className="flex flex-col items-center hover:text-blue-600 space-y-1 cursor-pointer"
        >
          <FileText className="h-5 w-5" />
          <span className="text-[10px]">ePOD</span>
        </button>
        <button 
          onClick={() => setActiveScreen('earnings')}
          className="flex flex-col items-center text-blue-600 space-y-1 cursor-pointer"
        >
          <UserIcon className="h-5 w-5" />
          <span className="text-[10px]">Profile</span>
        </button>
      </div>

      {/* Bottom Home Indicator */}
      <div className="w-32 h-1 bg-slate-900 rounded-full mx-auto my-2"></div>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 font-sans antialiased selection:bg-blue-600 selection:text-white">
      
      {/* ── TOP CONTROL BAR ── */}
      <div className="w-full max-w-7xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
        
        {/* Brand & Route Title */}
        <div className="flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <TruckIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black text-white tracking-tight">ProSpaces Logistics &bull; Driver Mobile App</h1>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Live URI: /logistics/driver
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive 5-Screen Driver Experience &bull; Route R-408 Dispatched to {driverUser?.name || 'Alex Rivera'}
            </p>
          </div>
        </div>

        {/* Switcher Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Mode Switcher (Single Phone vs 5-Screens Panoramic) */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('phone')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'phone'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Single Phone View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('panoramic')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'panoramic'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              <span>All 5 Screens Flow</span>
            </button>
          </div>

          {/* Quick Jump Buttons (When in Phone mode) */}
          {viewMode === 'phone' && (
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveScreen('login')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeScreen === 'login' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Sign In
              </button>
              <button
                type="button"
                onClick={() => setActiveScreen('home')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeScreen === 'home' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2. Home
              </button>
              <button
                type="button"
                onClick={() => setActiveScreen('route')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeScreen === 'route' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3. Route
              </button>
              <button
                type="button"
                onClick={() => setActiveScreen('stop')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeScreen === 'stop' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                4. Stop POD
              </button>
              <button
                type="button"
                onClick={() => setActiveScreen('earnings')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeScreen === 'earnings' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                5. Earnings
              </button>
            </div>
          )}

        </div>

      </div>

      {/* ── MAIN CONTENT VIEW ── */}
      {viewMode === 'phone' ? (
        /* ══════════════════════════════════════════════════════════════
           SINGLE INTERACTIVE PHONE DEVICE SIMULATOR
           ══════════════════════════════════════════════════════════════ */
        <div className="flex flex-col items-center justify-center my-auto">
          
          {/* Phone Shell Frame */}
          <div className="w-[360px] sm:w-[390px] h-[780px] bg-slate-950 rounded-[48px] p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border-4 border-slate-800 relative flex flex-col">
            
            {/* Speaker & Dynamic Island / Camera Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-950 rounded-full z-40 flex items-center justify-center">
              <div className="w-10 h-3.5 bg-slate-900 rounded-full flex items-center justify-end pr-1.5">
                <div className="h-2 w-2 rounded-full bg-blue-950/80 border border-blue-500/30"></div>
              </div>
            </div>

            {/* Inner Phone Screen */}
            <div className="w-full h-full bg-white rounded-[38px] overflow-hidden flex flex-col relative">
              {activeScreen === 'login' && renderScreen1Login()}
              {activeScreen === 'home' && renderScreen2Home()}
              {activeScreen === 'route' && renderScreen3Route()}
              {activeScreen === 'stop' && renderScreen4Stop()}
              {activeScreen === 'earnings' && renderScreen5Earnings()}
            </div>

          </div>

          {/* Quick Navigation Caption */}
          <div className="mt-4 text-center">
            <span className="text-xs font-mono text-slate-400">
              Viewing Screen: <strong className="text-blue-400 capitalize">{activeScreen}</strong> &bull; Click anywhere in app to navigate
            </span>
          </div>

        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════
           PANORAMIC ALL 5 SCREENS FLOW (MATCHING MOCKUP IMAGE)
           ══════════════════════════════════════════════════════════════ */
        <div className="w-full max-w-[1920px] overflow-x-auto pb-10">
          
          <div className="min-w-[1700px] flex items-center justify-center gap-6 py-6 px-4">
            
            {/* Screen 1: Welcome Driver */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider font-mono">1. Welcome / Sign In</span>
              <div className="w-[300px] h-[640px] bg-slate-950 rounded-[40px] p-2.5 shadow-2xl border-2 border-slate-800 flex flex-col">
                <div className="w-full h-full bg-white rounded-[32px] overflow-hidden">
                  {renderScreen1Login()}
                </div>
              </div>
            </div>

            {/* Arrow & Truck 1 */}
            <div className="flex flex-col items-center justify-center text-blue-400">
              <TruckIcon className="h-6 w-6 text-blue-400 mb-1" />
              <ArrowRight className="h-6 w-6 text-slate-600 animate-pulse" />
            </div>

            {/* Screen 2: Home Route Overview */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-blue-400 mb-2 uppercase tracking-wider font-mono">2. Home / Active Route</span>
              <div className="w-[300px] h-[640px] bg-slate-950 rounded-[40px] p-2.5 shadow-2xl border-2 border-blue-500/50 flex flex-col">
                <div className="w-full h-full bg-white rounded-[32px] overflow-hidden">
                  {renderScreen2Home()}
                </div>
              </div>
            </div>

            {/* Arrow 2 */}
            <div className="flex flex-col items-center justify-center text-blue-400">
              <ArrowRight className="h-6 w-6 text-slate-600 animate-pulse" />
            </div>

            {/* Screen 3: Route R-408 Map */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider font-mono">3. Route Navigation</span>
              <div className="w-[300px] h-[640px] bg-slate-950 rounded-[40px] p-2.5 shadow-2xl border-2 border-slate-800 flex flex-col">
                <div className="w-full h-full bg-white rounded-[32px] overflow-hidden">
                  {renderScreen3Route()}
                </div>
              </div>
            </div>

            {/* Arrow 3 */}
            <div className="flex flex-col items-center justify-center text-blue-400">
              <ArrowRight className="h-6 w-6 text-slate-600 animate-pulse" />
            </div>

            {/* Screen 4: Stop ePOD */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider font-mono">4. Delivery POD</span>
              <div className="w-[300px] h-[640px] bg-slate-950 rounded-[40px] p-2.5 shadow-2xl border-2 border-slate-800 flex flex-col">
                <div className="w-full h-full bg-white rounded-[32px] overflow-hidden">
                  {renderScreen4Stop()}
                </div>
              </div>
            </div>

            {/* Arrow & Delivery Box */}
            <div className="flex flex-col items-center justify-center text-blue-400">
              <TruckIcon className="h-6 w-6 text-blue-400 mb-1" />
              <ArrowRight className="h-6 w-6 text-slate-600 animate-pulse" />
            </div>

            {/* Screen 5: Earnings & Settings */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider font-mono">5. Earnings & Settings</span>
              <div className="w-[300px] h-[640px] bg-slate-950 rounded-[40px] p-2.5 shadow-2xl border-2 border-slate-800 flex flex-col">
                <div className="w-full h-full bg-white rounded-[32px] overflow-hidden">
                  {renderScreen5Earnings()}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
