import { GoogleGenAI, Type } from '@google/genai';

const FALLBACK_API_KEY = process.env.GEMINI_API_KEY || '';

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, module = 'inventory' } = req.body || {};
    if (!message) {
      return res.status(400).json({ error: 'Missing message parameter' });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || FALLBACK_API_KEY,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });

    const prompt = `You are an expert AI inventory and pricing assistant for ProSpaces CRM (managing building materials, hardware, lumber, tools, etc.).
The user is asking in the "${module}" module: "${message}".

Analyze the user's natural language request and extract structured search filter parameters and provide a helpful, natural conversational reply.
Return JSON matching this schema:
{
  "reply": "Friendly conversational response explaining the search results or filters applied.",
  "filters": {
    "search": "extracted search terms or keywords (e.g. Spruce 2x4)",
    "category": "category filter if mentioned (or 'all')",
    "varianceFilter": "for competitive pricing: 'all', 'higher', 'lower', 'no_match', 'outdated' (or 'all')",
    "priceMin": null or number,
    "priceMax": null or number
  }
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            filters: {
              type: Type.OBJECT,
              properties: {
                search: { type: Type.STRING },
                category: { type: Type.STRING },
                varianceFilter: { type: Type.STRING },
                priceMin: { type: Type.NUMBER, nullable: true },
                priceMax: { type: Type.NUMBER, nullable: true },
              },
              required: ['search', 'category']
            }
          },
          required: ['reply', 'filters']
        }
      }
    });

    let parsed = {
      reply: `Here are the results for "${message}".`,
      filters: { search: message, category: 'all', varianceFilter: 'all' }
    };

    try {
      if (response.text) {
        parsed = JSON.parse(response.text.trim());
      }
    } catch (parseErr) {
      parsed.filters.search = message;
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(200).json({
      reply: `Filtered for "${req.body?.message || ''}".`,
      filters: { search: req.body?.message || '', category: 'all', varianceFilter: 'all' }
    });
  }
}
