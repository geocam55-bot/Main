import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Theme, getTheme, saveTheme, loadTheme, saveThemeToDatabase, loadThemeFromDatabase } from '../utils/themes';

export type ThemeMode = 'light' | 'dark' | 'system';

// Fallback theme used when useTheme is called outside of ThemeProvider
// (e.g. during hot-reload boundary resets)
const fallbackTheme = getTheme('dark');
const fallbackContext: ThemeContextType = {
  theme: fallbackTheme,
  themeId: 'dark',
  setTheme: () => {},
  updateThemeColors: () => {},
  themeMode: 'dark',
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

function applyThemeStylesToDom(targetTheme: Theme) {
  const safeColors = getContrastSafeColors(targetTheme.colors);
  const root = document.documentElement;

  if (targetTheme.isDark) {
    root.classList.add('dark');
    document.body.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.setAttribute('data-mode', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    document.body.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.setAttribute('data-mode', 'light');
    root.style.colorScheme = 'light';
  }

  root.style.backgroundColor = safeColors.background;
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

  root.style.setProperty('--gradient', safeColors.gradient || safeColors.background);

  root.style.setProperty('--background', hexToHSL(safeColors.background));
  root.style.setProperty('--foreground', hexToHSL(safeColors.text));
  root.style.setProperty('--card', hexToHSL(safeColors.card));
  root.style.setProperty('--card-foreground', hexToHSL(safeColors.cardText));
  root.style.setProperty('--popover', hexToHSL(safeColors.card));
  root.style.setProperty('--popover-foreground', hexToHSL(safeColors.cardText));
  root.style.setProperty('--primary', hexToHSL(safeColors.primary));
  root.style.setProperty('--primary-foreground', hexToHSL(safeColors.primaryText));
  root.style.setProperty('--secondary', hexToHSL(safeColors.secondary));
  root.style.setProperty('--secondary-foreground', hexToHSL(safeColors.secondaryText));
  root.style.setProperty('--muted', hexToHSL(safeColors.backgroundTertiary));
  root.style.setProperty('--muted-foreground', hexToHSL(safeColors.textMuted));
  root.style.setProperty('--accent', hexToHSL(targetTheme.isDark ? safeColors.backgroundTertiary : '#EFF6FF'));
  root.style.setProperty('--accent-foreground', hexToHSL(targetTheme.isDark ? '#F8FAFC' : '#0F172A'));
  root.style.setProperty('--destructive', hexToHSL(safeColors.destructive));
  root.style.setProperty('--destructive-foreground', hexToHSL(safeColors.destructiveText));
  root.style.setProperty('--border', hexToHSL(safeColors.border));
  root.style.setProperty('--input', hexToHSL(safeColors.input));
  root.style.setProperty('--ring', hexToHSL(safeColors.primary));

  if (targetTheme.isDark) {
    root.style.setProperty('--prospaces-bg-main', '#0A0F1D');
    root.style.setProperty('--prospaces-bg-depth', '#0F172A');
    root.style.setProperty('--prospaces-bg-card', '#0F172A');
    root.style.setProperty('--prospaces-bg-bottom-nav', '#020617');
    root.style.setProperty('--prospaces-text-heading', '#F8FAFC');
    root.style.setProperty('--prospaces-text-body', '#CBD5E1');
    root.style.setProperty('--prospaces-text-secondary', '#94A3B8');
    root.style.setProperty('--prospaces-text-disabled', '#64748B');
    root.style.setProperty('--prospaces-input-bg', '#0F172A');
    root.style.setProperty('--prospaces-input-border', '#334155');
    root.style.setProperty('--prospaces-input-border-focus', '#3B82F6');
    root.style.setProperty('--prospaces-input-text', '#F8FAFC');
    root.style.setProperty('--prospaces-input-placeholder', '#64748B');
    root.style.setProperty('--prospaces-input-icon', '#94A3B8');
    root.style.setProperty('--prospaces-btn-red', '#3B82F6');
    root.style.setProperty('--prospaces-btn-red-hover', '#2563EB');
    root.style.setProperty('--prospaces-btn-red-text', '#FFFFFF');
    root.style.setProperty('--prospaces-link', '#60A5FA');
    root.style.setProperty('--prospaces-nav-active', '#2563EB');
    root.style.setProperty('--prospaces-nav-icon-active', '#60A5FA');
    root.style.setProperty('--prospaces-nav-text-active', '#93C5FD');
    root.style.setProperty('--prospaces-nav-icon-inactive', '#94A3B8');
    root.style.setProperty('--prospaces-nav-text-inactive', '#94A3B8');
    root.style.setProperty('--prospaces-nav-border', '#1E293B');
    root.style.setProperty('--prospaces-social-bg', '#0F172A');
    root.style.setProperty('--prospaces-social-border', '#334155');
    root.style.setProperty('--prospaces-social-text', '#F8FAFC');
    root.style.setProperty('--prospaces-social-apple-icon', '#FFFFFF');
  } else {
    root.style.setProperty('--prospaces-bg-main', '#F8FAFC');
    root.style.setProperty('--prospaces-bg-depth', '#FFFFFF');
    root.style.setProperty('--prospaces-bg-card', '#FFFFFF');
    root.style.setProperty('--prospaces-bg-bottom-nav', '#FFFFFF');
    root.style.setProperty('--prospaces-text-heading', '#0F172A');
    root.style.setProperty('--prospaces-text-body', '#334155');
    root.style.setProperty('--prospaces-text-secondary', '#64748B');
    root.style.setProperty('--prospaces-text-disabled', '#94A3B8');
    root.style.setProperty('--prospaces-input-bg', '#FFFFFF');
    root.style.setProperty('--prospaces-input-border', '#CBD5E1');
    root.style.setProperty('--prospaces-input-border-focus', '#1E6FD9');
    root.style.setProperty('--prospaces-input-text', '#0F172A');
    root.style.setProperty('--prospaces-input-placeholder', '#94A3B8');
    root.style.setProperty('--prospaces-input-icon', '#64748B');
    root.style.setProperty('--prospaces-btn-red', '#1E6FD9');
    root.style.setProperty('--prospaces-btn-red-hover', '#155FBC');
    root.style.setProperty('--prospaces-btn-red-text', '#FFFFFF');
    root.style.setProperty('--prospaces-link', '#1E6FD9');
    root.style.setProperty('--prospaces-nav-active', '#1E6FD9');
    root.style.setProperty('--prospaces-nav-icon-active', '#1E6FD9');
    root.style.setProperty('--prospaces-nav-text-active', '#1E6FD9');
    root.style.setProperty('--prospaces-nav-icon-inactive', '#64748B');
    root.style.setProperty('--prospaces-nav-text-inactive', '#475569');
    root.style.setProperty('--prospaces-nav-border', '#E2E8F0');
    root.style.setProperty('--prospaces-social-bg', '#FFFFFF');
    root.style.setProperty('--prospaces-social-border', '#CBD5E1');
    root.style.setProperty('--prospaces-social-text', '#0F172A');
    root.style.setProperty('--prospaces-social-apple-icon', '#000000');
  }

  root.style.setProperty('--mobile-control-background', safeColors.card);
  root.style.setProperty('--mobile-control-foreground', ensureMinContrast(safeColors.cardText, safeColors.card, 4.5, [safeColors.text, safeColors.textSecondary]));
  root.style.setProperty('--mobile-control-placeholder', ensureMinContrast(safeColors.textMuted, safeColors.card, 3, [safeColors.textSecondary, safeColors.text]));
}

export function ThemeProvider({ children, userId, forceDark = false }: { children: ReactNode; userId?: string; forceDark?: boolean }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(loadThemeMode());
  const [themeId, setThemeId] = useState<string>(loadTheme());
  const [theme, setThemeState] = useState<Theme>(() => getTheme(loadTheme()));
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
    try {
      localStorage.setItem('prospace-theme-updated-at', String(Date.now()));
    } catch {
      // Ignored
    }
    const immediateTheme = getTheme(resolvedId);
    setThemeState(immediateTheme);

    if (!forceDark) {
      applyThemeStylesToDom(immediateTheme);
    }

    if (userId) {
      await saveThemeToDatabase(resolvedId, userId, mode);
    }
  }, [userId, forceDark]);

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

  // Re-sync from localStorage on bfcache restore (browser Back button) or cross-tab storage change
  useEffect(() => {
    const syncFromStorage = () => {
      if (forceDark) return;
      const latestMode = loadThemeMode();
      const latestThemeId = latestMode === 'system'
        ? (getSystemPrefersDark() ? getPreferredThemeForMode('dark') : getPreferredThemeForMode('light'))
        : loadTheme();
      const latestThemeObj = getTheme(latestThemeId);

      setThemeModeState(latestMode);
      setThemeId(latestThemeId);
      setThemeState(latestThemeObj);
      applyThemeStylesToDom(latestThemeObj);
    };

    const handlePageShow = () => {
      syncFromStorage();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'prospace-theme' || e.key === 'prospace-theme-mode') {
        syncFromStorage();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('storage', handleStorage);
    };
  }, [forceDark]);

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
      const wasMigratedBeforeMount = localStorage.getItem('prospace-theme-midnight-v1') === '1';
      let activeMode = loadThemeMode();

      if (userId) {
        // If user just changed theme locally in the last 15s (e.g. just before moving back),
        // preserve the fresh local choice and ensure DB receives it rather than overwriting with stale DB state.
        const updatedAt = Number(localStorage.getItem('prospace-theme-updated-at') || '0');
        if (updatedAt && Date.now() - updatedAt < 15000) {
          const localMode = loadThemeMode();
          const localTheme = localMode === 'system'
            ? (getSystemPrefersDark() ? getPreferredThemeForMode('dark') : getPreferredThemeForMode('light'))
            : loadTheme();
          setThemeModeState(localMode);
          setThemeId(localTheme);
          await saveThemeToDatabase(localTheme, userId, localMode);
          return;
        }

        const dbResult = await loadThemeFromDatabase(userId);
        const dbTheme = dbResult.theme;
        const dbMode = dbResult.themeMode as ThemeMode | null;

        // Upgrade legacy pre-Midnight-Dark users only when no explicit themeMode/theme was saved
        if (!wasMigratedBeforeMount && !dbMode && !dbTheme) {
          localStorage.setItem('prospace-theme-midnight-v1', '1');
          setThemeModeState('dark');
          saveThemeModeToStorage('dark');
          setThemeId('dark');
          saveTheme('dark');
          savePreferredThemeForMode('dark', 'dark');
          await saveThemeToDatabase('dark', userId, 'dark');
          return;
        }
        if (!wasMigratedBeforeMount) {
          localStorage.setItem('prospace-theme-midnight-v1', '1');
        }
        
        if (dbMode && (dbMode === 'light' || dbMode === 'dark' || dbMode === 'system')) {
          setThemeModeState(dbMode);
          saveThemeModeToStorage(dbMode);
          activeMode = dbMode;
        } else if (dbTheme) {
          const inferredMode: ThemeMode = getTheme(dbTheme).isDark ? 'dark' : 'light';
          setThemeModeState(inferredMode);
          saveThemeModeToStorage(inferredMode);
          activeMode = inferredMode;
        }

        // If the mode is system, we must respect the current device's system preference
        // rather than blindly applying the last saved exact theme from DB.
        if (activeMode === 'system') {
          const systemPrefersDark = getSystemPrefersDark();
          
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
          setThemeId(dbTheme);
          saveTheme(dbTheme);
          const currentThemeObj = getTheme(dbTheme);
          if (currentThemeObj.isDark) {
            savePreferredThemeForMode('dark', dbTheme);
          } else {
            savePreferredThemeForMode('light', dbTheme);
          }
        } else {
          const localTheme = loadTheme();
          setThemeId(localTheme);
        }
      } else {
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
    if (forceDark) {
      const darkTheme = getTheme('dark');
      setThemeState(darkTheme);
      applyThemeStylesToDom(darkTheme);
      return;
    }

    const newTheme = getTheme(themeId);
    setThemeState(newTheme);
    saveTheme(themeId);
    applyThemeStylesToDom(newTheme);
  }, [themeId, customColorsVersion, forceDark]);

  const handleSetTheme = async (newThemeId: string) => {
    setThemeId(newThemeId);
    saveTheme(newThemeId); // Save to localStorage immediately
    try {
      localStorage.setItem('prospace-theme-updated-at', String(Date.now()));
    } catch {
      // Ignored
    }

    // Sync themeMode and preferred theme for this mode category
    const newThemeObj = getTheme(newThemeId);
    setThemeState(newThemeObj);
    const targetMode: ThemeMode = newThemeObj.isDark ? 'dark' : 'light';
    setThemeModeState(targetMode);
    saveThemeModeToStorage(targetMode);

    if (newThemeObj.isDark) {
      savePreferredThemeForMode('dark', newThemeId);
    } else {
      savePreferredThemeForMode('light', newThemeId);
    }

    if (!forceDark) {
      applyThemeStylesToDom(newThemeObj);
    }
    
    if (userId) {
      await saveThemeToDatabase(newThemeId, userId, targetMode);
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
  const defaultId = mode === 'light' ? 'light' : 'dark';
  try {
    const stored = localStorage.getItem(`prospace-preferred-${mode}-theme`);
    if (stored && Boolean(getTheme(stored).isDark) === (mode === 'dark')) {
      return stored;
    }
    return defaultId;
  } catch {
    return defaultId;
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
    const migrated = localStorage.getItem('prospace-theme-midnight-v1');
    const stored = localStorage.getItem('prospace-theme-mode');
    if (!migrated && (!stored || stored === 'system' || stored === 'light')) {
      return 'dark';
    }
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // Ignored
  }
  return 'dark';
}

function saveThemeModeToStorage(mode: ThemeMode): void {
  try {
    localStorage.setItem('prospace-theme-mode', mode);
    localStorage.setItem('prospace-theme-midnight-v1', '1');
  } catch {
    // Ignored
  }
}

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}