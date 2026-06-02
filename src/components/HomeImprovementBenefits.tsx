import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, ShieldCheck, Clock, Store, Users, FileText, ArrowRight, ClipboardCheck, MessageCircle } from 'lucide-react';

interface HomeImprovementProps {
  onBack: () => void;
  onGetStarted: () => void;
}

const BENEFIT_PILLARS = [
  {
    icon: Clock,
    title: 'Automated Sequential Scheduling',
    details: 'Keep installations on tight, error-free timelines. From contract signature, ProSpaces triggers calendar slots for measurement teams, material load dates, delivery trucks, and subcontractor labor sequentially.'
  },
  {
    icon: ShieldCheck,
    title: 'Supplier Lead Time Syncing',
    details: 'Prevent crew idleness. The platform cross-references actual vendor lead-times for custom cabinetry, countertops, and special-order windows to assign site work ONLY when ingredients are confirmed in-yard.'
  },
  {
    icon: Users,
    title: 'Integrated Subcontractor Hub',
    details: 'Stop chasing paperwork. Let your installer network submit blueprints, upload site completion photos, sign off on safety checklists, and receive automated payout approvals from their mobile phones.'
  },
  {
    icon: ClipboardCheck,
    title: 'Real-Time Margin Safeguards',
    details: 'Protect retail profitability on complex projects. ProSpaces pulls live warehouse costs, estimated waste thresholds, and sub-assembly labor rates of custom designs to secure your 40%+ gross-product-margin.'
  }
];

const METRICS_CARDS = [
  { val: '24%', label: 'Higher Installation Savings' },
  { val: '40%', label: 'Fewer Installation Bottlenecks' },
  { val: '12 hrs', label: 'Saved per Store Mgr / Week' },
  { val: '4.9★', label: 'Contractor Work Quality Rating' }
];

type PhaseKey = 'lead' | 'estimate' | 'vendor' | 'install';

export function HomeImprovementBenefits({ onBack, onGetStarted }: HomeImprovementProps) {
  const [activePhase, setActivePhase] = useState<PhaseKey>('lead');

  const phaseMockData: Record<PhaseKey, {
    title: string;
    badge: string;
    client: string;
    description: string;
    checklist: string[];
    actionLabel: string;
  }> = {
    lead: {
      title: 'Kitchen Remodel Front-Desk Consultation',
      badge: 'Capture & Qualify',
      client: 'Marcus & Elena Vance (Lumberton Branch)',
      description: 'Customer requested a full premium kitchen cabinet consultation in-store. ProSpaces automatically parses design wishes, assigns local kitchen sales rep, and triggers automated SMS intake checklists.',
      checklist: [
        'Cabinets: Solid Maple Shaker',
        'Countertops: Calacatta Quartz (2" edge)',
        'Site Measure Scheduled: June 5 at 10:00 AM',
        'Financing precheck: Approved'
      ],
      actionLabel: 'Convert to Design Quote'
    },
    estimate: {
      title: 'Structural Design & Material Estimation Takeoff',
      badge: 'CAD Estimating',
      client: 'Vance Residence — CAD ID #88941',
      description: 'Lumber and material lines auto-generated. Digital design drafts link with regional warehouse inventory to detect instant parts coverage and suggest local product alternatives for missing moldings.',
      checklist: [
        'Solid Maple units: 18 base boxes, 14 wall cabinets',
        'Molding & trim: 120 linear feet profile-301',
        'Material Waste buffer: Safely calculated at 8.5%',
        'Quote Margins locked: Healthy 44.2% Gross Profit'
      ],
      actionLabel: 'Submit Bid & Draft PO'
    },
    vendor: {
      title: 'Automated Supplier Special Purchase Order',
      badge: 'Procurement Sync',
      client: 'Purchase Order #PO_Vance_982',
      description: 'Because the specific Quartz slabs are special order items, ProSpaces submits the CAD specification XML directly to the vendor with target delivery dates sequentially locked ahead of construction.',
      checklist: [
        'Supplier: Granite & Quartz Express Hub',
        'XML Data Transfer status: Completed successfully',
        'Est. Arrival at Lumberton Depot: June 18',
        'Auto-alerts sent to Logistics team: Verified'
      ],
      actionLabel: 'Schedule Installation Crews'
    },
    install: {
      title: 'Certified Installer Subcontractor Assignment',
      badge: 'Dispatch & Install',
      client: 'Vance Kitchen Build — Crew #3 (Apex Builders)',
      description: 'The moment material shifts to "Received / In-Yard", ProSpaces triggers subcontractor dispatch. Crew views task lists, maps, and safety sign-offs directly inside their installer sandbox portal.',
      checklist: [
        'Subcontractor: Apex Cabinets & Construction',
        'Labor cost locked: Fixed $4,200 sequential fee',
        'Site safety permit: Signed online',
        'Interactive post-completion callback: Scheduled'
      ],
      actionLabel: 'Mark Project Completed & Cleaned'
    }
  };

  const currentPhaseData = phaseMockData[activePhase];

  return (
    <div
      className="min-h-screen bg-[#F8FAFC]"
      style={{
        background:
          'radial-gradient(circle at 10% 10%, rgba(30,111,217,0.1) 0%, transparent 40%), radial-gradient(circle at 90% 90%, rgba(77,163,255,0.08) 0%, transparent 40%), #F8FAFC',
        fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif'
      }}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:py-12">
        {/* Navigation Breadcrumb */}
        <button
          onClick={onBack}
          id="btn-back-main"
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 transition-all hover:shadow-sm hover:text-slate-900 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </button>

        {/* Hero Section */}
        <div className="mt-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-10">
          <div className="flex flex-col lg:flex-row items-center gap-10">
            {/* Header copy */}
            <div className="flex-1 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100/50 px-3 py-1 font-bold text-xs uppercase tracking-wider text-blue-700">
                <Store className="h-3.5 w-3.5" /> High-volume retail
              </div>
              <h1 className="text-3xl font-black tracking-tight text-[#002f5d] md:text-4xl leading-tight">
                Home Improvement Centres
              </h1>
              <p className="text-base text-slate-600 leading-relaxed">
                Unlock frictionless retail installation workflows. ProSpaces ties front-counter quote generation with supplier procurement systems, 3D design software, and on-site contractor installation scheduling.
              </p>
              <p className="text-sm font-semibold text-slate-500">
                No more paper estimating records, spreadsheet errors, or scheduling blindspots. Manage complex homeowner bids sequentially with real-time confidence.
              </p>
              
              {/* ROI banner */}
              <div className="pt-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {METRICS_CARDS.map((card, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-150 p-4 rounded-2xl text-center">
                      <p className="text-2xl font-black text-[#1E6FD9]">{card.val}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{card.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Illustration side */}
            <div className="w-full lg:w-[420px] shrink-0">
              <div className="relative rounded-2xl overflow-hidden border border-slate-100 shadow-md bg-slate-50 p-2">
                <img 
                  src="/images/home_center_workflow_1780423222767.png" 
                  alt="Home Improvement Centre Workflow" 
                  className="w-full h-auto rounded-xl object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 bg-[#1E6FD9]/90 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                  ProSpaces ERP Sync
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Value Pillars Cards */}
        <div className="mt-14 space-y-6">
          <h2 className="text-2xl font-extrabold text-[#002f5d] tracking-tight">
            Designed for Retail Estimators & Field Crews
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BENEFIT_PILLARS.map((col, idx) => (
              <div key={idx} className="bg-white border border-slate-100 p-6 rounded-2xl flex gap-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-[#1E6FD9] flex items-center justify-center shrink-0">
                  <col.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{col.title}</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">{col.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Feature Simulator */}
        <div className="mt-14 rounded-3xl border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
          <div className="max-w-2xl">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-widest">Interactive Sandbox Preview</span>
            <h2 className="text-2xl font-[#002f5d] font-black tracking-tight mt-1">
              Follow the Project Journey Sequentially
            </h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Trace how ProSpaces CRM guides kitchen, bath, and cabinet installations from showroom consultation all the way to complete project signature. Click below to experience each stage.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-2.5 border-b border-slate-100 pb-5">
            <button
              onClick={() => setActivePhase('lead')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activePhase === 'lead'
                  ? 'bg-[#1E6FD9] text-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-[#002f5d]'
              }`}
            >
              Step 1: Consultation
            </button>
            <button
              onClick={() => setActivePhase('estimate')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activePhase === 'estimate'
                  ? 'bg-[#1E6FD9] text-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-[#002f5d]'
              }`}
            >
              Step 2: CAD Pricing
            </button>
            <button
              onClick={() => setActivePhase('vendor')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activePhase === 'vendor'
                  ? 'bg-[#1E6FD9] text-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-[#002f5d]'
              }`}
            >
              Step 3: Supplier Order
            </button>
            <button
              onClick={() => setActivePhase('install')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activePhase === 'install'
                  ? 'bg-[#1E6FD9] text-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-[#002f5d]'
              }`}
            >
              Step 4: Dispatch Install
            </button>
          </div>

          {/* Render Active Phase details */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-8 bg-slate-50/50 p-6 rounded-2xl border border-dashed border-slate-200">
            {/* Left Side Details */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-100 text-[#1E6FD9] px-2.5 py-0.5 rounded-full">
                  {currentPhaseData.badge}
                </span>
                <span className="text-xs font-bold text-slate-400">Target Client Account</span>
              </div>
              <h3 className="text-lg font-black text-slate-800 leading-snug">
                {currentPhaseData.title}
              </h3>
              <p className="text-xs text-slate-500 font-semibold italic">Client Name: {currentPhaseData.client}</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                {currentPhaseData.description}
              </p>
              
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={onGetStarted}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#1E6FD9] hover:bg-[#155FBC] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <span>Build This Workflow</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10.5px] font-semibold text-slate-400">
                  Part of ProSpaces standard CRM suite
                </span>
              </div>
            </div>

            {/* Right Side Simulator Status */}
            <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-150 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4">ProSpaces Live Audit Ledger</span>
              <ul className="space-y-3.5">
                {currentPhaseData.checklist.map((item, key) => (
                  <li key={key} className="flex items-start gap-2.5 text-xs text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-[#1E6FD9] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-400 uppercase tracking-wider">Lead Status:</span>
                <span className="text-[#1E6FD9] flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#1E6FD9] animate-pulse"></span>
                  Active Step
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA Block */}
        <div className="mt-14 rounded-3xl bg-[#002f5d] p-8 md:p-12 text-center text-white relative overflow-hidden">
          {/* Subtle details background */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-300 via-blue-900 to-black"></div>
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Ready to Upgrade Your Center's Operations?
            </h2>
            <p className="text-sm text-blue-100 leading-relaxed">
              Equip your front-desk coordinators, material estimators, and project leads with the robust connected suite built especially for big physical projects.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto bg-[#1E6FD9] hover:bg-blue-600 px-7 py-3.5 rounded-xl font-bold text-sm text-white shadow-xl transition-all hover:-translate-y-0.5"
              >
                Start 14-Day Free Sandbox Trial
              </button>
              <button
                onClick={onBack}
                className="w-full sm:w-auto bg-white/10 hover:bg-white/15 px-6 py-3.5 rounded-xl font-semibold text-sm text-white border border-white/10 transition-all"
              >
                Explore Other Spaces
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
