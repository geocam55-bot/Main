import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Truck, MapPin, Scan, Layers3, Activity, ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';

import spaceInventorySvg from '../assets/landing/spaces/space-inventory.svg';

interface LogisticsSpaceInfoProps {
  onBack: () => void;
  onEnterSpace: () => void;
}

const LOGISTICS_FEATURES = [
  {
    icon: Truck,
    title: 'Fleet & Vehicle Control',
    titleDetail: 'Truck Specs & Specs Management',
    text: 'Manage commercial carrier specifications, VIN numbers, driver assignments, and maintenance logs in real-time.',
  },
  {
    icon: MapPin,
    title: 'GPS & Telemetry Map',
    titleDetail: 'Live Fleet Complete Integration',
    text: 'Track live truck positions, idling minutes, vehicle speed, and geofence boundary alerts across branches.',
  },
  {
    icon: Scan,
    title: 'Barcode Scan Station',
    titleDetail: 'Camera & OCR Invoice Scanning',
    text: 'Instant barcode lookup, pick and load verification, delivery photo capture, and customer signature capture.',
  },
  {
    icon: Layers3,
    title: 'Multi-Depot & Enterprise Hub',
    titleDetail: 'Store & DC Routing',
    text: 'Multi-tenant branch management, cross-dock logistics, cold storage flags, and customer delivery queues.',
  },
];

const LOGISTICS_KPIS = [
  { value: '99.8%', label: 'On-Time Delivery Rate' },
  { value: '15 sec', label: 'Telemetry Heartbeat' },
  { value: '100%', label: 'Proof-of-Delivery Audit' },
];

export function LogisticsSpaceInfo({ onBack, onEnterSpace }: LogisticsSpaceInfoProps) {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(circle at 12% 12%, rgba(59,130,246,0.15) 0%, transparent 38%), radial-gradient(circle at 88% 86%, rgba(37,99,235,0.16) 0%, transparent 42%), linear-gradient(180deg, #EFF6FF 0%, #F8FAFC 70%)',
      }}
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Spaces
        </button>

        <div className="mt-6 rounded-2xl border border-blue-200 bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Space Overview</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl flex items-center gap-3">
                <Truck className="h-8 w-8 text-blue-600" />
                Logistics & Fleet Space
              </h1>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Logistics & Fleet Space empowers commercial dispatchers, drivers, and depot managers with end-to-end delivery tracking, live GPS fleet telemetry, barcode scan stations, and multi-tenant warehouse distribution.
              </p>
              <p className="mt-3 text-sm font-medium text-slate-500">
                Fully integrated with ProSpaces CRM inventory, order dispatch, and enterprise tenant controls.
              </p>
            </div>

            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3 shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(37,99,235,0.13) 0%, rgba(29,78,216,0.16) 100%)',
                border: '1px solid rgba(37,99,235,0.26)',
              }}
            >
              <img src={spaceInventorySvg} alt="Logistics space icon" className="h-12 w-12 object-contain" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Fleet & Distribution</p>
                <p className="text-xs text-blue-700">Logistics operations workspace</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-blue-100 bg-blue-50/45 p-3 sm:grid-cols-3 sm:p-4">
            {LOGISTICS_KPIS.map((kpi) => (
              <div key={kpi.label} className="rounded-lg bg-white/85 p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-blue-700">{kpi.value}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{kpi.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {LOGISTICS_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm hover:border-blue-300 transition-all">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="text-xs font-medium text-blue-600 mt-0.5">{feature.titleDetail}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.text}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">How Logistics Space Integrates with ProSpaces CRM</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inventory Sync</p>
                <p className="mt-1 text-sm text-slate-700">Automatically sync pick lists, sales orders, and stock movements with ProSpaces inventory data.</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live Telemetry</p>
                <p className="mt-1 text-sm text-slate-700">Monitor driver locations, route progress, and vehicle health alerts on live interactive maps.</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Proof of Delivery</p>
                <p className="mt-1 text-sm text-slate-700">Capture signatures, invoice photos, and GPS timestamps for audit-ready fulfillment compliance.</p>
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
              className="rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all hover:brightness-105 cursor-pointer flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
            >
              <Truck className="h-4 w-4" />
              Open Logistics Workspace
            </button>
            <button
              onClick={onBack}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              Explore Other Spaces
            </button>
          </motion.div>
        </div>

        <footer className="mt-6 flex items-center justify-between px-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2">
            <Logo size="sm" />
          </span>
          <span>Logistics & Fleet Space Information</span>
        </footer>
      </div>
    </div>
  );
}
