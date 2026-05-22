import { createClient } from './supabase/client';
import { projectId } from './supabase/info';
import { getServerHeaders } from './server-headers';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  return await getServerHeaders();
}

export interface Campaign {
  id?: string;
  organization_id?: string;
  name: string;
  type: 'email' | 'sms' | 'social' | 'multi';
  channel: string;
  status: 'draft' | 'active' | 'paused' | 'scheduled' | 'completed';
  audience_segment?: string;
  campaign_type?: 'one-time' | 'drip' | 'trigger' | 'recurring';
  subject_line?: string;
  preview_text?: string;
  content?: string;
  schedule_type?: string;
  scheduled_at?: string;
  audience_count?: number;
  sent_count?: number;
  opened_count?: number;
  clicked_count?: number;
  converted_count?: number;
  revenue?: number;
  metadata?: any;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ScoringRule {
  id?: string;
  organization_id?: string;
  action: string;
  category: 'engagement' | 'interest' | 'intent' | 'conversion' | 'decay' | 'negative';
  points: number;
  is_active?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LeadScore {
  id?: string;
  organization_id?: string;
  contact_id: string;
  score: number;
  status?: 'hot' | 'warm' | 'cold' | 'unscored';
  last_activity?: string;
  score_history?: any[];
  created_at?: string;
  updated_at?: string;
  contacts?: any;
}

export interface Journey {
  id?: string;
  organization_id?: string;
  name: string;
  status: 'draft' | 'active' | 'paused';
  trigger_type: string;
  trigger_config?: any;
  steps?: any[];
  enrolled_count?: number;
  completed_count?: number;
  avg_duration_days?: number;
  conversion_rate?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LandingPage {
  id?: string;
  organization_id?: string;
  name: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  template?: string;
  content?: any;
  seo_title?: string;
  seo_description?: string;
  views_count?: number;
  conversions_count?: number;
  conversion_rate?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// ============== CAMPAIGN FUNCTIONS (KV-backed via server) ==============

export async function getCampaigns(organizationId: string): Promise<Campaign[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/marketing/campaigns`, { headers });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      // Error fetching campaigns
      return [];
    }
    const data = await response.json();
    return data.campaigns || [];
  } catch (error) {
    // Error fetching campaigns
    return [];
  }
}

export async function createCampaign(campaign: Campaign, organizationId: string): Promise<Campaign> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/marketing/campaigns`, {
    method: 'POST',
    headers,
    body: JSON.stringify(campaign),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Failed to create campaign (${response.status})`);
  }
  const data = await response.json();
  return data.campaign;
}

export async function updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/marketing/campaigns/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Failed to update campaign (${response.status})`);
  }
  const data = await response.json();
  return data.campaign;
}

export async function deleteCampaign(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/marketing/campaigns/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Failed to delete campaign (${response.status})`);
  }
}

export async function duplicateCampaign(id: string, organizationId: string): Promise<Campaign> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/marketing/campaigns/${id}/duplicate`, {
    method: 'POST',
    headers,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Failed to duplicate campaign (${response.status})`);
  }
  const data = await response.json();
  return data.campaign;
}

// ============== LEAD SCORING FUNCTIONS (KV-backed via server) ==============

export async function getScoringRules(organizationId: string): Promise<ScoringRule[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/marketing/scoring-rules`, { headers });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      // Error fetching scoring rules
      return [];
    }
    const data = await response.json();
    return data.rules || [];
  } catch (error: any) {
    // Error fetching scoring rules
    return [];
  }
}

export async function createScoringRule(rule: ScoringRule, organizationId: string): Promise<ScoringRule> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/marketing/scoring-rules`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: rule.action,
      category: rule.category,
      points: rule.points,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Failed to create scoring rule (${response.status})`);
  }
  const data = await response.json();
  return data.rule;
}

export async function updateScoringRule(id: string, updates: Partial<ScoringRule>): Promise<ScoringRule> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/marketing/scoring-rules/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Failed to update scoring rule (${response.status})`);
  }
  const data = await response.json();
  return data.rule;
}

export async function deleteScoringRule(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/marketing/scoring-rules/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Failed to delete scoring rule (${response.status})`);
  }
}

export async function getLeadScores(organizationId: string): Promise<LeadScore[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/marketing/lead-scores`, {
      headers,
    });
    
    if (!response.ok) throw new Error('Failed to fetch lead scores');
    
    const data = await response.json();
    return data.scores || [];
  } catch (error) {
    // Error fetching lead scores
    return [];
  }
}

export async function updateLeadScore(contactId: string, organizationId: string, scoreChange: number, action: string): Promise<LeadScore> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/marketing/lead-scores`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      contact_id: contactId,
      score_change: scoreChange,
      action,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Failed to update lead score (${response.status})`);
  }
  const data = await response.json();
  return data.score;
}

// ============== JOURNEY FUNCTIONS (KV-backed via server) ==============

export async function getJourneys(organizationId: string): Promise<Journey[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/marketing/journeys`, {
      headers,
    });
    
    if (!response.ok) throw new Error('Failed to fetch journeys');
    
    const data = await response.json();
    return data.journeys || [];
  } catch (error) {
    // Error fetching journeys
    return [];
  }
}

export async function createJourney(journey: Journey, organizationId: string): Promise<Journey> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BASE_URL}/marketing/journeys`, {
    method: 'POST',
    headers,
    body: JSON.stringify(journey)
  });

  if (!response.ok) throw new Error('Failed to create journey');
  const data = await response.json();
  return data.journey;
}

export async function updateJourney(id: string, updates: Partial<Journey>): Promise<Journey> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BASE_URL}/marketing/journeys/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates)
  });

  if (!response.ok) throw new Error('Failed to update journey');
  const data = await response.json();
  return data.journey;
}

export async function deleteJourney(id: string): Promise<void> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BASE_URL}/marketing/journeys/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) throw new Error('Failed to delete journey');
}

// ============== LANDING PAGE FUNCTIONS (KV-backed via server) ==============

export async function getLandingPages(organizationId: string): Promise<LandingPage[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/marketing/landing-pages`, {
      headers,
    });
    
    if (!response.ok) throw new Error('Failed to fetch landing pages');
    
    const data = await response.json();
    return data.pages || [];
  } catch (error) {
    // Error fetching landing pages
    return [];
  }
}

export async function createLandingPage(page: LandingPage, organizationId: string): Promise<LandingPage> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BASE_URL}/marketing/landing-pages`, {
    method: 'POST',
    headers,
    body: JSON.stringify(page)
  });

  if (!response.ok) throw new Error('Failed to create landing page');
  const data = await response.json();
  return data.page;
}

export async function updateLandingPage(id: string, updates: Partial<LandingPage>): Promise<LandingPage> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BASE_URL}/marketing/landing-pages/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates)
  });

  if (!response.ok) throw new Error('Failed to update landing page');
  const data = await response.json();
  return data.page;
}

export async function deleteLandingPage(id: string): Promise<void> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${BASE_URL}/marketing/landing-pages/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) throw new Error('Failed to delete landing page');
}

// ============== ANALYTICS / EVENTS (KV-backed via server) ==============

export async function trackMarketingEvent(
  organizationId: string,
  eventType: string,
  properties: any
): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/marketing/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event_type: eventType,
        properties,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      // Error tracking marketing event
    }
  } catch (error) {
    // Error tracking marketing event
  }
}

// ============== DEAL ACTIVITY ==============

export interface DealActivity {
  id: string;
  organization_id: string;
  deal_id: string;
  deal_type: string;
  deal_title?: string;
  deal_number?: string;
  contact_name?: string;
  contact_email?: string;
  deal_total?: number;
  event_type: string;
  description: string;
  created_by?: string;
  created_at: string;
}

/**
 * Helper: refresh session and rebuild headers for 401 retry.
 */
async function refreshAndRetryHeaders(): Promise<Record<string, string> | null> {
  try {
    const supabase = createClient();
    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
    if (refreshed?.access_token) {
      return await getServerHeaders();
    }
  } catch (err) {
    // Session refresh failed
  }
  return null;
}

export async function getDealActivities(): Promise<DealActivity[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/marketing/deal-activities`, { headers });

    // 401 retry: refresh session and try once more
    if (response.status === 401) {
      // getDealActivities got 401 — refreshing session
      const retryHeaders = await refreshAndRetryHeaders();
      if (retryHeaders) {
        const retryResponse = await fetch(`${BASE_URL}/marketing/deal-activities`, { headers: retryHeaders });
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          return retryData.activities || [];
        }
      }
      return [];
    }

    if (!response.ok) {
      // Failed to fetch deal activities
      return [];
    }
    const data = await response.json();
    return data.activities || [];
  } catch (error) {
    // Error fetching deal activities
    return [];
  }
}

export async function recordDealActivity(activity: {
  deal_id: string;
  deal_type?: string;
  deal_title?: string;
  deal_number?: string;
  contact_name?: string;
  contact_email?: string;
  deal_total?: number;
  event_type: string;
  description: string;
}): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/marketing/deal-activities`, {
      method: 'POST',
      headers,
      body: JSON.stringify(activity),
    });

    // 401 retry: refresh session and try once more
    if (response.status === 401) {
      // recordDealActivity got 401 — refreshing session
      const retryHeaders = await refreshAndRetryHeaders();
      if (retryHeaders) {
        const retryResponse = await fetch(`${BASE_URL}/marketing/deal-activities`, {
          method: 'POST',
          headers: retryHeaders,
          body: JSON.stringify(activity),
        });
        if (!retryResponse.ok) {
          const err = await retryResponse.json().catch(() => ({}));
          // Error recording deal activity (retry)
        }
      }
      return;
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      // Error recording deal activity
    }
  } catch (error) {
    // Error recording deal activity
  }
}

export async function getCampaignStats(organizationId: string) {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/marketing/campaign-stats`, { headers });
    if (!response.ok) {
      // Error fetching campaign stats, using defaults
      return defaultCampaignStats();
    }
    return await response.json();
  } catch (error) {
    // Error fetching campaign stats
    return defaultCampaignStats();
  }
}

function defaultCampaignStats() {
  return {
    activeCampaigns: 0,
    totalSent: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalConverted: 0,
    totalRevenue: 0,
    openRate: '0',
    conversionRate: '0',
  };
}

export async function getLeadScoreStats(organizationId: string) {
  // Use lead scores from API
  const scores = await getLeadScores(organizationId);

  const totalLeads = scores?.length || 0;
  const hotLeads = scores?.filter(s => s.status === 'hot').length || 0;
  const warmLeads = scores?.filter(s => s.status === 'warm').length || 0;
  const coldLeads = scores?.filter(s => s.status === 'cold').length || 0;
  const unscored = scores?.filter(s => s.status === 'unscored').length || 0;

  return {
    totalLeads,
    hotLeads,
    warmLeads,
    coldLeads,
    unscored,
    segments: [
      { name: 'Hot Leads (80-100)', count: hotLeads, percentage: totalLeads > 0 ? Math.round((hotLeads / totalLeads) * 100) : 0 },
      { name: 'Warm Leads (50-79)', count: warmLeads, percentage: totalLeads > 0 ? Math.round((warmLeads / totalLeads) * 100) : 0 },
      { name: 'Cold Leads (1-49)', count: coldLeads, percentage: totalLeads > 0 ? Math.round((coldLeads / totalLeads) * 100) : 0 },
      { name: 'Unscored', count: unscored, percentage: totalLeads > 0 ? Math.round((unscored / totalLeads) * 100) : 0 }
    ]
  };
}