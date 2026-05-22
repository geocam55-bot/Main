import { useTheme } from './ThemeProvider';
import { themes, type Theme, getTheme } from '../utils/themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, Loader2, Moon, Sun, Edit2 } from 'lucide-react';
import React, { useState } from 'react';
import { ThemeEditor } from './ThemeEditor';
import { filterFigmaProps } from './ui/utils';

function ThemePreviewSwatch({ theme }: { theme: Theme }) {
  const c = theme.colors;
  
  return (
    <div className="mb-3 rounded-md overflow-hidden border border-border dark:border-gray-700">
      {/* Simulated page layout */}
      <div className="h-28 flex" style={{ background: c.background }}>
        {/* Sidebar preview */}
        <div className="w-8 flex-shrink-0 flex flex-col gap-0.5 p-1" style={{ background: c.navBackground.includes('gradient') ? undefined : c.navBackground, backgroundImage: c.navBackground.includes('gradient') ? c.navBackground : undefined }}>
          {[1,2,3,4].map(i => (
            <div
              key={i}
              className="h-2 rounded-sm"
              style={{ background: i === 1 ? c.navActive : 'rgba(255,255,255,0.15)' }}
            />
          ))}
        </div>
        {/* Content area */}
        <div className="flex-1 p-1.5 flex flex-col gap-1">
          {/* Top bar */}
          <div className="h-3 rounded-sm flex items-center px-1" style={{ background: c.backgroundSecondary }}>
            <div className="h-1.5 w-8 rounded-sm" style={{ background: c.textMuted }} />
          </div>
          {/* Cards */}
          <div className="flex-1 flex gap-1">
            <div className="flex-1 rounded-sm p-1 flex flex-col gap-0.5" style={{ background: c.card, border: `1px solid ${c.border}` }}>
              <div className="h-1.5 w-6 rounded-sm" style={{ background: c.text }} />
              <div className="h-1 w-10 rounded-sm" style={{ background: c.textSecondary }} />
              <div className="h-1 w-8 rounded-sm" style={{ background: c.textMuted }} />
              <div className="flex gap-0.5 mt-auto">
                <div className="h-2.5 w-6 rounded-sm" style={{ background: c.primary }} />
                <div className="h-2.5 w-6 rounded-sm" style={{ background: c.secondary, border: `1px solid ${c.border}` }} />
              </div>
            </div>
            <div className="flex-1 rounded-sm p-1 flex flex-col gap-0.5" style={{ background: c.card, border: `1px solid ${c.border}` }}>
              <div className="h-1.5 w-5 rounded-sm" style={{ background: c.text }} />
              <div className="flex gap-0.5 mt-1">
                <div className="h-2 w-4 rounded-sm" style={{ background: c.success }} />
                <div className="h-2 w-4 rounded-sm" style={{ background: c.warning }} />
                <div className="h-2 w-4 rounded-sm" style={{ background: c.error }} />
              </div>
              <div className="flex gap-0.5 mt-auto">
                <div className="h-2 w-4 rounded-full" style={{ background: c.accent }} />
                <div className="h-2 w-4 rounded-full" style={{ background: c.info }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThemeSelector() {
  const { themeId, setTheme, theme: activeTheme } = useTheme();
  const [savingTheme, setSavingTheme] = useState<string | null>(null);
  const [editingTheme, setEditingTheme] = useState<string | null>(null);

  const handleThemeChange = async (newThemeId: string) => {
    setSavingTheme(newThemeId);
    setTheme(newThemeId);
    
    // Add a brief delay to show the loading state
    await new Promise(resolve => setTimeout(resolve, 300));
    setSavingTheme(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Choose a theme that suits your style. Changes are saved automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(themes).map((baseTheme) => {
            const isActive = themeId === baseTheme.id;
            const isSaving = savingTheme === baseTheme.id;
            
            // Use active theme from context if it's the current one, else get fresh (with any customizations)
            const displayTheme = isActive ? activeTheme : getTheme(baseTheme.id);
            
            return (
              <div
                key={displayTheme.id}
                role="button"
                tabIndex={0}
                onClick={() => !isSaving && handleThemeChange(displayTheme.id)}
                onKeyDown={(e) => {
                  if (!isSaving && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleThemeChange(displayTheme.id);
                  }
                }}
                className={`relative p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                  isActive
                    ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50 dark:bg-blue-950 dark:ring-blue-800'
                    : 'border-border hover:border-border dark:border-gray-700 dark:hover:border-gray-600'
                } ${isSaving ? 'opacity-75 cursor-wait' : ''}`}
              >
                {isActive && !isSaving && (
                  <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center animate-in zoom-in duration-200">
                    {React.createElement(Check, filterFigmaProps({ className: "h-4 w-4 text-white" }))}
                  </div>
                )}
                
                {isSaving && (
                  <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                    {React.createElement(Loader2, filterFigmaProps({ className: "h-4 w-4 text-white animate-spin" }))}
                  </div>
                )}
                
                {/* Theme Preview */}
                <ThemePreviewSwatch theme={displayTheme} />
                
                {/* Theme Info */}
                <div className="flex items-start justify-between gap-2 mt-3">
                  <div>
                    <h3 className="font-semibold text-foreground dark:text-gray-100 mb-1 flex items-center gap-1.5">
                      {displayTheme.name}
                      {displayTheme.isDark && React.createElement(Moon, filterFigmaProps({ className: "h-3.5 w-3.5 text-muted-foreground" }))}
                      {!displayTheme.isDark && React.createElement(Sun, filterFigmaProps({ className: "h-3.5 w-3.5 text-amber-400" }))}
                    </h3>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">{displayTheme.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground shrink-0 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTheme(displayTheme.id);
                    }}
                  >
                    {React.createElement(Edit2, filterFigmaProps({ className: "h-3.5 w-3.5" }))}
                  </Button>
                </div>
                
                {/* Color Palette Preview */}
                <div className="flex gap-1.5 mt-3">
                  <div 
                    className="h-5 w-5 rounded-full border border-border dark:border-gray-600 shadow-sm" 
                    style={{ background: displayTheme.colors.primary }}
                    title="Primary"
                  />
                  <div 
                    className="h-5 w-5 rounded-full border border-border dark:border-gray-600 shadow-sm" 
                    style={{ background: displayTheme.colors.accent }}
                    title="Accent"
                  />
                  <div 
                    className="h-5 w-5 rounded-full border border-border dark:border-gray-600 shadow-sm" 
                    style={{ background: displayTheme.colors.success }}
                    title="Success"
                  />
                  <div 
                    className="h-5 w-5 rounded-full border border-border dark:border-gray-600 shadow-sm" 
                    style={{ background: displayTheme.colors.warning }}
                    title="Warning"
                  />
                  <div 
                    className="h-5 w-5 rounded-full border border-border dark:border-gray-600 shadow-sm" 
                    style={{ background: displayTheme.colors.error }}
                    title="Error"
                  />
                  <div 
                    className="h-5 w-5 rounded-full border border-border dark:border-gray-600 shadow-sm" 
                    style={{ background: displayTheme.colors.background }}
                    title="Background"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      <ThemeEditor 
        themeId={editingTheme} 
        open={!!editingTheme} 
        onOpenChange={(open) => !open && setEditingTheme(null)} 
      />
    </Card>
  );
}
