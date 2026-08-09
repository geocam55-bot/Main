import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Truck, 
  RefreshCw, 
  Play, 
  ArrowRight, 
  ChevronRight, 
  Check, 
  Menu, 
  X, 
  Share2, 
  Globe, 
  ExternalLink, 
  Video, 
  MessageSquare,
  Building,
  Home,
  FileText,
  User,
  Smartphone,
  CheckCircle2,
  Lock,
  ChevronUp,
  Map,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Import local images with fallbacks
import prospacesHeroScene from '../assets/images/prospaces_hero_scene_1783169931786.jpg';
import samanthaTestimonial from '../assets/images/samantha_testimonial_1783169949359.jpg';
import prospacesLogo from '../assets/images/logo_no_border_tight_1783077241511.jpg';

const getSafeLogoSrc = (img: any) => {
  if (typeof img === 'string' && img) return img;
  if (img && typeof img === 'object' && img.default) return img.default;
  return '/logistics-logo.jpg';
};

const getSafeHeroSceneSrc = (img: any) => {
  if (typeof img === 'string' && img) return img;
  if (img && typeof img === 'object' && img.default) return img.default;
  return '/images/prospaces_hero_scene_1783169931786.jpg';
};

interface LandingPageProps {
  onStartTrial: () => void;
  onBookDemo: () => void;
  onLoginClick: () => void;
  isEmbedPreview?: boolean;
}

export default function LandingPage({ 
  onStartTrial, 
  onBookDemo, 
  onLoginClick,
  isEmbedPreview = false 
}: LandingPageProps) {
  // Mobile Nav Toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Interactive Simulation states
  const [activeTab, setActiveTab] = useState<'routes' | 'tracking' | 'pod'>('routes');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  // Live dashboard mockup state
  const [vehiclesActive, setVehiclesActive] = useState(16);
  const [onTimePercent, setOnTimePercent] = useState(90);
  const [deliveriesToday, setDeliveriesToday] = useState(45);
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<{branch: string, month: string, val: number} | null>(null);

  // Simulate pulse / live update
  useEffect(() => {
    const interval = setInterval(() => {
      // Small randomized variations to show life in the logistics module
      setVehiclesActive(prev => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        const next = prev + delta;
        return next >= 12 && next <= 20 ? next : prev;
      });
      setDeliveriesToday(prev => prev + (Math.random() > 0.7 ? 1 : 0));
      setOnTimePercent(prev => {
        const delta = Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        const next = prev + delta;
        return next >= 88 && next <= 94 ? next : prev;
      });
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const handleScrollToFeature = (tab: 'routes' | 'tracking' | 'pod') => {
    setActiveTab(tab);
    handleScrollTo('features-section');
  };

  // Video/Tour simulation steps
  const tourSteps = [
    {
      title: "1. Orders Generated at Pro Desk",
      desc: "Commercial building materials are ordered in ProSpaces CRM. The logistics module automatically syncs weight, dimensions, and customer delivery requirements.",
      icon: <Building className="h-6 w-6 text-orange-500" />,
      badge: "Sales Sync"
    },
    {
      title: "2. Warehouse Picking & Loading",
      desc: "Warehouse Pickers are assigned to stage and confirm loaded cargo. System records the physical verification to ensure correct lumber bundles go on the truck.",
      icon: <Home className="h-6 w-6 text-blue-600" />,
      badge: "Staging Guard"
    },
    {
      title: "3. Smart Routing Optimization",
      desc: "Algorithms sequence multiple stops based on truck payload capacity, bridge heights, and job site crane requirements, cutting drive times by up to 25%.",
      icon: <Map className="h-6 w-6 text-indigo-600" />,
      badge: "Route Plan"
    },
    {
      title: "4. Last-Mile Proof of Delivery",
      desc: "Drivers receive optimized turn-by-turn navigation, log site photos of the drop, and collect electronic customer signoffs that instantly report back to the Pro Desk.",
      icon: <CheckCircle2 className="h-6 w-6 text-emerald-600" />,
      badge: "Delivered & Synced"
    }
  ];

  // Heat map dummy data representing the image mockup grid
  const branchesList = ["Conshohocken", "Fleet Overview", "Wilmington DC", "Local Store"];
  const monthsList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
  const getDensityColor = (val: number) => {
    if (val > 80) return "bg-emerald-600 hover:bg-emerald-500";
    if (val > 50) return "bg-emerald-400 hover:bg-emerald-300";
    if (val > 30) return "bg-emerald-200 hover:bg-emerald-100";
    return "bg-emerald-50 hover:bg-emerald-100";
  };

  const heatmapMatrix = [
    [10, 20, 45, 80, 95, 85, 75, 90, 60, 40],
    [30, 40, 65, 90, 100, 95, 80, 95, 75, 50],
    [5, 15, 30, 50, 70, 65, 55, 60, 45, 25],
    [12, 22, 50, 75, 85, 80, 70, 85, 55, 35]
  ];

  return (
    <div className="min-h-screen bg-[#FAFBFD] text-slate-900 font-sans antialiased selection:bg-orange-500 selection:text-white" id="marketing-homepage">
      
      {/* 1. Header/Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100/80 transition-all" id="nav-container">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center space-x-3.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <img 
                src={getSafeLogoSrc(prospacesLogo)} 
                alt="ProSpaces Logo" 
                className="h-20 sm:h-24 md:h-28 w-auto object-contain mix-blend-multiply transition-all"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/logistics-logo.jpg';
                }}
              />
              <div className="flex flex-col">
                <span className="font-sans font-black text-slate-900 text-2xl sm:text-3xl tracking-tight leading-none">ProSpaces</span>
                <span className="text-orange-600 text-xs sm:text-sm font-mono uppercase tracking-wider font-extrabold mt-1">Logistics Module</span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => handleScrollTo('features-section')}
                className="text-slate-600 hover:text-slate-900 font-bold text-sm cursor-pointer transition-colors"
              >
                Features
              </button>
              <button 
                onClick={() => handleScrollToFeature('pod')}
                className="text-slate-600 hover:text-slate-900 font-bold text-sm cursor-pointer transition-colors"
              >
                Proof of Delivery
              </button>
              <button 
                onClick={() => handleScrollTo('dashboard-section')}
                className="text-slate-600 hover:text-slate-900 font-bold text-sm cursor-pointer transition-colors"
              >
                Fleet Tracking
              </button>
            </div>

            {/* Action Buttons */}
            <div className="hidden md:flex items-center space-x-3">
              <button 
                onClick={() => { 
                  if (typeof window !== 'undefined' && window.location.pathname.includes('logistics.html')) {
                    window.close();
                    setTimeout(() => { window.location.href = '/logistics.html'; }, 300);
                  } else {
                    window.location.href = '/'; 
                  }
                }}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <span>&larr;</span>
                <span>{typeof window !== 'undefined' && window.location.pathname.includes('logistics.html') ? 'Exit App' : 'ProSpaces CRM Hero'}</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b border-slate-100 overflow-hidden"
            >
              <div className="px-4 pt-2 pb-6 space-y-3">
                <button 
                  onClick={() => handleScrollTo('features-section')}
                  className="block w-full text-left px-3 py-2 text-slate-600 hover:text-slate-900 font-bold text-sm rounded-lg"
                >
                  Features
                </button>
                <button 
                  onClick={() => {
                    handleScrollToFeature('pod');
                  }}
                  className="block w-full text-left px-3 py-2 text-slate-600 hover:text-slate-900 font-bold text-sm rounded-lg"
                >
                  Proof of Delivery
                </button>
                <button 
                  onClick={() => handleScrollTo('dashboard-section')}
                  className="block w-full text-left px-3 py-2 text-slate-600 hover:text-slate-900 font-bold text-sm rounded-lg"
                >
                  Fleet Tracking
                </button>
                <div className="border-t border-slate-100 pt-3 flex flex-col space-y-2">
                  <button 
                    onClick={() => { 
                      if (typeof window !== 'undefined' && window.location.pathname.includes('logistics.html')) {
                        window.close();
                        setTimeout(() => { window.location.href = '/logistics.html'; }, 300);
                      } else {
                        window.location.href = '/'; 
                      }
                    }}
                    className="w-full py-2.5 bg-slate-100 text-slate-800 font-bold text-sm rounded-xl text-center cursor-pointer"
                  >
                    {typeof window !== 'undefined' && window.location.pathname.includes('logistics.html') ? 'Exit App' : '← Return to ProSpaces CRM Hero'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-16 sm:pb-24 lg:pt-16" id="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
            
            {/* Left Content Column */}
            <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left space-y-6">
              <div className="inline-flex items-center space-x-2 bg-orange-50 border border-orange-100 px-3.5 py-1.5 rounded-full text-orange-700 text-xs font-semibold tracking-wide">
                <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                <span>Exclusively for Lumber & Building Material Yards</span>
              </div>
              
              <h1 className="font-sans font-black text-slate-900 tracking-tight leading-none text-4xl sm:text-5xl lg:text-5xl xl:text-6xl">
                From Pro Desk <br className="hidden sm:inline" />
                to Front Door: <br />
                <span className="text-[#FF5A1F]">Streamline Your Lumber & Building Material Delivery.</span>
              </h1>
              
              <p className="text-slate-500 text-base sm:text-lg lg:text-lg leading-relaxed max-w-xl">
                The only logistics system built exclusively for home improvement centers and commercial supply yards.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button 
                  onClick={onLoginClick}
                  className="w-full sm:w-auto px-8 py-4 bg-[#FF5A1F] hover:bg-[#E54B13] text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center space-x-2 cursor-pointer group"
                >
                  <span>Enter Logistic Workspace</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Right Graphics Column - Beautiful device mockup composited from generated image and UI mockups */}
            <div className="mt-12 sm:mt-16 lg:mt-0 lg:col-span-6 relative flex justify-center">
              <div className="relative w-full max-w-lg lg:max-w-xl animate-fade-in">
                
                {/* Background ambient radial blob */}
                <div className="absolute -top-12 -left-12 h-72 w-72 bg-orange-100 rounded-full blur-3xl opacity-60 z-0" />
                <div className="absolute -bottom-12 -right-12 h-72 w-72 bg-blue-100 rounded-full blur-3xl opacity-60 z-0" />

                {/* Primary Mac/Desktop Monitor Mockup Frame */}
                <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 hover:shadow-3xl transition-shadow duration-300">
                  
                  {/* Mock browser header */}
                  <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-center space-x-2">
                    <div className="flex space-x-1.5">
                      <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
                      <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                      <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                    </div>
                    <div className="bg-white text-slate-400 text-[10px] font-mono px-4 py-1 rounded-md border border-slate-100 flex-1 text-center truncate select-none">
                      https://app.prospaces.com/logistics-module/map-view
                    </div>
                  </div>

                  {/* Browser Content: Live GPS Fleet Tracking Map View inside Computer Screen */}
                  <div className="relative aspect-[16/10] overflow-hidden group">
                    <img 
                      src="/images/logistics_map_screen.jpg" 
                      alt="ProSpaces Logistics Live GPS Fleet Map View" 
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = getSafeHeroSceneSrc(prospacesHeroScene);
                      }}
                    />
                    
                    {/* Dark gradient overlay at the bottom */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    
                    {/* Live Tracking overlay card simulating real application */}
                    <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-lg border border-white max-w-xs animate-pulse">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                          <Truck className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono font-bold block leading-none">ACTIVE DELIVERIES</span>
                          <span className="text-slate-800 font-sans font-black text-xs leading-tight">Ticket #7712 - En Route</span>
                        </div>
                      </div>
                      <div className="mt-2 text-[10px] text-slate-600 font-medium">
                        Bundled SPF studs, CDX plywood. Est. Arrival: <strong className="text-slate-900 font-semibold">10:45 AM</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overlapping iPad/Tablet Mockup showing driver app overlay */}
                <div className="absolute -bottom-8 -right-4 sm:-right-8 bg-slate-900 rounded-3xl p-2.5 shadow-2xl border border-slate-800 max-w-[210px] sm:max-w-[240px] z-20 hover:-translate-y-1 transition-transform duration-300">
                  <div className="relative bg-white rounded-2xl aspect-[3/4] overflow-hidden flex flex-col">
                    
                    {/* Phone/Tablet status bar */}
                    <div className="bg-slate-50 px-3 py-1 flex items-center justify-between border-b border-slate-100 text-[9px] font-mono font-bold text-slate-500 select-none">
                      <span>9:41 AM</span>
                      <div className="flex items-center space-x-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <span>GPS LIVE</span>
                      </div>
                    </div>

                    {/* App Header */}
                    <div className="bg-blue-900 text-white p-3">
                      <div className="text-[8px] opacity-75 font-mono uppercase font-black tracking-wider leading-none">DRIVER CO-PILOT</div>
                      <div className="font-sans font-bold text-[11px] leading-tight mt-0.5">Route Stop #3 of 5</div>
                    </div>

                    {/* Stop Details */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                      <div className="space-y-2">
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-left">
                          <span className="text-[8px] text-slate-400 font-mono font-bold block uppercase">JOB SITE ADDRESS</span>
                          <span className="text-slate-800 font-bold text-[10px] block leading-tight mt-0.5">Conshohocken Drywall LLC</span>
                          <span className="text-slate-500 text-[9px] block">1042 Lumberyard Lane</span>
                        </div>

                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-2.5 text-left">
                          <span className="text-[8px] text-blue-600 font-mono font-bold block uppercase">CARGO LIST</span>
                          <span className="text-slate-700 font-medium text-[9px] block leading-snug mt-0.5">
                            &bull; 10x bundles SPF 2x4 16'
                          </span>
                          <span className="text-slate-700 font-medium text-[9px] block leading-snug">
                            &bull; 4x packs 1/2" Gypsum Board
                          </span>
                        </div>
                      </div>

                      {/* Complete Proof of Delivery Action */}
                      <button 
                        onClick={onStartTrial}
                        className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer text-center leading-none"
                      >
                        Confirm Proof of Delivery
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. "Trusted By" Association Bar */}
      <section className="bg-slate-50 border-y border-slate-100 py-10" id="trusted-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[11px] font-mono uppercase tracking-widest text-slate-400 font-extrabold mb-6 select-none">
            BUILT BY THE PROSPACES CRM TEAM FOR
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 items-center justify-items-center">
            
            {/* Item 1 */}
            <div className="flex items-center space-x-3 text-slate-600 hover:text-slate-900 transition-colors select-none font-bold text-xs uppercase font-mono group">
              <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-xs group-hover:border-slate-200 transition-colors">
                <Home className="h-5 w-5 text-[#FF5A1F] transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold tracking-tight leading-tight">Home Improvement</span>
                <span className="text-slate-400 text-[10px] leading-tight">Centers</span>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex items-center space-x-3 text-slate-600 hover:text-slate-900 transition-colors select-none font-bold text-xs uppercase font-mono group">
              <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-xs group-hover:border-slate-200 transition-colors">
                <Building className="h-5 w-5 text-blue-600 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold tracking-tight leading-tight">Lumber & Building</span>
                <span className="text-slate-400 text-[10px] leading-tight">Material Dealers</span>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex items-center space-x-3 text-slate-600 hover:text-slate-900 transition-colors select-none font-bold text-xs uppercase font-mono group">
              <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-xs group-hover:border-slate-200 transition-colors">
                <User className="h-5 w-5 text-emerald-600 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold tracking-tight leading-tight">Pro Desk</span>
                <span className="text-slate-400 text-[10px] leading-tight">Sales Teams</span>
              </div>
            </div>

            {/* Item 4 */}
            <div className="flex items-center space-x-3 text-slate-600 hover:text-slate-900 transition-colors select-none font-bold text-xs uppercase font-mono group">
              <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-xs group-hover:border-slate-200 transition-colors">
                <RefreshCw className="h-5 w-5 text-purple-600 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold tracking-tight leading-tight">Multi-Location</span>
                <span className="text-slate-400 text-[10px] leading-tight">Operations</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. "Streamline Every Step, from Yard to Job Site" (Features Grid) */}
      <section className="py-20 sm:py-28" id="features-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <h2 className="font-sans font-black text-slate-900 tracking-tight text-3xl sm:text-4xl">
            Streamline Every Step, from Yard to Job Site
          </h2>
          <p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Eliminate communication gaps, manual errors, and costly delivery complaints with an all-in-one system tailormade for heavy supply logistics.
          </p>

          {/* Interactive Feature Selector Tabs to preview specific sub-actions */}
          <div className="flex items-center justify-center space-x-2 max-w-md mx-auto pt-4 pb-8">
            <button
              onClick={() => setActiveTab('routes')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'routes' 
                  ? 'bg-blue-50 text-blue-800 border border-blue-200' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Route Builder
            </button>
            <button
              onClick={() => setActiveTab('tracking')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'tracking' 
                  ? 'bg-blue-50 text-blue-800 border border-blue-200' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Live Tracking
            </button>
            <button
              onClick={() => setActiveTab('pod')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'pod' 
                  ? 'bg-blue-50 text-blue-800 border border-blue-200' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Proof of Delivery
            </button>
          </div>

          {/* 3 Columns/Cards matching image layout exactly */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left pt-2">
            
            {/* Card 1: Optimized Delivery Routes */}
            <div 
              className={`bg-white rounded-3xl border p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_20px_50px_rgb(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group cursor-pointer ${
                activeTab === 'routes' ? 'border-[#FF5A1F] ring-4 ring-orange-500/5' : 'border-slate-100 hover:border-slate-200/80'
              }`}
              onClick={() => setActiveTab('routes')}
            >
              <div className="h-12 w-12 rounded-xl bg-orange-50 border border-orange-100 text-[#FF5A1F] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="text-slate-900 font-sans font-extrabold text-lg mb-2">
                Optimized Delivery Routes
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-4 font-normal">
                Get drivers on the fastest path. Auto-sequence multiple jobsite deliveries respecting payload restrictions, gate access times, and truck dimensional clearances.
              </p>
              
              {/* Simple illustrative SVG widget inside the card */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100/50 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 font-mono uppercase font-bold block leading-none">ROUTE SEQUENCER</span>
                  <span className="text-xs font-bold text-slate-850 block">Conshohocken Yard &rarr; Stop 1 &rarr; Stop 2</span>
                </div>
                <span className="bg-emerald-100 border border-emerald-200 text-emerald-800 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded leading-none">
                  -24 min saved
                </span>
              </div>
            </div>

            {/* Card 2: Real-Time Load & Fleet Tracking */}
            <div 
              className={`bg-white rounded-3xl border p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_20px_50px_rgb(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group cursor-pointer ${
                activeTab === 'tracking' ? 'border-[#FF5A1F] ring-4 ring-orange-500/5' : 'border-slate-100 hover:border-slate-200/80'
              }`}
              onClick={() => setActiveTab('tracking')}
            >
              <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Truck className="h-6 w-6" />
              </div>
              <h3 className="text-slate-900 font-sans font-extrabold text-lg mb-2">
                Real-Time Load & Fleet Tracking
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-4 font-normal">
                Know where every load is. Drivers pin live cargo loading confirmations (with picker identification) so you can track lumberyard inventory transit second-by-second.
              </p>

              {/* Simple illustrative SVG widget inside the card */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100/50 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                  <span className="text-xs text-slate-750 font-semibold">GPS: Flatbed Truck #104</span>
                </div>
                <span className="text-slate-400 font-mono text-[9px]">Speed: 45 MPH</span>
              </div>
            </div>

            {/* Card 3: Digital Proof of Delivery */}
            <div 
              className={`bg-white rounded-3xl border p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_20px_50px_rgb(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group cursor-pointer ${
                activeTab === 'pod' ? 'border-[#FF5A1F] ring-4 ring-orange-500/5' : 'border-slate-100 hover:border-slate-200/80'
              }`}
              onClick={() => setActiveTab('pod')}
            >
              <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-slate-900 font-sans font-extrabold text-lg mb-2">
                Digital Proof of Delivery
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-4 font-normal">
                Instant delivery verification. Capture dropoff photography, precise GPS drop coordinates, and electronic customer signatures directly from the driver app.
              </p>
              
              {/* Simple illustrative SVG widget inside the card */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100/50 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 font-mono uppercase font-bold block leading-none">POD STATUS</span>
                  <span className="text-xs font-bold text-emerald-700 block">Photo & Signature Uploaded</span>
                </div>
                <span className="text-[9px] text-indigo-600 bg-indigo-50 border border-indigo-100 font-mono font-bold px-1.5 py-0.5 rounded leading-none">
                  Secure Verification
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. "See Your Logistics in Action" Section (Interactive Dashboard Mockup & Testimonial) */}
      <section className="py-20 bg-slate-50 border-y border-slate-100" id="dashboard-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-4">
            <h2 className="font-sans font-black text-slate-900 tracking-tight text-3xl sm:text-4xl">
              See Your Logistics in Action
            </h2>
            <p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Track live yard activity, truck capacities, staging queues, and on-time statistics from a single, unified enterprise dashboard.
            </p>
          </div>

          {/* Interactive Live Dashboard Interface resembling the image */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 overflow-hidden max-w-5xl mx-auto animate-fade-in">
            
            {/* Top Toolbar */}
            <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-xs font-black tracking-widest text-slate-400">HQ LOGISTICS LIVE DASHBOARD</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] bg-slate-800 text-slate-300 font-mono font-bold px-2.5 py-1 rounded-md border border-slate-700">
                  REFRESH RATE: 5S (AUTO)
                </span>
                <span className="text-[10px] bg-blue-900 text-blue-200 font-mono font-bold px-2.5 py-1 rounded-md border border-blue-800">
                  REAL-TIME SYNC ENGINE ONLINE
                </span>
              </div>
            </div>

            {/* Main Mockup Body Grid */}
            <div className="p-6 sm:p-8 space-y-8">
              
              {/* High-level metrics row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                {/* Active Vehicles card */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block leading-none mb-2">Vehicles Active</span>
                    <span className="font-sans font-black text-slate-900 text-3xl sm:text-4xl">
                      {vehiclesActive}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-mono font-bold block mt-1.5 leading-none">
                      ● 100% capacity deployed
                    </span>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Truck className="h-6 w-6" />
                  </div>
                </div>

                {/* On-time Percentage card */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block leading-none mb-2">On-Time Percentage</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="font-sans font-black text-slate-900 text-3xl sm:text-4xl">
                        {onTimePercent}%
                      </span>
                      <span className="text-xs text-slate-500 font-semibold font-mono">Gn-Time</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-mono font-bold block mt-1.5 leading-none">
                      &uarr; 2.5% vs. previous month
                    </span>
                  </div>
                  
                  {/* Dynamic SVG Circle Gauge matching image */}
                  <div className="relative h-14 w-14 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="28" cy="28" r="24" className="stroke-slate-200 fill-none" strokeWidth="4" />
                      <circle 
                        cx="28" 
                        cy="28" 
                        r="24" 
                        className="stroke-emerald-500 fill-none transition-all duration-1000" 
                        strokeWidth="4" 
                        strokeDasharray="150" 
                        strokeDashoffset={150 - (150 * onTimePercent) / 100} 
                      />
                    </svg>
                    <span className="absolute text-[10px] font-mono font-bold text-slate-600">85%</span>
                  </div>
                </div>

                {/* Deliveries today card */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block leading-none mb-2">Deliveries Today</span>
                    <span className="font-sans font-black text-slate-900 text-3xl sm:text-4xl">
                      {deliveriesToday}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono font-bold block mt-1.5 leading-none">
                      12 in staging queue &bull; 8 pending load
                    </span>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-orange-50 text-[#FF5A1F] flex items-center justify-center">
                    <MapPin className="h-6 w-6" />
                  </div>
                </div>

              </div>

              {/* Heat Map Matrix Area as pictured in the mockup */}
              <div className="bg-slate-50 rounded-2xl p-5 sm:p-6 border border-slate-100 text-left space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
                  <div>
                    <h4 className="font-sans font-black text-slate-900 text-sm">Delivery Density &amp; Cargo Heat Map</h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Monthly logistics volume across regional dispatch branches <span className="inline-block sm:hidden text-orange-600 font-bold ml-1">(Swipe to scroll &rarr;)</span>
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] font-mono font-bold text-slate-500">
                    <span className="flex items-center space-x-1">
                      <span className="h-2 w-2 rounded bg-emerald-50" />
                      <span>Low</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="h-2 w-2 rounded bg-emerald-200" />
                      <span>Medium</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="h-2 w-2 rounded bg-emerald-600" />
                      <span>Heavy Staging</span>
                    </span>
                  </div>
                </div>

                {/* Horizontal Heat Map Grid Scroller */}
                <div className="overflow-x-auto scrollbar-none">
                  <div className="min-w-[600px] space-y-2">
                    
                    {/* Header Columns Row */}
                    <div className="flex items-center font-mono text-[9px] font-bold text-slate-400 pb-1">
                      <div className="w-28 shrink-0">Branch</div>
                      <div className="flex-1 grid grid-cols-10 gap-1.5 text-center">
                        {monthsList.map(m => <div key={m}>{m}</div>)}
                      </div>
                    </div>

                    {/* Matrix Rows */}
                    {branchesList.map((branch, branchIdx) => (
                      <div key={branch} className="flex items-center">
                        <div className="w-28 shrink-0 font-sans text-xs font-black text-slate-700 leading-none truncate pr-2">
                          {branch}
                        </div>
                        <div className="flex-1 grid grid-cols-10 gap-1.5">
                          {heatmapMatrix[branchIdx].map((val, mIdx) => (
                            <div 
                              key={mIdx}
                              onClick={() => setSelectedHeatmapCell({
                                branch,
                                month: monthsList[mIdx],
                                val
                              })}
                              className={`aspect-square sm:aspect-auto sm:h-8 rounded-md transition-all duration-300 cursor-pointer ${getDensityColor(val)}`}
                              title={`${branch} - ${monthsList[mIdx]}: ${val} tons loaded`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}

                  </div>
                </div>

                {/* Heatmap selection details popup */}
                {selectedHeatmapCell && (
                  <div className="bg-white border border-slate-200/80 rounded-xl p-3 text-xs text-slate-700 flex items-center justify-between animate-fade-in">
                    <div>
                      📍 Detailed Log: <strong className="text-slate-900 font-semibold">{selectedHeatmapCell.branch}</strong> in <strong className="text-slate-900 font-semibold">{selectedHeatmapCell.month}</strong> processed <strong className="text-emerald-700 font-bold">{selectedHeatmapCell.val} deliveries</strong>. Average dispatch turnaround: <strong className="text-slate-900 font-semibold">14.5 minutes</strong>.
                    </div>
                    <button 
                      onClick={() => setSelectedHeatmapCell(null)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold font-mono pl-4"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>



        </div>
      </section>

      {/* 6. Corporate Footer */}
      <footer className="bg-[#0B1222] text-slate-400 py-16 border-t border-slate-900" id="marketing-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-left pb-12 border-b border-slate-800/80">
            
            {/* Column 1: Brand Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <img 
                  src={getSafeLogoSrc(prospacesLogo)} 
                  alt="ProSpaces Logo" 
                  className="h-20 sm:h-24 w-auto object-contain brightness-110 rounded-lg bg-white/5 p-1"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/logistics-logo.jpg';
                  }}
                />
                <div className="flex flex-col">
                  <span className="font-sans font-black text-white text-xl sm:text-2xl tracking-tight leading-none">ProSpaces</span>
                  <span className="text-orange-500 text-[10px] sm:text-xs font-mono uppercase tracking-wider font-extrabold mt-1">Logistics Module</span>
                </div>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">
                The leading yard, fleet, and last-mile logistics platform custom-tailored for building material distributors and commercial home centers.
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h4 className="text-white font-mono text-[10px] font-black tracking-widest uppercase mb-4">Core Ecosystem</h4>
              <ul className="space-y-2.5 text-xs">
                <li><button onClick={() => handleScrollTo('features-section')} className="hover:text-white transition-colors cursor-pointer">Logistics Features</button></li>
                <li><button onClick={() => handleScrollToFeature('pod')} className="hover:text-white transition-colors cursor-pointer">Proof of Delivery</button></li>
                <li><button onClick={() => handleScrollTo('dashboard-section')} className="hover:text-white transition-colors cursor-pointer">Dispatch Dashboard</button></li>
                <li><button onClick={onLoginClick} className="hover:text-white transition-colors cursor-pointer">Secure Portal Login</button></li>
              </ul>
            </div>

            {/* Column 3: Contact & Support */}
            <div>
              <h4 className="text-white font-mono text-[10px] font-black tracking-widest uppercase mb-4">Support &amp; Resources</h4>
              <ul className="space-y-2.5 text-xs">
                <li><a href="#marketing-homepage" className="hover:text-white transition-colors">Customer Portal</a></li>
                <li><a href="#marketing-homepage" className="hover:text-white transition-colors">Knowledge Base</a></li>
                <li><a href="#marketing-homepage" className="hover:text-white transition-colors">Developer API Docs</a></li>
                <li><a href="#marketing-homepage" className="hover:text-white transition-colors">System Operations Log</a></li>
              </ul>
            </div>

            {/* Column 4: Newsletter/Updates */}
            <div className="space-y-3">
              <h4 className="text-white font-mono text-[10px] font-black tracking-widest uppercase mb-1">Get Operations Updates</h4>
              <p className="text-slate-500 text-xs leading-relaxed">
                Receive quarterly lumber supply chain reports and logistics tech updates.
              </p>
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
                <input 
                  type="email" 
                  placeholder="Enter work email"
                  className="bg-transparent border-none text-xs text-white p-2 focus:outline-none flex-1 font-sans" 
                />
                <button 
                  onClick={onStartTrial}
                  className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-md transition-colors cursor-pointer"
                >
                  Join
                </button>
              </div>
            </div>

          </div>

          {/* Social Links, Legal & Copyright Row */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            
            {/* Left legal links */}
            <div className="flex items-center space-x-6 text-xs text-slate-500 font-medium">
              <a href="#marketing-homepage" className="hover:text-slate-300 transition-colors">Contact</a>
              <span>&bull;</span>
              <a href="#marketing-homepage" className="hover:text-slate-300 transition-colors">Support</a>
              <span>&bull;</span>
              <a href="#marketing-homepage" className="hover:text-slate-300 transition-colors">Terms of Use</a>
              <span>&bull;</span>
              <a href="#marketing-homepage" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            </div>

            {/* Middle Social icons */}
            <div className="flex items-center space-x-4">
              <a href="#marketing-homepage" className="h-8 w-8 rounded-full bg-slate-900 hover:bg-[#FF5A1F] hover:text-white border border-slate-800/85 flex items-center justify-center text-slate-500 transition-all" title="Share">
                <Share2 className="h-4 w-4" />
              </a>
              <a href="#marketing-homepage" className="h-8 w-8 rounded-full bg-slate-900 hover:bg-[#FF5A1F] hover:text-white border border-slate-800/85 flex items-center justify-center text-slate-500 transition-all" title="Website">
                <Globe className="h-4 w-4" />
              </a>
              <a href="#marketing-homepage" className="h-8 w-8 rounded-full bg-slate-900 hover:bg-[#FF5A1F] hover:text-white border border-slate-800/85 flex items-center justify-center text-slate-500 transition-all" title="External Link">
                <ExternalLink className="h-4 w-4" />
              </a>
              <a href="#marketing-homepage" className="h-8 w-8 rounded-full bg-slate-900 hover:bg-[#FF5A1F] hover:text-white border border-slate-800/85 flex items-center justify-center text-slate-500 transition-all" title="Video">
                <Video className="h-4 w-4" />
              </a>
            </div>

            {/* Right Copyright */}
            <div className="text-xs text-slate-600 font-mono">
              © 2026 ProSpaces. All Rights Reserved.
            </div>

          </div>

        </div>
      </footer>


      {/* 2-Minute Interactive Tour Simulation Modal */}
      <AnimatePresence>
        {showVideoModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-in fade-in duration-150">
            <div 
              className="fixed inset-0" 
              onClick={() => {
                setShowVideoModal(false);
                setTourStep(0);
              }}
            />
            
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full relative z-10 overflow-hidden animate-in zoom-in duration-150 flex flex-col text-left max-h-[90vh] overflow-y-auto">
              
              {/* Modal Header */}
              <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Play className="h-5 w-5 text-orange-500 fill-orange-500" />
                  <h3 className="font-sans font-black text-slate-900 text-base">
                    Interactive Delivery & Active Tracking Tour
                  </h3>
                </div>
                <button 
                  onClick={() => {
                    setShowVideoModal(false);
                    setTourStep(0);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Progress Tracker bar */}
              <div className="bg-slate-100 h-1.5 w-full flex">
                {tourSteps.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-full flex-1 transition-all duration-300 ${
                      idx <= tourStep ? 'bg-[#FF5A1F]' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>

              {/* Modal Core Body Content */}
              <div className="p-6 sm:p-8 space-y-6">
                
                <div className="flex items-start space-x-4">
                  <div className="h-12 w-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                    {tourSteps[tourStep].icon}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-mono font-extrabold px-2 py-0.5 rounded uppercase leading-none">
                      {tourSteps[tourStep].badge}
                    </span>
                    <h4 className="font-sans font-black text-slate-950 text-lg">
                      {tourSteps[tourStep].title}
                    </h4>
                    <p className="text-slate-600 text-sm leading-relaxed pt-1">
                      {tourSteps[tourStep].desc}
                    </p>
                  </div>
                </div>

                {/* Interactive active visualization for each step */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 font-mono text-xs text-slate-600 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-800">LIVE CO-PILOT SYSTEM TERMINAL</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">MONITOR STATE: ACTIVE</span>
                  </div>

                  {tourStep === 0 && (
                    <div className="space-y-1">
                      <p className="text-slate-500">&gt; Awaiting order stream from CRM billing terminal...</p>
                      <p className="text-indigo-600 font-bold">&gt; [OK] Received invoice #ST-1092 from Pro Desk Sales Coordinator</p>
                      <p className="text-slate-700">&gt; Payload: 12x SPF Lumber Studs, 2x Bundles Portland Cement, Crane Drop requested</p>
                    </div>
                  )}

                  {tourStep === 1 && (
                    <div className="space-y-1">
                      <p className="text-slate-500">&gt; Allocating picker staging task to warehouse supervisor...</p>
                      <p className="text-blue-600 font-bold">&gt; [ASSIGNED] Picker 'David Smith (Picker)' confirmed barcode scans</p>
                      <p className="text-slate-700">&gt; Status: 100% Lumberyard stock physically loaded on Flatbed Trailer #102</p>
                    </div>
                  )}

                  {tourStep === 2 && (
                    <div className="space-y-1">
                      <p className="text-slate-500">&gt; Analyzing multiple regional stopovers...</p>
                      <p className="text-purple-600 font-bold">&gt; [ROUTING] Rearranging 5 deliveries into optimal single-trip loop</p>
                      <p className="text-slate-700">&gt; Total savings calculated: 14.2 miles &bull; 24 mins travel time</p>
                    </div>
                  )}

                  {tourStep === 3 && (
                    <div className="space-y-1">
                      <p className="text-slate-500">&gt; Driver confirmed dropoff coordinates via GPS fence...</p>
                      <p className="text-emerald-600 font-bold">&gt; [POD APPROVED] Photo proof and electronic signature uploaded</p>
                      <p className="text-slate-700">&gt; Status: Customer profile updated automatically. Ticket closed successfully.</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Action Footer buttons */}
              <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-100">
                <button
                  onClick={() => {
                    if (tourStep > 0) {
                      setTourStep(prev => prev - 1);
                    }
                  }}
                  disabled={tourStep === 0}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                >
                  Previous Step
                </button>

                <div className="text-slate-400 text-xs font-bold font-mono">
                  Stop {tourStep + 1} of {tourSteps.length}
                </div>

                <button
                  onClick={() => {
                    if (tourStep < tourSteps.length - 1) {
                      setTourStep(prev => prev + 1);
                    } else {
                      setShowVideoModal(false);
                      setTourStep(0);
                    }
                  }}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  {tourStep < tourSteps.length - 1 ? 'Next Step' : 'Got It & Close'}
                </button>
              </div>

            </div>
          </div>
        )}

        {showComingSoon && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-in fade-in duration-150">
            <div 
              className="fixed inset-0" 
              onClick={() => setShowComingSoon(false)}
            />
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full relative z-10 overflow-hidden animate-in zoom-in duration-150 p-6 sm:p-8 flex flex-col items-center text-center space-y-6">
              
              {/* Glowing Icon Wrapper */}
              <div className="h-16 w-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF5A1F] relative">
                <span className="absolute inset-0 bg-orange-400 rounded-2xl animate-ping opacity-15" />
                <Sparkles className="h-7 w-7" />
              </div>

              {/* Text */}
              <div className="space-y-2">
                <h3 className="font-sans font-black text-slate-900 text-xl tracking-tight leading-none">
                  CRM Auto-Sync Coming Soon
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                  Our engineering team is actively finalising the deep two-way integration with the core <strong>ProSpaces CRM</strong> ecosystem.
                </p>
                <p className="text-slate-400 text-xs leading-relaxed italic">
                  When deployed, this will seamlessly synchronize contractor accounts, credit approvals, automated invoice dispatch, and dispatch status updates in real-time.
                </p>
              </div>

              {/* Action buttons */}
              <button
                onClick={() => setShowComingSoon(false)}
                className="w-full py-3 bg-[#FF5A1F] hover:bg-[#E54B13] text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20 text-sm cursor-pointer"
              >
                Return to Workspace
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
