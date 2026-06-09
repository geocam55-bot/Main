import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || 'https://usorqldwroecyxucmtuw.supabase.co';
console.log('SUPABASE_URL:', url);
console.log('SUPABASE_SERVICE_ROLE_KEY configured:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('SUPABASE_ANON_KEY configured:', !!process.env.SUPABASE_ANON_KEY);
