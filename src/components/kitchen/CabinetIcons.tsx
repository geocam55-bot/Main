import React from 'react';

// Base Cabinet - Isometric view
export function BaseCabinetIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-full h-full"} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        {/* Back face (top) */}
        <path d="M30 35 L60 20 L90 35 L60 50 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1"/>
        
        {/* Left face */}
        <path d="M30 35 L30 85 L60 100 L60 50 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1"/>
        
        {/* Right face */}
        <path d="M60 50 L60 100 L90 85 L90 35 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1"/>
        
        {/* Drawers / Doors split */}
        <line x1="30" y1="50" x2="60" y2="65" stroke="#e2e8f0" strokeWidth="1.5"/>
        <line x1="30" y1="60" x2="60" y2="75" stroke="#cbd5e1" strokeWidth="1"/>
        <line x1="60" y1="75" x2="90" y2="60" stroke="#94a3b8" strokeWidth="1"/>
        
        {/* Drawer highlights */}
        <path d="M32 51 L58 64" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.8"/>
        
        {/* Handles */}
        <rect x="42" y="45" width="6" height="1.5" rx="0.5" fill="#94a3b8" transform="rotate(26.5 42 45)"/>
        
        <circle cx="40" cy="65" r="1.5" fill="#64748b"/>
        <line x1="40" y1="65" x2="40" y2="72" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/>
        
        <circle cx="80" cy="65" r="1.5" fill="#475569"/>
        <line x1="80" y1="65" x2="80" y2="72" stroke="#475569" strokeWidth="1.5" strokeLinecap="round"/>
      </g>
    </svg>
  );
}

// Wall Cabinet - Isometric view
export function WallCabinetIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-full h-full"} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        {/* Back face (top) */}
        <path d="M25 45 L60 30 L95 45 L60 60 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1"/>
        
        {/* Left face */}
        <path d="M25 45 L25 80 L60 95 L60 60 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1"/>
        
        {/* Right face */}
        <path d="M60 60 L60 95 L95 80 L95 45 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1"/>
        
        {/* Door frame panels for detail */}
        <path d="M30 52 L30 75 L55 87 L55 64 Z" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1"/>
        <path d="M65 64 L65 87 L90 75 L90 52 Z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1"/>
        
        {/* Highlights */}
        <path d="M27 46 L27 79" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8"/>
        <path d="M27 46 L58 60" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8"/>
        
        {/* Handles */}
        <circle cx="48" cy="72" r="1.5" fill="#64748b"/>
        <circle cx="72" cy="72" r="1.5" fill="#475569"/>
      </g>
    </svg>
  );
}

// Tall Cabinet - Isometric view
export function TallCabinetIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-full h-full"} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        {/* Back face (top) */}
        <path d="M35 25 L60 15 L85 25 L60 35 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1"/>
        
        {/* Left face */}
        <path d="M35 25 L35 95 L60 105 L60 35 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1"/>
        
        {/* Right face */}
        <path d="M60 35 L60 105 L85 95 L85 25 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1"/>
        
        {/* Split lines */}
        <line x1="35" y1="50" x2="60" y2="60" stroke="#e2e8f0" strokeWidth="1.5"/>
        <line x1="60" y1="60" x2="85" y2="50" stroke="#cbd5e1" strokeWidth="1.5"/>
        
        <line x1="35" y1="70" x2="60" y2="80" stroke="#e2e8f0" strokeWidth="1.5"/>
        <line x1="60" y1="80" x2="85" y2="70" stroke="#cbd5e1" strokeWidth="1.5"/>
        
        {/* Highlights */}
        <path d="M37 27 L37 93" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.8"/>
        
        {/* Handles */}
        <circle cx="42" cy="42" r="1.2" fill="#64748b"/>
        <line x1="42" y1="42" x2="42" y2="46" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/>
        
        <circle cx="42" cy="62" r="1.2" fill="#64748b"/>
        <line x1="42" y1="62" x2="42" y2="66" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/>
        
        <circle cx="42" cy="82" r="1.2" fill="#64748b"/>
        <line x1="42" y1="82" x2="42" y2="86" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/>
      </g>
    </svg>
  );
}

// Corner Base Cabinet - Isometric view
export function CornerBaseCabinetIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-full h-full"} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        {/* L-shaped corner cabinet */}
        {/* Top/Back right face */}
        <path d="M40 30 L80 45 L80 90 L40 75 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1"/>
        
        {/* Front right face */}
        <path d="M80 45 L100 35 L100 80 L80 90 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1"/>
        
        {/* Back left face */}
        <path d="M20 40 L40 30 L40 75 L20 85 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1"/>
        
        {/* Counter top */}
        <path d="M40 30 L80 45 L100 35 L60 20 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1"/>
        <path d="M20 40 L40 30 L60 20 L40 10 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1"/>
        
        {/* Door details */}
        <path d="M25 45 L35 40 L35 72 L25 77 Z" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1"/>
        
        {/* Corner mechanism detail (Lazy Susan) */}
        <ellipse cx="40" cy="52" rx="12" ry="5" fill="none" stroke="#e2e8f0" strokeWidth="1.5" transform="rotate(26.5 40 52)"/>
        <ellipse cx="40" cy="52" rx="5" ry="2" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" transform="rotate(26.5 40 52)"/>
        
        {/* Highlight */}
        <path d="M22 41 L22 82" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.8"/>
      </g>
    </svg>
  );
}

// Island Cabinet - Isometric view
export function IslandCabinetIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-full h-full"} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        {/* Base back face */}
        <path d="M60 50 L95 35 L95 70 L60 85 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1"/>
        
        {/* Base front face */}
        <path d="M25 35 L25 70 L60 85 L60 50 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1"/>
        
        {/* Thick Countertop Top surface */}
        <path d="M20 35 L60 15 L100 35 L60 55 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1"/>
        {/* Countertop Front edge */}
        <path d="M20 35 L20 39 L60 59 L60 55 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.5"/>
        {/* Countertop Right edge */}
        <path d="M60 55 L60 59 L100 39 L100 35 Z" fill="#64748b" stroke="#475569" strokeWidth="0.5"/>
        
        {/* Drawers / Doors */}
        <line x1="25" y1="45" x2="60" y2="62" stroke="#e2e8f0" strokeWidth="1"/>
        <line x1="25" y1="52" x2="60" y2="69" stroke="#cbd5e1" strokeWidth="1"/>
        <line x1="25" y1="60" x2="60" y2="77" stroke="#cbd5e1" strokeWidth="1"/>
        
        {/* Drawer Highlights */}
        <path d="M27 46 L58 61" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.8"/>
        
        {/* Handles */}
        <rect x="35" y="47" width="8" height="1.5" rx="0.5" fill="#94a3b8" transform="rotate(26.5 35 47)"/>
        <rect x="35" y="55" width="8" height="1.5" rx="0.5" fill="#94a3b8" transform="rotate(26.5 35 55)"/>
        <rect x="35" y="63" width="8" height="1.5" rx="0.5" fill="#94a3b8" transform="rotate(26.5 35 63)"/>
      </g>
    </svg>
  );
}

// Refrigerator - Isometric view
export function RefrigeratorIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-full h-full"} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        {/* Back face (top) */}
        <path d="M35 20 L60 10 L85 20 L60 30 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1"/>
        
        {/* Left face (front) */}
        <path d="M35 20 L35 100 L60 110 L60 30 Z" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1"/>
        
        {/* Right face (side) */}
        <path d="M60 30 L60 110 L85 100 L85 20 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="1"/>
        
        {/* Door split (french door / freezer bottom) */}
        <line x1="35" y1="65" x2="60" y2="75" stroke="#94a3b8" strokeWidth="1.5"/>
        <line x1="60" y1="75" x2="85" y2="65" stroke="#64748b" strokeWidth="1.5"/>
        
        {/* French door vertical split */}
        <line x1="47.5" y1="25" x2="47.5" y2="70" stroke="#94a3b8" strokeWidth="1"/>
        
        {/* Handles */}
        <rect x="44" y="35" width="1.5" height="20" rx="0.5" fill="#e2e8f0"/>
        <rect x="49" y="37" width="1.5" height="20" rx="0.5" fill="#e2e8f0"/>
        
        {/* Freezer Handle */}
        <rect x="42" y="70" width="10" height="2" rx="1" fill="#e2e8f0" transform="rotate(21.8 42 70)"/>
        
        {/* Metallic Highlight */}
        <path d="M37 22 L37 98" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.5"/>
      </g>
    </svg>
  );
}

// Stove/Range - Isometric view
export function StoveIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-full h-full"} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        {/* Top surface */}
        <path d="M30 40 L60 25 L90 40 L60 55 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="1"/>
        
        {/* Burners */}
        <ellipse cx="45" cy="35" rx="5" ry="3" fill="#ef4444" opacity="0.8" transform="rotate(26.5 45 35)"/>
        <ellipse cx="45" cy="35" rx="4" ry="2" fill="#f97316" transform="rotate(26.5 45 35)"/>
        
        <ellipse cx="75" cy="35" rx="5" ry="3" fill="none" stroke="#475569" strokeWidth="1" transform="rotate(-26.5 75 35)"/>
        <ellipse cx="45" cy="45" rx="5" ry="3" fill="none" stroke="#475569" strokeWidth="1" transform="rotate(26.5 45 45)"/>
        <ellipse cx="75" cy="45" rx="5" ry="3" fill="none" stroke="#475569" strokeWidth="1" transform="rotate(-26.5 75 45)"/>
        
        {/* Left face (oven front) */}
        <path d="M30 40 L30 90 L60 105 L60 55 Z" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1"/>
        
        {/* Right face */}
        <path d="M60 55 L60 105 L90 90 L90 40 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="1"/>
        
        {/* Control panel tilt */}
        <path d="M30 40 L60 55 L60 62 L30 47 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1"/>
        <circle cx="35" cy="48" r="1.5" fill="#475569"/>
        <circle cx="42" cy="51.5" r="1.5" fill="#475569"/>
        <circle cx="49" cy="55" r="1.5" fill="#475569"/>
        <circle cx="56" cy="58.5" r="1.5" fill="#475569"/>
        
        {/* Oven door */}
        <path d="M33 55 L33 85 L57 97 L57 67 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1"/>
        
        {/* Oven window */}
        <path d="M36 62 L36 78 L54 90 L54 74 Z" fill="#1e293b" stroke="#334155" strokeWidth="1"/>
        {/* Glass reflection */}
        <path d="M38 64 L52 72 L45 72 Z" fill="#ffffff" opacity="0.1"/>
        
        {/* Handle */}
        <rect x="36" y="58" width="18" height="2" rx="1" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" transform="rotate(26.5 36 58)"/>
      </g>
    </svg>
  );
}

// Dishwasher - Isometric view
export function DishwasherIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-full h-full"} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        {/* Back face */}
        <path d="M35 35 L60 25 L85 35 L60 45 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1"/>
        
        {/* Left face */}
        <path d="M35 35 L35 90 L60 100 L60 45 Z" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1"/>
        
        {/* Right face */}
        <path d="M60 45 L60 100 L85 90 L85 35 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="1"/>
        
        {/* Control panel block */}
        <path d="M35 35 L60 45 L60 52 L35 42 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="1"/>
        
        {/* Buttons / Screen */}
        <rect x="40" y="40" width="8" height="2.5" fill="#0ea5e9" transform="rotate(21.8 40 40)"/>
        <circle cx="52" cy="46" r="1" fill="#10b981"/>
        <circle cx="55" cy="47.5" r="1" fill="#ef4444"/>
        
        {/* Door handle pocket */}
        <path d="M42 52 L53 57.5 L53 60 L42 54.5 Z" fill="#0f172a" opacity="0.3"/>
        <path d="M43 53 L52 57.5 L52 59 L43 54 Z" fill="#cbd5e1"/>
        
        {/* Base kickplate */}
        <path d="M35 84 L60 94 L60 100 L35 90 Z" fill="#475569" stroke="#334155" strokeWidth="1"/>
        
        {/* Metallic Highlight */}
        <path d="M37 38 L37 83" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.6"/>
      </g>
    </svg>
  );
}

// Microwave - Isometric view
export function MicrowaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-full h-full"} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        {/* Back face (top) */}
        <path d="M25 45 L60 30 L95 45 L60 60 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1"/>
        
        {/* Left face (front) */}
        <path d="M25 45 L25 75 L60 90 L60 60 Z" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1"/>
        
        {/* Right face (side) */}
        <path d="M60 60 L60 90 L95 75 L95 45 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="1"/>
        
        {/* Door Window */}
        <path d="M28 50 L48 59 L48 78 L28 69 Z" fill="#1e293b" stroke="#334155" strokeWidth="1"/>
        {/* Highlight on glass */}
        <path d="M30 52 L42 57 L38 57 Z" fill="#ffffff" opacity="0.1"/>
        
        {/* Control panel area */}
        <path d="M51 60.5 L57 63.5 L57 84 L51 81 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="1"/>
        
        {/* Display */}
        <path d="M52 62 L56 64 L56 66 L52 64 Z" fill="#0ea5e9"/>
        
        {/* Buttons */}
        <circle cx="53" cy="68" r="0.8" fill="#cbd5e1"/>
        <circle cx="55" cy="69" r="0.8" fill="#cbd5e1"/>
        <circle cx="53" cy="71" r="0.8" fill="#cbd5e1"/>
        <circle cx="55" cy="72" r="0.8" fill="#cbd5e1"/>
        <circle cx="54" cy="76" r="1.5" fill="#cbd5e1"/> {/* Dial */}
        
        {/* Door Handle */}
        <path d="M49 61 L50 61.5 L50 81 L49 80.5 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5"/>
      </g>
    </svg>
  );
}

// Sink - Isometric view
export function SinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-full h-full"} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        {/* Counter top */}
        <path d="M20 40 L60 25 L100 40 L60 55 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1"/>
        <path d="M20 40 L20 43 L60 58 L60 55 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.5"/>
        <path d="M60 55 L60 58 L100 43 L100 40 Z" fill="#64748b" stroke="#475569" strokeWidth="0.5"/>
        
        {/* Sink basin outer rim */}
        <path d="M40 40 L60 32 L80 40 L60 48 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" strokeLinejoin="round"/>
        
        {/* Sink basin inner bowl (darker for depth) */}
        <path d="M42 41 L60 34 L78 41 L60 46.5 L42 41 Z" fill="#94a3b8"/>
        
        {/* Inner basin bottom */}
        <path d="M45 44 L60 39 L75 44 L60 49 L45 44 Z" fill="#64748b"/>
        
        {/* Drain */}
        <ellipse cx="60" cy="45" rx="3" ry="1.5" fill="#334155"/>
        
        {/* Faucet base */}
        <ellipse cx="60" cy="30" rx="3" ry="1.5" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.5"/>
        <path d="M57 28.5 L57 30 L63 30 L63 28.5 Z" fill="#94a3b8"/>
        
        {/* Faucet arc */}
        <path d="M60 28.5 C 60 15, 75 15, 75 25 L 75 35" fill="none" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M60 28.5 C 60 15, 75 15, 75 25 L 75 35" fill="none" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round"/>
        
        {/* Faucet head */}
        <ellipse cx="75" cy="35" rx="2" ry="1" fill="#64748b"/>
        
        {/* Handle */}
        <line x1="63" y1="28" x2="68" y2="26" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round"/>
        
        {/* Sink shine */}
        <path d="M43 41 L59 34" stroke="#ffffff" strokeWidth="1" opacity="0.6"/>
      </g>
    </svg>
  );
}