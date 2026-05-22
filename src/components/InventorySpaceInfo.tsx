import { motion } from 'motion/react';
import { ArrowLeft, Boxes, AlertTriangle, Barcode, Truck } from 'lucide-react';
import { Logo } from './Logo';

import spaceInventorySvg from '../assets/landing/spaces/space-inventory.svg';
import inventoryHeroSvg from '../assets/landing/spaces/info-hero-inventory.svg';

interface InventorySpaceInfoProps {
  onBack: () => void;
  onEnterSpace: () => void;
}

const INVENTORY_FEATURES = [
  {
    icon: Boxes,
    title: 'Live Stock Visibility',
    text: 'Track quantity on hand by SKU, category, and location with one shared source of truth.',
  },
  {
    icon: AlertTriangle,
    title: 'Low-Stock Alerts',
    text: 'Automatically flag reorder risks before they become fulfillment problems for project teams.',
  },
  {
    icon: Barcode,
    title: 'SKU and Pricing Control',
    text: 'Manage product metadata, pricing tiers, and units with cleaner catalog consistency.',
  },
  {
    icon: Truck,
    title: 'Procurement Readiness',
    text: 'Support better purchasing decisions with visibility into usage trends and projected demand.',
  },
];

const INVENTORY_KPIS = [
  { value: '41%', label: 'Fewer Stockouts' },
  { value: '27%', label: 'Faster Reordering' },
  { value: '99.2%', label: 'SKU Accuracy' },
];

export function InventorySpaceInfo({ onBack, onEnterSpace }: InventorySpaceInfoProps) {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(circle at 12% 12%, rgba(16,185,129,0.15) 0%, transparent 38%), radial-gradient(circle at 88% 86%, rgba(20,184,166,0.16) 0%, transparent 42%), linear-gradient(180deg, #ECFDF5 0%, #F8FAFC 70%)',
      }}
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Spaces
        </button>

        <div className="mt-6 rounded-2xl border border-emerald-200 bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Space Overview</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Inventory Space</h1>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Inventory Space keeps your product operations accurate and responsive. It helps your team control stock,
                pricing, and replenishment so jobs are not delayed by missing materials.
              </p>
              <p className="mt-3 text-sm font-medium text-slate-500">
                Built for purchasing teams, operations managers, and warehouse coordinators who need reliable stock decisions.
              </p>
            </div>

            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.13) 0%, rgba(20,184,166,0.16) 100%)',
                border: '1px solid rgba(16,185,129,0.26)',
              }}
            >
              <img src={spaceInventorySvg} alt="Inventory space icon" className="h-12 w-12 object-contain" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">Products and Stock</p>
                <p className="text-xs text-emerald-700">Inventory operations workspace</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-emerald-100 bg-emerald-50/45 p-3 sm:grid-cols-3 sm:p-4">
            {INVENTORY_KPIS.map((kpi) => (
              <div key={kpi.label} className="rounded-lg bg-white/85 p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-emerald-700">{kpi.value}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{kpi.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/45">
            <img src={inventoryHeroSvg} alt="Inventory dashboard graphic" className="h-auto w-full object-cover" />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {INVENTORY_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.text}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">How Inventory Space Supports Your CRM Flow</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Catalog Control</p>
                <p className="mt-1 text-sm text-slate-700">Standardize SKU, units, and pricing logic before product data spreads across teams.</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stock Monitoring</p>
                <p className="mt-1 text-sm text-slate-700">Use low-stock thresholds and trend views to catch supply risk before project impact.</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Procurement Handoff</p>
                <p className="mt-1 text-sm text-slate-700">Feed purchase planning and operations scheduling with cleaner, current inventory data.</p>
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
              style={{ background: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)' }}
            >
              Open Inventory Workspace
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
          <span>Inventory Space Information</span>
        </footer>
      </div>
    </div>
  );
}
