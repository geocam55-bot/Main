import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';
import { 
  DollarSign, 
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  TrendingUp,
  Briefcase,
  Target,
  Users,
  Layers,
  BarChart3,
  FileText,
  StickyNote
} from 'lucide-react';
import { ExplicitChartContainer } from './ui/ExplicitChartContainer';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { bidsAPI, quotesAPI, appointmentsAPI, tasksAPI } from '../utils/api';
import { canView } from '../utils/permissions';
import { onPermissionsChanged } from '../utils/permissions';
import { createClient } from '../utils/supabase/client';
import type { User } from '../App';
import { PermissionGate } from './PermissionGate';
import { useTheme } from './ThemeProvider';
import { MetricCard } from './MetricCard';
import { DashboardModuleHelp } from './DashboardModuleHelp';

interface DashboardProps {
  user: User;
  organization?: any;
  onNavigate?: (view: string) => void;
}

export function Dashboard({ user, organization, onNavigate }: DashboardProps) {
  const { theme } = useTheme();
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    winRate: 0,
    closeRate: 0,
    avgDaysToClose: 0,
    pipelineValue: 0,
    openDeals: 0,
    weightedValue: 0,
    avgOpenDealAge: 0
  });
  
  const [charts, setCharts] = useState({
    pipeline: [] as any[],
    wonDeals: [] as any[],
    lossReasons: [] as any[],
    projection: [] as any[]
  });

  const [tasks, setTasks] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadDashboardData();
  }, [user.id]); // Only reload when user changes, not on permission updates

  const hasModuleAccess = (module: string) => canView(module, user.role);

  // Helper to parse amounts safely (handling numbers, strings, currency symbols)
  const parseAmount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    if (typeof val === 'string') {
      // Remove currency symbols (except -/.) and commas
      const clean = val.replace(/[^0-9.-]/g, '');
      return parseFloat(clean) || 0;
    }
    return 0;
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch data in parallel - Fetch ALL data regardless of frontend permission cache
      // The API handles security/filtering based on user role.
      // This prevents race conditions where permissions aren't loaded yet.
      const [bidsData, quotesData, tasksData, appointmentsData] = await Promise.all([
        bidsAPI.getAll(), 
        quotesAPI.getAll(),
        tasksAPI.getAll(),
        appointmentsAPI.getAll()
      ]);

      const allBidsRaw = [...(bidsData.bids || []), ...(quotesData.quotes || [])];

      // All data is already filtered to the user's own data by the API (scope=personal default)
      const allBids = allBidsRaw;

      // --- Calculate Metrics ---

      // 1. Total Sales (Won Bids/Quotes)
      const wonDeals = allBids.filter(b => ['accepted', 'won', 'completed'].includes((b.status || '').toLowerCase()));
      const totalSales = wonDeals.reduce((sum, b) => sum + parseAmount(b.amount || b.total), 0);

      // 2. Pipeline Value (Open Deals)
      const openBids = allBids.filter(b => {
        const status = (b.status || '').toLowerCase();
        return !['accepted', 'won', 'completed', 'rejected', 'lost', 'expired'].includes(status);
      });
      const pipelineValue = openBids.reduce((sum, b) => sum + parseAmount(b.total || b.amount), 0);

      // 3. Open Deals Count
      const openDealsCount = openBids.length;

      // 4. Win Rate (Won / (Won + Lost))
      const lostDeals = allBids.filter(b => ['rejected', 'lost'].includes((b.status || '').toLowerCase()));
      const totalClosed = wonDeals.length + lostDeals.length;
      const winRate = totalClosed > 0 ? (wonDeals.length / totalClosed) * 100 : 0;

      // 5. Avg Days to Close (Calculated from won deals)
      
      const totalDaysToClose = wonDeals.reduce((sum, d) => {
        // Use updated_at as proxy for close date if not available
        // In real app, we should use a specific 'closed_at' field
        // Handle both snake_case and camelCase field names
        const createdField = d.created_at || d.createdAt;
        const updatedField = d.updated_at || d.updatedAt || d.created_at || d.createdAt;
        
        const created = new Date(createdField).getTime();
        const closed = new Date(updatedField).getTime();
        
        if (isNaN(created) || isNaN(closed)) {
          return sum;
        }
        
        const days = Math.max(0, (closed - created) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      
      const avgDaysToClose = wonDeals.length > 0 ? totalDaysToClose / wonDeals.length : 0;

      // 6. Weighted Value (Pipeline Value * Probability)
      const weightedValue = openBids.reduce((sum, b) => {
        const val = parseAmount(b.total || b.amount);
        const status = (b.status || '').toLowerCase();
        let prob = 0.1; // draft
        if (status === 'sent') prob = 0.4;
        if (status === 'viewed') prob = 0.6;
        return sum + (val * prob);
      }, 0);

      // 7. Avg Open Deal Age (Today - CreatedAt)
      const now = new Date().getTime();
      const totalAge = openBids.reduce((sum, b) => {
        // Handle both snake_case and camelCase field names
        const createdField = b.created_at || b.createdAt;
        const createdAt = createdField ? new Date(createdField).getTime() : 0;
        
        // Skip invalid dates
        if (!createdAt || isNaN(createdAt)) {
          return sum;
        }
        
        const daysOld = (now - createdAt) / (1000 * 60 * 60 * 24);
        // Ensure we don't get negative days (future dates)
        return sum + Math.max(0, daysOld);
      }, 0);
      
      // Calculate average only if we have deals, otherwise default to 0
      const validDealsCount = openBids.filter(b => {
        const createdField = b.created_at || b.createdAt;
        return createdField && !isNaN(new Date(createdField).getTime());
      }).length;
      const avgOpenDealAge = validDealsCount > 0 ? totalAge / validDealsCount : 0;
      
      setMetrics({
        totalSales,
        winRate,
        closeRate: winRate * 0.85, // Mock relation
        avgDaysToClose,
        pipelineValue,
        openDeals: openDealsCount,
        weightedValue,
        avgOpenDealAge
      });

      // --- Prepare Chart Data ---

      // 1. Sales Pipeline (Donut) - Deals by Status
      const statusCounts: Record<string, number> = {};
      
      // Count Deals by status
      allBids.forEach((b: any) => {
        const status = b.status || 'draft';
        // Normalize 'sent' and 'viewed' to 'Active' for simpler chart if desired, or keep granular
        const displayName = status.charAt(0).toUpperCase() + status.slice(1);
        statusCounts[displayName] = (statusCounts[displayName] || 0) + 1;
      });
      
      const pipelineData = Object.entries(statusCounts)
        .filter(([name, value]) => name && value > 0)
        .map(([name, value], index) => ({ 
          id: `pipeline-${name.replace(/\s+/g, '-').toLowerCase()}-idx${index}`,
          name, 
          value 
        }));
      
      // No fallback data - show actual database data only

      // 2. Won Deals Trend (Line)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      // Initialize with 0
      const trendData = months.map((m, idx) => ({ id: `trend-${m}-${idx}`, name: m, value: 0, deals: 0 }));
      
      wonDeals.forEach(d => {
        const date = new Date(d.updated_at || d.created_at);
        const monthIdx = date.getMonth();
        const amount = parseAmount(d.amount || d.total);
        trendData[monthIdx].value += amount;
        trendData[monthIdx].deals += 1;
      });

      // 3. Loss Reasons (Donut) - Calculate from actual lost deals
      const lossReasonCounts: Record<string, number> = {};
      lostDeals.forEach(d => {
        const reason = d.lossReason || d.loss_reason || 'Unknown reason';
        lossReasonCounts[reason] = (lossReasonCounts[reason] || 0) + 1;
      });
      
      const lossReasonData = Object.entries(lossReasonCounts)
        .filter(([name, value]) => name && value > 0)
        .map(([name, value], index) => ({ 
          id: `loss-${name.replace(/\s+/g, '-').toLowerCase()}-idx${index}`,
          name, 
          value 
        }));

      // 4. Projection (Line) - Calculate from open deals
      // For projection, we'll show open deals by valid until month (proxy for expected close)
      const projectionData = months.map((m, idx) => ({
        id: `projection-${m}-${idx}`,
        name: m,
        projected: 0,
        actual: 0
      }));
      
      // Add won deals to actual
      wonDeals.forEach(d => {
        const date = new Date(d.updated_at || d.created_at);
        const monthIdx = date.getMonth();
        const amount = parseAmount(d.amount || d.total);
        projectionData[monthIdx].actual += amount;
      });
      
      // Add open deals to projected
      openBids.forEach((b: any) => {
        // Use validUntil as proxy for expected close date
        if (b.validUntil || b.valid_until) {
          const closeDate = new Date(b.validUntil || b.valid_until);
          const monthIdx = closeDate.getMonth();
          const amount = parseAmount(b.total || b.amount);
          if (monthIdx >= 0 && monthIdx < 12) {
            projectionData[monthIdx].projected += amount;
          }
        }
      });

      setCharts({
        pipeline: pipelineData,
        wonDeals: trendData,
        lossReasons: lossReasonData,
        projection: projectionData
      });

      // Set tasks and appointments
      setTasks(tasksData.tasks || []);
      setAppointments(appointmentsData.appointments || []);

    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Colors for charts
  const PIPELINE_COLORS = [
    theme.colors.primary, 
    theme.colors.info, 
    theme.colors.accent, 
    theme.colors.success, 
    theme.colors.warning
  ];
  
  const LOSS_COLORS = [
    theme.colors.error, 
    theme.colors.warning, 
    theme.colors.info, 
    theme.colors.textMuted, 
    theme.colors.primary
  ];

  return (
    <PermissionGate user={user} module="dashboard" action="view">
    <div className="p-4 sm:p-6 space-y-6 min-h-screen bg-background text-foreground">
      
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <div className="flex items-center space-x-2">
          <DashboardModuleHelp
            userId={user.id}
            openDeals={metrics.openDeals}
            pipelineValue={metrics.pipelineValue}
            taskCount={tasks.length}
            appointmentCount={appointments.length}
            onRefresh={loadDashboardData}
            onOpenDeals={() => onNavigate?.('bids')}
            onOpenTasks={() => onNavigate?.('tasks')}
            onOpenAppointments={() => onNavigate?.('appointments')}
          />
          <Button variant="outline" size="sm" onClick={loadDashboardData} disabled={isLoading}>
            <Activity className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Top Metrics Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Sales" 
          value={`$${(metrics.totalSales / 1000).toFixed(2)}k`} 
          icon={<DollarSign className="h-4 w-4" />}
          className="bg-indigo-600 text-white"
          description="Total revenue from won deals"
        />
        <MetricCard 
          title="Win Rate" 
          value={`${metrics.winRate.toFixed(1)}%`} 
          icon={<TrendingUp className="h-4 w-4" />}
          className="bg-blue-900 text-white"
          description="Percentage of closed deals won"
        />
        <MetricCard 
          title="Close Rate" 
          value={`${metrics.closeRate.toFixed(1)}%`} 
          icon={<Target className="h-4 w-4" />}
          className="bg-sky-600 text-white"
          description="Estimated conversion rate"
        />
        <MetricCard 
          title="Avg Days to Close" 
          value={metrics.avgDaysToClose.toFixed(1)} 
          icon={<Clock className="h-4 w-4" />}
          className="bg-teal-500 text-white"
          description="Average deal duration"
        />
      </div>

      {/* Top Metrics Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Pipeline Value" 
          value={`$${(metrics.pipelineValue / 1000).toFixed(2)}k`} 
          icon={<BarChart3 className="h-4 w-4" />}
          className="bg-indigo-500 text-white"
          description="Total value of open deals"
        />
        <MetricCard 
          title="Open Deals" 
          value={metrics.openDeals.toString()} 
          icon={<Briefcase className="h-4 w-4" />}
          className="bg-blue-800 text-white"
          description="Active opportunities"
        />
        <MetricCard 
          title="Weighted Value" 
          value={`$${(metrics.weightedValue / 1000).toFixed(2)}k`} 
          icon={<Layers className="h-4 w-4" />}
          className="bg-sky-500 text-white"
          description="Probability-adjusted value"
        />
        <MetricCard 
          title="Avg Deal Age" 
          value={metrics.avgOpenDealAge.toFixed(1)} 
          icon={<Calendar className="h-4 w-4" />}
          className="bg-emerald-500 text-white"
          description="Days since creation"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        
        {/* Won Deals Trend (Line Chart) - Spans 4 cols */}
        <Card className="lg:col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Won Deals Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ExplicitChartContainer key="dashboard-wondeals-container">
                <AreaChart key="dashboard-wondeals-chart" data={charts.wonDeals} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs key="dashboard-wondeals-defs">
                    <linearGradient id="colorValueWonDeals" x1="0" y1="0" x2="0" y2="1">
                      <stop key="dashboard-wondeals-stop-5" offset="5%" stopColor={theme.colors.primary} stopOpacity={0.3}/>
                      <stop key="dashboard-wondeals-stop-95" offset="95%" stopColor={theme.colors.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid key="dashboard-wondeals-grid" strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis key="dashboard-wondeals-xaxis" dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--muted-foreground)'}} fontSize={12} />
                  <YAxis key="dashboard-wondeals-yaxis" yAxisId="left" axisLine={false} tickLine={false} tick={{fill: 'var(--muted-foreground)'}} width={40} fontSize={12} />
                  <Tooltip 
                    key="dashboard-wondeals-tooltip"
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                  <Legend key="dashboard-wondeals-legend" />
                  <Area 
                    key="dashboard-wondeals-area"
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="value" 
                    stroke={theme.colors.primary} 
                    fillOpacity={1} 
                    fill="url(#colorValueWonDeals)" 
                    name="Closed Value ($)" 
                  />
                </AreaChart>
              </ExplicitChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales Pipeline (Donut) - Spans 3 cols */}
        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              {charts.pipeline.length > 0 ? (
                <ExplicitChartContainer key="dashboard-pipeline-container">
                  <PieChart key="sales-pipeline-chart">
                    <Pie
                      key="dashboard-pipeline-pie"
                      data={charts.pipeline}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {charts.pipeline.map((entry, index) => (
                        <Cell key={`dashboard-pipeline-cell-${entry.name || 'unknown'}-${index}`} fill={PIPELINE_COLORS[index % PIPELINE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      key="dashboard-pipeline-tooltip"
                      contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--foreground)' }}
                    />
                    <Legend key="dashboard-pipeline-legend" verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ExplicitChartContainer>
              ) : (
                <p className="text-muted-foreground text-sm">No pipeline data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Deals Projection (Line Chart) - Spans 4 cols */}
        <Card className="lg:col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Revenue Projection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ExplicitChartContainer key="dashboard-projection-container">
                <LineChart key="dashboard-projection-chart" data={charts.projection} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid key="dashboard-projection-grid" strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis key="dashboard-projection-xaxis" dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--muted-foreground)'}} fontSize={12} />
                  <YAxis key="dashboard-projection-yaxis" axisLine={false} tickLine={false} tick={{fill: 'var(--muted-foreground)'}} width={40} fontSize={12} />
                  <Tooltip 
                    key="dashboard-projection-tooltip"
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                  <Legend key="dashboard-projection-legend" />
                  <Line key="dashboard-projection-line-projected" type="monotone" dataKey="projected" stroke={theme.colors.info} strokeWidth={2} dot={false} name="Projected" />
                  <Line key="dashboard-projection-line-actual" type="monotone" dataKey="actual" stroke={theme.colors.primary} strokeWidth={2} dot={false} name="Actual" />
                </LineChart>
              </ExplicitChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Deal Loss Reasons (Donut) - Spans 3 cols */}
        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Loss Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              {charts.lossReasons.length > 0 ? (
                <ExplicitChartContainer key="dashboard-loss-container">
                  <PieChart key="loss-reasons-chart">
                    <Pie
                      key="dashboard-loss-pie"
                      data={charts.lossReasons}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {charts.lossReasons.map((entry, index) => (
                        <Cell key={`dashboard-loss-cell-${entry.name || 'unknown'}-${index}`} fill={LOSS_COLORS[index % LOSS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      key="dashboard-loss-tooltip"
                      contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--foreground)' }}
                    />
                    <Legend key="dashboard-loss-legend" verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ExplicitChartContainer>
              ) : (
                <p className="text-muted-foreground text-sm">No loss data available</p>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Tasks & Appointments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Tasks Section */}
        {hasModuleAccess('tasks') && (
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                My Tasks
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onNavigate?.('tasks')}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
                  <p>No pending tasks</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {tasks.slice(0, 10).map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Appointments Section */}
        {hasModuleAccess('appointments') && (
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-info" />
                Upcoming Appointments
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onNavigate?.('appointments')}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mb-2 opacity-20" />
                  <p>No appointments scheduled</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {appointments.slice(0, 10).map((appointment) => (
                    <AppointmentItem key={appointment.id} appointment={appointment} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>

    </div>
    </PermissionGate>
  );
}

function TaskItem({ task }: { task: any }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
  const priorityColors = {
    high: 'text-red-600 bg-red-50',
    medium: 'text-yellow-600 bg-yellow-50',
    low: 'text-green-600 bg-green-50'
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors">
      <div className={`mt-0.5 ${task.status === 'completed' ? 'text-green-600' : 'text-muted-foreground'}`}>
        <CheckCircle2 className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-foreground ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-sm text-muted-foreground mt-1 truncate">{task.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          {task.priority && (
            <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[task.priority as keyof typeof priorityColors] || 'text-muted-foreground bg-muted'}`}>
              {task.priority}
            </span>
          )}
          {task.dueDate && (
            <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
              <Clock className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AppointmentItem({ appointment }: { appointment: any }) {
  const startDate = new Date(appointment.startTime || appointment.start_time);
  const endDate = new Date(appointment.endTime || appointment.end_time);
  const isToday = startDate.toDateString() === new Date().toDateString();
  const isPast = startDate < new Date();

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
      isToday ? 'border-blue-300 bg-blue-50' : 'border-border hover:bg-muted'
    }`}>
      <div className={`mt-0.5 ${isToday ? 'text-blue-600' : isPast ? 'text-muted-foreground' : 'text-indigo-600'}`}>
        <Calendar className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">{appointment.title}</p>
        {appointment.description && (
          <p className="text-sm text-muted-foreground mt-1 truncate">{appointment.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {' - '}
            {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isToday && (
            <span>{startDate.toLocaleDateString()}</span>
          )}
        </div>
        {appointment.location && (
          <p className="text-xs text-muted-foreground mt-1">{appointment.location}</p>
        )}
      </div>
    </div>
  );
}