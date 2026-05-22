import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  FolderOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Calendar,
} from 'lucide-react';

interface PortalProjectsProps {
  projects: any[];
}

export function PortalProjects({ projects }: PortalProjectsProps) {
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

  const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
    draft: { label: 'Draft', color: 'text-foreground', bgColor: 'bg-muted', icon: Clock },
    pending: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Clock },
    submitted: { label: 'Submitted', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: TrendingUp },
    in_progress: { label: 'In Progress', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: TrendingUp },
    won: { label: 'Approved', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle2 },
    lost: { label: 'Closed', color: 'text-red-700', bgColor: 'bg-red-100', icon: AlertCircle },
    completed: { label: 'Completed', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: CheckCircle2 },
  };

  const activeProjects = projects.filter((p) => ['pending', 'in_progress', 'submitted'].includes(p.status));
  const pastProjects = projects.filter((p) => !['pending', 'in_progress', 'submitted'].includes(p.status));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Your Projects</h2>
        <p className="text-muted-foreground text-sm mt-1">Track the status of your active and past projects</p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground">No projects yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Your projects and deals will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Projects */}
          {activeProjects.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                Active ({activeProjects.length})
              </h3>
              <div className="space-y-3">
                {activeProjects.map((project) => {
                  const config = statusConfig[project.status] || statusConfig.pending;
                  const StatusIcon = config.icon;
                  return (
                    <Card key={project.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                              <FolderOpen className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {project.title || project.bid_number || 'Project'}
                              </p>
                              {project.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(project.created_at)}
                                </span>
                                {project.total || project.amount ? (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    {formatCurrency(project.total || project.amount)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color} shrink-0`}>
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past Projects */}
          {pastProjects.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                Past ({pastProjects.length})
              </h3>
              <div className="space-y-2">
                {pastProjects.map((project) => {
                  const config = statusConfig[project.status] || statusConfig.draft;
                  return (
                    <Card key={project.id} className="opacity-75">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {project.title || project.bid_number || 'Project'}
                              </p>
                              <p className="text-xs text-muted-foreground">{formatDate(project.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {(project.total || project.amount) ? (
                              <span className="text-sm text-muted-foreground">{formatCurrency(project.total || project.amount)}</span>
                            ) : null}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                              {config.label}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
