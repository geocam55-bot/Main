import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = "https://usorqldwroecyxucmtuw.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM";

function resolveInventoryTitles(rawName = '', rawDescription = '', category = '') {
  let parsedDescription = rawDescription || '';
  const markerStart = "<!--metadata:";
  const markerEnd = "-->";
  const startIndex = parsedDescription.lastIndexOf(markerStart);
  if (startIndex !== -1) {
    const endIndex = parsedDescription.indexOf(markerEnd, startIndex + markerStart.length);
    if (endIndex !== -1) {
      parsedDescription = parsedDescription.substring(0, startIndex).trim();
    }
  }

  let finalName = rawName || '';
  let finalDescription = parsedDescription;
  const cleanNameLower = finalName ? finalName.trim().toLowerCase() : '';

  const genericCategoryKeywords = [
    'accessories for', 'pipes, fittings', 'hooks, squares', 'insulating materials',
    'paint types', 'lawn, garden', 'lawn equipment', 'gutters', 'tree, plant',
    'electric heating', 'tools accesso', 'repair parts', 'electric acc.', 'coverings',
    'cables and accesso', 'furniture, bbq', 'electrical appliances', 'wall and floor',
    'portable electric', 'chains, steel', 'motorized lawn', 'building materials',
    'fasteners', 'hand tools', 'power tools', 'plumbing', 'lighting', 'seasonal',
    'hardware', 'outlets,boxes', 'fuses,outlets', 'ventilation', 'heating and cooling',
    'home decor', 'outdoor living', 'building product', 'tools & hardware',
    'electrical & lighting', 'paint & decor'
  ];

  const hasGenericKeyword = genericCategoryKeywords.some(keyword => cleanNameLower.includes(keyword));
  const isGenericOrEmpty = !finalName ||
    finalName.trim() === '' ||
    finalName.trim().toUpperCase() === 'UNDEFINED' ||
    (category && finalName.trim().toLowerCase() === category.trim().toLowerCase()) ||
    hasGenericKeyword;

  if (isGenericOrEmpty && parsedDescription && parsedDescription.trim() !== '') {
    finalName = parsedDescription;
    finalDescription = rawName || '';
  }

  return {
    title: finalName || parsedDescription || rawName || 'Product',
    description: finalDescription || '',
  };
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  const { id } = req.query || {};
  const pidStr = String(id || '').trim();

  try {
    const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL).trim();
    const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY).trim();
    const supabase = createClient(url, anonKey);

    let query = supabase.from('inventory').select('*');
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pidStr);
    if (isUUID) {
      query = query.eq('id', pidStr);
    } else {
      query = query.or(`sku.eq.${pidStr},supplier_sku.eq.${pidStr},name.ilike.%${pidStr}%`);
    }

    const { data: invItem } = await query.maybeSingle();
    const titleAndDesc = invItem
      ? resolveInventoryTitles(invItem.name, invItem.description, invItem.category)
      : { title: `Product ${pidStr}`, description: '' };

    const rawPrice = Number(invItem?.unit_price || invItem?.unitPrice || 0);
    const yourPrice = rawPrice > 0 && Number.isInteger(rawPrice) ? rawPrice / 100 : rawPrice;

    const competitorsMap = new Map();
    competitorsMap.set(1, 'KENT Building Supplies');
    competitorsMap.set(2, 'The Home Depot');

    try {
      const { data: comps } = await supabase.from('competitors').select('*');
      if (comps) comps.forEach((c) => competitorsMap.set(c.id, c.name));
    } catch (e) {}

    const competitorEntries = [];
    try {
      const { data: matches } = await supabase
        .from('product_matches')
        .select('*, competitor_products(*)')
        .or(`product_id.eq.${pidStr},product_id.eq.${invItem?.sku || ''}`);

      if (matches && matches.length > 0) {
        const compProductIds = matches.map((m) => m.competitor_product_id).filter(Boolean);
        const pricesMap = new Map();

        if (compProductIds.length > 0) {
          const { data: cpList } = await supabase
            .from('competitor_prices')
            .select('*')
            .in('competitor_product_id', compProductIds);

          if (cpList) {
            for (const cp of cpList) {
              pricesMap.set(String(cp.competitor_product_id), cp);
            }
          }
        }

        for (const m of matches) {
          const cp = m.competitor_products;
          const priceRec = pricesMap.get(String(m.competitor_product_id));
          const price = Number(priceRec?.current_price || 0);
          const compId = cp?.competitor_id || 1;
          const compName = competitorsMap.get(compId) || (compId === 1 ? 'KENT Building Supplies' : 'The Home Depot');

          competitorEntries.push({
            competitorId: compId,
            competitorName: compName,
            websiteUrl: compId === 1 ? 'https://kent.ca' : 'https://www.homedepot.ca',
            productUrl: cp?.product_url || undefined,
            productName: cp?.product_name || titleAndDesc.title,
            sku: cp?.external_product_id || undefined,
            price,
            currency: 'CAD',
            unitOfMeasure: cp?.unit_of_measure || invItem?.unit_of_measure || 'EA',
            packQuantity: cp?.pack_quantity || 1,
            normalizedUnitPrice: price,
            matchConfidence: m.match_confidence || 'HIGH',
            matchMethod: m.match_method || 'DESCRIPTION',
            availability: cp?.availability || (price > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK'),
            checkedAt: priceRec?.checked_at || m.updated_at || new Date().toISOString(),
          });
        }
      }
    } catch (e) {}

    return res.status(200).json({
      productId: invItem?.id || pidStr,
      sku: invItem?.sku || pidStr,
      productName: titleAndDesc.title,
      description: titleAndDesc.description,
      category: invItem?.category || 'General',
      yourPrice,
      currency: 'CAD',
      unitOfMeasure: invItem?.unit_of_measure || 'EA',
      competitors: competitorEntries,
      lastCheckedAt: competitorEntries.length > 0 ? competitorEntries[0].checkedAt : undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
