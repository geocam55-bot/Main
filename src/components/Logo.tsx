import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-12 w-36 shrink-0',
    md: 'h-[72px] w-[216px] shrink-0',
    lg: 'h-[120px] w-[360px] shrink-0',
    xl: 'h-[192px] w-[576px] shrink-0',
  };

  return (
    <svg
      viewBox="0 0 480 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeClasses[size]} ${className} object-contain z-50 relative`}
    >
      <defs>
        {/* Sky-blue to deep-royal-blue linear gradient for the majestic P Loop */}
        <linearGradient id="pLoopGrad" x1="52" y1="22" x2="155" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />   {/* Power Blue */}
          <stop offset="60%" stopColor="#1E4ED8" />  {/* Corporate Royal Blue */}
          <stop offset="100%" stopColor="#1E3A8A" /> {/* Deep Midnight Blue */}
        </linearGradient>

        {/* Deep accent gradient for the left pillar to provide rich contrast */}
        <linearGradient id="leftPillarGrad" x1="12" y1="38" x2="52" y2="138" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#111827" />   {/* Near Obsidian */}
          <stop offset="40%" stopColor="#0B2556" />  {/* Space Deep Navy */}
          <stop offset="100%" stopColor="#1D4ED8" /> {/* Edge Royal Blue */}
        </linearGradient>

        {/* Bright flame gradient for the orange roofline slope */}
        <linearGradient id="orangeRoofGrad" x1="82" y1="80" x2="124" y2="138" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F97316" />   {/* Vibrant Orange */}
          <stop offset="100%" stopColor="#EA580C" /> {/* Fire Orange */}
        </linearGradient>

        <filter id="vectorDropShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="1" dy="1.5" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.08" />
        </filter>
      </defs>

      <g filter="url(#vectorDropShadow)">
        {/* 1. LEFT PILLAR LOGO GRAPHIC MARK (starts at x=10) */}
        
        {/* Left deep angled structural pillar block */}
        <path
          d="M 12 138
             V 72
             L 52 38
             V 104
             Z"
          fill="url(#leftPillarGrad)"
        />

        {/* Gorgeous blue ribbon "P" loop with slanted top edge parallel to left pillar roofline */}
        <path
          d="M 32 38
             L 52 22
             H 114
             C 145 22, 158 46, 155 74
             C 152 102, 131 118, 102 118
             H 52
             V 102
             H 102
             C 118 102, 126 92, 127 74
             C 128 56, 118 46, 102 46
             H 52
             V 38
             Z"
          fill="url(#pLoopGrad)"
        />

        {/* White house body silhouette nested inside the P cutout area */}
        <path
          d="M 52 104
             L 82 80
             V 138
             H 52
             Z"
          fill="#FFFFFF"
        />

        {/* Glowing orange roof element extending down the right roofline */}
        <path
          d="M 82 80
             L 115 106
             H 124
             V 138
             H 104
             V 118
             L 82 100
             Z"
          fill="url(#orangeRoofGrad)"
        />

        {/* Sharp dark navy 4-pane building grid window */}
        <g fill="#0B2556">
          <rect x="62" y="112" width="6" height="6" rx="0.5" />
          <rect x="71" y="112" width="6" height="6" rx="0.5" />
          <rect x="62" y="121" width="6" height="6" rx="0.5" />
          <rect x="71" y="121" width="6" height="6" rx="0.5" />
        </g>

        {/* 2. BRANED RIGHT TYPOGRAPHY */}
        
        {/* Elegant "ProSpaces" Text */}
        <text
          x="185"
          y="78"
          fontFamily="'Inter', system-ui, sans-serif"
          fontWeight="800"
          fontSize="56"
          letterSpacing="-0.03em"
        >
          <tspan fill="#0C2556">Pro</tspan>
          <tspan fill="#1E60F2">Spaces</tspan>
        </text>

        {/* Segmented Line Accents & "CRM" Subtitle */}
        <line x1="185" y1="114" x2="265" y2="114" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
        <text
          x="320"
          y="122"
          textAnchor="middle"
          fontFamily="'Inter', system-ui, sans-serif"
          fontWeight="600"
          fontSize="22"
          fill="#64748B"
          letterSpacing="0.25em"
        >
          CRM
        </text>
        <line x1="375" y1="114" x2="455" y2="114" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

