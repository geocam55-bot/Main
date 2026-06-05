/**
 * EmptyStateNudge — inline prompt shown when a module list is empty.
 *
 * Encourages the user to start by taking a primary action, with an optional
 * secondary link to open the module's guided tour.
 */
import type { LucideIcon } from 'lucide-react';
import { PlayCircle } from 'lucide-react';
import { Button } from './ui/button';

interface EmptyStateNudgeProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  /** If provided, shows a "Tour this module" secondary button. */
  onTour?: () => void;
}

export function EmptyStateNudge({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  onTour,
}: EmptyStateNudgeProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-400">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mb-1 text-base font-semibold text-foreground">{title}</h3>
      <p className="mb-6 max-w-xs text-sm text-muted-foreground leading-relaxed">{description}</p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button onClick={onAction}>{actionLabel}</Button>
      </div>
    </div>
  );
}
