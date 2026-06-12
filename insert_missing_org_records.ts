import { createClient } from '@supabase/supabase-js';

const projectId = "usorqldwroecyxucmtuw";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM";
const supabaseUrl = process.env.SUPABASE_URL || `https://${projectId}.supabase.co`;
const supabaseKey = process.env.SUPABASE_ANON_KEY || publicAnonKey;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sqlStatements = [
    // 1. Create organizations if not exists
    "INSERT INTO public.organizations (id, name, status) VALUES ('34638283-7b3d-47e2-bec8-a9e600e28c4a', 'RONA Atlantic Organization', 'active') ON CONFLICT (id) DO NOTHING",
    "INSERT INTO public.organizations (id, name, status) VALUES ('org-1762782701221', 'Default Member Organization', 'active') ON CONFLICT (id) DO NOTHING",
    "INSERT INTO public.organizations (id, name, status) VALUES ('default-org', 'ProSpaces CRM', 'active') ON CONFLICT (id) DO NOTHING",
    
    // 2. Disable RLS or make permissive policies on organizations table to make sure users can read them
    "ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY",
    "GRANT ALL ON public.organizations TO anon",
    "GRANT ALL ON public.organizations TO authenticated",
    "GRANT ALL ON public.organizations TO service_role"
  ];

  for (const sql of sqlStatements) {
    console.log('Executing:', sql);
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error('Error executing SQL count:', error);
    } else {
      console.log('Success.');
    }
  }
}

run().catch(console.error);
