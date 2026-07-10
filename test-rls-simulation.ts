import { createClient } from './src/utils/supabase/client';

async function main() {
  const supabase = createClient();
  
  // Set up the transaction simulation for RLS
  const sql = `
    BEGIN;
      -- Set the claims to mock the admin user f3e5b6f9-5770-41ef-8b16-a91a1d4b1a0b
      SET LOCAL request.jwt.claim.sub = 'f3e5b6f9-5770-41ef-8b16-a91a1d4b1a0b';
      SET LOCAL request.jwt.claim.role = 'authenticated';
      
      -- Attempt insert
      INSERT INTO public.permissions (role, module, visible, "add", "change", "delete")
      VALUES ('designer', 'space:sales', false, false, false, false)
      RETURNING *;
    COMMIT;
  `;

  const { data, error } = await supabase.rpc('query_sql', {
    sql_text: sql
  });

  if (error) {
    console.error('Error simulating RLS insert:', error);
  } else {
    console.log('Successfully simulated RLS insert:', JSON.stringify(data, null, 2));
  }
}
main();
