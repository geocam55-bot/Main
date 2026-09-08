const { GoogleGenAI } = require('@google/genai');

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `Find the direct product URL for "SPF 2X4X8 LUMBER #2 & BETTER" on kent.ca.
Reply ONLY with the URL string, nothing else. Use googleSearch to find it.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    tools: [{ googleSearch: {} }],
  });
  console.log(response.text);
}
test();
