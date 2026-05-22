import { motion } from 'motion/react';
import { ArrowLeft, Users, Target, CalendarClock, ChartNoAxesColumn } from 'lucide-react';
import { Logo } from './Logo';

import spaceSalesSvg from '../assets/landing/spaces/space-sales.svg';
import salesHeroSvg from '../assets/landing/spaces/info-hero-sales.svg';

interface SalesSpaceInfoProps {
  onBack: () => void;
  onEnterSpace: () => void;
}

const SALES_FEATURES = [
  {
    icon: Users,
    title: 'Contact Intelligence',
    text: 'Keep homeowner, builder, and partner profiles in one place with timeline history, notes, and next steps.',
  },
  {
    icon: Target,
    title: 'Deal Pipeline',
    text: 'Track every opportunity from first call to signed agreement with clear stage ownership and values.',
  },
  {
    icon: CalendarClock,
    title: 'Follow-Up Engine',
    text: 'Automate reminders and task queues so your team never misses callbacks, site visits, or proposal deadlines.',
  },
  {
    icon: ChartNoAxesColumn,
    title: 'Revenue Visibility',
    text: 'Monitor win rates, forecast value, and rep performance with live pipeline analytics.',
  },
];

const SALES_KPIS = [
  { value: '32%', label: 'Faster Follow-Up' },
  { value: '18%', label: 'Higher Win Rate' },
  { value: '2.4x', label: 'Pipeline Visibility' },
];

export function SalesSpaceInfo({ onBack, onEnterSpace }: SalesSpaceInfoProps) {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(circle at 12% 12%, rgba(30,111,217,0.15) 0%, transparent 38%), radial-gradient(circle at 88% 86%, rgba(14,165,233,0.16) 0%, transparent 42%), linear-gradient(180deg, #F3F8FF 0%, #F8FAFC 70%)',
      }}
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Spaces
        </button>

        <div className="mt-6 rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Space Overview</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Sales Space</h1>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Sales Space is your command center for relationships and revenue. It connects contacts, opportunities,
                and follow-up workflows so your team can move deals forward with consistency.
              </p>
              <p className="mt-3 text-sm font-medium text-slate-500">
                Built for sales reps, account managers, and team leads who need cleaner execution from first touch to closed deal.
              </p>
            </div>

            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: 'linear-gradient(135deg, rgba(30,111,217,0.12) 0%, rgba(77,163,255,0.14) 100%)',
                border: '1px solid rgba(30,111,217,0.22)',
              }}
            >
              <img src={spaceSalesSvg} alt="Sales space icon" className="h-12 w-12 object-contain" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Opportunities & Contacts</p>
                <p className="text-xs text-blue-700">Pipeline execution workspace</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-blue-100 bg-blue-50/45 p-3 sm:grid-cols-3 sm:p-4">
            {SALES_KPIS.map((kpi) => (
              <div key={kpi.label} className="rounded-lg bg-white/85 p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-blue-700">{kpi.value}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{kpi.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 overflow-hidden rounded-xl border border-blue-100 bg-blue-50/35">
            <img src={salesHeroSvg} alt="Sales pipeline graphic" className="h-auto w-full object-cover" />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {SALES_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.text}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">How Sales Space Supports Your CRM Flow</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lead Intake</p>
                <p className="mt-1 text-sm text-slate-700">Capture inbound leads and route ownership by region, product, or account tier.</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pipeline Control</p>
                <p className="mt-1 text-sm text-slate-700">Standardize stages and exit criteria so every rep runs the same playbook.</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Close + Handoff</p>
                <p className="mt-1 text-sm text-slate-700">Hand won deals to design and operations with scope, contacts, and notes intact.</p>
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
              style={{ background: 'linear-gradient(135deg, #1E6FD9 0%, #4DA3FF 100%)' }}
            >
              Open Sales Workspace
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
          <span>Sales Space Information</span>
        </footer>
      </div>
    </div>
  );
}
