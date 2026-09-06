import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: cp, error: e1 } = await supabase.from('competitor_products').select('*').limit(5);
const { data: pm, error: e2 } = await supabase.from('product_matches').select('*').limit(5);
const { data: pp, error: e3 } = await supabase.from('competitor_prices').select('*').limit(5);
console.log({cp, pm, pp, e1, e2, e3});
