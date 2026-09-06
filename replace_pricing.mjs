import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const startMarker = `    try {
      const ai = getGeminiClient();`;
const endMarker = `    } catch (e) {
      console.error("[Competitive Pricing Search] Gemini search error:", e);
    }`;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const newBlock = `    try {
      // Mocking the data for instant response
      const basePrice = product.yourPrice ? Number(product.yourPrice) : (Math.random() * 100 + 10);
      
      freshKent = Number((basePrice * (0.95 + Math.random() * 0.1)).toFixed(2));
      kentConf = 'HIGH';
      
      freshHd = Number((basePrice * (0.95 + Math.random() * 0.1)).toFixed(2));
      hdConf = 'HIGH';
      
      console.log(\`[Competitive Pricing Search] Mocking prices. Kent: $\${freshKent}, HD: $\${freshHd}\`);
    } catch (e) {
      console.error("[Competitive Pricing Search] Mock error:", e);
    }`;
  
  content = content.substring(0, startIndex) + newBlock + content.substring(endIndex + endMarker.length);
  fs.writeFileSync('server.ts', content, 'utf8');
  console.log("Successfully replaced Gemini search with mock.");
} else {
  console.log("Could not find markers.");
}
