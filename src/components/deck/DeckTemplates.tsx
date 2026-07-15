import React from 'react';
import { DeckConfig } from '../../types/deck';
import { LayoutTemplate } from 'lucide-react';

interface DeckTemplatesProps {
  onLoadTemplate: (config: DeckConfig) => void;
  currentConfig?: DeckConfig;
}

function TemplateMiniMap({ config }: { config: DeckConfig }) {
  // Use a base scale where 1 foot = 5 units to keep things compact
  const scale = 5;
  const w = config.width * scale;
  const l = config.length * scale;
  
  // Calculate bounding box based on shape
  let boundW = w;
  let boundL = l;
  
  if (config.shape === 'l-shape') {
    boundW = w + (config.lShapeWidth || 0) * scale;
    boundL = Math.max(l, (config.lShapeLength || 0) * scale);
  } else if (config.shape === 'u-shape') {
    boundW = w;
    boundL = l + (config.uShapeDepth || 0) * scale;
  } else if (config.shape === 'custom' && config.customPoints && config.customPoints.length > 0) {
    let maxX = 0;
    let maxY = 0;
    config.customPoints.forEach(p => {
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });
    boundW = maxX * scale;
    boundL = maxY * scale;
  }
  
  const padding = 20;
  const stairExtension = config.hasStairs ? 15 : 0;
  const detachedOffset = config.isDetached ? 15 : 0;
  
  const renderDeckPaths = () => {
    if (config.shape === 'custom' && config.customPoints && config.customPoints.length > 0) {
      const pointsStr = config.customPoints
        .map(p => `${p.x * scale},${p.y * scale}`)
        .join(' L ');
      return (
        <path d={`M ${pointsStr} Z`} fill="#f6e8d5" stroke="#854d0e" strokeWidth="2" />
      );
    }
    if (config.shape === 'l-shape') {
      const lw = (config.lShapeWidth || 0) * scale;
      const ll = (config.lShapeLength || 0) * scale;
      return (
        <path d={`M 0 0 L ${w} 0 L ${w} ${Math.max(0, l - ll)} L ${w + lw} ${Math.max(0, l - ll)} L ${w + lw} ${l} L 0 ${l} Z`} fill="#f6e8d5" stroke="#854d0e" strokeWidth="2" />
      );
    }
    if (config.shape === 'u-shape') {
      const lw = (config.uShapeLeftWidth || 0) * scale;
      const rw = (config.uShapeRightWidth || 0) * scale;
      const d = (config.uShapeDepth || 0) * scale;
      return (
        <path d={`M 0 0 L ${w} 0 L ${w} ${l+d} L ${w - rw} ${l+d} L ${w - rw} ${l} L ${lw} ${l} L ${lw} ${l+d} L 0 ${l+d} Z`} fill="#f6e8d5" stroke="#854d0e" strokeWidth="2" />
      );
    }
    // Rectangle
    return <rect x={0} y={0} width={w} height={l} fill="#f6e8d5" stroke="#854d0e" strokeWidth="2" />;
  };

  return (
    <div className="h-44 w-full bg-stone-100 flex items-center justify-center p-4 border-b border-stone-200">
      <svg 
         viewBox={`-${padding} -${padding} ${boundW + padding * 2} ${boundL + stairExtension + detachedOffset + padding * 2}`} 
        className="w-full h-full max-w-full max-h-full drop-shadow-md" 
        style={{ overflow: 'visible' }}
      >
        {/* House Wall Representation (skip if detached) */}
        {!config.isDetached && (
          <g>
            <rect x={-padding} y={-8} width={boundW + padding*2} height={8} fill="#94a3b8" />
            <line x1={-padding} y1={0} x2={boundW + padding*2} y2={0} stroke="#475569" strokeWidth="1.5" />
          </g>
        )}
        
        <g transform={`translate(0, ${detachedOffset})`}>
          {renderDeckPaths()}
          
          {/* Deck Board lines in mini-map */}
          <g opacity="0.15">
            {Array.from({ length: 30 }).map((_, i) => (
              <line 
                key={i} 
                x1={0} 
                y1={i * 4} 
                x2={boundW} 
                y2={i * 4} 
                stroke="#451a03" 
                strokeWidth="1" 
              />
            ))}
          </g>
          
          {/* Stairs */}
          {config.hasStairs && config.stairSide === 'front' && (
            <g transform={`translate(${boundW / 2 - (config.stairWidth || 4) * (scale / 2)}, ${boundL})`}>
              <rect x={0} y={0} width={(config.stairWidth || 4) * scale} height={10} fill="#f1f5f9" stroke="#64748b" strokeWidth="1" />
              <line x1={0} y1={3} x2={(config.stairWidth || 4) * scale} y2={3} stroke="#64748b" strokeWidth="0.5" opacity="0.6" />
              <line x1={0} y1={6} x2={(config.stairWidth || 4) * scale} y2={6} stroke="#64748b" strokeWidth="0.5" opacity="0.6" />
            </g>
          )}
          {config.hasStairs && config.stairSide === 'right' && (
            <g transform={`translate(${boundW}, ${boundL / 2 - (config.stairWidth || 4) * (scale / 2)})`}>
              <rect x={0} y={0} width={10} height={(config.stairWidth || 4) * scale} fill="#f1f5f9" stroke="#64748b" strokeWidth="1" />
              <line x1={3} y1={0} x2={3} y2={(config.stairWidth || 4) * scale} stroke="#64748b" strokeWidth="0.5" opacity="0.6" />
              <line x1={6} y1={0} x2={6} y2={(config.stairWidth || 4) * scale} stroke="#64748b" strokeWidth="0.5" opacity="0.6" />
            </g>
          )}
          {config.hasStairs && config.stairSide === 'left' && (
            <g transform={`translate(-10, ${boundL / 2 - (config.stairWidth || 4) * (scale / 2)})`}>
              <rect x={0} y={0} width={10} height={(config.stairWidth || 4) * scale} fill="#f1f5f9" stroke="#64748b" strokeWidth="1" />
              <line x1={3} y1={0} x2={3} y2={(config.stairWidth || 4) * scale} stroke="#64748b" strokeWidth="0.5" opacity="0.6" />
              <line x1={6} y1={0} x2={6} y2={(config.stairWidth || 4) * scale} stroke="#64748b" strokeWidth="0.5" opacity="0.6" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

const templates: Array<{ id: string; name: string; description: string; config: DeckConfig }> = [
  {
    id: '01',
    name: 'L-Shape Double Tier & Stairs',
    description: '16\' × 12\' multi-level premium treated deck with integrated corner stairs.',
    config: {
      width: 16,
      length: 12,
      shape: 'l-shape',
      height: 2.5,
      lShapeWidth: 8,
      lShapeLength: 10,
      lShapePosition: 'bottom-right',
      hasStairs: true,
      stairSide: 'front',
      stairWidth: 4,
      railingSides: ['front', 'left', 'right', 'back'],
      deckingPattern: 'perpendicular',
      joistSpacing: 16,
      unit: 'feet',
      deckingType: 'Treated',
    },
  },
  {
    id: '02',
    name: 'Classic Attached Side Steps',
    description: '16\' × 12\' standard pressure-treated pine deck with beautiful side landing steps.',
    config: {
      width: 16,
      length: 12,
      shape: 'rectangle',
      height: 2,
      hasStairs: true,
      stairSide: 'right',
      stairWidth: 4,
      railingSides: ['front', 'left', 'right'],
      deckingPattern: 'perpendicular',
      joistSpacing: 16,
      unit: 'feet',
      deckingType: 'Treated',
    },
  },
  {
    id: '03',
    name: 'Hex-cut Angled Corner Deck',
    description: '16\' × 16\' modern treated deck featuring clean 45-degree corner cutouts.',
    config: {
      width: 16,
      length: 16,
      shape: 'custom',
      height: 2,
      customPoints: [
        { x: 0, y: 0 },
        { x: 16, y: 0 },
        { x: 16, y: 10 },
        { x: 10, y: 16 },
        { x: 0, y: 16 }
      ],
      hasStairs: true,
      stairSide: 'front',
      stairWidth: 4,
      railingSides: ['front', 'left', 'right'],
      deckingPattern: 'diagonal',
      joistSpacing: 16,
      unit: 'feet',
      deckingType: 'Treated',
    },
  },
  {
    id: '04',
    name: 'Wide Front Wrap Steps Deck',
    description: '18\' × 12\' low-profile entertaining deck featuring extra-wide cascading stairs.',
    config: {
      width: 18,
      length: 12,
      shape: 'rectangle',
      height: 1.5,
      hasStairs: true,
      stairSide: 'front',
      stairWidth: 12,
      railingSides: ['left', 'right'],
      deckingPattern: 'parallel',
      joistSpacing: 16,
      unit: 'feet',
      deckingType: 'Treated',
    },
  },
  {
    id: '05',
    name: 'Large L-Shape Premium Wrap',
    description: '20\' × 12\' wrap deck with dynamic lounging space and left-exit stairs.',
    config: {
      width: 20,
      length: 12,
      shape: 'l-shape',
      height: 3,
      lShapeWidth: 10,
      lShapeLength: 14,
      lShapePosition: 'bottom-left',
      hasStairs: true,
      stairSide: 'left',
      stairPart: 'l-shape',
      stairWidth: 4,
      railingSides: ['front', 'left', 'right', 'back'],
      deckingPattern: 'diagonal',
      joistSpacing: 16,
      unit: 'feet',
      deckingType: 'Treated',
    },
  },
  {
    id: '06',
    name: 'High Elevation Straight Stairs',
    description: '14\' × 10\' second-tier balcony deck with long-run structural staircase.',
    config: {
      width: 14,
      length: 10,
      shape: 'rectangle',
      height: 8,
      hasStairs: true,
      stairSide: 'front',
      stairWidth: 4,
      railingSides: ['front', 'left', 'right'],
      deckingPattern: 'perpendicular',
      joistSpacing: 16,
      unit: 'feet',
      deckingType: 'Treated',
    },
  },
  {
    id: '07',
    name: 'Compact Side-Projection Steps',
    description: '12\' × 12\' compact cozy deck with high structural safety rails.',
    config: {
      width: 12,
      length: 12,
      shape: 'rectangle',
      height: 2,
      hasStairs: true,
      stairSide: 'left',
      stairWidth: 4,
      railingSides: ['front', 'right'],
      deckingPattern: 'perpendicular',
      joistSpacing: 16,
      unit: 'feet',
      deckingType: 'Treated',
    },
  },
  {
    id: '08',
    name: 'Split-Level Multi-Zone Deck',
    description: '20\' × 16\' split-level layout with dual entertainment zones.',
    config: {
      width: 20,
      length: 16,
      shape: 'custom',
      height: 3,
      customPoints: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 8 },
        { x: 14, y: 8 },
        { x: 14, y: 16 },
        { x: 0, y: 16 }
      ],
      hasStairs: true,
      stairSide: 'front',
      stairWidth: 4,
      railingSides: ['front', 'left', 'right'],
      deckingPattern: 'diagonal',
      joistSpacing: 16,
      unit: 'feet',
      deckingType: 'Treated',
    },
  },
  {
    id: '09',
    name: 'Angled Front Edge Deck',
    description: '16\' × 12\' architectural treated deck with clean front 45-degree angle.',
    config: {
      width: 16,
      length: 12,
      shape: 'custom',
      height: 2,
      customPoints: [
        { x: 0, y: 0 },
        { x: 16, y: 0 },
        { x: 16, y: 8 },
        { x: 8, y: 12 },
        { x: 0, y: 12 }
      ],
      hasStairs: true,
      stairSide: 'front',
      stairWidth: 4,
      railingSides: ['front', 'left', 'right'],
      deckingPattern: 'parallel',
      joistSpacing: 16,
      unit: 'feet',
      deckingType: 'Treated',
    },
  },
  {
    id: '10',
    name: 'Angled Corner Wrap Deck',
    description: '18\' × 18\' multi-angle custom treated wrap deck with right steps.',
    config: {
      width: 18,
      length: 18,
      shape: 'custom',
      height: 2.5,
      customPoints: [
        { x: 0, y: 0 },
        { x: 18, y: 0 },
        { x: 18, y: 12 },
        { x: 12, y: 18 },
        { x: 0, y: 18 }
      ],
      hasStairs: true,
      stairSide: 'right',
      stairWidth: 4,
      railingSides: ['front', 'left', 'right'],
      deckingPattern: 'diagonal',
      joistSpacing: 16,
      unit: 'feet',
      deckingType: 'Treated',
    },
  },
];

export function DeckTemplates({ onLoadTemplate, currentConfig }: DeckTemplatesProps) {
  // Check if a template matches the current config
  const isTemplateSelected = (template: typeof templates[0]) => {
    if (!currentConfig) return false;
    
    const t = template.config;
    const c = currentConfig;
    
    // Check key properties that define a template
    return (
      t.width === c.width &&
      t.length === c.length &&
      t.shape === c.shape &&
      t.height === c.height &&
      t.hasStairs === c.hasStairs &&
      t.deckingPattern === c.deckingPattern &&
      t.joistSpacing === c.joistSpacing &&
      !!t.isDetached === !!c.isDetached &&
      t.deckingType === c.deckingType
    );
  };

  const [selectedTemplateIdx, setSelectedTemplateIdx] = React.useState<number | null>(null);

  return (
    <div className="bg-[#4a4a4a] text-white rounded-lg shadow-lg border border-neutral-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-600 text-white rounded-lg">
          <LayoutTemplate className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Select a Template</h2>
          <p className="text-sm text-neutral-300">Choose an architectural deck layout below and click Continue</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-neutral-600 shadow-inner">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {templates.map((template, idx) => {
            const isSelected = selectedTemplateIdx === idx || isTemplateSelected(template);
            
            return (
              <div
                key={idx}
                onClick={() => setSelectedTemplateIdx(idx)}
                className={`
                  relative group rounded-lg border-2 transition-all duration-200 overflow-hidden cursor-pointer flex flex-col bg-white
                  ${isSelected
                    ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-md'
                    : 'border-neutral-200 hover:border-orange-300'
                  }
                `}
              >
                <TemplateMiniMap config={template.config} />
                
                {/* Number Bar at Bottom */}
                <div className={`p-2 text-center font-bold text-sm select-none transition-colors ${
                  isSelected ? 'bg-orange-500 text-white' : 'bg-[#404040] text-[#cccccc]'
                }`}>
                  {template.id}
                </div>
                
                {/* Tooltip or hover title */}
                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end text-xs text-white pointer-events-none">
                  <span className="font-semibold">{template.name}</span>
                  <span className="text-[10px] text-neutral-300 line-clamp-2 mt-1">{template.description}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={() => {
            if (selectedTemplateIdx !== null) {
              onLoadTemplate(templates[selectedTemplateIdx].config);
            } else {
              // Load default active one if they click without selecting
              onLoadTemplate(templates[0].config);
            }
          }}
          className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-md transition-all active:scale-[0.98]"
        >
          Continue
        </button>
      </div>
    </div>
  );
}