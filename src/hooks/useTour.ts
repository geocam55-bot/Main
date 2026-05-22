import { useCallback, useEffect, useState } from 'react';

export interface TourStep {
  title: string;
  body: string;
  /** CSS selector of the element to spotlight. If omitted, shows a centered modal card. */
  targetSelector?: string;
  /** Which side to place the tooltip relative to the target (default: 'bottom'). */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface UseTourOptions {
  moduleKey: string;
  userId: string;
  steps: TourStep[];
  /** If true, auto-open the tour the first time this user visits. */
  autoStart?: boolean;
  /** If this string matches the `prospaces.pending-tour` sessionStorage key, open immediately on mount. */
  pendingTourSessionKey?: string;
}

const SEEN_VERSION = 'v1';

function storageKey(moduleKey: string, userId: string, suffix: string) {
  return `prospaces.${moduleKey}.tour.${suffix}.${userId}`;
}

export function useTour({ moduleKey, userId, steps, autoStart = false, pendingTourSessionKey }: UseTourOptions) {
  const seenKey = storageKey(moduleKey, userId, `seen.${SEEN_VERSION}`);
  const stepKey = storageKey(moduleKey, userId, 'step');

  const [isOpen, setIsOpen] = useState(() => {
    if (pendingTourSessionKey) {
      const flag = sessionStorage.getItem('prospaces.pending-tour');
      if (flag === pendingTourSessionKey) {
        sessionStorage.removeItem('prospaces.pending-tour');
        return true;
      }
    }
    return false;
  });
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem(stepKey);
    if (saved !== null) {
      const n = Number(saved);
      if (!Number.isNaN(n)) return Math.max(0, Math.min(n, steps.length - 1));
    }
    return 0;
  });

  // Persist step
  useEffect(() => {
    if (isOpen) localStorage.setItem(stepKey, String(currentStep));
  }, [currentStep, isOpen, stepKey]);

  // Auto-start for new users
  useEffect(() => {
    if (!autoStart) return;
    const seen = localStorage.getItem(seenKey);
    if (!seen) {
      setIsOpen(true);
      localStorage.setItem(seenKey, 'true');
    }
  }, [autoStart, seenKey]);

  const start = useCallback((stepIndex = 0) => {
    setCurrentStep(stepIndex);
    setIsOpen(true);
    localStorage.setItem(seenKey, 'true');
  }, [seenKey]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const next = useCallback(() => {
    setCurrentStep((prev) => {
      const next = Math.min(prev + 1, steps.length - 1);
      return next;
    });
  }, [steps.length]);

  const prev = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const goTo = useCallback((index: number) => {
    setCurrentStep(Math.max(0, Math.min(index, steps.length - 1)));
  }, [steps.length]);

  const reset = useCallback(() => {
    localStorage.removeItem(seenKey);
    localStorage.removeItem(stepKey);
    setCurrentStep(0);
    setIsOpen(false);
  }, [seenKey, stepKey]);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const progress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;

  return { isOpen, currentStep, step, isFirst, isLast, progress, start, close, next, prev, goTo, reset };
}
