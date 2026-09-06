import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const startMarker = `    try {
      // Mocking the data for instant response`;
const endMarker = `    } catch (e) {
      console.error("[Competitive Pricing Search] Mock error:", e);
    }`;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const newBlock = `    try {
      const ai = getGeminiClient();
      if (ai) {
        const prompt = \`You are a pricing engine. Find the current retail price (in CAD) at "KENT Building Supplies" and "The Home Depot Canada" for this product.
Product: "\${cleanSearchQuery || effectiveDesc || effectiveName}"
Description: \${effectiveDesc || 'None'}
Model: \${effectiveMfg || 'None'}

1. Use googleSearch to find "kent building supplies \${cleanSearchQuery || effectiveDesc}"
2. Use googleSearch to find "home depot canada \${cleanSearchQuery || effectiveDesc}"
3. Reply ONLY with valid JSON matching this schema:
{
  "kentPrice": number,
  "kentConfidence": "EXACT" | "HIGH" | "MEDIUM" | "LOW" | "NOT_FOUND",
  "kentUrl": string,
  "homeDepotPrice": number,
  "homeDepotConfidence": "EXACT" | "HIGH" | "MEDIUM" | "LOW" | "NOT_FOUND",
  "homeDepotUrl": string
}\`;

        // Wrap the Gemini call in a Promise.race to enforce a timeout
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini search timed out')), 12000));
        const aiPromise = ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          tools: [{ googleSearch: {} }],
          config: { responseMimeType: "application/json" }
        });

        const response = await Promise.race([aiPromise, timeoutPromise]);
        const text = response.text || "{}";
        const parsed = JSON.parse(text);

        if (parsed.kentPrice > 0) {
          freshKent = Number(parsed.kentPrice);
          kentConf = parsed.kentConfidence || 'HIGH';
          if (parsed.kentUrl) kentUrl = parsed.kentUrl;
        }
        if (parsed.homeDepotPrice > 0) {
          freshHd = Number(parsed.homeDepotPrice);
          hdConf = parsed.homeDepotConfidence || 'HIGH';
          if (parsed.homeDepotUrl) hdUrl = parsed.homeDepotUrl;
        }
      }
    } catch (e) {
      console.error("[Competitive Pricing Search] Real search error or timeout:", e.message);
    }`;
  
  content = content.substring(0, startIndex) + newBlock + content.substring(endIndex + endMarker.length);
  fs.writeFileSync('server.ts', content, 'utf8');
  console.log("Successfully replaced mock with real Gemini search.");
} else {
  console.log("Could not find markers.");
}
