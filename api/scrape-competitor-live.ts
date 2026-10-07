import { runRetailPriceComparison } from '../src/services/playwright-scraper.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Allow', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
  }

  const item = req.method === 'GET' ? req.query || {} : req.body || {};
  const searchTerm = String(item.searchQuery || item.description || item.productName || item.name || item.sku || '').trim();
  if (!searchTerm || searchTerm.length > 300) {
    return res.status(400).json({ success: false, error: 'A search term of 1 to 300 characters is required' });
  }
  try {
    const result = await runRetailPriceComparison(searchTerm, {
      sku: item.sku,
      name: item.productName || item.name,
      description: item.description,
      short_description: item.shortDescription,
      brand: item.brand,
      search_keywords: item.searchKeywords,
      attributes: item.attributes,
      dimensions: item.dimensions,
      mfg: item.mfgPartNumber,
      supplier_sku: item.supplierSku,
      upc: item.upc,
      category: item.category,
    });
    const competitorIds: Record<string, number> = {
      Kent: 1,
      'Home Depot': 2,
      RONA: 3,
    };
    const matches = result.matchesFound ? result.results : [];

    return res.status(200).json({
      success: true,
      productId: item.productId || item.sku || null,
      sku: item.sku || null,
      productName: item.productName || item.name || searchTerm,
      competitors: matches.map((match) => ({
        competitorId: competitorIds[match.store] || null,
        competitorName: match.store,
        websiteUrl: match.url,
        productUrl: match.url,
        productName: match.productName,
        price: match.price,
        regularPrice: match.price,
        currency: 'CAD',
        availability: 'IN_STOCK',
        matchConfidence: match.matchConfidence,
        matchMethod: match.matchMethod,
        sku: match.modelNumber || null,
      })),
      diagnostics: {
        reason: result.matchesFound ? undefined : result.reason,
        competitors: result.competitorDiagnostics,
      },
    });
  } catch (err: any) {
    console.error('[Competitor Scrape API] Live search failed:', err);
    return res.status(502).json({
      success: false,
      error: err?.message || 'Live competitor search failed',
      competitors: [],
    });
  }
}
