import React, { useRef, useEffect, useState } from 'react';
import { DeckConfig } from '../../types/deck';

interface DeckCanvasProps {
  config: DeckConfig;
  onChange?: (config: DeckConfig) => void;
}

export function DeckCanvas({ config, onChange }: DeckCanvasProps) {
  const topViewRef = useRef<HTMLCanvasElement>(null);
  const frontViewRef = useRef<HTMLCanvasElement>(null);
  const sideViewRef = useRef<HTMLCanvasElement>(null);
  const [view3D, setView3D] = useState(false); // Default to clean designer look
  const [hoveredType, setHoveredType] = useState<'width' | 'length' | 'height' | 'lShapeWidth' | 'lShapeLength' | 'uShapeLeftWidth' | 'uShapeRightWidth' | 'uShapeDepth' | 'stairs' | null>(null);
  const [isDraggingStairs, setIsDraggingStairs] = useState(false);
  const [dragStairState, setDragStairState] = useState<{ side: 'front' | 'back' | 'left' | 'right', part: 'main' | 'l-shape' | 'u-left' | 'u-right', offset: number } | null>(null);
  
  const hitBoxesRef = useRef<{ type: 'width' | 'length' | 'height' | 'lShapeWidth' | 'lShapeLength' | 'uShapeLeftWidth' | 'uShapeRightWidth' | 'uShapeDepth' | 'stairs', x: number, y: number, w: number, h: number }[]>([]);

  useEffect(() => {
    drawTopView();
    drawFrontElevation();
    drawSideElevation();
  }, [config, view3D, hoveredType, dragStairState, isDraggingStairs]);

  const getDeckGeometry = () => {
    const baseWidth = 500;
    const baseHeight = 350;
    const padding = 60;
    let totalWidth = config.width;
    let totalLength = config.length;

    if (config.shape === 'l-shape' && config.lShapeWidth && config.lShapeLength) {
      totalWidth = config.width + config.lShapeWidth;
      totalLength = Math.max(config.length, config.lShapeLength);
    } else if (config.shape === 'u-shape') {
      totalWidth = Math.max(config.width, (config.uShapeLeftWidth || 6) + (config.uShapeRightWidth || 6));
      totalLength = config.length + (config.uShapeDepth || 8);
    }

    const scale = Math.min((baseWidth - 2 * padding) / totalWidth, (baseHeight - 2 * padding) / totalLength);
    const centerX = baseWidth / 2;
    const centerY = baseHeight / 2;
    const scaledWidth = config.width * scale;
    const scaledLength = config.length * scale;

    let baseX = centerX - scaledWidth / 2;
    let baseY = centerY - scaledLength / 2;

    if (config.shape === 'l-shape' && config.lShapeWidth && config.lShapeLength) {
      if (config.lShapePosition === 'top-left' || config.lShapePosition === 'bottom-left') {
        baseX = centerX - scaledWidth / 2;
      }
    } else if (config.shape === 'u-shape') {
      baseX = centerX - scaledWidth / 2;
      baseY = centerY - (scaledLength + ((config.uShapeDepth || 8) * scale)) / 2;
    }

    const rects: { part: 'main' | 'l-shape' | 'u-left' | 'u-right', x: number, y: number, w: number, h: number, lenFeet: number, widthFeet: number }[] = [];
    rects.push({ part: 'main', x: baseX, y: baseY, w: scaledWidth, h: scaledLength, lenFeet: config.length, widthFeet: config.width });

    if (config.shape === 'l-shape' && config.lShapeWidth && config.lShapeLength) {
      const lw = config.lShapeWidth * scale;
      const ll = config.lShapeLength * scale;
      switch (config.lShapePosition || 'top-left') {
        case 'top-right': rects.push({ part: 'l-shape', x: baseX + scaledWidth, y: baseY, w: lw, h: ll, lenFeet: config.lShapeLength, widthFeet: config.lShapeWidth }); break;
        case 'bottom-right': rects.push({ part: 'l-shape', x: baseX + scaledWidth, y: baseY + scaledLength - ll, w: lw, h: ll, lenFeet: config.lShapeLength, widthFeet: config.lShapeWidth }); break;
        case 'bottom-left': rects.push({ part: 'l-shape', x: baseX - lw, y: baseY + scaledLength - ll, w: lw, h: ll, lenFeet: config.lShapeLength, widthFeet: config.lShapeWidth }); break;
        case 'top-left': default: rects.push({ part: 'l-shape', x: baseX - lw, y: baseY, w: lw, h: ll, lenFeet: config.lShapeLength, widthFeet: config.lShapeWidth }); break;
      }
    } else if (config.shape === 'u-shape') {
      const ul = (config.uShapeLeftWidth || 6) * scale;
      const ur = (config.uShapeRightWidth || 6) * scale;
      const ud = (config.uShapeDepth || 8) * scale;
      rects.push({ part: 'u-left', x: baseX, y: baseY + scaledLength, w: ul, h: ud, lenFeet: config.uShapeDepth || 8, widthFeet: config.uShapeLeftWidth || 6 });
      rects.push({ part: 'u-right', x: baseX + scaledWidth - ur, y: baseY + scaledLength, w: ur, h: ud, lenFeet: config.uShapeDepth || 8, widthFeet: config.uShapeRightWidth || 6 });
    }

    return { scale, baseX, baseY, scaledWidth, scaledLength, baseWidth, baseHeight, rects };
  };

  const drawTopView = () => {
    const canvas = topViewRef.current;
    if (!canvas) return;

    hitBoxesRef.current = [];

    const scaleFactor = window.devicePixelRatio || 2;
    const { scale, baseX, baseY, scaledWidth, scaledLength, baseWidth, baseHeight, rects } = getDeckGeometry();
    
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
    const size = 30;
    for (let i = -30; i < 30; i++) {
      for (let j = -30; j < 30; j++) {
        if ((i + j) % 2 === 0) {
          ctx.fillRect(i * size, j * size, size, size);
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
    const drawPillBadge = (x: number, y: number, text: string, iconType: 'pencil' | 'height', rotate: boolean = false, type?: 'width' | 'length' | 'height' | 'lShapeWidth' | 'lShapeLength' | 'uShapeLeftWidth' | 'uShapeRightWidth' | 'uShapeDepth') => {
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
      ctx.roundRect(-width / 2, -height / 2, width, height, height / 2);
      ctx.fill();
      if (type && hoveredType === type) {
        ctx.stroke();
      }

      // Reset shadow
      ctx.shadowColor = 'transparent';

      // Icon
      ctx.fillStyle = '#64748b';
      ctx.strokeStyle = '#64748b';
      if (iconType === 'pencil') {
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
    const drawStyledDimLine = (x1: number, y1: number, x2: number, y2: number, text: string, rotate: boolean, type: 'width' | 'length' | 'lShapeWidth' | 'lShapeLength' | 'uShapeLeftWidth' | 'uShapeRightWidth' | 'uShapeDepth') => {
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

    // Function to draw a single deck rectangle with styling
    const drawDeckSection = (rx: number, ry: number, rw: number, rh: number) => {
      // Fascia/Border (Rim joists)
      const borderWidth = 6;
      ctx.fillStyle = '#8f9390';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#5a5d5a';
      ctx.lineWidth = 1;
      ctx.strokeRect(rx, ry, rw, rh);

      // Deck Surface
      const ix = rx + borderWidth;
      const iy = ry + borderWidth;
      const iw = rw - borderWidth * 2;
      const ih = rh - borderWidth * 2;

      ctx.fillStyle = '#a69f94';
      ctx.fillRect(ix, iy, iw, ih);

      // Horizontal Boards
      ctx.strokeStyle = '#5a544b';
      ctx.lineWidth = 0.5;
      const boardSpacing = 6;
      for (let by = iy + boardSpacing; by < iy + ih; by += boardSpacing) {
        ctx.beginPath();
        ctx.moveTo(ix, by);
        ctx.lineTo(ix + iw, by);
        ctx.stroke();
      }

      // Draw Posts (Corners and midpoints)
      const postSize = 10;
      const drawPost = (px: number, py: number) => {
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - postSize / 2, py - postSize / 2, postSize, postSize);
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.strokeRect(px - postSize / 2, py - postSize / 2, postSize, postSize);
        
        // Inner circle detail
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.stroke();
      };

      // Corner posts
      drawPost(rx + borderWidth / 2, ry + borderWidth / 2);
      drawPost(rx + rw - borderWidth / 2, ry + borderWidth / 2);
      drawPost(rx + borderWidth / 2, ry + rh - borderWidth / 2);
      drawPost(rx + rw - borderWidth / 2, ry + rh - borderWidth / 2);

      // Mid posts for long spans
      if (rw > 100) {
        drawPost(rx + rw / 2, ry + borderWidth / 2);
        drawPost(rx + rw / 2, ry + rh - borderWidth / 2);
      }
      if (rh > 100) {
        drawPost(rx + borderWidth / 2, ry + rh / 2);
        drawPost(rx + rw - borderWidth / 2, ry + rh / 2);
      }
    };

    // 2. Draw Deck Shape
    if (config.shape === 'l-shape' && config.lShapeWidth && config.lShapeLength) {
      const lShapePixelWidth = config.lShapeWidth * scale;
      const lShapePixelLength = config.lShapeLength * scale;
      
      drawDeckSection(baseX, baseY, scaledWidth, scaledLength);
      
      switch (config.lShapePosition || 'top-left') {
        case 'top-right': drawDeckSection(baseX + scaledWidth, baseY, lShapePixelWidth, lShapePixelLength); break;
        case 'bottom-right': drawDeckSection(baseX + scaledWidth, baseY + scaledLength - lShapePixelLength, lShapePixelWidth, lShapePixelLength); break;
        case 'bottom-left': drawDeckSection(baseX - lShapePixelWidth, baseY + scaledLength - lShapePixelLength, lShapePixelWidth, lShapePixelLength); break;
        case 'top-left': default: drawDeckSection(baseX - lShapePixelWidth, baseY, lShapePixelWidth, lShapePixelLength); break;
      }
    } else if (config.shape === 'u-shape') {
      const uLeft = (config.uShapeLeftWidth || 6) * scale;
      const uRight = (config.uShapeRightWidth || 6) * scale;
      const uDepth = (config.uShapeDepth || 8) * scale;
      
      drawDeckSection(baseX, baseY, scaledWidth, scaledLength); // Main body
      drawDeckSection(baseX, baseY + scaledLength, uLeft, uDepth); // Left arm
      drawDeckSection(baseX + scaledWidth - uRight, baseY + scaledLength, uRight, uDepth); // Right arm
    } else {
      drawDeckSection(baseX, baseY, scaledWidth, scaledLength);
    }

    // Draw Stairs in Top View
    if (config.hasStairs) {
      const activeSide = isDraggingStairs && dragStairState ? dragStairState.side : (config.stairSide || 'front');
      const activePart = isDraggingStairs && dragStairState ? dragStairState.part : (config.stairPart || 'main');
      
      const activeRect = rects.find(r => r.part === activePart) || rects[0];
      const sideLength = (activeSide === 'front' || activeSide === 'back') ? activeRect.widthFeet : activeRect.lenFeet;
      
      let activeOffsetFeet = (sideLength - (config.stairWidth || 4)) / 2; // Default center
      if (isDraggingStairs && dragStairState) {
        activeOffsetFeet = dragStairState.offset;
      } else if (config.stairOffset !== undefined) {
        activeOffsetFeet = config.stairOffset;
      }
      
      // Clamp offset to keep stairs on the deck edge
      activeOffsetFeet = Math.max(0, Math.min(activeOffsetFeet, sideLength - (config.stairWidth || 4)));

      const offsetPx = activeOffsetFeet * scale;
      const sw = (config.stairWidth || 4) * scale;
      const sd = 4 * scale; // 4ft deep stairs

      let sx = 0, sy = 0, sWidth = 0, sHeight = 0;
      
      if (activeSide === 'front') {
        sx = activeRect.x + offsetPx;
        sy = activeRect.y + activeRect.h;
        sWidth = sw;
        sHeight = sd;
      } else if (activeSide === 'back') {
        sx = activeRect.x + offsetPx;
        sy = activeRect.y - sd;
        sWidth = sw;
        sHeight = sd;
      } else if (activeSide === 'left') {
        sx = activeRect.x - sd;
        sy = activeRect.y + offsetPx;
        sWidth = sd;
        sHeight = sw;
      } else if (activeSide === 'right') {
        sx = activeRect.x + activeRect.w;
        sy = activeRect.y + offsetPx;
        sWidth = sd;
        sHeight = sw;
      }

      ctx.save();
      ctx.fillStyle = isDraggingStairs ? 'rgba(168, 85, 247, 0.6)' : '#c084fc';
      ctx.strokeStyle = '#9333ea';
      ctx.lineWidth = 1;
      
      // Shadow if hovered
      if (hoveredType === 'stairs' && !isDraggingStairs) {
        ctx.shadowColor = 'rgba(147, 51, 234, 0.5)';
        ctx.shadowBlur = 8;
      }
      
      ctx.fillRect(sx, sy, sWidth, sHeight);
      ctx.strokeRect(sx, sy, sWidth, sHeight);

      // Draw stair treads
      ctx.strokeStyle = '#a855f7';
      ctx.beginPath();
      const numTreads = 4;
      if (activeSide === 'front' || activeSide === 'back') {
        for (let i = 1; i < numTreads; i++) {
          const stepY = sy + (sHeight * i) / numTreads;
          ctx.moveTo(sx, stepY);
          ctx.lineTo(sx + sWidth, stepY);
        }
      } else {
        for (let i = 1; i < numTreads; i++) {
          const stepX = sx + (sWidth * i) / numTreads;
          ctx.moveTo(stepX, sy);
          ctx.lineTo(stepX, sy + sHeight);
        }
      }
      ctx.stroke();
      ctx.restore();

      hitBoxesRef.current.push({
        type: 'stairs',
        x: sx,
        y: sy,
        w: sWidth,
        h: sHeight
      });
    }

    // 3. Draw External Dimension Lines & Pills
    const dimOffset = 30;

    if (config.shape === 'l-shape' && config.lShapeWidth && config.lShapeLength) {
      const lShapePixelWidth = config.lShapeWidth * scale;
      const lShapePixelLength = config.lShapeLength * scale;

      if (config.lShapePosition === 'top-left' || !config.lShapePosition) {
        // Main Width
        drawStyledDimLine(baseX, baseY - dimOffset, baseX + scaledWidth, baseY - dimOffset, formatDim(config.width), false, 'width');
        // L-Shape Width
        drawStyledDimLine(baseX - lShapePixelWidth, baseY - dimOffset, baseX, baseY - dimOffset, formatDim(config.lShapeWidth), false, 'lShapeWidth');
        // L-Shape Length
        drawStyledDimLine(baseX - lShapePixelWidth - dimOffset, baseY, baseX - lShapePixelWidth - dimOffset, baseY + lShapePixelLength, formatDim(config.lShapeLength), true, 'lShapeLength');
        // Main Length
        drawStyledDimLine(baseX + scaledWidth + dimOffset, baseY, baseX + scaledWidth + dimOffset, baseY + scaledLength, formatDim(config.length), true, 'length');
      } else if (config.lShapePosition === 'bottom-left') {
        // Main Width
        drawStyledDimLine(baseX, baseY - dimOffset, baseX + scaledWidth, baseY - dimOffset, formatDim(config.width), false, 'width');
        // L-Shape Width
        drawStyledDimLine(baseX - lShapePixelWidth, baseY + scaledLength + dimOffset, baseX, baseY + scaledLength + dimOffset, formatDim(config.lShapeWidth), false, 'lShapeWidth');
        // L-Shape Length
        drawStyledDimLine(baseX - lShapePixelWidth - dimOffset, baseY + scaledLength - lShapePixelLength, baseX - lShapePixelWidth - dimOffset, baseY + scaledLength, formatDim(config.lShapeLength), true, 'lShapeLength');
        // Main Length
        drawStyledDimLine(baseX + scaledWidth + dimOffset, baseY, baseX + scaledWidth + dimOffset, baseY + scaledLength, formatDim(config.length), true, 'length');
      } else if (config.lShapePosition === 'top-right') {
        // Main Width
        drawStyledDimLine(baseX, baseY - dimOffset, baseX + scaledWidth, baseY - dimOffset, formatDim(config.width), false, 'width');
        // L-Shape Width
        drawStyledDimLine(baseX + scaledWidth, baseY - dimOffset, baseX + scaledWidth + lShapePixelWidth, baseY - dimOffset, formatDim(config.lShapeWidth), false, 'lShapeWidth');
        // L-Shape Length
        drawStyledDimLine(baseX + scaledWidth + lShapePixelWidth + dimOffset, baseY, baseX + scaledWidth + lShapePixelWidth + dimOffset, baseY + lShapePixelLength, formatDim(config.lShapeLength), true, 'lShapeLength');
        // Main Length
        drawStyledDimLine(baseX - dimOffset, baseY, baseX - dimOffset, baseY + scaledLength, formatDim(config.length), true, 'length');
      } else if (config.lShapePosition === 'bottom-right') {
        // Main Width
        drawStyledDimLine(baseX, baseY - dimOffset, baseX + scaledWidth, baseY - dimOffset, formatDim(config.width), false, 'width');
        // L-Shape Width
        drawStyledDimLine(baseX + scaledWidth, baseY + scaledLength + dimOffset, baseX + scaledWidth + lShapePixelWidth, baseY + scaledLength + dimOffset, formatDim(config.lShapeWidth), false, 'lShapeWidth');
        // L-Shape Length
        drawStyledDimLine(baseX + scaledWidth + lShapePixelWidth + dimOffset, baseY + scaledLength - lShapePixelLength, baseX + scaledWidth + lShapePixelWidth + dimOffset, baseY + scaledLength, formatDim(config.lShapeLength), true, 'lShapeLength');
        // Main Length
        drawStyledDimLine(baseX - dimOffset, baseY, baseX - dimOffset, baseY + scaledLength, formatDim(config.length), true, 'length');
      }

    } else if (config.shape === 'u-shape') {
      const uLeft = (config.uShapeLeftWidth || 6) * scale;
      const uRight = (config.uShapeRightWidth || 6) * scale;
      const uDepth = (config.uShapeDepth || 8) * scale;
      
      // Top Dimension (Main Width)
      drawStyledDimLine(baseX, baseY - dimOffset, baseX + scaledWidth, baseY - dimOffset, formatDim(config.width), false, 'width');
      
      // Bottom Left Width
      drawStyledDimLine(baseX, baseY + scaledLength + uDepth + dimOffset, baseX + uLeft, baseY + scaledLength + uDepth + dimOffset, formatDim(config.uShapeLeftWidth || 6), false, 'uShapeLeftWidth');
      // Bottom Right Width
      drawStyledDimLine(baseX + scaledWidth - uRight, baseY + scaledLength + uDepth + dimOffset, baseX + scaledWidth, baseY + scaledLength + uDepth + dimOffset, formatDim(config.uShapeRightWidth || 6), false, 'uShapeRightWidth');
      
      // Depth
      drawStyledDimLine(baseX - dimOffset, baseY + scaledLength, baseX - dimOffset, baseY + scaledLength + uDepth, formatDim(config.uShapeDepth || 8), true, 'uShapeDepth');
      
      // Main Length
      drawStyledDimLine(baseX + scaledWidth + dimOffset, baseY, baseX + scaledWidth + dimOffset, baseY + scaledLength, formatDim(config.length), true, 'length');
    } else {
      // Top Dimension (Width)
      drawStyledDimLine(baseX, baseY - dimOffset, baseX + scaledWidth, baseY - dimOffset, formatDim(config.width), false, 'width');
      // Bottom Dimension (Width)
      drawStyledDimLine(baseX, baseY + scaledLength + dimOffset, baseX + scaledWidth, baseY + scaledLength + dimOffset, formatDim(config.width), false, 'width');
      // Left Dimension (Length)
      drawStyledDimLine(baseX - dimOffset, baseY, baseX - dimOffset, baseY + scaledLength, formatDim(config.length), true, 'length');
      // Right Dimension (Length)
      drawStyledDimLine(baseX + scaledWidth + dimOffset, baseY, baseX + scaledWidth + dimOffset, baseY + scaledLength, formatDim(config.length), true, 'length');
    }

    // Center Height Pill
    drawPillBadge(baseX + scaledWidth / 2, baseY + scaledLength / 2, `Height ${config.height}' 0"`, 'height', false, 'height');
  };

  const drawFrontElevation = () => {
    const canvas = frontViewRef.current;
    if (!canvas) return;

    const scaleFactor = window.devicePixelRatio || 2;
    const baseWidth = 350;
    const baseHeight = 250;

    // High resolution setup
    canvas.width = baseWidth * scaleFactor;
    canvas.height = baseHeight * scaleFactor;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw blueprint background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.scale(scaleFactor, scaleFactor);
    
    // Draw grid
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

    const scale = Math.min((width - 2 * padding) / config.width, (height - 2 * padding) / 15);

    const centerX = width / 2;
    const baseY = height - padding - 10;
    const scaledWidth = config.width * scale;
    const deckHeightScaled = config.height * scale;
    const railingHeight = ((config.railingHeight || 42) / 12) * scale;

    // Ground line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(centerX - scaledWidth / 2 - 30, baseY + 10);
    ctx.lineTo(centerX + scaledWidth / 2 + 30, baseY + 10);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Ground Level', centerX - scaledWidth / 2 - 30, baseY + 25);

    // Draw support posts with realistic detail
    const numPosts = Math.ceil(config.width / 6) + 1;
    
    for (let i = 0; i < numPosts; i++) {
      const postX = centerX - scaledWidth / 2 + (i * (scaledWidth / (numPosts - 1)));
      const postWidth = 12;
      
      // Post gradient for 3D effect
      const postGradient = ctx.createLinearGradient(postX - postWidth / 2, 0, postX + postWidth / 2, 0);
      postGradient.addColorStop(0, '#92400e');
      postGradient.addColorStop(0.5, '#b45309');
      postGradient.addColorStop(1, '#78350f');
      
      ctx.fillStyle = postGradient;
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1;
      ctx.fillRect(postX - postWidth / 2, baseY - deckHeightScaled, postWidth, deckHeightScaled);
      ctx.strokeRect(postX - postWidth / 2, baseY - deckHeightScaled, postWidth, deckHeightScaled);
      
      // Wood grain effect
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 0.5;
      for (let g = 0; g < 4; g++) {
        const grainY = baseY - deckHeightScaled + (g * deckHeightScaled / 4);
        ctx.beginPath();
        ctx.moveTo(postX - postWidth / 2, grainY);
        ctx.lineTo(postX + postWidth / 2, grainY);
        ctx.stroke();
      }
    }

    // Draw deck surface with thickness
    const deckThickness = 16;
    const deckGradient = ctx.createLinearGradient(0, baseY - deckHeightScaled - deckThickness, 0, baseY - deckHeightScaled);
    deckGradient.addColorStop(0, '#c4b5a0');
    deckGradient.addColorStop(0.5, '#a89a85');
    deckGradient.addColorStop(1, '#8b7d6b');
    
    ctx.fillStyle = deckGradient;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.fillRect(centerX - scaledWidth / 2, baseY - deckHeightScaled - deckThickness, scaledWidth, deckThickness);
    ctx.strokeRect(centerX - scaledWidth / 2, baseY - deckHeightScaled - deckThickness, scaledWidth, deckThickness);

    // Deck board lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    const boardSpacing = scale * 0.15;
    for (let x = centerX - scaledWidth / 2; x < centerX + scaledWidth / 2; x += boardSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, baseY - deckHeightScaled - deckThickness);
      ctx.lineTo(x, baseY - deckHeightScaled);
      ctx.stroke();
    }

    // Draw railings with balusters
    if (config.railingStyle !== 'None' && config.railingSides && (config.railingSides.includes('front') || config.railingSides.includes('back'))) {
      const balusterWidth = 4;
      const balusterSpacing = scale * 0.4;
      const numBalusters = Math.floor(scaledWidth / balusterSpacing);
      
      // Balusters
      for (let i = 0; i <= numBalusters; i++) {
        const balusterX = centerX - scaledWidth / 2 + (i * balusterSpacing);
        
        const balusterGradient = ctx.createLinearGradient(balusterX - balusterWidth / 2, 0, balusterX + balusterWidth / 2, 0);
        balusterGradient.addColorStop(0, '#7c3aed');
        balusterGradient.addColorStop(0.5, '#9333ea');
        balusterGradient.addColorStop(1, '#6d28d9');
        
        ctx.fillStyle = balusterGradient;
        ctx.strokeStyle = '#4c1d95';
        ctx.lineWidth = 1;
        ctx.fillRect(
          balusterX - balusterWidth / 2,
          baseY - deckHeightScaled - deckThickness - railingHeight,
          balusterWidth,
          railingHeight
        );
        ctx.strokeRect(
          balusterX - balusterWidth / 2,
          baseY - deckHeightScaled - deckThickness - railingHeight,
          balusterWidth,
          railingHeight
        );
      }
      
      // Top rail
      ctx.fillStyle = '#6d28d9';
      ctx.strokeStyle = '#4c1d95';
      ctx.lineWidth = 2;
      ctx.fillRect(
        centerX - scaledWidth / 2,
        baseY - deckHeightScaled - deckThickness - railingHeight - 6,
        scaledWidth,
        6
      );
      ctx.strokeRect(
        centerX - scaledWidth / 2,
        baseY - deckHeightScaled - deckThickness - railingHeight - 6,
        scaledWidth,
        6
      );
      
      // Bottom rail
      ctx.fillRect(
        centerX - scaledWidth / 2,
        baseY - deckHeightScaled - deckThickness - railingHeight / 2,
        scaledWidth,
        4
      );
      ctx.strokeRect(
        centerX - scaledWidth / 2,
        baseY - deckHeightScaled - deckThickness - railingHeight / 2,
        scaledWidth,
        4
      );
    }

    // Height dimension
    drawDimensionLine(ctx, centerX + scaledWidth / 2 + 25, baseY, centerX + scaledWidth / 2 + 25, baseY - deckHeightScaled, `${config.height}' Height`, 'vertical');
  };

  const drawSideElevation = () => {
    const canvas = sideViewRef.current;
    if (!canvas) return;

    const scaleFactor = window.devicePixelRatio || 2;
    const baseWidth = 350;
    const baseHeight = 250;

    // High resolution setup
    canvas.width = baseWidth * scaleFactor;
    canvas.height = baseHeight * scaleFactor;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw blueprint background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.scale(scaleFactor, scaleFactor);
    
    // Draw grid
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

    const scale = Math.min((width - 2 * padding) / config.length, (height - 2 * padding) / 15);

    const centerX = width / 2;
    const baseY = height - padding - 10;
    const scaledLength = config.length * scale;
    const deckHeightScaled = config.height * scale;
    const railingHeight = ((config.railingHeight || 42) / 12) * scale;

    // Ground line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(centerX - scaledLength / 2 - 30, baseY + 10);
    ctx.lineTo(centerX + scaledLength / 2 + 30, baseY + 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // Support posts
    const numPosts = Math.ceil(config.length / 8) + 1;
    
    for (let i = 0; i < numPosts; i++) {
      const postX = centerX - scaledLength / 2 + (i * (scaledLength / (numPosts - 1)));
      const postWidth = 12;
      
      const postGradient = ctx.createLinearGradient(postX - postWidth / 2, 0, postX + postWidth / 2, 0);
      postGradient.addColorStop(0, '#92400e');
      postGradient.addColorStop(0.5, '#b45309');
      postGradient.addColorStop(1, '#78350f');
      
      ctx.fillStyle = postGradient;
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1;
      ctx.fillRect(postX - postWidth / 2, baseY - deckHeightScaled, postWidth, deckHeightScaled);
      ctx.strokeRect(postX - postWidth / 2, baseY - deckHeightScaled, postWidth, deckHeightScaled);
    }

    // Deck surface
    const deckThickness = 16;
    ctx.fillStyle = '#a89a85';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.fillRect(centerX - scaledLength / 2, baseY - deckHeightScaled - deckThickness, scaledLength, deckThickness);
    ctx.strokeRect(centerX - scaledLength / 2, baseY - deckHeightScaled - deckThickness, scaledLength, deckThickness);

    // Railing end view
    if (config.railingStyle !== 'None' && config.railingSides && (config.railingSides.includes('left') || config.railingSides.includes('right'))) {
      ctx.fillStyle = '#7c3aed';
      ctx.strokeStyle = '#4c1d95';
      ctx.lineWidth = 2;
      
      // Railing post
      ctx.fillRect(
        centerX - scaledLength / 2 - 8,
        baseY - deckHeightScaled - deckThickness - railingHeight,
        8,
        railingHeight
      );
      ctx.strokeRect(
        centerX - scaledLength / 2 - 8,
        baseY - deckHeightScaled - deckThickness - railingHeight,
        8,
        railingHeight
      );
    }
    
    // Length dimension
    drawDimensionLine(ctx, centerX - scaledLength / 2, baseY + 30, centerX + scaledLength / 2, baseY + 30, `${config.length}'`, 'horizontal');
  };

  // Helper functions
  const createWoodGradient = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    
    switch (config.deckingType) {
      case 'Composite':
        gradient.addColorStop(0, '#7c8a9f');
        gradient.addColorStop(0.3, '#94a3b8');
        gradient.addColorStop(0.6, '#64748b');
        gradient.addColorStop(1, '#52606f');
        break;
      case 'Cedar':
        gradient.addColorStop(0, '#e0b684');
        gradient.addColorStop(0.3, '#d4a574');
        gradient.addColorStop(0.6, '#b8956a');
        gradient.addColorStop(1, '#a0855e');
        break;
      case 'Redwood':
        gradient.addColorStop(0, '#d88f6a');
        gradient.addColorStop(0.3, '#c87f5a');
        gradient.addColorStop(0.6, '#a86f4f');
        gradient.addColorStop(1, '#8f5f45');
        break;
      default: // Treated
        gradient.addColorStop(0, '#d5c5b0');
        gradient.addColorStop(0.3, '#c4b5a0');
        gradient.addColorStop(0.6, '#a89a85');
        gradient.addColorStop(1, '#938870');
    }
    
    return gradient;
  };

  const addShadow = (ctx: CanvasRenderingContext2D, intensity: number = 0.3) => {
    ctx.shadowColor = `rgba(0, 0, 0, ${intensity})`;
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
  };

  const clearShadow = (ctx: CanvasRenderingContext2D) => {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  };

  const drawDimensionLine = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, text: string, orientation: 'horizontal' | 'vertical') => {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
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
    
    ctx.fillStyle = '#334155';
    ctx.font = '500 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    if (orientation === 'horizontal') {
      ctx.fillText(text, (x1 + x2) / 2, y1 - 8);
    } else {
      ctx.save();
      ctx.translate(x1 + 15, (y1 + y2) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  };

  const drawCompassRose = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const size = 15;
    
    ctx.strokeStyle = '#334155';
    ctx.fillStyle = '#334155';
    ctx.lineWidth = 1.5;
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x - 3, y - size + 8);
    ctx.lineTo(x + 3, y - size + 8);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#334155';
    ctx.font = '600 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', x, y - size - 6);
    ctx.fillText('S', x, y + size + 6);
    ctx.fillText('E', x + size + 6, y);
    ctx.fillText('W', x - size - 6, y);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!onChange || !config.hasStairs) return;
    const canvas = topViewRef.current;
    if (!canvas) return;

    // Optional: capture pointer to continue receiving events even if pointer leaves canvas bounds
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const scaleX = 500 / rect.width;
    const scaleY = 350 / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    for (const box of hitBoxesRef.current) {
      if (box.type === 'stairs' && x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
        setIsDraggingStairs(true);
        // Start dragging at the current configuration state
        const { rects } = getDeckGeometry();
        const activePart = config.stairPart || 'main';
        const activeRect = rects.find(r => r.part === activePart) || rects[0];
        const sideLength = (config.stairSide === 'front' || config.stairSide === 'back') ? activeRect.widthFeet : activeRect.lenFeet;
        
        setDragStairState({
          side: config.stairSide || 'front',
          part: activePart,
          offset: config.stairOffset !== undefined ? config.stairOffset : (sideLength - (config.stairWidth || 4)) / 2
        });
        break;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Release pointer capture
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    if (isDraggingStairs && dragStairState && onChange) {
      setIsDraggingStairs(false);
      onChange({
        ...config,
        stairSide: dragStairState.side,
        stairPart: dragStairState.part,
        stairOffset: dragStairState.offset
      });
      setDragStairState(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!onChange) return;
    const canvas = topViewRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = 500 / rect.width;
    const scaleY = 350 / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (isDraggingStairs) {
      const { scale, rects } = getDeckGeometry();
      
      let closestDist = Infinity;
      let bestMatch: { part: 'main' | 'l-shape' | 'u-left' | 'u-right', side: 'front' | 'back' | 'left' | 'right', offsetPx: number, sideLengthPx: number } | null = null;

      const stairWidthPx = (config.stairWidth || 4) * scale;

      rects.forEach(r => {
        // front: y = r.y + r.h
        const distFront = Math.abs(y - (r.y + r.h));
        if (distFront < closestDist) {
          closestDist = distFront;
          bestMatch = { part: r.part, side: 'front', offsetPx: x - r.x - stairWidthPx / 2, sideLengthPx: r.w };
        }
        // back: y = r.y
        const distBack = Math.abs(y - r.y);
        if (distBack < closestDist) {
          closestDist = distBack;
          bestMatch = { part: r.part, side: 'back', offsetPx: x - r.x - stairWidthPx / 2, sideLengthPx: r.w };
        }
        // left: x = r.x
        const distLeft = Math.abs(x - r.x);
        if (distLeft < closestDist) {
          closestDist = distLeft;
          bestMatch = { part: r.part, side: 'left', offsetPx: y - r.y - stairWidthPx / 2, sideLengthPx: r.h };
        }
        // right: x = r.x + r.w
        const distRight = Math.abs(x - (r.x + r.w));
        if (distRight < closestDist) {
          closestDist = distRight;
          bestMatch = { part: r.part, side: 'right', offsetPx: y - r.y - stairWidthPx / 2, sideLengthPx: r.h };
        }
      });

      if (bestMatch) {
        const match = bestMatch as any;
        let clampedOffsetPx = Math.max(0, Math.min(match.offsetPx, match.sideLengthPx - stairWidthPx));
        setDragStairState({
          side: match.side,
          part: match.part,
          offset: clampedOffsetPx / scale
        });
      }

      return; // Skip hover logic while dragging
    }

    let hovering: typeof hoveredType = null;
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

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onChange) return;
    const canvas = topViewRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = 500 / rect.width;
    const scaleY = 350 / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    for (const box of hitBoxesRef.current) {
      if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
        let currentVal = config.width;
        if (box.type === 'length') currentVal = config.length;
        if (box.type === 'height') currentVal = config.height;
        if (box.type === 'lShapeWidth') currentVal = config.lShapeWidth || 6;
        if (box.type === 'lShapeLength') currentVal = config.lShapeLength || 8;
        if (box.type === 'uShapeLeftWidth') currentVal = config.uShapeLeftWidth || 6;
        if (box.type === 'uShapeRightWidth') currentVal = config.uShapeRightWidth || 6;
        if (box.type === 'uShapeDepth') currentVal = config.uShapeDepth || 8;
        
        const labelMap: Record<string, string> = {
          width: 'Main Width',
          length: 'Main Length',
          height: 'Height',
          lShapeWidth: 'L-Shape Width',
          lShapeLength: 'L-Shape Length',
          uShapeLeftWidth: 'U-Shape Left Arm Width',
          uShapeRightWidth: 'U-Shape Right Arm Width',
          uShapeDepth: 'U-Shape Depth',
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
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMove={handlePointerMove}
          onPointerLeave={(e) => {
            setHoveredType(null);
            handlePointerUp(e);
          }}
          onClick={handleCanvasClick}
          className="w-full bg-background rounded border border-border print:border-black print:shadow-none print:rounded-none print:scale-[0.65] print:origin-top aspect-[1.4] touch-none select-none"
        />
      </div>

      {/* Elevation Views */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2 print:grid-cols-2 print:break-inside-avoid">
        <div className="bg-muted rounded-lg p-4 border border-border print:bg-background print:border-black print:p-2 print:rounded-none print:break-inside-avoid">
          <h3 className="font-semibold text-foreground mb-3 print:mb-1 print:text-base">Front Elevation</h3>
          <canvas
            ref={frontViewRef}
            className="w-full bg-background rounded border border-border print:border-black print:shadow-none print:rounded-none print:scale-[0.65] print:origin-top aspect-[1.4]"
          />
        </div>
        <div className="bg-muted rounded-lg p-4 border border-border print:bg-background print:border-black print:p-2 print:rounded-none print:break-inside-avoid">
          <h3 className="font-semibold text-foreground mb-3 print:mb-1 print:text-base">Side Elevation</h3>
          <canvas
            ref={sideViewRef}
            className="w-full bg-background rounded border border-border print:border-black print:shadow-none print:rounded-none print:scale-[0.65] print:origin-top aspect-[1.4]"
          />
        </div>
      </div>

      {/* Specifications Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
        <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
          <div className="text-xs text-foreground font-medium">Deck Size</div>
          <div className="text-sm font-bold text-foreground mt-1">{config.width}' × {config.length}'</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="text-xs text-foreground font-medium">Height</div>
          <div className="text-sm font-bold text-foreground mt-1">{config.height}' from ground</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
          <div className="text-xs text-foreground font-medium">Decking Type</div>
          <div className="text-sm font-bold text-foreground mt-1">{config.deckingType}</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
          <div className="text-xs text-foreground font-medium">Pattern</div>
          <div className="text-sm font-bold text-foreground mt-1 capitalize">{config.deckingPattern}</div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-muted rounded-lg p-4 border border-border print:hidden mt-6">
        <h4 className="font-semibold text-foreground mb-3">Drawing Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 bg-purple-600 rounded"></div>
            <span className="text-foreground">Railing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 bg-amber-800 rounded"></div>
            <span className="text-foreground">Support Posts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 bg-purple-400 rounded"></div>
            <span className="text-foreground">Stairs</span>
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