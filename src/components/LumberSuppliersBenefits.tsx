import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, DollarSign, Layers, Navigation, ArrowRight, Building2, Calculator, Settings } from 'lucide-react';

interface LumberSuppliersProps {
  onBack: () => void;
  onGetStarted: () => void;
}

const METRICS_CARDS = [
  { val: '+3.8%', label: 'Gross Profit Margin Increase' },
  { val: '90%', label: 'Shorter Blueprint Takeoff Times' },
  { val: '0%', label: 'Yard Inventory Shrinkage Alert' },
  { val: '22 min', label: 'Faster Flatbed Reload & Go' }
];

const BENEFIT_PILLARS = [
  {
    icon: DollarSign,
    title: 'Commodity Index Connection',
    details: 'Never quote old, underpriced rates during commodity swings. ProSpaces connects to daily material price index matrices (SPF, Doug Fir, OSB), updating quotes automatically.'
  },
  {
    icon: Calculator,
    title: 'Native Dimensional Calculations',
    details: 'Bid easily across dimensions. Manage, quote, and translate units seamlessly — buy bundles in board-measure feet, estimate lists in linear feet, and dispatch yard pick tickets in piece counts.'
  },
  {
    icon: Layers,
    title: 'Multi-Yard Open Stock Sync',
    details: 'Prevent inventory mismatch. Monitor physical items across multiple dry sheathing depots, treated racks, and open gravel stacks with exact geolocation map pins.'
  },
  {
    icon: Navigation,
    title: 'Integrated Banding & Loading slips',
    details: 'Coordinate picker tasks. Generate sequential loading slips grouped by drop-off sequence, weight allowances, and flatbed strap configurations.'
  }
];

type LumberGrade = 'utility' | 'framing' | 'premium';

export function LumberSuppliersBenefits({ onBack, onGetStarted }: LumberSuppliersProps) {
  const [lumberGrade, setLumberGrade] = useState<LumberGrade>('framing');
  const [wasteFactor, setWasteFactor] = useState<number>(10); // percent waste

  // Lumber dimensions price per board foot matrix
  const priceGrid: Record<LumberGrade, {
    gradeLabel: string;
    description: string;
    basePricePerBF: number; // board-foot price
    species: string;
  }> = {
    utility: {
      gradeLabel: 'Economy / Utility Grade',
      description: 'Standard bracing wood, crates, concrete forms, and utility framing uses.',
      basePricePerBF: 0.62,
      species: 'Spruce-Pine-Fir (SPF)'
    },
    framing: {
      gradeLabel: '#2 or Better Commercial Framing',
      description: 'High structural integrity lumber engineered for home building wall structures and load headers.',
      basePricePerBF: 0.88,
      species: 'Douglas Fir (Coastal Sourced)'
    },
    premium: {
      gradeLabel: 'Select Structural Premium Grade',
      description: 'Architectural visible elements, maximum durability, zero knots or pitch defects.',
      basePricePerBF: 1.45,
      species: 'Western Red Cedar / Select Douglas'
    }
  };

  const currentGrade = priceGrid[lumberGrade];

  // Mock dimensional list for a standard house framework calculation
  const projectTakeoffItems = [
    { label: '2x4 Studs - 10-foot lengths', pieces: 180, bfFactor: 6.67 },
    { label: '2x6 Joists - 16-foot structural rails', pieces: 90, bfFactor: 16.0 },
    { label: '2x10 Headers - 12-foot loading frames', pieces: 24, bfFactor: 20.0 },
    { label: '4x8 OSB Sheathing Board (1/2" thickness)', pieces: 85, bfFactor: 32.0 }
  ];

  // Calculate board measures
  const rawBoardFeet = projectTakeoffItems.reduce((acc, item) => {
    return acc + (item.pieces * item.bfFactor);
  }, 0);

  const totalBoardFeet = Math.round(rawBoardFeet * (1 + wasteFactor / 100));
  const rawLumberCost = totalBoardFeet * currentGrade.basePricePerBF;
  const deliverySurcharge = 285;
  const totalBidCost = Math.round(rawLumberCost + deliverySurcharge);
  const coreMarginPercentage = 38.5; // percent margins
  const targetDealerProfit = Math.round(totalBidCost * (coreMarginPercentage / 100));
  const totalBidPrice = totalBidCost + targetDealerProfit;

  return (
    <div
      className="min-h-screen bg-[#FFFDF9]"
      style={{
        background:
          'radial-gradient(circle at 10% 10%, rgba(217,123,30,0.08) 0%, transparent 40%), radial-gradient(circle at 90% 90%, rgba(249,115,22,0.06) 0%, transparent 40%), #FFFDF9',
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

        {/* Hero Banner Section */}
        <div className="mt-8 rounded-3xl border border-orange-100/50 bg-white p-6 shadow-sm sm:p-10">
          <div className="flex flex-col lg:flex-row items-center gap-10">
            {/* Left Column Content */}
            <div className="flex-1 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 border border-orange-100/50 px-3 py-1 font-bold text-xs uppercase tracking-wider text-orange-700">
                <Building2 className="h-3.5 w-3.5 text-orange-600" /> Building Materials Specialist
              </div>
              <h1 className="text-3xl font-black tracking-tight text-[#002f5d] md:text-4xl leading-tight">
                Lumber & Building Suppliers
              </h1>
              <p className="text-base text-slate-600 leading-relaxed">
                Connect the bidding table, the logistics coordinator desk, and the physical lumberyard. ProSpaces CRM handles volumetric item codes, manages structural commodity prices, and minimizes margin errors on every bundle.
              </p>
              <p className="text-sm font-semibold text-slate-500">
                Created to support timber sales reps, takeoff estimators, and yard managers. Lock bids instantly based on certified daily mill pricing logs.
              </p>

              {/* Stats Cards */}
              <div className="pt-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {METRICS_CARDS.map((card, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center">
                      <p className="text-2xl font-black text-orange-600">{card.val}</p>
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
                  src="/images/lumber_yard_estimator_1780423237551.png"
                  alt="Lumber Yard Estimation System Workflow"
                  className="w-full h-auto rounded-xl object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 bg-orange-600/90 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                  Mill Indices Integrated
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Value Cards */}
        <div className="mt-14 space-y-6">
          <h2 className="text-2xl font-extrabold text-[#002f5d] tracking-tight">
            Built-in Intelligence for Multi-Yard Operations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BENEFIT_PILLARS.map((col, idx) => (
              <div key={idx} className="bg-white border border-slate-100 p-6 rounded-2xl flex gap-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="h-12 w-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
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

        {/* Interactive Estimator Takeoff Calculator Sandbox */}
        <div className="mt-14 rounded-3xl border border-orange-100 bg-white p-6 md:p-8 shadow-sm">
          <div className="max-w-2xl">
            <span className="text-xs font-bold text-orange-600 uppercase tracking-widest">Pricing Formula Sandbox</span>
            <h2 className="text-2xl font-black text-[#002f5d] tracking-tight mt-1">
              Interactive Lumber Bid & takeoff Estimator
            </h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Test how ProSpaces handles linear conversions, grade adjustments, and profit formulas instantly during buyer negotiations. Select a structural timber grade to see the bid adjust dynamically.
            </p>
          </div>

          {/* Interactive selectors */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-100 pb-5">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">1. Select Wood Grade Sourcing</label>
              <div className="flex flex-col gap-2">
                {(['utility', 'framing', 'premium'] as LumberGrade[]).map((grade) => (
                  <button
                    key={grade}
                    onClick={() => setLumberGrade(grade)}
                    className={`px-4 py-2.5 rounded-xl text-left text-xs font-bold border transition-all ${
                      lumberGrade === grade
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-[#002f5d]'
                    }`}
                  >
                    <span>{priceGrid[grade].gradeLabel}</span>
                    <span className="block text-[10px] opacity-75 font-normal mt-0.5">${priceGrid[grade].basePricePerBF}/BF — {priceGrid[grade].species}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">2. Adjust Jobsite Waste Allowance</label>
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-150 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Waste Factor Threshold</span>
                  <span className="text-orange-600">{wasteFactor}% Extra Board-Measure</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="20"
                  step="1"
                  value={wasteFactor}
                  onChange={(e) => setWasteFactor(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="text-[11px] text-slate-500 leading-normal bg-white p-3 rounded-lg border border-slate-200">
                  <span className="font-semibold text-[#002f5d]">Dealer Tip:</span> High-wind locations require solid stud configurations. Setting waste to 12%-15% is recommended to protect material contingency budgets.
                </div>
              </div>
            </div>
          </div>

          {/* Simulator Calculations Table */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Takeoff Material Quantities List</span>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5">Item Description</th>
                      <th className="py-2.5 text-center">Qty Pieces</th>
                      <th className="py-2.5 text-center">Board Measure / Pc</th>
                      <th className="py-2.5 text-right">Total BF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {projectTakeoffItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5">{item.label}</td>
                        <td className="py-2.5 text-center font-bold text-slate-800">{item.pieces} pc</td>
                        <td className="py-2.5 text-center text-slate-500">{item.bfFactor} BF</td>
                        <td className="py-2.5 text-right font-bold text-slate-600">{Math.round(item.pieces * item.bfFactor)} BF</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-orange-50/25 p-4 rounded-xl border border-dashed border-orange-200 text-xs text-slate-600 flex justify-between items-center">
                <span>Calculated Total Wood Volume (With waste adjustment):</span>
                <span className="font-bold text-base text-orange-700">{totalBoardFeet.toLocaleString()} BF</span>
              </div>
            </div>

            {/* Calculations Panel */}
            <div className="lg:col-span-2 bg-[#FFFDF9] border border-orange-100 rounded-2xl p-5 shadow-sm space-y-4">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">ProSpaces Dealer Invoice formula</span>
              
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Lumber Base Cost ({totalBoardFeet.toLocaleString()} BF × ${currentGrade.basePricePerBF}):</span>
                  <span className="font-bold text-[#002f5d]">${Math.round(rawLumberCost).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Regional Heavy Flatbed Delivery Fee:</span>
                  <span className="font-bold text-slate-700">${deliverySurcharge}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Lumberyard Dealer Margin Allowance ({coreMarginPercentage}%):</span>
                  <span className="font-bold text-[#1E6FD9]">+${targetDealerProfit.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between text-sm">
                  <span className="font-black text-[#002f5d]">Total Contractor Contract Price:</span>
                  <span className="font-black text-orange-600 text-base">${totalBidPrice.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={onGetStarted}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>Build Quotation PDF</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Call Action Section */}
        <div className="mt-14 rounded-3xl bg-[#002f5d] p-8 md:p-12 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-400 via-[#002f5d] to-black"></div>
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Protect Every Board and Every Cent
            </h2>
            <p className="text-sm text-orange-100 leading-relaxed">
              Equip your yards, load foremen, truck dispatchers, and takeoff experts with structural CRM modules designed specifically for massive logistics workloads.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 px-7 py-3.5 rounded-xl font-bold text-sm text-white shadow-xl transition-all hover:-translate-y-0.5"
              >
                Launch Builder Workspace Sandbox
              </button>
              <button
                onClick={onBack}
                className="w-full sm:w-auto bg-white/10 hover:bg-white/15 px-6 py-3.5 rounded-xl font-semibold text-sm text-white border border-white/10 transition-all"
              >
                Compare Other Spaces
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
