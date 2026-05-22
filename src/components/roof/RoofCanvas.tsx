import React, { useRef, useEffect, useState } from 'react';
import { RoofConfig } from '../../types/roof';
import { formatRoofArea, getPitchDescription } from '../../utils/roofCalculations';

// Helper: convert dormer horizontalPosition to a percentage along building length
function dormerPositionToPercent(pos: string): number {
  switch (pos) {
    case 'left': return 25;
    case 'right': return 75;
    case 'center':
    default: return 50;
  }
}

interface RoofCanvasProps {
  config: RoofConfig;
  onChange?: (config: RoofConfig) => void;
}

export function RoofCanvas({ config, onChange }: RoofCanvasProps) {
  const topViewRef = useRef<HTMLCanvasElement>(null);
  const frontViewRef = useRef<HTMLCanvasElement>(null);
  const sideViewRef = useRef<HTMLCanvasElement>(null);
  const [view3D, setView3D] = useState(true);
  const [hoveredType, setHoveredType] = useState<string | null>(null);
  const hitBoxesRef = useRef<{type: string, x: number, y: number, w: number, h: number}[]>([]);

  useEffect(() => {
    drawTopView();
    drawFrontElevation();
    drawSideElevation();
  }, [config, view3D, hoveredType]);

  const drawTopView = () => {
    const canvas = topViewRef.current;
    if (!canvas) return;

    hitBoxesRef.current = [];

    const scaleFactor = window.devicePixelRatio || 2;
    const baseWidth = 500;
    const baseHeight = 350;

    // High resolution setup for crispness
    canvas.width = baseWidth * scaleFactor;
    canvas.height = baseHeight * scaleFactor;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scaleFactor, scaleFactor);

    // 1. Draw Diagonal Checkerboard Grass Background
    ctx.save();
    ctx.fillStyle = '#425c27'; // Darker grass
    ctx.fillRect(0, 0, baseWidth, baseHeight);
    
    ctx.translate(baseWidth / 2, baseHeight / 2);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#49652b'; // Lighter grass
    const bgSize = 30;
    for (let i = -30; i < 30; i++) {
      for (let j = -30; j < 30; j++) {
        if ((i + j) % 2 === 0) {
          ctx.fillRect(i * bgSize, j * bgSize, bgSize, bgSize);
        }
      }
    }
    ctx.restore();

    // Helper to format dimensions
    const formatDim = (val: number) => {
      const ft = Math.floor(val);
      const inches = Math.round((val - ft) * 12);
      return `${ft}' ${inches.toString().padStart(2, '0')}"`;
    };

    // Helper for pill badge
    const drawPillBadge = (x: number, y: number, text: string, iconType: 'pencil' | 'height', rotate: boolean = false, type?: string) => {
      ctx.save();
      ctx.translate(x, y);
      if (rotate) ctx.rotate(-Math.PI / 2);

      ctx.font = '600 10px system-ui, sans-serif';
      const textWidth = ctx.measureText(text).width;
      const height = 24;
      const width = textWidth + 30; // padding and icon space
      const iconX = -width / 2 + 10;
      
      // Add to hitboxes if type is provided
      if (type) {
        let hitX = x;
        let hitY = y;
        let hitW = width;
        let hitH = height;
        
        if (rotate) {
          hitW = height;
          hitH = width;
        }
        
        hitBoxesRef.current.push({
          type,
          x: hitX - hitW / 2,
          y: hitY - hitH / 2,
          w: hitW,
          h: hitH
        });
      }

      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;

      // Background
      ctx.fillStyle = type && hoveredType === type ? '#f8fafc' : '#ffffff';
      if (type && hoveredType === type) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = 'transparent';
        ctx.lineWidth = 0;
      }
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(-width / 2, -height / 2, width, height, height / 2);
      } else {
        ctx.rect(-width / 2, -height / 2, width, height);
      }
      ctx.fill();
      if (type && hoveredType === type) {
        ctx.stroke();
      }

      // Reset shadow
      ctx.shadowColor = 'transparent';

      if (iconType === 'pencil') {
        // Icon (pencil)
        ctx.fillStyle = '#64748b';
        ctx.strokeStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(iconX - 2, 4);
        ctx.lineTo(iconX + 4, -2);
        ctx.lineTo(iconX + 6, 0);
        ctx.lineTo(iconX, 6);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(iconX - 2, 4);
        ctx.lineTo(iconX - 4, 6);
        ctx.lineTo(iconX, 6);
        ctx.fill();
      } else {
        // Height I-beam
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(iconX - 3, -4); ctx.lineTo(iconX + 3, -4);
        ctx.moveTo(iconX - 3, 4); ctx.lineTo(iconX + 3, 4);
        ctx.moveTo(iconX, -4); ctx.lineTo(iconX, 4);
        ctx.stroke();
      }

      // Text
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, iconX + 12, 1);

      ctx.restore();
    };

    // Helper for styled dimension lines
    const drawStyledDimLine = (x1: number, y1: number, x2: number, y2: number, text: string, rotate: boolean, type?: string) => {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Arrows
      const drawArrow = (ax: number, ay: number, dirX: number, dirY: number) => {
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(Math.atan2(dirY, dirX));
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-6, -3);
        ctx.lineTo(-6, 3);
        ctx.fill();
        ctx.restore();
      };

      if (!rotate) { // Horizontal
        drawArrow(x1, y1, -1, 0);
        drawArrow(x2, y2, 1, 0);
      } else { // Vertical
        drawArrow(x1, y1, 0, -1);
        drawArrow(x2, y2, 0, 1);
      }

      drawPillBadge((x1 + x2) / 2, (y1 + y2) / 2, text, 'pencil', rotate, type);
    };

    const width = baseWidth;
    const height = baseHeight;
    const padding = 50;

    const roofLength = config.length + (2 * config.rakeOverhang);
    const roofWidth = config.width + (2 * config.eaveOverhang);
    
    // For L-shaped roofs, calculate bounding box including the wing
    let boundingLength = roofLength;
    let boundingWidth = roofWidth;
    if (config.style === 'l-shaped' && config.lShapeConfig) {
      const wingLength = config.lShapeConfig.wingLength + (2 * config.rakeOverhang);
      const wingWidth = config.lShapeConfig.wingWidth + (2 * config.eaveOverhang);
      // Wing extends horizontally from the main section
      boundingLength = roofLength + wingLength;
      // Wing may extend vertically beyond main section
      boundingWidth = Math.max(roofWidth, wingWidth);
    }
    if (config.style === 't-shaped' && config.tShapeConfig) {
      const wL = config.tShapeConfig.wingLength + (2 * config.rakeOverhang);
      const wW = config.tShapeConfig.wingWidth + (2 * config.eaveOverhang);
      const side = config.tShapeConfig.wingSide;
      if (side === 'left' || side === 'right') {
        boundingLength = roofLength + wL;
        boundingWidth = Math.max(roofWidth, wW);
      } else {
        boundingLength = Math.max(roofLength, wL);
        boundingWidth = roofWidth + wW;
      }
    }
    if (config.style === 'u-shaped' && config.uShapeConfig) {
      const wL = config.uShapeConfig.wingLength + (2 * config.rakeOverhang);
      const wW = config.uShapeConfig.wingWidth + (2 * config.eaveOverhang);
      if (config.uShapeConfig.wingSide === 'left-right') {
        boundingLength = roofLength + wL * 2;
        boundingWidth = Math.max(roofWidth, wW);
      } else {
        boundingLength = Math.max(roofLength, wL);
        boundingWidth = roofWidth + wW * 2;
      }
    }
    
    const maxDimension = Math.max(boundingLength, boundingWidth, 1);
    const scale = Math.min((width - 2 * padding) / maxDimension, (height - 2 * padding) / maxDimension);

    const centerX = width / 2;
    const centerY = height / 2;
    const scaledLength = roofLength * scale;
    const scaledWidth = roofWidth * scale;

    // Draw building footprint (lighter)
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(
      centerX - (config.length * scale) / 2,
      centerY - (config.width * scale) / 2,
      config.length * scale,
      config.width * scale
    );
    ctx.setLineDash([]);

    // Draw roof outline
    ctx.fillStyle = view3D ? '#94a3b8' : '#e2e8f0';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;

    const x1 = centerX - scaledLength / 2;
    const y1 = centerY - scaledWidth / 2;
    const x2 = centerX + scaledLength / 2;
    const y2 = centerY + scaledWidth / 2;

    // Draw based on roof style
    switch (config.style) {
      case 'gable':
        // Rectangle with ridge line
        ctx.fillRect(x1, y1, scaledLength, scaledWidth);
        ctx.strokeRect(x1, y1, scaledLength, scaledWidth);
        
        // Ridge line
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x1, centerY);
        ctx.lineTo(x2, centerY);
        ctx.stroke();
        
        // Add shingle texture pattern
        drawShinglePattern(ctx, x1, y1, scaledLength, scaledWidth / 2, config.shingleType);
        drawShinglePattern(ctx, x1, centerY, scaledLength, scaledWidth / 2, config.shingleType);
        break;

      case 'hip':
        // Hip roof - octagonal shape
        const hipOffset = scaledWidth * 0.15;
        ctx.beginPath();
        ctx.moveTo(x1 + hipOffset, y1);
        ctx.lineTo(x2 - hipOffset, y1);
        ctx.lineTo(x2, y1 + hipOffset);
        ctx.lineTo(x2, y2 - hipOffset);
        ctx.lineTo(x2 - hipOffset, y2);
        ctx.lineTo(x1 + hipOffset, y2);
        ctx.lineTo(x1, y2 - hipOffset);
        ctx.lineTo(x1, y1 + hipOffset);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Hip lines
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1 + hipOffset, y1);
        ctx.lineTo(centerX, centerY);
        ctx.moveTo(x2 - hipOffset, y1);
        ctx.lineTo(centerX, centerY);
        ctx.moveTo(x1 + hipOffset, y2);
        ctx.lineTo(centerX, centerY);
        ctx.moveTo(x2 - hipOffset, y2);
        ctx.lineTo(centerX, centerY);
        ctx.stroke();
        
        // Ridge
        ctx.beginPath();
        ctx.moveTo(x1 + hipOffset * 1.5, centerY);
        ctx.lineTo(x2 - hipOffset * 1.5, centerY);
        ctx.stroke();
        break;

      case 'gambrel':
      case 'mansard':
        // Similar to gable but with more complex ridge pattern
        ctx.fillRect(x1, y1, scaledLength, scaledWidth);
        ctx.strokeRect(x1, y1, scaledLength, scaledWidth);
        
        // Multiple ridge lines for gambrel/mansard
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        const offset = scaledWidth * 0.25;
        ctx.beginPath();
        ctx.moveTo(x1, y1 + offset);
        ctx.lineTo(x2, y1 + offset);
        ctx.moveTo(x1, centerY);
        ctx.lineTo(x2, centerY);
        ctx.moveTo(x1, y2 - offset);
        ctx.lineTo(x2, y2 - offset);
        ctx.stroke();
        break;

      case 'shed':
        // Simple rectangle
        ctx.fillRect(x1, y1, scaledLength, scaledWidth);
        ctx.strokeRect(x1, y1, scaledLength, scaledWidth);
        
        // Slope indication
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        break;

      case 'flat':
        ctx.fillRect(x1, y1, scaledLength, scaledWidth);
        ctx.strokeRect(x1, y1, scaledLength, scaledWidth);
        break;

      case 'l-shaped': {
        // Draw L-shaped roof (main section + wing)
        const wing = config.lShapeConfig;
        if (wing) {
          const wingScaledLength = (wing.wingLength + 2 * config.rakeOverhang) * scale;
          const wingScaledWidth = (wing.wingWidth + 2 * config.eaveOverhang) * scale;
          const pos = wing.wingPosition;

          // Calculate wing position relative to main section
          let wingX = 0, wingY = 0;
          if (pos === 'front-right' || pos === 'back-right') {
            wingX = x2; // Wing extends to the right
          } else {
            wingX = x1 - wingScaledLength; // Wing extends to the left
          }
          if (pos === 'front-right' || pos === 'front-left') {
            wingY = y1; // Wing aligns with front (top)
          } else {
            wingY = y2 - wingScaledWidth; // Wing aligns with back (bottom)
          }

          // Draw main section
          ctx.fillStyle = view3D ? '#94a3b8' : '#e2e8f0';
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 3;
          ctx.fillRect(x1, y1, scaledLength, scaledWidth);
          ctx.strokeRect(x1, y1, scaledLength, scaledWidth);

          // Draw wing section
          ctx.fillStyle = view3D ? '#8899ad' : '#dde5ed';
          ctx.fillRect(wingX, wingY, wingScaledLength, wingScaledWidth);
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 3;
          ctx.strokeRect(wingX, wingY, wingScaledLength, wingScaledWidth);

          // Main section ridge line
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x1, centerY);
          ctx.lineTo(x2, centerY);
          ctx.stroke();

          // Wing ridge line
          ctx.lineWidth = 2;
          ctx.beginPath();
          const wingCenterY = wingY + wingScaledWidth / 2;
          ctx.moveTo(wingX, wingCenterY);
          ctx.lineTo(wingX + wingScaledLength, wingCenterY);
          ctx.stroke();

          // Valley lines at intersection
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          if (pos === 'front-right' || pos === 'back-right') {
            ctx.beginPath();
            ctx.moveTo(x2, wingY);
            ctx.lineTo(x2, wingY + wingScaledWidth);
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.moveTo(x1, wingY);
            ctx.lineTo(x1, wingY + wingScaledWidth);
            ctx.stroke();
          }

          // Wing dimension labels (using styled lines)
          const isLeft = pos === 'back-left' || pos === 'front-left';
          const isTop = pos === 'front-left' || pos === 'front-right';
          
          if (isTop) {
            drawStyledDimLine(wingX, wingY - 30, wingX + wingScaledLength, wingY - 30, formatDim(wing.wingLength), false, 'lShapeWingLength');
            if (isLeft) {
              drawStyledDimLine(wingX - 30, wingY, wingX - 30, wingY + wingScaledWidth, formatDim(wing.wingWidth), true, 'lShapeWingWidth');
            } else {
              drawStyledDimLine(wingX + wingScaledLength + 30, wingY, wingX + wingScaledLength + 30, wingY + wingScaledWidth, formatDim(wing.wingWidth), true, 'lShapeWingWidth');
            }
          } else {
            drawStyledDimLine(wingX, wingY + wingScaledWidth + 30, wingX + wingScaledLength, wingY + wingScaledWidth + 30, formatDim(wing.wingLength), false, 'lShapeWingLength');
            if (isLeft) {
              drawStyledDimLine(wingX - 30, wingY, wingX - 30, wingY + wingScaledWidth, formatDim(wing.wingWidth), true, 'lShapeWingWidth');
            } else {
              drawStyledDimLine(wingX + wingScaledLength + 30, wingY, wingX + wingScaledLength + 30, wingY + wingScaledWidth, formatDim(wing.wingWidth), true, 'lShapeWingWidth');
            }
          }

          // Section labels
          ctx.fillStyle = '#475569';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText('Main', (x1 + x2) / 2, centerY - 8);
          ctx.fillText('Wing', wingX + wingScaledLength / 2, wingCenterY - 8);
        } else {
          // Fallback: draw as simple gable
          ctx.fillRect(x1, y1, scaledLength, scaledWidth);
          ctx.strokeRect(x1, y1, scaledLength, scaledWidth);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x1, centerY);
          ctx.lineTo(x2, centerY);
          ctx.stroke();
        }
        break;
      }

      case 't-shaped': {
        const wing = config.tShapeConfig;
        if (wing) {
          const wingScaledLength = (wing.wingLength + 2 * config.rakeOverhang) * scale;
          const wingScaledWidth = (wing.wingWidth + 2 * config.eaveOverhang) * scale;
          const side = wing.wingSide;

          let wingX = 0, wingY = 0;
          if (side === 'right') {
            wingX = x2; wingY = centerY - wingScaledWidth / 2;
          } else if (side === 'left') {
            wingX = x1 - wingScaledLength; wingY = centerY - wingScaledWidth / 2;
          } else if (side === 'front') {
            wingX = (x1 + x2) / 2 - wingScaledLength / 2; wingY = y1 - wingScaledWidth;
          } else {
            wingX = (x1 + x2) / 2 - wingScaledLength / 2; wingY = y2;
          }

          ctx.fillStyle = view3D ? '#94a3b8' : '#e2e8f0';
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 3;
          ctx.fillRect(x1, y1, scaledLength, scaledWidth);
          ctx.strokeRect(x1, y1, scaledLength, scaledWidth);

          ctx.fillStyle = view3D ? '#8899ad' : '#dde5ed';
          ctx.fillRect(wingX, wingY, wingScaledLength, wingScaledWidth);
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 3;
          ctx.strokeRect(wingX, wingY, wingScaledLength, wingScaledWidth);

          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x1, centerY);
          ctx.lineTo(x2, centerY);
          ctx.stroke();

          ctx.lineWidth = 2;
          const wingCX = wingX + wingScaledLength / 2;
          const wingCY = wingY + wingScaledWidth / 2;
          ctx.beginPath();
          if (side === 'left' || side === 'right') {
            ctx.moveTo(wingX, wingCY);
            ctx.lineTo(wingX + wingScaledLength, wingCY);
          } else {
            ctx.moveTo(wingCX, wingY);
            ctx.lineTo(wingCX, wingY + wingScaledWidth);
          }
          ctx.stroke();

          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          if (side === 'right') {
            ctx.beginPath(); ctx.moveTo(x2, wingY); ctx.lineTo(x2, wingY + wingScaledWidth); ctx.stroke();
          } else if (side === 'left') {
            ctx.beginPath(); ctx.moveTo(x1, wingY); ctx.lineTo(x1, wingY + wingScaledWidth); ctx.stroke();
          } else if (side === 'front') {
            ctx.beginPath(); ctx.moveTo(wingX, y1); ctx.lineTo(wingX + wingScaledLength, y1); ctx.stroke();
          } else {
            ctx.beginPath(); ctx.moveTo(wingX, y2); ctx.lineTo(wingX + wingScaledLength, y2); ctx.stroke();
          }

          ctx.fillStyle = '#475569';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Main', (x1 + x2) / 2, centerY - 8);
          
          if (side === 'front') {
            drawStyledDimLine(wingX, wingY - 30, wingX + wingScaledLength, wingY - 30, formatDim(wing.wingLength), false, 'tShapeWingLength');
            drawStyledDimLine(wingX - 30, wingY, wingX - 30, wingY + wingScaledWidth, formatDim(wing.wingWidth), true, 'tShapeWingWidth');
          } else if (side === 'back') {
            drawStyledDimLine(wingX, wingY + wingScaledWidth + 30, wingX + wingScaledLength, wingY + wingScaledWidth + 30, formatDim(wing.wingLength), false, 'tShapeWingLength');
            drawStyledDimLine(wingX - 30, wingY, wingX - 30, wingY + wingScaledWidth, formatDim(wing.wingWidth), true, 'tShapeWingWidth');
          } else if (side === 'left') {
            drawStyledDimLine(wingX, wingY - 30, wingX + wingScaledLength, wingY - 30, formatDim(wing.wingLength), false, 'tShapeWingLength');
            drawStyledDimLine(wingX - 30, wingY, wingX - 30, wingY + wingScaledWidth, formatDim(wing.wingWidth), true, 'tShapeWingWidth');
          } else if (side === 'right') {
            drawStyledDimLine(wingX, wingY - 30, wingX + wingScaledLength, wingY - 30, formatDim(wing.wingLength), false, 'tShapeWingLength');
            drawStyledDimLine(wingX + wingScaledLength + 30, wingY, wingX + wingScaledLength + 30, wingY + wingScaledWidth, formatDim(wing.wingWidth), true, 'tShapeWingWidth');
          }
        }
        break;
      }

      case 'u-shaped': {
        const wing = config.uShapeConfig;
        if (wing) {
          const wingScaledLength = (wing.wingLength + 2 * config.rakeOverhang) * scale;
          const wingScaledWidth = (wing.wingWidth + 2 * config.eaveOverhang) * scale;
          const isLR = wing.wingSide === 'left-right';

          ctx.fillStyle = view3D ? '#94a3b8' : '#e2e8f0';
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 3;
          ctx.fillRect(x1, y1, scaledLength, scaledWidth);
          ctx.strokeRect(x1, y1, scaledLength, scaledWidth);

          const wingsArr = isLR
            ? [{ wx: x1 - wingScaledLength, wy: y1 }, { wx: x2, wy: y1 }]
            : [{ wx: x1, wy: y1 - wingScaledWidth }, { wx: x1, wy: y2 }];

          for (const { wx, wy } of wingsArr) {
            ctx.fillStyle = view3D ? '#8899ad' : '#dde5ed';
            ctx.fillRect(wx, wy, wingScaledLength, wingScaledWidth);
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 3;
            ctx.strokeRect(wx, wy, wingScaledLength, wingScaledWidth);

            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (isLR) {
              ctx.moveTo(wx, wy + wingScaledWidth / 2);
              ctx.lineTo(wx + wingScaledLength, wy + wingScaledWidth / 2);
            } else {
              ctx.moveTo(wx + wingScaledLength / 2, wy);
              ctx.lineTo(wx + wingScaledLength / 2, wy + wingScaledWidth);
            }
            ctx.stroke();
          }

          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x1, centerY);
          ctx.lineTo(x2, centerY);
          ctx.stroke();

          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          if (isLR) {
            ctx.beginPath(); ctx.moveTo(x1, wingsArr[0].wy); ctx.lineTo(x1, wingsArr[0].wy + wingScaledWidth); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x2, wingsArr[1].wy); ctx.lineTo(x2, wingsArr[1].wy + wingScaledWidth); ctx.stroke();
          } else {
            ctx.beginPath(); ctx.moveTo(wingsArr[0].wx, y1); ctx.lineTo(wingsArr[0].wx + wingScaledLength, y1); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(wingsArr[1].wx, y2); ctx.lineTo(wingsArr[1].wx + wingScaledLength, y2); ctx.stroke();
          }

          ctx.fillStyle = '#475569';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Main', (x1 + x2) / 2, centerY - 8);

          // Add dimensions for wings
          if (isLR) {
            // Left wing
            drawStyledDimLine(wingsArr[0].wx, wingsArr[0].wy - 30, wingsArr[0].wx + wingScaledLength, wingsArr[0].wy - 30, formatDim(wing.wingLength), false, 'uShapeWingLength');
            drawStyledDimLine(wingsArr[0].wx - 30, wingsArr[0].wy, wingsArr[0].wx - 30, wingsArr[0].wy + wingScaledWidth, formatDim(wing.wingWidth), true, 'uShapeWingWidth');
            // Right wing
            drawStyledDimLine(wingsArr[1].wx, wingsArr[1].wy - 30, wingsArr[1].wx + wingScaledLength, wingsArr[1].wy - 30, formatDim(wing.wingLength), false, 'uShapeWingLength');
            drawStyledDimLine(wingsArr[1].wx + wingScaledLength + 30, wingsArr[1].wy, wingsArr[1].wx + wingScaledLength + 30, wingsArr[1].wy + wingScaledWidth, formatDim(wing.wingWidth), true, 'uShapeWingWidth');
          } else {
            // Top wing
            drawStyledDimLine(wingsArr[0].wx - 30, wingsArr[0].wy, wingsArr[0].wx - 30, wingsArr[0].wy + wingScaledWidth, formatDim(wing.wingWidth), true, 'uShapeWingWidth');
            drawStyledDimLine(wingsArr[0].wx, wingsArr[0].wy - 30, wingsArr[0].wx + wingScaledLength, wingsArr[0].wy - 30, formatDim(wing.wingLength), false, 'uShapeWingLength');
            // Bottom wing
            drawStyledDimLine(wingsArr[1].wx - 30, wingsArr[1].wy, wingsArr[1].wx - 30, wingsArr[1].wy + wingScaledWidth, formatDim(wing.wingWidth), true, 'uShapeWingWidth');
            drawStyledDimLine(wingsArr[1].wx, wingsArr[1].wy + wingScaledWidth + 30, wingsArr[1].wx + wingScaledLength, wingsArr[1].wy + wingScaledWidth + 30, formatDim(wing.wingLength), false, 'uShapeWingLength');
          }
        }
        break;
      }
    }

    // Draw valleys if present
    if (config.hasValleys && config.valleyCount) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      for (let i = 0; i < config.valleyCount; i++) {
        const valleyX = x1 + (scaledLength / (config.valleyCount + 1)) * (i + 1);
        ctx.beginPath();
        ctx.moveTo(valleyX, y1);
        ctx.lineTo(valleyX, y2);
        ctx.stroke();
      }
    }

    // Draw chimneys
    if (config.hasChimney && config.chimneyCount) {
      for (let i = 0; i < config.chimneyCount; i++) {
        const chimneyX = x1 + (scaledLength / (config.chimneyCount + 1)) * (i + 1);
        const chimneyY = centerY;
        drawChimney(ctx, chimneyX, chimneyY, scale * 2);
      }
    }

    // Draw skylights
    if (config.hasSkylight && config.skylightCount) {
      for (let i = 0; i < config.skylightCount; i++) {
        const skylightX = x1 + 30 + (i * 40);
        const skylightY = centerY - 20;
        drawSkylight(ctx, skylightX, skylightY, scale * 2);
      }
    }

    // Draw dormers (top view)
    if (config.hasDormers && config.dormers && config.dormers.length > 0) {
      for (const dormer of config.dormers) {
        const dormerWidth = dormer.width * scale;
        const dormerDepth = dormer.depth * scale;
        const posAlongLength = x1 + (scaledLength * dormerPositionToPercent(dormer.horizontalPosition) / 100);
        const dormerX = posAlongLength - dormerWidth / 2;

        // Position dormer on front or back slope
        let dormerY: number;
        if (dormer.side === 'front') {
          dormerY = y1 + scaledWidth * 0.1; // near top of front slope
        } else {
          dormerY = y2 - scaledWidth * 0.1 - dormerDepth; // near top of back slope
        }

        // Draw dormer outline
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(124, 58, 237, 0.08)';
        ctx.fillRect(dormerX, dormerY, dormerWidth, dormerDepth);
        ctx.strokeRect(dormerX, dormerY, dormerWidth, dormerDepth);

        // Draw dormer ridge based on style
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        if (dormer.style === 'gable') {
          ctx.beginPath();
          ctx.moveTo(dormerX, dormerY + dormerDepth / 2);
          ctx.lineTo(dormerX + dormerWidth, dormerY + dormerDepth / 2);
          ctx.stroke();
        } else if (dormer.style === 'hip') {
          ctx.beginPath();
          ctx.moveTo(dormerX + dormerWidth * 0.2, dormerY + dormerDepth / 2);
          ctx.lineTo(dormerX + dormerWidth * 0.8, dormerY + dormerDepth / 2);
          ctx.stroke();
          // Hip lines
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(dormerX, dormerY);
          ctx.lineTo(dormerX + dormerWidth * 0.2, dormerY + dormerDepth / 2);
          ctx.moveTo(dormerX + dormerWidth, dormerY);
          ctx.lineTo(dormerX + dormerWidth * 0.8, dormerY + dormerDepth / 2);
          ctx.stroke();
        } else if (dormer.style === 'shed') {
          // Slope indicator
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(dormerX, dormerY);
          ctx.lineTo(dormerX + dormerWidth, dormerY + dormerDepth);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (dormer.style === 'eyebrow') {
          // Curved line
          ctx.beginPath();
          ctx.moveTo(dormerX, dormerY + dormerDepth);
          ctx.quadraticCurveTo(dormerX + dormerWidth / 2, dormerY - dormerDepth * 0.3, dormerX + dormerWidth, dormerY + dormerDepth);
          ctx.stroke();
        }

        // Draw window if present
        if (dormer.hasWindow) {
          const winW = dormerWidth * 0.5;
          const winH = dormerDepth * 0.4;
          const winX = dormerX + (dormerWidth - winW) / 2;
          const winY = dormerY + (dormerDepth - winH) / 2;
          ctx.fillStyle = '#bfdbfe';
          ctx.strokeStyle = '#1e40af';
          ctx.lineWidth = 1;
          ctx.fillRect(winX, winY, winW, winH);
          ctx.strokeRect(winX, winY, winW, winH);
        }

        // Label
        ctx.fillStyle = '#7c3aed';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${dormer.style}`, posAlongLength, dormerY - 3);
      }
    }

    // Draw dimensions
    // Length dimension
    drawStyledDimLine(x1, y2 + 30, x2, y2 + 30, formatDim(roofLength), false, 'length');
    
    // Width dimension
    drawStyledDimLine(x1 - 30, y1, x1 - 30, y2, formatDim(roofWidth), true, 'width');

    // Overhang annotations
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#059669';
    if (config.eaveOverhang > 0) {
      ctx.fillText(`${config.eaveOverhang}' overhang`, centerX, y1 - 10);
    }

    // Add compass rose
    drawCompassRose(ctx, x2 + 30, y1 + 30);

    // Legend
    ctx.textAlign = 'left';
    ctx.font = '11px sans-serif';
    let legendY = y2 + 60;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(padding, legendY, 15, 3);
    ctx.fillStyle = '#1e293b';
    ctx.fillText('Ridge', padding + 20, legendY + 5);
    
    if (config.hasValleys) {
      legendY += 20;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(padding, legendY, 15, 3);
      ctx.fillStyle = '#1e293b';
      ctx.fillText('Valley', padding + 20, legendY + 5);
    }
    if (config.hasDormers && (config.dormers || []).length > 0) {
      legendY += 20;
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(padding, legendY, 15, 3);
      ctx.fillStyle = '#1e293b';
      ctx.fillText('Dormer', padding + 20, legendY + 5);
    }
  };

  const drawFrontElevation = () => {
    const canvas = frontViewRef.current;
    if (!canvas) return;

    const scaleFactor = window.devicePixelRatio || 2;
    const baseWidth = 350;
    const baseHeight = 250;

    canvas.width = baseWidth * scaleFactor;
    canvas.height = baseHeight * scaleFactor;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scaleFactor, scaleFactor);

    // Grid Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, baseWidth, baseHeight);
    
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let i = 0; i < baseWidth; i += 25) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, baseHeight); ctx.stroke();
    }
    for (let i = 0; i < baseHeight; i += 25) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(baseWidth, i); ctx.stroke();
    }

    const width = baseWidth;
    const height = baseHeight;
    const padding = 40;

    const roofLength = config.length + (2 * config.rakeOverhang);
    const roofWidth = config.width + (2 * config.eaveOverhang);
    const pitchStr = config.pitch || '6/12';
    const [rise, run] = pitchStr.split('/').map(Number);
    
    // For multi-section roofs, account for the wing in the front elevation scale
    let totalFrontWidth = roofLength;
    if (config.style === 'l-shaped' && config.lShapeConfig) {
      totalFrontWidth = roofLength + config.lShapeConfig.wingLength + (2 * config.rakeOverhang);
    } else if (config.style === 't-shaped' && config.tShapeConfig) {
      const side = config.tShapeConfig.wingSide;
      if (side === 'left' || side === 'right') {
        totalFrontWidth = roofLength + config.tShapeConfig.wingLength + (2 * config.rakeOverhang);
      }
    } else if (config.style === 'u-shaped' && config.uShapeConfig) {
      if (config.uShapeConfig.wingSide === 'left-right') {
        totalFrontWidth = roofLength + (config.uShapeConfig.wingLength + (2 * config.rakeOverhang)) * 2;
      }
    }
    const scale = Math.min((width - 2 * padding) / Math.max(totalFrontWidth, 1), (height - 2 * padding) / 20);

    const centerX = width / 2;
    const baseY = height - padding - 20;
    const scaledLength = roofLength * scale;
    const ridgeHeight = (roofWidth / 2) * (rise / run) * scale;

    // Draw building
    const buildingHeight = 10 * scale;
    ctx.fillStyle = '#f1f5f9';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.fillRect(centerX - scaledLength / 2, baseY - buildingHeight, scaledLength, buildingHeight);
    ctx.strokeRect(centerX - scaledLength / 2, baseY - buildingHeight, scaledLength, buildingHeight);

    // Draw based on roof style
    switch (config.style) {
      case 'gable':
        // Triangle roof
        ctx.fillStyle = createRoofGradient(ctx, centerX, baseY - buildingHeight - ridgeHeight, ridgeHeight);
        ctx.beginPath();
        ctx.moveTo(centerX - scaledLength / 2, baseY - buildingHeight);
        ctx.lineTo(centerX, baseY - buildingHeight - ridgeHeight);
        ctx.lineTo(centerX + scaledLength / 2, baseY - buildingHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Add shingle texture
        drawShingleTextureElevation(ctx, centerX - scaledLength / 2, baseY - buildingHeight, scaledLength / 2, ridgeHeight, config.shingleType, 'left');
        drawShingleTextureElevation(ctx, centerX, baseY - buildingHeight, scaledLength / 2, ridgeHeight, config.shingleType, 'right');

        // Ridge vent
        if (config.style !== 'flat') {
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(centerX - 10, baseY - buildingHeight - ridgeHeight);
          ctx.lineTo(centerX + 10, baseY - buildingHeight - ridgeHeight);
          ctx.stroke();
        }
        break;

      case 'hip':
        // Similar to gable but shorter ridge
        const hipRidge = scaledLength * 0.3;
        ctx.fillStyle = createRoofGradient(ctx, centerX, baseY - buildingHeight - ridgeHeight, ridgeHeight);
        ctx.beginPath();
        ctx.moveTo(centerX - scaledLength / 2, baseY - buildingHeight);
        ctx.lineTo(centerX - hipRidge / 2, baseY - buildingHeight - ridgeHeight);
        ctx.lineTo(centerX + hipRidge / 2, baseY - buildingHeight - ridgeHeight);
        ctx.lineTo(centerX + scaledLength / 2, baseY - buildingHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'gambrel':
        // Barn style - two slopes
        const breakPoint = ridgeHeight * 0.6;
        const breakWidth = scaledLength * 0.3;
        ctx.fillStyle = createRoofGradient(ctx, centerX, baseY - buildingHeight - ridgeHeight, ridgeHeight);
        ctx.beginPath();
        ctx.moveTo(centerX - scaledLength / 2, baseY - buildingHeight);
        ctx.lineTo(centerX - breakWidth, baseY - buildingHeight - breakPoint);
        ctx.lineTo(centerX, baseY - buildingHeight - ridgeHeight);
        ctx.lineTo(centerX + breakWidth, baseY - buildingHeight - breakPoint);
        ctx.lineTo(centerX + scaledLength / 2, baseY - buildingHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'shed':
        // Single slope
        const shedSlope = ridgeHeight * 0.8;
        ctx.fillStyle = createRoofGradient(ctx, centerX, baseY - buildingHeight - shedSlope, shedSlope);
        ctx.beginPath();
        ctx.moveTo(centerX - scaledLength / 2, baseY - buildingHeight);
        ctx.lineTo(centerX - scaledLength / 2, baseY - buildingHeight - shedSlope);
        ctx.lineTo(centerX + scaledLength / 2, baseY - buildingHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'mansard':
        // French style
        const mansardLower = ridgeHeight * 0.5;
        const mansardUpper = ridgeHeight * 0.3;
        ctx.fillStyle = createRoofGradient(ctx, centerX, baseY - buildingHeight - mansardLower - mansardUpper, mansardLower);
        ctx.beginPath();
        ctx.moveTo(centerX - scaledLength / 2, baseY - buildingHeight);
        ctx.lineTo(centerX - scaledLength / 2 + 30, baseY - buildingHeight - mansardLower);
        ctx.lineTo(centerX - scaledLength / 4, baseY - buildingHeight - mansardLower - mansardUpper);
        ctx.lineTo(centerX + scaledLength / 4, baseY - buildingHeight - mansardLower - mansardUpper);
        ctx.lineTo(centerX + scaledLength / 2 - 30, baseY - buildingHeight - mansardLower);
        ctx.lineTo(centerX + scaledLength / 2, baseY - buildingHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'flat':
        // Flat with slight slope
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(centerX - scaledLength / 2, baseY - buildingHeight - 5, scaledLength, 5);
        ctx.strokeRect(centerX - scaledLength / 2, baseY - buildingHeight - 5, scaledLength, 5);
        break;

      case 'l-shaped': {
        // Front elevation of L-shaped roof: show main gable + wing behind/beside
        ctx.fillStyle = createRoofGradient(ctx, centerX, baseY - buildingHeight - ridgeHeight, ridgeHeight);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;

        // Main section gable
        ctx.beginPath();
        ctx.moveTo(centerX - scaledLength / 2, baseY - buildingHeight);
        ctx.lineTo(centerX, baseY - buildingHeight - ridgeHeight);
        ctx.lineTo(centerX + scaledLength / 2, baseY - buildingHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Wing section (drawn as smaller gable offset to the side)
        if (config.lShapeConfig) {
          const wing = config.lShapeConfig;
          const wingScaledLength = (wing.wingLength + 2 * config.rakeOverhang) * scale;
          const wingRidgeHeight = ((wing.wingWidth + 2 * config.eaveOverhang) / 2) * (rise / run) * scale;
          const pos = wing.wingPosition;
          const isRight = pos === 'front-right' || pos === 'back-right';

          ctx.fillStyle = createRoofGradient(ctx, centerX, baseY - buildingHeight - wingRidgeHeight, wingRidgeHeight);
          ctx.globalAlpha = 0.7;

          const wingStartX = isRight ? centerX + scaledLength / 2 : centerX - scaledLength / 2 - wingScaledLength;
          const wingEndX = isRight ? centerX + scaledLength / 2 + wingScaledLength : centerX - scaledLength / 2;
          const wingCenterX = (wingStartX + wingEndX) / 2;

          // Wing building wall
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(wingStartX, baseY - buildingHeight, wingScaledLength, buildingHeight);
          ctx.strokeRect(wingStartX, baseY - buildingHeight, wingScaledLength, buildingHeight);

          // Wing gable roof
          ctx.fillStyle = createRoofGradient(ctx, wingCenterX, baseY - buildingHeight - wingRidgeHeight, wingRidgeHeight);
          ctx.beginPath();
          ctx.moveTo(wingStartX, baseY - buildingHeight);
          ctx.lineTo(wingCenterX, baseY - buildingHeight - wingRidgeHeight);
          ctx.lineTo(wingEndX, baseY - buildingHeight);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.globalAlpha = 1.0;

          // Label
          ctx.fillStyle = '#475569';
          ctx.font = '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Wing', wingCenterX, baseY - buildingHeight - wingRidgeHeight - 5);
        }

        // Ridge vent on main
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(centerX - 10, baseY - buildingHeight - ridgeHeight);
        ctx.lineTo(centerX + 10, baseY - buildingHeight - ridgeHeight);
        ctx.stroke();
        break;
      }

      case 't-shaped': {
        // Front elevation: main gable + wing offset to side (if left/right) or behind (if front/back)
        ctx.fillStyle = createRoofGradient(ctx, centerX, baseY - buildingHeight - ridgeHeight, ridgeHeight);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - scaledLength / 2, baseY - buildingHeight);
        ctx.lineTo(centerX, baseY - buildingHeight - ridgeHeight);
        ctx.lineTo(centerX + scaledLength / 2, baseY - buildingHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (config.tShapeConfig) {
          const wing = config.tShapeConfig;
          const wingScaledLength = (wing.wingLength + 2 * config.rakeOverhang) * scale;
          const wingRidgeHeight = ((wing.wingWidth + 2 * config.eaveOverhang) / 2) * (rise / run) * scale;
          const isLR = wing.wingSide === 'left' || wing.wingSide === 'right';

          if (isLR) {
            ctx.globalAlpha = 0.7;
            const wingStartX = wing.wingSide === 'right'
              ? centerX + scaledLength / 2
              : centerX - scaledLength / 2 - wingScaledLength;
            const wingEndX = wingStartX + wingScaledLength;
            const wingCX = (wingStartX + wingEndX) / 2;

            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(wingStartX, baseY - buildingHeight, wingScaledLength, buildingHeight);
            ctx.strokeRect(wingStartX, baseY - buildingHeight, wingScaledLength, buildingHeight);

            ctx.fillStyle = createRoofGradient(ctx, wingCX, baseY - buildingHeight - wingRidgeHeight, wingRidgeHeight);
            ctx.beginPath();
            ctx.moveTo(wingStartX, baseY - buildingHeight);
            ctx.lineTo(wingCX, baseY - buildingHeight - wingRidgeHeight);
            ctx.lineTo(wingEndX, baseY - buildingHeight);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            ctx.fillStyle = '#475569';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Wing', wingCX, baseY - buildingHeight - wingRidgeHeight - 5);
          }
        }

        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(centerX - 10, baseY - buildingHeight - ridgeHeight);
        ctx.lineTo(centerX + 10, baseY - buildingHeight - ridgeHeight);
        ctx.stroke();
        break;
      }

      case 'u-shaped': {
        // Front elevation: main gable + two wing gables on sides
        ctx.fillStyle = createRoofGradient(ctx, centerX, baseY - buildingHeight - ridgeHeight, ridgeHeight);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - scaledLength / 2, baseY - buildingHeight);
        ctx.lineTo(centerX, baseY - buildingHeight - ridgeHeight);
        ctx.lineTo(centerX + scaledLength / 2, baseY - buildingHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (config.uShapeConfig && config.uShapeConfig.wingSide === 'left-right') {
          const wing = config.uShapeConfig;
          const wingScaledLength = (wing.wingLength + 2 * config.rakeOverhang) * scale;
          const wingRidgeHeight = ((wing.wingWidth + 2 * config.eaveOverhang) / 2) * (rise / run) * scale;

          ctx.globalAlpha = 0.7;
          for (const side of ['left', 'right'] as const) {
            const wingStartX = side === 'right'
              ? centerX + scaledLength / 2
              : centerX - scaledLength / 2 - wingScaledLength;
            const wingEndX = wingStartX + wingScaledLength;
            const wingCX = (wingStartX + wingEndX) / 2;

            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(wingStartX, baseY - buildingHeight, wingScaledLength, buildingHeight);
            ctx.strokeRect(wingStartX, baseY - buildingHeight, wingScaledLength, buildingHeight);

            ctx.fillStyle = createRoofGradient(ctx, wingCX, baseY - buildingHeight - wingRidgeHeight, wingRidgeHeight);
            ctx.beginPath();
            ctx.moveTo(wingStartX, baseY - buildingHeight);
            ctx.lineTo(wingCX, baseY - buildingHeight - wingRidgeHeight);
            ctx.lineTo(wingEndX, baseY - buildingHeight);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#475569';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Wing', wingCX, baseY - buildingHeight - wingRidgeHeight - 5);
          }
          ctx.globalAlpha = 1.0;
        }

        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(centerX - 10, baseY - buildingHeight - ridgeHeight);
        ctx.lineTo(centerX + 10, baseY - buildingHeight - ridgeHeight);
        ctx.stroke();
        break;
      }
    }

    // Draw chimney if present
    if (config.hasChimney) {
      const chimneyX = centerX + scaledLength * 0.2;
      const chimneyTop = baseY - buildingHeight - ridgeHeight - 20;
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(chimneyX - 8, chimneyTop, 16, ridgeHeight + 40);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.strokeRect(chimneyX - 8, chimneyTop, 16, ridgeHeight + 40);
      
      // Chimney cap
      ctx.fillStyle = '#451a03';
      ctx.fillRect(chimneyX - 12, chimneyTop - 5, 24, 5);
      ctx.strokeRect(chimneyX - 12, chimneyTop - 5, 24, 5);
    }

    // Draw dormers on front elevation
    if (config.hasDormers && config.dormers && config.dormers.length > 0) {
      const frontDormers = config.dormers.filter(d => d.side === 'front');
      for (const dormer of frontDormers) {
        const dw = dormer.width * scale;
        const dh = dormer.height * scale * 0.6;
        const posX = centerX - scaledLength / 2 + (scaledLength * dormerPositionToPercent(dormer.horizontalPosition) / 100);
        // Position dormer partway up the roof slope
        const slopeProgress = 0.4;
        const dormerBaseY = baseY - buildingHeight - ridgeHeight * slopeProgress;
        const dormerLeft = posX - dw / 2;

        // Dormer front wall
        ctx.fillStyle = '#f0ead6';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.fillRect(dormerLeft, dormerBaseY - dh, dw, dh);
        ctx.strokeRect(dormerLeft, dormerBaseY - dh, dw, dh);

        // Dormer roof based on style
        ctx.fillStyle = '#6b5b4f';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;

        if (dormer.style === 'gable') {
          const dormerRidgeH = dh * 0.5;
          ctx.beginPath();
          ctx.moveTo(dormerLeft - 3, dormerBaseY - dh);
          ctx.lineTo(posX, dormerBaseY - dh - dormerRidgeH);
          ctx.lineTo(dormerLeft + dw + 3, dormerBaseY - dh);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (dormer.style === 'shed') {
          const shedH = dh * 0.3;
          ctx.beginPath();
          ctx.moveTo(dormerLeft - 3, dormerBaseY - dh - shedH);
          ctx.lineTo(dormerLeft + dw + 3, dormerBaseY - dh);
          ctx.lineTo(dormerLeft + dw + 3, dormerBaseY - dh);
          ctx.lineTo(dormerLeft - 3, dormerBaseY - dh);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (dormer.style === 'hip') {
          const hipH = dh * 0.45;
          ctx.beginPath();
          ctx.moveTo(dormerLeft - 3, dormerBaseY - dh);
          ctx.lineTo(dormerLeft + dw * 0.3, dormerBaseY - dh - hipH);
          ctx.lineTo(dormerLeft + dw * 0.7, dormerBaseY - dh - hipH);
          ctx.lineTo(dormerLeft + dw + 3, dormerBaseY - dh);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (dormer.style === 'eyebrow') {
          ctx.beginPath();
          ctx.moveTo(dormerLeft - 3, dormerBaseY - dh);
          ctx.quadraticCurveTo(posX, dormerBaseY - dh - dh * 0.6, dormerLeft + dw + 3, dormerBaseY - dh);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (dormer.style === 'flat') {
          ctx.fillRect(dormerLeft - 3, dormerBaseY - dh - 3, dw + 6, 4);
          ctx.strokeRect(dormerLeft - 3, dormerBaseY - dh - 3, dw + 6, 4);
        }

        // Window
        if (dormer.hasWindow) {
          const winW = dw * 0.55;
          const winH = dh * 0.6;
          const winX = dormerLeft + (dw - winW) / 2;
          const winY = dormerBaseY - dh + (dh - winH) * 0.4;
          ctx.fillStyle = '#bfdbfe';
          ctx.strokeStyle = '#1e40af';
          ctx.lineWidth = 1;
          ctx.fillRect(winX, winY, winW, winH);
          ctx.strokeRect(winX, winY, winW, winH);
          // Window pane divider
          ctx.beginPath();
          ctx.moveTo(winX + winW / 2, winY);
          ctx.lineTo(winX + winW / 2, winY + winH);
          ctx.stroke();
        }
      }
    }

    // Draw pitch angle indicator
    if (config.style !== 'flat') {
      const angle = Math.atan(rise / run) * (180 / Math.PI);
      const indicatorX = centerX + scaledLength / 4;
      const indicatorY = baseY - buildingHeight - ridgeHeight / 2;
      
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(centerX + scaledLength / 2, baseY - buildingHeight, ridgeHeight, -Math.PI, -Math.PI + Math.atan(rise / run), false);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${angle.toFixed(1)}°`, indicatorX, indicatorY);
    }

    // Dimension labels
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${roofLength.toFixed(1)}'`, centerX, baseY + 15);
    
    if (ridgeHeight > 0) {
      ctx.save();
      ctx.translate(centerX - scaledLength / 2 - 25, baseY - buildingHeight - ridgeHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${(ridgeHeight / scale).toFixed(1)}' rise`, 0, 0);
      ctx.restore();
    }
  };

  const drawSideElevation = () => {
    const canvas = sideViewRef.current;
    if (!canvas) return;

    const scaleFactor = window.devicePixelRatio || 2;
    const baseWidth = 350;
    const baseHeight = 250;

    canvas.width = baseWidth * scaleFactor;
    canvas.height = baseHeight * scaleFactor;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scaleFactor, scaleFactor);

    // Grid Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, baseWidth, baseHeight);
    
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let i = 0; i < baseWidth; i += 25) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, baseHeight); ctx.stroke();
    }
    for (let i = 0; i < baseHeight; i += 25) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(baseWidth, i); ctx.stroke();
    }

    const width = baseWidth;
    const height = baseHeight;
    const padding = 40;

    const roofWidth = config.width + (2 * config.eaveOverhang);
    const pitchStr = config.pitch || '6/12';
    const [rise, run] = pitchStr.split('/').map(Number);
    const scale = Math.min((width - 2 * padding) / Math.max(roofWidth, 1), (height - 2 * padding) / 20);

    const centerX = width / 2;
    const baseY = height - padding - 20;
    const scaledWidth = roofWidth * scale;
    const ridgeHeight = (roofWidth / 2) * (rise / run) * scale;

    // Draw building
    const buildingHeight = 10 * scale;
    ctx.fillStyle = '#f1f5f9';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.fillRect(centerX - scaledWidth / 2, baseY - buildingHeight, scaledWidth, buildingHeight);
    ctx.strokeRect(centerX - scaledWidth / 2, baseY - buildingHeight, scaledWidth, buildingHeight);

    // Draw roof based on style
    if (config.style === 'shed') {
      // Single slope
      ctx.fillStyle = createRoofGradient(ctx, centerX, baseY - buildingHeight - ridgeHeight * 0.8, ridgeHeight * 0.8);
      ctx.beginPath();
      ctx.moveTo(centerX - scaledWidth / 2, baseY - buildingHeight);
      ctx.lineTo(centerX - scaledWidth / 2, baseY - buildingHeight - ridgeHeight * 0.8);
      ctx.lineTo(centerX + scaledWidth / 2, baseY - buildingHeight);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (config.style === 'flat') {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(centerX - scaledWidth / 2, baseY - buildingHeight - 5, scaledWidth, 5);
      ctx.strokeRect(centerX - scaledWidth / 2, baseY - buildingHeight - 5, scaledWidth, 5);
    } else {
      // Gable end view - triangle
      ctx.fillStyle = createRoofGradient(ctx, centerX, baseY - buildingHeight - ridgeHeight, ridgeHeight);
      ctx.beginPath();
      ctx.moveTo(centerX - scaledWidth / 2, baseY - buildingHeight);
      ctx.lineTo(centerX, baseY - buildingHeight - ridgeHeight);
      ctx.lineTo(centerX + scaledWidth / 2, baseY - buildingHeight);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gable vent
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const ventSize = 15;
      ctx.fillRect(centerX - ventSize / 2, baseY - buildingHeight - ridgeHeight / 2 - ventSize / 2, ventSize, ventSize);
      ctx.strokeRect(centerX - ventSize / 2, baseY - buildingHeight - ridgeHeight / 2 - ventSize / 2, ventSize, ventSize);
      
      // Vent slats
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const slotY = baseY - buildingHeight - ridgeHeight / 2 - ventSize / 2 + (i * 4) + 2;
        ctx.moveTo(centerX - ventSize / 2 + 2, slotY);
        ctx.lineTo(centerX + ventSize / 2 - 2, slotY);
      }
      ctx.stroke();
    }

    // Draw dormers on side elevation (visible as projections from the slope)
    if (config.hasDormers && config.dormers && config.dormers.length > 0) {
      for (const dormer of config.dormers) {
        const dw = dormer.depth * scale; // In side view, dormer depth is the visible width
        const dh = dormer.height * scale * 0.5;
        // Position partway up the slope
        const slopeProgress = 0.4;
        const dormerBaseY = baseY - buildingHeight - ridgeHeight * slopeProgress;
        // Offset from center based on slope side
        const slopeX = dormer.side === 'front'
          ? centerX - scaledWidth * 0.2
          : centerX + scaledWidth * 0.2;
        const dormerLeft = slopeX - dw / 2;

        // Dormer wall
        ctx.fillStyle = '#f0ead6';
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 1.5;
        ctx.fillRect(dormerLeft, dormerBaseY - dh, dw, dh);
        ctx.strokeRect(dormerLeft, dormerBaseY - dh, dw, dh);

        // Dormer roof (small shed-like cap)
        ctx.fillStyle = '#6b5b4f';
        ctx.beginPath();
        ctx.moveTo(dormerLeft - 2, dormerBaseY - dh - 2);
        ctx.lineTo(dormerLeft + dw + 2, dormerBaseY - dh - 2);
        ctx.lineTo(dormerLeft + dw + 2, dormerBaseY - dh);
        ctx.lineTo(dormerLeft - 2, dormerBaseY - dh);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Window
        if (dormer.hasWindow) {
          const winW = dw * 0.5;
          const winH = dh * 0.55;
          const winX = dormerLeft + (dw - winW) / 2;
          const winY = dormerBaseY - dh + (dh - winH) * 0.45;
          ctx.fillStyle = '#bfdbfe';
          ctx.strokeStyle = '#1e40af';
          ctx.lineWidth = 1;
          ctx.fillRect(winX, winY, winW, winH);
          ctx.strokeRect(winX, winY, winW, winH);
        }

        // Label
        ctx.fillStyle = '#7c3aed';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(dormer.style, slopeX, dormerBaseY - dh - 6);
      }
    }

    // Overhang detail
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    
    // Eave overhang indicators
    const overhangScale = config.eaveOverhang * scale;
    ctx.beginPath();
    ctx.moveTo(centerX - scaledWidth / 2, baseY - buildingHeight);
    ctx.lineTo(centerX - scaledWidth / 2, baseY - buildingHeight + 15);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(centerX - scaledWidth / 2 + overhangScale, baseY - buildingHeight);
    ctx.lineTo(centerX - scaledWidth / 2 + overhangScale, baseY - buildingHeight + 15);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dimension
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${roofWidth.toFixed(1)}'`, centerX, baseY + 15);
    
    if (config.eaveOverhang > 0) {
      ctx.fillStyle = '#059669';
      ctx.fillText(`${config.eaveOverhang}' overhang`, centerX - scaledWidth / 2 + overhangScale / 2, baseY - buildingHeight + 30);
    }
  };

  // Helper function to create roof gradient
  const createRoofGradient = (ctx: CanvasRenderingContext2D, x: number, y: number, height: number) => {
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    
    switch (config.shingleType) {
      case 'architectural':
        gradient.addColorStop(0, '#7f8ea3');
        gradient.addColorStop(0.2, '#64748b');
        gradient.addColorStop(0.6, '#475569');
        gradient.addColorStop(1, '#334155');
        break;
      case '3-tab':
        gradient.addColorStop(0, '#9c8d81');
        gradient.addColorStop(0.3, '#78716c');
        gradient.addColorStop(0.7, '#57534e');
        gradient.addColorStop(1, '#44403c');
        break;
      case 'designer':
        gradient.addColorStop(0, '#475569');
        gradient.addColorStop(0.3, '#334155');
        gradient.addColorStop(0.7, '#1e293b');
        gradient.addColorStop(1, '#0f172a');
        break;
      case 'metal':
        gradient.addColorStop(0, '#cbd5e1');
        gradient.addColorStop(0.25, '#94a3b8');
        gradient.addColorStop(0.5, '#cbd5e1');
        gradient.addColorStop(0.75, '#94a3b8');
        gradient.addColorStop(1, '#64748b');
        break;
      case 'cedar-shake':
        gradient.addColorStop(0, '#b45309');
        gradient.addColorStop(0.3, '#92400e');
        gradient.addColorStop(0.7, '#78350f');
        gradient.addColorStop(1, '#57270a');
        break;
      default:
        gradient.addColorStop(0, '#7f8ea3');
        gradient.addColorStop(0.3, '#64748b');
        gradient.addColorStop(0.7, '#475569');
        gradient.addColorStop(1, '#334155');
    }
    
    return gradient;
  };

  // Helper function to draw shingle pattern
  const drawShinglePattern = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, type: string) => {
    if (type === 'metal') {
      // Vertical metal panels with shadows
      const panelWidth = 20;
      for (let i = x; i < x + w; i += panelWidth) {
        // Panel highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(i, y);
        ctx.lineTo(i, y + h);
        ctx.stroke();
        
        // Panel shadow
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(i + panelWidth - 2, y);
        ctx.lineTo(i + panelWidth - 2, y + h);
        ctx.stroke();
      }
    } else if (type === 'cedar-shake') {
      // Cedar shake texture with variation
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 1;
      const rowHeight = 6;
      for (let row = y; row < y + h; row += rowHeight) {
        const offset = ((row - y) / rowHeight) % 2 === 0 ? 0 : rowHeight * 0.5;
        for (let i = x + offset; i < x + w; i += rowHeight * 2) {
          ctx.beginPath();
          ctx.moveTo(i, row);
          ctx.lineTo(i, row + rowHeight);
          ctx.stroke();
        }
      }
    } else {
      // Asphalt shingle rows with depth
      const rowHeight = 8;
      for (let i = y; i < y + h; i += rowHeight) {
        // Shadow line
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, i);
        ctx.lineTo(x + w, i);
        ctx.stroke();
        
        // Highlight line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, i + 1);
        ctx.lineTo(x + w, i + 1);
        ctx.stroke();
      }
    }
  };

  // Helper function to draw shingle texture on elevation
  const drawShingleTextureElevation = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, type: string, side: 'left' | 'right') => {
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    
    if (type === 'metal') {
      // Vertical ribbing
      const ribbingSpacing = 15;
      for (let i = 0; i < w; i += ribbingSpacing) {
        ctx.beginPath();
        if (side === 'left') {
          ctx.moveTo(x + i, y);
          ctx.lineTo(x + w, y - (h * i / w));
        } else {
          ctx.moveTo(x + i, y);
          ctx.lineTo(x, y - (h * i / w));
        }
        ctx.stroke();
      }
    } else {
      // Shingle courses
      const courseSpacing = 10;
      for (let i = 0; i < h; i += courseSpacing) {
        ctx.beginPath();
        if (side === 'left') {
          ctx.moveTo(x, y - i);
          ctx.lineTo(x + (w * (h - i) / h), y);
        } else {
          ctx.moveTo(x, y - i);
          ctx.lineTo(x + (w * i / h), y);
        }
        ctx.stroke();
      }
    }
  };

  // Helper function to draw chimney (top view)
  const drawChimney = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.fillStyle = '#7c2d12';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
    ctx.strokeRect(x - size / 2, y - size / 2, size, size);
    
    // Add brick pattern
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 0.5;
    const brickHeight = size / 4;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x - size / 2, y - size / 2 + (i * brickHeight));
      ctx.lineTo(x + size / 2, y - size / 2 + (i * brickHeight));
      ctx.stroke();
    }
  };

  // Helper function to draw skylight (top view)
  const drawSkylight = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.fillStyle = '#bfdbfe';
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, size * 1.5, size);
    ctx.strokeRect(x, y, size * 1.5, size);
    
    // Glass reflection
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 2);
    ctx.lineTo(x + size * 0.7, y + 2);
    ctx.stroke();
  };

  // Helper function to draw dimension line
  const drawDimensionLine = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, text: string, orientation: 'horizontal' | 'vertical') => {
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    
    // Main line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // End caps
    const capSize = 5;
    if (orientation === 'horizontal') {
      ctx.beginPath();
      ctx.moveTo(x1, y1 - capSize);
      ctx.lineTo(x1, y1 + capSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, y2 - capSize);
      ctx.lineTo(x2, y2 + capSize);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x1 - capSize, y1);
      ctx.lineTo(x1 + capSize, y1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2 - capSize, y2);
      ctx.lineTo(x2 + capSize, y2);
      ctx.stroke();
    }
    
    // Text
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    if (orientation === 'horizontal') {
      ctx.fillText(text, (x1 + x2) / 2, y1 - 5);
    } else {
      ctx.save();
      ctx.translate(x1 + 15, (y1 + y2) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  };

  // Helper function to draw compass rose
  const drawCompassRose = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const size = 20;
    
    ctx.strokeStyle = '#64748b';
    ctx.fillStyle = '#64748b';
    ctx.lineWidth = 1.5;
    
    // Circle
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.stroke();
    
    // N arrow
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x - 4, y - size + 10);
    ctx.lineTo(x + 4, y - size + 10);
    ctx.closePath();
    ctx.fill();
    
    // S, E, W
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', x, y - size - 10);
    ctx.fillText('S', x, y + size + 10);
    ctx.fillText('E', x + size + 10, y);
    ctx.fillText('W', x - size - 10, y);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>, viewId: string) => {
    if (!onChange || viewId !== 'top') return;
    const canvas = e.currentTarget;
    if (!canvas) return;

    // Optional: capture pointer to continue receiving events even if pointer leaves canvas bounds
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const scaleFactor = window.devicePixelRatio || 2;
    const scaleX = (canvas.width / scaleFactor) / rect.width;
    const scaleY = (canvas.height / scaleFactor) / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    for (const box of hitBoxesRef.current) {
      if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
        // We will handle the prompt in handleCanvasClick (onClick) to match DeckCanvas behavior,
        // but we keep pointer capture here if needed for touch.
        break;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Release pointer capture
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>, viewId: string) => {
    if (viewId !== 'top') return;
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleFactor = window.devicePixelRatio || 2;
    const scaleX = (canvas.width / scaleFactor) / rect.width;
    const scaleY = (canvas.height / scaleFactor) / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    let hovering: string | null = null;
    for (const box of hitBoxesRef.current) {
      if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
        hovering = box.type;
        break;
      }
    }

    if (hovering !== hoveredType) {
      setHoveredType(hovering);
    }

    canvas.style.cursor = hovering ? 'pointer' : 'default';
  };

  const handlePointerLeave = () => {
    setHoveredType(null);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>, viewId: string) => {
    if (!onChange || viewId !== 'top') return;
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleFactor = window.devicePixelRatio || 2;
    const scaleX = (canvas.width / scaleFactor) / rect.width;
    const scaleY = (canvas.height / scaleFactor) / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    for (const box of hitBoxesRef.current) {
      if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
        let currentVal = config.width;
        if (box.type === 'length') currentVal = config.length;
        else if (box.type === 'lShapeWingLength') currentVal = config.lShapeConfig?.wingLength || 10;
        else if (box.type === 'lShapeWingWidth') currentVal = config.lShapeConfig?.wingWidth || 10;
        else if (box.type === 'tShapeWingLength') currentVal = config.tShapeConfig?.wingLength || 10;
        else if (box.type === 'tShapeWingWidth') currentVal = config.tShapeConfig?.wingWidth || 10;
        else if (box.type === 'uShapeWingLength') currentVal = config.uShapeConfig?.wingLength || 10;
        else if (box.type === 'uShapeWingWidth') currentVal = config.uShapeConfig?.wingWidth || 10;

        const labelMap: Record<string, string> = {
          width: 'Main Width',
          length: 'Main Length',
          lShapeWingLength: 'Wing Length',
          lShapeWingWidth: 'Wing Width',
          tShapeWingLength: 'Wing Length',
          tShapeWingWidth: 'Wing Width',
          uShapeWingLength: 'Wing Length',
          uShapeWingWidth: 'Wing Width',
        };

        const input = window.prompt(`Enter new ${labelMap[box.type] || box.type} in feet:`, currentVal.toString());
        
        if (input !== null) {
          const num = parseFloat(input);
          if (!isNaN(num) && num > 0) {
            if (box.type === 'width' || box.type === 'length') {
              onChange({
                ...config,
                [box.type]: num
              });
            } else if (box.type.startsWith('lShape')) {
              onChange({
                ...config,
                lShapeConfig: {
                  ...config.lShapeConfig!,
                  [box.type === 'lShapeWingLength' ? 'wingLength' : 'wingWidth']: num
                }
              });
            } else if (box.type.startsWith('tShape')) {
              onChange({
                ...config,
                tShapeConfig: {
                  ...config.tShapeConfig!,
                  [box.type === 'tShapeWingLength' ? 'wingLength' : 'wingWidth']: num
                }
              });
            } else if (box.type.startsWith('uShape')) {
              onChange({
                ...config,
                uShapeConfig: {
                  ...config.uShapeConfig!,
                  [box.type === 'uShapeWingLength' ? 'wingLength' : 'wingWidth']: num
                }
              });
            }
          }
        }
        break;
      }
    }
  };

  return (
    <div className="space-y-6 print:space-y-2 print:break-before-page">
      {/* Main Top View */}
      <div className="bg-muted rounded-lg p-6 border border-border print:bg-background print:border-black print:p-2 print:rounded-none print:break-inside-avoid">
        <div className="mb-4 print:mb-1">
          <h3 className="font-semibold text-foreground print:text-base">Top View (Plan)</h3>
        </div>
        <canvas
          ref={topViewRef}
          onPointerDown={(e) => handlePointerDown(e, 'top')}
          onPointerUp={handlePointerUp}
          onPointerMove={(e) => handlePointerMove(e, 'top')}
          onPointerLeave={(e) => {
            handlePointerLeave();
            handlePointerUp(e);
          }}
          onClick={(e) => handleCanvasClick(e, 'top')}
          className="w-full bg-background rounded border border-border print:border-black print:shadow-none print:rounded-none print:scale-[0.65] print:origin-top aspect-[1.4] touch-none select-none"
        />
      </div>

      {/* Elevation Views */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2 print:grid-cols-2 print:break-inside-avoid">
        <div className="bg-muted rounded-lg p-4 border border-border print:bg-background print:border-black print:p-2 print:rounded-none print:break-inside-avoid">
          <h3 className="font-semibold text-foreground mb-3 print:mb-1 print:text-base">Front Elevation</h3>
          <canvas
            ref={frontViewRef}
            onPointerMove={(e) => handlePointerMove(e, 'front')}
            onPointerLeave={handlePointerLeave}
            onClick={(e) => handleCanvasClick(e, 'front')}
            className="w-full bg-background rounded border border-border print:border-black print:shadow-none print:rounded-none print:scale-[0.65] print:origin-top aspect-[1.4] touch-none select-none"
          />
        </div>
        <div className="bg-muted rounded-lg p-4 border border-border print:bg-background print:border-black print:p-2 print:rounded-none print:break-inside-avoid">
          <h3 className="font-semibold text-foreground mb-3 print:mb-1 print:text-base">Side Elevation</h3>
          <canvas
            ref={sideViewRef}
            onPointerMove={(e) => handlePointerMove(e, 'side')}
            onPointerLeave={handlePointerLeave}
            onClick={(e) => handleCanvasClick(e, 'side')}
            className="w-full bg-background rounded border border-border print:border-black print:shadow-none print:rounded-none print:scale-[0.65] print:origin-top aspect-[1.4] touch-none select-none"
          />
        </div>
      </div>

      {/* Specifications Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
        <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
          <div className="text-xs text-orange-700 font-medium">Total Roof Area</div>
          <div className="text-sm font-bold text-orange-900 mt-1">{formatRoofArea(config)}</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
          <div className="text-xs text-purple-700 font-medium">Roof Pitch</div>
          <div className="text-sm font-bold text-purple-900 mt-1">{getPitchDescription(config.pitch || '6/12')}</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="text-xs text-blue-700 font-medium">Roof Style</div>
          <div className="text-sm font-bold text-blue-900 mt-1 capitalize">{config.style.replace('-', ' ')}</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
          <div className="text-xs text-green-700 font-medium">Shingle Type</div>
          <div className="text-sm font-bold text-green-900 mt-1 capitalize">{config.shingleType.replace('-', ' ')}</div>
        </div>
        {config.hasDormers && (config.dormers || []).length > 0 && (
          <div className="p-3 bg-gradient-to-br from-violet-50 to-violet-100 rounded-lg border border-violet-200">
            <div className="text-xs text-violet-700 font-medium">Dormers</div>
            <div className="text-sm font-bold text-violet-900 mt-1">
              {(config.dormers || []).length} dormer{(config.dormers || []).length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-muted rounded-lg p-4 border border-border print:hidden">
        <h4 className="text-sm font-semibold text-foreground mb-3">Drawing Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-red-500"></div>
            <span className="text-foreground">Ridge Line</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-blue-500"></div>
            <span className="text-foreground">Valley</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-green-600 opacity-50" style={{ borderStyle: 'dashed' }}></div>
            <span className="text-foreground">Overhang</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-amber-500"></div>
            <span className="text-foreground">Pitch Angle</span>
          </div>
          {config.hasDormers && (config.dormers || []).length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 bg-purple-500"></div>
              <span className="text-foreground">Dormer</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}