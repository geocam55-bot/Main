import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Target, 
  CheckCircle, 
  Calendar,
  Mail,
  Award,
  FileText
} from 'lucide-react';
import type { User } from '../../App';
import { createClient } from '../../utils/supabase/client';
import { MetricCard } from '../MetricCard';

interface ManagerSummaryReportsProps {
  user: User;
  showCost?: boolean;
}

export function ManagerSummaryReports({ user, showCost = false }: ManagerSummaryReportsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalBids: 0,
    pipelineValue: 0,
    pipelineCost: 0,
    winRate: 0,
    tasksCompleted: 0,
    upcomingAppointments: 0,
    activeCampaigns: 0,
  });
  const [previousStats, setPreviousStats] = useState({
    totalBids: 0,
    pipelineValue: 0,
    tasksCompleted: 0,
    winRate: 0,
    upcomingAppointments: 0,
    activeCampaigns: 0,
  });
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [user.organizationId]);

  const fetchData = async () => {
    const supabase = createClient();
    
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Fetch bids (filtered by organization)
      const { data: bids, error: bidsError } = await supabase
        .from('bids')
        .select('*')
        .eq('organization_id', user.organizationId);

      // Fetch quotes (filtered by organization)
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .eq('organization_id', user.organizationId);

      const allBids = [...(bids || []), ...(quotes || [])];

      // Fetch tasks (filtered by organization)
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', user.organizationId)
        .eq('status', 'completed');

      // Fetch appointments (filtered by organization)
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('*')
        .eq('organization_id', user.organizationId)
        .gte('start_time', new Date().toISOString());

      // Fetch campaigns (filtered by organization)
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('organization_id', user.organizationId)
        .eq('status', 'active');

      // Fetch users for team performance (filtered by organization)
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', user.organizationId);

      // Create user lookup map
      const userMap = new Map(users?.map(u => [u.id, u.name]) || []);

      // Calculate current period stats
      const currentBids = allBids.filter(b => new Date(b.created_at || b.createdAt) >= thirtyDaysAgo);
      const previousBids = allBids.filter(b => {
        const created = new Date(b.created_at || b.createdAt);
        return created >= sixtyDaysAgo && created < thirtyDaysAgo;
      });

      const currentTasks = tasks?.filter(t => new Date(t.updated_at) >= thirtyDaysAgo) || [];
      const previousTasks = tasks?.filter(t => {
        const updated = new Date(t.updated_at);
        return updated >= sixtyDaysAgo && updated < thirtyDaysAgo;
      }) || [];

      // Stats helper
      const calculateBidStats = (bidList: any[]) => {
        const total = bidList.length;
        const value = bidList.reduce((sum, b) => sum + (parseFloat(b.total || b.amount) || 0), 0);
        // Cost not strictly tracked in bids usually, but check for it
        const cost = bidList.reduce((sum, b) => sum + (parseFloat(b.cost) || 0), 0);
        
        const won = bidList.filter(b => ['accepted', 'won'].includes((b.status || '').toLowerCase())).length;
        const lost = bidList.filter(b => ['rejected', 'lost'].includes((b.status || '').toLowerCase())).length;
        const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;
        
        return { total, value, cost, winRate };
      };

      const currStats = calculateBidStats(currentBids);
      const prevStats = calculateBidStats(previousBids);

      setStats({
        totalBids: currStats.total,
        pipelineValue: currStats.value,
        pipelineCost: currStats.cost,
        winRate: currStats.winRate,
        tasksCompleted: tasks?.length || 0,
        upcomingAppointments: appointments?.length || 0,
        activeCampaigns: campaigns?.length || 0,
      });

      setPreviousStats({
        totalBids: prevStats.total,
        pipelineValue: prevStats.value,
        tasksCompleted: previousTasks.length,
        winRate: prevStats.winRate,
        upcomingAppointments: 0,
        activeCampaigns: 0,
      });

      // Calculate team performance
      if (users && allBids && tasks) {
        const teamStats = users
          .map(u => {
            const userBids = allBids.filter(b => b.created_by === u.id || b.assigned_to === u.id);
            const userTasks = tasks.filter(t => t.assigned_to === u.id);
            const userWon = userBids.filter(b => ['accepted', 'won'].includes((b.status || '').toLowerCase())).length;
            const userTotalClosed = userBids.filter(b => ['accepted', 'won', 'rejected', 'lost'].includes((b.status || '').toLowerCase())).length;
            
            return {
              name: u.name,
              bids: userBids.length,
              value: `$${Math.round(userBids.reduce((sum, b) => sum + (parseFloat(b.total || b.amount) || 0), 0) / 1000)}K`,
              winRate: userTotalClosed > 0 ? Math.round((userWon / userTotalClosed) * 100) : 0,
              tasksCompleted: userTasks.length,
            };
          })
          .filter(member => member.bids > 0 || member.tasksCompleted > 0)
          .sort((a, b) => b.bids - a.bids)
          .slice(0, 5);
        
        setTeamPerformance(teamStats);
      }

      // Get recent activity (from bids) with user names
      if (allBids.length > 0) {
        const recent = allBids
          .sort((a, b) => {
            const dateA = new Date(a.updated_at || a.updatedAt || a.created_at || a.createdAt).getTime();
            const dateB = new Date(b.updated_at || b.updatedAt || b.created_at || b.createdAt).getTime();
            return dateB - dateA;
          })
          .slice(0, 5)
          .map(bid => {
            const status = (bid.status || '').toLowerCase();
            const type = ['accepted', 'won'].includes(status) ? 'won' : 
                         ['rejected', 'lost'].includes(status) ? 'lost' : 'bid';
            
            return {
              type,
              description: bid.title || bid.quote_number || 'Untitled Bid',
              value: `$${Math.round((parseFloat(bid.total || bid.amount) || 0) / 1000)}K`,
              user: userMap.get(bid.created_by) || 'Unassigned',
              time: getRelativeTime(bid.updated_at || bid.updatedAt || bid.created_at || bid.createdAt),
            };
          });
        
        setRecentActivity(recent);
      }

      // Get monthly trend data for current year
      const currentYear = new Date().getFullYear();
      const trendData = Array.from({ length: 12 }, (_, i) => {
        const monthStart = new Date(currentYear, i, 1);
        const monthEnd = new Date(currentYear, i + 1, 0, 23, 59, 59);
        
        const monthBids = allBids.filter(b => {
          const created = new Date(b.created_at || b.createdAt);
          return created >= monthStart && created <= monthEnd;
        });
        
        const monthValue = monthBids.reduce((sum, b) => sum + (parseFloat(b.total || b.amount) || 0), 0);
        
        return {
          month: monthStart.toLocaleString('default', { month: 'short' }),
          value: monthValue,
          count: monthBids.length
        };
      });
      
      setMonthlyTrend(trendData);

      setLoading(false);
    } catch (error) {
      setError('Failed to fetch data. Please try again later.');
      setLoading(false);
    }
  };

  const getRelativeTime = (date: string) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return past.toLocaleDateString();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-muted-foreground">Loading reports...</div>
    </div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-red-500">{error}</div>
    </div>;
  }

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number): { change: string; trend: 'up' | 'down' } => {
    if (previous === 0) {
      return { change: current > 0 ? '+100%' : '0%', trend: current > 0 ? 'up' : 'down' };
    }
    const percentChange = Math.round(((current - previous) / previous) * 100);
    return {
      change: percentChange >= 0 ? `+${percentChange}%` : `${percentChange}%`,
      trend: percentChange >= 0 ? 'up' : 'down'
    };
  };

  const bidsChange = calculateChange(stats.totalBids, previousStats.totalBids);
  const valueChange = calculateChange(stats.pipelineValue, previousStats.pipelineValue);
  const winRateChange = calculateChange(stats.winRate, previousStats.winRate);
  const tasksChange = calculateChange(stats.tasksCompleted, previousStats.tasksCompleted);

  const kpis = [
    {
      title: 'Total Bids',
      value: stats.totalBids.toString(),
      change: bidsChange.change,
      trend: bidsChange.trend,
      icon: FileText,
      color: 'blue'
    },
    {
      title: showCost ? 'Pipeline Cost' : 'Pipeline Value',
      value: showCost 
        ? `$${(stats.pipelineCost / 1000000).toFixed(1)}M`
        : `$${(stats.pipelineValue / 1000000).toFixed(1)}M`,
      change: valueChange.change,
      trend: valueChange.trend,
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Win Rate',
      value: `${stats.winRate}%`,
      change: winRateChange.change,
      trend: winRateChange.trend,
      icon: Award,
      color: 'purple'
    },
    {
      title: 'Tasks Completed',
      value: stats.tasksCompleted.toString(),
      change: tasksChange.change,
      trend: tasksChange.trend,
      icon: CheckCircle,
      color: 'emerald'
    },
    {
      title: 'Upcoming Appointments',
      value: stats.upcomingAppointments.toString(),
      change: `${stats.upcomingAppointments} scheduled`,
      trend: 'up',
      icon: Calendar,
      color: 'orange'
    },
    {
      title: 'Campaign Performance',
      value: `${stats.activeCampaigns} Active`,
      change: `${stats.activeCampaigns} running`,
      trend: 'up',
      icon: Mail,
      color: 'indigo'
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const colorMap: Record<string, string> = {
            blue: 'bg-blue-600',
            green: 'bg-green-600',
            purple: 'bg-purple-600',
            emerald: 'bg-emerald-600',
            orange: 'bg-orange-500',
            indigo: 'bg-indigo-600',
          };
          
          return (
            <MetricCard 
              key={kpi.title}
              title={kpi.title} 
              value={kpi.value} 
              icon={<Icon className="h-4 w-4" />}
              className={`${colorMap[kpi.color] || 'bg-gray-600'} text-white`}
              description={`${kpi.trend === 'up' ? '↑' : '↓'} ${kpi.change}`}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {teamPerformance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-sm text-muted-foreground">Team Member</th>
                      <th className="text-left py-3 px-2 text-sm text-muted-foreground">Bids</th>
                      <th className="text-left py-3 px-2 text-sm text-muted-foreground">Value</th>
                      <th className="text-left py-3 px-2 text-sm text-muted-foreground">Win Rate</th>
                      <th className="text-left py-3 px-2 text-sm text-muted-foreground">Tasks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamPerformance.map((member, index) => (
                      <tr key={index} className="border-b border-border hover:bg-muted">
                        <td className="py-3 px-2 text-sm text-foreground">{member.name}</td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">{member.bids}</td>
                        <td className="py-3 px-2 text-sm text-foreground">{member.value}</td>
                        <td className="py-3 px-2">
                          <span className="text-sm text-green-600">{member.winRate}%</span>
                        </td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">{member.tasksCompleted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No team performance data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 pb-4 border-b last:border-b-0 last:pb-0">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      activity.type === 'won' ? 'bg-green-100' :
                      activity.type === 'lost' ? 'bg-red-100' :
                      activity.type === 'meeting' ? 'bg-blue-100' :
                      'bg-purple-100'
                    }`}>
                      {activity.type === 'won' && <TrendingUp className="h-5 w-5 text-green-600" />}
                      {activity.type === 'lost' && <TrendingDown className="h-5 w-5 text-red-600" />}
                      {activity.type === 'meeting' && <Calendar className="h-5 w-5 text-blue-600" />}
                      {activity.type === 'bid' && <FileText className="h-5 w-5 text-purple-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{activity.user}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-foreground">{activity.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No recent activity to display
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Overview Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Bid Value Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyTrend.length > 0 ? (
            <>
              <div className="h-64 flex items-end justify-between gap-2">
                {(() => {
                  const maxValue = Math.max(...monthlyTrend.map(d => d.value), 1);
                  return monthlyTrend.map((data, index) => {
                    const heightPercent = maxValue > 0 ? (data.value / maxValue) * 100 : 0;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2 group">
                        <div 
                          className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer relative" 
                          style={{ height: `${Math.max(heightPercent, 2)}%` }}
                        >
                          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                            ${(data.value / 1000).toFixed(0)}K
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{data.month}</span>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="flex items-center justify-center gap-8 mt-6">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-muted-foreground">Bid Value</span>
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data available for this year
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
