import React, { useRef, useEffect, useState, useCallback } from 'react';
import { KitchenConfig, PlacedCabinet, CabinetItem } from '../../types/kitchen';
import { Button } from '../ui/button';
import { ZoomIn, ZoomOut, Grid3x3, Eye, EyeOff, Trash2, Move, RotateCw, RotateCcw, Box, GripHorizontal } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface KitchenCanvasProps {
  config: KitchenConfig;
  selectedCabinet: PlacedCabinet | null;
  onSelectCabinet: (cabinet: PlacedCabinet | null) => void;
  onUpdateCabinet: (id: string, updates: Partial<PlacedCabinet>) => void;
  onUpdateAppliance?: (id: string, updates: Partial<any>) => void;
  onDeleteCabinet: (id: string) => void;
  onAddCabinet: (cabinet: PlacedCabinet) => void;
  onAddAppliance?: (appliance: any, x: number, y: number) => void;
  onUpdateConfig?: (updates: Partial<KitchenConfig>) => void;
}

export function KitchenCanvas({
  config,
  selectedCabinet,
  onSelectCabinet,
  onUpdateCabinet,
  onUpdateAppliance,
  onDeleteCabinet,
  onAddCabinet,
  onAddAppliance,
  onUpdateConfig,
}: KitchenCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCabinet, setHoveredCabinet] = useState<PlacedCabinet | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ type: 'cabinet' | 'appliance'; id: string } | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [rotatingItem, setRotatingItem] = useState<{ type: 'cabinet' | 'appliance'; id: string } | null>(null);
  const [selectedAppliance, setSelectedAppliance] = useState<any | null>(null);
  const [rotationStartAngle, setRotationStartAngle] = useState<number>(0);
  const [initialRotation, setInitialRotation] = useState<number>(0);

  // Floating Toolbar State
  const [toolbarPos, setToolbarPos] = useState({ x: 16, y: 16 });
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
  const toolbarDragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

  const PIXELS_PER_INCH = 4; // Scale factor

  // Snap to grid helper function with boundary awareness
  const snapToGrid = (value: number, isXCoord: boolean = true, itemWidth: number = 0, itemDepth: number = 0) => {
    if (!config.snapToGrid) return value;
    const gridSize = config.gridSize || 6; // Default 6 inches
    const snappedValue = Math.round(value / gridSize) * gridSize;
    
    // Ensure the item stays within room boundaries
    const maxX = config.roomWidth * 12 - itemWidth; // Room width in inches minus item width
    const maxY = config.roomLength * 12 - itemDepth; // Room length in inches minus item depth
    
    if (isXCoord) {
      return Math.max(0, Math.min(snappedValue, maxX));
    } else {
      return Math.max(0, Math.min(snappedValue, maxY));
    }
  };

  useEffect(() => {
    let frameId: number;
    const render = () => {
      drawCanvas();
    };
    frameId = requestAnimationFrame(render);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [config, zoom, selectedCabinet, hoveredCabinet, selectedAppliance]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingToolbar) return;
      
      const dx = e.clientX - toolbarDragStartRef.current.x;
      const dy = e.clientY - toolbarDragStartRef.current.y;
      
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Keep within bounds somewhat roughly
        const maxX = rect.width - 100;
        const maxY = rect.height - 40;
        
        setToolbarPos({
          x: Math.max(0, Math.min(toolbarDragStartRef.current.startX + dx, maxX)),
          y: Math.max(0, Math.min(toolbarDragStartRef.current.startY + dy, maxY))
        });
      } else {
        setToolbarPos({
          x: Math.max(0, toolbarDragStartRef.current.startX + dx),
          y: Math.max(0, toolbarDragStartRef.current.startY + dy)
        });
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDraggingToolbar(false);
    };

    if (isDraggingToolbar) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDraggingToolbar]);

  const handleToolbarDragStart = (e: React.MouseEvent) => {
    // Only drag if clicking on the background or drag handle, not interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('label')) return;
    
    setIsDraggingToolbar(true);
    toolbarDragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: toolbarPos.x,
      startY: toolbarPos.y
    };
  };

  const drawCanvas = () => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Apply zoom
      ctx.scale(zoom, zoom);

      // Draw room outline
      drawRoom(ctx);

      // Draw grid if enabled
      if (config.showGrid) {
        drawGridLines(ctx);
      }

      // Draw cabinets
      if (config.cabinets && Array.isArray(config.cabinets)) {
        config.cabinets.forEach(cabinet => {
          const isSelected = selectedCabinet?.id === cabinet.id;
          const isHovered = hoveredCabinet?.id === cabinet.id;
          drawCabinet(ctx, cabinet, isSelected, isHovered);
          
          // Draw rotation and delete handles if selected
          if (isSelected) {
            drawRotationHandle(ctx, cabinet);
            drawDeleteHandle(ctx, cabinet);
          }
        });
      }

      // Draw appliances
      if (config.appliances && Array.isArray(config.appliances)) {
        config.appliances.forEach(appliance => {
          const isSelected = selectedAppliance?.id === appliance.id;
          drawAppliance(ctx, appliance, isSelected);
          
          // Draw rotation handle if selected
          if (isSelected) {
            drawApplianceRotationHandle(ctx, appliance);
          }
        });
      }

      ctx.restore();
    } catch (e) {
      toast.error(`Canvas Rendering Error: ${(e as Error).message}`);
    }
  };

  const drawRoom = (ctx: CanvasRenderingContext2D) => {
    const roomWidth = (config.roomWidth || 12) * 12 * PIXELS_PER_INCH; // Convert feet to pixels
    const roomLength = (config.roomLength || 12) * 12 * PIXELS_PER_INCH;
    const padding = 20;

    // Room floor
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(padding, padding, roomWidth, roomLength);

    // Room walls
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 3;
    ctx.strokeRect(padding, padding, roomWidth, roomLength);

    // Wall labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    
    // North wall
    ctx.fillText('North Wall', padding + roomWidth / 2, padding - 5);
    // South wall
    ctx.fillText('South Wall', padding + roomWidth / 2, padding + roomLength + 15);
    
    ctx.save();
    ctx.translate(padding - 5, padding + roomLength / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('West Wall', 0, 0);
    ctx.restore();
    
    ctx.save();
    ctx.translate(padding + roomWidth + 15, padding + roomLength / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText('East Wall', 0, 0);
    ctx.restore();
  };

  const drawGridLines = (ctx: CanvasRenderingContext2D) => {
    const roomWidth = (config.roomWidth || 12) * 12 * PIXELS_PER_INCH;
    const roomLength = (config.roomLength || 12) * 12 * PIXELS_PER_INCH;
    const padding = 20;
    const gridSize = Math.max((config.gridSize || 6) * PIXELS_PER_INCH, 4); // Prevent infinite loop, minimum 1 inch

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = padding; x <= padding + roomWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + roomLength);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = padding; y <= padding + roomLength; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + roomWidth, y);
      ctx.stroke();
    }
  };

  const drawCabinet = (
    ctx: CanvasRenderingContext2D,
    cabinet: PlacedCabinet,
    isSelected: boolean,
    isHovered: boolean
  ) => {
    const padding = 20;
    const x = padding + cabinet.x * PIXELS_PER_INCH;
    const y = padding + cabinet.y * PIXELS_PER_INCH;
    const width = cabinet.width * PIXELS_PER_INCH;
    const depth = cabinet.depth * PIXELS_PER_INCH;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((cabinet.rotation * Math.PI) / 180);

    // Cabinet body
    let fillColor = '#d1d5db'; // Default gray
    if (cabinet.finish === 'White') fillColor = '#f3f4f6';
    if (cabinet.finish === 'Oak') fillColor = '#deb887';
    if (cabinet.finish === 'Walnut') fillColor = '#8b4513';
    if (cabinet.finish === 'Gray') fillColor = '#9ca3af';
    if (cabinet.finish === 'Black') fillColor = '#374151';
    if (cabinet.finish === 'Cherry') fillColor = '#a0522d';
    if (cabinet.finish === 'Maple') fillColor = '#f5deb3';

    // Make wall cabinets slightly transparent so base cabinets underneath remain visible
    if (cabinet.type === 'wall' || cabinet.type === 'corner-wall') {
      ctx.globalAlpha = 0.85;
      // Lighten the wall cabinet color slightly to distinguish it
      fillColor = '#e5e7eb';
    }

    // Check if this is a corner cabinet
    const isCornerCabinet = cabinet.type === 'corner-base' || cabinet.type === 'corner-wall';

    if (isCornerCabinet) {
      // Draw L-shaped corner cabinet correctly aligning with North/West walls when rotation is 0
      const armDepthInches = cabinet.type === 'corner-wall' ? 12 : 24;
      const armDepth = armDepthInches * PIXELS_PER_INCH;
      
      // Fill the L-shape (two rectangles forming an L on North and West edges)
      ctx.fillStyle = fillColor;
      
      // Vertical part of L (West arm)
      ctx.fillRect(0, 0, armDepth, depth);
      // Horizontal part of L (North arm)
      ctx.fillRect(armDepth, 0, width - armDepth, armDepth);
      
      // Outline the L-shape
      ctx.strokeStyle = isSelected ? '#3b82f6' : isHovered ? '#60a5fa' : '#6b7280';
      ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1;
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(width, armDepth);
      ctx.lineTo(armDepth, armDepth);
      ctx.lineTo(armDepth, depth);
      ctx.lineTo(0, depth);
      ctx.closePath();
      ctx.stroke();
      
      // Draw corner diagonal line to show the L-shape inner corner
      ctx.beginPath();
      ctx.moveTo(armDepth, armDepth);
      ctx.lineTo(0, 0);
      ctx.stroke();
      
      // Draw angled doors for corner cabinet on the inner faces
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 1.5;
      
      // Left door (on inner vertical face)
      ctx.beginPath();
      ctx.moveTo(armDepth, depth - 2);
      ctx.lineTo(armDepth, armDepth + 2);
      ctx.stroke();
      
      // Right door (on inner horizontal face)
      ctx.beginPath();
      ctx.moveTo(armDepth + 2, armDepth);
      ctx.lineTo(width - 2, armDepth);
      ctx.stroke();
      
      // Door handles
      ctx.fillStyle = '#374151';
      // Left door handle
      ctx.fillRect(armDepth - 6, depth - 16, 4, 12);
      // Right door handle  
      ctx.fillRect(width - 16, armDepth - 6, 12, 4);
      
      // Label
      ctx.fillStyle = '#1f2937';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Corner', armDepth / 2, armDepth / 2);
      
    } else {
      // Draw regular cabinet (existing code)
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, width, depth);

      // Cabinet outline
      ctx.strokeStyle = isSelected ? '#3b82f6' : isHovered ? '#60a5fa' : '#6b7280';
      ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1;
      ctx.strokeRect(0, 0, width, depth);

      // Draw doors/drawers
      if (cabinet.hasDoors && cabinet.numberOfDoors) {
        const doorWidth = width / cabinet.numberOfDoors;
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 1;
        for (let i = 1; i < cabinet.numberOfDoors; i++) {
          ctx.beginPath();
          ctx.moveTo(i * doorWidth, 0);
          ctx.lineTo(i * doorWidth, depth);
          ctx.stroke();
        }
        // Door handles
        ctx.fillStyle = '#9ca3af';
        for (let i = 0; i < cabinet.numberOfDoors; i++) {
          const handleX = (i + 0.5) * doorWidth;
          ctx.fillRect(handleX - 2, depth / 2 - 6, 4, 12);
        }
      }

      if (cabinet.hasDrawers && cabinet.numberOfDrawers) {
        const drawerHeight = depth / cabinet.numberOfDrawers;
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 1;
        for (let i = 1; i < cabinet.numberOfDrawers; i++) {
          ctx.beginPath();
          ctx.moveTo(0, i * drawerHeight);
          ctx.lineTo(width, i * drawerHeight);
          ctx.stroke();
        }
        // Drawer pulls
        ctx.fillStyle = '#9ca3af';
        for (let i = 0; i < cabinet.numberOfDrawers; i++) {
          const handleY = (i + 0.5) * drawerHeight;
          ctx.fillRect(width / 2 - 6, handleY - 2, 12, 4);
        }
      }

      // Label
      ctx.fillStyle = '#1f2937';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((cabinet.name || '').split(' ').slice(0, 2).join(' '), width / 2, depth / 2);
    }

    // Dimensions
    ctx.fillStyle = '#6b7280';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${cabinet.width}\"`, width / 2, -5);

    ctx.restore();
  };

  const drawAppliance = (ctx: CanvasRenderingContext2D, appliance: any, isSelected: boolean) => {
    const padding = 20;
    const x = padding + appliance.x * PIXELS_PER_INCH;
    const y = padding + appliance.y * PIXELS_PER_INCH;
    const width = appliance.width * PIXELS_PER_INCH;
    const depth = appliance.depth * PIXELS_PER_INCH;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((appliance.rotation * Math.PI) / 180);

    // Appliance body
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, width, depth);

    ctx.strokeStyle = isSelected ? '#3b82f6' : '#374151';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, depth);

    // Label
    ctx.fillStyle = '#1f2937';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(appliance.name, width / 2, depth / 2);

    ctx.restore();
  };

  const getDeleteHandlePos = (cabinet: PlacedCabinet) => {
    const padding = 20;
    const x = padding + cabinet.x * PIXELS_PER_INCH;
    const y = padding + cabinet.y * PIXELS_PER_INCH;
    const width = cabinet.width * PIXELS_PER_INCH;

    // Calculate rotated top-right corner position
    const angle = (cabinet.rotation * Math.PI) / 180;
    // Top-right corner is (width, 0) in local coordinates
    const handleX = x + width * Math.cos(angle);
    const handleY = y + width * Math.sin(angle);

    return { x: handleX, y: handleY };
  };

  const drawDeleteHandle = (ctx: CanvasRenderingContext2D, cabinet: PlacedCabinet) => {
    const handlePos = getDeleteHandlePos(cabinet);

    // Delete handle with outline
    ctx.fillStyle = '#ef4444'; // Red-500
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(handlePos.x, handlePos.y, 10, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Draw 'X' icon
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(handlePos.x - 4, handlePos.y - 4);
    ctx.lineTo(handlePos.x + 4, handlePos.y + 4);
    ctx.moveTo(handlePos.x + 4, handlePos.y - 4);
    ctx.lineTo(handlePos.x - 4, handlePos.y + 4);
    ctx.stroke();
  };

  const drawRotationHandle = (ctx: CanvasRenderingContext2D, cabinet: PlacedCabinet) => {
    const padding = 20;
    const x = padding + cabinet.x * PIXELS_PER_INCH;
    const y = padding + cabinet.y * PIXELS_PER_INCH;
    const width = cabinet.width * PIXELS_PER_INCH;
    const depth = cabinet.depth * PIXELS_PER_INCH;

    // Calculate rotated corner position
    const angle = (cabinet.rotation * Math.PI) / 180;
    const handleX = x + width * Math.cos(angle) - depth * Math.sin(angle);
    const handleY = y + width * Math.sin(angle) + depth * Math.cos(angle);

    // Rotation handle with outline
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(handleX, handleY, 10, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Draw rotation icon (circular arrow)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(handleX, handleY, 5, 0.2, Math.PI * 1.8);
    ctx.stroke();
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(handleX - 4, handleY - 3);
    ctx.lineTo(handleX - 2, handleY - 5);
    ctx.lineTo(handleX - 5, handleY - 5);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  };

  const drawApplianceRotationHandle = (ctx: CanvasRenderingContext2D, appliance: any) => {
    const padding = 20;
    const x = padding + appliance.x * PIXELS_PER_INCH;
    const y = padding + appliance.y * PIXELS_PER_INCH;
    const width = appliance.width * PIXELS_PER_INCH;
    const depth = appliance.depth * PIXELS_PER_INCH;

    // Calculate handle position considering rotation
    const angle = (appliance.rotation * Math.PI) / 180;
    const handleX = x + width * Math.cos(angle) - depth * Math.sin(angle);
    const handleY = y + width * Math.sin(angle) + depth * Math.cos(angle);

    // Rotation handle with outline
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(handleX, handleY, 10, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Draw rotation icon (circular arrow)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(handleX, handleY, 5, 0.2, Math.PI * 1.8);
    ctx.stroke();
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(handleX - 4, handleY - 3);
    ctx.lineTo(handleX - 2, handleY - 5);
    ctx.lineTo(handleX - 5, handleY - 5);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Check if clicked on a cabinet
    const clickedCabinet = findCabinetAtPoint(x, y);
    onSelectCabinet(clickedCabinet);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Handle rotation
    if (isRotating && rotatingItem) {
      if (rotatingItem.type === 'cabinet') {
        const cabinet = (config.cabinets || []).find(c => c.id === rotatingItem.id);
        if (cabinet) {
          const padding = 20;
          const centerX = padding + cabinet.x * PIXELS_PER_INCH + (cabinet.width * PIXELS_PER_INCH) / 2;
          const centerY = padding + cabinet.y * PIXELS_PER_INCH + (cabinet.depth * PIXELS_PER_INCH) / 2;
          
          // Calculate current angle from center to mouse
          const currentAngle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
          
          // Calculate relative rotation from start
          const angleDelta = currentAngle - rotationStartAngle;
          const newRotation = (initialRotation + angleDelta) % 360;
          
          // Snap to 15 degree increments
          const snappedAngle = Math.round(newRotation / 15) * 15;
          
          onUpdateCabinet(rotatingItem.id, { rotation: snappedAngle });
        }
      } else if (rotatingItem.type === 'appliance') {
        const appliance = (config.appliances || []).find(a => a.id === rotatingItem.id);
        if (appliance && onUpdateAppliance) {
          const padding = 20;
          const centerX = padding + appliance.x * PIXELS_PER_INCH + (appliance.width * PIXELS_PER_INCH) / 2;
          const centerY = padding + appliance.y * PIXELS_PER_INCH + (appliance.depth * PIXELS_PER_INCH) / 2;
          
          // Calculate current angle from center to mouse
          const currentAngle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
          
          // Calculate relative rotation from start
          const angleDelta = currentAngle - rotationStartAngle;
          const newRotation = (initialRotation + angleDelta) % 360;
          
          // Snap to 15 degree increments
          const snappedAngle = Math.round(newRotation / 15) * 15;
          
          onUpdateAppliance(rotatingItem.id, { rotation: snappedAngle });
        }
      }
      return;
    }

    // Handle dragging with boundary checking
    if (isDragging && draggedItem && dragStart) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      
      if (draggedItem.type === 'cabinet') {
        const cabinet = (config.cabinets || []).find(c => c.id === draggedItem.id);
        if (cabinet) {
          // Calculate new position
          let newX = cabinet.x + dx / PIXELS_PER_INCH;
          let newY = cabinet.y + dy / PIXELS_PER_INCH;
          
          // Apply boundary constraints
          const maxX = config.roomWidth * 12 - cabinet.width;
          const maxY = config.roomLength * 12 - cabinet.depth;
          
          newX = Math.max(0, Math.min(newX, maxX));
          newY = Math.max(0, Math.min(newY, maxY));
          
          onUpdateCabinet(draggedItem.id, { x: newX, y: newY });
          setDragStart({ x, y });
        }
      } else if (draggedItem.type === 'appliance') {
        const appliance = (config.appliances || []).find(a => a.id === draggedItem.id);
        if (appliance && onUpdateAppliance) {
          // Calculate new position
          let newX = appliance.x + dx / PIXELS_PER_INCH;
          let newY = appliance.y + dy / PIXELS_PER_INCH;
          
          // Apply boundary constraints
          const maxX = config.roomWidth * 12 - appliance.width;
          const maxY = config.roomLength * 12 - appliance.depth;
          
          newX = Math.max(0, Math.min(newX, maxX));
          newY = Math.max(0, Math.min(newY, maxY));
          
          onUpdateAppliance(draggedItem.id, { x: newX, y: newY });
          setDragStart({ x, y });
        }
      }
    } else {
      // Update hovered cabinet and cursor
      const hoveredCab = findCabinetAtPoint(x, y);
      const hoveredApp = findApplianceAtPoint(x, y);
      
      // Check if hovering over rotation handle or delete handle
      let onRotHandle = false;
      let onDeleteHandle = false;

      if (selectedCabinet) {
        const rotPos = getRotationHandlePos(selectedCabinet);
        if (Math.sqrt(Math.pow(x - rotPos.x, 2) + Math.pow(y - rotPos.y, 2)) <= 10) onRotHandle = true;

        const delPos = getDeleteHandlePos(selectedCabinet);
        if (Math.sqrt(Math.pow(x - delPos.x, 2) + Math.pow(y - delPos.y, 2)) <= 10) onDeleteHandle = true;
      }
      if (selectedAppliance) {
        const rotPos = getApplianceRotationHandlePos(selectedAppliance);
        if (Math.sqrt(Math.pow(x - rotPos.x, 2) + Math.pow(y - rotPos.y, 2)) <= 10) onRotHandle = true;
      }
      
      setHoveredCabinet(hoveredCab);
      canvas.style.cursor = onDeleteHandle ? 'pointer' : onRotHandle ? 'grab' : (hoveredCab || hoveredApp) ? 'move' : 'default';
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Check if clicked on delete handle first
    if (selectedCabinet) {
      const deletePos = getDeleteHandlePos(selectedCabinet);
      const deleteDist = Math.sqrt(Math.pow(x - deletePos.x, 2) + Math.pow(y - deletePos.y, 2));
      if (deleteDist <= 10) {
        onDeleteCabinet(selectedCabinet.id);
        return;
      }
    }

    // Check if clicked on rotation handle
    if (selectedCabinet) {
      const handlePos = getRotationHandlePos(selectedCabinet);
      const dist = Math.sqrt(Math.pow(x - handlePos.x, 2) + Math.pow(y - handlePos.y, 2));
      if (dist <= 10) {
        setIsRotating(true);
        setRotatingItem({ type: 'cabinet', id: selectedCabinet.id });
        setRotationStartAngle(Math.atan2(y - handlePos.y, x - handlePos.x) * (180 / Math.PI));
        setInitialRotation(selectedCabinet.rotation);
        return;
      }
    }

    if (selectedAppliance) {
      const handlePos = getApplianceRotationHandlePos(selectedAppliance);
      const dist = Math.sqrt(Math.pow(x - handlePos.x, 2) + Math.pow(y - handlePos.y, 2));
      if (dist <= 10) {
        setIsRotating(true);
        setRotatingItem({ type: 'appliance', id: selectedAppliance.id });
        setRotationStartAngle(Math.atan2(y - handlePos.y, x - handlePos.x) * (180 / Math.PI));
        setInitialRotation(selectedAppliance.rotation);
        return;
      }
    }

    // Check if we clicked on an item
    const clickedCabinet = findCabinetAtPoint(x, y);
    const clickedAppliance = findApplianceAtPoint(x, y);

    if (clickedCabinet) {
      onSelectCabinet(clickedCabinet);
      setSelectedAppliance(null);
      setIsDragging(true);
      setDragStart({ x, y });
      setDraggedItem({ type: 'cabinet', id: clickedCabinet.id });
    } else if (clickedAppliance) {
      setSelectedAppliance(clickedAppliance);
      onSelectCabinet(null);
      setIsDragging(true);
      setDragStart({ x, y });
      setDraggedItem({ type: 'appliance', id: clickedAppliance.id });
    } else {
      // Clicked on empty space
      onSelectCabinet(null);
      setSelectedAppliance(null);
    }
  };

  const getRotationHandlePos = (cabinet: PlacedCabinet) => {
    const padding = 20;
    const x = padding + cabinet.x * PIXELS_PER_INCH;
    const y = padding + cabinet.y * PIXELS_PER_INCH;
    const width = cabinet.width * PIXELS_PER_INCH;
    const depth = cabinet.depth * PIXELS_PER_INCH;

    // Calculate handle position considering rotation
    const angle = (cabinet.rotation * Math.PI) / 180;
    const handleX = x + width * Math.cos(angle) - depth * Math.sin(angle);
    const handleY = y + width * Math.sin(angle) + depth * Math.cos(angle);

    return { x: handleX, y: handleY };
  };

  const getApplianceRotationHandlePos = (appliance: any) => {
    const padding = 20;
    const x = padding + appliance.x * PIXELS_PER_INCH;
    const y = padding + appliance.y * PIXELS_PER_INCH;
    const width = appliance.width * PIXELS_PER_INCH;
    const depth = appliance.depth * PIXELS_PER_INCH;

    // Calculate handle position considering rotation
    const angle = (appliance.rotation * Math.PI) / 180;
    const handleX = x + width * Math.cos(angle) - depth * Math.sin(angle);
    const handleY = y + width * Math.sin(angle) + depth * Math.cos(angle);

    return { x: handleX, y: handleY };
  };

  const handleCanvasMouseUp = () => {
    // Apply snap to grid when releasing after dragging
    if (isDragging && draggedItem) {
      if (draggedItem.type === 'cabinet') {
        const cabinet = (config.cabinets || []).find(c => c.id === draggedItem.id);
        if (cabinet) {
          const snappedX = snapToGrid(cabinet.x, true, cabinet.width, cabinet.depth);
          const snappedY = snapToGrid(cabinet.y, false, cabinet.width, cabinet.depth);
          onUpdateCabinet(draggedItem.id, { x: snappedX, y: snappedY });
        }
      } else if (draggedItem.type === 'appliance') {
        const appliance = (config.appliances || []).find(a => a.id === draggedItem.id);
        if (appliance && onUpdateAppliance) {
          const snappedX = snapToGrid(appliance.x, true, appliance.width, appliance.depth);
          const snappedY = snapToGrid(appliance.y, false, appliance.width, appliance.depth);
          onUpdateAppliance(draggedItem.id, { x: snappedX, y: snappedY });
        }
      }
    }
    
    setIsDragging(false);
    setDragStart(null);
    setDraggedItem(null);
    setIsRotating(false);
    setRotatingItem(null);
  };

  const findCabinetAtPoint = (x: number, y: number): PlacedCabinet | null => {
    const padding = 20;
    const cabinets = config.cabinets || [];
    
    for (let i = cabinets.length - 1; i >= 0; i--) {
      const cabinet = cabinets[i];
      const cabX = padding + cabinet.x * PIXELS_PER_INCH;
      const cabY = padding + cabinet.y * PIXELS_PER_INCH;
      const cabWidth = cabinet.width * PIXELS_PER_INCH;
      const cabDepth = cabinet.depth * PIXELS_PER_INCH;

      // Transform click point to local coordinates (accounting for rotation)
      const angle = (-cabinet.rotation * Math.PI) / 180; // Negative for inverse transform
      const dx = x - cabX;
      const dy = y - cabY;
      
      // Rotate point back to local space
      const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const localY = dx * Math.sin(angle) + dy * Math.cos(angle);

      // Check if point is within the unrotated bounds
      if (
        localX >= 0 &&
        localX <= cabWidth &&
        localY >= 0 &&
        localY <= cabDepth
      ) {
        return cabinet;
      }
    }
    return null;
  };

  const findApplianceAtPoint = (x: number, y: number): any | null => {
    const padding = 20;
    const appliances = config.appliances || [];
    
    for (let i = appliances.length - 1; i >= 0; i--) {
      const appliance = appliances[i];
      const appX = padding + appliance.x * PIXELS_PER_INCH;
      const appY = padding + appliance.y * PIXELS_PER_INCH;
      const appWidth = appliance.width * PIXELS_PER_INCH;
      const appDepth = appliance.depth * PIXELS_PER_INCH;

      // Transform click point to local coordinates (accounting for rotation)
      const angle = (-appliance.rotation * Math.PI) / 180; // Negative for inverse transform
      const dx = x - appX;
      const dy = y - appY;
      
      // Rotate point back to local space
      const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const localY = dx * Math.sin(angle) + dy * Math.cos(angle);

      // Check if point is within the unrotated bounds
      if (
        localX >= 0 &&
        localX <= appWidth &&
        localY >= 0 &&
        localY <= appDepth
      ) {
        return appliance;
      }
    }
    return null;
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));

  const handleRotateClockwise = () => {
    if (selectedCabinet) {
      const newRotation = (selectedCabinet.rotation + 90) % 360;
      onUpdateCabinet(selectedCabinet.id, { rotation: newRotation });
    } else if (selectedAppliance && onUpdateAppliance) {
      const newRotation = (selectedAppliance.rotation + 90) % 360;
      onUpdateAppliance(selectedAppliance.id, { rotation: newRotation });
    }
  };

  const handleRotateCounterClockwise = () => {
    if (selectedCabinet) {
      const newRotation = (selectedCabinet.rotation - 90 + 360) % 360;
      onUpdateCabinet(selectedCabinet.id, { rotation: newRotation });
    } else if (selectedAppliance && onUpdateAppliance) {
      const newRotation = (selectedAppliance.rotation - 90 + 360) % 360;
      onUpdateAppliance(selectedAppliance.id, { rotation: newRotation });
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;
      
      const item = JSON.parse(data);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      // Convert to inches and account for padding
      const padding = 20;
      const canvasX = Math.max(0, (x - padding) / PIXELS_PER_INCH);
      const canvasY = Math.max(0, (y - padding) / PIXELS_PER_INCH);

      // Check if it's an appliance or cabinet
      if (item.itemType === 'appliance' && onAddAppliance) {
        // Snap appliance position to grid
        const snappedX = snapToGrid(canvasX, true, item.width, item.depth);
        const snappedY = snapToGrid(canvasY, false, item.width, item.depth);
        onAddAppliance(item, snappedX, snappedY);
        toast.success(`${item.name} added to canvas`);
      } else {
        // It's a cabinet - snap position to grid
        const snappedX = snapToGrid(canvasX, true, item.width, item.depth);
        const snappedY = snapToGrid(canvasY, false, item.width, item.depth);
        
        const newCabinet: PlacedCabinet = {
          ...item,
          id: `cabinet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          finish: config.cabinetFinish,
          x: snappedX,
          y: snappedY,
          rotation: 0,
          wall: 'north',
        };

        onAddCabinet(newCabinet);
        toast.success(`${item.name} added to canvas`);
      }
    } catch (error) {
      toast.error('Failed to add item');
    }
  };

  return (
    <div className="flex flex-col h-full relative bg-muted">
      {/* Floating Toolbar */}
      <div 
        className="absolute z-20 flex flex-col gap-2 pointer-events-auto shadow-md rounded-lg"
        style={{ 
          top: toolbarPos.y, 
          left: toolbarPos.x,
          cursor: isDraggingToolbar ? 'grabbing' : 'auto'
        }}
        onMouseDown={handleToolbarDragStart}
      >
        <div className="bg-background/90 backdrop-blur rounded-lg border border-border flex flex-col overflow-hidden">
          {/* Drag Handle */}
          <div className="bg-muted/50 hover:bg-muted/50 w-full flex items-center justify-center py-1 cursor-grab active:cursor-grabbing border-b border-border">
            <GripHorizontal className="w-4 h-4 text-muted-foreground" />
          </div>
          
          <div className="flex items-center p-1 gap-1">
            {/* General Tools */}
            <div className="flex items-center">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium w-12 text-center text-muted-foreground">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <div className="w-px h-4 bg-gray-300 mx-1" />
              
              <Button
                variant={config.showGrid ? 'secondary' : 'ghost'}
                size="sm"
                className={`h-8 px-2 text-xs ${config.showGrid ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                onClick={() => onUpdateConfig?.({ showGrid: !config.showGrid })}
              >
                <Grid3x3 className="h-4 w-4 mr-1.5" />
                Grid
              </Button>
              
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer px-2 h-8 hover:bg-muted rounded-md">
                <input
                  type="checkbox"
                  checked={config.snapToGrid || false}
                  onChange={(e) => onUpdateConfig?.({ snapToGrid: e.target.checked })}
                  className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                />
                Snap
              </label>
            </div>
          </div>
        </div>

        {/* Item Tools (only show if something is selected) */}
        {(selectedCabinet || selectedAppliance) && (
          <div className="bg-background/90 backdrop-blur rounded-lg border border-border flex flex-col overflow-hidden shadow-sm">
            <div className="bg-blue-50/50 w-full flex flex-col p-1 gap-1">
              <div className="flex items-center gap-1 justify-center border-b border-border pb-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground bg-background shadow-sm" onClick={handleRotateCounterClockwise} title="Rotate 90° counter-clockwise">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground bg-background shadow-sm" onClick={handleRotateClockwise} title="Rotate 90° clockwise">
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>

              {selectedCabinet && (
                <div className="flex items-center justify-center gap-1 pt-1">
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground bg-background shadow-sm" onClick={() => onUpdateCabinet(selectedCabinet.id, { x: 0, y: 0 })} title="Move cabinet to corner">
                    <Move className="h-4 w-4 mr-1.5" />
                    To Corner
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 bg-background shadow-sm" onClick={() => onDeleteCabinet(selectedCabinet.id)}>
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto w-full h-full relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ backgroundColor: isDragOver ? '#f0f9ff' : 'transparent' }}
      >

        <canvas
          ref={canvasRef}
          width={800}
          height={1200}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          className="mx-auto"
          style={{ cursor: isDragging ? 'grabbing' : 'default' }}
        />
      </div>
    </div>
  );
}