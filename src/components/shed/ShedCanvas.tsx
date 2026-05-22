import React, { useRef, useEffect, useState } from 'react';
import { ShedConfig } from '../../types/shed';

interface ShedCanvasProps {
  config: ShedConfig;
  onChange?: (config: ShedConfig) => void;
}

export function ShedCanvas({ config, onChange }: ShedCanvasProps) {
  const topViewRef = useRef<HTMLCanvasElement>(null);
  const frontViewRef = useRef<HTMLCanvasElement>(null);
  const sideViewRef = useRef<HTMLCanvasElement>(null);
  const [view3D, setView3D] = useState(false);
  
  const hitBoxesRef = useRef<{type: string, view: string, x: number, y: number, w: number, h: number}[]>([]);
  const [hoveredType, setHoveredType] = useState<{type: string, view: string} | null>(null);

  useEffect(() => {
    hitBoxesRef.current = [];
    drawTopView();
    drawFrontElevation();
    drawSideElevation();
  }, [config, view3D, hoveredType]);

  const drawTopView = () => {
    const canvas = topViewRef.current;
    if (!canvas) return;

    const scaleFactor = window.devicePixelRatio || 2;
    const baseWidth = 500;
    const baseHeight = 350;

    canvas.width = baseWidth * scaleFactor;
    canvas.height = baseHeight * scaleFactor;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scaleFactor, scaleFactor);
    ctx.clearRect(0, 0, baseWidth, baseHeight);

    // Draw Diagonal Checkerboard Grass Background
    ctx.save();
    ctx.fillStyle = '#425c27'; // Darker grass
    ctx.fillRect(0, 0, baseWidth, baseHeight);
    
    ctx.translate(baseWidth / 2, baseHeight / 2);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#49652b'; // Lighter grass
    const size = 30;
    for (let i = -30; i < 30; i++) {
      for (let j = -30; j < 30; j++) {
        if ((i + j) % 2 === 0) {
          ctx.fillRect(i * size, j * size, size, size);
        }
      }
    }
    ctx.restore();

    const padding = 60;

    const scale = Math.min((baseWidth - 2 * padding) / config.width, (baseHeight - 2 * padding) / config.length);

    const centerX = baseWidth / 2;
    const centerY = baseHeight / 2;
    const scaledWidth = config.width * scale;
    const scaledLength = config.length * scale;

    const baseX = centerX - scaledWidth / 2;
    const baseY = centerY - scaledLength / 2;

    // Draw driveway (front of shed)
    const drivewayGradient = ctx.createLinearGradient(baseX, 0, baseX, baseY);
    drivewayGradient.addColorStop(0, '#94a3b8');
    drivewayGradient.addColorStop(1, '#cbd5e1');
    
    ctx.fillStyle = view3D ? drivewayGradient : '#e2e8f0';
    ctx.fillRect(baseX, 0, scaledWidth, baseY);
    
    if (view3D) {
      ctx.fillStyle = 'rgba(100, 116, 139, 0.05)';
      for (let i = 0; i < 40; i++) {
        const x = baseX + Math.random() * scaledWidth;
        const y = Math.random() * baseY;
        const speckSize = Math.random() * 3;
        ctx.fillRect(x, y, speckSize, speckSize);
      }
    }
    
    // Driveway borders
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(baseX, 0);
    ctx.lineTo(baseX, baseY);
    ctx.moveTo(baseX + scaledWidth, 0);
    ctx.lineTo(baseX + scaledWidth, baseY);
    ctx.stroke();

    // Expansion joints
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    for(let y = baseY - 50; y > 0; y -= 50) {
        ctx.beginPath();
        ctx.moveTo(baseX, y);
        ctx.lineTo(baseX + scaledWidth, y);
        ctx.stroke();
    }

    // Draw floor with wood texture
    const floorGradient = ctx.createLinearGradient(baseX, baseY, baseX + scaledWidth, baseY + scaledLength);
    floorGradient.addColorStop(0, '#e7d4c0');
    floorGradient.addColorStop(0.5, '#c9b8a4');
    floorGradient.addColorStop(1, '#e7d4c0');
    
    ctx.fillStyle = view3D ? floorGradient : '#f5f5f4';
    ctx.fillRect(baseX, baseY, scaledWidth, scaledLength);

    // Floor boards
    if (view3D) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      const boardWidth = scale * 0.5;
      for (let x = baseX; x < baseX + scaledWidth; x += boardWidth) {
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.lineTo(x, baseY + scaledLength);
        ctx.stroke();
      }
    }

    // Wall outline with thickness
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = view3D ? 8 : 3;
    ctx.strokeRect(baseX, baseY, scaledWidth, scaledLength);

    // Inner wall line
    if (view3D) {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(baseX + 4, baseY + 4, scaledWidth - 8, scaledLength - 8);
    }

    // Draw door
    const doorWidthScaled = config.doorWidth * scale;
    const doorX = baseX + (scaledWidth - doorWidthScaled) / 2;
    const doorThickness = view3D ? 10 : 6;
    
    // Door gradient
    const doorGradient = ctx.createLinearGradient(doorX, baseY - doorThickness / 2, doorX + doorWidthScaled, baseY + doorThickness / 2);
    doorGradient.addColorStop(0, '#d1fae5');
    doorGradient.addColorStop(0.5, '#6ee7b7');
    doorGradient.addColorStop(1, '#d1fae5');
    
    ctx.fillStyle = view3D ? doorGradient : '#10b981';
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;
    
    ctx.fillRect(doorX, baseY - doorThickness / 2, doorWidthScaled, doorThickness);
    ctx.strokeRect(doorX, baseY - doorThickness / 2, doorWidthScaled, doorThickness);
    
    // Door details based on type
    if (config.doorType === 'single') {
      // Door swing arc
      ctx.strokeStyle = '#047857';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(doorX, baseY, doorWidthScaled, -Math.PI / 2, 0);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (config.doorType === 'double') {
      // Center divider
      ctx.strokeStyle = '#047857';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(doorX + doorWidthScaled / 2, baseY - doorThickness / 2);
      ctx.lineTo(doorX + doorWidthScaled / 2, baseY + doorThickness / 2);
      ctx.stroke();
      
      // Swing arcs
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(doorX, baseY, doorWidthScaled / 2, -Math.PI / 2, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(doorX + doorWidthScaled, baseY, doorWidthScaled / 2, Math.PI, -Math.PI / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (config.doorType === 'sliding-barn') {
      // Track indication
      ctx.strokeStyle = '#047857';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(doorX - 15, baseY - 20);
      ctx.lineTo(doorX + doorWidthScaled + 15, baseY - 20);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Rollers
      if (view3D) {
        ctx.fillStyle = '#065f46';
        ctx.fillRect(doorX + 10, baseY - 22, 6, 4);
        ctx.fillRect(doorX + doorWidthScaled - 16, baseY - 22, 6, 4);
      }
    }
    
    // Door label
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    const doorLabel = config.doorType === 'sliding-barn' ? 'Barn Door' : config.doorType === 'double' ? 'Double Door' : 'Entry Door';
    ctx.fillText(doorLabel, doorX + doorWidthScaled / 2, baseY - 25);

    // Draw windows
    config.windows.forEach((window, index) => {
      const windowWidth = window.width * scale;
      const windowHeight = window.height * scale;
      
      let windowX = 0;
      let windowY = 0;
      
      const windowGradient = ctx.createLinearGradient(0, 0, 10, 10);
      windowGradient.addColorStop(0, '#e0f2fe');
      windowGradient.addColorStop(0.5, '#bae6fd');
      windowGradient.addColorStop(1, '#e0f2fe');
      
      ctx.fillStyle = view3D ? windowGradient : '#06b6d4';
      ctx.strokeStyle = '#0891b2';
      ctx.lineWidth = 2;
      
      switch (window.position) {
        case 'left':
          windowX = baseX - 4;
          windowY = baseY + (window.offsetFromLeft || config.length / 2) * scale;
          ctx.fillRect(windowX, windowY, 8, windowHeight);
          ctx.strokeRect(windowX, windowY, 8, windowHeight);
          
          // Window frame
          if (view3D) {
            ctx.strokeStyle = '#0e7490';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(windowX + 4, windowY);
            ctx.lineTo(windowX + 4, windowY + windowHeight);
            ctx.stroke();
          }
          break;
        case 'right':
          windowX = baseX + scaledWidth - 4;
          windowY = baseY + (window.offsetFromLeft || config.length / 2) * scale;
          ctx.fillRect(windowX, windowY, 8, windowHeight);
          ctx.strokeRect(windowX, windowY, 8, windowHeight);
          break;
        case 'back':
          windowX = baseX + (window.offsetFromLeft || config.width / 2) * scale;
          windowY = baseY + scaledLength - 4;
          ctx.fillRect(windowX, windowY, windowWidth, 8);
          ctx.strokeRect(windowX, windowY, windowWidth, 8);
          break;
      }
    });

    // Loft indication
    if (config.hasLoft) {
      ctx.setLineDash([10, 10]);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      const loftDepth = config.length * 0.4;
      ctx.strokeRect(baseX + 15, baseY + 15, scaledWidth - 30, loftDepth * scale);
      ctx.setLineDash([]);
      
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Storage Loft', baseX + scaledWidth / 2, baseY + 40);
    }

    // Dimensions
    ctx.strokeStyle = '#64748b';
    ctx.fillStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.font = 'bold 12px sans-serif';

    // Width dimension
    drawDimensionLine(ctx, baseX, baseY + scaledLength + 30, baseX + scaledWidth, baseY + scaledLength + 30, `${config.width}'`, 'horizontal', 'width', 'top');
    
    // Length dimension
    drawDimensionLine(ctx, baseX + scaledWidth + 30, baseY, baseX + scaledWidth + 30, baseY + scaledLength, `${config.length}'`, 'vertical', 'length', 'top');

    // Compass rose
    drawCompassRose(ctx, baseWidth - 40, baseHeight - 40, true);

    // Subtitle (Moved up)
    ctx.font = '12px system-ui';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'left';
    ctx.fillText(`${config.width}' × ${config.length}' ${config.style.replace('-', ' ')} Shed`, padding, padding - 35);
  };

  const drawFrontElevation = () => {
    const canvas = frontViewRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    const scale = Math.min((width - 2 * padding) / config.width, (height - 2 * padding) / (config.wallHeight + 15));

    const centerX = width / 2;
    const baseY = height - padding - 10;
    const scaledWidth = config.width * scale;
    const wallHeightScaled = config.wallHeight * scale;
    const rise = config.roofPitch; // e.g., 4, 6, 8, 10, 12
    const run = 12; // always 12 for roofPitch
    const roofRise = ((config.length / 2) * (rise / run)) * scale;
    const overhang = 15;

    // Foundation/floor
    const foundationHeight = 8;
    ctx.fillStyle = '#78716c';
    ctx.strokeStyle = '#57534e';
    ctx.lineWidth = 2;
    ctx.fillRect(centerX - scaledWidth / 2 - 5, baseY, scaledWidth + 10, foundationHeight);
    ctx.strokeRect(centerX - scaledWidth / 2 - 5, baseY, scaledWidth + 10, foundationHeight);

    // Draw walls with siding texture
    const wallGradient = ctx.createLinearGradient(0, baseY - wallHeightScaled, 0, baseY);
    wallGradient.addColorStop(0, '#fef3c7');
    wallGradient.addColorStop(0.5, '#fde68a');
    wallGradient.addColorStop(1, '#fef3c7');
    
    ctx.fillStyle = view3D ? wallGradient : '#fef3c7';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.fillRect(centerX - scaledWidth / 2, baseY - wallHeightScaled, scaledWidth, wallHeightScaled);
    ctx.strokeRect(centerX - scaledWidth / 2, baseY - wallHeightScaled, scaledWidth, wallHeightScaled);

    // Board and batten siding
    if (view3D) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 2;
      const battenSpacing = scale * 2;
      for (let x = centerX - scaledWidth / 2; x < centerX + scaledWidth / 2; x += battenSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, baseY - wallHeightScaled);
        ctx.lineTo(x, baseY);
        ctx.stroke();
      }
    }

    // Draw roof based on style
    ctx.fillStyle = view3D ? createRoofGradient(ctx, centerX, baseY - wallHeightScaled - roofRise, roofRise) : '#92400e';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;

    switch (config.style) {
      case 'gable':
        ctx.beginPath();
        ctx.moveTo(centerX - scaledWidth / 2 - overhang, baseY - wallHeightScaled);
        ctx.lineTo(centerX, baseY - wallHeightScaled - roofRise);
        ctx.lineTo(centerX + scaledWidth / 2 + overhang, baseY - wallHeightScaled);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Shingle texture
        if (view3D) {
          drawShingleTexture(ctx, centerX - scaledWidth / 2 - overhang, baseY - wallHeightScaled, scaledWidth / 2 + overhang, roofRise, 'left');
          drawShingleTexture(ctx, centerX, baseY - wallHeightScaled, scaledWidth / 2 + overhang, roofRise, 'right');
        }
        
        // Gable vent
        if (view3D) {
          const ventSize = 18;
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.fillRect(centerX - ventSize / 2, baseY - wallHeightScaled - roofRise / 2 - ventSize / 2, ventSize, ventSize);
          ctx.strokeRect(centerX - ventSize / 2, baseY - wallHeightScaled - roofRise / 2 - ventSize / 2, ventSize, ventSize);
          
          // Vent louvers
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const louverY = baseY - wallHeightScaled - roofRise / 2 - ventSize / 2 + (i * 4) + 2;
            ctx.moveTo(centerX - ventSize / 2 + 2, louverY);
            ctx.lineTo(centerX + ventSize / 2 - 2, louverY);
          }
          ctx.stroke();
        }
        break;

      case 'barn':
        // Gambrel roof
        const lowerPitch = roofRise * 0.45;
        const upperPitch = roofRise * 0.65;
        const breakPoint = scaledWidth * 0.28;
        ctx.beginPath();
        ctx.moveTo(centerX - scaledWidth / 2 - overhang, baseY - wallHeightScaled);
        ctx.lineTo(centerX - breakPoint, baseY - wallHeightScaled - lowerPitch);
        ctx.lineTo(centerX, baseY - wallHeightScaled - roofRise);
        ctx.lineTo(centerX + breakPoint, baseY - wallHeightScaled - lowerPitch);
        ctx.lineTo(centerX + scaledWidth / 2 + overhang, baseY - wallHeightScaled);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'quaker':
        // Gable with front overhang
        ctx.beginPath();
        ctx.moveTo(centerX - scaledWidth / 2 - overhang, baseY - wallHeightScaled);
        ctx.lineTo(centerX, baseY - wallHeightScaled - roofRise);
        ctx.lineTo(centerX + scaledWidth / 2 + overhang, baseY - wallHeightScaled);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Front overhang section
        if (view3D) {
          const quakerOverhang = 35;
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.moveTo(centerX - scaledWidth / 4, baseY - wallHeightScaled);
          ctx.lineTo(centerX - scaledWidth / 4, baseY - wallHeightScaled - quakerOverhang);
          ctx.lineTo(centerX + scaledWidth / 4, baseY - wallHeightScaled - quakerOverhang);
          ctx.lineTo(centerX + scaledWidth / 4, baseY - wallHeightScaled);
          ctx.fill();
          ctx.stroke();
        }
        break;

      case 'lean-to':
        ctx.beginPath();
        ctx.moveTo(centerX - scaledWidth / 2 - overhang, baseY - wallHeightScaled);
        ctx.lineTo(centerX + scaledWidth / 2 + overhang, baseY - wallHeightScaled - roofRise * 0.75);
        ctx.lineTo(centerX + scaledWidth / 2 + overhang, baseY - wallHeightScaled);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'saltbox':
        // Asymmetric roof
        ctx.beginPath();
        ctx.moveTo(centerX - scaledWidth / 2 - overhang, baseY - wallHeightScaled);
        ctx.lineTo(centerX - scaledWidth * 0.1, baseY - wallHeightScaled - roofRise);
        ctx.lineTo(centerX + scaledWidth / 2 + overhang, baseY - wallHeightScaled);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
    }

    // Draw door
    const doorWidthScaled = config.doorWidth * scale;
    const doorHeightScaled = config.doorHeight * scale;
    const doorX = centerX - doorWidthScaled / 2;
    const doorY = baseY - doorHeightScaled;
    
    // Door gradient
    const doorGradient = ctx.createLinearGradient(doorX, doorY, doorX, doorY + doorHeightScaled);
    doorGradient.addColorStop(0, '#d1fae5');
    doorGradient.addColorStop(0.5, '#a7f3d0');
    doorGradient.addColorStop(1, '#d1fae5');
    
    ctx.fillStyle = view3D ? doorGradient : '#d1fae5';
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;
    
    ctx.fillRect(doorX, doorY, doorWidthScaled, doorHeightScaled);
    ctx.strokeRect(doorX, doorY, doorWidthScaled, doorHeightScaled);
    
    // Door details
    if (view3D) {
      // Door panels
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      
      if (config.doorType === 'double') {
        // Center divider
        ctx.beginPath();
        ctx.moveTo(doorX + doorWidthScaled / 2, doorY);
        ctx.lineTo(doorX + doorWidthScaled / 2, doorY + doorHeightScaled);
        ctx.stroke();
      }
      
      // Horizontal panels
      const panelCount = config.doorType === 'sliding-barn' ? 4 : 3;
      for (let i = 1; i < panelCount; i++) {
        const panelY = doorY + (doorHeightScaled / panelCount) * i;
        ctx.beginPath();
        ctx.moveTo(doorX + 5, panelY);
        ctx.lineTo(doorX + doorWidthScaled - 5, panelY);
        ctx.stroke();
      }
      
      // Door hardware
      ctx.fillStyle = '#065f46';
      if (config.doorType === 'sliding-barn') {
        // X pattern for barn door
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(doorX + 10, doorY + 10);
        ctx.lineTo(doorX + doorWidthScaled - 10, doorY + doorHeightScaled - 10);
        ctx.moveTo(doorX + doorWidthScaled - 10, doorY + 10);
        ctx.lineTo(doorX + 10, doorY + doorHeightScaled - 10);
        ctx.stroke();
      } else {
        // Handle
        ctx.fillRect(doorX + doorWidthScaled - 15, doorY + doorHeightScaled / 2 - 5, 8, 10);
      }
    }

    // Draw windows on front
    config.windows.forEach((window) => {
      if (window.position === 'front') {
        const windowWidth = window.width * scale;
        const windowHeight = window.height * scale;
        const windowX = centerX - scaledWidth / 2 + (window.offsetFromLeft || config.width * 0.25) * scale;
        const windowY = baseY - wallHeightScaled + (window.offsetFromFloor || config.wallHeight * 0.4) * scale;
        
        // Window with gradient
        const windowGradient = ctx.createLinearGradient(windowX, windowY, windowX, windowY + windowHeight);
        windowGradient.addColorStop(0, '#e0f2fe');
        windowGradient.addColorStop(0.5, '#bae6fd');
        windowGradient.addColorStop(1, '#dbeafe');
        
        ctx.fillStyle = view3D ? windowGradient : '#e0f2fe';
        ctx.strokeStyle = '#0891b2';
        ctx.lineWidth = 2;
        
        ctx.fillRect(windowX, windowY, windowWidth, windowHeight);
        ctx.strokeRect(windowX, windowY, windowWidth, windowHeight);
        
        // Window panes
        if (view3D) {
          ctx.strokeStyle = '#0e7490';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(windowX + windowWidth / 2, windowY);
          ctx.lineTo(windowX + windowWidth / 2, windowY + windowHeight);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(windowX, windowY + windowHeight / 2);
          ctx.lineTo(windowX + windowWidth, windowY + windowHeight / 2);
          ctx.stroke();
        }
        
        // Shutters
        if (config.hasShutters) {
          ctx.fillStyle = '#334155';
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.fillRect(windowX - 10, windowY, 8, windowHeight);
          ctx.strokeRect(windowX - 10, windowY, 8, windowHeight);
          ctx.fillRect(windowX + windowWidth + 2, windowY, 8, windowHeight);
          ctx.strokeRect(windowX + windowWidth + 2, windowY, 8, windowHeight);
          
          // Shutter slats
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 0.5;
          for (let s = 0; s < 6; s++) {
            const slotY = windowY + (s * windowHeight / 6) + windowHeight / 12;
            ctx.beginPath();
            ctx.moveTo(windowX - 10, slotY);
            ctx.lineTo(windowX - 2, slotY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(windowX + windowWidth + 2, slotY);
            ctx.lineTo(windowX + windowWidth + 10, slotY);
            ctx.stroke();
          }
        }
        
        // Flower box
        if (config.hasFlowerBox) {
          ctx.fillStyle = '#78350f';
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 1;
          ctx.fillRect(windowX - 6, windowY + windowHeight, windowWidth + 12, 10);
          ctx.strokeRect(windowX - 6, windowY + windowHeight, windowWidth + 12, 10);
          
          // Flowers
          if (view3D) {
            ctx.fillStyle = '#ec4899';
            for (let f = 0; f < 5; f++) {
              const flowerX = windowX - 4 + (f * (windowWidth + 8) / 4);
              ctx.beginPath();
              ctx.arc(flowerX, windowY + windowHeight + 4, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
    });

    // Corner trim
    if (view3D) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX - scaledWidth / 2, baseY - wallHeightScaled);
      ctx.lineTo(centerX - scaledWidth / 2, baseY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(centerX + scaledWidth / 2, baseY - wallHeightScaled);
      ctx.lineTo(centerX + scaledWidth / 2, baseY);
      ctx.stroke();
    }

    // Dimensions
    drawDimensionLine(ctx, centerX - scaledWidth / 2, baseY + 30, centerX + scaledWidth / 2, baseY + 30, `${config.width}'`, 'horizontal', 'width', 'front');
    drawDimensionLine(ctx, centerX + scaledWidth / 2 + 30, baseY, centerX + scaledWidth / 2 + 30, baseY - wallHeightScaled, `${config.wallHeight}' Wall`, 'vertical', 'height', 'front');

    // Title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Front Elevation', padding, 25);
  };

  const drawSideElevation = () => {
    const canvas = sideViewRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    const scale = Math.min((width - 2 * padding) / config.length, (height - 2 * padding) / (config.wallHeight + 15));

    const centerX = width / 2;
    const baseY = height - padding - 10;
    const scaledLength = config.length * scale;
    const wallHeightScaled = config.wallHeight * scale;
    const rise = config.roofPitch; // e.g., 4, 6, 8, 10, 12
    const run = 12; // always 12 for roofPitch
    const roofRise = ((config.length / 2) * (rise / run)) * scale;
    const overhang = 15;

    // Foundation
    ctx.fillStyle = '#78716c';
    ctx.strokeStyle = '#57534e';
    ctx.lineWidth = 2;
    ctx.fillRect(centerX - scaledLength / 2 - 5, baseY, scaledLength + 10, 8);
    ctx.strokeRect(centerX - scaledLength / 2 - 5, baseY, scaledLength + 10, 8);

    // Wall
    const wallGradient = ctx.createLinearGradient(0, baseY - wallHeightScaled, 0, baseY);
    wallGradient.addColorStop(0, '#fef3c7');
    wallGradient.addColorStop(0.5, '#fde68a');
    wallGradient.addColorStop(1, '#fef3c7');
    
    ctx.fillStyle = view3D ? wallGradient : '#fef3c7';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.fillRect(centerX - scaledLength / 2, baseY - wallHeightScaled, scaledLength, wallHeightScaled);
    ctx.strokeRect(centerX - scaledLength / 2, baseY - wallHeightScaled, scaledLength, wallHeightScaled);

    // Board and batten siding
    if (view3D) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 2;
      const battenSpacing = scale * 2;
      for (let x = centerX - scaledLength / 2; x < centerX + scaledLength / 2; x += battenSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, baseY - wallHeightScaled);
        ctx.lineTo(x, baseY);
        ctx.stroke();
      }
    }

    // Roof side view
    ctx.fillStyle = view3D ? '#92400e' : '#78350f';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;

    if (config.style === 'gable' || config.style === 'barn' || config.style === 'quaker' || config.style === 'saltbox') {
      // Sloped roof visible from side
      ctx.beginPath();
      ctx.moveTo(centerX - scaledLength / 2 - overhang, baseY - wallHeightScaled);
      ctx.lineTo(centerX - scaledLength / 2 - overhang, baseY - wallHeightScaled - roofRise * 0.6);
      ctx.lineTo(centerX + scaledLength / 2 + overhang, baseY - wallHeightScaled - roofRise * 0.6);
      ctx.lineTo(centerX + scaledLength / 2 + overhang, baseY - wallHeightScaled);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Roof edge detail
      if (view3D) {
        ctx.fillStyle = '#451a03';
        ctx.fillRect(centerX - scaledLength / 2 - overhang, baseY - wallHeightScaled - roofRise * 0.6, scaledLength + overhang * 2, 5);
      }
    } else if (config.style === 'lean-to') {
      ctx.beginPath();
      ctx.moveTo(centerX - scaledLength / 2 - overhang, baseY - wallHeightScaled);
      ctx.lineTo(centerX + scaledLength / 2 + overhang, baseY - wallHeightScaled - roofRise * 0.75);
      ctx.lineTo(centerX + scaledLength / 2 + overhang, baseY - wallHeightScaled);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Side windows
    config.windows.forEach((window) => {
      if (window.position === 'left' || window.position === 'right') {
        const windowHeight = window.height * scale;
        const windowY = baseY - wallHeightScaled + (window.offsetFromFloor || config.wallHeight * 0.4) * scale;
        const windowX = centerX - scaledLength / 2 + (window.offsetFromLeft || config.length / 2) * scale;
        
        ctx.fillStyle = '#bae6fd';
        ctx.strokeStyle = '#0891b2';
        ctx.lineWidth = 2;
        
        ctx.fillRect(windowX - 15, windowY, 30, windowHeight);
        ctx.strokeRect(windowX - 15, windowY, 30, windowHeight);
      }
    });

    // Dimensions
    drawDimensionLine(ctx, centerX - scaledLength / 2, baseY + 30, centerX + scaledLength / 2, baseY + 30, `${config.length}'`, 'horizontal', 'length', 'side');

    // Title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Side Elevation', padding, 25);
  };

  // Helper functions
  const createRoofGradient = (ctx: CanvasRenderingContext2D, x: number, y: number, height: number) => {
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, '#92400e');
    gradient.addColorStop(0.5, '#78350f');
    gradient.addColorStop(1, '#451a03');
    return gradient;
  };

  const drawShingleTexture = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, side: 'left' | 'right') => {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    
    const courseSpacing = 8;
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
  };

  const drawDimensionLine = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    text: string,
    orientation: 'horizontal' | 'vertical',
    type?: string,
    view?: string
  ) => {
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const drawArrow = (x: number, y: number, dirX: number, dirY: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(dirY, dirX));
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-6, -3);
      ctx.lineTo(-6, 3);
      ctx.fill();
      ctx.restore();
    };

    if (orientation === 'horizontal') {
      drawArrow(x1, y1, -1, 0);
      drawArrow(x2, y2, 1, 0);
    } else {
      drawArrow(x1, y1, 0, -1);
      drawArrow(x2, y2, 0, 1);
    }
    
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const isHovered = type && view && hoveredType?.type === type && hoveredType?.view === view;
    
    ctx.save();
    if (orientation === 'horizontal') {
      ctx.translate(cx, y1);
    } else {
      ctx.translate(x1, cy);
      ctx.rotate(-Math.PI / 2);
    }

    if (type && view) {
      ctx.font = '600 11px system-ui, sans-serif';
      const textWidth = ctx.measureText(text).width;
      const height = 24;
      const width = textWidth + 30; // padding and icon space
      const iconX = -width / 2 + 10;
      
      let hitX = orientation === 'horizontal' ? cx : x1;
      let hitY = orientation === 'horizontal' ? y1 : cy;
      let hitW = width;
      let hitH = height;
      
      if (orientation === 'vertical') {
        hitW = height;
        hitH = width;
      }
      
      hitBoxesRef.current.push({
        type,
        view,
        x: hitX - hitW / 2,
        y: hitY - hitH / 2,
        w: hitW,
        h: hitH
      });

      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;

      // Background
      ctx.fillStyle = isHovered ? '#f8fafc' : '#ffffff';
      if (isHovered) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = 'transparent';
        ctx.lineWidth = 0;
      }
      ctx.beginPath();
      ctx.roundRect(-width / 2, -height / 2, width, height, height / 2);
      ctx.fill();
      if (isHovered) {
        ctx.stroke();
      }

      // Reset shadow
      ctx.shadowColor = 'transparent';

      // Icon (pencil)
      ctx.fillStyle = '#64748b';
      ctx.strokeStyle = '#64748b';
      if (type === 'height') {
        // Height I-beam
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(iconX - 3, -4); ctx.lineTo(iconX + 3, -4);
        ctx.moveTo(iconX - 3, 4); ctx.lineTo(iconX + 3, 4);
        ctx.moveTo(iconX, -4); ctx.lineTo(iconX, 4);
        ctx.stroke();
      } else {
        // Pencil
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
      }

      // Text
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, iconX + 12, 1);
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 0);
    }
    
    ctx.restore();
  };

  const drawCompassRose = (ctx: CanvasRenderingContext2D, x: number, y: number, isDarkBg: boolean = false) => {
    const size = 20;
    
    ctx.strokeStyle = isDarkBg ? 'rgba(255, 255, 255, 0.6)' : '#64748b';
    ctx.fillStyle = isDarkBg ? 'rgba(255, 255, 255, 0.6)' : '#64748b';
    ctx.lineWidth = 1.5;
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x - 4, y - size + 10);
    ctx.lineTo(x + 4, y - size + 10);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = isDarkBg ? 'rgba(255, 255, 255, 0.8)' : '#64748b';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', x, y - size - 10);
    ctx.fillText('S', x, y + size + 10);
    ctx.fillText('E', x + size + 10, y);
    ctx.fillText('W', x - size - 10, y);
  };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>, viewId: string) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleFactor = window.devicePixelRatio || 2;
    
    // Scale coordinates from screen pixels to canvas coordinates
    // Width and height of canvas attributes vs CSS size
    const scaleX = (canvas.width / scaleFactor) / rect.width;
    const scaleY = (canvas.height / scaleFactor) / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    let hovering: {type: string, view: string} | null = null;
    for (const box of hitBoxesRef.current) {
      if (box.view === viewId && x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
        hovering = { type: box.type, view: box.view };
        break;
      }
    }

    if (hovering?.type !== hoveredType?.type || hovering?.view !== hoveredType?.view) {
      setHoveredType(hovering);
    }

    canvas.style.cursor = hovering ? 'pointer' : 'default';
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setHoveredType(null);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>, viewId: string) => {
    if (!onChange) return;
    const canvas = e.currentTarget;

    const rect = canvas.getBoundingClientRect();
    const scaleFactor = window.devicePixelRatio || 2;
    const scaleX = (canvas.width / scaleFactor) / rect.width;
    const scaleY = (canvas.height / scaleFactor) / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    for (const box of hitBoxesRef.current) {
      if (box.view === viewId && x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
        let currentVal = config.width;
        if (box.type === 'length') currentVal = config.length;
        if (box.type === 'height') currentVal = config.wallHeight;

        const labelMap: Record<string, string> = {
          width: 'Width',
          length: 'Length',
          height: 'Wall Height'
        };

        const input = window.prompt(`Enter new ${labelMap[box.type]} in feet:`, currentVal.toString());
        
        if (input !== null) {
          const num = parseFloat(input);
          if (!isNaN(num) && num > 0) {
            onChange({
              ...config,
              [box.type === 'height' ? 'wallHeight' : box.type]: num
            });
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
        <canvas
          ref={topViewRef}
          onPointerMove={(e) => handlePointerMove(e, 'top')}
          onPointerLeave={handlePointerLeave}
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
        <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
          <div className="text-xs text-amber-700 font-medium">Shed Size</div>
          <div className="text-sm font-bold text-amber-900 mt-1">{config.width}' × {config.length}'</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
          <div className="text-xs text-green-700 font-medium">Wall Height</div>
          <div className="text-sm font-bold text-green-900 mt-1">{config.wallHeight}' tall</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="text-xs text-blue-700 font-medium">Style</div>
          <div className="text-sm font-bold text-blue-900 mt-1 capitalize">{config.style.replace('-', ' ')}</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
          <div className="text-xs text-purple-700 font-medium">Door Type</div>
          <div className="text-sm font-bold text-purple-900 mt-1 capitalize">{config.doorType.replace('-', ' ')}</div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-muted rounded-lg p-4 border border-border print:hidden">
        <h4 className="text-sm font-semibold text-foreground mb-3">Drawing Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 bg-green-400 rounded"></div>
            <span className="text-foreground">Door</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 bg-cyan-400 rounded"></div>
            <span className="text-foreground">Window</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 bg-stone-700 rounded"></div>
            <span className="text-foreground">Shutters</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-slate-600"></div>
            <span className="text-foreground">Dimension Lines</span>
          </div>
        </div>
      </div>
    </div>
  );
}