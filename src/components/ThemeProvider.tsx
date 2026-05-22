import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Theme, getTheme, saveTheme, loadTheme, saveThemeToDatabase, loadThemeFromDatabase } from '../utils/themes';

export type ThemeMode = 'light' | 'dark' | 'system';

// Fallback theme used when useTheme is called outside of ThemeProvider
// (e.g. during hot-reload boundary resets)
const fallbackTheme = getTheme('vibrant');
const fallbackContext: ThemeContextType = {
  theme: fallbackTheme,
  themeId: 'vibrant',
  setTheme: () => {},
  updateThemeColors: () => {},
  themeMode: 'system',
  setThemeMode: () => {},
};

interface ThemeContextType {
  theme: Theme;
  themeId: string;
  setTheme: (themeId: string) => void;
  updateThemeColors: (themeId: string, colors: Partial<Theme['colors']>) => void;
  userId?: string;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Convert hex to HSL format for Tailwind CSS variables
function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
}

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

function ensureMinContrast(
  foreground: string,
  background: string,
  minRatio: number,
  fallbacks: string[]
): string {
  const directRatio = getContrastRatio(foreground, background);
  if (directRatio !== null && directRatio >= minRatio) {
    return foreground;
  }

  let bestColor = foreground;
  let bestRatio = directRatio ?? 0;
  const candidates = [...fallbacks, '#111111', '#ffffff'];

  for (const candidate of candidates) {
    const ratio = getContrastRatio(candidate, background);
    if (ratio !== null && ratio > bestRatio) {
      bestRatio = ratio;
      bestColor = candidate;
    }
  }

  return bestColor;
}

function getContrastSafeColors(colors: Theme['colors']): Theme['colors'] {
  return {
    ...colors,
    text: ensureMinContrast(colors.text, colors.background, 4.5, [colors.textSecondary]),
    textSecondary: ensureMinContrast(colors.textSecondary, colors.background, 4.5, [colors.text, colors.cardText]),
    textMuted: ensureMinContrast(colors.textMuted, colors.background, 3, [colors.textSecondary, colors.text]),
    cardText: ensureMinContrast(colors.cardText, colors.card, 4.5, [colors.text, colors.textSecondary]),
    primaryText: ensureMinContrast(colors.primaryText, colors.primary, 4.5, [colors.text, '#111111', '#ffffff']),
    secondaryText: ensureMinContrast(colors.secondaryText, colors.secondary, 4.5, [colors.text, colors.cardText]),
    accentText: ensureMinContrast(colors.accentText, colors.accent, 4.5, [colors.text, '#111111', '#ffffff']),
    destructiveText: ensureMinContrast(colors.destructiveText, colors.destructive, 4.5, [colors.text, '#111111', '#ffffff']),
    topBarText: ensureMinContrast(colors.topBarText, colors.topBarBackground, 4.5, [colors.text, '#111111', '#ffffff']),
  };
}

export function ThemeProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(loadThemeMode());
  const [themeId, setThemeId] = useState<string>(loadTheme());
  const [theme, setThemeState] = useState<Theme>(getTheme(themeId));
  const [customColorsVersion, setCustomColorsVersion] = useState(0);

  // Resolve theme based on mode
  const resolveThemeForMode = useCallback((mode: ThemeMode): string => {
    if (mode === 'light') return getPreferredThemeForMode('light');
    if (mode === 'dark') return getPreferredThemeForMode('dark');
    // system mode
    return getSystemPrefersDark() ? getPreferredThemeForMode('dark') : getPreferredThemeForMode('light');
  }, []);

  // Handle mode change
  const handleSetThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    saveThemeModeToStorage(mode);
    const resolvedId = mode === 'light'
      ? getPreferredThemeForMode('light')
      : mode === 'dark'
        ? getPreferredThemeForMode('dark')
        : getSystemPrefersDark()
          ? getPreferredThemeForMode('dark')
          : getPreferredThemeForMode('light');
    setThemeId(resolvedId);
    saveTheme(resolvedId);
    if (userId) {
      await saveThemeToDatabase(resolvedId, userId);
    }
    // Persist mode to server
    if (userId) {
      try {
        const { projectId, publicAnonKey } = await import('../utils/supabase/info');
        const { createClient } = await import('../utils/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/settings/theme`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'X-User-Token': session.access_token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ theme: resolvedId, themeMode: mode }),
          });
        }
      } catch {
        // Non-fatal: mode saved locally
      }
    }
  }, [userId]);

  // Listen for system preference changes when in system mode
  useEffect(() => {
    if (themeMode !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const resolvedId = e.matches ? getPreferredThemeForMode('dark') : getPreferredThemeForMode('light');
      setThemeId(resolvedId);
      saveTheme(resolvedId);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [themeMode]);

  const updateThemeColors = (id: string, colors: Partial<Theme['colors']>) => {
    try {
      const existing = localStorage.getItem(`prospace-theme-custom-${id}`);
      const parsed = existing ? JSON.parse(existing) : {};
      const newCustomColors = { ...parsed, ...colors };
      localStorage.setItem(`prospace-theme-custom-${id}`, JSON.stringify(newCustomColors));
      if (id === themeId) {
        setThemeState(getTheme(themeId));
      }
      setCustomColorsVersion(v => v + 1);
    } catch (e) {
      // Ignored
    }
  };

  // Load theme from database on mount if user is logged in
  useEffect(() => {
    const loadUserTheme = async () => {
      let activeMode = loadThemeMode();

      if (userId) {
        // Loading theme for user
        const dbResult = await loadThemeFromDatabase(userId);
        const dbTheme = dbResult.theme;
        const dbMode = dbResult.themeMode as ThemeMode | null;
        
        if (dbMode && (dbMode === 'light' || dbMode === 'dark' || dbMode === 'system')) {
          setThemeModeState(dbMode);
          saveThemeModeToStorage(dbMode);
          activeMode = dbMode;
        }

        // If the mode is system, we must respect the current device's system preference
        // rather than blindly applying the last saved exact theme from DB.
        if (activeMode === 'system') {
          const systemPrefersDark = getSystemPrefersDark();
          
          // If the DB provided a theme and its light/dark nature matches the system preference, use it!
          // This ensures cross-device sync of the specific theme works even in system mode.
          let resolvedId = systemPrefersDark 
            ? getPreferredThemeForMode('dark') 
            : getPreferredThemeForMode('light');

          if (dbTheme) {
            const isDbThemeDark = getTheme(dbTheme).isDark;
            if (isDbThemeDark === systemPrefersDark) {
              resolvedId = dbTheme;
            }
          }
          
          setThemeId(resolvedId);
          saveTheme(resolvedId);
          
          if (systemPrefersDark) {
            savePreferredThemeForMode('dark', resolvedId);
          } else {
            savePreferredThemeForMode('light', resolvedId);
          }
        } else if (dbTheme) {
          // Mode is 'light' or 'dark', and we have a specific theme from DB
          setThemeId(dbTheme);
          saveTheme(dbTheme); // Also save to localStorage
          // Track the preferred theme for current mode
          const currentThemeObj = getTheme(dbTheme);
          if (currentThemeObj.isDark) {
            savePreferredThemeForMode('dark', dbTheme);
          } else {
            savePreferredThemeForMode('light', dbTheme);
          }
        } else {
          // No theme found in database, using localStorage or default
          const localTheme = loadTheme();
          setThemeId(localTheme);
        }
      } else {
        // No user ID, loading theme from localStorage
        const localTheme = loadTheme();
        
        if (activeMode === 'system') {
          const systemPrefersDark = getSystemPrefersDark();
          const resolvedId = systemPrefersDark 
            ? getPreferredThemeForMode('dark') 
            : getPreferredThemeForMode('light');
          setThemeId(resolvedId);
        } else {
          setThemeId(localTheme);
        }
      }
    };
    
    loadUserTheme();
  }, [userId]);

  useEffect(() => {
    const newTheme = getTheme(themeId);
    setThemeState(newTheme);
    saveTheme(themeId);
    // Applying theme
    const safeColors = getContrastSafeColors(newTheme.colors);
    
    // Apply theme colors to CSS variables
    const root = document.documentElement;
    
    // ─── Toggle dark class for dark: prefixed Tailwind classes ───
    if (newTheme.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // ─── Set hex color variables (for direct use) ───
    root.style.setProperty('--color-background', safeColors.background);
    root.style.setProperty('--color-background-secondary', safeColors.backgroundSecondary);
    root.style.setProperty('--color-background-tertiary', safeColors.backgroundTertiary);
    root.style.setProperty('--color-text', safeColors.text);
    root.style.setProperty('--color-text-secondary', safeColors.textSecondary);
    root.style.setProperty('--color-text-muted', safeColors.textMuted);
    root.style.setProperty('--color-primary', safeColors.primary);
    root.style.setProperty('--color-primary-hover', safeColors.primaryHover);
    root.style.setProperty('--color-primary-text', safeColors.primaryText);
    root.style.setProperty('--color-accent', safeColors.accent);
    root.style.setProperty('--color-accent-hover', safeColors.accentHover);
    root.style.setProperty('--color-border', safeColors.border);
    root.style.setProperty('--color-border-light', safeColors.borderLight);
    root.style.setProperty('--color-card', safeColors.card);
    root.style.setProperty('--color-card-hover', safeColors.cardHover);
    root.style.setProperty('--color-success', safeColors.success);
    root.style.setProperty('--color-warning', safeColors.warning);
    root.style.setProperty('--color-error', safeColors.error);
    root.style.setProperty('--color-info', safeColors.info);
    root.style.setProperty('--color-nav-background', safeColors.navBackground);
    root.style.setProperty('--color-nav-text', safeColors.navText);
    root.style.setProperty('--color-nav-hover', safeColors.navHover);
    root.style.setProperty('--color-nav-active', safeColors.navActive);
    root.style.setProperty('--color-topbar-background', safeColors.topBarBackground);
    root.style.setProperty('--color-topbar-text', safeColors.topBarText);
    root.style.setProperty('--shadow', safeColors.shadow);
    
    if (safeColors.gradient) {
      root.style.setProperty('--gradient', safeColors.gradient);
    }
    
    // ─── Set ALL Tailwind HSL variables consumed by UI components ───
    // Background / Foreground
    root.style.setProperty('--background', hexToHSL(safeColors.background));
    root.style.setProperty('--foreground', hexToHSL(safeColors.text));
    
    // Card
    root.style.setProperty('--card', hexToHSL(safeColors.card));
    root.style.setProperty('--card-foreground', hexToHSL(safeColors.cardText));
    
    // Popover (same as card)
    root.style.setProperty('--popover', hexToHSL(safeColors.card));
    root.style.setProperty('--popover-foreground', hexToHSL(safeColors.cardText));
    
    // Primary
    root.style.setProperty('--primary', hexToHSL(safeColors.primary));
    root.style.setProperty('--primary-foreground', hexToHSL(safeColors.primaryText));
    
    // Secondary (PREVIOUSLY MISSING - caused light buttons on dark themes)
    root.style.setProperty('--secondary', hexToHSL(safeColors.secondary));
    root.style.setProperty('--secondary-foreground', hexToHSL(safeColors.secondaryText));
    
    // Muted
    root.style.setProperty('--muted', hexToHSL(safeColors.backgroundTertiary));
    root.style.setProperty('--muted-foreground', hexToHSL(safeColors.textMuted));
    
    // Accent (ACCENT-FOREGROUND PREVIOUSLY MISSING - caused dark hover text on dark themes)
    root.style.setProperty('--accent', hexToHSL(safeColors.accent));
    root.style.setProperty('--accent-foreground', hexToHSL(safeColors.accentText));
    
    // Destructive (PREVIOUSLY MISSING)
    root.style.setProperty('--destructive', hexToHSL(safeColors.destructive));
    root.style.setProperty('--destructive-foreground', hexToHSL(safeColors.destructiveText));
    
    // Border & Input
    root.style.setProperty('--border', hexToHSL(safeColors.border));
    root.style.setProperty('--input', hexToHSL(safeColors.input));
    
    // Ring
    root.style.setProperty('--ring', hexToHSL(safeColors.primary));

    // Mobile control vars keep form controls readable even for custom themes.
    root.style.setProperty('--mobile-control-background', safeColors.card);
    root.style.setProperty('--mobile-control-foreground', ensureMinContrast(safeColors.cardText, safeColors.card, 4.5, [safeColors.text, safeColors.textSecondary]));
    root.style.setProperty('--mobile-control-placeholder', ensureMinContrast(safeColors.textMuted, safeColors.card, 3, [safeColors.textSecondary, safeColors.text]));
  }, [themeId, customColorsVersion]);

  const handleSetTheme = async (newThemeId: string) => {
    // Setting theme
    setThemeId(newThemeId);
    saveTheme(newThemeId); // Save to localStorage immediately

    // Also save as preferred theme for this mode category
    const newThemeObj = getTheme(newThemeId);
    if (newThemeObj.isDark) {
      savePreferredThemeForMode('dark', newThemeId);
    } else {
      savePreferredThemeForMode('light', newThemeId);
    }
    
    if (userId) {
      // Saving theme to database for user
      await saveThemeToDatabase(newThemeId, userId);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, themeId, setTheme: handleSetTheme, updateThemeColors, userId, themeMode, setThemeMode: handleSetThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return a safe fallback instead of throwing so hot-reload and
    // component-tree race conditions don't crash the app.
    // Only warn in development mode to avoid console spam
    if (process.env.NODE_ENV === 'development') {
      // useTheme called outside ThemeProvider – using fallback theme
    }
    return fallbackContext;
  }
  return context;
}

// Helper to get the stored preferred theme for a given mode
function getPreferredThemeForMode(mode: 'light' | 'dark'): string {
  try {
    return localStorage.getItem(`prospace-preferred-${mode}-theme`) || (mode === 'light' ? 'vibrant' : 'dark');
  } catch {
    return mode === 'light' ? 'vibrant' : 'dark';
  }
}

function savePreferredThemeForMode(mode: 'light' | 'dark', themeId: string): void {
  try {
    localStorage.setItem(`prospace-preferred-${mode}-theme`, themeId);
  } catch {
    // Ignored
  }
}

function loadThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem('prospace-theme-mode');
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // Ignored
  }
  return 'system';
}

function saveThemeModeToStorage(mode: ThemeMode): void {
  try {
    localStorage.setItem('prospace-theme-mode', mode);
  } catch {
    // Ignored
  }
}

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}