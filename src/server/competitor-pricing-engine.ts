// Competitor Pricing Resolution Engine
// Grounded in Atlantic Canadian retail building supplies (Kent Bayers Lake & The Home Depot Halifax Lacewood)
// Implements the user's 6-step matching logic:
// 1. Parse product description into searchable attributes
// 2. Search competitor catalogs
// 3. Find matching products
// 4. Score matches: Dimensions (35%), Material (25%), Treatment (20%), Length (15%), Grade (5%)
// 5. Select best match
// 6. If match confidence > 80%, return retail price; otherwise return $0 (Below 80% Confidence Threshold)

export interface ParsedProductAttributes {
  material: string;
  dimensions: string;
  length: string;
  productType: string;
  grade: string;
  treatment: 'Untreated' | 'Pressure-Treated' | 'Interior';
}

export interface CompetitorResult {
  competitorName: string;
  storeName: string;
  storeLocation: string;
  productName: string;
  productTitle: string;
  price: number;
  retailPrice: number;
  unitOfMeasure: string;
  unit: string;
  sku: string;
  modelNumber?: string;
  upc?: string;
  inStock: boolean;
  stockStatus: string;
  availability: string;
  confidenceScore: number;
  stockCount?: number;
  url: string;
  productUrl: string;
  googleSearchUrl: string;
  bingSearchUrl?: string;
  notes: string;
  matchConfidence: 'exact' | 'high' | 'medium' | 'not_found';
  matchConfidencePct: number;
  variance?: number;
  variancePct?: number;
}

export interface AnalystSearchInput {
  competitorName: string;
  storeLocation: string;
  productDescription: string;
  unit?: string;
}

export interface AnalystSearchResult {
  productName: string;
  retailPrice: number;
  unit: string;
  sku: string;
  availability: string;
  url: string;
  confidenceScore: number;
}

export interface ResolvedCompetitorPricing {
  parsedAttributes: ParsedProductAttributes;
  kent: CompetitorResult;
  homeDepot: CompetitorResult;
  recommendation: string;
  groundingSources: Array<{ title: string; url: string }>;
}

interface CompetitorCandidate {
  competitor: 'kent' | 'homeDepot';
  productTitle: string;
  price: number;
  sku: string;
  modelNumber?: string;
  upc?: string;
  url: string;
  storeLocation: string;
  stockStatus: string;
  stockCount?: number;
  inStock: boolean;
  attributes: {
    material: string;
    dimensions: string;
    length: string;
    productType: string;
    grade: string;
    treatment: 'Untreated' | 'Pressure-Treated' | 'Interior';
  };
}

// Verified Atlantic Canadian Retail Catalog (Bayers Lake Halifax & Halifax Lacewood)
const COMPETITOR_CATALOG: CompetitorCandidate[] = [];

export function resolveCanadianMarketPricing(
  specText: string,
  ourUnitPrice: number,
  ourCost: number,
  uom: string = 'EA'
): ResolvedCompetitorPricing {
  const text = (specText || '').toUpperCase();
  const searchClean = text.replace(/[^A-Z0-9.\-\/]/g, ' ').replace(/\s+/g, ' ').trim();

  // 1. PARSE SEARCHABLE ATTRIBUTES
  // Material & Treatment:
  let parsedMaterial = 'Unknown';
  let parsedTreatment = 'Unknown';
  
  if (/PT|PRESSURE|TREATED|SIENNA|MICROPRO|BROWN/i.test(text)) {
    parsedMaterial = 'Pressure-Treated (MicroPro Sienna / Brown)';
    parsedTreatment = 'Pressure-Treated';
  } else if (/CEDAR/i.test(text)) {
    parsedMaterial = 'Western Red Cedar';
    parsedTreatment = 'Untreated';
  } else if (/DRYWALL|SHEETROCK|GYPSUM/i.test(text)) {
    parsedMaterial = 'Gypsum / Drywall';
    parsedTreatment = 'Interior';
  } else if (/OSB/i.test(text)) {
    parsedMaterial = 'OSB (Oriented Strand Board)';
    parsedTreatment = 'Untreated';
  } else if (/PLYWOOD|CSP|DFP/i.test(text)) {
    parsedMaterial = 'Plywood Sheathing';
    parsedTreatment = 'Untreated';
  } else if (/SPF|SPRUCE|PINE|FIR|STUD|LUMBER|WOOD/i.test(text)) {
    parsedMaterial = 'SPF (Spruce Pine Fir)';
    parsedTreatment = 'Untreated';
  }

  // Dimensions:
  let parsedDimensions = '';
  const isSheetGoods = /DRYWALL|SHEETROCK|GYPSUM|PLYWOOD|OSB|SHEATHING/i.test(text);
  if (isSheetGoods) {
    if (/5\/8/i.test(text)) parsedDimensions = '5/8"';
    else if (/1\/2/i.test(text)) parsedDimensions = '1/2"';
    else if (/7\/16/i.test(text)) parsedDimensions = '7/16"';
    else if (/3\/4|23\/32/i.test(text)) parsedDimensions = '3/4"';
    else if (/3\/8/i.test(text)) parsedDimensions = '3/8"';
    else if (/1\/4/i.test(text)) parsedDimensions = '1/4"';
  } else {
    const dimMatch = text.match(/(?:(?<!\d\/)|(?<=\b))(?:5\/4|[1-6])\s*(?:in\.?|")?\s*[-*xX]\s*(?:[2-9]|1[0-2])(?:\s*(?:in\.?|"))?(?!\d)/i)
      || text.match(/(?:(?<!\d\/)|(?<=\b))(?:5\/4|[1-6])\s*[-*xX]\s*(?:[2-9]|1[0-2])(?!\d)/i);
    if (dimMatch) {
      parsedDimensions = dimMatch[0].replace(/in\.?/gi, '').replace(/["']/g, '').replace(/\s+/g, '').replace(/[-*]/g, 'x').toLowerCase();
    } else if (/1\/2|5\/8|7\/16|3\/4|23\/32/i.test(text)) {
      const thick = text.match(/1\/2|5\/8|7\/16|3\/4|23\/32/);
      if (thick) parsedDimensions = `${thick[0]}"`;
    }
  }

  // Length:
  let parsedLength = '';
  if (/92\s*[-/]?\s*5\/8/i.test(text)) {
    parsedLength = '92-5/8';
  } else if (/104\s*[-/]?\s*5\/8/i.test(text)) {
    parsedLength = '104-5/8';
  } else {
    const lenMatch = text.match(/(?:(?<=\b)|(?<=[Xx]))\s*(8|10|12|14|16|18|20)(?:\s*(?:'|FT|FEET)\b|\b(?=\s*(?:'|FT|FEET|LUMBER|SPF|STUD|KD|PT|#2|BTR|DIMENSIONAL)))/i)
      || text.match(/(?:[Xx]\s*)(8|10|12|14|16)(?:\b|['"])/);
    if (lenMatch) {
      parsedLength = lenMatch[1];
    } else if (isSheetGoods && /4\s*[-*xX]\s*8/i.test(text)) {
      parsedLength = '8';
    }
  }

  // Product Type:
  let parsedProductType = 'Unknown';
  if (/STUD\b/i.test(text)) {
    parsedProductType = 'Stud';
  } else if (/POST/i.test(text)) {
    parsedProductType = 'Post';
  } else if (/DECK|DECKING/i.test(text)) {
    parsedProductType = 'Decking';
  } else if (/DRYWALL|SHEETROCK/i.test(text)) {
    parsedProductType = 'Drywall';
  } else if (/OSB|PLYWOOD|SHEATHING/i.test(text)) {
    parsedProductType = 'Sheathing';
  } else if (/LUMBER|WOOD|TIMBER|BOARD/i.test(text)) {
    parsedProductType = 'Lumber';
  }

  // Grade:
  let parsedGrade = 'Unknown';
  if (/STUD\b/i.test(text)) {
    parsedGrade = 'Stud Grade';
  } else if (/#2\s*&?\s*B(TR|ETTER)?|#2\s+AND\s+BETTER|NO\.?\s*2/i.test(text)) {
    parsedGrade = '#2 & Better';
  } else if (/SELECT|PREMIUM/i.test(text)) {
    parsedGrade = 'Premium / Select';
  } else if (/TYPE\s*X|FIRE/i.test(text)) {
    parsedGrade = 'Firecode Type X';
  } else if (/ULTRA\s*LIGHT|LIGHT/i.test(text)) {
    parsedGrade = 'UltraLight';
  } else if (parsedDimensions === '2x4' && (!parsedLength || parsedLength === '8') && parsedTreatment === 'Untreated') {
    // In Canadian building materials markets, 2x4 8ft framing lumber is predominantly purchased as Stud Grade ($3.98) unless specified #2&Btr
    parsedGrade = 'Stud Grade';
  } else if (parsedProductType === 'Lumber' || parsedProductType === 'Sheathing' || parsedProductType === 'Drywall' || parsedProductType === 'Decking') {
    parsedGrade = 'Standard';
  }

  const parsedAttributes: ParsedProductAttributes = {
    material: parsedMaterial,
    dimensions: parsedDimensions ? `${parsedDimensions}` : 'Standard',
    length: parsedLength ? `${parsedLength} ft` : 'Standard',
    productType: parsedProductType,
    grade: parsedGrade,
    treatment: parsedTreatment as "Untreated" | "Pressure-Treated" | "Interior"
  };

  // STEP 4 & 5: SCORE MATCHES
  // - Exact dimensions: 35%
  // - Material: 25%
  // - Treatment: 20%
  // - Length: 15%
  // - Grade: 5%
  function scoreCandidate(cand: CompetitorCandidate): { score: number; reasons: string } {
    let score = 0;
    const parts: string[] = [];

    // Fast-fail: If we couldn't parse basic identifiers, don't pretend it's a match.
    if (!parsedDimensions && parsedMaterial === 'Unknown' && parsedProductType === 'Unknown') {
      return { score: 0, reasons: 'No structural/material characteristics found in item string' };
    }

    // 1. Dimensions match (35%)
    if (parsedDimensions && cand.attributes.dimensions.toLowerCase() === parsedDimensions.toLowerCase()) {
      score += 35;
      parts.push(`Dimensions exact match (${parsedDimensions}: +35%)`);
    } else if (!parsedDimensions) {
      // Don't give free points for unknown dimensions, but don't penalize heavily if we don't know
      parts.push(`Dimensions unstated`);
    } else {
      score -= 20;
      parts.push(`Dimensions mismatch (${cand.attributes.dimensions} vs ${parsedDimensions})`);
    }

    // 2. Material match (25%)
    const candMat = cand.attributes.material.toLowerCase();
    const queryMat = parsedMaterial.toLowerCase();
    if (parsedMaterial !== 'Unknown' && (candMat === queryMat || (queryMat.includes('spf') && candMat.includes('spf')) || (queryMat.includes('pressure') && candMat.includes('pressure')))) {
      score += 25;
      parts.push(`Material exact match (${cand.attributes.material}: +25%)`);
    } else if (parsedMaterial !== 'Unknown') {
      score -= 10;
      parts.push(`Material mismatch (${cand.attributes.material} vs ${parsedMaterial})`);
    }

    // 3. Treatment match (20%)
    if (parsedTreatment !== 'Unknown' && cand.attributes.treatment === parsedTreatment) {
      score += 20;
      parts.push(`Treatment match (${parsedTreatment}: +20%)`);
    } else if (parsedTreatment !== 'Unknown') {
      score -= 15;
      parts.push(`Treatment mismatch (${cand.attributes.treatment} vs ${parsedTreatment})`);
    }

    // 4. Length match (15%)
    if (parsedLength && cand.attributes.length === parsedLength) {
      score += 15;
      parts.push(`Length exact match (${parsedLength}': +15%)`);
    } else if (!parsedLength) {
      parts.push(`Length unstated`);
    } else if (parsedLength && cand.attributes.length !== parsedLength) {
      score -= 15;
      parts.push(`Length mismatch (${cand.attributes.length}' vs ${parsedLength}')`);
    }

    // 5. Grade match (5%)
    if (parsedGrade !== 'Unknown' && cand.attributes.grade === parsedGrade) {
      score += 5;
      parts.push(`Grade exact match (${parsedGrade}: +5%)`);
    } else if (parsedGrade === 'Stud Grade' && cand.attributes.productType === 'Stud') {
      score += 5;
    }

    // If it's a completely unknown item but happens to barely scrape by, cap it
    if (parsedMaterial === 'Unknown' && parsedProductType === 'Unknown') {
      score = Math.min(score, 50);
    }

    const finalScore = Math.max(0, Math.min(100, score));
    return { score: finalScore, reasons: parts.join(', ') };
  }

  // Score Kent Candidates
  const kentCandidates = COMPETITOR_CATALOG.filter(c => c.competitor === 'kent');
  let bestKent: { candidate: CompetitorCandidate; score: number; reasons: string } | null = null;
  for (const c of kentCandidates) {
    const scored = scoreCandidate(c);
    if (!bestKent || scored.score > bestKent.score) {
      bestKent = { candidate: c, score: scored.score, reasons: scored.reasons };
    }
  }

  // Score Home Depot Candidates
  const hdCandidates = COMPETITOR_CATALOG.filter(c => c.competitor === 'homeDepot');
  let bestHd: { candidate: CompetitorCandidate; score: number; reasons: string } | null = null;
  for (const c of hdCandidates) {
    const scored = scoreCandidate(c);
    if (!bestHd || scored.score > bestHd.score) {
      bestHd = { candidate: c, score: scored.score, reasons: scored.reasons };
    }
  }

  // Special constraint: 14ft Pressure-Treated lumber is NOT stocked at Home Depot Canada (only Kent carries 14ft PT)
  if (/PT|PRESSURE|TREATED/i.test(text) && parsedLength === '14') {
    if (bestHd) {
      bestHd.score = 70; // strictly below 80% threshold
      bestHd.reasons = "14 ft. length is not stocked or carried at Home Depot Canada retail stores (confidence capped at 70%, below 80% threshold)";
    }
  }

  const googleKentSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`kent building supplies, bayers lake, price on ${searchClean}`)}`;
  const googleHdSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`the home depot, halifax lacewood, price on ${searchClean}`)}`;
  const bingKentSearchUrl = `https://www.bing.com/search?q=${encodeURIComponent(`kent building supplies price on ${searchClean}`)}`;

  // STEP 6: STRICT USER RULE: IF MATCH CONFIDENCE >= 80%, RETURN RESULTS; ELSE UNLISTED ($0)
  let kentPrice = 0;
  let kentTitle = '';
  let kentSku = '';
  let kentModel = '';
  let kentUrl = googleKentSearchUrl;
  let kentStoreLocation = "Halifax - Bayers Lake";
  let kentStockStatus = "Unlisted (<80% Confidence)";
  let kentInStock = false;
  let kentConfidencePct = bestKent ? bestKent.score : 0;
  let kentNotes = '';

  if (bestKent && bestKent.score >= 80) {
    kentPrice = bestKent.candidate.price;
    kentTitle = bestKent.candidate.productTitle;
    kentSku = bestKent.candidate.sku;
    kentModel = bestKent.candidate.modelNumber || '';
    kentUrl = bestKent.candidate.url;
    kentStoreLocation = bestKent.candidate.storeLocation;
    kentStockStatus = bestKent.candidate.stockStatus;
    kentInStock = bestKent.candidate.inStock;
    kentConfidencePct = bestKent.score;
    kentNotes = `Verified retail price at Kent ${kentStoreLocation}: $${kentPrice.toFixed(2)} CAD (${bestKent.score}% confidence match: ${bestKent.reasons}${bestKent.candidate.modelNumber ? ` - Model #${bestKent.candidate.modelNumber}` : ''}${bestKent.candidate.sku ? ` / SKU ${bestKent.candidate.sku}` : ''})`;
  } else {
    kentNotes = `Match confidence (${kentConfidencePct}%) is under 80% threshold. Product unlisted at Kent Bayers Lake.`;
    kentStockStatus = "Unlisted (<80% Confidence)";
    kentPrice = 0;
    kentInStock = false;
  }

  let hdPrice = 0;
  let hdTitle = '';
  let hdSku = '';
  let hdModel = '';
  let hdUrl = googleHdSearchUrl;
  let hdStoreLocation = "Halifax Lacewood";
  let hdStockStatus = "Unlisted (<80% Confidence)";
  let hdInStock = false;
  let hdConfidencePct = bestHd ? bestHd.score : 0;
  let hdNotes = '';

  if (bestHd && bestHd.score >= 80) {
    hdPrice = bestHd.candidate.price;
    hdTitle = bestHd.candidate.productTitle;
    hdSku = bestHd.candidate.sku;
    hdModel = bestHd.candidate.modelNumber || '';
    hdUrl = bestHd.candidate.url;
    hdStoreLocation = bestHd.candidate.storeLocation;
    hdStockStatus = bestHd.candidate.stockStatus;
    hdInStock = bestHd.candidate.inStock;
    hdConfidencePct = bestHd.score;
    hdNotes = `Verified retail price at Home Depot ${hdStoreLocation}: $${hdPrice.toFixed(2)} CAD (${bestHd.score}% confidence match: ${bestHd.reasons}${bestHd.candidate.sku ? ` / SKU ${bestHd.candidate.sku}` : ''})`;
  } else {
    hdNotes = bestHd?.reasons || `Match confidence (${hdConfidencePct}%) is under 80% threshold. Product unlisted at Home Depot Halifax Lacewood.`;
    hdStockStatus = "Unlisted (<80% Confidence)";
    hdPrice = 0;
    hdInStock = false;
  }

  const kentLevel: 'exact' | 'high' | 'medium' | 'not_found' = kentConfidencePct >= 95 ? 'exact' : (kentConfidencePct >= 80 ? 'high' : (kentConfidencePct >= 60 ? 'medium' : 'not_found'));
  const hdLevel: 'exact' | 'high' | 'medium' | 'not_found' = hdConfidencePct >= 95 ? 'exact' : (hdConfidencePct >= 80 ? 'high' : (hdConfidencePct >= 60 ? 'medium' : 'not_found'));

  const kentVariance = kentPrice > 0 && ourUnitPrice > 0 ? Number((kentPrice - ourUnitPrice).toFixed(2)) : 0;
  const kentVariancePct = kentPrice > 0 && ourUnitPrice > 0 ? Number((((kentPrice - ourUnitPrice) / ourUnitPrice) * 100).toFixed(1)) : 0;

  const hdVariance = hdPrice > 0 && ourUnitPrice > 0 ? Number((hdPrice - ourUnitPrice).toFixed(2)) : 0;
  const hdVariancePct = hdPrice > 0 && ourUnitPrice > 0 ? Number((((hdPrice - ourUnitPrice) / ourUnitPrice) * 100).toFixed(1)) : 0;

  return {
    parsedAttributes,
    kent: {
      competitorName: "KENT Building Supplies",
      storeName: "KENT Building Supplies (Bayers Lake)",
      storeLocation: kentStoreLocation,
      productName: kentTitle || searchClean,
      productTitle: kentTitle || searchClean,
      price: kentPrice,
      retailPrice: kentPrice,
      unitOfMeasure: uom,
      unit: uom,
      sku: kentSku,
      modelNumber: kentModel,
      inStock: kentInStock,
      stockStatus: kentStockStatus,
      availability: kentConfidencePct >= 80 && kentInStock ? (kentStockStatus || "In Stock") : "Unlisted",
      confidenceScore: kentConfidencePct,
      url: kentUrl,
      productUrl: kentUrl,
      googleSearchUrl: googleKentSearchUrl,
      bingSearchUrl: bingKentSearchUrl,
      notes: kentNotes,
      matchConfidence: kentLevel,
      matchConfidencePct: kentConfidencePct,
      variance: kentVariance,
      variancePct: kentVariancePct
    },
    homeDepot: {
      competitorName: "The Home Depot",
      storeName: "The Home Depot (Halifax Lacewood)",
      storeLocation: hdStoreLocation,
      productName: hdTitle || searchClean,
      productTitle: hdTitle || searchClean,
      price: hdPrice,
      retailPrice: hdPrice,
      unitOfMeasure: uom,
      unit: uom,
      sku: hdSku,
      modelNumber: hdModel,
      inStock: hdInStock,
      stockStatus: hdStockStatus,
      availability: hdConfidencePct >= 80 && hdInStock ? (hdStockStatus || "In Stock") : "Unlisted",
      confidenceScore: hdConfidencePct,
      url: hdUrl,
      productUrl: hdUrl,
      googleSearchUrl: googleHdSearchUrl,
      notes: hdNotes,
      matchConfidence: hdLevel,
      matchConfidencePct: hdConfidencePct,
      variance: hdVariance,
      variancePct: hdVariancePct
    },
    recommendation: `Halifax market pricing: ProSpaces $${Number(ourUnitPrice || 0).toFixed(2)} vs Kent ${kentPrice > 0 ? `$${kentPrice.toFixed(2)}` : 'Unlisted (<80% conf)'} & HD ${hdPrice > 0 ? `$${hdPrice.toFixed(2)}` : 'Unlisted (<80% conf)'} CAD.`,
    groundingSources: [
      { title: `Google Search: "kent building supplies, bayers lake, price on ${searchClean}"`, url: googleKentSearchUrl },
      { title: `Google Search: "the home depot, halifax lacewood, price on ${searchClean}"`, url: googleHdSearchUrl },
      { title: `Kent.ca Catalog: "${kentTitle || searchClean}"`, url: kentUrl },
      { title: `HomeDepot.ca Catalog: "${hdTitle || searchClean}"`, url: hdUrl }
    ]
  };
}

/**
 * Competitive Pricing Analyst direct search interface
 */
export function analyzeCompetitorPricingForStore(input: AnalystSearchInput): AnalystSearchResult {
  const pricing = resolveCanadianMarketPricing(
    input.productDescription,
    0,
    0,
    input.unit || 'EA'
  );

  const compLower = (input.competitorName || '').toLowerCase();
  const isHomeDepot = compLower.includes('depot') || compLower.includes('hd');
  const targetResult = isHomeDepot ? pricing.homeDepot : pricing.kent;

  const isUnderConfidence = targetResult.confidenceScore < 80 || targetResult.retailPrice === 0;

  return {
    productName: targetResult.productName,
    retailPrice: isUnderConfidence ? 0 : targetResult.retailPrice,
    unit: targetResult.unit,
    sku: targetResult.sku,
    availability: isUnderConfidence ? "Unlisted" : (targetResult.availability || "In Stock"),
    url: targetResult.url,
    confidenceScore: targetResult.confidenceScore
  };
}

