// Serverless function handler for Competitor Pricing in Halifax, NS
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(410).json({
    error: 'This legacy pricing endpoint is disabled. Use the Supabase Firecrawl competitor-pricing function.',
  });
}
