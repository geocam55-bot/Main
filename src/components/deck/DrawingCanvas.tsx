import React, { useState, useEffect, useRef } from 'react';
import { Undo2, RotateCcw, Check, ArrowLeft, Ruler, Plus, Minus, Info } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface DrawingCanvasProps {
  onComplete: (points: { x: number; y: number }[], height: number) => void;
  onCancel: () => void;
  initialHeight?: number;
}

export function DrawingCanvas({ onComplete, onCancel, initialHeight = 2 }: DrawingCanvasProps) {
  // Points are in feet units, with (0,0) as the reference top-left
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);
  const [deckHeight, setDeckHeight] = useState<number>(initialHeight);
  
  // Grid size in feet (grid is 30ft wide x 24ft high)
  const gridWidthFeet = 30;
  const gridHeightFeet = 24;
  const gridSpacingFeet = 1; // 1 foot increments
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 450 });

  // Handle resizing of the container to keep it fluid
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height || 450
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Compute scaling factors
  const scaleX = dimensions.width / gridWidthFeet;
  const scaleY = dimensions.height / gridHeightFeet;
  const scale = Math.min(scaleX, scaleY);
  
  // Center the grid in the container
  const offsetX = (dimensions.width - gridWidthFeet * scale) / 2;
  const offsetY = (dimensions.height - gridHeightFeet * scale) / 2;

  // Convert feet coordinates to screen pixels
  const toPx = (x: number, y: number) => ({
    x: offsetX + x * scale,
    y: offsetY + y * scale
  });

  // Convert screen pixels back to snapped feet coordinates
  const fromPx = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const pxX = clientX - rect.left - offsetX;
    const pxY = clientY - rect.top - offsetY;
    
    // Convert to feet
    const ftX = pxX / scale;
    const ftY = pxY / scale;
    
    // Snap to grid spacing
    const snappedX = Math.max(0, Math.min(gridWidthFeet, Math.round(ftX / gridSpacingFeet) * gridSpacingFeet));
    const snappedY = Math.max(0, Math.min(gridHeightFeet, Math.round(ftY / gridSpacingFeet) * gridSpacingFeet));
    
    return { x: snappedX, y: snappedY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pt = fromPx(e.clientX, e.clientY);
    setHoverPoint(pt);
  };

  const handleMouseLeave = () => {
    setHoverPoint(null);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const pt = fromPx(e.clientX, e.clientY);
    
    // Check if clicking near the first point to close the loop
    if (points.length >= 3) {
      const first = points[0];
      const dist = Math.sqrt((pt.x - first.x)**2 + (pt.y - first.y)**2);
      if (dist < 1.1) {
        handleComplete();
        return;
      }
    }

    // Check if point already exists in active points (prevent duplicates consecutively)
    if (points.length > 0) {
      const last = points[points.length - 1];
      if (last.x === pt.x && last.y === pt.y) return;
    }

    setPoints(prev => [...prev, pt]);
  };

  const handleUndo = () => {
    setPoints(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPoints([]);
    toast.info('Canvas cleared');
  };

  const handleComplete = () => {
    if (points.length < 3) {
      toast.error('Please draw at least 3 points to define a deck shape.');
      return;
    }
    onComplete(points, deckHeight);
    toast.success('Deck geometry generated successfully!');
  };

  // Format dimensions nicely
  const formatDim = (val: number) => {
    const ft = Math.floor(val);
    const inches = Math.round((val - ft) * 12);
    return `${ft}' ${inches.toString().padStart(2, '0')}"`;
  };

  // Generate grid lines
  const gridLines = [];
  for (let x = 0; x <= gridWidthFeet; x += gridSpacingFeet) {
    gridLines.push(
      <line
        key={`x-${x}`}
        x1={offsetX + x * scale}
        y1={offsetY}
        x2={offsetX + x * scale}
        y2={offsetY + gridHeightFeet * scale}
        stroke="#f1f5f9"
        strokeWidth={x % 5 === 0 ? 1.5 : 0.5}
      />
    );
  }
  for (let y = 0; y <= gridHeightFeet; y += gridSpacingFeet) {
    gridLines.push(
      <line
        key={`y-${y}`}
        x1={offsetX}
        y1={offsetY + y * scale}
        x2={offsetX + gridWidthFeet * scale}
        y2={offsetY + y * scale}
        stroke="#f1f5f9"
        strokeWidth={y % 5 === 0 ? 1.5 : 0.5}
      />
    );
  }

  // Draw solid points and helper paths
  const currentPathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toPx(p.x, p.y).x} ${toPx(p.y, p.y).y}`);
  
  return (
    <div className="flex flex-col lg:flex-row h-[550px] bg-[#1e1e1e] text-white rounded-lg overflow-hidden border border-neutral-700 shadow-2xl select-none">
      
      {/* Left Sidebar - "Deck Shaping" */}
      <div className="w-full lg:w-72 bg-[#2d2d2d] border-r border-neutral-700 p-5 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-neutral-700">
            <Ruler className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-lg text-white">Deck Shaping</h3>
          </div>

          <button
            onClick={onCancel}
            className="w-full py-2 px-4 bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 rounded-md text-sm text-neutral-200 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Replace Deck / Back
          </button>

          {/* Edit Deck Height */}
          <div className="space-y-3 bg-[#242424] p-4 rounded-lg border border-neutral-700">
            <span className="text-xs text-neutral-400 font-medium uppercase tracking-wider block">Main Deck Height</span>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setDeckHeight(h => Math.max(0.5, h - 0.5))}
                className="p-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-neutral-200 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-xl font-bold font-mono text-yellow-500">{formatDim(deckHeight)}</span>
              <button
                onClick={() => setDeckHeight(h => Math.min(15, h + 0.5))}
                className="p-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-neutral-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Help Box */}
          <div className="bg-[#242424] border-l-2 border-yellow-500 p-3 text-xs text-neutral-300 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
              <Info className="w-3.5 h-3.5 text-yellow-500" />
              <span>How to Draw:</span>
            </div>
            <p>1. Click anywhere on grid to place nodes.</p>
            <p>2. Points snap to 1-foot grid lines.</p>
            <p>3. Hover close to first node and click to close loop, or click orange button.</p>
          </div>
        </div>

        {/* Complete Deck primary action button */}
        <button
          onClick={handleComplete}
          disabled={points.length < 3}
          className={`
            w-full py-3 px-4 font-semibold rounded-md shadow-lg transition-all flex items-center justify-center gap-2
            ${points.length >= 3
              ? 'bg-orange-500 hover:bg-orange-600 text-white active:scale-[0.98]'
              : 'bg-neutral-700 text-neutral-500 cursor-not-allowed border border-neutral-800'
            }
          `}
        >
          <Check className="w-5 h-5" />
          Complete Deck
        </button>
      </div>

      {/* Main Grid Canvas */}
      <div className="flex-1 flex flex-col relative bg-stone-900">
        
        {/* Undo/Redo & Utility bar */}
        <div className="h-14 bg-[#282828] border-b border-neutral-700 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-neutral-300">
              Active Nodes: <span className="text-yellow-500 font-bold">{points.length}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={points.length === 0}
              className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs"
              title="Undo last point"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
            <button
              onClick={handleClear}
              disabled={points.length === 0}
              className="p-2 bg-neutral-800 hover:bg-red-950 text-neutral-200 hover:text-red-400 rounded border border-transparent hover:border-red-900/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs"
              title="Clear all points"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* The Grid Drawing area */}
        <div 
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleCanvasClick}
          className="flex-1 relative cursor-crosshair overflow-hidden"
          style={{ backgroundImage: 'radial-gradient(#2d2d2d 1px, transparent 1px)', backgroundSize: '16px 16px' }}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Grid Line lines */}
            {gridLines}

            {/* Bounding Box Dimensions if points are drawn */}
            {points.length > 0 && (() => {
              let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
              points.forEach(p => {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
              });
              const pxMin = toPx(minX, minY);
              const pxMax = toPx(maxX, maxY);
              
              if (maxX - minX > 0 && maxY - minY > 0) {
                return (
                  <g opacity="0.3">
                    <rect 
                      x={pxMin.x} 
                      y={pxMin.y} 
                      width={pxMax.x - pxMin.x} 
                      height={pxMax.y - pxMin.y} 
                      fill="none" 
                      stroke="#eab308" 
                      strokeWidth="1" 
                      strokeDasharray="4,4" 
                    />
                    <text x={pxMin.x + 4} y={pxMin.y - 4} fill="#eab308" className="text-[10px] font-mono">
                      {formatDim(maxX - minX)} W × {formatDim(maxY - minY)} L
                    </text>
                  </g>
                );
              }
              return null;
            })()}

            {/* Polygon Shape of Points so far */}
            {points.length >= 2 && (
              <polyline
                points={points.map(p => `${toPx(p.x, p.y).x},${toPx(p.x, p.y).y}`).join(' ')}
                fill="rgba(234, 179, 8, 0.05)"
                stroke="#eab308"
                strokeWidth="3.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}

            {/* Proposed Line from Last Point to Hover/Cursor */}
            {points.length > 0 && hoverPoint && (
              (() => {
                const last = points[points.length - 1];
                const pLast = toPx(last.x, last.y);
                const pHover = toPx(hoverPoint.x, hoverPoint.y);
                const distFeet = Math.sqrt((last.x - hoverPoint.x)**2 + (last.y - hoverPoint.y)**2);
                
                // Angle label
                let angleDeg = 0;
                if (points.length >= 2) {
                  const prev = points[points.length - 2];
                  const a1 = Math.atan2(last.y - prev.y, last.x - prev.x);
                  const a2 = Math.atan2(hoverPoint.y - last.y, hoverPoint.x - last.x);
                  angleDeg = Math.abs((a2 - a1) * 180 / Math.PI);
                  if (angleDeg > 180) angleDeg = 360 - angleDeg;
                }
                
                const isCloseToStart = points.length >= 3 && Math.sqrt((hoverPoint.x - points[0].x)**2 + (hoverPoint.y - points[0].y)**2) < 1.1;

                return (
                  <g>
                    <line
                      x1={pLast.x}
                      y1={pLast.y}
                      x2={pHover.x}
                      y2={pHover.y}
                      stroke={isCloseToStart ? "#22c55e" : "#fbbf24"}
                      strokeWidth="2"
                      strokeDasharray="6,4"
                    />
                    
                    {/* Distance Pill */}
                    {distFeet > 0.5 && (
                      <g transform={`translate(${(pLast.x + pHover.x) / 2}, ${(pLast.y + pHover.y) / 2})`}>
                        <rect x="-35" y="-10" width="70" height="20" rx="4" fill="#fbbf24" />
                        <text x="0" y="4" fill="black" textAnchor="middle" className="text-[10px] font-bold font-mono">
                          {formatDim(distFeet)}
                        </text>
                      </g>
                    )}

                    {/* Angle Badge */}
                    {points.length >= 2 && angleDeg > 5 && (
                      <g transform={`translate(${pLast.x}, ${pLast.y - 18})`}>
                        <rect x="-24" y="-8" width="48" height="16" rx="3" fill="#475569" stroke="#94a3b8" strokeWidth="0.5" />
                        <text x="0" y="4" fill="white" textAnchor="middle" className="text-[9px] font-semibold">
                          {angleDeg.toFixed(0)}°
                        </text>
                      </g>
                    )}
                  </g>
                );
              })()
            )}

            {/* Individual Anchors/Nodes */}
            {points.map((pt, idx) => {
              const p = toPx(pt.x, pt.y);
              const isFirst = idx === 0;
              const isLast = idx === points.length - 1;
              
              return (
                <g key={idx}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isFirst ? "10" : "8"}
                    fill={isFirst ? "rgba(34, 197, 94, 0.2)" : "rgba(251, 191, 36, 0.2)"}
                    stroke={isFirst ? "#22c55e" : "#fbbf24"}
                    strokeWidth="2"
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill={isFirst ? "#22c55e" : "#fbbf24"}
                  />
                  
                  {/* Tooltip to close loop on first node if 3+ points exist */}
                  {isFirst && points.length >= 3 && (
                    <text x={p.x + 12} y={p.y + 4} fill="#22c55e" className="text-[10px] font-bold drop-shadow-md">
                      Close Loop
                    </text>
                  )}
                  
                  {/* Small node number */}
                  <text x={p.x} y={p.y - 12} fill="#94a3b8" textAnchor="middle" className="text-[9px] font-mono">
                    #{idx + 1}
                  </text>
                </g>
              );
            })}

            {/* Active hover crosshair point */}
            {hoverPoint && (() => {
              const p = toPx(hoverPoint.x, hoverPoint.y);
              // Check if close to first point
              const isCloseToStart = points.length >= 3 && Math.sqrt((hoverPoint.x - points[0].x)**2 + (hoverPoint.y - points[0].y)**2) < 1.1;
              
              return (
                <g>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="6"
                    fill="none"
                    stroke={isCloseToStart ? "#22c55e" : "#fbbf24"}
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="2"
                    fill={isCloseToStart ? "#22c55e" : "#fbbf24"}
                  />
                  <text x={p.x + 10} y={p.y - 10} fill="#94a3b8" className="text-[9px] font-mono">
                    ({hoverPoint.x}', {hoverPoint.y}')
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>
      </div>
    </div>
  );
}
