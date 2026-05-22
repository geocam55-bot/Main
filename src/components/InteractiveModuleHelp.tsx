import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, CheckCircle2, Copy, Minimize2, PlayCircle, Square, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { GuidedTour } from './GuidedTour';
import { useTour } from '../hooks/useTour';

export interface HelpStep {
  title: string;
  body: string;
  /** CSS selector of the UI element this step should spotlight. */
  targetSelector?: string;
  /** Which side to place the tooltip (default: 'bottom'). */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface HelpAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'outline';
  fullWidth?: boolean;
}

interface HelpBadge {
  label: string;
  value: string | number;
  variant?: 'secondary' | 'outline';
}

interface HelpHowToGuide {
  title: string;
  steps: string[];
}

interface InteractiveModuleHelpProps {
  moduleKey: string;
  userId: string;
  title: string;
  description: string;
  moduleIcon: LucideIcon;
  triggerLabel?: string;
  steps: HelpStep[];
  actions: HelpAction[];
  badges?: HelpBadge[];
  howToGuides?: HelpHowToGuide[];
  /** If this matches the value of the `prospaces.pending-tour` sessionStorage key, auto-start the overlay tour on mount. */
  pendingTourKey?: string;
  /** When this value changes, force-start the overlay tour at step 1. */
  forceStartToken?: number;
}

export function InteractiveModuleHelp({
  moduleKey,
  userId,
  title,
  description,
  moduleIcon: ModuleIcon,
  triggerLabel = 'Module Help',
  steps,
  actions,
  badges = [],
  howToGuides = [],
  pendingTourKey,
  forceStartToken,
}: InteractiveModuleHelpProps) {
  const helpOnboardingVersion = 'v1';
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Overlay guided tour — opens immediately if Getting Started sent us here
  const tour = useTour({
    moduleKey: `${moduleKey}-overlay`,
    userId,
    steps,
    pendingTourSessionKey: pendingTourKey,
  });

  const shouldMaximizeOnOpen = () =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches;

  const openHelp = () => {
    setIsMinimized(false);
    setIsMaximized(shouldMaximizeOnOpen());
    setIsOpen(true);
  };

  const stepStorageKey = useMemo(
    () => `prospaces.${moduleKey}.help.step.${userId}`,
    [moduleKey, userId]
  );
  const seenStorageKey = useMemo(
    () => `prospaces.${moduleKey}.help.seen.${helpOnboardingVersion}.${userId}`,
    [moduleKey, userId]
  );

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setIsMinimized(false);
      setIsMaximized(shouldMaximizeOnOpen());
      localStorage.setItem(seenStorageKey, 'true');
    } else {
      setIsMinimized(false);
      setIsMaximized(false);
    }
  };

  const runAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  useEffect(() => {
    if (!pendingTourKey || !steps.some((s) => s.targetSelector)) return;

    const startIfMatch = (key?: string | null) => {
      if (key !== pendingTourKey) return;
      sessionStorage.removeItem('prospaces.pending-tour');
      tour.start(0);
    };

    startIfMatch(sessionStorage.getItem('prospaces.pending-tour'));

    const onStartTour = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      startIfMatch(detail?.key);
    };

    window.addEventListener('prospaces:start-tour', onStartTour as EventListener);
    return () => window.removeEventListener('prospaces:start-tour', onStartTour as EventListener);
  }, [pendingTourKey, steps, tour.start]);

  useEffect(() => {
    if (!forceStartToken) return;
    if (!steps.some((s) => s.targetSelector)) return;
    tour.start(0);
  }, [forceStartToken, steps, tour.start]);

  useEffect(() => {
    const savedStep = localStorage.getItem(stepStorageKey);
    if (savedStep !== null) {
      const parsed = Number(savedStep);
      if (!Number.isNaN(parsed)) {
        setActiveStep(Math.max(0, Math.min(parsed, steps.length - 1)));
      }
    }
  }, [stepStorageKey, steps.length]);

  useEffect(() => {
    localStorage.setItem(stepStorageKey, String(activeStep));
  }, [activeStep, stepStorageKey]);

  return (
    <>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={openHelp}
          title={triggerLabel}
          className="flex items-center gap-2 px-2 sm:px-3"
        >
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">{triggerLabel}</span>
          <span className="sm:hidden">Help</span>
        </Button>
        {steps.some((s) => s.targetSelector) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setIsOpen(false); tour.start(0); }}
            title="Start guided tour"
            className="flex items-center gap-1.5 px-2 sm:px-3 text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <PlayCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Tour</span>
          </Button>
        )}
      </div>

      {/* Overlay guided tour */}
      <GuidedTour
        isOpen={tour.isOpen}
        steps={steps}
        currentStep={tour.currentStep}
        isFirst={tour.isFirst}
        isLast={tour.isLast}
        progress={tour.progress}
        onNext={tour.next}
        onPrev={tour.prev}
        onClose={tour.close}
        onFinish={tour.close}
      />

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className={`[&>button]:hidden overflow-y-auto p-4 sm:p-6 ${
            isMaximized
              ? '!inset-0 !top-0 !left-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 !h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none sm:!max-w-none rounded-none'
              : isMinimized
                ? 'w-[calc(100vw-0.75rem)] max-w-[1200px] max-h-[180px] sm:w-[98vw] overflow-hidden'
                : '!inset-0 !top-0 !left-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 !h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none rounded-none sm:!inset-auto sm:!top-1/2 sm:!left-1/2 sm:!right-auto sm:!bottom-auto sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:!h-auto sm:!max-h-[92dvh] sm:!w-[98vw] sm:!max-w-[1200px] sm:rounded-lg'
          }`}
        >
          <DialogHeader>
            <div className="-mx-4 -mt-4 mb-3 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 sm:-mx-6 sm:-mt-6">
              <DialogTitle className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <ModuleIcon className="h-4 w-4 text-slate-600" />
                <span className="truncate">{title}</span>
              </DialogTitle>
              <div className="-mr-3 -my-1.5 ml-3 flex shrink-0 items-center">
                <Button
                  size="icon"
                  variant="ghost"
                  className="hidden h-8 w-11 rounded-none text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 sm:inline-flex"
                  onClick={() => {
                    if (!shouldMaximizeOnOpen()) {
                      return;
                    }
                    setIsMinimized((prev) => {
                      const next = !prev;
                      if (next) {
                        setIsMaximized(false);
                      }
                      return next;
                    });
                  }}
                  title={isMinimized ? 'Restore Help' : 'Minimize Help'}
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-11 rounded-none text-slate-700 hover:bg-slate-200/80 hover:text-slate-900"
                  onClick={() => {
                    setIsMaximized((prev) => {
                      const next = !prev;
                      if (next) {
                        setIsMinimized(false);
                      }
                      return next;
                    });
                  }}
                  title={isMaximized ? 'Restore Help Window' : 'Maximize Help Window'}
                >
                  {isMaximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-11 rounded-none text-slate-700 hover:bg-[#e81123] hover:text-white"
                  onClick={() => setIsOpen(false)}
                  title="Close Help"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {!isMinimized && (
            <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Guided Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {steps.map((step, index) => (
                  <button
                    key={step.title}
                    onClick={() => setActiveStep(index)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      activeStep === index
                        ? 'border-sky-300 bg-sky-50 text-sky-900'
                        : 'border-border bg-background hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{step.title}</span>
                      {activeStep === index && <CheckCircle2 className="h-4 w-4 text-sky-600" />}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{steps[activeStep]?.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{steps[activeStep]?.body}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {badges.map((badge) => (
                      <Badge key={`${badge.label}-${badge.value}`} variant={badge.variant || 'secondary'}>
                        {badge.label}: {badge.value}
                      </Badge>
                    ))}
                    <Badge variant="outline">Step {activeStep + 1} of {steps.length}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Try These Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                  {actions.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <Button
                        key={action.label}
                        variant={action.variant || 'outline'}
                        className={`justify-start min-w-0 whitespace-normal text-left ${action.fullWidth ? 'xl:col-span-2' : ''}`}
                        onClick={() => runAction(action.onClick)}
                      >
                        <ActionIcon className="mr-2 h-4 w-4" />
                        {action.label}
                      </Button>
                    );
                  })}
                </CardContent>
              </Card>

              {howToGuides.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">How To</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {howToGuides.map((guide) => (
                      <div key={guide.title} className="rounded-lg border border-border bg-background p-3">
                        <h4 className="text-sm font-semibold text-foreground">{guide.title}</h4>
                        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                          {guide.steps.map((step) => (
                            <li key={`${guide.title}-${step}`}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
