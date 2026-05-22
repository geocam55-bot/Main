import { motion } from 'motion/react';
import { ArrowLeft, Ruler, PackageSearch, FileSpreadsheet, Sparkles } from 'lucide-react';
import { Logo } from './Logo';

import spaceBuildSvg from '../assets/landing/spaces/space-build.svg';
import designHeroSvg from '../assets/landing/spaces/info-hero-build.svg';

interface DesignSpaceInfoProps {
  onBack: () => void;
  onEnterSpace: () => void;
}

const DESIGN_FEATURES = [
  {
    icon: Ruler,
    title: 'Guided Project Wizards',
    text: 'Walk teams through deck, garage, shed, and kitchen project setup with structured inputs and fewer misses.',
  },
  {
    icon: PackageSearch,
    title: 'Material-Aware Design',
    text: 'Generate realistic material needs directly from design dimensions so estimates are grounded in real quantities.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Bid-Ready Outputs',
    text: 'Turn design configurations into quote-ready summaries your sales and operations teams can use immediately.',
  },
  {
    icon: Sparkles,
    title: 'Faster Iteration',
    text: 'Quickly test options, compare versions, and present customers with clearer choices to reduce cycle time.',
  },
];

export function DesignSpaceInfo({ onBack, onEnterSpace }: DesignSpaceInfoProps) {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(circle at 12% 14%, rgba(249,115,22,0.15) 0%, transparent 38%), radial-gradient(circle at 88% 86%, rgba(234,179,8,0.16) 0%, transparent 42%), #FFFBEB',
      }}
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Spaces
        </button>

        <div className="mt-6 rounded-2xl border border-orange-200 bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">Space Overview</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Design Space</h1>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Design Space powers your project scoping workflow. It helps your team configure jobs, size materials,
                and produce cleaner estimates before work begins.
              </p>
            </div>

            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: 'linear-gradient(135deg, rgba(217,123,30,0.13) 0%, rgba(255,179,71,0.16) 100%)',
                border: '1px solid rgba(217,123,30,0.26)',
              }}
            >
              <img src={spaceBuildSvg} alt="Design space icon" className="h-12 w-12 object-contain" />
              <div>
                <p className="text-sm font-semibold text-orange-900">Projects and Bids</p>
                <p className="text-xs text-orange-700">Scoping to estimate flow</p>
              </div>
            </div>
          </div>

          <div className="mt-7 overflow-hidden rounded-xl border border-orange-200 bg-amber-50/45">
            <img src={designHeroSvg} alt="Design and material estimate graphic" className="h-auto w-full object-cover" />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {DESIGN_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.text}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-xl border border-orange-100 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">How Design Space Fits the CRM</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Scope Intake</p>
                <p className="mt-1 text-sm text-slate-700">Capture dimensions and project constraints early to avoid estimation drift.</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Material Plan</p>
                <p className="mt-1 text-sm text-slate-700">Generate quantities and line items that can feed inventory and quoting workflows.</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Sales Handoff</p>
                <p className="mt-1 text-sm text-slate-700">Deliver quote-ready details back to Sales Space with less manual re-entry.</p>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <button
              onClick={onEnterSpace}
              className="rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all hover:brightness-105"
              style={{ background: 'linear-gradient(135deg, #D97B1E 0%, #FFB347 100%)' }}
            >
              Enter ProSpaces
            </button>
            <button
              onClick={onBack}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Explore Other Spaces
            </button>
          </motion.div>
        </div>

        <footer className="mt-6 flex items-center justify-between px-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2">
            <Logo size="sm" />
          </span>
          <span>Design Space Information</span>
        </footer>
      </div>
    </div>
  );
}
