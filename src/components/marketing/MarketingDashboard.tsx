import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, Mail, Users, MousePointer, DollarSign, Target, Zap, Send, Eye, MousePointerClick, FileText } from 'lucide-react';
import type { User } from '../../App';
import { bidsAPI, campaignsAPI, contactsAPI, journeysAPI, quotesAPI } from '../../utils/api';
import { getDealActivities, type DealActivity } from '../../utils/marketing-client';
import { normalizeCampaignMetrics } from '../../utils/campaign-metrics';
import { Skeleton } from '../ui/skeleton';
import { MetricCard } from '../MetricCard';

interface MarketingDashboardProps {
  user: User;
}

export function MarketingDashboard({ user }: MarketingDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    totalLeads: 0,
    pipelineValue: 0,
    avgOpenRate: 0,
    conversionRate: 0,
    revenue: 0,
    activeJourneys: 0
  });
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [dealActivities, setDealActivities] = useState<DealActivity[]>([]);

  const parseAmount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    if (typeof val === 'string') {
      const clean = val.replace(/[^0-9.-]/g, '');
      return parseFloat(clean) || 0;
    }
    return 0;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch data in parallel
        const [campaignsData, contactsData, journeysData, activitiesData, bidsData, quotesData] = await Promise.all([
          campaignsAPI.getAll(),
          contactsAPI.getAll('team'),
          journeysAPI.getAll(user.organizationId || ''),
          getDealActivities(),
          bidsAPI.getAll('team'),
          quotesAPI.getAll('team')
        ]);

        const campaigns = (campaignsData.campaigns || []).map(normalizeCampaignMetrics);
        const contacts = contactsData.contacts || [];
        const journeys = journeysData || [];

        // Calculate stats
        const activeCampaignsCount = campaigns.filter((c: any) => c.status === 'active' || c.status === 'Active').length;
        
        const totalSent = campaigns.reduce((sum: number, c: any) => sum + c.sent_metric, 0);
        const totalOpened = campaigns.reduce((sum: number, c: any) => sum + c.opened_metric, 0);
        const totalConverted = campaigns.reduce((sum: number, c: any) => sum + c.converted_metric, 0);
        const totalRevenue = campaigns.reduce((sum: number, c: any) => sum + c.revenue_metric, 0);

        const avgOpenRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
        const conversionRate = totalSent > 0 ? (totalConverted / totalSent) * 100 : 0;

        const activeJourneysCount = Array.isArray(journeys) ? journeys.filter((j: any) => j.status === 'active').length : 0;

        const allDeals = [...(bidsData.bids || []), ...(quotesData.quotes || [])];
        const openDeals = allDeals.filter((deal: any) => {
          const status = (deal.status || '').toLowerCase();
          return !['accepted', 'won', 'completed', 'rejected', 'lost', 'expired'].includes(status);
        });
        const pipelineValue = openDeals.reduce((sum: number, deal: any) => {
          return sum + parseAmount(deal.total || deal.amount);
        }, 0);

        setStats({
          activeCampaigns: activeCampaignsCount,
          totalLeads: contacts.length,
          pipelineValue,
          avgOpenRate,
          conversionRate,
          revenue: totalRevenue,
          activeJourneys: activeJourneysCount
        });

        setRecentCampaigns(campaigns.slice(0, 5));
        setDealActivities(activitiesData.slice(0, 20));

      } catch (error) {
        // Handle silently
      } finally {
        setLoading(false);
      }
    };

    if (user.organizationId) {
      loadData();
    }
  }, [user.organizationId]);

  const dashboardStats = [
    {
      title: 'Active Campaigns',
      value: stats.activeCampaigns.toString(),
      change: 'currently running',
      trend: 'neutral',
      icon: Mail,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
    },
    {
      title: 'Total Leads',
      value: stats.totalLeads.toLocaleString(),
      change: 'total contacts',
      trend: 'up',
      icon: Users,
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
    },
    {
      title: 'Pipeline Value',
      value: `$${stats.pipelineValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: 'open deals total',
      trend: 'up',
      icon: DollarSign,
      bgColor: 'bg-cyan-100',
      textColor: 'text-cyan-600',
    },
    {
      title: 'Avg. Open Rate',
      value: `${stats.avgOpenRate.toFixed(1)}%`,
      change: 'across campaigns',
      trend: 'neutral',
      icon: MousePointer,
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600',
    },
    {
      title: 'Conversion Rate',
      value: `${stats.conversionRate.toFixed(1)}%`,
      change: 'overall',
      trend: 'neutral',
      icon: Target,
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-600',
    },
    {
      title: 'Revenue Attribution',
      value: `$${stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: 'total revenue',
      trend: 'up',
      icon: DollarSign,
      bgColor: 'bg-emerald-100',
      textColor: 'text-emerald-600',
    },
    {
      title: 'Active Journeys',
      value: stats.activeJourneys.toString(),
      change: 'automated flows',
      trend: 'neutral',
      icon: Zap,
      bgColor: 'bg-indigo-100',
      textColor: 'text-indigo-600',
    },
  ];

  const getActivityIcon = (eventType: string) => {
    switch (eventType) {
      case 'deal_email_sent': return <Send className="h-4 w-4 text-blue-600" />;
      case 'deal_viewed': return <Eye className="h-4 w-4 text-indigo-600" />;
      case 'deal_link_clicked': return <MousePointerClick className="h-4 w-4 text-green-600" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityBadge = (eventType: string) => {
    switch (eventType) {
      case 'deal_email_sent': return <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">Email Sent</Badge>;
      case 'deal_viewed': return <Badge className="bg-indigo-100 text-indigo-700 border-0 text-[10px]">Viewed</Badge>;
      case 'deal_link_clicked': return <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">Link Clicked</Badge>;
      default: return <Badge className="bg-muted text-foreground border-0 text-[10px]">{eventType}</Badge>;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
        dashboardStats.map((stat) => {
          const Icon = stat.icon;
          const colorMap: Record<string, string> = {
            'bg-blue-100': 'bg-blue-600',
            'bg-green-100': 'bg-green-600',
            'bg-cyan-100': 'bg-cyan-600',
            'bg-purple-100': 'bg-purple-600',
            'bg-orange-100': 'bg-orange-500',
            'bg-emerald-100': 'bg-emerald-600',
            'bg-indigo-100': 'bg-indigo-600',
          };
          const bgColor = colorMap[stat.bgColor] || 'bg-gray-600';

          return (
            <MetricCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={<Icon className="h-4 w-4" />}
              className={`${bgColor} text-white`}
              description={`${stat.trend === 'up' ? '↑ ' : stat.trend === 'down' ? '↓ ' : ''}${stat.change}`}
            />
          );
        })
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCampaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent campaigns</p>
              ) : (
                recentCampaigns.map((campaign, index) => (
                  <div key={index} className="flex items-center justify-between pb-4 border-b last:border-b-0 last:pb-0">
                    <div className="flex-1">
                      <p className="text-sm text-foreground font-medium">{campaign.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground capitalize">{campaign.type}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          campaign.status === 'Active' || campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                          campaign.status === 'Scheduled' || campaign.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                          'bg-muted text-foreground'
                        }`}>
                          {campaign.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Sent: {campaign.sent_metric.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Opened: {campaign.opened_metric.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Clicked: {campaign.clicked_metric.toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lead Funnel Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Funnel Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { stage: 'Total Leads', count: stats.totalLeads, percentage: 100, barClass: 'bg-blue-500' },
                { stage: 'Sent Campaigns', count: recentCampaigns.reduce((sum, c) => sum + c.sent_metric, 0), percentage: stats.totalLeads > 0 ? Math.min(100, (recentCampaigns.reduce((sum, c) => sum + c.sent_metric, 0) / stats.totalLeads) * 100) : 0, barClass: 'bg-indigo-500' },
                { stage: 'Engaged (Opened)', count: recentCampaigns.reduce((sum, c) => sum + c.opened_metric, 0), percentage: stats.totalLeads > 0 ? Math.min(100, (recentCampaigns.reduce((sum, c) => sum + c.opened_metric, 0) / stats.totalLeads) * 100) : 0, barClass: 'bg-purple-500' },
                { stage: 'Conversions', count: recentCampaigns.reduce((sum, c) => sum + c.converted_metric, 0), percentage: stats.totalLeads > 0 ? Math.min(100, (recentCampaigns.reduce((sum, c) => sum + c.converted_metric, 0) / stats.totalLeads) * 100) : 0, barClass: 'bg-green-500' },
              ].map((stage, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-foreground">{stage.stage}</span>
                    <span className="text-sm text-muted-foreground">{stage.count.toLocaleString()} ({stage.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stage.barClass}`}
                      style={{ width: `${stage.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deal Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Deal Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dealActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium">No deal activity yet</p>
              <p className="text-xs mt-1">When you email deals to customers, activity will appear here — including when they open and view the deal.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {dealActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted hover:bg-muted transition-colors">
                  <div className="mt-0.5 flex-shrink-0">
                    {getActivityIcon(activity.event_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">
                        {activity.deal_title || activity.deal_number || 'Deal'}
                      </span>
                      {getActivityBadge(activity.event_type)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      {activity.contact_name && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {activity.contact_name}
                        </span>
                      )}
                      {activity.deal_total != null && activity.deal_total > 0 && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(activity.deal_total)}
                        </span>
                      )}
                      <span>{formatTimeAgo(activity.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
