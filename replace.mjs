import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');
const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes('const prompt = `Competitive Pricing Search Logic:'));
const endIndex = lines.findIndex((l, i) => i > startIndex && l.includes('"productTitle": "<actual product title from kent.ca or web search or empty string>",'));

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `      const comp1 = (competitors && competitors.length > 0) ? competitors[0] : 'KENT Building Supplies';
      const comp2 = (competitors && competitors.length > 1) ? competitors[1] : 'The Home Depot Canada';
      const searchMarket = market || 'Halifax, Nova Scotia';

      const prompt = \`Competitive Pricing Search Logic:
Objective: Find the current retail price of a competitor's product based on a product description.

Inputs:
- Competitors: \${comp1} and \${comp2}
- Market/Location: \${searchMarket}
- Product Description: "\${primarySearchQuery}"
- Trade Details: \${description || 'N/A'} (MFG Part: \${mfgPartNumber || 'N/A'}, Brand: \${manufacturer || 'N/A'}, Category: \${category || 'Building Materials'})

Process:
1. Parse the product description to understand the exact item characteristics.
2. Search the web for the exact item at \${comp1} in the \${searchMarket} market to find their current retail price.
3. Search the web for the exact item at \${comp2} in the \${searchMarket} market to find their current retail price.
4. Calculate match confidence % (integer 0 to 100).
   CRITICAL RULE:
   - If you confidently find the item at the competitor, return the retail price in CAD (confidence >= 80%).
   - If you cannot find a strong match, set retailPrice: 0, stockStatus: "Unlisted", availability: "Unlisted", and matchConfidencePct below 80.

Respond with a JSON object ONLY in this exact format:
{
  "parsedAttributes": {
    "material": "<parsed material>",
    "dimensions": "<dimensions>",
    "productType": "<product type>"
  },
  "kent": {
    "competitorName": "\${comp1}",
    "storeName": "\${comp1}",
    "storeLocation": "\${searchMarket}",
    "productName": "<actual product title from web search or empty string>",
    "productTitle": "<actual product title from web search or empty string>",`;

    lines.splice(startIndex, endIndex - startIndex + 1, replacement);
    fs.writeFileSync('server.ts', lines.join('\n'));
    console.log("Success!");
} else {
    console.log("Lines not found", startIndex, endIndex);
}
