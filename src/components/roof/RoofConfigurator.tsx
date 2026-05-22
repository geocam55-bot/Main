import React, { useState } from 'react';
import type { DormerConfig, DormerStyle, LShapeConfig, LShapeWingPosition, TShapeConfig, TShapeWingSide, UShapeConfig, UShapeWingSide, RoofConfig } from '../../types/roof';
import { Plus, Trash2, Home, ChevronDown, ChevronUp, Maximize, Settings, Sparkles } from 'lucide-react';

interface RoofConfiguratorProps {
  config: RoofConfig;
  onChange: (config: RoofConfig) => void;
}

type Section = 'dimensions' | 'materials' | 'features';

export function RoofConfigurator({ config, onChange }: RoofConfiguratorProps) {
  const [openSections, setOpenSections] = useState<Record<Section, boolean>>({
    dimensions: true,
    materials: false,
    features: false,
  });

  const toggleSection = (section: Section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateConfig = (updates: Partial<RoofConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="bg-background rounded-lg shadow-sm border border-border flex flex-col h-full">
      <div className="p-4 border-b border-border shrink-0 bg-muted rounded-t-lg">
        <h2 className="text-foreground font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5 text-orange-600" />
          Roof Configuration
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Adjust dimensions, style, and materials</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        
        {/* Section: Dimensions & Layout */}
        <div className="border border-border rounded-lg overflow-hidden bg-background">
          <button
            onClick={() => toggleSection('dimensions')}
            className="w-full flex items-center justify-between p-3 bg-muted hover:bg-muted transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Maximize className="w-4 h-4 text-orange-600" />
              <span className="font-medium text-foreground text-sm">Dimensions & Layout</span>
            </div>
            {openSections.dimensions ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          
          {openSections.dimensions && (
            <div className="p-4 space-y-5 border-t border-border">
              {/* Building Dimensions */}
              <div>
                <h3 className="text-foreground text-sm mb-3">Main Building</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-foreground text-xs mb-1">Length (ft)</label>
                    <input
                      type="number"
                      min="10"
                      max="200"
                      step="1"
                      value={config.length}
                      onChange={(e) => updateConfig({ length: parseFloat(e.target.value) || 40 })}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-background text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-foreground text-xs mb-1">Width (ft)</label>
                    <input
                      type="number"
                      min="10"
                      max="200"
                      step="1"
                      value={config.width}
                      onChange={(e) => updateConfig({ width: parseFloat(e.target.value) || 30 })}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-background text-foreground text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Roof Style */}
              <div>
                <label className="block text-foreground text-sm mb-2">Roof Style</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateConfig({ style: 'gable' })}
                    className={`px-3 py-2 rounded-lg border-2 transition-colors text-xs font-medium ${
                      config.style === 'gable'
                        ? 'border-orange-600 bg-orange-50 text-orange-700'
                        : 'border-border text-foreground hover:border-slate-400'
                    }`}
                  >
                    Gable
                  </button>
                  <button
                    onClick={() => updateConfig({ style: 'hip' })}
                    className={`px-3 py-2 rounded-lg border-2 transition-colors text-xs font-medium ${
                      config.style === 'hip'
                        ? 'border-orange-600 bg-orange-50 text-orange-700'
                        : 'border-border text-foreground hover:border-slate-400'
                    }`}
                  >
                    Hip
                  </button>
                  <button
                    onClick={() => updateConfig({ style: 'gambrel' })}
                    className={`px-3 py-2 rounded-lg border-2 transition-colors text-xs font-medium ${
                      config.style === 'gambrel'
                        ? 'border-orange-600 bg-orange-50 text-orange-700'
                        : 'border-border text-foreground hover:border-slate-400'
                    }`}
                  >
                    Gambrel
                  </button>
                  <button
                    onClick={() => updateConfig({ style: 'shed' })}
                    className={`px-3 py-2 rounded-lg border-2 transition-colors text-xs font-medium ${
                      config.style === 'shed'
                        ? 'border-orange-600 bg-orange-50 text-orange-700'
                        : 'border-border text-foreground hover:border-slate-400'
                    }`}
                  >
                    Shed
                  </button>
                  <button
                    onClick={() => updateConfig({ style: 'mansard' })}
                    className={`px-3 py-2 rounded-lg border-2 transition-colors text-xs font-medium ${
                      config.style === 'mansard'
                        ? 'border-orange-600 bg-orange-50 text-orange-700'
                        : 'border-border text-foreground hover:border-slate-400'
                    }`}
                  >
                    Mansard
                  </button>
                  <button
                    onClick={() => updateConfig({ style: 'flat' })}
                    className={`px-3 py-2 rounded-lg border-2 transition-colors text-xs font-medium ${
                      config.style === 'flat'
                        ? 'border-orange-600 bg-orange-50 text-orange-700'
                        : 'border-border text-foreground hover:border-slate-400'
                    }`}
                  >
                    Flat
                  </button>
                  <button
                    onClick={() => updateConfig({ 
                      style: 'l-shaped',
                      lShapeConfig: config.lShapeConfig || { wingLength: 20, wingWidth: 20, wingPosition: 'back-right', wingRoofStyle: 'gable' },
                      hasValleys: true,
                      valleyCount: (config.valleyCount || 0) < 2 ? 2 : config.valleyCount,
                    })}
                    className={`px-3 py-2 rounded-lg border-2 transition-colors text-xs font-medium col-span-2 ${
                      config.style === 'l-shaped'
                        ? 'border-orange-600 bg-orange-50 text-orange-700'
                        : 'border-border text-foreground hover:border-slate-400'
                    }`}
                  >
                    L-Shaped
                  </button>
                  <button
                    onClick={() => updateConfig({ 
                      style: 't-shaped',
                      tShapeConfig: config.tShapeConfig || { wingLength: 20, wingWidth: 20, wingSide: 'right', wingRoofStyle: 'gable' },
                      hasValleys: true,
                      valleyCount: (config.valleyCount || 0) < 2 ? 2 : config.valleyCount,
                    })}
                    className={`px-3 py-2 rounded-lg border-2 transition-colors text-xs font-medium col-span-2 ${
                      config.style === 't-shaped'
                        ? 'border-orange-600 bg-orange-50 text-orange-700'
                        : 'border-border text-foreground hover:border-slate-400'
                    }`}
                  >
                    T-Shaped
                  </button>
                  <button
                    onClick={() => updateConfig({ 
                      style: 'u-shaped',
                      uShapeConfig: config.uShapeConfig || { wingLength: 20, wingWidth: 20, wingSide: 'left-right', wingRoofStyle: 'gable' },
                      hasValleys: true,
                      valleyCount: (config.valleyCount || 0) < 2 ? 2 : config.valleyCount,
                    })}
                    className={`px-3 py-2 rounded-lg border-2 transition-colors text-xs font-medium col-span-2 ${
                      config.style === 'u-shaped'
                        ? 'border-orange-600 bg-orange-50 text-orange-700'
                        : 'border-border text-foreground hover:border-slate-400'
                    }`}
                  >
                    U-Shaped
                  </button>
                </div>
              </div>

              {/* Wing Configurations */}
              {config.style === 'l-shaped' && (
                <div className="border border-orange-200 rounded-lg p-3 bg-orange-50/50 space-y-3">
                  <h3 className="text-foreground text-sm font-medium flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-orange-600"><path d="M2 2h5v12H2V2zm5 7h7v5H7V9z" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
                    L-Shape Wing Section
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-muted-foreground text-xs mb-1">Wing Length (ft)</label>
                      <input type="number" min="5" max="100" step="1" value={config.lShapeConfig?.wingLength || 20} onChange={(e) => updateConfig({ lShapeConfig: { ...(config.lShapeConfig || { wingLength: 20, wingWidth: 20, wingPosition: 'back-right', wingRoofStyle: 'gable' }), wingLength: parseFloat(e.target.value) || 20 } })} className="w-full px-2 py-1.5 border border-border rounded-md text-sm bg-background focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-muted-foreground text-xs mb-1">Wing Width (ft)</label>
                      <input type="number" min="5" max="100" step="1" value={config.lShapeConfig?.wingWidth || 20} onChange={(e) => updateConfig({ lShapeConfig: { ...(config.lShapeConfig || { wingLength: 20, wingWidth: 20, wingPosition: 'back-right', wingRoofStyle: 'gable' }), wingWidth: parseFloat(e.target.value) || 20 } })} className="w-full px-2 py-1.5 border border-border rounded-md text-sm bg-background focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-xs mb-1">Wing Position</label>
                    <div className="grid grid-cols-2 gap-1">
                      {(['front-right', 'front-left', 'back-right', 'back-left'] as const).map((pos) => (
                        <button key={pos} onClick={() => updateConfig({ lShapeConfig: { ...(config.lShapeConfig || { wingLength: 20, wingWidth: 20, wingPosition: 'back-right', wingRoofStyle: 'gable' }), wingPosition: pos } })} className={`px-2 py-1.5 rounded-md text-xs font-medium capitalize ${ (config.lShapeConfig?.wingPosition || 'back-right') === pos ? 'bg-orange-600 text-white' : 'bg-background text-muted-foreground border border-border' }`}>{pos.replace('-', ' ')}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-xs mb-1">Wing Roof Style</label>
                    <div className="flex gap-1">
                      {(['gable', 'hip'] as const).map((rs) => (
                        <button key={rs} onClick={() => updateConfig({ lShapeConfig: { ...(config.lShapeConfig || { wingLength: 20, wingWidth: 20, wingPosition: 'back-right', wingRoofStyle: 'gable' }), wingRoofStyle: rs } })} className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium capitalize ${ (config.lShapeConfig?.wingRoofStyle || 'gable') === rs ? 'bg-orange-600 text-white' : 'bg-background text-muted-foreground border border-border' }`}>{rs}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {config.style === 't-shaped' && (
                <div className="border border-orange-200 rounded-lg p-3 bg-orange-50/50 space-y-3">
                  <h3 className="text-foreground text-sm font-medium flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-orange-600"><path d="M2 2h5v12H2V2zm5 7h7v5H7V9z" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
                    T-Shape Wing Section
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-muted-foreground text-xs mb-1">Wing Length (ft)</label>
                      <input type="number" min="5" max="100" step="1" value={config.tShapeConfig?.wingLength || 20} onChange={(e) => updateConfig({ tShapeConfig: { ...(config.tShapeConfig || { wingLength: 20, wingWidth: 20, wingSide: 'right', wingRoofStyle: 'gable' }), wingLength: parseFloat(e.target.value) || 20 } })} className="w-full px-2 py-1.5 border border-border rounded-md text-sm bg-background focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-muted-foreground text-xs mb-1">Wing Width (ft)</label>
                      <input type="number" min="5" max="100" step="1" value={config.tShapeConfig?.wingWidth || 20} onChange={(e) => updateConfig({ tShapeConfig: { ...(config.tShapeConfig || { wingLength: 20, wingWidth: 20, wingSide: 'right', wingRoofStyle: 'gable' }), wingWidth: parseFloat(e.target.value) || 20 } })} className="w-full px-2 py-1.5 border border-border rounded-md text-sm bg-background focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-xs mb-1">Wing Side</label>
                    <div className="grid grid-cols-2 gap-1">
                      {(['front', 'back', 'left', 'right'] as const).map((pos) => (
                        <button key={pos} onClick={() => updateConfig({ tShapeConfig: { ...(config.tShapeConfig || { wingLength: 20, wingWidth: 20, wingSide: 'right', wingRoofStyle: 'gable' }), wingSide: pos } })} className={`px-2 py-1.5 rounded-md text-xs font-medium capitalize ${ (config.tShapeConfig?.wingSide || 'right') === pos ? 'bg-orange-600 text-white' : 'bg-background text-muted-foreground border border-border' }`}>{pos}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-xs mb-1">Wing Roof Style</label>
                    <div className="flex gap-1">
                      {(['gable', 'hip'] as const).map((rs) => (
                        <button key={rs} onClick={() => updateConfig({ tShapeConfig: { ...(config.tShapeConfig || { wingLength: 20, wingWidth: 20, wingSide: 'right', wingRoofStyle: 'gable' }), wingRoofStyle: rs } })} className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium capitalize ${ (config.tShapeConfig?.wingRoofStyle || 'gable') === rs ? 'bg-orange-600 text-white' : 'bg-background text-muted-foreground border border-border' }`}>{rs}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {config.style === 'u-shaped' && (
                <div className="border border-orange-200 rounded-lg p-3 bg-orange-50/50 space-y-3">
                  <h3 className="text-foreground text-sm font-medium flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-orange-600"><path d="M2 2h5v12H2V2zm5 7h7v5H7V9z" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
                    U-Shape Wings (x2)
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-muted-foreground text-xs mb-1">Each Wing Length</label>
                      <input type="number" min="5" max="100" step="1" value={config.uShapeConfig?.wingLength || 20} onChange={(e) => updateConfig({ uShapeConfig: { ...(config.uShapeConfig || { wingLength: 20, wingWidth: 20, wingSide: 'left-right', wingRoofStyle: 'gable' }), wingLength: parseFloat(e.target.value) || 20 } })} className="w-full px-2 py-1.5 border border-border rounded-md text-sm bg-background focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-muted-foreground text-xs mb-1">Each Wing Width</label>
                      <input type="number" min="5" max="100" step="1" value={config.uShapeConfig?.wingWidth || 20} onChange={(e) => updateConfig({ uShapeConfig: { ...(config.uShapeConfig || { wingLength: 20, wingWidth: 20, wingSide: 'left-right', wingRoofStyle: 'gable' }), wingWidth: parseFloat(e.target.value) || 20 } })} className="w-full px-2 py-1.5 border border-border rounded-md text-sm bg-background focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-xs mb-1">Wings Extend From</label>
                    <div className="grid grid-cols-2 gap-1">
                      {(['left-right', 'front-back'] as const).map((pos) => (
                        <button key={pos} onClick={() => updateConfig({ uShapeConfig: { ...(config.uShapeConfig || { wingLength: 20, wingWidth: 20, wingSide: 'left-right', wingRoofStyle: 'gable' }), wingSide: pos } })} className={`px-2 py-1.5 rounded-md text-xs font-medium capitalize ${ (config.uShapeConfig?.wingSide || 'left-right') === pos ? 'bg-orange-600 text-white' : 'bg-background text-muted-foreground border border-border' }`}>{pos === 'left-right' ? 'Left & Right' : 'Front & Back'}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-xs mb-1">Wing Roof Style</label>
                    <div className="flex gap-1">
                      {(['gable', 'hip'] as const).map((rs) => (
                        <button key={rs} onClick={() => updateConfig({ uShapeConfig: { ...(config.uShapeConfig || { wingLength: 20, wingWidth: 20, wingSide: 'left-right', wingRoofStyle: 'gable' }), wingRoofStyle: rs } })} className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium capitalize ${ (config.uShapeConfig?.wingRoofStyle || 'gable') === rs ? 'bg-orange-600 text-white' : 'bg-background text-muted-foreground border border-border' }`}>{rs}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section: Materials & Details */}
        <div className="border border-border rounded-lg overflow-hidden bg-background">
          <button
            onClick={() => toggleSection('materials')}
            className="w-full flex items-center justify-between p-3 bg-muted hover:bg-muted transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-600" />
              <span className="font-medium text-foreground text-sm">Materials & Details</span>
            </div>
            {openSections.materials ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {openSections.materials && (
            <div className="p-4 space-y-5 border-t border-border">
              {/* Roof Pitch */}
              <div>
                <label className="block text-foreground text-xs mb-1">Roof Pitch</label>
                <select
                  value={config.pitch}
                  onChange={(e) => updateConfig({ pitch: e.target.value as any })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-background text-foreground text-sm"
                >
                  <option value="2/12">2/12 (9.5°) - Shallow</option>
                  <option value="3/12">3/12 (14°) - Low</option>
                  <option value="4/12">4/12 (18.5°) - Standard</option>
                  <option value="5/12">5/12 (22.5°) - Standard</option>
                  <option value="6/12">6/12 (26.5°) - Common</option>
                  <option value="7/12">7/12 (30°) - Steep</option>
                  <option value="8/12">8/12 (33.5°) - Steep</option>
                  <option value="9/12">9/12 (37°) - Very Steep</option>
                  <option value="10/12">10/12 (40°) - Very Steep</option>
                  <option value="12/12">12/12 (45°) - Extreme</option>
                </select>
              </div>

              {/* Overhangs */}
              <div>
                <h3 className="text-foreground text-xs mb-2">Overhangs</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-foreground text-xs mb-1">Eave (ft)</label>
                    <input
                      type="number" min="0" max="4" step="0.5"
                      value={config.eaveOverhang}
                      onChange={(e) => updateConfig({ eaveOverhang: parseFloat(e.target.value) || 1.5 })}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-orange-500 bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-foreground text-xs mb-1">Rake (ft)</label>
                    <input
                      type="number" min="0" max="4" step="0.5"
                      value={config.rakeOverhang}
                      onChange={(e) => updateConfig({ rakeOverhang: parseFloat(e.target.value) || 1.5 })}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-orange-500 bg-background text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Shingles */}
              <div>
                <label className="block text-foreground text-xs mb-1">Shingle Type</label>
                <select
                  value={config.shingleType}
                  onChange={(e) => updateConfig({ shingleType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-orange-500 bg-background text-sm"
                >
                  <option value="architectural">Architectural (Dimensional)</option>
                  <option value="3-tab">3-Tab Asphalt</option>
                  <option value="designer">Designer/Premium</option>
                  <option value="metal">Metal Roofing</option>
                  <option value="cedar-shake">Cedar Shake</option>
                </select>
              </div>

              {/* Underlayment */}
              <div>
                <label className="block text-foreground text-xs mb-1">Underlayment Type</label>
                <select
                  value={config.underlaymentType}
                  onChange={(e) => updateConfig({ underlaymentType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-orange-500 bg-background text-sm"
                >
                  <option value="synthetic">Synthetic (Recommended)</option>
                  <option value="felt-15">#15 Felt Paper</option>
                  <option value="felt-30">#30 Felt Paper</option>
                  <option value="ice-and-water">Ice & Water Shield</option>
                </select>
              </div>

              {/* Waste Factor */}
              <div>
                <label className="block text-foreground text-xs mb-1">
                  Waste Factor: {(config.wasteFactor * 100).toFixed(0)}%
                </label>
                <input
                  type="range" min="5" max="20" step="1"
                  value={config.wasteFactor * 100}
                  onChange={(e) => updateConfig({ wasteFactor: parseInt(e.target.value) / 100 })}
                  className="w-full accent-orange-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section: Additional Features */}
        <div className="border border-border rounded-lg overflow-hidden bg-background">
          <button
            onClick={() => toggleSection('features')}
            className="w-full flex items-center justify-between p-3 bg-muted hover:bg-muted transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-orange-600" />
              <span className="font-medium text-foreground text-sm">Additional Features</span>
            </div>
            {openSections.features ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {openSections.features && (
            <div className="p-4 space-y-6 border-t border-border">
              
              {/* Addons Grid */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={config.hasValleys || false} onChange={(e) => updateConfig({ hasValleys: e.target.checked, valleyCount: e.target.checked ? (config.valleyCount || 2) : 0 })} className="rounded border-border text-orange-600 focus:ring-orange-500 w-4 h-4" />
                    <span className="text-foreground text-sm">Include Valleys</span>
                  </label>
                  {config.hasValleys && (
                    <div className="pl-6">
                      <input type="number" min="1" max="10" value={config.valleyCount || 2} onChange={(e) => updateConfig({ valleyCount: parseInt(e.target.value) || 2 })} className="w-full px-2 py-1.5 border border-border rounded-md text-sm bg-background focus:ring-2 focus:ring-orange-500" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={config.hasSkylight || false} onChange={(e) => updateConfig({ hasSkylight: e.target.checked, skylightCount: e.target.checked ? (config.skylightCount || 1) : 0 })} className="rounded border-border text-orange-600 focus:ring-orange-500 w-4 h-4" />
                    <span className="text-foreground text-sm">Include Skylights</span>
                  </label>
                  {config.hasSkylight && (
                    <div className="pl-6">
                      <input type="number" min="1" max="10" value={config.skylightCount || 1} onChange={(e) => updateConfig({ skylightCount: parseInt(e.target.value) || 1 })} className="w-full px-2 py-1.5 border border-border rounded-md text-sm bg-background focus:ring-2 focus:ring-orange-500" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={config.hasChimney || false} onChange={(e) => updateConfig({ hasChimney: e.target.checked, chimneyCount: e.target.checked ? (config.chimneyCount || 1) : 0 })} className="rounded border-border text-orange-600 focus:ring-orange-500 w-4 h-4" />
                    <span className="text-foreground text-sm">Include Chimneys</span>
                  </label>
                  {config.hasChimney && (
                    <div className="pl-6">
                      <input type="number" min="1" max="5" value={config.chimneyCount || 1} onChange={(e) => updateConfig({ chimneyCount: parseInt(e.target.value) || 1 })} className="w-full px-2 py-1.5 border border-border rounded-md text-sm bg-background focus:ring-2 focus:ring-orange-500" />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <label className="flex items-center gap-2 mb-3">
                  <input type="checkbox" checked={config.hasDormers || false} onChange={(e) => updateConfig({ hasDormers: e.target.checked, dormers: e.target.checked ? (config.dormers?.length ? config.dormers : []) : [] })} className="rounded border-border text-orange-600 focus:ring-orange-500 w-4 h-4" />
                  <span className="text-foreground text-sm font-medium">Add Dormers</span>
                </label>

                {config.hasDormers && (
                  <div className="space-y-4">
                    {(config.dormers || []).map((dormer, index) => (
                      <div key={dormer.id} className="border border-border rounded-lg p-3 bg-muted space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">Dormer {index + 1}</span>
                          <button onClick={() => { const updated = (config.dormers || []).filter(d => d.id !== dormer.id); updateConfig({ dormers: updated }); }} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                        
                        <select value={dormer.style} onChange={(e) => { const updated = (config.dormers || []).map(d => d.id === dormer.id ? { ...d, style: e.target.value as DormerStyle } : d ); updateConfig({ dormers: updated }); }} className="w-full px-2 py-1.5 border border-border rounded-md text-sm bg-background">
                          <option value="gable">Gable</option><option value="shed">Shed</option><option value="hip">Hip</option><option value="eyebrow">Eyebrow</option><option value="flat">Flat</option>
                        </select>

                        <div className="grid grid-cols-3 gap-2">
                          <div><label className="block text-muted-foreground text-[10px] mb-1">Width</label><input type="number" min="2" max="12" step="0.5" value={dormer.width} onChange={(e) => { const updated = (config.dormers || []).map(d => d.id === dormer.id ? { ...d, width: parseFloat(e.target.value) || 4 } : d ); updateConfig({ dormers: updated }); }} className="w-full px-2 py-1 border border-border rounded text-xs bg-background" /></div>
                          <div><label className="block text-muted-foreground text-[10px] mb-1">Height</label><input type="number" min="2" max="8" step="0.5" value={dormer.height} onChange={(e) => { const updated = (config.dormers || []).map(d => d.id === dormer.id ? { ...d, height: parseFloat(e.target.value) || 4 } : d ); updateConfig({ dormers: updated }); }} className="w-full px-2 py-1 border border-border rounded text-xs bg-background" /></div>
                          <div><label className="block text-muted-foreground text-[10px] mb-1">Depth</label><input type="number" min="2" max="10" step="0.5" value={dormer.depth} onChange={(e) => { const updated = (config.dormers || []).map(d => d.id === dormer.id ? { ...d, depth: parseFloat(e.target.value) || 4 } : d ); updateConfig({ dormers: updated }); }} className="w-full px-2 py-1 border border-border rounded text-xs bg-background" /></div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <select value={dormer.horizontalPosition} onChange={(e) => { const updated = (config.dormers || []).map(d => d.id === dormer.id ? { ...d, horizontalPosition: e.target.value as any } : d ); updateConfig({ dormers: updated }); }} className="w-full px-2 py-1 border border-border rounded text-xs bg-background">
                            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                          </select>
                          <select value={dormer.side} onChange={(e) => { const updated = (config.dormers || []).map(d => d.id === dormer.id ? { ...d, side: e.target.value as any } : d ); updateConfig({ dormers: updated }); }} className="w-full px-2 py-1 border border-border rounded text-xs bg-background">
                            <option value="front">Front</option><option value="back">Back</option>
                          </select>
                        </div>
                      </div>
                    ))}

                    <button onClick={() => { const newDormer: DormerConfig = { id: Math.random().toString(36).substring(2, 9), style: 'gable', width: 4, height: 4, depth: 5, horizontalPosition: 'center', side: 'front', hasWindow: true }; updateConfig({ dormers: [...(config.dormers || []), newDormer] }); }} className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-border rounded-lg text-sm text-orange-600 hover:border-orange-400 hover:bg-orange-50 transition-colors">
                      <Plus className="w-4 h-4" /> Add Dormer
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
