import React from 'react';
import logoAsset from '../assets/logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  // Map standard size presets to proper dimensions matching the brand image aspect ratio (approx 3:2)
  const sizeClasses = {
    sm: 'h-10 w-auto shrink-0',
    md: 'h-16 w-auto shrink-0',
    lg: 'h-24 w-auto shrink-0',
    xl: 'h-36 w-auto shrink-0',
  };

  const hasHeight = className.includes('h-') || className.includes('h[');
  const sizeToApply = hasHeight ? '' : sizeClasses[size];

  return (
    <img
      src={logoAsset}
      alt="ProSpaces CRM Logo"
      referrerPolicy="no-referrer"
      className={`${sizeToApply} ${className} object-contain z-50`}
    />
  );
}


