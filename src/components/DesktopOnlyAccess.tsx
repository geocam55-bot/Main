import { Monitor, ArrowLeft } from 'lucide-react';

interface DesktopOnlyAccessProps {
  spaceName: string;
  accentColorClass: string;
}

export function DesktopOnlyAccess({ spaceName, accentColorClass }: DesktopOnlyAccessProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-lg w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${accentColorClass}`}>
          <Monitor className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Desktop Only</h1>
        <p className="mt-3 text-slate-600 leading-relaxed">
          {spaceName} is designed for desktop and laptop screens to provide the best workspace experience.
          Please switch to a larger screen to continue.
        </p>

        <button
          onClick={() => {
            window.location.href = '/';
          }}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Spaces
        </button>
      </div>
    </div>
  );
}
