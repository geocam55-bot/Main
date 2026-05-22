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
  }
  
  const padding = 20;
  const stairExtension = config.hasStairs ? 15 : 0;
  const detachedOffset = config.isDetached ? 15 : 0;
  
  const renderDeckPaths = () => {
    if (config.shape === 'l-shape') {
      const lw = (config.lShapeWidth || 0) * scale;
      const ll = (config.lShapeLength || 0) * scale;
      // Assume bottom-right position as standard
      return (
        <path d={`M 0 0 L ${w} 0 L ${w} ${Math.max(0, l - ll)} L ${w + lw} ${Math.max(0, l - ll)} L ${w + lw} ${l} L 0 ${l} Z`} fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
      );
    }
    if (config.shape === 'u-shape') {
      const lw = (config.uShapeLeftWidth || 0) * scale;
      const rw = (config.uShapeRightWidth || 0) * scale;
      const d = (config.uShapeDepth || 0) * scale;
      return (
        <path d={`M 0 0 L ${w} 0 L ${w} ${l+d} L ${w - rw} ${l+d} L ${w - rw} ${l} L ${lw} ${l} L ${lw} ${l+d} L 0 ${l+d} Z`} fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
      );
    }
    // Rectangle
    return <rect x={0} y={0} width={w} height={l} fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />;
  };

  return (
    <div className="h-40 w-full bg-muted flex items-center justify-center p-4 border-b border-border">
      <svg 
        viewBox={`-${padding} -${padding} ${boundW + padding * 2} ${boundL + stairExtension + detachedOffset + padding * 2}`} 
        className="w-full h-full max-w-full max-h-full drop-shadow-sm" 
        style={{ overflow: 'visible' }}
      >
        {/* House Wall Representation (skip if detached) */}
        {!config.isDetached && (
          <g>
            <rect x={-padding} y={-8} width={boundW + padding*2} height={8} fill="#94a3b8" />
            <line x1={-padding} y1={0} x2={boundW + padding*2} y2={0} stroke="#475569" strokeWidth="1" />
          </g>
        )}
        
        <g transform={`translate(0, ${detachedOffset})`}>
          {renderDeckPaths()}
          
          {/* Stairs */}
          {config.hasStairs && config.stairSide === 'front' && (
            <g transform={`translate(${boundW / 2 - (config.stairWidth || 4) * (scale / 2)}, ${boundL})`}>
              <rect x={0} y={0} width={(config.stairWidth || 4) * scale} height={10} fill="#f1f5f9" stroke="#64748b" strokeWidth="1" />
              <line x1={0} y1={3} x2={(config.stairWidth || 4) * scale} y2={3} stroke="#64748b" strokeWidth="0.5" opacity="0.6" />
              <line x1={0} y1={6} x2={(config.stairWidth || 4) * scale} y2={6} stroke="#64748b" strokeWidth="0.5" opacity="0.6" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

const templates: Array<{ name: string; description: string; config: DeckConfig }> = [
  {
    name: 'Rectangular',
    description: '12\' × 16\' standard attached deck',
    config: {
      width: 16,
      length: 12,
      shape: 'rectangle',
      height: 2,
      hasStairs: false,
      railingSides: ['front', 'left', 'right'],
      deckingPattern: 'perpendicular',
      joistSpacing: 16,
      unit: 'feet',
      deckingType: 'Composite',
    },
  },
  {
    name: 'L-Shaped',
    description: 'Wraparound or extended section',
    config: {
      width: 12,
      length: 16,
      shape: 'l-shape',
      height: 2,
      lShapeWidth: 8,
      lShapeLength: 10,
      lShapePosition: 'bottom-right',
      hasStairs: false,
      railingSides: ['front', 'left', 'right', 'back'],
      deckingPattern: 'parallel',
      joistSpacing: 16,
      unit: 'feet',
      deckingType: 'Treated',
    },
  },
  {
    name: 'U-Shaped',
    description: 'Surrounds a feature or bump-out',
    config: {
      width: 20,
      length: 12,
      shape: 'u-shape',
      height: 2,
      uShapeLeftWidth: 6,
      uShapeRightWidth: 6,
      uShapeDepth: 8,
      hasStairs: false,
      railingSides: ['front', 'left', 'right'],
      deckingPattern: 'perpendicular',
      joistSpacing: 16,
      unit: 'feet',
      deckingType: 'Cedar',
    },
  },
  {
    name: 'Detached',
    description: 'Freestanding island deck',
    config: {
      width: 14,
      length: 14,
      shape: 'rectangle',
      height: 1.5,
      isDetached: true,
      hasStairs: false,
      railingSides: ['front', 'left', 'right', 'back'],
      deckingPattern: 'diagonal',
      joistSpacing: 16,
      unit: 'feet',
      deckingType: 'Spruce',
    },
  },
  {
    name: 'Ground Level',
    description: '14\' × 14\' low profile without rails',
    config: {
      width: 14,
      length: 14,
      shape: 'rectangle',
      height: 0.5,
      isDetached: false,
      hasStairs: false,
      railingSides: [],
      deckingPattern: 'diagonal',
      joistSpacing: 16,
      unit: 'feet',
      deckingType: 'Composite',
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

  return (
    <div className="bg-background rounded-lg shadow-sm border border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
          <LayoutTemplate className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Sample Designs</h2>
          <p className="text-sm text-muted-foreground">Start with a pre-configured layout</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template, idx) => {
          const isSelected = isTemplateSelected(template);
          
          return (
            <div
              key={idx}
              onClick={() => onLoadTemplate(template.config)}
              className={`
                relative group rounded-xl border-2 transition-all duration-200 overflow-hidden cursor-pointer flex flex-col
                ${isSelected
                  ? 'border-purple-600 bg-purple-50 shadow-md'
                  : 'border-border bg-background hover:border-purple-300 hover:bg-muted'
                }
              `}
            >
              <TemplateMiniMap config={template.config} />
              
              <div className="p-4 flex-1 flex flex-col">
                <h3 className={`font-medium mb-1 ${isSelected ? 'text-purple-900' : 'text-foreground'}`}>
                  {template.name}
                </h3>
                <p className={`text-sm flex-1 ${isSelected ? 'text-purple-700' : 'text-muted-foreground'}`}>
                  {template.description}
                </p>
                
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-600"></span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}