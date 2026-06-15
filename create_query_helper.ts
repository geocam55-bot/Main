import { createClient } from '@supabase/supabase-js';

const projectId = "usorqldwroecyxucmtuw";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM";
const supabaseUrl = process.env.SUPABASE_URL || `https://${projectId}.supabase.co`;
const supabaseKey = process.env.SUPABASE_ANON_KEY || publicAnonKey;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const functionSql = `
    CREATE OR REPLACE FUNCTION public.query_sql(sql_text text)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result_json jsonb;
    BEGIN
      EXECUTE 'SELECT COALESCE(jsonb_agg(t), ''[]''::jsonb) FROM (' || sql_text || ') t' INTO result_json;
      RETURN result_json;
    END;
    $$;

    GRANT EXECUTE ON FUNCTION public.query_sql(text) TO anon;
    GRANT EXECUTE ON FUNCTION public.query_sql(text) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.query_sql(text) TO service_role;
  `;

  console.log('Creating public.query_sql helper function via exec_sql...');
  const { data, error } = await supabase.rpc('exec_sql', { sql: functionSql });
  if (error) {
    console.error('Error creating query helper:', error);
  } else {
    console.log('Successfully created public.query_sql helper!');
  }
}

main().catch(console.error);
