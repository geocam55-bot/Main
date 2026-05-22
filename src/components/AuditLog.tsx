import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  History,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Shield,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  FileDown,
  Eye,
  Settings,
  Key,
  AlertCircle,
  Activity,
  Users,
  Calendar,
  FileText,
  Mail,
  Package,
  BarChart3,
} from 'lucide-react';
import type { User } from '../App';
import { projectId } from '../utils/supabase/info';
import { getServerHeaders } from '../utils/server-headers';
import { useDebounce } from '../utils/useDebounce';
import { AuditLogModuleHelp } from './AuditLogModuleHelp';

const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;

interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: {
    user_email?: string;
    user_name?: string;
    description?: string;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
    [key: string]: any;
  } | null;
  organization_id: string;
  created_at: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface AuditStats {
  totalCount: number;
  last24h: number;
  last7d: number;
  actionBreakdown: Record<string, number>;
}

interface AuditLogProps {
  user: User;
  embedded?: boolean; // true when embedded in Security tab (hides outer card wrapper)
}

const ACTION_ICONS: Record<string, any> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  login: LogIn,
  logout: LogOut,
  export: FileDown,
  view: Eye,
  permission_change: Shield,
  settings_change: Settings,
  api_key: Key,
};

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800 border-green-200',
  update: 'bg-blue-100 text-blue-800 border-blue-200',
  delete: 'bg-red-100 text-red-800 border-red-200',
  login: 'bg-purple-100 text-purple-800 border-purple-200',
  logout: 'bg-muted text-foreground border-border',
  export: 'bg-orange-100 text-orange-800 border-orange-200',
  view: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  permission_change: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  settings_change: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  api_key: 'bg-pink-100 text-pink-800 border-pink-200',
};

const RESOURCE_ICONS: Record<string, any> = {
  contact: Users,
  bid: FileText,
  quote: FileText,
  appointment: Calendar,
  task: Activity,
  note: FileText,
  document: FileText,
  email: Mail,
  inventory: Package,
  user: Users,
  permission: Shield,
  session: LogIn,
  report: BarChart3,
  audit_log: History,
  organization: Settings,
};

export function AuditLog({ user, embedded = false }: AuditLogProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 50, totalCount: 0, totalPages: 0 });
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableResourceTypes, setAvailableResourceTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterResourceType, setFilterResourceType] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers = await getServerHeaders();
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('page_size', '50');
      if (filterAction && filterAction !== 'all') params.set('action', filterAction);
      if (filterResourceType && filterResourceType !== 'all') params.set('resource_type', filterResourceType);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (dateFrom) params.set('date_from', new Date(dateFrom).toISOString());
      if (dateTo) params.set('date_to', new Date(dateTo + 'T23:59:59').toISOString());

      const res = await fetch(`${SERVER_BASE}/audit-logs?${params.toString()}`, { headers });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errBody.error || `Server returned ${res.status}`);
      }

      const json = await res.json();
      setLogs(json.logs || []);
      setPagination(json.pagination || { page: 1, pageSize: 50, totalCount: 0, totalPages: 0 });
      if (json.filters) {
        setAvailableActions(json.filters.actions || []);
        setAvailableResourceTypes(json.filters.resourceTypes || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, filterAction, filterResourceType, debouncedSearch, dateFrom, dateTo]);

  const fetchStats = useCallback(async () => {
    try {
      const headers = await getServerHeaders();
      const res = await fetch(`${SERVER_BASE}/audit-logs/stats`, { headers });
      if (res.ok) {
        const json = await res.json();
        setStats(json.stats);
      }
    } catch (err: any) {
      // Stats fetch error – non-critical
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterAction, filterResourceType, debouncedSearch, dateFrom, dateTo]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const headers = await getServerHeaders();
      const params = new URLSearchParams();
      if (filterAction && filterAction !== 'all') params.set('action', filterAction);
      if (filterResourceType && filterResourceType !== 'all') params.set('resource_type', filterResourceType);
      if (dateFrom) params.set('date_from', new Date(dateFrom).toISOString());
      if (dateTo) params.set('date_to', new Date(dateTo + 'T23:59:59').toISOString());

      const res = await fetch(`${SERVER_BASE}/audit-logs/export?${params.toString()}`, { headers });
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to export audit logs');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  const formatRelativeTime = (isoStr: string) => {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(isoStr);
  };

  const ActionIcon = ({ action }: { action: string }) => {
    const Icon = ACTION_ICONS[action] || Activity;
    return <Icon className="h-4 w-4" />;
  };

  const ResourceIcon = ({ type }: { type: string }) => {
    const Icon = RESOURCE_ICONS[type] || Activity;
    return <Icon className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterAction('all');
    setFilterResourceType('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || filterAction !== 'all' || filterResourceType !== 'all' || dateFrom || dateTo;

  const content = (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      {stats && !embedded && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xs text-muted-foreground mb-1">Total Events</div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">{stats.totalCount.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xs text-muted-foreground mb-1">Last 24 Hours</div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.last24h.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xs text-muted-foreground mb-1">Last 7 Days</div>
              <div className="text-xl sm:text-2xl font-bold text-indigo-600">{stats.last7d.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xs text-muted-foreground mb-1">Action Types</div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">{Object.keys(stats.actionBreakdown).length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, action, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Action filter */}
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {availableActions.map(a => (
                  <SelectItem key={a} value={a}>
                    <span className="capitalize">{a.replace(/_/g, ' ')}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Resource type filter */}
            <Select value={filterResourceType} onValueChange={setFilterResourceType}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {availableResourceTypes.map(r => (
                  <SelectItem key={r} value={r}>
                    <span className="capitalize">{r.replace(/_/g, ' ')}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date range + actions row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs text-muted-foreground whitespace-nowrap">From:</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-36 h-9 text-sm"
              />
              <label className="text-xs text-muted-foreground whitespace-nowrap">To:</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-36 h-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
              <AuditLogModuleHelp
                userId={user.id}
                totalEvents={pagination.totalCount}
                last24hEvents={stats?.last24h || 0}
                onRefreshLogs={fetchLogs}
                onExportCsv={handleExport}
                onClearFilters={clearFilters}
                onShowPermissionChanges={() => {
                  setFilterAction('permission_change');
                  setCurrentPage(1);
                }}
                onShowUserEvents={() => {
                  setFilterResourceType('user');
                  setCurrentPage(1);
                }}
                onOpenSearchExample={(query) => {
                  setSearchQuery(query);
                  setCurrentPage(1);
                }}
              />
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => fetchLogs()} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
                <Download className={`h-4 w-4 mr-1 ${isExporting ? 'animate-pulse' : ''}`} />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Log entries */}
      <Card>
        <CardContent className="p-0">
          {isLoading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Loading audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">No audit logs found</p>
              <p className="text-sm mt-1">
                {hasActiveFilters
                  ? 'Try adjusting your filters'
                  : 'Actions will be recorded here as users interact with the system'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const actionColor = ACTION_COLORS[log.action] || 'bg-muted text-foreground border-border';

                return (
                  <div
                    key={log.id}
                    className="p-3 sm:p-4 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Action icon */}
                      <div className={`flex-shrink-0 mt-0.5 p-1.5 rounded-lg border ${actionColor}`}>
                        <ActionIcon action={log.action} />
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            {/* Description or action label */}
                            <p className="text-sm font-medium text-foreground truncate">
                              {log.details?.description || (
                                <span className="capitalize">
                                  {log.action.replace(/_/g, ' ')} {log.resource_type.replace(/_/g, ' ')}
                                </span>
                              )}
                            </p>

                            {/* User and resource info */}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                {log.details?.user_name || log.details?.user_email || 'Unknown user'}
                              </span>
                              <span className="text-xs text-gray-300">|</span>
                              <div className="flex items-center gap-1">
                                <ResourceIcon type={log.resource_type} />
                                <span className="text-xs text-muted-foreground capitalize">
                                  {log.resource_type.replace(/_/g, ' ')}
                                </span>
                              </div>
                              {log.resource_id && (
                                <>
                                  <span className="text-xs text-gray-300">|</span>
                                  <span className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                                    {log.resource_id.slice(0, 8)}...
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Timestamp and action badge */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="outline" className={`text-xs ${actionColor}`}>
                              <span className="capitalize">{log.action.replace(/_/g, ' ')}</span>
                            </Badge>
                            <span className="text-xs text-muted-foreground whitespace-nowrap" title={formatDate(log.created_at)}>
                              {formatRelativeTime(log.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && log.details && (
                          <div className="mt-3 p-3 bg-muted rounded-lg text-xs space-y-2 border border-border">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <span className="font-medium text-muted-foreground">Full Timestamp:</span>{' '}
                                <span className="text-foreground">{formatDate(log.created_at)}</span>
                              </div>
                              <div>
                                <span className="font-medium text-muted-foreground">User ID:</span>{' '}
                                <span className="text-foreground font-mono">{log.user_id.slice(0, 12)}...</span>
                              </div>
                              {log.details.user_email && (
                                <div>
                                  <span className="font-medium text-muted-foreground">Email:</span>{' '}
                                  <span className="text-foreground">{log.details.user_email}</span>
                                </div>
                              )}
                              {log.resource_id && (
                                <div>
                                  <span className="font-medium text-muted-foreground">Resource ID:</span>{' '}
                                  <span className="text-foreground font-mono">{log.resource_id}</span>
                                </div>
                              )}
                            </div>

                            {/* Old/New values diff */}
                            {log.details.old_values && (
                              <div>
                                <span className="font-medium text-red-600">Previous Values:</span>
                                <pre className="mt-1 p-2 bg-red-50 border border-red-100 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(log.details.old_values, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.details.new_values && (
                              <div>
                                <span className="font-medium text-green-600">New Values:</span>
                                <pre className="mt-1 p-2 bg-green-50 border border-green-100 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(log.details.new_values, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* Extra metadata */}
                            {Object.entries(log.details).filter(
                              ([k]) => !['user_email', 'user_name', 'description', 'old_values', 'new_values'].includes(k)
                            ).length > 0 && (
                              <div>
                                <span className="font-medium text-muted-foreground">Additional Details:</span>
                                <pre className="mt-1 p-2 bg-background border border-border rounded text-xs overflow-x-auto">
                                  {JSON.stringify(
                                    Object.fromEntries(
                                      Object.entries(log.details).filter(
                                        ([k]) => !['user_email', 'user_name', 'description', 'old_values', 'new_values'].includes(k)
                                      )
                                    ),
                                    null,
                                    2
                                  )}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pagination.pageSize) + 1}–{Math.min(currentPage * pagination.pageSize, pagination.totalCount)} of{' '}
            {pagination.totalCount.toLocaleString()} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Previous</span>
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {currentPage} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pagination.totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <span className="hidden sm:inline mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="h-6 w-6 text-muted-foreground" />
            Audit Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track all user actions and system events across your organization
          </p>
        </div>
        {stats && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 self-start">
            {stats.last24h} events in last 24h
          </Badge>
        )}
      </div>
      {content}
    </div>
  );
}