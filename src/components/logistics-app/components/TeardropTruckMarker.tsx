import React from 'react';
import { Truck as TruckIcon } from 'lucide-react';

export interface TeardropTruckMarkerProps {
  /** Teardrop body color in Hex format, e.g. #2563eb, #dc2626, #facc15, #0f172a */
  color?: string;
  /** Inner badge background color */
  innerBgColor?: string;
  /** Truck icon color inside the pin */
  iconColor?: string;
  /** Live driving / in transit status */
  isMoving?: boolean;
  /** Engine idling status */
  isIdling?: boolean;
  /** Whether the truck is currently selected/highlighted */
  isSelected?: boolean;
  /** Compass heading in degrees (0 - 360) */
  heading?: number;
  /** Optional label under the marker (unit #, speed, etc.) */
  label?: string;
  /** Optional speed string (e.g. "54 km/h") */
  speedText?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Extra class names */
  className?: string;
}

export const TeardropTruckMarker: React.FC<TeardropTruckMarkerProps> = ({
  color = '#2563eb',
  innerBgColor = '#ffffff',
  iconColor,
  isMoving = false,
  isIdling = false,
  isSelected = false,
  heading,
  label,
  speedText,
  size = 'md',
  className = ''
}) => {
  // Dimensions based on size variant
  const dimensions = {
    sm: { width: 30, height: 40, iconSize: 13, innerR: 9.5, cy: 15, cx: 15 },
    md: { width: 38, height: 50, iconSize: 16, innerR: 12, cy: 19, cx: 19 },
    lg: { width: 46, height: 60, iconSize: 20, innerR: 14.5, cy: 23, cx: 23 }
  }[size];

  const effectiveIconColor = iconColor || (innerBgColor === '#ffffff' ? (color === '#facc15' || color === '#eab308' ? '#854d0e' : color) : '#ffffff');

  return (
    <div className={`relative flex flex-col items-center select-none group cursor-pointer transition-transform duration-300 ${isSelected ? 'scale-115 z-50' : 'hover:scale-105 z-20'} ${className}`}>
      
      {/* Live Beacon Pulse Halo for Moving Trucks */}
      {isMoving && (
        <span 
          className="animate-ping absolute -top-1 inline-flex rounded-full bg-emerald-400 opacity-50 pointer-events-none"
          style={{
            width: dimensions.width + 12,
            height: dimensions.width + 12
          }}
        />
      )}

      {/* Main Traditional Teardrop SVG Pin */}
      <div className="relative filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.35)] transition-all duration-300">
        <svg
          width={dimensions.width}
          height={dimensions.height}
          viewBox="0 0 38 50"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          <defs>
            {/* Gradient highlight for 3D depth */}
            <linearGradient id={`teardropGrad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
            </linearGradient>
            <filter id="pinShadow" x="-20%" y="-10%" width="140%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Selection Ring Glow if Selected */}
          {isSelected && (
            <path
              d="M19 0.5C8.23 0.5 0 8.73 0 19C0 31.5 19 49.5 19 49.5C19 49.5 38 31.5 38 19C38 8.73 29.77 0.5 19 0.5Z"
              fill="none"
              stroke="#60a5fa"
              strokeWidth="5"
              strokeLinejoin="round"
              className="animate-pulse"
              opacity="0.85"
            />
          )}

          {/* Outer Teardrop Silhouette with Crisp White Border */}
          <path
            d="M19 1.5C9.335 1.5 1.5 9.335 1.5 19C1.5 31.2 19 47.5 19 47.5C19 47.5 36.5 31.2 36.5 19C36.5 9.335 28.665 1.5 19 1.5Z"
            fill={color}
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Subtle Gloss Sheen Overlay */}
          <path
            d="M19 1.5C9.335 1.5 1.5 9.335 1.5 19C1.5 31.2 19 47.5 19 47.5C19 47.5 36.5 31.2 36.5 19C36.5 9.335 28.665 1.5 19 1.5Z"
            fill={`url(#teardropGrad-${color.replace('#', '')})`}
            stroke="none"
          />

          {/* Inner Badge Circle */}
          <circle
            cx="19"
            cy="18.5"
            r="12.5"
            fill={innerBgColor}
            stroke="#ffffff"
            strokeWidth="1"
            className="shadow-inner"
          />
        </svg>

        {/* Centered Truck Icon inside the Teardrop Head */}
        <div 
          className="absolute inset-x-0 flex items-center justify-center pointer-events-none"
          style={{
            top: `${(18.5 / 50) * dimensions.height - dimensions.iconSize / 2}px`,
            height: `${dimensions.iconSize}px`
          }}
        >
          <TruckIcon 
            style={{ 
              width: `${dimensions.iconSize}px`, 
              height: `${dimensions.iconSize}px`,
              color: effectiveIconColor
            }} 
            strokeWidth={2.4}
          />
        </div>

        {/* Direction Heading Needle if heading is specified */}
        {typeof heading === 'number' && !isNaN(heading) && (
          <div 
            className="absolute top-0 right-0 transform translate-x-1 -translate-y-1 bg-white rounded-full p-[2px] shadow-md border border-slate-300 z-30 flex items-center justify-center"
            style={{
              transform: `rotate(${heading}deg)`,
              transformOrigin: 'center center'
            }}
            title={`Heading: ${Math.round(heading)}°`}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-slate-900">
              <path d="M12 2L2 22L12 18L22 22L12 2Z" />
            </svg>
          </div>
        )}

        {/* Live Status Badge Dot (Bottom-Right of Pin Head) */}
        {isMoving && (
          <span 
            className="absolute bg-emerald-500 border-2 border-white rounded-full z-30 shadow-sm"
            style={{
              width: size === 'sm' ? '8px' : '10px',
              height: size === 'sm' ? '8px' : '10px',
              top: `${(24 / 50) * dimensions.height}px`,
              right: '-1px'
            }}
            title="In Transit"
          />
        )}
        {isIdling && !isMoving && (
          <span 
            className="absolute bg-amber-500 border-2 border-white rounded-full z-30 shadow-sm"
            style={{
              width: size === 'sm' ? '8px' : '10px',
              height: size === 'sm' ? '8px' : '10px',
              top: `${(24 / 50) * dimensions.height}px`,
              right: '-1px'
            }}
            title="Engine Idling"
          />
        )}
      </div>

      {/* High-Contrast Unit Label Pill Below Pin */}
      {label && (
        <div 
          className={`mt-0.5 px-1.5 py-0.5 rounded-md text-[9.5px] font-mono font-black tracking-tight shadow-md border whitespace-nowrap backdrop-blur-md transition-all ${
            isSelected
              ? 'bg-blue-600 text-white border-blue-400 scale-105 shadow-blue-500/30'
              : 'bg-slate-950/90 text-slate-100 border-slate-700/80 group-hover:bg-slate-900 group-hover:border-slate-500'
          }`}
        >
          <div className="flex items-center gap-1">
            <span>{label}</span>
            {speedText && (
              <span className="text-[8.5px] text-emerald-300 font-sans font-bold">
                &bull; {speedText}
              </span>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default TeardropTruckMarker;
