import React from 'react';
import { DeckConfig } from '../../types/deck';
import {
  selectLumberLength,
  getLumberLengthDescription,
  getDeckBoardSpan,
} from '../../utils/lumberLengths';

interface DeckConfiguratorProps {
  config: DeckConfig;
  onChange: (config: DeckConfig) => void;
}

export function DeckConfigurator({ config, onChange }: DeckConfiguratorProps) {
  const updateConfig = (updates: Partial<DeckConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="bg-background rounded-lg shadow-sm border border-border p-4 sm:p-6">
      <h2 className="text-foreground mb-4">Deck Configuration</h2>
      
      <div className="space-y-4">
        {/* Dimensions */}
        <div>
          <h3 className="text-foreground text-sm mb-3">Dimensions</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-foreground text-sm mb-1">
                Width (ft)
              </label>
              <input
                type="number"
                min="4"
                max="50"
                step="0.5"
                value={config.width}
                onChange={(e) => updateConfig({ width: parseFloat(e.target.value) || 12 })}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-foreground text-sm mb-1">
                Length (ft)
              </label>
              <input
                type="number"
                min="4"
                max="50"
                step="0.5"
                value={config.length}
                onChange={(e) => updateConfig({ length: parseFloat(e.target.value) || 16 })}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-background text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Height and Attachment */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-foreground text-sm mb-1">
              Deck Height Above Ground (ft)
            </label>
            <input
              type="number"
              min="0.5"
              max="12"
              step="0.5"
              value={config.height}
              onChange={(e) => updateConfig({ height: parseFloat(e.target.value) || 2 })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-background text-foreground"
            />
          </div>
          <div>
            <label className="block text-foreground text-sm mb-1">
              Attachment
            </label>
            <div className="flex h-[42px] items-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={!!config.isDetached}
                  onChange={(e) => updateConfig({ isDetached: e.target.checked })}
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                <span className="ml-3 text-sm font-medium text-foreground">Detached (Freestanding)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Shape */}
        <div>
          <label className="block text-foreground text-sm mb-2">
            Deck Shape
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => updateConfig({ shape: 'rectangle' })}
              className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                config.shape === 'rectangle'
                  ? 'border-purple-600 bg-purple-50 text-purple-700'
                  : 'border-border text-foreground hover:border-slate-400'
              }`}
            >
              Rectangle
            </button>
            <button
              onClick={() => updateConfig({ 
                shape: 'l-shape',
                lShapeWidth: config.lShapeWidth || 8,
                lShapeLength: config.lShapeLength || 10,
                lShapePosition: config.lShapePosition || 'top-left'
              })}
              className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                config.shape === 'l-shape'
                  ? 'border-purple-600 bg-purple-50 text-purple-700'
                  : 'border-border text-foreground hover:border-slate-400'
              }`}
            >
              L-Shape
            </button>
            <button
              onClick={() => updateConfig({ 
                shape: 'u-shape',
                uShapeLeftWidth: config.uShapeLeftWidth || 6,
                uShapeRightWidth: config.uShapeRightWidth || 6,
                uShapeDepth: config.uShapeDepth || 8
              })}
              className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                config.shape === 'u-shape'
                  ? 'border-purple-600 bg-purple-50 text-purple-700'
                  : 'border-border text-foreground hover:border-slate-400'
              }`}
            >
              U-Shape
            </button>
          </div>
        </div>

        {/* L-Shape Configuration */}
        {config.shape === 'l-shape' && (
          <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-900 font-medium mb-2">
              L-Shape Extension Settings
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-foreground text-sm mb-1">
                  Extension Width (ft)
                </label>
                <input
                  type="number"
                  min="4"
                  max="50"
                  step="1"
                  value={config.lShapeWidth || 8}
                  onChange={(e) => updateConfig({ lShapeWidth: parseFloat(e.target.value) || 8 })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-foreground text-sm mb-1">
                  Extension Length (ft)
                </label>
                <input
                  type="number"
                  min="4"
                  max="50"
                  step="1"
                  value={config.lShapeLength || 10}
                  onChange={(e) => updateConfig({ lShapeLength: parseFloat(e.target.value) || 10 })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-background text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-foreground text-sm mb-1">
                Extension Position
              </label>
              <select
                value={config.lShapePosition || 'top-left'}
                onChange={(e) => updateConfig({ lShapePosition: e.target.value as any })}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-background text-foreground"
              >
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>
          </div>
        )}

        {/* U-Shape Configuration */}
        {config.shape === 'u-shape' && (
          <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-900 font-medium mb-2">
              U-Shape Extension Settings
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-foreground text-sm mb-1">
                  Left Arm Width (ft)
                </label>
                <input
                  type="number"
                  min="4"
                  max="50"
                  step="1"
                  value={config.uShapeLeftWidth || 6}
                  onChange={(e) => updateConfig({ uShapeLeftWidth: parseFloat(e.target.value) || 6 })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-foreground text-sm mb-1">
                  Right Arm Width (ft)
                </label>
                <input
                  type="number"
                  min="4"
                  max="50"
                  step="1"
                  value={config.uShapeRightWidth || 6}
                  onChange={(e) => updateConfig({ uShapeRightWidth: parseFloat(e.target.value) || 6 })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-background text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-foreground text-sm mb-1">
                Arms Depth (ft)
              </label>
              <input
                type="number"
                min="4"
                max="50"
                step="1"
                value={config.uShapeDepth || 8}
                onChange={(e) => updateConfig({ uShapeDepth: parseFloat(e.target.value) || 8 })}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-background text-foreground"
              />
            </div>
          </div>
        )}

        {/* Joist Spacing */}
        <div>
          <label className="block text-foreground text-sm mb-2">
            Joist Spacing (inches on center)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[12, 16, 24].map((spacing) => (
              <button
                key={spacing}
                onClick={() => updateConfig({ joistSpacing: spacing as 12 | 16 | 24 })}
                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                  config.joistSpacing === spacing
                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                    : 'border-border text-foreground hover:border-slate-400'
                }`}
              >
                {spacing}"
              </button>
            ))}
          </div>
        </div>

        {/* Decking Pattern */}
        <div>
          <label className="block text-foreground text-sm mb-2">
            Decking Board Pattern
          </label>
          <select
            value={config.deckingPattern}
            onChange={(e) => updateConfig({ deckingPattern: e.target.value as any })}
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-background text-foreground"
          >
            <option value="perpendicular">Perpendicular to House</option>
            <option value="parallel">Parallel to House</option>
            <option value="diagonal">Diagonal (45°)</option>
          </select>
        </div>

        {/* Decking Material Type */}
        <div>
          <label className="block text-foreground text-sm mb-2">
            Decking Material Type
          </label>
          <select
            value={config.deckingType}
            onChange={(e) => updateConfig({ deckingType: e.target.value as any })}
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-background text-foreground"
          >
            <option value="Spruce">Spruce</option>
            <option value="Treated">Treated</option>
            <option value="Cedar">Cedar</option>
            <option value="Composite">Composite</option>
          </select>
        </div>

        {/* Support Post & Footing Details */}
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-700 mb-2">Footing & Post Options</p>
          
          <div className="space-y-3">
            <div>
              <label className="block text-foreground text-xs font-medium mb-1.5 flex items-center justify-between">
                <span>Support Post Size</span>
                <span className="text-[10px] text-muted-foreground font-mono">6x6 posts require 8" Formtubes minimum</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['4x4', '6x6'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      const nextConfig: Partial<DeckConfig> = { postSize: size };
                      if (size === '6x6' && (!config.formtubeSize || config.formtubeSize === '8"' || config.formtubeSize === '6"')) {
                        nextConfig.formtubeSize = '8"';
                      }
                      updateConfig(nextConfig);
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg border-2 transition-colors font-medium ${
                      (config.postSize || '4x4') === size
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-border text-foreground hover:border-slate-400 bg-background'
                    }`}
                  >
                    {size} PT Posts
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-foreground text-xs font-medium mb-1">
                Concrete Formtube Diameter (3' depth)
              </label>
              <select
                value={config.formtubeSize || '8"'}
                onChange={(e) => {
                  const size = e.target.value as any;
                  const nextConfig: Partial<DeckConfig> = { formtubeSize: size };
                  if (size === '6"' && config.postSize === '6x6') {
                    nextConfig.postSize = '4x4';
                  }
                  updateConfig(nextConfig);
                }}
                className="w-full px-3 py-1.5 text-xs border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-background text-foreground"
              >
                <option value="6&quot;">6" Cardboard Tube (~1 bag of concrete per post)</option>
                <option value="8&quot;">8" Cardboard Tube (~1.8 bags of concrete per post)</option>
                <option value="10&quot;">10" Cardboard Tube (~3 bags of concrete per post)</option>
                <option value="12&quot;">12" Cardboard Tube (~4 bags of concrete per post)</option>
                <option value="14&quot;">14" Cardboard Tube (~5.4 bags of concrete per post)</option>
                <option value="16&quot;">16" Cardboard Tube (~7 bags of concrete per post)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stairs */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-foreground text-sm">
              Include Stairs
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.hasStairs}
                onChange={(e) => updateConfig({ hasStairs: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {config.hasStairs && (
            <div className="space-y-3">
              <div>
                <label className="block text-foreground text-sm mb-1">
                  Stair Location
                </label>
                <select
                  value={config.stairSide}
                  onChange={(e) => updateConfig({ stairSide: e.target.value as any })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-background text-foreground"
                >
                  <option value="front">Front</option>
                  <option value="back">Back</option>
                  <option value="left">Left Side</option>
                  <option value="right">Right Side</option>
                </select>
              </div>
              <div>
                <label className="block text-foreground text-sm mb-1">
                  Stair Width (ft)
                </label>
                <input
                  type="number"
                  min="3"
                  max="8"
                  step="0.5"
                  value={config.stairWidth || 4}
                  onChange={(e) => updateConfig({ stairWidth: parseFloat(e.target.value) || 4 })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-background text-foreground"
                />
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <label className="text-foreground text-sm">
                  Include Stair Railing
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.stairRailing !== false} // Default to true
                    onChange={(e) => updateConfig({ stairRailing: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Railings */}
        <div className="border-t border-border pt-4">
          <label className="block text-foreground text-sm mb-2">
            Railing Style
          </label>
          <select
            value={config.railingStyle || 'Treated'}
            onChange={(e) => {
              const nextStyle = e.target.value as any;
              updateConfig({
                railingStyle: nextStyle,
                ...(nextStyle === 'Aluminum'
                  ? {
                      aluminumInfillType: config.aluminumInfillType || 'Pickets',
                      aluminumRailingColor: config.aluminumRailingColor || 'White',
                    }
                  : {}),
              });
            }}
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-background text-foreground mb-4"
          >
            <option value="Treated">Treated Wood</option>
            <option value="Aluminum">Aluminum</option>
            <option value="None">None</option>
          </select>

          {config.railingStyle === 'Aluminum' && (
            <div className="space-y-3 mb-4 mt-4">
              <div>
                <label className="block text-foreground text-sm mb-1">
                  Aluminum Infill Style
                </label>
                <select
                  value={config.aluminumInfillType || 'Pickets'}
                  onChange={(e) => updateConfig({ aluminumInfillType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-background text-foreground"
                >
                  <option value="Pickets">Pickets (Balusters)</option>
                  <option value="Glass">Glass</option>
                </select>
              </div>

              <div>
                <label className="block text-foreground text-sm mb-1">
                  Aluminum System Color
                </label>
                <select
                  value={config.aluminumRailingColor || 'White'}
                  onChange={(e) => updateConfig({ aluminumRailingColor: e.target.value as any })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-background text-foreground"
                >
                  <option value="White">White</option>
                  <option value="Black">Black</option>
                </select>
              </div>
            </div>
          )}

          {config.railingStyle !== 'None' && (
            <>
              <label className="block text-foreground text-sm mb-2">
                Railing Sides
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['front', 'back', 'left', 'right'].map((side) => (
                  <label
                    key={side}
                    className={`flex items-center gap-2 px-3 py-2 border-2 rounded-lg cursor-pointer transition-colors ${
                      config.railingSides.includes(side as any)
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-border text-foreground hover:border-slate-400 hover:bg-muted'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={config.railingSides.includes(side as any)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateConfig({
                            railingSides: [...config.railingSides, side as any],
                          });
                        } else {
                          updateConfig({
                            railingSides: config.railingSides.filter((s) => s !== side),
                          });
                        }
                      }}
                      className="w-4 h-4 text-purple-600 border-border rounded focus:ring-purple-500"
                    />
                    <span className="text-sm capitalize">{side}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Summary Info */}
        <div className="border-t border-border pt-4 bg-muted -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deck Area:</span>
              <span className="text-foreground">{(config.width * config.length).toFixed(0)} sq ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Perimeter:</span>
              <span className="text-foreground">{((config.width + config.length) * 2).toFixed(0)} ft</span>
            </div>
          </div>

          {/* Auto-selected Lumber Lengths */}
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs font-medium text-purple-700 mb-1.5">Auto-Selected Lumber Lengths</p>
            <div className="text-xs space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <span>Ledger Board ({config.width}' span):</span>
                <span className="font-medium text-foreground">{getLumberLengthDescription(config.width)}</span>
              </div>
              <div className="flex justify-between">
                <span>Joists ({config.length}' span):</span>
                <span className="font-medium text-foreground">{getLumberLengthDescription(config.length)}</span>
              </div>
              <div className="flex justify-between">
                <span>Beams ({config.width}' span):</span>
                <span className="font-medium text-foreground">{getLumberLengthDescription(config.width)}</span>
              </div>
              {(() => {
                const boardSpan = getDeckBoardSpan(config.width, config.length, config.deckingPattern);
                const patternLabel = config.deckingPattern === 'perpendicular' ? 'perp.' : config.deckingPattern === 'parallel' ? 'par.' : 'diag.';
                return (
                  <div className="flex justify-between">
                    <span>Deck Boards ({patternLabel} {boardSpan}'):</span>
                    <span className="font-medium text-foreground">{getLumberLengthDescription(boardSpan)}</span>
                  </div>
                );
              })()}
              <div className="flex justify-between">
                <span>Posts ({config.postSize || '4x4'} PT @ {Math.ceil(config.height + 1)}' ht):</span>
                <span className="font-medium text-foreground">{selectLumberLength(Math.ceil(config.height + 1))}'</span>
              </div>
              <div className="flex justify-between">
                <span>Formtube & Depth:</span>
                <span className="font-medium text-foreground">{config.formtubeSize || '8"'} @ 3' Deep</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}