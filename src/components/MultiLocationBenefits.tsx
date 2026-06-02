import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, ShieldAlert, MapPin, Truck, Compass, ArrowRight, Table, BarChart3, Database } from 'lucide-react';

interface MultiLocationProps {
  onBack: () => void;
  onGetStarted: () => void;
}

const METRICS_CARDS = [
  { val: '15%', label: 'Fuel Expense Savings' },
  { val: '100%', label: 'Shared Stock Transfer Tracking' },
  { val: '1.2s', label: 'Cross-Depot Query Retrials' },
  { val: 'SSO', label: 'Enterprise Security Native' }
];

const BENEFIT_PILLARS = [
  {
    icon: Compass,
    title: 'Inter-Branch Inventory Sourcing',
    details: 'Never lose a builder contract to temporary local shortages. Check stock counts across all regional depots instantly, request secure yard transfers, and lock items in 3 clicks.'
  },
  {
    icon: Truck,
    title: 'Shared Flatbed Fleet Dispatch',
    details: 'Coordinate regional logistics seamlessly. Group and route bulky crane, boom, and flatbed trucks across branches with automated texting to dispatchers and site supervisors.'
  },
  {
    icon: BarChart3,
    title: 'Consolidated Regional Analytics',
    details: 'Stop manually updating spreadsheets. Roll up sales, margins, open estimates, and logistics output automatically to a stunning corporate hub with detailed drilldowns.'
  },
  {
    icon: ShieldAlert,
    title: 'Enterprise Access Permissions',
    details: 'Keep data secure. Enable single sign-on (SSO), manage branch access, audit transactions, and lock yard edits per role to secure financial transparency.'
  }
];

type DepotKey = 'central' | 'east' | 'west';

export function MultiLocationBenefits({ onBack, onGetStarted }: MultiLocationProps) {
  const [activeDepot, setActiveDepot] = useState<DepotKey>('central');

  const depotsGrid: Record<DepotKey, {
    label: string;
    location: string;
    fleet: string;
    stockLevel: string;
    drywallQty: number;
    framingQty: number;
    shinglesQty: number;
  }> = {
    central: {
      label: 'Main Central Hub Distribution Depot',
      location: 'Industrial Parkway Sector 4',
      fleet: '8 Flatbeds, 3 Boom Trucks, 2 Picker Units',
      stockLevel: 'Optimal Coverage (94.2% cataloged)',
      drywallQty: 11200,
      framingQty: 24500,
      shinglesQty: 3200
    },
    east: {
      label: 'East Regional Showroom Lumberyard',
      location: 'Route-12 Crossing Interchange',
      fleet: '2 Flatbeds, 1 Boom Truck',
      stockLevel: 'Low Drywall stock (Action Needed!)',
      drywallQty: 150,
      framingQty: 8400,
      shinglesQty: 1100
    },
    west: {
      label: 'West Coast Supply Depot & Mill Yard',
      location: 'Harbor Freight Ship Port Terminal A',
      fleet: '4 Heavy Flatbeds, 2 Cranes',
      stockLevel: 'Satisfactory Coverage (81.0% cataloged)',
      drywallQty: 4800,
      framingQty: 19200,
      shinglesQty: 950
    }
  };

  const currentDepot = depotsGrid[activeDepot];

  return (
    <div
      className="min-h-screen bg-[#F4FAF8]"
      style={{
        background:
          'radial-gradient(circle at 10% 10%, rgba(16,185,129,0.08) 0%, transparent 40%), radial-gradient(circle at 90% 90%, rgba(20,184,166,0.06) 0%, transparent 40%), #F4FAF8',
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

        {/* Hero Section Banner */}
        <div className="mt-8 rounded-3xl border border-teal-100/50 bg-white p-6 shadow-sm sm:p-10">
          <div className="flex flex-col lg:flex-row items-center gap-10">
            {/* Left Content Column */}
            <div className="flex-1 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 border border-teal-150 px-3 py-1 font-bold text-xs uppercase tracking-wider text-teal-700">
                <MapPin className="h-3.5 w-3.5 text-teal-600" /> Enterprise Logistics & Supply Chain
              </div>
              <h1 className="text-3xl font-black tracking-tight text-[#002f5d] md:text-4xl leading-tight">
                Multi-Location Operations
              </h1>
              <p className="text-base text-slate-600 leading-relaxed">
                Connect your business holdings, lumber yards, and distribution depots into a single synchronized system. ProSpaces CRM provides multi-warehouse stock visibility, integrated transfer tickets, and shared regional logistics tracking.
              </p>
              <p className="text-sm font-semibold text-slate-500">
                Designed to support regional managers, logistics vice presidents, dispatchers, and corporate teams. Maintain complete operational visibility across all branches simultaneously.
              </p>

              {/* Stats Metrics Grid */}
              <div className="pt-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {METRICS_CARDS.map((card, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center">
                      <p className="text-2xl font-black text-teal-600">{card.val}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{card.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column Illustration */}
            <div className="w-full lg:w-[420px] shrink-0">
              <div className="relative rounded-2xl overflow-hidden border border-slate-100 shadow-md bg-slate-50 p-2">
                <img
                  src="/images/multi_depot_dispatcher_1780423267159.png"
                  alt="Multi Location Logistics Regional Mapping"
                  className="w-full h-auto rounded-xl object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 bg-teal-600/90 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                  Active Regional Grid
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Value Cards */}
        <div className="mt-14 space-y-6">
          <h2 className="text-2xl font-extrabold text-[#002f5d] tracking-tight">
            Advanced Regional Infrastructure Controls
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BENEFIT_PILLARS.map((col, idx) => (
              <div key={idx} className="bg-white border border-slate-100 p-6 rounded-2xl flex gap-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
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

        {/* Interactive Logistics Depot Sandbox */}
        <div className="mt-14 rounded-3xl border border-teal-100 bg-white p-6 md:p-8 shadow-sm">
          <div className="max-w-2xl">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">Regional Network Sandbox</span>
            <h2 className="text-2xl font-black text-[#002f5d] tracking-tight mt-1">
              Cross-Yard Stock & Dispatch Simulator
            </h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Test how regional supply chain systems coordinate in ProSpaces. Click different depots to view local inventory counts, active delivery fleet statuses, and handle shared stock allocations instantly.
            </p>
          </div>

          {/* Interactive Selectors Tabs */}
          <div className="mt-8 flex flex-col md:flex-row gap-3 border-b border-slate-100 pb-5 font-bold">
            {(['central', 'east', 'west'] as DepotKey[]).map((depot) => (
              <button
                key={depot}
                onClick={() => setActiveDepot(depot)}
                className={`flex-1 px-4 py-3.5 rounded-xl border text-left text-xs transition-all ${
                  activeDepot === depot
                    ? 'bg-teal-600 border-teal-600 text-white shadow-md'
                    : 'border-slate-150 hover:bg-slate-50 text-[#002f5d]'
                }`}
              >
                <span>{depotsGrid[depot].label}</span>
                <span className="block text-[10px] opacity-75 font-normal mt-1">Location: {depotsGrid[depot].location}</span>
              </button>
            ))}
          </div>

          {/* Multi Depot Calculations & Lists */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Stock List table */}
            <div className="lg:col-span-3 space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Yard Stock Allocations</span>
              <div className="bg-slate-50/50 border border-slate-150 p-4 rounded-xl space-y-3.5 text-xs text-slate-700">
                {/* Drywall */}
                <div className="flex items-center justify-between font-medium">
                  <span className="flex items-center gap-1.5 font-bold"><Table className="h-4 w-4 text-teal-600 shrink-0" /> 1/2" Regular Gypsum Drywall Panels:</span>
                  <span className={`font-bold ${currentDepot.drywallQty < 500 ? 'text-red-500 font-black' : 'text-slate-800'}`}>
                    {currentDepot.drywallQty.toLocaleString()} Sheets
                  </span>
                </div>
                {/* Framing Lumber */}
                <div className="flex items-center justify-between font-medium">
                  <span className="flex items-center gap-1.5 font-bold"><Database className="h-4 w-4 text-teal-600 shrink-0" /> 2" x 4" Framing Lumber (Spruce Pack):</span>
                  <span className="font-bold text-slate-800">{currentDepot.framingQty.toLocaleString()} BF</span>
                </div>
                {/* Shingles */}
                <div className="flex items-center justify-between font-medium">
                  <span className="flex items-center gap-1.5 font-bold"><Compass className="h-4 w-4 text-teal-600 shrink-0" /> Asphalt Architectural Roofing Shingles:</span>
                  <span className="font-bold text-slate-800">{currentDepot.shinglesQty.toLocaleString()} Bundles</span>
                </div>
              </div>

              {activeDepot === 'east' && (
                <div className="p-4 bg-red-50 border border-dashed border-red-200 rounded-xl text-xs text-red-700 space-y-2">
                  <p className="font-bold">⚠️ Regional Drywall Alert detected on East Branch!</p>
                  <p className="text-[11.5px] leading-relaxed">East Showroom is virtually empty of Gypsum Panels. Select "Central Hub" or "West Coast Mill Yard" to request a direct transfer ticket.</p>
                </div>
              )}
            </div>

            {/* Active fleet status */}
            <div className="lg:col-span-2 bg-[#F9FAFC] border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4 text-xs font-semibold">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active Fleet Allocation</span>
              
              <div className="space-y-3 border-b border-slate-100 pb-3">
                <div className="flex justify-between items-start">
                  <span className="text-slate-500 font-medium">Standard Fleet Fleet:</span>
                  <span className="text-slate-800 font-bold text-right text-[11px] leading-tight max-w-[150px]">{currentDepot.fleet}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Yard Database status:</span>
                  <span className="text-teal-600 font-bold">✓ {currentDepot.stockLevel}</span>
                </div>
              </div>

              <div className="pt-2 text-slate-500 leading-normal font-medium text-[11px]">
                <strong className="text-teal-700">Supply Chain Rule:</strong> Standard automated transfer trucks load every Tuesday and Thursday to balance system inventory margins.
              </div>

              <div className="pt-2">
                <button
                  onClick={onGetStarted}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>Build Logistics Workflow</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA Block */}
        <div className="mt-14 rounded-3xl bg-[#002f5d] p-8 md:p-12 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-400 via-[#002f5d] to-black"></div>
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Unify Your Regional Holdings
            </h2>
            <p className="text-sm text-teal-150 leading-relaxed">
              Eliminate system silos, double entry errors, and load delays with the high-performance enterprise supply suite built exclusively for complex operations.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 px-7 py-3.5 rounded-xl font-bold text-sm text-white shadow-xl transition-all hover:-translate-y-0.5"
              >
                Sign Up For Logistics Sandbox
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
