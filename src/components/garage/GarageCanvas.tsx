import React, { useRef, useEffect, useState } from 'react';
import { GarageConfig } from '../../types/garage';

interface GarageCanvasProps {
  config: GarageConfig;
  onChange?: (config: GarageConfig) => void;
}

export function GarageCanvas({ config, onChange }: GarageCanvasProps) {
  const topViewRef = useRef<HTMLCanvasElement>(null);
  const frontViewRef = useRef<HTMLCanvasElement>(null);
  const sideViewRef = useRef<HTMLCanvasElement>(null);
  const [view3D, setView3D] = useState(false); // Default to clean designer look
  
  const hitBoxesRef = useRef<{type: string, view: string, x: number, y: number, w: number, h: number}[]>([]);
  const [hoveredType, setHoveredType] = useState<{type: string, view: string} | null>(null);

  useEffect(() => {
    hitBoxesRef.current = [];
    drawTopView();
    drawFrontElevation();
    drawSideElevation();
  }, [config, view3D, hoveredType]);

  const formatDim = (val: number) => {
    const ft = Math.floor(val);
    const inches = Math.round((val - ft) * 12);
    return `${ft}' ${inches.toString().padStart(2, '0')}"`;
  };

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

    // Draw driveway (front of garage)
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

    // Draw floor with concrete texture
    const floorGradient = ctx.createLinearGradient(baseX, baseY, baseX + scaledWidth, baseY + scaledLength);
    floorGradient.addColorStop(0, '#e2e8f0');
    floorGradient.addColorStop(0.5, '#cbd5e1');
    floorGradient.addColorStop(1, '#e2e8f0');
    
    ctx.fillStyle = view3D ? floorGradient : '#f1f5f9';
    ctx.fillRect(baseX, baseY, scaledWidth, scaledLength);

    // Concrete texture
    if (view3D) {
      ctx.fillStyle = 'rgba(100, 116, 139, 0.05)';
      for (let i = 0; i < 50; i++) {
        const x = baseX + Math.random() * scaledWidth;
        const y = baseY + Math.random() * scaledLength;
        const speckSize = Math.random() * 3;
        ctx.fillRect(x, y, speckSize, speckSize);
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

    // Draw bay divisions
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    
    for (let i = 1; i < config.bays; i++) {
      const bayX = baseX + (scaledWidth / config.bays) * i;
      ctx.beginPath();
      ctx.moveTo(bayX, baseY);
      ctx.lineTo(bayX, baseY + scaledLength);
      ctx.stroke();
      
      // Bay label
      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`Bay ${i + 1}`, bayX + (scaledWidth / config.bays) / 2, baseY + scaledLength / 2);
    }
    ctx.setLineDash([]);

    // Draw overhead doors (front wall)
    config.doors.forEach((door, index) => {
      if (door.type === 'overhead' && door.position === 'front') {
        const doorX = baseX + (door.offsetFromLeft || (index * config.width / config.doors.length)) * scale;
        const doorWidth = door.width * scale;
        const doorThickness = view3D ? 10 : 6;
        
        // Door with gradient
        const doorGradient = ctx.createLinearGradient(doorX, baseY - doorThickness / 2, doorX + doorWidth, baseY + doorThickness / 2);
        doorGradient.addColorStop(0, '#dbeafe');
        doorGradient.addColorStop(0.5, '#93c5fd');
        doorGradient.addColorStop(1, '#dbeafe');
        
        ctx.fillStyle = view3D ? doorGradient : '#3b82f6';
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        
        ctx.fillRect(doorX, baseY - doorThickness / 2, doorWidth, doorThickness);
        ctx.strokeRect(doorX, baseY - doorThickness / 2, doorWidth, doorThickness);
        
        // Door panel sections
        if (view3D) {
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 1;
          const panels = 4;
          for (let i = 1; i < panels; i++) {
            const panelX = doorX + (doorWidth / panels) * i;
            ctx.beginPath();
            ctx.moveTo(panelX, baseY - doorThickness / 2);
            ctx.lineTo(panelX, baseY + doorThickness / 2);
            ctx.stroke();
          }
          
          // Hardware indication
          ctx.fillStyle = '#1e40af';
          ctx.fillRect(doorX + doorWidth / 2 - 3, baseY - 2, 6, 4);
        }
        
        // Label
        ctx.fillStyle = '#1e40af';
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`${door.width}' × ${door.height}' OH`, doorX + doorWidth / 2, baseY - 15);
      }
    });

    // Draw walk door
    if (config.hasWalkDoor) {
      const walkDoorX = baseX + scaledWidth - 50;
      const walkDoorY = baseY;
      const walkDoorWidth = 36;
      const walkDoorHeight = view3D ? 8 : 6;
      
      // Door
      const doorGradient = ctx.createLinearGradient(walkDoorX, walkDoorY - walkDoorHeight / 2, walkDoorX + walkDoorWidth, walkDoorY + walkDoorHeight / 2);
      doorGradient.addColorStop(0, '#d1fae5');
      doorGradient.addColorStop(0.5, '#6ee7b7');
      doorGradient.addColorStop(1, '#d1fae5');
      
      ctx.fillStyle = view3D ? doorGradient : '#10b981';
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2;
      
      ctx.fillRect(walkDoorX, walkDoorY - walkDoorHeight / 2, walkDoorWidth, walkDoorHeight);
      ctx.strokeRect(walkDoorX, walkDoorY - walkDoorHeight / 2, walkDoorWidth, walkDoorHeight);
      
      // Door swing arc
      ctx.strokeStyle = '#047857';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(walkDoorX, walkDoorY, walkDoorWidth, -Math.PI / 2, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Door handle
      if (view3D) {
        ctx.fillStyle = '#065f46';
        ctx.fillRect(walkDoorX + walkDoorWidth - 8, walkDoorY - 2, 4, 4);
      }
      
      // Label
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Entry Door', walkDoorX + walkDoorWidth / 2, walkDoorY - 12);
    }

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
          windowY = baseY + (window.offsetFromLeft || 50) * scale;
          ctx.fillRect(windowX, windowY, 8, windowHeight);
          ctx.strokeRect(windowX, windowY, 8, windowHeight);
          
          // Window frame detail
          if (view3D) {
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(windowX + 4, windowY);
            ctx.lineTo(windowX + 4, windowY + windowHeight);
            ctx.stroke();
          }
          break;
        case 'right':
          windowX = baseX + scaledWidth - 4;
          windowY = baseY + (window.offsetFromLeft || 50) * scale;
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

    // Dimensions
    ctx.strokeStyle = '#64748b';
    ctx.fillStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.font = 'bold 12px sans-serif';

    // Width dimension
    drawDimensionLine(ctx, baseX, baseY + scaledLength + 30, baseX + scaledWidth, baseY + scaledLength + 30, formatDim(config.width), 'horizontal', 'width', 'top');
    
    // Length dimension
    drawDimensionLine(ctx, baseX + scaledWidth + 30, baseY, baseX + scaledWidth + 30, baseY + scaledLength, formatDim(config.length), 'vertical', 'length', 'top');

    // Compass rose
    drawCompassRose(ctx, baseWidth - 40, baseHeight - 40, true);

    // Subtitle (Moved up)
    ctx.font = '12px system-ui';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'left';
    ctx.fillText(`${config.width}' × ${config.length}' - ${config.bays} Bay Garage`, padding, padding - 35);
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

    ctx.scale(scaleFactor, scaleFactor);
    ctx.clearRect(0, 0, baseWidth, baseHeight);

    const padding = 40;

    const scale = Math.min((baseWidth - 2 * padding) / config.width, (baseHeight - 2 * padding) / (config.height + 15));

    const centerX = baseWidth / 2;
    const baseY = baseHeight - padding - 10;
    const scaledWidth = config.width * scale;
    const wallHeight = config.height * scale;
    const rise = config.roofPitch; // e.g., 4, 6, 8
    const run = 12; // always 12 for roofPitch
    const roofRun = (scaledWidth / 2);
    const roofRise = (rise / run) * roofRun;
    const roofOverhang = 15;

    // Foundation
    const foundationHeight = 12;
    ctx.fillStyle = '#78716c';
    ctx.strokeStyle = '#57534e';
    ctx.lineWidth = 2;
    ctx.fillRect(centerX - scaledWidth / 2 - 5, baseY, scaledWidth + 10, foundationHeight);
    ctx.strokeRect(centerX - scaledWidth / 2 - 5, baseY, scaledWidth + 10, foundationHeight);

    // Draw walls with siding texture
    const wallGradient = ctx.createLinearGradient(0, baseY - wallHeight, 0, baseY);
    wallGradient.addColorStop(0, '#f8fafc');
    wallGradient.addColorStop(0.5, '#f1f5f9');
    wallGradient.addColorStop(1, '#e2e8f0');
    
    ctx.fillStyle = view3D ? wallGradient : '#f8fafc';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.fillRect(centerX - scaledWidth / 2, baseY - wallHeight, scaledWidth, wallHeight);
    ctx.strokeRect(centerX - scaledWidth / 2, baseY - wallHeight, scaledWidth, wallHeight);

    // Siding texture
    if (view3D) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      const sidingSpacing = 8;
      for (let y = baseY - wallHeight; y < baseY; y += sidingSpacing) {
        ctx.beginPath();
        ctx.moveTo(centerX - scaledWidth / 2, y);
        ctx.lineTo(centerX + scaledWidth / 2, y);
        ctx.stroke();
      }
    }

    // Draw roof
    ctx.fillStyle = view3D ? createRoofGradient(ctx, centerX, baseY - wallHeight - roofRise, roofRise) : '#475569';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;

    switch (config.roofStyle) {
      case 'gable':
        ctx.beginPath();
        ctx.moveTo(centerX - scaledWidth / 2 - roofOverhang, baseY - wallHeight);
        ctx.lineTo(centerX, baseY - wallHeight - roofRise);
        ctx.lineTo(centerX + scaledWidth / 2 + roofOverhang, baseY - wallHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Shingle texture
        if (view3D) {
          drawShingleTexture(ctx, centerX - scaledWidth / 2 - roofOverhang, baseY - wallHeight, scaledWidth / 2 + roofOverhang, roofRise, 'left');
          drawShingleTexture(ctx, centerX, baseY - wallHeight, scaledWidth / 2 + roofOverhang, roofRise, 'right');
        }
        
        // Ridge vent
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(centerX - 15, baseY - wallHeight - roofRise);
        ctx.lineTo(centerX + 15, baseY - wallHeight - roofRise);
        ctx.stroke();
        break;

      case 'hip':
        const hipRidge = scaledWidth * 0.3;
        ctx.beginPath();
        ctx.moveTo(centerX - scaledWidth / 2 - roofOverhang, baseY - wallHeight);
        ctx.lineTo(centerX - hipRidge / 2, baseY - wallHeight - roofRise * 0.85);
        ctx.lineTo(centerX + hipRidge / 2, baseY - wallHeight - roofRise * 0.85);
        ctx.lineTo(centerX + scaledWidth / 2 + roofOverhang, baseY - wallHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'gambrel':
        const breakPoint = roofRise * 0.55;
        const breakWidth = scaledWidth * 0.28;
        ctx.beginPath();
        ctx.moveTo(centerX - scaledWidth / 2 - roofOverhang, baseY - wallHeight);
        ctx.lineTo(centerX - breakWidth, baseY - wallHeight - breakPoint);
        ctx.lineTo(centerX, baseY - wallHeight - roofRise);
        ctx.lineTo(centerX + breakWidth, baseY - wallHeight - breakPoint);
        ctx.lineTo(centerX + scaledWidth / 2 + roofOverhang, baseY - wallHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'flat':
        ctx.fillRect(centerX - scaledWidth / 2 - roofOverhang, baseY - wallHeight - 25, scaledWidth + roofOverhang * 2, 25);
        ctx.strokeRect(centerX - scaledWidth / 2 - roofOverhang, baseY - wallHeight - 25, scaledWidth + roofOverhang * 2, 25);
        break;
    }

    // Draw overhead doors
    config.doors.forEach((door, index) => {
      if (door.type === 'overhead' && door.position === 'front') {
        const doorX = centerX - scaledWidth / 2 + (door.offsetFromLeft || (index * config.width / config.doors.length)) * scale;
        const doorWidth = door.width * scale;
        const doorHeight = door.height * scale;
        const doorY = baseY - doorHeight;
        
        // Door gradient
        const doorGradient = ctx.createLinearGradient(doorX, doorY, doorX, doorY + doorHeight);
        doorGradient.addColorStop(0, '#f0f9ff');
        doorGradient.addColorStop(0.5, '#dbeafe');
        doorGradient.addColorStop(1, '#bfdbfe');
        
        ctx.fillStyle = view3D ? doorGradient : '#dbeafe';
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        
        ctx.fillRect(doorX, doorY, doorWidth, doorHeight);
        ctx.strokeRect(doorX, doorY, doorWidth, doorHeight);
        
        // Door panels
        if (view3D) {
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 1.5;
          const numPanels = 4;
          for (let i = 1; i < numPanels; i++) {
            const panelY = doorY + (doorHeight / numPanels) * i;
            ctx.beginPath();
            ctx.moveTo(doorX, panelY);
            ctx.lineTo(doorX + doorWidth, panelY);
            ctx.stroke();
          }
          
          // Vertical sections
          for (let i = 1; i < 4; i++) {
            const sectionX = doorX + (doorWidth / 4) * i;
            ctx.beginPath();
            ctx.moveTo(sectionX, doorY);
            ctx.lineTo(sectionX, doorY + doorHeight);
            ctx.stroke();
          }
          
          // Windows in top panel
          ctx.fillStyle = '#bfdbfe';
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1;
          const windowRowY = doorY + 18;
          for (let i = 0; i < 4; i++) {
            const windowX = doorX + (doorWidth / 5) * (i + 0.5) - 10;
            ctx.fillRect(windowX, windowRowY, 20, 14);
            ctx.strokeRect(windowX, windowRowY, 20, 14);
            
            // Window muntins
            ctx.beginPath();
            ctx.moveTo(windowX + 10, windowRowY);
            ctx.lineTo(windowX + 10, windowRowY + 14);
            ctx.stroke();
          }
          
          // Hardware
          ctx.fillStyle = '#1e40af';
          ctx.fillRect(doorX + 15, doorY + doorHeight / 2 - 3, 8, 6);
          ctx.fillRect(doorX + doorWidth - 23, doorY + doorHeight / 2 - 3, 8, 6);
        }
      }
    });

    // Draw walk door
    if (config.hasWalkDoor) {
      const walkDoorX = centerX + scaledWidth / 2 - 50;
      const walkDoorWidth = 36;
      const walkDoorHeight = 84;
      const walkDoorY = baseY - walkDoorHeight;
      
      ctx.fillStyle = '#d1fae5';
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2;
      
      ctx.fillRect(walkDoorX, walkDoorY, walkDoorWidth, walkDoorHeight);
      ctx.strokeRect(walkDoorX, walkDoorY, walkDoorWidth, walkDoorHeight);
      
      // Door panels
      if (view3D) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1;
        for (let i = 1; i < 3; i++) {
          const panelY = walkDoorY + (walkDoorHeight / 3) * i;
          ctx.beginPath();
          ctx.moveTo(walkDoorX + 4, panelY);
          ctx.lineTo(walkDoorX + walkDoorWidth - 4, panelY);
          ctx.stroke();
        }
        
        // Door handle
        ctx.fillStyle = '#065f46';
        ctx.fillRect(walkDoorX + walkDoorWidth - 10, walkDoorY + walkDoorHeight / 2 - 4, 6, 8);
      }
    }

    // Dimensions
    drawDimensionLine(ctx, centerX - scaledWidth / 2, baseY + 30, centerX + scaledWidth / 2, baseY + 30, formatDim(config.width), 'horizontal', 'width', 'front');
    drawDimensionLine(ctx, centerX + scaledWidth / 2 + 30, baseY, centerX + scaledWidth / 2 + 30, baseY - wallHeight, `Height ${formatDim(config.height)}`, 'vertical', 'height', 'front');

    // Pitch angle
    if (config.roofStyle !== 'flat') {
      const angle = Math.atan(rise / run) * (180 / Math.PI);
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${angle.toFixed(1)}° (${config.roofPitch})`, centerX + scaledWidth / 4, baseY - wallHeight - roofRise / 2);
    }

    // Title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Front Elevation', padding, 25);
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

    ctx.scale(scaleFactor, scaleFactor);
    ctx.clearRect(0, 0, baseWidth, baseHeight);

    const padding = 40;

    const scale = Math.min((baseWidth - 2 * padding) / config.length, (baseHeight - 2 * padding) / (config.height + 15));

    const centerX = baseWidth / 2;
    const baseY = baseHeight - padding - 10;
    const scaledLength = config.length * scale;
    const wallHeight = config.height * scale;
    const rise = config.roofPitch; // e.g., 4, 6, 8
    const run = 12; // always 12 for roofPitch
    const roofRise = ((config.length / 2) * (rise / run)) * scale;
    const roofOverhang = 15;

    // Foundation
    ctx.fillStyle = '#78716c';
    ctx.strokeStyle = '#57534e';
    ctx.lineWidth = 2;
    ctx.fillRect(centerX - scaledLength / 2 - 5, baseY, scaledLength + 10, 12);
    ctx.strokeRect(centerX - scaledLength / 2 - 5, baseY, scaledLength + 10, 12);

    // Wall
    ctx.fillStyle = '#f1f5f9';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.fillRect(centerX - scaledLength / 2, baseY - wallHeight, scaledLength, wallHeight);
    ctx.strokeRect(centerX - scaledLength / 2, baseY - wallHeight, scaledLength, wallHeight);

    // Siding
    if (view3D) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      for (let y = baseY - wallHeight; y < baseY; y += 8) {
        ctx.beginPath();
        ctx.moveTo(centerX - scaledLength / 2, y);
        ctx.lineTo(centerX + scaledLength / 2, y);
        ctx.stroke();
      }
    }

    // Roof side view
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;

    if (config.roofStyle === 'gable' || config.roofStyle === 'gambrel' || config.roofStyle === 'hip') {
      // Sloped roof
      ctx.beginPath();
      ctx.moveTo(centerX - scaledLength / 2 - roofOverhang, baseY - wallHeight);
      ctx.lineTo(centerX - scaledLength / 2 - roofOverhang, baseY - wallHeight - roofRise * 0.7);
      ctx.lineTo(centerX + scaledLength / 2 + roofOverhang, baseY - wallHeight - roofRise * 0.7);
      ctx.lineTo(centerX + scaledLength / 2 + roofOverhang, baseY - wallHeight);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Flat roof
      ctx.fillRect(centerX - scaledLength / 2 - roofOverhang, baseY - wallHeight - 25, scaledLength + roofOverhang * 2, 25);
      ctx.strokeRect(centerX - scaledLength / 2 - roofOverhang, baseY - wallHeight - 25, scaledLength + roofOverhang * 2, 25);
    }

    // Dimensions
    drawDimensionLine(ctx, centerX - scaledLength / 2, baseY + 30, centerX + scaledLength / 2, baseY + 30, formatDim(config.length), 'horizontal', 'length', 'side');

    // Title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Side Elevation', padding, 25);
  };

  // Helper functions
  const createRoofGradient = (ctx: CanvasRenderingContext2D, x: number, y: number, height: number) => {
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, '#64748b');
    gradient.addColorStop(0.5, '#475569');
    gradient.addColorStop(1, '#334155');
    return gradient;
  };

  const drawShingleTexture = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, side: 'left' | 'right') => {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    
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
  };

  const drawDimensionLine = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, text: string, orientation: 'horizontal' | 'vertical', type?: string, view?: string) => {
    const isDarkBg = view === 'top';
    ctx.strokeStyle = isDarkBg ? 'rgba(255, 255, 255, 0.6)' : '#64748b';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Arrows
    const drawArrow = (ax: number, ay: number, dirX: number, dirY: number) => {
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(Math.atan2(dirY, dirX));
      ctx.fillStyle = isDarkBg ? 'rgba(255, 255, 255, 0.8)' : '#64748b';
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

  const handleCanvasClick = (e: React.PointerEvent<HTMLCanvasElement>, viewId: string) => {
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
        if (box.type === 'height') currentVal = config.height;

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
              [box.type]: num
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
          onPointerUp={(e) => handleCanvasClick(e, 'top')}
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
            onPointerUp={(e) => handleCanvasClick(e, 'front')}
            className="w-full bg-background rounded border border-border print:border-black print:shadow-none print:rounded-none print:scale-[0.65] print:origin-top aspect-[1.4] touch-none select-none"
          />
        </div>
        <div className="bg-muted rounded-lg p-4 border border-border print:bg-background print:border-black print:p-2 print:rounded-none print:break-inside-avoid">
          <h3 className="font-semibold text-foreground mb-3 print:mb-1 print:text-base">Side Elevation</h3>
          <canvas
            ref={sideViewRef}
            onPointerMove={(e) => handlePointerMove(e, 'side')}
            onPointerLeave={handlePointerLeave}
            onPointerUp={(e) => handleCanvasClick(e, 'side')}
            className="w-full bg-background rounded border border-border print:border-black print:shadow-none print:rounded-none print:scale-[0.65] print:origin-top aspect-[1.4] touch-none select-none"
          />
        </div>
      </div>

      {/* Specifications Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
        <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="text-xs text-blue-700 font-medium">Garage Size</div>
          <div className="text-sm font-bold text-blue-900 mt-1">{config.width}' × {config.length}'</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
          <div className="text-xs text-orange-700 font-medium">Wall Height</div>
          <div className="text-sm font-bold text-orange-900 mt-1">{config.height}' tall</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
          <div className="text-xs text-green-700 font-medium">Bays</div>
          <div className="text-sm font-bold text-green-900 mt-1">{config.bays} Bay</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
          <div className="text-xs text-purple-700 font-medium">Roof Style</div>
          <div className="text-sm font-bold text-purple-900 mt-1 capitalize">{config.roofStyle}</div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-muted rounded-lg p-4 border border-border print:hidden">
        <h4 className="text-sm font-semibold text-foreground mb-3">Drawing Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 bg-blue-400 rounded"></div>
            <span className="text-foreground">Overhead Door</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 bg-green-400 rounded"></div>
            <span className="text-foreground">Walk Door</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 bg-cyan-400 rounded"></div>
            <span className="text-foreground">Window</span>
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