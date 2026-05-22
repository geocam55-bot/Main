/**
 * GuidedTour — overlay tour engine.
 *
 * Renders a semi-transparent backdrop with a spotlight cutout around a target
 * DOM element (if targetSelector is provided) and an anchored tooltip card.
 * Falls back to a centered card when no target is specified.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from './ui/button';
import type { TourStep } from '../hooks/useTour';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipPos {
  top: number;
  left: number;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const PADDING = 8; // spotlight padding around the target
const TOOLTIP_GAP = 12; // gap between target and tooltip card
const TOOLTIP_W = 340;

function getTargetRect(selector: string): Rect | null {
  try {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  } catch {
    return null;
  }
}

function computeTooltipPos(rect: Rect, placement: TourStep['placement']): TooltipPos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const desired = placement || 'bottom';

  const center = {
    top: vh / 2 - 100,
    left: (vw - TOOLTIP_W) / 2,
    placement: 'center' as const,
  };

  if (!rect) return center;

  const spots: Record<string, TooltipPos> = {
    bottom: {
      top: rect.top + rect.height + PADDING + TOOLTIP_GAP,
      left: Math.max(8, Math.min(rect.left + rect.width / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 8)),
      placement: 'bottom',
    },
    top: {
      top: rect.top - PADDING - TOOLTIP_GAP - 180,
      left: Math.max(8, Math.min(rect.left + rect.width / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 8)),
      placement: 'top',
    },
    right: {
      top: Math.max(8, rect.top + rect.height / 2 - 80),
      left: rect.left + rect.width + PADDING + TOOLTIP_GAP,
      placement: 'right',
    },
    left: {
      top: Math.max(8, rect.top + rect.height / 2 - 80),
      left: rect.left - PADDING - TOOLTIP_GAP - TOOLTIP_W,
      placement: 'left',
    },
  };

  const pos = spots[desired] || spots.bottom;

  // If it goes off-screen, fall back to bottom, then center
  if (pos.top < 0 || pos.top > vh - 100) return spots.bottom.top > 0 ? spots.bottom : center;
  if (pos.left < 0 || pos.left + TOOLTIP_W > vw) return spots.bottom;

  return pos;
}

interface GuidedTourProps {
  isOpen: boolean;
  steps: TourStep[];
  currentStep: number;
  isFirst: boolean;
  isLast: boolean;
  progress: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onFinish: () => void;
}

export function GuidedTour({
  isOpen,
  steps,
  currentStep,
  isFirst,
  isLast,
  progress,
  onNext,
  onPrev,
  onClose,
  onFinish,
}: GuidedTourProps) {
  const step = steps[currentStep];
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos>({ top: 0, left: 0, placement: 'center' });
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Scroll target into view and measure it whenever step changes
  useLayoutEffect(() => {
    if (!isOpen || !step?.targetSelector) {
      setTargetRect(null);
      setTooltipPos({ top: window.innerHeight / 2 - 100, left: (window.innerWidth - TOOLTIP_W) / 2, placement: 'center' });
      return;
    }

    const measure = () => {
      const rect = getTargetRect(step.targetSelector!);
      if (rect) {
        // Scroll element into view with some breathing room
        const el = document.querySelector(step.targetSelector!);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });

        setTargetRect(rect);
        setTooltipPos(computeTooltipPos(rect, step.placement));
      } else {
        setTargetRect(null);
        setTooltipPos({ top: window.innerHeight / 2 - 100, left: (window.innerWidth - TOOLTIP_W) / 2, placement: 'center' });
      }
    };

    // Small delay to allow scroll + paint
    const timeout = setTimeout(measure, 150);
    return () => clearTimeout(timeout);
  }, [isOpen, step?.targetSelector, step?.placement, currentStep]);

  // Re-measure on resize
  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => {
      if (step?.targetSelector) {
        const rect = getTargetRect(step.targetSelector);
        if (rect) {
          setTargetRect(rect);
          setTooltipPos(computeTooltipPos(rect, step.placement));
        }
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isOpen, step?.targetSelector, step?.placement]);

  if (!isOpen || !step) return null;

  const spotlightPad = PADDING;
  const spot = targetRect
    ? {
        top: targetRect.top - spotlightPad,
        left: targetRect.left - spotlightPad,
        width: targetRect.width + spotlightPad * 2,
        height: targetRect.height + spotlightPad * 2,
      }
    : null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Backdrop with spotlight cutout */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-auto"
        style={{ cursor: 'default' }}
        onClick={onClose}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {spot && (
              <rect
                x={spot.left}
                y={spot.top}
                width={spot.width}
                height={spot.height}
                rx="6"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.55)"
          mask="url(#tour-spotlight-mask)"
        />
        {/* Spotlight border ring */}
        {spot && (
          <rect
            x={spot.left}
            y={spot.top}
            width={spot.width}
            height={spot.height}
            rx="6"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
          />
        )}
      </svg>

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="absolute pointer-events-auto shadow-2xl rounded-lg border border-border bg-background"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: TOOLTIP_W,
          zIndex: 10000,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-lg border-b border-border bg-slate-50 px-4 py-2.5">
          <span className="text-xs font-medium text-slate-500">
            Step {currentStep + 1} of {steps.length}
          </span>
          <button
            onClick={onClose}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            aria-label="Close tour"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-1 bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-2">
          <p className="text-sm font-semibold text-foreground leading-tight">{step.title}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between rounded-b-lg border-t border-border px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-muted-foreground"
          >
            Skip tour
          </Button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={onPrev} className="h-8 px-3">
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            )}
            <Button size="sm" onClick={isLast ? onFinish : onNext} className="h-8 px-3">
              {isLast ? 'Finish' : 'Next'}
              {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
