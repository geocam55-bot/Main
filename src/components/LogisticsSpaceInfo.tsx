import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Truck, MapPin, Layers3, Activity, ShieldCheck, 
  Calendar, CheckCircle2, Navigation, Clock, Eye, Sparkles,
  Maximize2, X, ChevronRight, BarChart3, AlertCircle, FileText,
  Sliders, Gauge, ArrowUpRight, Smartphone, Building2
} from 'lucide-react';

interface LogisticsSpaceInfoProps {
  onBack: () => void;
  onEnterSpace?: () => void;
}

const LOGISTICS_SCREENSHOTS = [
  {
    id: 'dashboard',
    title: 'Live Dispatch & Telematics Dashboard',
    subtitle: 'Real-time vehicle tracking, driver telemetry, active route status, and capacity gauges',
    badge: 'Central Dispatch View',
    image: '/images/logistics_dashboard_ui_1787954901335.jpg',
    highlights: [
      'Interactive GPS map with live vehicle locations and animated breadcrumb trails',
      'Real-time delivery status board: Scheduled, Dispatched, En Route, and At Jobsite',
      'Active truck capacity and axle payload monitors to prevent vehicle overloading'
    ]
  },
  {
    id: 'freight-board',
    title: 'Multi-Depot Drag & Drop Freight Board',
    subtitle: 'Visual timeline scheduling from 7:00 AM to 5:00 PM with vehicle capacity meters',
    badge: 'Scheduling Board',
    image: '/images/logistics_dispatch_board_1787954913450.jpg',
    highlights: [
      'Drag-and-drop order assignment across crane flatbeds, Moffett trucks, and dry vans',
      'Payload weight meter bars with automatic threshold alerts for heavy framing lumber and drywall',
      'Multi-depot store support (Distribution Center, regional lumber yards, retail stores)'
    ]
  },
  {
    id: 'telematics',
    title: 'GPS Geofence & Vehicle Telemetry Replay',
    subtitle: 'Automated geofence check-ins, idling timers, speed analytics, and route playback',
    badge: 'Fleet Telematics',
    image: '/images/logistics_map_screen.jpg',
    highlights: [
      'Automated geofence boundaries for customer construction sites and supplier yards',
      'Instant departure and arrival timestamp logging for customer transparency',
      'Vehicle diagnostics, maintenance tracking, and fuel consumption optimization'
    ]
  },
  {
    id: 'delivery-proof',
    title: 'Real-World Jobsite Offload & Proof of Delivery',
    subtitle: 'Verified jobsite placement tracking for heavy building materials and framing packages',
    badge: 'Fulfillment Verification',
    image: '/images/doorstep_delivery_photo.jpg',
    highlights: [
      'High-resolution photographic documentation of delivered materials on the contractor jobsite',
      'Digital signature capture synchronized directly to the master CRM invoice',
      'Instant Bill of Lading (BOL) generation and customer text/email dispatch confirmation'
    ]
  }
];

const CORE_BENEFITS = [
  {
    icon: Calendar,
    title: 'Visual Drag-and-Drop Dispatch',
    tag: 'Operational Efficiency',
    desc: 'Assign sales orders and framing packages across your entire commercial fleet in seconds. Color-coded timeline lanes ensure balanced driver workloads.',
    points: ['Multi-truck lane timelines', 'Drag-and-drop order reassignment', 'Automatic route sequencing']
  },
  {
    icon: MapPin,
    title: 'Live Fleet Telematics & GPS',
    tag: 'Real-Time Visibility',
    desc: 'Monitor exact truck locations, speed, ignition status, and geofence boundary events with real-time heartbeat telemetry updates.',
    points: ['Live map marker updates', 'Automated geofence alerts', 'Driver idle time tracking']
  },
  {
    icon: Gauge,
    title: 'Weight & Payload Safety Meters',
    tag: 'DOT & Safety Compliance',
    desc: 'Prevent vehicle overloading with live axle weight calculations for heavy lumber bundles, gypsum boards, and masonry products.',
    points: ['Real-time capacity gauge bars', 'Boom reach & crane weight limits', 'Overweight warning indicators']
  },
  {
    icon: FileText,
    title: 'Automated BOL & Paperless Delivery',
    tag: 'Fulfillment Speed',
    desc: 'Seamlessly convert ProSpaces CRM contractor quotes into active delivery manifests, complete with digital signatures and photo audit trails.',
    points: ['Instant Bill of Lading creation', 'Photo proof of delivery', 'Digital customer signatures']
  },
  {
    icon: Building2,
    title: 'Multi-Depot & Enterprise Hub',
    tag: 'Scale & Growth',
    desc: 'Manage multiple lumber yards, retail stores, and centralized distribution hubs from a single unified enterprise workspace.',
    points: ['Cross-dock transfer management', 'Depot-specific driver rosters', 'Tenant-isolated fleet visibility']
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access & Security',
    tag: 'Enterprise Security',
    desc: 'Granular permissions tailored for Super Admins, Dispatchers, Yard Managers, and Drivers to ensure secure access to operational data.',
    points: ['Granular role permissions', 'Multi-tenant database isolation', 'Complete activity audit log']
  }
];

const LOGISTICS_KPIS = [
  { value: '38%', label: 'Reduction in Yard Turnaround', sub: 'Faster loading & gate dispatch' },
  { value: '99.8%', label: 'On-Time Fulfillment Rate', sub: 'Optimized multi-stop routing' },
  { value: '100%', label: 'Digital POD Compliance', sub: 'Zero lost physical paper tickets' },
  { value: '15 sec', label: 'Live Telematics Heartbeat', sub: 'Sub-minute fleet location updates' },
];

export function LogisticsSpaceInfo({ onBack, onEnterSpace }: LogisticsSpaceInfoProps) {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const selectedScreenshot = LOGISTICS_SCREENSHOTS.find(s => s.id === activeTab) || LOGISTICS_SCREENSHOTS[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 selection:bg-blue-500 selection:text-white">
      {/* Top sticky sub-header navigation */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            id="btn-back-to-crm-from-logistics-info"
          >
            <ArrowLeft className="h-4 w-4 text-blue-600" />
            <span>Back to ProSpaces CRM</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="h-3 w-3 text-blue-600" />
              Enterprise Logistics Platform
            </span>
            {onEnterSpace && (
              <button
                onClick={onEnterSpace}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm active:scale-98 cursor-pointer"
                id="btn-launch-live-logistics-workspace"
              >
                <Truck className="h-4 w-4" />
                <span>Launch Logistics App</span>
                <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-[#0e294d] via-[#123b70] to-[#1e58a1] rounded-3xl p-6 sm:p-10 lg:p-14 text-white shadow-xl relative overflow-hidden">
          {/* Subtle background glow effect */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-blue-500/20 text-blue-200 border border-blue-400/30 mb-6 backdrop-blur-xs">
              <Truck className="h-3.5 w-3.5 text-blue-300" />
              ProSpaces Logistics & Fleet Space
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
              Intelligent Fleet Dispatch & Yard Management for Heavy Building Materials
            </h1>

            <p className="mt-5 text-base sm:text-lg text-blue-100/90 leading-relaxed font-normal">
              Built specifically for lumber yards, home improvement centers, and commercial distributors. Connect your sales desk directly to yard cranes, Moffett flatbeds, live GPS telematics, and customer jobsite delivery.
            </p>

            <div className="mt-8 flex flex-wrap gap-4 items-center">
              {onEnterSpace && (
                <button
                  onClick={onEnterSpace}
                  className="bg-white hover:bg-blue-50 text-blue-900 font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg transition-all flex items-center gap-2.5 active:scale-98 cursor-pointer"
                >
                  <Truck className="h-4.5 w-4.5 text-blue-600" />
                  <span>Enter Logistics Workspace</span>
                  <ChevronRight className="h-4 w-4 text-blue-600" />
                </button>
              )}
              <a
                href="#screenshots-section"
                className="bg-blue-600/30 hover:bg-blue-600/50 border border-blue-300/30 text-white font-semibold text-sm px-5 py-3.5 rounded-xl transition-all flex items-center gap-2 backdrop-blur-xs cursor-pointer"
              >
                <Eye className="h-4 w-4" />
                <span>View App Screenshots</span>
              </a>
            </div>
          </div>
        </div>

        {/* Key KPI Metrics Grid */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {LOGISTICS_KPIS.map((kpi, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all">
              <p className="text-3xl sm:text-4xl font-extrabold text-blue-600 tracking-tight">{kpi.value}</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{kpi.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* ── ACTUAL APP SCREENSHOTS SHOWCASE ── */}
        <div id="screenshots-section" className="mt-14 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-md">Visual Tour</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                Actual Screenshots from the ProSpaces Logistics App
              </h2>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                Explore the core workflows and interfaces powering commercial dispatchers, fleet managers, and warehouse supervisors every day.
              </p>
            </div>

            {/* Screenshot Category Switcher */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200/70 rounded-2xl">
              {LOGISTICS_SCREENSHOTS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  {tab.badge}
                </button>
              ))}
            </div>
          </div>

          {/* Active Screenshot Display Card */}
          <div className="bg-white rounded-3xl border border-slate-250 shadow-md overflow-hidden transition-all">
            {/* Header description for the selected screenshot */}
            <div className="p-6 sm:p-8 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800 mb-2">
                  <Truck className="h-3.5 w-3.5" />
                  {selectedScreenshot.badge}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {selectedScreenshot.title}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {selectedScreenshot.subtitle}
                </p>
              </div>

              <button
                onClick={() => setLightboxImage(selectedScreenshot.image)}
                className="self-start md:self-auto inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-2xs active:scale-98 cursor-pointer"
                title="Click to zoom image"
              >
                <Maximize2 className="h-3.5 w-3.5 text-blue-600" />
                <span>Enlarge Screenshot</span>
              </button>
            </div>

            {/* Main Screenshot Visual Image */}
            <div className="p-4 sm:p-8 bg-slate-900/5 flex justify-center items-center">
              <div 
                className="relative group rounded-2xl overflow-hidden shadow-lg border border-slate-300/80 max-w-5xl w-full bg-slate-950 cursor-pointer"
                onClick={() => setLightboxImage(selectedScreenshot.image)}
              >
                <img
                  src={selectedScreenshot.image}
                  alt={selectedScreenshot.title}
                  className="w-full h-auto max-h-[560px] object-cover sm:object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                  loading="lazy"
                />
                
                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-blue-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="bg-slate-900/80 text-white text-xs font-bold px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2">
                    <Maximize2 className="h-3.5 w-3.5 text-blue-400" />
                    <span>Click to view full screen</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature bullets below the screenshot */}
            <div className="p-6 sm:p-8 bg-white border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Key Capabilities Shown in this Screen</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedScreenshot.highlights.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-150">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── CORE BENEFITS & ENTERPRISE ADVANTAGES ── */}
        <div className="mt-16">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-md">Enterprise Advantage</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 mt-2">
              Why Building Supply Leaders Choose ProSpaces Logistics
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-3">
              Eliminate dispatch bottlenecks, reduce fuel costs, and maintain a seamless digital chain of custody across every contractor delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CORE_BENEFITS.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <div key={idx} className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                        {benefit.tag}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">{benefit.title}</h3>
                    <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed">{benefit.desc}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                    {benefit.points.map((pt, pIdx) => (
                      <div key={pIdx} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── INTEGRATION & WORKFLOW ARCHITECTURE ── */}
        <div className="mt-16 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-md">Seamless Ecosystem</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              Connected Directly with ProSpaces CRM
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Unlike generic standalone routing tools, ProSpaces Logistics is tightly wired into the contractor quoting engine and inventory stock registers.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100">
              <div className="text-xs font-extrabold uppercase tracking-wider text-blue-700 mb-2">1. Sales Quote to Dispatch</div>
              <h4 className="font-bold text-slate-900 text-sm mb-1.5">Zero Double Data Entry</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                When contractor bids are accepted in the Sales Space, delivery requirements, site access gates, and material lists flow directly into the Logistics delivery queue.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
              <div className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 mb-2">2. Real-Time Yard Inventory</div>
              <h4 className="font-bold text-slate-900 text-sm mb-1.5">Live Stock Deductions</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                As truck loads are picked and scanned at the Yard Scan Station, SKU inventory levels are immediately adjusted across the master warehouse catalog.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100">
              <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 mb-2">3. Instant Invoicing & POD</div>
              <h4 className="font-bold text-slate-900 text-sm mb-1.5">Immediate Billing Closeout</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Customer jobsite signatures and delivery photos captured by drivers sync instantly, enabling finance teams to release invoices with attached proof-of-delivery without delay.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="mt-14 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-12 text-white text-center shadow-lg">
          <h3 className="text-2xl sm:text-3xl font-extrabold">Ready to Modernize Your Fleet & Dispatch?</h3>
          <p className="mt-3 text-sm sm:text-base text-blue-100 max-w-2xl mx-auto">
            Experience how ProSpaces Logistics coordinates trucks, drivers, and lumber deliveries with precision.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            {onEnterSpace && (
              <button
                onClick={onEnterSpace}
                className="bg-white hover:bg-blue-50 text-blue-900 font-bold text-sm px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-98 cursor-pointer"
              >
                <Truck className="h-4.5 w-4.5 text-blue-600" />
                <span>Launch Logistics App Now</span>
              </button>
            )}
            <button
              onClick={onBack}
              className="bg-blue-800/40 hover:bg-blue-800/60 border border-blue-300/30 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-all cursor-pointer"
            >
              Return to ProSpaces CRM
            </button>
          </div>
        </div>
      </div>

      {/* ── LIGHTBOX MODAL FOR FULL-RESOLUTION SCREENSHOT VIEWING ── */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
            onClick={() => setLightboxImage(null)}
          >
            <div 
              className="relative max-w-6xl w-full max-h-[90vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute -top-12 right-0 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-md transition-all cursor-pointer"
                title="Close lightbox"
              >
                <X className="h-6 w-6" />
              </button>

              <img
                src={lightboxImage}
                alt="Enlarged screenshot"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
