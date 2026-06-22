import { motion } from 'motion/react';
import { 
  Check, 
  Phone, 
  ArrowLeft, 
  Building2, 
  Search, 
  HelpCircle, 
  Plus, 
  MessageSquare, 
  Mail, 
  FileText, 
  X, 
  Sparkles,
  Award,
  Video,
  Grid,
  TrendingUp,
  User,
  MoreVertical,
  Activity
} from 'lucide-react';
import { Logo } from './Logo';

export function MultiDeviceMockup() {
  return (
    <div className="relative w-full aspect-[4/3] sm:aspect-[16/11] bg-gradient-to-tr from-blue-100/75 via-indigo-50/50 to-emerald-50/50 rounded-3xl p-4 sm:p-6 overflow-hidden border border-slate-100 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
      
      {/* Decorative background shapes mimicking professional product showcases */}
      <div className="absolute top-10 right-10 w-44 h-44 bg-blue-200/40 rounded-full blur-3xl -z-10" />
      <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-emerald-200/30 rounded-full blur-2xl -z-10" />
      
      {/* ── 1. LAPTOP MOCKUP (BASE) ── */}
      <div className="relative w-[92%] sm:w-[94%] top-[2%] transition-all duration-500 ease-out group-hover:scale-[1.01]">
        
        {/* Screen Frame Bezel */}
        <div className="bg-[#1E293B] rounded-2xl sm:rounded-3xl p-1.5 sm:p-2.5 shadow-2xl border border-slate-700/50 relative overflow-hidden flex flex-col">
          
          {/* Web-camera Dot */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-slate-800" />
          
          {/* Screen Content Wrapper */}
          <div className="bg-slate-50 text-slate-800 rounded-lg sm:rounded-2xl overflow-hidden flex flex-col select-none aspect-[16/10] text-[9px] sm:text-xs">
            
            {/* Nav Row (Sales Space CRM - 2nd image layout) */}
            <div className="bg-[#1E6FD9] text-white px-2 sm:px-4 py-1.5 sm:py-2.5 flex items-center justify-between shadow-sm shrink-0">
              <div className="flex items-center gap-2 sm:gap-4 truncate">
                {/* Logo & Portal Branding */}
                <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm tracking-tight text-white">
                  <div className="h-4 w-4 sm:h-5 sm:w-5 bg-white text-[#1E6FD9] rounded-md font-extrabold flex items-center justify-center text-[10px] sm:text-xs">
                    P
                  </div>
                  <span className="hidden xs:inline">Sales Space</span>
                </div>

                {/* Simulated workspace menu tabs from second image */}
                <nav className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-white/80 shrink-0">
                  <span className="hover:text-white transition-colors cursor-pointer px-1 py-0.5">Home</span>
                  <span className="hover:text-white transition-colors cursor-pointer px-1 py-0.5">Dashboard</span>
                  <span className="hover:text-white transition-colors cursor-pointer px-1 py-0.5 bg-orange-500 text-white rounded px-1.5 py-0.5 text-[8px] flex items-center gap-0.5">
                    AI Suggestions <span className="bg-white text-orange-600 rounded-full h-3 w-3 inline-flex items-center justify-center text-[7px] font-black">11</span>
                  </span>
                  <span className="hover:text-white transition-colors cursor-pointer px-1 py-0.5">Contacts</span>
                  <span className="text-white bg-white/10 rounded px-2 py-0.5 cursor-pointer">Deals</span>
                  <span className="hover:text-white transition-colors cursor-pointer px-1 py-0.5">Message Space</span>
                  <span className="hover:text-white transition-colors cursor-pointer px-1 py-0.5">Notes</span>
                  <span className="hover:text-white transition-colors cursor-pointer px-1.5 py-0.5 flex items-center gap-0.5">Email <span className="text-[7px]">▼</span></span>
                </nav>
              </div>

              {/* User Avatar Chip */}
              <div className="flex items-center gap-1.5 bg-white/10 rounded-full py-0.5 pl-1 pr-2.5 cursor-pointer hover:bg-white/15 transition-colors shrink-0">
                <div className="h-3.5 w-3.5 sm:h-5 sm:w-5 rounded-full bg-orange-400 text-white text-[7px] sm:text-[9px] font-extrabold flex items-center justify-center">
                  G
                </div>
                <span className="text-[8px] sm:text-[10px] font-extrabold tracking-tight truncate max-w-[50px] sm:max-w-none">George</span>
              </div>
            </div>

            {/* Dashboard Sub Header block */}
            <div className="border-b border-slate-200 bg-white px-3 sm:px-5 py-2 sm:py-3.5 flex flex-row items-center justify-between shrink-0 gap-2">
              <div>
                <h3 className="text-xs sm:text-base font-black text-slate-800 tracking-tight">Deals &amp; Quotes</h3>
                <p className="text-[7px] sm:text-[11px] text-slate-400 font-semibold tracking-wide">Manage your quotes, proposals, and deals</p>
              </div>

              {/* Actions alignment */}
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                <div className="relative hidden xs:block">
                  <Search className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search quotes..." 
                    disabled 
                    className="pl-5 sm:pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[7px] sm:text-[11px] w-24 sm:w-44 focus:outline-none text-slate-500 font-medium"
                  />
                </div>
                <button className="hidden sm:flex items-center gap-1 border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-600 font-semibold hover:bg-slate-50 text-[10px] transition-all bg-white shadow-sm">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
                  <span>Deals Help</span>
                </button>
                <button className="bg-[#139FDA] hover:bg-[#108DC1] text-white font-extrabold px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg flex items-center gap-0.5 sm:gap-1 text-[8px] sm:text-[11px] transition-all shadow-sm">
                  <Plus className="h-2 sm:h-3.5 w-2 sm:w-3.5 stroke-[3]" />
                  <span>New Quote</span>
                </button>
              </div>
            </div>

            {/* Main CRM Workspace (Kanban columns + overlays) */}
            <div className="flex-1 p-2 sm:p-4 overflow-hidden relative grid grid-cols-5 gap-1.5 sm:gap-3 bg-slate-100/60">
              
              {/* Kanban Column 1: DRAFT */}
              <div className="flex flex-col gap-1.5 sm:gap-2 opacity-50 xl:opacity-100">
                <div className="flex items-center justify-between border-b pb-1 border-slate-300">
                  <span className="font-extrabold text-[#3b82f6]/95 uppercase text-[7px] sm:text-[10px] tracking-wider">Draft</span>
                  <span className="bg-slate-200 text-slate-600 rounded-full h-3.5 px-1 inline-flex items-center justify-center font-bold text-[7px] sm:text-[8px]">0</span>
                </div>
                <div className="bg-white/55 border border-dashed border-slate-300/80 rounded-xl p-3 flex flex-col items-center justify-center h-20 text-center text-slate-400 text-[7px] sm:text-[9.5px] font-bold">
                  No deals
                </div>
              </div>

              {/* Kanban Column 2: SENT */}
              <div className="flex flex-col gap-1.5 sm:gap-2 opacity-50 xl:opacity-100">
                <div className="flex items-center justify-between border-b pb-1 border-slate-300">
                  <span className="font-extrabold text-[#3b82f6]/95 uppercase text-[7px] sm:text-[10px] tracking-wider">Sent</span>
                  <span className="bg-slate-200 text-slate-600 rounded-full h-3.5 px-1 inline-flex items-center justify-center font-bold text-[7px] sm:text-[8px]">0</span>
                </div>
                <div className="bg-white/55 border border-dashed border-slate-300/80 rounded-xl p-3 flex flex-col items-center justify-center h-20 text-center text-slate-400 text-[7px] sm:text-[9.5px] font-bold">
                  No deals
                </div>
              </div>

              {/* Kanban Column 3: VIEWED */}
              <div className="flex flex-col gap-1.5 sm:gap-2 opacity-35 xl:opacity-100">
                <div className="flex items-center justify-between border-b pb-1 border-slate-300">
                  <span className="font-extrabold text-[#3b82f6]/95 uppercase text-[7px] sm:text-[10px] tracking-wider">Viewed</span>
                  <span className="bg-slate-200 text-slate-600 rounded-full h-3.5 px-1 inline-flex items-center justify-center font-bold text-[7px] sm:text-[8px]">0</span>
                </div>
                <div className="bg-white/55 border border-dashed border-slate-300/80 rounded-xl p-3 flex flex-col items-center justify-center h-20 text-center text-slate-400 text-[7px] sm:text-[9.5px] font-bold">
                  No deals
                </div>
              </div>

              {/* Kanban Column 4: ACCEPTED */}
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <div className="flex items-center justify-between border-b pb-1 border-slate-300">
                  <span className="font-extrabold text-emerald-600 uppercase text-[7px] sm:text-[10px] tracking-wider">Accepted</span>
                  <span className="bg-emerald-100 text-emerald-800 rounded-full h-3.5 px-1.5 inline-flex items-center justify-center font-black text-[7px] sm:text-[9px]">1</span>
                </div>
                
                {/* Accepted deal card: Small Deck Build */}
                <div className="bg-white border border-slate-200 p-1.5 sm:p-2.5 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col gap-1 sm:gap-1.5 relative group/card">
                  <div className="absolute right-1.5 top-1.5 text-slate-300 group-hover/card:text-slate-500 cursor-pointer">
                    <MoreVertical className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-[7.5px] sm:text-[11px] leading-tight pr-3 truncate">Small Deck Build</h4>
                    <span className="text-slate-600 font-extrabold text-[7px] sm:text-[10px] block mt-0.5">$3,499</span>
                  </div>
                  <div className="flex flex-col gap-0.5 pt-1 border-t border-slate-100 text-slate-400 font-semibold text-[6px] sm:text-[9px]">
                    <span className="flex items-center gap-1 text-slate-500">
                      <div className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[6px] sm:text-[7px]">G</div>
                      George Campbell
                    </span>
                    <span className="flex items-center gap-1 text-slate-400 tracking-tight truncate">
                      <FileText className="h-2 w-2 sm:h-3 sm:w-3 text-slate-300" />
                      QT-202604-6424 • 4/3/26
                    </span>
                  </div>
                </div>
              </div>

              {/* Kanban Column 5: COMPLETED */}
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <div className="flex items-center justify-between border-b pb-1 border-slate-300">
                  <span className="font-extrabold text-blue-600 uppercase text-[7px] sm:text-[10px] tracking-wider">Completed</span>
                  <span className="bg-blue-100 text-blue-800 rounded-full h-3.5 px-1.5 inline-flex items-center justify-center font-black text-[7px] sm:text-[9px]">2</span>
                </div>

                {/* Completed deal card 1: Backyard Deck */}
                <div className="bg-white border border-slate-200 p-1.5 sm:p-2.5 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col gap-1 sm:gap-1.5 relative group/card">
                  <div className="absolute right-1.5 top-1.5 text-slate-300 group-hover/card:text-slate-500 cursor-pointer">
                    <MoreVertical className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-[7.5px] sm:text-[11px] leading-tight pr-3 truncate">Backyard Deck</h4>
                    <span className="text-slate-600 font-extrabold text-[7px] sm:text-[10px] block mt-0.5">$3,499</span>
                  </div>
                  <div className="flex flex-col gap-0.5 pt-1 border-t border-slate-100 text-slate-400 font-semibold text-[6px] sm:text-[9px]">
                    <span className="flex items-center gap-1 text-slate-500">
                      <div className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full bg-blue-100 text-[#1E6FD9] flex items-center justify-center font-bold text-[6px] sm:text-[7px]">G</div>
                      George Campbell
                    </span>
                    <span className="flex items-center gap-1 text-slate-400 tracking-tight truncate">
                      <FileText className="h-2 w-2 sm:h-3 sm:w-3 text-slate-300" />
                      QT-202603-5308 • 3/7/26
                    </span>
                  </div>
                </div>

                {/* Completed deal card 2: Trim Package */}
                <div className="bg-white border border-slate-200 p-1.5 sm:p-2.5 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col gap-1 sm:gap-1.5 relative group/card">
                  <div className="absolute right-1.5 top-1.5 text-slate-300 group-hover/card:text-slate-500 cursor-pointer">
                    <MoreVertical className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-[7.5px] sm:text-[11px] leading-tight pr-3 truncate">Trim Package for New House</h4>
                    <span className="text-slate-600 font-extrabold text-[7px] sm:text-[10px] block mt-0.5">$3,766</span>
                  </div>
                  <div className="flex flex-col gap-0.5 pt-1 border-t border-slate-100 text-slate-400 font-semibold text-[6px] sm:text-[9px]">
                    <span className="flex items-center gap-1 text-slate-400">
                      <div className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[6px] sm:text-[7px]">N</div>
                      No Contact
                    </span>
                    <span className="flex items-center gap-1 text-slate-400 tracking-tight truncate">
                      <FileText className="h-2 w-2 sm:h-3 sm:w-3 text-slate-300" />
                      QT-202603-3742 • 3/6/26
                    </span>
                  </div>
                </div>
              </div>

              {/* ── 2. SIDE INTELLIGENCE PANELS (LAPTOP OVERLAY RIGHT) ── */}
              {/* Daily Progress Widget hovering on Right */}
              <div className="absolute top-2 right-2 w-[180px] sm:w-[240px] bg-white rounded-2xl shadow-xl border border-slate-100/80 p-2 sm:p-4 flex flex-col gap-2 z-10 hidden md:flex hover:translate-y-[-2px] transition-transform duration-200">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                  <span className="font-black text-slate-700 text-[9px] sm:text-xs">Your Progress metrics</span>
                  <button className="text-slate-400 hover:text-slate-600 font-extrabold text-xs">×</button>
                </div>

                <div className="grid grid-cols-3 gap-1 sm:gap-2 select-all py-1">
                  <div className="flex flex-col items-center bg-slate-50 rounded-lg p-1 text-center border border-slate-100">
                    <div className="h-6 w-6 rounded-full border-2 border-emerald-500 flex items-center justify-center text-emerald-600 font-black text-[9px] sm:text-[10px]">
                      3
                    </div>
                    <span className="text-[7px] sm:text-[8px] text-slate-400 font-bold block mt-1">tasks</span>
                  </div>
                  <div className="flex flex-col items-center bg-slate-50 rounded-lg p-1 text-center border border-slate-100">
                    <div className="h-6 w-6 rounded-full border-2 border-blue-400 flex items-center justify-center text-blue-600 font-black text-[9px] sm:text-[10px]">
                      46
                    </div>
                    <span className="text-[7px] sm:text-[8px] text-slate-400 font-bold block mt-1">calls</span>
                  </div>
                  <div className="flex flex-col items-center bg-slate-50 rounded-lg p-1 text-center border border-slate-100">
                    <div className="h-6 w-6 rounded-full border-2 border-indigo-400 flex items-center justify-center text-indigo-600 font-black text-[9px] sm:text-[10px]">
                      96
                    </div>
                    <span className="text-[7px] sm:text-[8px] text-slate-400 font-bold block mt-1">activities</span>
                  </div>
                </div>

                <div className="text-[8px] sm:text-[10.5px] font-semibold border-t pt-2 border-slate-100 flex flex-col gap-1 text-slate-400">
                  <div className="flex justify-between">
                    <span>Daily progress</span>
                    <span className="text-emerald-500 font-black">Success rate: 98%</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Monthly total:</span>
                    <span className="font-extrabold text-[#1E6FD9]">$24,100 forecasted</span>
                  </div>
                </div>
              </div>

              {/* AI Generative Email Helper Box in laptop screen corner */}
              <div className="absolute bottom-2 right-2 w-[210px] sm:w-[260px] bg-slate-900 text-white rounded-2xl shadow-xl border border-white/10 p-2 sm:p-4 flex flex-col gap-1.5 sm:gap-2.5 z-10 hidden md:flex">
                <div className="flex justify-between items-center pb-1 border-b border-white/5">
                  <span className="font-black text-[9px] sm:text-xs flex items-center gap-1 text-indigo-300">
                    <Sparkles className="h-3 w-3 text-indigo-400 animate-pulse fill-indigo-400" />
                    Write my email
                  </span>
                  <span className="text-[7px] sm:text-[9.5px] font-mono text-slate-500 font-semibold uppercase">ProSpaces AI</span>
                </div>
                <div className="text-[8px] sm:text-xs text-slate-300">
                  Write a follow-up email that we has a discount code <span className="font-bold text-yellow-400 font-mono">WOW15</span>.
                </div>
                
                {/* Generation bar animation */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-[7px] sm:text-[9.5px] font-bold text-slate-400">
                    <div className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce" />
                    <span>Generating campaign email...</span>
                  </div>
                  <div className="h-1.5 sm:h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full"
                      animate={{ x: [-80, 200] }}
                      transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                      style={{ width: '40%' }}
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Laptop Bottom Keyboard Base Trapezoid to give 3D overlap realism */}
        <div className="w-[84%] mx-auto h-2 bg-slate-850 rounded-b-xl border-t border-slate-600/40 relative z-0">
          <div className="absolute inset-x-12 bottom-0.5 h-1 bg-black/60 rounded-full" />
        </div>
      </div>

      {/* ── 3. OVERLAPPING SMARTPHONE MOCKUP (LEFT FRONT) ── */}
      <motion.div 
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.5, type: 'spring', stiffness: 90 }}
        className="absolute left-[3%] sm:left-[4%] bottom-[2%] w-[85px] xs:w-[100px] sm:w-[130px] md:w-[155px] lg:w-[175px] aspect-[9/18.5] bg-[#0F172A] rounded-[14px] sm:rounded-[28px] p-0.5 sm:p-2 shadow-2xl border border-slate-700/50 hover:translate-y-[-6px] hover:scale-[1.04] transition-all duration-300 z-20 cursor-grab active:cursor-grabbing"
      >
        {/* Phone Speaker & Dynamic Island Notch */}
        <div className="absolute top-2.5 sm:top-3.5 left-1/2 -translate-x-1/2 h-4 w-12 bg-black rounded-lg flex items-center justify-center p-0.5 z-30">
          <div className="h-1 w-5 bg-slate-800 rounded-full" />
          <div className="h-1 w-1 rounded-full bg-slate-900 ml-1.5" />
        </div>

        {/* Smartphone Screen Inner Frame */}
        <div className="w-full h-full bg-slate-50 text-slate-800 rounded-[12px] sm:rounded-[24px] overflow-hidden flex flex-col relative select-none font-sans text-[7px] sm:text-xs">
          
          {/* Mobile Top Status Row */}
          <div className="p-3 pb-1 pt-4 sm:pt-6 sm:p-4 bg-slate-100 font-bold font-mono text-[7px] sm:text-[9.5px] flex justify-between items-center text-slate-400 shrink-0">
            <span>12:30</span>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded bg-slate-400" />
              <div className="h-1.5 w-3 bg-slate-400 rounded-sm" />
            </div>
          </div>

          {/* Mobile Header navigation */}
          <div className="px-3 sm:px-4 py-2 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
            <button className="h-4 w-4 sm:h-6 sm:w-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-800">
              <ArrowLeft className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 stroke-[3]" />
            </button>
            <div className="text-center">
              <h4 className="font-black text-slate-800 text-[8px] sm:text-[11.5px] leading-tight">Backyard Deck Deal</h4>
              <span className="text-slate-500 font-bold block mt-0.5 text-[7px] sm:text-[9px]">$3,499</span>
            </div>
            <button className="h-4 w-4 sm:h-6 sm:w-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">
              <MoreVertical className="h-3 w-3 text-slate-400" />
            </button>
          </div>

          {/* Mobile Metadata items */}
          <div className="px-3 sm:px-4 py-1.5 bg-slate-50/70 border-b border-slate-100 flex flex-col gap-1 text-slate-400 font-semibold text-[6px] sm:text-[9px]">
            <span className="flex items-center gap-1.5 text-slate-600">
              <div className="h-3 w-3 bg-blue-100 text-[#1E6FD9] rounded-full flex items-center justify-center text-[7px] font-black">G</div>
              George Campbell
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <Building2 className="h-3 w-3 text-slate-350" />
              Backyard Deck Project
            </span>
          </div>

          {/* Interactive tabs */}
          <div className="bg-white border-b border-slate-100 flex text-center font-black tracking-tight text-[6.5px] sm:text-[9.5px] text-slate-400 shrink-0">
            <div className="w-1/2 py-2 text-[#1E6FD9] border-b-2 border-[#1E6FD9] font-black cursor-pointer">
              TIMELINE
            </div>
            <div className="w-1/2 py-2 hover:text-slate-600 cursor-pointer">
              DETAILS
            </div>
          </div>

          {/* Task Timeline / History Screen Area */}
          <div className="flex-1 p-2.5 sm:p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3">
            
            {/* Focus Task section */}
            <div>
              <span className="text-[6px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Focus Task</span>
              <div className="bg-white border border-slate-200 rounded-xl p-1.5 sm:p-2.5 flex items-start gap-2 shadow-sm">
                <input type="checkbox" disabled className="mt-0.5 h-2.5 w-2.5 border-slate-300 rounded text-[#1E6FD9]" />
                <div>
                  <h5 className="font-extrabold text-slate-800 text-[7px] sm:text-[9.5px] leading-tight">Present the mood board</h5>
                  <span className="text-amber-600 font-bold block mt-0.5 text-[5.5px] sm:text-[8px]">Scheduled: Today • George Campbell</span>
                </div>
              </div>
            </div>

            {/* Completed history section */}
            <div>
              <span className="text-[6px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">History Log</span>
              <div className="bg-white/70 border border-slate-200/60 rounded-xl p-1.5 sm:p-2.5 flex items-start gap-2">
                <div className="mt-0.5 h-3 w-3 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-[6px]">
                  ✓
                </div>
                <div>
                  <h5 className="font-semibold text-slate-500 line-through text-[7px] sm:text-[9.5px] leading-tight">Email the contact</h5>
                  <span className="text-slate-400 font-medium block mt-0.5 text-[5.5px] sm:text-[8px]">Completed: Yesterday</span>
                </div>
              </div>
            </div>

          </div>

          {/* Mobile Bottom Action Buttons Block */}
          <div className="p-2 sm:p-3 bg-white border-t border-slate-100 grid grid-cols-2 gap-1.5 sm:gap-2 shrink-0">
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-1.5 sm:py-2.5 rounded-lg text-[7.5px] sm:text-[10px] shadow-sm flex items-center justify-center gap-1 transition-all">
              <span>Won</span>
            </button>
            <button className="border border-rose-200 text-rose-600 hover:bg-rose-50 font-black py-1.5 sm:py-2.5 rounded-lg text-[7.5px] sm:text-[10px] flex items-center justify-center gap-1 transition-all">
              <span>Lost</span>
            </button>
          </div>

          {/* Floating Pill bar on mobile screen */}
          <div className="p-1 pt-0 pb-2 bg-white flex justify-center shrink-0">
            <div className="bg-emerald-600 text-white rounded-full py-1 sm:py-1.5 px-3.5 flex items-center gap-2.5 sm:gap-3.5 shadow-md">
              <Plus className="h-2 w-2 sm:h-3 sm:w-3 stroke-[3]" />
              <div className="h-2.5 w-[1px] bg-white/20" />
              <Phone className="h-2 w-2 sm:h-3 sm:w-3 fill-white stroke-none" />
              <div className="h-2.5 w-[1px] bg-white/20" />
              <MessageSquare className="h-2 w-2 sm:h-3 sm:w-3" />
            </div>
          </div>

        </div>
      </motion.div>

      {/* ── 4. FLOATING WELCOME BADGE (BOTTOM CENTER) ── */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.4 }}
        className="absolute bottom-4 right-[4%] xs:right-[6%] sm:right-[15%] bg-white rounded-full py-2.5 sm:py-3.5 px-6 sm:px-8 border border-slate-100 shadow-xl flex items-center gap-2.5 sm:gap-3.5 z-30 ring-4 ring-[#E8EFF8]"
      >
        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center text-xs sm:text-base shadow-sm">
          P
        </div>
        <div>
          <h4 className="font-black text-slate-800 text-[9px] sm:text-xs leading-none">Hi there, Welcome to ProSpaces!</h4>
          <span className="text-[7px] sm:text-[9px] text-slate-400 font-bold block mt-0.5">Let's streamline your materials, specs &amp; CRM</span>
        </div>
      </motion.div>

    </div>
  );
}
