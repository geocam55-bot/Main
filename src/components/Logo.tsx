import React from 'react';
import { APPLE_ICON_BASE64 } from './LogoBase64';

const logoAsset = APPLE_ICON_BASE64;

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export function Logo({ size = 'md', className = '', showText = true }: LogoProps) {
  // Icon dimensions per size
  const iconSizeClasses = {
    sm: 'h-8 sm:h-9 w-auto shrink-0',
    md: 'h-12 sm:h-14 w-auto shrink-0',
    lg: 'h-18 sm:h-20 w-auto shrink-0',
    xl: 'h-24 sm:h-28 w-auto shrink-0',
  };

  // Text sizes based on component size
  const titleSizeClasses = {
    sm: 'text-base font-black tracking-tight text-[#002f5d]',
    md: 'text-xl sm:text-2xl font-black tracking-tight text-[#002f5d]',
    lg: 'text-2xl sm:text-3xl font-black tracking-tight text-[#002f5d]',
    xl: 'text-3.5xl sm:text-5xl font-black tracking-tighter text-[#002f5d]',
  };

  const crmSizeClasses = {
    sm: 'text-[10px] font-extrabold tracking-wider text-[#1E6FD9] uppercase ml-1.5',
    md: 'text-xs font-extrabold tracking-wider text-[#1E6FD9] uppercase ml-1.5 sm:ml-2',
    lg: 'text-sm font-extrabold tracking-wider text-[#1E6FD9] uppercase ml-2 sm:ml-2.5',
    xl: 'text-base sm:text-xl font-extrabold tracking-wider text-[#1E6FD9] uppercase ml-2 sm:ml-3',
  };

  const hasHeight = className.includes('h-') || className.includes('h[');
  const iconClassToApply = hasHeight ? className : `${iconSizeClasses[size]} ${className}`;

  if (!showText) {
    return (
      <img
        src={logoAsset}
        alt="ProSpaces Logo"
        referrerPolicy="no-referrer"
        className={`${iconClassToApply} object-contain z-50`}
      />
    );
  }

  return (
    <div className="inline-flex items-center gap-2 sm:gap-3 select-none">
      <img
        src={logoAsset}
        alt="ProSpaces Logo"
        referrerPolicy="no-referrer"
        className={`${iconClassToApply} object-contain z-50`}
      />
      <div className="flex items-baseline font-sans leading-none z-50">
        <span className={titleSizeClasses[size]}>
          ProSpaces
        </span>
        <span className={crmSizeClasses[size]}>
          CRM
        </span>
      </div>
    </div>
  );
}



