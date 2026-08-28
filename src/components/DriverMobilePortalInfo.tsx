import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Smartphone, Truck, MapPin, CheckCircle2, 
  Camera, PenTool, ShieldCheck, ClipboardCheck, Sparkles,
  Maximize2, X, ChevronRight, Navigation, WifiOff, FileCheck2,
  Clock, ArrowUpRight, CheckSquare, Bell, UserCheck, AlertTriangle
} from 'lucide-react';

interface DriverMobilePortalInfoProps {
  onBack: () => void;
  onEnterApp?: () => void;
}

const DRIVER_PORTAL_SCREENSHOTS = [
  {
    id: 'route-manifest',
    title: 'Active Route & Stop Navigation',
    subtitle: 'Prioritized daily delivery run manifest with jobsite directions, gate access codes, and contact shortcuts',
    badge: 'Mobile Route View',
    image: '/images/driver_mobile_route_1787954926223.jpg',
    highlights: [
      'Turn-by-turn routing with one-tap launch in Google Maps, Apple Maps, or Waze',
      'Real-time stop status indicators: Dispatched, En Route, and Arrived at Jobsite',
      'Direct customer phone calling and detailed contractor site access instructions'
    ]
  },
  {
    id: 'digital-pod',
    title: 'Instant Electronic Proof of Delivery (POD)',
    subtitle: 'Digital touchscreen signature capture and photographic verification synced automatically to the cloud',
    badge: 'POD & Signature',
    image: '/images/driver_mobile_pod_1787954938140.jpg',
    highlights: [
      'Touchscreen customer signature canvas with printed name and timestamp',
      'Camera photo capture thumbnail verifying dropped framing lumber bundle placement',
      'Automatic sync to ProSpaces CRM Bill of Lading with zero paper ticket handling'
    ]
  },
  {
    id: 'jobsite-drop',
    title: 'Photographic Jobsite Placement Documentation',
    subtitle: 'High-visibility photo capture confirming material placement condition and safety compliance',
    badge: 'Jobsite Photo Audit',
    image: '/images/doorstep_delivery_photo.jpg',
    highlights: [
      'GPS geotagged and timestamped photo proof of heavy framing lumber offloads',
      'Eliminates delivery disputes and protects carriers against damage claims',
      'Instant SMS/Email notification sent to the builder with attached jobsite photos'
    ]
  },
  {
    id: 'fleet-telemetry',
    title: 'Live Telematics & Geofence GPS Sync',
    subtitle: 'Automatic background location heartbeat and automated jobsite geofence arrival logging',
    badge: 'Background Telematics',
    image: '/images/logistics_map_screen.jpg',
    highlights: [
      'Background breadcrumb telemetry updates dispatchers without driver distraction',
      'Automatic check-in when entering geofenced customer jobsite zones',
      'Real-time vehicle status sync with driver profile and assigned truck specifications'
    ]
  }
];

const DRIVER_BENEFITS = [
  {
    icon: Navigation,
    title: 'Turn-by-Turn Stop Sequencing',
    tag: 'Driver Productivity',
    desc: 'Optimized delivery sequence organized by drop order. Drivers get immediate turn-by-turn navigation with contractor gate codes and site access notes.',
    points: ['One-tap GPS navigation launch', 'Drop-order stop sequencing', 'Contractor gate & parking notes']
  },
  {
    icon: Camera,
    title: 'Photo Proof of Delivery (POD)',
    tag: 'Zero Disputes',
    desc: 'Take high-resolution photos of delivered lumber, shingles, or drywall directly at the drop zone to guarantee indisputable proof of proper placement.',
    points: ['In-app camera photo capture', 'Automated GPS geotags', 'Instant delivery certificate sync']
  },
  {
    icon: PenTool,
    title: 'Digital Touchscreen Signatures',
    tag: '100% Paperless',
    desc: 'Contractors and site foremen sign directly on the mobile screen upon delivery. Eliminates lost paper manifests and illegible signatures forever.',
    points: ['Smooth touch signature canvas', 'Signee name and title logging', 'Instant PDF BOL generation']
  },
  {
    icon: ClipboardCheck,
    title: 'Digital Pre-Trip Inspection (DVIR)',
    tag: 'DOT Compliance',
    desc: 'Complete daily Driver Vehicle Inspection Reports before leaving the yard. Inspect tires, lights, straps, and boom hydraulics with photo defect reporting.',
    points: ['Interactive pre-trip checklist', 'Photo defect logging', 'Compliance audit records']
  },
  {
    icon: WifiOff,
    title: 'Offline-First Resilient Mode',
    tag: 'Reliable Anywhere',
    desc: 'Operate smoothly in remote construction zones with zero cellular signal. Signatures and photos are cached securely and auto-synced once back online.',
    points: ['Offline local data caching', 'Background auto-sync engine', 'Zero lost delivery data']
  },
  {
    icon: CheckSquare,
    title: 'Itemized Cargo SKU Checklist',
    tag: 'Order Accuracy',
    desc: 'Verify every lumber bundle, steel stud, and hardware box before rolling out of the yard. Cross-check manifest line items with pick lists effortlessly.',
    points: ['Line-item SKU checklists', 'Quantity mismatch warnings', 'Partial delivery handling']
  }
];

const DRIVER_KPIS = [
  { value: '100%', label: 'Paperless Runs', sub: 'Zero physical paper manifests' },
  { value: '4.5 min', label: 'Average Jobsite Stop', sub: 'Rapid signature & photo POD' },
  { value: '0', label: 'Billing / Drop Disputes', sub: 'Timestamped photo verification' },
  { value: 'Offline', label: 'Full Field Capability', sub: 'Auto-syncs in low cell signal' },
];

export function DriverMobilePortalInfo({ onBack, onEnterApp }: DriverMobilePortalInfoProps) {
  const [activeTab, setActiveTab] = useState<string>('route-manifest');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const selectedScreenshot = DRIVER_PORTAL_SCREENSHOTS.find(s => s.id === activeTab) || DRIVER_PORTAL_SCREENSHOTS[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 selection:bg-blue-500 selection:text-white">
      {/* Top sticky sub-header navigation */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            id="btn-back-to-crm-from-driver-portal-info"
          >
            <ArrowLeft className="h-4 w-4 text-blue-600" />
            <span>Back to ProSpaces CRM</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Smartphone className="h-3 w-3 text-emerald-600" />
              Mobile Companion Portal
            </span>
            {onEnterApp && (
              <button
                onClick={onEnterApp}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm active:scale-98 cursor-pointer"
                id="btn-launch-driver-portal-demo"
              >
                <Smartphone className="h-4 w-4" />
                <span>Launch Driver App</span>
                <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-[#0c2340] via-[#10335e] to-[#174d8b] rounded-3xl p-6 sm:p-10 lg:p-14 text-white shadow-xl relative overflow-hidden">
          {/* Background subtle glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 mb-6 backdrop-blur-xs">
              <Smartphone className="h-3.5 w-3.5 text-emerald-300" />
              ProSpaces Driver Mobile Portal
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
              Empower Field Drivers with One-Tap Routing, Photo POD, and Digital Signatures
            </h1>

            <p className="mt-5 text-base sm:text-lg text-blue-100/90 leading-relaxed font-normal">
              A touch-first mobile web application purpose-built for lumber flatbed operators, boom crane drivers, and delivery technicians. Zero paperwork, complete cargo visibility, and instant cloud sync from cab to dispatch.
            </p>

            <div className="mt-8 flex flex-wrap gap-4 items-center">
              {onEnterApp && (
                <button
                  onClick={onEnterApp}
                  className="bg-white hover:bg-emerald-50 text-slate-900 font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg transition-all flex items-center gap-2.5 active:scale-98 cursor-pointer"
                >
                  <Smartphone className="h-4.5 w-4.5 text-emerald-600" />
                  <span>Open Driver Mobile Portal</span>
                  <ChevronRight className="h-4 w-4 text-emerald-600" />
                </button>
              )}
              <a
                href="#driver-screenshots-section"
                className="bg-blue-600/30 hover:bg-blue-600/50 border border-blue-300/30 text-white font-semibold text-sm px-5 py-3.5 rounded-xl transition-all flex items-center gap-2 backdrop-blur-xs cursor-pointer"
              >
                <Maximize2 className="h-4 w-4" />
                <span>Explore Mobile Screenshots</span>
              </a>
            </div>
          </div>
        </div>

        {/* Key KPI Metrics Grid */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {DRIVER_KPIS.map((kpi, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
              <p className="text-3xl sm:text-4xl font-extrabold text-emerald-600 tracking-tight">{kpi.value}</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{kpi.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* ── ACTUAL MOBILE APP SCREENSHOTS SHOWCASE ── */}
        <div id="driver-screenshots-section" className="mt-14 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-md">Mobile Interface</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                Actual Screenshots from the Driver Mobile Portal
              </h2>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                Engineered for maximum legibility in bright sunlight, fast one-thumb interactions, and seamless offline jobsite delivery completion.
              </p>
            </div>

            {/* Screenshot Category Switcher */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200/70 rounded-2xl">
              {DRIVER_PORTAL_SCREENSHOTS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-white text-emerald-700 shadow-xs'
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
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 mb-2">
                  <Smartphone className="h-3.5 w-3.5" />
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
                <Maximize2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Enlarge Screenshot</span>
              </button>
            </div>

            {/* Main Screenshot Visual Image Container */}
            <div className="p-6 sm:p-10 bg-slate-900/5 flex justify-center items-center">
              <div 
                className="relative group rounded-3xl overflow-hidden shadow-xl border-4 border-slate-800 max-w-sm w-full bg-slate-950 cursor-pointer"
                onClick={() => setLightboxImage(selectedScreenshot.image)}
              >
                <img
                  src={selectedScreenshot.image}
                  alt={selectedScreenshot.title}
                  className="w-full h-auto max-h-[620px] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  loading="lazy"
                />
                
                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-slate-950/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="bg-slate-900/90 text-white text-xs font-bold px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2">
                    <Maximize2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Click to view full screen</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature bullets below the screenshot */}
            <div className="p-6 sm:p-8 bg-white border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Key Mobile Capabilities</h4>
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

        {/* ── CORE DRIVER BENEFITS ── */}
        <div className="mt-16">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-md">Driver-First Technology</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 mt-2">
              Designed for the Realities of Commercial Drivers
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-3">
              Eliminate clipboards, phone calls for gate codes, and lost delivery receipts. Give your fleet drivers an intuitive tool they actually enjoy using.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DRIVER_BENEFITS.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <div key={idx} className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
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
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── DRIVER WORKFLOW STEPS ── */}
        <div className="mt-16 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-md">Field Workflow</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              A Seamless Day in the Life of a ProSpaces Driver
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              From morning yard departure to final return, every step is streamlined into a frictionless digital workflow.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center mb-3">01</div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Pre-Trip Safety & Vehicle Check</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Log in, review truck specs, and complete the digital pre-trip safety checklist in under 60 seconds.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center mb-3">02</div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Load Manifest & Route Start</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Review itemized lumber/drywall SKUs, tap "Start Route", and follow GPS turn-by-turn guidance directly to Jobsite #1.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 font-extrabold text-xs flex items-center justify-center mb-3">03</div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Drop & Capture Proof of Delivery</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Offload materials, take placed cargo photos, collect the contractor signature, and tap "Complete Drop".
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 font-extrabold text-xs flex items-center justify-center mb-3">04</div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Instant Cloud Billing Sync</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The signed BOL and geotagged photos sync immediately to ProSpaces CRM, notifying dispatch and finance in real-time.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="mt-14 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-8 sm:p-12 text-white text-center shadow-lg">
          <h3 className="text-2xl sm:text-3xl font-extrabold">Ready to Put the Portal in Your Drivers' Hands?</h3>
          <p className="mt-3 text-sm sm:text-base text-emerald-100 max-w-2xl mx-auto">
            Test drive the mobile interface and see how easily commercial drivers can navigate stops, snap drop photos, and capture signatures.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            {onEnterApp && (
              <button
                onClick={onEnterApp}
                className="bg-white hover:bg-emerald-50 text-slate-900 font-bold text-sm px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-98 cursor-pointer"
              >
                <Smartphone className="h-4.5 w-4.5 text-emerald-600" />
                <span>Launch Driver Mobile Demo</span>
              </button>
            )}
            <button
              onClick={onBack}
              className="bg-emerald-800/40 hover:bg-emerald-800/60 border border-emerald-300/30 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-all cursor-pointer"
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
              className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center"
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
                alt="Enlarged mobile screenshot"
                className="max-w-full max-h-[85vh] object-contain rounded-3xl shadow-2xl border-2 border-white/20"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
