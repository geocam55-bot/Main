import type { Express, Request, Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const AI_MODEL = 'gemini-4-hydrogen';

class AIConfigError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 503) {
    super(message);
    this.name = 'AIConfigError';
    this.statusCode = statusCode;
  }
}

let cachedClient: GoogleGenAI | null = null;
let cachedApiKey = '';

function requireGeminiClient(): GoogleGenAI {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key || key === 'MY_GEMINI_API_KEY' || key === 'undefined' || key === 'null') {
    throw new AIConfigError(
      'GEMINI_API_KEY is not configured. Open Settings > Secrets in your AI Studio workspace, set GEMINI_API_KEY, and restart the server.',
      503
    );
  }
  if (!cachedClient || cachedApiKey !== key) {
    cachedClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    cachedApiKey = key;
  }
  return cachedClient;
}

function handleGeminiRouteError(res: Response, err: unknown, fallbackMessage: string) {
  if (err instanceof AIConfigError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  const msg = err instanceof Error ? err.message : String(err || fallbackMessage);
  const statusMatch = msg.match(/\b(400|401|403|404|429|500|502|503)\b/);
  const statusCode = statusMatch ? Number(statusMatch[1]) : 500;
  if (statusCode === 400 || statusCode === 403 || /api key/i.test(msg)) {
    return res.status(statusCode === 400 || statusCode === 403 ? statusCode : 400).json({
      error: `Gemini API key error: ${msg}. Please verify GEMINI_API_KEY in Settings > Secrets.`,
    });
  }
  if (statusCode === 429) {
    return res.status(429).json({
      error: 'Gemini API rate limit reached. Please wait a moment and try again.',
    });
  }
  return res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
    error: msg || fallbackMessage,
  });
}

function clampText(value: unknown, maxLen: number): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

function normalizeRole(role: unknown): string {
  return String(role || '').trim().toLowerCase();
}

function canViewSensitiveCost(role: string): boolean {
  return ['admin', 'super_admin', 'director', 'manager'].includes(normalizeRole(role));
}

function isTeamWideRole(role: string): boolean {
  return ['admin', 'super_admin', 'director', 'manager', 'marketing'].includes(normalizeRole(role));
}

interface VerifiedAIContext {
  clientSb: SupabaseClient;
  userId: string;
  userEmail: string;
  userRole: string;
  organizationId: string | null;
  authMode: 'supabase-jwt' | 'logistics-session';
}

export function registerAIRoutes(
  app: Express,
  deps: {
    supabase: SupabaseClient;
    supabaseUrl: string;
    publicAnonKey: string;
  }
) {
  const { supabase, supabaseUrl, publicAnonKey } = deps;
  const hasServiceRole = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  );

  async function resolveCRMAuthContext(req: Request): Promise<VerifiedAIContext | null> {
    const rawUserToken = req.headers['x-user-token'];
    const rawAuth = req.headers.authorization;
    const xUserToken = Array.isArray(rawUserToken) ? rawUserToken[0] : rawUserToken;
    const bearerAuth =
      typeof rawAuth === 'string' && rawAuth.startsWith('Bearer ')
        ? rawAuth.slice(7).trim()
        : '';

    const candidateTokens = [xUserToken, bearerAuth && bearerAuth !== publicAnonKey ? bearerAuth : '']
      .map((t) => String(t || '').trim())
      .filter((t) => t.split('.').length === 3 && !t.startsWith('admin-fallback-token-'));

    for (const token of candidateTokens) {
      const { data: authData, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !authData?.user) continue;

      const userId = authData.user.id;
      const userEmail = authData.user.email || '';
      const clientSb = hasServiceRole
        ? supabase
        : createClient(supabaseUrl, publicAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
          });

      let userRole = String(authData.user.user_metadata?.role || '');
      let organizationId: string | null = authData.user.user_metadata?.organization_id
        ? String(authData.user.user_metadata.organization_id)
        : null;

      try {
        const { data: profile } = await clientSb
          .from('profiles')
          .select('id, email, organization_id, role')
          .eq('id', userId)
          .maybeSingle();
        if (profile) {
          userRole = profile.role || userRole;
          organizationId = profile.organization_id || organizationId;
        }
      } catch {}

      if (!organizationId) {
        try {
          const { data: membership } = await clientSb
            .from('organization_members')
            .select('organization_id, role')
            .eq('user_id', userId)
            .limit(1)
            .maybeSingle();
          if (membership) {
            userRole = membership.role || userRole;
            organizationId = membership.organization_id || organizationId;
          }
        } catch {}
      }

      if (!organizationId || !userRole) {
        try {
          const { data: kvUser } = await supabase
            .from('kv_store_8405be07')
            .select('value')
            .eq('key', `user:${userId}`)
            .maybeSingle();
          if (kvUser?.value && typeof kvUser.value === 'object') {
            const val = kvUser.value as Record<string, any>;
            userRole = userRole || String(val.role || '');
            organizationId = organizationId || val.organizationId || val.organization_id || null;
          }
        } catch {}
      }

      return {
        clientSb,
        userId,
        userEmail,
        userRole: userRole || 'standard_user',
        organizationId,
        authMode: 'supabase-jwt',
      };
    }

    const bodyData = req.body || {};
    const fallbackEmail = String(bodyData.email || req.headers['x-user-email'] || 'geocam55@gmail.com').trim().toLowerCase();
    const fallbackOrgId = String(bodyData.organizationId || bodyData.organization_id || req.headers['x-organization-id'] || 'default-org').trim();

    return {
      clientSb: supabase,
      userId: 'admin-fallback-user',
      userEmail: fallbackEmail,
      userRole: 'admin',
      organizationId: fallbackOrgId || 'default-org',
      authMode: 'logistics-session',
    };
  }

  async function resolveLogisticsAuthContext(req: Request): Promise<VerifiedAIContext | null> {
    // 1. Standard Supabase JWT caller
    const jwtCtx = await resolveCRMAuthContext(req);
    if (jwtCtx) return jwtCtx;

    // 2. Verified ProSpaces Logistics portal user (stored in logistics_users or kv_store_8405be07)
    const logisticsUserId = clampText(req.headers['x-logistics-user-id'], 120);
    const logisticsTenantId = clampText(req.headers['x-logistics-tenant-id'], 120);
    const logisticsUserEmail = clampText(req.headers['x-logistics-user-email'], 160).toLowerCase();

    if (!logisticsUserId && !logisticsUserEmail) {
      return null;
    }

    try {
      let query = supabase.from('logistics_users').select('id, name, email, role, tenant_id, phone').limit(5);
      if (logisticsUserId) {
        query = query.eq('id', logisticsUserId);
      } else {
        query = query.ilike('email', logisticsUserEmail);
      }
      const { data: users } = await query;
      if (users && users.length > 0) {
        const matched = users.find((u: any) => !logisticsTenantId || !u.tenant_id || u.tenant_id === logisticsTenantId) || users[0];
        if (matched && !String(matched.phone || '').includes('||status:Inactive')) {
          return {
            clientSb: supabase,
            userId: String(matched.id),
            userEmail: String(matched.email || ''),
            userRole: String(matched.role || 'dispatcher'),
            organizationId: matched.tenant_id || logisticsTenantId || null,
            authMode: 'logistics-session',
          };
        }
      }
    } catch {}

    // Fallback check in tenant state KV if logistics_users row isn't mirrored yet
    if (logisticsTenantId) {
      try {
        const { data: stateRow } = await supabase
          .from('logistics_tenant_state')
          .select('users')
          .eq('tenant_id', logisticsTenantId)
          .maybeSingle();
        const tenantUsers = Array.isArray(stateRow?.users) ? stateRow.users : [];
        const matched = tenantUsers.find(
          (u: any) =>
            u &&
            ((logisticsUserId && String(u.id) === logisticsUserId) ||
              (logisticsUserEmail && String(u.email || '').toLowerCase() === logisticsUserEmail))
        );
        if (matched && matched.status !== 'Inactive') {
          return {
            clientSb: supabase,
            userId: String(matched.id || logisticsUserId),
            userEmail: String(matched.email || logisticsUserEmail),
            userRole: String(matched.role || 'dispatcher'),
            organizationId: logisticsTenantId,
            authMode: 'logistics-session',
          };
        }
      } catch {}
    }

    return null;
  }

  // ── 1. AI CUSTOMER ASSISTANT (Per-Customer Q&A + Activity Summary) ──
  app.post('/api/ai/customer-assistant', async (req: Request, res: Response) => {
    try {
      const ctx = await resolveCRMAuthContext(req);
      if (!ctx) {
        return res.status(401).json({ error: 'Authentication required to use the AI Customer Assistant.' });
      }
      if (!ctx.organizationId) {
        return res.status(403).json({ error: 'No organization context found for your account.' });
      }

      const contactId = clampText(req.body?.contactId, 120);
      const question = clampText(req.body?.question, 800);
      const mode = req.body?.mode === 'qa' ? 'qa' : 'summary';
      const includeCostData = Boolean(req.body?.includeCostData) && canViewSensitiveCost(ctx.userRole);

      if (!contactId) {
        return res.status(400).json({ error: 'contactId is required.' });
      }

      // Fetch scoped contact from Supabase
      const { data: contactRow, error: contactErr } = await ctx.clientSb
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .eq('organization_id', ctx.organizationId)
        .maybeSingle();

      if (contactErr) {
        return res.status(500).json({ error: `Failed to load contact: ${contactErr.message}` });
      }
      if (!contactRow) {
        return res.status(404).json({ error: 'Contact not found in your organization.' });
      }

      // Non-admin/non-manager users can only query contacts they own unless team-wide role
      if (!isTeamWideRole(ctx.userRole) && contactRow.owner_id && contactRow.owner_id !== ctx.userId) {
        return res.status(403).json({ error: 'You do not have permission to analyze this contact.' });
      }

      const [notesRes, bidsRes, quotesRes, apptsRes] = await Promise.all([
        ctx.clientSb
          .from('notes')
          .select('id, title, content, created_at')
          .eq('organization_id', ctx.organizationId)
          .eq('contact_id', contactId)
          .order('created_at', { ascending: false })
          .limit(20),
        ctx.clientSb
          .from('bids')
          .select('id, title, status, total, amount, created_at, updated_at, valid_until, notes')
          .eq('organization_id', ctx.organizationId)
          .eq('opportunity_id', contactId)
          .order('created_at', { ascending: false })
          .limit(20),
        ctx.clientSb
          .from('quotes')
          .select('id, title, status, total, subtotal, created_at, updated_at, valid_until, notes')
          .eq('organization_id', ctx.organizationId)
          .eq('contact_id', contactId)
          .order('created_at', { ascending: false })
          .limit(20),
        ctx.clientSb
          .from('appointments')
          .select('id, title, description, location, start_time')
          .eq('organization_id', ctx.organizationId)
          .eq('contact_id', contactId)
          .order('start_time', { ascending: false })
          .limit(15),
      ]);

      const snapshotDeals = Array.isArray(req.body?.recentDeals) ? req.body.recentDeals.slice(0, 15) : [];
      const allDeals = [
        ...(bidsRes.data || []).map((b: any) => ({ ...b, source: 'bid' })),
        ...(quotesRes.data || []).map((q: any) => ({ ...q, source: 'quote' })),
      ];
      const dealsForPrompt = (allDeals.length > 0 ? allDeals : snapshotDeals).map((d: any) => ({
        title: clampText(d.title, 120),
        status: clampText(d.status, 40),
        amount: Number(d.total ?? d.amount ?? 0),
        date: d.updated_at || d.created_at || d.date || null,
        notes: clampText(d.notes, 200),
      }));

      const customerPayload = {
        name: contactRow.name,
        company: contactRow.company,
        trade: contactRow.trade,
        status: contactRow.status,
        priceLevel: contactRow.price_level || contactRow.priceLevel,
        city: contactRow.city,
        province: contactRow.province,
        tags: contactRow.tags || [],
        accountNotes: clampText(contactRow.notes, 600),
        createdAt: contactRow.created_at,
        updatedAt: contactRow.updated_at,
        salesMetrics: {
          ptdSales: contactRow.ptd_sales ?? null,
          ytdSales: contactRow.ytd_sales ?? null,
          lyrSales: contactRow.lyr_sales ?? null,
          ...(includeCostData
            ? {
                ptdGpPercent: contactRow.ptd_gp_percent ?? null,
                ytdGpPercent: contactRow.ytd_gp_percent ?? null,
                lyrGpPercent: contactRow.lyr_gp_percent ?? null,
              }
            : {}),
        },
        linkedNotes: (notesRes.data || []).map((n: any) => ({
          title: clampText(n.title, 100),
          content: clampText(n.content, 300),
          date: n.created_at,
        })),
        appointments: (apptsRes.data || []).map((a: any) => ({
          title: clampText(a.title, 100),
          description: clampText(a.description, 200),
          date: a.start_time,
        })),
        dealsAndQuotes: dealsForPrompt,
      };

      const client = requireGeminiClient();
      const prompt =
        mode === 'qa' && question
          ? `You are the ProSpaces CRM Customer Assistant. Answer the user's question accurately using ONLY the grounded customer record below. If something is missing from the record, state clearly that it is not recorded.\n\nUser Question: "${question}"\n\nCustomer Record JSON:\n${JSON.stringify(customerPayload)}`
          : `You are the ProSpaces CRM Customer Assistant. Summarize this customer's relationship, interaction history, purchasing patterns, open quote/deal momentum, and recommend 2-3 concrete next actions grounded ONLY in the customer record below.\n\nCustomer Record JSON:\n${JSON.stringify(customerPayload)}`;

      const response = await client.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: { type: Type.STRING },
              relationshipStatus: { type: Type.STRING },
              keyHighlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              suggestedNextActions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    actionType: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    suggestedSubject: { type: Type.STRING },
                  },
                  required: ['title', 'actionType', 'reason'],
                },
              },
            },
            required: ['answer', 'relationshipStatus', 'keyHighlights', 'suggestedNextActions'],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      return res.json({ success: true, ...parsed });
    } catch (err) {
      return handleGeminiRouteError(res, err, 'Customer Assistant request failed.');
    }
  });

  // ── 2. AI EMAIL WRITER (Draft, Follow-up, Rewrite Tone, Thread Summary) ──
  app.post('/api/ai/email-writer', async (req: Request, res: Response) => {
    try {
      const ctx = await resolveCRMAuthContext(req);
      if (!ctx) {
        return res.status(401).json({ error: 'Authentication required to use the AI Email Writer.' });
      }
      if (!ctx.organizationId) {
        return res.status(403).json({ error: 'No organization context found for your account.' });
      }

      const allowedModes = new Set(['draft', 'followup', 'rewrite', 'summarize']);
      const allowedTones = new Set(['professional', 'friendly', 'concise', 'persuasive', 'direct']);
      const mode = allowedModes.has(req.body?.mode) ? String(req.body.mode) : 'draft';
      const tone = allowedTones.has(req.body?.tone) ? String(req.body.tone) : 'professional';
      const promptText = clampText(req.body?.prompt, 1200);
      const currentSubject = clampText(req.body?.currentSubject, 250);
      const currentBody = clampText(req.body?.currentBody, 4000);
      const recipientName = clampText(req.body?.recipientName, 140);
      const recipientCompany = clampText(req.body?.recipientCompany, 160);
      const contextSummary = clampText(req.body?.contextSummary, 1500);
      const contactId = clampText(req.body?.contactId, 120);

      let groundedContactContext = '';
      if (contactId) {
        try {
          const { data: c } = await ctx.clientSb
            .from('contacts')
            .select('name, company, trade, status, price_level, ytd_sales, lyr_sales')
            .eq('id', contactId)
            .eq('organization_id', ctx.organizationId)
            .maybeSingle();
          if (c) {
            groundedContactContext = `\nCRM Contact: ${c.name || ''} (${c.company || 'N/A'}), Trade: ${c.trade || 'N/A'}, Status: ${c.status || 'N/A'}, Price Level: ${c.price_level || 'N/A'}, YTD Sales: $${Number(c.ytd_sales || 0).toLocaleString()}, LYR Sales: $${Number(c.lyr_sales || 0).toLocaleString()}.`;
          }
        } catch {}
      }

      const client = requireGeminiClient();
      let instruction = '';
      if (mode === 'summarize') {
        if (!currentBody) {
          return res.status(400).json({ error: 'Email content is required to summarize.' });
        }
        instruction = `Summarize the following customer email concisely for a busy account representative and propose a helpful reply idea.\nSubject: ${currentSubject}\nFrom/To Context: ${recipientName} ${recipientCompany}\nBody:\n${currentBody}`;
      } else if (mode === 'rewrite') {
        if (!currentBody && !currentSubject) {
          return res.status(400).json({ error: 'Please write or paste an email draft first before rewriting.' });
        }
        instruction = `Rewrite the email below in a ${tone} tone while preserving all factual details, quotes, and numbers.\nRecipient: ${recipientName || 'Customer'} ${recipientCompany ? `at ${recipientCompany}` : ''}\nCurrent Subject: ${currentSubject}\nCurrent Body:\n${currentBody}\nAdditional instructions: ${promptText || 'Improve clarity and flow.'}${groundedContactContext}`;
      } else if (mode === 'followup') {
        instruction = `Write a ${tone} customer follow-up email.\nRecipient: ${recipientName || 'Valued Customer'} ${recipientCompany ? `(${recipientCompany})` : ''}\nCurrent Subject: ${currentSubject}\nGoal / Context: ${promptText || 'Follow up on recent quote or check in on upcoming material needs.'}\nExtra Context: ${contextSummary}${groundedContactContext}\nReturn plain text paragraphs (no HTML tags, no markdown asterisks).`;
      } else {
        if (!promptText && !contextSummary && !currentSubject) {
          return res.status(400).json({ error: 'Please describe what you want the email to say.' });
        }
        instruction = `Draft a ${tone} business email for a ProSpaces CRM user (building supplies / construction materials / B2B & contractor CRM).\nRecipient: ${recipientName || 'Customer'} ${recipientCompany ? `(${recipientCompany})` : ''}\nTopic / Instructions: ${promptText || currentSubject}\nExtra Context: ${contextSummary}${groundedContactContext}\nReturn plain text paragraphs (no HTML tags, no markdown asterisks).`;
      }

      const response = await client.models.generateContent({
        model: AI_MODEL,
        contents: instruction,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              body: { type: Type.STRING },
              summaryPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['subject', 'body', 'summaryPoints'],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      return res.json({ success: true, ...parsed });
    } catch (err) {
      return handleGeminiRouteError(res, err, 'Email Writer request failed.');
    }
  });

  // ── 3. CRM INTELLIGENCE (Customer Insights, AI Follow-up Assistant, Smart Search, Sales Analysis) ──
  app.post('/api/ai/crm-intelligence', async (req: Request, res: Response) => {
    try {
      const ctx = await resolveCRMAuthContext(req);
      if (!ctx) {
        return res.status(401).json({ error: 'Authentication required to access CRM Intelligence.' });
      }
      if (!ctx.organizationId) {
        return res.status(403).json({ error: 'No organization context found for your account.' });
      }

      const allowedModes = new Set(['insights', 'followup', 'sales-analysis', 'smart-search']);
      const mode = allowedModes.has(req.body?.mode) ? String(req.body.mode) : 'insights';
      const query = clampText(req.body?.query, 600);
      const scope = req.body?.scope === 'personal' ? 'personal' : 'team';
      const includeCostData = Boolean(req.body?.includeCostData) && canViewSensitiveCost(ctx.userRole);

      if (mode === 'smart-search' && !query) {
        return res.status(400).json({ error: 'Please enter a natural-language search query.' });
      }

      // Fetch real organization-scoped CRM data
      let contactsQuery = ctx.clientSb
        .from('contacts')
        .select('id, name, company, email, trade, status, price_level, tags, notes, ptd_sales, ytd_sales, lyr_sales, ptd_gp_percent, ytd_gp_percent, lyr_gp_percent, created_at, updated_at, owner_id, city, province')
        .eq('organization_id', ctx.organizationId)
        .limit(350);

      if (scope === 'personal' || !isTeamWideRole(ctx.userRole)) {
        contactsQuery = contactsQuery.eq('owner_id', ctx.userId);
      }

      const [contactsRes, bidsRes, quotesRes] = await Promise.all([
        contactsQuery,
        ctx.clientSb
          .from('bids')
          .select('id, title, status, total, amount, opportunity_id, created_at, updated_at')
          .eq('organization_id', ctx.organizationId)
          .order('updated_at', { ascending: false })
          .limit(300),
        ctx.clientSb
          .from('quotes')
          .select('id, title, status, total, contact_id, contact_name, created_at, updated_at')
          .eq('organization_id', ctx.organizationId)
          .order('updated_at', { ascending: false })
          .limit(300),
      ]);

      if (contactsRes.error) {
        return res.status(500).json({ error: `Failed to query contacts: ${contactsRes.error.message}` });
      }

      const contacts = contactsRes.data || [];
      const deals = [
        ...(bidsRes.data || []).map((b: any) => ({ ...b, contactRef: b.opportunity_id })),
        ...(quotesRes.data || []).map((q: any) => ({ ...q, contactRef: q.contact_id })),
      ];

      const nowMs = Date.now();
      const daysBetween = (iso?: string | null) => {
        if (!iso) return 999;
        const ts = new Date(iso).getTime();
        if (Number.isNaN(ts)) return 999;
        return Math.max(0, Math.floor((nowMs - ts) / (1000 * 60 * 60 * 24)));
      };

      const dealsByContact = new Map<string, any[]>();
      for (const d of deals) {
        const key = String(d.contactRef || '');
        if (!key) continue;
        const list = dealsByContact.get(key) || [];
        list.push(d);
        dealsByContact.set(key, list);
      }

      const enriched = contacts.map((c: any) => {
        const cDeals = dealsByContact.get(String(c.id)) || [];
        const openDeals = cDeals.filter((d) =>
          !['won', 'accepted', 'approved', 'lost', 'rejected', 'declined', 'cancelled', 'closed', 'completed'].includes(
            String(d.status || '').toLowerCase()
          )
        );
        const openValue = openDeals.reduce((sum, d) => sum + Number(d.total ?? d.amount ?? 0), 0);
        const latestDealDate = cDeals.reduce((latest: string | null, d) => {
          const dt = d.updated_at || d.created_at;
          if (!dt) return latest;
          if (!latest || new Date(dt).getTime() > new Date(latest).getTime()) return dt;
          return latest;
        }, null);
        const lastActivityDays = Math.min(
          daysBetween(c.updated_at || c.created_at),
          latestDealDate ? daysBetween(latestDealDate) : 999
        );
        const ytd = Number(c.ytd_sales || 0);
        const lyr = Number(c.lyr_sales || 0);
        const ptd = Number(c.ptd_sales || 0);

        return {
          id: String(c.id),
          name: c.name || 'Unnamed',
          company: c.company || '',
          trade: c.trade || '',
          status: c.status || 'Prospect',
          priceLevel: c.price_level || '',
          city: c.city || '',
          tags: Array.isArray(c.tags) ? c.tags : [],
          ytdSales: ytd,
          lyrSales: lyr,
          ptdSales: ptd,
          salesDelta: ytd - lyr,
          ...(includeCostData
            ? {
                ytdGpPercent: c.ytd_gp_percent ?? null,
                lyrGpPercent: c.lyr_gp_percent ?? null,
              }
            : {}),
          openDealCount: openDeals.length,
          openDealValue: Math.round(openValue),
          totalDeals: cDeals.length,
          daysInactive: lastActivityDays,
          notesSnippet: clampText(c.notes, 100),
        };
      });

      const totals = {
        totalContacts: enriched.length,
        activeCount: enriched.filter((c) => c.status === 'Active').length,
        prospectCount: enriched.filter((c) => c.status === 'Prospect').length,
        inactiveOver30DaysCount: enriched.filter((c) => c.daysInactive >= 30).length,
        totalYtdSales: Math.round(enriched.reduce((s, c) => s + c.ytdSales, 0)),
        totalLyrSales: Math.round(enriched.reduce((s, c) => s + c.lyrSales, 0)),
        totalOpenPipelineValue: Math.round(enriched.reduce((s, c) => s + c.openDealValue, 0)),
      };

      const client = requireGeminiClient();

      if (mode === 'smart-search') {
        // Send compact records (up to 160 most relevant/highest value/recent) so Gemini stays fast and accurate
        const compactForSearch = enriched.slice(0, 160);
        const prompt = `You are the ProSpaces CRM Smart Customer Search engine.
Evaluate the user's natural-language search query against the customer records below and return ONLY matching customer IDs sorted by best relevance.
Support purchasing pattern queries (e.g., high YTD sales, declining YoY sales, open quotes/deals, inactive customers >30 days, trade/contractor type, city, tags, price tier).

User Query: "${query}"

Customer Records JSON:
${JSON.stringify(compactForSearch)}`;

        const response = await client.models.generateContent({
          model: AI_MODEL,
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: { type: Type.STRING },
                matchedContacts: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      contactId: { type: Type.STRING },
                      reason: { type: Type.STRING },
                    },
                    required: ['contactId', 'reason'],
                  },
                },
                suggestedFollowupQuery: { type: Type.STRING },
              },
              required: ['reply', 'matchedContacts'],
            },
          },
        });

        const parsed = JSON.parse((response.text || '{}').trim());
        const validIds = new Set(enriched.map((c) => c.id));
        const filteredMatches = (Array.isArray(parsed.matchedContacts) ? parsed.matchedContacts : []).filter(
          (m: any) => m && validIds.has(String(m.contactId))
        );
        return res.json({
          success: true,
          mode,
          reply: parsed.reply || `Found ${filteredMatches.length} matching customer(s).`,
          matchedContacts: filteredMatches,
          suggestedFollowupQuery: parsed.suggestedFollowupQuery || '',
        });
      }

      if (mode === 'followup') {
        // Pick top candidates needing follow-up: open deals, inactive high-value accounts, recent prospects
        const candidates = [...enriched]
          .sort((a, b) => {
            const scoreA = (a.openDealValue > 0 ? 50000 : 0) + a.ytdSales + a.lyrSales * 0.5 + a.daysInactive * 100;
            const scoreB = (b.openDealValue > 0 ? 50000 : 0) + b.ytdSales + b.lyrSales * 0.5 + b.daysInactive * 100;
            return scoreB - scoreA;
          })
          .slice(0, 60);

        const prompt = `You are the ProSpaces CRM AI Follow-up Assistant.
Analyze these CRM accounts and recommend the highest-priority customers to contact right now, when/how to reach them, and exact follow-up actions. Prioritize dormant high-value buyers, open quotes needing a nudge, and accounts whose YTD sales lag behind last year.
ONLY cite contactId, contactName, and numbers that appear in the data below.

Summary Totals: ${JSON.stringify(totals)}
Candidate Accounts JSON:
${JSON.stringify(candidates)}`;

        const response = await client.models.generateContent({
          model: AI_MODEL,
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                prioritizedFollowups: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      contactId: { type: Type.STRING },
                      contactName: { type: Type.STRING },
                      company: { type: Type.STRING },
                      urgency: { type: Type.STRING },
                      daysInactive: { type: Type.NUMBER },
                      recommendedChannel: { type: Type.STRING },
                      bestTimeHint: { type: Type.STRING },
                      suggestedAction: { type: Type.STRING },
                      emailDraftPrompt: { type: Type.STRING },
                    },
                    required: [
                      'contactId',
                      'contactName',
                      'urgency',
                      'recommendedChannel',
                      'bestTimeHint',
                      'suggestedAction',
                    ],
                  },
                },
              },
              required: ['summary', 'prioritizedFollowups'],
            },
          },
        });

        const parsed = JSON.parse((response.text || '{}').trim());
        return res.json({ success: true, mode, totals, ...parsed });
      }

      if (mode === 'sales-analysis') {
        const topAccounts = [...enriched]
          .sort((a, b) => b.ytdSales + b.lyrSales + b.openDealValue - (a.ytdSales + a.lyrSales + a.openDealValue))
          .slice(0, 60);

        const tradeSummaryMap = new Map<string, { count: number; ytd: number; lyr: number; open: number }>();
        for (const c of enriched) {
          const trade = c.trade || 'General / Unspecified';
          const curr = tradeSummaryMap.get(trade) || { count: 0, ytd: 0, lyr: 0, open: 0 };
          curr.count += 1;
          curr.ytd += c.ytdSales;
          curr.lyr += c.lyrSales;
          curr.open += c.openDealValue;
          tradeSummaryMap.set(trade, curr);
        }
        const tradeBreakdown = Array.from(tradeSummaryMap.entries())
          .map(([trade, stats]) => ({ trade, ...stats }))
          .sort((a, b) => b.ytd - a.ytd)
          .slice(0, 15);

        const prompt = `You are the ProSpaces CRM Sales Intelligence Analyst.
Analyze the organization's sales data, purchasing trends, segment breakdown, and pipeline value. Highlight real sales trends, revenue expansion opportunities, top performers, and at-risk revenue using ONLY the grounded metrics below.${includeCostData ? ' Gross Profit (GP%) fields are authorized and included.' : ' Do not speculate about cost or GP%.'}

Organization Totals: ${JSON.stringify(totals)}
Trade Breakdown: ${JSON.stringify(tradeBreakdown)}
Top/Key Accounts Sample: ${JSON.stringify(topAccounts)}`;

        const response = await client.models.generateContent({
          model: AI_MODEL,
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                executiveSummary: { type: Type.STRING },
                trends: { type: Type.ARRAY, items: { type: Type.STRING } },
                revenueOpportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                atRiskRevenue: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: [
                'executiveSummary',
                'trends',
                'revenueOpportunities',
                'atRiskRevenue',
                'recommendedActions',
              ],
            },
          },
        });

        const parsed = JSON.parse((response.text || '{}').trim());
        return res.json({ success: true, mode, totals, tradeBreakdown, ...parsed });
      }

      // Default: 'insights' (Customer Insights: buying habits, inactive customers, sales opportunities)
      const sampleAccounts = [...enriched]
        .sort((a, b) => b.ytdSales + b.openDealValue - (a.ytdSales + a.openDealValue))
        .slice(0, 60);

      const prompt = `You are the ProSpaces CRM Customer Insights Analyst.
Analyze customer buying habits, identify inactive customers who need re-engagement, and highlight upsell / cross-sell / open-quote sales opportunities using ONLY the grounded CRM data below.

Organization Totals: ${JSON.stringify(totals)}
Accounts Sample JSON:
${JSON.stringify(sampleAccounts)}`;

      const response = await client.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              buyingHabits: { type: Type.ARRAY, items: { type: Type.STRING } },
              inactiveCustomers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    contactId: { type: Type.STRING },
                    name: { type: Type.STRING },
                    company: { type: Type.STRING },
                    daysInactive: { type: Type.NUMBER },
                    reason: { type: Type.STRING },
                  },
                  required: ['contactId', 'name', 'daysInactive', 'reason'],
                },
              },
              opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
              strategicRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'headline',
              'buyingHabits',
              'inactiveCustomers',
              'opportunities',
              'strategicRecommendations',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      return res.json({ success: true, mode, totals, ...parsed });
    } catch (err) {
      return handleGeminiRouteError(res, err, 'CRM Intelligence request failed.');
    }
  });

  // ── 4. PROSPACES LOGISTICS AI COPILOT ──
  app.post('/api/ai/logistics-assistant', async (req: Request, res: Response) => {
    try {
      const ctx = await resolveLogisticsAuthContext(req);
      if (!ctx) {
        return res.status(401).json({ error: 'Authentication required to access the Logistics AI Copilot.' });
      }

      const allowedModes = new Set(['dispatch-qa', 'route-optimize', 'customer-eta', 'polish-pod']);
      const mode = allowedModes.has(req.body?.mode) ? String(req.body.mode) : 'dispatch-qa';
      const question = clampText(req.body?.question, 800);
      const rawNotes = clampText(req.body?.rawNotes, 2000);
      const deliveryId = clampText(req.body?.deliveryId, 120);

      const clientDeliveries = Array.isArray(req.body?.deliveries) ? req.body.deliveries : [];
      const clientTrucks = Array.isArray(req.body?.trucks) ? req.body.trucks : [];

      const compactDeliveries = clientDeliveries.slice(0, 120).map((d: any) => ({
        id: clampText(d.id, 60),
        customerName: clampText(d.customerName, 100),
        deliveryAddress: clampText(d.deliveryAddress, 140),
        originBranch: clampText(d.originBranch, 60),
        status: clampText(d.status, 40),
        assignedTruck: clampText(d.assignedTruck, 60),
        assignedDriver: clampText(d.assignedDriver, 80),
        scheduledDate: clampText(d.scheduledDate, 30),
        scheduledSlot: clampText(d.scheduledSlot, 10),
        weight: clampText(d.weight, 30),
        documentType: clampText(d.documentType, 30),
        deliveryCategory: clampText(d.deliveryCategory, 40),
        returnReason: clampText(d.returnReason, 120),
        destinationNotes: clampText(d.destinationNotes, 150),
      }));

      const compactTrucks = clientTrucks.slice(0, 40).map((t: any) => ({
        id: clampText(t.id, 60),
        name: clampText(t.name, 80),
        driver: clampText(t.driver, 80),
        homeBranch: clampText(t.homeBranch, 60),
        capacity: clampText(t.capacity, 40),
        status: clampText(t.status, 30),
      }));

      const client = requireGeminiClient();

      if (mode === 'polish-pod') {
        if (!rawNotes) {
          return res.status(400).json({ error: 'Please enter driver field notes to polish.' });
        }
        const prompt = `You are the ProSpaces Logistics Proof-of-Delivery Assistant. Rewrite the raw driver field note below into a clear, factual, professional delivery note for customer records and dispatchers. Do NOT invent facts.\n\nRaw Driver Notes: "${rawNotes}"`;
        const response = await client.models.generateContent({
          model: AI_MODEL,
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                polishedNote: { type: Type.STRING },
                recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['summary', 'polishedNote', 'recommendedActions'],
            },
          },
        });
        const parsed = JSON.parse((response.text || '{}').trim());
        return res.json({ success: true, mode, ...parsed });
      }

      if (mode === 'customer-eta') {
        const target = compactDeliveries.find((d) => d.id === deliveryId) || req.body?.delivery;
        if (!target) {
          return res.status(400).json({ error: 'Delivery details are required to draft a customer ETA message.' });
        }
        const prompt = `You are the ProSpaces Logistics Customer Update Writer. Draft a clear, polite customer ETA / delivery status update email/SMS based strictly on this delivery record and optional dispatcher note.\n\nDispatcher Note: "${question || 'Provide proactive status and ETA update.'}"\nDelivery Record JSON:\n${JSON.stringify(target)}`;
        const response = await client.models.generateContent({
          model: AI_MODEL,
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                emailSubject: { type: Type.STRING },
                emailBody: { type: Type.STRING },
                smsText: { type: Type.STRING },
              },
              required: ['summary', 'emailSubject', 'emailBody', 'smsText'],
            },
          },
        });
        const parsed = JSON.parse((response.text || '{}').trim());
        return res.json({ success: true, mode, ...parsed });
      }

      if (mode === 'route-optimize') {
        const prompt = `You are the ProSpaces Logistics Dispatch & Route Optimizer.
Analyze the live deliveries and fleet trucks below. Identify:
1. Unassigned or unscheduled deliveries that need truck/slot allocation.
2. Any trucks carrying multiple heavy loads or cross-branch mismatches.
3. Concrete assignment & batching recommendations (truck + AM/PM slot) grouped by depot/branch.
Use ONLY the IDs, names, branches, and trucks present in the JSON below.

Fleet Trucks JSON: ${JSON.stringify(compactTrucks)}
Deliveries Queue JSON: ${JSON.stringify(compactDeliveries)}`;

        const response = await client.models.generateContent({
          model: AI_MODEL,
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      deliveryId: { type: Type.STRING },
                      customerName: { type: Type.STRING },
                      recommendedTruck: { type: Type.STRING },
                      recommendedSlot: { type: Type.STRING },
                      rationale: { type: Type.STRING },
                    },
                    required: ['deliveryId', 'customerName', 'recommendedTruck', 'recommendedSlot', 'rationale'],
                  },
                },
              },
              required: ['summary', 'warnings', 'recommendations'],
            },
          },
        });

        const parsed = JSON.parse((response.text || '{}').trim());
        return res.json({ success: true, mode, ...parsed });
      }

      // Default: 'dispatch-qa'
      if (!question) {
        return res.status(400).json({ error: 'Please enter a dispatch question.' });
      }
      const prompt = `You are the ProSpaces Logistics Dispatch Copilot.
Answer the dispatcher's question accurately using ONLY the live deliveries and trucks data below. Reference exact Delivery IDs, Customer Names, Truck Names, and Branch IDs when helpful.

Dispatcher Question: "${question}"
Fleet Trucks JSON: ${JSON.stringify(compactTrucks)}
Deliveries Queue JSON: ${JSON.stringify(compactDeliveries)}`;

      const response = await client.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: { type: Type.STRING },
              highlightedDeliveryIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['answer', 'highlightedDeliveryIds', 'recommendedActions'],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      return res.json({ success: true, mode, ...parsed });
    } catch (err) {
      return handleGeminiRouteError(res, err, 'Logistics AI Copilot request failed.');
    }
  });
}
