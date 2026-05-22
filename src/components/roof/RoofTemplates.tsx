import React from 'react';
import { RoofConfig } from '../../types/roof';
import { Home, Warehouse, Building2, Church, Factory, LayoutDashboard, Columns3, LayoutTemplate } from 'lucide-react';

interface RoofTemplatesProps {
  onLoadTemplate: (config: RoofConfig) => void;
  currentConfig?: RoofConfig;
}

function TemplateMiniMap({ config }: { config: RoofConfig }) {
  const scale = 5;
  const w = config.width * scale;
  const l = config.length * scale;
  
  const padding = 20;

  const renderRoofPaths = () => {
    if (config.style === 'hip') {
      return (
        <g>
          <rect x={0} y={0} width={l} height={w} fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
          <path d={`M 0 0 L ${l/4} ${w/2} L ${l*3/4} ${w/2} L ${l} 0`} fill="none" stroke="#64748b" strokeWidth="2" />
          <path d={`M 0 ${w} L ${l/4} ${w/2} L ${l*3/4} ${w/2} L ${l} ${w}`} fill="none" stroke="#64748b" strokeWidth="2" />
        </g>
      );
    }
    if (config.style === 'gambrel') {
      return (
         <g>
          <rect x={0} y={0} width={l} height={w} fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
          <line x1={0} y1={w/2} x2={l} y2={w/2} stroke="#64748b" strokeWidth="2" />
          <line x1={0} y1={w/4} x2={l} y2={w/4} stroke="#64748b" strokeWidth="1" strokeDasharray="4 4" />
          <line x1={0} y1={w*3/4} x2={l} y2={w*3/4} stroke="#64748b" strokeWidth="1" strokeDasharray="4 4" />
        </g>
      )
    }
    if (config.style === 'shed') {
       return (
        <g>
          <rect x={0} y={0} width={l} height={w} fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
          <line x1={0} y1={w/4} x2={l} y2={w/4} stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />
        </g>
       )
    }
    // Gable and default
    return (
      <g>
        <rect x={0} y={0} width={l} height={w} fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
        <line x1={0} y1={w/2} x2={l} y2={w/2} stroke="#64748b" strokeWidth="2" />
      </g>
    );
  };

  return (
    <div className="h-40 w-full bg-muted flex items-center justify-center p-4 border-b border-border">
      <svg 
        viewBox={`-${padding} -${padding} ${l + padding * 2} ${w + padding * 2}`} 
        className="w-full h-full max-w-full max-h-full drop-shadow-sm" 
        style={{ overflow: 'visible' }}
      >
        <g>
          {renderRoofPaths()}
        </g>
      </svg>
    </div>
  );
}

export function RoofTemplates({ onLoadTemplate, currentConfig }: RoofTemplatesProps) {
  // Check if a template matches the current config
  const isTemplateSelected = (template: typeof templates[0]) => {
    if (!currentConfig) return false;
    
    const t = template.config;
    const c = currentConfig;
    
    // Check key properties that define a template
    return (
      t.width === c.width &&
      t.length === c.length &&
      t.style === c.style &&
      t.pitch === c.pitch &&
      t.shingleType === c.shingleType &&
      t.hasValleys === c.hasValleys &&
      t.hasSkylight === c.hasSkylight &&
      t.hasChimney === c.hasChimney
    );
  };

  const templates: Array<{
    name: string;
    description: string;
    icon: React.ComponentType<any>;
    config: RoofConfig;
  }> = [
    {
      name: 'Small Residential',
      description: '1,200 sq ft home - Gable roof',
      icon: Home,
      config: {
        length: 40,
        width: 30,
        style: 'gable',
        pitch: '6/12',
        eaveOverhang: 1.5,
        rakeOverhang: 1.5,
        shingleType: 'architectural',
        underlaymentType: 'synthetic',
        hasValleys: false,
        valleyCount: 0,
        hasSkylight: false,
        skylightCount: 0,
        hasChimney: true,
        chimneyCount: 1,
        wasteFactor: 0.10,
        unit: 'feet',
      }
    },
    {
      name: 'Large Residential',
      description: '2,400 sq ft home - Hip roof',
      icon: Home,
      config: {
        length: 60,
        width: 40,
        style: 'hip',
        pitch: '6/12',
        eaveOverhang: 2,
        rakeOverhang: 2,
        shingleType: 'designer',
        underlaymentType: 'synthetic',
        hasValleys: false,
        valleyCount: 0,
        hasSkylight: true,
        skylightCount: 2,
        hasChimney: true,
        chimneyCount: 1,
        wasteFactor: 0.12,
        unit: 'feet',
      }
    },
    {
      name: 'Ranch Style',
      description: '1,800 sq ft ranch - Low pitch gable',
      icon: Home,
      config: {
        length: 50,
        width: 36,
        style: 'gable',
        pitch: '4/12',
        eaveOverhang: 2,
        rakeOverhang: 1,
        shingleType: 'architectural',
        underlaymentType: 'felt-30',
        hasValleys: true,
        valleyCount: 2,
        hasSkylight: false,
        skylightCount: 0,
        hasChimney: true,
        chimneyCount: 1,
        wasteFactor: 0.10,
        unit: 'feet',
      }
    },
    {
      name: 'Barn/Storage',
      description: 'Gambrel barn roof - 40x30',
      icon: Warehouse,
      config: {
        length: 40,
        width: 30,
        style: 'gambrel',
        pitch: '8/12',
        eaveOverhang: 1,
        rakeOverhang: 1,
        shingleType: 'metal',
        underlaymentType: 'synthetic',
        hasValleys: false,
        valleyCount: 0,
        hasSkylight: false,
        skylightCount: 0,
        hasChimney: false,
        chimneyCount: 0,
        wasteFactor: 0.15,
        unit: 'feet',
      }
    },
    {
      name: 'Garage',
      description: 'Detached garage - Gable roof',
      icon: Warehouse,
      config: {
        length: 24,
        width: 24,
        style: 'gable',
        pitch: '5/12',
        eaveOverhang: 1,
        rakeOverhang: 1,
        shingleType: '3-tab',
        underlaymentType: 'felt-15',
        hasValleys: false,
        valleyCount: 0,
        hasSkylight: false,
        skylightCount: 0,
        hasChimney: false,
        chimneyCount: 0,
        wasteFactor: 0.10,
        unit: 'feet',
      }
    },
    {
      name: 'Shed',
      description: 'Storage shed - Simple shed roof',
      icon: Building2,
      config: {
        length: 12,
        width: 10,
        style: 'shed',
        pitch: '3/12',
        eaveOverhang: 0.5,
        rakeOverhang: 0.5,
        shingleType: '3-tab',
        underlaymentType: 'felt-15',
        hasValleys: false,
        valleyCount: 0,
        hasSkylight: false,
        skylightCount: 0,
        hasChimney: false,
        chimneyCount: 0,
        wasteFactor: 0.10,
        unit: 'feet',
      }
    },
    {
      name: 'Cape Cod',
      description: 'Classic Cape Cod - Steep gable',
      icon: Church,
      config: {
        length: 44,
        width: 28,
        style: 'gable',
        pitch: '12/12',
        eaveOverhang: 1,
        rakeOverhang: 1,
        shingleType: 'architectural',
        underlaymentType: 'synthetic',
        hasValleys: true,
        valleyCount: 2,
        hasSkylight: true,
        skylightCount: 3,
        hasChimney: true,
        chimneyCount: 2,
        wasteFactor: 0.15,
        unit: 'feet',
      }
    },
    {
      name: 'Commercial Flat',
      description: 'Commercial building - Flat roof',
      icon: Factory,
      config: {
        length: 80,
        width: 60,
        style: 'flat',
        pitch: '2/12',
        eaveOverhang: 0,
        rakeOverhang: 0,
        shingleType: 'metal',
        underlaymentType: 'synthetic',
        hasValleys: false,
        valleyCount: 0,
        hasSkylight: true,
        skylightCount: 4,
        hasChimney: false,
        chimneyCount: 0,
        wasteFactor: 0.08,
        unit: 'feet',
      }
    },
    {
      name: 'L-Shaped Home',
      description: '2,000 sq ft L-shaped - Two gable sections',
      icon: LayoutDashboard,
      config: {
        length: 40,
        width: 30,
        style: 'l-shaped',
        pitch: '6/12',
        eaveOverhang: 1.5,
        rakeOverhang: 1.5,
        shingleType: 'architectural',
        underlaymentType: 'synthetic',
        hasValleys: true,
        valleyCount: 2,
        hasSkylight: false,
        skylightCount: 0,
        hasChimney: true,
        chimneyCount: 1,
        lShapeConfig: {
          wingLength: 25,
          wingWidth: 20,
          wingPosition: 'back-right',
          wingRoofStyle: 'gable',
        },
        wasteFactor: 0.12,
        unit: 'feet',
      }
    },
    {
      name: 'T-Shaped Colonial',
      description: '2,200 sq ft T-shaped - Cross-wing design',
      icon: Columns3,
      config: {
        length: 50,
        width: 30,
        style: 't-shaped',
        pitch: '7/12',
        eaveOverhang: 1.5,
        rakeOverhang: 1.5,
        shingleType: 'architectural',
        underlaymentType: 'synthetic',
        hasValleys: true,
        valleyCount: 2,
        hasSkylight: false,
        skylightCount: 0,
        hasChimney: true,
        chimneyCount: 1,
        tShapeConfig: {
          wingLength: 22,
          wingWidth: 24,
          wingSide: 'right',
          wingRoofStyle: 'gable',
        },
        wasteFactor: 0.12,
        unit: 'feet',
      }
    },
    {
      name: 'U-Shaped Courtyard',
      description: '3,000 sq ft U-shaped - Enclosed courtyard',
      icon: LayoutDashboard,
      config: {
        length: 50,
        width: 28,
        style: 'u-shaped',
        pitch: '6/12',
        eaveOverhang: 2,
        rakeOverhang: 1.5,
        shingleType: 'designer',
        underlaymentType: 'synthetic',
        hasValleys: true,
        valleyCount: 4,
        hasSkylight: true,
        skylightCount: 2,
        hasChimney: true,
        chimneyCount: 1,
        uShapeConfig: {
          wingLength: 20,
          wingWidth: 22,
          wingSide: 'left-right',
          wingRoofStyle: 'gable',
        },
        wasteFactor: 0.14,
        unit: 'feet',
      }
    }
  ];

  return (
    <div className="bg-background rounded-lg shadow-sm border border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
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
                  ? 'border-orange-600 bg-orange-50 shadow-md'
                  : 'border-border bg-background hover:border-orange-300 hover:bg-muted'
                }
              `}
            >
              <TemplateMiniMap config={template.config} />
              
              <div className="p-4 flex-1 flex flex-col">
                <h3 className={`font-medium mb-1 ${isSelected ? 'text-orange-900' : 'text-foreground'}`}>
                  {template.name}
                </h3>
                <p className={`text-sm flex-1 ${isSelected ? 'text-orange-700' : 'text-muted-foreground'}`}>
                  {template.description}
                </p>
                
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-600"></span>
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