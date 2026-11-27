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
      return res.status(401).json({
        error: 'Authentication required to use the AI Customer Assistant.',
        debug: { handler: 'vercel-serverless', route: '/api/ai/customer-assistant' },
      });
    }
    if (!ctx.organizationId) {
      return res.status(403).json({
        error: 'No organization context found for your account.',
        debug: { handler: 'vercel-serverless', route: '/api/ai/customer-assistant' },
      });
    }

    const contactId = clampText(body?.contactId, 120);
    const question = clampText(body?.question, 800);
    const mode = body?.mode === 'qa' ? 'qa' : 'summary';
    const includeCostData = Boolean(body?.includeCostData) && canViewSensitiveCost(ctx.userRole);

    if (!contactId) {
      return res.status(400).json({ error: 'contactId is required.' });
    }

    let { data: contactRow, error: contactErr } = await ctx.clientSb
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('organization_id', ctx.organizationId)
      .maybeSingle();

    if (!contactRow) {
      const { data: fallbackContact } = await ctx.clientSb
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .maybeSingle();
      if (fallbackContact) {
        contactRow = fallbackContact;
      }
    }

    if (contactErr && !contactRow) {
      return res.status(500).json({ error: `Failed to load contact: ${contactErr.message}` });
    }
    if (!contactRow) {
      return res.status(404).json({ error: 'Contact not found.' });
    }

    if (!isTeamWideRole(ctx.userRole) && contactRow.owner_id && contactRow.owner_id !== ctx.userId) {
      return res.status(403).json({ error: 'You do not have permission to analyze this contact.' });
    }

    const activeOrgId = contactRow.organization_id || ctx.organizationId;

    const [notesRes, bidsRes, quotesRes, apptsRes, purchasesRes] = await Promise.all([
      ctx.clientSb
        .from('notes')
        .select('id, title, content, created_at')
        .eq('organization_id', activeOrgId)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(20),
      ctx.clientSb
        .from('bids')
        .select('id, title, status, total, amount, created_at, updated_at, valid_until, notes')
        .eq('organization_id', activeOrgId)
        .eq('opportunity_id', contactId)
        .order('created_at', { ascending: false })
        .limit(20),
      ctx.clientSb
        .from('quotes')
        .select('id, title, status, total, subtotal, created_at, updated_at, valid_until, notes')
        .eq('organization_id', activeOrgId)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(20),
      ctx.clientSb
        .from('appointments')
        .select('id, title, description, location, start_time')
        .eq('organization_id', activeOrgId)
        .eq('contact_id', contactId)
        .order('start_time', { ascending: false })
        .limit(15),
      ctx.clientSb
        .from('customer_purchases')
        .select(
          'id, invoice_number, purchase_date, subtotal, discount_amount, tax_amount, total_amount, cost_total, gross_profit, gp_percent, payment_status, fulfillment_status, branch_id, notes'
        )
        .eq('organization_id', activeOrgId)
        .eq('contact_id', contactId)
        .order('purchase_date', { ascending: false })
        .limit(250),
    ]);

    const purchaseRows = purchasesRes.data || [];
    let purchaseItems = [];
    if (purchaseRows.length > 0) {
      const recentPurchaseIds = purchaseRows.slice(0, 100).map((p) => p.id).filter(Boolean);
      if (recentPurchaseIds.length > 0) {
        try {
          const { data: itemsData } = await ctx.clientSb
            .from('customer_purchase_items')
            .select('purchase_id, sku, item_name, category, quantity, unit_of_measure, unit_price, line_total')
            .eq('organization_id', activeOrgId)
            .in('purchase_id', recentPurchaseIds)
            .limit(800);
          purchaseItems = itemsData || [];
        } catch {}
      }
    }

    const itemsByPurchaseId = new Map();
    for (const item of purchaseItems) {
      const pid = String(item.purchase_id || '');
      if (!pid) continue;
      const list = itemsByPurchaseId.get(pid) || [];
      list.push(item);
      itemsByPurchaseId.set(pid, list);
    }

    const sixMonthsAgoMs = Date.now() - 183 * 24 * 60 * 60 * 1000;
    const last6MonthsPurchases = purchaseRows.filter((p) => {
      const ts = p.purchase_date ? new Date(p.purchase_date).getTime() : NaN;
      return !Number.isNaN(ts) && ts >= sixMonthsAgoMs;
    });
    const last6MonthsIds = new Set(last6MonthsPurchases.map((p) => String(p.id)));
    const last6MonthsItems = purchaseItems.filter((it) => last6MonthsIds.has(String(it.purchase_id)));

    const sumTotal = (rows) => Number(rows.reduce((s, r) => s + Number(r.total_amount || 0), 0).toFixed(2));
    const positiveSpend6M = Number(
      last6MonthsPurchases
        .filter((r) => Number(r.total_amount || 0) > 0)
        .reduce((s, r) => s + Number(r.total_amount || 0), 0)
        .toFixed(2)
    );
    const creditsOrReturns6M = Number(
      last6MonthsPurchases
        .filter((r) => Number(r.total_amount || 0) < 0)
        .reduce((s, r) => s + Number(r.total_amount || 0), 0)
        .toFixed(2)
    );

    const categoryMap = new Map();
    const itemMap = new Map();
    const sourceItemsForHabits = last6MonthsItems.length > 0 ? last6MonthsItems : purchaseItems;

    for (const it of sourceItemsForHabits) {
      const cat = String(it.category || 'UNCATEGORIZED').trim() || 'UNCATEGORIZED';
      const prevCat = categoryMap.get(cat) || { category: cat, lineCount: 0, totalQty: 0, netSpend: 0 };
      prevCat.lineCount += 1;
      prevCat.totalQty = Number((prevCat.totalQty + Number(it.quantity || 0)).toFixed(2));
      prevCat.netSpend = Number((prevCat.netSpend + Number(it.line_total || 0)).toFixed(2));
      categoryMap.set(cat, prevCat);

      const itemKey = String(it.sku || it.item_name || '').trim().toLowerCase();
      if (itemKey) {
        const prevItem = itemMap.get(itemKey) || {
          sku: String(it.sku || ''),
          itemName: String(it.item_name || ''),
          category: cat,
          orderCount: 0,
          totalQty: 0,
          netSpend: 0,
        };
        prevItem.orderCount += 1;
        prevItem.totalQty = Number((prevItem.totalQty + Number(it.quantity || 0)).toFixed(2));
        prevItem.netSpend = Number((prevItem.netSpend + Number(it.line_total || 0)).toFixed(2));
        itemMap.set(itemKey, prevItem);
      }
    }

    const categoryBreakdown = Array.from(categoryMap.values())
      .sort((a, b) => Math.abs(b.netSpend) - Math.abs(a.netSpend))
      .slice(0, 12);
    const topPurchasedItems = Array.from(itemMap.values())
      .sort((a, b) => b.orderCount - a.orderCount || Math.abs(b.netSpend) - Math.abs(a.netSpend))
      .slice(0, 15);

    const recentInvoices = purchaseRows.slice(0, 25).map((p) => ({
      invoiceNumber: p.invoice_number,
      purchaseDate: p.purchase_date,
      totalAmount: Number(p.total_amount || 0),
      paymentStatus: p.payment_status,
      ...(includeCostData
        ? {
            costTotal: Number(p.cost_total || 0),
            grossProfit: Number(p.gross_profit || 0),
            gpPercent: Number(p.gp_percent || 0),
          }
        : {}),
      items: (itemsByPurchaseId.get(String(p.id)) || []).slice(0, 10).map((it) => ({
        sku: it.sku || '',
        itemName: clampText(it.item_name, 80),
        category: it.category || '',
        quantity: Number(it.quantity || 0),
        lineTotal: Number(it.line_total || 0),
      })),
    }));

    const snapshotDeals = Array.isArray(body?.recentDeals) ? body.recentDeals.slice(0, 15) : [];
    const allDeals = [
      ...(bidsRes.data || []).map((b) => ({ ...b, source: 'bid' })),
      ...(quotesRes.data || []).map((q) => ({ ...q, source: 'quote' })),
    ];
    const dealsForPrompt = (allDeals.length > 0 ? allDeals : snapshotDeals).map((d) => ({
      title: clampText(d.title, 120),
      status: clampText(d.status, 40),
      amount: Number(d.total ?? d.amount ?? 0),
      date: d.updated_at || d.created_at || d.date || null,
      notes: clampText(d.notes, 200),
    }));

    const customerPayload = {
      name: contactRow.name,
      company: contactRow.company,
      legacyAccountNumber: contactRow.legacy_number || null,
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
      purchaseHistory: {
        totalInvoicesRecorded: purchaseRows.length,
        allRecordedNetSpend: sumTotal(purchaseRows),
        last6MonthsSummary: {
          invoiceCount: last6MonthsPurchases.length,
          netSpend: sumTotal(last6MonthsPurchases),
          grossPurchasesTotal: positiveSpend6M,
          returnsOrCreditsTotal: creditsOrReturns6M,
          mostRecentPurchaseDate: purchaseRows[0]?.purchase_date || null,
          earliestIn6MonthsDate: last6MonthsPurchases[last6MonthsPurchases.length - 1]?.purchase_date || null,
        },
        categoryBreakdown,
        topPurchasedItems,
        recentInvoices,
      },
      linkedNotes: (notesRes.data || []).map((n) => ({
        title: clampText(n.title, 100),
        content: clampText(n.content, 300),
        date: n.created_at,
      })),
      appointments: (apptsRes.data || []).map((a) => ({
        title: clampText(a.title, 100),
        description: clampText(a.description, 200),
        date: a.start_time,
      })),
      dealsAndQuotes: dealsForPrompt,
    };

    const client = await requireGeminiClient([ctx.clientSb, ctx.supabase], activeOrgId);
    const prompt =
      mode === 'qa' && question
        ? `You are the ProSpaces CRM Customer Assistant. Answer the user's question accurately using ONLY the grounded customer record below (including purchaseHistory, invoices, line-item categories, top items, salesMetrics, notes, and deals). Note: negative invoice amounts represent customer returns or credit memos. If something is missing from the record, state clearly that it is not recorded.\n\nUser Question: "${question}"\n\nCustomer Record JSON:\n${JSON.stringify(customerPayload)}`
        : `You are the ProSpaces CRM Customer Assistant. Summarize this customer's relationship, granular purchase history & buying habits (categories, frequent items, recent invoices, returns vs net spend), interaction history, open quote/deal momentum, and recommend 2-3 concrete next actions grounded ONLY in the customer record below.\n\nCustomer Record JSON:\n${JSON.stringify(customerPayload)}`;

    const parsed = await generateGeminiJSONWithRetry(
      client,
      prompt,
      {
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
      'answer'
    );

    return res.status(200).json({ success: true, ...parsed });
  } catch (err) {
    return handleGeminiRouteError(res, err, 'Customer Assistant request failed.', '/api/ai/customer-assistant');
  }
}
