import React, { useRef, useState, useEffect } from 'react';

interface DoorConfig {
  id: string;
  width: number;
  height: number;
  type: string;
  wall: 'top' | 'right' | 'bottom' | 'left';
  position: number; // Position along the wall in inches from top/left
}

interface RoomConfig {
  id: string;
  name: string;
  width: number; // in feet
  length: number; // in feet
  height: number; // in feet
  doors: DoorConfig[];
}

interface RoomCanvasProps {
  room: RoomConfig;
  onUpdateDoor: (doorId: string, updates: Partial<DoorConfig>) => void;
  onSelectDoor?: (doorId: string) => void;
}

export function RoomCanvas({ room, onUpdateDoor, onSelectDoor }: RoomCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingDoor, setDraggingDoor] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 300, height: 300 });

  useEffect(() => {
    if (containerRef.current) {
      setContainerSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
  }, []);

  const PADDING = 40;
  
  // Convert real-world dimensions to canvas scale
  const maxDimension = Math.max(room.width, room.length);
  // Prevent division by zero
  const scale = maxDimension > 0 ? Math.min(
    (containerSize.width - PADDING * 2) / room.width,
    (containerSize.height - PADDING * 2) / room.length
  ) : 1;

  const canvasRoomWidth = room.width * scale;
  const canvasRoomLength = room.length * scale;

  const offsetX = (containerSize.width - canvasRoomWidth) / 2;
  const offsetY = (containerSize.height - canvasRoomLength) / 2;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingDoor || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - offsetX;
    const y = e.clientY - rect.top - offsetY;

    const door = room.doors.find(d => d.id === draggingDoor);
    if (!door) return;

    let newPos = 0;
    
    if (door.wall === 'top') {
      newPos = (x / scale) * 12; // convert canvas units back to inches
      newPos = Math.max(0, Math.min(newPos, (room.width * 12) - door.width));
    } else if (door.wall === 'bottom') {
      newPos = (x / scale) * 12;
      newPos = Math.max(0, Math.min(newPos, (room.width * 12) - door.width));
    } else if (door.wall === 'left') {
      newPos = (y / scale) * 12;
      newPos = Math.max(0, Math.min(newPos, (room.length * 12) - door.width));
    } else if (door.wall === 'right') {
      newPos = (y / scale) * 12;
      newPos = Math.max(0, Math.min(newPos, (room.length * 12) - door.width));
    }

    onUpdateDoor(draggingDoor, { position: newPos });
  };

  const handleMouseUp = () => {
    setDraggingDoor(null);
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full min-h-[300px] bg-muted border border-border rounded-lg relative overflow-hidden select-none cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Grid Background */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        opacity: 0.5
      }} />
      
      {/* Canvas */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <g transform={`translate(${offsetX}, ${offsetY})`}>
          {/* Room Rect */}
          <rect 
            x={0} 
            y={0} 
            width={canvasRoomWidth} 
            height={canvasRoomLength} 
            fill="none" 
            stroke="#475569" 
            strokeWidth={4}
          />
          
          {/* Doors */}
          {room.doors.map((door) => {
            const doorWidthCanvas = (door.width / 12) * scale;
            const doorPosCanvas = (door.position / 12) * scale;
            
            let x = 0, y = 0, rot = 0;
            if (door.wall === 'top') {
              x = doorPosCanvas;
              y = 0;
              rot = 0;
            } else if (door.wall === 'right') {
              x = canvasRoomWidth;
              y = doorPosCanvas;
              rot = 90;
            } else if (door.wall === 'bottom') {
              x = doorPosCanvas;
              y = canvasRoomLength;
              rot = 0; // Or 180 depending on swing
            } else if (door.wall === 'left') {
              x = 0;
              y = doorPosCanvas;
              rot = -90;
            }

            return (
              <g 
                key={door.id} 
                transform={`translate(${x}, ${y}) rotate(${rot})`}
                className="pointer-events-auto cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDraggingDoor(door.id);
                  onSelectDoor?.(door.id);
                }}
              >
                {/* Break in the wall */}
                <rect 
                  x={0} 
                  y={-3} 
                  width={doorWidthCanvas} 
                  height={6} 
                  fill="#f8fafc" // match background
                />
                
                {/* Door Panel */}
                <rect 
                  x={0} 
                  y={door.wall === 'bottom' || door.wall === 'right' ? -doorWidthCanvas : 0} 
                  width={4} 
                  height={doorWidthCanvas} 
                  fill="#eab308" 
                />
                
                {/* Swing Arc */}
                {door.type !== 'barn' && door.type !== 'bifold' && (
                  <path 
                    d={`M 0 0 A ${doorWidthCanvas} ${doorWidthCanvas} 0 0 ${door.wall === 'bottom' || door.wall === 'right' ? 0 : 1} ${doorWidthCanvas} ${door.wall === 'bottom' || door.wall === 'right' ? -doorWidthCanvas : doorWidthCanvas}`} 
                    fill="none" 
                    stroke="#eab308" 
                    strokeWidth={1}
                    strokeDasharray="2,2"
                  />
                )}
                
                {/* Drag Handle Indicator (invisible but larger hit area) */}
                <rect 
                  x={-10} 
                  y={-10} 
                  width={doorWidthCanvas + 20} 
                  height={20} 
                  fill="transparent" 
                />
              </g>
            );
          })}
          
          {/* Dimension Labels */}
          <text x={canvasRoomWidth / 2} y={-10} fill="#64748b" fontSize={12} textAnchor="middle">{room.width}'</text>
          <text x={-10} y={canvasRoomLength / 2} fill="#64748b" fontSize={12} textAnchor="end" dominantBaseline="middle" transform={`rotate(-90, -10, ${canvasRoomLength / 2})`}>{room.length}'</text>
        </g>
      </svg>
    </div>
  );
}