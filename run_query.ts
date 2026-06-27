import { createClient } from '@supabase/supabase-js';

const projectId = "usorqldwroecyxucmtuw";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM";
const supabaseUrl = process.env.SUPABASE_URL || `https://${projectId}.supabase.co`;
const supabaseKey = process.env.SUPABASE_ANON_KEY || publicAnonKey;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = process.argv[2] || "SELECT policyname, tablename, cmd, qual, with_check FROM pg_policies WHERE tablename = 'inventory'";
  console.log('Running SQL:', sql);
  const { data, error } = await supabase.rpc('query_sql', { 
    sql_text: sql
  });
  if (error) {
    console.error('RPC Error:', error);
  } else {
    console.log('Result:', JSON.stringify(data, null, 2));
  }
}

run().catch(console.error);
