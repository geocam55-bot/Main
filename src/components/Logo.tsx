import React, { useId } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  variant?: 'auto' | 'dark' | 'light';
}

function ProSpacesMark({ className }: { className: string }) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const pGradId = `ps-p-grad-${uid}`;
  const bevelGradId = `ps-bevel-grad-${uid}`;
  const cyanGradId = `ps-cyan-grad-${uid}`;
  const orangeGradId = `ps-orange-grad-${uid}`;

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="ProSpaces Logo"
      className={`${className} shrink-0`}
    >
      <defs>
        <linearGradient id={pGradId} x1="18" y1="6" x2="86" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="45%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id={bevelGradId} x1="16" y1="22" x2="60" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E40AF" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id={cyanGradId} x1="10" y1="30" x2="88" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#67E8F9" />
          <stop offset="50%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
        <linearGradient id={orangeGradId} x1="22" y1="44" x2="86" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="55%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>

      {/* Chimney */}
      <path
        d="M66 13H77V18H75V30H66V13Z"
        fill={`url(#${pGradId})`}
        stroke="#60A5FA"
        strokeOpacity="0.45"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Left 3D roof bevel + vertical stem */}
      <path
        d="M22 30L50 9V21L32 34.5V91H22V30Z"
        fill={`url(#${bevelGradId})`}
        stroke="#60A5FA"
        strokeOpacity="0.35"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Main Architectural House 'P' Ribbon */}
      <path
        d="M50 9L82 32.5C84.2 34.2 85.5 36.8 85.5 39.6V53.5C85.5 67.2 74.6 76 59.5 76H36V91H24V64H58.5C68.2 64 74.5 59.2 74.5 51.8V41L50 22.8L32 36V23L50 9Z"
        fill={`url(#${pGradId})`}
        stroke="#93C5FD"
        strokeOpacity="0.45"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />

      {/* Inner white house gable cutout */}
      <path
        d="M36 39L50 28.5L64 39V54.5C64 56.4 62.4 58 60.5 58H39.5C37.6 58 36 56.4 36 54.5V39Z"
        fill="#F8FAFC"
      />

      {/* 4-pane window inside house */}
      <g fill="#0F172A">
        <rect x="44" y="40" width="5" height="5" rx="0.8" />
        <rect x="51" y="40" width="5" height="5" rx="0.8" />
        <rect x="44" y="47" width="5" height="5" rx="0.8" />
        <rect x="51" y="47" width="5" height="5" rx="0.8" />
      </g>

      {/* Outer Cyan Swoosh */}
      <path
        d="M17 33C9 47 22 65 48 73.5C67 79.8 82.5 74.8 87.5 63.5C80.5 71 66.5 73 48.5 67C27 59.8 14.5 45.5 17 33Z"
        fill={`url(#${cyanGradId})`}
      />

      {/* Inner Amber/Orange Energy Swoosh */}
      <path
        d="M21 44C23.5 56 38 66.5 56 70.5C71 73.8 82.2 69.2 85.5 59.5C79.5 66 69.5 68 56 64.8C40 61 27 52.5 21 44Z"
        fill={`url(#${orangeGradId})`}
      />

      {/* Crisp bright highlight streaks */}
      <path
        d="M19 46C27 56.5 41 64 57 68"
        stroke="#E0F2FE"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeOpacity="0.9"
      />
      <circle cx="81" cy="54" r="1.5" fill="#FDBA74" />
      <circle cx="87" cy="58" r="1.1" fill="#67E8F9" />
      <circle cx="13" cy="50" r="1.1" fill="#67E8F9" />
    </svg>
  );
}

export function Logo({
  size = 'md',
  className = '',
  showText = true,
  variant = 'auto',
}: LogoProps) {
  // Icon dimensions per size
  const iconSizeClasses = {
    sm: 'h-8 sm:h-9 w-auto shrink-0',
    md: 'h-11 sm:h-12 w-auto shrink-0',
    lg: 'h-16 sm:h-18 w-auto shrink-0',
    xl: 'h-20 sm:h-24 w-auto shrink-0',
  };

  const titleColorClass =
    variant === 'dark'
      ? 'text-white'
      : variant === 'light'
      ? 'text-slate-900'
      : 'text-slate-900 dark:text-white print:text-slate-900';

  const crmColorClass =
    variant === 'dark'
      ? 'text-[#38BDF8]'
      : variant === 'light'
      ? 'text-[#1E6FD9]'
      : 'text-[#1E6FD9] dark:text-[#38BDF8] print:text-[#1E6FD9]';

  // Text sizes based on component size
  const titleSizeClasses = {
    sm: `text-base font-black tracking-tight ${titleColorClass}`,
    md: `text-xl sm:text-2xl font-black tracking-tight ${titleColorClass}`,
    lg: `text-2xl sm:text-3xl font-black tracking-tight ${titleColorClass}`,
    xl: `text-3xl sm:text-5xl font-black tracking-tighter ${titleColorClass}`,
  };

  const crmSizeClasses = {
    sm: `text-[10px] font-extrabold tracking-wider uppercase ml-1.5 ${crmColorClass}`,
    md: `text-xs font-extrabold tracking-wider uppercase ml-1.5 sm:ml-2 ${crmColorClass}`,
    lg: `text-sm font-extrabold tracking-wider uppercase ml-2 sm:ml-2.5 ${crmColorClass}`,
    xl: `text-base sm:text-xl font-extrabold tracking-wider uppercase ml-2 sm:ml-3 ${crmColorClass}`,
  };

  const hasHeight = className.includes('h-') || className.includes('h[');
  const iconClassToApply = hasHeight ? className : `${iconSizeClasses[size]} ${className}`;

  if (!showText) {
    return <ProSpacesMark className={`${iconClassToApply} z-50`} />;
  }

  return (
    <div className="inline-flex items-center gap-2 sm:gap-3 select-none">
      <ProSpacesMark className={`${iconClassToApply} z-50`} />
      <div className="flex items-baseline font-sans leading-none z-50">
        <span className={titleSizeClasses[size]}>ProSpaces</span>
        <span className={crmSizeClasses[size]}>CRM</span>
      </div>
    </div>
  );
}