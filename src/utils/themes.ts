export interface Theme {
  id: string;
  name: string;
  description: string;
  isDark?: boolean; // Whether this is a dark theme (for dark: prefixed Tailwind classes)
  colors: {
    // Background colors
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;
    
    // Text colors
    text: string;
    textSecondary: string;
    textMuted: string;
    
    // Primary colors (for buttons, links, etc)
    primary: string;
    primaryHover: string;
    primaryText: string;
    
    // Secondary colors (secondary buttons, badges)
    secondary: string;
    secondaryText: string;
    
    // Accent colors
    accent: string;
    accentHover: string;
    accentText: string;
    
    // Border colors
    border: string;
    borderLight: string;
    
    // Card colors
    card: string;
    cardHover: string;
    cardText: string;
    
    // Input colors
    input: string;
    
    // Status colors
    success: string;
    warning: string;
    error: string;
    info: string;
    
    // Destructive
    destructive: string;
    destructiveText: string;
    
    // Navigation
    navBackground: string;
    navText: string;
    navHover: string;
    navActive: string;
    
    // Top bar
    topBarBackground: string;
    topBarText: string;
    
    // Special effects
    gradient?: string;
    shadow: string;
  };
}

export const themes: Record<string, Theme> = {
  vibrant: {
    id: 'vibrant',
    name: 'Vibrant',
    description: 'Colorful gradients with purple and pink accents',
    isDark: false,
    colors: {
      background: '#ffffff',
      backgroundSecondary: '#f9fafb',
      backgroundTertiary: '#f3f4f6',
      
      text: '#1a1a2e',
      textSecondary: '#4a4a5a',
      textMuted: '#71717a',
      
      primary: '#9333ea',
      primaryHover: '#7e22ce',
      primaryText: '#ffffff',
      
      secondary: '#f3f4f6',
      secondaryText: '#1a1a2e',
      
      accent: '#ec4899',
      accentHover: '#db2777',
      accentText: '#ffffff',
      
      border: '#e5e7eb',
      borderLight: '#f3f4f6',
      
      card: '#ffffff',
      cardHover: '#f9fafb',
      cardText: '#1a1a2e',
      
      input: '#e5e7eb',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      
      destructive: '#ef4444',
      destructiveText: '#ffffff',
      
      navBackground: 'linear-gradient(to bottom, #7c3aed, #9333ea)',
      navText: '#ffffff',
      navHover: 'rgba(255, 255, 255, 0.2)',
      navActive: 'rgba(255, 255, 255, 0.3)',
      
      topBarBackground: 'linear-gradient(to right, #7c3aed, #ec4899)',
      topBarText: '#ffffff',
      
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      shadow: '0 10px 15px -3px rgba(147, 51, 234, 0.1), 0 4px 6px -2px rgba(147, 51, 234, 0.05)',
    },
  },
  
  light: {
    id: 'light',
    name: 'Light',
    description: 'Clean and minimal light theme',
    isDark: false,
    colors: {
      background: '#ffffff',
      backgroundSecondary: '#f9fafb',
      backgroundTertiary: '#f3f4f6',
      
      text: '#111827',
      textSecondary: '#4b5563',
      textMuted: '#6b7280',
      
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      primaryText: '#ffffff',
      
      secondary: '#f1f5f9',
      secondaryText: '#111827',
      
      accent: '#3b82f6',
      accentHover: '#2563eb',
      accentText: '#ffffff',
      
      border: '#e5e7eb',
      borderLight: '#f3f4f6',
      
      card: '#ffffff',
      cardHover: '#f9fafb',
      cardText: '#111827',
      
      input: '#e5e7eb',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      
      destructive: '#ef4444',
      destructiveText: '#ffffff',
      
      navBackground: '#ffffff',
      navText: '#111827',
      navHover: '#f3f4f6',
      navActive: '#e5e7eb',
      
      topBarBackground: '#ffffff',
      topBarText: '#111827',
      
      shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    },
  },
  
  dark: {
    id: 'dark',
    name: 'Dark',
    description: 'Easy on the eyes dark theme',
    isDark: true,
    colors: {
      background: '#121212',
      backgroundSecondary: '#1E1E1E',
      backgroundTertiary: '#2A2A2A',
      
      text: '#FFFFFF',
      textSecondary: '#B3B3B3',
      textMuted: '#6E6E6E',
      
      primary: '#3B82F6',
      primaryHover: '#2563EB',
      primaryText: '#FFFFFF',
      
      secondary: '#2A2A2A',
      secondaryText: '#FFFFFF',
      
      accent: '#3B82F6',
      accentHover: '#2563EB',
      accentText: '#FFFFFF',
      
      border: '#2E2E2E',
      borderLight: '#3A3A3A',
      
      card: '#2A2A2A',
      cardHover: '#333333',
      cardText: '#FFFFFF',
      
      input: '#1E1E1E',
      
      success: '#34D399',
      warning: '#FBBF24',
      error: '#EF4444',
      info: '#60A5FA',
      
      destructive: '#EF4444',
      destructiveText: '#FFFFFF',
      
      navBackground: '#0D0D0D',
      navText: '#B3B3B3',
      navHover: '#1E1E1E',
      navActive: '#2A2A2A',
      
      topBarBackground: '#0D0D0D',
      topBarText: '#FFFFFF',
      
      shadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    },
  },
  
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Calm blue tones inspired by the sea',
    isDark: false,
    colors: {
      background: '#ffffff',
      backgroundSecondary: '#f0f9ff',
      backgroundTertiary: '#e0f2fe',
      
      text: '#0c1929',
      textSecondary: '#334e68',
      textMuted: '#627d98',
      
      primary: '#0284c7',
      primaryHover: '#0369a1',
      primaryText: '#ffffff',
      
      secondary: '#e0f2fe',
      secondaryText: '#0c1929',
      
      accent: '#06b6d4',
      accentHover: '#0891b2',
      accentText: '#ffffff',
      
      border: '#bae6fd',
      borderLight: '#e0f2fe',
      
      card: '#ffffff',
      cardHover: '#f0f9ff',
      cardText: '#0c1929',
      
      input: '#bae6fd',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#0284c7',
      
      destructive: '#ef4444',
      destructiveText: '#ffffff',
      
      navBackground: 'linear-gradient(to bottom, #0284c7, #0369a1)',
      navText: '#ffffff',
      navHover: 'rgba(255, 255, 255, 0.2)',
      navActive: 'rgba(255, 255, 255, 0.3)',
      
      topBarBackground: '#0284c7',
      topBarText: '#ffffff',
      
      gradient: 'linear-gradient(135deg, #667eea 0%, #06b6d4 100%)',
      shadow: '0 10px 15px -3px rgba(2, 132, 199, 0.1), 0 4px 6px -2px rgba(2, 132, 199, 0.05)',
    },
  },
  
  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Natural green tones for a fresh look',
    isDark: false,
    colors: {
      background: '#ffffff',
      backgroundSecondary: '#f0fdf4',
      backgroundTertiary: '#dcfce7',
      
      text: '#14270d',
      textSecondary: '#365a2b',
      textMuted: '#4d7c3f',
      
      primary: '#16a34a',
      primaryHover: '#15803d',
      primaryText: '#ffffff',
      
      secondary: '#f0fdf4',
      secondaryText: '#14270d',
      
      accent: '#22c55e',
      accentHover: '#16a34a',
      accentText: '#ffffff',
      
      border: '#bbf7d0',
      borderLight: '#dcfce7',
      
      card: '#ffffff',
      cardHover: '#f0fdf4',
      cardText: '#14270d',
      
      input: '#bbf7d0',
      
      success: '#0d9488', // Fixed: was #10b981 (too similar to green primary - CONFLICT)
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      
      destructive: '#ef4444',
      destructiveText: '#ffffff',
      
      navBackground: 'linear-gradient(to bottom, #16a34a, #15803d)',
      navText: '#ffffff',
      navHover: 'rgba(255, 255, 255, 0.2)',
      navActive: 'rgba(255, 255, 255, 0.3)',
      
      topBarBackground: '#16a34a',
      topBarText: '#ffffff',
      
      gradient: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
      shadow: '0 10px 15px -3px rgba(22, 163, 74, 0.1), 0 4px 6px -2px rgba(22, 163, 74, 0.05)',
    },
  },
  
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm orange and red hues',
    isDark: false,
    colors: {
      background: '#ffffff',
      backgroundSecondary: '#fff7ed',
      backgroundTertiary: '#ffedd5',
      
      text: '#1c1105',
      textSecondary: '#5c3d14',
      textMuted: '#8a6534',
      
      primary: '#ea580c',
      primaryHover: '#c2410c',
      primaryText: '#ffffff',
      
      secondary: '#fff7ed',
      secondaryText: '#1c1105',
      
      accent: '#f97316',
      accentHover: '#ea580c',
      accentText: '#ffffff',
      
      border: '#fed7aa',
      borderLight: '#ffedd5',
      
      card: '#ffffff',
      cardHover: '#fff7ed',
      cardText: '#1c1105',
      
      input: '#fed7aa',
      
      success: '#10b981',
      warning: '#eab308', // Shifted: was #f59e0b (amber too close to orange primary; now yellow-500)
      error: '#ef4444',
      info: '#3b82f6',
      
      destructive: '#ef4444',
      destructiveText: '#ffffff',
      
      navBackground: 'linear-gradient(to bottom, #ea580c, #c2410c)',
      navText: '#ffffff',
      navHover: 'rgba(255, 255, 255, 0.2)',
      navActive: 'rgba(255, 255, 255, 0.3)',
      
      topBarBackground: '#ea580c',
      topBarText: '#ffffff',
      
      gradient: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
      shadow: '0 10px 15px -3px rgba(234, 88, 12, 0.1), 0 4px 6px -2px rgba(234, 88, 12, 0.05)',
    },
  },
  
  midnight: {
    id: 'midnight',
    name: 'Emerald Night',
    description: 'Dark theme with emerald green accents',
    isDark: true,
    colors: {
      background: '#0a120f',
      backgroundSecondary: '#0f1c16',
      backgroundTertiary: '#16291f',
      
      text: '#d1fae5',
      textSecondary: '#a7f3d0',
      textMuted: '#6ee7b7',
      
      primary: '#10b981',
      primaryHover: '#059669',
      primaryText: '#ffffff',
      
      secondary: '#16291f',
      secondaryText: '#d1fae5',
      
      accent: '#34d399',
      accentHover: '#10b981',
      accentText: '#ffffff',
      
      border: '#1e3a2b',
      borderLight: '#2d5040',
      
      card: '#0f1c16',
      cardHover: '#16291f',
      cardText: '#d1fae5',
      
      input: '#16291f',
      
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa',
      
      destructive: '#ef4444',
      destructiveText: '#ffffff',
      
      navBackground: '#040a07',
      navText: '#a7f3d0',
      navHover: '#0f1c16',
      navActive: '#16291f',
      
      topBarBackground: '#040a07',
      topBarText: '#d1fae5',
      
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      shadow: '0 0 20px rgba(16, 185, 129, 0.2), 0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    },
  },
  
  mocha: {
    id: 'mocha',
    name: 'Mocha',
    description: 'Warm coffee and chocolate tones',
    isDark: false,
    colors: {
      background: '#faf8f5',
      backgroundSecondary: '#f5f1eb',
      backgroundTertiary: '#ede7dd',
      
      text: '#2c1810',
      textSecondary: '#5c4033',
      textMuted: '#7a6355',
      
      primary: '#6d4c41',
      primaryHover: '#5d4037',
      primaryText: '#ffffff',
      
      secondary: '#efebe9',
      secondaryText: '#2c1810',
      
      accent: '#8d6e63',
      accentHover: '#795548',
      accentText: '#ffffff',
      
      border: '#d7ccc8',
      borderLight: '#efebe9',
      
      card: '#ffffff',
      cardHover: '#f5f1eb',
      cardText: '#2c1810',
      
      input: '#d7ccc8',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      
      destructive: '#d32f2f',
      destructiveText: '#ffffff',
      
      navBackground: 'linear-gradient(to bottom, #6d4c41, #5d4037)',
      navText: '#ffffff',
      navHover: 'rgba(255, 255, 255, 0.2)',
      navActive: 'rgba(255, 255, 255, 0.3)',
      
      topBarBackground: '#6d4c41',
      topBarText: '#ffffff',
      
      gradient: 'linear-gradient(135deg, #8d6e63 0%, #5d4037 100%)',
      shadow: '0 10px 15px -3px rgba(109, 76, 65, 0.1), 0 4px 6px -2px rgba(109, 76, 65, 0.05)',
    },
  },
  
  lavender: {
    id: 'lavender',
    name: 'Cherry Blossom',
    description: 'Soft pink and rose tones',
    isDark: false,
    colors: {
      background: '#fff5f7',
      backgroundSecondary: '#ffe4e9',
      backgroundTertiary: '#fecdd6',
      
      text: '#2a0f18',
      textSecondary: '#6b3347',
      textMuted: '#904d66',
      
      primary: '#e11d48',
      primaryHover: '#be123c',
      primaryText: '#ffffff',
      
      secondary: '#ffe4e9',
      secondaryText: '#2a0f18',
      
      accent: '#f43f5e',
      accentHover: '#e11d48',
      accentText: '#ffffff',
      
      border: '#fecdd6',
      borderLight: '#ffe4e9',
      
      card: '#ffffff',
      cardHover: '#fff5f7',
      cardText: '#2a0f18',
      
      input: '#fecdd6',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#dc2626',
      info: '#ec4899',
      
      destructive: '#dc2626',
      destructiveText: '#ffffff',
      
      navBackground: 'linear-gradient(to bottom, #e11d48, #be123c)',
      navText: '#ffffff',
      navHover: 'rgba(255, 255, 255, 0.2)',
      navActive: 'rgba(255, 255, 255, 0.3)',
      
      topBarBackground: '#e11d48',
      topBarText: '#ffffff',
      
      gradient: 'linear-gradient(135deg, #fda4af 0%, #e11d48 100%)',
      shadow: '0 10px 15px -3px rgba(225, 29, 72, 0.1), 0 4px 6px -2px rgba(225, 29, 72, 0.05)',
    },
  },
  
  arctic: {
    id: 'arctic',
    name: 'Arctic',
    description: 'Cool crisp whites and ice blues',
    isDark: false,
    colors: {
      background: '#f8fafc',
      backgroundSecondary: '#f1f5f9',
      backgroundTertiary: '#e2e8f0',
      
      text: '#0f172a',
      textSecondary: '#334155',
      textMuted: '#64748b',
      
      primary: '#0ea5e9',
      primaryHover: '#0284c7',
      primaryText: '#ffffff',
      
      secondary: '#f1f5f9',
      secondaryText: '#0f172a',
      
      accent: '#38bdf8',
      accentHover: '#0ea5e9',
      accentText: '#ffffff',
      
      border: '#cbd5e1',
      borderLight: '#e2e8f0',
      
      card: '#ffffff',
      cardHover: '#f8fafc',
      cardText: '#0f172a',
      
      input: '#cbd5e1',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#0ea5e9',
      
      destructive: '#dc2626',
      destructiveText: '#ffffff',
      
      navBackground: 'linear-gradient(to bottom, #0ea5e9, #0284c7)',
      navText: '#ffffff',
      navHover: 'rgba(255, 255, 255, 0.2)',
      navActive: 'rgba(255, 255, 255, 0.3)',
      
      topBarBackground: '#0ea5e9',
      topBarText: '#ffffff',
      
      gradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
      shadow: '0 10px 15px -3px rgba(14, 165, 233, 0.1), 0 4px 6px -2px rgba(14, 165, 233, 0.05)',
    },
  },
  
  neon: {
    id: 'neon',
    name: 'Neon',
    description: 'Cyberpunk vibes with electric accents',
    isDark: true,
    colors: {
      background: '#0a0a0a',
      backgroundSecondary: '#141414',
      backgroundTertiary: '#1e1e1e',
      
      text: '#f0f0f0',
      textSecondary: '#d4d4d4',
      textMuted: '#a3a3a3',
      
      primary: '#00ff9f',
      primaryHover: '#00d98a',
      primaryText: '#0a0a0a',
      
      secondary: '#1e1e1e',
      secondaryText: '#f0f0f0',
      
      accent: '#ff006e',
      accentHover: '#d9005c',
      accentText: '#ffffff',
      
      border: '#2a2a2a',
      borderLight: '#3a3a3a',
      
      card: '#141414',
      cardHover: '#1e1e1e',
      cardText: '#f0f0f0',
      
      input: '#1e1e1e',
      
      success: '#00ff9f',
      warning: '#ffbe0b',
      error: '#ff006e',
      info: '#00d4ff',
      
      destructive: '#ff006e',
      destructiveText: '#ffffff',
      
      navBackground: '#050505',
      navText: '#d4d4d4',
      navHover: '#1a1a1a',
      navActive: '#2a2a2a',
      
      topBarBackground: '#050505',
      topBarText: '#f0f0f0',
      
      gradient: 'linear-gradient(135deg, #00ff9f 0%, #00d4ff 50%, #ff006e 100%)',
      shadow: '0 0 20px rgba(0, 255, 159, 0.3), 0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    },
  },
};

export const getTheme = (themeId: string): Theme => {
  const baseTheme = themes[themeId] || themes.vibrant;
  try {
    if (typeof window !== 'undefined') {
      const customColorsStr = localStorage.getItem(`prospace-theme-custom-${themeId}`);
      if (customColorsStr) {
        const customColors = JSON.parse(customColorsStr);
        return {
          ...baseTheme,
          colors: {
            ...baseTheme.colors,
            ...customColors
          }
        };
      }
    }
  } catch (e) {
    // Ignore
  }
  return baseTheme;
};

export const saveTheme = (themeId: string): void => {
  localStorage.setItem('prospace-theme', themeId);
};

export const loadTheme = (): string => {
  return localStorage.getItem('prospace-theme') || 'vibrant';
};

// Save theme to database for persistence across devices
// NOTE: Uses KV store via the server settings API since the profiles table
// may not have a 'theme' column. Falls back gracefully.
export const saveThemeToDatabase = async (themeId: string, userId: string): Promise<void> => {
  try {
    // Always save to localStorage as backup
    localStorage.setItem('prospace-theme', themeId);
    
    // Save to database via server API
    const { projectId, publicAnonKey } = await import('./supabase/info');
    const { createClient } = await import('./supabase/client');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/settings/theme`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'X-User-Token': session.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ theme: themeId }),
      });
      
      if (response.ok) {
        // Theme saved to database
      } else {
        const errorText = await response.text();
        // Failed to save theme to database
      }
    } else {
      // No session available, theme saved to localStorage only
    }
  } catch (error) {
    // Error saving theme to database - non-fatal since localStorage still has it
    // Error saving theme to database
  }
};

// Load theme from database for current user
// NOTE: Uses localStorage as primary source; KV store as optional fallback
export const loadThemeFromDatabase = async (userId: string): Promise<{ theme: string | null, themeMode: string | null }> => {
  try {
    // When user is logged in, prioritize database over localStorage
    // This ensures theme persists across logout/login cycles
    const { projectId, publicAnonKey } = await import('./supabase/info');
    const { createClient } = await import('./supabase/client');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      try {
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/settings/theme`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-User-Token': session.access_token,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.theme) {
            // Sync database theme to localStorage
            localStorage.setItem('prospace-theme', data.theme);
          }
          if (data?.themeMode) {
            localStorage.setItem('prospace-theme-mode', data.themeMode);
          }
          if (data?.theme || data?.themeMode) {
            return { theme: data.theme || null, themeMode: data.themeMode || null };
          }
        }
      } catch (err) {
        // Could not load theme from server, falling back to localStorage
      }
    }
    
    // Fallback to localStorage if database load fails or no session
    const localTheme = localStorage.getItem('prospace-theme');
    const localMode = localStorage.getItem('prospace-theme-mode');
    
    if (localTheme || localMode) {
      return { theme: localTheme, themeMode: localMode };
    }
    
    return { theme: null, themeMode: null };
  } catch (error) {
    return { theme: null, themeMode: null };
  }
};