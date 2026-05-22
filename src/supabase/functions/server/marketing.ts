import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { extractUserToken } from './auth-helper.ts';

/**
 * Marketing routes – ALL KV-backed (v2).
 * Key patterns:
 *   campaign:{orgId}:{campaignId}
 *   scoring_rule:{orgId}:{ruleId}
 *   lead_score:{orgId}:{contactId}
 *   journey:{orgId}:{journeyId}
 *   landing_page:{orgId}:{pageId}
 *   marketing_event:{orgId}:{eventId}
 */
export function marketing(app: Hono) {

  // Helper: authenticate user and resolve their organization ID
  async function authenticateAndGetOrg(c: any): Promise<{ userId: string; orgId: string } | null> {
    const accessToken = extractUserToken(c);
    if (!accessToken) return null;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return null;

    // Try to resolve org from profiles
    let orgId: string | null = null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profile?.organization_id) {
      orgId = profile.organization_id;
    } else {
      // Fallback: organization_members table
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (membership?.organization_id) {
        orgId = membership.organization_id;
      } else {
        // Fallback: user metadata
        orgId = user.user_metadata?.organization_id || null;
      }
    }

    if (!orgId) return null;
    return { userId: user.id, orgId };
  }

  // ============== CAMPAIGNS (KV-backed) ==============

  // GET all campaigns for the user's org
  app.get('/make-server-8405be07/marketing/campaigns', async (c) => {
    console.log('GET /marketing/campaigns');
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const campaigns = await kv.getByPrefix(`campaign:${auth.orgId}:`);
      campaigns.sort((a: any, b: any) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      return c.json({ campaigns });
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      return c.json({ error: 'Failed to fetch campaigns', message: error.message }, 500);
    }
  });

  // POST create a new campaign
  app.post('/make-server-8405be07/marketing/campaigns', async (c) => {
    console.log('POST /marketing/campaigns');
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const id = body.id || crypto.randomUUID();
      const now = new Date().toISOString();

      const campaign = {
        ...body,
        id,
        organization_id: auth.orgId,
        created_by: auth.userId,
        created_at: body.created_at || now,
        updated_at: now,
      };

      await kv.set(`campaign:${auth.orgId}:${id}`, campaign);
      console.log(`Created campaign ${id} for org ${auth.orgId}`);

      return c.json({ campaign });
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      return c.json({ error: 'Failed to create campaign', message: error.message }, 500);
    }
  });

  // PUT update a campaign
  app.put('/make-server-8405be07/marketing/campaigns/:id', async (c) => {
    const id = c.req.param('id');
    console.log(`PUT /marketing/campaigns/${id}`);
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const existing = await kv.get(`campaign:${auth.orgId}:${id}`);
      if (!existing) return c.json({ error: 'Campaign not found' }, 404);

      const updates = await c.req.json();
      const campaign = {
        ...existing,
        ...updates,
        id,
        organization_id: auth.orgId,
        updated_at: new Date().toISOString(),
      };

      await kv.set(`campaign:${auth.orgId}:${id}`, campaign);
      console.log(`Updated campaign ${id}`);

      return c.json({ campaign });
    } catch (error: any) {
      console.error('Error updating campaign:', error);
      return c.json({ error: 'Failed to update campaign', message: error.message }, 500);
    }
  });

  // DELETE a campaign
  app.delete('/make-server-8405be07/marketing/campaigns/:id', async (c) => {
    const id = c.req.param('id');
    console.log(`DELETE /marketing/campaigns/${id}`);
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      await kv.del(`campaign:${auth.orgId}:${id}`);
      console.log(`Deleted campaign ${id}`);

      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      return c.json({ error: 'Failed to delete campaign', message: error.message }, 500);
    }
  });

  // POST duplicate a campaign
  app.post('/make-server-8405be07/marketing/campaigns/:id/duplicate', async (c) => {
    const id = c.req.param('id');
    console.log(`POST /marketing/campaigns/${id}/duplicate`);
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const existing = await kv.get(`campaign:${auth.orgId}:${id}`);
      if (!existing) return c.json({ error: 'Campaign not found' }, 404);

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();

      const { id: _oldId, created_at: _ca, updated_at: _ua, ...rest } = existing;
      const campaign = {
        ...rest,
        id: newId,
        name: `${existing.name} (Copy)`,
        status: 'draft',
        organization_id: auth.orgId,
        created_by: auth.userId,
        created_at: now,
        updated_at: now,
      };

      await kv.set(`campaign:${auth.orgId}:${newId}`, campaign);
      console.log(`Duplicated campaign ${id} → ${newId}`);

      return c.json({ campaign });
    } catch (error: any) {
      console.error('Error duplicating campaign:', error);
      return c.json({ error: 'Failed to duplicate campaign', message: error.message }, 500);
    }
  });

  // GET campaign stats (computed from KV campaigns)
  app.get('/make-server-8405be07/marketing/campaign-stats', async (c) => {
    console.log('GET /marketing/campaign-stats');
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const campaigns = await kv.getByPrefix(`campaign:${auth.orgId}:`);

      const activeCampaigns = campaigns.filter((c: any) => c.status === 'active').length;
      const totalSent = campaigns.reduce((s: number, c: any) => s + (c.sent_count || 0), 0);
      const totalOpened = campaigns.reduce((s: number, c: any) => s + (c.opened_count || 0), 0);
      const totalClicked = campaigns.reduce((s: number, c: any) => s + (c.clicked_count || 0), 0);
      const totalConverted = campaigns.reduce((s: number, c: any) => s + (c.converted_count || 0), 0);
      const totalRevenue = campaigns.reduce((s: number, c: any) => s + (c.revenue || 0), 0);
      const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0';
      const conversionRate = totalSent > 0 ? ((totalConverted / totalSent) * 100).toFixed(1) : '0';

      return c.json({
        activeCampaigns, totalSent, totalOpened, totalClicked,
        totalConverted, totalRevenue, openRate, conversionRate,
      });
    } catch (error: any) {
      console.error('Error computing campaign stats:', error);
      return c.json({ error: 'Failed to compute campaign stats', message: error.message }, 500);
    }
  });

  // ============== MARKETING EVENTS (KV-backed) ==============

  app.post('/make-server-8405be07/marketing/events', async (c) => {
    console.log('POST /marketing/events');
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const event = {
        id,
        organization_id: auth.orgId,
        event_type: body.event_type,
        properties: body.properties || {},
        campaign_id: body.campaign_id || null,
        created_at: now,
      };

      await kv.set(`marketing_event:${auth.orgId}:${id}`, event);
      return c.json({ event });
    } catch (error: any) {
      console.error('Error tracking marketing event:', error);
      return c.json({ error: 'Failed to track event', message: error.message }, 500);
    }
  });

  // ============== DEAL ACTIVITY (KV-backed) ==============

  // GET all deal activities for the user's org
  app.get('/make-server-8405be07/marketing/deal-activities', async (c) => {
    console.log('GET /marketing/deal-activities');
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const activities = await kv.getByPrefix(`deal_activity:${auth.orgId}:`);
      // Sort by created_at descending (most recent first)
      activities.sort((a: any, b: any) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      // Return most recent 100
      return c.json({ activities: activities.slice(0, 100) });
    } catch (error: any) {
      console.error('Error fetching deal activities:', error);
      return c.json({ error: 'Failed to fetch deal activities', message: error.message }, 500);
    }
  });

  // POST record a new deal activity (e.g., email_sent from frontend)
  app.post('/make-server-8405be07/marketing/deal-activities', async (c) => {
    console.log('POST /marketing/deal-activities');
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const activity = {
        id,
        organization_id: auth.orgId,
        deal_id: body.deal_id,
        deal_type: body.deal_type || 'quote',
        deal_title: body.deal_title || '',
        deal_number: body.deal_number || '',
        contact_name: body.contact_name || '',
        contact_email: body.contact_email || '',
        deal_total: body.deal_total || 0,
        event_type: body.event_type || 'deal_interaction',
        description: body.description || '',
        created_by: auth.userId,
        created_at: now,
      };

      await kv.set(`deal_activity:${auth.orgId}:${id}`, activity);
      console.log(`Recorded deal activity: ${activity.event_type} for deal ${body.deal_id}`);

      return c.json({ activity });
    } catch (error: any) {
      console.error('Error recording deal activity:', error);
      return c.json({ error: 'Failed to record deal activity', message: error.message }, 500);
    }
  });

  // ============== JOURNEYS ==============

  // GET all journeys for the user's org
  app.get('/make-server-8405be07/marketing/journeys', async (c) => {
    console.log('GET /marketing/journeys');
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const journeys = await kv.getByPrefix(`journey:${auth.orgId}:`);
      // Sort by created_at descending
      journeys.sort((a: any, b: any) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      return c.json({ journeys });
    } catch (error: any) {
      console.error('Error fetching journeys:', error);
      return c.json({ error: 'Failed to fetch journeys', message: error.message }, 500);
    }
  });

  // POST create a new journey
  app.post('/make-server-8405be07/marketing/journeys', async (c) => {
    console.log('POST /marketing/journeys');
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const id = body.id || crypto.randomUUID();
      const now = new Date().toISOString();

      const journey = {
        ...body,
        id,
        organization_id: auth.orgId,
        created_by: auth.userId,
        created_at: body.created_at || now,
        updated_at: now,
      };

      await kv.set(`journey:${auth.orgId}:${id}`, journey);
      console.log(`Created journey ${id} for org ${auth.orgId}`);

      return c.json({ journey });
    } catch (error: any) {
      console.error('Error creating journey:', error);
      return c.json({ error: 'Failed to create journey', message: error.message }, 500);
    }
  });

  // PUT update a journey
  app.put('/make-server-8405be07/marketing/journeys/:id', async (c) => {
    const id = c.req.param('id');
    console.log(`PUT /marketing/journeys/${id}`);
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const existing = await kv.get(`journey:${auth.orgId}:${id}`);
      if (!existing) return c.json({ error: 'Journey not found' }, 404);

      const updates = await c.req.json();
      const journey = {
        ...existing,
        ...updates,
        id,
        organization_id: auth.orgId,
        updated_at: new Date().toISOString(),
      };

      await kv.set(`journey:${auth.orgId}:${id}`, journey);
      console.log(`Updated journey ${id}`);

      return c.json({ journey });
    } catch (error: any) {
      console.error('Error updating journey:', error);
      return c.json({ error: 'Failed to update journey', message: error.message }, 500);
    }
  });

  // DELETE a journey
  app.delete('/make-server-8405be07/marketing/journeys/:id', async (c) => {
    const id = c.req.param('id');
    console.log(`DELETE /marketing/journeys/${id}`);
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      await kv.del(`journey:${auth.orgId}:${id}`);
      console.log(`Deleted journey ${id}`);

      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting journey:', error);
      return c.json({ error: 'Failed to delete journey', message: error.message }, 500);
    }
  });

  // ============== LANDING PAGES ==============

  // GET all landing pages
  app.get('/make-server-8405be07/marketing/landing-pages', async (c) => {
    console.log('GET /marketing/landing-pages');
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const pages = await kv.getByPrefix(`landing_page:${auth.orgId}:`);
      pages.sort((a: any, b: any) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      return c.json({ pages });
    } catch (error: any) {
      console.error('Error fetching landing pages:', error);
      return c.json({ error: 'Failed to fetch landing pages', message: error.message }, 500);
    }
  });

  // POST create a new landing page
  app.post('/make-server-8405be07/marketing/landing-pages', async (c) => {
    console.log('POST /marketing/landing-pages');
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const id = body.id || crypto.randomUUID();
      const now = new Date().toISOString();

      const page = {
        ...body,
        id,
        organization_id: auth.orgId,
        created_by: auth.userId,
        created_at: body.created_at || now,
        updated_at: now,
      };

      await kv.set(`landing_page:${auth.orgId}:${id}`, page);
      return c.json({ page });
    } catch (error: any) {
      console.error('Error creating landing page:', error);
      return c.json({ error: 'Failed to create landing page', message: error.message }, 500);
    }
  });

  // PUT update a landing page
  app.put('/make-server-8405be07/marketing/landing-pages/:id', async (c) => {
    const id = c.req.param('id');
    console.log(`PUT /marketing/landing-pages/${id}`);
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const existing = await kv.get(`landing_page:${auth.orgId}:${id}`);
      if (!existing) return c.json({ error: 'Landing page not found' }, 404);

      const updates = await c.req.json();
      const page = {
        ...existing,
        ...updates,
        id,
        organization_id: auth.orgId,
        updated_at: new Date().toISOString(),
      };

      await kv.set(`landing_page:${auth.orgId}:${id}`, page);
      return c.json({ page });
    } catch (error: any) {
      console.error('Error updating landing page:', error);
      return c.json({ error: 'Failed to update landing page', message: error.message }, 500);
    }
  });

  // DELETE a landing page
  app.delete('/make-server-8405be07/marketing/landing-pages/:id', async (c) => {
    const id = c.req.param('id');
    console.log(`DELETE /marketing/landing-pages/${id}`);
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      await kv.del(`landing_page:${auth.orgId}:${id}`);
      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting landing page:', error);
      return c.json({ error: 'Failed to delete landing page', message: error.message }, 500);
    }
  });

  // ============== LEAD SCORES ==============

  // ============== SCORING RULES (KV-backed) ==============

  // GET all scoring rules for the user's org
  app.get('/make-server-8405be07/marketing/scoring-rules', async (c) => {
    console.log('GET /marketing/scoring-rules');
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const rules = await kv.getByPrefix(`scoring_rule:${auth.orgId}:`);
      rules.sort((a: any, b: any) => {
        const catA = a.category || '';
        const catB = b.category || '';
        return catA.localeCompare(catB);
      });

      return c.json({ rules });
    } catch (error: any) {
      console.error('Error fetching scoring rules:', error);
      return c.json({ error: 'Failed to fetch scoring rules', message: error.message }, 500);
    }
  });

  // POST create a new scoring rule
  app.post('/make-server-8405be07/marketing/scoring-rules', async (c) => {
    console.log('POST /marketing/scoring-rules');
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const rule = {
        id,
        organization_id: auth.orgId,
        action: body.action,
        category: body.category,
        points: body.points ?? 0,
        is_active: body.is_active !== false,
        created_by: auth.userId,
        created_at: now,
        updated_at: now,
      };

      await kv.set(`scoring_rule:${auth.orgId}:${id}`, rule);
      console.log(`Created scoring rule ${id} for org ${auth.orgId}`);

      return c.json({ rule });
    } catch (error: any) {
      console.error('Error creating scoring rule:', error);
      return c.json({ error: 'Failed to create scoring rule', message: error.message }, 500);
    }
  });

  // PUT update a scoring rule
  app.put('/make-server-8405be07/marketing/scoring-rules/:id', async (c) => {
    const id = c.req.param('id');
    console.log(`PUT /marketing/scoring-rules/${id}`);
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const existing = await kv.get(`scoring_rule:${auth.orgId}:${id}`);
      if (!existing) return c.json({ error: 'Scoring rule not found' }, 404);

      const updates = await c.req.json();
      const rule = {
        ...existing,
        ...updates,
        id,
        organization_id: auth.orgId,
        updated_at: new Date().toISOString(),
      };

      await kv.set(`scoring_rule:${auth.orgId}:${id}`, rule);
      console.log(`Updated scoring rule ${id}`);

      return c.json({ rule });
    } catch (error: any) {
      console.error('Error updating scoring rule:', error);
      return c.json({ error: 'Failed to update scoring rule', message: error.message }, 500);
    }
  });

  // DELETE a scoring rule
  app.delete('/make-server-8405be07/marketing/scoring-rules/:id', async (c) => {
    const id = c.req.param('id');
    console.log(`DELETE /marketing/scoring-rules/${id}`);
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      await kv.del(`scoring_rule:${auth.orgId}:${id}`);
      console.log(`Deleted scoring rule ${id}`);

      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting scoring rule:', error);
      return c.json({ error: 'Failed to delete scoring rule', message: error.message }, 500);
    }
  });

  // GET all lead scores for the user's organization
  app.get('/make-server-8405be07/marketing/lead-scores', async (c) => {
    console.log('GET /marketing/lead-scores');
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      // Lead scores are stored in KV with key pattern lead_score:{orgId}:{contactId}
      const scores = await kv.getByPrefix(`lead_score:${auth.orgId}:`);
      // Sort by score descending
      scores.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

      return c.json({ scores });
    } catch (error: any) {
      console.error('Error fetching lead scores:', error);
      return c.json({ error: 'Failed to fetch lead scores', message: error.message }, 500);
    }
  });

  // POST update/create a lead score
  app.post('/make-server-8405be07/marketing/lead-scores', async (c) => {
    console.log('POST /marketing/lead-scores');
    try {
      const auth = await authenticateAndGetOrg(c);
      if (!auth) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const { contact_id, score_change, action } = body;
      if (!contact_id) return c.json({ error: 'contact_id is required' }, 400);

      const kvKey = `lead_score:${auth.orgId}:${contact_id}`;
      const existing: any = await kv.get(kvKey);

      const currentScore = existing?.score || 0;
      const newScore = currentScore + (score_change || 0);

      let status: string = 'unscored';
      if (newScore >= 80) status = 'hot';
      else if (newScore >= 50) status = 'warm';
      else if (newScore > 0) status = 'cold';

      const scoreHistory = existing?.score_history || [];
      scoreHistory.push({
        action: action || 'manual',
        change: score_change || 0,
        timestamp: new Date().toISOString(),
      });

      const now = new Date().toISOString();
      const leadScore = {
        id: existing?.id || crypto.randomUUID(),
        organization_id: auth.orgId,
        contact_id,
        score: newScore,
        status,
        last_activity: now,
        score_history: scoreHistory,
        created_at: existing?.created_at || now,
        updated_at: now,
      };

      await kv.set(kvKey, leadScore);
      console.log(`Updated lead score for contact ${contact_id}: ${currentScore} → ${newScore}`);

      return c.json({ score: leadScore });
    } catch (error: any) {
      console.error('Error updating lead score:', error);
      return c.json({ error: 'Failed to update lead score', message: error.message }, 500);
    }
  });

  // ============== DUPLICATE INVENTORY CLEANUP ==============

  // POST: Server-side batch deduplication of inventory SKUs
  app.post('/make-server-8405be07/marketing/inventory-deduplicate', async (c) => {
    console.log('POST /marketing/inventory-deduplicate');
    try {
      const accessToken = extractUserToken(c);
      if (!accessToken) return c.json({ error: 'No auth token' }, 401);

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const { organizationId, batchSize = 200 } = body;
      if (!organizationId) return c.json({ error: 'organizationId is required' }, 400);

      console.log(`Deduplicating inventory for org ${organizationId}`);

      // Use SQL RPC to find duplicates efficiently
      // Fetch all ids and skus, group in-memory
      let allItems: { id: string; sku: string; created_at: string }[] = [];
      let offset = 0;
      const pageSize = 5000;

      while (true) {
        const { data, error } = await supabase
          .from('inventory')
          .select('id, sku, created_at')
          .eq('organization_id', organizationId)
          .not('sku', 'is', null)
          .order('created_at', { ascending: true })
          .range(offset, offset + pageSize - 1);

        if (error) {
          console.error('Error fetching inventory for dedup:', error);
          return c.json({ error: 'Failed to fetch inventory', message: error.message }, 500);
        }

        if (!data || data.length === 0) break;
        allItems = allItems.concat(data);
        if (data.length < pageSize) break;
        offset += pageSize;
      }

      // Group by SKU, keep oldest (first in created_at ASC order), mark rest for deletion
      const skuGroups = new Map<string, string[]>();
      for (const item of allItems) {
        if (!item.sku) continue;
        if (!skuGroups.has(item.sku)) {
          skuGroups.set(item.sku, []);
        }
        skuGroups.get(item.sku)!.push(item.id);
      }

      const idsToDelete: string[] = [];
      let duplicateSkuCount = 0;
      for (const [_sku, ids] of skuGroups) {
        if (ids.length > 1) {
          duplicateSkuCount++;
          // Keep the first (oldest), delete the rest
          idsToDelete.push(...ids.slice(1));
        }
      }

      if (idsToDelete.length === 0) {
        return c.json({ success: true, duplicateSkus: 0, deleted: 0, message: 'No duplicates found' });
      }

      console.log(`Found ${duplicateSkuCount} duplicate SKUs, ${idsToDelete.length} records to delete`);

      // Batch delete
      let deletedCount = 0;
      let errorCount = 0;
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const { error: deleteError } = await supabase
          .from('inventory')
          .delete()
          .in('id', batch)
          .eq('organization_id', organizationId);

        if (deleteError) {
          console.error(`Batch delete error at offset ${i}:`, deleteError.message);
          errorCount += batch.length;
        } else {
          deletedCount += batch.length;
        }
      }

      console.log(`Dedup complete: ${deletedCount} deleted, ${errorCount} errors`);

      return c.json({
        success: true,
        duplicateSkus: duplicateSkuCount,
        deleted: deletedCount,
        errors: errorCount,
        totalScanned: allItems.length,
      });
    } catch (error: any) {
      console.error('Error in inventory-deduplicate:', error);
      return c.json({ error: 'Internal server error', message: error.message }, 500);
    }
  });
}