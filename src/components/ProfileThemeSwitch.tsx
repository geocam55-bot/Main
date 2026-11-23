import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface ProfileThemeSwitchProps {
  variant?: 'menu' | 'pill';
  className?: string;
}

export function ProfileThemeSwitch({ variant = 'menu', className = '' }: ProfileThemeSwitchProps) {
  const { theme, themeMode, setThemeMode } = useTheme();
  const isDark = theme.isDark;

  const handleSelectMode = (e: React.MouseEvent, mode: 'light' | 'dark') => {
    e.preventDefault();
    e.stopPropagation();
    setThemeMode(mode);
  };

  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center p-1 rounded-xl border shadow-sm transition-colors ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 text-slate-300'
            : 'bg-white/95 border-slate-200 text-slate-700'
        } ${className}`}
        role="group"
        aria-label="Theme Switcher"
      >
        <button
          type="button"
          onClick={(e) => handleSelectMode(e, 'light')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            !isDark
              ? 'bg-[#1E6FD9] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Switch to Light Theme"
        >
          <Sun className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Light</span>
        </button>
        <button
          type="button"
          onClick={(e) => handleSelectMode(e, 'dark')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            isDark
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Switch to Dark Theme"
        >
          <Moon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Dark</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`px-2 py-1.5 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Theme
        </span>
        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 capitalize">
          {themeMode === 'system' ? `System (${isDark ? 'Dark' : 'Light'})` : isDark ? 'Dark' : 'Light'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1 p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950/70">
        <button
          type="button"
          onClick={(e) => handleSelectMode(e, 'light')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            !isDark
              ? 'bg-white text-[#1E6FD9] shadow-sm border border-slate-200/80'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sun className="h-3.5 w-3.5" />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={(e) => handleSelectMode(e, 'dark')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            isDark
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Moon className="h-3.5 w-3.5" />
          <span>Dark</span>
        </button>
      </div>
    </div>
  );
}
