import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Mail, 
  MousePointerClick, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Users,
  Eye,
  Target,
  Globe
} from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { normalizeCampaignMetrics } from '../../utils/campaign-metrics';
import { buildServerFunctionUrl } from '../../utils/server-function-url';

interface CampaignAnalyticsProps {
  campaign: any;
}

export function CampaignAnalytics({ campaign }: CampaignAnalyticsProps) {
  const normalizedCampaign = normalizeCampaignMetrics(campaign);
  const landingPageSlug = normalizedCampaign.landing_page_slug_metric;
  
  const [analytics, setAnalytics] = useState({
    emailsSent: normalizedCampaign.sent_metric,
    emailsOpened: normalizedCampaign.opened_metric,
    landingPageClicks: normalizedCampaign.clicked_metric,
    avgTimeSpent: normalizedCampaign.avg_time_spent_metric,
    conversions: normalizedCampaign.converted_metric,
    revenue: normalizedCampaign.revenue_metric,
  });
  
  const [landingPageAnalytics, setLandingPageAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Fetch fresh campaign stats from DB
  useEffect(() => {
    const fetchCampaignStats = async () => {
      if (!campaign.id) return;
      
      const supabase = createClient();
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaign.id)
        .single();
        
      if (data) {
        const normalized = normalizeCampaignMetrics(data);
        setAnalytics(prev => ({
          ...prev,
          emailsSent: normalized.sent_metric,
          emailsOpened: normalized.opened_metric,
          landingPageClicks: normalized.clicked_metric,
          avgTimeSpent: normalized.avg_time_spent_metric,
          conversions: normalized.converted_metric,
          revenue: normalized.revenue_metric,
        }));
      }
    };
    
    fetchCampaignStats();

    // Subscribe to real-time updates for this campaign
    const supabase = createClient();
    const channel = supabase
      .channel(`campaign-${campaign.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'campaigns', 
        filter: `id=eq.${campaign.id}` 
      }, (payload: any) => {
        const data = normalizeCampaignMetrics(payload.new);
        setAnalytics(prev => ({
          ...prev,
          emailsSent: data.sent_metric,
          emailsOpened: data.opened_metric,
          landingPageClicks: data.clicked_metric,
          avgTimeSpent: data.avg_time_spent_metric,
          conversions: data.converted_metric,
          revenue: data.revenue_metric,
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaign.id]);

  // Fetch landing page analytics
  useEffect(() => {
    const fetchLandingPageAnalytics = async () => {
      if (!campaign.id) return;
      
      setLoadingAnalytics(true);
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          return;
        }

        const response = await fetch(
          buildServerFunctionUrl(`/analytics/campaign/${campaign.id}/landing-page`),
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setLandingPageAnalytics(data);
          
          // Update analytics with landing page data if available
          if (data.stats) {
            setAnalytics(prev => ({
              ...prev,
              landingPageClicks: data.stats.visits || 0,
              conversions: data.stats.conversions || 0,
            }));
          }
        } else {
          // Silent error
        }
      } catch (error) {
        // Silent error
      } finally {
        setLoadingAnalytics(false);
      }
    };

    fetchLandingPageAnalytics();
  }, [campaign.id]);

  // Calculate rates
  const openRate = analytics.emailsSent > 0 
    ? ((analytics.emailsOpened / analytics.emailsSent) * 100).toFixed(1)
    : '0.0';
  
  const clickThroughRate = analytics.emailsOpened > 0
    ? ((analytics.landingPageClicks / analytics.emailsOpened) * 100).toFixed(1)
    : '0.0';
  
  const conversionRate = analytics.emailsSent > 0
    ? ((analytics.conversions / analytics.emailsSent) * 100).toFixed(1)
    : '0.0';

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Emails Sent</p>
                <p className="text-xl font-semibold text-foreground">{analytics.emailsSent.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Opened</p>
                <p className="text-xl font-semibold text-foreground">{analytics.emailsOpened.toLocaleString()}</p>
                <p className="text-xs text-green-600">{openRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <MousePointerClick className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Landing Page Clicks</p>
                <p className="text-xl font-semibold text-foreground">{analytics.landingPageClicks.toLocaleString()}</p>
                <p className="text-xs text-purple-600">{clickThroughRate}% CTR</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conversions</p>
                <p className="text-xl font-semibold text-foreground">{analytics.conversions.toLocaleString()}</p>
                <p className="text-xs text-orange-600">{conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Engagement Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg. Time on Landing Page</span>
              <Badge variant="outline">{formatTime(analytics.avgTimeSpent)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Click-Through Rate</span>
              <Badge variant="outline">{clickThroughRate}%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Open Rate</span>
              <Badge variant="outline">{openRate}%</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue Impact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Revenue</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                ${analytics.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Revenue per Email</span>
              <Badge variant="outline">
                ${analytics.emailsSent > 0 ? (analytics.revenue / analytics.emailsSent).toFixed(2) : '0.00'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Conversion Rate</span>
              <Badge variant="outline">{conversionRate}%</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Campaign Name</p>
              <p className="text-sm text-foreground font-medium">{campaign.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge className={
                campaign.status === 'Active' ? 'bg-green-100 text-green-700' :
                campaign.status === 'Paused' ? 'bg-yellow-100 text-yellow-700' :
                campaign.status === 'Completed' ? 'bg-muted text-foreground' :
                'bg-blue-100 text-blue-700'
              }>
                {campaign.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Audience Segment</p>
              <p className="text-sm text-foreground">{campaign.audience_segment || 'All Contacts'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Landing Page</p>
              <p className="text-sm text-foreground">{campaign.landing_page_name || 'None'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p className="text-sm text-foreground">
                {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'Not started'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="text-sm text-foreground capitalize">{campaign.type || 'Email'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Landing Page Analytics */}
      {landingPageAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {landingPageSlug ? 'Landing Page Analytics' : 'Campaign Landing Page Activity'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Page Visits</p>
                <p className="text-2xl font-bold text-foreground">{landingPageAnalytics.stats.visits}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Conversions</p>
                <p className="text-2xl font-bold text-foreground">{landingPageAnalytics.stats.conversions}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Conversion Rate</p>
                <p className="text-2xl font-bold text-foreground">{landingPageAnalytics.stats.conversionRate}%</p>
              </div>
            </div>

            {/* UTM Source Breakdown */}
            {Object.keys(landingPageAnalytics.utmBreakdown || {}).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Traffic Sources</h4>
                <div className="space-y-2">
                  {Object.entries(landingPageAnalytics.utmBreakdown).map(([source, data]: [string, any]) => (
                    <div key={source} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="capitalize">{source}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {data.visits} visit{data.visits !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {data.conversions} conversion{data.conversions !== 1 ? 's' : ''}
                        </span>
                        <Badge className="bg-green-100 text-green-700">
                          {data.visits > 0 ? ((data.conversions / data.visits) * 100).toFixed(1) : 0}% CVR
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}