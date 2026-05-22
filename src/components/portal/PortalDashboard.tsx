import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  FileText,
  FolderOpen,
  MessageSquare,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  DollarSign,
} from 'lucide-react';

interface PortalDashboardProps {
  data: any;
  onNavigate: (view: string) => void;
}

export function PortalDashboard({ data, onNavigate }: PortalDashboardProps) {
  const { contact, quotes, bids, appointments, unreadMessages, organization } = data;

  const activeQuotes = (quotes || []).filter((q: any) => ['sent', 'viewed', 'draft'].includes(q.status));
  const acceptedQuotes = (quotes || []).filter((q: any) => q.status === 'accepted');
  const activeProjects = (bids || []).filter((b: any) => ['pending', 'in_progress', 'submitted'].includes(b.status));
  const totalQuotedValue = (quotes || []).reduce((sum: number, q: any) => sum + (q.total || 0), 0);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  const formatDate = (date: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {contact?.name || 'there'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {organization?.name ? `Your portal with ${organization.name}` : 'Your customer portal'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
          onClick={() => onNavigate('quotes')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Quotes</p>
                <p className="text-2xl font-bold text-foreground">{activeQuotes.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-green-500"
          onClick={() => onNavigate('projects')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Projects</p>
                <p className="text-2xl font-bold text-foreground">{activeProjects.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                <FolderOpen className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-purple-500"
          onClick={() => onNavigate('messages')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unread Messages</p>
                <p className="text-2xl font-bold text-foreground">{unreadMessages || 0}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Quoted</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalQuotedValue)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Quotes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Quotes</CardTitle>
              <button
                onClick={() => onNavigate('quotes')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View All
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {(quotes || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No quotes yet</p>
            ) : (
              <div className="space-y-3">
                {(quotes || []).slice(0, 5).map((quote: any) => (
                  <div
                    key={quote.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => onNavigate('quotes')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {quote.title || quote.quote_number || 'Quote'}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(quote.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(quote.total)}
                      </span>
                      <StatusBadge status={quote.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {(appointments || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No upcoming appointments</p>
            ) : (
              <div className="space-y-3">
                {(appointments || []).map((apt: any) => (
                  <div key={apt.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{apt.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(apt.start_time).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(apt.start_time).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                      {apt.location && (
                        <p className="text-xs text-muted-foreground mt-0.5">{apt.location}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Projects */}
      {activeProjects.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Active Projects</CardTitle>
              <button
                onClick={() => onNavigate('projects')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View All
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeProjects.slice(0, 3).map((project: any) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => onNavigate('projects')}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {project.title || project.bid_number || 'Project'}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(project.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{formatCurrency(project.total || project.amount)}</span>
                    <StatusBadge status={project.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: string; icon: any }> = {
    draft: { label: 'Draft', variant: 'bg-muted text-foreground', icon: Clock },
    sent: { label: 'Sent', variant: 'bg-blue-100 text-blue-700', icon: FileText },
    viewed: { label: 'Viewed', variant: 'bg-indigo-100 text-indigo-700', icon: AlertCircle },
    accepted: { label: 'Accepted', variant: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    rejected: { label: 'Rejected', variant: 'bg-red-100 text-red-700', icon: AlertCircle },
    expired: { label: 'Expired', variant: 'bg-amber-100 text-amber-700', icon: Clock },
    completed: { label: 'Completed', variant: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
    pending: { label: 'Pending', variant: 'bg-yellow-100 text-yellow-700', icon: Clock },
    in_progress: { label: 'In Progress', variant: 'bg-blue-100 text-blue-700', icon: TrendingUp },
    submitted: { label: 'Submitted', variant: 'bg-purple-100 text-purple-700', icon: FileText },
    won: { label: 'Won', variant: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    lost: { label: 'Lost', variant: 'bg-red-100 text-red-700', icon: AlertCircle },
  };

  const config = statusConfig[status] || { label: status, variant: 'bg-muted text-foreground', icon: Clock };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.variant}`}>
      {config.label}
    </span>
  );
}
