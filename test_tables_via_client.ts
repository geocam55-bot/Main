import { createClient } from './src/utils/supabase/client';

async function testTable(supabase: any, name: string) {
  const { data, error } = await supabase.from(name).select('*').limit(1);
  if (error) {
    console.log(`❌ Table '${name}': Error:`, error.message, `(${error.code})`);
  } else {
    console.log(`✅ Table '${name}': Success, found ${data?.length} row(s)`);
  }
}

async function main() {
  const supabase = createClient();
  const tables = ['profiles', 'organizations', 'bids', 'inventory', 'contacts', 'contacts_backup'];
  for (const t of tables) {
    await testTable(supabase, t);
  }
}

main().catch(console.error);
