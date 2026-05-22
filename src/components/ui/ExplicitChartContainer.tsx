import React, { useRef, useState, useEffect, ReactElement } from 'react';

interface ExplicitChartContainerProps {
  children: ReactElement;
  className?: string;
  height?: number | string;
}

/**
 * A replacement for Recharts ResponsiveContainer that manually measures dimensions
 * and passes them explicitly to the chart child. This avoids the "width(-1) and height(-1)"
 * errors that often occur with ResponsiveContainer in complex CSS Grid/Flex layouts.
 */
export function ExplicitChartContainer({ 
  children, 
  className = "", 
  height = "100%" 
}: ExplicitChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        
        // Only update if we have valid positive dimensions
        // This prevents passing 0 or negative values to Recharts
        if (clientWidth > 0 && clientHeight > 0) {
          // Check if dimensions actually changed to avoid unnecessary re-renders
          setDimensions(prev => {
            if (prev.width === clientWidth && prev.height === clientHeight) {
              return prev;
            }
            return { width: clientWidth, height: clientHeight };
          });
        }
      }
    };

    // Initial measure
    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Clone the child and pass width/height props directly
  // This bypasses Recharts' own dimension calculation logic
  const childWithDimensions = dimensions.width > 0 && dimensions.height > 0
    ? React.cloneElement(children, { 
        width: dimensions.width, 
        height: dimensions.height,
        // Ensure the chart doesn't try to be responsive itself if it has those props
        style: { ...children.props.style, width: dimensions.width, height: dimensions.height }
      })
    : null; // Don't render anything until we have dimensions

  return (
    <div 
      ref={containerRef} 
      className={`w-full min-w-0 ${className}`}
      style={{ height }}
    >
      {childWithDimensions}
    </div>
  );
}