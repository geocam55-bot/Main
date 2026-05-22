import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { AlertTriangle } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { Theme, getTheme, themes } from '../utils/themes';
import { sendSystemNotification } from '../utils/notifications';

export type ContrastIssue = {
  label: string;
  ratio: number;
  threshold: number;
  fgKey: string;
  bgKey: string;
  fgColor: string;
  bgColor: string;
  suggestion?: {
    key: string;
    color: string;
  };
};

function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('#')) return null;
  const raw = trimmed.slice(1);
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(raw)) return null;
  if (raw.length === 3) {
    return `#${raw
      .split('')
      .map((ch) => `${ch}${ch}`)
      .join('')
      .toLowerCase()}`;
  }
  return `#${raw.toLowerCase()}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function relativeLuminance(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

function getContrastRatio(foreground: string, background: string): number | null {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  if (!fg || !bg) return null;

  const fgLum =
    0.2126 * relativeLuminance(fg.r) +
    0.7152 * relativeLuminance(fg.g) +
    0.0722 * relativeLuminance(fg.b);
  const bgLum =
    0.2126 * relativeLuminance(bg.r) +
    0.7152 * relativeLuminance(bg.g) +
    0.0722 * relativeLuminance(bg.b);

  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  return (lighter + 0.05) / (darker + 0.05);
}

function blendHex(from: string, to: string, amount: number): string | null {
  const fromRgb = hexToRgb(from);
  const toRgb = hexToRgb(to);
  if (!fromRgb || !toRgb) return null;

  const blendChannel = (start: number, end: number) =>
    Math.round(start + (end - start) * amount)
      .toString(16)
      .padStart(2, '0');

  return `#${blendChannel(fromRgb.r, toRgb.r)}${blendChannel(fromRgb.g, toRgb.g)}${blendChannel(fromRgb.b, toRgb.b)}`;
}

function colorDistance(a: string, b: string): number {
  const aRgb = hexToRgb(a);
  const bRgb = hexToRgb(b);
  if (!aRgb || !bRgb) return Number.MAX_SAFE_INTEGER;

  return Math.sqrt(
    Math.pow(aRgb.r - bRgb.r, 2) +
    Math.pow(aRgb.g - bRgb.g, 2) +
    Math.pow(aRgb.b - bRgb.b, 2)
  );
}

function findNearestAccessibleColor(
  adjustableColor: string,
  fixedColor: string,
  threshold: number,
  adjustRole: 'fg' | 'bg'
): string | null {
  const normalizedAdjustable = normalizeHex(adjustableColor);
  const normalizedFixed = normalizeHex(fixedColor);
  if (!normalizedAdjustable || !normalizedFixed) return null;

  let bestCandidate: string | null = null;
  let bestDistance = Number.MAX_SAFE_INTEGER;

  ['#000000', '#ffffff'].forEach((targetColor) => {
    for (let step = 1; step <= 100; step += 1) {
      const candidate = blendHex(normalizedAdjustable, targetColor, step / 100);
      if (!candidate) continue;

      const ratio = adjustRole === 'fg'
        ? getContrastRatio(candidate, normalizedFixed)
        : getContrastRatio(normalizedFixed, candidate);

      if (ratio !== null && ratio >= threshold) {
        const distance = colorDistance(normalizedAdjustable, candidate);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestCandidate = candidate;
        }
        break;
      }
    }
  });

  return bestCandidate;
}

function getSuggestedFix(
  fgKey: string,
  bgKey: string,
  fgColor: string,
  bgColor: string,
  threshold: number
): { key: string; color: string } | undefined {
  const preferBackgroundAdjustment = [
    'primaryText',
    'accentText',
    'destructiveText',
    'topBarText',
  ].includes(fgKey) && (normalizeHex(fgColor) === '#ffffff');

  if (preferBackgroundAdjustment) {
    const bgSuggestion = findNearestAccessibleColor(bgColor, fgColor, threshold, 'bg');
    if (bgSuggestion) {
      return { key: bgKey, color: bgSuggestion };
    }
  }

  const fgSuggestion = findNearestAccessibleColor(fgColor, bgColor, threshold, 'fg');
  if (fgSuggestion) {
    return { key: fgKey, color: fgSuggestion };
  }

  const bgSuggestion = findNearestAccessibleColor(bgColor, fgColor, threshold, 'bg');
  if (bgSuggestion) {
    return { key: bgKey, color: bgSuggestion };
  }

  return undefined;
}

export function getContrastIssues(colors: Record<string, string>): ContrastIssue[] {
  const checks: Array<{ fg: string; bg: string; threshold: number; label: string }> = [
    { fg: 'text', bg: 'background', threshold: 4.5, label: 'Text on Background' },
    { fg: 'textSecondary', bg: 'background', threshold: 4.5, label: 'Secondary Text on Background' },
    { fg: 'textMuted', bg: 'background', threshold: 3, label: 'Muted Text on Background' },
    { fg: 'cardText', bg: 'card', threshold: 4.5, label: 'Card Text on Card' },
    { fg: 'primaryText', bg: 'primary', threshold: 4.5, label: 'Primary Button Text' },
    { fg: 'secondaryText', bg: 'secondary', threshold: 4.5, label: 'Secondary Button Text' },
    { fg: 'accentText', bg: 'accent', threshold: 4.5, label: 'Accent Button Text' },
    { fg: 'destructiveText', bg: 'destructive', threshold: 4.5, label: 'Destructive Button Text' },
    { fg: 'topBarText', bg: 'topBarBackground', threshold: 4.5, label: 'Top Bar Text' },
  ];

  const issues: ContrastIssue[] = [];

  checks.forEach((check) => {
    const fg = colors[check.fg];
    const bg = colors[check.bg];
    if (!fg || !bg) return;

    const normalizedFg = normalizeHex(fg) ?? fg;
    const normalizedBg = normalizeHex(bg) ?? bg;
    const ratio = getContrastRatio(normalizedFg, normalizedBg);
    if (ratio !== null && ratio < check.threshold) {
      issues.push({
        label: check.label,
        ratio,
        threshold: check.threshold,
        fgKey: check.fg,
        bgKey: check.bg,
        fgColor: normalizedFg,
        bgColor: normalizedBg,
        suggestion: getSuggestedFix(check.fg, check.bg, normalizedFg, normalizedBg, check.threshold),
      });
    }
  });

  return issues;
}

interface ThemeEditorProps {
  themeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const colorGroups = [
  {
    title: 'Background',
    keys: ['background', 'backgroundSecondary', 'backgroundTertiary'],
  },
  {
    title: 'Text',
    keys: ['text', 'textSecondary', 'textMuted'],
  },
  {
    title: 'Primary',
    keys: ['primary', 'primaryHover', 'primaryText'],
  },
  {
    title: 'Secondary',
    keys: ['secondary', 'secondaryText'],
  },
  {
    title: 'Accent',
    keys: ['accent', 'accentHover', 'accentText'],
  },
  {
    title: 'Border & Input',
    keys: ['border', 'borderLight', 'input'],
  },
  {
    title: 'Card',
    keys: ['card', 'cardHover', 'cardText'],
  },
  {
    title: 'Status',
    keys: ['success', 'warning', 'error', 'info'],
  },
  {
    title: 'Destructive',
    keys: ['destructive', 'destructiveText'],
  },
  {
    title: 'Navigation',
    keys: ['navBackground', 'navText', 'navHover', 'navActive'],
  },
  {
    title: 'Top Bar',
    keys: ['topBarBackground', 'topBarText'],
  },
  {
    title: 'Special Effects',
    keys: ['gradient', 'shadow'],
  },
] as const;

export function ThemeEditor({ themeId, open, onOpenChange }: ThemeEditorProps) {
  const { theme, updateThemeColors } = useTheme();
  const [colors, setColors] = useState<Record<string, string>>({});
  const contrastIssues = getContrastIssues(colors);
  const contrastIssueByKey = new Map(
    contrastIssues.flatMap((issue) => [
      [issue.fgKey, issue],
      [issue.bgKey, issue],
    ])
  );

  useEffect(() => {
    if (open && themeId) {
      const activeTheme = getTheme(themeId);
      setColors(activeTheme.colors as unknown as Record<string, string>);
    }
  }, [open, themeId]);

  const handleChange = (key: string, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (themeId) {
      updateThemeColors(themeId, colors as Partial<Theme['colors']>);
      sendSystemNotification('Theme Saved!', { 
        body: 'Your custom color theme has been applied successfully.',
        icon: '/favicon.ico'
      });
    }
    onOpenChange(false);
  };

  if (!themeId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0 sm:rounded-xl shadow-2xl overflow-hidden bg-background dark:bg-slate-950 text-foreground border-border">
        <div className="p-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle>Edit Theme Colors</DialogTitle>
            <DialogDescription>
              Customize the active colors for this theme. Changes will be saved locally.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="flex-1 overflow-y-auto min-h-0 p-6 kitchen-planner-scroll">
          {contrastIssues.length > 0 && (
            <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
              <div className="flex items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  Contrast Warning
                </h4>
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold">
                  {contrastIssues.length} issue{contrastIssues.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-800">
                Some color pairs are below recommended contrast thresholds for readability, especially on mobile.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {contrastIssues.map((issue) => (
                  <div
                    key={issue.label}
                    className="rounded-md border border-amber-200 bg-white/70 px-2.5 py-2 text-xs"
                  >
                    <div className="font-medium text-amber-900">{issue.label}</div>
                    <div className="text-amber-700">
                      Ratio {issue.ratio.toFixed(2)}:1 (target {issue.threshold.toFixed(1)}:1)
                    </div>
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-900">
                        <span
                          className="h-3 w-3 rounded border border-slate-300"
                          style={{ backgroundColor: issue.fgColor }}
                        />
                        <span className="font-mono">{issue.fgKey}</span>
                        <span className="text-amber-700">{issue.fgColor}</span>
                      </div>
                      <div className="flex items-center gap-2 text-amber-900">
                        <span
                          className="h-3 w-3 rounded border border-slate-300"
                          style={{ backgroundColor: issue.bgColor }}
                        />
                        <span className="font-mono">{issue.bgKey}</span>
                        <span className="text-amber-700">{issue.bgColor}</span>
                      </div>
                      <div
                        className="mt-2 rounded border border-slate-200 px-2 py-1.5 text-center font-semibold"
                        style={{ color: issue.fgColor, backgroundColor: issue.bgColor }}
                      >
                        Preview of the conflict
                      </div>
                      {issue.suggestion && (
                        <div className="mt-2 rounded border border-emerald-200 bg-emerald-50 px-2 py-2 text-emerald-900">
                          <div className="text-xs font-semibold">
                            Suggested fix: <span className="font-mono">{issue.suggestion.key}</span> {'->'} <span className="font-mono">{issue.suggestion.color}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div
                              className="rounded border border-emerald-200 px-2 py-1 text-center text-xs font-semibold"
                              style={{
                                color: issue.suggestion.key === issue.fgKey ? issue.suggestion.color : issue.fgColor,
                                backgroundColor: issue.suggestion.key === issue.bgKey ? issue.suggestion.color : issue.bgColor,
                              }}
                            >
                              Preview with suggestion
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleChange(issue.suggestion!.key, issue.suggestion!.color)}
                              className="h-7 border-emerald-300 text-emerald-900 hover:bg-emerald-100"
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-4">
            {colorGroups.map(group => (
              <div key={group.title} className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground border-b pb-1">
                  {group.title}
                </h4>
                <div className="space-y-2.5">
                  {group.keys.map(key => {
                    const value = colors[key] || '';
                    const isColor = value.startsWith('#') || value.startsWith('rgb');
                    const isComplex = !value.startsWith('#') && value.length > 0;
                    const contrastIssue = contrastIssueByKey.get(key);
                    
                    return (
                      <div key={key} className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs font-medium">{key}</Label>
                          {contrastIssue && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                              <AlertTriangle className="h-3 w-3" />
                              Contrast
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!isComplex && (
                            <div className="relative w-8 h-8 rounded border shadow-sm overflow-hidden flex-shrink-0">
                              <input
                                type="color"
                                value={value.startsWith('#') && value.length === 7 ? value : '#000000'}
                                onChange={(e) => handleChange(key, e.target.value)}
                                className="absolute inset-[-10px] w-[50px] h-[50px] cursor-pointer"
                              />
                            </div>
                          )}
                          <Input
                            value={value}
                            onChange={(e) => handleChange(key, e.target.value)}
                            className="h-8 text-xs flex-1 font-mono"
                            placeholder={isComplex ? 'e.g. linear-gradient(...)' : '#000000'}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 border-t flex justify-between gap-2 rounded-b-xl bg-muted/20">
          <Button 
            variant="ghost" 
            className="text-muted-foreground hover:text-destructive"
            onClick={() => {
              if (themeId) {
                // Delete custom colors from localStorage
                localStorage.removeItem(`prospace-theme-custom-${themeId}`);
                // Refresh local state to defaults
                const baseTheme = themes[themeId] || themes.vibrant;
                setColors(baseTheme.colors as unknown as Record<string, string>);
              }
            }}
          >
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Colors</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
