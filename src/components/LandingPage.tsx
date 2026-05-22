import { useState } from 'react';
import { Logo } from './Logo';
import { ModuleDetail } from './ModuleDetail';
import { About } from './About';
import { SalesSpaceInfo } from './SalesSpaceInfo';
import { DesignSpaceInfo } from './DesignSpaceInfo';
import { InventorySpaceInfo } from './InventorySpaceInfo';
import { InsightsSpaceInfo } from './InsightsSpaceInfo';
import { MarketingSpaceInfo } from './MarketingSpaceInfo';
import { ITSpaceInfo } from './ITSpaceInfo';
import { motion } from 'motion/react';
import { Info, ChevronRight } from 'lucide-react';

/* ── Image Asset Imports ── */
import spaceSalesSvg from '../assets/landing/spaces/space-sales.svg';
import spaceBuildSvg from '../assets/landing/spaces/space-build.svg';
import spaceOperationsSvg from '../assets/landing/spaces/space-operations.svg';
import spaceInsightsSvg from '../assets/landing/spaces/space-insights.svg';
import spaceInventorySvg from '../assets/landing/spaces/space-inventory.svg';
import spaceMarketingSvg from '../assets/landing/spaces/space-marketing.svg';
import salesSpaceBg from '../assets/landing/spaces/sales-space-bg.png';

import iconHomeCenters from '../assets/landing/icons/icon-home-centers.svg';
import iconLumberYards from '../assets/landing/icons/icon-lumber-yards.svg';
import iconProDesk from '../assets/landing/icons/icon-pro-desk.svg';
import iconMultiLocation from '../assets/landing/icons/icon-multi-location.svg';

import grainOverlay from '../assets/landing/backgrounds/grain-overlay.svg';

/* Optional production background — falls back to CSS gradient if absent */
let environmentBg: string | null = null;
try {
  // @ts-ignore
  environmentBg = new URL(/* @vite-ignore */ '../assets/landing/backgrounds/environment-bg.webp', import.meta.url).href;
} catch { /* no-op */ }

/* ═══════════════════════════════════════════════════════════════
   TYPES & DATA  (per design spec)
   ═══════════════════════════════════════════════════════════════ */
interface LandingPageProps {
  onGetStarted: () => void;
  onMemberLogin?: () => void;
}

type SpaceKey = 'sales' | 'build' | 'inventory' | 'insights' | 'marketing' | 'it';

/* Exact accent colors & gradient backgrounds per screenshot */
const SPACE_COLORS: Record<SpaceKey, { gradient: string; shadow: string }> = {
  sales:      { gradient: 'linear-gradient(135deg, #1E6FD9 0%, #4DA3FF 50%, #1E6FD9 100%)', shadow: 'rgba(30,111,217,0.45)' },
  build:      { gradient: 'linear-gradient(135deg, #D97B1E 0%, #FFB347 50%, #D97B1E 100%)', shadow: 'rgba(217,123,30,0.45)' },
  inventory:  { gradient: 'linear-gradient(135deg, #10B981 0%, #5EC489 50%, #10B981 100%)', shadow: 'rgba(16,185,129,0.45)' },
  insights:   { gradient: 'linear-gradient(135deg, #1B8FA6 0%, #4FC3E0 50%, #1B8FA6 100%)', shadow: 'rgba(27,143,166,0.45)' },
  marketing:  { gradient: 'linear-gradient(135deg, #E11D48 0%, #F97316 50%, #E11D48 100%)', shadow: 'rgba(225,29,72,0.45)' },
  it:         { gradient: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 50%, #7C3AED 100%)', shadow: 'rgba(124,58,237,0.45)' },
};

interface SpaceDef {
  key: SpaceKey;
  title: string;
  subtitle: string;
  icon: string;
  bgImage?: string;
}

const SPACES: SpaceDef[] = [
  { key: 'build',      title: 'Design Space',     subtitle: 'Projects & Bids',          icon: spaceBuildSvg },
  { key: 'sales',      title: 'Sales Space',      subtitle: 'Opportunities & Contacts', icon: spaceSalesSvg },
  { key: 'inventory',  title: 'Inventory Space',  subtitle: 'Products & Stock',         icon: spaceInventorySvg },
  { key: 'insights',   title: 'Insights Space',   subtitle: 'Reports & Analytics',      icon: spaceInsightsSvg },
  { key: 'marketing',  title: 'Marketing Space',  subtitle: 'Campaigns & Leads',        icon: spaceMarketingSvg },
  { key: 'it',         title: 'IT Space',          subtitle: 'Systems & Support',        icon: spaceOperationsSvg },
];

const AUDIENCES = [
  { icon: iconHomeCenters,  label: 'Home Improvement Centers' },
  { icon: iconLumberYards,  label: 'Lumber Yards' },
  { icon: iconProDesk,      label: 'Pro Desk Teams' },
  { icon: iconMultiLocation, label: 'Multi-Location Businesses' },
];

/* ═══════════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

/* Divider with centered label — screenshot style */
function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-5 w-full">
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.15))' }} />
      <span style={{ color: '#334155', fontSize: 15, fontWeight: 600, letterSpacing: '0.02em', fontStyle: 'italic' }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.15), transparent)' }} />
    </div>
  );
}

/* ── Space Tile ── colorful gradient cards matching screenshot */
function SpaceTile({
  space,
  index,
  onClick,
}: {
  space: SpaceDef;
  index: number;
  onClick?: () => void;
}) {
  const colors = SPACE_COLORS[space.key];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.2 + index * 0.1, ease: 'easeOut' }}
      className="group"
    >
      <div
        className="relative cursor-pointer overflow-hidden transition-all duration-200 ease-out group-hover:-translate-y-1.5"
        style={{
          height: 110,
          borderRadius: 14,
          padding: '0 24px',
          background: colors.gradient,
          border: '1px solid rgba(255,255,255,0.25)',
          boxShadow: `0 8px 28px ${colors.shadow}, inset 0 1px 0 rgba(255,255,255,0.25)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        onClick={onClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `0 12px 36px ${colors.shadow}, inset 0 1px 0 rgba(255,255,255,0.3)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = `0 8px 28px ${colors.shadow}, inset 0 1px 0 rgba(255,255,255,0.25)`;
        }}
      >
        {/* Glass sheen overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.08) 100%)',
            borderRadius: 14,
          }}
        />

        {/* Subtle sparkle/star pattern */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 100%), radial-gradient(1px 1px at 60% 70%, rgba(255,255,255,0.3) 0%, transparent 100%), radial-gradient(1px 1px at 80% 20%, rgba(255,255,255,0.35) 0%, transparent 100%)',
            borderRadius: 14,
          }}
        />

        {/* Text — left side */}
        <div className="relative z-[1] min-w-0">
          <h3
            className="font-bold leading-tight"
            style={{ color: '#FFFFFF', fontSize: 22, textShadow: '0 1px 3px rgba(0,0,0,0.25)' }}
          >
            {space.title}
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.90)', fontSize: 14, marginTop: 4, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
            {space.subtitle}
          </p>
        </div>

        {/* Illustration — right side */}
        <div
          className="relative z-[1] shrink-0 ml-4 flex items-center justify-center overflow-hidden"
          style={{ width: 100, height: 80, borderRadius: 10 }}
        >
          <img
            src={space.icon}
            alt={space.title}
            className="w-full h-full object-contain"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
          />
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════════════ */
export function LandingPage({ onGetStarted, onMemberLogin }: LandingPageProps) {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [selectedSpaceInfo, setSelectedSpaceInfo] = useState<SpaceKey | null>(null);

  if (showAbout) return <About onClose={() => setShowAbout(false)} />;
  if (selectedModule) return <ModuleDetail moduleId={selectedModule} onBack={() => setSelectedModule(null)} />;
  if (selectedSpaceInfo === 'inventory') {
    return (
      <InventorySpaceInfo
        onBack={() => setSelectedSpaceInfo(null)}
        onEnterSpace={() => {
          window.location.href = '/inventory.html';
        }}
      />
    );
  }
  if (selectedSpaceInfo === 'insights') {
    return (
      <InsightsSpaceInfo
        onBack={() => setSelectedSpaceInfo(null)}
        onEnterSpace={() => {
          window.location.href = '/insights.html';
        }}
      />
    );
  }
  if (selectedSpaceInfo === 'marketing') {
    return (
      <MarketingSpaceInfo
        onBack={() => setSelectedSpaceInfo(null)}
        onEnterSpace={() => {
          window.location.href = '/marketing.html';
        }}
      />
    );
  }
  if (selectedSpaceInfo === 'it') {
    return (
      <ITSpaceInfo
        onBack={() => setSelectedSpaceInfo(null)}
        onEnterSpace={() => {
          window.location.href = '/it.html';
        }}
      />
    );
  }
  if (selectedSpaceInfo === 'build') {
    return (
      <DesignSpaceInfo
        onBack={() => setSelectedSpaceInfo(null)}
        onEnterSpace={() => {
          window.location.href = '/project-wizards.html';
        }}
      />
    );
  }
  if (selectedSpaceInfo === 'sales') {
    return (
      <SalesSpaceInfo
        onBack={() => setSelectedSpaceInfo(null)}
        onEnterSpace={() => {
          if (onMemberLogin) {
            onMemberLogin();
          } else {
            onGetStarted();
          }
        }}
      />
    );
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden flex flex-col"
      style={{ background: '#E8ECF0', fontFamily: 'Inter, "SF Pro", Arial, system-ui, sans-serif' }}
    >

      {/* ═══ BACKGROUND STACK — Full lobby photo ═══ */}

      {/* Layer 1 — Environment photo (full opacity, visible background) */}
      {environmentBg && (
        <div className="pointer-events-none absolute inset-0 z-0" style={{
          backgroundImage: `url(${environmentBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          opacity: 1,
        }} />
      )}

      {/* Layer 2 — Soft white veil for readability */}
      <div className="pointer-events-none absolute inset-0 z-[1]" style={{
        background: 'radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.15) 60%, rgba(240,238,235,0.25) 100%)',
      }} />

      {/* Layer 3 — Bottom floor fade for grounding */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[35%] z-[1]" style={{
        background: 'linear-gradient(to top, rgba(215,210,200,0.40) 0%, transparent 100%)',
      }} />

      {/* Layer 4 — Subtle grain */}
      <div
        className="pointer-events-none absolute inset-0 z-[2] mix-blend-multiply"
        style={{
          backgroundImage: `url(${grainOverlay})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
          opacity: 0.03,
        }}
      />

      {/* ═══ CONTENT ═══ */}
      <div
        className="relative z-10 mx-auto w-full flex flex-col min-h-screen justify-between"
        style={{ maxWidth: 1240, paddingLeft: 32, paddingRight: 32, paddingTop: 24, paddingBottom: 16 }}
      >

        {/* ── HERO ── */}
        <header className="flex flex-col items-center text-center pt-6 sm:pt-10">
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            style={{ fontSize: 48, fontWeight: 300, lineHeight: 1.15, color: '#1E293B', margin: 0 }}
          >
            Welcome to{' '}
            <span style={{ color: '#1E5FD8', fontWeight: 700 }}>ProSpaces CRM</span>
          </motion.h1>

          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.14 }}
            style={{ fontSize: 22, fontWeight: 400, color: '#334155', marginTop: 10 }}
          >
            Each team. Each task. Its own space.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.22 }}
            style={{ fontSize: 15, color: '#475569', marginTop: 8 }}
          >
            Sales. Projects. Inventory. Marketing &mdash; All in one connected platform.
          </motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.28 }}
            className="flex flex-col items-center gap-3 mt-6"
          >
            {/* Primary & Secondary CTAs - Side by side */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Enter ProSpaces Button */}
              <button
                onClick={() => onMemberLogin ? onMemberLogin() : undefined}
                className="transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  padding: '14px 36px',
                  borderRadius: 24,
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 16,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  background: 'linear-gradient(180deg, #1E5FD8 0%, #153F8A 100%)',
                  boxShadow: '0 4px 16px rgba(21,63,138,0.35)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(21,63,138,0.50)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(21,63,138,0.35)';
                }}
              >
                Enter ProSpaces
              </button>

              {/* Free Trial Button */}
              <button
                onClick={() => onGetStarted()}
                className="transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  padding: '14px 36px',
                  borderRadius: 24,
                  border: '2px solid #1E5FD8',
                  color: '#1E5FD8',
                  fontWeight: 600,
                  fontSize: 16,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  background: 'transparent',
                  boxShadow: '0 2px 8px rgba(21,63,138,0.15)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(30,95,216,0.08)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(21,63,138,0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(21,63,138,0.15)';
                }}
              >
                Start Free Trial
              </button>
            </div>

            {/* Secondary CTA — text link style */}
            <button
              onClick={() => { window.location.href = '?view=promo'; }}
              className="flex items-center gap-1 transition-all duration-200 hover:opacity-80"
              style={{
                padding: '8px 4px',
                border: 'none',
                background: 'transparent',
                color: '#334155',
                fontWeight: 500,
                fontSize: 14,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Watch How It Works
              <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>
        </header>

        {/* ── SPACE SELECTOR GRID (spec §6 — 2×2) ── */}
        <section className="mt-8 sm:mt-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SPACES.map((space, i) => (
              <div key={space.key}>
                <SpaceTile
                  space={space}
                  index={i}
                  onClick={() => setSelectedSpaceInfo(space.key)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── BUILT FOR (spec §7) ── */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-8 sm:mt-10"
        >
          <Divider label="Built For" />
          <div className="flex flex-wrap justify-center gap-6 sm:gap-10 mt-5">
            {AUDIENCES.map(({ icon, label }, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2"
                style={{ minWidth: 100 }}
              >
                <img
                  src={icon}
                  alt={label}
                  style={{ width: 56, height: 56, opacity: 0.90 }}
                  loading="lazy"
                />
                <span style={{ fontSize: 12, color: '#334155', textAlign: 'center', lineHeight: 1.3, fontWeight: 500 }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── ACCESS PANEL (Functional Footer) ── */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="mt-6 sm:mt-8"
        >
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: 'Enter ProSpaces',     action: () => onMemberLogin ? onMemberLogin() : onGetStarted() },
              { label: 'Start Free Trial',    action: onGetStarted },
              { label: 'Book a Demo',         action: () => { window.location.href = '?view=promo'; } },
            ].map(({ label, action }, i) => (
              <button
                key={i}
                onClick={action}
                className="transition-all duration-200 hover:bg-white/80"
                style={{
                  padding: '10px 22px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.6)',
                  background: 'rgba(255,255,255,0.55)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  color: '#1E293B',
                  fontWeight: 500,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.section>

        {/* ── FOOTER ── */}
        <footer className="mt-4 pt-3 pb-2 flex flex-col sm:flex-row items-center justify-between gap-2" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <div className="flex items-center gap-2">
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-3" style={{ fontSize: 11, color: '#64748B' }}>
            <button onClick={() => setShowAbout(true)} className="hover:text-slate-600 transition-colors flex items-center gap-1">
              <Info className="h-3 w-3" /> About
            </button>
            <span>|</span>
            <a href="?view=privacy-policy" className="hover:text-slate-600 transition-colors">Privacy</a>
            <span>|</span>
            <a href="?view=terms-of-service" className="hover:text-slate-600 transition-colors">Terms</a>
          </div>
          <p style={{ fontSize: 11, color: '#64748B' }}>&copy; {new Date().getFullYear()} ProSpaces CRM</p>
        </footer>
      </div>
    </div>
  );
}
