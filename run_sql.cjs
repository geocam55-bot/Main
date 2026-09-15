const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const sql = `
  ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
  
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.competitors;
  CREATE POLICY "Enable read access for authenticated users" ON public.competitors 
    FOR SELECT USING (auth.role() = 'authenticated');
    
  DROP POLICY IF EXISTS "Enable insert for IT Space Admins" ON public.competitors;
  CREATE POLICY "Enable insert for IT Space Admins" ON public.competitors 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    
  DROP POLICY IF EXISTS "Enable update for IT Space Admins" ON public.competitors;
  CREATE POLICY "Enable update for IT Space Admins" ON public.competitors 
    FOR UPDATE USING (auth.role() = 'authenticated');
    
  DROP POLICY IF EXISTS "Enable delete for IT Space Admins" ON public.competitors;
  CREATE POLICY "Enable delete for IT Space Admins" ON public.competitors 
    FOR DELETE USING (auth.role() = 'authenticated');
`;

async function main() {
  const result = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  console.log(await result.text());
}
main();
