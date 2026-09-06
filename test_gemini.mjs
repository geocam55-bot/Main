import { GoogleGenAI } from "@google/genai";
(async () => {
  try {
    const ai = new GoogleGenAI({});
    console.log("Starting Gemini search...");
    const prompt = `You are a pricing engine. Find the current retail price (in CAD) at "KENT Building Supplies" and "The Home Depot Canada" for this product.
Product: "DeWalt DCD771C2"

1. Use googleSearch to find "kent building supplies DeWalt DCD771C2"
2. Use googleSearch to find "home depot canada DeWalt DCD771C2"
3. Reply ONLY with valid JSON matching this schema:
{
  "kentPrice": number,
  "kentConfidence": "EXACT" | "HIGH" | "MEDIUM" | "LOW" | "NOT_FOUND",
  "kentUrl": string,
  "homeDepotPrice": number,
  "homeDepotConfidence": "EXACT" | "HIGH" | "MEDIUM" | "LOW" | "NOT_FOUND",
  "homeDepotUrl": string
}`;

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini search timed out')), 12000));
    const aiPromise = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      tools: [{ googleSearch: {} }],
      config: { responseMimeType: "application/json" }
    });

    const response = await Promise.race([aiPromise, timeoutPromise]);
    console.log("Response:", response.text);
  } catch (e) {
    console.error("Error:", e);
  }
})();
