import { motion } from 'motion/react';
import { ArrowLeft, Shield, Users, ScrollText, SlidersHorizontal } from 'lucide-react';
import { Logo } from './Logo';

import spaceITSvg from '../assets/landing/spaces/space-operations.svg';
import itHeroSvg from '../assets/landing/spaces/info-hero-it.svg';

interface ITSpaceInfoProps {
  onBack: () => void;
  onEnterSpace: () => void;
}

const IT_FEATURES = [
  {
    icon: Users,
    title: 'User and Role Governance',
    text: 'Control access by role, organization, and permission scope with clear accountability.',
  },
  {
    icon: Shield,
    title: 'Security Controls',
    text: 'Manage authentication posture, session policy, and admin protections from one place.',
  },
  {
    icon: ScrollText,
    title: 'Audit and Compliance Trail',
    text: 'Review system events and admin actions for operational transparency and review readiness.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Platform Operations',
    text: 'Handle configuration, billing controls, background jobs, and support tooling workflows.',
  },
];

const IT_KPIS = [
  { value: '54%', label: 'Faster Access Resolution' },
  { value: '100%', label: 'Audit Traceability' },
  { value: '35%', label: 'Lower Admin Overhead' },
];

export function ITSpaceInfo({ onBack, onEnterSpace }: ITSpaceInfoProps) {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(circle at 14% 12%, rgba(124,58,237,0.16) 0%, transparent 38%), radial-gradient(circle at 86% 86%, rgba(167,139,250,0.18) 0%, transparent 42%), linear-gradient(180deg, #F7F3FF 0%, #F8FAFC 70%)',
      }}
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Spaces
        </button>

        <div className="mt-6 rounded-2xl border border-violet-200 bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Space Overview</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">IT Space</h1>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                IT Space centralizes platform administration. It is where your team manages identity, security,
                governance, and system-level operations across the CRM.
              </p>
              <p className="mt-3 text-sm font-medium text-slate-500">
                Built for super admins and system operators who need secure, dependable control of the platform.
              </p>
            </div>

            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.14) 0%, rgba(167,139,250,0.17) 100%)',
                border: '1px solid rgba(124,58,237,0.26)',
              }}
            >
              <img src={spaceITSvg} alt="IT space icon" className="h-12 w-12 object-contain" />
              <div>
                <p className="text-sm font-semibold text-violet-900">Systems and Support</p>
                <p className="text-xs text-violet-700">Governance and control workspace</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-violet-100 bg-violet-50/45 p-3 sm:grid-cols-3 sm:p-4">
            {IT_KPIS.map((kpi) => (
              <div key={kpi.label} className="rounded-lg bg-white/85 p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-violet-700">{kpi.value}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{kpi.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 overflow-hidden rounded-xl border border-violet-200 bg-violet-50/45">
            <img src={itHeroSvg} alt="IT administration graphic" className="h-auto w-full object-cover" />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {IT_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-xl border border-violet-100 bg-white p-5 shadow-sm">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.text}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">How IT Space Supports Your CRM Flow</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Access Governance</p>
                <p className="mt-1 text-sm text-slate-700">Provision roles and space access so every user gets the right access, no more and no less.</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Security Oversight</p>
                <p className="mt-1 text-sm text-slate-700">Monitor policy posture, suspicious events, and admin actions with full audit continuity.</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Operational Control</p>
                <p className="mt-1 text-sm text-slate-700">Manage billing, jobs, and platform settings to keep CRM operations stable and scalable.</p>
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
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)' }}
            >
              Open IT Workspace
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
          <span>IT Space Information</span>
        </footer>
      </div>
    </div>
  );
}
