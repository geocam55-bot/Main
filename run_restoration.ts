import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const projectId = "usorqldwroecyxucmtuw";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb3JxbGR3cm9lY3l4dWNtdHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI2NzksImV4cCI6MjA3ODIzODY3OX0.cpSQZHkDI_yod4HSPsjUIhwSkkJX98PVJ7HjTe0i6qM";
const supabaseUrl = process.env.SUPABASE_URL || `https://${projectId}.supabase.co`;
const supabaseKey = process.env.SUPABASE_ANON_KEY || publicAnonKey;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const filePath = path.join(process.cwd(), 'src/database-migrations/restore_contacts_and_inventory.sql');
  console.log('Reading migration file:', filePath);
  
  if (!fs.existsSync(filePath)) {
    console.error('Migration file does not exist!');
    return;
  }

  const sqlContent = fs.readFileSync(filePath, 'utf8');
  console.log(`Successfully read migration script (${sqlContent.length} characters)`);

  console.log('Executing database restoration SQL via public.exec_sql RPC...');
  // Since SQL has multiple statements and some DDL commands cannot be run inside a simple transaction block containing COMMIT (like BEGIN...COMMIT block is already in the file)
  // Let's strip standard transaction blocks to avoid nested transaction exceptions if RPC already runs in a transaction,
  // or let's execute the SQL as - is first.
  const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
  
  if (error) {
    console.error('Migration error:', error);
    
    // If it fails due to BEGIN/COMMIT transaction issues, let's clean the script (remove BEGIN/COMMIT) and retry.
    if (error.message?.includes('transaction') || error.message?.includes('COMMIT')) {
      console.log('Retrying without transaction wrappers...');
      const cleanedSql = sqlContent
        .replace(/^\s*BEGIN\s*;?\s*$/im, '')
        .replace(/^\s*COMMIT\s*;?\s*$/im, '');
      const { data: retryData, error: retryError } = await supabase.rpc('exec_sql', { sql: cleanedSql });
      if (retryError) {
        console.error('Retry error:', retryError);
      } else {
        console.log('Successfully restored tables on retry!');
      }
    }
  } else {
    console.log('Successfully restored tables (contacts and inventory)!');
  }
}

main().catch(console.error);
