import { createClient } from '@supabase/supabase-js';

const projectId = "usorqldwroecyxucmtuw";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM";
const supabaseUrl = process.env.SUPABASE_URL || `https://${projectId}.supabase.co`;
const supabaseKey = process.env.SUPABASE_ANON_KEY || publicAnonKey;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: dbData } = await supabase.from('kv_store_8405be07').select('value').eq('key', 'import_export_tasks').maybeSingle();
  console.log('TASKS ARRAY:', JSON.stringify(dbData?.value, null, 2));

  const { data: histData } = await supabase.from('kv_store_8405be07').select('value').eq('key', 'import_export_history').maybeSingle();
  console.log('HISTORY:', JSON.stringify(histData?.value?.slice(0, 5), null, 2));
}

run().catch(console.error);
