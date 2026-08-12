import React, { useState, useEffect, useRef } from 'react';
import { DeliveryRecord, Truck, User, DeliveryStatus } from '../types';
import { Box, Bell, Navigation2, Phone, Camera, ArrowLeft, CheckCircle2, RotateCcw, AlertTriangle, Home, Map, FileText, User as UserIcon, Check } from 'lucide-react';

interface DriverMobileAppProps {
  deliveries: DeliveryRecord[];
  trucks: Truck[];
  users: User[];
  currentUser: User | null;
  onAddOrUpdateDelivery: (del: DeliveryRecord) => void;
}

export default function DriverMobileApp({ deliveries, trucks, currentUser, onAddOrUpdateDelivery }: DriverMobileAppProps) {
  // Try to find deliveries assigned to this driver/truck, or just show active ones
  const activeDeliveries = deliveries.filter(d => d.status !== DeliveryStatus.DELIVERED && d.status !== DeliveryStatus.RETURNED);
  
  // Sort them so we have a sequence
  const routeStops = activeDeliveries.slice(0, 5); // Take up to 5 for the route

  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [view, setView] = useState<'route' | 'camera' | 'signature'>('route');
  const [showSyncedAlert, setShowSyncedAlert] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const currentStop = routeStops[currentStopIndex];
  
  // Progress calc
  const progressPercent = routeStops.length > 0 ? Math.round((currentStopIndex / routeStops.length) * 100) : 0;

  useEffect(() => {
    if (view === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [view]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera access denied or unavailable", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleCompleteDelivery = () => {
    if (currentStop) {
      const updated = {
        ...currentStop,
        status: DeliveryStatus.DELIVERED,
        deliveredAt: new Date().toISOString(),
        destinationNotes: currentStop.destinationNotes + " (Signed by Mark Miller)"
      };
      onAddOrUpdateDelivery(updated);
      
      setShowSyncedAlert(true);
      setTimeout(() => setShowSyncedAlert(false), 4000);
      
      if (currentStopIndex < routeStops.length - 1) {
        setCurrentStopIndex(currentStopIndex + 1);
      }
    }
    setView('route');
  };

  return (
    <div className="bg-[#1C1C1E] text-slate-200 min-h-screen flex flex-col font-sans max-w-md mx-auto shadow-2xl overflow-hidden border-x border-slate-800">
      {/* Header */}
      <header className="px-4 pt-12 pb-4 bg-[#1C1C1E] flex items-center justify-between sticky top-0 z-10 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Box className="h-6 w-6 text-slate-300" />
          <h1 className="text-lg font-semibold text-white tracking-tight">
            <span className="font-bold">ProSpaces</span> Logistics
          </h1>
        </div>
        <div className="relative">
          <Bell className="h-5 w-5 text-slate-400" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-[#1C1C1E]"></span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4 space-y-6">
        
        {/* Status & Progress */}
        {view === 'route' && (
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 bg-emerald-900/30 border border-emerald-800/50 px-3 py-1.5 rounded-full">
              <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-emerald-400 text-xs font-medium">Online</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>Progress: {progressPercent}% ({currentStopIndex} of {routeStops.length} stops)</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
            
            {showSyncedAlert && (
              <div className="bg-amber-500/20 border border-amber-500/50 p-3 rounded-lg flex items-center justify-between animate-fade-in">
                <div className="flex items-center space-x-2 text-amber-500">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-semibold">Proof Synced for Stop #{currentStopIndex}</span>
                </div>
                <div className="flex items-center space-x-1 text-amber-500">
                  <Bell className="h-4 w-4" />
                  <span className="text-xs font-bold">3</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Views */}
        {view === 'route' && currentStop && (
          <div className="bg-[#2C2C2E] rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-xs font-bold text-slate-300 tracking-wider uppercase">STOP #{currentStopIndex + 1}: Active now</span>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1 leading-tight">{currentStop.customerName}</h2>
              <p className="text-sm text-slate-400">{currentStop.deliveryAddress}</p>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Manifest</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-slate-800 rounded flex items-center justify-center text-lg">📦</div>
                      <span className="text-sm text-slate-200">12x Drywall Sheets</span>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-900/30 text-amber-500 px-2 py-1 rounded">Awaiting Unload</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-slate-800 rounded flex items-center justify-center text-lg">🛁</div>
                      <span className="text-sm text-slate-200">Kohler Soaking Tub</span>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-900/30 text-amber-500 px-2 py-1 rounded">Awaiting Unload</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-slate-800 rounded flex items-center justify-center text-lg">🧱</div>
                      <span className="text-sm text-slate-200">Custom Building Mortar</span>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-900/30 text-amber-500 px-2 py-1 rounded">Awaiting Unload</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Site Notes</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentStop.destinationNotes || "Gate code #4091. Drop tub inside garage. Do not block driveway."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button className="py-3 px-4 rounded-xl border border-slate-600 text-slate-300 text-sm font-bold flex items-center justify-center space-x-2 hover:bg-slate-800">
                  <Navigation2 className="h-4 w-4" />
                  <span>NAVIGATE</span>
                </button>
                <button 
                  onClick={() => setView('camera')}
                  className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center justify-center space-x-2"
                >
                  <Camera className="h-4 w-4" />
                  <span>CAPTURE POD</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'camera' && (
          <div className="absolute inset-0 bg-black z-50 flex flex-col">
            <div className="p-4 pt-12 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
              <button onClick={() => setView('route')} className="p-2 text-white">
                <ArrowLeft className="h-6 w-6" />
              </button>
              <span className="text-white font-semibold">Capture Proof of Delivery</span>
              <div className="w-10"></div>
            </div>
            
            <div className="flex-1 relative bg-slate-900 flex items-center justify-center overflow-hidden">
               <video ref={videoRef} autoPlay playsInline muted className="min-w-full min-h-full object-cover opacity-80"></video>
               {!videoRef.current?.srcObject && (
                 <div className="absolute inset-0 flex items-center justify-center">
                   <div className="h-64 w-64 bg-slate-800/80 rounded flex items-center justify-center border border-slate-700">
                     <Camera className="h-12 w-12 text-slate-500" />
                   </div>
                 </div>
               )}
            </div>

            <div className="bg-black pb-10 pt-4 px-6 absolute bottom-0 w-full">
               <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-6 px-4">
                 <span>SLO-MO</span>
                 <span>VIDEO</span>
                 <span className="text-amber-500">PHOTO</span>
                 <span>PORTRAIT</span>
                 <span>PANO</span>
               </div>
               
               <div className="flex items-center justify-between mb-8">
                 <div className="h-12 w-12 bg-slate-800 rounded border border-slate-700"></div>
                 <button className="h-16 w-16 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center">
                   <div className="h-14 w-14 border-2 border-black rounded-full"></div>
                 </button>
                 <button className="h-12 w-12 bg-slate-800/50 rounded-full flex items-center justify-center text-white">
                   <RotateCcw className="h-6 w-6" />
                 </button>
               </div>
               
               <button 
                 onClick={() => setView('signature')}
                 className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold"
               >
                 COMPLETE DELIVERY & PROOF
               </button>
            </div>
          </div>
        )}

        {view === 'signature' && (
          <div className="bg-[#2C2C2E] rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg p-5 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-3">Proof of Delivery Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-slate-700 rounded flex items-center justify-center text-lg">📦</div>
                    <span className="text-sm text-slate-200">12x Drywall Sheets</span>
                  </div>
                  <Check className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-slate-700 rounded flex items-center justify-center text-lg">🛁</div>
                    <span className="text-sm text-slate-200">Kohler Soaking Tub</span>
                  </div>
                  <Check className="h-5 w-5 text-emerald-500" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-300">Customer Signature</h3>
                <div className="h-32 border border-slate-600 rounded-xl bg-[#1C1C1E] flex flex-col items-center justify-center relative overflow-hidden">
                  <span className="text-xs text-slate-500 absolute top-2 left-3">Sign below:</span>
                  <div className="font-serif text-4xl text-white transform -rotate-3 mt-4" style={{ fontFamily: "'Brush Script MT', cursive, serif" }}>Mark Miller</div>
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <p className="text-[11px] text-slate-400">Site Manager confirmation to record your customer delivery.</p>
                <p className="text-[11px] font-bold text-slate-300">GPS Timestamp: {new Date().toLocaleTimeString()}</p>
              </div>
            </div>

            <button 
              onClick={handleCompleteDelivery}
              className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold"
            >
              CONFIRM & SYNC
            </button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-[#1C1C1E] border-t border-slate-800 px-6 py-3 pb-6 flex items-center justify-between">
        <button onClick={() => setView('route')} className={`flex flex-col items-center space-y-1 ${view === 'route' ? 'text-blue-500' : 'text-slate-500'}`}>
          <Home className="h-6 w-6" />
          <span className="text-[10px] font-semibold">Home</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-slate-500 hover:text-slate-400">
          <Map className="h-6 w-6" />
          <span className="text-[10px] font-semibold">Route</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-slate-500 hover:text-slate-400">
          <FileText className="h-6 w-6" />
          <span className="text-[10px] font-semibold">Manifest</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-slate-500 hover:text-slate-400">
          <UserIcon className="h-6 w-6" />
          <span className="text-[10px] font-semibold">Profile</span>
        </button>
      </nav>
    </div>
  );
}
