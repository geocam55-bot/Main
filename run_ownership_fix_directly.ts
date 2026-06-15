import { createClient } from '@supabase/supabase-js';

const projectId = "usorqldwroecyxucmtuw";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM";
const supabaseUrl = `https://${projectId}.supabase.co`;
const supabase = createClient(supabaseUrl, publicAnonKey);

async function main() {
  console.log("Starting Link Contacts to Owner Profiles via exec_sql...");

  // Query profiles from database using query_sql
  const { data: profiles, error: profErr } = await supabase.rpc('query_sql', {
    sql_text: "SELECT id, email, name FROM public.profiles"
  });

  if (profErr || !profiles) {
    console.error("Error fetching profiles:", profErr);
    return;
  }

  console.log(`Found ${profiles.length} profiles to map.`);

  // Iterate and link contacts where email matches account_owner_number
  for (const prof of profiles) {
    if (!prof.email) continue;
    const emailLower = prof.email.trim().toLowerCase();

    // Map using exec_sql safely
    const sql = `
      UPDATE public.contacts
      SET owner_id = '${prof.id}'
      WHERE LOWER(TRIM(account_owner_number)) = LOWER('${emailLower}')
    `;
    
    // We try 'exec_sql' which takes 'sql' argument, or 'exec_sql_8405be07' if there is a schema suffix, or 'query_sql' with the update if tolerated.
    // Let's call rpc('exec_sql', { sql })
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error(`Error mapping for ${prof.email} using exec_sql:`, error);
    } else {
      console.log(`Successfully mapped owner for email: ${prof.email}`);
    }
  }

  // Also do soft mapping for "Bernie Chiasson" cases (e.g. Bernie.Chiasson@Ronaatlantic.ca -> bernard.chiasson@ronaatlantic.ca)
  const bernieProfile = profiles.find((p: any) => p.email.toLowerCase().includes('bernard.chiasson'));
  if (bernieProfile) {
    console.log(`Applying soft mapping for Bernie Chiasson: "${bernieProfile.email}"`);
    const sqlSoft = `
      UPDATE public.contacts
      SET owner_id = '${bernieProfile.id}'
      WHERE LOWER(TRIM(account_owner_number)) = 'bernie.chiasson@ronaatlantic.ca'
    `;
    await supabase.rpc('exec_sql', { sql: sqlSoft });
  }

  // Count check
  const { data: countResult } = await supabase.rpc('query_sql', {
    sql_text: "SELECT count(*) FROM public.contacts WHERE owner_id IS NOT NULL"
  });

  const { data: detailResult } = await supabase.rpc('query_sql', {
    sql_text: "SELECT p.email, count(c.id) FROM public.contacts c JOIN public.profiles p ON c.owner_id = p.id GROUP BY p.email"
  });

  console.log("\n--- LINKING STATS ---");
  console.log("Contacts with owner_id assigned:", countResult);
  console.log("Linked counts by profile email:", JSON.stringify(detailResult, null, 2));
}

main().catch(console.error);
