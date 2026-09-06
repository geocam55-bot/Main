import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("No URL/KEY");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);
const { data, error } = await supabase.from('competitors').select('*').limit(1);
console.log({data, error});
