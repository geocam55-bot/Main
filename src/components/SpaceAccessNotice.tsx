import { ArrowLeft, LockKeyhole, ShieldAlert } from 'lucide-react';

interface SpaceAccessNoticeProps {
  spaceName: string;
  accentColorClass: string;
  mode: 'login-required' | 'access-denied';
  message?: string;
}

export function SpaceAccessNotice({
  spaceName,
  accentColorClass,
  mode,
  message,
}: SpaceAccessNoticeProps) {
  const isDenied = mode === 'access-denied';

  const title = isDenied ? 'Access denied' : 'Sign in through ProSpaces';
  const body =
    message ||
    (isDenied
      ? `You are signed in, but your account does not currently have access to ${spaceName}. Please choose another space or contact your administrator if you need access.`
      : `${spaceName} now uses the main ProSpaces login. Sign in once from the main entry page, then choose this space from your Spaces page.`);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-lg w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${accentColorClass}`}>
          {isDenied ? <ShieldAlert className="h-8 w-8 text-white" /> : <LockKeyhole className="h-8 w-8 text-white" />}
        </div>

        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-3 text-slate-600 leading-relaxed">{body}</p>

        <button
          onClick={() => {
            window.location.href = isDenied ? '/' : '/?view=member-login';
          }}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          {isDenied ? 'Back to Spaces' : 'Go to ProSpaces Login'}
        </button>
      </div>
    </div>
  );
}
