import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, Award, ShieldAlert, CreditCard, Users, ArrowRight, Activity, Percent } from 'lucide-react';

interface ProDeskProps {
  onBack: () => void;
  onGetStarted: () => void;
}

const METRICS_CARDS = [
  { val: '35%', label: 'Faster Pro Bid Delivery' },
  { val: '18%', label: 'Loyalty Account LTV Growth' },
  { val: '99.2%', label: 'Billing & PO Invoicing Accuracy' },
  { val: '3 min', label: 'Pro Credit Pre-Approval Time' }
];

const BENEFIT_PILLARS = [
  {
    icon: Award,
    title: 'Multi-Tier Account Classing',
    details: 'Assign personalized price lists per contractor level. Home builders, framing subcontractors, and local handymen instantly pull their contract-pricing rows during quick quoting sessions.'
  },
  {
    icon: ShieldAlert,
    title: 'Instant Margin Guards',
    details: 'Protect team profits. If a desk rep manually discounts items past absolute brand margin allowances, ProSpaces flags it and locks the quote path until authorized by a desk manager.'
  },
  {
    icon: CreditCard,
    title: 'Live Commercial Credit Balances',
    details: 'Prevent unpaid risk. Real-time balance integration checks if builder account limits are cleared before releasing high-volume special delivery orders.'
  },
  {
    icon: Users,
    title: 'Builder Loyalty Sandbox',
    details: 'Give contractors autonomy. Let builders view active orders, request fast jobsite loads, review invoices, or sign off on design changes anywhere on their smartphones.'
  }
];

type ContractorTier = 'basic' | 'preferred' | 'executive';

export function ProDeskBenefits({ onBack, onGetStarted }: ProDeskProps) {
  const [activeTier, setActiveTier] = useState<ContractorTier>('preferred');

  const tierGrid: Record<ContractorTier, {
    label: string;
    multiplier: number; // multiplier of basic price
    credits: string;
    rebatePct: string;
    perk: string;
  }> = {
    basic: {
      label: 'Standard Builder Member',
      multiplier: 1.0,
      credits: '$5,000 credit limit',
      rebatePct: '0.5%',
      perk: 'Standard yard pick-up priority queue'
    },
    preferred: {
      label: 'Preferred Framing Subcontractor',
      multiplier: 0.90, // 10% off list price
      credits: '$45,000 credit limit',
      rebatePct: '2.0% annual volume rebate',
      perk: 'Priority Flatbed truck next-day deliveries'
    },
    executive: {
      label: 'Executive Custom Homebuilder',
      multiplier: 0.82, // 18% off list price
      credits: '$250,000 credit limit',
      rebatePct: '4.5% annual volume rebate',
      perk: 'Dedicated 24/7 key account assistant & customized loading slots'
    }
  };

  const currentTier = tierGrid[activeTier];

  // Material order package cost components
  const baseOrderItems = [
    { name: 'Sill Gaskets, Anchor Bolts, & Tie-Downs package', price: 950 },
    { name: 'Framing Douglas Wood Framing timber (Pack-12)', price: 4200 },
    { name: 'OSB Sheathing Structural subfloor board (Qty-120)', price: 3840 },
    { name: 'Engineered Laminated Floor I-Joists array', price: 6100 }
  ];

  const subtotalCost = baseOrderItems.reduce((acc, item) => acc + item.price, 0);
  const tierCost = Math.round(subtotalCost * currentTier.multiplier);
  const totalSavingsValue = subtotalCost - tierCost;

  return (
    <div
      className="min-h-screen bg-[#FDFEFE]"
      style={{
        background:
          'radial-gradient(circle at 10% 10%, rgba(99,102,241,0.08) 0%, transparent 40%), radial-gradient(circle at 90% 90%, rgba(124,58,237,0.06) 0%, transparent 40%), #FDFEFE',
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
        <div className="mt-8 rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm sm:p-10">
          <div className="flex flex-col lg:flex-row items-center gap-10">
            {/* Left Content Column */}
            <div className="flex-1 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100/50 px-3 py-1 font-bold text-xs uppercase tracking-wider text-indigo-700">
                <Users className="h-3.5 w-3.5 text-indigo-600" /> Pro Contractor Commercial desk
              </div>
              <h1 className="text-3xl font-black tracking-tight text-[#002f5d] md:text-4xl leading-tight">
                Pro Desk Sales Teams
              </h1>
              <p className="text-base text-slate-600 leading-relaxed">
                Empower your dedicated builder accounts division. ProSpaces CRM provides deep relationship visibility, customized tier pricing structures, instant credit verification, and robust mobile contractor tools in one rapid console.
              </p>
              <p className="text-sm font-semibold text-slate-500">
                Architected specifically for builders reps, commercial dispatch key managers, and pro credit analysts. Turn casual builders into permanent, loyal account-holding advocates.
              </p>

              {/* Stats Metrics Grid */}
              <div className="pt-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {METRICS_CARDS.map((card, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center">
                      <p className="text-2xl font-black text-indigo-600">{card.val}</p>
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
                  src="/images/pro_sales_portal_1780423252513.png"
                  alt="Pro Contractor Loyalty Builder Portal"
                  className="w-full h-auto rounded-xl object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 bg-indigo-600/95 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                  Loyalty Suite Connected
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Value Cards */}
        <div className="mt-14 space-y-6">
          <h2 className="text-2xl font-extrabold text-[#002f5d] tracking-tight">
            Advanced Controls for High-Volume B2B Sales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BENEFIT_PILLARS.map((col, idx) => (
              <div key={idx} className="bg-white border border-slate-100 p-6 rounded-2xl flex gap-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
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

        {/* Interactive Loyalty Level Sandbox */}
        <div className="mt-14 rounded-3xl border border-indigo-100 bg-white p-6 md:p-8 shadow-sm">
          <div className="max-w-2xl">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Multi-Tier Pricing Sandbox</span>
            <h2 className="text-2xl font-black text-[#002f5d] tracking-tight mt-1">
              Test Builder Account Tier Pricing Formulas
            </h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Experience the automated pricing engine of ProSpaces. Toggle between different commercial account loyalty classes to witness margins, credits, and pricing discounts recalculate in real time.
            </p>
          </div>

          {/* Interactive Selectors Tabs */}
          <div className="mt-8 flex flex-col md:flex-row gap-3 border-b border-slate-100 pb-5">
            {(['basic', 'preferred', 'executive'] as ContractorTier[]).map((tier) => (
              <button
                key={tier}
                onClick={() => setActiveTier(tier)}
                className={`flex-1 px-5 py-4 rounded-2xl border text-left transition-all ${
                  activeTier === tier
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                    : 'border-slate-150 hover:bg-slate-50 text-[#002f5d]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider block">{tierGrid[tier].label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTier === tier ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'}`}>
                    {(100 - (tierGrid[tier].multiplier * 100)).toFixed(0)}% Discount
                  </span>
                </div>
                <span className="block text-xs font-medium opacity-80 mt-2">{tierGrid[tier].credits}</span>
              </button>
            ))}
          </div>

          {/* Table list */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Pro Commercial Frame pack order #8841-A</span>
              <div className="divide-y divide-slate-100 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                {baseOrderItems.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between text-xs font-semibold text-slate-600">
                    <span>{item.name}</span>
                    <span className="text-slate-500">${item.price.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="bg-indigo-50/20 p-5 rounded-xl border border-dashed border-indigo-200 text-xs text-slate-600 space-y-2">
                <div className="flex justify-between items-center font-bold">
                  <span>Standard Non-Member Quote Subtotal:</span>
                  <span className="text-slate-500 line-through">${subtotalCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-indigo-700 font-extrabold text-sm">
                  <span>Active Member Tier Savings:</span>
                  <span>-${totalSavingsValue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Calculations Status Box */}
            <div className="lg:col-span-2 bg-[#F9FAFC] border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Pro Desk CRM Ledger Verification</span>
              
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-medium">Auto-Approved Limit:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">✓ {currentTier.credits}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-medium">Rebate Eligibility:</span>
                  <span className="font-bold text-slate-700">{currentTier.rebatePct}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-medium">Logistic Dispatch Priority:</span>
                  <span className="font-bold text-[#1E6FD9]">{currentTier.perk}</span>
                </div>
                <div className="pt-2 flex justify-between text-sm font-black">
                  <span className="text-[#002f5d]">Total Contractor Cost:</span>
                  <span className="text-indigo-600 text-base">${tierCost.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-3">
                <button
                  onClick={onGetStarted}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>Approve & Sync Account</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA Card */}
        <div className="mt-14 rounded-3xl bg-[#002f5d] p-8 md:p-12 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-400 via-[#002f5d] to-black"></div>
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Scale Your Pro Desk Account Volumes
            </h2>
            <p className="text-sm text-indigo-100 leading-relaxed">
              Equip your accounts reps with elite commercial CRM tools built especially to coordinate massive enterprise volume budgets.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 px-7 py-3.5 rounded-xl font-bold text-sm text-white shadow-xl transition-all hover:-translate-y-0.5"
              >
                Sign Up For Pro Desk Account Sandbox
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
