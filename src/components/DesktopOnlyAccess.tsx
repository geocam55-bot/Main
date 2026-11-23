import { Monitor, ArrowLeft } from 'lucide-react';

interface DesktopOnlyAccessProps {
  spaceName: string;
  accentColorClass: string;
}

export function DesktopOnlyAccess({ spaceName, accentColorClass }: DesktopOnlyAccessProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0A0F1D] px-6 text-slate-900 dark:text-slate-100"
    >
      <div className="max-w-lg w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-8 text-center shadow-xl dark:shadow-2xl">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-black/10 dark:border-white/10 shadow-lg ${accentColorClass}`}>
          <Monitor className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Desktop Only</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400 leading-relaxed">
          {spaceName} is designed for desktop and laptop screens to provide the best workspace experience.
          Please switch to a larger screen to continue.
        </p>

        <button
          onClick={() => {
            window.location.href = '/';
          }}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 shadow-lg shadow-blue-600/20"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Spaces
        </button>
      </div>
    </div>
  );
}
