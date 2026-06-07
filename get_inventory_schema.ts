import { createClient } from '@supabase/supabase-js';

const projectId = "usorqldwroecyxucmtuw";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM";
const supabaseUrl = process.env.SUPABASE_URL || `https://${projectId}.supabase.co`;
const supabaseKey = process.env.SUPABASE_ANON_KEY || publicAnonKey;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql_query', { 
    sql_text: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'inventory'"
  });
  if (error) {
    // If rpc doesn't exist, let's do direct queries
    console.log('RPC failed/not allowed:', error.message);
  } else {
    console.log('Columns of inventory:', data);
  }
}

run().catch(console.error);
