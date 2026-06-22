import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, X } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { KnowledgeBase } from './KnowledgeBase';

export interface HelpStep {
  title: string;
  body: string;
  targetSelector?: string;
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
  steps?: HelpStep[];
  actions?: HelpAction[];
  badges?: HelpBadge[];
  howToGuides?: HelpHowToGuide[];
}

const mapModuleKeyToCategory = (key: string): string | null => {
  if (!key) return null;
  const k = key.toLowerCase();
  if (k.includes('customer') || k.includes('contact')) return 'contacts';
  if (k.includes('deal') || k.includes('bid')) return 'deals';
  if (k.includes('planner')) return 'planners';
  if (k.includes('security') || k.includes('user') || k.includes('admin')) return 'security-admin';
  return 'getting-started';
};

export function InteractiveModuleHelp({
  moduleKey,
  userId,
  title,
  description,
  moduleIcon: ModuleIcon,
  triggerLabel = 'Help',
}: InteractiveModuleHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openHelp = () => {
    setIsOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  return (
    <>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={openHelp}
          title="Help"
          className="flex items-center gap-2 px-2.5 sm:px-3 text-slate-700 border-slate-200 bg-white hover:bg-slate-50 shadow-xs"
        >
          <BookOpen className="h-4 w-4 text-slate-500" />
          <span>Help</span>
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className="[&>button]:hidden overflow-y-auto p-0 fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 h-screen w-screen max-h-screen max-w-none sm:max-w-none rounded-none border-0 flex flex-col shadow-2xl transition-all duration-300"
        >
          {/* Unified Custom Help Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center px-6 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#1E6FD9] text-white flex items-center justify-center font-bold">
                <ModuleIcon className="h-4.5 w-4.5" strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xs sm:text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                  Help Center
                </DialogTitle>
                <p className="text-[10px] text-slate-400 font-semibold font-mono">
                  Official Guides &amp; Support Chat
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors font-bold text-lg cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Render the core Knowledge Search page inside modal */}
          <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
            <KnowledgeBase 
              embedded={true} 
              initialCategory={mapModuleKeyToCategory(moduleKey)} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
