import React from 'react';

interface ProSpacesLogoProps {
  className?: string;
  size?: number | string;
  light?: boolean; // toggle colors for light/dark background rendering
}

export default function ProSpacesLogo({ className = '', size = 48, light = false }: ProSpacesLogoProps) {
  // We'll use crisp isometric geometry to fuse the concepts of "Spaces" (House) and "Pro" (Precise logistics box)
  // Accent colors are refined to pop on any background
  const roofLeft = light ? '#e2e8f0' : '#3b82f6';   // Sky blue or light grey
  const roofRight = light ? '#cbd5e1' : '#1d4ed8';  // Royal blue or slate
  const wallLeft = light ? '#ffffff' : '#60a5fa';   // Brighter reflection or white
  const wallRight = light ? '#94a3b8' : '#1e3a8a';  // Shadow navy or deep steel
  
  return (
    <svg
      className={`${className} transition-all duration-300`}
      width={size}
      height={size}
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ambient shadow underneath */}
      <ellipse cx="120" cy="215" rx="55" ry="12" fill={light ? "rgba(15, 23, 42, 0.08)" : "rgba(0, 0, 0, 0.25)"} />

      {/* Isometric Box/House Logo Mark */}
      <g id="logo-poly-group">
        {/* Left Roof Slope (House concept) */}
        <path
          d="M120 35 L50 85 L120 130 Z"
          fill={roofLeft}
          opacity="0.95"
        />
        
        {/* Right Roof Slope (House concept) */}
        <path
          d="M120 35 L190 85 L120 130 Z"
          fill={roofRight}
          opacity="1"
        />

        {/* Left Outer Wall (Logistics Container concept) */}
        <path
          d="M50 85 L50 175 L120 215 L120 130 Z"
          fill={wallLeft}
          opacity="0.9"
        />

        {/* Right Outer Wall (Logistics Container concept) */}
        <path
          d="M120 130 L120 215 L190 175 L190 85 Z"
          fill={wallRight}
          opacity="1"
        />

        {/* Dynamic inner logistics "arrow" cut-out/overlay indicating motion and storage spaces */}
        <path
          d="M120 110 L90 128 L90 158 L120 140 Z"
          fill={light ? "rgba(15, 23, 42, 0.12)" : "rgba(255, 255, 255, 0.35)"}
        />
        <path
          d="M120 140 L150 158 L150 128 L120 110 Z"
          fill={light ? "rgba(15, 23, 42, 0.2)" : "rgba(255, 255, 255, 0.5)"}
        />
      </g>
    </svg>
  );
}
