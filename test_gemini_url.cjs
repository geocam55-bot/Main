const { GoogleGenAI } = require('@google/genai');

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); // Note: This will fail in my terminal, but I just want to check syntax
  const prompt = `Find the direct product URL for "SPF 2X4X8 LUMBER #2 & BETTER" on kent.ca and homedepot.ca.
Reply ONLY with valid JSON matching this schema:
{
  "kentUrl": string | null,
  "homeDepotUrl": string | null
}`;
  console.log(prompt);
}
test();
