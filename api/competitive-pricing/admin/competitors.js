import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = "https://usorqldwroecyxucmtuw.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM";

const DEFAULT_COMPETITORS = [
  {
    id: 1,
    name: 'KENT Building Supplies',
    websiteUrl: 'https://kent.ca',
    searchUrlTemplate: 'https://kent.ca/catalogsearch/result/?q={query}',
    productUrlPattern: 'kent.ca/',
    active: true,
    scrapingMethod: 'playwright_browser',
    lastSuccessfulCheck: new Date().toISOString(),
    lastError: null,
  },
  {
    id: 2,
    name: 'The Home Depot',
    websiteUrl: 'https://www.homedepot.ca',
    searchUrlTemplate: 'https://www.homedepot.ca/en/home/search.html?q={query}',
    productUrlPattern: 'homedepot.ca/',
    active: true,
    scrapingMethod: 'playwright_browser',
    lastSuccessfulCheck: new Date().toISOString(),
    lastError: null,
  },
];

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  try {
    const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL).trim();
    const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY).trim();
    const supabase = createClient(url, anonKey);

    const { data: comps, error } = await supabase.from('competitors').select('*').order('id', { ascending: true });
    if (!error && comps && comps.length > 0) {
      const mapped = comps.map((c) => ({
        id: c.id,
        name: c.name,
        websiteUrl: c.website_url,
        searchUrlTemplate: c.search_url_template,
        productUrlPattern: c.product_url_pattern,
        active: c.active ?? true,
        scrapingMethod: c.scraping_method,
        lastSuccessfulCheck: c.last_successful_check,
        lastError: c.last_error,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));
      return res.status(200).json(mapped);
    }
  } catch (e) {}

  return res.status(200).json(DEFAULT_COMPETITORS);
}
