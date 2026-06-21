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
import { HomeImprovementBenefits } from './HomeImprovementBenefits';
import { LumberSuppliersBenefits } from './LumberSuppliersBenefits';
import { ProDeskBenefits } from './ProDeskBenefits';
import { MultiLocationBenefits } from './MultiLocationBenefits';
import { KnowledgeBase } from './KnowledgeBase';
import { motion } from 'motion/react';
import { 
  Info, 
  ChevronRight, 
  Store, 
  ChevronDown, 
  Monitor, 
  Building2, 
  Users, 
  MapPin, 
  Search, 
  ArrowRight, 
  Check, 
  Play, 
  Database, 
  TrendingUp, 
  Layers, 
  Package, 
  FileText, 
  Clock, 
  Plus, 
  ChevronLeft,
  Briefcase,
  Layers2,
  FileSpreadsheet,
  AlertBubble,
  HelpCircle
} from 'lucide-react';

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
  const [selectedAudience, setSelectedAudience] = useState<string | null>(null);
  // Local state to keep track of the interactive mockup dashboard tab
  const [activeTab, setActiveTab] = useState<SpaceKey>('sales');
  // State for header sub-menus information modals
  const [activeNavTab, setActiveNavTab] = useState<'features' | 'why' | 'pricing' | null>(null);

  if (selectedAudience === 'home-improvement') {
    return <HomeImprovementBenefits onBack={() => setSelectedAudience(null)} onGetStarted={onGetStarted} />;
  }
  if (selectedAudience === 'lumber-suppliers') {
    return <LumberSuppliersBenefits onBack={() => setSelectedAudience(null)} onGetStarted={onGetStarted} />;
  }
  if (selectedAudience === 'pro-desk') {
    return <ProDeskBenefits onBack={() => setSelectedAudience(null)} onGetStarted={onGetStarted} />;
  }
  if (selectedAudience === 'multi-location') {
    return <MultiLocationBenefits onBack={() => setSelectedAudience(null)} onGetStarted={onGetStarted} />;
  }

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

  // Using state variables initialized at the top of the component
  const spaceLabels: Record<SpaceKey, string> = {
    sales: 'Sales Space',
    build: 'Design Space',
    inventory: 'Inventory Space',
    insights: 'Insights Space',
    marketing: 'Marketing Space',
    it: 'IT Space'
  };

  const currentSpaceInfo = SPACES.find(s => s.key === activeTab);

  return (
    <div
      className="relative min-h-screen flex flex-col bg-slate-50/50"
      style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}
    >
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
          {/* Logo brand with navigation triggers */}
          <div className="flex items-center gap-4 sm:gap-10">
            <div className="flex items-center cursor-pointer" onClick={() => { setSelectedSpaceInfo(null); setActiveNavTab(null); }}>
              <Logo size="md" className="h-[60px] w-auto transition-all duration-200" />
            </div>

            {/* Desktop Center Navigation Links */}
            <nav className="hidden md:flex items-center gap-8 text-base font-semibold text-[#002f5d]">
              <button 
                onClick={() => setActiveNavTab('features')}
                className={`group flex items-center gap-1.5 hover:text-[#1E6FD9] transition-all py-1 px-1 cursor-pointer ${activeNavTab === 'features' ? 'text-[#1E6FD9] border-b-2 border-[#1E6FD9]' : ''}`}
                id="nav-btn-features"
              >
                <span>Features</span>
                <span className="inline-block transition-transform duration-500 ease-out group-hover:rotate-[360deg] text-[#1E6FD9]">✦</span>
              </button>
              <button 
                onClick={() => setActiveNavTab('why')}
                className={`group flex items-center gap-1.5 hover:text-[#1E6FD9] transition-all py-1 px-1 cursor-pointer ${activeNavTab === 'why' ? 'text-[#1E6FD9] border-b-2 border-[#1E6FD9]' : ''}`}
                id="nav-btn-why"
              >
                <span>Why ProSpaces CRM</span>
                <span className="inline-block transition-transform duration-500 ease-out group-hover:rotate-[360deg] text-[#1E6FD9]">✦</span>
              </button>
              <button 
                onClick={() => setActiveNavTab('pricing')}
                className={`group flex items-center gap-1.5 hover:text-[#1E6FD9] transition-all py-1 px-1 cursor-pointer ${activeNavTab === 'pricing' ? 'text-[#1E6FD9] border-b-2 border-[#1E6FD9]' : ''}`}
                id="nav-btn-pricing"
              >
                <span>Pricing</span>
                <span className="inline-block transition-transform duration-500 ease-out group-hover:rotate-[360deg] text-[#1E6FD9]">✦</span>
              </button>
              <button 
                onClick={() => setActiveNavTab('knowledge')}
                className={`group flex items-center gap-1.5 hover:text-[#1E6FD9] transition-all py-1 px-1 cursor-pointer ${activeNavTab === 'knowledge' ? 'text-[#1E6FD9] border-b-2 border-[#1E6FD9]' : ''}`}
                id="nav-btn-knowledge"
              >
                <span>Knowledge Base</span>
                <span className="inline-block transition-transform duration-500 ease-out group-hover:rotate-[360deg] text-[#1E6FD9]">✦</span>
              </button>
            </nav>
          </div>

          {/* Right Header Navigation with support for mobile tab views */}
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Mobile Navigation controls */}
            <div className="flex md:hidden items-center gap-1.5 text-[10px] sm:text-xs font-bold text-slate-500 mr-1 select-none">
              <button 
                onClick={() => setActiveNavTab('features')}
                className={`group flex items-center gap-0.5 px-1.5 py-1 rounded ${activeNavTab === 'features' ? 'bg-[#1E6FD9]/10 text-[#1E6FD9]' : 'hover:bg-slate-100'}`}
              >
                <span>Features</span>
                <span className="inline-block transition-transform duration-500 ease-out group-hover:rotate-[360deg] text-[#1E6FD9]">✦</span>
              </button>
              <button 
                onClick={() => setActiveNavTab('why')}
                className={`group flex items-center gap-0.5 px-1.5 py-1 rounded ${activeNavTab === 'why' ? 'bg-[#1E6FD9]/10 text-[#1E6FD9]' : 'hover:bg-slate-100'}`}
              >
                <span>Why Us</span>
                <span className="inline-block transition-transform duration-500 ease-out group-hover:rotate-[360deg] text-[#1E6FD9]">✦</span>
              </button>
              <button 
                onClick={() => setActiveNavTab('pricing')}
                className={`group flex items-center gap-0.5 px-1.5 py-1 rounded ${activeNavTab === 'pricing' ? 'bg-[#1E6FD9]/10 text-[#1E6FD9]' : 'hover:bg-slate-100'}`}
              >
                <span>Pricing</span>
                <span className="inline-block transition-transform duration-500 ease-out group-hover:rotate-[360deg] text-[#1E6FD9]">✦</span>
              </button>
              <button 
                onClick={() => setActiveNavTab('knowledge')}
                className={`group flex items-center gap-0.5 px-1.5 py-1 rounded ${activeNavTab === 'knowledge' ? 'bg-[#1E6FD9]/10 text-[#1E6FD9]' : 'hover:bg-slate-100'}`}
              >
                <span>Help KB</span>
                <span className="inline-block transition-transform duration-500 ease-out group-hover:rotate-[360deg] text-[#1E6FD9]">✦</span>
              </button>
            </div>

            <button
              onClick={onGetStarted}
              className="bg-[#1E6FD9] hover:bg-[#155FBC] text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-blue-500/10 active:scale-[0.98]"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <div className="w-full bg-[#e3effc] border-b border-blue-100">
        <main className="flex-grow max-w-7xl mx-auto px-6 sm:px-8 py-12 md:py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        
        {/* Left Column Text Content */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-slate-800 tracking-tight leading-[1.08] lg:-mr-4">
              Built for How You Actually Sell, Build, and Deliver
            </h1>
            
            <p className="text-slate-600 font-normal text-base sm:text-lg mt-6 leading-relaxed max-w-xl">
              Prospaces CRM connects sales, projects, inventory, and teams.
            </p>

            {/* Direct CRM Access buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <button
                onClick={() => onMemberLogin ? onMemberLogin() : onGetStarted()}
                className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm px-6 py-3.5 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Enter CRM Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm px-6 py-3.5 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-sm"
              >
                <span>View Benefits</span>
              </button>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Premium CSS Dashboard Interactive Mockup */}
        <div className="lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
            className="flex w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-100 bg-[#E8EFF8] p-1.5 sm:p-2.5"
          >
            {/* Dashboard Sidebar Navigation Rail */}
            <div className="w-12 sm:w-16 bg-[#1D5EBE] rounded-xl flex flex-col items-center py-4 sm:py-6 gap-4 sm:gap-6 shrink-0 shadow-lg shadow-blue-900/10">
              {/* Brand logo inside rail */}
              <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center mb-2">
                <Building2 className="h-4 w-4 text-white" />
              </div>

              {/* Navigation Items in mockup */}
              {SPACES.map((space) => {
                const isSelected = activeTab === space.key;
                let SpaceIcon = Briefcase;
                if (space.key === 'build') SpaceIcon = Layers2;
                if (space.key === 'inventory') SpaceIcon = Package;
                if (space.key === 'insights') SpaceIcon = TrendingUp;
                if (space.key === 'marketing') SpaceIcon = Users;
                if (space.key === 'it') SpaceIcon = Monitor;

                return (
                  <button
                    key={space.key}
                    onClick={() => setActiveTab(space.key)}
                    title={space.title}
                    className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-150 relative ${
                      isSelected 
                        ? 'bg-white text-[#1E6FD9] shadow-sm font-semibold' 
                        : 'text-white/75 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <SpaceIcon className="h-4 w-4" />
                    {isSelected && (
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded-l-md" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Inner Main Dashboard Screen Frame */}
            <div className="flex-1 bg-white rounded-xl ml-1.5 sm:ml-2.5 overflow-hidden flex flex-col border border-slate-100 min-h-[380px] sm:min-h-[420px] shadow-inner">
              
              {/* Fake Dashboard Top Header */}
              <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-slate-800 tracking-tight">
                    {spaceLabels[activeTab]}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 rounded-md px-2 py-1 text-[10px] text-slate-500">
                    <Search className="h-2.5 w-2.5" />
                    <span className="opacity-80">Search specs...</span>
                  </div>
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold select-none shadow-sm">
                    JD
                  </div>
                </div>
              </div>

              {/* Dynamic Workspace Container depending on state */}
              <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between overflow-auto">
                {activeTab === 'sales' && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sales Quote Tracker</span>
                        <div className="flex gap-1">
                          <span className="px-2 py-0.5 rounded text-[9px] bg-blue-50 text-[#1E6FD9] font-semibold">Today</span>
                          <span className="px-2 py-0.5 rounded text-[9px] text-slate-400">Reporting</span>
                          <span className="px-2 py-0.5 rounded text-[9px] text-slate-400">Wins</span>
                        </div>
                      </div>

                      {/* Main Financial stats representation */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium block">Total Pipeline Value</span>
                          <span className="text-lg sm:text-xl font-extrabold text-slate-700 block tracking-tight mt-0.5">5,909</span>
                          <div className="h-1 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: '65%' }}></div>
                          </div>
                        </div>
                        <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium block">Materials Orders</span>
                          <span className="text-lg sm:text-xl font-extrabold text-slate-700 block tracking-tight mt-0.5">5300</span>
                          <div className="h-1 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-teal-500 rounded-full" style={{ width: '80%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Product overview simulation */}
                    <div>
                      <span className="text-xs font-bold text-slate-400 block mb-2 uppercase tracking-wider">Product Overview</span>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-teal-50/40 border border-teal-100/50">
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                            <span className="text-xs font-semibold text-slate-700">Wall Studs 2x4</span>
                          </div>
                          <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">In Stock</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/40 border border-amber-100/50">
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            <span className="text-xs font-semibold text-slate-700">Window Trim & Trim Sets</span>
                          </div>
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Pending</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/40 border border-[#1E6FD9]/10">
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            <span className="text-xs font-semibold text-slate-700">Corner Pine Boards</span>
                          </div>
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Completed</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'build' && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Estimates & CAD</span>
                        <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded-full">3D Active</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center py-6">
                        <div className="h-10 w-10 mx-auto rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mb-2">
                          <Layers className="h-5 w-5" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-700">Estimator Pro Layout</h4>
                        <p className="text-[10px] text-slate-400 mt-1">Configure lumber lists, trusses, sheathing and layout boards in real-time.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50/50 border border-slate-100 rounded-lg p-2.5 text-center">
                        <span className="text-[9px] text-slate-400 block font-medium">Bids Sent</span>
                        <span className="text-sm font-extrabold text-slate-700 mt-0.5 block">24 active</span>
                      </div>
                      <div className="bg-slate-50/50 border border-slate-100 rounded-lg p-2.5 text-center block">
                        <span className="text-[9px] text-slate-400 block font-medium">Auto-Calculation</span>
                        <span className="text-sm font-extrabold text-emerald-600 mt-0.5 block">100% accurate</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'inventory' && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Inventory Sync</span>
                        <span className="text-[10px] text-slate-400 font-semibold">4 Locations Joined</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-50/50 border border-indigo-100/40 text-xs">
                          <span className="font-bold text-indigo-900 block truncate">Lumber 2"x4"x8' Studs</span>
                          <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded">1,540 units</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 border border-slate-100 text-xs">
                          <span className="font-bold text-slate-700 block truncate">OSB Sheathing 4x8</span>
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">410 units</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-teal-50/50 border border-teal-100/40 text-xs">
                          <span className="font-bold text-teal-900 block truncate">Asphalt Architecture Shingles</span>
                          <span className="font-mono text-[10px] font-bold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded">80 Bundles</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#1E6FD9]/5 rounded-xl p-3 border border-[#1E6FD9]/10 text-center">
                      <p className="text-[9px] text-slate-500 font-medium">Automatic low-inventory order generation triggers instantly.</p>
                    </div>
                  </div>
                )}

                {activeTab === 'insights' && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400 block mb-2 uppercase tracking-wider">Performance Analytics</span>
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-center min-h-[120px]">
                        {/* Mini vector SVG graph */}
                        <svg viewBox="0 0 100 35" className="w-full h-24 text-[#1E6FD9] overflow-visible">
                          <path
                            d="M0,30 Q15,10 30,22 T60,5 T85,18 T100,2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />
                          <path
                            d="M0,30 Q15,10 30,22 T60,5 T85,18 T100,2 L100,35 L0,35 Z"
                            fill="url(#gradient-blue)"
                            opacity="0.1"
                          />
                          <defs>
                            <linearGradient id="gradient-blue" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="currentColor" />
                              <stop offset="100%" stopColor="white" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 text-[10px]">
                      <span className="font-semibold text-slate-600">GP Target Margin</span>
                      <span className="font-bold text-emerald-600">+34.8% average</span>
                    </div>
                  </div>
                )}

                {activeTab === 'marketing' && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">Campaign Hub & Leads</span>
                      <p className="text-[10px] text-slate-400 mb-2">Automate client check-ins and target local custom builders.</p>
                      <div className="space-y-1.5">
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 text-xs flex justify-between">
                          <span className="font-semibold text-slate-700">"New Home Spring Build" campaign</span>
                          <span className="text-teal-600 font-bold">81.4% Open</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 text-xs flex justify-between">
                          <span className="font-semibold text-slate-700">Inbound Web Estimates</span>
                          <span className="font-bold text-slate-600">+12 Leads</span>
                        </div>
                      </div>
                    </div>
                    <button className="w-full bg-[#1E6FD9] hover:bg-[#155fc2] text-white text-[11px] font-bold py-2 rounded-lg transition-colors">
                      Send Mass Broadcast Email
                    </button>
                  </div>
                )}

                {activeTab === 'it' && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400 block mb-2 uppercase tracking-wider">Systems & Permissions</span>
                      <div className="bg-slate-900 text-slate-300 font-mono text-[9px] rounded-lg p-3 select-all overflow-hidden whitespace-nowrap">
                        <p className="text-emerald-400"># system running optimally</p>
                        <p className="text-slate-400 mt-1">DATABASE: OK (Supabase Direct)</p>
                        <p className="text-slate-400">ORGANIZATION_ID: verified</p>
                        <p className="text-slate-400">API Gateway 3000: active</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-6 w-1/2 bg-slate-50 rounded border border-slate-100 flex items-center justify-center text-[9px] font-medium text-slate-500">
                        99.98% Uptime
                      </div>
                      <div className="h-6 w-1/2 bg-slate-50 rounded border border-slate-100 flex items-center justify-center text-[9px] font-medium text-slate-500">
                        SSO Bound
                      </div>
                    </div>
                  </div>
                )}

                {/* Simulated workspace entry footer inside preview */}
                <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-center text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" />
                    Interactive Preview Sandbox
                  </span>
                </div>
              </div>

            </div>
          </motion.div>
        </div>

      </main>
      </div>

      {/* ── LOWER AUDIENCES SECTION (Built for Teams) ── */}
      <section id="features-section" className="bg-white border-t border-slate-100 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 text-center tracking-tight mb-14">
            Built for Teams That Manage Real-World Projects
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
            {/* Feature 1 — Home Improvement Centres */}
            <button 
              onClick={() => setSelectedAudience('home-improvement')}
              className="flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-slate-150 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-blue-300 cursor-pointer group text-left w-full active:scale-98"
            >
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-5 transition-transform duration-200 group-hover:scale-110">
                <Store className="h-7 w-7 text-[#1E6FD9]" />
              </div>
              <h3 className="text-base font-black text-slate-800 leading-tight group-hover:text-[#1E6FD9] transition-colors">
                Home Improvement Centres
              </h3>
              <p className="text-sm text-slate-500 mt-2.5 leading-relaxed">
                Track quotes, suppliers, and contractor installations ahead sequentially.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[#1E6FD9] opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Explore Benefits</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </button>

            {/* Feature 2 — Lumber & Building Suppliers */}
            <button 
              onClick={() => setSelectedAudience('lumber-suppliers')}
              className="flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-slate-150 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-orange-300 cursor-pointer group text-left w-full active:scale-98"
            >
              <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center mb-5 transition-transform duration-200 group-hover:scale-110">
                <Layers className="h-7 w-7 text-orange-600" />
              </div>
              <h3 className="text-base font-black text-slate-800 leading-tight group-hover:text-orange-600 transition-colors">
                Lumber & Building Suppliers
              </h3>
              <p className="text-sm text-slate-500 mt-2.5 leading-relaxed">
                Generate material bids and manage stock yard across local yards.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Explore Benefits</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </button>

            {/* Feature 3 — Pro Desk Sales Teams */}
            <button 
              onClick={() => setSelectedAudience('pro-desk')}
              className="flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-slate-150 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-indigo-300 cursor-pointer group text-left w-full active:scale-98"
            >
              <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center mb-5 transition-transform duration-200 group-hover:scale-110">
                <Users className="h-7 w-7 text-indigo-600" />
              </div>
              <h3 className="text-base font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                Pro Desk Sales Teams
              </h3>
              <p className="text-sm text-slate-500 mt-2.5 leading-relaxed">
                Streamline volume customer accounts, contract pricing, and material bundles.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Explore Benefits</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </button>

            {/* Feature 4 — Multi-Location Operations */}
            <button 
              onClick={() => setSelectedAudience('multi-location')}
              className="flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-slate-150 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-teal-300 cursor-pointer group text-left w-full active:scale-98"
            >
              <div className="h-16 w-16 rounded-full bg-teal-100 flex items-center justify-center mb-5 transition-transform duration-200 group-hover:scale-110">
                <MapPin className="h-7 w-7 text-teal-600" />
              </div>
              <h3 className="text-base font-black text-slate-800 leading-tight group-hover:text-teal-600 transition-colors">
                Multi-Location Operations
              </h3>
              <p className="text-sm text-slate-500 mt-2.5 leading-relaxed">
                Manage high-volume inventories and coordinate dispatch across multiple branches.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Explore Benefits</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-50 border-t border-slate-100 mt-auto py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-[#1E6FD9] text-sm">ProSpaces</span>
            <span>&copy; {new Date().getFullYear()} ProSpaces CRM Corp. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <button
               onClick={() => setShowAbout(true)}
               className="hover:text-slate-800 transition-colors flex items-center gap-1.5 font-semibold"
            >
              <Info className="h-3.5 w-3.5" /> About ProSpaces
            </button>
            <span>|</span>
            <a href="?view=privacy-policy" className="hover:text-slate-800 transition-colors">Privacy Policy</a>
            <span>|</span>
            <a href="?view=terms-of-service" className="hover:text-slate-800 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

      {/* ── INTERACTIVE TOP NAV OVERLAYS (Features, Why CRM, Pricing) ── */}

      {/* FEATURES MODAL OVERLAY */}
      {activeNavTab === 'features' && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800">Advanced Industry Features</h3>
                  <p className="text-xs text-slate-500">Fully integrated ERP-CRM workflow tailored for construction and supply spaces</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveNavTab(null)}
                className="h-10 w-10 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors font-bold text-2xl"
              >
                &times;
              </button>
            </div>

            {/* Modal Scrollable Contents */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Feature Card: Sales Workspace */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-sm transition-all duration-150">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 text-[#1E6FD9] flex items-center justify-center">
                      <Store className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-slate-800 text-sm">Lumber & CRM Sales Space</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Track contractor quotes with full material breakdown. Handle tier-discounts for custom home builders dynamically and sync with multi-location stock levels automatically in real-time.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-500">
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Multi-tiered contractor price lists</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Direct bid-to-quote conversion builder</li>
                  </ul>
                </div>

                {/* Feature Card: CAD Design Estimations */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-sm transition-all duration-150">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                      <Layers2 className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-slate-800 text-sm">Estimator Pro Plan suite</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Built-in linear lumber, roofing tile and deck material calculators. Generate precise blueprints with waste allowances included, exporting professional line lists in seconds.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-500">
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Roof, Garage, Deck, and Shed project planners</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Automatic lumber-sheet checklist tools</li>
                  </ul>
                </div>

                {/* Feature Card: Live Inventory Sync */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-sm transition-all duration-150">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <Package className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-slate-800 text-sm">Global Inventory & Logistics</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Track material stock levels in real-time across four distinct yards. Set low stock alerts and automatically generate purchase orders matching contractor request volume.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-500">
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Automatic supplier order creation</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Live stock level updates in warehouses</li>
                  </ul>
                </div>

                {/* Feature Card: Profit margin Tracking */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-sm transition-all duration-150">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-slate-800 text-sm">Margin Tracking & Insights</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Instantly view overall gross margin per project, with dynamic timber price index updates. Keep track of materials cost variances, delivery costs, and sales commission structures.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-500">
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Real-time materials value indexing</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Visual dashboard reporting charts</li>
                  </ul>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-400">Want to test-drive these features?</span>
              <div className="flex gap-3">
                <button 
                  onClick={() => setActiveNavTab(null)}
                  className="px-4 py-2 border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  Close
                </button>
                <button 
                  onClick={() => { setActiveNavTab(null); onGetStarted(); }}
                  className="px-5 py-2 bg-[#1E6FD9] hover:bg-blue-600 text-white text-sm font-bold rounded-lg transition-all shadow-sm"
                >
                  Take Free Trial
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* WHY PROSPACES MODAL OVERLAY */}
      {activeNavTab === 'why' && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800">Why ProSpaces CRM?</h3>
                  <p className="text-xs text-slate-500">The first construction-aware CRM ever built</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveNavTab(null)}
                className="h-10 w-10 rounded-full hover:bg-slate-200 text-slate-400 hover:text-[#1E6FD9] flex items-center justify-center transition-colors font-bold text-2xl"
              >
                &times;
              </button>
            </div>

            {/* Modal Scrollable Contents */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              <div className="text-sm text-slate-600 leading-relaxed space-y-4">
                <p>
                  Most CRMs are designed for software sales or simple retail shops. They don't understand <strong>lumber grades, volume timber packages, linear footage, or dispatch coordination across physical yards.</strong>
                </p>
                <p>
                  ProSpaces CRM acts as a unified operating system that interfaces directly with lumber merchant systems, estimating workflows, and live dispatch pipelines.
                </p>
              </div>

              {/* Comparison Section */}
              <div className="border border-slate-200/50 rounded-2xl overflow-hidden mt-6">
                <div className="grid grid-cols-2 bg-slate-50 p-3 text-xs font-bold text-slate-700 border-b border-slate-100 text-center">
                  <div>Generic CRM (HubSpot/Salesforce)</div>
                  <div className="text-[#1E6FD9] font-bold">ProSpaces CRM</div>
                </div>
                <div className="divide-y divide-slate-100 text-xs text-slate-600">
                  <div className="grid grid-cols-2 p-3 text-center">
                    <span className="text-slate-400">Generic items with standard numbers only</span>
                    <span className="text-slate-700 font-semibold flex items-center justify-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-500" /> Lumber, sheets area calculations</span>
                  </div>
                  <div className="grid grid-cols-2 p-3 text-center">
                    <span className="text-slate-400">Siloed systems with no 3D blueprints helper</span>
                    <span className="text-slate-700 font-semibold flex items-center justify-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-500" /> Integrated real-time 3D CAD design estimator</span>
                  </div>
                  <div className="grid grid-cols-2 p-3 text-center">
                    <span className="text-slate-400">Contractor accounts require massive custom code</span>
                    <span className="text-slate-700 font-semibold flex items-center justify-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-500" /> Native pro desk contractor tier discount pricing</span>
                  </div>
                  <div className="grid grid-cols-2 p-3 text-center">
                    <span className="text-slate-400">No multi-yard inventory tracking logic</span>
                    <span className="text-slate-700 font-semibold flex items-center justify-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-500" /> Real-time 4 location inventory sync with alerts</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setActiveNavTab(null)}
                className="px-4 py-2 border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              >
                Go Back
              </button>
              <button 
                onClick={() => { setActiveNavTab(null); onGetStarted(); }}
                className="px-5 py-2 bg-[#1E6FD9] hover:bg-blue-600 text-white text-sm font-bold rounded-lg transition-all shadow-sm"
              >
                Join Today
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* PRICING MODAL OVERLAY */}
      {activeNavTab === 'pricing' && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl w-full max-w-5xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center bg-gradient-to-r from-slate-50 to-blue-50/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800">Fair, Transparent Pricing</h3>
                  <p className="text-xs text-slate-500">Pick the perfect plan for your lumber yards & supply stores</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveNavTab(null)}
                className="h-10 w-10 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors font-bold text-2xl"
              >
                &times;
              </button>
            </div>

            {/* Modal Scrollable Contents - Pricing Tiers */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Starter / Basic Plan */}
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Basic Plan</span>
                    <h4 className="text-lg font-black text-slate-800 mt-1">Basic</h4>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Essential CRM workflows for small builders
                    </p>
                    <div className="mt-4 flex items-baseline">
                      <span className="text-3xl font-extrabold text-slate-800 tracking-tight">$29</span>
                      <span className="text-xs text-slate-400 ml-1">/ month, billed monthly</span>
                    </div>
                    <ul className="mt-5 space-y-2.5 text-xs text-slate-600 border-t border-slate-200/50 pt-4">
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Core CRM (Contacts, Deals, Tasks)</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Email integration</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Basic reports</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Community support</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => { setActiveNavTab(null); onGetStarted(); }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg mt-6 transition-all"
                  >
                    Get Started
                  </button>
                </div>

                {/* Professional Plan (Most Popular) */}
                <div className="p-6 rounded-2xl bg-[#E8EFF8] border-2 border-[#1E6FD9] flex flex-col justify-between shadow-md relative">
                  <span className="absolute -top-3 right-4 bg-[#1E6FD9] text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    Most Popular
                  </span>
                  <div>
                    <span className="text-xs font-bold text-[#1E6FD9] uppercase tracking-wider block">Professional Plan</span>
                    <h4 className="text-lg font-black text-slate-800 mt-1">Professional</h4>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed font-semibold">
                      Perfect for growing teams & custom builders
                    </p>
                    <div className="mt-4 flex items-baseline">
                      <span className="text-3xl font-extrabold text-slate-800 tracking-tight">$79</span>
                      <span className="text-xs text-slate-600 ml-1 font-semibold">/ month, billed monthly</span>
                    </div>
                    <ul className="mt-5 space-y-2.5 text-xs text-slate-600 border-t border-[#1E6FD9]/20 pt-4 font-medium">
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Everything in Basic</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Marketing automation</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Inventory management</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Document management</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Project Wizards (3D Planners)</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Customer portal</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => { setActiveNavTab(null); onGetStarted(); }}
                    className="w-full py-3 bg-[#1E6FD9] hover:bg-[#155FBC] text-white text-xs font-bold rounded-xl mt-6 transition-all shadow-sm"
                  >
                    Unlock Pro Desks
                  </button>
                </div>

                {/* Enterprise Plan */}
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Enterprise Plan</span>
                    <h4 className="text-lg font-black text-slate-800 mt-1">Enterprise</h4>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      For large organizations needing custom scaling
                    </p>
                    <div className="mt-4 flex items-baseline">
                      <span className="text-3xl font-extrabold text-slate-800 tracking-tight">$199</span>
                      <span className="text-xs text-slate-400 ml-1">/ month, billed monthly</span>
                    </div>
                    <ul className="mt-5 space-y-2.5 text-xs text-slate-600 border-t border-slate-200/50 pt-4">
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Everything in Professional</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> SSO SAML encryption</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Audit logging history</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Developer API access</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Custom integrations</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> SLA performance guarantees</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => { setActiveNavTab(null); onGetStarted(); }}
                    className="w-full py-2 border border-slate-300 text-[#1E6FD9] hover:bg-slate-100 text-xs font-bold rounded-lg mt-6 transition-all"
                  >
                    Unlock Enterprise
                  </button>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-400">
              <span>All plans include a 14-day free trial sandbox with mock data. No credit card required.</span>
              <button 
                onClick={() => setActiveNavTab(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-all font-semibold"
              >
                Close View
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* KNOWLEDGE BASE MODAL OVERLAY */}
      {activeNavTab === 'knowledge' && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl w-full max-w-7xl h-[92vh] max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100"
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center px-6 sm:px-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-[#1E6FD9]">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                    ProSpaces Help Center
                  </h2>
                  <p className="text-[10px] text-slate-400 font-semibold font-mono">
                    Official Documentation &amp; AI Assist
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveNavTab(null)}
                className="h-9 w-9 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-705 flex items-center justify-center transition-colors font-bold text-xl cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50 font-sans">
              <KnowledgeBase />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between text-xs text-slate-400 px-6 sm:px-8 shrink-0">
              <span className="hidden sm:inline">Looking for live agent onboarding? Schedule a live Zoom demo session.</span>
              <span className="sm:hidden">Zoom demo onboarding sessions available.</span>
              <button 
                onClick={() => setActiveNavTab(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-all font-semibold"
              >
                Close Portal
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
