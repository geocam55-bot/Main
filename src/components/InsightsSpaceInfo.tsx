import { motion } from 'motion/react';
import { ArrowLeft, LineChart, BarChart3, TrendingUp, Gauge } from 'lucide-react';
import { Logo } from './Logo';

import spaceInsightsSvg from '../assets/landing/spaces/space-insights.svg';
import insightsHeroSvg from '../assets/landing/spaces/info-hero-insights.svg';

interface InsightsSpaceInfoProps {
  onBack: () => void;
  onEnterSpace: () => void;
}

const INSIGHTS_FEATURES = [
  {
    icon: LineChart,
    title: 'Executive Dashboards',
    text: 'Track business health with centralized views for revenue, pipeline movement, and conversion trends.',
  },
  {
    icon: BarChart3,
    title: 'Performance Analytics',
    text: 'Compare team and rep output with clearer attribution across opportunities and outcomes.',
  },
  {
    icon: TrendingUp,
    title: 'Forecast Confidence',
    text: 'Use pipeline signals to project likely outcomes and identify risk areas before quarter close.',
  },
  {
    icon: Gauge,
    title: 'Operational KPIs',
    text: 'Monitor velocity, cycle times, and target attainment to guide faster decision-making.',
  },
];

const INSIGHTS_KPIS = [
  { value: '22%', label: 'Better Forecast Accuracy' },
  { value: '31%', label: 'Faster Decision Cycles' },
  { value: '4.1x', label: 'Revenue Clarity' },
];

export function InsightsSpaceInfo({ onBack, onEnterSpace }: InsightsSpaceInfoProps) {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(circle at 12% 14%, rgba(27,143,166,0.16) 0%, transparent 38%), radial-gradient(circle at 88% 84%, rgba(79,195,224,0.17) 0%, transparent 42%), linear-gradient(180deg, #EEF9FF 0%, #F8FAFC 70%)',
      }}
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Spaces
        </button>

        <div className="mt-6 rounded-2xl border border-sky-200 bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Space Overview</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Insights Space</h1>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Insights Space turns CRM activity into decision-ready intelligence. It gives leaders a clear read on what
                is working, where risk is building, and where to invest next.
              </p>
              <p className="mt-3 text-sm font-medium text-slate-500">
                Built for executives, sales managers, and operators who need reliable signals for planning and performance.
              </p>
            </div>

            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: 'linear-gradient(135deg, rgba(27,143,166,0.13) 0%, rgba(79,195,224,0.16) 100%)',
                border: '1px solid rgba(27,143,166,0.25)',
              }}
            >
              <img src={spaceInsightsSvg} alt="Insights space icon" className="h-12 w-12 object-contain" />
              <div>
                <p className="text-sm font-semibold text-sky-900">Reports and Analytics</p>
                <p className="text-xs text-sky-700">Intelligence and forecasting workspace</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-sky-100 bg-sky-50/45 p-3 sm:grid-cols-3 sm:p-4">
            {INSIGHTS_KPIS.map((kpi) => (
              <div key={kpi.label} className="rounded-lg bg-white/85 p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-sky-700">{kpi.value}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{kpi.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 overflow-hidden rounded-xl border border-sky-200 bg-sky-50/45">
            <img src={insightsHeroSvg} alt="Analytics dashboard graphic" className="h-auto w-full object-cover" />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {INSIGHTS_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-xl border border-sky-100 bg-white p-5 shadow-sm">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.text}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">How Insights Space Supports Your CRM Flow</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Signal Collection</p>
                <p className="mt-1 text-sm text-slate-700">Pull opportunities, activity, and outcomes into one reporting foundation.</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Performance Analysis</p>
                <p className="mt-1 text-sm text-slate-700">Compare funnel health, stage velocity, and rep output with consistent definitions.</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Action Planning</p>
                <p className="mt-1 text-sm text-slate-700">Turn metrics into concrete priorities for sales, operations, and leadership reviews.</p>
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
              style={{ background: 'linear-gradient(135deg, #1B8FA6 0%, #4FC3E0 100%)' }}
            >
              Open Insights Workspace
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
          <span>Insights Space Information</span>
        </footer>
      </div>
    </div>
  );
}
