import { motion } from 'motion/react';
import { ArrowLeft, Megaphone, Mail, Filter, Users2 } from 'lucide-react';
import { Logo } from './Logo';

import spaceMarketingSvg from '../assets/landing/spaces/space-marketing.svg';
import marketingHeroSvg from '../assets/landing/spaces/info-hero-marketing.svg';

interface MarketingSpaceInfoProps {
  onBack: () => void;
  onEnterSpace: () => void;
}

const MARKETING_FEATURES = [
  {
    icon: Megaphone,
    title: 'Campaign Launchpad',
    text: 'Plan, build, and release segmented campaigns with consistent messaging across channels.',
  },
  {
    icon: Mail,
    title: 'Email and Journey Automation',
    text: 'Trigger follow-up sequences from lead actions to keep engagement moving without manual effort.',
  },
  {
    icon: Filter,
    title: 'Audience Segmentation',
    text: 'Target by source, profile, and engagement to improve relevance and conversion quality.',
  },
  {
    icon: Users2,
    title: 'Lead Funnel Tracking',
    text: 'Watch conversion flow from visitor to qualified lead to closed customer in one place.',
  },
];

const MARKETING_KPIS = [
  { value: '29%', label: 'More Qualified Leads' },
  { value: '2.1x', label: 'Campaign Visibility' },
  { value: '17%', label: 'Higher Conversion Rate' },
];

export function MarketingSpaceInfo({ onBack, onEnterSpace }: MarketingSpaceInfoProps) {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(circle at 14% 12%, rgba(225,29,72,0.16) 0%, transparent 38%), radial-gradient(circle at 86% 86%, rgba(249,115,22,0.17) 0%, transparent 42%), linear-gradient(180deg, #FFF4F6 0%, #F8FAFC 70%)',
      }}
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Spaces
        </button>

        <div className="mt-6 rounded-2xl border border-rose-200 bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">Space Overview</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Marketing Space</h1>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Marketing Space helps teams generate and convert demand. It connects campaigns, engagement metrics,
                and lead progression so marketing and sales stay aligned.
              </p>
              <p className="mt-3 text-sm font-medium text-slate-500">
                Built for marketing leaders, campaign operators, and growth teams who need measurable funnel performance.
              </p>
            </div>

            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: 'linear-gradient(135deg, rgba(225,29,72,0.13) 0%, rgba(249,115,22,0.16) 100%)',
                border: '1px solid rgba(225,29,72,0.25)',
              }}
            >
              <img src={spaceMarketingSvg} alt="Marketing space icon" className="h-12 w-12 object-contain" />
              <div>
                <p className="text-sm font-semibold text-rose-900">Campaigns and Leads</p>
                <p className="text-xs text-rose-700">Demand generation workspace</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-rose-100 bg-rose-50/45 p-3 sm:grid-cols-3 sm:p-4">
            {MARKETING_KPIS.map((kpi) => (
              <div key={kpi.label} className="rounded-lg bg-white/85 p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-rose-700">{kpi.value}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{kpi.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 overflow-hidden rounded-xl border border-rose-200 bg-rose-50/45">
            <img src={marketingHeroSvg} alt="Marketing campaign graphic" className="h-auto w-full object-cover" />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {MARKETING_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-xl border border-rose-100 bg-white p-5 shadow-sm">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.text}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">How Marketing Space Supports Your CRM Flow</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Audience Strategy</p>
                <p className="mt-1 text-sm text-slate-700">Segment contacts by profile and engagement so campaigns are targeted, not generic.</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Journey Execution</p>
                <p className="mt-1 text-sm text-slate-700">Automate follow-up journeys to move leads from awareness to intent with less manual effort.</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sales Alignment</p>
                <p className="mt-1 text-sm text-slate-700">Deliver better-qualified leads and campaign context directly into sales pipeline workflows.</p>
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
              style={{ background: 'linear-gradient(135deg, #E11D48 0%, #F97316 100%)' }}
            >
              Open Marketing Workspace
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
          <span>Marketing Space Information</span>
        </footer>
      </div>
    </div>
  );
}
