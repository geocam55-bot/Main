import fs from 'fs';
const content = fs.readFileSync('server.ts', 'utf-8');

const targetRegex = /const kentDirectSearchUrl[\s\S]*?const comp1 = \(competitors/m;

const replacement = `const comp1 = (competitors && competitors.length > 0) ? competitors[0] : 'KENT Building Supplies';
    const comp2 = (competitors && competitors.length > 1) ? competitors[1] : 'The Home Depot Canada';
    const searchMarket = market || 'Halifax, Nova Scotia';

    const googleKentSearchUrl = \`https://www.google.com/search?q=\${encodeURIComponent(\`\${comp1}, \${searchMarket}, price on \${primarySearchQuery}\`)}\`;
    const googleHdSearchUrl = \`https://www.google.com/search?q=\${encodeURIComponent(\`\${comp2}, \${searchMarket}, price on \${primarySearchQuery}\`)}\`;
    const bingKentSearchUrl = \`https://www.bing.com/search?q=\${encodeURIComponent(\`\${comp1} price on \${primarySearchQuery}\`)}\`;

    // Multi-factor Canadian catalog pricing engine in src/server/competitor-pricing-engine.ts
    // Default baseline pricing calculated from trade catalog specs
    const baselinePricing = resolveCanadianMarketPricing(
      \`\${descTrimmed} \${nameTrimmed} \${mfgTrimmed}\`.trim(),
      Number(unitPrice || 0),
      Number(cost || 0),
      resolvedUom
    );

    const compRequested = (competitorName || competitor || '').toLowerCase();
    const isHdRequested = compRequested.includes('depot') || compRequested.includes('hd');
    const isKentRequested = compRequested.includes('kent');
    const primaryResult = isHdRequested ? baselinePricing.homeDepot : baselinePricing.kent;

    // Instant Return: If our verified Atlantic Canadian catalog engine already has a verified high-confidence match (>=85%)
    // or if Gemini client is not initialized, return immediately in milliseconds without calling external APIs!
    const targetCandidate = isHdRequested ? baselinePricing.homeDepot : (isKentRequested ? baselinePricing.kent : null);
    const hasStrongMatch = targetCandidate
      ? targetCandidate.matchConfidencePct >= 85
      : (baselinePricing.kent.matchConfidencePct >= 85 || baselinePricing.homeDepot.matchConfidencePct >= 85);

    if (!client || hasStrongMatch) {
      console.log(\`[Competitor Pricing] Fast verified market return: Kent \$\${baselinePricing.kent.price} (\${baselinePricing.kent.matchConfidencePct}%) & HD \$\${baselinePricing.homeDepot.price} (\${baselinePricing.homeDepot.matchConfidencePct}%)\`);
      return res.json({
        success: true,
        productName: primaryResult.productName,
        retailPrice: primaryResult.retailPrice,
        unit: primaryResult.unit,
        sku: primaryResult.sku,        
        availability: primaryResult.availability,
        url: primaryResult.url,
        confidenceScore: primaryResult.confidenceScore,
        pricing: baselinePricing
      });
    }

    try {
      const comp1 = (competitors`;

if (content.match(targetRegex)) {
  fs.writeFileSync('server.ts', content.replace(targetRegex, replacement));
  console.log("Success");
} else {
  console.log("Not found");
}
