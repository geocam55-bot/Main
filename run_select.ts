import { createClient } from '@supabase/supabase-js';

const projectId = "usorqldwroecyxucmtuw";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM";
const supabaseUrl = process.env.SUPABASE_URL || `https://${projectId}.supabase.co`;
const supabaseKey = process.env.SUPABASE_ANON_KEY || publicAnonKey;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const sql = process.argv[2] || "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'";
  console.log('Executing select query:', sql);
  const { data, error } = await supabase.rpc('query_sql', { sql_text: sql });
  if (error) {
    console.error('Query Error:', error);
  } else {
    console.log('Results:');
    console.log(JSON.stringify(data, null, 2));
  }
}

main().catch(console.error);
