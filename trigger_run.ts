import { createClient } from '@supabase/supabase-js';

const projectId = "usorqldwroecyxucmtuw";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM";
const supabaseUrl = `https://${projectId}.supabase.co`;
const supabase = createClient(supabaseUrl, publicAnonKey);

async function main() {
  console.log("Triggering contacts task run...");
  try {
    const resContacts = await fetch('http://localhost:3000/api/import-export/tasks/task-lqxak7nki/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log("Contacts sync status:", resContacts.status);
    const jsonContacts = await resContacts.json();
    console.log("Contacts sync response:", JSON.stringify(jsonContacts, null, 2));
  } catch (err: any) {
    console.error("Contacts sync failed to fetch:", err.message);
  }

  console.log("\nTriggering products task run...");
  try {
    const resProducts = await fetch('http://localhost:3000/api/import-export/tasks/task-wyftk9dbb/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log("Products sync status:", resProducts.status);
    const jsonProducts = await resProducts.json();
    console.log("Products sync response:", JSON.stringify(jsonProducts, null, 2));
  } catch (err: any) {
    console.error("Products sync failed to fetch:", err.message);
  }

  // Count check
  console.log("\nChecking database record counts via RPC...");
  const { data: contactsCount } = await supabase.rpc('query_sql', { sql_text: 'SELECT count(*) FROM public.contacts' });
  const { data: productsCount } = await supabase.rpc('query_sql', { sql_text: 'SELECT count(*) FROM public.inventory' });
  console.log("Contacts count:", contactsCount);
  console.log("Products/Inventory count:", productsCount);
}

main().catch(console.error);
