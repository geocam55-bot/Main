import { createClient } from '@supabase/supabase-js';

const projectId = "usorqldwroecyxucmtuw";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM";
const supabaseUrl = process.env.SUPABASE_URL || `https://${projectId}.supabase.co`;
const supabaseKey = process.env.SUPABASE_ANON_KEY || publicAnonKey;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = process.argv[2] || "SELECT * FROM public.organizations";
  console.log('Running Privileged SQL via exec_sql:', sql);
  
  // Wait, exec_sql might not return rows directly into data if it's designed is void or returns text,
  // let's try calling it and if there's any helper, we can also modify it to query table contents.
  const { data, error } = await supabase.rpc('exec_sql', { 
    sql: sql
  });
  
  if (error) {
    console.error('exec_sql RPC Error:', error);
  } else {
    console.log('Result:', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
  }
}

run().catch(console.error);
