import { Truck } from '../types';

export interface TruckImagePreset {
  id: string;
  name: string;
  typeKeywords: string[];
  description: string;
  svgDataUri: string;
}

// Crisp inline SVG graphics for the 5 official fleet truck categories
const MOFFETT_TRUCK_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 420" width="100%" height="100%">
  <defs>
    <linearGradient id="cabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E2E8F0"/>
    </linearGradient>
    <linearGradient id="metalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </linearGradient>
    <linearGradient id="moffettGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22C55E"/>
      <stop offset="100%" stop-color="#15803D"/>
    </linearGradient>
  </defs>

  <!-- Background Canvas -->
  <rect width="800" height="420" fill="#F8FAFC"/>
  
  <!-- Title Badge -->
  <text x="400" y="38" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="22" fill="#1E293B" text-anchor="middle" letter-spacing="2">MOFFETT TRUCK</text>

  <g transform="translate(20, 20)">
    <!-- Shadow -->
    <ellipse cx="380" cy="335" rx="350" ry="12" fill="#CBD5E1" opacity="0.6"/>

    <!-- Truck Frame & Chassis -->
    <rect x="180" y="275" width="410" height="18" fill="url(#metalGrad)" rx="3"/>
    <rect x="220" y="293" width="90" height="22" fill="#475569" rx="2"/> <!-- Fuel tank -->
    <rect x="330" y="293" width="60" height="18" fill="#1E293B" rx="2"/> <!-- Storage box -->

    <!-- Flatbed Cargo Deck -->
    <rect x="195" y="225" width="395" height="10" fill="#0F172A"/>
    <rect x="195" y="235" width="395" height="40" fill="#1E293B"/>
    <!-- Cargo Blocks -->
    <g fill="#E2E8F0" stroke="#94A3B8" stroke-width="1.5">
      <rect x="210" y="180" width="365" height="45" rx="2"/>
      <line x1="240" y1="180" x2="240" y2="225"/>
      <line x1="270" y1="180" x2="270" y2="225"/>
      <line x1="300" y1="180" x2="300" y2="225"/>
      <line x1="330" y1="180" x2="330" y2="225"/>
      <line x1="360" y1="180" x2="360" y2="225"/>
      <line x1="390" y1="180" x2="390" y2="225"/>
      <line x1="420" y1="180" x2="420" y2="225"/>
      <line x1="450" y1="180" x2="450" y2="225"/>
      <line x1="480" y1="180" x2="480" y2="225"/>
      <line x1="510" y1="180" x2="510" y2="225"/>
      <line x1="540" y1="180" x2="540" y2="225"/>
    </g>

    <!-- Front Cab Header / Backrest Guard -->
    <rect x="185" y="160" width="10" height="115" fill="#0F172A" rx="2"/>

    <!-- Main Truck Cab (White Cab) -->
    <path d="M 25,275 L 25,230 Q 25,180 65,160 L 140,155 L 185,155 L 185,275 Z" fill="url(#cabGrad)" stroke="#64748B" stroke-width="2"/>
    <path d="M 50,175 L 110,170 L 135,170 L 135,215 L 50,215 Z" fill="#1E293B" opacity="0.85"/> <!-- Glass Window -->
    <rect x="25" y="275" width="160" height="20" fill="#94A3B8"/> <!-- Front bumper -->
    <circle cx="42" cy="285" r="5" fill="#F59E0B"/> <!-- Headlight -->
    <rect x="60" y="222" width="22" height="14" fill="#CBD5E1" stroke="#475569" rx="2"/> <!-- Door handle -->

    <!-- Moffett Green Forklift Mounted on Rear -->
    <g transform="translate(585, 90)">
      <!-- Forklift Mast -->
      <rect x="20" y="20" width="16" height="200" fill="#0F172A" rx="2"/>
      <rect x="24" y="30" width="8" height="180" fill="#475569"/>
      <!-- Forklift Cage & Body -->
      <path d="M 36,90 L 110,90 L 130,130 L 130,200 L 36,200 Z" fill="url(#moffettGrad)" stroke="#0F172A" stroke-width="2"/>
      <!-- Operator Protective Roll Cage -->
      <path d="M 45,90 L 45,30 L 110,30 L 125,90" fill="none" stroke="#0F172A" stroke-width="6" stroke-linecap="round"/>
      <!-- Operator Seat -->
      <rect x="55" y="110" width="25" height="30" fill="#0F172A" rx="4"/>
      <!-- Forklift Overhead Light -->
      <rect x="85" y="15" width="12" height="12" fill="#F59E0B" rx="2"/>
      <!-- Rear Forklift Wheel -->
      <circle cx="100" cy="210" r="26" fill="#0F172A"/>
      <circle cx="100" cy="210" r="14" fill="#94A3B8"/>
      <!-- Forks Extending Forward -->
      <rect x="-35" y="195" width="60" height="8" fill="#1E293B" rx="1"/>
    </g>

    <!-- Truck Wheels -->
    <!-- Front Wheel -->
    <circle cx="110" cy="315" r="32" fill="#0F172A"/>
    <circle cx="110" cy="315" r="18" fill="#E2E8F0" stroke="#475569" stroke-width="3"/>
    <!-- Rear Dual Axle Wheels -->
    <circle cx="480" cy="315" r="32" fill="#0F172A"/>
    <circle cx="480" cy="315" r="18" fill="#E2E8F0" stroke="#475569" stroke-width="3"/>
  </g>
</svg>
`);

const BOOM_TRUCK_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 420" width="100%" height="100%">
  <defs>
    <linearGradient id="cabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E2E8F0"/>
    </linearGradient>
    <linearGradient id="boomGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F8FAFC"/>
      <stop offset="100%" stop-color="#CBD5E1"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="800" height="420" fill="#F8FAFC"/>
  <text x="400" y="38" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="22" fill="#1E293B" text-anchor="middle" letter-spacing="2">BOOM TRUCK (WITH FORKS)</text>

  <g transform="translate(20, 20)">
    <!-- Shadow -->
    <ellipse cx="380" cy="335" rx="350" ry="12" fill="#CBD5E1" opacity="0.6"/>

    <!-- Hydraulic Outriggers -->
    <rect x="250" y="280" width="14" height="45" fill="#22C55E"/>
    <rect x="620" y="280" width="14" height="45" fill="#22C55E"/>

    <!-- Truck Frame & Chassis -->
    <rect x="180" y="275" width="460" height="18" fill="#0F172A" rx="3"/>
    <rect x="210" y="210" width="75" height="65" fill="#FFFFFF" stroke="#475569" stroke-width="2" rx="3"/> <!-- Tool Cabinet -->

    <!-- Cargo Bed -->
    <rect x="290" y="245" width="345" height="30" fill="#1E293B"/>
    <!-- Pallet Cargo Load -->
    <g fill="#E2E8F0" stroke="#94A3B8" stroke-width="1.5">
      <rect x="300" y="200" width="320" height="45" rx="2"/>
      <line x1="330" y1="200" x2="330" y2="245"/>
      <line x1="360" y1="200" x2="360" y2="245"/>
      <line x1="390" y1="200" x2="390" y2="245"/>
      <line x1="420" y1="200" x2="420" y2="245"/>
      <line x1="450" y1="200" x2="450" y2="245"/>
      <line x1="480" y1="200" x2="480" y2="245"/>
      <line x1="510" y1="200" x2="510" y2="245"/>
      <line x1="540" y1="200" x2="540" y2="245"/>
      <line x1="570" y1="200" x2="570" y2="245"/>
    </g>

    <!-- Heavy Conventional Hood Cab -->
    <path d="M 20,275 L 20,230 L 100,225 L 125,160 L 185,155 L 185,275 Z" fill="url(#cabGrad)" stroke="#64748B" stroke-width="2"/>
    <path d="M 105,220 L 128,168 L 175,168 L 175,220 Z" fill="#1E293B" opacity="0.85"/> <!-- Windshield -->
    <rect x="175" y="120" width="12" height="100" fill="#94A3B8" rx="2"/> <!-- Vertical Exhaust Stack -->
    <rect x="15" y="275" width="170" height="20" fill="#475569"/> <!-- Chrome Grille Bumper -->

    <!-- Hydraulic Crane Pivot Base behind Cab -->
    <rect x="260" y="140" width="35" height="70" fill="#0F172A" rx="4"/>
    <circle cx="277" cy="155" r="12" fill="#22C55E"/>

    <!-- Main Articulated Crane Boom Arm extending back over payload -->
    <g transform="rotate(18, 277, 155)">
      <!-- Main Arm -->
      <rect x="277" y="145" width="360" height="24" fill="url(#boomGrad)" stroke="#0F172A" stroke-width="2" rx="4"/>
      <rect x="277" y="149" width="360" height="4" fill="#22C55E"/>
      <!-- Hydraulic Cylinder -->
      <line x1="310" y1="180" x2="420" y2="155" stroke="#0F172A" stroke-width="12" stroke-linecap="round"/>
      <line x1="310" y1="180" x2="420" y2="155" stroke="#94A3B8" stroke-width="6" stroke-linecap="round"/>
    </g>

    <!-- Hanging Fork Attachment at Rear Crane Tip -->
    <g transform="translate(670, 160)">
      <line x1="0" y1="-30" x2="0" y2="30" stroke="#0F172A" stroke-width="3"/>
      <!-- Fork Cage Attachment -->
      <rect x="-20" y="30" width="40" height="70" fill="none" stroke="#0F172A" stroke-width="4"/>
      <rect x="-15" y="45" width="30" height="40" fill="#1E293B"/>
      <!-- Pallet Forks -->
      <path d="M -35,100 L 25,100 L 25,108 L -35,108 Z" fill="#0F172A"/>
    </g>

    <!-- Truck Wheels -->
    <circle cx="100" cy="315" r="32" fill="#0F172A"/>
    <circle cx="100" cy="315" r="18" fill="#E2E8F0" stroke="#475569" stroke-width="3"/>

    <circle cx="480" cy="315" r="32" fill="#0F172A"/>
    <circle cx="480" cy="315" r="18" fill="#E2E8F0" stroke="#475569" stroke-width="3"/>

    <circle cx="555" cy="315" r="32" fill="#0F172A"/>
    <circle cx="555" cy="315" r="18" fill="#E2E8F0" stroke="#475569" stroke-width="3"/>
  </g>
</svg>
`);

const FLATBED_TRUCK_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 420" width="100%" height="100%">
  <defs>
    <linearGradient id="cabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E2E8F0"/>
    </linearGradient>
  </defs>

  <rect width="800" height="420" fill="#F8FAFC"/>
  <text x="400" y="38" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="22" fill="#1E293B" text-anchor="middle" letter-spacing="2">FLATBED TRUCK</text>

  <g transform="translate(20, 20)">
    <!-- Shadow -->
    <ellipse cx="380" cy="335" rx="350" ry="12" fill="#CBD5E1" opacity="0.6"/>

    <!-- Truck Frame & Chassis -->
    <rect x="180" y="275" width="540" height="18" fill="#0F172A" rx="3"/>
    <rect x="370" y="293" width="90" height="22" fill="#475569" rx="2"/> <!-- Fuel tank -->

    <!-- Flatbed Deck Structure -->
    <rect x="195" y="225" width="530" height="10" fill="#0F172A"/>
    <rect x="195" y="235" width="530" height="40" fill="#1E293B"/>

    <!-- Cargo Blocks on Flatbed -->
    <g fill="#E2E8F0" stroke="#94A3B8" stroke-width="1.5">
      <rect x="210" y="180" width="500" height="45" rx="2"/>
      <line x1="250" y1="180" x2="250" y2="225"/>
      <line x1="290" y1="180" x2="290" y2="225"/>
      <line x1="330" y1="180" x2="330" y2="225"/>
      <line x1="370" y1="180" x2="370" y2="225"/>
      <line x1="410" y1="180" x2="410" y2="225"/>
      <line x1="450" y1="180" x2="450" y2="225"/>
      <line x1="490" y1="180" x2="490" y2="225"/>
      <line x1="530" y1="180" x2="530" y2="225"/>
      <line x1="570" y1="180" x2="570" y2="225"/>
      <line x1="610" y1="180" x2="610" y2="225"/>
      <line x1="650" y1="180" x2="650" y2="225"/>
    </g>

    <!-- Front Cab Backrest Guard -->
    <rect x="185" y="160" width="10" height="115" fill="#0F172A" rx="2"/>

    <!-- White Commercial Cab -->
    <path d="M 25,275 L 25,230 Q 25,180 65,160 L 140,155 L 185,155 L 185,275 Z" fill="url(#cabGrad)" stroke="#64748B" stroke-width="2"/>
    <path d="M 50,175 L 110,170 L 135,170 L 135,215 L 50,215 Z" fill="#1E293B" opacity="0.85"/>
    <rect x="25" y="275" width="160" height="20" fill="#94A3B8"/>
    <circle cx="42" cy="285" r="5" fill="#F59E0B"/>

    <!-- Wheels -->
    <circle cx="110" cy="315" r="32" fill="#0F172A"/>
    <circle cx="110" cy="315" r="18" fill="#E2E8F0" stroke="#475569" stroke-width="3"/>

    <circle cx="560" cy="315" r="32" fill="#0F172A"/>
    <circle cx="560" cy="315" r="18" fill="#E2E8F0" stroke="#475569" stroke-width="3"/>

    <circle cx="635" cy="315" r="32" fill="#0F172A"/>
    <circle cx="635" cy="315" r="18" fill="#E2E8F0" stroke="#475569" stroke-width="3"/>
  </g>
</svg>
`);

const BOX_TRUCK_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 420" width="100%" height="100%">
  <defs>
    <linearGradient id="cabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E2E8F0"/>
    </linearGradient>
    <linearGradient id="boxGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#CBD5E1"/>
    </linearGradient>
  </defs>

  <rect width="800" height="420" fill="#F8FAFC"/>
  <text x="400" y="38" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="22" fill="#1E293B" text-anchor="middle" letter-spacing="2">BOX TRUCK</text>

  <g transform="translate(20, 20)">
    <!-- Shadow -->
    <ellipse cx="380" cy="335" rx="350" ry="12" fill="#CBD5E1" opacity="0.6"/>

    <!-- Chassis -->
    <rect x="180" y="275" width="530" height="18" fill="#0F172A" rx="3"/>
    <rect x="360" y="293" width="90" height="22" fill="#475569" rx="2"/>

    <!-- Large Enclosed Box Cargo Body -->
    <rect x="200" y="85" width="510" height="190" fill="url(#boxGrad)" stroke="#64748B" stroke-width="3" rx="6"/>
    <!-- Corner Trim and Side Panels -->
    <rect x="200" y="85" width="15" height="190" fill="#94A3B8"/>
    <rect x="695" y="85" width="15" height="190" fill="#94A3B8"/>
    <rect x="200" y="85" width="510" height="12" fill="#94A3B8"/>
    
    <!-- Shaded Side Banner Rungs -->
    <g fill="#E2E8F0" stroke="#CBD5E1" opacity="0.8">
      <rect x="230" y="180" width="450" height="35" rx="2"/>
      <line x1="270" y1="180" x2="270" y2="215"/>
      <line x1="310" y1="180" x2="310" y2="215"/>
      <line x1="350" y1="180" x2="350" y2="215"/>
      <line x1="390" y1="180" x2="390" y2="215"/>
      <line x1="430" y1="180" x2="430" y2="215"/>
      <line x1="470" y1="180" x2="470" y2="215"/>
      <line x1="510" y1="180" x2="510" y2="215"/>
      <line x1="550" y1="180" x2="550" y2="215"/>
      <line x1="590" y1="180" x2="590" y2="215"/>
      <line x1="630" y1="180" x2="630" y2="215"/>
    </g>

    <!-- White Cab -->
    <path d="M 25,275 L 25,230 Q 25,180 65,160 L 140,155 L 195,155 L 195,275 Z" fill="url(#cabGrad)" stroke="#64748B" stroke-width="2"/>
    <path d="M 50,175 L 110,170 L 145,170 L 145,215 L 50,215 Z" fill="#1E293B" opacity="0.85"/>
    <rect x="25" y="275" width="170" height="20" fill="#94A3B8"/>
    <circle cx="42" cy="285" r="5" fill="#F59E0B"/>

    <!-- Wheels -->
    <circle cx="110" cy="315" r="32" fill="#0F172A"/>
    <circle cx="110" cy="315" r="18" fill="#E2E8F0" stroke="#475569" stroke-width="3"/>

    <circle cx="580" cy="315" r="32" fill="#0F172A"/>
    <circle cx="580" cy="315" r="18" fill="#E2E8F0" stroke="#475569" stroke-width="3"/>

    <circle cx="655" cy="315" r="32" fill="#0F172A"/>
    <circle cx="655" cy="315" r="18" fill="#E2E8F0" stroke="#475569" stroke-width="3"/>
  </g>
</svg>
`);

const PICKUP_TRUCK_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 420" width="100%" height="100%">
  <defs>
    <linearGradient id="cabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E2E8F0"/>
    </linearGradient>
  </defs>

  <rect width="800" height="420" fill="#F8FAFC"/>
  <text x="400" y="38" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="22" fill="#1E293B" text-anchor="middle" letter-spacing="2">PICKUP TRUCK</text>

  <g transform="translate(20, 20)">
    <!-- Shadow -->
    <ellipse cx="380" cy="335" rx="330" ry="12" fill="#CBD5E1" opacity="0.6"/>

    <!-- Chassis & Running Board -->
    <rect x="60" y="285" width="650" height="12" fill="#0F172A" rx="2"/>
    <rect x="220" y="280" width="180" height="8" fill="#64748B" rx="2"/>

    <!-- Truck Body - Heavy Duty Crew Cab Pickup -->
    <!-- Front Hood to Cab -->
    <path d="M 20,285 L 20,230 L 160,225 L 230,160 L 410,160 L 440,220 L 710,220 L 710,285 Z" fill="url(#cabGrad)" stroke="#64748B" stroke-width="2"/>

    <!-- Crew Cab Windows -->
    <path d="M 235,168 L 315,168 L 315,215 L 180,220 Z" fill="#1E293B" opacity="0.85"/>
    <path d="M 325,168 L 398,168 L 425,215 L 325,215 Z" fill="#1E293B" opacity="0.85"/>

    <!-- Pickup Truck Bed Cargo -->
    <g transform="translate(445, 185)">
      <rect x="0" y="0" width="250" height="30" fill="#CBD5E1" stroke="#94A3B8" rx="2"/>
      <g fill="#E2E8F0" stroke="#94A3B8">
        <rect x="10" y="-15" width="230" height="15" rx="1"/>
        <line x1="40" y1="-15" x2="40" y2="0"/>
        <line x1="70" y1="-15" x2="70" y2="0"/>
        <line x1="100" y1="-15" x2="100" y2="0"/>
        <line x1="130" y1="-15" x2="130" y2="0"/>
        <line x1="160" y1="-15" x2="160" y2="0"/>
        <line x1="190" y1="-15" x2="190" y2="0"/>
      </g>
    </g>

    <!-- Chrome Front Grille & Bumper -->
    <rect x="15" y="235" width="30" height="50" fill="#CBD5E1" stroke="#475569" rx="3"/>
    <circle cx="45" cy="245" r="7" fill="#F59E0B"/>
    <!-- Door Handles -->
    <rect x="260" y="228" width="20" height="6" fill="#0F172A" rx="1"/>
    <rect x="350" y="228" width="20" height="6" fill="#0F172A" rx="1"/>

    <!-- Wheels -->
    <circle cx="140" cy="305" r="36" fill="#0F172A"/>
    <circle cx="140" cy="305" r="20" fill="#E2E8F0" stroke="#475569" stroke-width="4"/>

    <circle cx="610" cy="305" r="36" fill="#0F172A"/>
    <circle cx="610" cy="305" r="20" fill="#E2E8F0" stroke="#475569" stroke-width="4"/>
  </g>
</svg>
`);

export const TRUCK_IMAGE_PRESETS: TruckImagePreset[] = [
  {
    id: 'moffett',
    name: 'Moffett Truck',
    typeKeywords: ['moffett', 'forklift', 'mfg'],
    description: 'Flatbed truck equipped with a rear truck-mounted Moffett forklift.',
    svgDataUri: MOFFETT_TRUCK_SVG
  },
  {
    id: 'boom',
    name: 'Boom Truck (With Forks)',
    typeKeywords: ['boom', 'crane', 'heavy crane', '4x4 boom', '6x4 boom'],
    description: 'Commercial truck equipped with a heavy hydraulic boom crane and fork attachment.',
    svgDataUri: BOOM_TRUCK_SVG
  },
  {
    id: 'flatbed',
    name: 'Flatbed Truck',
    typeKeywords: ['flatbed', 'flat deck', 'tandem', 'hauler', 'highway hauler'],
    description: 'Heavy duty flatbed deck truck for lumber, drywall, and bulk pallet deliveries.',
    svgDataUri: FLATBED_TRUCK_SVG
  },
  {
    id: 'box',
    name: 'Box Truck',
    typeKeywords: ['box', 'curtain', 'closed box', 'van', 'cargo van'],
    description: 'Fully enclosed cargo box or curtain-side truck for weather-protected freight.',
    svgDataUri: BOX_TRUCK_SVG
  },
  {
    id: 'pickup',
    name: 'Pickup Truck',
    typeKeywords: ['pickup', 'f150', 'f-150', 'f550', 'ranger', '4x4'],
    description: '4x4 commercial fleet pickup truck for site runs and rapid orders.',
    svgDataUri: PICKUP_TRUCK_SVG
  }
];

export function getTruckImage(truck?: Truck | { type?: string; name?: string; imageUrl?: string } | null): string {
  if (!truck) {
    return TRUCK_IMAGE_PRESETS[2].svgDataUri; // Flatbed default
  }

  // 1. Explicit image URL set on truck object (custom upload, base64 data URL, or web link)
  if (truck.imageUrl && truck.imageUrl.trim().length > 0) {
    return truck.imageUrl.trim();
  }

  // Check any generic image field if present
  const trAny = truck as any;
  if (trAny.image && typeof trAny.image === 'string' && trAny.image.trim().length > 0) {
    return trAny.image.trim();
  }

  // 2. Infer preset based on truck.type or truck.name keywords
  const text = `${truck.type || ''} ${truck.name || ''}`.toLowerCase();

  if (text.includes('moffett')) {
    return MOFFETT_TRUCK_SVG;
  }
  if (text.includes('boom') || text.includes('crane')) {
    return BOOM_TRUCK_SVG;
  }
  if (text.includes('box') || text.includes('curtain') || text.includes('van')) {
    return BOX_TRUCK_SVG;
  }
  if (text.includes('pickup') || text.includes('f150') || text.includes('f-150') || text.includes('ranger')) {
    return PICKUP_TRUCK_SVG;
  }

  // Default to Flatbed
  return FLATBED_TRUCK_SVG;
}
