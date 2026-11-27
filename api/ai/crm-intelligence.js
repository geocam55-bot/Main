import {
  Type,
  ThinkingLevel,
  applyAICorsAndMethodGuard,
  parseRequestBody,
  clampText,
  canViewSensitiveCost,
  isTeamWideRole,
  requireGeminiClient,
  generateGeminiJSONWithRetry,
  handleGeminiRouteError,
  resolveCRMAuthContext,
} from '../_lib/aiHelper.js';

export default async function handler(req, res) {
  if (!applyAICorsAndMethodGuard(req, res)) return;

  try {
    const body = parseRequestBody(req);
    const ctx = await resolveCRMAuthContext(req, body);
    if (!ctx) {
      return res.status(401).json({ error: 'Authentication required to access CRM Intelligence.' });
    }
    if (!ctx.organizationId) {
      return res.status(403).json({ error: 'No organization context found for your account.' });
    }

    const allowedModes = new Set(['insights', 'followup', 'sales-analysis', 'smart-search']);
    const mode = allowedModes.has(body?.mode) ? String(body.mode) : 'insights';
    const query = clampText(body?.query, 600);
    const scope = body?.scope === 'personal' ? 'personal' : 'team';
    const includeCostData = Boolean(body?.includeCostData) && canViewSensitiveCost(ctx.userRole);

    if (mode === 'smart-search' && !query) {
      return res.status(400).json({ error: 'Please enter a natural-language search query.' });
    }

    let contactsQuery = ctx.clientSb
      .from('contacts')
      .select(
        'id, name, company, email, trade, status, price_level, tags, notes, ptd_sales, ytd_sales, lyr_sales, ptd_gp_percent, ytd_gp_percent, lyr_gp_percent, created_at, updated_at, owner_id, city, province'
      )
      .eq('organization_id', ctx.organizationId)
      .limit(350);

    if (scope === 'personal' || !isTeamWideRole(ctx.userRole)) {
      contactsQuery = contactsQuery.eq('owner_id', ctx.userId);
    }

    const [contactsRes, bidsRes, quotesRes, purchasesRes, purchaseItemsRes] = await Promise.all([
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
      ctx.clientSb
        .from('customer_purchases')
        .select('id, contact_id, purchase_date, total_amount')
        .eq('organization_id', ctx.organizationId)
        .order('purchase_date', { ascending: false })
        .limit(2000),
      mode === 'insights' || mode === 'sales-analysis'
        ? ctx.clientSb
            .from('customer_purchase_items')
            .select('category, quantity, line_total')
            .eq('organization_id', ctx.organizationId)
            .limit(1500)
        : Promise.resolve({ data: [] }),
    ]);

    if (contactsRes.error) {
      return res.status(500).json({ error: `Failed to query contacts: ${contactsRes.error.message}` });
    }

    const contacts = contactsRes.data || [];
    const deals = [
      ...(bidsRes.data || []).map((b) => ({ ...b, contactRef: b.opportunity_id })),
      ...(quotesRes.data || []).map((q) => ({ ...q, contactRef: q.contact_id })),
    ];

    const nowMs = Date.now();
    const sixMonthsAgoMs = nowMs - 183 * 24 * 60 * 60 * 1000;
    const daysBetween = (iso) => {
      if (!iso) return 999;
      const ts = new Date(iso).getTime();
      if (Number.isNaN(ts)) return 999;
      return Math.max(0, Math.floor((nowMs - ts) / (1000 * 60 * 60 * 24)));
    };

    const dealsByContact = new Map();
    for (const d of deals) {
      const key = String(d.contactRef || '');
      if (!key) continue;
      const list = dealsByContact.get(key) || [];
      list.push(d);
      dealsByContact.set(key, list);
    }

    const purchasesByContact = new Map();
    for (const p of purchasesRes.data || []) {
      const cid = String(p.contact_id || '');
      if (!cid) continue;
      const entry = purchasesByContact.get(cid) || { count: 0, spend6M: 0, latestDate: null };
      entry.count += 1;
      const ts = p.purchase_date ? new Date(p.purchase_date).getTime() : NaN;
      if (!Number.isNaN(ts) && ts >= sixMonthsAgoMs) {
        entry.spend6M += Number(p.total_amount || 0);
      }
      if (
        p.purchase_date &&
        (!entry.latestDate || new Date(p.purchase_date).getTime() > new Date(entry.latestDate).getTime())
      ) {
        entry.latestDate = p.purchase_date;
      }
      purchasesByContact.set(cid, entry);
    }

    const orgCategoryMap = new Map();
    for (const it of purchaseItemsRes?.data || []) {
      const cat = String(it.category || 'UNCATEGORIZED').trim() || 'UNCATEGORIZED';
      const curr = orgCategoryMap.get(cat) || { category: cat, lineCount: 0, netSpend: 0 };
      curr.lineCount += 1;
      curr.netSpend = Number((curr.netSpend + Number(it.line_total || 0)).toFixed(2));
      orgCategoryMap.set(cat, curr);
    }
    const topPurchaseCategories = Array.from(orgCategoryMap.values())
      .sort((a, b) => Math.abs(b.netSpend) - Math.abs(a.netSpend))
      .slice(0, 12);

    const enriched = contacts.map((c) => {
      const cDeals = dealsByContact.get(String(c.id)) || [];
      const cPurch = purchasesByContact.get(String(c.id));
      const openDeals = cDeals.filter(
        (d) =>
          !['won', 'accepted', 'approved', 'lost', 'rejected', 'declined', 'cancelled', 'closed', 'completed'].includes(
            String(d.status || '').toLowerCase()
          )
      );
      const openValue = openDeals.reduce((sum, d) => sum + Number(d.total ?? d.amount ?? 0), 0);
      const latestDealDate = cDeals.reduce((latest, d) => {
        const dt = d.updated_at || d.created_at;
        if (!dt) return latest;
        if (!latest || new Date(dt).getTime() > new Date(latest).getTime()) return dt;
        return latest;
      }, null);
      const lastActivityDays = Math.min(
        daysBetween(c.updated_at || c.created_at),
        latestDealDate ? daysBetween(latestDealDate) : 999,
        cPurch?.latestDate ? daysBetween(cPurch.latestDate) : 999
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
        recentPurchaseCount: cPurch?.count || 0,
        last6MonthsPurchaseSpend: Number((cPurch?.spend6M || 0).toFixed(2)),
        lastPurchaseDate: cPurch?.latestDate || null,
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

    const client = await requireGeminiClient([ctx.clientSb, ctx.supabase], ctx.organizationId);

    if (mode === 'smart-search') {
      const compactForSearch = enriched.slice(0, 160);
      const prompt = `You are the ProSpaces CRM Smart Customer Search engine.
Evaluate the user's natural-language search query against the customer records below and return ONLY matching customer IDs sorted by best relevance.
Support purchasing pattern queries (e.g., high YTD sales, declining YoY sales, open quotes/deals, inactive customers >30 days, trade/contractor type, city, tags, price tier).

User Query: "${query}"

Customer Records JSON:
${JSON.stringify(compactForSearch)}`;

      const parsed = await generateGeminiJSONWithRetry(
        client,
        prompt,
        {
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
        'reply'
      );
      const validIds = new Set(enriched.map((c) => c.id));
      const filteredMatches = (Array.isArray(parsed.matchedContacts) ? parsed.matchedContacts : []).filter(
        (m) => m && validIds.has(String(m.contactId))
      );
      return res.status(200).json({
        success: true,
        mode,
        reply: parsed.reply || `Found ${filteredMatches.length} matching customer(s).`,
        matchedContacts: filteredMatches,
        suggestedFollowupQuery: parsed.suggestedFollowupQuery || '',
      });
    }

    if (mode === 'followup') {
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

      const parsed = await generateGeminiJSONWithRetry(
        client,
        prompt,
        {
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
        'summary'
      );
      return res.status(200).json({ success: true, mode, totals, ...parsed });
    }

    if (mode === 'sales-analysis') {
      const topAccounts = [...enriched]
        .sort((a, b) => b.ytdSales + b.lyrSales + b.openDealValue - (a.ytdSales + a.lyrSales + a.openDealValue))
        .slice(0, 60);

      const tradeSummaryMap = new Map();
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
Top Purchased Categories: ${JSON.stringify(topPurchaseCategories)}
Trade Breakdown: ${JSON.stringify(tradeBreakdown)}
Top/Key Accounts Sample: ${JSON.stringify(topAccounts)}`;

      const parsed = await generateGeminiJSONWithRetry(
        client,
        prompt,
        {
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
        'executiveSummary'
      );
      return res.status(200).json({ success: true, mode, totals, tradeBreakdown, ...parsed });
    }

    const sampleAccounts = [...enriched]
      .sort((a, b) => b.ytdSales + b.openDealValue - (a.ytdSales + a.openDealValue))
      .slice(0, 60);

    const prompt = `You are the ProSpaces CRM Customer Insights Analyst.
Analyze customer buying habits, identify inactive customers who need re-engagement, and highlight upsell / cross-sell / open-quote sales opportunities using ONLY the grounded CRM data below.

Organization Totals: ${JSON.stringify(totals)}
Top Purchased Categories: ${JSON.stringify(topPurchaseCategories)}
Accounts Sample JSON:
${JSON.stringify(sampleAccounts)}`;

    const parsed = await generateGeminiJSONWithRetry(
      client,
      prompt,
      {
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
      'headline'
    );
    return res.status(200).json({ success: true, mode, totals, ...parsed });
  } catch (err) {
    return handleGeminiRouteError(res, err, 'CRM Intelligence request failed.', '/api/ai/crm-intelligence');
  }
}
